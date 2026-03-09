/**
 * PdfViewer.jsx — In-extension PDF reader
 * 
 * Opens in a new Chrome tab. Users can drag-and-drop or
 * click-to-upload a PDF, then read it with WordLens
 * text selection features active.
 * 
 * Uses react-pdf (pdfjs-dist) for rendering.
 * 
 * Placeholder for now. Full build in PART 7.
 */

function PdfViewer() {
    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Lora', serif",
            color: 'var(--text)',
        }}>
            <h1 style={{ fontSize: '1.5rem' }}>WordLens — PDF Reader</h1>
        </div>
    )
}

export default PdfViewer
