const els = {
  proxyBase: document.getElementById('proxyBase'),
  quality: document.getElementById('quality'),
  maxWidth: document.getElementById('maxWidth'),
  grayscale: document.getElementById('grayscale'),
  enabled: document.getElementById('enabled'),
  msg: document.getElementById('msg')
};

async function load() {
  const d = await chrome.storage.sync.get({
    enabled: true, proxyBase: "https://your-proxy.example.com",
    quality: 60, grayscale: false, maxWidth: 1280
  });
  els.proxyBase.value = d.proxyBase;
  els.quality.value = d.quality;
  els.maxWidth.value = d.maxWidth;
  els.grayscale.checked = d.grayscale;
  els.enabled.checked = d.enabled;
}

async function save() {
  const data = {
    proxyBase: els.proxyBase.value.trim(),
    quality: Number(els.quality.value || 60),
    maxWidth: Number(els.maxWidth.value || 1280),
    grayscale: els.grayscale.checked,
    enabled: els.enabled.checked
  };
  await chrome.storage.sync.set(data);
  els.msg.textContent = 'Saved.';
  setTimeout(() => els.msg.textContent = '', 1200);
}

document.getElementById('save').addEventListener('click', save);
load();