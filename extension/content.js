/**
 * content.js — Content script for WordLens
 * Handles pause-to-peek, command palette, and selection → side panel
 */

(function() {
    // Prevent multiple injections
    if (window.__wordlensInjected) return;
    window.__wordlensInjected = true;

    // State
    let lastMouseMove = Date.now();
    let hoverTimeout = null;
    let currentWordElement = null;
    let commandPaletteVisible = false;
    let pageLuminance = 0.5;

    const IDLE_DELAY = 600; // ms

    // Compute page background luminance for theming
    (function computePageLuminance() {
        try {
            const bodyBg = getComputedStyle(document.body).backgroundColor;
            const rgb = bodyBg.match(/\d+/g);
            if (rgb) {
                const [r, g, b] = rgb.map(Number);
                pageLuminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
            }
        } catch (e) {
            console.warn('Could not compute page luminance');
        }
    })();

    // --- Pause-to-peek: Detect idle cursor over a word ---

    document.addEventListener('mousemove', (e) => {
        lastMouseMove = Date.now();

        // Clear any pending underline
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            hoverTimeout = null;
        }

        // Find the word element at cursor
        const wordEl = getWordElementAtPoint(e.clientX, e.clientY);

        // Remove underline from previously highlighted word
        if (currentWordElement && currentWordElement !== wordEl) {
            removeUnderline(currentWordElement);
            currentWordElement = null;
        }

        if (wordEl && wordEl !== currentWordElement) {
            // Start idle timer
            hoverTimeout = setTimeout(() => {
                // Only underline if mouse hasn't moved
                if (Date.now() - lastMouseMove >= IDLE_DELAY - 50) {
                    addUnderline(wordEl);
                    currentWordElement = wordEl;
                }
            }, IDLE_DELAY);
        }
    });

    // If mouse moves before underline shows, we already clear in mousemove

    // --- Text selection handling ---

    let selectionTimeout = null;
    document.addEventListener('mouseup', (e) => {
        // Delay to ensure selection is finalized
        selectionTimeout = setTimeout(() => {
            const selection = window.getSelection();
            const text = selection.toString().trim();

            if (text.length > 0 && text.length < 500) {
                // Get the word(s) and surrounding sentence
                const range = selection.getRangeAt(0);
                const word = extractSelectedWord(text);
                const context = extractSentenceContext(range);

                // Open side panel with the word
                openSidePanelWithWord(word, context);
            }

            // Clear any peek underline on selection
            if (currentWordElement) {
                removeUnderline(currentWordElement);
                currentWordElement = null;
            }
        }, 50);
    });

    // Hide underline when clicking outside (start over)
    document.addEventListener('mousedown', (e) => {
        if (currentWordElement && !currentWordElement.contains(e.target)) {
            removeUnderline(currentWordElement);
            currentWordElement = null;
        }
    });

    // --- Command Palette (Ctrl+Shift+Space) ---

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'Space') {
            e.preventDefault();
            toggleCommandPalette();
        }

        if (e.key === 'Escape' && commandPaletteVisible) {
            hideCommandPalette();
        }
    });

    // --- Helper: Get word element at coordinates ---
    function getWordElementAtPoint(x, y) {
        // Use caret position to find the text node and word
        try {
            // Create a range and set start/end to the point
            const range = document.caretRangeFromPoint(x, y);
            if (!range) return null;

            const node = range.startContainer;
            if (!node || node.nodeType !== Node.TEXT_NODE) return null;

            const text = node.textContent;
            const offset = range.startOffset;

            // Find word boundaries
            const before = text.slice(0, offset);
            const after = text.slice(offset);
            const wordMatch = before.match(/\b(\w+)$/) || after.match(/^(\w+)/);

            if (!wordMatch) return null;

            const word = wordMatch[1];
            const wordStart = offset - word.length;
            const wordEnd = offset;

            // Check if we're within a text node; we'll wrap the word in a temporary element
            if (word.length < 2 || word.length > 50) return null;

            // Return info to underline this word
            return {
                element: node,
                start: wordStart,
                end: wordEnd,
                word: word
            };
        } catch (err) {
            return null;
        }
    }

    function addUnderline(wordInfo) {
        if (!wordInfo || wordInfo.underlined) return;

        // Create a marker element (or we can use CSS class on parent, but need precise word)
        // Simpler approach: We can't easily underline part of a text node without breaking it.
        // Instead, we'll create a floating underline element positioned absolutely near the text.
        // But that's complex. Alternative: We modify the text node by wrapping the word in a <span> with class.
        // Let's do that:

        const { element, start, end, word } = wordInfo;

        // Create a document fragment to replace the text node with: text before + span + text after
        const beforeText = element.splitText(start);
        const wordNode = beforeText.splitText(word.length);
        const afterNode = wordNode.nextSibling;

        const underlineSpan = document.createElement('span');
        underlineSpan.className = 'wl-peek-word';
        underlineSpan.textContent = word;
        underlineSpan.style.position = 'relative';
        // Use pseudo-element for underline? Actually we'll add a class and style it via CSS injection.

        // Insert span before wordNode, then append wordNode's first child (text)
        beforeText.parentNode.insertBefore(underlineSpan, wordNode);
        underlineSpan.appendChild(wordNode);

        // Mark so we can remove later
        underlineSpan.__wordlensPeek = true;
        wordInfo.element = underlineSpan;
        wordInfo.underlined = true;
    }

    function removeUnderline(wordInfo) {
        if (!wordInfo || !wordInfo.underlined) return;

        const span = wordInfo.element;
        if (span && span.__wordlensPeek && span.parentNode) {
            const word = span.textContent;
            const textNode = document.createTextNode(word);
            span.parentNode.replaceChild(textNode, span);
            // Then we need to merge adjacent text nodes? Not critical.
        }
    }

    // --- Command Palette UI ---

    function toggleCommandPalette() {
        if (commandPaletteVisible) {
            hideCommandPalette();
        } else {
            showCommandPalette();
        }
    }

    function showCommandPalette() {
        // Create palette if not exists
        let palette = document.getElementById('wordlens-command-palette');
        if (!palette) {
            palette = document.createElement('div');
            palette.id = 'wordlens-command-palette';
            palette.innerHTML = `
                <div class="wl-cp-input-wrapper">
                    <svg class="wl-cp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="M21 21l-4.35-4.35"></path>
                    </svg>
                    <input type="text" class="wl-cp-input wl-cp-search" placeholder="Search any word..." autocomplete="off">
                    <button class="wl-cp-close" title="Close (Escape)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="wl-cp-results" id="wl-cp-results"></div>
            `;
            document.body.appendChild(palette);

            // Inject styles (we rely on content.css but we need a few extra ones)
            const styleId = 'wordlens-cp-styles';
            if (!document.getElementById(styleId)) {
                const style = document.createElement('style');
                style.id = styleId;
                style.textContent = `
                    #wordlens-command-palette {
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        z-index: 2147483648;
                        width: 100%;
                        max-width: 560px;
                        background: rgba(245, 235, 220, 0.15);
                        backdrop-filter: blur(24px);
                        -webkit-backdrop-filter: blur(24px);
                        border: 1px solid rgba(245, 235, 220, 0.25);
                        border-radius: 16px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                        overflow: hidden;
                        display: none;
                    }
                    #wordlens-command-palette.wl-visible { display: block; animation: wl-card-entrance 150ms ease-out; }
                    .wl-cp-input-wrapper { display: flex; align-items: center; padding: 16px 20px; border-bottom: 1px solid rgba(245,235,220,0.2); gap: 12px; }
                    .wl-cp-icon { width: 20px; height: 20px; color: #6b6b6b; flex-shrink: 0; }
                    .wl-cp-input { flex: 1; background: transparent; border: none; outline: none; font-size: 16px; color: #1a1a1a; }
                    .wl-cp-input::placeholder { color: #9ca3af; }
                    .wl-cp-close { background: transparent; border: none; color: #6b6b6b; cursor: pointer; padding: 4px; border-radius: 4px; }
                    .wl-cp-close:hover { background: rgba(0,0,0,0.05); color: #1a1a1a; }
                    .wl-cp-results { max-height: 400px; overflow-y: auto; padding: 8px; }
                    .wl-cp-result-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 8px; cursor: pointer; transition: background 0.15s ease; }
                    .wl-cp-result-item:hover, .wl-cp-result-item.wl-active { background: rgba(74, 222, 128, 0.08); }
                    .wl-cp-result-icon { width: 16px; height: 16px; color: #4ade80; flex-shrink: 0; }
                    .wl-cp-result-text { font-size: 15px; color: #1a1a1a; }
                    .wl-cp-result-meta { font-size: 12px; color: #6b6b6b; margin-left: auto; }
                    .wl-cp-no-results { padding: 20px; text-align: center; color: #6b6b6b; font-size: 14px; }
                    @keyframes wl-card-entrance { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
                    #wordlens-command-palette.wl-theme-dark { background: rgba(30,30,30,0.25); border-color: rgba(255,255,255,0.1); }
                    #wordlens-command-palette.wl-theme-dark .wl-cp-icon,
                    #wordlens-command-palette.wl-theme-dark .wl-cp-close,
                    #wordlens-command-palette.wl-theme-dark .wl-cp-result-meta { color: #a0a0a0; }
                    #wordlens-command-palette.wl-theme-dark .wl-cp-close:hover { background: rgba(255,255,255,0.1); color: #f0f0f0; }
                    #wordlens-command-palette.wl-theme-dark .wl-cp-input,
                    #wordlens-command-palette.wl-theme-dark .wl-cp-result-text { color: #f0f0f0; }
                `;
                document.head.appendChild(style);
            }

            // Event listeners
            palette.querySelector('.wl-cp-close').addEventListener('click', hideCommandPalette);
            const input = palette.querySelector('.wl-cp-input');
            input.addEventListener('keydown', handleCommandPaletteKeydown);
            input.addEventListener('input', debounce(handleCommandInput, 150));

            // Apply theme class based on page luminance
            if (pageLuminance < 0.5) {
                palette.classList.add('wl-theme-dark');
            }
        }

        const input = palette.querySelector('.wl-cp-input');
        input.value = '';
        document.getElementById('wl-cp-results').innerHTML = '';
        palette.classList.add('wl-visible');
        commandPaletteVisible = true;
        input.focus();
    }

    function hideCommandPalette() {
        const palette = document.getElementById('wordlens-command-palette');
        if (palette) {
            palette.classList.remove('wl-visible');
            commandPaletteVisible = false;
        }
    }

    function handleCommandPaletteKeydown(e) {
        if (e.key === 'Escape') {
            hideCommandPalette();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const results = getSearchResults();
            if (results.length > 0) {
                selectSearchResult(results[0]);
            }
        }
    }

    let searchResults = [];
    function handleCommandInput(e) {
        const query = e.target.value.trim();
        if (!query) {
            document.getElementById('wl-cp-results').innerHTML = '';
            searchResults = [];
            return;
        }

        // Perform lookup (cached or not) - we'll call background to fetch word info
        fetchWordInfo(query).then(results => {
            searchResults = results;
            renderSearchResults(results);
        }).catch(err => {
            console.error('Search error:', err);
        });
    }

    function renderSearchResults(results) {
        const container = document.getElementById('wl-cp-results');
        if (!results || results.length === 0) {
            container.innerHTML = '<div class="wl-cp-no-results">No results found</div>';
            return;
        }

        container.innerHTML = results.map(r => `
            <div class="wl-cp-result-item" data-word="${escapeHTML(r.word)}">
                <svg class="wl-cp-result-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="M21 21l-4.35-4.35"></path>
                </svg>
                <div class="wl-cp-result-text">${escapeHTML(r.word)}</div>
                <div class="wl-cp-result-meta">${r.type}</div>
            </div>
        `).join('');

        // Click handlers
        container.querySelectorAll('.wl-cp-result-item').forEach(item => {
            item.addEventListener('click', () => selectSearchResult({ word: item.dataset.word }));
        });
    }

    function getSearchResults() {
        return searchResults;
    }

    function selectSearchResult(result) {
        if (result && result.word) {
            hideCommandPalette();
            openSidePanelWithWord(result.word, '');
        }
    }

    async function fetchWordInfo(query) {
        // We'll try to get a dictionary entry, but also we could use an auto-complete API?
        // For now, just query the dictionary API; if it fails, return the query as a generic result.
        try {
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(query)}`);
            if (response.ok) {
                const data = await response.json();
                return data.map(entry => ({
                    word: entry.word,
                    type: 'dictionary'
                }));
            }
        } catch (e) {
            // ignore
        }
        // Fallback: treat input as word
        return [{ word: query, type: 'lookup' }];
    }

    // --- Side Panel Communication ---

    function openSidePanelWithWord(word, context) {
        // Send message to background to open side panel and set word
        if (chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({
                type: 'OPEN_SIDE_PANEL',
                word: word,
                context: context
            });
        } else {
            console.warn('WordLens: Runtime API not available');
        }
    }

    // --- Utilities ---

    function extractSelectedWord(text) {
        // Return first word in selection (or the whole text if it's a single word)
        const words = text.trim().split(/\s+/);
        return words[0];
    }

    function extractSentenceContext(range) {
        // Expand range to include full sentence (up to a period, exclamation, question mark)
        const startContainer = range.startContainer;
        const endContainer = range.endContainer;

        if (startContainer.nodeType !== Node.TEXT_NODE) return '';

        const text = startContainer.textContent;
        const start = range.startOffset;
        const end = range.endOffset;

        // Get surrounding text (up to ~200 chars)
        const beforeStart = Math.max(0, start - 100);
        const afterEnd = Math.min(text.length, end + 100);

        let snippet = text.slice(beforeStart, afterEnd);
        // Trim to sentence boundaries
        const sentenceEnd = snippet.search(/[.!?]/);
        if (sentenceEnd !== -1) {
            snippet = snippet.slice(0, sentenceEnd + 1);
        }

        return snippet;
    }

    function debounce(fn, delay) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // --- Message listeners ---
    if (chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'GET_BG_LUMINANCE') {
                try {
                    const bodyBg = getComputedStyle(document.body).backgroundColor;
                    const rgb = bodyBg.match(/\d+/g);
                    let luminance = 0.5;
                    if (rgb) {
                        const [r, g, b] = rgb.map(Number);
                        luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
                    }
                    sendResponse({ luminance });
                } catch (e) {
                    sendResponse({ luminance: 0.5 });
                }
                return true;
            }

            if (message.type === 'SHOW_COMMAND_PALETTE') {
                toggleCommandPalette();
                sendResponse({ success: true });
                return true;
            }
        });
    }

})();
