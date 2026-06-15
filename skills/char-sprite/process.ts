/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const FRAME_WIDTH = 192;
const FRAME_HEIGHT = 208;
const FRAME_COUNT = 9;   // fixed: 3×3 grid per row

const CHROMA_THRESHOLD = 110;
const CELL_PADDING = 5;
const GRID_PADDING = 3;

interface Component {
  pixels: number[];
  area: number;
  minX: number; minY: number; maxX: number; maxY: number;
  centerX: number;
}

function chromaDist(r: number, g: number, b: number): number {
  return Math.sqrt(r * r + (g - 255) ** 2 + b * b);
}

function applyChromaKey(data: Buffer): void {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const isPureGreen = chromaDist(r, g, b) <= CHROMA_THRESHOLD;
    const isDarkGreen = g > 80 && g > r * 1.4 && g > b * 1.4 && r < 100 && b < 100;
    if (isPureGreen || isDarkGreen) data[i + 3] = 0;
  }
}

function findComponents(data: Buffer, width: number, height: number): Component[] {
  const visited = new Uint8Array(width * height);
  const components: Component[] = [];

  for (let start = 0; start < width * height; start++) {
    if (data[start * 4 + 3] <= 16 || visited[start]) continue;

    const stack = [start];
    visited[start] = 1;
    const pixels: number[] = [];
    let minX = width, minY = height, maxX = 0, maxY = 0;

    while (stack.length) {
      const curr = stack.pop()!;
      pixels.push(curr);
      const x = curr % width;
      const y = Math.floor(curr / width);
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;

      if (x > 0)          { const n = curr - 1;     if (!visited[n] && data[n*4+3] > 16) { visited[n] = 1; stack.push(n); } }
      if (x < width - 1)  { const n = curr + 1;     if (!visited[n] && data[n*4+3] > 16) { visited[n] = 1; stack.push(n); } }
      if (y > 0)          { const n = curr - width;  if (!visited[n] && data[n*4+3] > 16) { visited[n] = 1; stack.push(n); } }
      if (y < height - 1) { const n = curr + width;  if (!visited[n] && data[n*4+3] > 16) { visited[n] = 1; stack.push(n); } }
    }

    components.push({ pixels, area: pixels.length, minX, minY, maxX: maxX + 1, maxY: maxY + 1, centerX: (minX + maxX + 1) / 2 });
  }
  return components;
}

function groupIntoFrames(components: Component[], frameCount: number): Component[][] | null {
  if (!components.length) return null;
  const largest = Math.max(...components.map(c => c.area));
  const seedMin = Math.max(120, largest * 0.2);
  let seeds = components.filter(c => c.area >= seedMin);
  if (seeds.length < frameCount)
    seeds = [...components].sort((a, b) => b.area - a.area).slice(0, frameCount);
  if (seeds.length < frameCount) return null;

  seeds = [...seeds].sort((a, b) => b.area - a.area).slice(0, frameCount);
  seeds.sort((a, b) => {
    const yDist = Math.abs(a.minY - b.minY);
    if (yDist > 50) return a.minY - b.minY;
    return a.centerX - b.centerX;
  });

  const seedSet = new Set(seeds);
  const groups: Component[][] = seeds.map(s => [s]);
  const noiseMin = Math.max(12, largest * 0.002);
  for (const c of components) {
    if (seedSet.has(c) || c.area < noiseMin) continue;
    let best = 0;
    for (let i = 1; i < seeds.length; i++) {
      if (Math.abs(seeds[i].centerX - c.centerX) < Math.abs(seeds[best].centerX - c.centerX)) best = i;
    }
    groups[best].push(c);
  }
  return groups;
}

async function renderGroupAsFrame(data: Buffer, imgWidth: number, _imgHeight: number, group: Component[]): Promise<Buffer> {
  const minX = Math.min(...group.map(c => c.minX));
  const minY = Math.min(...group.map(c => c.minY));
  const maxX = Math.max(...group.map(c => c.maxX));
  const maxY = Math.max(...group.map(c => c.maxY));
  const cropW = maxX - minX;
  const cropH = maxY - minY;

  const cropBuf = Buffer.alloc(cropW * cropH * 4, 0);
  for (const comp of group) {
    for (const idx of comp.pixels) {
      const x = idx % imgWidth - minX;
      const y = Math.floor(idx / imgWidth) - minY;
      const src = idx * 4, dst = (y * cropW + x) * 4;
      cropBuf[dst] = data[src]; cropBuf[dst+1] = data[src+1];
      cropBuf[dst+2] = data[src+2]; cropBuf[dst+3] = data[src+3];
    }
  }
  return fitCropToCell(cropBuf, cropW, cropH, true);
}

async function renderSlotAsFrame(data: Buffer, imgWidth: number, imgHeight: number, slotIdx: number): Promise<Buffer> {
  const GRID_COLS = 3;
  const GRID_ROWS = 3;
  const slotW = imgWidth / GRID_COLS;
  const slotH = imgHeight / GRID_ROWS;
  const col = slotIdx % GRID_COLS;
  const row = Math.floor(slotIdx / GRID_COLS);
  const left = Math.round(col * slotW) + GRID_PADDING;
  const top = Math.round(row * slotH) + GRID_PADDING;
  const w = Math.round((col + 1) * slotW) - left - GRID_PADDING;
  const h = Math.round((row + 1) * slotH) - top - GRID_PADDING;

  const slotBuf = Buffer.alloc(w * h * 4, 0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const src = (((top + y) * imgWidth) + left + x) * 4;
      const dst = (y * w + x) * 4;
      if (src >= 0 && src <= data.length - 4) {
        slotBuf[dst] = data[src]; slotBuf[dst+1] = data[src+1];
        slotBuf[dst+2] = data[src+2]; slotBuf[dst+3] = data[src+3];
      }
    }
  }
  return fitCropToCell(slotBuf, w, h, false);
}

async function fitCropToCell(cropBuf: Buffer, cropW: number, cropH: number, useTrim: boolean): Promise<Buffer> {
  let pipeline = sharp(cropBuf, { raw: { width: cropW, height: cropH, channels: 4 } });
  if (useTrim) pipeline = pipeline.trim();

  const resized = await pipeline
    .resize(FRAME_WIDTH - CELL_PADDING * 2, FRAME_HEIGHT - CELL_PADDING * 2, {
      fit: 'inside',
      withoutEnlargement: true,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toBuffer();

  return sharp({ create: { width: FRAME_WIDTH, height: FRAME_HEIGHT, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toBuffer();
}

async function extractFrames(inputPath: string, outputDir: string): Promise<void> {
  fs.mkdirSync(outputDir, { recursive: true });

  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  applyChromaKey(data);

  const components = findComponents(data, info.width, info.height);
  // Always try BFS grouping for single rows; fall back to slots if it fails
  const groups = groupIntoFrames(components, FRAME_COUNT);
  console.log(`  extraction method: ${groups ? 'components' : 'slots'}`);

  for (let i = 0; i < FRAME_COUNT; i++) {
    const frameBuf = groups
      ? await renderGroupAsFrame(data, info.width, info.height, groups[i])
      : await renderSlotAsFrame(data, info.width, info.height, i);
    fs.writeFileSync(path.join(outputDir, `frame_${i}.png`), frameBuf);
  }
}

async function processRow(charName: string, rowName: string, inputPath: string) {
  const runDir = path.join('./char_runs', charName);
  const manifestPath = path.join(runDir, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.error(`Manifest not found. Run prepare first: npx tsx skills/char-sprite/prepare.ts ${charName}`);
    process.exit(1);
  }

  const isReference = rowName === 'reference';
  const outputDir = isReference
    ? path.join(runDir, 'reference')
    : path.join(runDir, 'rows', rowName);

  console.log(`Processing "${rowName}" for ${charName}...`);

  if (isReference) {
    // Reference: extract single frame
    fs.mkdirSync(outputDir, { recursive: true });
    const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    applyChromaKey(data);
    const components = findComponents(data, info.width, info.height);
    const groups = groupIntoFrames(components, 1);
    const frameBuf = groups
      ? await renderGroupAsFrame(data, info.width, info.height, groups[0])
      : await renderSlotAsFrame(data, info.width, info.height, 0);
    fs.writeFileSync(path.join(outputDir, 'frame_0.png'), frameBuf);
  } else {
    await extractFrames(inputPath, outputDir);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const entry = { status: 'completed', updated_at: new Date().toISOString(), path: outputDir };

  if (isReference) {
    manifest.reference = { ...manifest.reference, ...entry };
  } else {
    if (!manifest.rows[rowName]) {
      console.warn(`Warning: "${rowName}" not in manifest. Adding dynamically.`);
      manifest.rows[rowName] = { fps: 8, loop: true };
    }
    manifest.rows[rowName] = { ...manifest.rows[rowName], ...entry };
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Done → ${outputDir}`);
}

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (args.length < 3) {
  console.error('Usage: npx tsx skills/char-sprite/process.ts <CharName> <row_name|reference> <image_path>');
  process.exit(1);
}

processRow(args[0], args[1], args[2]).catch(console.error);
