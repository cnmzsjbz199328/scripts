import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const srcDir = path.join(root, 'animations', 'cornerTurnCCW');
const outDir = path.join(root, 'animations', 'cornerTurnCW');
const frameIds = [7, 6, 5, 3, 2];
const FRAME_WIDTH = 216;
const FRAME_HEIGHT = 232;
const BASELINE_Y = 224;

async function cropSilhouette(buffer) {
  const { data, info } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, minY = info.height, maxX = -1, maxY = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const alpha = data[(y * info.width + x) * info.channels + info.channels - 1];
    if (alpha > 20) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
  }
  if (maxX < 0) throw new Error('No silhouette found in transformed CW frame');
  return sharp(buffer).extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 });
}

// animations/ is intentionally ignored; regenerate the source row from the
// tracked raw strip when this helper is run from a clean checkout.
if (!(await fs.stat(path.join(srcDir, 'frame_0.png')).catch(() => null))) {
  execFileSync(process.execPath, [path.join(root, 'tools', 'prepare_turn_frames.mjs')], { stdio: 'inherit' });
}

await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(outDir, { recursive: true });

// The source action is rightward floor -> upward wall. Reverse its timing,
// then preserve the wall-side contact on the first three poses (vertical
// flip) and the floor-side contact on the last two poses (horizontal flip).
// This is intentionally a generated, separate CW row—not runtime flipX.
for (let i = 0; i < frameIds.length; i++) {
  const src = path.join(srcDir, `frame_${frameIds[i]}.png`);
  const transform = i < 3 ? { flip: true } : { flop: true };
  const transformed = await sharp(src).flip(transform.flip).flop(transform.flop).png().toBuffer();
  const trimmed = await cropSilhouette(transformed);
  const silhouette = await trimmed.png().toBuffer();
  const { width, height } = await sharp(silhouette).metadata();
  if (!width || !height) throw new Error(`No silhouette found for CW pose ${i}`);
  const x = Math.round((FRAME_WIDTH - width) / 2);
  const y = BASELINE_Y - height;
  await sharp({
    create: { width: FRAME_WIDTH, height: FRAME_HEIGHT, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite([{ input: silhouette, left: x, top: y }])
    .png().toFile(path.join(outDir, `frame_${i}.png`));
}

const frames = await Promise.all(frameIds.map((_, i) => sharp(path.join(outDir, `frame_${i}.png`)).toBuffer()));
await sharp({
  create: { width: FRAME_WIDTH * frames.length, height: FRAME_HEIGHT, channels: 4, background: { r: 238, g: 238, b: 238, alpha: 1 } },
}).composite(frames.map((input, i) => ({ input, left: i * 216, top: 0 }))).png()
  .toFile(path.join(root, 'source', 'turn_cw_generated_preview.png'));

console.log(`Generated ${frames.length} CW frames in ${outDir}`);
