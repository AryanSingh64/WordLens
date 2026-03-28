# WordLens Learning Guide

**A beginner-friendly walkthrough of the entire WordLens project**

*Every file explained in simple language with practical examples.*

---

## Welcome!

Hey there! 👋 Whether you're new to coding or just new to this project, this guide is for you. I'll walk through **every file** in WordLens and explain:

- **What this file does** (in plain English)
- **How it works** (step by step)
- **Key code sections** (with simple explanations)
- **How to modify it** (with real examples)

No confusing jargon. Just clear, practical explanations.

---

## What Is WordLens?

WordLens has **two parts** that work together:

1. **A Chrome Extension** (the actual tool users install)
   - Runs as a floating popup when you select text on any webpage
   - Can look up definitions, summarize sentences, translate text
   - Written in plain JavaScript (no React) for speed

2. **A Landing Page** (the marketing website)
   - Beautiful React app that sells the extension
   - Has download buttons, feature lists, testimonials
   - Users visit this page to download the extension

**Both are in the same Git repository** and share the same build process, but they're separate applications that get packaged together.

---

## Project Structure (Simplified)

```
WordLens/
│
├── 📱 LANDING PAGE (React)
│   ├── src/
│   │   ├── App.jsx              ← Main landing page
│   │   ├── components/
│   │   │   └── ui/
│   │   │       └── dynamic-hero.jsx  ← Fancy animated hero
│   │   ├── pages/
│   │   │   ├── options/         ← Saved words dashboard
│   │   │   └── pdf-viewer/      ← Built-in PDF reader
│   │   ├── assets/              ← Images (now WebP format!)
│   │   ├── index.css            ← Global styles
│   │   └── main.jsx             ← Entry point
│   └── index.html, options.html, pdf-viewer.html
│
├── 🔧 CHROME EXTENSION (Vanilla JS)
│   └── extension/
│       ├── content.js           ← Runs on every webpage (the brain)
│       ├── background.js        ← Service worker (API calls)
│       ├── popup.html + popup.js + popup.css  ← Floating card UI
│       ├── sidepanel.html + sidepanel.js      ← Side panel
│       └── content.css          ← Popup styles
│
├── 📦 CONFIG & BUILD
│   ├── manifest.json            ← Chrome extension config
│   ├── package.json             ← Dependencies & scripts
│   ├── vite.config.js           ← Build configuration
│   ├── build-zip.cjs            ← Packages extension into ZIP
│   └── public/
│       ├── manifest.json        ← Copy for dist/
│       └── icons/               ← Extension icons
│
├── 📚 DOCUMENTATION
│   ├── README.md                ← User-facing readme
│   ├── DOCUMENTATION.md         ← Deep technical dive
│   └── LEARNING_GUIDE.md        ← ← You are here!
│
├── 🛠️  SCRIPTS
│   └── scripts/
│       └── convert-images.cjs   ← Converts JPG → WebP
│
└── 📤 DISTRIBUTION
    └── dist/                    ← Build output (auto-generated!)
        ├── index.html          ← Landing page build
        ├── options.html        ← Dashboard build
        ├── pdf-viewer.html     ← PDF reader build
        ├── manifest.json       ← Extension manifest
        ├── icons/              ← Icons
        ├── extension/          ← Extension scripts
        └── assets/             ← CSS/JS bundles + images
```

---

## Part 1: Landing Page (React)

The landing page is a modern React app built with Vite and Tailwind CSS. It's a marketing website that promotes WordLens and provides a download button.

### File: `src/App.jsx` — The Main Component

**Purpose:** This is the root component of the landing page. It contains everything: the header, hero section, features, testimonials, download section, and footer.

**Key things it does:**

1. **Imports images** (line 6-11)
   ```javascript
   import annie from './assets/annie-spratt-gl7joOaABlI-unsplash.webp'
   import emil from './assets/emil-widlund-xrbbXIXAWY0-unsplash.webp'
   // ... more images
   ```

2. **Rotates hero images** every 30 seconds (lines 71-90)
   ```javascript
   useEffect(() => {
     const intervalId = setInterval(() => {
       setHeroImage(prev => (prev + 1) % bookImages.length);
     }, 30000); // 30 seconds
   }, []);
   ```

3. **Toggles dark mode** (lines 92-98)
   ```javascript
   useEffect(() => {
     if (isDark) {
       document.documentElement.classList.add('dark');
     } else {
       document.documentElement.classList.remove('dark');
     }
   }, [isDark]);
   ```

4. **Injects custom CSS animations** (lines 100-205)
   - Adds keyframe animations for shimmer effects, card entrance, etc.
   - This CSS gets inserted into the page head on mount

5. **Handles download button click** (lines 207-216)
   ```javascript
   const handleDownload = useCallback(() => {
     const zipUrl = '/wordlens-extension-v2.0.0.zip';
     const link = document.createElement('a');
     link.href = zipUrl;
     link.download = 'wordlens-extension-v2.0.0.zip';
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
   }, []);
   ```

**How to modify:**

- **Change hero images:** Replace files in `src/assets/` and update the imports at top (lines 6-11)
- **Change rotation speed:** Modify `30000` to another value (milliseconds)
- **Change colors:** Edit CSS variables in `src/index.css`
- **Add a new section:** Insert JSX before the closing `</div>` (line 479)

---

### File: `src/components/ui/dynamic-hero.jsx` — Fancy Animated Hero

**Purpose:** A sophisticated hero section with a mouse-following arrow animation, parallax scrolling effects, and floating background orbs.

**Architecture:**

- Uses **Framer Motion** for smooth animations
- Has a `<canvas>` that draws a dashed arrow from your mouse cursor to the "Get WordLens" button
- Parallax layers move at different speeds as you scroll
- The hero image scales and fades on scroll

**Key components explained:**

1. **Mouse-tracking arrow** (lines 109-184)
   - The `drawArrow()` function calculates the angle from mouse to button
   - Draws a curved dashed line with an arrowhead
   - Opacity fades when mouse gets close to button

   ```javascript
   // Calculate angle
   const a = Math.atan2(cy - mouse.y, cx - mouse.x);
   // Draw curved line
   ctx.quadraticCurveTo(controlX, controlY, x1, y1);
   ```

2. **Parallax transforms** (lines 66-71)
   ```javascript
   const parallaxY = useTransform(smoothScrollY, [0, 1000], [0, -300]);
   const imageScale = useTransform(smoothScrollY, [0, 800], [1, 1.15]);
   ```
   - As you scroll, elements move at different rates
   - Creates a sense of depth

3. **Floating orbs** (lines 269-305)
   - Three gradient blobs that float around
   - Animated with `motion.div` and `animate` prop

**How to modify:**

- **Change arrow color:** Edit `resolvedCanvasColorsRef.current.strokeStyle` (line 119)
- **Adjust arrow length/curvature:** Modify `offset` calculation (line 136)
- **Change parallax intensity:** Adjust the output ranges in `useTransform` calls
- **Remove floating orbs:** Delete the `motion.div` blocks at lines 273-304

---

### File: `src/pages/options/Options.jsx` — Saved Words Dashboard

**Purpose:** Shows all words the user has saved to their vault.

**What it does:**

1. **Loads saved words** from Chrome storage on mount
2. **Displays them in a grid** with word, context, pronunciation, and date
3. **Allows deletion** via "Remove" buttons
4. **Links to PDF viewer** with "Open PDF" button

**Key code patterns:**

```javascript
// Load vault from Chrome storage (runs once on mount)
useEffect(() => {
  chrome.storage.local.get(['vault'], (result) => {
    if (result.vault) {
      setVault(result.vault);
    }
  });
}, []);
```

**How to modify:**

- **Change number of items per page:** Edit `ITEMS_PER_PAGE` constant (line 15)
- **Add new fields:** Update the `vault` schema when saving in `content.js`
- **Change layout:** Modify the grid columns (currently `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`)

---

### File: `src/pages/pdf-viewer/PdfViewer.jsx` — PDF Reader

**Purpose:** A full PDF viewer built into the extension. Users can open PDFs and use all WordLens features inside them.

**Key features:**

- Uses `react-pdf` library to render PDFs
- Custom toolbar with zoom controls, page navigation
- Text selection triggers WordLens popup (same as normal webpages)
- File upload via `<input type="file">`

**How it works:**

1. **File upload** → reads as ArrayBuffer → converts to blob URL
2. **react-pdf** renders the PDF document
3. **Custom overlay** adds a floating action button for file upload

**How to modify:**

- **Change default zoom:** Edit `DEFAULT_SCALE` constant (line 14)
- **Add PDF annotation tools:** Would need to extend `react-pdf` with custom layers
- **Change max file size:** The limit is set by browser; you could add validation before opening

---

### File: `src/pages/pdf-viewer/LibraryView.jsx` — PDF Library

**Purpose:** Shows a grid of all uploaded PDFs with thumbnails. Users can click to open a PDF.

**Key concepts:**

- Thumbnails generated using `pdfThumbnail.js` utility
- PDFs stored in IndexedDB via `blobStorage.js`
- Uses React state to manage library data

**How to modify:**

- **Change grid layout:** Modify the `grid-cols` classes (line 115)
- **Add PDF metadata:** Extend `savePdf` in `blobStorage.js` to store title, author, etc.
- **Add search:** Filter `pdfs` state array based on user input

---

### File: `src/index.css` — Global Styles & Theme

**Purpose:** Defines color scheme, glassmorphism effects, and supports light/dark/yellow modes.

**How it works:**

1. **CSS Variables** (lines 18-60) define the color palette
   ```css
   :root {
     --bg: linear-gradient(135deg, #eaefe8 0%, #f6f5ec 100%);
     --surface: rgba(255, 255, 255, 0.25);
     --accent: #22c55e;
   }
   ```

2. **Tailwind `@theme` block** (lines 3-15) maps CSS vars to Tailwind colors
   ```css
   @theme {
     --color-bg: var(--bg);
     --color-surface: var(--surface);
   }
   ```

3. **Glassmorphism utilities** at bottom define scrollbars, skeleton loaders, etc.

**How to modify:**

- **Change color scheme:** Edit the CSS variable values in `:root`, `.dark`, `.yellow` blocks
- **Add new utility classes:** Add to the appropriate `@layer` block
- **Change glass blur intensity:** Modify `--glass-blur` values

---

### File: `src/main.jsx` — Landing Page Entry Point

**Purpose:** Boots up the React app and attaches it to the DOM.

**What it does:**
```javascript
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

**That's it!** This file is intentionally minimal. All complexity is in `App.jsx` and components.

---

### Utility Files in `src/`

| File | Purpose |
|------|---------|
| `src/utils/blobStorage.js` | Stores PDFs in browser IndexedDB |
| `src/utils/pdfThumbnail.js` | Generates thumbnail images for PDFs |
| `src/services/pdfStorage.js` | PDF library management (CRUD operations) |
| `src/types/pdfTypes.js` | Type definitions (if using TypeScript) |
| `src/lib/utils.js` | General helper functions |

---

## Part 2: Chrome Extension (Vanilla JavaScript)

The extension code is **NOT React** — it's plain JavaScript that runs inside the browser. This is intentional: content scripts must be lightweight and fast, with zero framework overhead.

### File: `extension/content.js` — The Brain

**Purpose:** This is the most important file. It runs on **every webpage** you visit and:

1. **Detects text selection** (mouseup event)
2. **Shows the floating popup** with definition/translation/summary
3. **Handles user interactions** (click, drag, save, speak)
4. **Communicates with background.js** for API calls

**Key sections:**

1. **Pause-to-peek** (lines 84-156)
   - Waits for mouse to hover over a word for 600ms
   - Shows underline animation
   - Triggers popup on click

2. **Popup construction** (lines 258-449)
   ```javascript
   const popupEl = document.createElement('div');
   popupEl.innerHTML = `
     <div class="wl-popup">
       <!-- Popup HTML here -->
     </div>
   `;
   ```
   - Builds the entire popup as an HTML string
   - Injects into page DOM
   - Positions near selected text

3. **Event delegation** (lines 457-536)
   - Single click listener on popup handles all button clicks
   - Uses `e.target.closest()` to identify which button was clicked

4. **Message passing** (lines 538-595)
   ```javascript
   chrome.runtime.sendMessage(
     { type: 'LOOKUP_WORD', word: selectedText },
     (response) => { /* handle result */ }
   );
   ```
   - Sends requests to `background.js`
   - Receives API responses
   - Updates popup UI

5. **Drag functionality** (lines 643-739)
   - Allows moving popup by dragging header
   - Saves position to local storage

6. **Theme detection** (lines 741-808)
   - Analyzes page background color
   - Adjusts popup colors to match

**How to modify:**

- **Change popup appearance:** Edit the HTML string (lines 260-449) or CSS in `extension/content.css`
- **Adjust hover delay:** Change `IDLE_DELAY = 600` (line 67)
- **Add new action button:** Add button in HTML, handle click in event handler (around line 480)
- **Change default languages:** Modify `LANGUAGES` array (lines 30-43)

---

### File: `extension/background.js` — Service Worker

**Purpose:** Runs in the background (separate from webpages). Handles all API calls because content scripts can't make cross-origin requests directly.

**Key features:**

1. **API caching** (lines 1-22)
   ```javascript
   const apiCache = new Map();
   const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
   ```
   - Stores recent API responses in memory
   - Reduces duplicate API calls
   - Cache clears when extension reloads

2. **Retry logic** (lines 24-47)
   ```javascript
   async function fetchWithRetry(url, options, maxRetries = 2) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         const response = await fetch(url, options);
         if (!response.ok) throw new Error(...);
         return response;
       } catch (err) {
         await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
       }
     }
   }
   ```
   - Automatically retries failed requests
   - Exponential backoff: 500ms, 1000ms delays

3. **Message listener** (lines 63-142)
   - Listens for messages from content scripts
   - Each `message.type` triggers different function
   - `return true` keeps message channel open for async response

4. **API functions** (lines 145-350+)
   - `lookupWord()` → Dictionary API
   - `summarizeSentence()` → Groq AI API
   - `translateText()` → Google Translate
   - `getContextDefinition()` → Enhanced dictionary lookup
   - `getEtymology()` → Word origins
   - `getCEFRLevel()` → Language difficulty level

5. **Vault storage** (lines 362-450)
   - `saveToVault()` → Chrome storage
   - `getVault()` → Load saved words
   - `clearVault()` → Delete all

**How to modify:**

- **Add new API:** Create new function, add message handler case (around line 75)
- **Change cache TTL:** Modify `CACHE_TTL` (line 3)
- **Add API key validation:** Insert checks in each API function before fetch
- **Change retry count:** Update `maxRetries` parameter default

---

### File: `extension/popup.html` + `popup.js` — Vault UI

**Purpose:** The popup that shows the user's saved words (vault). Not to be confused with the floating lookup card (that's in `content.js`).

**`popup.html`** defines:
- Header with title and action buttons (PDF, Settings)
- Content area where vault items are rendered
- Styling for glassmorphism effect

**`popup.js`** does:
1. Loads vault from storage on startup
2. Renders each saved word as a card
3. Handles delete button clicks
4. Enqueues words for spaced repetition study (if implemented)

**Rendering function example:**
```javascript
function renderVaultItem(entry) {
  return `
    <div class="wl-vault-item">
      <div class="wl-vault-header-row">
        <h4 class="wl-vault-word">${escapeHtml(entry.word)}</h4>
        <div class="wl-vault-actions">
          <button class="wl-vault-btn speak">Speak</button>
          <button class="wl-vault-btn delete">Remove</button>
        </div>
      </div>
      <p class="wl-vault-context">${escapeHtml(entry.context)}</p>
      <p class="wl-vault-date">${formatDate(entry.savedAt)}</p>
    </div>
  `;
}
```

**How to modify:**

- **Change card layout:** Edit HTML template in `renderVaultItem()`
- **Add new field:** Update the template and storage schema
- **Change colors:** Edit CSS variables or `.wl-vault-item` styles

---

### File: `extension/sidepanel.html` + `sidepanel.js`

**Purpose:** The side panel that opens when user clicks extension icon. Shows quick stats and navigation.

**Not implemented yet** — currently minimal. Likely will show:
- Word count
- Study progress
- Quick links to settings

**How to modify:** Edit HTML structure in `sidepanel.html` and JS logic in `sidepanel.js`.

---

### File: `extension/content.css`

**Purpose:** Styles for the floating popup that appears when you select text.

**Key styles:**

1. **Glassmorphism** (lines 1-50)
   ```css
   .wl-popup {
     background: rgba(255, 255, 252, 0.65);
     backdrop-filter: blur(24px) saturate(180%);
     border: 1px solid rgba(255, 255, 255, 0.8);
     box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
   }
   ```

2. **Tabs** (definition, AI, translate)
   - Pill-shaped tabs with active indicator

3. **Loading and error states**
   - Skeleton loaders with shimmer animation
   - Error banners in red

4. **Responsive adjustments**
   - Prevents popup from going off-screen

**How to modify:**

- **Change popup width:** Edit `.wl-popup` max-width (line ~100)
- **Change border radius:** Adjust `border-radius` values
- **Add new animation:** Define `@keyframes` and apply to element

---

## Part 3: Configuration Files

### File: `manifest.json` — Extension Blueprint

**Purpose:** Tells Chrome everything about your extension: permissions, scripts, icons, entry points.

**Important fields:**

```json
{
  "manifest_version": 3,           // Chrome extension version (use 3)
  "name": "WordLens",             // Extension name
  "version": "2.0.0",             // Your version (must change on update)

  "action": {                     // What happens when user clicks toolbar icon
    "default_popup": "popup.html",
    "default_icon": "icons/icon.png"
  },

  "permissions": [                // What the extension CAN do
    "storage",                    // Save words to Chrome storage
    "activeTab"                   // Access current webpage
  ],

  "host_permissions": [           // Which websites extension CAN access
    "https://api.dictionaryapi.dev/*",
    "https://api.groq.com/*",
    "https://translate.google.com/*"
  ],

  "background": {                 // Service worker (background.js)
    "service_worker": "background.js"
  },

  "content_scripts": [{           // Script injected into webpages
    "matches": ["<all_urls>"],    // Runs on every website
    "js": ["content.js"],
    "css": ["content.css"],
    "run_at": "document_idle"
  ],

  "options_page": "options.html", // Settings dashboard
  "side_panel": {                 // Side panel (Chrome 114+)
    "default_path": "sidepanel.html"
  }
}
```

**How to modify:**

- **Request new permission:** Add to `permissions` array (e.g., `"bookmarks"`)
- **Add more websites:** Add to `host_permissions`
- **Change popup:** Modify `default_popup` filename
- **Update version:** Change `version` string (must increment for Chrome Web Store)

---

### File: `package.json` — Project Manifest

**Purpose:** NPM configuration, dependencies, scripts.

**Key sections:**

```json
{
  "name": "wordlens",
  "version": "2.0.0",
  "type": "module",                    // Use ES6 imports

  "scripts": {
    "dev": "vite",                     // Start dev server (landing page)
    "build": "vite build && node build-zip.cjs",  // Full build
    "build:extension": "vite build",  // Just build React
    "package": "node build-zip.cjs",  // Just create ZIP
    "lint": "eslint .",
    "preview": "vite preview"
  },

  "dependencies": {
    "react": "^19.2.0",                // React core
    "react-dom": "^19.2.0",
    "framer-motion": "^12.35.1",      // Animations
    "tailwindcss": "^4.2.1",          // CSS framework
    "@tailwindcss/vite": "^4.2.1",
    "react-pdf": "^10.4.1"            // PDF rendering
  },

  "devDependencies": {
    "vite": "^7.3.1",                 // Build tool
    "adm-zip": "^0.5.16",             // ZIP creation
    "eslint": "^9.39.1",              // Linting
    "imagemin": "...",                // Image optimization
    "sharp": "..."                    // WebP conversion
  }
}
```

**How to modify:**

- **Add new library:** `npm install package-name` updates automatically
- **Add custom script:** Add new key to `"scripts"` (e.g., `"test": "jest"`)
- **Change build command:** Edit the script value

---

### File: `vite.config.js` — Build Configuration

**Purpose:** Configures Vite build process for multi-page app + extension copy.

**Key parts:**

1. **Multi-page setup** (lines 41-48)
   ```javascript
   build: {
     rollupOptions: {
       input: {
         main: resolve(__dirname, 'index.html'),
         options: resolve(__dirname, 'options.html'),
         'pdf-viewer': resolve(__dirname, 'pdf-viewer.html'),
       },
     },
     outDir: 'dist',
   }
   ```
   - Each HTML file becomes a separate entry point
   - Vite bundles React code for each page separately

2. **Custom plugin** `copyExtensionFiles()` (lines 8-30)
   - Runs after React build completes
   - Copies `public/manifest.json`, `public/icons/`, and `extension/` to `dist/`
   - This makes `dist/` a complete, standalone Chrome extension

**How to modify:**

- **Add new page:** Create new `.html` file, add to `input` object
- **Change output directory:** Edit `outDir` (line 49)
- **Add copy task:** Extend the plugin's `closeBundle()` function

---

### File: `build-zip.cjs` — ZIP Packager

**Purpose:** Takes the `dist/` folder and creates a distributable ZIP file.

**How it works:**

1. Creates `AdmZip()` instance
2. Adds specific files/folders from `dist/` (manifest.json, icons/, extension/, options.html, assets/)
3. Adds a custom `INSTALLATION.txt` with instructions
4. Writes ZIP to project root

**To modify:**

- **Change included files:** Edit `include` array (lines 12-18)
- **Change installation instructions:** Edit `instructions` string (lines 44-73)
- **Change output filename:** Modify `outputZip` (line 90)

---

## Part 4: How Data Flows (Simple Diagram)

```
User selects word on webpage
        ↓
content.js detects selection (mouseup event)
        ↓
content.js shows popup near selection
        ↓
User clicks "Definition" tab
        ↓
content.js sends message to background.js:
  { type: 'LOOKUP_WORD', word: 'example' }
        ↓
background.js receives message
        ↓
background.js checks cache first
        ↓
If not cached → fetch() from Dictionary API
        ↓
API returns definition (JSON)
        ↓
background.js sends response back:
  { success: true, data: { ... } }
        ↓
content.js receives response
        ↓
content.js renders definition in popup
        ↓
User saves word → stored in chrome.storage.local
```

**Important:** Content scripts **cannot** make API calls to external servers directly due to CORS. That's why `background.js` (service worker) does it instead.

---

## Part 5: Practical Customization Examples

### Example 1: Change the accent color (green → blue)

1. Edit `src/index.css`:
   ```css
   :root {
     --accent: #3b82f6;  /* Change from #22c55e to blue */
   }
   ```

2. Rebuild: `npm run build`

### Example 2: Add a new translation language (e.g., German)

1. Open `extension/content.js`
2. Add to `LANGUAGES` array (around line 30):
   ```javascript
   { code: 'de', name: 'German' },
   ```
3. Optionally add pastel color to `PASTEL_COLORS` array

### Example 3: Increase API cache time (5 min → 15 min)

1. Open `extension/background.js`
2. Change line 3:
   ```javascript
   const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
   ```

### Example 4: Use different hero images on landing page

1. Replace files in `src/assets/` with your images (keep same names or rename)
2. If you rename, update imports in `src/App.jsx` (lines 6-11)
3. Rebuild: `npm run build`

### Example 5: Add a "Synonyms" feature

**Step 1:** Add API function in `extension/background.js`
```javascript
async function getSynonyms(word, apiKey) {
  const url = `https://api.datamuse.com/words?ml=${encodeURIComponent(word)}`;
  const response = await fetchWithRetry(url, {});
  return response.json();
}
```

**Step 2:** Add message handler
```javascript
if (message.type === 'GET_SYNONYMS') {
  getSynonyms(message.word, message.apiKey)
    .then(data => safeSendResponse({ success: true, data }))
    .catch(err => safeSendResponse({ success: false, error: err.message }));
  return true;
}
```

**Step 3:** Add tab in `extension/content.js` (modify `renderPopup()`)
```javascript
case 'synonyms':
  synonymsHtml = data.words.slice(0, 10).map(w => `<div class="synonym-chip">${w.word}</div>`).join('');
  container.innerHTML = `<div class="wl-tab-content">${synonymsHtml}</div>`;
  break;
```

---

## Part 6: Build & Development

### Commands

```bash
# Development: start hot-reload server for landing page
npm run dev
# Opens http://localhost:5173 — land on page updates as you code

# Build: creates dist/ with everything
npm run build
# Does both: vite build (React) + copy extension files + package ZIP

# Build extension only (React build, but no ZIP)
npm run build:extension

# Package only (creates ZIP from existing dist/)
npm run package

# Lint: check code quality
npm run lint
```

### Loading Extension in Chrome

1. Run `npm run build` (or `npm run build:extension`)
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked**
5. Select the `dist/` folder
6. Done! Extension is active

**To test changes:**

1. Edit `extension/content.js` or `extension/background.js`
2. Go to `chrome://extensions`
3. Click the **reload icon** (circular arrow) on WordLens card
4. Refresh any webpage to test

**Editing extension files does NOT require rebuild** — just reload the extension. But if you change React landing page code, you need `npm run build`.

---

## Part 7: Troubleshooting

### "Extension not showing up after loading"

- ✅ Did you select the **`dist/`** folder (not `extension/`)?
- ✅ Is Developer mode enabled?
- ✅ Check Chrome Console (Ctrl+Shift+J) for errors
- ✅ Did `npm run build` complete successfully?

### "Popup appears but data doesn't load"

- ✅ Is Groq API key set? (Click Settings in popup)
- ✅ Check `chrome://extensions` → WordLens → Inspect views → background.html (Console)
- ✅ Is there a network error? Open DevTools → Network tab
- ✅ Test the API URL directly in browser

### "Images not loading on landing page"

- ✅ Did you rebuild after adding images? (`npm run build`)
- ✅ Are images in `src/assets/` and imported correctly?
- ✅ Check DevTools → Network tab for 404 errors
- ✅ Images in `dist/assets/` should have hashed names

### "Build fails with module not found"

```bash
# Delete and reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### "WebP images show broken in old browser"

WebP is supported in all modern browsers. If you need legacy support (IE11, Safari <14), you'd need to fall back to JPG/PNG. But WordLens targets Chrome (Manifest V3), so WebP is safe.

---

## Part 8: Architecture Decisions (The "Why")

### Why Vanilla JS for extension?

**React would add ~130KB** to the extension. Content scripts run on every webpage — you don't want to inject a huge framework that might conflict with the page's own React/Vue/Angular. Vanilla JS is:
- Instant startup (no compile step)
- Zero framework overhead
- No global namespace pollution

**Trade-off:** More manual DOM manipulation, but that's fine for a small popup.

### Why React for landing page?

Landing page needs:
- Smooth animations (Framer Motion)
- Component reusability
- Fast iteration during design

React + Vite + Tailwind is perfect for this. And separate from extension, so no bundle size concerns.

### Why two separate codebases in one repo?

- Shared branding & release process
- Landing page promotes the extension
- Single `npm run build` produces both
- Easier to keep them in sync

### Why IIFE in content.js? (lines 6-9)

```javascript
(function() {
  // all code here
})();
```

**Purpose:** Creates a private scope. Variables declared inside don't leak to the webpage's global `window` object. Prevents conflicts with page's own scripts.

---

## Part 9: Files Reference (Quick Lookup)

| File | Lines (approx) | Purpose | Edit When... |
|------|----------------|---------|--------------|
| `src/App.jsx` | 480 | Landing page main | Change text, images, layout |
| `dynamic-hero.jsx` | 475 | Animated hero | Tweak animations, arrow behavior |
| `src/pages/options/Options.jsx` | ~250 | Saved words dashboard | Change vault display, add columns |
| `src/pages/pdf-viewer/PdfViewer.jsx` | ~500 | PDF viewer | Modify toolbar, add features |
| `src/pages/pdf-viewer/LibraryView.jsx` | ~150 | PDF library | Change grid, add thumbnails |
| `src/index.css` | 300+ | Global styles/theme | Change colors, fonts |
| `src/main.jsx` | 18 | Entry point | Rarely, if adding router |
| `extension/content.js` | 1500+ | Floating popup logic | Change popup behavior, add tabs |
| `extension/background.js` | 1000+ | API calls, storage | Add new APIs, modify cache |
| `extension/popup.html` + `.js` + `.css` | 588 + 300 + 560 | Vault popup UI | Edit vault card layout |
| `extension/sidepanel.html` + `.js` | ~100 each | Side panel | Add stats/navigation |
| `extension/content.css` | 900+ | Popup styles | Change popup appearance |
| `manifest.json` | 60 | Extension config | Add permissions, change name |
| `vite.config.js` | 52 | Build settings | Add pages, change output |
| `build-zip.cjs` | 99 | ZIP creation | Change ZIP contents |

---

## Part 10: Need Help?

### Resources
- **Detailed technical docs:** See `DOCUMENTATION.md` (973 lines, in-depth)
- **Chrome Extension docs:** https://developer.chrome.com/docs/extensions/
- **React docs:** https://react.dev/
- **Vite docs:** https://vitejs.dev/

### Common Tasks

**Add a new button to the popup:**
1. Find popup HTML in `extension/content.js` (lines 260-449)
2. Insert button with class `wl-popup-action-btn`
3. Add click handler in `handlePopupClick()` (lines 457-536)

**Change API endpoint:**
1. Open `extension/background.js`
2. Find the relevant function (`lookupWord`, `summarizeSentence`, etc.)
3. Edit the `url` variable

**Add a new theme (e.g., purple mode):**
1. Add `.purple` block in `src/index.css` (copy `.yellow` block)
2. Define purple colors: `--accent: #a855f7;`
3. Add logic in `App.jsx` to cycle themes

---

## Final Notes

WordLens is a **well-structured project** with clear separation:

- **Landing page** = marketing (React)
- **Extension** = functionality (Vanilla JS)
- **Build** = Vite bundling + custom ZIP packaging

Both parts are production-ready. The image optimization reduced size by 46% (28 MB → 15 MB). The extension uses modern features (Manifest V3) and best practices (caching, retry logic, IIFE isolation).

**Want to contribute?** Start by:
1. Running the project locally (`npm run build`, load `dist/`)
2. Exploring the code with this guide
3. Making small changes and rebuilding
4. Opening a PR when ready!

---

**Happy coding! 🚀**

*Made with care for quiet reading.*
