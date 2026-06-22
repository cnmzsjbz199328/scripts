import fs from 'fs'; import path from 'path'; import sharp from 'sharp';
const DIR = 'game_runs/ShadowArena/assets/svg';
for (const who of ['samurai', 'ninja']) {
  const files = fs.readdirSync(DIR)
    .filter(f => f.startsWith(`${who}_punch_`) && f.endsWith('.svg'))
    .sort((a, b) => (+a.match(/\d+/)) - (+b.match(/\d+/)));
  const W = 150, H = 130;
  const tiles = await Promise.all(files.map(f =>
    sharp(path.join(DIR, f)).resize(W, H, { fit: 'contain', background: '#eef2f7' }).png().toBuffer()));
  await sharp({ create: { width: W * files.length, height: H, channels: 4, background: '#eef2f7' } })
    .composite(tiles.map((b, i) => ({ input: b, left: i * W, top: 0 })))
    .png().toFile(`scratch/punch_ref_${who}.png`);
  console.log(who, files.length, 'frames');
}
