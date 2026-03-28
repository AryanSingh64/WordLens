<div align="center">

<!-- Logo -->
<img src="public/icons/icon128.svg" alt="WordLens Logo" width="120" height="120"/>

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

WordLens is a production-ready Chrome extension that enhances your reading experience by providing instant access to definitions, summaries, and translations directly on any webpage. Built with Manifest V3, it features a beautiful liquid glass UI, AI-powered analysis using Groq's LLaMA 3.3 70B, and a built-in PDF reader with full feature parity.

The project consists of two tightly integrated parts:

- **Chrome Extension** (Vanilla JavaScript) – lightweight, zero-overhead content scripts
- **Landing Page** (React + Vite + Tailwind CSS) – modern marketing site with animations

Both share a single repository and unified build pipeline.

---

## Screenshots

<div align="center">

| Dictionary View | AI Summary |
|:---:|:---:|
| <img src="docs/images/screenshot-dictionary.png" width="400" alt="Dictionary tab"/> | <img src="docs/images/screenshot-ai.png" width="400" alt="AI summary tab"/> |

| Translation | Vault Dashboard |
|:---:|:---:|
| <img src="docs/images/screenshot-translate.png" width="400" alt="Translation tab"/> | <img src="docs/images/screenshot-dashboard.png" width="400" alt="Saved words dashboard"/> |

</div>

---

## Features

<div align="center">

| Feature | Description |
|:--------|:-------------|
| **Dictionary Lookup** | Double-click any word for instant definitions, IPA phonetics, part of speech, and usage examples powered by the Free Dictionary API |
| **AI Summaries** | Select sentences or paragraphs to get plain-English explanations using LLaMA 3.3 70B via Groq API (configurable API key) |
| **Translation** | One-click translation from 12+ languages to English using Google Translate |
| **Text-to-Speech** | Listen to any result with native browser Speech Synthesis — works offline, zero latency |
| **Vocabulary Vault** | Save words with context to your personal dictionary; browse and manage in the options page |
| **Drag & Reposition** | Floating popup is freely draggable; position persists across sessions |
| **PDF Reader** | Built-in PDF viewer with full WordLens functionality — open PDFs directly and use all features |
| **Dark Mode** | System-aware theme switching with beautiful liquid glass UI |
| **Pause-to-Peek** | Hover over a word for 600ms to see a subtle underline hint before clicking |

</div>

---

## Tech Stack

### Extension Core
| Component | Technology | Purpose |
|:---|:---|:---|
| **Manifest** | Chrome Extension Manifest V3 | Modern extension API with service worker |
| **Content Scripts** | Vanilla JavaScript (ES2022) | Zero overhead, no framework conflicts |
| **Background Worker** | Service Worker | API proxy, caching, storage management |
| **Popup UI** | HTML + CSS + JS | Glassmorphism design, draggable |

### Landing Page
| Layer | Technology | Why |
|:---|:---|:---|
| **Framework** | React 19 | Fast rendering, component reuse |
| **Build Tool** | Vite 7 | Lightning-fast HMR, multi-page support |
| **Styling** | Tailwind CSS 4 | Utility-first, consistent design system |
| **Animations** | Framer Motion | Smooth parallax, transitions, gestures |
| **PDF Rendering** | react-pdf 10 | Embedded PDF viewer with text selection |
| **Storage** | IndexedDB (via idb) | Client-side PDF library persistence |

### APIs & Services
| Service | Use | Authentication |
|:---|:---|:---|
| **Free Dictionary API** | Word definitions, phonetics, examples | None (public) |
| **Groq Cloud** | AI-powered summaries | User-provided API key |
| **Google Translate** | Multi-language translation | `client=gtx` (no auth) |
| **Chrome Storage** | Vault words, settings, popup position | Built-in, per-user |

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ (recommended: 20+)
- **Chrome** 109+ (for Manifest V3 support)
- **npm** (comes with Node.js) or **pnpm** (faster alternative)
- **Git** (for cloning)

For AI summaries feature:
- Optional: [Groq API key](https://console.groq.com) (free tier available)

---

## Getting Started

### 1. Clone Repository

```bash
git clone https://github.com/Aryansingh64/WordLens.git
cd WordLens
```

### 2. Install Dependencies

```bash
npm install
```

This installs both extension and landing page dependencies from `package.json`.

### 3. Build the Project

```bash
npm run build
```

The build process:
1. Compiles React landing page with Vite (`vite build`)
2. Copies extension files (`extension/`, `public/manifest.json`, `public/icons/`) to `dist/`
3. Packages everything into `wordlens-extension-v2.0.0.zip` (16 MB)

Output files:
- `dist/index.html` – Landing page
- `dist/options.html` – Saved words dashboard
- `dist/pdf-viewer.html` – PDF reader
- `dist/wordlens-extension-v2.0.0.zip` – Installable extension

### 4. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `dist/` folder
5. Pin WordLens to your toolbar for quick access

The extension is now active on all webpages. Select any text to see it in action.

### 5. Configure AI Summaries (Optional)

If you want AI-powered sentence summaries:

1. Get a free API key from [Groq Console](https://console.groq.com)
2. Click the **Settings** button in any WordLens popup
3. Paste your Groq API key
4. Click **Save Key**

Your key is stored locally in `chrome.storage.local` and never sent anywhere except Groq.

---

## Development Workflow

### Landing Page (React)

```bash
# Start development server with hot module replacement
npm run dev
```

Open `http://localhost:5173` in your browser. Changes to files in `src/` will hot-reload automatically.

**File structure:**
```
src/
├── App.jsx                    # Main landing page component
├── components/
│   └── ui/
│       └── dynamic-hero.jsx   # Parallax hero with mouse-following arrow
├── pages/
│   ├── options/
│   │   └── Options.jsx        # Saved words dashboard
│   └── pdf-viewer/
│       ├── PdfViewer.jsx      # PDF reader component
│       └── LibraryView.jsx    # PDF library management
├── assets/                    # Hero images (WebP format, optimized)
├── index.css                  # Global styles & theme variables
└── main.jsx                   # Entry point
```

### Extension (Vanilla JavaScript)

The extension files in `extension/` are plain JavaScript — edit them directly and **reload the extension** to see changes:

1. Go to `chrome://extensions`
2. Click the **reload icon** (circular arrow) on the WordLens card
3. Refresh any webpage to test

**File structure:**
```
extension/
├── content.js      # Injected into every page — UI, events, popup logic
├── background.js   # Service worker — API calls, caching, storage
├── content.css     # Popup styles (glassmorphism)
├── popup.html      # Vault popup HTML
├── popup.js        # Vault UI logic
├── popup.css       # Vault styles
├── sidepanel.html  # Side panel UI
└── sidepanel.js    # Side panel logic
```

**Note:** The extension does NOT use React — this is intentional for performance and to avoid conflicts with webpage frameworks.

---

## Project Structure

```
WordLens/
├── extension/              # Chrome extension source (Vanilla JS)
│   ├── content.js         # Content script (runs on every page)
│   ├── background.js      # Service worker (API proxy)
│   ├── content.css        # Popup styles
│   ├── popup.html/js/css  # Vault UI
│   ├── sidepanel.html/js  # Side panel
│   └── icon.png           # Extension icon
│
├── src/                   # Landing page source (React)
│   ├── App.jsx            # Main component
│   ├── components/
│   │   └── ui/
│   │       └── dynamic-hero.jsx
│   ├── pages/
│   │   ├── options/       # Dashboard
│   │   └── pdf-viewer/    # PDF reader
│   ├── assets/            # Hero images (WebP)
│   ├── index.css          # Global styles
│   └── main.jsx           # Entry point
│
├── public/                # Static assets for extension
│   ├── manifest.json      # Extension configuration
│   └── icons/             # Extension icons (PNG, SVG)
│
├── scripts/
│   └── convert-images.cjs # Image optimization (JPG → WebP)
│
├── dist/                  # Build output (auto-generated)
│   ├── index.html        # Compiled landing page
│   ├── options.html      # Compiled dashboard
│   ├── pdf-viewer.html   # Compiled PDF reader
│   ├── manifest.json     # Copied extension config
│   ├── icons/            # Copied icons
│   ├── extension/        # Copied extension files
│   ├── assets/           # Bundled CSS/JS + optimized images
│   └── wordlens-extension-v2.0.0.zip  # Distribution package
│
├── build-zip.cjs          # ZIP packaging script
├── vite.config.js         # Multi-page build config
├── package.json           # Dependencies & scripts
├── LEARNING_GUIDE.md      # Beginner-friendly tutorial (1007 lines)
├── DOCUMENTATION.md       # Deep technical dive (973 lines)
└── README.md              # You are here
```

---

## How It Works

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     WEBPAGE (any site)                      │
│  User selects text → content.js detects → shows popup      │
└─────────────────────────────┬───────────────────────────────┘
                              │ chrome.runtime.sendMessage()
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 BACKGROUND SERVICE WORKER                    │
│  • Receives message from content script                    │
│  • Checks in-memory cache (TTL: 5 minutes)                 │
│  • Fetches from external API if not cached                 │
│  • Retries with exponential backoff on failure             │
│  • Returns response via sendResponse()                     │
└─────────────────────────────┬───────────────────────────────┘
                              │ Response
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    CONTENT SCRIPT                           │
│  • Renders result into floating card                       │
│  • Handles user interactions (click, drag, save, speak)    │
│  • Persists settings to chrome.storage.local               │
└─────────────────────────────────────────────────────────────┘
```

### Content Script vs Background Worker

**Content Script** (runs in webpage context):
- Injected into every page via `manifest.json`
- Can read/modify DOM, attach event listeners
- **Cannot** make cross-origin API calls directly (CORS restriction)
- Communicates with background worker via `chrome.runtime.sendMessage()`

**Background Service Worker** (runs in extension context):
- Lives outside webpages, has no DOM access
- **Can** make cross-origin fetches without CORS issues
- Maintains in-memory cache for API responses
- Single worker handles all extension tabs efficiently

### Message Passing Pattern

```javascript
// content.js → background.js
chrome.runtime.sendMessage(
  { type: 'LOOKUP_WORD', word: 'example' },
  (response) => {
    if (response.success) {
      renderDefinition(response.data);
    }
  }
);

// background.js listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'LOOKUP_WORD') {
    lookupWord(message.word)
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep message channel open for async response
  }
});
```

---

## Environment Variables

This project does **not** require external environment variables for basic operation. All API keys are configured through the extension UI:

| Setting | Location | Description |
|:---|:---|:---|
| **Groq API Key** | Stored in `chrome.storage.local` via Settings popup | Required for AI summaries; get free key at console.groq.com |
| **Popup Position** | Persisted automatically | Last X/Y coordinates saved to restore position |

---

## Available NPM Scripts

| Command | Description |
|:---|:---|
| `npm run dev` | Start Vite dev server for landing page (http://localhost:5173) |
| `npm run build` | Full build: React → Vite → copy extension → package ZIP |
| `npm run build:extension` | Build React only (no ZIP packaging) |
| `npm run package` | Package `dist/` into ZIP (requires prior build) |
| `npm run lint` | Run ESLint on all JavaScript/JSX files |
| `npm run preview` | Preview built landing page locally |

---

## Deployment

### GitHub Pages (Landing Page Only)

The landing page can be deployed to GitHub Pages to showcase the extension:

1. Build the project: `npm run build`
2. Push to GitHub: `git push origin main`
3. Go to repository **Settings** → **Pages**
4. Set **Source** to **Deploy from a branch**
5. Select **`/dist`** folder as source (or `/(root)` if entire root)
6. Your site will be at `https://Aryansingh64.github.io/WordLens/`

**Extension Download Button**

The download button on the landing page uses a direct Google Drive link. To update:

1. Upload `dist/wordlens-extension-v2.0.0.zip` to your Google Drive
2. Get share link: `https://drive.google.com/file/d/YOUR_FILE_ID/view`
3. Edit `src/App.jsx` line 209:
   ```javascript
   const zipUrl = 'https://drive.google.com/uc?export=download&id=YOUR_FILE_ID';
   ```

### Chrome Web Store (Future)

To publish the extension:

1. Pay $5 one-time fee at [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Create a new item and upload `wordlens-extension-v2.0.0.zip`
3. Fill store listing (description, screenshots, privacy policy)
4. Submit for review (typically 3-5 business days)

### Self-Hosting PDF Library

WordLens uses **IndexedDB** for PDF storage (client-side only). No server required. However, if you want cloud sync across devices, you could integrate:

- **Supabase** (already in tech stack) — store PDF metadata, sync blobs
- **Firebase Storage** — upload PDFs to cloud
- **S3-compatible** backend — custom solution

---

## Architecture Highlights

### Why Vanilla JavaScript for Extension?

React would add ~130 KB to the extension bundle. Content scripts run **inside every webpage** — injecting a heavy framework causes:
- Slower page load times
- Potential conflicts with page's own React/Vue/Angular
- Increased memory usage

Using Vanilla JS keeps the extension **snappy**, **conflict-free**, and **installable in under 16 MB**.

### Why React for Landing Page?

Marketing pages benefit from:
- Component reusability (HeroSection, FeatureCard, TestimonialCard)
- Smooth animations with Framer Motion
- Rapid UI iteration with Tailwind CSS
- Hot module replacement during development

Separating the landing page from the extension keeps the extension lightweight while still having a rich marketing experience.

### Dual Build System

Vite's `rollupOptions.input` defines three entry points:
```javascript
input: {
  main: 'index.html',       // Landing page
  options: 'options.html',  // Dashboard (options page)
  'pdf-viewer': 'pdf-viewer.html'  // PDF reader
}
```

A custom Vite plugin (`copyExtensionFiles`) runs after build to copy `extension/`, `manifest.json`, and `icons/` into `dist/`. This creates a **single distributable folder** that contains everything needed for the extension and the website.

---

## Customization Guide

### Change Theme Colors

Edit CSS variables in `src/index.css`:

```css
:root {
  --accent: #22c55e;  /* Change to your brand color */
  --bg: linear-gradient(135deg, #eaefe8 0%, #f6f5ec 100%);
  --surface: rgba(255, 255, 255, 0.25);
}
```

### Add New Translation Language

1. Open `extension/content.js`
2. Add to `LANGUAGES` array (around line 30):
   ```javascript
   { code: 'de', name: 'German' },
   ```
3. Optionally add a pastel color to `PASTEL_COLORS` array for button backgrounds

### Modify API Cache TTL

In `extension/background.js`, change line 3:

```javascript
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes instead of 5
```

### Adjust Pause-to-Peek Delay

In `extension/content.js`, modify line 67:

```javascript
const IDLE_DELAY = 800; // Milliseconds before popup appears on hover
```

### Replace Hero Images

1. Place your images in `src/assets/` (WebP recommended)
2. Update imports in `src/App.jsx` (lines 6-11)
3. Optionally adjust rotation interval (line 86, currently 30000ms)

### Change Popup Width

In `extension/content.css`, find `.wl-popup` and modify:

```css
.wl-popup {
  max-width: 420px; /* Default is ~380px */
}
```

---

## Troubleshooting

### Extension Not Showing After Load

- ✅ Did you select the **`dist/`** folder (not `extension/`)?
- ✅ Is **Developer mode** enabled?
- ✅ Check Chrome Console (`Ctrl+Shift+J`) for errors
- ✅ Rebuild: `npm run build` then reload extension

### Popup Appears But Data Doesn't Load

- ✅ Is Groq API key configured? (Open Settings in popup)
- ✅ Check Background Page console: `chrome://extensions` → WordLens → "service worker" → Inspect
- ✅ Network errors? Open DevTools → Network tab to see failing requests
- ✅ Test API endpoints directly in browser:
  - Dictionary: `https://api.dictionaryapi.dev/api/v2/entries/en/test`
  - Groq: `https://api.groq.com/openai/v1/chat/completions`

### Images Not Loading on Landing Page

- ✅ Run `npm run build` after adding images to `src/assets/`
- ✅ Verify images are imported correctly in `src/App.jsx`
- ✅ Check DevTools → Network tab for 404 errors
- ✅ Ensure images exist in `dist/assets/` with hashed filenames

### Build Fails with "Module Not Found"

```bash
# Clean reinstall
rm -rf node_modules package-lock.json
npm install
```

### WebP Images Not Supported in Old Browser

WebP is supported in all modern browsers (Chrome 32+, Firefox 65+, Safari 14+, Edge 18+). If you need legacy support, you would need to add fallbacks to JPG/PNG. However, WordLens targets Chrome with Manifest V3, so WebP is safe.

---

## Performance Optimizations

### Image Compression
- All hero images converted from JPG to WebP
- **Size reduction: 46%** (28.4 MB → 15.3 MB)
- Extension ZIP reduced from 29.7 MB → **16.4 MB** (45% smaller)

### Caching Strategy
- In-memory cache in background worker (5-minute TTL)
- Repeated word lookups serve from cache instantly
- Cache cleared on extension reload

### Retry Logic
All API calls use exponential backoff:
```javascript
await fetchWithRetry(url, options, maxRetries = 2);
// Retries: 500ms, 1000ms delays
```

### Bundle Analysis
Run Vite bundle analyzer:
```bash
npx vite-bundle-analyzer dist/assets/*.js
```

---

## Testing

### Manual Testing Checklist

**Extension:**
- [ ] Select single word → Dictionary tab appears
- [ ] Select phrase/sentence → AI tab appears
- [ ] Click Translate → Translation tab shows English result
- [ ] Click speaker icon → Text-to-speech works
- [ ] Star button → Word saved to vault
- [ ] Drag popup → Position persists after closing/reopening
- [ ] Settings → Groq API key saves and persists
- [ ] Open options page (`chrome://extensions` → Options) → Vault displays saved words
- [ ] PDF viewer → Open PDF, select text, lookup works

**Landing Page:**
- [ ] Hero images rotate every 30 seconds
- [ ] Dark mode toggle works
- [ ] Download button triggers file download
- [ ] Installation steps are visible and well-formatted
- [ ] Responsive design works on mobile (resize browser)
- [ ] All navigation links scroll to sections

---

## Documentation

- **[DOCUMENTATION.md](DOCUMENTATION.md)** – Comprehensive technical deep-dive (973 lines)
  - Manifest v3 architecture
  - Content script vs background worker patterns
  - Message passing protocol
  - API integration details
  - Build system internals
  - Security considerations (XSS prevention)

- **[LEARNING_GUIDE.md](LEARNING_GUIDE.md)** – Beginner-friendly tutorial (1007 lines)
  - File-by-file walkthrough with examples
  - "How to modify" sections for common customizations
  - Architecture decisions explained in simple terms
  - Troubleshooting guide
  - Practical recipes (add language, change theme, etc.)

---

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make changes and test thoroughly**
4. **Build to verify:**
   ```bash
   npm run build
   ```
5. **Commit with clear message:**
   ```bash
   git commit -m "feat: add Spanish translation support"
   ```
6. **Push and open a Pull Request**

**Important:** Keep extension files in `extension/` as plain JavaScript — no React dependencies. React is only for the landing page in `src/`.

---

## License

MIT License – see [LICENSE](LICENSE) file for details.

---

## Author

**Aryan Pratap Singh**
📧 aaryansingh7598@gmail.com
🔗 [LinkedIn](https://linkedin.com/in/aryan64) | [GitHub](https://github.com/Aryansingh64)
📱 +91 9919535756

---

## Acknowledgments

- **Groq** for blazing-fast LLaMA 3.3 70B inference
- **Free Dictionary API** for open dictionary data
- **react-pdf** for PDF rendering capabilities
- **Tailwind CSS** for utility-first styling
- **Framer Motion** for smooth animations
- **Chrome Extensions Team** for Manifest V3 platform

---

<div align="center">

**Built with care to make reading a quieter, more understood experience.**

[🌐 **Visit Live Site**](https://aryansingh64.github.io/WordLens/)
[⬇ **Download Extension**](https://drive.google.com/file/d/1xVAdN66XGQzJwxdva6iuTH7xMsPzm2Xf/view?usp=sharing)
[💬 **Report Issue**](https://github.com/Aryansingh64/WordLens/issues)

</div>
