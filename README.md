# Bandwith Hero MV3

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-MV3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/)
[![GitHub release](https://img.shields.io/github/v/release/himshim/bandwidth-hero-mv3)](https://github.com/himshim/bandwidth-hero-mv3/releases)

A modern Manifest V3 rewrite of the classic Bandwidth Hero extension.  
Saves mobile data and speeds up browsing by compressing images through a proxy before they load.

---

## Features

- Image compression through your own proxy
- Data savings statistics (images compressed and data via proxy)
- Modern, mobile-friendly UI with sliders and toggles
- Grayscale mode for extra savings
- Exclusion list to skip specific sites
- Works on Chromium browsers (Chrome, Edge, Brave, Kiwi, Ultimatum) and Firefox

---

## How it works

1. Extension rewrites `<img>` and `<picture>` tags on web pages.
2. Image requests are redirected through your proxy.
3. The proxy compresses and resizes images.
4. The extension tracks savings locally.

---

## Installation

### Chromium (Chrome, Edge, Brave, Kiwi, Ultimatum)

1. Download the latest chromium zip from [Releases](https://github.com/himshim/bandwidth-hero-mv3/releases).
2. Extract it.
3. Go to `chrome://extensions/`.
4. Enable Developer Mode.
5. Click Load Unpacked and select the extracted folder.

### Firefox

1. Download the firefox zip from [Releases](https://github.com/himshim/bandwidth-hero-mv3/releases).
2. Go to `about:debugging#/runtime/this-firefox`.
3. Click "Load Temporary Add-on" and select the zip or manifest.

---

## Setting up a Proxy

This extension requires a proxy to work.  
You can host your own easily using:

Proxy repository: [bandwidth-hero-proxy2](https://github.com/himshim/bandwidth-hero-proxy2)

Deploy options: Heroku, Railway.app, Netlify Functions, Vercel, or your own Node.js server.

Once deployed, copy your proxy endpoint (e.g. `https://your-proxy.example.com/api/index`) and paste it into the Options page.

---

## Settings

- Enable compression: master toggle
- Quality slider (1–100): lower = more savings, higher = better quality
- Max width: resize down large images
- Grayscale: convert images to black and white
- Excluded sites: skip compression on selected domains (e.g. `google.com gstatic.com`)

---

## Stats

Options page shows:

- Images compressed
- Data via proxy (requires proxy to send `Timing-Allow-Origin: *`)

---

## Contributing

This is a community hobby project.  
Contributions are welcome! Bug fixes, UI improvements, testing across browsers are especially helpful.  
Feel free to fork, improve, and send pull requests.

---

## Credits

- Original Bandwidth Hero by Alexander Ayastreb: https://github.com/ayastreb/bandwidth-hero
- This MV3 fork and modern UI: https://github.com/himshim/bandwidth-hero-mv3
- Proxy server: https://github.com/himshim/bandwidth-hero-proxy2

---

## License

MIT License

---

Latest releases: https://github.com/himshim/bandwidth-hero-mv3/releases