import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const leavesDir = 'C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/BladeTrinity/assets/leaves';
const objectRunsDir = 'C:/Users/tj169/Flinders/work/Learning/scripts/object_runs';
const artifactsDir = 'C:/Users/tj169/.gemini/antigravity-cli/brain/60fed7e2-2691-473f-8fb1-c87d76b9179b';

const speciesList = ['maple', 'oak', 'ginkgo'];

const CELL_SIZE = 192;
const GRID_SIZE = CELL_SIZE * 3; // 576x576

// 产生有机气流磨损与边缘侵蚀 Mask
async function createAirErosionMask(width, height, stage) {
  if (stage === 0) {
    return Buffer.from(`<svg width="${width}" height="${height}"></svg>`);
  }
  if (stage === 8) {
    return Buffer.from(`<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="black" /></svg>`);
  }

  // 磨损半径与侵蚀强度 (Stage 1..7 逐渐从边缘向中心磨损)
  const erosionFactor = stage / 8.0; // 0.125 to 0.875
  const centerRadius = (width / 2) * (1.1 - erosionFactor * 0.95);

  // 构建多孔边缘气流剥落 SVG 遮罩
  let holesSvg = '';
  const holeCount = Math.floor(stage * 6);
  for (let i = 0; i < holeCount; i++) {
    const angle = (i / holeCount) * Math.PI * 2 + stage * 0.7;
    const r = centerRadius * (0.6 + Math.sin(i * 3.5) * 0.35);
    const hx = width / 2 + Math.cos(angle) * r;
    const hy = height / 2 + Math.sin(angle) * r;
    const holeRadius = Math.random() * 8 + stage * 2;
    holesSvg += `<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="${holeRadius.toFixed(1)}" fill="black" />`;
  }

  // 外部环形切削 (Outer Boundary Air Erosion Ring)
  const ringInner = Math.max(10, centerRadius);
  const maskSvg = `
    <svg width="${width}" height="${height}">
      <defs>
        <mask id="erodeMask">
          <rect width="${width}" height="${height}" fill="white" />
          <!-- 边缘渐进圆环消融 -->
          <circle cx="${width/2}" cy="${height/2}" r="${width}" fill="white" />
          <circle cx="${width/2}" cy="${height/2}" r="${ringInner.toFixed(1)}" fill="black" />
          ${holesSvg}
        </mask>
      </defs>
      <!-- 黑色区域将被切除 (destination-out) -->
      <rect width="${width}" height="${height}" fill="black" mask="url(#erodeMask)" />
    </svg>
  `;

  return Buffer.from(maskSvg);
}

async function createSkillGrid(species) {
  const baseJpgPath = path.join(leavesDir, `${species}.jpg`);
  const image = sharp(baseJpgPath);
  const metadata = await image.metadata();
  const W = metadata.width || 512;
  const H = metadata.height || 512;

  // 1. 提取基准叶片扣图 Buffer
  const rawBuffer = await image.ensureAlpha().raw().toBuffer();
  const pixelCount = W * H;
  const baseLeafData = Buffer.from(rawBuffer);

  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    const r = baseLeafData[idx], g = baseLeafData[idx + 1], b = baseLeafData[idx + 2];
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    if (brightness < 40) {
      baseLeafData[idx + 3] = 0; // 扣除黑背景
    }
  }

  const baseLeafPng = await sharp(baseLeafData, {
    raw: { width: W, height: H, channels: 4 }
  }).resize(CELL_SIZE, CELL_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();

  // 2. 逐帧生成边缘气流磨损帧
  const frameBuffers = [];

  for (let stage = 0; stage < 9; stage++) {
    if (stage === 8) {
      const emptyCell = await sharp({
        create: { width: CELL_SIZE, height: CELL_SIZE, channels: 4, background: { r: 0, g: 255, b: 0, alpha: 1 } }
      }).png().toBuffer();
      frameBuffers.push(emptyCell);
      continue;
    }

    const maskBuffer = await createAirErosionMask(CELL_SIZE, CELL_SIZE, stage);

    // 单元格底色纯绿 #00FF00
    const cellBase = await sharp({
      create: { width: CELL_SIZE, height: CELL_SIZE, channels: 4, background: { r: 0, g: 255, b: 0, alpha: 1 } }
    }).png().toBuffer();

    // 在叶片原图上应用边缘风化磨损 Mask
    const erodedLeaf = await sharp(baseLeafPng)
      .composite([{ input: maskBuffer, blend: 'dest-out' }])
      .png().toBuffer();

    const cellFinal = await sharp(cellBase)
      .composite([{ input: erodedLeaf, left: 0, top: 0 }])
      .png().toBuffer();

    frameBuffers.push(cellFinal);
  }

  // 3. 拼合 3x3 (576x576) 绿幕网格图 (纯绿 #00FF00 + 深绿分隔线 #006600)
  const composites = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const idx = r * 3 + c;
      composites.push({
        input: frameBuffers[idx],
        left: c * CELL_SIZE,
        top: r * CELL_SIZE
      });
    }
  }

  const gridLinesSvg = `
    <svg width="${GRID_SIZE}" height="${GRID_SIZE}">
      <line x1="${CELL_SIZE}" y1="0" x2="${CELL_SIZE}" y2="${GRID_SIZE}" stroke="#006600" stroke-width="2" />
      <line x1="${CELL_SIZE*2}" y1="0" x2="${CELL_SIZE*2}" y2="${GRID_SIZE}" stroke="#006600" stroke-width="2" />
      <line x1="0" y1="${CELL_SIZE}" x2="${GRID_SIZE}" y2="${CELL_SIZE}" stroke="#006600" stroke-width="2" />
      <line x1="0" y1="${CELL_SIZE*2}" x2="${GRID_SIZE}" y2="${CELL_SIZE*2}" stroke="#006600" stroke-width="2" />
    </svg>
  `;

  composites.push({ input: Buffer.from(gridLinesSvg), left: 0, top: 0 });

  const gridFinal = await sharp({
    create: { width: GRID_SIZE, height: GRID_SIZE, channels: 4, background: { r: 0, g: 255, b: 0, alpha: 1 } }
  })
    .composite(composites)
    .png().toBuffer();

  const gridOutPath = path.join(objectRunsDir, `leaf_${species}`, 'grid_3x3.png');
  await fs.promises.writeFile(gridOutPath, gridFinal);

  // 同时复制一份到 assets 和 artifacts 目录供检查
  fs.copyFileSync(gridOutPath, path.join(leavesDir, `grid_3x3_${species}.png`));
  fs.copyFileSync(gridOutPath, path.join(artifactsDir, `grid_3x3_${species}.png`));

  console.log(`Generated air erosion 3x3 grid: ${gridOutPath}`);
}

async function main() {
  for (const sp of speciesList) {
    await createSkillGrid(sp);
  }
}

main().catch(console.error);
