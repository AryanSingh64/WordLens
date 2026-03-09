import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import { copyFileSync, cpSync, existsSync, mkdirSync } from 'fs'

// Custom plugin to copy our extension files into the dist folder during build
function copyExtensionFiles() {
  return {
    name: 'copy-extension-files',
    closeBundle() {
      console.log('Copying extension files to dist...');

      // Ensure dist exists
      if (!existsSync('dist')) mkdirSync('dist');

      // Copy manifest
      copyFileSync('public/manifest.json', 'dist/manifest.json');

      // Copy icons
      if (existsSync('public/icons')) {
        cpSync('public/icons', 'dist/icons', { recursive: true });
      }

      // Copy raw extension JS/CSS 
      if (existsSync('extension')) {
        cpSync('extension', 'dist/extension', { recursive: true });
      }
    }
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    copyExtensionFiles(),
  ],

  /* Multi-page setup: each page gets its own HTML entry */
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        options: resolve(__dirname, 'options.html'),
        'pdf-viewer': resolve(__dirname, 'pdf-viewer.html'),
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
})