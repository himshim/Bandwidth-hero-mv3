const toggle = document.getElementById("toggle");
const status = document.getElementById("status");

const STORAGE_KEY = "bhSettings";

async function refresh() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const opts = data[STORAGE_KEY];
  if (!opts) return;

  toggle.checked = opts.enabled;
  status.textContent = opts.enabled ? "Enabled" : "Disabled";
}

toggle.addEventListener("change", async () => {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const opts = { ...(data[STORAGE_KEY] || {}), enabled: toggle.checked };
  await chrome.storage.local.set({ [STORAGE_KEY]: opts });
  refresh();
});

document.getElementById("optionsLink").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

refresh();
