/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const DEFAULT_FRAME_WIDTH = 192;
const DEFAULT_FRAME_HEIGHT = 208;
// WebGL 纹理上限：低端设备普遍只保证 4096。超过就整块贴图变黑/被拒。
const MAX_TEXTURE = 4096;

// 每动作一张网格图集（大帧场景）。Phaser 的 load.spritesheet 原生支持多行网格，
// 按 frameWidth/frameHeight 顺序编号，行为与单行完全一致。
async function assemblePerAnim(
  runDir: string, projectName: string, animNames: string[], allAnims: any,
  FRAME_WIDTH: number, FRAME_HEIGHT: number, outputDir: string
) {
  const anims: Record<string, any> = {};

  for (const name of animNames) {
    const animDir = path.join(runDir, 'animations', name);
    const frameCount = allAnims[name].frameCount;
    // 逐动画帧尺寸优先（个别动作可能用了更宽的格子放特效）
    const FW = allAnims[name].frameSize?.width ?? FRAME_WIDTH;
    const FH = allAnims[name].frameSize?.height ?? FRAME_HEIGHT;
    const cols = Math.max(1, Math.floor(MAX_TEXTURE / FW));
    const c = Math.min(cols, frameCount);
    const rows = Math.ceil(frameCount / c);
    const composites: sharp.OverlayOptions[] = [];
    for (let i = 0; i < frameCount; i++) {
      const framePath = path.join(animDir, `frame_${i}.png`);
      if (fs.existsSync(framePath)) {
        composites.push({ input: framePath, left: (i % c) * FW, top: Math.floor(i / c) * FH });
      }
    }
    const file = `${name}.webp`;
    await sharp({
      create: { width: c * FW, height: rows * FH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
    }).composite(composites).webp({ quality: 90 }).toFile(path.join(outputDir, file));

    anims[name] = {
      atlas: file, cols: c, rows,
      frameSize: { width: FW, height: FH },
      dimensions: { width: c * FW, height: rows * FH },
      frameCount, fps: allAnims[name].fps, loop: allAnims[name].loop,
    };
    console.log(`  ${name.padEnd(12)} ${c}×${rows} 格  ${FW}×${FH}/帧  ${c * FW}×${rows * FH}px  → ${file}`);
    // 列数由宽度上限决定，行数由帧数决定 —— 帧太多时高度仍可能顶穿上限，必须喊出来
    if (rows * FH > MAX_TEXTURE) {
      console.warn(`  ⚠ ${name}: 图集高 ${rows * FH} > ${MAX_TEXTURE}，低端设备上这张贴图可能整块失效。` +
        `降 --frames 或缩小 --size。`);
    }
  }

  const metadata = {
    name: projectName,
    type: 'video-sprite-v2-peranim',
    frameSize: { width: FRAME_WIDTH, height: FRAME_HEIGHT },
    animations: anims,
  };
  fs.writeFileSync(path.join(outputDir, 'sprite.json'), JSON.stringify(metadata, null, 2));
  console.log(`Metadata     : ${path.join(outputDir, 'sprite.json')}`);
}

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

  // 帧尺寸由 process 写进 manifest（--size）；老项目没有该字段 → 回落到 192×208
  const FRAME_WIDTH  = manifest.frameSize?.width  ?? DEFAULT_FRAME_WIDTH;
  const FRAME_HEIGHT = manifest.frameSize?.height ?? DEFAULT_FRAME_HEIGHT;

  // All rows share the same column count (pad rows with fewer frames)
  const maxFrames = Math.max(...animNames.map(n => allAnims[n].frameCount));
  const atlasWidth  = maxFrames * FRAME_WIDTH;
  const atlasHeight = animNames.length * FRAME_HEIGHT;

  const outputDirEarly = path.join(runDir, 'output');
  fs.mkdirSync(outputDirEarly, { recursive: true });

  // 各动画帧尺寸不一致时，单张图集拼不出来（单行布局假定同尺寸）→ 必须走每动作独立图集
  const mixedSizes = animNames.some(n => {
    const fs2 = allAnims[n].frameSize;
    return fs2 && (fs2.width !== FRAME_WIDTH || fs2.height !== FRAME_HEIGHT);
  });

  // 单张大图会超纹理上限 → 自动改成每动作一张网格图集
  if (mixedSizes || atlasWidth > MAX_TEXTURE || atlasHeight > MAX_TEXTURE) {
    console.log(mixedSizes
      ? '各动画帧尺寸不一致 → 每动作独立网格图集'
      : `单张图集 ${atlasWidth}×${atlasHeight} 超过 ${MAX_TEXTURE} 纹理上限 → 每动作独立网格图集`);
    await assemblePerAnim(runDir, projectName, animNames, allAnims, FRAME_WIDTH, FRAME_HEIGHT, outputDirEarly);
    return;
  }

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
