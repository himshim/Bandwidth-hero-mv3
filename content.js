// Content-side URL rewriter for images (MV3-safe, closest to legacy behavior)
(async function () {
  const defaults = {
    enabled: true,
    proxyBase: "https://your-proxy.example.com",
    quality: 60,
    grayscale: false,
    maxWidth: 1280,
    excludeDomains: "google.com gstatic.com"
  };

  const opts = await new Promise((resolve) =>
    chrome.storage.sync.get(defaults, resolve)
  );

  if (!opts.enabled) return;

  const pageHost = location.hostname.toLowerCase();
  const excluded = buildExcludedSet(opts.excludeDomains);
  if (excluded.has(pageHost)) return; // skip whole page if excluded

  const proxy = safeURL(opts.proxyBase);
  if (!proxy) return;

  const proxyHost = proxy.hostname.toLowerCase();

  // Helpers
  function safeURL(u) { try { return new URL(u); } catch { return null; } }
  function buildExcludedSet(text) {
    return new Set(
      String(text || "")
        .split(/[, \n\r\t]+/)
        .map(s => s.trim().toLowerCase())
        .filter(Boolean)
        .map(s => s.replace(/^https?:\/\//, "").split("/")[0])
    );
  }
  function shouldSkip(targetUrl) {
    const u = safeURL(targetUrl);
    if (!u) return true;
    const host = u.hostname.toLowerCase();
    if (host === proxyHost) return true;          // already proxied
    if (excluded.has(host)) return true;          // excluded image host
    if (u.protocol !== "http:" && u.protocol !== "https:") return true; // skip data:, blob:, etc.
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

  // Rewrite <img src>, <source srcset>, <img srcset>
  function rewriteImg(el) {
    if (!(el && el.tagName)) return;

    // 1) <img src>
    if (el.tagName === "IMG") {
      const src = el.getAttribute("src");
      if (src && !shouldSkip(src)) {
        el.setAttribute("src", buildProxyUrl(src));
      }
    }

    // 2) <img/srcset> and <source/srcset> inside <picture>
    if ((el.tagName === "IMG" || el.tagName === "SOURCE")) {
      const ss = el.getAttribute("srcset");
      if (ss && typeof ss === "string") {
        const rewritten = ss
          .split(",")
          .map(part => {
            const trimmed = part.trim();
            if (!trimmed) return trimmed;
            // pattern: URL [space] descriptor (e.g., "img.jpg 2x" or "img.jpg 400w")
            const m = trimmed.match(/^(\S+)(\s+.+)?$/);
            if (!m) return trimmed;
            const url = m[1];
            const desc = m[2] || "";
            if (shouldSkip(url)) return trimmed;
            return buildProxyUrl(url) + desc;
          })
          .join(", ");
        el.setAttribute("srcset", rewritten);
      }
    }
  }

  // Initial pass
  function rewriteAll() {
    document.querySelectorAll("img, picture source").forEach(rewriteImg);
  }

  // Observe for dynamically-added images
  const mo = new MutationObserver((mutList) => {
    for (const m of mutList) {
      if (m.type === "childList") {
        m.addedNodes.forEach((n) => {
          if (n.nodeType !== 1) return;
          if (n.tagName === "IMG" || n.tagName === "SOURCE") rewriteImg(n);
          // If a <picture> is added, rewrite its children
          if (n.tagName === "PICTURE") n.querySelectorAll("img, source").forEach(rewriteImg);
          // Any subtree with images
          n.querySelectorAll?.("img, picture source").forEach(rewriteImg);
        });
      } else if (m.type === "attributes") {
        if (m.target && (m.target.tagName === "IMG" || m.target.tagName === "SOURCE")) {
          if (m.attributeName === "src" || m.attributeName === "srcset") {
            rewriteImg(m.target);
          }
        }
      }
    }
  });

  mo.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "srcset"]
  });

  // Run once ASAP (document_start)
  rewriteAll();
})();