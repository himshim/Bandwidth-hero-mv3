// Bandwidth Hero (MV3) — service worker using URLTransform so the proxy gets an ENCODED ?url=...
const RULESET_ID = 1;

function buildTransform(opts) {
  // Parse your proxy base (can include path like /api/index)
  const raw = (opts.proxyBase || "https://your-proxy.example.com").trim();
  let u;
  try { u = new URL(raw); } catch (_) { return null; }

  // Build a URLTransform that switches the request to your proxy and adds query params.
  // IMPORTANT: queryTransform will URL-encode the value we provide.
  const transform = {
    scheme: u.protocol.replace(":", ""), // "https"
    host: u.host,                        // "example.com" or "example.com:8443"
    path: u.pathname || "/",             // keep your exact path e.g. "/api/index"
    queryTransform: {
      addOrReplaceParams: [
        { key: "url", value: "\\0" } // back-reference to the entire original URL; will be encoded
      ]
    }
  };

  // Optional extras (these match the legacy proxy’s parameter names)
  if (opts.quality)   transform.queryTransform.addOrReplaceParams.push({ key: "quality",   value: String(opts.quality) });
  if (opts.grayscale) transform.queryTransform.addOrReplaceParams.push({ key: "bw",        value: "1" });
  if (opts.maxWidth)  transform.queryTransform.addOrReplaceParams.push({ key: "max_width", value: String(opts.maxWidth) });

  return { transform, proxyHost: u.host };
}

function buildRules(opts) {
  const t = buildTransform(opts);
  if (!t) return [];

  const rule = {
    id: RULESET_ID,
    priority: 1,
    action: {
      type: "redirect",
      redirect: t // uses { transform, proxyHost }
    },
    condition: {
      // Match every http/https image request (RE2-safe)
      regexFilter: "^https?://.*",
      resourceTypes: ["image"],
      // Avoid loops: don't redirect requests that already target the proxy
      excludedRequestDomains: [t.proxyHost],
      excludedDomains: [t.proxyHost]
    }
  };

  return [rule];
}

async function loadOptions() {
  return chrome.storage.sync.get({
    enabled: true,
    // Paste your full Netlify URL here in Options UI: https://himshim-bandwidth-hero.netlify.app/api/index
    proxyBase: "https://your-proxy.example.com",
    quality: 60,
    grayscale: false,
    maxWidth: 1280
  });
}

async function applyRulesFromOptions(opts) {
  const current = await chrome.declarativeNetRequest.getDynamicRules();
  if (current.length) {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: current.map(r => r.id) });
  }
  if (!opts.enabled) return;
  const rules = buildRules(opts);
  if (rules.length) {
    await chrome.declarativeNetRequest.updateDynamicRules({ addRules: rules });
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const opts = await loadOptions();
  await applyRulesFromOptions(opts);
});

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "sync") return;
  const opts = await loadOptions();
  await applyRulesFromOptions(opts);
});

// Firefox-only fallback (Chrome ignores this block)
if (typeof browser !== 'undefined' && browser.webRequest && browser.webRequest.onBeforeRequest) {
  const getOpts = () => browser.storage.sync.get({
    enabled: true,
    proxyBase: "https://your-proxy.example.com",
    quality: 60,
    grayscale: false,
    maxWidth: 1280
  });
  browser.webRequest.onBeforeRequest.addListener(
    async details => {
      const opts = await getOpts();
      if (!opts.enabled) return {};
      try {
        const base = (opts.proxyBase || "https://your-proxy.example.com");
        const u = new URL(base);
        const q = new URLSearchParams(u.search);
        q.set("url", details.url);                         // Firefox path can encode directly
        if (opts.quality)   q.set("quality", String(opts.quality));
        if (opts.grayscale) q.set("bw", "1");
        if (opts.maxWidth)  q.set("max_width", String(opts.maxWidth));
        u.search = q.toString();
        return { redirectUrl: u.toString() };
      } catch { return {}; }
    },
    { urls: ["<all_urls>"], types: ["image"] },
    ["blocking"]
  );
}