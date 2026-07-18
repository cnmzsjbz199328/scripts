/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';

const FRAME_WIDTH = 192;
const FRAME_HEIGHT = 208;
const CELL_PADDING = 5;
const CHROMA_THRESHOLD = 110;
// Source extraction FPS — high enough to give smooth sampling for short clips
const EXTRACT_FPS = 15;
// 脚底基线（anchor 模式）：与现役 char-sprite 图集一致，脚底恒在 y=202
const BASELINE_Y = 202;
// 连通域清理：小于最大连通域面积 6% 的碎片（背景星点/呼气团）直接抹掉
const MIN_BLOB_RATIO = 0.06;

function chromaDist(r: number, g: number, b: number): number {
  return Math.sqrt(r * r + (g - 255) ** 2 + b * b);
}

function applyChromaKey(data: Buffer): void {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const isPureGreen = chromaDist(r, g, b) <= CHROMA_THRESHOLD;
    // Catch dark green fringe artifacts
    const isDarkGreen = g > 80 && g > r * 1.4 && g > b * 1.4 && r < 100 && b < 100;
    if (isPureGreen || isDarkGreen) data[i + 3] = 0;
  }
}

type Raw = { data: Buffer; width: number; height: number };
type Box = { left: number; top: number; width: number; height: number };

// 抠图后的裸 RGBA 帧
async function keyToRaw(framePath: string): Promise<Raw> {
  const { data, info } = await sharp(framePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  applyChromaKey(data);
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
  opts: { start?: number; end?: number; anchor?: boolean; scale?: number; extractFps?: number; pick?: number[] } = {}
) {
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
      const r = await keyToRaw(selected[i]);
      cleanSmallBlobs(r);
      raws.push(r);
      boxes.push(alphaBBox(r) ?? { left: 0, top: 0, width: r.width, height: r.height });
    }

    let usedScale: number | undefined;
    if (opts.anchor) {
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
  manifest.animations[animName] = {
    frameCount: actualCount,
    fps,
    loop,
    status: 'completed',
    ...(opts.start !== undefined ? { segment: [opts.start, opts.end] } : {}),
    ...(manifestScale !== undefined ? { scale: Number(manifestScale.toFixed(4)) } : {}),
    updated_at: new Date().toISOString(),
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

// --- CLI ---
const args = process.argv.slice(2);
if (args.length < 3) {
  console.error('Usage: npx tsx video-process.ts <ProjectName> <AnimName> <video_path> [--fps=8] [--frames=9] [--no-loop] [--lock]');
  console.error('  segment/anchor: [--start=1.0 --end=3.58] [--anchor] [--scale=0.42] [--extract-fps=24]');
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
const pickArg = args.find(a => a.startsWith('--pick='))?.split('=')[1];
const opts = {
  start: numArg('start'),
  end: numArg('end'),
  anchor: args.includes('--anchor'),
  scale: numArg('scale'),
  extractFps: numArg('extract-fps'),
  pick: pickArg ? pickArg.split(',').map(s => parseInt(s.trim(), 10)) : undefined,
};

processAnimation(projectName, animName, videoPath, fps, frames, loop, lock, opts).catch(console.error);
