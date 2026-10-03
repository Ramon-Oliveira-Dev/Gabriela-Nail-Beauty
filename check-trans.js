import sharp from 'sharp';

async function main() {
  const meta1 = await sharp('public/monograma-gs.png').metadata();
  console.log('monograma-gs.png - hasAlpha:', meta1.hasAlpha, 'channels:', meta1.channels);
  
  const meta2 = await sharp('public/monograma-gs_1.png').metadata();
  console.log('monograma-gs_1.png - hasAlpha:', meta2.hasAlpha, 'channels:', meta2.channels);
}

main().catch(console.error);
