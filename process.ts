/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const FRAME_WIDTH = 192;
const FRAME_HEIGHT = 208;

async function extractFrames(inputPath: string, outputDir: string, columns: number = 8, rows: number = 1): Promise<void> {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const image = sharp(inputPath);
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) throw new Error("Invalid image");

  const actualFrameWidth = metadata.width / columns;
  const actualFrameHeight = metadata.height / rows;
  const totalFrames = columns * rows;

  for (let i = 0; i < totalFrames; i++) {
    const r = Math.floor(i / columns);
    const c = i % columns;
    const framePath = path.join(outputDir, `frame_${i}.png`);

    const frame = image.clone()
      .extract({
        left: Math.round(c * actualFrameWidth),
        top: Math.round(r * actualFrameHeight),
        width: Math.round(actualFrameWidth),
        height: Math.round(actualFrameHeight)
      });

    const { data, info } = await frame.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    for (let j = 0; j < data.length; j += 4) {
      const red = data[j];
      const green = data[j + 1];
      const blue = data[j + 2];

      const isGreen = green > 150 && (green - Math.max(red, blue)) > 40;
      const isWhite = red > 240 && green > 240 && blue > 240;

      if (isGreen || isWhite) {
        data[j + 3] = 0;
      }
    }

    await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .trim()
      .resize(FRAME_WIDTH, FRAME_HEIGHT, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(framePath);
  }
}

async function processRow(petName: string, rowName: string, inputPath: string, columns: number, rows: number) {
  const runDir = path.join('./pet_runs', petName);
  const manifestPath = path.join(runDir, 'manifest.json');
  // Reference images go to their own directory, not under rows/
  const outputDir = rowName === 'reference'
    ? path.join(runDir, 'reference')
    : path.join(runDir, 'rows', rowName);

  console.log(`Processing ${rowName} for ${petName} (${columns}x${rows} grid)...`);
  await extractFrames(inputPath, outputDir, columns, rows);

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  if (rowName === 'reference') {
    // Store under manifest.reference, not manifest.rows
    manifest.reference = { status: 'completed', updated_at: new Date().toISOString(), path: outputDir };
  } else {
    manifest.rows[rowName] = { status: 'completed', updated_at: new Date().toISOString(), path: outputDir };

    // Auto-generate running-left by flipping running-right
    if (rowName === 'running-right' && manifest.rows['running-left']?.status !== 'completed') {
      const leftDir = path.join(runDir, 'rows', 'running-left');
      if (!fs.existsSync(leftDir)) fs.mkdirSync(leftDir, { recursive: true });
      console.log('Auto-generating running-left from running-right (flop)...');
      const totalFrames = columns * rows;
      for (let i = 0; i < totalFrames; i++) {
        await sharp(path.join(outputDir, `frame_${i}.png`))
          .flop()
          .toFile(path.join(leftDir, `frame_${i}.png`));
      }
      manifest.rows['running-left'] = { status: 'completed', updated_at: new Date().toISOString(), path: leftDir };
      console.log('running-left auto-generated.');
    }
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`${rowName} processed and saved to ${outputDir}`);
}

const args = process.argv.slice(2);
if (args.length < 3) {
  console.error("Usage: npx tsx scripts/process.ts <pet_name> <row_name> <input_image_path> [columns] [rows]");
  process.exit(1);
}

const rowName = args[1];
// Reference images are always single frames; animation strips default to 8 columns
const defaultCols = rowName === 'reference' ? 1 : 8;
const cols = args[3] ? parseInt(args[3]) : defaultCols;
const rws = args[4] ? parseInt(args[4]) : 1;

processRow(args[0], rowName, args[2], cols, rws).catch(console.error);
