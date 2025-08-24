// Bandwith Hero MV3 - prehook: intercept <img src>, srcset, and new Image() to prevent original downloads.
(() => {
  // Minimal defaults; real values loaded ASAP from storage.
  const defaults = {
    enabled: true,
    proxyBase: "https://your-proxy.example.com",
    quality: 60,
    grayscale: false,
    maxWidth: 1280,
    excludeDomains: "google.com gstatic.com"
  };

  let opts = null;        // loaded options
  let ready = false;      // options loaded
  const pending = new Set(); // <img> elements waiting for opts

  // Helpers
  const safeURL = u => { try { return new URL(u); } catch { return null; } };
  const toDomainSet = text => new Set(
    String(text || "")
      .split(/[, \n\r\t]+/)
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
      .map(s => s.replace(/^https?:\/\//, "").split("/")[0])
  );
  const isHttp = u => /^https?:\/\//i.test(u);

  function buildProxyUrl(orig) {
    if (!opts || !opts.proxyBase || !isHttp(orig)) return orig;
    const base = opts.proxyBase.trim();
    if (!base) return orig;
    const sep = base.includes("?") ? "&" : "?";
    const parts = [
      "url=" + encodeURIComponent(orig),
      opts.quality ? "quality=" + encodeURIComponent(String(opts.quality)) : "",
      opts.grayscale ? "bw=1" : "",
      opts.maxWidth ? "max_width=" + encodeURIComponent(String(opts.maxWidth)) : ""
    ].filter(Boolean);
    return base + sep + parts.join("&");
  }

  function excludedHost(host) {
    if (!opts) return false;
    const ex = toDomainSet(opts.excludeDomains);
    return ex.has(host.toLowerCase());
  }

  // Load options ASAP
  chrome.storage.sync.get(defaults, d => {
    opts = d;
    ready = true;

    // Process any queued images
    for (const img of Array.from(pending)) {
      pending.delete(img);
      try {
        const orig = img.dataset.bhPendingSrc;
        if (orig) {
          const u = safeURL(orig);
          if (u && !excludedHost(u.hostname)) {
            img.removeAttribute("data-bh-pending-src");
            // Assign proxied src synchronously now
            nativeSetSrc(img, buildProxyUrl(orig));
          } else {
            // Restore original if excluded/invalid
            nativeSetSrc(img, orig);
          }
        }
        const pendingSrcset = img.dataset.bhPendingSrcset;
        if (pendingSrcset) {
          img.removeAttribute("data-bh-pending-srcset");
          nativeSetSrcset(img, rewriteSrcset(pendingSrcset));
        }
      } catch {}
    }
  });

  // Keep options fresh if user changes them while the page is open
  chrome.storage.onChanged?.addListener((changes, area) => {
    if (area !== "sync") return;
    chrome.storage.sync.get(defaults, d => { opts = d; ready = true; });
  });

  // Capture native descriptors before patching
  const imgProto = HTMLImageElement.prototype;
  const srcDesc = Object.getOwnPropertyDescriptor(imgProto, "src");
  const srcsetDesc = Object.getOwnPropertyDescriptor(imgProto, "srcset");
  const setAttr = Element.prototype.setAttribute;
  const sourceProto = HTMLSourceElement?.prototype;
  const sourceSrcsetDesc = sourceProto ? Object.getOwnPropertyDescriptor(sourceProto, "srcset") : null;

  function nativeSetSrc(el, v) {
    srcDesc.set.call(el, v);
  }
  function nativeSetSrcset(el, v) {
    srcsetDesc && srcsetDesc.set && srcsetDesc.set.call(el, v);
  }
  function nativeSourceSetSrcset(el, v) {
    sourceSrcsetDesc && sourceSrcsetDesc.set && sourceSrcsetDesc.set.call(el, v);
  }

  function rewriteSrcset(ss) {
    if (!ss) return ss;
    return ss.split(",").map(part => {
      const m = part.trim().match(/^(\S+)(\s+.+)?$/);
      if (!m) return part;
      const url = m[1];
      const desc = m[2] || "";
      if (!isHttp(url)) return part;
      const u = safeURL(url);
      if (!u) return part;
      if (opts && excludedHost(u.hostname)) return part;
      return buildProxyUrl(url) + desc;
    }).join(", ");
  }

  function decideSrc(original) {
    if (!isHttp(original)) return original;
    const u = safeURL(original);
    if (!u) return original;
    if (opts && excludedHost(u.hostname)) return original;

    if (!ready || !opts || !opts.proxyBase) {
      // Delay the load until opts are ready
      return null; // signal to queue
    }
    return buildProxyUrl(original);
  }

  // Patch <img>.src
  Object.defineProperty(imgProto, "src", {
    configurable: true,
    enumerable: srcDesc.enumerable,
    get: srcDesc.get,
    set(value) {
      try {
        const decided = decideSrc(String(value));
        if (decided === null) {
          // queue and block
          this.dataset.bhPendingSrc = String(value);
          pending.add(this);
          nativeSetSrc(this, "about:blank");
        } else {
          nativeSetSrc(this, decided);
        }
      } catch {
        nativeSetSrc(this, value);
      }
    }
  });

  // Patch <img>.srcset
  if (srcsetDesc && srcsetDesc.set) {
    Object.defineProperty(imgProto, "srcset", {
      configurable: true,
      enumerable: srcsetDesc.enumerable,
      get: srcsetDesc.get,
      set(value) {
        try {
          const v = String(value || "");
          if (!ready || !opts || !opts.proxyBase) {
            this.dataset.bhPendingSrcset = v;
            pending.add(this);
            nativeSetSrcset(this, ""); // prevent immediate loads
          } else {
            nativeSetSrcset(this, rewriteSrcset(v));
          }
        } catch {
          nativeSetSrcset(this, value);
        }
      }
    });
  }

  // Patch <source>.srcset in <picture>
  if (sourceProto && sourceSrcsetDesc && sourceSrcsetDesc.set) {
    Object.defineProperty(sourceProto, "srcset", {
      configurable: true,
      enumerable: sourceSrcsetDesc.enumerable,
      get: sourceSrcsetDesc.get,
      set(value) {
        try {
          const v = String(value || "");
          if (!ready || !opts || !opts.proxyBase) {
            this.dataset.bhPendingSrcset = v;
            // No need to clear; <source> doesn't trigger fetch by itself
          } else {
            nativeSourceSetSrcset(this, rewriteSrcset(v));
          }
        } catch {
          nativeSourceSetSrcset(this, value);
        }
      }
    });
  }

  // Patch setAttribute for 'src' and 'srcset' on IMG/SOURCE to catch attribute-based assignment
  Element.prototype.setAttribute = function(name, value) {
    try {
      const n = String(name).toLowerCase();
      if (this instanceof HTMLImageElement && (n === "src" || n === "srcset")) {
        if (n === "src") {
          const decided = decideSrc(String(value));
          if (decided === null) {
            this.dataset.bhPendingSrc = String(value);
            pending.add(this);
            return setAttr.call(this, "src", "about:blank");
          }
          return setAttr.call(this, "src", decided);
        } else if (n === "srcset") {
          const v = String(value || "");
          if (!ready || !opts || !opts.proxyBase) {
            this.dataset.bhPendingSrcset = v;
            pending.add(this);
            return setAttr.call(this, "srcset", "");
          }
          return setAttr.call(this, "srcset", rewriteSrcset(v));
        }
      }
      if (this instanceof HTMLSourceElement && n === "srcset") {
        const v = String(value || "");
        if (!ready || !opts || !opts.proxyBase) {
          this.dataset.bhPendingSrcset = v;
          // no fetch yet
          return setAttr.call(this, "srcset", v);
        }
        return setAttr.call(this, "srcset", rewriteSrcset(v));
      }
    } catch {}
    return setAttr.call(this, name, value);
  };

  // Patch Image() constructor usage: new Image().src = ...
  const NativeImage = window.Image;
  function PatchedImage(width, height) {
    const img = new NativeImage(width, height);
    // Our src/srcset setters above already intercept assignments.
    return img;
  }
  PatchedImage.prototype = NativeImage.prototype;
  Object.defineProperty(window, "Image", { configurable: true, writable: true, value: PatchedImage });
})();