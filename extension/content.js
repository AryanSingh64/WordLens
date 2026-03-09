// we inject - create an empty div , give it id and glue it to the bottom of the page 
const POPUP_ID = 'wordlens-popup-root';
let popupEl = null;

// Dragging state
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

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
}

function handleMouseUp(event) {
    // If we just finished dragging, don't trigger a new lookup
    if (isDragging) {
        isDragging = false;
        return;
    }
    // If the user is selecting text inside our popup itself, don't trigger the logic
    if (popupEl.contains(event.target)) return;

    setTimeout(() => {
        //windows .get selection is used to get the selected , its inbuilt
        const selection = window.getSelection();
        const text = selection.toString().trim();

        if (text.length > 0 && text.length < 300) {
            // Determine if it's a single word or a phrase/sentence
            //   /\s+/ is a regex meaning "one or more spaces"). If the result is a single chunk, it's a word. If it's multiple chunks, it's a sentence. That's how "Dictionary" vs "Lens Summary" gets decided.
            const isWord = text.split(/\s+/).length === 1;

            // positioning the popup
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            // Position the popup exactly at the bottom-left of the selection snippet
            // accounting for scroll position
            const x = rect.left + window.scrollX;

            showPopup(x, rect, text, isWord);
        } else if (text.length === 0) {
            // If the selection is empty (they clicked away), hide the card
            hidePopup();
        }
    }, 10);
}

function handleMouseDown(event) {
    // Hide popup if the user clicks anywhere outside of it
    if (popupEl && !popupEl.contains(event.target)) {
        const selection = window.getSelection();
        if (selection.toString().trim().length === 0) {
            hidePopup();
        }
    }
}

function showPopup(x, rect, text, isWord) {
    // Safety check: ensure the popup doesn't bleed off the right edge of the screen
    let safeX = x;
    if (safeX + 340 > window.innerWidth + window.scrollX) {
        safeX = (window.innerWidth + window.scrollX) - 340;
    }
    if (safeX < 20) safeX = 20;

    // Check if there's enough room below the selection (~250px for the card)
    const popupHeight = 250;
    const spaceBelow = window.innerHeight - rect.bottom;
    let safeY;

    if (spaceBelow < popupHeight) {
        // Not enough room below — place it ABOVE the selection
        safeY = rect.top + window.scrollY - popupHeight - 8;
        if (safeY < window.scrollY) safeY = window.scrollY + 8; // don't go above viewport
    } else {
        // Plenty of room below — place it under the selection as usual
        safeY = rect.bottom + window.scrollY + 8;
    }

    popupEl.style.left = `${safeX}px`;
    popupEl.style.top = `${safeY}px`;

    // Make it display: block before we add the animation class
    popupEl.style.display = 'block';

    // Force browser to recalculate layout so the CSS transition works
    void popupEl.offsetWidth;
    popupEl.classList.add('wl-show');

    // Inject the skeleton HTML
    renderPlaceholder(text, isWord);
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

        // Calculate the offset between mouse position and popup's top-left corner
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

        // Move the popup to follow the mouse, adjusted by the initial offset
        const newX = e.clientX + window.scrollX - dragOffsetX;
        const newY = e.clientY + window.scrollY - dragOffsetY;

        popupEl.style.left = `${newX}px`;
        popupEl.style.top = `${newY}px`;
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            popupEl.style.cursor = 'grab';
            // isDragging is set to false in the main handleMouseUp
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
        }, 200);
    }
}

// loading scaleton - here we call the api
function renderPlaceholder(text, isWord) {
    const typeTag = isWord ? "Dictionary" : "Lens Summary";

    popupEl.innerHTML = `
    <div class="wl-card">
      <div>
        <span class="wl-tag">${typeTag}</span>
        <div class="wl-header">
          <h3 class="wl-word">${text}</h3>
          <span class="wl-phonetic">/ ... /</span>
        </div>
      </div>
      <div class="wl-definition">
        <div class="wl-skeleton-pulse" style="width: 100%; margin-bottom: 6px;"></div>
        <div class="wl-skeleton-pulse" style="width: 80%; margin-bottom: 6px;"></div>
        <div class="wl-skeleton-pulse" style="width: 60%;"></div>
      </div>
    </div>
  `;

    //sending data to background.js
    if (isWord) {
        chrome.runtime.sendMessage(
            { type: 'LOOKUP_WORD', word: text },
            (response) => {
                // Make sure the popup is still showing the same word
                // (user might have selected something else while we were waiting)
                if (!popupEl.classList.contains('wl-show')) return;
                if (response && response.success) {
                    renderDefinition(response.data);
                } else {
                    renderError(text, response?.error || 'Something went wrong', false);
                }
            }
        );
    } else {
        // For sentences, we'll wire up the Claude API in Part 6
        renderSentencePlaceholder(text);
    }
}
/**
 * Renders the actual dictionary definition into the popup card.
 */
function renderDefinition(data) {
    const meaningsHTML = data.meanings.map(m => `
    <div style="margin-bottom: 8px;">
      <span class="wl-tag">${m.partOfSpeech}</span>
      <p class="wl-definition" style="margin-top: 4px;">${m.definition}</p>
      ${m.example ? `<p class="wl-example"><em>"${m.example}"</em></p>` : ''}
    </div>
  `).join('');
    popupEl.innerHTML = `
    <div class="wl-card">
      <div>
        <span class="wl-tag">Dictionary</span>
        <div class="wl-header">
          <h3 class="wl-word">${escapeHTML(data.word)}</h3>
          <span class="wl-phonetic">${data.phonetic || ''}</span>
        </div>
      </div>
      <div>
        ${meaningsHTML}
      </div>
    </div>
  `;
}
/**
 * Renders an error state (word not found, network error, etc.)
 */
function renderError(text, errorMsg, isSentence) {
    const tag = isSentence ? "Lens Summary" : "Dictionary";
    popupEl.innerHTML = `
    <div class="wl-card">
      <div>
        <span class="wl-tag">${tag}</span>
        <div class="wl-header">
          <h3 class="wl-word" style="font-size: ${isSentence ? '14px' : '20px'}; font-weight: ${isSentence ? '500' : '600'};">${escapeHTML(isSentence ? text.slice(0, 80) : text)}${isSentence && text.length > 80 ? '...' : ''}</h3>
        </div>
      </div>
      <p class="wl-definition" style="color: var(--wl-muted);">
        ${errorMsg === 'Word not found'
            ? "Hmm, this word isn't in our dictionary. Try selecting a single English word."
            : errorMsg}
      </p>
    </div>
  `;
}






function renderSentencePlaceholder(text) {
    // First, try to read the API key from Chrome's storage
    chrome.storage.local.get(['groqApiKey'], (result) => {
        const apiKey = result.groqApiKey;
        if (!apiKey) {
            // No API key saved yet — show a helpful message
            popupEl.innerHTML = `
        <div class="wl-card">
          <div>
            <span class="wl-tag">Lens Summary</span>
            <div class="wl-header">
              <h3 class="wl-word" style="font-size: 14px; font-weight: 500;">${escapeHTML(text.slice(0, 80))}${text.length > 80 ? '...' : ''}</h3>
            </div>
          </div>
          <p class="wl-definition" style="color: var(--wl-muted);">
            Add your Claude API key in the WordLens extension popup to unlock sentence analysis.
          </p>
        </div>
      `;
            return;
        }
        // We have a key! Send the sentence to background.js
        chrome.runtime.sendMessage(
            { type: 'SUMMARIZE_SENTENCE', text: text, apiKey: apiKey },
            (response) => {
                if (!popupEl.classList.contains('wl-show')) return;
                if (response && response.success) {
                    renderSummary(text, response.data.summary);
                } else {
                    renderError(text, response?.error || 'Claude could not process this.', true);
                }
            }
        );
    });
}
/**
 * Renders Claude's explanation of the selected sentence.
 */
function renderSummary(originalText, summary) {
    popupEl.innerHTML = `
    <div class="wl-card">
      <div>
        <span class="wl-tag">Lens Summary</span>
        <div class="wl-header">
          <h3 class="wl-word" style="font-size: 14px; font-weight: 500;">${escapeHTML(originalText.slice(0, 80))}${originalText.length > 80 ? '...' : ''}</h3>
        </div>
      </div>
      <p class="wl-definition">${escapeHTML(summary)}</p>
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