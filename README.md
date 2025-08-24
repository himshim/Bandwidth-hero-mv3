# Bandwidth Hero (MV3) — No-Code Starter

This is a **copy–paste** starter for a Manifest V3 image-compression extension. It redirects image requests to your proxy and serves compressed images back to the page.

## Install (Chrome/Edge)
1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. Click **Load unpacked** and select this folder
4. Click the extension icon → **Options** → set your **Proxy Base URL**
5. Toggle **Enabled** in the popup

## Install (Firefox)
1. Open `about:debugging` → **This Firefox**
2. **Load Temporary Add-on** → select `manifest.json`

## Settings
- **Proxy Base URL** (e.g., `https://your-proxy.example.com`)
- **Quality**: 1–100
- **Max Width**: pixels
- **Grayscale**: on/off
- **Enabled**: master toggle

## How it works
- On Chrome/Edge, it uses **declarativeNetRequest (DNR)** redirect rules built from your Options.
- On Firefox, there’s a fallback using `webRequest.onBeforeRequest` (blocking redirect).

## Notes
- The extension does nothing until you set a working **proxy URL**.
- A typical proxy endpoint accepts:  
  `/image?url=<original>&quality=<1-100>&max_width=<px>&bw=1`
- You can host any compatible proxy (Node, Go, etc.). If you need a copy-paste proxy, ask and we’ll paste a minimal one here too.

## Folder