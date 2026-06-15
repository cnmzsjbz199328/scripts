/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';

const GAME_RUNS_DIR = './game_runs';

interface GDD {
  title?: string;
  tagline?: string;
  story?: { setting?: string; resolution?: string };
  uiElements?: string[];
  hud?: {
    hearts?: { max?: number };
    score?: { label?: string; goal?: number };
    objective?: { initial?: string };
    dayCounter?: { label?: string };
    [key: string]: unknown;
  };
}

function buildHudHtml(gdd: GDD): string {
  const elements = gdd.uiElements ?? ['hearts', 'score', 'objective'];
  const hud = gdd.hud ?? {};
  const parts: string[] = [];

  if (elements.includes('hearts')) {
    const max = hud.hearts?.max ?? 3;
    const hearts = '♥'.repeat(max);
    parts.push(`<div id="hud-hearts" title="生命值">${hearts}</div>`);
  }
  if (elements.includes('score')) {
    const label = hud.score?.label ?? 'Score';
    parts.push(`<div id="hud-score">${label}: <span id="hud-score-value">0</span></div>`);
  }
  if (elements.includes('objective')) {
    const initial = hud.objective?.initial ?? '';
    parts.push(`<div id="hud-objective"><span id="hud-objective-text">${initial}</span></div>`);
  }
  if (elements.includes('dayCounter')) {
    const label = hud.dayCounter?.label ?? 'Day';
    parts.push(`<div id="hud-day">${label} <span id="hud-day-value">1</span></div>`);
  }

  return parts.join('\n        ');
}

function buildGameHudJs(gdd: GDD): string {
  const elements = gdd.uiElements ?? ['hearts', 'score', 'objective'];
  const max = gdd.hud?.hearts?.max ?? 3;

  const heartsApi = elements.includes('hearts') ? `
    setHearts(current, maxHp) {
      const el = document.getElementById('hud-hearts');
      if (!el) return;
      const filled = Math.max(0, Math.min(current, maxHp ?? ${max}));
      const empty  = (maxHp ?? ${max}) - filled;
      el.textContent = '♥'.repeat(filled) + '♡'.repeat(empty);
    },` : '';

  const scoreApi = elements.includes('score') ? `
    setScore(value) {
      const el = document.getElementById('hud-score-value');
      if (el) el.textContent = value;
    },` : '';

  const objectiveApi = elements.includes('objective') ? `
    setObjective(text) {
      const el = document.getElementById('hud-objective-text');
      if (el) el.textContent = text;
    },` : '';

  const dayApi = elements.includes('dayCounter') ? `
    setDay(day) {
      const el = document.getElementById('hud-day-value');
      if (el) el.textContent = day;
    },` : '';

  return `window.GameHUD = (function () {
      let _startCallback = null;
      let _started = false;

      function showHud() {
        document.getElementById('hud').style.display = 'flex';
      }

      return {${heartsApi}${scoreApi}${objectiveApi}${dayApi}

        onStart(cb) {
          _startCallback = cb;
        },

        showGameOver(win, message) {
          const overlay = document.getElementById('gameover-screen');
          const title   = document.getElementById('gameover-title');
          const msg     = document.getElementById('gameover-message');
          if (title) title.textContent = win ? '🎉 YOU WIN' : 'GAME OVER';
          if (msg)   msg.textContent   = message ?? '';
          if (overlay) overlay.style.display = 'flex';
          document.getElementById('hud').style.display = 'none';
        },
      };

      // Internal: called by start button
      window.__hudStart = function () {
        if (_started) return;
        _started = true;
        document.getElementById('start-screen').style.display = 'none';
        showHud();
        if (_startCallback) _startCallback();
      };
    })();`;
}

async function assembleGame(gameName: string) {
  const runDir = path.join(GAME_RUNS_DIR, gameName);
  const manifestPath = path.join(runDir, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.error(`Game manifest not found at: ${manifestPath}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  console.log(`Assembling game project: ${gameName}...`);

  const gddPath = path.join(runDir, 'gdd.json');
  if (!fs.existsSync(gddPath)) {
    console.error(`gdd.json not found at: ${gddPath}`);
    console.error(`Run Phase 0 first: npx tsx skills/game-gen/design.ts ${gameName}`);
    process.exit(1);
  }
  const gdd: GDD = JSON.parse(fs.readFileSync(gddPath, 'utf-8'));

  const assetsDir = path.join(runDir, 'assets');
  const tilesDest = path.join(assetsDir, 'tiles');
  const spritesDest = path.join(assetsDir, 'sprites');
  const objectsDest = path.join(assetsDir, 'objects');

  fs.mkdirSync(tilesDest, { recursive: true });
  fs.mkdirSync(spritesDest, { recursive: true });
  fs.mkdirSync(objectsDest, { recursive: true });

  // 1. Copy tiles
  const tiles = manifest.assets?.tiles || [];
  for (const tile of tiles) {
    const proj = tile.textureProject || gameName;
    const srcDir = path.join('./texture_runs', proj, 'output');
    if (fs.existsSync(srcDir)) {
      for (const file of fs.readdirSync(srcDir)) {
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
    const proj = char.charProject || char.name;
    const srcDir = path.join('./char_runs', proj, 'output');

    if (fs.existsSync(srcDir)) {
      const webpSrc = path.join(srcDir, 'spritesheet.webp');
      const jsonSrc = path.join(srcDir, 'char.json');
      if (fs.existsSync(webpSrc)) {
        fs.copyFileSync(webpSrc, path.join(spritesDest, `${char.name}.webp`));
        console.log(`Copied character spritesheet: ${char.name}.webp`);
      }
      if (fs.existsSync(jsonSrc)) {
        const meta = JSON.parse(fs.readFileSync(jsonSrc, 'utf-8'));
        meta.spritesheet = `${char.name}.webp`;
        fs.writeFileSync(path.join(spritesDest, `${char.name}.json`), JSON.stringify(meta, null, 2));
        console.log(`Copied character metadata: ${char.name}.json`);
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

  // 4. Load game logic files
  const gameDir = path.join(runDir, 'game');
  let gameConfig = '{}';
  let tilemap = '{}';
  let entities = '[]';
  let gameLogic = '';

  if (fs.existsSync(gameDir)) {
    const configPath  = path.join(gameDir, 'game-config.json');
    const tilemapPath = path.join(gameDir, 'tilemap.json');
    const entitiesPath = path.join(gameDir, 'entities.json');
    const logicPath   = path.join(gameDir, 'game-logic.js');

    if (fs.existsSync(configPath))   gameConfig = fs.readFileSync(configPath, 'utf-8');
    if (fs.existsSync(tilemapPath))  tilemap    = fs.readFileSync(tilemapPath, 'utf-8');
    if (fs.existsSync(entitiesPath)) entities   = fs.readFileSync(entitiesPath, 'utf-8');
    if (fs.existsSync(logicPath))    gameLogic  = fs.readFileSync(logicPath, 'utf-8');
  } else {
    console.warn(`Warning: Game code directory not found at ${gameDir}. Using fallback template.`);
  }

  const fallbackLogic = `
    class FallbackScene extends Phaser.Scene {
      constructor() { super('FallbackScene'); }
      create() {
        this.add.text(100, 100, 'Game logic is missing or still generating...', { fill: '#00ff00', fontSize: '20px' });
      }
    }
    const config = {
      type: Phaser.AUTO,
      width: 800, height: 600,
      parent: 'game-container',
      physics: { default: 'arcade', arcade: { gravity: { y: 300 }, debug: false } },
      scene: FallbackScene,
    };
    new Phaser.Game(config);
  `;

  // 5. Build UI data from GDD
  const gameTitle    = gdd.title    || gameName;
  const tagline      = gdd.tagline  || '';
  const storySetting = gdd.story?.setting  || '';
  const hudHtml      = buildHudHtml(gdd);
  const gameHudJs    = buildGameHudJs(gdd);
  const gameLogicSection = gameLogic || fallbackLogic;

  // 6. Write index.html
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${gameTitle}</title>
  <script src="https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: #0b0f19;
      color: #fff;
      font-family: 'Segoe UI', monospace;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      overflow: hidden;
    }

    h1#game-title {
      font-size: 1.6rem;
      letter-spacing: 0.12em;
      color: #e2e8f0;
      margin-bottom: 10px;
    }

    /* ── game wrapper ── */
    #game-wrapper {
      position: relative;
      border: 3px solid #3b82f6;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6);
      overflow: hidden;
    }

    /* ── HUD overlay ── */
    #hud {
      display: none;
      position: absolute;
      top: 0; left: 0; right: 0;
      padding: 10px 14px;
      gap: 18px;
      flex-direction: row;
      align-items: center;
      background: linear-gradient(to bottom, rgba(0,0,0,0.55), transparent);
      pointer-events: none;
      z-index: 10;
      font-size: 15px;
      user-select: none;
    }

    #hud-hearts { color: #f87171; letter-spacing: 2px; font-size: 18px; }
    #hud-score  { color: #fbbf24; }
    #hud-objective { color: #a5f3fc; flex: 1; text-align: center; }
    #hud-day    { color: #86efac; margin-left: auto; }

    /* ── shared overlay styles ── */
    .game-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 20;
      background: rgba(8, 12, 24, 0.88);
      backdrop-filter: blur(3px);
    }

    .overlay-card {
      text-align: center;
      max-width: 520px;
      padding: 36px 40px;
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid #334155;
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }

    .overlay-card h2 {
      font-size: 2rem;
      margin-bottom: 8px;
      color: #f1f5f9;
      letter-spacing: 0.08em;
    }

    .overlay-card .tagline {
      font-size: 0.95rem;
      color: #94a3b8;
      margin-bottom: 16px;
      font-style: italic;
    }

    .overlay-card .story-setting {
      font-size: 0.88rem;
      color: #64748b;
      line-height: 1.6;
      margin-bottom: 24px;
    }

    .overlay-card .controls-hint {
      font-size: 0.78rem;
      color: #475569;
      line-height: 1.8;
      margin-top: 14px;
    }

    /* ── buttons ── */
    .game-btn {
      display: inline-block;
      padding: 12px 36px;
      font-size: 1rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: transform 0.1s, box-shadow 0.1s;
    }

    .game-btn:hover  { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.4); }
    .game-btn:active { transform: translateY(0); }

    #start-btn   { background: #2563eb; color: #fff; }
    #restart-btn { background: #dc2626; color: #fff; }

    /* ── game-over title colours ── */
    #gameover-title.win  { color: #4ade80; }
    #gameover-title.lose { color: #f87171; }
  </style>
</head>
<body>
  <h1 id="game-title">${gameTitle}</h1>

  <div id="game-wrapper">
    <div id="game-container"></div>

    <!-- HUD overlay -->
    <div id="hud">
      ${hudHtml}
    </div>

    <!-- Start screen overlay -->
    <div id="start-screen" class="game-overlay">
      <div class="overlay-card">
        <h2>${gameTitle}</h2>
        ${tagline ? `<p class="tagline">${tagline}</p>` : ''}
        ${storySetting ? `<p class="story-setting">${storySetting}</p>` : ''}
        <button id="start-btn" class="game-btn" onclick="window.__hudStart()">▶ START GAME</button>
        <p class="controls-hint">
          WASD / Arrow Keys to move<br>
          Z: Use Item &nbsp;|&nbsp; X: Sleep &nbsp;|&nbsp; E: Interact
        </p>
      </div>
    </div>

    <!-- Game over overlay -->
    <div id="gameover-screen" class="game-overlay" style="display:none">
      <div class="overlay-card">
        <h2 id="gameover-title">GAME OVER</h2>
        <p id="gameover-message" class="story-setting"></p>
        <button id="restart-btn" class="game-btn" onclick="location.reload()">↩ RESTART</button>
      </div>
    </div>
  </div>

  <script>
    window.GAME_CONFIG  = ${gameConfig.trim()};
    window.TILEMAP_DATA = ${tilemap.trim()};
    window.ENTITIES_DATA = ${entities.trim()};

    // Expose GameHUD API before game-logic.js loads
    ${gameHudJs}

    // Wire gameover title colour after DOM is ready
    const _origShowGameOver = window.GameHUD.showGameOver.bind(window.GameHUD);
    window.GameHUD.showGameOver = function(win, message) {
      _origShowGameOver(win, message);
      const title = document.getElementById('gameover-title');
      if (title) {
        title.className = win ? 'win' : 'lose';
        if (!win) title.textContent = 'GAME OVER';
      }
    };
  </script>
  <script src="game/game-logic.js"></script>
</body>
</html>
`;

  fs.writeFileSync(path.join(runDir, 'index.html'), htmlContent);
  console.log(`Game HTML assembled: ${path.join(runDir, 'index.html')}`);

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
