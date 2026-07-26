/* BladeTrinity — 室外前景【动态枝叶层】构建 (build-fore-anim.mjs)
 *
 *   用法: node tools/build-fore-anim.mjs <绿幕视频路径> [帧数=10]
 *
 * 输入：图生视频产出的绿幕循环片段（首帧 = 定版的 outdoor_fore 设计）。
 * 输出：assets/bg/outdoor_fore_a<N>.webp 序列帧 + 控制台打印装配定标建议。
 *
 * ── 为什么需要"首帧遮罩"这一步 ──
 * 视频模型不遵守"不要有叶子在空中飘"和"禁运动模糊"这两条否定指令（实测：中央
 * 空区的飘叶像素从首帧 132 涨到 422，且全带运动模糊）。而前景层 depth 20 压在
 * 角色之上，满屏不可交互的假落叶会：① 一直从角色脸上飘过去挡战斗可读性；
 * ② 与 foregroundPhysics 的真落叶形成矛盾——真叶被剑气卷起，假叶穿过剑气毫无反应。
 *
 * 解法不是重生成（模型刚已无视明确否定指令），而是利用一个本来就成立的约束：
 * 前景层中央必须留空（PROMPTS.md §9）。取【首帧的不透明区】作为允许遮罩，
 * 膨胀 DILATE px 容纳枝叶摆动幅度，落在首帧空白处的飘叶就被自动切掉。
 *
 * ── 循环点 ──
 * 首尾不闭环（实测平均灰度差 9.13，判据 <2）。所以不直接用整段，而是在遮罩后的
 * 有效区域上搜一对最相似的帧作为循环边界——中央飘叶已被切掉，不参与相似度计算。
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_DIR = path.resolve(__dirname, '..');
const OUT_DIR = path.join(GAME_DIR, 'assets', 'bg');

const VIDEO = process.argv[2];
const N_FRAMES = parseInt(process.argv[3] || '10', 10);
// 默认【保留】中央飘叶（用户定：不影响观感，不花成本去除）。
// 传 --mask 才启用首帧遮罩把飘叶切掉，理由见文件头注释。
const USE_MASK = process.argv.includes('--mask');
if (!VIDEO || !fs.existsSync(VIDEO)) {
  console.error('用法: node tools/build-fore-anim.mjs <绿幕视频路径> [帧数=10]');
  process.exit(1);
}

// 抠图阈值比 process-bg.mjs 宽：视频是有损编码，绿幕纯度只有 92%（静态图 99.4%），
// 边缘有压缩产生的半透明绿糊边，用静态图那套窄阈值会留一圈脏边。
const isGreen = (r, g, b) => g > 70 && g > r + 22 && g > b + 22;

const DILATE = 30;   // 首帧遮罩膨胀量（px，源图坐标）— 容纳枝叶摆动幅度
const FEATHER = 8;   // 遮罩羽化，避免摆出遮罩的枝叶尖端出现硬切边

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'btfore-'));

function extractFrames() {
  console.log('抽帧（ffmpeg）...');
  execFileSync('ffmpeg', ['-v', 'error', '-i', VIDEO, '-vsync', '0',
    path.join(TMP, 'f_%04d.png')]);
  const files = fs.readdirSync(TMP).filter(f => f.endsWith('.png')).sort();
  console.log(`  共 ${files.length} 帧`);
  return files.map(f => path.join(TMP, f));
}

// 抠绿 + despill，返回 {rgba, W, H}
async function keyFrame(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (isGreen(r, g, b)) {
      data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
    } else {
      data[i + 1] = Math.min(g, Math.max(r, b));   // despill
      data[i + 3] = 255;
    }
  }
  return { data, W: info.width, H: info.height };
}

// 用首帧 alpha 造允许遮罩：膨胀（模糊+阈值近似）再羽化，返回 0..255 的单通道
async function buildMask(first) {
  const { data, W, H } = first;
  const alpha = Buffer.alloc(W * H);
  for (let p = 0; p < W * H; p++) alpha[p] = data[p * 4 + 3];

  // 膨胀：高斯模糊后取低阈值 —— 模糊把不透明区向外摊开，阈值再收成实心
  //
  // ⚠️ 必须 extractChannel(0) 显式收回单通道。sharp 的 threshold() 会把单通道
  //    raw 输入变成 3 通道输出，直接 raw().toBuffer() 拿到的 buffer 长度是 3×W×H；
  //    照单通道遍历会整体错位（实测"允许区占比 148.9%"就是这个 bug 的症状）。
  const { data: dil, info } = await sharp(alpha, { raw: { width: W, height: H, channels: 1 } })
    .blur(DILATE / 2.5).threshold(28).blur(FEATHER)
    .extractChannel(0).raw().toBuffer({ resolveWithObject: true });
  if (info.channels !== 1 || dil.length !== W * H) {
    throw new Error(`遮罩通道数异常: channels=${info.channels} len=${dil.length} 期望 ${W * H}`);
  }
  return { mask: dil, W, H };
}

function applyMask(frame, mask) {
  const { data } = frame;
  for (let p = 0; p < mask.length; p++) {
    const m = mask[p];
    if (m === 0) { data[p * 4 + 3] = 0; continue; }
    if (m < 255) data[p * 4 + 3] = Math.round(data[p * 4 + 3] * m / 255);
  }
  return frame;
}

// 遮罩后有效区的平均差异（只比不透明处，飘叶已被切掉不参与）
function frameDist(a, b) {
  let d = 0, n = 0;
  for (let p = 0; p < a.length; p += 4) {
    if (a[p + 3] < 40 && b[p + 3] < 40) continue;
    d += Math.abs(a[p] - b[p]) + Math.abs(a[p + 1] - b[p + 1]) + Math.abs(a[p + 2] - b[p + 2]);
    n += 3;
  }
  return n ? d / n : 0;
}

const files = extractFrames();
// 全帧太多，按步长采样后再搜循环点（步长 2 已足够，摆动很慢）
const STEP = 2;
const idxs = [];
for (let i = 0; i < files.length; i += STEP) idxs.push(i);

console.log(USE_MASK ? '抠图 + 首帧遮罩...' : '抠图（保留中央飘叶）...');
const first = await keyFrame(files[0]);
const W = first.W, H = first.H;
let mask = null;
if (USE_MASK) {
  const built = await buildMask(first);
  mask = built.mask;
  const r = mask.filter(v => v > 0).length / (W * H);
  console.log(`  首帧遮罩允许区占比 ${(r * 100).toFixed(1)}%（其余强制透明，飘叶从这里被切掉）`);
}

const keyed = [];
for (const i of idxs) {
  const f = await keyFrame(files[i]);
  keyed.push({ i, ...(USE_MASK ? applyMask(f, mask) : f) });
}

// 搜循环段：起点固定在 0（首帧就是定版设计），找与它最像、且间隔 >= MIN_LEN 的帧
console.log('搜循环点...');
const MIN_LEN = Math.floor(keyed.length * 0.25);
let best = { j: keyed.length - 1, d: Infinity };
for (let j = MIN_LEN; j < keyed.length; j++) {
  const d = frameDist(keyed[0].data, keyed[j].data);
  if (d < best.d) best = { j, d };
}
console.log(`  循环段 = 采样帧 0..${best.j}（原始帧 0..${keyed[best.j].i}），闭环差 ${best.d.toFixed(2)}`);
if (!USE_MASK) {
  console.log('  注：保留飘叶时闭环差由飘叶位置主导，做不到真无缝——循环处会有一次飘叶跳位。');
  console.log('       所以帧数取多些、播放帧率压低，把循环周期拉长到 2 秒以上，跳变才不显眼。');
}

// 目标几何：落叶带顶边落在 FLOOR_Y-10 = 466。逐列量首帧最低那段不透明区的顶边中位。
const FLOOR_Y = 476;
function measureTop(frame) {
  const { data, W, H } = frame;
  const tops = [];
  const c0 = Math.floor(W * 0.3), c1 = Math.floor(W * 0.7);
  for (let x = c0; x < c1; x++) {
    let y = H - 1, seen = false;
    for (; y >= 0; y--) {
      const a = data[(y * W + x) * 4 + 3];
      if (a > 40) seen = true; else if (seen) break;
    }
    if (seen) tops.push(y + 1);
  }
  tops.sort((a, b) => a - b);
  return tops[Math.floor(tops.length / 2)];
}
const topY = measureTop(first);
const outH = Math.round((FLOOR_Y - 10) / (topY / H));
const outW = Math.round(outH * (W / H));
console.log(`  首帧落叶带中央顶边 y=${topY}/${H} (${(topY / H * 100).toFixed(1)}%)`);
console.log(`  → 输出尺寸 ${outW}x${outH}：origin(0.5,0) 贴顶居中、scale=1 时顶边正好落在 ${FLOOR_Y - 10}`);

// 从循环段等间隔取 N 帧写出
console.log(`写出 ${N_FRAMES} 帧...`);
const picks = [];
for (let k = 0; k < N_FRAMES; k++) picks.push(Math.round(k * best.j / N_FRAMES));
let total = 0;
for (let k = 0; k < picks.length; k++) {
  const f = keyed[picks[k]];
  const out = path.join(OUT_DIR, `outdoor_fore_a${k}.webp`);
  await sharp(f.data, { raw: { width: W, height: H, channels: 4 } })
    .resize(outW, outH)
    .webp({ quality: 84, alphaQuality: 100 })
    .toFile(out);
  total += fs.statSync(out).size;
}
console.log(`  ✅ ${N_FRAMES} 帧共 ${(total / 1024).toFixed(0)} KB，显存约 ${(outW * outH * 4 * N_FRAMES / 1048576).toFixed(1)} MB`);
fs.rmSync(TMP, { recursive: true, force: true });
console.log('\n把这些填进 config.js 的 BT.BG_SETS.outdoor：animFrames / scale=1');
