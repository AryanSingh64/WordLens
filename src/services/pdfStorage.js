/**
 * PDF Storage Service
 * Handles all chrome.storage operations for the PDF reader.
 * Uses chrome.storage.local (5MB quota). Stores metadata only.
 */

const STORAGE_KEY = 'pdfLibrary';

export async function getLibrary() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      const library = result[STORAGE_KEY] || {};
      // Ensure it's an object
      resolve(typeof library === 'object' ? library : {});
    });
  });
}

export async function saveLibraryEntry(entry) {
  if (!entry || !entry.id) {
    throw new Error('Invalid entry: missing id');
  }

  const library = await getLibrary();
  library[entry.id] = entry;

  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [STORAGE_KEY]: library }, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

export async function deleteLibraryEntry(id) {
  const library = await getLibrary();
  if (library[id]) {
    delete library[id];
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [STORAGE_KEY]: library }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }
}

export async function getEntryById(id) {
  const library = await getLibrary();
  return library[id] || null;
}

/**
 * Find an entry by file name and size.
 * Returns null if not found.
 */
export async function getEntryByFile(file) {
  const library = await getLibrary();
  return Object.values(library).find(
    (entry) => entry.fileName === file.name && entry.fileSize === file.size
  ) || null;
}

/**
 * Clear entire PDF library (for debugging/reset)
 */
export async function clearLibrary() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove([STORAGE_KEY], () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}
