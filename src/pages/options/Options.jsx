import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookMarked, Trash2, Key, Check, Settings, Shield, Palette, Zap } from 'lucide-react';

function Options() {
    const [savedWords, setSavedWords] = useState([]);
    const [apiKey, setApiKey] = useState('');
    const [maxSelectionLength, setMaxSelectionLength] = useState(500);
    const [saveStatus, setSaveStatus] = useState('');
    const [settingsStatus, setSettingsStatus] = useState('');

    // Load initial data from Chrome Storage
    useEffect(() => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get(['savedWords', 'groqApiKey', 'maxSelectionLength'], (result) => {
                if (result.savedWords) {
                    setSavedWords(result.savedWords.sort((a, b) => b.date - a.date));
                }
                if (result.groqApiKey) {
                    setApiKey(result.groqApiKey);
                }
                if (result.maxSelectionLength) {
                    setMaxSelectionLength(result.maxSelectionLength);
                }
            });
        }
    }, []);

    // Ensure dark theme is active
    useEffect(() => {
        document.documentElement.classList.add('dark');
    }, []);

    const handleSaveKey = () => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.set({ groqApiKey: apiKey }, () => {
                setSaveStatus('Saved!');
                setTimeout(() => setSaveStatus(''), 2500);
            });
        }
    };

    const handleSaveSettings = () => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            const maxLen = parseInt(maxSelectionLength, 10);
            if (isNaN(maxLen) || maxLen < 1 || maxLen > 2000) {
                setSettingsStatus('Please enter a number between 1 and 2000');
                return;
            }
            chrome.storage.local.set({ maxSelectionLength: maxLen }, () => {
                setSettingsStatus('Saved!');
                setTimeout(() => setSettingsStatus(''), 2500);
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

    const handleClearAllWords = () => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            if (window.confirm('Are you sure you want to delete all saved words? This cannot be undone.')) {
                setSavedWords([]);
                chrome.storage.local.set({ savedWords: [] });
            }
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="min-h-screen bg-bg text-text font-sans p-8 md:p-12 relative overflow-hidden"
        >
            {/* Ambient background orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="ambient-orb w-96 h-96 bg-green-300 top-0 left-0" style={{ animationDelay: '0s' }}></div>
                <div className="ambient-orb w-80 h-80 bg-blue-300 top-1/3 right-0" style={{ animationDelay: '10s' }}></div>
            </div>

            <div className="relative z-10 max-w-6xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center gap-4 mb-12"
                >
                    <div className="w-16 h-16 rounded-2xl bg-accent-light/30 flex items-center justify-center text-accent border border-accent/30">
                        <BookMarked size={32} strokeWidth={1.5} />
                    </div>
                    <div>
                        <h1 className="text-4xl md:text-5xl font-medium text-text tracking-tight">
                            WordLens Dashboard
                        </h1>
                        <p className="text-lg text-muted mt-1">Manage your settings and saved words</p>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Main Saved Words Column */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="lg:col-span-2 space-y-6"
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-medium text-text border-b border-border pb-3">
                                Your Saved Dictionary
                            </h2>
                            {savedWords.length > 0 && (
                                <span className="glass-card px-3 py-1 text-sm font-semibold text-accent">
                                    {savedWords.length} word{savedWords.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>

                        {savedWords.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="glass-card p-12 text-center flex flex-col items-center gap-4"
                            >
                                <div className="text-6xl opacity-40">📚</div>
                                <div>
                                    <p className="text-xl font-medium text-text mb-2">No words saved yet</p>
                                    <p className="text-muted">Highlight words on any webpage and click the ⭐ icon to save them here.</p>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                <AnimatePresence>
                                    {savedWords.map((item, idx) => (
                                        <motion.div
                                            key={item.date}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, x: -100 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="glass-card glass-card-enhanced p-6 relative group hover:scale-[1.02] transition-all"
                                        >
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => handleDeleteWord(item.date)}
                                                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-surface border border-border text-muted hover:text-red-500 hover:border-red-500/50 opacity-0 group-hover:opacity-100 transition-all"
                                                title="Remove word"
                                            >
                                                <Trash2 size={14} />
                                            </motion.button>

                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-accent-light/20 flex items-center justify-center text-accent shrink-0 border border-accent/20">
                                                    <BookMarked size={20} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-xl font-bold text-text mb-2 truncate" title={item.word}>
                                                        {item.word}
                                                    </h3>
                                                    <p className="text-base leading-relaxed text-text/80">{item.meaning}</p>
                                                    <div className="flex items-center gap-2 mt-3">
                                                        <span className="text-xs font-medium text-muted bg-surface/50 px-2.5 py-1 rounded-full">
                                                            {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </motion.div>

                    {/* Sidebar (Settings) */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="space-y-6 lg:pl-4"
                    >
                        {/* API Key Settings */}
                        <div className="glass-card glass-card-enhanced p-6 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-accent-light/20 flex items-center justify-center text-accent border border-accent/20">
                                    <Key size={20} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg text-text">Groq API Key</h3>
                                    <p className="text-xs text-muted">Enable AI summaries</p>
                                </div>
                            </div>

                            <p className="text-sm text-muted leading-relaxed">
                                Enter your free Groq API key to enable AI summaries for complex sentences and document analysis.
                            </p>

                            <div className="space-y-3">
                                <input
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="gsk_..."
                                    className="w-full bg-surface/50 border border-border rounded-xl px-4 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all font-mono text-text placeholder-muted"
                                />
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleSaveKey}
                                    className="w-full glass-btn px-4 py-3 text-base font-semibold flex items-center justify-center gap-2 shimmer"
                                >
                                    {saveStatus === 'Saved!' ? (
                                        <>
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: "spring", stiffness: 500 }}
                                            >
                                                <Check size={18} />
                                            </motion.div>
                                            Saved
                                        </>
                                    ) : (
                                        'Save Key'
                                    )}
                                </motion.button>
                            </div>
                        </div>

                        {/* Advanced Settings */}
                        <div className="glass-card glass-card-enhanced p-6 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-accent-light/20 flex items-center justify-center text-accent border border-accent/20">
                                    <Settings size={20} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg text-text">Advanced Settings</h3>
                                    <p className="text-xs text-muted">Customize behavior</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-semibold text-text mb-2">
                                        <Zap size={14} className="text-accent" />
                                        Max Selection Length
                                    </label>
                                    <input
                                        type="number"
                                        value={maxSelectionLength}
                                        onChange={(e) => setMaxSelectionLength(e.target.value)}
                                        min="1"
                                        max="2000"
                                        className="w-full bg-surface/50 border border-border rounded-xl px-4 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all font-mono text-text"
                                    />
                                    <p className="text-xs text-muted mt-2 leading-relaxed">
                                        Maximum text length for AI summaries and translation (default: 500 characters)
                                    </p>
                                </div>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleSaveSettings}
                                    className="w-full glass-btn px-4 py-3 text-base font-semibold flex items-center justify-center gap-2"
                                >
                                    {settingsStatus === 'Saved!' ? (
                                        <>
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: "spring", stiffness: 500 }}
                                            >
                                                <Check size={18} />
                                            </motion.div>
                                            Settings Saved
                                        </>
                                    ) : (
                                        'Save Settings'
                                    )}
                                </motion.button>
                                {settingsStatus && settingsStatus !== 'Saved!' && (
                                    <p className="text-xs text-center text-red-400">{settingsStatus}</p>
                                )}
                            </div>
                        </div>

                        {/* Danger Zone */}
                        <div className="glass-card glass-card-enhanced p-6 border-red-500/30 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                                    <Shield size={20} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg text-red-400">Danger Zone</h3>
                                    <p className="text-xs text-muted">Irreversible actions</p>
                                </div>
                            </div>

                            <p className="text-sm text-muted leading-relaxed">
                                Permanently delete all saved words from your library.
                            </p>
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleClearAllWords}
                                className="w-full px-4 py-3 text-base font-semibold rounded-xl border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-400 transition-all flex items-center justify-center gap-2"
                            >
                                <Trash2 size={16} />
                                Clear All Saved Words
                            </motion.button>
                        </div>
                    </motion.div>
                </div>

                {/* Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-12 pt-8 border-t border-border text-center"
                >
                    <p className="text-sm text-muted mb-2">
                        WordLens Extension v2.0.0
                    </p>
                    <p className="text-xs text-muted/60">
                        Built with ❤️ and Liquid Glass UI
                    </p>
                </motion.div>
            </div>
        </motion.div>
    );
}

export default Options;
