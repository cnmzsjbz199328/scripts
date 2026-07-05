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

function extractRawFrames(videoPath: string, tmpDir: string): string[] {
  fs.mkdirSync(tmpDir, { recursive: true });
  execSync(
    `ffmpeg -y -i "${videoPath}" -vf "fps=${EXTRACT_FPS}" "${path.join(tmpDir, 'raw_%04d.png')}"`,
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

async function processAnimation(
  projectName: string,
  animName: string,
  videoPath: string,
  fps: number,
  frameCount: number,
  loop: boolean,
  lock: boolean
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

  try {
    console.log(`Extracting frames from: ${videoPath}`);
    const rawFrames = extractRawFrames(videoPath, tmpDir);
    console.log(`  extracted ${rawFrames.length} raw frames at ${EXTRACT_FPS}fps`);

    const selected = sampleFrames(rawFrames, frameCount);
    console.log(`  sampled ${selected.length} frames`);

    // 抠图 → 各帧包围盒
    const raws: Raw[] = [];
    const boxes: Box[] = [];
    for (let i = 0; i < selected.length; i++) {
      process.stdout.write(`\r  keying ${i + 1}/${selected.length} ...`);
      const r = await keyToRaw(selected[i]);
      raws.push(r);
      boxes.push(alphaBBox(r) ?? { left: 0, top: 0, width: r.width, height: r.height });
    }

    // lock: 全帧统一裁剪框（锁高度/基线/中心）；否则逐帧按自身包围盒(等价 trim)
    const union = lock ? unionBoxes(boxes) : null;
    if (lock) console.log(`\n  lock bbox ${union!.width}×${union!.height} @(${union!.left},${union!.top}) — 统一裁剪，高度/基线锁定`);

    for (let i = 0; i < raws.length; i++) {
      process.stdout.write(`\r  composing ${i + 1}/${raws.length} ...`);
      const buf = await composeCell(raws[i], union ?? boxes[i]);
      fs.writeFileSync(path.join(outputDir, `frame_${i}.png`), buf);
    }
    console.log(`\n  done → ${outputDir}`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  manifest.animations[animName] = {
    frameCount: frameCount,
    fps,
    loop,
    status: 'completed',
    updated_at: new Date().toISOString(),
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

// --- CLI ---
const args = process.argv.slice(2);
if (args.length < 3) {
  console.error('Usage: npx tsx video-process.ts <ProjectName> <AnimName> <video_path> [--fps=8] [--frames=9] [--no-loop] [--lock]');
  process.exit(1);
}

const [projectName, animName, videoPath] = args;
const fps     = parseInt(args.find(a => a.startsWith('--fps='))?.split('=')[1]    ?? '8');
const frames  = parseInt(args.find(a => a.startsWith('--frames='))?.split('=')[1] ?? '9');
const loop    = !args.includes('--no-loop');
const lock    = args.includes('--lock');

processAnimation(projectName, animName, videoPath, fps, frames, loop, lock).catch(console.error);
