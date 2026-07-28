/* PokeMood — 背景层实测定标 (measure-bg.mjs)
 *
 * 生图模型不响应「地面线放在画面 x%」这类数值构图约束（BladeTrinity 实测，
 * 见记忆 bg-groundline-assembly-not-prompt）。所以地面线在装配侧吸收：
 * 每层量出关键线，各自定标 scale = 目标屏幕 y ÷ 源图实测 y。
 * 重新生图后必须重跑本脚本并更新 game/config.js 的 PM.Config.BG。
 *
 *   用法: node tools/measure-bg.mjs
 *
 * 本脚本只给【候选】不给答案 —— 哪条线是"角色该站的那条"要人眼定。
 */
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BG = path.resolve(__dirname, '..', 'assets', 'bg');

const median = (a) => (a.length ? [...a].sort((x, y) => x - y)[a.length >> 1] : null);
const pct = (v, H) => `${v} (${((v / H) * 100).toFixed(1)}%)`;

async function raw(key) {
  const { data, info } = await sharp(path.join(BG, `${key}.webp`))
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, W: info.width, H: info.height };
}

/* 带 alpha 的层：中央区间的"最低一段连续不透明区的顶边" = 接地条高度；
 * 两侧列的内缘 = 角色能被遮住的横向边界。 */
async function measureAlphaLayer(key) {
  const { data, W, H } = await raw(key);
  const A = (x, y) => data[(y * W + x) * 4 + 3];

  // 1. 中央 60% 的接地条顶边（自下而上找第一段不透明的顶）
  const tops = [];
  for (let x = Math.floor(W * 0.2); x < Math.floor(W * 0.8); x += 2) {
    let y = H - 1;
    while (y >= 0 && A(x, y) <= 40) y--;          // 跳过底部透明
    if (y < 0) continue;
    while (y >= 0 && A(x, y) > 40) y--;           // 爬到这段的顶
    tops.push(y + 1);
  }
  // 2. 全幅的最低不透明段顶边（中景家具落地线用这个）
  const topsAll = [];
  for (let x = 0; x < W; x += 2) {
    let y = H - 1;
    while (y >= 0 && A(x, y) <= 40) y--;
    if (y < 0) continue;
    while (y >= 0 && A(x, y) > 40) y--;
    topsAll.push(y + 1);
  }
  // 3. 两侧列内缘：在角色高度区间（图上半 ~85%）里，从中线向外找第一个不透明列
  const yLo = 0, yHi = Math.floor(H * 0.85);
  const solidCol = (x) => {
    let n = 0;
    for (let y = yLo; y < yHi; y += 3) if (A(x, y) > 40) n++;
    return n / ((yHi - yLo) / 3) > 0.05;
  };
  let inL = 0, inR = W - 1;
  for (let x = W >> 1; x >= 0; x--) if (solidCol(x)) { inL = x; break; }
  for (let x = W >> 1; x < W; x++) if (solidCol(x)) { inR = x; break; }

  console.log(`\n[${key}] ${W}×${H}`);
  console.log(`  中央60% 接地条顶边(中位)  : ${pct(median(tops), H)}`);
  console.log(`  全幅   最低段顶边(中位)   : ${pct(median(topsAll), H)}`);
  console.log(`  两侧列内缘               : 左 ${inL} (${((inL / W) * 100).toFixed(1)}%) / 右 ${inR} (${((inR / W) * 100).toFixed(1)}%)`);
  console.log(`  → 中央净空带宽           : ${inR - inL} px (${(((inR - inL) / W) * 100).toFixed(1)}%)`);

  // 悬空体检：上面那两个数量的都是【地板带】自己的顶边，量不到「家具坐没坐在地板上」。
  // 生图模型会把书架/壁炉画得离它自己那条地板一截，中间留绿 —— 抠透明后远景从缝里
  // 透出来，家具就悬空了（PokeMood 首版实翻：书架和壁炉各离地 35px，肉眼一看就出戏）。
  // 量法：找到地板带顶边后，在【地板带之上】再找每列最低的那一段，报它的底边到地板顶的距离。
  // ⚠️ 基准必须取【中央 60%】的地板顶，不能用全幅中位。
  //    家具一旦真的坐在地板上，家具和地板在那些列就连成同一段不透明区，
  //    "最低一段的顶边"会顺着家具一路爬到书架顶 —— 全幅中位从 935 掉到 545，
  //    基准一错，下面的空隙全是垃圾数（mid v3 实翻，报了 47% 列悬空的假警报）。
  //    中央是留空的，那里的地板顶才是干净的地板线。
  const floorTop = median(tops);
  const gaps = [];
  for (let x = 0; x < W; x += 2) {
    let y = floorTop - 6;                       // 从地板带上方一点开始往上找
    while (y >= 0 && A(x, y) <= 40) y--;        // 跳过缝隙
    if (y < 0) continue;
    gaps.push({ x, gap: floorTop - y });
  }
  // 空隙分布是【双峰】的（贴地的家具一峰、吊挂物/上层隔板一峰），不要试图自动分类 ——
  // 首版拿中位数×1.5 当阈值，正好把真正悬空的那批（35px）当成离群点滤掉了。
  // 改成报分位数 + 超标列占比，哪一批是"该落地却没落地"由人眼看图定。
  if (gaps.length) {
    const q = (p) => {
      const s = gaps.map(g => g.gap).sort((a, b) => a - b);
      return s[Math.min(s.length - 1, Math.floor(s.length * p))];
    };
    const over = gaps.filter(g => g.gap > 12).length / gaps.length;
    const tag = over > 0.15 ? '🚨' : '✅';
    console.log(`  ${tag} 家具底→地板顶空隙   : p25 ${q(0.25)} / p50 ${q(0.5)} / p75 ${q(0.75)} / p90 ${q(0.9)} px`
              + `   >12px 的列占 ${(over * 100).toFixed(0)}%`);
    if (over > 0.15) {
      console.log(`     → 有家具悬空。看图确认是哪一批，取【那批】的空隙值（不是中位数）：`);
      console.log(`       给该层配 splitY(地板顶稍上) + bodyDy(≈该批空隙+7)，`);
      console.log(`       StageScene._addSplitLayer 会把家具裁出来整体下沉坐到地板上。`);
    }
  }
}

/* 不透明层：找最强水平边（相邻行亮度差最大）作为地板线候选，报前 5 名。
 * ⚠️ 最强边往往是台面【后沿】，照它定标角色会贴着后墙站——要自己往下挑。 */
async function measureOpaque(key) {
  const { data, W, H } = await raw(key);
  const rowMean = new Float64Array(H);
  for (let y = 0; y < H; y++) {
    let s = 0;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      s += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    }
    rowMean[y] = s / W;
  }
  const cand = [];
  for (let y = Math.floor(H * 0.45); y < H - 2; y++) {
    cand.push({ y, d: Math.abs(rowMean[y + 1] - rowMean[y]) });
  }
  cand.sort((a, b) => b.d - a.d);
  const picked = [];
  for (const c of cand) {
    if (picked.every(p => Math.abs(p.y - c.y) > 24)) picked.push(c);
    if (picked.length >= 5) break;
  }
  console.log(`\n[${key}] ${W}×${H} (不透明)`);
  picked.forEach((p, i) => console.log(`  水平边候选 #${i + 1}: y=${pct(p.y, H)}  强度 ${p.d.toFixed(1)}`));
}

console.log('--- PokeMood 背景实测（候选，不是答案）---');
await measureOpaque('far');
await measureAlphaLayer('mid');
await measureAlphaLayer('fore');
console.log('\n定标公式: scale = 目标屏幕y ÷ 源图实测y  （画布 900×720，靴底 y≈715）');
