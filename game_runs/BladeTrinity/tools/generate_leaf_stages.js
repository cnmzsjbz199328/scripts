import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const leavesDir = 'C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/BladeTrinity/assets/leaves';

const speciesList = ['maple', 'oak', 'ginkgo'];

async function processLeaf(species) {
  const baseJpgPath = path.join(leavesDir, `${species}.jpg`);
  
  // 1. 读取原图 (Stage 0 Base Reference)
  const image = sharp(baseJpgPath);
  const metadata = await image.metadata();
  const W = metadata.width || 512;
  const H = metadata.height || 512;

  // 转换为 RGBA 提取黑色背景为透明
  const rawBuffer = await image.ensureAlpha().raw().toBuffer();
  const pixelCount = W * H;

  // 创建 Stage 0 (完整原图扣图)
  const stage0Data = Buffer.from(rawBuffer);
  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    const r = stage0Data[idx];
    const g = stage0Data[idx + 1];
    const b = stage0Data[idx + 2];
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    if (brightness < 40) {
      stage0Data[idx + 3] = Math.max(0, Math.floor((brightness - 10) * 7));
    }
  }

  const stage0PngBuffer = await sharp(stage0Data, {
    raw: { width: W, height: H, channels: 4 }
  }).png().toBuffer();

  const stage0Path = path.join(leavesDir, `${species}_0.png`);
  await fs.promises.writeFile(stage0Path, stage0PngBuffer);
  console.log(`Created continuous Stage 0: ${species}_0.png`);

  // 2. 创建 Stage 1 (精确在原参考图上切割出 1~2 道斜向剑气斩痕)
  const slashMaskSvgStage1 = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="blur">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
      </defs>
      <!-- 第一道剑气斜向切痕 -->
      <polygon points="${W*0.18},${H*0.25} ${W*0.82},${H*0.72} ${W*0.85},${H*0.68} ${W*0.21},${H*0.21}" fill="black" />
      <!-- 第二道小割口 -->
      <polygon points="${W*0.45},${H*0.15} ${W*0.75},${H*0.42} ${W*0.77},${H*0.39} ${W*0.47},${H*0.12}" fill="black" />
      <!-- 破洞裂痕 -->
      <ellipse cx="${W*0.52}" cy="${H*0.48}" rx="${W*0.04}" ry="${H*0.06}" fill="black" transform="rotate(-25, ${W*0.52}, ${H*0.48})" />
    </svg>
  `;

  const stage1PngBuffer = await sharp(stage0PngBuffer)
    .composite([{
      input: Buffer.from(slashMaskSvgStage1),
      blend: 'dest-out'
    }])
    .png()
    .toBuffer();

  const stage1Path = path.join(leavesDir, `${species}_1.png`);
  await fs.promises.writeFile(stage1Path, stage1PngBuffer);
  console.log(`Created continuous Stage 1 (Torn): ${species}_1.png`);

  // 3. 创建 Stage 2 (在 Stage 1 基础上有更多交错剑气残缺与火蚀碎洞)
  const slashMaskSvgStage2 = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <!-- 第一、二道斩痕 -->
      <polygon points="${W*0.18},${H*0.25} ${W*0.82},${H*0.72} ${W*0.85},${H*0.68} ${W*0.21},${H*0.21}" fill="black" />
      <polygon points="${W*0.45},${H*0.15} ${W*0.75},${H*0.42} ${W*0.77},${H*0.39} ${W*0.47},${H*0.12}" fill="black" />
      <!-- 反向交叉剑气斩痕 (Cross Slash) -->
      <polygon points="${W*0.78},${H*0.22} ${W*0.22},${H*0.78} ${W*0.25},${H*0.82} ${W*0.81},${H*0.26}" fill="black" />
      <!-- 边缘剥落与剧烈缺口 -->
      <circle cx="${W*0.3}" cy="${H*0.3}" r="${W*0.12}" fill="black" />
      <circle cx="${W*0.7}" cy="${H*0.65}" r="${W*0.1}" fill="black" />
      <ellipse cx="${W*0.5}" cy="${H*0.5}" rx="${W*0.1}" ry="${H*0.12}" fill="black" />
    </svg>
  `;

  const stage2PngBuffer = await sharp(stage0PngBuffer)
    .composite([{
      input: Buffer.from(slashMaskSvgStage2),
      blend: 'dest-out'
    }])
    .png()
    .toBuffer();

  const stage2Path = path.join(leavesDir, `${species}_2.png`);
  await fs.promises.writeFile(stage2Path, stage2PngBuffer);
  console.log(`Created continuous Stage 2 (Shattered): ${species}_2.png`);
}

async function main() {
  for (const sp of speciesList) {
    await processLeaf(sp);
  }
  console.log('All 3x3 continuous leaf stages generated successfully!');
}

main().catch(console.error);
