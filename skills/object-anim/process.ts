/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const CHROMA_THRESHOLD = 110;
const CELL_PADDING = 4;
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

    components.push({
      pixels, area: pixels.length,
      minX, minY, maxX: maxX + 1, maxY: maxY + 1,
      centerX: (minX + maxX + 1) / 2,
    });
  }
  return components;
}

function groupIntoFrames(components: Component[], frameCount: number): Component[][] | null {
  if (!components.length) return null;

  const largest = Math.max(...components.map(c => c.area));
  const seedMin = Math.max(80, largest * 0.15);
  let seeds = components.filter(c => c.area >= seedMin);
  if (seeds.length < frameCount)
    seeds = [...components].sort((a, b) => b.area - a.area).slice(0, frameCount);
  if (seeds.length < frameCount) return null;

  seeds = [...seeds]
    .sort((a, b) => b.area - a.area)
    .slice(0, frameCount);

  seeds.sort((a, b) => {
    const yDist = Math.abs(a.minY - b.minY);
    if (yDist > 50) return a.minY - b.minY;
    return a.centerX - b.centerX;
  });

  const seedSet = new Set(seeds);
  const groups: Component[][] = seeds.map(s => [s]);
  const noiseMin = Math.max(8, largest * 0.001);

  for (const c of components) {
    if (seedSet.has(c) || c.area < noiseMin) continue;
    let best = 0;
    for (let i = 1; i < seeds.length; i++) {
      if (Math.abs(seeds[i].centerX - c.centerX) < Math.abs(seeds[best].centerX - c.centerX))
        best = i;
    }
    groups[best].push(c);
  }
  return groups;
}

async function fitCropToCell(
  cropBuf: Buffer, cropW: number, cropH: number, frameSize: number
): Promise<Buffer> {
  const maxContent = frameSize - CELL_PADDING * 2;

  const resized = await sharp(cropBuf, { raw: { width: cropW, height: cropH, channels: 4 } })
    .trim()
    .resize(maxContent, maxContent, { fit: 'inside', withoutEnlargement: true, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  return sharp({ create: { width: frameSize, height: frameSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toBuffer();
}

async function renderGroupAsFrame(
  data: Buffer, imgWidth: number, group: Component[], frameSize: number
): Promise<Buffer> {
  const minX = Math.min(...group.map(c => c.minX));
  const minY = Math.min(...group.map(c => c.minY));
  const maxX = Math.max(...group.map(c => c.maxX));
  const maxY = Math.max(...group.map(c => c.maxY));
  const cropW = maxX - minX, cropH = maxY - minY;

  const cropBuf = Buffer.alloc(cropW * cropH * 4, 0);
  for (const comp of group) {
    for (const idx of comp.pixels) {
      const x = idx % imgWidth - minX;
      const y = Math.floor(idx / imgWidth) - minY;
      const src = idx * 4, dst = (y * cropW + x) * 4;
      cropBuf[dst]   = data[src];   cropBuf[dst+1] = data[src+1];
      cropBuf[dst+2] = data[src+2]; cropBuf[dst+3] = data[src+3];
    }
  }

  return fitCropToCell(cropBuf, cropW, cropH, frameSize);
}

async function renderSlotAsFrame(
  data: Buffer, imgWidth: number, imgHeight: number,
  slotIdx: number, gridCols: number, gridRows: number, frameSize: number
): Promise<Buffer> {
  const slotW = imgWidth / gridCols;
  const slotH = imgHeight / gridRows;
  const col = slotIdx % gridCols;
  const row = Math.floor(slotIdx / gridCols);

  const left = Math.round(col * slotW) + GRID_PADDING;
  const top  = Math.round(row * slotH) + GRID_PADDING;
  const w    = Math.round((col + 1) * slotW) - left - GRID_PADDING;
  const h    = Math.round((row + 1) * slotH) - top - GRID_PADDING;

  const slotBuf = Buffer.alloc(w * h * 4, 0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const src = (((top + y) * imgWidth) + left + x) * 4;
      const dst = (y * w + x) * 4;
      if (src >= 0 && src <= data.length - 4) {
        slotBuf[dst]   = data[src];   slotBuf[dst+1] = data[src+1];
        slotBuf[dst+2] = data[src+2]; slotBuf[dst+3] = data[src+3];
      }
    }
  }

  return fitCropToCell(slotBuf, w, h, frameSize);
}

async function extractFrames(
  inputPath: string, outputDir: string, frameCount: number, gridCols: number, gridRows: number, frameSize: number
): Promise<void> {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  applyChromaKey(data);

  const components = findComponents(data, info.width, info.height);
  const groups = groupIntoFrames(components, frameCount);
  const method = groups ? 'components' : 'slots';
  console.log(`  extraction method: ${method}`);

  for (let i = 0; i < frameCount; i++) {
    const frameBuf = groups
      ? await renderGroupAsFrame(data, info.width, groups[i], frameSize)
      : await renderSlotAsFrame(data, info.width, info.height, i, gridCols, gridRows, frameSize);

    fs.writeFileSync(path.join(outputDir, `frame_${i}.png`), frameBuf);
  }
}

async function processObject(objectName: string, inputPath: string) {
  const runDir = path.join('./object_runs', objectName);
  const manifestPath = path.join(runDir, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.error(`Object not initialized. Run: npx tsx object-prepare.ts ${objectName}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const { frameCount, frameSize, gridLayout } = manifest;
  const [gridCols, gridRows] = gridLayout.split('x').map(Number);

  const framesDir = path.join(runDir, 'frames');
  console.log(`Processing ${objectName} (${frameCount} frames, ${gridLayout} grid)...`);
  await extractFrames(inputPath, framesDir, frameCount, gridCols, gridRows, frameSize);

  manifest.animation = {
    status: 'completed',
    updated_at: new Date().toISOString(),
    source: inputPath,
    path: framesDir,
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Frames saved to ${framesDir}`);
}

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: npx tsx object-process.ts <ObjectName> <image_path>');
  process.exit(1);
}

processObject(args[0], args[1]).catch(console.error);
