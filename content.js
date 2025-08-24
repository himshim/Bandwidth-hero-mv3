(async function () {
  const defaults = {
    enabled: true,
    proxyBase: "https://your-proxy.example.com",
    quality: 60,
    grayscale: false,
    maxWidth: 1280,
    excludeDomains: "google.com gstatic.com"
  };

  const opts = await new Promise((resolve) => chrome.storage.sync.get(defaults, resolve));
  if (!opts.enabled) return;

  const pageHost = location.hostname.toLowerCase();
  const excluded = toDomainSet(opts.excludeDomains);
  if (excluded.has(pageHost)) return;

  const proxyUrl = safeURL(opts.proxyBase);
  if (!proxyUrl) return;
  const proxyHost = proxyUrl.hostname.toLowerCase();

  function safeURL(u) { try { return new URL(u); } catch { return null; } }
  function toDomainSet(text) {
    return new Set(String(text || "")
      .split(/[, \n\r\t]+/)
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
      .map(s => s.replace(/^https?:\/\//, "").split("/")[0]));
  }
  function shouldSkip(targetUrl) {
    const u = safeURL(targetUrl);
    if (!u) return true;
    const host = u.hostname.toLowerCase();
    if (host === proxyHost) return true;
    if (excluded.has(host)) return true;
    if (u.protocol !== "http:" && u.protocol !== "https:") return true;
    return false;
  }
  function buildProxyUrl(orig) {
    const base = opts.proxyBase.trim();
    const sep = base.includes("?") ? "&" : "?";
    const parts = [
      "url=" + encodeURIComponent(orig),
      opts.quality ? "quality=" + encodeURIComponent(String(opts.quality)) : "",
      opts.grayscale ? "bw=1" : "",
      opts.maxWidth ? "max_width=" + encodeURIComponent(String(opts.maxWidth)) : ""
    ].filter(Boolean);
    return base + sep + parts.join("&");
  }

  // --- Rewrite <img> and <source>
  function rewriteImg(el) {
    if (!el) return;

    // lazy loading data-src
    if (el.tagName === "IMG") {
      const lazy = el.getAttribute("data-src") || el.getAttribute("data-iurl");
      if (lazy && !shouldSkip(lazy)) {
        el.setAttribute("src", buildProxyUrl(lazy));
      }
    }

    const src = el.getAttribute("src");
    if (src && !shouldSkip(src)) {
      el.setAttribute("src", buildProxyUrl(src));
    }

    const ss = el.getAttribute("srcset");
    if (ss && typeof ss === "string") {
      const rewritten = ss
        .split(",")
        .map(part => {
          const m = part.trim().match(/^(\S+)(\s+.+)?$/);
          if (!m) return part;
          const url = m[1];
          const desc = m[2] || "";
          if (shouldSkip(url)) return part;
          return buildProxyUrl(url) + desc;
        })
        .join(", ");
      el.setAttribute("srcset", rewritten);
    }
  }

  // --- Rewrite background-image
  function rewriteBg(el) {
    const style = getComputedStyle(el);
    const bg = style.backgroundImage;
    if (bg && bg.startsWith("url(")) {
      const url = bg.slice(4, -1).replace(/['"]/g, "");
      if (url && !shouldSkip(url)) {
        el.style.backgroundImage = `url("${buildProxyUrl(url)}")`;
      }
    }
  }

  function rewriteAll() {
    document.querySelectorAll("img, picture source").forEach(rewriteImg);
    document.querySelectorAll("*").forEach(rewriteBg);
  }

  const mo = new MutationObserver((mutList) => {
    for (const m of mutList) {
      if (m.type === "childList") {
        m.addedNodes.forEach((n) => {
          if (n.nodeType !== 1) return;
          if (n.tagName === "IMG" || n.tagName === "SOURCE") rewriteImg(n);
          n.querySelectorAll?.("img, source").forEach(rewriteImg);
          rewriteBg(n);
        });
      } else if (m.type === "attributes") {
        if (m.target && (m.attributeName === "src" || m.attributeName === "srcset" || m.attributeName === "style")) {
          if (m.target.tagName === "IMG" || m.target.tagName === "SOURCE") rewriteImg(m.target);
          rewriteBg(m.target);
        }
      }
    }
  });

  mo.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "srcset", "style"]
  });

  rewriteAll();
})();