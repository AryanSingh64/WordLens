/**
 * content.js — Content script for WordLens
 * Handles pause-to-peek, command palette, and floating popup
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
    let popupEl = null;
    let pageLuminance = 0.5;
    let isDragging = false;
    let wasJustDragged = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let currentWord = '';
    let currentContext = '';
    let currentTab = 'dictionary';

    // Pinned languages for translation (default)
    let pinnedLanguages = ['es', 'fr', 'ja'];

    // Supported languages
    const LANGUAGES = [
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'it', name: 'Italian' },
        { code: 'pt', name: 'Portuguese' },
        { code: 'ja', name: 'Japanese' },
        { code: 'ko', name: 'Korean' },
        { code: 'zh-CN', name: 'Chinese (Simplified)' },
        { code: 'zh-TW', name: 'Chinese (Traditional)' },
        { code: 'ru', name: 'Russian' },
        { code: 'ar', name: 'Arabic' },
        { code: 'hi', name: 'Hindi' },
    ];

    // Pastel color palette for language buttons
    const PASTEL_COLORS = [
        '#FFD3E1', // pink
        '#C8E6C9', // green
        '#BBDEFB', // light blue
        '#FFECB3', // yellow
        '#E1BEE7', // purple
        '#B2DFDB', // teal
        '#FFCCBC', // orange
        '#D1C4E9', // violet
        '#C5CAE9', // periwinkle
        '#CFD8DC', // gray-blue
        '#FFE0B2', // deep orange
        '#F8BBD0', // pink accent
    ];

    // Cache for speak button text
    const speakTextMap = new Map();

    // Icon for copy success feedback
    const CHECKMARK_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

    const IDLE_DELAY = 600; // ms for pause-to-peek

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

    // ============================================
    // PAUSE-TO-PEEK: Detect idle cursor over a word
    // ============================================

    document.addEventListener('mousemove', (e) => {
        lastMouseMove = Date.now();

        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            hoverTimeout = null;
        }

        const wordInfo = getWordElementAtPoint(e.clientX, e.clientY);

        // Remove underline from previous word
        if (currentWordElement && currentWordElement !== wordInfo) {
            removeUnderline(currentWordElement);
            currentWordElement = null;
        }

        if (wordInfo && wordInfo !== currentWordElement) {
            hoverTimeout = setTimeout(() => {
                if (Date.now() - lastMouseMove >= IDLE_DELAY - 50) {
                    addUnderline(wordInfo);
                    currentWordElement = wordInfo;
                }
            }, IDLE_DELAY);
        }
    });

    document.addEventListener('mousedown', (e) => {
        if (currentWordElement && !currentWordElement.element.contains(e.target)) {
            removeUnderline(currentWordElement);
            currentWordElement = null;
        }
    });

    // ============================================
    // TEXT SELECTION → POPUP
    // ============================================

    document.addEventListener('mouseup', (e) => {
        const cx = e.clientX;
        const cy = e.clientY;
        // Use requestAnimationFrame to ensure we're after any scroll/visual updates
        requestAnimationFrame(() => {
            // If we just dragged, ignore this event
            if (wasJustDragged) return;

            const clickedInsidePopup = popupEl && popupEl.contains(e.target);
            const selection = window.getSelection();
            const text = selection.toString().trim();

            // Only handle show/hide if click was outside the popup
            if (!clickedInsidePopup) {
                if (text.length > 0 && text.length < 500) {
                    const range = selection.getRangeAt(0);
                    const word = extractSelectedWord(text);
                    const context = extractSentenceContext(range);
                    showPopup(word, context, cx, cy);
                } else if (text.length === 0) {
                    hidePopup();
                }
            }

            // Always clean up underline on any mouseup
            if (currentWordElement) {
                removeUnderline(currentWordElement);
                currentWordElement = null;
            }
        });
    });

    // ============================================
    // FLOATING POPUP UI
    // ============================================

    function initPopup() {
        if (popupEl) return;

        popupEl = document.createElement('div');
        popupEl.id = 'wordlens-popup-root';
        document.documentElement.appendChild(popupEl);

        setupDrag();
        setupTabListeners();
        attachGlobalKeydown();

        // Event delegation for dynamic content buttons (copy, speak, retry, save)
        popupEl.addEventListener('click', (e) => {
            const copyBtn = e.target.closest('.wl-copy-btn');
            if (copyBtn) {
                e.preventDefault();
                const text = copyBtn.dataset.copyText;
                if (!text) return;
                navigator.clipboard.writeText(text).then(() => {
                    const original = copyBtn.innerHTML;
                    const originalTitle = copyBtn.title;
                    copyBtn.innerHTML = CHECKMARK_SVG;
                    copyBtn.title = 'Copied!';
                    copyBtn.style.color = 'var(--wl-accent)';
                    setTimeout(() => {
                        copyBtn.innerHTML = original;
                        copyBtn.title = originalTitle;
                        copyBtn.style.color = '';
                    }, 2000);
                }).catch(err => {
                    console.error('Copy failed:', err);
                });
                return;
            }

            const speakBtn = e.target.closest('.wl-speak-btn');
            if (speakBtn) {
                e.preventDefault();
                const text = speakBtn.dataset.text || currentWord;
                if (text) {
                    window.speechSynthesis.cancel();
                    const utterance = new SpeechSynthesisUtterance(text);
                    utterance.lang = 'en-US';
                    utterance.rate = 0.9;
                    window.speechSynthesis.speak(utterance);
                }
                return;
            }

            const retryBtn = e.target.closest('.wl-retry-btn');
            if (retryBtn) {
                e.preventDefault();
                loadTabContent();
                return;
            }

            const saveBtn = e.target.closest('#wl-btn-save');
            if (saveBtn) {
                e.preventDefault();
                if (!currentWord) return;
                (async () => {
                    try {
                        const { savedWords = [] } = await new Promise(r => chrome.storage.local.get(['savedWords'], r));
                        const exists = savedWords.some(w => w.word.toLowerCase() === currentWord.toLowerCase());
                        if (!exists) {
                            savedWords.push({
                                word: currentWord,
                                context: currentContext || '',
                                timestamp: Date.now()
                            });
                            await new Promise(r => chrome.storage.local.set({ savedWords }, r));
                            // Visual feedback
                            saveBtn.style.color = 'var(--wl-accent)';
                            setTimeout(() => saveBtn.style.color = '', 2000);
                            // Refresh vault if active
                            if (currentTab === 'vault') {
                                loadVaultTab();
                            }
                        } else {
                            saveBtn.style.color = 'var(--wl-muted-light)';
                            setTimeout(() => saveBtn.style.color = '', 2000);
                        }
                    } catch (err) {
                        console.error('Save failed:', err);
                    }
                })();
                return;
            }

            const langBtn = e.target.closest('.wl-lang-btn');
            if (langBtn) {
                e.preventDefault();
                loadTranslateTab(langBtn.dataset.lang);
                return;
            }
        });

        // Delegated change handler for language select
        popupEl.addEventListener('change', (e) => {
            if (e.target && e.target.id === 'wl-translate-lang-select') {
                loadTranslateTab(e.target.value);
            }
        });
    }

    function showPopup(word, context, clientX = null, clientY = null) {
        initPopup();

        currentWord = word;
        currentContext = context;
        currentTab = 'dictionary';

        // Position near selection. Default to center if coordinates aren't provided.
        // It's position: fixed, so we use viewport coordinates.
        const defaultX = Math.max(20, window.innerWidth / 2 - 300);
        const defaultY = Math.max(20, 100);
        
        let x = clientX !== null ? clientX + 15 : defaultX;
        let y = clientY !== null ? clientY + 15 : defaultY;
        
        // Ensure it doesn't overflow the right edge or bottom edge
        const popupWidth = 600; // rough width estimate from CSS
        const popupHeight = 350; // rough min-height
        if (x + popupWidth > window.innerWidth) {
            x = Math.max(10, window.innerWidth - popupWidth - 20);
        }
        if (y + popupHeight > window.innerHeight) {
            y = Math.max(10, window.innerHeight - popupHeight - 20);
            // if clicking near bottom, show it above the cursor
            if (clientY !== null && clientY > popupHeight + 20) {
               y = clientY - popupHeight - 20;
            }
        }

        popupEl.style.left = `${x}px`;
        popupEl.style.top = `${y}px`;
        popupEl.style.display = 'block';

        void popupEl.offsetWidth; // Force reflow
        popupEl.classList.add('wl-show');

        renderPopupContent();
    }

    function hidePopup() {
        if (popupEl && popupEl.classList.contains('wl-show')) {
            popupEl.classList.remove('wl-show');
            setTimeout(() => {
                popupEl.style.display = 'none';
                popupEl.innerHTML = '';
                speakTextMap.clear();
            }, 200);
        }
    }

    function renderPopupContent() {
        const themeClass = pageLuminance < 0.5 ? 'wl-theme-dark' : 'wl-theme-light';

        popupEl.innerHTML = `
            <div class="wl-card">
                <div class="wl-sidebar">
                    <button class="wl-tab-btn active" data-tab="dictionary" title="Dictionary">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                        </svg>
                        <span>Dict</span>
                    </button>
                    <button class="wl-tab-btn" data-tab="translate" title="Translate">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="2" y1="12" x2="22" y2="12"></line>
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                        </svg>
                        <span>Translate</span>
                    </button>
                    <button class="wl-tab-btn" data-tab="vault" title="Vocabulary Vault">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <span>Vault</span>
                    </button>

                    <div class="wl-spacer"></div>

                    <button class="wl-action-btn" id="wl-btn-save" title="Save Word">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                        <span>Save</span>
                    </button>
                </div>

                <div class="wl-content-area" id="wl-main-content">
                    <!-- Content loads here -->
                </div>
            </div>
        `;

        popupEl.classList.add(themeClass);
        loadTabContent();

        // Attach event listeners
        attachTabHandlers();
    }

    function switchTab(tab) {
        if (currentTab === tab) return;
        currentTab = tab;

        popupEl.querySelectorAll('.wl-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        loadTabContent();
    }

    function setupTabListeners() {
        // Will be attached after popup renders
    }

    function attachTabHandlers() {
        popupEl.querySelectorAll('.wl-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });
    }


    function loadTabContent() {
        const main = document.getElementById('wl-main-content');
        if (!main) return;

        if (currentTab === 'vault') {
            loadVaultTab();
            return;
        }

        if (!currentWord) {
            main.innerHTML = renderEmptyState();
            return;
        }

        main.innerHTML = renderSkeleton();

        if (currentTab === 'dictionary') {
            loadDictionaryTab();
        } else if (currentTab === 'translate') {
            loadTranslateTab();
        }
    }

    function renderEmptyState() {
        return `
            <div style="text-align: center; padding: 40px 20px; color: var(--wl-muted-light);">
                <p style="font-size: 14px;">Select text on the page to look up words.</p>
                <p style="font-size: 12px; margin-top: 8px;">
                    Or press <kbd style="padding: 2px 6px; background: rgba(128,128,128,0.1); border-radius: 4px; font-family: var(--wl-font-mono);">Ctrl+Shift+Space</kbd>
                </p>
            </div>
        `;
    }

    function renderSkeleton() {
        return `
            <div class="wl-header" style="align-items: center; justify-content: flex-start; gap: 8px;">
                <h3 class="wl-word">${escapeHTML(currentWord.slice(0, 30))}${currentWord.length > 30 ? '...' : ''}</h3>
                <span class="wl-pos-badge-container"></span>
            </div>
            <div class="wl-skeleton-pulse" style="margin-top: 10px;"></div>
            <div class="wl-skeleton-pulse" style="width: 80%; margin-top: 6px;"></div>
        `;
    }

    // ============================================
    // API CALLS
    // ============================================

    function callBackground(type, data = {}) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ type, ...data }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                if (response && response.success) {
                    resolve(response.data);
                } else {
                    reject(new Error(response?.error || 'Request failed'));
                }
            });
        });
    }

    async function loadDictionaryTab() {
        try {
            const { groqApiKey } = await new Promise(r => chrome.storage.local.get(['groqApiKey'], r));
            if (!groqApiKey) {
                renderError('AI features require a Groq API key. Click the WordLens icon to add your key.');
                return;
            }

            // Run requests in parallel avoiding single point of failure
            const ctxPromise = currentContext 
                ? callBackground('CONTEXT_DEFINITION', { word: currentWord, sentence: currentContext, apiKey: groqApiKey }).catch(() => null)
                : Promise.resolve(null);
                
            const dictPromise = callBackground('LOOKUP_WORD', { word: currentWord, apiKey: groqApiKey }).catch(() => null);
            const cefrPromise = callBackground('GET_CEFR_LEVEL', { word: currentWord, apiKey: groqApiKey }).catch(() => null);
            const etyPromise = callBackground('GET_ETYMOLOGY', { word: currentWord, apiKey: groqApiKey }).catch(() => null);

            const [ctxDef, dictData, cefrData, etyData] = await Promise.all([ctxPromise, dictPromise, cefrPromise, etyPromise]);

            if (!ctxDef && !dictData && !cefrData && !etyData) {
                renderError('No definition found for this word. Try a different word or translation.');
                return;
            }

            let contextDefHtml = '';
            if (ctxDef && ctxDef.definition) {
                contextDefHtml = `
                    <div class="wl-pos-definition wl-highlight-context">
                        <div class="wl-pos-label">In Context</div>
                        <p class="wl-definition">${escapeHTML(ctxDef.definition)}</p>
                    </div>
                `;
            }

            let generalDefHtml = '';
            let wordHeader = currentWord;
            let phoneticHtml = '';
            let audioHtml = '';
            let copyText = currentWord;

            if (dictData) {
                generalDefHtml = dictData.meanings.map(m => `
                    <div class="wl-pos-definition pos-${m.partOfSpeech}">
                        <div class="wl-pos-label">${m.partOfSpeech}</div>
                        <p class="wl-definition">${escapeHTML(m.definition)}</p>
                        ${m.example ? `<p class="wl-example">"${escapeHTML(m.example)}"</p>` : ''}
                    </div>
                `).join('');
                wordHeader = dictData.word || currentWord;
                if (dictData.phonetic) phoneticHtml = `<span class="wl-phonetic">${escapeHTML(dictData.phonetic)}</span>`;
                copyText = formatFullText(dictData);
                audioHtml = `
                    <button class="wl-icon-btn wl-speak-btn" data-text="${escapeHTML(dictData.word)}" title="Pronounce">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                        </svg>
                    </button>
                `;
            } else {
                audioHtml = `
                    <button class="wl-icon-btn wl-speak-btn" data-text="${escapeHTML(currentWord)}" title="Pronounce">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                        </svg>
                    </button>
                `;
            }

            let cefrBadge = '';
            if (cefrData && cefrData.level) {
                cefrBadge = `<span class="wl-cefr-badge" style="background: ${getCEFRColor(cefrData.level)}; color: ${getCEFRTextColor(cefrData.level)};">${cefrData.level}</span>`;
            }

            const main = document.getElementById('wl-main-content');
            if (!main) {
                console.warn('Main content element missing, aborting loadDictionaryTab');
                return;
            }
            main.innerHTML = `
                <div class="wl-header" style="align-items: center; justify-content: flex-start; gap: 8px;">
                    <div class="wl-word-title-row">
                        <h3 class="wl-word">${escapeHTML(wordHeader)}</h3>
                        ${cefrBadge}
                    </div>
                    ${audioHtml}
                    ${phoneticHtml}
                    <button class="wl-icon-btn wl-copy-btn" data-copy-text="${escapeHTML(copyText)}" title="Copy" style="margin-left: auto;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                </div>

                ${contextDefHtml}

                <div style="margin-top: 8px;">
                    ${generalDefHtml || (ctxDef ? '' : '<p class="wl-definition">No standard dictionary definition found.</p>')}
                </div>

                ${etyData && etyData.etymology ? `
                    <div class="wl-etymology">
                        <em>${escapeHTML(etyData.etymology)}</em>
                    </div>
                ` : ''}
            `;

        } catch (err) {
            console.error('Dictionary error:', err);
            renderError(err.message);
        }
    }

    async function loadTranslateTab(selectedLang = null) {
        try {
            let targetLang = selectedLang;
            if (!targetLang) {
                targetLang = pinnedLanguages.find(l => l !== 'en') || pinnedLanguages[0] || 'es';
            }

            const result = await callBackground('TRANSLATE_TEXT', {
                text: currentWord,
                targetLang: targetLang
            });

            const main = document.getElementById('wl-main-content');
            if (!main) {
                console.warn('Main content element missing, aborting loadTranslateTab');
                return;
            }
            const targetLangName = getLanguageName(targetLang);

            main.innerHTML = `
                <div class="wl-header" style="align-items: flex-start; gap: 8px;">
                    <div style="flex: 1;">
                        <h3 class="wl-word">${escapeHTML(currentWord)}</h3>
                        <div class="wl-phonetic" style="margin-top: 6px; font-weight: 500; font-size: 11px;">Translate to <span style="color:var(--wl-primary)">${escapeHTML(targetLangName)}</span></div>
                    </div>
                    <button class="wl-icon-btn wl-copy-btn" data-copy-text="${escapeHTML(result.translation)}" title="Copy translation" style="margin-left: auto; margin-top: 2px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                </div>

                <div class="wl-translation-result" style="margin-top: 12px; font-size: 15px; line-height: 1.5; color: var(--wl-text); background: var(--wl-bg-secondary); padding: 12px; border-radius: 8px; border-left: 3px solid var(--wl-primary);">${escapeHTML(result.translation)}</div>

                <div style="margin-top: 20px;">
                    <div class="wl-lang-label" style="margin-bottom: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Switch Language</div>
                    <div class="wl-lang-buttons" style="display: flex; flex-wrap: wrap; gap: 6px;">
                        ${LANGUAGES.filter(l => l.code !== 'en').map((lang, idx) => {
                            const isActive = lang.code === targetLang;
                            const color = PASTEL_COLORS[idx % PASTEL_COLORS.length];
                            return `<button class="wl-lang-btn ${isActive ? 'active' : ''}"
                                    data-lang="${lang.code}"
                                    ${!isActive ? `style="background-color: ${color};"` : ''}>
                                    ${escapeHTML(lang.name)}
                                </button>`;
                        }).join('')}
                    </div>
                </div>
            `;
        } catch (err) {
            console.error('Translate error:', err);
            renderError('Translation failed: ' + err.message);
        }
    }

    async function loadVaultTab() {
        let main = document.getElementById('wl-main-content');
        if (!main) {
            console.warn('Main content element missing, aborting loadVaultTab');
            return;
        }
        main.innerHTML = '<div class="wl-skeleton-pulse" style="height: 60px; margin-bottom: 8px;"></div>';

        try {
            const words = await callBackground('GET_VAULT');
            // Re-check main after async operation
            main = document.getElementById('wl-main-content');
            if (!main) {
                console.warn('Main content element missing after vault load, aborting');
                return;
            }

            if (words.length === 0) {
                main.innerHTML = `
                    <div class="wl-vault-empty">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 12px; opacity: 0.5;">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <p>Your vocabulary vault is empty.</p>
                        <p style="font-size: 12px; margin-top: 4px;">Select words and click "Save" to build your collection.</p>
                    </div>
                `;
                return;
            }

            // Normalize: use 'date' as fallback for 'timestamp'
            words.forEach(w => {
                if (!w.timestamp && w.date) {
                    w.timestamp = w.date;
                }
            });

            // Sort by newest first (highest timestamp), handle missing timestamps
            words.sort((a, b) => {
                const tsA = a.timestamp || 0;
                const tsB = b.timestamp || 0;
                return tsB - tsA;
            });

            main.innerHTML = `
                <div class="wl-vault-header-row" style="margin-bottom: 12px;">
                    <h3 class="wl-vault-title">Vocabulary Vault</h3>
                </div>
                <div class="wl-vault-list" id="wl-vault-list"></div>
                <button class="wl-vault-clear-all" id="wl-vault-clear" style="margin-top: 12px;">Clear all</button>
            `;

            renderVaultList(words);

            document.getElementById('wl-vault-clear').addEventListener('click', async () => {
                try {
                    if (confirm('Delete all saved words?')) {
                        await callBackground('CLEAR_VAULT');
                        loadVaultTab();
                    }
                } catch (err) {
                    console.error('Failed to clear vault:', err);
                    renderError('Failed to clear vault');
                }
            });

        } catch (err) {
            console.error('Vault load error:', err);
            renderError('Failed to load vault');
        }
    }

    function formatVaultDate(entry) {
        const ts = entry.timestamp || entry.date;
        if (!ts) return '';
        const date = new Date(ts);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleDateString();
    }

    function renderVaultList(words) {
        const list = document.getElementById('wl-vault-list');
        if (!list) return;

        list.innerHTML = words.map((entry, index) => `
            <div class="wl-vault-item" data-index="${index}">
                <div class="wl-vault-header-row">
                    <h4 class="wl-vault-word">${escapeHTML(entry.word)}</h4>
                    <span class="wl-vault-date">${formatVaultDate(entry)}</span>
                </div>
                <p class="wl-vault-context">${escapeHTML(entry.contextSentence || entry.meaning || '')}</p>
                <div class="wl-vault-actions">
                    <button class="wl-vault-btn wl-vault-lookup"
                        data-word="${encodeURIComponent(entry.word)}"
                        data-context="${encodeURIComponent(entry.contextSentence || entry.meaning || '')}">Look up</button>
                    <button class="wl-vault-btn wl-vault-delete" data-word="${encodeURIComponent(entry.word)}">Delete</button>
                </div>
            </div>
        `).join('');

        list.querySelectorAll('.wl-vault-lookup').forEach(btn => {
            btn.addEventListener('click', () => {
                const word = decodeURIComponent(btn.dataset.word);
                const context = decodeURIComponent(btn.dataset.context);
                currentWord = word;
                currentContext = context;
                switchTab('dictionary');
                loadTabContent();
                // Scroll popup into view if needed
                popupEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
        });

        list.querySelectorAll('.wl-vault-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                try {
                    const word = decodeURIComponent(btn.dataset.word);
                    const words = await callBackground('GET_VAULT');
                    const filtered = words.filter(w => w.word.toLowerCase() !== word.toLowerCase());
                    await new Promise(r => chrome.storage.local.set({ savedWords: filtered }, r));
                    loadVaultTab();
                } catch (err) {
                    console.error('Failed to delete word:', err);
                    renderError('Failed to delete word');
                }
            });
        });
    }

    function renderError(msg) {
        const main = document.getElementById('wl-main-content');
        if (!main) return;

        // Check if it's a 404/not found error
        const isNotFound = msg.toLowerCase().includes('404') || msg.toLowerCase().includes('not found');
        const title = isNotFound ? 'Word not found' : 'Error';
        const suggestion = isNotFound
            ? 'This word is not in our dictionary. Try a different word or check spelling.'
            : 'Something went wrong. Please try again.';

        main.innerHTML = `
            <div style="text-align: center; padding: 30px 20px; color: var(--wl-muted-light);">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 12px; opacity: 0.6;">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <h4 style="margin: 0 0 8px; font-size: 16px; color: var(--wl-text-light);">${escapeHTML(title)}</h4>
                <p style="margin: 0; font-size: 13px; line-height: 1.5;">${escapeHTML(suggestion)}</p>
                <button class="wl-action-btn wl-retry-btn" style="margin-top: 16px; width: auto;">Try again</button>
            </div>
        `;
    }

    // ============================================
    // LANGUAGE SETTINGS MODAL
    // ============================================

    function showLanguageSettings() {
        // Create modal if not exists
        let modal = document.getElementById('wl-lang-settings');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'wl-lang-settings';
            modal.innerHTML = `
                <div class="wl-settings-overlay"></div>
                <div class="wl-settings-dialog">
                    <h3 style="margin: 0 0 12px; font-size: 16px;">Translation Languages</h3>
                    <p style="font-size: 12px; color: var(--wl-muted-light); margin: 0 0 12px;">Select 3 languages to display:</p>
                    <div class="wl-lang-grid-settings" id="wl-lang-grid"></div>
                    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
                        <button class="wl-settings-btn-cancel">Cancel</button>
                        <button class="wl-settings-btn-save">Save</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Styles
            const style = document.createElement('style');
            style.textContent = `
                #wl-lang-settings { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 10000; display: none; }
                #wl-lang-settings.wl-visible { display: block; }
                .wl-settings-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.3); }
                .wl-settings-dialog { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 320px; background: var(--wl-surface-light); backdrop-filter: blur(20px); border: 1px solid var(--wl-glass-border-light); border-radius: 12px; padding: 20px; }
                .wl-lang-grid-settings { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
                .wl-lang-checkbox-wrapper { display: flex; align-items: center; gap: 8px; padding: 8px; background: rgba(0,0,0,0.03); border-radius: 6px; cursor: pointer; }
                .wl-lang-checkbox { accent-color: var(--wl-accent); }
                .wl-lang-label { font-size: 13px; }
                .wl-settings-btn-cancel, .wl-settings-btn-save { padding: 8px 16px; border-radius: 6px; border: none; font-size: 13px; cursor: pointer; }
                .wl-settings-btn-cancel { background: transparent; color: var(--wl-muted-light); border: 1px solid var(--wl-glass-border-light); }
                .wl-settings-btn-save { background: var(--wl-accent); color: #000; }
            `;
            document.head.appendChild(style);

            modal.querySelector('.wl-settings-overlay').addEventListener('click', hideLanguageSettings);
            modal.querySelector('.wl-settings-btn-cancel').addEventListener('click', hideLanguageSettings);
            modal.querySelector('.wl-settings-btn-save').addEventListener('click', saveLanguageSettings);
        }

        const grid = modal.querySelector('#wl-lang-grid');
        grid.innerHTML = LANGUAGES.filter(l => l.code !== 'en').map(lang => `
            <label class="wl-lang-checkbox-wrapper">
                <input type="checkbox" class="wl-lang-checkbox" value="${lang.code}" ${pinnedLanguages.includes(lang.code) ? 'checked' : ''}>
                <span class="wl-lang-label">${lang.name}</span>
            </label>
        `).join('');

        modal.classList.add('wl-visible');
    }

    function hideLanguageSettings() {
        const modal = document.getElementById('wl-lang-settings');
        if (modal) modal.classList.remove('wl-visible');
    }

    function saveLanguageSettings() {
        const checkboxes = document.querySelectorAll('#wl-lang-settings .wl-lang-checkbox:checked');
        pinnedLanguages = Array.from(checkboxes).map(cb => cb.value);
        chrome.storage.sync.set({ pinnedLanguages });
        hideLanguageSettings();
        if (currentTab === 'translate') loadTranslateTab();
    }

    // ============================================
    // DRAG
    // ============================================

    function setupDrag() {
        popupEl.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            isDragging = true;
            wasJustDragged = false;
            const rect = popupEl.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            popupEl.style.cursor = 'grabbing';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const w = popupEl.offsetWidth;
            const h = popupEl.offsetHeight;
            let x = e.clientX - dragOffsetX;
            let y = e.clientY - dragOffsetY;
            x = Math.max(0, Math.min(x, window.innerWidth - w));
            y = Math.max(0, Math.min(y, window.innerHeight - h));
            popupEl.style.left = `${x}px`;
            popupEl.style.top = `${y}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                popupEl.style.cursor = 'grab';
                isDragging = false;
                wasJustDragged = true;
                setTimeout(() => wasJustDragged = false, 100);
            }
        });
    }

    // ============================================
    // KEYBOARD
    // ============================================

    function attachGlobalKeydown() {
        document.addEventListener('keydown', (e) => {
            if (!popupEl || !popupEl.classList.contains('wl-show')) return;

            if (e.key === 'Escape') {
                hidePopup();
                return;
            }

            if (e.key === '1') switchTab('dictionary');
            if (e.key === '2') switchTab('translate');
            if (e.key === '3') switchTab('vault');
        });
    }

    // ============================================
    // COMMAND PALETTE
    // ============================================

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'Space') {
            e.preventDefault();
            toggleCommandPalette();
        }
        if (e.key === 'Escape' && commandPaletteVisible) {
            hideCommandPalette();
        }
    });

    function toggleCommandPalette() {
        commandPaletteVisible ? hideCommandPalette() : showCommandPalette();
    }

    function showCommandPalette() {
        let palette = document.getElementById('wordlens-command-palette');
        if (!palette) {
            palette = document.createElement('div');
            palette.id = 'wordlens-command-palette';
            palette.innerHTML = `
                <div class="wl-cp-input-wrapper">
                    <svg class="wl-cp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.35-4.35"></path></svg>
                    <input type="text" class="wl-cp-input" placeholder="Search any word..." autocomplete="off">
                    <button class="wl-cp-close" title="Close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                </div>
                <div class="wl-cp-results" id="wl-cp-results"></div>
            `;
            document.body.appendChild(palette);

            // Inject command palette styles
            const styleId = 'wordlens-cp-styles';
            if (!document.getElementById(styleId)) {
                const style = document.createElement('style');
                style.id = styleId;
                style.textContent = `
                    #wordlens-command-palette { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 2147483648; width: 100%; max-width: 560px; background: var(--wl-surface-light); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid var(--wl-glass-border-light); border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden; display: none; }
                    #wordlens-command-palette.wl-visible { display: block; animation: wl-card-entrance 150ms ease-out; }
                    .wl-cp-input-wrapper { display: flex; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--wl-glass-border-light); gap: 12px; }
                    .wl-cp-icon { width: 20px; height: 20px; color: var(--wl-muted-light); flex-shrink: 0; }
                    .wl-cp-input { flex: 1; background: transparent; border: none; outline: none; font-size: 16px; color: var(--wl-text-light); }
                    .wl-cp-input::placeholder { color: var(--wl-muted-light); }
                    .wl-cp-close { background: transparent; border: none; color: var(--wl-muted-light); cursor: pointer; padding: 4px; border-radius: 4px; }
                    .wl-cp-close:hover { background: rgba(128,128,128,0.1); color: var(--wl-text-light); }
                    .wl-cp-results { max-height: 400px; overflow-y: auto; padding: 8px; }
                    .wl-cp-result-item { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 8px; cursor: pointer; transition: background 0.15s ease; }
                    .wl-cp-result-item:hover, .wl-cp-result-item.wl-active { background: rgba(74, 222, 128, 0.08); }
                    .wl-cp-result-icon { width: 16px; height: 16px; color: var(--wl-accent); flex-shrink: 0; }
                    .wl-cp-result-text { font-size: 15px; color: var(--wl-text-light); }
                    .wl-cp-result-meta { font-size: 12px; color: var(--wl-muted-light); margin-left: auto; }
                    .wl-cp-no-results { padding: 20px; text-align: center; color: var(--wl-muted-light); font-size: 14px; }
                `;
                document.head.appendChild(style);
            }

            palette.querySelector('.wl-cp-close').addEventListener('click', hideCommandPalette);
            const input = palette.querySelector('.wl-cp-input');
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') hideCommandPalette();
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const results = searchResults;
                    if (results.length > 0) selectSearchResult(results[0]);
                }
            });
            input.addEventListener('input', debounce(handleCommandInput, 150));

            if (pageLuminance < 0.5) palette.classList.add('wl-theme-dark');
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

    let searchResults = [];
    function handleCommandInput(e) {
        const query = e.target.value.trim();
        if (!query) {
            document.getElementById('wl-cp-results').innerHTML = '';
            searchResults = [];
            return;
        }

        fetchWordInfo(query).then(results => {
            searchResults = results;
            renderSearchResults(results);
        }).catch(console.error);
    }

    function renderSearchResults(results) {
        const container = document.getElementById('wl-cp-results');
        if (!results || results.length === 0) {
            container.innerHTML = '<div class="wl-cp-no-results">No results found</div>';
            return;
        }

        container.innerHTML = results.map(r => `
            <div class="wl-cp-result-item" data-word="${escapeHTML(r.word)}">
                <svg class="wl-cp-result-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.35-4.35"></path></svg>
                <div class="wl-cp-result-text">${escapeHTML(r.word)}</div>
                <div class="wl-cp-result-meta">${r.type}</div>
            </div>
        `).join('');

        container.querySelectorAll('.wl-cp-result-item').forEach(item => {
            item.addEventListener('click', () => selectSearchResult({ word: item.dataset.word }));
        });
    }

    function selectSearchResult(result) {
        if (result?.word) {
            hideCommandPalette();
            showPopup(result.word, '');
        }
    }

    async function fetchWordInfo(query) {
        try {
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(query)}`);
            if (response.ok) {
                const data = await response.json();
                return data.map(entry => ({ word: entry.word, type: 'dictionary' }));
            }
        } catch (e) {}
        return [{ word: query, type: 'lookup' }];
    }

    // ============================================
    // UTILITIES
    // ============================================

    function getWordElementAtPoint(x, y) {
        try {
            // Try standard method (Chrome, Safari, Edge)
            let range = null;
            if (typeof document.caretRangeFromPoint === 'function') {
                range = document.caretRangeFromPoint(x, y);
            }

            // Fallback for Firefox and other browsers
            if (!range && typeof document.caretPositionFromPoint === 'function') {
                const pos = document.caretPositionFromPoint(x, y);
                if (pos && pos.offsetNode && pos.offsetNode.nodeType === Node.TEXT_NODE) {
                    range = document.createRange();
                    range.setStart(pos.offsetNode, pos.offset);
                    range.setEnd(pos.offsetNode, pos.offset);
                }
            }

            // If still no range, try alternative method using elementFromPoint
            if (!range) {
                let element = document.elementFromPoint(x, y);
                if (!element) return null;

                // Find closest text node
                const walker = document.createTreeWalker(
                    element,
                    NodeFilter.SHOW_TEXT,
                    {
                        acceptNode: function(node) {
                            // Skip empty text nodes
                            if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
                            return NodeFilter.FILTER_ACCEPT;
                        }
                    }
                );

                let textNode = walker.nextNode();
                if (!textNode) return null;

                // Estimate offset based on position within element
                const rect = element.getBoundingClientRect();
                const relativeX = x - rect.left;
                const charWidth = rect.width / element.textContent.length;
                let offset = Math.max(0, Math.min(textNode.textContent.length, Math.floor(relativeX / (charWidth || 1))));

                range = document.createRange();
                range.setStart(textNode, offset);
                range.setEnd(textNode, offset);
            }

            if (!range) return null;

            const node = range.startContainer;
            if (!node || node.nodeType !== Node.TEXT_NODE) return null;

            const text = node.textContent;
            const offset = range.startOffset;

            const before = text.slice(0, offset);
            const after = text.slice(offset);

            // Match words including @ mentions, #hashtags, underscores, hyphens. Exclude only whitespace and common punctuation
            const beforeMatch = before.match(/([^\s!"$%&'()*+,./:;<=>?\[\\\]^`{|}~]+)$/);
            const afterMatch = after.match(/^([^\s!"$%&'()*+,./:;<=>?\[\\\]^`{|}~]+)/);

            let word = null;
            let start = null;

            if (beforeMatch) {
                word = beforeMatch[1];
                start = offset - word.length;
            } else if (afterMatch) {
                word = afterMatch[1];
                start = offset;
            } else {
                return null;
            }

            // Increased max length for social media (handles long hashtags/URLs)
            if (word.length < 2 || word.length > 100) return null;

            return {
                element: node,
                start: start,
                end: start + word.length,
                word: word
            };
        } catch (e) {
            return null;
        }
    }

    function addUnderline(wordInfo) {
        if (!wordInfo || wordInfo.underlined) return;

        const { element, start, word } = wordInfo;
        // Split the text node to isolate the word
        const tail = element.splitText(start); // tail starts with the word
        const wordNode = tail.splitText(word.length); // tail becomes the word, wordNode is remainder

        const span = document.createElement('span');
        span.className = 'wl-peek-word';
        // Move the word (tail) into the span instead of duplicating
        tail.parentNode.insertBefore(span, tail);
        span.appendChild(tail);

        span.__wordlensPeek = true;
        wordInfo.element = span;
        wordInfo.underlined = true;
    }

    function removeUnderline(wordInfo) {
        if (!wordInfo || !wordInfo.underlined) return;

        const span = wordInfo.element;
        if (span && span.__wordlensPeek && span.parentNode) {
            const textNode = document.createTextNode(span.textContent);
            span.parentNode.replaceChild(textNode, span);
        }
    }

    function extractSelectedWord(text) {
        // Trim and extract the first word/phrase, allowing @ mentions and #hashtags
        const trimmed = text.trim();
        if (!trimmed) return '';
        // Match @, #, underscores, hyphens as part of words
        const match = trimmed.match(/^([^\s!"$%&'()*+,./:;<=>?\[\\\]^`{|}~]+)/);
        return match ? match[1] : trimmed.split(/\s+/)[0];
    }

    function extractSentenceContext(range) {
        if (range.startContainer.nodeType !== Node.TEXT_NODE) return '';
        const text = range.startContainer.textContent;
        const start = Math.max(0, range.startOffset - 100);
        const end = Math.min(text.length, range.endOffset + 100);
        let snippet = text.slice(start, end);
        const sentenceEnd = snippet.search(/[.!?]/);
        if (sentenceEnd !== -1) snippet = snippet.slice(0, sentenceEnd + 1);
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

    function getLanguageName(code) {
        return LANGUAGES.find(l => l.code === code)?.name || code;
    }

    function getCEFRColor(level) {
        const colors = { 'A1': '#22c55e', 'A2': '#22c55e', 'B1': '#fbbf24', 'B2': '#fbbf24', 'C1': '#ef4444', 'C2': '#ef4444' };
        return colors[level] || '#6b7280';
    }

    function getCEFRTextColor(level) {
        const colors = { 'A1': '#14532d', 'A2': '#14532d', 'B1': '#422006', 'B2': '#422006', 'C1': '#7f1d1d', 'C2': '#7f1d1d' };
        return colors[level] || '#1f2937';
    }

    function formatFullText(data) {
        const meanings = data.meanings.map(m => `${m.partOfSpeech}: ${m.definition}`).join('\n\n');
        return `${data.word}${data.phonetic ? ' (' + data.phonetic + ')' : ''}\n\n${meanings}`;
    }

    // Load pinned languages on init
    chrome.storage.sync.get(['pinnedLanguages'], (result) => {
        if (result.pinnedLanguages && Array.isArray(result.pinnedLanguages)) {
            pinnedLanguages = result.pinnedLanguages;
        } else {
            pinnedLanguages = ['es', 'fr', 'ja'];
        }
    });

})();
