// Minimal service worker: keeps options in sync; no DNR rules used.
chrome.runtime.onInstalled.addListener(() => {
  // Initialize defaults on first install
  chrome.storage.sync.get({
    enabled: true,
    proxyBase: "https://your-proxy.example.com",
    quality: 60,
    grayscale: false,
    maxWidth: 1280,
    excludeDomains: "google.com gstatic.com"
  }, (d) => chrome.storage.sync.set(d));
});

// (Optional) listen for messages if we ever need background assistance
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg === "ping") sendResponse({ ok: true });
});