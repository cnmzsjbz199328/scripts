/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';

const CHAR_RUNS_DIR = './char_runs';

function parseArg(flag: string, fallback: string): string {
  const arg = process.argv.find(a => a.startsWith(`--${flag}=`));
  return arg ? arg.slice(flag.length + 3) : fallback;
}

async function prepare(charName: string) {
  const animsRaw = parseArg('anims', 'idle,walk,run,attack,jump,death');
  const defaultFps = parseInt(parseArg('fps', '8'), 10);

  const animNames = animsRaw.split(',').map(s => s.trim()).filter(Boolean);

  const runDir = path.join(CHAR_RUNS_DIR, charName);
  fs.mkdirSync(path.join(runDir, 'reference'), { recursive: true });
  fs.mkdirSync(path.join(runDir, 'rows'), { recursive: true });
  fs.mkdirSync(path.join(runDir, 'output'), { recursive: true });

  const rows: Record<string, { status: string; fps: number; loop: boolean }> = {};
  for (const name of animNames) {
    rows[name] = { status: 'pending', fps: defaultFps, loop: true };
  }

  const manifest = {
    name: charName,
    status: 'initialized',
    created_at: new Date().toISOString(),
    frameCount: 9,
    reference: { status: 'pending' },
    rows
  };

  fs.writeFileSync(path.join(runDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`Char run initialized: ${runDir}`);
  console.log(`Animations (${animNames.length}): ${animNames.join(', ')}`);
  console.log(`Default fps: ${defaultFps} | Edit manifest.json to adjust per-animation fps/loop.`);
}

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
if (args.length < 1) {
  console.error('Usage: npx tsx skills/char-sprite/prepare.ts <CharName> [--anims=anim1,anim2,...] [--fps=8]');
  process.exit(1);
}

prepare(args[0]).catch(console.error);
