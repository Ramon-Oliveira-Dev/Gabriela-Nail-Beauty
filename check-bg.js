import sharp from 'sharp';

async function main() {
  const meta = await sharp('public/monograma-gs.png').metadata();
  console.log('Channels:', meta.channels);
  console.log('Has Alpha:', meta.hasAlpha);
}

main().catch(console.error);
