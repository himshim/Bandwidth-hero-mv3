const els = {
  proxyBase: document.getElementById('proxyBase'),
  quality: document.getElementById('quality'),
  maxWidth: document.getElementById('maxWidth'),
  grayscale: document.getElementById('grayscale'),
  enabled: document.getElementById('enabled'),
  save: document.getElementById('save'),
  reset: document.getElementById('reset'),
  toast: document.getElementById('toast')
};

const DEFAULTS = {
  enabled: true,
  proxyBase: "https://your-proxy.example.com",
  quality: 60,
  grayscale: false,
  maxWidth: 1280
};

function showToast(msg = "Saved") {
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  setTimeout(() => els.toast.classList.remove('show'), 1500);
}

async function load() {
  const d = await chrome.storage.sync.get(DEFAULTS);
  els.proxyBase.value = d.proxyBase;
  els.quality.value = d.quality;
  els.maxWidth.value = d.maxWidth;
  els.grayscale.checked = d.grayscale;
  els.enabled.checked = d.enabled;
}
load();

async function save() {
  const data = {
    proxyBase: (els.proxyBase.value || "").trim(),
    quality: clampInt(els.quality.value, 1, 100, DEFAULTS.quality),
    maxWidth: clampInt(els.maxWidth.value, 100, 100000, DEFAULTS.maxWidth),
    grayscale: !!els.grayscale.checked,
    enabled: !!els.enabled.checked
  };
  await chrome.storage.sync.set(data);
  showToast("Settings saved");
  // service worker listens to storage changes and rebuilds rules
}

function clampInt(v, min, max, def) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
}

async function resetAll() {
  await chrome.storage.sync.set(DEFAULTS);
  await load();
  showToast("Reset to defaults");
}

els.save.addEventListener('click', save);
els.reset.addEventListener('click', resetAll);

// Improve mobile UX: submit on Enter in number/text fields
['proxyBase', 'quality', 'maxWidth'].forEach(id => {
  const el = document.getElementById(id);
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); save(); }
  });
});