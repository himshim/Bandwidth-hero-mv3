const enabledEl = document.getElementById('enabled');
const grayscaleEl = document.getElementById('grayscale');
const qualityEl = document.getElementById('quality');
const qualityOut = document.getElementById('qualityOut');
const excludeBtn = document.getElementById('excludeSite');
const openSettingsBtn = document.getElementById('openSettings');

const DEFAULTS = {
  enabled: true,
  proxyBase: "https://your-proxy.example.com",
  quality: 60,
  grayscale: false,
  maxWidth: 1280,
  excludeDomains: "google.com gstatic.com"
};

async function load() {
  const d = await chrome.storage.sync.get(DEFAULTS);
  enabledEl.checked = !!d.enabled;
  grayscaleEl.checked = !!d.grayscale;
  qualityEl.value = d.quality;
  qualityOut.textContent = d.quality;
}
load();

enabledEl.addEventListener('change', async () => {
  await chrome.storage.sync.set({ enabled: enabledEl.checked });
});

grayscaleEl.addEventListener('change', async () => {
  await chrome.storage.sync.set({ grayscale: grayscaleEl.checked });
});

qualityEl.addEventListener('input', () => {
  qualityOut.textContent = qualityEl.value;
});
qualityEl.addEventListener('change', async () => {
  await chrome.storage.sync.set({ quality: parseInt(qualityEl.value, 10) || 60 });
});

// Open settings programmatically
openSettingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Exclude current site quickly
excludeBtn.addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;

    const u = new URL(tab.url);
    const host = u.hostname.toLowerCase();

    const d = await chrome.storage.sync.get(DEFAULTS);
    const list = new Set(String(d.excludeDomains || "")
      .split(/[, \n\r\t]+/)
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
      .map(s => s.replace(/^https?:\/\//, "").split("/")[0]));

    if (!list.has(host)) list.add(host);
    const updated = Array.from(list).join(" ");

    await chrome.storage.sync.set({ excludeDomains: updated });
    excludeBtn.textContent = "Excluded ✓";
    setTimeout(() => excludeBtn.textContent = "Exclude this site", 1200);
  } catch (e) {
    console.error(e);
  }
});