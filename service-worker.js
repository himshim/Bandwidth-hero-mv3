// Bandwidth Hero (MV3) — service worker (fixed substitution + RE2-safe)
const RULESET_ID = 1;

function buildRedirectSubstitution(opts) {
  // Build the URL manually so \0 stays as backreference (NOT encoded).
  const base = (opts.proxyBase || "https://your-proxy.example.com").replace(/\/$/, "");
  let sub = `${base}/image?url=\\0`;  // keep backslash here!
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
      // regexSubstitution replaces the WHOLE matched URL with this template.
      // \0 is the ENTIRE original URL. Do not encode it.
      redirect: { regexSubstitution: buildRedirectSubstitution(opts) }
    },
    condition: {
      resourceTypes: ["image"],
      // RE2-safe: simple match for any http/https URL
      regexFilter: "^https?://.*",
      // avoid redirect loops to your proxy itself
      ...(proxyHost ? { excludedRequestDomains: [proxyHost], excludedDomains: [proxyHost] } : {})
    }
  }];
}

async function loadOptions() {
  return chrome.storage.sync.get({
    enabled: true,
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
        // Build a real URL here since Firefox path doesn't need backrefs
        const base = (opts.proxyBase || "https://your-proxy.example.com").replace(/\/$/, "");
        const u = new URL(base + "/image");
        u.searchParams.set("url", details.url);
        if (opts.quality)   u.searchParams.set("quality", String(opts.quality));
        if (opts.grayscale) u.searchParams.set("bw", "1");
        if (opts.maxWidth)  u.searchParams.set("max_width", String(opts.maxWidth));
        return { redirectUrl: u.toString() };
      } catch {
        return {};
      }
    },
    { urls: ["<all_urls>"], types: ["image"] },
    ["blocking"]
  );
}