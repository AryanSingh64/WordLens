/**
 * pdf-main.jsx — Entry point for the PDF Viewer page (pdf-viewer.html)
 * 
 * Renders the PDF viewer component in a new Chrome tab.
 * Separate from the landing page because it has its own
 * HTML entry point and distinct functionality.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import PdfViewer from './pages/pdf-viewer/PdfViewer.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <PdfViewer />
    </React.StrictMode>,
)
