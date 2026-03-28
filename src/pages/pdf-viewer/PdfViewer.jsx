import { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Worker setup
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

// Services & Utils
import { getLibrary, saveLibraryEntry, deleteLibraryEntry } from '../../services/pdfStorage';
import { createLibraryEntry } from '../../types/pdfTypes';
import { saveBlob, getBlob, deleteBlob } from '../../utils/blobStorage';
import { generateThumbnail } from '../../utils/pdfThumbnail';

// Components
import LibraryView from './LibraryView';

export default function PdfViewer() {
  const [viewMode, setViewMode] = useState('library');
  const [library, setLibrary] = useState({});
  const [currentEntry, setCurrentEntry] = useState(null);
  const [file, setFile] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');

  // Chat / API state
  const [apiKey, setApiKey] = useState('');
  const [isApiKeyMissing, setIsApiKeyMissing] = useState(true);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [pdfText, setPdfText] = useState(''); // Text of current page for context

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('activity'); // 'activity' | 'info'
  const [scale, setScale] = useState(1.2);

  // Refs
  const pdfContainerRef = useRef(null);
  const chatEndRef = useRef(null);

  // Track active page based on scroll position
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

  // Load Library & Check API Key
  useEffect(() => {
    (async () => {
      try {
        const lib = await getLibrary();
        setLibrary(lib);
        
        // Check API key
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

  // Sync page input
  useEffect(() => {
    setPageInput(currentPage.toString());
  }, [currentPage]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  function handleFileSelect(file) {
    (async () => {
      let lib = await getLibrary();
      let entry = Object.values(lib).find(
        e => e.fileName === file.name && e.fileSize === file.size
      );

      if (entry) {
        handleOpenPdf(entry, file);
      } else {
        // Limit to 15 PDFs
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

        // Clean filename for better search results
        const rawTitle = file.name.replace(/\.[^/.]+$/, '').trim();
        const searchTitle = rawTitle.replace(/[-_\[\]()0-9]/g, ' ').replace(/\s+/g, ' ').trim();
        
        let finalThumbnail = null;
        let finalTitle = rawTitle;

        if (searchTitle.length > 2) {
          try {
            // Attempt to fetch metadata and cover from Open Library API
            const res = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(searchTitle)}&limit=1`);
            if (res.ok) {
              const data = await res.json();
              if (data.docs && data.docs.length > 0) {
                const book = data.docs[0];
                if (book.cover_i) {
                  finalThumbnail = `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`;
                }
                if (book.title) {
                  finalTitle = book.title;
                }
              }
            }
          } catch (e) {
            console.warn('Cover fetch failed', e);
          }
        }

        // If no cover acquired via API, extract first page of PDF and use as thumbnail
        if (!finalThumbnail) {
          finalThumbnail = await generateThumbnail(file);
        }

        // Create new entry
        const newEntry = createLibraryEntry(file);
        newEntry.coverThumbnail = finalThumbnail;
        newEntry.totalPages = 0;
        newEntry.metadata.title = finalTitle;
        
        // Store blob
        const blob = file.slice(0, file.size);
        const key = `pdf_blob_${newEntry.id}`;
        await saveBlob(key, blob);
        newEntry.fileBlobKey = key;

        await saveLibraryEntry(newEntry);
        setLibrary(prev => ({ ...prev, [newEntry.id]: newEntry }));
        handleOpenPdf(newEntry, file);
      }
    })();
  }

  async function handleOpenPdf(entry, providedFile = null) {

    const openPdf = (f) => {
      setCurrentEntry(entry);
      setFile(f);
      setCurrentPage(entry.readingProgress?.lastPage || 1);
      setViewMode('pdf');
      
      // Initialize chat with summary prompt if empty
      if (entry.chatHistory) {
        setChatMessages(entry.chatHistory);
      } else {
        setChatMessages([{ role: 'assistant', content: 'Hi! I am ready to summarize and answer questions about this document.'}]);
      }
    };

    if (providedFile) { openPdf(providedFile); return; }

    if (entry.fileBlobKey) {
      const blob = await getBlob(entry.fileBlobKey);
      if (blob) {
        openPdf(new File([blob], entry.fileName, { type: 'application/pdf' }));
      }
    }
  }

  // --- Handlers from original (summarized) ---
  function handleClosePdf() {
    setViewMode('library');
    setFile(null);
    setCurrentEntry(null);
    setChatMessages([]);
  }

  function goToPrevPage() {
    const el = document.getElementById(`pdf-page-${currentPage - 1}`);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  function goToNextPage() {
    const el = document.getElementById(`pdf-page-${currentPage + 1}`);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  function handleDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    
    // Auto-scroll to bookmarked page
    if (currentPage > 1) {
      setTimeout(() => {
        const el = document.getElementById(`pdf-page-${currentPage}`);
        if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
      }, 500);
    }
  }

  const handleWheel = (e) => {
    // Only intercept if shift key is pressed (for zooming)
    if (e.shiftKey) {
      if (e.deltaY < 0) {
        setScale(s => Math.min(3.0, s + 0.1));
      } else {
        setScale(s => Math.max(0.5, s - 0.1));
      }
    }
  };

  // --- AI Chat Logic ---
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
      // Find the currently active page div by data attribute
      const activePage = document.querySelector(`.react-pdf__Page[data-page-number="${currentPage}"]`);
      if (!activePage) return '';
      const textLayer = activePage.querySelector('.react-pdf__Page__textContent');
      if (!textLayer) return '';
      return textLayer.innerText || textLayer.textContent || '';
    } catch(e) {
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
      const systemPrompt = `You are a helpful PDF assistant. The user is asking about the document they are viewing. Here is the text of the current page they are looking at:\n\n---\n${pageText}\n---\n\nIf the user asks for a summary, provide a concise summary. Always be polite and succinct.`;
      
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
            // Only send the last 6 messages to save tokens
            ...newChat.slice(-6)
          ]
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
        
        // Save chat history to entry
        if (currentEntry) {
          const updatedEntry = { ...currentEntry, chatHistory: updatedChat };
          setCurrentEntry(updatedEntry);
          saveLibraryEntry(updatedEntry);
        }
      }
    } catch(err) {
      console.error("Chat API Error:", err);
      setChatMessages([...newChat, { role: 'assistant', content: `Error: ${err.message}. Please check your API key and connection.` }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // If in library mode, render Library
  if (viewMode === 'library') {
    return <LibraryView onOpenPdf={handleOpenPdf} onFileSelect={handleFileSelect} />;
  }

  return (
    <>
      <style>{`
        .pdf-viewer-scroll::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        .pdf-viewer-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .pdf-viewer-scroll::-webkit-scrollbar-thumb {
          background-color: ${isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.15)'};
          border-radius: 20px;
          border: 3px solid transparent;
          background-clip: padding-box;
        }
        .pdf-viewer-scroll::-webkit-scrollbar-thumb:hover {
          background-color: ${isDarkMode ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.3)'};
        }
        body::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        body::-webkit-scrollbar-track {
          background: ${isDarkMode ? '#111' : '#f3f4f6'};
        }
        body::-webkit-scrollbar-thumb {
          background-color: ${isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.15)'};
          border-radius: 20px;
          border: 3px solid transparent;
          background-clip: padding-box;
        }
        body::-webkit-scrollbar-thumb:hover {
          background-color: ${isDarkMode ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.3)'};
        }
      `}</style>
      <div className={`min-h-screen p-4 md:p-6 lg:p-8 font-sans flex justify-center items-center transition-colors duration-200 ${isDarkMode ? 'bg-[#111] text-gray-200' : 'bg-[#f3f4f6] text-gray-800'}`}>
        <div className={`w-full max-w-[1600px] h-[calc(100vh-4rem)] rounded-2xl shadow-sm border flex overflow-hidden transition-colors duration-200 ${isDarkMode ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-200'}`}>
          
          {/* LEFT COLUMN: PDF VIEWER */}
        <div className={`flex-1 relative flex flex-col ${isDarkMode ? 'bg-[#141414]' : 'bg-[#fdfdfd]'}`}>
          {/* Top Left Tools */}
          <div className={`absolute top-4 left-4 z-50 flex items-center rounded-lg shadow-sm border p-1 transition-colors ${isDarkMode ? 'bg-[#222] border-[#333]' : 'bg-white border-gray-200'}`}>
            <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded transition-colors ${isDarkMode ? 'hover:bg-[#333] text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Zoom Out
            </button>
            <div className={`w-px h-4 mx-1 ${isDarkMode ? 'bg-[#444]' : 'bg-gray-200'}`}></div>
            <button onClick={() => setScale(s => Math.min(3.0, s + 0.1))} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded transition-colors ${isDarkMode ? 'hover:bg-[#333] text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Zoom In
            </button>
          </div>

          {/* Top Right Tool (Theme, Bookmark, Exit) */}
          <div className="absolute top-4 right-4 z-50 flex gap-2">
            <button
              title="Bookmark Current Page"
              onClick={async () => {
                if (!currentEntry) return;
                const updated = {
                  ...currentEntry,
                  readingProgress: {
                    lastOpened: Date.now(),
                    lastPage: currentPage,
                  }
                };
                await saveLibraryEntry(updated);
                setLibrary(prev => ({ ...prev, [updated.id]: updated }));
                setCurrentEntry(updated);
                
                // simple visual feedback
                const btn = document.getElementById('wl-bookmark-btn');
                if (btn) {
                  const original = btn.innerHTML;
                  btn.innerHTML = '<span class="text-green-500 font-bold">Saved!</span>';
                  setTimeout(() => btn.innerHTML = original, 1500);
                }
              }}
              id="wl-bookmark-btn"
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg shadow-sm border transition-colors ${isDarkMode ? 'bg-[#222] hover:bg-[#333] border-[#333] text-gray-300' : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
              Bookmark
            </button>
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg shadow-sm border transition-colors ${isDarkMode ? 'bg-[#222] hover:bg-[#333] border-[#333] text-gray-300' : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'}`}
            >
              {isDarkMode ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
              )}
            </button>
            <button onClick={handleClosePdf} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg shadow-sm border transition-colors ${isDarkMode ? 'bg-[#222] hover:bg-[#333] border-[#333] text-gray-300' : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
              Close Document
            </button>
          </div>

          {/* Main PDF Content */}
          <div 
            className={`flex-1 overflow-auto pdf-viewer-scroll flex justify-center py-8 ${isDarkMode ? 'bg-[#141414]' : 'bg-[#fdfdfd]'}`} 
            ref={pdfContainerRef}
            onWheel={handleWheel}
          >
            <div className={`p-4 transition-all duration-300`}>
              {file && (
                <div style={isDarkMode ? { filter: 'invert(1) hue-rotate(180deg) sepia(0.2)' } : {}} className="flex flex-col gap-6">
                  <Document
                    file={file}
                    onLoadSuccess={handleDocumentLoadSuccess}
                    loading={<div className="text-gray-400 p-20 font-medium">Loading document...</div>}
                    className="flex flex-col items-center gap-6"
                  >
                    {Array.from(new Array(numPages || 0), (el, index) => (
                      <div 
                        key={`page_${index + 1}`} 
                        id={`pdf-page-${index + 1}`} 
                        className={`pdf-page-wrapper shadow-[0_4px_24px_rgba(0,0,0,0.08)] bg-white rounded flex justify-center overflow-hidden border ${isDarkMode ? 'border-[#444]' : 'border-gray-200'}`}
                      >
                        <Page
                          pageNumber={index + 1}
                          renderTextLayer={true}
                          renderAnnotationLayer={true}
                          className="max-w-full"
                          scale={scale}
                          data-page-number={index + 1}
                        />
                      </div>
                    ))}
                  </Document>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Left PDF Navigation */}
          <div className={`absolute bottom-4 left-4 z-50 flex items-center rounded-lg shadow-sm border overflow-hidden ${isDarkMode ? 'bg-[#222] border-[#333]' : 'bg-white border-gray-200'}`}>
            <button onClick={goToPrevPage} disabled={currentPage <= 1} className={`px-3 py-2 disabled:opacity-30 transition-colors ${isDarkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-[#333]' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <div className={`px-2 text-sm font-medium min-w[60px] text-center border-x flex items-center justify-center ${isDarkMode ? 'text-gray-300 border-[#333]' : 'text-gray-700 border-gray-100'}`}>
              Page {currentPage} of {numPages || '-'}
            </div>
            <button onClick={goToNextPage} disabled={currentPage >= (numPages || 1)} className={`px-3 py-2 disabled:opacity-30 transition-colors ${isDarkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-[#333]' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: SIDEBAR */}
        <div className={`w-[360px] xl:w-[400px] border-l flex flex-col relative transition-colors duration-200 ${isDarkMode ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-200'}`}>
          
          {/* Header */}
          <div className={`p-4 flex items-center justify-between border-b ${isDarkMode ? 'border-[#333]' : 'border-gray-100'}`}>
            <h2 className={`text-[15px] font-semibold truncate pr-4 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>Document Assistant</h2>
          </div>

          {/* Tabs */}
          <div className={`flex px-4 pt-4 border-b gap-6 ${isDarkMode ? 'border-[#333]' : 'border-gray-100'}`}>
            <button 
              onClick={() => setActiveTab('activity')}
              className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'activity' ? 'border-green-500 text-green-500' : (isDarkMode ? 'border-transparent text-gray-500 hover:text-gray-300' : 'border-transparent text-gray-400 hover:text-gray-800')}`}
            >
              Activity
            </button>
            <button 
              onClick={() => setActiveTab('info')}
              className={`pb-3 border-b-2 text-sm font-semibold transition-colors ${activeTab === 'info' ? 'border-green-500 text-green-500' : (isDarkMode ? 'border-transparent text-gray-500 hover:text-gray-300' : 'border-transparent text-gray-400 hover:text-gray-800')}`}
            >
              Info
            </button>
          </div>

          {/* Content Area */}
          <div className={`flex-1 overflow-y-auto pdf-viewer-scroll p-5 flex flex-col gap-5 ${isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'}`}>
            
            {activeTab === 'info' ? (
              <div className="flex flex-col gap-4">
                 <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    </div>
                    <div>
                       <h3 className={`font-semibold text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>Document Info</h3>
                       <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Details from current PDF</p>
                    </div>
                 </div>
                 <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-[#222] border-[#333]' : 'bg-gray-50 border-gray-100'}`}>
                    <div className={`text-xs font-semibold mb-1 uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>File Name</div>
                    <div className={`text-sm mb-4 break-words ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>{currentEntry?.fileName || 'Unknown'}</div>
                    
                    <div className={`text-xs font-semibold mb-1 uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Total Pages</div>
                    <div className={`text-sm mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>{numPages || '-'}</div>

                    <div className={`text-xs font-semibold mb-1 uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Added to Library</div>
                    <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>{currentEntry?.addedAt ? new Date(currentEntry.addedAt).toLocaleDateString() : 'N/A'}</div>
                 </div>
              </div>
            ) : isApiKeyMissing ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="w-16 h-16 bg-green-50/10 rounded-full flex items-center justify-center text-green-500 mb-4 border border-green-500/20">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </div>
                <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>API Key Required</h3>
                <p className={`text-sm mb-6 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Enter your Groq API key to unlock the PDF summarizer and AI assistant.</p>
                <div className="w-full flex flex-col gap-3">
                  <input
                    type="password"
                    placeholder="gsk_..."
                    value={apiKeyInput}
                    onChange={e => setApiKeyInput(e.target.value)}
                    className={`w-full border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-all font-mono ${isDarkMode ? 'bg-[#222] border-[#333] text-gray-200 placeholder-gray-600' : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400'}`}
                  />
                  <button 
                    onClick={saveApiKey}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2.5 rounded-lg text-sm transition-colors shadow-sm"
                  >
                    Unlock Assistant
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 pb-2">
                {chatMessages.map((msg, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    {msg.role === 'assistant' ? (
                      <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 font-bold text-xs shrink-0 border border-green-500/20">AI</div>
                    ) : (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 bg-cover ${isDarkMode ? 'bg-[#333] text-gray-400' : 'bg-gray-100 text-gray-600'}`} style={{backgroundImage: "url('https://ui-avatars.com/api/?name=User&background=f3f4f6&color=4b5563')"}}></div>
                    )}
                    <div className="flex flex-col gap-1 w-full">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{msg.role === 'assistant' ? 'Assistant' : 'You'}</span>
                        <span className={`text-[11px] ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>Just now</span>
                      </div>
                      <div className={`leading-relaxed font-normal whitespace-pre-wrap ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isChatLoading && (
                  <div className="flex gap-3 text-sm animate-pulse">
                     <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 font-bold text-xs shrink-0 border border-green-500/20">AI</div>
                     <div className="flex flex-col gap-2 w-full mt-1.5">
                        <div className={`h-3 rounded w-1/3 ${isDarkMode ? 'bg-[#333]' : 'bg-gray-200'}`}></div>
                        <div className={`h-3 rounded w-2/3 ${isDarkMode ? 'bg-[#333]' : 'bg-gray-200'}`}></div>
                     </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Chat Input Field (Only visible if unlocked and in activity tab) */}
          {!isApiKeyMissing && activeTab === 'activity' && (
            <div className={`p-4 border-t ${isDarkMode ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-100'}`}>
              <div className={`border rounded-xl p-3 flex flex-col focus-within:shadow-sm transition-all shadow-[0_2px_4px_rgba(0,0,0,0.02)] ${isDarkMode ? 'bg-[#222] border-[#444] focus-within:border-gray-500' : 'bg-white border-gray-200 focus-within:border-gray-300'}`}>
                <textarea 
                  placeholder="Ask a question about this document..." 
                  className={`w-full text-sm outline-none resize-none h-[40px] leading-tight bg-transparent ${isDarkMode ? 'text-gray-200 placeholder-gray-600' : 'text-gray-800 placeholder-gray-400'}`}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendChatMessage();
                    }
                  }}
                />
                <div className="flex justify-between items-center mt-1">
                  <div className={`flex gap-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    <button className={`transition-colors ${isDarkMode ? 'hover:text-gray-300' : 'hover:text-gray-600'}`}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg></button>
                  </div>
                  <button 
                    onClick={sendChatMessage}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors border shadow-sm ${isDarkMode ? 'bg-[#333] hover:bg-[#444] border-[#444] text-gray-300' : 'bg-gray-50 hover:bg-gray-100 border-gray-100 text-gray-600'}`}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
    </>
  );
}
