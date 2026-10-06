const sharp = require('sharp');
const fs = require('fs');

async function generate() {
  const inputPath = 'public/monograma-gs.png';
  if (!fs.existsSync(inputPath)) {
    console.error('public/monograma-gs.png not found!');
    return;
  }

  async function createIcon(size, targetWidth, outputPath) {
    const resizedBuffer = await sharp(inputPath)
      .resize({ width: targetWidth, height: targetWidth, fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
    .composite([{ input: resizedBuffer, gravity: 'center' }])
    .png()
    .toFile(outputPath);
  }

  // 1. pwa-512x512.png (70% width)
  await createIcon(512, Math.round(512 * 0.7), 'public/pwa-512x512.png');

  // 2. pwa-192x192.png (70% width)
  await createIcon(192, Math.round(192 * 0.7), 'public/pwa-192x192.png');

  // 3. apple-touch-icon.png (180x180, 70% width)
  await createIcon(180, Math.round(180 * 0.7), 'public/apple-touch-icon.png');

  // 4. pwa-maskable-512x512.png (20% margin on each side -> 60% width)
  await createIcon(512, Math.round(512 * 0.6), 'public/pwa-maskable-512x512.png');

  // 5. favicon-48.png (48x48, 85% width)
  await createIcon(48, Math.round(48 * 0.85), 'public/favicon-48.png');

  console.log('All icons generated from public/monograma-gs.png successfully!');
}

generate().catch(console.error);

