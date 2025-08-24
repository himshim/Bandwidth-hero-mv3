// Bandwidth Hero (MV3) — service worker (no forced /image; RE2-safe; \0 preserved)
const RULESET_ID = 1;

function buildRedirectSubstitution(opts) {
  // Use proxyBase exactly as provided (full path allowed). Just append query params.
  const base = (opts.proxyBase || "https://your-proxy.example.com").replace(/[\s]/g, "");
  const sep = base.includes("?") ? "&" : "?"; // support bases that already have a query
  let sub = `${base}${sep}url=\\0`; // keep \0 as a backreference (don't encode!)
  if (opts.quality)   sub += `&quality=${encodeURIComponent(String(opts.quality))}`;
  if (opts.grayscale) sub += `&bw=1`;
  if (opts.maxWidth)  sub += `&max_width=${encodeURIComponent(String(opts.maxWidth))}`;
  return sub;
}

function buildRules(opts) {
  let proxyHost = "";
  try { proxyHost = new URL(opts.proxyBase).host; } catch (_) {}

  return [{
    id: RULESET_ID,
    priority: 1,
    action: {
      type: "redirect",
      redirect: { regexSubstitution: buildRedirectSubstitution(opts) }
    },
    condition: {
      resourceTypes: ["image"],
      // RE2-safe: match any http/https image
      regexFilter: "^https?://.*",
      // prevent loops to your proxy host
      ...(proxyHost ? { excludedRequestDomains: [proxyHost], excludedDomains: [proxyHost] } : {})
    }
  }];
}

async function loadOptions() {
  return chrome.storage.sync.get({
    enabled: true,
    // You will paste your full Netlify function URL into Options:
    // e.g., https://himshim-bandwidth-hero.netlify.app/api/index
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
  await chrome.declarativeNetRequest.updateDynamicRules({ addRules: buildRules(opts) });
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

// Firefox fallback (Chrome ignores)
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
        const sep = base.includes("?") ? "&" : "?";
        const u = `${base}${sep}url=${encodeURIComponent(details.url)}`
          + (opts.quality ? `&quality=${encodeURIComponent(String(opts.quality))}` : "")
          + (opts.grayscale ? `&bw=1` : "")
          + (opts.maxWidth ? `&max_width=${encodeURIComponent(String(opts.maxWidth))}` : "");
        return { redirectUrl: u };
      } catch { return {}; }
    },
    { urls: ["<all_urls>"], types: ["image"] },
    ["blocking"]
  );
}