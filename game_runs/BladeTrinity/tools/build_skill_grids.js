import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const leavesDir = 'C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/BladeTrinity/assets/leaves';
const objectRunsDir = 'C:/Users/tj169/Flinders/work/Learning/scripts/object_runs';

const speciesList = ['maple', 'oak', 'ginkgo'];

const CELL_SIZE = 192;
const GRID_SIZE = CELL_SIZE * 3; // 576x576

async function createSkillGrid(species) {
  const baseJpgPath = path.join(leavesDir, `${species}.jpg`);
  const image = sharp(baseJpgPath);
  const metadata = await image.metadata();
  const W = metadata.width || 512;
  const H = metadata.height || 512;

  // 1. 提取基准叶片扣图 Buffer (尺寸为 CELL_SIZE x CELL_SIZE)
  const rawBuffer = await image.ensureAlpha().raw().toBuffer();
  const pixelCount = W * H;
  const baseLeafData = Buffer.from(rawBuffer);

  for (let i = 0; i < pixelCount; i++) {
    const idx = i * 4;
    const r = baseLeafData[idx], g = baseLeafData[idx + 1], b = baseLeafData[idx + 2];
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    if (brightness < 40) {
      baseLeafData[idx + 3] = 0; // 透明化黑背景
    }
  }

  const baseLeafPng = await sharp(baseLeafData, {
    raw: { width: W, height: H, channels: 4 }
  }).resize(CELL_SIZE, CELL_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();

  // 2. 生成 9 帧渐变图层 Buffers
  const frameBuffers = [];

  for (let frameIndex = 0; frameIndex < 9; frameIndex++) {
    if (frameIndex === 8) {
      // 第 9 帧：全空白
      const emptyCell = await sharp({
        create: { width: CELL_SIZE, height: CELL_SIZE, channels: 4, background: { r: 0, g: 255, b: 0, alpha: 1 } }
      }).png().toBuffer();
      frameBuffers.push(emptyCell);
      continue;
    }

    let maskSvg = '';

    if (frameIndex === 0) {
      maskSvg = `<svg width="${CELL_SIZE}" height="${CELL_SIZE}"></svg>`;
    } else if (frameIndex === 1) {
      maskSvg = `<svg width="${CELL_SIZE}" height="${CELL_SIZE}"><polygon points="30,50 160,140 165,133 35,43" fill="black" /></svg>`;
    } else if (frameIndex === 2) {
      maskSvg = `<svg width="${CELL_SIZE}" height="${CELL_SIZE}"><polygon points="30,50 160,140 165,133 35,43" fill="black" /><circle cx="140" cy="40" r="28" fill="black" /></svg>`;
    } else if (frameIndex === 3) {
      maskSvg = `<svg width="${CELL_SIZE}" height="${CELL_SIZE}"><polygon points="30,50 160,140 165,133 35,43" fill="black" /><polygon points="60,20 150,110 155,103 65,13" fill="black" /><circle cx="140" cy="40" r="28" fill="black" /></svg>`;
    } else if (frameIndex === 4) {
      maskSvg = `<svg width="${CELL_SIZE}" height="${CELL_SIZE}"><polygon points="10,80 180,100 180,115 10,95" fill="black" /><circle cx="140" cy="40" r="32" fill="black" /></svg>`;
    } else if (frameIndex === 5) {
      maskSvg = `<svg width="${CELL_SIZE}" height="${CELL_SIZE}"><polygon points="10,80 180,100 180,115 10,95" fill="black" /><polygon points="80,10 100,180 115,180 95,10" fill="black" /><circle cx="50" cy="50" r="22" fill="black" /></svg>`;
    } else if (frameIndex === 6) {
      maskSvg = `<svg width="${CELL_SIZE}" height="${CELL_SIZE}"><polygon points="10,80 180,100 180,115 10,95" fill="black" /><polygon points="80,10 100,180 115,180 95,10" fill="black" /><circle cx="50" cy="50" r="35" fill="black" /><circle cx="140" cy="140" r="35" fill="black" /></svg>`;
    } else if (frameIndex === 7) {
      maskSvg = `<svg width="${CELL_SIZE}" height="${CELL_SIZE}"><rect x="0" y="0" width="${CELL_SIZE}" height="${CELL_SIZE}" fill="black" /><circle cx="96" cy="96" r="10" fill="none" stroke="none" /></svg>`;
    }

    const cellBase = await sharp({
      create: { width: CELL_SIZE, height: CELL_SIZE, channels: 4, background: { r: 0, g: 255, b: 0, alpha: 1 } }
    }).png().toBuffer();

    const maskedLeaf = await sharp(baseLeafPng)
      .composite([{ input: Buffer.from(maskSvg), blend: 'dest-out' }])
      .png().toBuffer();

    const cellFinal = await sharp(cellBase)
      .composite([{ input: maskedLeaf, left: 0, top: 0 }])
      .png().toBuffer();

    frameBuffers.push(cellFinal);
  }

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
  console.log(`Generated perfect 3x3 green screen grid: ${gridOutPath}`);
}

async function main() {
  for (const sp of speciesList) {
    await createSkillGrid(sp);
  }
}

main().catch(console.error);
