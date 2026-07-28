/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';

// 单元格尺寸：默认 192×208（与 char-sprite 图集一致），可用 --size=WxH 覆盖
let FRAME_WIDTH = 192;
let FRAME_HEIGHT = 208;
const CELL_PADDING = 5;
const CHROMA_THRESHOLD = 110;
// Source extraction FPS — high enough to give smooth sampling for short clips
const EXTRACT_FPS = 15;
// 脚底基线（anchor 模式）：与现役 char-sprite 图集一致，脚底恒在 y=202（随 --size 等比缩放）
let BASELINE_Y = 202;
// 连通域清理：小于最大连通域面积 6% 的碎片（背景星点/呼气团）直接抹掉
const MIN_BLOB_RATIO = 0.06;

// 抠图参数。默认 = 历史行为（纯绿 #00FF00 + 硬边 + 暗绿毛边补丁），逐字不变。
// AI 生成的"绿幕"视频背景常常不是 #00FF00（实测有 rgb(73,166,66) 这种哑光绿，且逐帧漂移），
// 此时用 --bg=auto 逐帧采样边框底色中位数，配合较小的 --threshold。
type KeyOpts = { bg: [number, number, number] | 'auto'; threshold: number; soft: number };
const DEFAULT_KEY: KeyOpts = { bg: [0, 255, 0], threshold: CHROMA_THRESHOLD, soft: 0 };

// 边框像素的每通道中位数 = 本帧实际底色
function sampleBorderBg(data: Buffer, width: number, height: number): [number, number, number] {
  const ch: number[][] = [[], [], []];
  const push = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    ch[0].push(data[i]); ch[1].push(data[i + 1]); ch[2].push(data[i + 2]);
  };
  for (let x = 0; x < width; x += 3) { push(x, 1); push(x, height - 2); }
  for (let y = 0; y < height; y += 3) { push(1, y); push(width - 2, y); }
  return ch.map(a => a.sort((p, q) => p - q)[a.length >> 1]) as [number, number, number];
}

function applyChromaKey(data: Buffer, width: number, height: number, k: KeyOpts): void {
  const bg = k.bg === 'auto' ? sampleBorderBg(data, width, height) : k.bg;
  const isPureGreenBg = bg[0] === 0 && bg[1] === 255 && bg[2] === 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const d = Math.sqrt((r - bg[0]) ** 2 + (g - bg[1]) ** 2 + (b - bg[2]) ** 2);

    if (k.soft > 0) {
      // 软边：[threshold, threshold+soft] 线性过渡，边缘不再是锯齿
      if (d <= k.threshold) { data[i + 3] = 0; continue; }
      if (d < k.threshold + k.soft) {
        data[i + 3] = Math.round((d - k.threshold) / k.soft * 255);
        // 去溢色：半透明边缘上残留的底色往灰去饱和，消除绿边
        if (g > r && g > b) data[i + 1] = Math.round(((r + b) / 2) * 0.5 + g * 0.5);
      }
      continue;
    }

    // 历史路径（硬边）
    const isPureGreen = d <= k.threshold;
    const isDarkGreen = isPureGreenBg && g > 80 && g > r * 1.4 && g > b * 1.4 && r < 100 && b < 100;
    if (isPureGreen || isDarkGreen) data[i + 3] = 0;
  }
}

type Raw = { data: Buffer; width: number; height: number };
type Box = { left: number; top: number; width: number; height: number };

// 抠图后的裸 RGBA 帧
async function keyToRaw(framePath: string, key: KeyOpts = DEFAULT_KEY): Promise<Raw> {
  const { data, info } = await sharp(framePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  applyChromaKey(data, info.width, info.height, key);
  return { data, width: info.width, height: info.height };
}

// 不透明像素的包围盒；整帧透明返回 null
function alphaBBox(r: Raw): Box | null {
  const { data, width, height } = r;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

// 抹掉小连通域（背景星点、呼气团等非主体碎片）；保留 ≥ 最大域 MIN_BLOB_RATIO 的所有域
function cleanSmallBlobs(r: Raw): void {
  const { data, width, height } = r;
  const label = new Int32Array(width * height).fill(-1);
  const areas: number[] = [];
  const stack: number[] = [];
  for (let start = 0; start < width * height; start++) {
    if (label[start] >= 0 || data[start * 4 + 3] <= 8) continue;
    const id = areas.length;
    let area = 0;
    stack.push(start);
    label[start] = id;
    while (stack.length) {
      const p = stack.pop()!;
      area++;
      const px = p % width, py = (p / width) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = px + dx, ny = py + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const np = ny * width + nx;
        if (label[np] < 0 && data[np * 4 + 3] > 8) { label[np] = id; stack.push(np); }
      }
    }
    areas.push(area);
  }
  if (areas.length <= 1) return;
  const maxArea = Math.max(...areas);
  const cut = maxArea * MIN_BLOB_RATIO;
  for (let p = 0; p < width * height; p++) {
    if (label[p] >= 0 && areas[label[p]] < cut) data[p * 4 + 3] = 0;
  }
}

// alpha 加权质心 X（对肢体伸展比 bbox 中心稳定得多）
function alphaCentroidX(r: Raw): number {
  const { data, width, height } = r;
  let sum = 0, w = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * 4 + 3];
      if (a > 8) { sum += x * a; w += a; }
    }
  }
  return w > 0 ? sum / w : width / 2;
}

// 多个包围盒取并集（--lock 用：跨所有帧的统一裁剪框）
function unionBoxes(boxes: Box[]): Box {
  const l = Math.min(...boxes.map(b => b.left));
  const t = Math.min(...boxes.map(b => b.top));
  const r = Math.max(...boxes.map(b => b.left + b.width));
  const b = Math.max(...boxes.map(b => b.top + b.height));
  return { left: l, top: t, width: r - l, height: b - t };
}

// 用指定裁剪框裁出角色 → 缩放居中到标准单元格
async function composeCell(r: Raw, crop: Box): Promise<Buffer> {
  const inner = await sharp(r.data, { raw: { width: r.width, height: r.height, channels: 4 } })
    .extract(crop)
    .resize(FRAME_WIDTH - CELL_PADDING * 2, FRAME_HEIGHT - CELL_PADDING * 2, {
      fit: 'inside',
      withoutEnlargement: true,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  return sharp({
    create: { width: FRAME_WIDTH, height: FRAME_HEIGHT, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([{ input: inner, gravity: 'center' }])
    .png()
    .toBuffer();
}

// fixed 模式（--crop=L,T,W,H）：用**源坐标里一个固定的裁剪窗**，完全不看 bbox。
// 适用前提：镜头锁定、角色质心稳定。适用场景：角色带光效/粒子（法阵、拖尾、星点），
// 这些东西会把逐帧 bbox 撑到画面边缘并逐帧剧变 —— 此时 trim/lock/anchor 都会被光效带着抖，
// 而固定窗天然零抖动，且保留角色在窗内的真实位移（看起来"活"而不是钉死）。
async function composeCellFixed(r: Raw, crop: Box): Promise<Buffer> {
  const left = Math.max(0, Math.min(crop.left, r.width - 1));
  const top = Math.max(0, Math.min(crop.top, r.height - 1));
  const box = {
    left, top,
    width: Math.max(1, Math.min(crop.width, r.width - left)),
    height: Math.max(1, Math.min(crop.height, r.height - top)),
  };
  return sharp(r.data, { raw: { width: r.width, height: r.height, channels: 4 } })
    .extract(box)
    .resize(FRAME_WIDTH, FRAME_HEIGHT, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

// anchor 模式：全段统一基线（锁定镜头假设：源坐标最低点→y202，保留抬脚/下蹲的真实纵向运动）、
// 质心X对格中心、全局统一缩放，允许超宽帧在格边被裁
async function composeCellAnchored(r: Raw, box: Box, centroidX: number, scale: number, globalBottom: number): Promise<Buffer> {
  const w = Math.max(1, Math.round(box.width * scale));
  const h = Math.max(1, Math.round(box.height * scale));
  const inner = await sharp(r.data, { raw: { width: r.width, height: r.height, channels: 4 } })
    .extract(box)
    .resize(w, h, { fit: 'fill' })
    .png()
    .toBuffer();

  let left = Math.round(FRAME_WIDTH / 2 - (centroidX - box.left) * scale);
  let top = BASELINE_Y - Math.round((globalBottom - box.top) * scale);

  // 裁掉越界部分（sharp composite 不接受负偏移）
  let sx = 0, sy = 0, cw = w, ch = h;
  if (left < 0) { sx = -left; cw += left; left = 0; }
  if (top < 0) { sy = -top; ch += top; top = 0; }
  cw = Math.min(cw, FRAME_WIDTH - left);
  ch = Math.min(ch, FRAME_HEIGHT - top);

  const cell = sharp({
    create: { width: FRAME_WIDTH, height: FRAME_HEIGHT, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  });
  if (cw <= 0 || ch <= 0) return cell.png().toBuffer();

  const piece = (sx || sy || cw !== w || ch !== h)
    ? await sharp(inner).extract({ left: sx, top: sy, width: cw, height: ch }).png().toBuffer()
    : inner;
  return cell.composite([{ input: piece, left, top }]).png().toBuffer();
}

function extractRawFrames(videoPath: string, tmpDir: string, fps: number, start?: number, end?: number): string[] {
  fs.mkdirSync(tmpDir, { recursive: true });
  const seek = start !== undefined ? `-ss ${start} ` : '';
  const dur = start !== undefined && end !== undefined ? `-t ${(end - start).toFixed(4)} ` : '';
  execSync(
    `ffmpeg -y ${seek}-i "${videoPath}" ${dur}-vf "fps=${fps}" "${path.join(tmpDir, 'raw_%04d.png')}"`,
    { stdio: 'pipe' }
  );
  return fs.readdirSync(tmpDir)
    .filter(f => f.startsWith('raw_') && f.endsWith('.png'))
    .sort()
    .map(f => path.join(tmpDir, f));
}

// Evenly sample `count` frames from the full extracted set
function sampleFrames(allFrames: string[], count: number): string[] {
  if (allFrames.length === 0) throw new Error('No frames extracted from video.');
  if (allFrames.length <= count) return allFrames;
  return Array.from({ length: count }, (_, i) =>
    allFrames[Math.floor(i * allFrames.length / count)]
  );
}

// --pick 手工指定帧（抽帧数组的 0 基下标；--start=0 --extract-fps=原生帧率 时即绝对帧号）。
// 用于绕开叠化/瑕疵帧等均匀采样处理不了的情况
function pickFrames(allFrames: string[], picks: number[]): string[] {
  return picks.map(i => {
    if (i < 0 || i >= allFrames.length) throw new Error(`--pick index ${i} out of range (0..${allFrames.length - 1})`);
    return allFrames[i];
  });
}

async function processAnimation(
  projectName: string,
  animName: string,
  videoPath: string,
  fps: number,
  frameCount: number,
  loop: boolean,
  lock: boolean,
  opts: {
    start?: number; end?: number; anchor?: boolean; scale?: number; extractFps?: number; pick?: number[];
    crop?: Box; key?: KeyOpts;
  } = {}
) {
  const key = opts.key ?? DEFAULT_KEY;
  const runDir = path.join('./video_runs', projectName);
  const manifestPath = path.join(runDir, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.error(`Project not found. Run: npx tsx video-prepare.ts ${projectName}`);
    process.exit(1);
  }

  const outputDir = path.join(runDir, 'animations', animName);
  fs.mkdirSync(outputDir, { recursive: true });

  const tmpDir = path.join(os.tmpdir(), `vsprite_${projectName}_${animName}_${Date.now()}`);
  let manifestScale: number | undefined;
  let actualCount = frameCount;

  try {
    const extractFps = opts.extractFps ?? EXTRACT_FPS;
    console.log(`Extracting frames from: ${videoPath}` +
      (opts.start !== undefined ? ` [${opts.start}s–${opts.end}s]` : ''));
    const rawFrames = extractRawFrames(videoPath, tmpDir, extractFps, opts.start, opts.end);
    console.log(`  extracted ${rawFrames.length} raw frames at ${extractFps}fps`);

    const selected = opts.pick ? pickFrames(rawFrames, opts.pick) : sampleFrames(rawFrames, frameCount);
    actualCount = selected.length;
    console.log(`  ${opts.pick ? 'picked' : 'sampled'} ${selected.length} frames`);

    // 抠图 → 清碎片 → 各帧包围盒
    const raws: Raw[] = [];
    const boxes: Box[] = [];
    for (let i = 0; i < selected.length; i++) {
      process.stdout.write(`\r  keying ${i + 1}/${selected.length} ...`);
      const r = await keyToRaw(selected[i], key);
      cleanSmallBlobs(r);
      raws.push(r);
      boxes.push(alphaBBox(r) ?? { left: 0, top: 0, width: r.width, height: r.height });
    }

    let usedScale: number | undefined;
    if (opts.crop) {
      const c = opts.crop;
      console.log(`\n  fixed crop ${c.width}×${c.height} @(${c.left},${c.top}) → cell ${FRAME_WIDTH}×${FRAME_HEIGHT}（不看 bbox，零抖动）`);
      for (let i = 0; i < raws.length; i++) {
        process.stdout.write(`\r  composing ${i + 1}/${raws.length} ...`);
        fs.writeFileSync(path.join(outputDir, `frame_${i}.png`), await composeCellFixed(raws[i], c));
      }
    } else if (opts.anchor) {
      // anchor: 质心X对中 + 脚底压基线 + 全局统一缩放（跨段复用传 --scale）
      const innerW = FRAME_WIDTH - CELL_PADDING * 2;
      const innerH = FRAME_HEIGHT - CELL_PADDING * 2;
      const maxW = Math.max(...boxes.map(b => b.width));
      const maxH = Math.max(...boxes.map(b => b.height));
      usedScale = opts.scale ?? Math.min(innerW / maxW, innerH / maxH, 1);
      manifestScale = usedScale;
      const globalBottom = Math.max(...boxes.map(b => b.top + b.height));
      console.log(`\n  anchor mode: scale=${usedScale.toFixed(4)} baseline=${BASELINE_Y} srcBottom=${globalBottom}` +
        (opts.scale ? ' (forced scale)' : ` (fit maxBBox ${maxW}×${maxH})`));
      for (let i = 0; i < raws.length; i++) {
        process.stdout.write(`\r  composing ${i + 1}/${raws.length} ...`);
        const cx = alphaCentroidX(raws[i]);
        const buf = await composeCellAnchored(raws[i], boxes[i], cx, usedScale, globalBottom);
        fs.writeFileSync(path.join(outputDir, `frame_${i}.png`), buf);
      }
    } else {
      // lock: 全帧统一裁剪框（锁高度/基线/中心）；否则逐帧按自身包围盒(等价 trim)
      const union = lock ? unionBoxes(boxes) : null;
      if (lock) console.log(`\n  lock bbox ${union!.width}×${union!.height} @(${union!.left},${union!.top}) — 统一裁剪，高度/基线锁定`);

      for (let i = 0; i < raws.length; i++) {
        process.stdout.write(`\r  composing ${i + 1}/${raws.length} ...`);
        const buf = await composeCell(raws[i], union ?? boxes[i]);
        fs.writeFileSync(path.join(outputDir, `frame_${i}.png`), buf);
      }
    }
    console.log(`\n  done → ${outputDir}`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  // 帧尺寸记进项目级 + 逐动画。逐动画是为了「同一项目里少数动作需要更宽的格子」
  // （例：角色放技能，特效横着甩出角色框外。此时给那一段更宽的 --crop 和**等比更大的 --size**，
  //   保持 1:1 像素比，角色不会变小；游戏侧用 offsetX 把它对回去）
  manifest.frameSize = { width: FRAME_WIDTH, height: FRAME_HEIGHT };
  manifest.animations[animName] = {
    frameSize: { width: FRAME_WIDTH, height: FRAME_HEIGHT },
    frameCount: actualCount,
    fps,
    loop,
    status: 'completed',
    ...(opts.start !== undefined ? { segment: [opts.start, opts.end] } : {}),
    ...(manifestScale !== undefined ? { scale: Number(manifestScale.toFixed(4)) } : {}),
    ...(opts.crop ? { crop: [opts.crop.left, opts.crop.top, opts.crop.width, opts.crop.height] } : {}),
    updated_at: new Date().toISOString(),
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

// --- CLI ---
const args = process.argv.slice(2);
if (args.length < 3) {
  console.error('Usage: npx tsx video-process.ts <ProjectName> <AnimName> <video_path> [--fps=8] [--frames=9] [--no-loop] [--lock]');
  console.error('  segment/anchor: [--start=1.0 --end=3.58] [--anchor] [--scale=0.42] [--extract-fps=24] [--pick=0,3,7]');
  console.error('  cell/crop     : [--size=520x720] [--crop=360,0,516,720] [--baseline=700]');
  console.error('  chroma key    : [--bg=auto|R,G,B] [--threshold=70] [--soft=26]');
  process.exit(1);
}

const [projectName, animName, videoPath] = args;
const numArg = (name: string) => {
  const v = args.find(a => a.startsWith(`--${name}=`))?.split('=')[1];
  return v !== undefined ? parseFloat(v) : undefined;
};
const fps     = numArg('fps') ?? 8;
const frames  = numArg('frames') ?? 9;
const loop    = !args.includes('--no-loop');
const lock    = args.includes('--lock');
const strArg = (name: string) => args.find(a => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const pickArg = strArg('pick');

// --size=WxH：改单元格尺寸；基线按 202/208 的比例等比落位，除非 --baseline 显式给
const sizeArg = strArg('size');
if (sizeArg) {
  const m = /^(\d+)x(\d+)$/i.exec(sizeArg.trim());
  if (!m) { console.error(`--size 格式应为 WxH，收到 "${sizeArg}"`); process.exit(1); }
  FRAME_WIDTH = parseInt(m[1], 10);
  FRAME_HEIGHT = parseInt(m[2], 10);
  BASELINE_Y = Math.round(FRAME_HEIGHT * 202 / 208);
}
const baselineArg = numArg('baseline');
if (baselineArg !== undefined) BASELINE_Y = Math.round(baselineArg);

const cropArg = strArg('crop');
let crop: Box | undefined;
if (cropArg) {
  const n = cropArg.split(',').map(s => parseInt(s.trim(), 10));
  if (n.length !== 4 || n.some(v => !Number.isFinite(v))) {
    console.error(`--crop 格式应为 L,T,W,H，收到 "${cropArg}"`); process.exit(1);
  }
  crop = { left: n[0], top: n[1], width: n[2], height: n[3] };
}

const bgArg = strArg('bg');
let bg: KeyOpts['bg'] = DEFAULT_KEY.bg;
if (bgArg === 'auto') bg = 'auto';
else if (bgArg) {
  const n = bgArg.split(',').map(s => parseInt(s.trim(), 10));
  if (n.length !== 3 || n.some(v => !Number.isFinite(v))) {
    console.error(`--bg 格式应为 auto 或 R,G,B，收到 "${bgArg}"`); process.exit(1);
  }
  bg = [n[0], n[1], n[2]];
}
const keyOpts: KeyOpts = { bg, threshold: numArg('threshold') ?? DEFAULT_KEY.threshold, soft: numArg('soft') ?? 0 };

const opts = {
  start: numArg('start'),
  end: numArg('end'),
  anchor: args.includes('--anchor'),
  scale: numArg('scale'),
  extractFps: numArg('extract-fps'),
  pick: pickArg ? pickArg.split(',').map(s => parseInt(s.trim(), 10)) : undefined,
  crop,
  key: keyOpts,
};

processAnimation(projectName, animName, videoPath, fps, frames, loop, lock, opts).catch(console.error);
