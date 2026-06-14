/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function processTexture() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error("Usage: npx tsx scripts/texture-process.ts <ProjectName> <MaterialName> <image_path> [--grid=1x1|2x2|3x3] [--suffix=xxx] [--suffixes=s1,s2,...] [--size=512|256]");
    process.exit(1);
  }

  const [projectName, materialName, imagePath] = args;

  // Parse optional arguments
  const gridArg = args.find(a => a.startsWith('--grid='))?.split('=')[1] ?? '1x1';
  const suffixArg = args.find(a => a.startsWith('--suffix='))?.split('=')[1] ?? '';
  const suffixesArg = args.find(a => a.startsWith('--suffixes='))?.split('=')[1] ?? '';
  const sizeArg = parseInt(args.find(a => a.startsWith('--size='))?.split('=')[1] ?? '512');

  const runDir = path.join('./texture_runs', projectName);
  const manifestPath = path.join(runDir, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.error(`Project not found. Run: npx tsx scripts/texture-prepare.ts ${projectName}`);
    process.exit(1);
  }

  if (!fs.existsSync(imagePath)) {
    console.error(`Source image not found: ${imagePath}`);
    process.exit(1);
  }

  const outputDir = path.join(runDir, 'output');
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`Processing material "${materialName}" for project "${projectName}"...`);

  // Load manifest
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  // Get image metadata
  const metadata = await sharp(imagePath).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error("Could not read image dimensions.");
  }

  const srcWidth = metadata.width;
  const srcHeight = metadata.height;

  // Determine grid dimensions
  let cols = 1;
  let rows = 1;
  if (gridArg === '2x2') {
    cols = 2; rows = 2;
  } else if (gridArg === '3x3') {
    cols = 3; rows = 3;
  } else if (gridArg !== '1x1') {
    console.warn(`Unsupported grid format "${gridArg}". Defaulting to 1x1.`);
  }

  const isGrid = cols > 1 || rows > 1;

  if (isGrid) {
    // Slicing Mode
    const cellW = Math.floor(srcWidth / cols);
    const cellH = Math.floor(srcHeight / rows);
    const totalCells = cols * rows;

    // Parse suffixes list
    const suffixList = suffixesArg ? suffixesArg.split(/[\s,]+/) : [];

    console.log(`Slicing ${gridArg} grid from ${srcWidth}x${srcHeight} image into ${totalCells} cells (${cellW}x${cellH} each)...`);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const index = r * cols + c;
        // Determine file name suffix
        let cellSuffix = '';
        if (suffixList[index]) {
          cellSuffix = `_${suffixList[index]}`;
        } else {
          cellSuffix = `_${index}`;
        }

        const outName = `${materialName}${cellSuffix}.png`;
        const outPath = path.join(outputDir, outName);

        const left = c * cellW;
        const top = r * cellH;

        await sharp(imagePath)
          .extract({ left, top, width: cellW, height: cellH })
          .resize(sizeArg, sizeArg)
          .png()
          .toFile(outPath);

        console.log(`  Saved: ${outName} (size: ${sizeArg}x${sizeArg})`);

        // Register texture in manifest
        manifest.textures[outName] = {
          material: materialName,
          suffix: cellSuffix.replace('_', ''),
          size: sizeArg,
          grid_source: gridArg,
          updated_at: new Date().toISOString()
        };
      }
    }
  } else {
    // Single image mode
    const cellSuffix = suffixArg ? `_${suffixArg}` : '';
    const outName = `${materialName}${cellSuffix}.png`;
    const outPath = path.join(outputDir, outName);

    await sharp(imagePath)
      .resize(sizeArg, sizeArg)
      .png()
      .toFile(outPath);

    console.log(`  Saved: ${outName} (size: ${sizeArg}x${sizeArg})`);

    // Register texture in manifest
    manifest.textures[outName] = {
      material: materialName,
      suffix: suffixArg,
      size: sizeArg,
      grid_source: '1x1',
      updated_at: new Date().toISOString()
    };
  }

  // Update manifest
  manifest.status = 'updated';
  manifest.updated_at = new Date().toISOString();
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`Manifest updated at: ${manifestPath}`);
}

processTexture().catch(console.error);
