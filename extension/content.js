// We inject - create an empty div, give it id and glue it to the bottom of the page
const POPUP_ID = 'wordlens-popup-root';
let popupEl = null;

// Dragging state
let isDragging = false;
let wasJustDragged = false; // Prevents hidePopup after dragging
let dragOffsetX = 0;
let dragOffsetY = 0;

// Map to hold speak-button text content (avoids broken data-attribute escaping)
const speakTextMap = new Map();

// Configuration constants
const CONFIG = {
  POPUP_WIDTH: 400,
  POPUP_HEIGHT_MIN: 250,
  MARGIN: 12,
  MAX_SELECTION_LENGTH: 500, // Increased from 300 for flexibility
  MOUSEUP_DELAY: 10,
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes in milliseconds
};

// Chrome API compatibility shim - ensures we have access to chrome.runtime and chrome.storage
const chromeSafe = (() => {
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    console.warn('WordLens: Chrome extension APIs not available');
    return null;
  }
  return chrome;
})();

let currentTab = 'dictionary';
let currentSelection = '';
let isCurrentSelectionWord = true;

// Translate: target language selection (default English)
let targetLanguage = 'en'; // ISO 639-1 codes (en, es, hi, ru, ja, zh-CN, etc.)

// Supported languages for translation dropdown
const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'ko', name: 'Korean' },
];

// Helper: get language name from code
function getLanguageName(code) {
  const lang = LANGUAGES.find(l => l.code === code);
  return lang ? lang.name : code;
}

// Load config from storage and listen for changes
function loadConfig() {
  if (chromeSafe && chromeSafe.storage && chromeSafe.storage.local) {
    chrome.storage.local.get(['maxSelectionLength'], (result) => {
      if (result.maxSelectionLength) {
        const val = parseInt(result.maxSelectionLength, 10);
        if (!isNaN(val) && val > 0) {
          CONFIG.MAX_SELECTION_LENGTH = val;
        }
      }
    });
  }
}

if (chromeSafe && chromeSafe.storage && chromeSafe.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (changes.maxSelectionLength) {
      const newVal = parseInt(changes.maxSelectionLength.newValue, 10);
      if (!isNaN(newVal) && newVal > 0) {
        CONFIG.MAX_SELECTION_LENGTH = newVal;
      }
    }
  });
}

// Load config on startup
loadConfig();

function renderMasterContainer(text, isWord) {
  currentSelection = text;
  isCurrentSelectionWord = isWord;

  currentTab = isWord ? 'dictionary' : 'ai';

  popupEl.innerHTML = `<div class="wl-card wl-card-layout">
            <!-- Left Sidebar -->
            <div class="wl-sidebar">
                <button class="wl-tab-btn ${currentTab === 'dictionary' ? 'active' : ''}" id="wl-tab-dict" title="Dictionary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                  <span>Dictionary</span>
                </button>
                <button class="wl-tab-btn ${currentTab === 'ai' ? 'active' : ''}" id="wl-tab-ai" title="AI Summary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8.01" y2="16"></line><line x1="16" y1="16" x2="16.01" y2="16"></line></svg>
                  <span>Summary</span>
                </button>
                <button class="wl-tab-btn" id="wl-tab-trans" title="Translate">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                  <span>Translate</span>
                </button>
                
                <div class="wl-spacer"></div> <!-- Pushes the next buttons to the bottom -->
                
                <button class="wl-action-btn" id="wl-btn-save" title="Save Word">
                  <svg id="wl-icon-save" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                  <span>Save</span>
                </button>
                <button class="wl-action-btn" id="wl-btn-settings" title="Dashboard">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                  <span>Settings</span>
                </button>
            </div>
            
            <!-- Right Content Area -->
            <div class="wl-content-area relative" id="wl-main-content">
                <!-- SVG Icon Header -->
                <div style="position: absolute; top: 12px; right: 16px; display: flex; align-items: center; gap: 4px; opacity: 0.5; pointer-events: none;">
                    <svg viewBox="0 0 100 100" width="16" height="16">
                      <rect x="0" y="0" width="20" height="20" fill="#00F5D4" />
                      <rect x="0" y="20" width="20" height="20" fill="#00F5D4" />
                      <rect x="0" y="40" width="20" height="20" fill="#00F5D4" />
                      <rect x="0" y="60" width="20" height="20" fill="#00F5D4" />
                      <rect x="20" y="80" width="20" height="20" fill="#00BBF9" />
                      <rect x="40" y="40" width="20" height="20" fill="#9B5DE5" />
                      <rect x="40" y="60" width="20" height="20" fill="#9B5DE5" />
                      <rect x="60" y="80" width="20" height="20" fill="#F15BB5" />
                      <rect x="80" y="0" width="20" height="20" fill="#FF006E" />
                      <rect x="80" y="20" width="20" height="20" fill="#FF006E" />
                      <rect x="80" y="40" width="20" height="20" fill="#FF006E" />
                      <rect x="80" y="60" width="20" height="20" fill="#FF006E" />
                    </svg>
                    <span style="font-family: Arial, Helvetica, sans-serif; font-weight: 700; font-size: 13px; letter-spacing: -0.05em; color: var(--wl-text); display:flex; align-items: flex-start; line-height: 1;">
                       wordlens<sup style="font-size: 8px; margin-left: 1px;">®</sup>
                    </span>
                </div>
                <!-- Our definition or AI summary goes here! -->
            </div>
        </div>
    `;


  //attaching event listners
  setupTabListners();

  loadTabContent();


}




//attches clicks to the new sidebar

// Global keyboard shortcuts (attached once in initWordLens)
function handleGlobalKeydown(e) {
  if (!popupEl || !popupEl.classList.contains('wl-show')) return;

  if (e.key === 'Escape') {
    hidePopup();
    return;
  }

  if (e.key === '1') {
    switchTab('dictionary');
  } else if (e.key === '2') {
    switchTab('ai');
  } else if (e.key === '3') {
    switchTab('translate');
  }
}

function switchTab(tabName) {
  if (currentTab !== tabName) {
    currentTab = tabName;
    updateActiveTabStyles();
    loadTabContent();
  }
}

function setupTabListners() {
  document.getElementById('wl-tab-dict').addEventListener('click', () => {
    currentTab = 'dictionary';
    updateActiveTabStyles();
    loadTabContent();
  });

  document.getElementById('wl-tab-ai').addEventListener('click', () => {
    currentTab = 'ai';
    updateActiveTabStyles();
    loadTabContent();
  });

  document.getElementById('wl-tab-trans').addEventListener('click', () => {
    currentTab = 'translate';
    updateActiveTabStyles();
    loadTabContent();
  });

  document.getElementById('wl-btn-save').addEventListener('click', () => {
    // Collect the word and its definition/translation/summary from the UI to save
    const word = currentSelection;
    let textContent = '';

    // Attempt to grab the text currently displayed in the definition box
    const definitionEl = document.querySelector('#wl-main-content .wl-definition');
    const exampleEl = document.querySelector('#wl-main-content .wl-example');

    if (definitionEl) {
      textContent = definitionEl.textContent;
    }
    if (exampleEl) {
      textContent += ' ' + exampleEl.textContent;
    }

    if (!word || !textContent) return; // Prevent saving empty loaders

    if (!chromeSafe || !chromeSafe.storage || !chromeSafe.storage.local) {
      console.error('WordLens: Storage API not available');
      return;
    }

    chrome.storage.local.get(['savedWords'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Storage get error:', chrome.runtime.lastError);
        return;
      }
      const words = result.savedWords || [];
      // avoid duplicates based on exact word
      const existsIndex = words.findIndex(w => w.word.toLowerCase() === word.toLowerCase());

      if (existsIndex === -1) {
        words.push({ word, meaning: textContent, date: Date.now() });
        chrome.storage.local.set({ savedWords: words }, () => {
          if (chrome.runtime.lastError) {
            console.error('Storage set error:', chrome.runtime.lastError);
            return;
          }
          // Provide visual feedback (Green Saved state)
          const saveIcon = document.getElementById('wl-icon-save');
          const btnSpan = document.querySelector('#wl-btn-save span');
          if (saveIcon) {
            saveIcon.setAttribute('fill', 'currentColor');
            saveIcon.style.color = 'var(--wl-accent)';
          }
          if (btnSpan) btnSpan.textContent = 'Saved!';
        });
      } else {
        // Provide visual feedback (Already Saved state)
        const btnSpan = document.querySelector('#wl-btn-save span');
        if (btnSpan) btnSpan.textContent = 'Already';
        setTimeout(() => { if (btnSpan) btnSpan.textContent = 'Saved' }, 2000);
      }
    });
  });

  document.getElementById('wl-btn-settings').addEventListener('click', () => {
    if (chromeSafe && chromeSafe.runtime && chromeSafe.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS_PAGE' });
    } else {
      console.error('WordLens: Runtime API not available for opening options page');
    }
  });

  // Check if word is already saved on load to fill the star
  if (chromeSafe && chromeSafe.storage && chromeSafe.storage.local) {
    chrome.storage.local.get(['savedWords'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Storage get error:', chrome.runtime.lastError);
        return;
      }
      const words = result.savedWords || [];
      const exists = words.some(w => w.word.toLowerCase() === currentSelection.toLowerCase());
      if (exists) {
        const saveIcon = document.getElementById('wl-icon-save');
        const btnSpan = document.querySelector('#wl-btn-save span');
        if (saveIcon) {
          saveIcon.setAttribute('fill', 'currentColor');
          saveIcon.style.color = 'var(--wl-accent)';
        }
        if (btnSpan) btnSpan.textContent = "Saved";
      }
    });
  }

  // Attach a delegated event listener to handle clicks on the dynamic pronounce buttons
  document.getElementById('wl-main-content').addEventListener('click', (e) => {
    const speakBtn = e.target.closest('.wl-speak-btn');
    if (speakBtn) {
      // Check if this is a phonetic audio button (has data-audio-url) or TTS button (has data-speak-id)
      const audioUrl = speakBtn.dataset.audioUrl;
      if (audioUrl) {
        // Play the actual audio file
        window.speechSynthesis.cancel(); // Stop any ongoing TTS
        const audio = new Audio(audioUrl);
        audio.play().catch(err => console.error('Audio play failed:', err));
      } else {
        // Text-to-speech using browser's speech synthesis
        const speakId = speakBtn.dataset.speakId;
        const textToSpeak = (speakId && speakTextMap.get(speakId)) || currentSelection;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }
    }

    const copyBtn = e.target.closest('.wl-copy-btn');
    if (copyBtn) {
      const textToCopy = copyBtn.dataset.copyText || currentSelection;
      navigator.clipboard.writeText(textToCopy).then(() => {
        // Visual feedback
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        copyBtn.style.color = 'var(--wl-accent)';
        setTimeout(() => {
          copyBtn.innerHTML = originalHTML;
          copyBtn.style.color = '';
        }, 2000);
      }).catch(err => {
        console.error('Copy failed:', err);
      });
    }

    const retryBtn = e.target.closest('.wl-retry-btn');
    if (retryBtn) {
      if (chromeSafe && chromeSafe.runtime && chromeSafe.runtime.sendMessage) {
        loadTabContent(); // Retry the current request
      } else {
        console.error('WordLens: Cannot retry - runtime API not available');
      }
    }
  });
}




function updateActiveTabStyles() {
  // Remove "active" class from all tabs
  document.querySelectorAll('.wl-tab-btn').forEach(btn => btn.classList.remove('active'));

  // Add "active" to the exact one we are on
  if (currentTab === 'dictionary') document.getElementById('wl-tab-dict').classList.add('active');
  if (currentTab === 'ai') document.getElementById('wl-tab-ai').classList.add('active');
  if (currentTab === 'translate') document.getElementById('wl-tab-trans').classList.add('active');
}



function initWordLens() {
  // Prevent adding the listener multiple times if Chrome injects it twice
  if (document.getElementById(POPUP_ID)) return;

  // Create the invisible container and mount it directly to the body of whatever website we are on
  popupEl = document.createElement('div');
  popupEl.id = POPUP_ID;
  document.body.appendChild(popupEl);

  // Listen for the moment the user finishes a mouse click/drag
  document.addEventListener('mouseup', handleMouseUp);

  // if we click outside the box then its off
  document.addEventListener('mousedown', handleMouseDown);

  // Setup drag-to-move on the popup
  setupDrag();

  // Global keyboard shortcuts (only added once)
  document.addEventListener('keydown', handleGlobalKeydown);
}


function loadTabContent() {
  const mainContentArea = document.getElementById('wl-main-content');

  // Clear out the old stuff and put a loading skeleton
  mainContentArea.innerHTML = `
    <div class="wl-header" style="align-items: center; justify-content: flex-start; gap: 8px;">
      <h3 class="wl-word">${escapeHTML(currentSelection.slice(0, 30))}${currentSelection.length > 30 ? '...' : ''}</h3>
      <button class="wl-speak-btn" data-text="${escapeHTML(currentSelection)}" title="Pronounce">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
      </button>
    </div>
    <div class="wl-skeleton-pulse" style="margin-top: 10px;"></div>
    <div class="wl-skeleton-pulse" style="width: 80%; margin-top: 6px;"></div>
  `;

  // Call the correct API based on the tab!
  if (currentTab === 'dictionary') {
    if (!isCurrentSelectionWord) {
      mainContentArea.innerHTML = renderErrorHtml(currentSelection, "The Dictionary tab only works for single words. Try AI Summary or Translate!");
      return;
    }

    if (!chromeSafe || !chromeSafe.runtime || !chromeSafe.runtime.sendMessage) {
      mainContentArea.innerHTML = renderErrorHtml(currentSelection,
        "Runtime messaging not available. Please reload the extension."
      );
      return;
    }

    chrome.runtime.sendMessage({ type: 'LOOKUP_WORD', word: currentSelection }, (response) => {
      // Check for runtime errors first (like "The message port closed before a response was received.")
      if (chrome.runtime.lastError) {
        // Silently ignore if popup was closed - this is expected
        if (popupEl && !popupEl.classList.contains('wl-show')) {
          return;
        }
        console.error('SendMessage error:', chrome.runtime.lastError);
        return;
      }

      // If the user closed the popup or clicked another tab while waiting, ignore the response
      if (!popupEl || !popupEl.classList.contains('wl-show') || currentTab !== 'dictionary') return;

      if (response && response.success) {
        mainContentArea.innerHTML = renderDefinitionHtml(response.data);
      } else {
        // Fallback: the dictionary API doesn't know shortened words like "can't"
        const errorMsg = response?.error || 'Word not found';
        mainContentArea.innerHTML = renderErrorHtml(currentSelection,
          `${errorMsg}. Try the AI Summary or Translate tabs for other ways to understand this text.`
        );
      }
    });

  } else if (currentTab === 'ai') {
    if (!chromeSafe || !chromeSafe.storage || !chromeSafe.storage.local) {
      mainContentArea.innerHTML = renderErrorHtml(currentSelection,
        "Storage API not available. Please reload the extension."
      );
      return;
    }

    chrome.storage.local.get(['groqApiKey'], (result) => {
      if (chrome.runtime.lastError) {
        console.error('Storage get error:', chrome.runtime.lastError);
        mainContentArea.innerHTML = renderErrorHtml(currentSelection,
          'Failed to access storage. Please reload the page.'
        );
        return;
      }
      const apiKey = result.groqApiKey;
      if (!apiKey) {
        mainContentArea.innerHTML = renderErrorHtml(currentSelection,
          "AI Summary requires a free Groq API key. Click the Settings (gear) icon to add your key and unlock this feature."
        );
        return;
      }

      if (!chromeSafe || !chromeSafe.runtime || !chromeSafe.runtime.sendMessage) {
        mainContentArea.innerHTML = renderErrorHtml(currentSelection,
          "Runtime messaging not available. Please reload the extension."
        );
        return;
      }

      chrome.runtime.sendMessage({ type: 'SUMMARIZE_SENTENCE', text: currentSelection, apiKey: apiKey }, (response) => {
        // Check for runtime errors first (like "The message port closed before a response was received.")
        if (chrome.runtime.lastError) {
          // Silently ignore if popup was closed - this is expected
          if (popupEl && !popupEl.classList.contains('wl-show')) {
            return;
          }
          console.error('SendMessage error:', chrome.runtime.lastError);
          return;
        }

        if (!popupEl || !popupEl.classList.contains('wl-show') || currentTab !== 'ai') return;

        if (response && response.success) {
          mainContentArea.innerHTML = renderSummaryHtml(currentSelection, response.data.summary);
        } else {
          const err = response?.error || 'Failed to connect to Groq AI.';
          mainContentArea.innerHTML = renderErrorHtml(currentSelection,
            `${err} Verify your API key in Settings and check your internet connection.`
          );
        }
      });
    });

  } else if (currentTab === 'translate') {
    if (!chromeSafe || !chromeSafe.runtime || !chromeSafe.runtime.sendMessage) {
      mainContentArea.innerHTML = renderErrorHtml(currentSelection,
        "Runtime messaging not available. Please reload the extension."
      );
      return;
    }

    chrome.runtime.sendMessage({ type: 'TRANSLATE_TEXT', text: currentSelection, targetLang: targetLanguage }, (response) => {
      // Check for runtime errors first
      if (chrome.runtime.lastError) {
        // Silently ignore if popup was closed - this is expected
        if (popupEl && !popupEl.classList.contains('wl-show')) {
          return;
        }
        console.error('SendMessage error:', chrome.runtime.lastError);
        return;
      }

      if (!popupEl || !popupEl.classList.contains('wl-show') || currentTab !== 'translate') return;

      if (response && response.success) {
        const { translation, detectedLang } = response.data;
        mainContentArea.innerHTML = renderTranslateHtml(currentSelection, translation, detectedLang, targetLanguage);

        // Attach language selector change listener
        const langSelect = document.getElementById('wl-lang-select');
        if (langSelect) {
          langSelect.value = targetLanguage; // Ensure dropdown reflects current targetLanguage
          langSelect.addEventListener('change', (e) => {
            targetLanguage = e.target.value;
            // Re-fetch translation with new target language
            loadTabContent();
          });
        }
      } else {
        const err = response?.error || 'Translation failed.';
        mainContentArea.innerHTML = renderErrorHtml(currentSelection,
          `${err} Check your connection or try a shorter selection.`
        );
      }
    });
  }
}

// ─── Mouse & Drag Events ───

function handleMouseUp(event) {
  // If we just finished dragging, don't trigger a new lookup
  if (isDragging) {
    isDragging = false;
    wasJustDragged = true; // Mark that we just completed a drag
    return;
  }
  // If the user is selecting text inside our popup itself, don't trigger the logic
  if (popupEl.contains(event.target)) return;

  setTimeout(() => {
    // windows .get selection is used to get the selected , its inbuilt
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text.length > 0 && text.length < CONFIG.MAX_SELECTION_LENGTH) {
      // Determine if it's a single word or a phrase/sentence
      //   /\s+/ is a regex meaning "one or more spaces"). If the result is a single chunk, it's a word. If it's multiple chunks, it's a sentence. That's how "Dictionary" vs "Lens Summary" gets decided.
      const isWord = text.split(/\s+/).length === 1;

      // positioning the popup
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // rect coords are already viewport coords — showPopup handles safe placement.
      showPopup(rect.left, rect, text, isWord);
    } else if (text.length === 0) {
      // If the selection is empty (they clicked away), hide the card
      hidePopup();
    }
  }, CONFIG.MOUSEUP_DELAY);
}

function handleMouseDown(event) {
  // If we just finished dragging, ignore this click to prevent accidental hide
  if (wasJustDragged) {
    wasJustDragged = false;
    return;
  }

  // Hide popup if the user clicks anywhere outside of it
  if (popupEl && !popupEl.contains(event.target)) {
    const selection = window.getSelection();
    if (selection.toString().trim().length === 0) {
      hidePopup();
    }
  }
}

function showPopup(x, rect, text, isWord) {
  // Use fixed positioning (viewport coords) so dragging is simple and consistent.
  // The popup card is CONFIG.POPUP_WIDTH wide; keep a CONFIG.MARGIN from each edge.

  // x comes from rect.left (already viewport coords — no scrollX needed for fixed)
  let safeX = rect.left;
  if (safeX + CONFIG.POPUP_WIDTH > window.innerWidth - CONFIG.MARGIN) {
    safeX = window.innerWidth - CONFIG.POPUP_WIDTH - CONFIG.MARGIN;
  }
  if (safeX < CONFIG.MARGIN) safeX = CONFIG.MARGIN;

  // Check if there's enough room below the selection (~CONFIG.POPUP_HEIGHT_MIN for the card)
  const spaceBelow = window.innerHeight - rect.bottom;
  let safeY;

  if (spaceBelow < CONFIG.POPUP_HEIGHT_MIN) {
    // Not enough room below — place it ABOVE the selection
    safeY = rect.top - CONFIG.POPUP_HEIGHT_MIN - 8;
    if (safeY < CONFIG.MARGIN) safeY = CONFIG.MARGIN;
  } else {
    // Plenty of room below — place it under the selection as usual
    safeY = rect.bottom + 8;
  }

  popupEl.style.left = `${safeX}px`;
  popupEl.style.top = `${safeY}px`;

  // Make it display: block before we add the animation class
  popupEl.style.display = 'block';

  // Force browser to recalculate layout so the CSS transition works
  void popupEl.offsetWidth;
  popupEl.classList.add('wl-show');

  // Inject the skeleton HTML
  renderMasterContainer(text, isWord);
}

/**
 * Makes the popup draggable. User can grab anywhere on the card
 * and drag it to reposition.
 */
function setupDrag() {
  popupEl.addEventListener('mousedown', (e) => {
    // Only start dragging if clicking on the card itself (not on input fields etc.)
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    isDragging = true;
    wasJustDragged = false;

    // Since popup is position:fixed, getBoundingClientRect().left IS the CSS left value.
    const popupRect = popupEl.getBoundingClientRect();
    dragOffsetX = e.clientX - popupRect.left;
    dragOffsetY = e.clientY - popupRect.top;

    // Change cursor to "grabbing" while dragging
    popupEl.style.cursor = 'grabbing';

    // Prevent text selection while dragging
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    // With position:fixed, no scrollX/Y adjustment needed — clientX IS the viewport coord.
    const popupHeight = popupEl.offsetHeight || CONFIG.POPUP_HEIGHT_MIN;

    let newX = e.clientX - dragOffsetX;
    let newY = e.clientY - dragOffsetY;

    // Clamp so the popup never slides fully off-screen
    newX = Math.max(CONFIG.MARGIN, Math.min(newX, window.innerWidth - CONFIG.POPUP_WIDTH - CONFIG.MARGIN));
    newY = Math.max(CONFIG.MARGIN, Math.min(newY, window.innerHeight - popupHeight - CONFIG.MARGIN));

    popupEl.style.left = `${newX}px`;
    popupEl.style.top = `${newY}px`;
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      popupEl.style.cursor = 'grab';
      // isDragging is set to false in the main handleMouseUp
      // wasJustDragged is set there as well
    }
  });
}

function hidePopup() {
  if (popupEl && popupEl.classList.contains('wl-show')) {
    popupEl.classList.remove('wl-show');

    // Wait for the fade-out CSS transition (0.2s) to finish before removing from layout
    setTimeout(() => {
      popupEl.style.display = 'none';
      popupEl.innerHTML = '';
      speakTextMap.clear(); // Prevent memory leak
      wasJustDragged = false; // Reset drag flag
    }, 200);
  }
}

// ─── Helpers to generate inside-the-box HTML ───

function renderDefinitionHtml(data) {
  const meaningsHTML = data.meanings.map(m => `
    <div style="margin-bottom: 8px;">
      <span class="wl-tag">${m.partOfSpeech}</span>
      <p class="wl-definition" style="margin-top: 4px;">${m.definition}</p>
      ${m.example ? `<p class="wl-example"><em>"${m.example}"</em></p>` : ''}
    </div>
  `).join('');

  const speakId = 'speak-' + Date.now();
  speakTextMap.set(speakId, data.word);

  const fullText = `${data.word} ${data.phonetic ? '(' + data.phonetic + ')' : ''}\n\n${data.meanings.map(m => `${m.partOfSpeech}: ${m.definition}${m.example ? '\n"' + m.example + '"' : ''}`).join('\n\n')}`;

  // PHONETIC AUDIO BUTTON (if audio URL exists)
  const audioBtnHtml = data.audio
    ? `<button class="wl-speak-btn" data-audio-url="${escapeHTML(data.audio)}" title="Play pronunciation">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
      </button>`
    : '';

  return `
    <div class="wl-header" style="align-items: center; justify-content: flex-start; gap: 8px;">
      <h3 class="wl-word">${escapeHTML(data.word)}</h3>
      ${audioBtnHtml}
      <button class="wl-speak-btn" data-speak-id="${speakId}" title="Text-to-speech">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
      </button>
      <span class="wl-phonetic" style="margin-left: 4px;">${data.phonetic || ''}</span>
      <button class="wl-copy-btn" data-copy-text="${escapeHTML(fullText)}" title="Copy to clipboard" style="margin-left: auto;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
      </button>
    </div>
    <div style="overflow-y: auto; max-height: 180px; padding-right: 4px; margin-top: 8px;">
      ${meaningsHTML}
    </div>
  `;
}

function renderSummaryHtml(title, text) {
  // Store the full summary text in the JS map so the speaker reads the whole thing.
  const speakId = 'speak-' + Date.now();
  speakTextMap.set(speakId, text);

  const fullText = `${title}\n\n${text}`;

  return `
    <div class="wl-header" style="align-items: center; justify-content: flex-start; gap: 8px;">
      <h3 class="wl-word" style="font-size: 14px; font-weight: 500;">${escapeHTML(title.slice(0, 40))}${title.length > 40 ? '...' : ''}</h3>
      <button class="wl-speak-btn" data-speak-id="${speakId}" title="Listen to summary">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
      </button>
      <button class="wl-copy-btn" data-copy-text="${escapeHTML(fullText)}" title="Copy to clipboard" style="margin-left: auto;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
      </button>
    </div>
    <div style="overflow-y: auto; max-height: 180px; padding-right: 4px; margin-top: 8px;">
      <p class="wl-definition">${escapeHTML(text)}</p>
    </div>
  `;
}

// Specialized render for translate tab with language dropdown and detected source display
function renderTranslateHtml(originalText, translation, detectedLang, targetLang) {
  // Store full translation for TTS
  const speakId = 'speak-' + Date.now();
  speakTextMap.set(speakId, translation);
  const fullText = `${originalText}\n\n${translation}`;

  // Build language selector options
  const langOptions = LANGUAGES.map(lang =>
    `<option value="${lang.code}" ${lang.code === targetLang ? 'selected' : ''}>${lang.name}</option>`
  ).join('');

  // Show detected source language
  const detectedDisplay = detectedLang ? `From: ${getLanguageName(detectedLang)}` : 'Auto-detected';

  return `
    <div class="wl-header" style="align-items: center; justify-content: flex-start; gap: 8px; flex-wrap: wrap;">
      <h3 class="wl-word" style="font-size: 14px; font-weight: 500;">${escapeHTML(originalText.slice(0, 30))}${originalText.length > 30 ? '...' : ''}</h3>
      <button class="wl-speak-btn" data-speak-id="${speakId}" title="Listen to translation">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
      </button>
      <button class="wl-copy-btn" data-copy-text="${escapeHTML(fullText)}" title="Copy to clipboard" style="margin-left: auto;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
      </button>
    </div>

    <!-- Language controls: dropdown and detected source -->
    <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px; flex-wrap: wrap;">
      <select id="wl-lang-select" class="wl-lang-select" style="flex: 1; min-width: 120px;">
        ${langOptions}
      </select>
      <span class="wl-detected" style="font-size: 11px; color: var(--wl-muted);">${detectedDisplay}</span>
    </div>

    <div style="overflow-y: auto; margin-top: 8px;">
      <p class="wl-definition">${escapeHTML(translation)}</p>
    </div>
  `;
}

function renderErrorHtml(title, errorMsg) {
  return `
    <div class="wl-header" style="align-items: center; justify-content: flex-start; gap: 8px;">
      <h3 class="wl-word" style="font-size: 16px; font-weight: 600;">${escapeHTML(title.slice(0, 40))}${title.length > 40 ? '...' : ''}</h3>
    </div>
    <p class="wl-definition" style="color: var(--wl-muted); margin-top: 6px;">
      ${errorMsg}
    </p>
    <div style="margin-top: 8px; display: flex; gap: 8px;">
      <button class="wl-action-btn wl-retry-btn" style="flex: 1; width: auto;">Retry</button>
    </div>
  `;
}





/**
 * Security helper: prevents XSS by escaping HTML special characters.
 * Without this, a user could select text like <script>alert('hacked')</script>
 * and it would execute inside our popup!
 */
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
// Fire up the engine!
initWordLens();