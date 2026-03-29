const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// Create a proper ZIP file for Chrome extension distribution
function packageExtension(sourceDir, outputZip) {
  console.log('📦 Packaging WordLens extension...');

  const zip = new AdmZip();

  // Files and folders to include
  const include = [
    'manifest.json',
    'icons/',
    'extension/',
    'options.html',
    'pdf-viewer.html',
    'assets/'
  ];

  // Add files to ZIP
  const addToZip = (filePath, zipPath) => {
    const fullPath = path.join(sourceDir, filePath);
    if (fs.existsSync(fullPath)) {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        // Add all files in directory
        const files = fs.readdirSync(fullPath);
        files.forEach(file => {
          addToZip(path.join(filePath, file), path.join(zipPath, file));
        });
      } else {
        // Add single file
        zip.addLocalFile(fullPath, '', zipPath);
        console.log(`  ✓ Added ${zipPath}`);
      }
    } else {
      console.warn(`  ⚠ Missing: ${filePath}`);
    }
  };

  include.forEach(file => addToZip(file, file));

  // Add installation instructions
  const instructions = `WordLens Extension v2.0.0
==============================

Thank you for downloading WordLens! 📖✨

INSTALLATION STEPS:
1. Open Chrome and go to chrome://extensions/
2. Enable "Developer mode" (toggle in top right corner)
3. Click "Load unpacked"
4. Select and choose this ZIP file's extracted folder
   OR extract the ZIP and select the extracted folder
5. Find WordLens in your extensions list and pin it to toolbar!

FILES INCLUDED:
- manifest.json (extension configuration)
- extension/ (all extension code: popup, sidepanel, content scripts)
- icons/ (extension icons in various sizes)

TROUBLESHOOTING:
• Make sure you're using Google Chrome or a Chromium browser
• Developer mode must be enabled to load unpacked extensions
• After installation, click the puzzle icon in Chrome and pin WordLens

SUPPORT:
• Email: support@wordlens.app
• GitHub: https://github.com/your-username/wordlens
• Website: https://wordlens.app

Enjoy your enhanced reading experience!
`;

  zip.addFile('INSTALLATION.txt', Buffer.from(instructions));
  console.log('  ✓ Added INSTALLATION.txt');

  // Write ZIP file
  zip.writeZip(outputZip);
  console.log(`\n✅ Successfully created: ${outputZip}`);
  console.log(`📦 Size: ${(fs.statSync(outputZip).size / 1024).toFixed(2)} KB`);
  console.log('\n📋 Next steps:');
  console.log('  1. Upload this ZIP to your website or distribution platform');
  console.log('  2. Update the download button URL in your landing page to point to this ZIP');
  console.log('  3. Share with your users!');
}

// Run the script
const sourceDir = path.join(__dirname, 'dist');
const outputZip = path.join(__dirname, 'wordlens-extension-v2.0.0.zip');

try {
  packageExtension(sourceDir, outputZip);

  // Also copy the ZIP to dist/ so it's available for the landing page
  const distZip = path.join(sourceDir, 'wordlens-extension-v2.0.0.zip');
  fs.copyFileSync(outputZip, distZip);
  console.log(`📦 Also copied ZIP to: ${distZip}`);

  process.exit(0);
} catch (err) {
  console.error('❌ Error creating ZIP:', err);
  process.exit(1);
}
