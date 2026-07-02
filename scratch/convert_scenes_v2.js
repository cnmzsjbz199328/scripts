import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const list = [
  ['C:/Users/tj169/.gemini/antigravity-cli/brain/1d0d8b25-d457-468e-9318-728f28925ae1/lethe_1783025814310.jpg', 'game_runs/ShadowAbyss/scene/lethe.png'],
  ['C:/Users/tj169/.gemini/antigravity-cli/brain/1d0d8b25-d457-468e-9318-728f28925ae1/heaven_threshold_1783025827983.jpg', 'game_runs/ShadowAbyss/scene/heaven_threshold.png'],
  ['C:/Users/tj169/.gemini/antigravity-cli/brain/1d0d8b25-d457-468e-9318-728f28925ae1/beatrice_1783025843292.jpg', 'game_runs/ShadowAbyss/scene/beatrice.png'],
  ['C:/Users/tj169/.gemini/antigravity-cli/brain/1d0d8b25-d457-468e-9318-728f28925ae1/spheres_1783025856880.jpg', 'game_runs/ShadowAbyss/scene/spheres.png'],
  ['C:/Users/tj169/.gemini/antigravity-cli/brain/1d0d8b25-d457-468e-9318-728f28925ae1/starry_heaven_1783025868727.jpg', 'game_runs/ShadowAbyss/scene/starry_heaven.png'],
  ['C:/Users/tj169/.gemini/antigravity-cli/brain/1d0d8b25-d457-468e-9318-728f28925ae1/empyrean_1783025883838.jpg', 'game_runs/ShadowAbyss/scene/empyrean.png'],
  ['C:/Users/tj169/.gemini/antigravity-cli/brain/1d0d8b25-d457-468e-9318-728f28925ae1/cover_1783025896961.jpg', 'game_runs/ShadowAbyss/scene/cover.png']
];

async function main() {
  fs.mkdirSync('game_runs/ShadowAbyss/scene', { recursive: true });
  for (const [src, dst] of list) {
    console.log(`Processing ${path.basename(dst)}...`);
    await sharp(src)
      .resize(1376, 768, { fit: 'fill' })
      .png()
      .toFile(dst);
  }
  console.log('Processed remaining 7 images successfully!');
}

main().catch(console.error);
