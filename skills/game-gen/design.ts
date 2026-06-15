/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';

const GAME_RUNS_DIR = './game_runs';

const STYLE_KEYWORDS: Record<string, string> = {
  ghibli:  'Studio Ghibli animation style, soft expressive eyes, gentle watercolor-like shading, warm color palette, clean detailed linework, painterly but not photorealistic',
  pixel:   'Codex Digital Pet Style, pixel-ish, chibi, thick dark 1-2px outlines, limited palette, flat cel shading, visible stepped pixel edges',
  cartoon: 'Bold outlines, flat bright colors, western cartoon style, exaggerated expressions, rubber-hose limbs',
};

export interface GDD {
  title: string;
  tagline: string;
  style: string;
  story: {
    setting: string;
    protagonist: string;
    conflict: string;
    resolution: string;
  };
  gameType: 'side-scroller' | 'top-down-rpg' | 'top-down-action';
  coreLoop: string;
  winCondition: {
    description: string;
    trigger: string;
  };
  loseCondition: {
    description: string;
    trigger: string;
  };
  uiElements: string[];
  hud: {
    hearts?: { max: number };
    score?: { label: string; goal: number };
    objective?: { initial: string };
    dayCounter?: { label: string };
    [key: string]: unknown;
  };
  zones: Array<{ name: string; description: string; theme: string }>;
}

const GDD_TEMPLATE: GDD = {
  title: '',
  tagline: '',
  style: '',
  story: {
    setting: '',
    protagonist: '',
    conflict: '',
    resolution: '',
  },
  gameType: 'side-scroller',
  coreLoop: '',
  winCondition: {
    description: '',
    trigger: '',
  },
  loseCondition: {
    description: '',
    trigger: '',
  },
  uiElements: ['hearts', 'score', 'objective'],
  hud: {
    hearts: { max: 3 },
    score: { label: 'Score', goal: 0 },
    objective: { initial: '' },
  },
  zones: [],
};

async function design(gameName: string, style: string) {
  if (!STYLE_KEYWORDS[style]) {
    console.error(`Unknown style "${style}". Valid: ${Object.keys(STYLE_KEYWORDS).join(', ')}`);
    process.exit(1);
  }

  const runDir = path.join(GAME_RUNS_DIR, gameName);
  const sceneDir = path.join(runDir, 'scene');
  const manifestPath = path.join(runDir, 'manifest.json');
  const gddPath = path.join(runDir, 'gdd.json');

  if (!fs.existsSync(GAME_RUNS_DIR)) fs.mkdirSync(GAME_RUNS_DIR);
  if (!fs.existsSync(runDir)) fs.mkdirSync(runDir);
  if (!fs.existsSync(sceneDir)) fs.mkdirSync(sceneDir);

  if (fs.existsSync(manifestPath)) {
    console.log(`Game project already exists at: ${runDir}`);
    if (!fs.existsSync(gddPath)) {
      const gdd: GDD = { ...GDD_TEMPLATE, style };
      fs.writeFileSync(gddPath, JSON.stringify(gdd, null, 2));
      console.log(`GDD template created at: ${gddPath}`);
    } else {
      console.log(`GDD already exists at: ${gddPath}`);
    }
    return;
  }

  const manifest = {
    name: gameName,
    style,
    styleKeywords: STYLE_KEYWORDS[style],
    status: 'initialized',
    created_at: new Date().toISOString(),
    gdd: 'gdd.json',
    scene: {
      status: 'pending',
      description: '',
      path: null as string | null,
    },
    assets: {
      tiles: [] as object[],
      characters: [] as object[],
      objects: [] as object[],
    },
  };

  const gdd: GDD = { ...GDD_TEMPLATE, style };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  fs.writeFileSync(gddPath, JSON.stringify(gdd, null, 2));

  console.log(`Game project initialized at: ${runDir}`);
  console.log(`  manifest.json → ${manifestPath}`);
  console.log(`  gdd.json      → ${gddPath}`);
  console.log(`\nNext step: fill in gdd.json with AI-generated GDD content, then proceed to Phase 1.`);
}

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: npx tsx skills/game-gen/design.ts <GameName> [--style=ghibli|pixel|cartoon]');
  process.exit(1);
}

const gameName = args[0];
const styleArg = args.find(a => a.startsWith('--style='));
const style = styleArg ? styleArg.replace('--style=', '') : 'ghibli';

design(gameName, style);
