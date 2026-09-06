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

interface SilhouetteResult {
  removedPixels: number;
  keptPixels: number;
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

// Remove the narrow anti-aliased green halo that remains just inside the
// silhouette after the hard chroma key. The neighborhood check keeps this
// targeted to background-facing edge pixels, so green costume/hair areas
// farther inside the character remain intact.
function removeGreenEdgeSpill(data: Buffer, width: number, height: number): void {
  const alpha = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) alpha[i] = data[i * 4 + 3];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (alpha[idx] <= 16) continue;
      const i = idx * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const dist = chromaDist(r, g, b);
      const greenSpill = dist > CHROMA_THRESHOLD && dist <= 420 &&
        g > r * 1.10 && g > b * 1.10 && r < 240 && b < 240;
      if (!greenSpill) continue;

      let touchesTransparent = false;
      for (let oy = -12; oy <= 12 && !touchesTransparent; oy++) {
        const ny = y + oy;
        if (ny < 0 || ny >= height) continue;
        for (let ox = -12; ox <= 12; ox++) {
          const nx = x + ox;
          if (nx < 0 || nx >= width) continue;
          if (alpha[ny * width + nx] <= 16) { touchesTransparent = true; break; }
        }
      }
      if (touchesTransparent) data[i + 3] = 0;
    }
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

function bboxGap(a: Component, b: Component): number {
  const dx = a.maxX < b.minX ? b.minX - a.maxX : b.maxX < a.minX ? a.minX - b.maxX : 0;
  const dy = a.maxY < b.minY ? b.minY - a.maxY : b.maxY < a.minY ? a.minY - b.maxY : 0;
  return Math.max(dx, dy);
}

/** Keep the character silhouette and nearby, meaningful body fragments only. */
function keepMainSilhouette(data: Buffer, width: number, height: number): SilhouetteResult {
  const components = findComponents(data, width, height);
  if (components.length <= 1) {
    return { removedPixels: 0, keptPixels: components[0]?.area ?? 0 };
  }

  const main = components.reduce((largest, current) => current.area > largest.area ? current : largest);
  const keep = new Set<Component>([main]);
  for (const component of components) {
    if (component === main) continue;
    if (component.area >= main.area * 0.08 && bboxGap(component, main) <= 12) {
      keep.add(component);
    }
  }

  let removedPixels = 0;
  let keptPixels = 0;
  for (const component of components) {
    if (keep.has(component)) {
      keptPixels += component.area;
      continue;
    }
    removedPixels += component.area;
    for (const idx of component.pixels) data[idx * 4 + 3] = 0;
  }
  return { removedPixels, keptPixels };
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
  return fitCropToCell(cropBuf, cropW, cropH, true, false);
}

async function renderSlotAsFrame(data: Buffer, imgWidth: number, imgHeight: number, slotIdx: number): Promise<{ frame: Buffer; silhouette: SilhouetteResult }> {
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
  const silhouette = keepMainSilhouette(slotBuf, w, h);
  const frame = await fitCropToCell(slotBuf, w, h, true, true);
  return { frame, silhouette };
}

async function fitCropToCell(cropBuf: Buffer, cropW: number, cropH: number, useTrim: boolean, bottomAlign: boolean): Promise<Buffer> {
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

  let cleanedResized = resized;
  if (bottomAlign) {
    const { data: resizedData, info: resizedInfo } = await sharp(resized)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    removeGreenEdgeSpill(resizedData, resizedInfo.width, resizedInfo.height);
    cleanedResized = await sharp(resizedData, {
      raw: { width: resizedInfo.width, height: resizedInfo.height, channels: 4 }
    }).png().toBuffer();
  }

  const resizedMeta = await sharp(cleanedResized).metadata();
  const resizedW = resizedMeta.width ?? 0;
  const resizedH = resizedMeta.height ?? 0;
  const left = Math.round((FRAME_WIDTH - resizedW) / 2);
  const top = bottomAlign
    ? FRAME_HEIGHT - CELL_PADDING - resizedH
    : Math.round((FRAME_HEIGHT - resizedH) / 2);

  return sharp({ create: { width: FRAME_WIDTH, height: FRAME_HEIGHT, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: cleanedResized, left, top }])
    .png()
    .toBuffer();
}

async function extractFrames(charName: string, rowName: string, inputPath: string, outputDir: string): Promise<boolean> {
  fs.mkdirSync(outputDir, { recursive: true });

  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  applyChromaKey(data);
  removeGreenEdgeSpill(data, info.width, info.height);

  const components = findComponents(data, info.width, info.height);
  // Always try BFS grouping for single rows; fall back to slots if it fails
  // For 3x3 grids, slot-based extraction preserves cell alignment, feet baseline, and detached magic effects
  const useSlots = true;
  console.log(`  extraction method: ${useSlots ? 'slots' : 'components'}`);
  let warned = false;

  for (let i = 0; i < FRAME_COUNT; i++) {
    const { frame, silhouette } = await renderSlotAsFrame(data, info.width, info.height, i);
    if (silhouette.removedPixels > silhouette.keptPixels * 0.03) {
      warned = true;
      console.warn(`${charName}/${rowName}/frame_${i} STRAY-REMOVED ${silhouette.removedPixels}px`);
    }
    fs.writeFileSync(path.join(outputDir, `frame_${i}.png`), frame);
  }
  return warned;
}

async function processRow(charName: string, rowName: string, inputPath: string) {
  const runDir = path.join('./char_runs', charName);
  const manifestPath = path.join(runDir, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.error(`Manifest not found. Run prepare first: npx tsx skills/char-sprite/prepare.ts ${charName}`);
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

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
    removeGreenEdgeSpill(data, info.width, info.height);
    const components = findComponents(data, info.width, info.height);
    const groups = groupIntoFrames(components, 1);
    const frameBuf = groups
      ? await renderGroupAsFrame(data, info.width, info.height, groups[0])
      : (await renderSlotAsFrame(data, info.width, info.height, 0)).frame;
    fs.writeFileSync(path.join(outputDir, 'frame_0.png'), frameBuf);
  } else {
    const strayRemoved = await extractFrames(charName, rowName, inputPath, outputDir);
    if (strayRemoved) {
      manifest.rows[rowName] = { ...(manifest.rows[rowName] ?? {}), review: 'stray-removed' };
    }
  }

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
