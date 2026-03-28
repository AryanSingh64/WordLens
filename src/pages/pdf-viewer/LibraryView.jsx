import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

  const libraryEntries = Object.values(library)
    .filter(entry => entry.readingProgress?.status !== ReadingStatus.COMPLETED)
    .sort((a, b) => (b.readingProgress?.lastOpened || 0) - (a.readingProgress?.lastOpened || 0));

  const filtered = libraryEntries.filter(entry =>
    entry.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.metadata.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.metadata.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (confirm('Delete this book?')) {
      await deleteLibraryEntry(id);
      await deleteBlob(`pdf_blob_${id}`);
      await loadLibrary();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-text font-sans flex items-center justify-center">
        <div className="text-muted text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text font-sans">
      {/* Minimal Header */}
      <div className="sticky top-0 z-10 bg-bg/95 backdrop-blur-sm border-b border-border px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <h1 className="text-lg font-semibold">Library</h1>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 px-3 py-1 text-xs rounded-md bg-surface border border-border outline-none focus:border-accent transition-all w-48"
              />
            </div>

            {/* Add PDF Button */}
            <label className="cursor-pointer bg-accent hover:bg-accent/90 text-bg font-medium px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5 transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add
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
      </div>

      {/* Grid - Compact, no extra space */}
      <div className="max-w-7xl mx-auto p-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted">
            <div className="text-4xl mb-3 opacity-50">📄</div>
            <p className="text-sm">No documents</p>
            <p className="text-xs mt-1 opacity-60">Add a PDF to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
            {filtered.map((entry) => {
              const progress = entry.totalPages > 0
                ? Math.round(((entry.readingProgress?.lastPage || 1) / entry.totalPages) * 100)
                : 0;
              const isCompleted = entry.totalPages > 0 && (entry.readingProgress?.lastPage || 1) >= entry.totalPages;

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => onOpenPdf(entry)}
                  className="group relative bg-surface border border-border rounded-lg overflow-hidden cursor-pointer hover:border-accent transition-all"
                >
                  {/* Thumbnail - smaller, no padding */}
                  <div className="aspect-[3/4] relative bg-surface/50 flex items-center justify-center overflow-hidden">
                    {entry.coverThumbnail ? (
                      <img
                        src={entry.coverThumbnail}
                        alt={entry.fileName}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="text-2xl text-muted/50">📄</div>
                    )}

                    {/* Progress indicator - thin line */}
                    {entry.totalPages > 0 && progress > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-border">
                        <div
                          className="h-full bg-accent"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    )}

                    {/* Status badge - tiny */}
                    {isCompleted && (
                      <div className="absolute top-1 right-1 bg-accent text-bg text-[8px] font-bold px-1 py-0.5 rounded">
                        ✓
                      </div>
                    )}

                    {/* Delete on hover */}
                    <button
                      onClick={(e) => handleDelete(e, entry.id)}
                      className="absolute top-1 left-1 w-5 h-5 flex items-center justify-center bg-bg/80 border border-border rounded text-muted hover:text-red-500 hover:border-red-500 opacity-0 group-hover:opacity-100 transition-all text-xs"
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>

                  {/* Info - compact */}
                  <div className="p-2 bg-surface/50">
                    <h3 className="text-xs font-medium text-text truncate leading-tight" title={entry.metadata.title || entry.fileName}>
                      {entry.metadata.title || entry.fileName}
                    </h3>
                    {entry.metadata.author && (
                      <p className="text-[10px] text-muted truncate mt-0.5">
                        {entry.metadata.author}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-1 text-[10px] text-muted">
                      <span>p.{entry.readingProgress?.lastPage || 1}/{entry.totalPages || '?'}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
