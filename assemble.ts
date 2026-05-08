/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const FRAME_WIDTH = 192;
const FRAME_HEIGHT = 208;
const COLUMNS = 8;
const ROW_ORDER = [
  'base', 'idle', 'running-right', 'running-left',
  'waving', 'jumping', 'failed', 'review', 'sleeping'
];

// Fix 4b: Animation definitions for game engine consumption
const ANIMATION_DEFS: Record<string, { fps: number; loop: boolean }> = {
  'base':          { fps: 4,  loop: true  },
  'idle':          { fps: 6,  loop: true  },
  'running-right': { fps: 12, loop: true  },
  'running-left':  { fps: 12, loop: true  },
  'waving':        { fps: 8,  loop: true  },
  'jumping':       { fps: 10, loop: false },
  'failed':        { fps: 6,  loop: false },
  'review':        { fps: 6,  loop: true  },
  'sleeping':      { fps: 4,  loop: true  },
};

async function assembleAtlas(petName: string) {
  const runDir = path.join('./pet_runs', petName);
  const manifestPath = path.join(runDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  // Warn if reference image was never processed — rows may lack visual consistency
  if (manifest.reference?.status !== 'completed') {
    console.warn('Warning: reference image not processed. Visual consistency across rows may be affected.');
  }

  // Fix 4a: Validate completeness before assembling
  const incomplete = ROW_ORDER.filter(r => manifest.rows[r]?.status !== 'completed');
  if (incomplete.length > 0) {
    console.warn(`Warning: ${incomplete.length} row(s) not completed: ${incomplete.join(', ')}`);
    console.warn('Atlas will contain blank strips for missing rows.');
  }

  const atlasWidth = COLUMNS * FRAME_WIDTH;
  const atlasHeight = ROW_ORDER.length * FRAME_HEIGHT;

  const composites: sharp.OverlayOptions[] = [];

  for (let r = 0; r < ROW_ORDER.length; r++) {
    const rowName = ROW_ORDER[r];
    const rowDir = path.join(runDir, 'rows', rowName);

    if (fs.existsSync(rowDir)) {
      for (let c = 0; c < COLUMNS; c++) {
        const framePath = path.join(rowDir, `frame_${c}.png`);
        if (fs.existsSync(framePath)) {
          composites.push({ input: framePath, left: c * FRAME_WIDTH, top: r * FRAME_HEIGHT });
        }
      }
    }
  }

  const outputWebp = path.join(runDir, 'output', 'spritesheet.webp');
  const outputJson = path.join(runDir, 'output', 'pet.json');

  await sharp({
    create: { width: atlasWidth, height: atlasHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite(composites)
    .webp({ quality: 90 })
    .toFile(outputWebp);

  // Fix 4b: Full animation metadata with row index, frameCount, fps, loop
  const animations = Object.fromEntries(
    ROW_ORDER.map((name, idx) => [
      name,
      { row: idx, frameCount: COLUMNS, ...ANIMATION_DEFS[name] }
    ])
  );

  const petMetadata = {
    name: petName,
    type: "hatch-pet-v1",
    dimensions: { width: atlasWidth, height: atlasHeight },
    frameSize: { width: FRAME_WIDTH, height: FRAME_HEIGHT },
    rows: ROW_ORDER,
    animations
  };

  fs.writeFileSync(outputJson, JSON.stringify(petMetadata, null, 2));

  console.log(`Atlas assembled at: ${outputWebp}`);
  console.log(`Metadata saved at: ${outputJson}`);
}

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("Usage: npx tsx scripts/assemble.ts <pet_name>");
  process.exit(1);
}

assembleAtlas(args[0]).catch(console.error);
