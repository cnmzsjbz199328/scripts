/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const FRAME_WIDTH = 192;
const FRAME_HEIGHT = 208;

async function assembleAtlas(projectName: string) {
  const runDir = path.join('./video_runs', projectName);
  const manifestPath = path.join(runDir, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.error(`Project not found: ${runDir}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const allAnims: Record<string, { frameCount: number; fps: number; loop: boolean; status: string }> =
    manifest.animations;

  const animNames = Object.keys(allAnims).filter(n => allAnims[n].status === 'completed');
  if (animNames.length === 0) {
    console.error('No completed animations found in manifest.');
    process.exit(1);
  }

  // All rows share the same column count (pad rows with fewer frames)
  const maxFrames = Math.max(...animNames.map(n => allAnims[n].frameCount));
  const atlasWidth  = maxFrames * FRAME_WIDTH;
  const atlasHeight = animNames.length * FRAME_HEIGHT;

  const composites: sharp.OverlayOptions[] = [];

  for (let r = 0; r < animNames.length; r++) {
    const name = animNames[r];
    const animDir = path.join(runDir, 'animations', name);
    const frameCount = allAnims[name].frameCount;

    for (let c = 0; c < frameCount; c++) {
      const framePath = path.join(animDir, `frame_${c}.png`);
      if (fs.existsSync(framePath)) {
        composites.push({ input: framePath, left: c * FRAME_WIDTH, top: r * FRAME_HEIGHT });
      }
    }
  }

  const outputDir  = path.join(runDir, 'output');
  const outputWebp = path.join(outputDir, 'spritesheet.webp');
  const outputJson = path.join(outputDir, 'sprite.json');
  fs.mkdirSync(outputDir, { recursive: true });

  await sharp({
    create: { width: atlasWidth, height: atlasHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite(composites)
    .webp({ quality: 90 })
    .toFile(outputWebp);

  const metadata = {
    name: projectName,
    type: 'video-sprite-v1',
    dimensions: { width: atlasWidth, height: atlasHeight },
    frameSize: { width: FRAME_WIDTH, height: FRAME_HEIGHT },
    animations: Object.fromEntries(
      animNames.map((name, idx) => [name, {
        row: idx,
        frameCount: allAnims[name].frameCount,
        fps:        allAnims[name].fps,
        loop:       allAnims[name].loop,
      }])
    ),
  };

  fs.writeFileSync(outputJson, JSON.stringify(metadata, null, 2));

  console.log(`Sprite sheet : ${outputWebp}`);
  console.log(`Metadata     : ${outputJson}`);
  console.log(`Atlas size   : ${atlasWidth}×${atlasHeight}px  (${animNames.length} rows × ${maxFrames} cols)`);
}

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: npx tsx video-assemble.ts <ProjectName>');
  process.exit(1);
}

assembleAtlas(args[0]).catch(console.error);
