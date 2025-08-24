// Minimal service worker: initialize defaults (including excludeDomains)
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get({
    enabled: true,
    proxyBase: "https://your-proxy.example.com",
    quality: 60,
    grayscale: false,
    maxWidth: 1280,
    excludeDomains: "google.com gstatic.com"
  }, (d) => chrome.storage.sync.set(d));
});