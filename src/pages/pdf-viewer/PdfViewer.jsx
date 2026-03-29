import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

import { getLibrary, saveLibraryEntry, deleteLibraryEntry } from '../../services/pdfStorage';
import { getBlob, saveBlob, deleteBlob } from '../../utils/blobStorage';
import { createLibraryEntry } from '../../types/pdfTypes';
import { generateThumbnail } from '../../utils/pdfThumbnail';

import LibraryView from './LibraryView';

export default function PdfViewer() {
  const [viewMode, setViewMode] = useState('library');
  const [library, setLibrary] = useState({});
  const [currentEntry, setCurrentEntry] = useState(null);
  const [file, setFile] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);

  // PDF Theme: 'dark' | 'yellow' | 'light' (only affects PDF color, not UI)
  const [pdfTheme, setPdfTheme] = useState('dark');

  const [apiKey, setApiKey] = useState('');
  const [isApiKeyMissing, setIsApiKeyMissing] = useState(true);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('activity');
  const [commentInput, setCommentInput] = useState('');

  const pdfContainerRef = useRef(null);
  const chatEndRef = useRef(null);

  // Ensure dark mode for UI (always dark)
  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('yellow', 'light');
  }, []);

  // PDF theme initialization
  useEffect(() => {
    const savedPdfTheme = localStorage.getItem('wordlens-pdf-theme') || 'dark';
    setPdfTheme(savedPdfTheme);
  }, []);

  const cyclePdfTheme = useCallback(() => {
    const themes = ['dark', 'yellow', 'light'];
    const currentIndex = themes.indexOf(pdfTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    setPdfTheme(nextTheme);
    localStorage.setItem('wordlens-pdf-theme', nextTheme);
  }, [pdfTheme]);

  const getThemeIcon = () => {
    switch (pdfTheme) {
      case 'dark':
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        );
      case 'yellow':
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          </svg>
        );
      case 'light':
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        );
    }
  };

  const getPdfFilter = useCallback(() => {
    switch (pdfTheme) {
      case 'dark':
        return 'invert(1) hue-rotate(180deg) sepia(0.2) contrast(1.1) brightness(0.9)';
      case 'yellow':
        return 'sepia(0.8) saturate(1.2) brightness(1.1) contrast(0.9)';
      case 'light':
        return 'none';
      default:
        return 'invert(1) hue-rotate(180deg) sepia(0.2)';
    }
  }, [pdfTheme]);

  const getThemeTitle = useCallback(() => {
    switch (pdfTheme) {
      case 'dark': return 'Dark Mode';
      case 'yellow': return 'Yellow Mode';
      case 'light': return 'Light Mode';
      default: return 'Theme';
    }
  }, [pdfTheme]);

  useEffect(() => {
    if (viewMode !== 'pdf' || !numPages) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const pg = Number(entry.target.getAttribute('data-page-number'));
          if (pg && pg !== currentPage) {
            setCurrentPage(pg);
          }
        }
      });
    }, { threshold: 0.5 });

    const pageElements = document.querySelectorAll('.react-pdf__Page');
    pageElements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [numPages, scale, viewMode, currentPage]);

  useEffect(() => {
    (async () => {
      try {
        const lib = await getLibrary();
        setLibrary(lib);

        chrome.storage.local.get(['groqApiKey'], (result) => {
          if (result.groqApiKey) {
            setApiKey(result.groqApiKey);
            setIsApiKeyMissing(false);
          } else {
            setIsApiKeyMissing(true);
          }
        });
      } catch (err) {
        console.error('Failed to load library:', err);
      }
    })();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleFileSelect = async (file) => {
    setPdfError(null); // Clear any previous errors
    let lib = await getLibrary();
    let entry = Object.values(lib).find(
      e => e.fileName === file.name && e.fileSize === file.size
    );

    if (entry) {
      handleOpenPdf(entry, file);
      return;
    }

    let entries = Object.values(lib);
    if (entries.length >= 15) {
      entries.sort((a, b) => {
        const timeA = Math.max(a.readingProgress?.lastOpened || 0, a.addedAt || 0);
        const timeB = Math.max(b.readingProgress?.lastOpened || 0, b.addedAt || 0);
        return timeB - timeA;
      });
      const toDelete = entries.slice(14);
      for (const evict of toDelete) {
        await deleteLibraryEntry(evict.id);
        if (evict.fileBlobKey) {
          await deleteBlob(evict.fileBlobKey);
        }
      }
    }

    const rawTitle = file.name.replace(/\.[^/.]+$/, '').trim();
    const searchTitle = rawTitle.replace(/[-_\[\]()]/g, ' ').replace(/\s+/g, ' ').trim();

    let finalThumbnail = null;

    if (searchTitle.length > 2) {
      try {
        const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(searchTitle)}&limit=1`);
        if (res.ok) {
          const data = await res.json();
          if (data.docs && data.docs.length > 0) {
            const book = data.docs[0];
            if (book.cover_i) {
              finalThumbnail = `https://covers.openlibrary.org/b/id/${book.cover_i}-S.jpg`;
            }
          }
        }
      } catch (e) {
        console.warn('Cover fetch failed', e);
      }
    }

    if (!finalThumbnail) {
      finalThumbnail = await generateThumbnail(file);
    }

    const newEntry = createLibraryEntry(file);
    newEntry.coverThumbnail = finalThumbnail;
    newEntry.totalPages = 0;
    newEntry.metadata.title = rawTitle;

    const blob = file.slice(0, file.size);
    const key = `pdf_blob_${newEntry.id}`;
    await saveBlob(key, blob);
    newEntry.fileBlobKey = key;

    await saveLibraryEntry(newEntry);
    setLibrary(prev => ({ ...prev, [newEntry.id]: newEntry }));
    handleOpenPdf(newEntry, file);
  };

  async function handleOpenPdf(entry, providedFile = null) {
    setIsPdfLoading(true);
    setPdfError(null);

    const openPdf = (f) => {
      setCurrentEntry(entry);
      setFile(f);
      setCurrentPage(entry.readingProgress?.lastPage || 1);
      setViewMode('pdf');
      setIsPdfLoading(false);

      if (entry.chatHistory) {
        setChatMessages(entry.chatHistory);
      } else {
        setChatMessages([{ role: 'assistant', content: 'Hi! I can help you understand this document.' }]);
      }
    };

    try {
      if (providedFile) {
        openPdf(providedFile);
        return;
      }

      if (entry.fileBlobKey) {
        const blob = await getBlob(entry.fileBlobKey);
        if (blob) {
          openPdf(new File([blob], entry.fileName, { type: 'application/pdf' }));
        } else {
          throw new Error('PDF file not found in storage');
        }
      }
    } catch (err) {
      setIsPdfLoading(false);
      setPdfError(err.message || 'Failed to load PDF');
    }
  }

  const handleAddComment = async () => {
    if (!commentInput.trim() || !currentEntry) return;
    const newComment = {
      id: Date.now().toString(),
      text: commentInput.trim(),
      page: currentPage,
      timestamp: Date.now()
    };

    const updated = {
      ...currentEntry,
      comments: [...(currentEntry.comments || []), newComment]
    };

    await saveLibraryEntry(updated);
    setLibrary(prev => ({ ...prev, [updated.id]: updated }));
    setCurrentEntry(updated);
    setCommentInput('');
  };

  const handleRemoveComment = async (commentId) => {
    if (!currentEntry) return;
    const updated = {
      ...currentEntry,
      comments: (currentEntry.comments || []).filter(c => c.id !== commentId)
    };
    await saveLibraryEntry(updated);
    setLibrary(prev => ({ ...prev, [updated.id]: updated }));
    setCurrentEntry(updated);
  };

  const handleClosePdf = () => {
    setViewMode('library');
    setFile(null);
    setCurrentEntry(null);
    setChatMessages([]);
  };

  const goToPrevPage = () => {
    const el = document.getElementById(`pdf-page-${currentPage - 1}`);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const goToNextPage = () => {
    const el = document.getElementById(`pdf-page-${currentPage + 1}`);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    if (currentPage > 1) {
      setTimeout(() => {
        const el = document.getElementById(`pdf-page-${currentPage}`);
        if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
      }, 100);
    }
  };

  const handleWheel = (e) => {
    if (e.shiftKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        setScale(s => Math.min(2.5, s + 0.1));
      } else {
        setScale(s => Math.max(0.5, s - 0.1));
      }
    }
  };

  const saveApiKey = () => {
    if (apiKeyInput.trim()) {
      chrome.storage.local.set({ groqApiKey: apiKeyInput.trim() }, () => {
        setApiKey(apiKeyInput.trim());
        setIsApiKeyMissing(false);
      });
    }
  };

  const extractPageText = async () => {
    try {
      const activePage = document.querySelector(`.react-pdf__Page[data-page-number="${currentPage}"]`);
      if (!activePage) return '';
      const textLayer = activePage.querySelector('.react-pdf__Page__textContent');
      if (!textLayer) return '';
      return textLayer.innerText || textLayer.textContent || '';
    } catch (e) {
      console.error(e);
      return '';
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || isApiKeyMissing || isChatLoading) return;

    const userMsg = { role: 'user', content: chatInput.trim() };
    const newChat = [...chatMessages, userMsg];
    setChatMessages(newChat);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const pageText = await extractPageText();
      const systemPrompt = `You are a helpful assistant. The user is asking about this document:\n\n---\n${pageText || 'No text extracted'}\n---\n\nBe concise and helpful.`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            ...newChat.slice(-6)
          ],
          max_tokens: 500
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message || 'API request failed');
      }

      if (data.choices && data.choices[0]) {
        const assistantMsg = data.choices[0].message;
        const updatedChat = [...newChat, assistantMsg];
        setChatMessages(updatedChat);

        if (currentEntry) {
          const updatedEntry = { ...currentEntry, chatHistory: updatedChat };
          setCurrentEntry(updatedEntry);
          saveLibraryEntry(updatedEntry);
        }
      }
    } catch (err) {
      console.error("Chat API Error:", err);
      setChatMessages([...newChat, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  if (viewMode === 'library') {
    return <LibraryView onOpenPdf={handleOpenPdf} onFileSelect={handleFileSelect} />;
  }

  return (
    <div className="h-screen overflow-hidden bg-bg text-text font-sans flex">
      {/* PDF Viewer - Takes 100% width when sidebar closed */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Minimal Toolbar */}
        <div className="sticky top-0 z-20 bg-bg/95 backdrop-blur border-b border-border px-3 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleClosePdf}
              className="h-7 px-2.5 text-xs font-medium bg-surface border border-border rounded hover:bg-accent/10 hover:border-accent/50 transition-colors flex items-center gap-1"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5"></path>
                <path d="M12 19l-7-7 7-7"></path>
              </svg>
              Back
            </button>

            <span className="text-xs text-muted truncate max-w-[200px]" title={currentEntry?.fileName}>
              {currentEntry?.fileName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={cyclePdfTheme}
              className="h-7 w-7 flex items-center justify-center bg-surface border border-border rounded hover:bg-accent/10 transition-colors text-accent"
              title={getThemeTitle()}
            >
              {getThemeIcon()}
            </button>

            {/* Zoom controls */}
            <div className="flex items-center gap-1 bg-surface border border-border rounded">
              <button
                onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
                className="h-6 w-6 flex items-center justify-center text-muted hover:text-text hover:bg-surface/80"
                title="Zoom out"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
              <span className="text-xs font-mono px-2 text-text/70 min-w-[45px] text-center">{Math.round(scale * 100)}%</span>
              <button
                onClick={() => setScale(s => Math.min(3, s + 0.1))}
                className="h-6 w-6 flex items-center justify-center text-muted hover:text-text hover:bg-surface/80"
                title="Zoom in"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>
            </div>

            {/* Page info */}
            {numPages && (
              <div className="flex items-center gap-1 text-xs text-muted">
                <button
                  onClick={goToPrevPage}
                  disabled={currentPage <= 1}
                  className="h-6 px-2 bg-surface border border-border rounded hover:bg-accent/10 disabled:opacity-30 flex items-center"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>
                <span className="min-w-[60px] text-center">
                  {currentPage} / {numPages}
                </span>
                <button
                  onClick={goToNextPage}
                  disabled={currentPage >= numPages}
                  className="h-6 px-2 bg-surface border border-border rounded hover:bg-accent/10 disabled:opacity-30 flex items-center"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* PDF Content - Maximize space */}
        <div
          ref={pdfContainerRef}
          className="flex-1 overflow-y-auto custom-scrollbar flex justify-center py-8 px-4 relative"
          onWheel={handleWheel}
        >
          {/* Full overlay loader when opening PDF */}
          {isPdfLoading && !file && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg/80 backdrop-blur-sm z-10">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-3 border-accent/20"></div>
                <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-3 border-transparent border-t-accent animate-spin"></div>
              </div>
              <p className="text-sm text-text/70 mt-4 font-medium">Opening PDF...</p>
            </div>
          )}

          {pdfError && (
            <div className="flex flex-col items-center justify-center h-full w-full max-w-2xl mx-auto">
              <div className="glass-card glass-card-enhanced p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20 mx-auto">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text mb-1">Unable to Access PDF</h3>
                  <p className="text-sm text-muted leading-relaxed mb-3">
                    {pdfError}
                  </p>
                  <div className="bg-surface/50 border border-border/50 rounded-xl p-3 text-left">
                    <p className="text-xs font-semibold text-text mb-2">To fix this issue:</p>
                    <ol className="text-xs text-muted space-y-1 list-decimal list-inside">
                      <li>Go to <code className="bg-surface border border-border px-1 rounded text-accent">chrome://extensions</code></li>
                      <li>Find WordLens extension</li>
                      <li>Enable <strong className="text-text">"Allow access to file URLs"</strong></li>
                      <li>Refresh this page</li>
                    </ol>
                  </div>
                </div>
                <button
                  onClick={handleClosePdf}
                  className="px-4 py-2 text-sm bg-accent hover:bg-accent/90 text-bg rounded-lg transition-colors"
                >
                  Back to Library
                </button>
              </div>
            </div>
          )}

          {file && !pdfError && (
            <div style={{ filter: getPdfFilter() }} className="flex flex-col items-center gap-6">
              <Document
                file={file}
                onLoadSuccess={handleDocumentLoadSuccess}
                onError={(error) => {
                  console.error('PDF load error:', error);
                  setPdfError(error.message || 'Failed to load PDF');
                }}
                loading={
                  <div className="flex flex-col items-center justify-center h-96 w-full">
                    <div className="relative">
                      {/* Outer ring */}
                      <div className="w-12 h-12 rounded-full border-2 border-accent/20"></div>
                      {/* Spinning arc */}
                      <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-2 border-transparent border-t-accent animate-spin"></div>
                    </div>
                    <p className="text-xs text-muted mt-3 font-medium">Loading PDF...</p>
                  </div>
                }
                className="flex flex-col items-center gap-6"
              >
                {Array.from(new Array(numPages || 0), (el, index) => (
                  <div
                    key={`page_${index + 1}`}
                    id={`pdf-page-${index + 1}`}
                    data-page-number={index + 1}
                    className="bg-surface border border-border shadow-sm"
                  >
                    <Page
                      pageNumber={index + 1}
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      className="max-w-full"
                      scale={scale}
                    />
                  </div>
                ))}
              </Document>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar - Collapsible assistant */}
      <div className="w-[320px] border-l border-border flex flex-col bg-surface/20">
        {/* Header */}
        <div className="p-3 border-b border-border flex items-center justify-between">
          <h2 className="text-xs font-semibold text-text">Assistant</h2>
          <button
            onClick={handleClosePdf}
            className="h-5 w-5 flex items-center justify-center text-muted hover:text-red-500"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-3 pt-3 gap-3 text-xs border-b border-border">
          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-2 transition-colors ${
              activeTab === 'activity'
                ? 'text-accent border-b border-accent'
                : 'text-muted hover:text-text'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`pb-2 transition-colors ${
              activeTab === 'comments'
                ? 'text-accent border-b border-accent'
                : 'text-muted hover:text-text'
            }`}
          >
            Comments
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`pb-2 transition-colors ${
              activeTab === 'info'
                ? 'text-accent border-b border-accent'
                : 'text-muted hover:text-text'
            }`}
          >
            Info
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 p-3 min-h-0">
          {activeTab === 'info' ? (
            <div className="space-y-3 text-xs">
              <div>
                <div className="text-muted mb-1">File</div>
                <div className="text-text font-medium truncate">{currentEntry?.fileName || 'Unknown'}</div>
              </div>
              <div>
                <div className="text-muted mb-1">Pages</div>
                <div className="text-text font-bold">{numPages || '-'}</div>
              </div>
              <div>
                <div className="text-muted mb-1">Added</div>
                <div className="text-text">
                  {currentEntry?.addedAt ? new Date(currentEntry.addedAt).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            </div>
          ) : activeTab === 'comments' ? (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar mb-2">
                {(!currentEntry?.comments || currentEntry.comments.length === 0) ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center text-muted text-xs py-8">No comments</div>
                  </div>
                ) : (
                  currentEntry.comments.map(c => (
                    <div key={c.id} className="bg-surface border border-border rounded p-2 text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <button
                          onClick={() => {
                            const el = document.getElementById(`pdf-page-${c.page}`);
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="text-accent hover:underline text-[10px]"
                        >
                          Page {c.page}
                        </button>
                        <button onClick={() => handleRemoveComment(c.id)} className="text-muted hover:text-red-500 text-[10px]">
                          ×
                        </button>
                      </div>
                      <p className="text-text/80">{c.text}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="pt-2 border-t border-border shrink-0">
                <div className="flex gap-1">
                  <textarea
                    placeholder="Add comment..."
                    className="flex-1 h-10 p-2 text-xs bg-surface border border-border rounded resize-none outline-none focus:border-accent text-text placeholder-muted"
                    value={commentInput}
                    onChange={e => setCommentInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
                  />
                  <button
                    onClick={handleAddComment}
                    className="h-10 px-3 bg-accent hover:bg-accent/90 text-bg rounded transition-colors flex items-center"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ) : isApiKeyMissing ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="glass-card glass-card-enhanced p-8 max-w-sm w-full space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center text-accent border border-accent/20 mx-auto">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-text mb-1">Unlock AI-Powered Reading</h3>
                  <p className="text-xs text-muted leading-relaxed">
                    Get instant definitions, summaries, and answers to your questions about this document.
                  </p>
                </div>

                <div className="bg-surface/50 border border-border/50 rounded-xl p-3 text-left">
                  <p className="text-xs font-semibold text-text mb-2">How to get your free API key:</p>
                  <ol className="text-xs text-muted space-y-1.5 list-decimal list-inside">
                    <li>Go to <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">console.groq.com/keys</a></li>
                    <li>Sign up or log in (free)</li>
                    <li>Click "Create API Key"</li>
                    <li>Copy and paste it below</li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <input
                    type="password"
                    placeholder="gsk_..."
                    value={apiKeyInput}
                    onChange={e => setApiKeyInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        saveApiKey();
                      }
                    }}
                    className="w-full h-10 px-3 text-sm rounded-xl bg-surface border border-border outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all font-mono text-text placeholder-muted"
                  />
                  <button
                    onClick={saveApiKey}
                    disabled={!apiKeyInput.trim()}
                    className="w-full h-9 text-sm bg-accent hover:bg-accent/90 text-bg font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Connect API Key
                  </button>
                </div>

                {saveStatus && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`text-xs font-medium px-3 py-2 rounded-lg ${
                      saveStatus === 'Saved!'
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}
                  >
                    {saveStatus === 'Saved!' ? (
                      <span className="flex items-center justify-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        API key saved successfully!
                      </span>
                    ) : saveStatus}
                  </motion.div>
                )}
              </div>

              <p className="text-xs text-muted mt-4 max-w-xs">
                Your API key is stored locally and never sent to any server except Groq.
              </p>
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1 mb-2">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex gap-2 text-xs ${msg.role === 'assistant' ? 'text-text' : 'text-text/80'}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      msg.role === 'assistant'
                        ? 'bg-accent/10 text-accent border border-accent/20'
                        : 'bg-surface border border-border text-muted'
                    }`}>
                      {msg.role === 'assistant' ? 'AI' : 'U'}
                    </div>
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <span className="font-medium">{msg.role === 'assistant' ? 'Assistant' : 'You'}</span>
                      <p className="leading-relaxed break-words">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex gap-2 text-xs">
                    <div className="w-5 h-5 rounded-full bg-accent/10 text-accent border border-accent/20 flex items-center justify-center text-[10px] font-bold">AI</div>
                    <div className="flex flex-col gap-1 flex-1">
                      <div className="h-2 rounded w-1/3 bg-surface border border-border" />
                      <div className="h-2 rounded w-2/3 bg-surface border border-border" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="pt-2 border-t border-border shrink-0">
                <div className="flex gap-1">
                  <textarea
                    placeholder="Ask..."
                    className="flex-1 h-10 p-2 text-xs bg-surface border border-border rounded resize-none outline-none focus:border-accent text-text placeholder-muted"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendChatMessage();
                      }
                    }}
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={isChatLoading}
                    className="h-10 px-3 bg-accent hover:bg-accent/90 text-bg rounded transition-colors disabled:opacity-50 flex items-center"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
