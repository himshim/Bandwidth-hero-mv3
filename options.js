const els = {
  proxyBase: document.getElementById('proxyBase'),
  quality: document.getElementById('quality'),
  maxWidth: document.getElementById('maxWidth'),
  grayscale: document.getElementById('grayscale'),
  enabled: document.getElementById('enabled'),
  msg: document.getElementById('msg'),
  testBtn: document.getElementById('test'),
  testStatus: document.getElementById('testStatus'),
  testDetails: document.getElementById('testDetails'),
};

const DEFAULTS = {
  enabled: true,
  proxyBase: "https://your-proxy.example.com",
  quality: 60,
  grayscale: false,
  maxWidth: 1280
};

// A public test image (large enough to see compression difference)
const TEST_IMAGE = "https://upload.wikimedia.org/wikipedia/commons/3/3f/Fronalpstock_big.jpg";

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
    proxyBase: els.proxyBase.value.trim(),
    quality: Number(els.quality.value || 60),
    maxWidth: Number(els.maxWidth.value || 1280),
    grayscale: els.grayscale.checked,
    enabled: els.enabled.checked
  };
  await chrome.storage.sync.set(data);
  els.msg.textContent = 'Saved.';
  setTimeout(() => els.msg.textContent = '', 1200);

  // Let the service worker rebuild rules
  // (it listens to storage.onChanged and will re-apply)
}
document.getElementById('save').addEventListener('click', save);

// Build a proxy URL exactly how the service worker will
function buildProxyUrl(base, quality, maxWidth, grayscale, targetUrl) {
  const sep = base.includes("?") ? "&" : "?";
  const params = new URLSearchParams();
  params.set("url", targetUrl); // encoded automatically by URLSearchParams.toString()
  if (quality)   params.set("quality", String(quality));
  if (grayscale) params.set("bw", "1");
  if (maxWidth)  params.set("max_width", String(maxWidth));
  return `${base}${sep}${params.toString()}`;
}

async function testProxy() {
  els.testStatus.textContent = "Testing…";
  els.testStatus.className = "muted";
  els.testDetails.textContent = "";

  const base = els.proxyBase.value.trim();
  if (!base) {
    els.testStatus.textContent = "Proxy URL is empty.";
    els.testStatus.className = "fail";
    return;
  }

  // Try to fetch both original and proxied image and compare sizes
  // If CORS blocks reading sizes, we still try to at least confirm 200 OK and image Content-Type
  try {
    // Fetch ORIGINAL (may fail CORS for reading headers; we’ll attempt blob.size)
    const origResp = await fetch(TEST_IMAGE, { cache: "no-store" });
    const origOk = origResp.ok;
    let origSize = null;
    try {
      const origBuf = await origResp.arrayBuffer();
      origSize = origBuf.byteLength;
    } catch { /* ignore */ }

    // Fetch PROXIED
    const proxyUrl = buildProxyUrl(base, Number(els.quality.value||60), Number(els.maxWidth.value||1280), els.grayscale.checked, TEST_IMAGE);
    const proxResp = await fetch(proxyUrl, { cache: "no-store" });
    const proxOk = proxResp.ok;
    const ct = proxResp.headers.get("content-type") || "";
    let proxSize = null;
    try {
      const proxBuf = await proxResp.arrayBuffer();
      proxSize = proxBuf.byteLength;
    } catch { /* ignore */ }

    if (!proxOk) {
      els.testStatus.textContent = "Proxy request failed.";
      els.testStatus.className = "fail";
      els.testDetails.textContent = `GET ${proxyUrl}\nStatus: ${proxResp.status} ${proxResp.statusText}`;
      return;
    }

    // PASS: reachable and returns an image
    const isImage = ct.startsWith("image/");
    let line1 = isImage ? "Proxy is reachable and returns an image." : "Proxy is reachable.";
    els.testStatus.textContent = line1;
    els.testStatus.className = "ok";

    // If we could measure sizes, show savings
    if (origSize != null && proxSize != null) {
      const saved = origSize - proxSize;
      const pct = origSize > 0 ? Math.round((saved / origSize) * 100) : 0;
      els.testDetails.textContent =
        `Original: ${formatBytes(origSize)} | Proxied: ${formatBytes(proxSize)} | Saved: ${formatBytes(saved)} (${pct}%)\n` +
        `Proxy URL: ${proxyUrl}`;
    } else {
      els.testDetails.textContent =
        `Content-Type: ${ct || "(unknown)"}\n` +
        `Proxy URL: ${proxyUrl}\n` +
        `(Tip: If sizes are N/A, CORS blocked reading bytes for the original—still OK if images compress on pages.)`;
    }
  } catch (e) {
    els.testStatus.textContent = "Test failed.";
    els.testStatus.className = "fail";
    els.testDetails.textContent = String(e);
  }
}

function formatBytes(n) {
  const a = Math.abs(n);
  if (a >= 1<<30) return (n/(1<<30)).toFixed(2) + " GB";
  if (a >= 1<<20) return (n/(1<<20)).toFixed(2) + " MB";
  if (a >= 1<<10) return (n/(1<<10)).toFixed(2) + " KB";
  return n + " B";
}

els.testBtn.addEventListener('click', testProxy);