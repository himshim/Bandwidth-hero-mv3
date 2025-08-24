const enabled = document.getElementById('enabled');
chrome.storage.sync.get({ enabled: true }, d => { enabled.checked = d.enabled; });
enabled.addEventListener('change', () => chrome.storage.sync.set({ enabled: enabled.checked }));