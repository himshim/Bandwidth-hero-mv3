const els = {
  proxyBase: document.getElementById("proxyBase"),
  quality: document.getElementById("quality"),
  qualityOut: document.getElementById("qualityOut"),
  maxWidth: document.getElementById("maxWidth"),
  grayscale: document.getElementById("grayscale"),
  enabled: document.getElementById("enabled"),
  excludeDomains: document.getElementById("excludeDomains"),
  statImages: document.getElementById("statImages"),
  statBytes: document.getElementById("statBytes"),
  resetStats: document.getElementById("resetStats"),
  reset: document.getElementById("reset"),
  save: document.getElementById("save"),
  toast: document.getElementById("toast"),
};

const STORAGE_KEY = "bhSettings";
const STAT_KEY = "bhStats";

const defaults = {
  proxyBase: "",
  quality: 60,
  maxWidth: 1280,
  grayscale: false,
  enabled: true,
  excludeDomains: "",
};

const defaultStats = { images: 0, bytes: 0 };

function showToast(msg = "Saved") {
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  setTimeout(() => els.toast.classList.remove("show"), 2000);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let i = -1;
  do { bytes /= 1024; i++; } while (bytes >= 1024 && i < units.length - 1);
  return `${bytes.toFixed(1)} ${units[i]}`;
}

async function restoreOptions() {
  const data = await chrome.storage.local.get([STORAGE_KEY, STAT_KEY]);
  const opts = { ...defaults, ...(data[STORAGE_KEY] || {}) };
  const stats = { ...defaultStats, ...(data[STAT_KEY] || {}) };

  els.proxyBase.value = opts.proxyBase;
  els.quality.value = opts.quality;
  els.qualityOut.textContent = opts.quality;
  els.maxWidth.value = opts.maxWidth || "";
  els.grayscale.checked = opts.grayscale;
  els.enabled.checked = opts.enabled;
  els.excludeDomains.value = opts.excludeDomains;

  els.statImages.textContent = stats.images;
  els.statBytes.textContent = formatBytes(stats.bytes);
}

async function saveOptions() {
  const url = els.proxyBase.value.trim();
  if (url && !/^https?:\/\/.+/i.test(url)) {
    showToast("Invalid proxy URL");
    return;
  }

  const opts = {
    proxyBase: url,
    quality: Number(els.quality.value),
    maxWidth: Number(els.maxWidth.value) || 0,
    grayscale: els.grayscale.checked,
    enabled: els.enabled.checked,
    excludeDomains: els.excludeDomains.value.trim(),
  };

  await chrome.storage.local.set({ [STORAGE_KEY]: opts });
  showToast("Settings saved");
}

async function resetOptions() {
  await chrome.storage.local.set({ [STORAGE_KEY]: defaults });
  restoreOptions();
  showToast("Settings reset");
}

async function resetStats() {
  await chrome.storage.local.set({ [STAT_KEY]: defaultStats });
  restoreOptions();
  showToast("Stats reset");
}

// Event bindings
els.quality.addEventListener("input", () => {
  els.qualityOut.textContent = els.quality.value;
});
els.save.addEventListener("click", saveOptions);
els.reset.addEventListener("click", resetOptions);
els.resetStats.addEventListener("click", resetStats);

// Listen for live stats
chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === "statsUpdate" && msg.stats) {
    els.statImages.textContent = msg.stats.images;
    els.statBytes.textContent = formatBytes(msg.stats.bytes);
  }
});

// Init
restoreOptions();
