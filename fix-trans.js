import sharp from 'sharp';

async function makeTransparent() {
  const input = 'public/monograma-gs_1.png';
  const output = 'public/monograma-gs_1_transparent.png';
  
  const { width, height } = await sharp(input).metadata();
  
  // Extract greyscale and invert it for the alpha channel
  // White (255) becomes Black (0, transparent)
  // Black (0) becomes White (255, opaque)
  const alphaBuffer = await sharp(input)
    .greyscale()
    .negate()
    .toBuffer();
    
  // Create a solid black image of the same size, and apply the new alpha channel
  await sharp({
    create: {
      width, height,
      channels: 3,
      background: { r: 0, g: 0, b: 0 }
    }
  })
  .joinChannel(alphaBuffer)
  .png()
  .toFile(output);
  
  console.log('Done creating transparent png!');
}
makeTransparent().catch(console.error);
