/* PokeMood — 背景层实测定标 (measure-bg.mjs)
 *
 * 生图模型不响应「地面线放在画面 x%」这类数值构图约束（BladeTrinity 实测，
 * 见记忆 bg-groundline-assembly-not-prompt）。所以地面线在装配侧吸收：
 * 每层量出关键线，各自定标 scale = 目标屏幕 y ÷ 源图实测 y。
 * 重新生图后必须重跑本脚本并更新 game/config.js 的 PM.Config.BG。
 *
 *   用法: node tools/measure-bg.mjs [--scene=tower]   （缺省 = 全部场景）
 *
 * 本脚本只给【候选】不给答案 —— 哪条线是"角色该站的那条"要人眼定。
 * 每个候选都顺手换算成 scale = FOOT_Y ÷ 源图 y，省得五套场景手算十五次。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BG_ROOT = path.resolve(__dirname, '..', 'assets', 'bg');
let BG = BG_ROOT;

// 靴底在画布上的 y（PM.Config.BG.FOOT_Y）。改了那边这里也要改。
const FOOT_Y = 715;
// 前景两列内缘必须落在画布这条缝之外，中景家具必须落在缝之内（DESIGN §4.6 ①b）
const CANVAS_W_REF = 900, GAP_L = 180, GAP_R = 698;
const scaleFor = (srcY) => (FOOT_Y / srcY).toFixed(3);

const median = (a) => (a.length ? [...a].sort((x, y) => x - y)[a.length >> 1] : null);
const pct = (v, H) => `${v} (${((v / H) * 100).toFixed(1)}%)`;

// 缺层不崩：某一层生图失败是常态（配额/静默空图），别让它拖垮其余五套的实测
async function raw(key) {
  const f = path.join(BG, `${key}.webp`);
  if (!fs.existsSync(f)) { console.warn(`\n[${key}] ⚠️ 缺图，跳过`); return null; }
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, W: info.width, H: info.height };
}

/* 带 alpha 的层：中央区间的"最低一段连续不透明区的顶边" = 接地条高度；
 * 两侧列的内缘 = 角色能被遮住的横向边界。 */
async function measureAlphaLayer(key) {
  const r = await raw(key); if (!r) return;
  const { data, W, H } = r;
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
  /* 3. 两侧列内缘：从中线向外找第一个不透明列。
   * ⚠️ 扫描区间必须【止于地板带顶边】。地板是通宽的，把它算进来的话中线那一列
   *    永远是实心，两侧内缘一律报成 720/720（正中），"中央净空带宽 0px" ——
   *    对 mid 尤其致命，因为 mid 的地板占了整个下三分之一，
   *    结果就是家具落位检查永远给出无意义的绿灯。只看地板线以上的部分才是"能挡住角色的东西"。 */
  const yLo = 0, yHi = Math.max(8, Math.min(Math.floor(H * 0.85), median(tops) - 10));
  const solidCol = (x) => {
    let n = 0;
    for (let y = yLo; y < yHi; y += 3) if (A(x, y) > 40) n++;
    return n / ((yHi - yLo) / 3) > 0.05;
  };
  let inL = 0, inR = W - 1;
  for (let x = W >> 1; x >= 0; x--) if (solidCol(x)) { inL = x; break; }
  for (let x = W >> 1; x < W; x++) if (solidCol(x)) { inR = x; break; }

  const floorMid = median(tops);
  console.log(`\n[${key}] ${W}×${H}`);
  /* ⚠️ 两层的靶子不一样，别混用：
   *   mid  的地板远沿 → 画布 510~555（远沿定标，站位线用 FOOT_Y 反推验证）
   *   fore 的底边条顶 → 画布 690（"压住底边但不吃掉靴子"，靴底 715，只吃 15px）
   * 下面这行的 scale 是按 FOOT_Y 算的，对 fore 一律偏大 —— 所以 fore 单独再打一行。 */
  console.log(`  中央60% 接地条顶边(中位)  : ${pct(floorMid, H)}   → scale ${scaleFor(floorMid)}`);
  if (key === 'fore') {
    console.log(`  ⚠️ fore 用这个            : 底边条顶 → 画布 690  → scale ${(690 / floorMid).toFixed(3)}`);
  } else {
    console.log(`     mid 参考(远沿→510/555) : scale ${(510 / floorMid).toFixed(3)} ~ ${(555 / floorMid).toFixed(3)}`
              + `   ⚠️ 还要满足 ${H}×scale > ${FOOT_Y}（地板必须盖过靴底）→ scale > ${(FOOT_Y / H).toFixed(3)}`);
  }
  console.log(`  全幅   最低段顶边(中位)   : ${pct(median(topsAll), H)}   → scale ${scaleFor(median(topsAll))}`);
  console.log(`  两侧列内缘               : 左 ${inL} (${((inL / W) * 100).toFixed(1)}%) / 右 ${inR} (${((inR / W) * 100).toFixed(1)}%)`);
  console.log(`  → 中央净空带宽           : ${inR - inL} px (${(((inR - inL) / W) * 100).toFixed(1)}%)`);

  /* 横向落位换算：canvas_x = 中心 − (W/2)·s + srcX·s。
   * fore 关心"内缘会不会盖住斗篷"（斗篷右缘在 CHAR_X±245），
   * mid 关心"家具在不在前景两列的缝里"（画布 180~698，即 CHAR_X±270 内）。
   * 这两条都是 v2 翻过车的地方，所以直接把结论算出来，别留给心算。 */
  const at = (srcX, s) => Math.round(CANVAS_W_REF / 2 - (W / 2) * s + srcX * s);
  const s0 = Number(scaleFor(floorMid));
  console.log(`  横向@scale ${s0.toFixed(3)}          : 左内缘→画布 ${at(inL, s0)} / 右内缘→画布 ${at(inR, s0)}`);
  if (key === 'fore') {
    const need = (245 / Math.abs(inR - W / 2)).toFixed(3);
    console.log(`     fore 要让右内缘避开斗篷(CHAR_X+245) 需 scaleX ≥ ${need}`);
  } else {
    const ok = at(inL, s0) > GAP_L && at(inR, s0) < GAP_R;
    console.log(`     mid 家具是否落在前景缝(${GAP_L}~${GAP_R})内: ${ok ? '✅' : '🚨 会被前景挡住，看图调 scale 或重生图'}`);
  }

  // 悬空体检：上面那两个数量的都是【地板带】自己的顶边，量不到「家具坐没坐在地板上」。
  // 生图模型会把书架/壁炉画得离它自己那条地板一截，中间留绿 —— 抠透明后远景从缝里
  // 透出来，家具就悬空了（PokeMood 首版实翻：书架和壁炉各离地 35px，肉眼一看就出戏）。
  // 量法：找到地板带顶边后，在【地板带之上】再找每列最低的那一段，报它的底边到地板顶的距离。
  // ⚠️ 基准必须取【中央 60%】的地板顶，不能用全幅中位。
  //    家具一旦真的坐在地板上，家具和地板在那些列就连成同一段不透明区，
  //    "最低一段的顶边"会顺着家具一路爬到书架顶 —— 全幅中位从 935 掉到 545，
  //    基准一错，下面的空隙全是垃圾数（mid v3 实翻，报了 47% 列悬空的假警报）。
  //    中央是留空的，那里的地板顶才是干净的地板线。
  // fore 不查这项：前景本来就是【吊挂】的画框（藤蔓/蕨叶/雪松枝），"离地板远"是它的正常形态，
  // 查了必报红（六套场景里 fore 全红），久了就没人看这个标了。只有 mid 的家具该落地。
  if (key === 'fore') return;

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
  const r = await raw(key); if (!r) return;
  const { data, W, H } = r;
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
  picked.forEach((p, i) => console.log(
    `  水平边候选 #${i + 1}: y=${pct(p.y, H)}  强度 ${p.d.toFixed(1)}  → scale ${scaleFor(p.y)}`));
}

const want = (process.argv.find(a => a.startsWith('--scene=')) || '').slice(8);
const scenes = want ? [want]
  : fs.readdirSync(BG_ROOT, { withFileTypes: true })
      .filter(d => d.isDirectory() && fs.existsSync(path.join(BG_ROOT, d.name, 'far.webp')))
      .map(d => d.name);

console.log('--- PokeMood 背景实测（候选，不是答案）---');
for (const slug of scenes) {
  BG = path.join(BG_ROOT, slug);
  console.log(`\n══════ 场景 ${slug} ══════`);
  await measureOpaque('far');
  await measureAlphaLayer('mid');
  await measureAlphaLayer('fore');
}
console.log(`\n定标公式: scale = 目标屏幕y ÷ 源图实测y  （画布 900×720，靴底 y≈${FOOT_Y}）`);
