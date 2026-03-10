import React, { useState, useEffect } from 'react';
import { BookMarked, Trash2, Key, Check } from 'lucide-react';

function Options() {
    const [savedWords, setSavedWords] = useState([]);
    const [apiKey, setApiKey] = useState('');
    const [saveStatus, setSaveStatus] = useState('');

    // Load initial data from Chrome Storage
    useEffect(() => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get(['savedWords', 'groqApiKey'], (result) => {
                if (result.savedWords) {
                    // Sort newest first
                    setSavedWords(result.savedWords.sort((a, b) => b.date - a.date));
                }
                if (result.groqApiKey) {
                    setApiKey(result.groqApiKey);
                }
            });
        }
    }, []);

    const handleSaveKey = () => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ groqApiKey: apiKey }, () => {
                setSaveStatus('Saved!');
                setTimeout(() => setSaveStatus(''), 2500);
            });
        }
    };

    const handleDeleteWord = (dateId) => {
        const newWords = savedWords.filter(w => w.date !== dateId);
        setSavedWords(newWords);
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ savedWords: newWords });
        }
    };

    return (
        <div className="min-h-screen bg-[#F7F5F0] text-[#171717] font-['DM_Sans'] p-8 md:p-12">
            <div className="max-w-4xl mx-auto">

                {/* Header */}
                <div className="flex items-center gap-3 mb-10">
                    <BookMarked size={32} className="text-[#14532d]" />
                    <h1 className="text-3xl font-bold font-['Inter']">WordLens Dashboard</h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Main Saved Words Column */}
                    <div className="lg:col-span-2 space-y-6">
                        <h2 className="text-xl font-semibold border-b border-[#E5E5E5] pb-2">Your Saved Dictionary</h2>

                        {savedWords.length === 0 ? (
                            <div className="bg-white rounded-xl p-8 text-center text-[#A3A3A3] border border-[#E5E5E5]">
                                <p>No words saved yet.</p>
                                <p className="text-sm mt-2">Highlight words on any webpage and click the ⭐ icon to save them here.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {savedWords.map((item) => (
                                    <div key={item.date} className="bg-white rounded-xl p-5 border border-[#E5E5E5] shadow-sm hover:shadow-md transition-shadow relative group">
                                        <button
                                            onClick={() => handleDeleteWord(item.date)}
                                            className="absolute top-4 right-4 text-[#A3A3A3] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Remove word"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                        <h3 className="text-lg font-bold font-['Inter'] text-[#14532d] mb-2">{item.word}</h3>
                                        <p className="text-[15px] leading-relaxed text-[#333]">{item.meaning}</p>
                                        <span className="text-xs text-[#A3A3A3] mt-3 block">
                                            {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Sidebar (Settings) */}
                    <div className="space-y-6 lg:pl-4">
                        <h2 className="text-xl font-semibold border-b border-[#E5E5E5] pb-2">Settings</h2>

                        <div className="bg-white rounded-xl p-5 border border-[#E5E5E5] shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <Key size={18} className="text-[#14532d]" />
                                <h3 className="font-semibold text-lg font-['Inter']">Groq API Key</h3>
                            </div>
                            <p className="text-sm text-[#737373] mb-4">
                                Enter your free Groq API key to enable AI summaries for complex sentences.
                            </p>
                            <div className="space-y-3">
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="gsk_..."
                                    className="w-full bg-[#F7F5F0] border border-[#E5E5E5] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#4ade80] focus:ring-1 focus:ring-[#4ade80]"
                                />
                                <button
                                    onClick={handleSaveKey}
                                    className="w-full bg-[#171717] hover:bg-[#333] text-[#FAFAFA] font-medium py-2 rounded-md transition-colors flex items-center justify-center gap-2"
                                >
                                    {saveStatus === 'Saved!' ? <><Check size={16} /> Saved</> : 'Save Key'}
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default Options;
