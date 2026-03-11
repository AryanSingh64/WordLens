<div align="center">

<br />

<!-- Replace with your actual logo path after building -->
<img src="public/icons/icon.png" alt="WordLens" width="64" height="64" />

<br />
<br />

<a href="https://github.com/AryanSingh64/WordLens">
  <img src="https://readme-typing-svg.demolab.com?font=Helvetica&weight=700&size=36&duration=3000&pause=800&color=E8E4DE&background=00000000&center=true&vCenter=true&width=400&lines=wordlens" alt="WordLens" />
</a>

<br />

<p align="center">
  <sub>A quiet reading companion. Select any text on the web — get the definition, a plain-English summary, or a translation. No context switching. No new tab.</sub>
</p>

<br />

<p align="center">
  <img alt="Manifest Version" src="https://img.shields.io/badge/Manifest-v3-c3d9c3?style=flat-square&labelColor=f0f0f0" />
  &nbsp;
  <img alt="React" src="https://img.shields.io/badge/React-19-b8d0e8?style=flat-square&labelColor=f0f0f0" />
  &nbsp;
  <img alt="Vite" src="https://img.shields.io/badge/Vite-7-d4c4e8?style=flat-square&labelColor=f0f0f0" />
  &nbsp;
  <img alt="License" src="https://img.shields.io/badge/License-MIT-e8d4b8?style=flat-square&labelColor=f0f0f0" />
</p>

<br />

</div>

---

<!-- Add a screenshot of the extension popup here -->
<!-- Suggested: 800×500 PNG showing the popup on a real article -->
<div align="center">
  <img
    src="docs/images/popup-preview.png"
    alt="WordLens popup on a webpage"
    width="720"
  />
</div>

---

## What it does

WordLens sits quietly in the background. When you highlight a word, it shows the dictionary definition, phonetic pronunciation, and an example sentence in a floating card that appears right next to your selection. For longer phrases or sentences, it switches to AI-powered plain-English summaries via Groq. Foreign text? One-click translation back to English.

You can drag the card anywhere, save words to your personal dictionary, and listen to any result read aloud. The card disappears the moment you click elsewhere.

---

## Features

<br />

<table>
<tr>
<td width="50%" valign="top">

**Dictionary lookup**  
Double-click any word for a definition, IPA phonetic, part of speech, and an example sentence pulled from the Free Dictionary API.

**AI summaries**  
Select a sentence or paragraph and get a concise, natural explanation from LLaMA 3.3 70B running on Groq. Add your free Groq API key in Settings.

**Translation**  
Highlight text in any language and translate to English in one click using Google Translate.

</td>
<td width="50%" valign="top">

**Listen aloud**  
Every result has a speak button. Uses the native browser Speech Synthesis API — works offline, zero latency.

**Save words**  
Bookmark any result with the star button. Your personal dictionary lives in the Settings dashboard, sorted newest first.

**Drag and reposition**  
The popup is freely draggable. Grab it anywhere and move it out of the way without closing it.

</td>
</tr>
</table>

<br />

<!-- Add a GIF or video showing the extension in use -->
<!-- Suggested: Screen recording of selecting text, seeing the popup, switching tabs -->
<div align="center">
  <img
    src="docs/images/demo.gif"
    alt="WordLens in use"
    width="720"
  />
</div>

---

## Tech stack

<br />

<table>
<thead>
<tr>
  <th align="left">Layer</th>
  <th align="left">Technology</th>
  <th align="left">Why</th>
</tr>
</thead>
<tbody>
<tr>
  <td>Extension core</td>
  <td>
    <img src="https://img.shields.io/badge/Vanilla_JS-ES2022-c9dfc9?style=flat-square&labelColor=f4f4f4" />
  </td>
  <td>Zero overhead. No bundling needed. Injects into any page without framework conflicts.</td>
</tr>
<tr>
  <td>Landing page</td>
  <td>
    <img src="https://img.shields.io/badge/React-19-b8d0e8?style=flat-square&labelColor=f4f4f4" />
    <img src="https://img.shields.io/badge/Vite-7-d4c4e8?style=flat-square&labelColor=f4f4f4" />
    <img src="https://img.shields.io/badge/Tailwind-4-c3d9c3?style=flat-square&labelColor=f4f4f4" />
  </td>
  <td>Fast iteration. Multi-page build shares the same repo and release pipeline as the extension.</td>
</tr>
<tr>
  <td>AI summaries</td>
  <td>
    <img src="https://img.shields.io/badge/Groq-LLaMA_3.3_70B-e8d4c3?style=flat-square&labelColor=f4f4f4" />
  </td>
  <td>Free tier. OpenAI-compatible API. Sub-second response times on large context.</td>
</tr>
<tr>
  <td>Dictionary</td>
  <td>
    <img src="https://img.shields.io/badge/Free_Dictionary_API-open-dce8d4?style=flat-square&labelColor=f4f4f4" />
  </td>
  <td>No API key. Returns IPA phonetics, multiple definitions, and usage examples.</td>
</tr>
<tr>
  <td>Translation</td>
  <td>
    <img src="https://img.shields.io/badge/Google_Translate-unofficial-d4dce8?style=flat-square&labelColor=f4f4f4" />
  </td>
  <td>The <code>client=gtx</code> endpoint works without authentication for reading use cases.</td>
</tr>
<tr>
  <td>Storage</td>
  <td>
    <img src="https://img.shields.io/badge/chrome.storage.local-MV3-e8e4c3?style=flat-square&labelColor=f4f4f4" />
  </td>
  <td>Persists saved words and API key across tabs and browser restarts without a server.</td>
</tr>
<tr>
  <td>PDF reader</td>
  <td>
    <img src="https://img.shields.io/badge/react--pdf-pdfjs-c3d4e8?style=flat-square&labelColor=f4f4f4" />
  </td>
  <td>Same selection tools work inside any PDF dropped into the built-in viewer.</td>
</tr>
</tbody>
</table>

<br />

---

## Screenshots

<br />

<!-- Replace these placeholder paths with real screenshots -->

<div align="center">
<table>
<tr>
<td align="center">
  <img src="docs/images/screenshot-dictionary.png" width="340" alt="Dictionary view" />
  <br />
  <sub>Dictionary tab</sub>
</td>
<td align="center">
  <img src="docs/images/screenshot-ai.png" width="340" alt="AI summary view" />
  <br />
  <sub>AI summary tab</sub>
</td>
</tr>
<tr>
<td align="center">
  <img src="docs/images/screenshot-translate.png" width="340" alt="Translate view" />
  <br />
  <sub>Translation tab</sub>
</td>
<td align="center">
  <img src="docs/images/screenshot-dashboard.png" width="340" alt="Saved words dashboard" />
  <br />
  <sub>Saved words dashboard</sub>
</td>
</tr>
</table>
</div>

---

## Getting started

### Prerequisites

- Node.js 18+
- Chrome 109+ (Manifest V3 support)
- A free [Groq API key](https://console.groq.com) for AI summaries (optional)

### Installation

```bash
# Clone the repo
git clone https://github.com/AryanSingh64/WordLens.git
cd WordLens

# Install dependencies
npm install

# Build the extension and landing page
npm run build
```

Load into Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode** in the top right
3. Click **Load unpacked**
4. Select the `dist/` folder

The extension is now active on every tab. Select any text to see it in action.

### Development

```bash
# Start the landing page dev server
npm run dev
```

The extension files in `/extension` are plain JS — edit them directly and reload the extension at `chrome://extensions` to see changes.

---

## Project structure

```
WordLens/
├── extension/
│   ├── content.js       # Injected into every page — UI, events, popup logic
│   ├── background.js    # Service worker — API calls, storage, settings routing
│   └── content.css      # Scoped styles for the floating card
│
├── src/
│   ├── App.jsx          # Landing page
│   ├── pages/
│   │   ├── options/     # Saved words dashboard
│   │   └── pdf-viewer/  # Built-in PDF reader
│   └── components/ui/
│       └── dynamic-hero.jsx  # Mouse-tracking canvas hero
│
├── public/
│   ├── manifest.json    # Chrome Extension config
│   └── icons/           # Brand icon (generated from SVG via make_icon.cjs)
│
└── vite.config.js       # Multi-page build + extension copy plugin
```

---

## How the extension works

The full technical walkthrough — including every function, the message passing architecture, API parsing, XSS prevention, and the build pipeline — is in [DOCUMENTATION.md](./DOCUMENTATION.md).

Short version:

```
Text selected on page
      │
      ▼
content.js detects mouseup
      │    → single word? → Dictionary tab
      │    → phrase/sentence? → AI tab
      ▼
chrome.runtime.sendMessage(...)
      │
      ▼
background.js (service worker)
      │    → fetch() to external API (no CORS restriction here)
      │    → parse response
      ▼
sendResponse({ success: true, data })
      │
      ▼
content.js renders result into the floating card
```

---

## Adding your Groq API key

AI summaries require a Groq API key. Groq is free to sign up and has a generous rate limit.

1. Get a key at [console.groq.com](https://console.groq.com)
2. Click the **Settings** button inside any WordLens popup  
   — or open `chrome://extensions` → WordLens → Extension options
3. Paste your key into the Groq API Key field and click **Save Key**

The key is stored locally in `chrome.storage.local` and never leaves your browser.

---

## Contributing

Pull requests are welcome. For significant changes, open an issue first to discuss the direction.

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Make changes, then build to verify
npm run build

# Open a PR against main
```

Please keep the extension files as plain JS — no framework dependencies in `/extension`.

---

## License

MIT — see [LICENSE](./LICENSE) for details.

---

<div align="center">

<br />

Built to make reading a bit quieter.

<br />

<img src="https://img.shields.io/badge/made_with-care-c3d9c3?style=flat-square&labelColor=f4f4f4" />

<br />
<br />

</div>
