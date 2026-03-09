// Listen for messages from content.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    // We check the "type" field to know what kind of request this is
    if (message.type === 'LOOKUP_WORD') {
        // Call the free dictionary API
        lookupWord(message.word)
            .then(data => sendResponse({ success: true, data }))
            .catch(err => sendResponse({ success: false, error: err.message }));

        // IMPORTANT: returning true tells Chrome "I will call sendResponse later (asynchronously)"
        // Without this, Chrome closes the message channel immediately and our response never arrives.
        return true;
    }

    if (message.type === 'SUMMARIZE_SENTENCE') {
        summarizeSentence(message.text, message.apiKey)
            .then(data => sendResponse({ success: true, data }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }

});


async function lookupWord(word) {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;

    const response = await fetch(url);

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

    return {
        word: entry.word,
        phonetic,
        audio,
        meanings,
    };
}


// Groq API - free, blazing fast AI
async function summarizeSentence(text, apiKey) {
    if (!apiKey) {
        throw new Error('No API key. Click the WordLens icon and add your free Groq API key.');
    }
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
    });
    if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`Groq error (${response.status}): ${errBody}`);
    }
    const json = await response.json();

    // Groq uses OpenAI format: choices[0].message.content
    const reply = json.choices?.[0]?.message?.content || 'No response received.';
    return { summary: reply };
}
