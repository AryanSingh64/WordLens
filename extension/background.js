// In-memory cache for API responses (TTL: 5 minutes)
const apiCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(type, query) {
  return `${type}:${query.toLowerCase().trim()}`;
}

function getCached(type, query) {
  const key = getCacheKey(type, query);
  const entry = apiCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  if (entry) apiCache.delete(key);
  return null;
}

function setCache(type, query, data) {
  const key = getCacheKey(type, query);
  apiCache.set(key, { data, timestamp: Date.now() });
}

// Retry helper with exponential backoff
async function fetchWithRetry(url, options, maxRetries = 2) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        // For 4xx errors (except 429), don't retry — client error
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        // For 5xx errors and 429 (rate limit), retry
        if (i === maxRetries - 1) throw new Error(`Failed after ${maxRetries} attempts: HTTP ${response.status}`);
        const delay = 500 * (i + 1); // 500ms, 1000ms
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      return response;
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      // Network errors: retry after delay
      await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)));
    }
  }
}

// Handle keyboard command to show command palette
if (chrome.commands && chrome.commands.onCommand) {
    chrome.commands.onCommand.addListener((command) => {
        if (command === 'open-palette') {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]?.id) {
                    chrome.tabs.sendMessage(tabs[0].id, { type: 'SHOW_COMMAND_PALETTE' });
                }
            });
        }
    });
}

// Listen for messages from content.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const safeSendResponse = (response) => {
      try {
        sendResponse(response);
      } catch (err) {
        if (err.message && err.message.includes('The message port closed')) {
          return;
        }
        console.error('Error sending response:', err);
      }
    };

    if (message.type === 'LOOKUP_WORD') {
        lookupWord(message.word)
            .then(data => safeSendResponse({ success: true, data }))
            .catch(err => safeSendResponse({ success: false, error: err.message }));
        return true;
    }

    if (message.type === 'SUMMARIZE_SENTENCE') {
        summarizeSentence(message.text, message.apiKey)
            .then(data => safeSendResponse({ success: true, data }))
            .catch(err => safeSendResponse({ success: false, error: err.message }));
        return true;
    }

    if (message.type === 'TRANSLATE_TEXT') {
        translateText(message.text, message.targetLang || 'en')
            .then(data => safeSendResponse({ success: true, data }))
            .catch(err => safeSendResponse({ success: false, error: err.message }));
        return true;
    }

    if (message.type === 'CONTEXT_DEFINITION') {
        getContextDefinition(message.word, message.sentence, message.apiKey)
            .then(data => safeSendResponse({ success: true, data }))
            .catch(err => safeSendResponse({ success: false, error: err.message }));
        return true;
    }

    if (message.type === 'GET_ETYMOLOGY') {
        getEtymology(message.word, message.apiKey)
            .then(data => safeSendResponse({ success: true, data }))
            .catch(err => safeSendResponse({ success: false, error: err.message }));
        return true;
    }

    if (message.type === 'GET_CEFR_LEVEL') {
        getCEFRLevel(message.word, message.apiKey)
            .then(data => safeSendResponse({ success: true, data }))
            .catch(err => safeSendResponse({ success: false, error: err.message }));
        return true;
    }

    if (message.type === 'SAVE_TO_VAULT') {
        saveToVault(message.entry)
            .then(() => safeSendResponse({ success: true }))
            .catch(err => safeSendResponse({ success: false, error: err.message }));
        return true;
    }

    if (message.type === 'GET_VAULT') {
        getVault()
            .then(data => safeSendResponse({ success: true, data }))
            .catch(err => safeSendResponse({ success: false, error: err.message }));
        return true;
    }

    if (message.type === 'CLEAR_VAULT') {
        clearVault()
            .then(() => safeSendResponse({ success: true }))
            .catch(err => safeSendResponse({ success: false, error: err.message }));
        return true;
    }

    if (message.type === 'OPEN_OPTIONS_PAGE') {
        chrome.runtime.openOptionsPage();
        return true;
    }
});


async function lookupWord(word) {
  // Check cache first
  const cached = getCached('dict', word);
  if (cached) return cached;

  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;

  const response = await fetchWithRetry(url, {});

  if (!response.ok) {
      throw new Error('Word not found');
  }

  const json = await response.json();
  const entry = json[0];

  const phonetic = entry.phonetic
      || (entry.phonetics && entry.phonetics.find(p => p.text)?.text)
      || '';

  const audio = entry.phonetics?.find(p => p.audio)?.audio || '';

  const meanings = entry.meanings.map(m => ({
      partOfSpeech: m.partOfSpeech,
      definition: m.definitions[0]?.definition || '',
      example: m.definitions[0]?.example || '',
  }));

  const result = {
      word: entry.word,
      phonetic,
      audio,
      meanings,
  };

  // Cache successful results only
  setCache('dict', word, result);
  return result;
}


// Groq API - free, blazing fast AI
async function summarizeSentence(text, apiKey) {
    if (!apiKey) {
        throw new Error('No API key. Click the WordLens icon and add your free Groq API key.');
    }

    // Check cache (ignore API key - same text yields same summary)
    const cached = getCached('ai', text);
    if (cached) return cached;

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            max_tokens: 300,
            temperature: 0.4,
            messages: [
                {
                    role: 'system',
                    content: 'You are a quiet, well-read reading companion. Give concise, plain-English explanations in 1-3 sentences. Be warm but brief. No bullet points, no headers. Just speak naturally.'
                },
                {
                    role: 'user',
                    content: `The user highlighted this text while reading a webpage:\n\n"${text}"\n\nWhat does this actually mean? What tone or intent does it carry?`
                }
            ]
        }),
    };

    const response = await fetchWithRetry('https://api.groq.com/openai/v1/chat/completions', options);

    if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Groq error (${response.status}): ${errBody}`);
    }
    const json = await response.json();

    // Groq uses OpenAI format: choices[0].message.content
    const reply = json.choices?.[0]?.message?.content || 'No response received.';
    const result = { summary: reply };

    // Cache successful results only
    setCache('ai', text, result);
    return result;
}

// Google Translate API - free open endpoint
async function translateText(text, targetLang = 'en') {
    // Check cache first - include target language in cache key
    const cacheKey = `${targetLang}:${text}`;
    const cached = getCached('tr', cacheKey);
    if (cached) return cached;

    // sl=auto (auto-detect source language), tl=targetLang
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetchWithRetry(url, {});
    if (!response.ok) {
        throw new Error('Translation network error');
    }
    const json = await response.json();

    // The Google Translate response is a nested array. The first element contains chunks of translated text.
    let translated = '';
    if (json && json[0]) {
        json[0].forEach(chunk => {
            if (chunk[0]) translated += chunk[0];
        });
    }

    // Extract detected source language from json[1][0][0] if available
    let detectedLang = null;
    if (json && json[1] && json[1][0] && json[1][0][0]) {
      detectedLang = json[1][0][0];
    }

    const result = { translation: translated, detectedLang };

    // Cache successful translations (key includes target language)
    setCache('tr', cacheKey, result);
    return result;
}

// Contextual definition using Groq
async function getContextDefinition(word, sentence, apiKey) {
    if (!apiKey) {
        throw new Error('No API key. Click the WordLens icon and add your free Groq API key.');
    }

    const cacheKey = `ctx:${word}:${sentence}`;
    const cached = getCached('ctx', cacheKey);
    if (cached) return cached;

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            max_tokens: 200,
            temperature: 0.3,
            messages: [
                {
                    role: 'system',
                    content: 'You are a precise reading companion. Explain word meanings in context. Be concise and accurate.'
                },
                {
                    role: 'user',
                    content: `The user selected the word '${word}' in this sentence: '${sentence}'. In 1-2 sentences, explain what '${word}' means specifically in this context. Do not give a generic dictionary definition.`
                }
            ]
        }),
    };

    const response = await fetchWithRetry('https://api.groq.com/openai/v1/chat/completions', options);

    if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Groq error (${response.status}): ${errBody}`);
    }
    const json = await response.json();
    const reply = json.choices?.[0]?.message?.content || 'No definition available.';
    const result = { definition: reply.trim() };

    setCache('ctx', cacheKey, result);
    return result;
}

// One-line etymology using Groq
async function getEtymology(word, apiKey) {
    if (!apiKey) {
        throw new Error('No API key.');
    }

    const cacheKey = `ety:${word}`;
    const cached = getCached('ety', cacheKey);
    if (cached) return cached;

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            max_tokens: 100,
            temperature: 0.4,
            messages: [
                {
                    role: 'system',
                    content: 'Give extremely concise etymologies. Always start with "From [language]..." and keep it to exactly one sentence.'
                },
                {
                    role: 'user',
                    content: `Give the etymology of the word '${word}' in exactly one sentence. Start with 'From [language]...'. Be concise.`
                }
            ]
        }),
    };

    const response = await fetchWithRetry('https://api.groq.com/openai/v1/chat/completions', options);

    if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Groq error (${response.status}): ${errBody}`);
    }
    const json = await response.json();
    const reply = json.choices?.[0]?.message?.content || 'Etymology not available.';
    const result = { etymology: reply.trim() };

    setCache('ety', cacheKey, result);
    return result;
}

// CEFR level using Groq
async function getCEFRLevel(word, apiKey) {
    if (!apiKey) {
        throw new Error('No API key.');
    }

    const cacheKey = `cefr:${word}`;
    const cached = getCached('cefr', cacheKey);
    if (cached) return cached;

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            max_tokens: 10,
            temperature: 0.1,
            messages: [
                {
                    role: 'system',
                    content: 'You are a language proficiency classifier. Respond with ONLY one of these tokens: A1, A2, B1, B2, C1, C2. No other text.'
                },
                {
                    role: 'user',
                    content: `What is the CEFR level of the word '${word}'? Reply with only one of: A1, A2, B1, B2, C1, C2.`
                }
            ]
        }),
    };

    const response = await fetchWithRetry('https://api.groq.com/openai/v1/chat/completions', options);

    if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Groq error (${response.status}): ${errBody}`);
    }
    const json = await response.json();
    const reply = json.choices?.[0]?.message?.content?.trim() || 'B1';
    // Validate it's one of the expected values
    const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const level = validLevels.includes(reply) ? reply : 'B1';
    const result = { level };

    setCache('cefr', cacheKey, result);
    return result;
}

// Vocabulary vault operations
async function saveToVault(entry) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['savedWords'], (result) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
                return;
            }
            const words = result.savedWords || [];

            // Avoid duplicates based on exact word + context
            const existsIndex = words.findIndex(w =>
                w.word.toLowerCase() === entry.word.toLowerCase() &&
                w.contextSentence === entry.contextSentence
            );

            if (existsIndex === -1) {
                words.unshift(entry); // Add to beginning for most recent first
                chrome.storage.local.set({ savedWords: words }, () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                        return;
                    }
                    resolve();
                });
            } else {
                // Already saved, move to top to mark as recent
                const existing = words.splice(existsIndex, 1)[0];
                words.unshift(existing);
                chrome.storage.local.set({ savedWords: words }, () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                        return;
                    }
                    resolve();
                });
            }
        });
    });
}

async function getVault() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['savedWords'], (result) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
                return;
            }
            resolve(result.savedWords || []);
        });
    });
}

async function clearVault() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({ savedWords: [] }, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
                return;
            }
            resolve();
        });
    });
}
