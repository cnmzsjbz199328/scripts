/* BladeTrinity — 背景层地面线实测 (measure-bg.mjs)
 *
 * 生图模型不响应"地面线固定在画面 88%"这类数值构图约束（PROMPTS.md §9.4 实测），
 * 所以地面线要在装配侧吸收：每层量出关键线，单独定标 scale = 目标屏幕 y ÷ 源图 y。
 * 重新生图后必须重跑本脚本并更新 config.js 的 BT.BG_SETS。
 *
 *   用法: node tools/measure-bg.mjs [前缀]      例: node tools/measure-bg.mjs outdoor_
 *
 * 量法：
 *   mid/fore（带 alpha）— 逐列求"最低一段连续不透明区的顶边"取中位；
 *                          fore 另报中央 60% 区间的顶边（接地条高度，不能盖住步法）。
 *   far（不透明）      — 找最强水平边（相邻行亮度差最大处）作为地板线候选。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '..', 'assets', 'bg');
const pre = process.argv[2] || '';

const median = (a) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

async function measureAlpha(key) {
  const f = path.join(OUT_DIR, `${key}.webp`);
  if (!fs.existsSync(f)) return console.warn(`⚠️ 缺 ${key}.webp`);
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;

  const tops = [], centerTops = [];
  const c0 = Math.floor(W * 0.2), c1 = Math.floor(W * 0.8);
  for (let x = 0; x < W; x++) {
    // 从底往上走，找最低那段连续不透明区的顶边 —— 这就是"这一列的地面高度"
    let y = H - 1, seen = false;
    for (; y >= 0; y--) {
      const a = data[(y * W + x) * 4 + 3];
      if (a > 40) seen = true;
      else if (seen) break;
    }
    if (!seen) continue;
    tops.push(y + 1);
    if (x >= c0 && x < c1) centerTops.push(y + 1);
  }
  const m = median(tops), cm = median(centerTops);
  console.log(`${key}: 全幅顶边中位 y=${m} (${(m / H * 100).toFixed(1)}%)  |  中央 60% 顶边中位 y=${cm} (${(cm / H * 100).toFixed(1)}%)  [${W}x${H}]`);
  return { m, cm, H };
}

async function measureFar(key) {
  const f = path.join(OUT_DIR, `${key}.webp`);
  if (!fs.existsSync(f)) return console.warn(`⚠️ 缺 ${key}.webp`);
  const { data, info } = await sharp(f).greyscale().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;

  // 只在下半幅找：地板线一定在画面下部，上半幅的山脊/云层边缘会抢最强边
  let best = { y: 0, d: -1 };
  for (let y = Math.floor(H * 0.45); y < H - 1; y++) {
    let d = 0;
    for (let x = 0; x < W; x += 4) d += Math.abs(data[y * W + x] - data[(y + 1) * W + x]);
    d /= (W / 4);
    if (d > best.d) best = { y, d };
  }
  console.log(`${key}: 最强水平边 y=${best.y} (${(best.y / H * 100).toFixed(1)}%)  强度 ${best.d.toFixed(1)}  [${W}x${H}]`);
  return best;
}

const FLOOR_Y = 476;
console.log(`--- 背景地面线实测 (前缀 '${pre || '(dojo)'}') ---`);
const far = await measureFar(`${pre}far`);
const mid = await measureAlpha(`${pre}mid`);
const fore = await measureAlpha(`${pre}fore`);
console.log(`\n建议 scale（目标 FLOOR_Y=${FLOOR_Y}）:`);
if (far) console.log(`  far   ${(FLOOR_Y / far.y).toFixed(3)}`);
if (mid) console.log(`  mid   ${(FLOOR_Y / mid.m).toFixed(3)}`);
// fore 顶边要落在 FLOOR_Y 上方约 10px：盖住脚踝与倒地接触点，又不吃掉步法
if (fore) console.log(`  fore  ${((FLOOR_Y - 10) / fore.cm).toFixed(3)}   ← 用中央 60% 顶边定标`);
