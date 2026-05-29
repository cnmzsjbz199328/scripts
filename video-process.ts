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

async function processFrame(framePath: string): Promise<Buffer> {
  const { data, info } = await sharp(framePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  applyChromaKey(data);

  const trimmed = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim()
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
    .composite([{ input: trimmed, gravity: 'center' }])
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
  loop: boolean
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

    for (let i = 0; i < selected.length; i++) {
      process.stdout.write(`\r  processing ${i + 1}/${selected.length} ...`);
      const buf = await processFrame(selected[i]);
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
  console.error('Usage: npx tsx video-process.ts <ProjectName> <AnimName> <video_path> [--fps=8] [--frames=9] [--no-loop]');
  process.exit(1);
}

const [projectName, animName, videoPath] = args;
const fps     = parseInt(args.find(a => a.startsWith('--fps='))?.split('=')[1]    ?? '8');
const frames  = parseInt(args.find(a => a.startsWith('--frames='))?.split('=')[1] ?? '9');
const loop    = !args.includes('--no-loop');

processAnimation(projectName, animName, videoPath, fps, frames, loop).catch(console.error);
