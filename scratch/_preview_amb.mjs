import sharp from 'sharp';
const DIR = 'game_runs/ShadowAbyss/assets/svg';
const items = ['amb_tree_limbo_0', 'amb_tree_lust_0', 'amb_fog_limbo_0', 'amb_fog_lust_0', 'amb_wind_lust_0', 'amb_wind_lust_2'];
const CELL = 150, comps = [];
for (let i = 0; i < items.length; i++) {
  const png = await sharp(`${DIR}/${items[i]}.svg`, { density: 140 })
    .resize(CELL - 8, CELL - 8, { fit: 'contain', background: '#11141c' }).png().toBuffer();
  comps.push({ input: png, left: (i % 6) * CELL + 4, top: 4 });
}
await sharp({ create: { width: CELL * 6, height: CELL, channels: 4, background: '#11141c' } })
  .composite(comps).png().toFile('scratch/_amb_sheet.png');
console.log('ok');
