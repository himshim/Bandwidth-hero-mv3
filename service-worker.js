// Bandwidth Hero (MV3) — service worker (fixed for RE2 + CSP)
const RULESET_ID = 1;

function toProxyUrl(originalUrl, opts) {
  const base = (opts.proxyBase || "https://your-proxy.example.com").replace(/\/$/, "");
  const u = new URL(base + "/image");
  u.searchParams.set("url", originalUrl);
  if (opts.quality) u.searchParams.set("quality", String(opts.quality));
  if (opts.grayscale) u.searchParams.set("bw", "1");
  if (opts.maxWidth) u.searchParams.set("max_width", String(opts.maxWidth));
  return u.toString();
}

function buildRules(opts) {
  // RE2: no lookaheads. Keep regex simple and exclude the proxy host via condition filters.
  let proxyHost = "";
  try { proxyHost = new URL(opts.proxyBase).host; } catch (_) {}

  const rule = {
    id: RULESET_ID,
    priority: 1,
    action: {
      type: "redirect",
      redirect: { regexSubstitution: toProxyUrl("\\0", opts) } // \0 = full match from regexFilter
    },
    condition: {
      resourceTypes: ["image"],
      // Simple RE2-safe regex: match any http/https request
      regexFilter: "^https?://.*"
    }
  };

  // Prevent loops: do not redirect requests **to** the proxy itself.
  if (proxyHost) {
    // These fields refer to the REQUEST URL’s domain in MV3.
    rule.condition.excludedRequestDomains = [proxyHost];
    // Some Chromium builds also honor excludedDomains for safety; harmless to include:
    rule.condition.excludedDomains = [proxyHost];
  }

  return [rule];
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

// Firefox-only fallback (Chrome ignores this)
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
      try { return { redirectUrl: toProxyUrl(details.url, opts) }; }
      catch { return {}; }
    },
    { urls: ["<all_urls>"], types: ["image"] },
    ["blocking"]
  );
}