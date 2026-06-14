/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';

const GAME_RUNS_DIR = './game_runs';

const STYLE_KEYWORDS: Record<string, string> = {
  ghibli: 'Studio Ghibli animation style, soft expressive eyes, gentle watercolor-like shading, warm color palette, clean detailed linework, painterly but not photorealistic',
  pixel:  'Codex Digital Pet Style, pixel-ish, chibi, thick dark 1-2px outlines, limited palette, flat cel shading, visible stepped pixel edges',
  cartoon: 'Bold outlines, flat bright colors, western cartoon style, exaggerated expressions, rubber-hose limbs',
};

async function prepare(gameName: string, style: string) {
  if (!STYLE_KEYWORDS[style]) {
    console.error(`Unknown style "${style}". Valid: ${Object.keys(STYLE_KEYWORDS).join(', ')}`);
    process.exit(1);
  }

  const runDir = path.join(GAME_RUNS_DIR, gameName);
  const sceneDir = path.join(runDir, 'scene');

  if (!fs.existsSync(GAME_RUNS_DIR)) fs.mkdirSync(GAME_RUNS_DIR);
  if (!fs.existsSync(runDir)) fs.mkdirSync(runDir);
  if (!fs.existsSync(sceneDir)) fs.mkdirSync(sceneDir);

  const manifestPath = path.join(runDir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    console.log(`Game project already exists at: ${runDir}`);
    return;
  }

  const manifest = {
    name: gameName,
    style,
    styleKeywords: STYLE_KEYWORDS[style],
    status: 'initialized',
    created_at: new Date().toISOString(),
    scene: {
      status: 'pending',
      description: '',
      path: null as string | null,
    },
    assets: {
      // { name, textureProject, variants[] }
      tiles: [] as object[],
      // { name, petProject, animations[] }
      characters: [] as object[],
      // { name, objectProject, fps, loop, frameCount }
      objects: [] as object[],
    },
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Game project initialized at: ${runDir}`);
  console.log(`Style: ${style}`);
  console.log(`Next: generate a scene reference image, then run sub-pipelines per asset type.`);
}

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: npx tsx game-prepare.ts <GameName> [--style=ghibli|pixel|cartoon]');
  process.exit(1);
}

const gameName = args[0];
const styleArg = args.find(a => a.startsWith('--style='));
const style = styleArg ? styleArg.replace('--style=', '') : 'ghibli';

prepare(gameName, style);
