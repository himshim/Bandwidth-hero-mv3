// Minimal background: initialize defaults (including excludeDomains). Stats live in storage.local.
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get({
    enabled: true,
    proxyBase: "https://your-proxy.example.com",
    quality: 60,
    grayscale: false,
    maxWidth: 1280,
    excludeDomains: "google.com gstatic.com"
  }, (d) => chrome.storage.sync.set(d));

  chrome.storage.local.get({
    stats: { images: 0, bytesViaProxy: 0 }
  }, (d) => chrome.storage.local.set(d));
});

// Optional message hook (not strictly needed; kept for future)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg === "ping") sendResponse({ ok: true });
});