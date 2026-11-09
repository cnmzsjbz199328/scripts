import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = path.join(root, 'assets', 'bg');
const out = path.join(root, 'playtest', 'review', 'backgrounds.png');
const files = (await fs.readdir(assets)).filter((f) => f.endsWith('.webp')).sort();
const cellW = 420, imageH = 236, headH = 30, cellH = imageH + headH, gap = 8, cols = 4;
const rows = Math.ceil(files.length / cols), layers = [];
for (let i = 0; i < files.length; i++) {
  const file = files[i], x = (i % cols) * (cellW + gap), y = Math.floor(i / cols) * (cellH + gap);
  const thumb = await sharp(path.join(assets, file)).resize(cellW, imageH, { fit: 'cover' }).png().toBuffer();
  const label = Buffer.from(`<svg width="${cellW}" height="${headH}"><rect width="100%" height="100%" fill="#292827"/><text x="10" y="21" fill="white" font-family="Arial" font-size="16">${path.basename(file, '.webp')}</text></svg>`);
  layers.push({ input: thumb, left: x, top: y + headH }, { input: label, left: x, top: y });
}
await fs.mkdir(path.dirname(out), { recursive: true });
await sharp({ create: { width: cols * cellW + (cols - 1) * gap, height: rows * cellH + (rows - 1) * gap, channels: 3, background: '#c9c4bb' } })
  .composite(layers).jpeg({ quality: 90 }).toFile(out);
console.log(`Created ${path.relative(root, out)} from ${files.length} backgrounds`);
