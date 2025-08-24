// Content-side rewriter + stats (counts images, sums proxied bytes when allowed by TAO)
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
    if (host === proxyHost) return true; // already proxied
    if (excluded.has(host)) return true; // image host excluded
    if (u.protocol !== "http:" && u.protocol !== "https:") return true; // skip data:/blob:
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

  // ---- Stats helpers (stored in storage.local) ----
  async function addStat({ images = 0, bytes = 0 }) {
    return new Promise((resolve) => {
      chrome.storage.local.get({ stats: { images: 0, bytesViaProxy: 0 } }, (d) => {
        const s = d.stats || { images: 0, bytesViaProxy: 0 };
        s.images += images;
        s.bytesViaProxy += bytes;
        chrome.storage.local.set({ stats: s }, resolve);
      });
    });
  }

  // Track bytes for proxy requests via PerformanceObserver (needs TAO:* from your proxy to expose sizes)
  const seenPerf = new Set();
  const po = new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      const name = e.name || "";
      if (!name) continue;
      // Only count resources fetched from the proxy host to avoid double-counting
      try {
        const u = new URL(name);
        if (u.hostname.toLowerCase() !== proxyHost) continue;
      } catch { continue; }

      // Avoid counting the same URL multiple times
      if (seenPerf.has(name)) continue;
      seenPerf.add(name);

      // encodedBodySize/transferSize are >0 only if proxy sends "Timing-Allow-Origin: *"
      const bytes = (e.encodedBodySize && Number.isFinite(e.encodedBodySize)) ? e.encodedBodySize : 0;
      if (bytes > 0) addStat({ bytes: bytes });
    }
  });
  try { po.observe({ type: "resource", buffered: true }); } catch {}

  // ---- Rewrite logic ----
  function rewriteImg(el) {
    if (!(el && el.tagName)) return;

    // <img src>
    if (el.tagName === "IMG") {
      const src = el.getAttribute("src");
      if (src && !shouldSkip(src)) {
        el.setAttribute("data-bh-orig", src);
        el.setAttribute("src", buildProxyUrl(src));
        addStat({ images: 1 });
      }
    }

    // <img/srcset> and <source/srcset>
    if (el.tagName === "IMG" || el.tagName === "SOURCE") {
      const ss = el.getAttribute("srcset");
      if (ss && typeof ss === "string") {
        let counted = false;
        const rewritten = ss
          .split(",")
          .map(part => {
            const trimmed = part.trim();
            if (!trimmed) return trimmed;
            const m = trimmed.match(/^(\S+)(\s+.+)?$/);
            if (!m) return trimmed;
            const url = m[1];
            const desc = m[2] || "";
            if (shouldSkip(url)) return trimmed;
            counted = true;
            return buildProxyUrl(url) + desc;
          })
          .join(", ");
        if (counted) addStat({ images: 1 });
        el.setAttribute("srcset", rewritten);
      }
    }
  }

  function rewriteAll() {
    document.querySelectorAll("img, picture source").forEach(rewriteImg);
  }

  const mo = new MutationObserver((mutList) => {
    for (const m of mutList) {
      if (m.type === "childList") {
        m.addedNodes.forEach((n) => {
          if (n.nodeType !== 1) return;
          if (n.tagName === "IMG" || n.tagName === "SOURCE") rewriteImg(n);
          if (n.tagName === "PICTURE") n.querySelectorAll("img, source").forEach(rewriteImg);
          n.querySelectorAll?.("img, picture source").forEach(rewriteImg);
        });
      } else if (m.type === "attributes") {
        if (m.target && (m.target.tagName === "IMG" || m.target.tagName === "SOURCE")) {
          if (m.attributeName === "src" || m.attributeName === "srcset") rewriteImg(m.target);
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

  rewriteAll();
})();