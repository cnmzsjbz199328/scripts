/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';

const GAME_RUNS_DIR = './game_runs';

async function assembleGame(gameName: string) {
  const runDir = path.join(GAME_RUNS_DIR, gameName);
  const manifestPath = path.join(runDir, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.error(`Game manifest not found at: ${manifestPath}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  console.log(`Assembling game project: ${gameName}...`);

  const assetsDir = path.join(runDir, 'assets');
  const tilesDest = path.join(assetsDir, 'tiles');
  const spritesDest = path.join(assetsDir, 'sprites');
  const objectsDest = path.join(assetsDir, 'objects');

  // Create destination directories
  fs.mkdirSync(tilesDest, { recursive: true });
  fs.mkdirSync(spritesDest, { recursive: true });
  fs.mkdirSync(objectsDest, { recursive: true });

  // 1. Copy tiles
  const tiles = manifest.assets?.tiles || [];
  for (const tile of tiles) {
    const proj = tile.textureProject || gameName;
    const srcDir = path.join('./texture_runs', proj, 'output');
    if (fs.existsSync(srcDir)) {
      const files = fs.readdirSync(srcDir);
      for (const file of files) {
        if (file.startsWith(tile.name) && (file.endsWith('.png') || file.endsWith('.webp'))) {
          fs.copyFileSync(path.join(srcDir, file), path.join(tilesDest, file));
          console.log(`Copied tile asset: ${file}`);
        }
      }
    } else {
      console.warn(`Warning: Texture output directory not found for project: ${proj}`);
    }
  }

  // 2. Copy characters
  const characters = manifest.assets?.characters || [];
  for (const char of characters) {
    const proj = char.petProject || char.charProject || char.name;
    
    // Check char_runs first, then pet_runs
    let srcDir = path.join('./char_runs', proj, 'output');
    let jsonName = 'char.json';
    
    if (!fs.existsSync(srcDir)) {
      srcDir = path.join('./pet_runs', proj, 'output');
      jsonName = 'pet.json';
    }

    if (fs.existsSync(srcDir)) {
      const webpSrc = path.join(srcDir, 'spritesheet.webp');
      const jsonSrc = path.join(srcDir, jsonName);
      if (fs.existsSync(webpSrc)) {
        fs.copyFileSync(webpSrc, path.join(spritesDest, `${char.name}.webp`));
        console.log(`Copied character spritesheet: ${char.name}.webp from ${srcDir}`);
      }
      if (fs.existsSync(jsonSrc)) {
        const meta = JSON.parse(fs.readFileSync(jsonSrc, 'utf-8'));
        meta.spritesheet = `${char.name}.webp`;
        fs.writeFileSync(path.join(spritesDest, `${char.name}.json`), JSON.stringify(meta, null, 2));
        console.log(`Copied character metadata: ${char.name}.json from ${srcDir}`);
      }
    } else {
      console.warn(`Warning: Character output directory not found for project: ${proj}`);
    }
  }

  // 3. Copy objects
  const objects = manifest.assets?.objects || [];
  for (const obj of objects) {
    const proj = obj.objectProject || obj.name;
    const srcDir = path.join('./object_runs', proj, 'output');
    if (fs.existsSync(srcDir)) {
      const webpSrc = path.join(srcDir, 'object.webp');
      const jsonSrc = path.join(srcDir, 'object.json');
      if (fs.existsSync(webpSrc)) {
        fs.copyFileSync(webpSrc, path.join(objectsDest, `${obj.name}.webp`));
        console.log(`Copied object spritesheet: ${obj.name}.webp`);
      }
      if (fs.existsSync(jsonSrc)) {
        const meta = JSON.parse(fs.readFileSync(jsonSrc, 'utf-8'));
        meta.spritesheet = `${obj.name}.webp`;
        fs.writeFileSync(path.join(objectsDest, `${obj.name}.json`), JSON.stringify(meta, null, 2));
        console.log(`Copied object metadata: ${obj.name}.json`);
      }
    } else {
      console.warn(`Warning: Object output directory not found for project: ${proj}`);
    }
  }

  // 4. Assemble index.html
  const gameDir = path.join(runDir, 'game');
  let gameConfig = '{}';
  let tilemap = '{}';
  let entities = '[]';
  let gameLogic = '';

  if (fs.existsSync(gameDir)) {
    const configPath = path.join(gameDir, 'game-config.json');
    const tilemapPath = path.join(gameDir, 'tilemap.json');
    const entitiesPath = path.join(gameDir, 'entities.json');
    const logicPath = path.join(gameDir, 'game-logic.js');

    if (fs.existsSync(configPath)) gameConfig = fs.readFileSync(configPath, 'utf-8');
    if (fs.existsSync(tilemapPath)) tilemap = fs.readFileSync(tilemapPath, 'utf-8');
    if (fs.existsSync(entitiesPath)) entities = fs.readFileSync(entitiesPath, 'utf-8');
    if (fs.existsSync(logicPath)) gameLogic = fs.readFileSync(logicPath, 'utf-8');
  } else {
    console.warn(`Warning: Game code directory not found at ${gameDir}. Generating empty template.`);
  }

  const fallbackLogic = `
    class FallbackScene extends Phaser.Scene {
      constructor() { super('FallbackScene'); }
      preload() {
        this.load.image('default_tile', 'assets/tiles/grass_base.png');
      }
      create() {
        this.add.text(100, 100, 'Game Logic code is missing or compiling...', { fill: '#00ff00', fontSize: '20px' });
      }
    }
    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: 'game-container',
      physics: { default: 'arcade', arcade: { gravity: { y: 300 }, debug: false } },
      scene: FallbackScene
    };
    new Phaser.Game(config);
  `;

  const gameLogicSection = gameLogic || fallbackLogic;

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Game Gen - ${gameName}</title>
  <script src="https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b0f19;
      color: #ffffff;
      font-family: monospace;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      overflow: hidden;
    }
    #game-container {
      border: 4px solid #3b82f6;
      border-radius: 8px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    }
    #controls-tip {
      margin-top: 15px;
      font-size: 14px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <h1>${gameName}</h1>
  <div id="game-container"></div>
  <div id="controls-tip">Controls: Arrow keys to move, Z to attack</div>

  <script>
    const GAME_CONFIG = ${gameConfig.trim()};
    const TILEMAP_DATA = ${tilemap.trim()};
    const ENTITIES_DATA = ${entities.trim()};

    ${gameLogicSection}
  </script>
</body>
</html>
`;

  fs.writeFileSync(path.join(runDir, 'index.html'), htmlContent);
  console.log(`Game HTML assembled successfully: \${path.join(runDir, 'index.html')}`);

  manifest.status = 'assembled';
  manifest.updated_at = new Date().toISOString();
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: npx tsx skills/game-gen/assemble.ts <GameName>');
  process.exit(1);
}

assembleGame(args[0]).catch(console.error);
