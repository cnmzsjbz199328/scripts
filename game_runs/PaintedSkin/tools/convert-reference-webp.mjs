import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = path.join(root, 'assets', 'refs', 'raw');
const output = path.join(root, 'art', 'refs');
await fs.mkdir(output, { recursive: true });
const files = (await fs.readdir(input)).filter((name) => name.endsWith('.png')).sort();
for (const name of files) {
  await sharp(path.join(input, name)).webp({ quality: 86, effort: 5 }).toFile(path.join(output, `${path.basename(name, '.png')}.webp`));
}
console.log(`Converted ${files.length} reference images to art/refs/*.webp`);
