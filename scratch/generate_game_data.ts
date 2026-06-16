import fs from 'fs';
import path from 'path';

const GAME_DIR = './game_runs/MermaidPrincess/game';

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 1. game-config.json
const gameConfig = {
  width: 3200,
  height: 640,
  tileWidth: 64,
  tileHeight: 64,
  gravity: 600, // lower gravity for floating underwater physics
  player: {
    speed: 250,
    jumpForce: -420
  }
};

// Helper to create a grid layer (50x10 = 500 cells)
function createEmptyGrid(): number[] {
  return Array(500).fill(0);
}

// Helper to set tiles in grid
function setLine(grid: number[], row: number, startCol: number, endCol: number, tileId: number) {
  for (let col = startCol; col <= endCol; col++) {
    const idx = row * 50 + col;
    if (idx >= 0 && idx < 500) {
      grid[idx] = tileId;
    }
  }
}

// 2. tilemap.json
// Level 1 uses Tile 1 (coral_ground) and Tile 2 (coral_platform)
const g1 = createEmptyGrid();
// Ground (row 9, some in row 8)
setLine(g1, 9, 0, 10, 1);
setLine(g1, 9, 14, 25, 1);
setLine(g1, 9, 29, 49, 1);
setLine(g1, 8, 0, 4, 1);
setLine(g1, 8, 45, 49, 1);
// Platforms
setLine(g1, 6, 6, 9, 2);
setLine(g1, 5, 11, 14, 2);
setLine(g1, 6, 18, 22, 2);
setLine(g1, 5, 25, 28, 2);
setLine(g1, 6, 33, 37, 2);
setLine(g1, 5, 41, 44, 2);

// Level 2 uses Tile 3 (jellyfish_ground) and Tile 4 (jellyfish_platform)
const g2 = createEmptyGrid();
setLine(g2, 9, 0, 12, 3);
setLine(g2, 9, 16, 28, 3);
setLine(g2, 9, 32, 49, 3);
setLine(g2, 8, 0, 3, 3);
setLine(g2, 8, 46, 49, 3);
// Platforms
setLine(g2, 6, 5, 8, 4);
setLine(g2, 5, 12, 15, 4);
setLine(g2, 6, 19, 23, 4);
setLine(g2, 5, 28, 31, 4);
setLine(g2, 6, 35, 39, 4);
setLine(g2, 5, 42, 45, 4);

// Level 3 uses Tile 5 (shipwreck_ground) and Tile 6 (shipwreck_platform)
const g3 = createEmptyGrid();
setLine(g3, 9, 0, 8, 5);
setLine(g3, 9, 12, 22, 5);
setLine(g3, 9, 26, 36, 5);
setLine(g3, 9, 40, 49, 5);
setLine(g3, 8, 0, 2, 5);
setLine(g3, 8, 47, 49, 5);
// Platforms
setLine(g3, 6, 4, 7, 6);
setLine(g3, 5, 9, 12, 6);
setLine(g3, 6, 15, 19, 6);
setLine(g3, 5, 22, 25, 6);
setLine(g3, 6, 29, 33, 6);
setLine(g3, 5, 36, 39, 6);
setLine(g3, 6, 42, 45, 6);

const tilemap = {
  tileWidth: 64,
  tileHeight: 64,
  tileIndex: {
    "1": "coral_ground_base",
    "2": "coral_platform_base",
    "3": "jellyfish_ground_base",
    "4": "jellyfish_platform_base",
    "5": "shipwreck_ground_base",
    "6": "shipwreck_platform_base"
  },
  levels: [
    {
      level: 1,
      width: 50,
      height: 10,
      layers: {
        ground: g1
      }
    },
    {
      level: 2,
      width: 50,
      height: 10,
      layers: {
        ground: g2
      }
    },
    {
      level: 3,
      width: 50,
      height: 10,
      layers: {
        ground: g3
      }
    }
  ]
};

// 3. entities.json
// Let's scatter 35 pearls in level 1, 35 in level 2, and 35 in level 3. That makes 105 pearls total, enough to reach 100!
function generatePearls(levelNum: number): Array<{ x: number, y: number }> {
  const list: Array<{ x: number, y: number }> = [];
  // Generate pearl paths
  // Arc 1
  for (let i = 0; i < 5; i++) {
    list.push({ x: 200 + i * 50, y: 500 - Math.sin((i / 4) * Math.PI) * 100 });
  }
  // Above first platform
  for (let i = 0; i < 3; i++) {
    list.push({ x: 450 + i * 60, y: 300 });
  }
  // Arc 2
  for (let i = 0; i < 5; i++) {
    list.push({ x: 800 + i * 50, y: 480 - Math.sin((i / 4) * Math.PI) * 80 });
  }
  // Above mid platforms
  for (let i = 0; i < 4; i++) {
    list.push({ x: 1200 + i * 60, y: 250 });
  }
  // Arc 3
  for (let i = 0; i < 5; i++) {
    list.push({ x: 1600 + i * 50, y: 500 - Math.sin((i / 4) * Math.PI) * 100 });
  }
  // Above late platforms
  for (let i = 0; i < 3; i++) {
    list.push({ x: 2150 + i * 60, y: 280 });
  }
  // Arc 4
  for (let i = 0; i < 5; i++) {
    list.push({ x: 2500 + i * 50, y: 480 - Math.sin((i / 4) * Math.PI) * 80 });
  }
  // Near exit
  for (let i = 0; i < 5; i++) {
    list.push({ x: 2850 + i * 40, y: 450 });
  }
  return list;
}

const entities = {
  levels: [
    {
      level: 1,
      playerSpawn: { x: 100, y: 450 },
      coins: generatePearls(1), // pearls
      enemies: [
        // OctopusMonster
        { x: 550, y: 450, patrolLeft: 420, patrolRight: 750 },
        { x: 1850, y: 450, patrolLeft: 1700, patrolRight: 2000 },
        // Shark
        { x: 1300, y: 450, patrolLeft: 1100, patrolRight: 1500 },
        { x: 2500, y: 450, patrolLeft: 2300, patrolRight: 2700 }
      ],
      spikeBalls: [
        // electric jellyfish
        { x: 1050, y: 220, rangeY: 100, speed: 2 },
        { x: 2250, y: 200, rangeY: 120, speed: 2.5 }
      ],
      door: { x: 3100, y: 512 }
    },
    {
      level: 2,
      playerSpawn: { x: 100, y: 450 },
      coins: generatePearls(2), // pearls
      enemies: [
        // OctopusMonster
        { x: 750, y: 450, patrolLeft: 600, patrolRight: 900 },
        { x: 2200, y: 450, patrolLeft: 2000, patrolRight: 2400 },
        // Shark
        { x: 1450, y: 450, patrolLeft: 1300, patrolRight: 1700 }
      ],
      spikeBalls: [
        // electric jellyfish
        { x: 950, y: 180, rangeY: 140, speed: 3 },
        { x: 2650, y: 220, rangeY: 120, speed: 2.2 },
        // pufferfish spiny
        { x: 500, y: 250, rangeY: 150, speed: 2 },
        { x: 1800, y: 200, rangeY: 130, speed: 2.8 }
      ],
      door: { x: 3100, y: 512 }
    },
    {
      level: 3,
      playerSpawn: { x: 100, y: 450 },
      coins: generatePearls(3), // pearls
      enemies: [
        // OctopusMonster
        { x: 800, y: 450, patrolLeft: 700, patrolRight: 950 },
        { x: 1800, y: 450, patrolLeft: 1650, patrolRight: 1950 },
        // Shark
        { x: 1300, y: 450, patrolLeft: 1100, patrolRight: 1500 },
        { x: 2450, y: 450, patrolLeft: 2250, patrolRight: 2650 }
      ],
      spikeBalls: [
        // electric jellyfish
        { x: 600, y: 200, rangeY: 140, speed: 2.5 },
        { x: 2050, y: 250, rangeY: 120, speed: 2.8 },
        // pufferfish spiny
        { x: 1100, y: 180, rangeY: 130, speed: 3.2 },
        { x: 1600, y: 220, rangeY: 150, speed: 2 },
        { x: 2850, y: 200, rangeY: 120, speed: 2.5 }
      ],
      door: { x: 3100, y: 512 }
    }
  ]
};

// Write files
ensureDir(GAME_DIR);
fs.writeFileSync(path.join(GAME_DIR, 'game-config.json'), JSON.stringify(gameConfig, null, 2));
fs.writeFileSync(path.join(GAME_DIR, 'tilemap.json'), JSON.stringify(tilemap, null, 2));
fs.writeFileSync(path.join(GAME_DIR, 'entities.json'), JSON.stringify(entities, null, 2));
console.log('Game config, tilemap, and entities written successfully.');
