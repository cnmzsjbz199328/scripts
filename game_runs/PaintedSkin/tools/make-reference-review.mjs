import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const raw = path.join(root, 'assets', 'refs', 'raw');
const out = path.join(root, 'playtest', 'review', 'reference_sheets.png');
const ids = ['wang', 'chen', 'nv', 'gui', 'dao', 'shen'];
const cellW = 620, imageH = 349, headerH = 32, cellH = imageH + headerH, gap = 8;
const layers = [];
for (let i = 0; i < ids.length; i++) {
  const id = ids[i];
  const sheet = await sharp(path.join(raw, `rs_${id}.png`)).resize(cellW, imageH, { fit: 'cover' }).png().toBuffer();
  const label = Buffer.from(`<svg width="${cellW}" height="${headerH}"><rect width="100%" height="100%" fill="#292827"/><text x="12" y="22" fill="white" font-family="Arial" font-size="18">rs_${id}</text></svg>`);
  const x = (i % 3) * (cellW + gap), y = Math.floor(i / 3) * (cellH + gap);
  layers.push({ input: sheet, left: x, top: y + headerH });
  layers.push({ input: label, left: x, top: y });
}
await fs.mkdir(path.dirname(out), { recursive: true });
await sharp({ create: { width: cellW * 3 + gap * 2, height: cellH * 2 + gap, channels: 3, background: '#c9c4bb' } })
  .composite(layers).jpeg({ quality: 90 }).toFile(out);
console.log(`Created ${path.relative(root, out)}`);
