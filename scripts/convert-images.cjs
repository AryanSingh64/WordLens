const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function convertImages() {
  const assetsDir = path.join(__dirname, '..', 'src', 'assets');

  console.log('🖼️  Converting images to WebP...\n');

  // Check if assets directory exists
  if (!fs.existsSync(assetsDir)) {
    console.error('❌ Assets directory not found:', assetsDir);
    process.exit(1);
  }

  // Get all JPG/JPEG files (case-insensitive)
  const files = fs.readdirSync(assetsDir).filter(file =>
    file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.jpeg')
  );

  if (files.length === 0) {
    console.log('✓ No JPG files found to convert');
    return;
  }

  console.log(`Found ${files.length} JPG file(s) to convert:\n`);

  let totalOriginalSize = 0;
  let totalNewSize = 0;
  const convertedFiles = [];

  for (const file of files) {
    const inputPath = path.join(assetsDir, file);
    const stat = fs.statSync(inputPath);
    const originalSize = stat.size;
    totalOriginalSize += originalSize;

    // Get filename without extension, add .webp
    const webpName = path.basename(file, path.extname(file)) + '.webp';
    const outputPath = path.join(assetsDir, webpName);

    console.log(`Converting: ${file}`);
    console.log(`  Original size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);

    try {
      await sharp(inputPath)
        .webp({
          quality: 80, // 80% quality - good balance
          effort: 6,   // compression effort (0-100, default 4). Higher = slower but smaller
          lossless: false,
        })
        .toFile(outputPath);

      const newStat = fs.statSync(outputPath);
      const newSize = newStat.size;
      totalNewSize += newSize;

      const reduction = ((originalSize - newSize) / originalSize * 100).toFixed(1);
      console.log(`  ✓ WebP size: ${(newSize / 1024 / 1024).toFixed(2)} MB (${reduction}% smaller)\n`);

      convertedFiles.push({
        original: file,
        webp: webpName,
        originalSize,
        newSize,
        reduction,
      });

      // Delete original JPG after successful conversion
      fs.unlinkSync(inputPath);
      console.log(`  ✓ Deleted original JPG\n`);
    } catch (err) {
      console.error(`  ✗ Error converting ${file}:`, err.message);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('CONVERSION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total original size: ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Total WebP size: ${(totalNewSize / 1024 / 1024).toFixed(2)} MB`);

  const totalReduction = ((totalOriginalSize - totalNewSize) / totalOriginalSize * 100).toFixed(1);
  console.log(`Total reduction: ${totalReduction}%`);
  console.log(`Files converted: ${convertedFiles.length}`);
  console.log('\nConverted files:');
  convertedFiles.forEach(f => {
    console.log(`  ${f.original} → ${f.webp} (${f.reduction}% smaller)`);
  });
  console.log('='.repeat(60));
  console.log('\n✅ All images converted to WebP successfully!');
  console.log('📝 Next: Update import statements in src/App.jsx to use .webp extensions\n');
}

// Run the conversion
convertImages().catch(err => {
  console.error('❌ Conversion failed:', err);
  process.exit(1);
});
