/**
 * main.jsx — Entry point for the landing page (index.html)
 * 
 * Renders the App component which contains the full marketing
 * landing page with HeroSection and How It Works.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
