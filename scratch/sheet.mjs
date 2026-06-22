import fs from 'fs'; import path from 'path'; import sharp from 'sharp';
// 用法: node scratch/sheet.mjs <act> <char1,char2,...>
const act = process.argv[2] || 'punch';
const chars = (process.argv[3] || 'samurai,ninja').split(',');
const DIR = 'game_runs/ShadowArena/assets/svg';
for (const who of chars) {
  const files = fs.readdirSync(DIR)
    .filter(f => f.startsWith(`${who}_${act}_`) && f.endsWith('.svg'))
    .sort((a, b) => (+a.match(/\d+/)) - (+b.match(/\d+/)));
  const W = 150, H = 150;
  const tiles = await Promise.all(files.map(f =>
    sharp(path.join(DIR, f)).resize(W, H, { fit: 'contain', background: '#eef2f7' }).png().toBuffer()));
  await sharp({ create: { width: W * files.length, height: H, channels: 4, background: '#eef2f7' } })
    .composite(tiles.map((b, i) => ({ input: b, left: i * W, top: 0 })))
    .png().toFile(`scratch/sheet_${act}_${who}.png`);
  console.log(act, who, files.length, 'frames');
}
