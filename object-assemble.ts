/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function assembleObject(objectName: string) {
  const runDir = path.join('./object_runs', objectName);
  const manifestPath = path.join(runDir, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.error(`Object not initialized. Run: npx tsx object-prepare.ts ${objectName}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  if (manifest.animation?.status !== 'completed') {
    console.warn('Warning: animation frames not yet processed. Run object-process.ts first.');
  }

  const { frameCount, frameSize, fps, loop } = manifest;
  const framesDir = path.join(runDir, 'frames');

  const stripWidth  = frameCount * frameSize;
  const stripHeight = frameSize;

  const composites: sharp.OverlayOptions[] = [];

  for (let i = 0; i < frameCount; i++) {
    const framePath = path.join(framesDir, `frame_${i}.png`);
    if (fs.existsSync(framePath)) {
      composites.push({ input: framePath, left: i * frameSize, top: 0 });
    } else {
      console.warn(`  Missing frame_${i}.png — will be blank`);
    }
  }

  const outputDir = path.join(runDir, 'output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputWebp = path.join(outputDir, 'object.webp');
  const outputJson = path.join(outputDir, 'object.json');

  await sharp({
    create: { width: stripWidth, height: stripHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(composites)
    .webp({ quality: 90 })
    .toFile(outputWebp);

  const metadata = {
    name: objectName,
    type: 'anim-object-v1',
    frameCount,
    frameSize,
    fps,
    loop,
    strip: { width: stripWidth, height: stripHeight },
  };

  fs.writeFileSync(outputJson, JSON.stringify(metadata, null, 2));

  manifest.status = 'assembled';
  manifest.updated_at = new Date().toISOString();
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`Sprite strip assembled: ${outputWebp} (${stripWidth}×${stripHeight})`);
  console.log(`Metadata: ${outputJson}`);
}

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: npx tsx object-assemble.ts <ObjectName>');
  process.exit(1);
}

assembleObject(args[0]).catch(console.error);
