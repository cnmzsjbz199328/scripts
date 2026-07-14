import sharp from 'sharp';

async function bbox(path, w, h) {
  const img = w ? sharp(path).resize(w, h) : sharp(path);
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, maxX = -1, minY = info.height, maxY = -1;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (data[(y * info.width + x) * 4 + 3] > 40) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
  return { w: info.width, h: info.height, minX, maxX, minY, maxY, charH: maxY - minY + 1, charW: maxX - minX + 1, footY: maxY };
}

const samurai = await bbox('game_runs/ShadowArena/assets/3d/samurai_bare_idle_0.png');
console.log('samurai bare_idle_0 (192x208):', JSON.stringify(samurai));
const ninja = await bbox('game_runs/ShadowArena/assets/svg/ninja_idle_0.svg', 236, 188);
console.log('ninja idle_0 (rasterized 236x188):', JSON.stringify(ninja));
const monk = await bbox('game_runs/ShadowArena/assets/svg/monk_idle_0.svg', 236, 188);
console.log('monk idle_0:', JSON.stringify(monk));
