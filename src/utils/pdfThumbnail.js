/**
 * PDF Thumbnail Generator
 * Generates a cover thumbnail (base64) from the first page of a PDF.
 *
 * Uses pdfjs-dist directly to render to canvas.
 */

import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';

// Use the same worker setup as in PdfViewer.jsx
// The worker is bundled by Vite via ?url
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc = workerUrl;

/**
 * Generates a thumbnail from the first page of a PDF file.
 * @param {File} file - The PDF file object
 * @param {number} maxWidth - Maximum thumbnail width (default 150)
 * @param {number} quality - JPEG quality 0-1 (default 0.5)
 * @returns {Promise<string>} Base64 data URL (image/jpeg)
 */
export async function generateThumbnail(file, maxWidth = 150, quality = 0.5) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    // Get first page
    const page = await pdf.getPage(1);

    // Calculate scale to fit maxWidth while maintaining aspect ratio
    const initialViewport = page.getViewport({ scale: 1 });
    const scale = maxWidth / initialViewport.width;
    const scaledViewport = page.getViewport({ scale });

    // Set up canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;

    // Render page
    await page.render({
      canvasContext: context,
      viewport: scaledViewport,
    }).promise;

    // Convert to base64 JPEG (smaller than PNG)
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          } else {
            resolve(null);
          }
        },
        'image/jpeg',
        quality
      );
    });
  } catch (err) {
    console.error('Thumbnail generation failed:', err);
    return null;
  }
}
