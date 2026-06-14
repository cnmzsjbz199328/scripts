/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';

const OBJECT_RUNS_DIR = './object_runs';

async function prepare(objectName: string, opts: { fps: number; loop: boolean; frameCount: number; frameSize: number }) {
  const runDir = path.join(OBJECT_RUNS_DIR, objectName);
  const framesDir = path.join(runDir, 'frames');
  const outputDir = path.join(runDir, 'output');

  if (!fs.existsSync(OBJECT_RUNS_DIR)) fs.mkdirSync(OBJECT_RUNS_DIR);
  if (!fs.existsSync(runDir)) fs.mkdirSync(runDir);
  if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  const manifestPath = path.join(runDir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    console.log(`Object project already exists at: ${runDir}`);
    return;
  }

  const gridCols = opts.frameCount <= 4 ? 2 : (opts.frameCount <= 6 ? 2 : 3);
  const gridRows = Math.ceil(opts.frameCount / gridCols);

  const manifest = {
    name: objectName,
    fps: opts.fps,
    loop: opts.loop,
    frameCount: opts.frameCount,
    frameSize: opts.frameSize,
    gridLayout: `${gridCols}x${gridRows}`,
    status: 'initialized',
    created_at: new Date().toISOString(),
    animation: { status: 'pending' },
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Object run initialized at: ${runDir}`);
  console.log(`Grid layout: ${gridCols}×${gridRows} (${opts.frameCount} frames), ${opts.fps} fps, loop=${opts.loop}`);
}

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: npx tsx object-prepare.ts <ObjectName> [--fps=8] [--no-loop] [--frames=6] [--size=128]');
  process.exit(1);
}

const objectName = args[0];
const fps    = parseInt(args.find(a => a.startsWith('--fps='))?.replace('--fps=', '') ?? '8');
const loop   = !args.includes('--no-loop');
const frames = parseInt(args.find(a => a.startsWith('--frames='))?.replace('--frames=', '') ?? '6');
const size   = parseInt(args.find(a => a.startsWith('--size='))?.replace('--size=', '') ?? '128');

prepare(objectName, { fps, loop, frameCount: frames, frameSize: size });
