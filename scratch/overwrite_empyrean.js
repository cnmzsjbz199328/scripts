import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const src = 'C:/Users/tj169/.gemini/antigravity-cli/brain/1d0d8b25-d457-468e-9318-728f28925ae1/empyrean_v3_1783049699017.jpg';
const dst = 'game_runs/ShadowAbyss/scene/empyrean.png';

async function main() {
  console.log('Overwriting empyrean.png with strictly empty rose version...');
  if (fs.existsSync(dst)) {
    fs.unlinkSync(dst);
  }
  await sharp(src)
    .resize(1376, 768, { fit: 'fill' })
    .png()
    .toFile(dst);
  console.log('Successfully updated empyrean.png!');
}

main().catch(console.error);
