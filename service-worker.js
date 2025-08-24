// Bandwidth Hero (MV3) — service worker
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
  let excludeHost = "";
  try { excludeHost = new URL(opts.proxyBase).host.replace(/\./g, "\\."); } catch (_) {}
  const regex = excludeHost ? `^https?://(?!${excludeHost})(.*)` : `^https?://(.*)`;
  return [{
    id: RULESET_ID,
    priority: 1,
    action: { type: "redirect", redirect: { regexSubstitution: toProxyUrl("\\0", opts) } },
    condition: { resourceTypes: ["image"], regexFilter: regex }
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

// Firefox MV3 still allows blocking webRequest; Chrome will ignore this block.
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
      catch (_) { return {}; }
    },
    { urls: ["<all_urls>"], types: ["image"] },
    ["blocking"]
  );
}