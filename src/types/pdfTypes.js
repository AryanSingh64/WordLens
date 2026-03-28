/**
 * PDF Reader Types
 * Defines the data structures for library, annotations, and reading progress.
 */

// Reading progress tracking
export const ReadingStatus = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
};

// Library entry for a single PDF
export function createLibraryEntry(file) {
  return {
    id: generateId(file),
    fileName: file.name,
    fileSize: file.size,
    coverThumbnail: null,
    totalPages: 0,
    metadata: {
      title: file.name.replace(/\.[^/.]+$/, ''), // remove extension
      author: '',
      subject: '',
    },
    readingProgress: {
      lastPage: 1,
      lastPosition: null,
      lastOpened: Date.now(),
      status: ReadingStatus.ACTIVE,
    },
    bookmarks: [],
    highlights: [],
    comments: [],
  };
}

export function generateId(file) {
  // Generate a deterministic ID based on file name + size
  // In a more advanced version, we could use a hash of file content
  const str = `${file.name}-${file.size}-${file.lastModified}`;
  return btoa(str).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 32);
}

// Bookmark
export function createBookmark(page, position = null, note = '') {
  return {
    id: `bm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    page,
    position,
    note,
    createdAt: Date.now(),
    color: '#f59e0b', // default amber
  };
}

// Highlight
export function createHighlight(page, quads, text, color = '#facc15') {
  return {
    id: `hl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    page,
    quads, // Array of { x1, y1, x2, y2, x3, y3, x4, y4 } normalized 0-1
    text,
    color,
    comment: '',
    createdAt: Date.now(),
  };
}

// Comment (annotation anchored to a point)
export function createComment(page, position, text, color = '#3b82f6') {
  return {
    id: `cm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    page,
    position, // { x, y } normalized 0-1 within page
    text,
    color,
    createdAt: Date.now(),
  };
}

// Theme options
export const PDF_THEMES = {
  ORIGINAL: 'original',
  DARK: 'dark',
  SEPIA: 'sepia',
  BLUE_LIGHT: 'blueLight',
};

export const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: '#facc15' },
  { name: 'Green', value: '#4ade80' },
  { name: 'Pink', value: '#f472b6' },
  { name: 'Blue', value: '#60a5fa' },
  { name: 'Purple', value: '#c084fc' },
  { name: 'Orange', value: '#fb923c' },
];
