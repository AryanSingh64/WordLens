/**
 * popup.js — Vocabulary vault popup
 * Shows saved words and quick actions.
 */

document.addEventListener('DOMContentLoaded', () => {
    const contentEl = document.getElementById('wl-vault-content');
    const btnSettings = document.getElementById('wl-btn-settings');
    const btnClearAll = document.getElementById('wl-btn-clear-all'); // We'll add dynamically
    const linkPdf = document.getElementById('wl-link-pdf');

    // Load vault items
    loadVaultItems();

    // Settings button -> open options page
    btnSettings.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    // Open PDF reader
    linkPdf.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('pdf-viewer.html') });
    });
});

async function loadVaultItems() {
    const contentEl = document.getElementById('wl-vault-content');

    try {
        const result = await new Promise((resolve, reject) => {
            chrome.storage.local.get(['savedWords'], (res) => {
                if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                else resolve(res.savedWords || []);
            });
        });

        const words = result;

        if (words.length === 0) {
            contentEl.innerHTML = `
                <div class="wl-vault-empty">
                    <div class="wl-vault-empty-icon">📚</div>
                    <p class="wl-vault-empty-text">Your vocabulary vault is empty.</p>
                    <p style="font-size: 12px; margin-top: 4px;">Select words while reading and click "Save" to build your collection.</p>
                </div>
            `;
            return;
        }

        // Build list
        let html = ``;

        words.forEach((entry, index) => {
            html += `
                <div class="wl-vault-item">
                    <h4 class="wl-vault-word">${escapeHTML(entry.word)}</h4>
                    <p class="wl-vault-context">${escapeHTML(entry.contextSentence || entry.meaning || '')}</p>
                    <p class="wl-vault-date">${new Date(entry.timestamp).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    })}</p>
                </div>
            `;
        });

        // Add clear all at end
        html += `
            <button class="wl-popup-action-btn wl-popup-clear" id="wl-btn-clear-all" style="width: 100%; margin-top: 12px;">
                Clear all words
            </button>
        `;

        contentEl.innerHTML = html;

        // Attach clear handler
        document.getElementById('wl-btn-clear-all').addEventListener('click', async () => {
            if (confirm('Delete all saved words?')) {
                await new Promise((resolve, reject) => {
                    chrome.storage.local.set({ savedWords: [] }, () => {
                        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                        else resolve();
                    });
                });
                loadVaultItems();
            }
        });

    } catch (err) {
        console.error('Failed to load vault:', err);
        contentEl.innerHTML = `
            <div class="wl-error-banner">
                Error loading vault: ${escapeHTML(err.message)}
            </div>
        `;
    }
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
