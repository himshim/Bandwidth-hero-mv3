// service-worker.js
const STORAGE_KEY = "bhSettings";
const STAT_KEY = "bhStats";

// Defaults
const defaults = {
  proxyBase: "",
  quality: 60,
  maxWidth: 1280,
  grayscale: false,
  enabled: true,
  excludeDomains: "",
};

const defaultStats = { images: 0, bytes: 0 };

// Utility
async function getSettings() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return { ...defaults, ...(data[STORAGE_KEY] || {}) };
}

async function getStats() {
  const data = await chrome.storage.local.get(STAT_KEY);
  return { ...defaultStats, ...(data[STAT_KEY] || {}) };
}

async function saveStats(stats) {
  await chrome.storage.local.set({ [STAT_KEY]: stats });
  chrome.runtime.sendMessage({ type: "statsUpdate", stats });
}

// Build proxy URL
function buildProxyUrl(opts, url) {
  const params = new URLSearchParams();
  params.set("url", url);
  params.set("quality", opts.quality);
  if (opts.maxWidth) params.set("max_width", opts.maxWidth);
  if (opts.grayscale) params.set("bw", "1");
  return `${opts.proxyBase}?${params.toString()}`;
}

// Install proxy rules
async function updateRules() {
  const opts = await getSettings();

  if (!opts.enabled || !opts.proxyBase) {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [1] });
    return;
  }

  const excluded = opts.excludeDomains
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(domain => `*://*.${domain}/*`);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [1],
    addRules: [
      {
        id: 1,
        priority: 1,
        action: {
          type: "redirect",
          redirect: {
            regexSubstitution: buildProxyUrl(opts, "\\0"),
          },
        },
        condition: {
          regexFilter: "^https?://.*\\.(?:jpe?g|png|gif|webp)$",
          excludedRequestDomains: excluded,
          resourceTypes: ["image"]
        },
      },
    ],
  });
}

// Track compressed images (via feedback API)
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(async info => {
  const stats = await getStats();
  stats.images += 1;
  // proxy must return correct Content-Length to calculate bytes
  if (info.request) {
    stats.bytes += info.request.resourceSize || 0;
  }
  saveStats(stats);
});

// Listen for settings changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[STORAGE_KEY]) {
    updateRules();
  }
});

// Init
updateRules();
