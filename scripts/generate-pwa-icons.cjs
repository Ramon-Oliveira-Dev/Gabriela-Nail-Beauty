const sharp = require('sharp');
const fs = require('fs');

const svgBase = (size, paddingPercent = 0.08) => {
  return `<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" rx="100" fill="#201510"/>
    <circle cx="256" cy="256" r="210" fill="none" stroke="#8C6B4F" stroke-width="4" opacity="0.4"/>
    <circle cx="256" cy="256" r="190" fill="none" stroke="#D4B996" stroke-width="1.5" opacity="0.6" stroke-dasharray="6,6"/>
    <path d="M256 100 L261 125 L286 130 L261 135 L256 160 L251 135 L226 130 L251 125 Z" fill="#D4B996" opacity="0.8"/>
    <text x="256" y="295" font-family="Playfair Display, Georgia, serif" font-size="148" font-weight="600" fill="#FAF6F2" text-anchor="middle" letter-spacing="-4">GS</text>
    <text x="256" y="345" font-family="Inter, sans-serif" font-size="24" font-weight="500" fill="#D4B996" text-anchor="middle" letter-spacing="9">NAIL &amp; BEAUTY</text>
  </svg>`;
};

const svgMaskable = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#201510"/>
  <circle cx="256" cy="256" r="180" fill="none" stroke="#8C6B4F" stroke-width="3" opacity="0.4"/>
  <path d="M256 125 L260 145 L280 149 L260 153 L256 173 L252 153 L232 149 L252 145 Z" fill="#D4B996" opacity="0.85"/>
  <text x="256" y="290" font-family="Playfair Display, Georgia, serif" font-size="130" font-weight="600" fill="#FAF6F2" text-anchor="middle" letter-spacing="-3">GS</text>
  <text x="256" y="335" font-family="Inter, sans-serif" font-size="20" font-weight="600" fill="#D4B996" text-anchor="middle" letter-spacing="8">NAIL &amp; BEAUTY</text>
</svg>`;

async function generate() {
  const svg512 = svgBase(512);
  await sharp(Buffer.from(svg512)).resize(512, 512).png().toFile('public/pwa-512x512.png');
  await sharp(Buffer.from(svg512)).resize(192, 192).png().toFile('public/pwa-192x192.png');
  await sharp(Buffer.from(svgMaskable)).resize(512, 512).png().toFile('public/pwa-maskable-512x512.png');
  await sharp(Buffer.from(svg512)).resize(180, 180).png().toFile('public/apple-touch-icon.png');
  fs.writeFileSync('public/icon.svg', svg512);
  console.log('All icons generated successfully!');
}

generate().catch(console.error);
