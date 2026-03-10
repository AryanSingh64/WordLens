const sharp = require('sharp');

const svgStr = `
<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" width="128" height="128">
  <rect x="14" y="14" width="20" height="20" fill="#00F5D4" />
  <rect x="14" y="34" width="20" height="20" fill="#00F5D4" />
  <rect x="14" y="54" width="20" height="20" fill="#00F5D4" />
  <rect x="14" y="74" width="20" height="20" fill="#00F5D4" />
  
  <rect x="34" y="94" width="20" height="20" fill="#00BBF9" />
  
  <rect x="54" y="54" width="20" height="20" fill="#9B5DE5" />
  <rect x="54" y="74" width="20" height="20" fill="#9B5DE5" />
  
  <rect x="74" y="94" width="20" height="20" fill="#F15BB5" />
  
  <rect x="94" y="14" width="20" height="20" fill="#FF006E" />
  <rect x="94" y="34" width="20" height="20" fill="#FF006E" />
  <rect x="94" y="54" width="20" height="20" fill="#FF006E" />
  <rect x="94" y="74" width="20" height="20" fill="#FF006E" />
</svg>
`;

sharp(Buffer.from(svgStr))
    .png()
    .toFile('./public/icons/icon.png')
    .then(() => console.log('Successfully generated public/icons/icon.png'))
    .catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
