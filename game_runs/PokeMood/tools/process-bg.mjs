/* PokeMood — 背景三层加工 (process-bg.mjs)
 *
 * 移植自 BladeTrinity/tools/process-bg.mjs，差异只有两处：
 *   1. 目标几何是 1440×1152（5:4），不是 BT 的 1920×1080 —— PokeMood 画布 900×720
 *      是近竖幅，用 16:9 源图铺满高度会把左右各裁掉三分之一，构图全丢。
 *   2. 绿幕阈值可调（--gt=）。AI 绿幕不是纯绿：背景常是 rgb(73,166,66) 一类的哑光绿
 *      且逐帧漂移，默认阈值抠不动就调这个，别去改生图。
 *
 * 用法: node tools/process-bg.mjs [--gt=30]
 *   far.png  — 不透明整图，直接 resize→webp（远景没有主体要抠，走绿幕只会得到一圈绿边）
 *   mid.png  — 绿幕，抠成透明（上方要露出 far）
 *   fore.png — 绿幕，抠成透明（中央必须是空的，否则会盖住角色）
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_DIR = path.resolve(__dirname, '..');
const RAW_DIR = path.join(GAME_DIR, 'assets', 'bg', 'raw');
const OUT_DIR = path.join(GAME_DIR, 'assets', 'bg');

const W = 1440, H = 1152;

// 绿判定余量：g 比 r/b 各高出多少才算绿幕。哑光绿要往下调（20~24）。
const GT = Number((process.argv.find(a => a.startsWith('--gt=')) || '--gt=30').slice(5));

// 产出走 WebP：game_runs/ 下的图必须入库供 Cloudflare CI 部署（CLAUDE.md / .gitignore）。
// 带 alpha 的两层 alphaQuality 拉满，避免 despill 刚修好的边缘又被压出半透明脏边。
const WEBP_OPAQUE = { quality: 82 };
const WEBP_ALPHA = { quality: 86, alphaQuality: 100 };

const isGreen = (r, g, b) => g > 80 && g > r + GT && g > b + GT;

async function processFar() {
  const src = path.join(RAW_DIR, 'far.png');
  if (!fs.existsSync(src)) return console.warn('⚠️ 缺图: raw/far.png');
  console.log('处理远景 raw/far.png (不透明整图)...');
  await sharp(src).resize(W, H, { fit: 'cover' }).webp(WEBP_OPAQUE)
    .toFile(path.join(OUT_DIR, 'far.webp'));
  console.log(`  ✅ assets/bg/far.webp (${W}x${H})`);
}

async function processChromaKey(kind) {
  const src = path.join(RAW_DIR, `${kind}.png`);
  if (!fs.existsSync(src)) return console.warn(`⚠️ 缺图: raw/${kind}.png`);
  console.log(`处理${kind === 'mid' ? '中景' : '前景'} raw/${kind}.png (绿幕抠图, gt=${GT})...`);

  const norm = await sharp(src).resize(W, H, { fit: 'cover' }).png().toBuffer();
  const { data } = await sharp(norm).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  let green = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (isGreen(data[i], data[i + 1], data[i + 2])) green++;
  }
  const greenRatio = green / (W * H);
  if (greenRatio < 0.03) {
    console.warn(`  ⚠️ ${kind}.png 不像绿幕图 (绿占比 ${(greenRatio * 100).toFixed(1)}%) — 跳过抠图。`);
    console.warn('     若肉眼看着是绿的，试 --gt=22（哑光绿）。');
    return;
  }

  let kept = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (isGreen(r, g, b)) {
      data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
    } else {
      data[i + 1] = Math.min(g, Math.max(r, b));  // despill
      data[i + 3] = 255;
      kept++;
    }
  }

  const contentRatio = kept / (W * H);
  if (contentRatio < 0.005) {
    console.warn(`  🚨 ${kind}.png 抠完几乎全空 (${(contentRatio * 100).toFixed(2)}%) — agy 多半静默产了纯绿空图，重新生图。`);
    return;
  }
  console.log(`  ✅ 抠图完成: 有效像素 ${(contentRatio * 100).toFixed(1)}%`);

  // 前景专项体检：中央 60% 必须基本是空的，否则会盖住角色（角色宽度占画面 2/3）
  if (kind === 'fore') {
    const x0 = Math.floor(W * 0.2), x1 = Math.floor(W * 0.8);
    const yTop = 0, yBot = Math.floor(H * 0.94);   // 底部 6% 允许有石板边
    let solid = 0, total = 0;
    for (let y = yTop; y < yBot; y++) {
      for (let x = x0; x < x1; x++) {
        total++;
        if (data[(y * W + x) * 4 + 3] > 40) solid++;
      }
    }
    const occ = solid / total;
    const tag = occ > 0.12 ? '🚨' : '✅';
    console.log(`  ${tag} 中央 60%×94% 占用率 ${(occ * 100).toFixed(1)}%（>12% 就会挡住角色，需重生图或加大两侧裁切）`);
  }

  await sharp(data, { raw: { width: W, height: H, channels: 4 } })
    .webp(WEBP_ALPHA).toFile(path.join(OUT_DIR, `${kind}.webp`));
  console.log(`  ✅ assets/bg/${kind}.webp (${W}x${H})`);
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log('--- PokeMood 背景分层处理 ---');
  await processFar();
  await processChromaKey('mid');
  await processChromaKey('fore');
  console.log('--- 完成，接着跑 node tools/measure-bg.mjs 定标地面线 ---');
}

main().catch(err => { console.error('Fatal:', err); process.exitCode = 1; });
