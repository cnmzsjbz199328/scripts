import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const list = [
  ['C:/Users/tj169/.gemini/antigravity-cli/brain/1d0d8b25-d457-468e-9318-728f28925ae1/selva_oscura_1783000410066.jpg', 'game_runs/ShadowAbyss/scene/selva_oscura.png'],
  ['C:/Users/tj169/.gemini/antigravity-cli/brain/1d0d8b25-d457-468e-9318-728f28925ae1/virgil_meet_1783000427587.jpg', 'game_runs/ShadowAbyss/scene/virgil_meet.png'],
  ['C:/Users/tj169/.gemini/antigravity-cli/brain/1d0d8b25-d457-468e-9318-728f28925ae1/hell_gate_1783000440563.jpg', 'game_runs/ShadowAbyss/scene/hell_gate.png'],
  ['C:/Users/tj169/.gemini/antigravity-cli/brain/1d0d8b25-d457-468e-9318-728f28925ae1/acheron_1783000452900.jpg', 'game_runs/ShadowAbyss/scene/acheron.png'],
  ['C:/Users/tj169/.gemini/antigravity-cli/brain/1d0d8b25-d457-468e-9318-728f28925ae1/dis_gate_1783000466227.jpg', 'game_runs/ShadowAbyss/scene/dis_gate.png'],
  ['C:/Users/tj169/.gemini/antigravity-cli/brain/1d0d8b25-d457-468e-9318-728f28925ae1/geryon_1783000479156.jpg', 'game_runs/ShadowAbyss/scene/geryon.png'],
  ['C:/Users/tj169/.gemini/antigravity-cli/brain/1d0d8b25-d457-468e-9318-728f28925ae1/lucifer_1783000492742.jpg', 'game_runs/ShadowAbyss/scene/lucifer.png'],
  ['C:/Users/tj169/.gemini/antigravity-cli/brain/1d0d8b25-d457-468e-9318-728f28925ae1/hell_exit_1783000506682.jpg', 'game_runs/ShadowAbyss/scene/hell_exit.png'],
  ['C:/Users/tj169/.gemini/antigravity-cli/brain/1d0d8b25-d457-468e-9318-728f28925ae1/purg_shore_1783000517581.jpg', 'game_runs/ShadowAbyss/scene/purg_shore.png'],
  ['C:/Users/tj169/.gemini/antigravity-cli/brain/1d0d8b25-d457-468e-9318-728f28925ae1/terrace_pride_1783000529961.jpg', 'game_runs/ShadowAbyss/scene/terrace_pride.png'],
  ['C:/Users/tj169/.gemini/antigravity-cli/brain/1d0d8b25-d457-468e-9318-728f28925ae1/terrace_envy_1783000542939.jpg', 'game_runs/ShadowAbyss/scene/terrace_envy.png'],
  ['C:/Users/tj169/.gemini/antigravity-cli/brain/1d0d8b25-d457-468e-9318-728f28925ae1/terrace_wrath_1783000554458.jpg', 'game_runs/ShadowAbyss/scene/terrace_wrath.png'],
  ['C:/Users/tj169/.gemini/antigravity-cli/brain/1d0d8b25-d457-468e-9318-728f28925ae1/terrace_sloth_1783000568480.jpg', 'game_runs/ShadowAbyss/scene/terrace_sloth.png'],
  ['C:/Users/tj169/.gemini/antigravity-cli/brain/1d0d8b25-d457-468e-9318-728f28925ae1/terrace_avarice_1783000581342.jpg', 'game_runs/ShadowAbyss/scene/terrace_avarice.png'],
  ['C:/Users/tj169/.gemini/antigravity-cli/brain/1d0d8b25-d457-468e-9318-728f28925ae1/terrace_gluttony_1783000594040.jpg', 'game_runs/ShadowAbyss/scene/terrace_gluttony.png'],
  ['C:/Users/tj169/.gemini/antigravity-cli/brain/1d0d8b25-d457-468e-9318-728f28925ae1/terrace_lust_1783000605680.jpg', 'game_runs/ShadowAbyss/scene/terrace_lust.png'],
  ['C:/Users/tj169/.gemini/antigravity-cli/brain/1d0d8b25-d457-468e-9318-728f28925ae1/eden_1783000619621.jpg', 'game_runs/ShadowAbyss/scene/eden.png']
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
  console.log('Processed all 17 successfully generated images!');
}

main().catch(console.error);
