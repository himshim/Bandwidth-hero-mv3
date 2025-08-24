// Bandwidth Hero (MV3) — service worker using URLTransform
const RULESET_ID = 1;

function buildTransform(opts) {
  const raw = (opts.proxyBase || "https://your-proxy.example.com").trim();
  let u;
  try { u = new URL(raw); } catch (_) { return null; }

  const transform = {
    scheme: u.protocol.replace(":", ""),
    host: u.host,
    path: u.pathname || "/",
    queryTransform: {
      addOrReplaceParams: [
        { key: "url", value: "\\0" }
      ]
    }
  };

  if (opts.quality)   transform.queryTransform.addOrReplaceParams.push({ key: "quality",   value: String(opts.quality) });
  if (opts.grayscale) transform.queryTransform.addOrReplaceParams.push({ key: "bw",        value: "1" });
  if (opts.maxWidth)  transform.queryTransform.addOrReplaceParams.push({ key: "max_width", value: String(opts.maxWidth) });

  return { transform, proxyHost: u.host };
}

function buildRules(opts) {
  const t = buildTransform(opts);
  if (!t) return [];

  return [{
    id: RULESET_ID,
    priority: 1,
    action: { type: "redirect", redirect: t },
    condition: {
      regexFilter: "^https?://.*",
      resourceTypes: ["image"],
      excludedRequestDomains: [t.proxyHost],
      excludedDomains: [t.proxyHost]
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
  const rules = buildRules(opts);
  if (rules.length) await chrome.declarativeNetRequest.updateDynamicRules({ addRules: rules });
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

// Firefox fallback (ignored by Chrome)
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
        q.set("url", details.url);
        if (opts.quality)   q.set("quality", String(opts.quality));
        if (opts.grayscale) q.set("bw", "1");
        if (opts.maxWidth)  q.set("max_width", String(opts.maxWidth));
        u.search = q.toString();
        return { redirectUrl: u.toString() };
      } catch {
        return {};
      }
    },
    { urls: ["<all_urls>"], types: ["image"] },
    ["blocking"]
  );
}