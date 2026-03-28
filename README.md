<div align="center">

<!-- Logo -->
<img src="public/icons/icon.png" alt="WordLens Logo" width="120" height="120"/>

# WordLens

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-4ade80?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3)
[![React 19](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![Vite 7](https://img.shields.io/badge/Vite-7-646cff?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind-4-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-555?style=for-the-badge)](LICENSE)

**A calm, powerful Chrome extension for instant word definitions, AI-powered summaries, and translations — all without leaving the page.**

</div>

---

## Overview

WordLens is a production-ready Chrome extension (Manifest V3) that provides instant dictionary lookups, AI summaries, translations, and text-to-speech directly on any webpage. Features a beautiful liquid glass UI, built-in PDF reader, and personal vocabulary vault.

The project combines:
- **Chrome Extension** (Vanilla JS) – lightweight, zero-overhead
- **Landing Page** (React + Vite + Tailwind) – modern marketing site

Both share a unified build pipeline in a single repository.

---

## Features

| Feature | Description |
|:---|:---|
| **Dictionary Lookup** | Double-click any word for definitions, IPA phonetics, and examples (Free Dictionary API) |
| **AI Summaries** | Get plain-English explanations of sentences using Groq's LLaMA 3.3 70B |
| **Translation** | One-click translation from 12+ languages to English |
| **Text-to-Speech** | Listen to results with native browser synthesis (offline) |
| **Vocabulary Vault** | Save and manage words in personal dictionary |
| **Drag & Reposition** | Freely move the floating popup; position persists |
| **PDF Reader** | Built-in viewer with full WordLens functionality |
| **Dark Mode** | System-aware theme with liquid glass UI |
| **Pause-to-Peek** | Hover 600ms to see underline hint before clicking |

---

## Tech Stack

### Extension
- Manifest V3, Vanilla JavaScript (ES2022)
- Service worker for API proxying & caching
- Glassmorphism CSS design

### Landing Page
- React 19, Vite 7, Tailwind CSS 4
- Framer Motion for animations
- react-pdf for PDF rendering
- IndexedDB for client-side storage

### APIs
- Free Dictionary API (no auth)
- Groq Cloud (user-provided API key)
- Google Translate (`client=gtx`)

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/Aryansingh64/WordLens.git
cd WordLens

# 2. Install dependencies
npm install

# 3. Build
npm run build

# 4. Load in Chrome
#    → chrome://extensions
#    → Enable Developer mode
#    → Load unpacked → Select dist/ folder
```

The extension is now active. Select any text to use WordLens.

**Optional:** Add Groq API key in extension Settings for AI summaries (free tier at [console.groq.com](https://console.groq.com)).

---

## Development

### Landing Page
```bash
npm run dev          # Start dev server at http://localhost:5173
```

Edit files in `src/` — hot reload applies automatically.

### Extension
Edit files in `extension/` directly, then:
1. Go to `chrome://extensions`
2. Click reload icon on WordLens card
3. Refresh webpage to test

No build step needed for extension code changes.

---

## Project Structure

```
WordLens/
├── extension/         # Chrome extension (Vanilla JS)
│   ├── content.js    # Content script (UI, events)
│   ├── background.js # Service worker (API, cache)
│   ├── popup.html/js/css  # Vault UI
│   └── sidepanel.html/js  # Side panel
│
├── src/              # Landing page (React)
│   ├── App.jsx       # Main component
│   ├── components/ui/dynamic-hero.jsx
│   ├── pages/options/      # Dashboard
│   ├── pages/pdf-viewer/   # PDF reader
│   └── assets/       # Hero images (WebP)
│
├── public/           # Extension static assets
│   ├── manifest.json
│   └── icons/
│
├── dist/             # Build output (auto-generated)
│   ├── index.html, options.html, pdf-viewer.html
│   ├── extension/, icons/, manifest.json
│   ├── assets/       # Bundled CSS/JS + images
│   └── wordlens-extension-v2.0.0.zip
│
├── build-zip.cjs     # ZIP packaging script
├── vite.config.js    # Multi-page build config
├── LEARNING_GUIDE.md # Beginner tutorial (1007 lines)
├── DOCUMENTATION.md  # Technical deep-dive (973 lines)
└── README.md         # You are here
```

---

## How It Works

```
User selects text on webpage
        ↓
content.js detects → shows floating popup
        ↓
User clicks action (define/summarize/translate)
        ↓
chrome.runtime.sendMessage() to background.js
        ↓
background.js checks cache → fetches API if needed
        ↓
sendResponse() returns data
        ↓
content.js renders result in popup
```

**Key insight:** Content scripts cannot make cross-origin API calls directly due to CORS. The background service worker acts as a proxy, fetching data and returning it via message passing.

---

## Customization

| Want to... | How |
|:---|:---|
| Change accent color | Edit CSS variables in `src/index.css` (e.g., `--accent: #22c55e;`) |
| Add translation language | Add to `LANGUAGES` array in `extension/content.js` |
| Adjust cache TTL | Modify `CACHE_TTL` in `extension/background.js` (default: 5 min) |
| Change hover delay | Edit `IDLE_DELAY` in `extension/content.js` (default: 600ms) |
| Replace hero images | Put WebP in `src/assets/`, update imports in `src/App.jsx` |
| Modify popup width | Edit `.wl-popup` in `extension/content.css` |

---

## Deployment

### GitHub Pages (Landing Page)

```bash
npm run build
git push origin main
# In GitHub repo Settings → Pages → Source: /dist
```

Site: `https://Aryansingh64.github.io/WordLens/`

The download button uses Google Drive. To update:
1. Upload `dist/wordlens-extension-v2.0.0.zip` to Drive
2. Get file ID from share link
3. Edit `src/App.jsx` line 209:
   ```javascript
   const zipUrl = 'https://drive.google.com/uc?export=download&id=YOUR_FILE_ID';
   ```

### Chrome Web Store

Package is ready in `dist/wordlens-extension-v2.0.0.zip` (16 MB). Upload at [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole) ($5 one-time fee).

---

## Performance

- **Image optimization:** JPG → WebP conversion (46% size reduction, 28.4 MB → 15.3 MB)
- **Extension size:** 16.4 MB (includes optimized assets)
- **Caching:** 5-minute TTL in-memory cache for API responses
- **Retry logic:** Exponential backoff (500ms, 1000ms) on failed requests

---

## Documentation

- **[DOCUMENTATION.md](DOCUMENTATION.md)** – Comprehensive technical deep-dive covering architecture, message passing, API integration, security, and build system (973 lines)
- **[LEARNING_GUIDE.md](LEARNING_GUIDE.md)** – Beginner-friendly tutorial with file-by-file explanations, practical examples, and troubleshooting (1007 lines)

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/name`
3. Make changes and test: `npm run build`
4. Commit: `git commit -m "feat: description"`
5. Push and open a PR

**Note:** Keep extension files (`extension/`) as plain JavaScript (no React). React is only for the landing page (`src/`).

---

## License

MIT – see [LICENSE](LICENSE) for details.

---

## Author

**Aryan Pratap Singh**
📧 aaryansingh7598@gmail.com
🔗 [LinkedIn](https://linkedin.com/in/aryan64) • [GitHub](https://github.com/Aryansingh64)
📱 +91 9919535756

---

<div align="center">

**Built with care to make reading a quieter, more understood experience.**

[🌐 Live Site](https://aryansingh64.github.io/WordLens/) • [⬇ Download](https://drive.google.com/file/d/1xVAdN66XGQzJwxdva6iuTH7xMsPzm2Xf/view?usp=sharing) • [💬 Issues](https://github.com/Aryansingh64/WordLens/issues)

</div>