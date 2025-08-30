// options.js - handles saving, restoring, and UI events

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

// --- Storage keys
const STORAGE_KEY = "bhSettings";
const STAT_KEY = "bhStats";

// --- Default values
const defaults = {
  proxyBase: "",
  quality: 60,
  maxWidth: 1280,
  grayscale: false,
  enabled: true,
  excludeDomains: "",
};

const defaultStats = { images: 0, bytes: 0 };

// --- Helpers
function showToast(msg = "Saved") {
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  setTimeout(() => els.toast.classList.remove("show"), 2000);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let i = -1;
  do {
    bytes /= 1024;
    i++;
  } while (bytes >= 1024 && i < units.length - 1);
  return `${bytes.toFixed(1)} ${units[i]}`;
}

// --- Load settings
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

// --- Save settings
async function saveOptions() {
  const opts = {
    proxyBase: els.proxyBase.value.trim(),
    quality: Number(els.quality.value),
    maxWidth: Number(els.maxWidth.value) || 0,
    grayscale: els.grayscale.checked,
    enabled: els.enabled.checked,
    excludeDomains: els.excludeDomains.value.trim(),
  };

  await chrome.storage.local.set({ [STORAGE_KEY]: opts });
  showToast("Settings saved");
}

// --- Reset to defaults
async function resetOptions() {
  await chrome.storage.local.set({ [STORAGE_KEY]: defaults });
  restoreOptions();
  showToast("Settings reset");
}

// --- Reset stats
async function resetStats() {
  await chrome.storage.local.set({ [STAT_KEY]: defaultStats });
  restoreOptions();
  showToast("Stats reset");
}

// --- Event bindings
els.quality.addEventListener("input", () => {
  els.qualityOut.textContent = els.quality.value;
});

els.save.addEventListener("click", saveOptions);
els.reset.addEventListener("click", resetOptions);
els.resetStats.addEventListener("click", resetStats);

// Init
restoreOptions();
