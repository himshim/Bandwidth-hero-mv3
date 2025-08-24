// Bandwith Hero MV3 - main content script: handles lazy attrs, background images, and stats.
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
      .split(/[, \n\r\t]+/).map(s => s.trim().toLowerCase()).filter(Boolean)
      .map(s => s.replace(/^https?:\/\//, "").split("/")[0]));
  }
  const isHttp = u => /^https?:\/\//i.test(u);

  function shouldSkip(url) {
    if (!isHttp(url)) return true;
    const u = safeURL(url);
    if (!u) return true;
    if (u.hostname.toLowerCase() === proxyHost) return true;
    if (excluded.has(u.hostname.toLowerCase())) return true;
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

  // ----- Stats (bytes via Performance API; needs Timing-Allow-Origin from proxy) -----
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

  const seenPerf = new Set();
  try {
    const po = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        const name = e.name || "";
        if (!name) continue;
        try {
          const u = new URL(name);
          if (u.hostname.toLowerCase() !== proxyHost) continue;
        } catch { continue; }
        if (seenPerf.has(name)) continue;
        seenPerf.add(name);
        const bytes = (e.encodedBodySize && Number.isFinite(e.encodedBodySize)) ? e.encodedBodySize : 0;
        if (bytes > 0) addStat({ bytes });
      }
    });
    po.observe({ type: "resource", buffered: true });
  } catch {}

  // ----- Rewriters for lazy attributes and background images -----
  function rewriteImg(el) {
    if (!el) return;

    // Handle lazy attributes commonly used on image grids/search
    if (el.tagName === "IMG") {
      const lazy = el.getAttribute("data-src") || el.getAttribute("data-iurl") || el.getAttribute("data-lazy-src");
      if (lazy && !shouldSkip(lazy)) {
        el.removeAttribute("data-src");
        el.removeAttribute("data-iurl");
        el.removeAttribute("data-lazy-src");
        el.src = buildProxyUrl(lazy);
        addStat({ images: 1 });
      }
    }

    // If src still points to http(s) non-proxy, rewrite (in case it slipped past very early hooks)
    const src = el.getAttribute("src");
    if (src && !shouldSkip(src)) {
      el.src = buildProxyUrl(src);
      addStat({ images: 1 });
    }

    // srcset on img or <source>
    if (el.tagName === "IMG" || el.tagName === "SOURCE") {
      const ss = el.getAttribute("srcset");
      if (ss && typeof ss === "string") {
        let touched = false;
        const rewritten = ss.split(",").map(part => {
          const m = part.trim().match(/^(\S+)(\s+.+)?$/);
          if (!m) return part;
          const url = m[1];
          const desc = m[2] || "";
          if (shouldSkip(url)) return part;
          touched = true;
          return buildProxyUrl(url) + desc;
        }).join(", ");
        if (touched) {
          el.setAttribute("srcset", rewritten);
          addStat({ images: 1 });
        }
      }
    }
  }

  function rewriteBg(el) {
    const style = getComputedStyle(el);
    const bg = style.backgroundImage;
    if (bg && bg.startsWith("url(")) {
      const url = bg.slice(4, -1).replace(/['"]/g, "");
      if (url && !shouldSkip(url)) {
        el.style.backgroundImage = `url("${buildProxyUrl(url)}")`;
        addStat({ images: 1 });
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
        if (!m.target) continue;
        if (m.attributeName === "src" || m.attributeName === "srcset" || m.attributeName === "style") {
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