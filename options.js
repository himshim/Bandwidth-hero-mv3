const els = {
  proxyBase: document.getElementById('proxyBase'),
  quality: document.getElementById('quality'),
  qualityOut: document.getElementById('qualityOut'),
  maxWidth: document.getElementById('maxWidth'),
  grayscale: document.getElementById('grayscale'),
  enabled: document.getElementById('enabled'),
  excludeDomains: document.getElementById('excludeDomains'),
  save: document.getElementById('save'),
  reset: document.getElementById('reset'),
  resetStats: document.getElementById('resetStats'),
  toast: document.getElementById('toast'),
  statImages: document.getElementById('statImages'),
  statBytes: document.getElementById('statBytes')
};

const DEFAULTS = {
  enabled: true,
  proxyBase: "https://your-proxy.example.com",
  quality: 60,
  grayscale: false,
  maxWidth: 1280,
  excludeDomains: "google.com gstatic.com"
};

function showToast(msg = "Saved") {
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  setTimeout(() => els.toast.classList.remove('show'), 1500);
}

function formatBytes(n) {
  const a = Math.abs(n);
  if (a >= 1<<30) return (n/(1<<30)).toFixed(2) + " GB";
  if (a >= 1<<20) return (n/(1<<20)).toFixed(2) + " MB";
  if (a >= 1<<10) return (n/(1<<10)).toFixed(2) + " KB";
  return n + " B";
}

async function load() {
  const d = await chrome.storage.sync.get(DEFAULTS);
  els.proxyBase.value = d.proxyBase;
  els.quality.value = d.quality;
  els.qualityOut.textContent = d.quality;
  els.maxWidth.value = d.maxWidth;
  els.grayscale.checked = d.grayscale;
  els.enabled.checked = d.enabled;
  els.excludeDomains.value = d.excludeDomains;

  const s = await chrome.storage.local.get({ stats: { images: 0, bytesViaProxy: 0 } });
  els.statImages.textContent = s.stats.images || 0;
  els.statBytes.textContent = formatBytes(s.stats.bytesViaProxy || 0);
}
load();

els.quality.addEventListener('input', () => {
  els.qualityOut.textContent = els.quality.value;
});

async function save() {
  const data = {
    proxyBase: (els.proxyBase.value || "").trim(),
    quality: clampInt(els.quality.value, 1, 100, DEFAULTS.quality),
    maxWidth: clampInt(els.maxWidth.value, 100, 100000, DEFAULTS.maxWidth),
    grayscale: !!els.grayscale.checked,
    enabled: !!els.enabled.checked,
    excludeDomains: (els.excludeDomains.value || "").trim()
  };
  await chrome.storage.sync.set(data);
  showToast("Settings saved");
}

function clampInt(v, min, max, def) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
}

async function resetAll() {
  await chrome.storage.sync.set(DEFAULTS);
  await load();
  showToast("Settings reset");
}

async function resetStats() {
  await chrome.storage.local.set({ stats: { images: 0, bytesViaProxy: 0 } });
  await load();
  showToast("Stats reset");
}

els.save.addEventListener('click', save);
els.reset.addEventListener('click', resetAll);
els.resetStats.addEventListener('click', resetStats);

['proxyBase','maxWidth','excludeDomains'].forEach(id => {
  const el = document.getElementById(id);
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
});