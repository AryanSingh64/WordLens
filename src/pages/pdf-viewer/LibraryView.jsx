import { useState, useEffect } from 'react';
import { ReadingStatus } from '../../types/pdfTypes';
import { getLibrary, deleteLibraryEntry } from '../../services/pdfStorage';
import { deleteBlob } from '../../utils/blobStorage';

export default function LibraryView({ onOpenPdf, onFileSelect }) {
  const [library, setLibrary] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadLibrary();
  }, []);

  async function loadLibrary() {
    try {
      const lib = await getLibrary();
      setLibrary(lib);
    } catch (err) {
      console.error('Failed to load library:', err);
    } finally {
      setLoading(false);
    }
  }



  // Convert library object to array and sort by lastOpened descending
  const libraryEntries = Object.values(library)
    .filter(entry => entry.readingProgress?.status !== ReadingStatus.COMPLETED) // active first
    .sort((a, b) => (b.readingProgress?.lastOpened || 0) - (a.readingProgress?.lastOpened || 0));

  // Filter by search
  const filtered = libraryEntries.filter(entry =>
    entry.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.metadata.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.metadata.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (confirm('Delete this book from library? All annotations will be lost.')) {
      await deleteLibraryEntry(id);
      await deleteBlob(`pdf_blob_${id}`);
      await loadLibrary();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500 bg-[#f3f4f6]">
        Loading library...
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f3f4f6] font-sans text-gray-800 p-4 md:p-8">
      <div className="max-w-[1200px] w-full mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 flex flex-col h-[calc(100vh-4rem)]">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">WordLens Library</h1>
            <p className="text-sm text-gray-500 mt-1">Manage and read your PDF documents.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all text-gray-700"
              />
              <svg className="absolute left-3 top-2.5 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
            
            <label className="cursor-pointer bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors shadow-sm flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Open PDF
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0] && onFileSelect) {
                    onFileSelect(e.target.files[0]);
                  }
                }}
              />
            </label>
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
            <div className="text-6xl mb-4 opacity-50 grayscale">📚</div>
            <p className="text-lg font-medium text-gray-600 mb-2">Your library is empty</p>
            <p className="text-sm">Click the Open PDF button to import a document.</p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-6 overflow-y-auto flex-1 content-start pr-2">
            {filtered.map((entry) => {
              const progress = entry.totalPages > 0
                ? Math.round(((entry.readingProgress?.lastPage || 1) / entry.totalPages) * 100)
                : 0;
              const isCompleted = entry.totalPages > 0 && (entry.readingProgress?.lastPage || 1) >= entry.totalPages;
              const isReading = (entry.readingProgress?.lastPage || 1) > 1 && !isCompleted;

              return (
                <div
                  key={entry.id}
                  onClick={() => onOpenPdf(entry)}
                  className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:border-orange-300 hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1"
                >
                  {/* Cover */}
                  <div className="aspect-[3/4] bg-gray-50 flex items-center justify-center relative overflow-hidden border-b border-gray-100">
                    {entry.coverThumbnail ? (
                      <img
                        src={entry.coverThumbnail}
                        alt={entry.fileName}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-4xl text-gray-300">📄</span>
                    )}

                    {/* Progress bar at bottom */}
                    {entry.totalPages > 0 && progress > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
                        <div
                          className="h-full bg-orange-500 transition-all duration-300"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    )}

                    {/* Status badges */}
                    {isCompleted && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white shadow-sm text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Done
                      </div>
                    )}
                    {isReading && !isCompleted && (
                      <div className="absolute top-2 left-2 bg-orange-500 text-white shadow-sm text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Reading
                      </div>
                    )}

                    {/* Page count badge */}
                    <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="bg-gray-900/70 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded font-medium">
                        p.{entry.readingProgress?.lastPage || 1}/{entry.totalPages || '?'}
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3 bg-white">
                    <h3 className="font-sans text-sm font-semibold text-gray-800 line-clamp-2 leading-tight mb-1" title={entry.fileName}>
                      {entry.metadata.title || entry.fileName}
                    </h3>
                    {entry.metadata.author && (
                      <p className="text-[11px] text-gray-500 truncate font-medium">{entry.metadata.author}</p>
                    )}
                  </div>

                  {/* Delete button (only on hover) */}
                  <button
                    onClick={(e) => handleDelete(e, entry.id)}
                    className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm hover:bg-red-500 text-gray-600 hover:text-white p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200 border border-gray-200 hover:border-red-500 shadow-sm"
                    title="Delete"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
