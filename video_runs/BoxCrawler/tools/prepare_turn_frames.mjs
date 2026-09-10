import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const inputPath = path.join(root, 'source', 'turn_ccw_generated_raw.png');
const outputDir = path.join(root, 'animations', 'cornerTurnCCW');
const previewPath = path.join(root, 'source', 'turn_ccw_frames_preview.png');

const FRAME_WIDTH = 216;
const FRAME_HEIGHT = 232;
const BASELINE_Y = 224;
const SCALE = 0.88;

// The generated strip has a baked checkerboard. These x-ranges isolate the
// eight generated poses before converting the checkerboard to alpha.
const POSE_RANGES = [
  [55, 240], [315, 489], [610, 766], [895, 1032],
  [1171, 1286], [1429, 1511], [1705, 1784], [1981, 2050],
];

fs.mkdirSync(outputDir, { recursive: true });

const { data, info } = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
const rgba = Buffer.alloc(info.width * info.height * 4);
for (let i = 0, p = 0; i < data.length; i += info.channels, p += 4) {
  const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
  // Keep the black silhouette and its antialiased edge; discard the grey
  // checkerboard background. Output RGB is normalized to solid black.
  const alpha = lum < 80 ? 255 : lum < 100 ? Math.round((100 - lum) * 255 / 20) : 0;
  rgba[p] = 0;
  rgba[p + 1] = 0;
  rgba[p + 2] = 0;
  rgba[p + 3] = alpha;
}

const keyed = sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } });
const framePaths = [];

for (let i = 0; i < POSE_RANGES.length; i++) {
  const [left, right] = POSE_RANGES[i];
  const cropWidth = right - left + 1;
  const crop = await keyed.clone().extract({ left, top: 220, width: cropWidth, height: 310 }).png().toBuffer();
  const alphaRaw = await sharp(crop).raw().toBuffer({ resolveWithObject: true });
  let minX = alphaRaw.info.width, minY = alphaRaw.info.height;
  let maxX = -1, maxY = -1;
  for (let y = 0; y < alphaRaw.info.height; y++) {
    for (let x = 0; x < alphaRaw.info.width; x++) {
      if (alphaRaw.data[(y * alphaRaw.info.width + x) * 4 + 3] > 20) {
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < 0) throw new Error(`No silhouette found for pose ${i}`);

  let pose = sharp(crop).extract({
    left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1,
  });

  // Counterclockwise corner turn: frame 4 is the hand-off point, so the
  // remaining poses use the mirrored support-side silhouette.
  if (i >= 3) pose = pose.flop();

  const poseWidth = Math.max(1, Math.round((maxX - minX + 1) * SCALE));
  const poseHeight = Math.max(1, Math.round((maxY - minY + 1) * SCALE));
  const resized = await pose.resize(poseWidth, poseHeight, { fit: 'fill' }).png().toBuffer();
  const canvas = sharp({
    create: { width: FRAME_WIDTH, height: FRAME_HEIGHT, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  });
  const x = Math.round((FRAME_WIDTH - poseWidth) / 2);
  const y = BASELINE_Y - poseHeight;
  const outPath = path.join(outputDir, `frame_${i}.png`);
  await canvas.composite([{ input: resized, left: x, top: y }]).png().toFile(outPath);
  framePaths.push(outPath);
}

// A review sheet with the same transparent cells, useful for visual QA.
await sharp({
  create: { width: FRAME_WIDTH * framePaths.length, height: FRAME_HEIGHT, channels: 4, background: { r: 235, g: 235, b: 235, alpha: 1 } },
}).composite(framePaths.map((input, i) => ({ input, left: i * FRAME_WIDTH, top: 0 }))).png().toFile(previewPath);

console.log(`Wrote ${framePaths.length} frames to ${outputDir}`);
console.log(`Preview: ${previewPath}`);
