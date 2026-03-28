/**
 * sidepanel.js — Side panel UI for WordLens
 * Handles displaying word cards, translations, vocabulary vault, and settings
 */

let currentTab = 'dictionary';
let currentWord = '';
let currentSelection = '';
let currentContext = '';
let isWord = true;
let targetLanguage = 'en';
let selectedPinnedLanguages = ['es', 'fr', 'ja']; // Default 3 languages

// Supported languages for translation
const LANGUAGES = [
    { code: 'en', name: 'English' },
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

// Tab elements
let tabDict, tabAi, tabTrans, btnSave, btnVault, btnLangSettings, mainContent;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Cache DOM references
    tabDict = document.getElementById('wl-tab-dict');
    tabAi = document.getElementById('wl-tab-ai');
    tabTrans = document.getElementById('wl-tab-trans');
    btnSave = document.getElementById('wl-btn-save');
    btnVault = document.getElementById('wl-btn-vault');
    btnLangSettings = document.getElementById('wl-btn-lang-settings');
    mainContent = document.getElementById('wl-main-content');

    // Load settings
    loadSettings();

    // Setup tab listeners
    setupTabListeners();

    // Setup vault button
    btnVault.addEventListener('click', showVault);

    // Setup language settings button
    btnLangSettings.addEventListener('click', showLanguageSettings);

    // Settings modal handlers
    document.getElementById('wl-settings-backdrop').addEventListener('click', hideLanguageSettings);
    document.getElementById('wl-lang-settings').addEventListener('click', (e) => {
        if (e.target.id === 'wl-lang-settings') hideLanguageSettings();
    });
    document.getElementById('wl-settings-cancel').addEventListener('click', hideLanguageSettings);
    document.getElementById('wl-settings-save').addEventListener('click', saveLanguageSettings);

    // Check if we should show something from storage (pending word)
    chrome.storage.local.get(['pendingWord'], (result) => {
        if (result.pendingWord) {
            showWordResult(result.pendingWord);
            chrome.storage.local.remove(['pendingWord']);
            return;
        }

        // Also check for direct word data (from SET_CURRENT_WORD)
        chrome.storage.local.get(['currentWordData'], (result2) => {
            if (result2.currentWordData) {
                showWordResult(result2.currentWordData);
                chrome.storage.local.remove(['currentWordData']);
            }
        });
    });

    // Listen for runtime messages (for when side panel is already open)
    if (chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'UPDATE_WORD') {
                showWordResult({ word: message.word, context: message.context });
                sendResponse({ success: true });
            } else if (message.type === 'SHOW_VAULT') {
                showVault();
                sendResponse({ success: true });
            }
            return true;
        });
    }

    // Show the panel
    const root = document.getElementById('wordlens-sidepanel-root');
    root.classList.add('wl-visible');

    // Apply theme based on page
    detectAndApplyTheme();
});

function handleMessage(message, sender, sendResponse) {
    if (message.type === 'SHOW_WORD') {
        // Show a word result from command palette or direct lookup
        showWordResult(message.data);
        return true;
    }
}

// Tab switching
function setupTabListeners() {
    tabDict.addEventListener('click', () => switchTab('dictionary'));
    tabAi.addEventListener('click', () => switchTab('ai'));
    tabTrans.addEventListener('click', () => switchTab('translate'));

    btnSave.addEventListener('click', saveCurrentWord);
}

function switchTab(tabName) {
    if (currentTab === tabName) return;

    currentTab = tabName;

    // Update active state
    tabDict.classList.toggle('active', tabName === 'dictionary');
    tabAi.classList.toggle('active', tabName === 'ai');
    tabTrans.classList.toggle('active', tabName === 'translate');

    // Reload content
    loadTabContent();
}

function loadTabContent() {
    if (!currentWord) {
        mainContent.innerHTML = renderEmptyState();
        return;
    }

    // Show loading skeleton
    mainContent.innerHTML = renderSkeleton();

    if (currentTab === 'dictionary') {
        loadDictionaryTab();
    } else if (currentTab === 'ai') {
        loadAITab();
    } else if (currentTab === 'translate') {
        loadTranslateTab();
    }
}

function renderEmptyState() {
    return `
        <div style="text-align: center; padding: 60px 20px; color: var(--wl-muted-light);">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 16px; opacity: 0.5;">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="M21 21l-4.35-4.35"></path>
            </svg>
            <p style="font-size: 15px; margin-bottom: 8px;">No word selected</p>
            <p style="font-size: 13px;">Select any word on the page, use the command palette (<kbd style="padding: 2px 6px; background: rgba(128,128,128,0.1); border-radius: 4px; font-family: var(--wl-font-mono);">Ctrl+Shift+Space</kbd>), or click the WordLens icon to search.</p>
        </div>
    `;
}

function renderSkeleton() {
    return `
        <div class="wl-header" style="align-items: center; justify-content: flex-start; gap: 8px;">
            <h3 class="wl-word">${escapeHTML(currentWord.slice(0, 30))}${currentWord.length > 30 ? '...' : ''}</h3>
            <button class="wl-speak-btn" data-text="${escapeHTML(currentWord)}" title="Pronounce">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
            </button>
            <span class="wl-pos-badge-container"></span>
        </div>
        <div class="wl-skeleton-pulse" style="margin-top: 10px;"></div>
        <div class="wl-skeleton-pulse" style="width: 80%; margin-top: 6px;"></div>
    `;
}

// API calls through background
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
        // Get Groq API key
        const { groqApiKey } = await new Promise((resolve) => {
            chrome.storage.local.get(['groqApiKey'], resolve);
        });

        if (!groqApiKey) {
            mainContent.innerHTML = renderError('AI features require a Groq API key. Open WordLens popup to add your key.');
            return;
        }

        // Get context definition (if we have context)
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

        // Get dictionary definition (fallback)
        const dictData = await callBackground('LOOKUP_WORD', { word: currentWord, apiKey: groqApiKey });
        const generalDefHtml = dictData.meanings.map(m => `
            <div class="wl-pos-definition pos-${m.partOfSpeech}">
                <div class="wl-pos-label">${m.partOfSpeech}</div>
                <p class="wl-definition">${escapeHTML(m.definition)}</p>
                ${m.example ? `<p class="wl-example">"${escapeHTML(m.example)}"</p>` : ''}
            </div>
        `).join('');

        // Get CEFR level
        const cefrData = await callBackground('GET_CEFR_LEVEL', { word: currentWord, apiKey: groqApiKey });
        const cefrBadge = `<span class="wl-cefr-badge" style="background: ${getCEFRColor(cefrData.level)}; color: ${getCEFRTextColor(cefrData.level)};">${cefrData.level}</span>`;

        // Get etymology
        const etyData = await callBackground('GET_ETYMOLOGY', { word: currentWord, apiKey: groqApiKey });

        // Render
        mainContent.innerHTML = `
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

        // Attach speak/copy handlers
        attachButtonHandlers();

    } catch (err) {
        console.error('Dictionary load error:', err);
        mainContent.innerHTML = renderError(err.message);
    }
}

async function loadAITab() {
    try {
        const { groqApiKey } = await new Promise((resolve) => {
            chrome.storage.local.get(['groqApiKey'], resolve);
        });

        if (!groqApiKey) {
            mainContent.innerHTML = renderError('AI features require a Groq API key. Open WordLens popup to add your key.');
            return;
        }

        // Use contextual definition directly (better for single word too)
        const ctxDef = await callBackground('CONTEXT_DEFINITION', {
            word: currentWord,
            sentence: currentContext || `The word "${currentWord}" appears in the text.`,
            apiKey: groqApiKey
        });

        // Get CEFR level
        const cefrData = await callBackground('GET_CEFR_LEVEL', { word: currentWord, apiKey: groqApiKey });
        const cefrBadge = `<span class="wl-cefr-badge" style="background: ${getCEFRColor(cefrData.level)}; color: ${getCEFRTextColor(cefrData.level)};">${cefrData.level}</span>`;

        mainContent.innerHTML = `
            <div class="wl-header" style="align-items: center; justify-content: flex-start; gap: 8px;">
                <div class="wl-word-title-row">
                    <h3 class="wl-word">${escapeHTML(currentWord)}</h3>
                    ${cefrBadge}
                </div>
                <button class="wl-icon-btn wl-speak-btn" data-text="${escapeHTML(currentWord)}" title="Listen">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    </svg>
                </button>
                <button class="wl-icon-btn wl-copy-btn" data-copy-text="${escapeHTML(currentWord + '\n\n' + ctxDef.definition)}" title="Copy" style="margin-left: auto;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                </button>
            </div>

            <div class="wl-pos-definition" style="border-left-color: var(--wl-pos-adjective);">
                <div class="wl-pos-label">Contextual meaning</div>
                <p class="wl-definition">${escapeHTML(ctxDef.definition)}</p>
            </div>
        `;

        attachButtonHandlers();

    } catch (err) {
        console.error('AI load error:', err);
        mainContent.innerHTML = renderError(err.message);
    }
}

async function loadTranslateTab() {
    try {
        const translations = [];

        for (const lang of selectedPinnedLanguages) {
            if (lang === 'en') continue; // Skip English

            const result = await callBackground('TRANSLATE_TEXT', {
                text: currentWord,
                targetLang: lang
            });

            translations.push({
                code: lang,
                name: LANGUAGES.find(l => l.code === lang)?.name || lang,
                translation: result.translation
            });
        }

        // Detect language if not English
        let detectedDisplay = 'English (source)';
        if (targetLanguage !== 'en') {
            const result = await callBackground('TRANSLATE_TEXT', {
                text: currentWord,
                targetLang: 'en'
            });
            if (result.detectedLang && result.detectedLang !== 'en') {
                const detectedName = LANGUAGES.find(l => l.code === result.detectedLang)?.name || result.detectedLang;
                detectedDisplay = `Detected: ${detectedName}`;
            }
        }

        mainContent.innerHTML = `
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

            <div style="margin-top: 8px; font-size: 12px; color: var(--wl-muted-light); text-align: center;">
                ${detectedDisplay}
            </div>
        `;

        attachButtonHandlers();

    } catch (err) {
        console.error('Translate load error:', err);
        mainContent.innerHTML = renderError('Translation failed: ' + err.message);
    }
}

// Vocabulary vault
function showVault() {
    mainContent.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <h3 style="font-size: 16px; font-weight: 600; color: var(--wl-text-light);">Vocabulary Vault</h3>
            <button class="wl-vault-btn wl-vault-clear-all" id="wl-vault-clear">Clear all</button>
        </div>
        <div class="wl-vault-list" id="wl-vault-list">
            <div class="wl-skeleton-pulse" style="height: 60px; margin-bottom: 8px;"></div>
            <div class="wl-skeleton-pulse" style="height: 60px; margin-bottom: 8px;"></div>
            <div class="wl-skeleton-pulse" style="height: 60px;"></div>
        </div>
    `;

    loadVaultItems();

    document.getElementById('wl-vault-clear').addEventListener('click', async () => {
        if (confirm('Delete all saved words?')) {
            await callBackground('CLEAR_VAULT');
            loadVaultItems();
        }
    });
}

async function loadVaultItems() {
    try {
        const words = await callBackground('GET_VAULT');

        const listEl = document.getElementById('wl-vault-list');
        if (!listEl) return;

        if (words.length === 0) {
            listEl.innerHTML = `
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

        listEl.innerHTML = words.map((entry, index) => `
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

        // Attach handlers
        listEl.querySelectorAll('.wl-vault-lookup').forEach(btn => {
            btn.addEventListener('click', () => {
                const word = btn.dataset.word;
                const context = btn.dataset.context;
                // Set current word and switch to dictionary
                currentWord = word;
                currentContext = context || '';
                switchTab('dictionary');
                loadTabContent();
            });
        });

        listEl.querySelectorAll('.wl-vault-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const index = parseInt(btn.dataset.index);
                const words = await callBackground('GET_VAULT');
                words.splice(index, 1);
                await new Promise(resolve => {
                    chrome.storage.local.set({ savedWords: words }, resolve);
                });
                loadVaultItems();
            });
        });

    } catch (err) {
        console.error('Vault load error:', err);
        mainContent.innerHTML = renderError('Failed to load vault');
    }
}

// Language settings
function loadSettings() {
    chrome.storage.sync.get(['pinnedLanguages'], (result) => {
        if (result.pinnedLanguages && Array.isArray(result.pinnedLanguages)) {
            selectedPinnedLanguages = result.pinnedLanguages;
        } else {
            // Default
            selectedPinnedLanguages = ['es', 'fr', 'ja'];
        }
    });
}

function showLanguageSettings() {
    const modal = document.getElementById('wl-lang-settings');
    const backdrop = document.getElementById('wl-settings-backdrop');
    const checkboxesContainer = document.getElementById('wl-lang-checkboxes');

    // Generate checkboxes
    checkboxesContainer.innerHTML = LANGUAGES.filter(l => l.code !== 'en').map(lang => `
        <label class="wl-lang-checkbox-wrapper">
            <input type="checkbox" class="wl-lang-checkbox" value="${lang.code}" ${selectedPinnedLanguages.includes(lang.code) ? 'checked' : ''}>
            <span class="wl-lang-label">${lang.name}</span>
        </label>
    `).join('');

    modal.classList.add('wl-visible');
    backdrop.classList.add('wl-visible');
}

function hideLanguageSettings() {
    document.getElementById('wl-lang-settings').classList.remove('wl-visible');
    document.getElementById('wl-settings-backdrop').classList.remove('wl-visible');
}

function saveLanguageSettings() {
    const checkboxes = document.querySelectorAll('.wl-lang-checkbox:checked');
    selectedPinnedLanguages = Array.from(checkboxes).map(cb => cb.value);

    // Save to sync storage
    chrome.storage.sync.set({ pinnedLanguages: selectedPinnedLanguages }, () => {
        hideLanguageSettings();
        // Reload current tab if on translate
        if (currentTab === 'translate' && currentWord) {
            loadTranslateTab();
        }
    });
}

// Helpers
function showWordResult(data) {
    currentWord = data.word;
    currentContext = data.contextSentence || '';
    switchTab('dictionary');
    // Ensure the panel is visible (in case it was closed)
    document.getElementById('wordlens-sidepanel-root').classList.add('wl-visible');
    loadTabContent();
}

function saveCurrentWord() {
    if (!currentWord) return;

    const { groqApiKey } = chrome.storage.local.get(['groqApiKey'], () => {});
    // We need the current definition/meaning displayed
    const definitionEl = mainContent.querySelector('.wl-definition');
    const contextEl = mainContent.querySelector('.wl-pos-definition .wl-definition');
    const meaning = (definitionEl?.textContent || '') + (contextEl?.textContent || '');

    const entry = {
        word: currentWord,
        contextSentence: currentContext,
        meaning: meaning.trim(),
        timestamp: Date.now(),
        url: window.location.href
    };

    callBackground('SAVE_TO_VAULT', entry).then(() => {
        const saveBtn = document.querySelector('#wl-btn-save span');
        if (saveBtn) {
            const originalText = saveBtn.textContent;
            saveBtn.textContent = 'Saved!';
            setTimeout(() => saveBtn.textContent = originalText, 2000);
        }
    }).catch(console.error);
}

function attachButtonHandlers() {
    mainContent.querySelectorAll('.wl-speak-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const text = btn.dataset.text || currentWord;
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.9;
            window.speechSynthesis.speak(utterance);
        });
    });

    mainContent.querySelectorAll('.wl-copy-btn').forEach(btn => {
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
}

function getCEFRColor(level) {
    const colors = {
        'A1': '#22c55e', 'A2': '#22c55e',
        'B1': '#fbbf24', 'B2': '#fbbf24',
        'C1': '#ef4444', 'C2': '#ef4444'
    };
    return colors[level] || '#6b7280';
}

function getCEFRTextColor(level) {
    const colors = {
        'A1': '#14532d', 'A2': '#14532d',
        'B1': '#422006', 'B2': '#422006',
        'C1': '#7f1d1d', 'C2': '#7f1d1d'
    };
    return colors[level] || '#1f2937';
}

function formatFullText(data) {
    const meanings = data.meanings.map(m => `${m.partOfSpeech}: ${m.definition}`).join('\n\n');
    return `${data.word}${data.phonetic ? ' (' + data.phonetic + ')' : ''}\n\n${meanings}`;
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function renderError(msg) {
    return `
        <div class="wl-error">
            <strong>Error:</strong> ${escapeHTML(msg)}
        </div>
        <button class="wl-retry-btn wl-action-btn" style="margin-top: 12px; width: auto;" id="wl-btn-retry">Retry</button>
    `;
}

// Auto dark/light theme detection (query content script)
async function detectAndApplyTheme() {
    try {
        // Get the active tab in the current window
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const tab = tabs[0];
        if (!tab?.id) return;

        // Send message to content script to get background luminance
        chrome.tabs.sendMessage(tab.id, { type: 'GET_BG_LUMINANCE' }, (response) => {
            if (chrome.runtime.lastError) {
                console.warn('Could not get theme from content script:', chrome.runtime.lastError);
                return;
            }
            if (response && response.luminance !== undefined) {
                const root = document.getElementById('wordlens-sidepanel-root');
                if (response.luminance < 0.5) {
                    root.classList.add('wl-theme-dark');
                } else {
                    root.classList.remove('wl-theme-dark');
                }
            }
        });
    } catch (e) {
        console.warn('Theme detection failed:', e);
    }
}

// Handle retry
function attachRetryHandler() {
    const retryBtn = document.getElementById('wl-btn-retry');
    if (retryBtn) {
        retryBtn.addEventListener('click', loadTabContent);
    }
}

// Override loadTabContent to attach retry handler after a delay
const originalLoadTabContent = loadTabContent;
loadTabContent = function() {
    originalLoadTabContent();
    setTimeout(attachRetryHandler, 100);
};
