/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const FRAME_WIDTH = 192;
const FRAME_HEIGHT = 208;
const STRIP_COLUMNS = 8; // All animation strips are always 8×1

async function extractFrames(inputPath: string, outputDir: string, columns: number): Promise<void> {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const image = sharp(inputPath);
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) throw new Error("Invalid image");

  const frameWidth = metadata.width / columns;

  for (let i = 0; i < columns; i++) {
    const { data, info } = await image.clone()
      .extract({
        left: Math.round(i * frameWidth),
        top: 0,
        width: Math.round(frameWidth),
        height: metadata.height
      })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    for (let j = 0; j < data.length; j += 4) {
      const r = data[j], g = data[j + 1], b = data[j + 2];
      if ((g > 150 && (g - Math.max(r, b)) > 40) || (r > 240 && g > 240 && b > 240)) {
        data[j + 3] = 0;
      }
    }

    await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .trim()
      .resize(FRAME_WIDTH, FRAME_HEIGHT, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(outputDir, `frame_${i}.png`));
  }
}

async function processRow(petName: string, rowName: string, inputPath: string) {
  const runDir = path.join('./pet_runs', petName);
  const manifestPath = path.join(runDir, 'manifest.json');

  // Reference is a single frame; all animation rows are 8-frame strips
  const isReference = rowName === 'reference';
  const columns = isReference ? 1 : STRIP_COLUMNS;
  const outputDir = isReference
    ? path.join(runDir, 'reference')
    : path.join(runDir, 'rows', rowName);

  console.log(`Processing ${rowName} for ${petName}...`);
  await extractFrames(inputPath, outputDir, columns);

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const entry = { status: 'completed', updated_at: new Date().toISOString(), path: outputDir };

  if (isReference) {
    manifest.reference = entry;
  } else {
    manifest.rows[rowName] = entry;
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`${rowName} processed and saved to ${outputDir}`);
}

const args = process.argv.slice(2);
if (args.length < 3) {
  console.error("Usage: npx tsx process.ts <pet_name> <row_name> <image_path>");
  process.exit(1);
}

processRow(args[0], args[1], args[2]).catch(console.error);
