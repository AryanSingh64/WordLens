/**
 * popup.js — Logic for the toolbar popup
 * Handles saving the Claude API key and navigation buttons.
 */

// Load saved API key on popup open
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('apiKeyInput');
    const saveBtn = document.getElementById('saveKeyBtn');
    const status = document.getElementById('saveStatus');

    // Load any existing key from Chrome storage
    chrome.storage.local.get(['groqApiKey'], (result) => {
        if (result.groqApiKey) {
            // Show the last 4 characters so user knows a key is saved
            input.placeholder = '••••••' + result.groqApiKey.slice(-4);
        }
    });

    // Save button click
    saveBtn.addEventListener('click', () => {
        const key = input.value.trim();
        if (!key) {
            status.textContent = 'Please enter a valid key.';
            status.style.color = '#ef4444';
            return;
        }

        chrome.storage.local.set({ groqApiKey: key }, () => {
            status.textContent = 'Key saved!';
            status.style.color = '#4ade80';
            input.value = '';
            input.placeholder = '••••••' + key.slice(-4);
        });
    });

    // Navigation buttons
    document.getElementById('openPdf').addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('pdf-viewer.html') });
    });

    document.getElementById('openSettings').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });
});
