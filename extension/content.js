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

    // Cache for speak button text
    const speakTextMap = new Map();

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
        setTimeout(() => {
            const selection = window.getSelection();
            const text = selection.toString().trim();

            if (text.length > 0 && text.length < 500) {
                const range = selection.getRangeAt(0);
                const word = extractSelectedWord(text);
                const context = extractSentenceContext(range);

                showPopup(word, context);
            } else if (text.length === 0) {
                hidePopup();
            }

            if (currentWordElement) {
                removeUnderline(currentWordElement);
                currentWordElement = null;
            }
        }, 10);
    });

    // ============================================
    // FLOATING POPUP UI
    // ============================================

    function initPopup() {
        if (popupEl) return;

        popupEl = document.createElement('div');
        popupEl.id = 'wordlens-popup-root';
        document.body.appendChild(popupEl);

        setupDrag();
        setupTabListeners();
        attachGlobalKeydown();
    }

    function showPopup(word, context) {
        initPopup();

        currentWord = word;
        currentContext = context;
        currentTab = 'dictionary';

        // Position near selection (simplified: center-ish)
        const x = Math.min(window.innerWidth - 650, Math.max(20, window.scrollX + window.innerWidth / 2 - 300));
        const y = Math.max(20, window.scrollY + 100);

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
        attachButtonHandlers();
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

    function attachButtonHandlers() {
        const main = document.getElementById('wl-main-content');
        if (!main) return;

        main.querySelectorAll('.wl-speak-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const text = btn.dataset.text || currentWord;
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'en-US';
                utterance.rate = 0.9;
                window.speechSynthesis.speak(utterance);
            });
        });

        main.querySelectorAll('.wl-copy-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const text = btn.dataset.copyText;
                try {
                    await navigator.clipboard.writeText(text);
                    btn.style.color = 'var(--wl-accent)';
                    setTimeout(() => btn.style.color = '', 2000);
                } catch (err) {
                    console.error('Copy failed:', err);
                }
            });
        });

        main.querySelectorAll('.wl-retry-btn').forEach(btn => {
            btn.addEventListener('click', loadTabContent);
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

            // Get context definition
            let contextDefHtml = '';
            if (currentContext) {
                const ctxDef = await callBackground('CONTEXT_DEFINITION', {
                    word: currentWord,
                    sentence: currentContext,
                    apiKey: groqApiKey
                });
                contextDefHtml = `
                    <div class="wl-pos-definition">
                        <div class="wl-pos-label">In this context</div>
                        <p class="wl-definition">${escapeHTML(ctxDef.definition)}</p>
                    </div>
                `;
            }

            // Get dictionary definition
            const dictData = await callBackground('LOOKUP_WORD', { word: currentWord });
            const generalDefHtml = dictData.meanings.map(m => `
                <div class="wl-pos-definition pos-${m.partOfSpeech}">
                    <div class="wl-pos-label">${m.partOfSpeech}</div>
                    <p class="wl-definition">${escapeHTML(m.definition)}</p>
                    ${m.example ? `<p class="wl-example">"${escapeHTML(m.example)}"</p>` : ''}
                </div>
            `).join('');

            // CEFR level
            const cefrData = await callBackground('GET_CEFR_LEVEL', { word: currentWord, apiKey: groqApiKey });
            const cefrBadge = `<span class="wl-cefr-badge" style="background: ${getCEFRColor(cefrData.level)}; color: ${getCEFRTextColor(cefrData.level)};">${cefrData.level}</span>`;

            // Etymology
            const etyData = await callBackground('GET_ETYMOLOGY', { word: currentWord, apiKey: groqApiKey });

            const main = document.getElementById('wl-main-content');
            main.innerHTML = `
                <div class="wl-header" style="align-items: center; justify-content: flex-start; gap: 8px;">
                    <div class="wl-word-title-row">
                        <h3 class="wl-word">${escapeHTML(dictData.word)}</h3>
                        ${cefrBadge}
                    </div>
                    <button class="wl-icon-btn wl-speak-btn" data-text="${escapeHTML(dictData.word)}" title="Pronounce">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                        </svg>
                    </button>
                    ${dictData.phonetic ? `<span class="wl-phonetic">${escapeHTML(dictData.phonetic)}</span>` : ''}
                    <button class="wl-icon-btn wl-copy-btn" data-copy-text="${escapeHTML(formatFullText(dictData))}" title="Copy" style="margin-left: auto;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                </div>

                ${contextDefHtml}

                <div style="margin-top: 8px;">
                    ${generalDefHtml}
                </div>

                ${etyData.etymology ? `
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

    async function loadTranslateTab() {
        try {
            const translations = [];
            for (const lang of pinnedLanguages) {
                if (lang === 'en') continue;
                const result = await callBackground('TRANSLATE_TEXT', {
                    text: currentWord,
                    targetLang: lang
                });
                translations.push({
                    code: lang,
                    name: getLanguageName(lang),
                    translation: result.translation
                });
            }

            const main = document.getElementById('wl-main-content');
            main.innerHTML = `
                <div class="wl-header" style="align-items: center; justify-content: flex-start; gap: 8px;">
                    <h3 class="wl-word">${escapeHTML(currentWord)}</h3>
                    <button class="wl-icon-btn wl-copy-btn" data-copy-text="${escapeHTML(currentWord + '\n\n' + translations.map(t => t.name + ': ' + t.translation).join('\n'))}" title="Copy all" style="margin-left: auto;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                </div>

                <div class="wl-lang-grid">
                    ${translations.map(t => `
                        <div class="wl-lang-card">
                            <div class="wl-lang-name">${escapeHTML(t.name)}</div>
                            <div class="wl-lang-text">${escapeHTML(t.translation)}</div>
                        </div>
                    `).join('')}
                </div>

                <div style="margin-top: 12px; text-align: center;">
                    <button class="wl-settings-icon" id="wl-btn-lang-settings" title="Choose languages">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"></path>
                        </svg>
                    </button>
                </div>
            `;

            // Attach language settings button
            document.getElementById('wl-btn-lang-settings')?.addEventListener('click', showLanguageSettings);

        } catch (err) {
            console.error('Translate error:', err);
            renderError('Translation failed: ' + err.message);
        }
    }

    async function loadVaultTab() {
        const main = document.getElementById('wl-main-content');
        main.innerHTML = '<div class="wl-skeleton-pulse" style="height: 60px; margin-bottom: 8px;"></div>';

        try {
            const words = await callBackground('GET_VAULT');

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

            main.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h3 style="font-size: 16px; font-weight: 600; margin: 0;">Vocabulary Vault</h3>
                    <button class="wl-vault-btn wl-vault-clear-all" id="wl-vault-clear">Clear all</button>
                </div>
                <div class="wl-vault-list" id="wl-vault-list"></div>
            `;

            renderVaultList(words);

            document.getElementById('wl-vault-clear').addEventListener('click', async () => {
                if (confirm('Delete all saved words?')) {
                    await callBackground('CLEAR_VAULT');
                    loadVaultTab();
                }
            });

        } catch (err) {
            main.innerHTML = renderError('Failed to load vault');
        }
    }

    function renderVaultList(words) {
        const list = document.getElementById('wl-vault-list');
        if (!list) return;

        list.innerHTML = words.map((entry, index) => `
            <div class="wl-vault-item" data-index="${index}">
                <h4 class="wl-vault-word">${escapeHTML(entry.word)}</h4>
                <p class="wl-vault-context">${escapeHTML(entry.contextSentence || entry.meaning || '')}</p>
                <p class="wl-vault-date">${new Date(entry.timestamp).toLocaleDateString()}</p>
                <div class="wl-vault-actions">
                    <button class="wl-vault-btn wl-vault-lookup"
                        data-word="${escapeHTML(entry.word)}"
                        data-context="${escapeHTML(entry.contextSentence || '')}">Look up</button>
                    <button class="wl-vault-btn wl-vault-delete" data-index="${index}">Delete</button>
                </div>
            </div>
        `).join('');

        list.querySelectorAll('.wl-vault-lookup').forEach(btn => {
            btn.addEventListener('click', () => {
                currentWord = btn.dataset.word;
                currentContext = btn.dataset.context;
                switchTab('dictionary');
                loadTabContent();
                // Scroll popup into view if needed
                popupEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
        });

        list.querySelectorAll('.wl-vault-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const index = parseInt(btn.dataset.index);
                const words = await callBackground('GET_VAULT');
                words.splice(index, 1);
                await new Promise(r => chrome.storage.local.set({ savedWords: words }, r));
                loadVaultTab();
            });
        });
    }

    function renderError(msg) {
        const main = document.getElementById('wl-main-content');
        if (!main) return;
        main.innerHTML = `
            <div class="wl-error">${escapeHTML(msg)}</div>
            <button class="wl-action-btn wl-retry-btn" style="margin-top: 12px; width: auto;">Retry</button>
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
            const range = document.caretRangeFromPoint(x, y);
            if (!range) return null;

            const node = range.startContainer;
            if (!node || node.nodeType !== Node.TEXT_NODE) return null;

            const text = node.textContent;
            const offset = range.startOffset;

            const before = text.slice(0, offset);
            const after = text.slice(offset);
            const beforeMatch = before.match(/\b(\w+)$/);
            const afterMatch = after.match(/^(\w+)/);

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

            if (word.length < 2 || word.length > 50) return null;

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
        return text.trim().split(/\s+/)[0];
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
