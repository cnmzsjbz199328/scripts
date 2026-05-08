/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const FRAME_WIDTH = 192;
const FRAME_HEIGHT = 208;
const STRIP_COLUMNS = 9;
// Euclidean RGB distance threshold for chroma key removal (matches OpenAI default: 96)
const CHROMA_THRESHOLD = 110;
const CELL_PADDING = 5;

interface Component {
  pixels: number[];
  area: number;
  minX: number; minY: number; maxX: number; maxY: number;
  centerX: number;
}

// Euclidean distance from #00FF00
function chromaDist(r: number, g: number, b: number): number {
  return Math.sqrt(r * r + (g - 255) ** 2 + b * b);
}

function applyChromaKey(data: Buffer): void {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const isPureGreen = chromaDist(r, g, b) <= CHROMA_THRESHOLD;
    const isWhite = r > 240 && g > 240 && b > 240;
    
    // Catch dark green grid lines: G is dominant, and R/B are low
    const isDarkGreen = g > r * 1.4 && g > b * 1.4 && r < 100 && b < 100;
    
    if (isPureGreen || isWhite || isDarkGreen) data[i + 3] = 0;
  }
}

// BFS connected components on the alpha channel
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

// Group components into N frames: find N seed components, attach noise to nearest seed
function groupIntoFrames(components: Component[], frameCount: number): Component[][] | null {
  if (!components.length) return null;

  const largest = Math.max(...components.map(c => c.area));
  const seedMin = Math.max(120, largest * 0.2);
  let seeds = components.filter(c => c.area >= seedMin);
  if (seeds.length < frameCount)
    seeds = [...components].sort((a, b) => b.area - a.area).slice(0, frameCount);
  if (seeds.length < frameCount) return null;

  // Pick top-N by area, then sort into grid (top-to-bottom rows, left-to-right within rows)
  seeds = [...seeds]
    .sort((a, b) => b.area - a.area)
    .slice(0, frameCount);

  seeds.sort((a, b) => {
    const yDist = Math.abs(a.minY - b.minY);
    if (yDist > 50) return a.minY - b.minY; // Different rows
    return a.centerX - b.centerX; // Same row
  });

  const seedSet = new Set(seeds);
  const groups: Component[][] = seeds.map(s => [s]);
  const noiseMin = Math.max(12, largest * 0.002);

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

// Build a 192×208 PNG from a group of components
async function renderGroupAsFrame(
  data: Buffer, imgWidth: number, _imgHeight: number,
  group: Component[]
): Promise<Buffer> {
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
      cropBuf[dst]   = data[src];   cropBuf[dst+1] = data[src+1];
      cropBuf[dst+2] = data[src+2]; cropBuf[dst+3] = data[src+3];
    }
  }

  return fitCropToCell(cropBuf, cropW, cropH, true);
}

// Build a 192×208 PNG from a fixed-width slot (fallback)
async function renderSlotAsFrame(
  data: Buffer, imgWidth: number, imgHeight: number,
  slotIdx: number, frameCount: number
): Promise<Buffer> {
  const isGrid = frameCount === 9;
  const gridCols = isGrid ? 3 : frameCount;
  const gridRows = isGrid ? 3 : 1;
  const GRID_PADDING = 3; // Safely cut off grid lines with prompt-based margin
  
  const slotW = imgWidth / gridCols;
  const slotH = imgHeight / gridRows;
  
  const col = slotIdx % gridCols;
  const row = Math.floor(slotIdx / gridCols);
  
  const left = Math.round(col * slotW) + GRID_PADDING;
  const top = Math.round(row * slotH) + GRID_PADDING;
  const w = Math.round((col + 1) * slotW) - left - GRID_PADDING;
  const h = Math.round((row + 1) * slotH) - top - GRID_PADDING;

  const slotBuf = Buffer.alloc(w * h * 4, 0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Force 1-pixel transparent border to kill any slicing edge artifacts
      if (x === 0 || x === w - 1 || y === 0 || y === h - 1) continue;

      const src = (((top + y) * imgWidth) + left + x) * 4;
      const dst = (y * w + x) * 4;
      if (src >= 0 && src < data.length - 3) {
        slotBuf[dst]   = data[src];   slotBuf[dst+1] = data[src+1];
        slotBuf[dst+2] = data[src+2]; slotBuf[dst+3] = data[src+3];
      }
    }
  }

  return fitCropToCell(slotBuf, w, h, false); // Disable trim for slots to maintain scale
}

// Scale crop to fit within (FRAME_WIDTH - 2*pad) × (FRAME_HEIGHT - 2*pad), center in cell
async function fitCropToCell(cropBuf: Buffer, cropW: number, cropH: number, useTrim: boolean): Promise<Buffer> {
  const maxW = FRAME_WIDTH  - CELL_PADDING * 2;
  const maxH = FRAME_HEIGHT - CELL_PADDING * 2;
  const scale = Math.min(maxW / cropW, maxH / cropH, 1.0);
  const sw = Math.max(1, Math.round(cropW * scale));
  const sh = Math.max(1, Math.round(cropH * scale));

  let pipeline = sharp(cropBuf, { raw: { width: cropW, height: cropH, channels: 4 } });
  if (useTrim) pipeline = pipeline.trim();
  
  const resized = await pipeline
    .resize(sw, sh, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const left = Math.floor((FRAME_WIDTH  - sw) / 2);
  const top  = Math.floor((FRAME_HEIGHT - sh) / 2);

  return sharp({
    create: { width: FRAME_WIDTH, height: FRAME_HEIGHT, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([{ input: resized, left, top }])
    .png()
    .toBuffer();
}

async function extractFrames(inputPath: string, outputDir: string, columns: number): Promise<void> {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  applyChromaKey(data);

  // For 9-frame grids, prefer equal slots to maintain consistent scale and handle noise
  const components = findComponents(data, info.width, info.height);
  const groups = columns === 9 ? null : groupIntoFrames(components, columns);
  const method = groups ? 'components' : 'slots';
  console.log(`  extraction method: ${method}`);

  for (let i = 0; i < columns; i++) {
    const frameBuf = groups
      ? await renderGroupAsFrame(data, info.width, info.height, groups[i])
      : await renderSlotAsFrame(data, info.width, info.height, i, columns);

    fs.writeFileSync(path.join(outputDir, `frame_${i}.png`), frameBuf);
  }
}

async function processRow(petName: string, rowName: string, inputPath: string) {
  const runDir = path.join('./pet_runs', petName);
  const manifestPath = path.join(runDir, 'manifest.json');

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
  console.log(`${rowName} saved to ${outputDir}`);
}

const args = process.argv.slice(2);
if (args.length < 3) {
  console.error("Usage: npx tsx process.ts <pet_name> <row_name> <image_path>");
  process.exit(1);
}

processRow(args[0], args[1], args[2]).catch(console.error);
