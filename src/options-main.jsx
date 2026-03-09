/**
 * options-main.jsx — Entry point for the Options page (options.html)
 * 
 * Renders the Options component which provides API key settings.
 * This is a separate React app from the landing page because
 * Chrome opens it in its own tab/window via chrome_url_overrides.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import Options from './pages/options/Options.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <Options />
    </React.StrictMode>,
)
