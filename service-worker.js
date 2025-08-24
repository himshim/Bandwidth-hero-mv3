// Bandwith Hero MV3 - background: initialize defaults + apply DNR redirect rules.
// DNR ensures original image requests are redirected at network level (no original bytes downloaded).

const RULE_ID = 1;

const DEFAULTS_SYNC = {
  enabled: true,
  proxyBase: "https://your-proxy.example.com",
  quality: 60,
  grayscale: false,
  maxWidth: 1280,
  excludeDomains: "google.com gstatic.com"
};

const DEFAULTS_LOCAL = {
  stats: { images: 0, bytesViaProxy: 0 }
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(DEFAULTS_SYNC, d => chrome.storage.sync.set(d));
  chrome.storage.local.get(DEFAULTS_LOCAL, d => chrome.storage.local.set(d));
  refreshRules();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  refreshRules(); // whenever options change, rebuild DNR rules
});

async function refreshRules() {
  const opts = await chrome.storage.sync.get(DEFAULTS_SYNC);
  // Clear old rules
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  if (existing.length) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existing.map(r => r.id)
    });
  }
  if (!opts.enabled) return;

  const rule = buildRule(opts);
  if (rule) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [rule]
    });
  }
}

function buildRule(opts) {
  const base = (opts.proxyBase || "").trim();
  if (!base) return null;

  // Build regexSubstitution: base + ?url=\0 [+ params]
  const sep = base.includes("?") ? "&" : "?";
  let sub = `${base}${sep}url=\\0`;
  if (opts.quality)   sub += `&quality=${encodeURIComponent(String(opts.quality))}`;
  if (opts.grayscale) sub += `&bw=1`;
  if (opts.maxWidth)  sub += `&max_width=${encodeURIComponent(String(opts.maxWidth))}`;

  // Exclusions
  const proxyHost = hostnameOf(base);
  const excluded = parseDomains(opts.excludeDomains);

  const condition = {
    // Match all http(s) images
    regexFilter: "^https?://.*",
    resourceTypes: ["image"]
  };

  // Avoid redirect loops to the proxy itself
  if (proxyHost) {
    condition.excludedRequestDomains = (condition.excludedRequestDomains || []).concat([proxyHost]);
    condition.excludedDomains = (condition.excludedDomains || []).concat([proxyHost]);
  }
  // Respect user excluded sites (both image host and page initiator)
  if (excluded.length) {
    condition.excludedRequestDomains = (condition.excludedRequestDomains || []).concat(excluded);
    condition.excludedInitiatorDomains = (condition.excludedInitiatorDomains || []).concat(excluded);
    condition.excludedDomains = (condition.excludedDomains || []).concat(excluded);
  }

  return {
    id: RULE_ID,
    priority: 1,
    action: { type: "redirect", redirect: { regexSubstitution: sub } },
    condition
  };
}

function hostnameOf(u) {
  try { return new URL(u).hostname.toLowerCase(); } catch { return ""; }
}

function parseDomains(text) {
  return String(text || "")
    .split(/[, \n\r\t]+/)
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
    .map(s => s.replace(/^https?:\/\//, "").split("/")[0]);
}