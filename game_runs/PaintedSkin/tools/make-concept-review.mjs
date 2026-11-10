import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const raw = path.join(root, 'assets', 'concept', 'raw');
const out = path.join(root, 'playtest', 'review');
await fs.mkdir(out, { recursive: true });

async function tile(file, label, width, height, fit = 'contain') {
  const base = sharp({ create: { width, height, channels: 3, background: '#eeeae3' } });
  const layers = [];
  if (file) {
    const bytes = await sharp(path.join(raw, file)).resize(width - 12, height - 48, {
      fit,
      background: '#eeeae3',
    }).png().toBuffer();
    layers.push({ input: bytes, left: 6, top: 38 });
  }
  layers.push({ input: Buffer.from(`<svg width="${width}" height="32"><rect width="100%" height="100%" fill="#292827"/><text x="12" y="22" fill="white" font-family="Arial" font-size="18">${label}</text></svg>`), left: 0, top: 0 });
  return base.composite(layers).png().toBuffer();
}

const rows = [
  ['wang', ['wang_a.png', 'wang_b.png', 'wang_c.png']],
  ['chen', ['chen_a.png', 'chen_b.png', 'chen_c.png']],
  ['nv', ['nv_a.png', 'nv_b.png', 'nv_c.png']],
  ['gui', ['gui_a.png', 'gui_b.png', null]],
  ['dao', ['dao_a.png', 'dao_b.png', 'dao_c.png']],
  ['shen', ['shen_a.png', 'shen_b.png', null]],
];
const cw = 340, ch = 410, gap = 8;
const charLayers = [];
for (let row = 0; row < rows.length; row++) {
  for (let col = 0; col < 3; col++) {
    const [role, variants] = rows[row];
    charLayers.push({ input: await tile(variants[col], `${role}_${'abc'[col]}`, cw, ch), left: col * (cw + gap), top: row * (ch + gap) });
  }
}
await sharp({ create: { width: cw * 3 + gap * 2, height: ch * 6 + gap * 5, channels: 3, background: '#c9c4bb' } })
  .composite(charLayers).jpeg({ quality: 88 }).toFile(path.join(out, 'concept_chars.png'));

const sw = 520, sh = 322;
const styleLayers = [];
for (const [row, scene] of ['road', 'night'].entries()) {
  for (let col = 0; col < 3; col++) {
    styleLayers.push({ input: await tile(`st_${scene}_${'abc'[col]}.png`, `${scene}_${'abc'[col]}`, sw, sh, 'cover'), left: col * (sw + gap), top: row * (sh + gap) });
  }
}
await sharp({ create: { width: sw * 3 + gap * 2, height: sh * 2 + gap, channels: 3, background: '#c9c4bb' } })
  .composite(styleLayers).jpeg({ quality: 90 }).toFile(path.join(out, 'style_tests.png'));
console.log('Created playtest/review/concept_chars.png and style_tests.png');
