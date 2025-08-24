Bandwidth Hero (MV3 Rebuild)

🚀 Bandwidth Hero is a browser extension that saves bandwidth by compressing images before they are loaded in your browser.
This project is a from-scratch MV3-compatible rebuild, so it works in the latest versions of Chromium browsers (Chrome, Edge, Brave, Kiwi, Ultimatum) and Firefox (desktop + Android).

⚠️ Disclaimer: This is a hobby project, maintained in my free time. It may not always be up to date with the latest browser changes. Contributions, bug fixes, and new features are very welcome!


---

✨ Features

Compresses images on any site via a proxy

Adjustable quality (1–100)

Optional grayscale mode

Resize images with a maximum width

Works with Manifest V3 (future-proof for Chrome/Edge)

Firefox-compatible (MV3 + webRequest fallback)

Mobile-friendly (Kiwi Browser, Ultimatum Browser, Firefox Android once signed via AMO)



---

📦 How to Install

Chromium Browsers (Chrome / Edge / Brave / Kiwi / Ultimatum)

1. Download the latest bandwidth-hero-chromium.zip from Releases.


2. Extract the ZIP (if needed) or load it directly as an unpacked extension:

Go to chrome://extensions

Turn on Developer Mode

Click Load unpacked

Select the extracted folder
(In mobile Chromium browsers like Kiwi/Ultimatum, the process may differ slightly.)




Firefox (Desktop / Android)

1. Download bandwidth-hero-firefox.zip from Releases.


2. Load it as a temporary add-on:

Go to about:debugging → This Firefox → Load Temporary Add-on

Select manifest.json inside the folder
(For Android, the signed version from AMO is recommended once available.)





---

🔧 Usage

1. Click the extension icon → Options


2. Set your Proxy Base URL (e.g. bandwidth-hero-proxy2)


3. Adjust quality / grayscale / max width


4. Toggle Enable compression on/off in the popup




---

🛠 Development & Releases

This repo is set up with GitHub Actions to automatically build release zips:

bandwidth-hero-chromium.zip

bandwidth-hero-firefox.zip


To release a new version:

1. Tag a commit with vX.Y.Z (e.g., v1.0.0)


2. GitHub Actions builds and attaches the zips to a Release





---

🙏 Credits

Original extension created by ayastreb/bandwidth-hero

Compression proxy inspiration: bandwidth-hero-proxy

This repo’s proxy fork: bandwidth-hero-proxy2


All credit for the idea and original implementation goes to the original authors.
This repo just aims to keep the extension alive and compatible with new browser requirements.


---

❤️ Contributing

This is a community-driven hobby project.
If you want to help:

Report bugs

Test on different browsers (desktop/mobile)

Improve code or UI

Add features (e.g. whitelist/blacklist sites, per-site settings)


Open a Pull Request or Issue on GitHub — any help is appreciated 🙌


---

📜 License

MIT License — free to use, modify, and share.


---