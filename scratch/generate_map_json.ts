import fs from 'fs';
import path from 'path';

const MAP_WIDTH = 50;
const MAP_HEIGHT = 10;

// Tile ID Mapping
// 0: Empty
// 1: bamboo_ground_base
// 2: bamboo_platform_base
// 3: castle_roof_base
// 4: castle_platform_base
// 5: cloud_platform_base

interface TilemapLevel {
  level: number;
  width: number;
  height: number;
  layers: {
    ground: number[];
  };
}

function createLevelMap(levelNum: number): number[] {
  const map = Array(MAP_WIDTH * MAP_HEIGHT).fill(0);

  const setTile = (x: number, y: number, id: number) => {
    if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
      map[y * MAP_WIDTH + x] = id;
    }
  };

  const setRect = (x1: number, y1: number, x2: number, y2: number, id: number) => {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        setTile(x, y, id);
      }
    }
  };

  if (levelNum === 1) {
    // Bamboo Forest
    // Solid ground (y=9) with pits
    setRect(0, 9, 14, 9, 1);
    // Pit at 15-16
    setRect(17, 9, 29, 9, 1);
    // Pit at 30-31
    setRect(32, 9, 49, 9, 1);

    // Bamboo Platforms (y=6)
    setRect(5, 6, 9, 6, 2);
    setRect(14, 6, 18, 6, 2); // over 1st pit
    setRect(22, 6, 25, 6, 2);
    setRect(29, 6, 33, 6, 2); // over 2nd pit
    setRect(38, 6, 42, 6, 2);

    // Extra high platforms
    setRect(7, 3, 9, 3, 2);
    setRect(30, 3, 32, 3, 2);
    setRect(40, 3, 41, 3, 2);

  } else if (levelNum === 2) {
    // Castle Rooftops
    // Roof ground (y=9) with pits
    setRect(0, 9, 9, 9, 3);
    // Pit 10-11
    setRect(12, 9, 21, 9, 3);
    // Pit 22-23
    setRect(24, 9, 36, 9, 3);
    // Pit 38-39
    setRect(40, 9, 49, 9, 3);

    // Wooden Castle Platforms (y=6)
    setRect(3, 6, 6, 6, 4);
    setRect(8, 7, 11, 7, 4);
    setRect(14, 6, 18, 6, 4);
    setRect(21, 5, 25, 5, 4);
    setRect(28, 6, 32, 6, 4);
    setRect(35, 7, 39, 7, 4);
    setRect(42, 6, 46, 6, 4);

    // Extra high platform
    setRect(15, 3, 17, 3, 4);
    setRect(30, 3, 32, 3, 4);

  } else if (levelNum === 3) {
    // Cloud Kingdom (no continuous ground!)
    // Only starting cloud
    setRect(0, 9, 3, 9, 5);
    // Clouds at various heights
    setRect(5, 7, 8, 7, 5);
    setRect(11, 6, 14, 6, 5);
    setRect(17, 7, 19, 7, 5);
    setRect(22, 5, 25, 5, 5);
    setRect(28, 6, 31, 6, 5);
    setRect(34, 7, 37, 7, 5);
    setRect(40, 6, 43, 6, 5);
    setRect(46, 8, 49, 8, 5); // ending platform
  }

  return map;
}

// Generate tilemap.json
const tilemapData = {
  tileWidth: 64,
  tileHeight: 64,
  tileIndex: {
    "1": "bamboo_ground_base",
    "2": "bamboo_platform_base",
    "3": "castle_roof_base",
    "4": "castle_platform_base",
    "5": "cloud_platform_base"
  },
  levels: [
    { level: 1, width: MAP_WIDTH, height: MAP_HEIGHT, layers: { ground: createLevelMap(1) } },
    { level: 2, width: MAP_WIDTH, height: MAP_HEIGHT, layers: { ground: createLevelMap(2) } },
    { level: 3, width: MAP_WIDTH, height: MAP_HEIGHT, layers: { ground: createLevelMap(3) } }
  ]
};

// Generate entities.json
const entitiesData = {
  levels: [
    {
      level: 1,
      playerSpawn: { x: 96, y: 500 },
      coins: [
        { x: 200, y: 520 }, { x: 260, y: 520 }, { x: 320, y: 520 },
        { x: 448, y: 320 }, { x: 512, y: 320 }, { x: 576, y: 320 },
        { x: 750, y: 520 }, { x: 800, y: 520 },
        { x: 1024, y: 320 }, { x: 1088, y: 320 }, // over 1st pit
        { x: 1300, y: 520 }, { x: 1360, y: 520 },
        { x: 1536, y: 320 }, { x: 1600, y: 320 },
        { x: 1800, y: 520 }, { x: 1900, y: 320 }, { x: 1960, y: 320 },
        { x: 2112, y: 320 }, // over 2nd pit
        { x: 2300, y: 520 }, { x: 2400, y: 520 },
        { x: 2560, y: 320 }, { x: 2624, y: 320 },
        { x: 2750, y: 520 }, { x: 2810, y: 520 },
        { x: 2900, y: 400 }, { x: 2960, y: 400 },
        { x: 3020, y: 520 }, { x: 3080, y: 520 },
        { x: 500, y: 150 }, { x: 560, y: 150 }, // high up
        { x: 1980, y: 150 }, { x: 2040, y: 150 },
        { x: 2620, y: 150 }, { x: 2680, y: 150 }
      ], // 34 coins total
      enemies: [
        { x: 550, y: 500, patrolLeft: 400, patrolRight: 800 },
        { x: 1400, y: 500, patrolLeft: 1200, patrolRight: 1700 },
        { x: 2350, y: 500, patrolLeft: 2100, patrolRight: 2600 }
      ],
      spikeBalls: [
        { x: 1024, y: 200, rangeY: 120, speed: 2 },
        { x: 2048, y: 250, rangeY: 150, speed: 2.5 }
      ],
      door: { x: 3100, y: 512 }
    },
    {
      level: 2,
      playerSpawn: { x: 96, y: 500 },
      coins: [
        { x: 180, y: 520 }, { x: 240, y: 520 },
        { x: 350, y: 320 }, { x: 410, y: 320 },
        { x: 600, y: 380 }, { x: 660, y: 380 },
        { x: 850, y: 520 }, { x: 910, y: 520 },
        { x: 1050, y: 320 }, { x: 1110, y: 320 }, // over 1st pit
        { x: 1300, y: 520 }, { x: 1360, y: 520 },
        { x: 1500, y: 260 }, { x: 1560, y: 260 },
        { x: 1700, y: 520 }, { x: 1760, y: 520 },
        { x: 1950, y: 320 }, { x: 2010, y: 320 },
        { x: 2200, y: 520 }, { x: 2300, y: 260 }, // over 2nd pit
        { x: 2450, y: 520 }, { x: 2510, y: 520 },
        { x: 2650, y: 320 }, { x: 2710, y: 320 },
        { x: 2850, y: 520 }, { x: 2910, y: 520 },
        { x: 3000, y: 520 },
        { x: 1020, y: 120 }, { x: 1080, y: 120 },
        { x: 2050, y: 120 }, { x: 2110, y: 120 },
        { x: 2700, y: 120 }, { x: 2760, y: 120 }
      ], // 33 coins total
      enemies: [
        { x: 750, y: 500, patrolLeft: 600, patrolRight: 900 },
        { x: 1600, y: 500, patrolLeft: 1300, patrolRight: 1800 },
        { x: 2700, y: 500, patrolLeft: 2500, patrolRight: 2850 },
        { x: 1550, y: 320, patrolLeft: 1450, patrolRight: 1650 } // platform patrol
      ],
      spikeBalls: [
        { x: 700, y: 220, rangeY: 100, speed: 2 },
        { x: 1400, y: 180, rangeY: 140, speed: 3 },
        { x: 2200, y: 220, rangeY: 120, speed: 2.2 },
        { x: 2800, y: 250, rangeY: 150, speed: 2.8 }
      ],
      door: { x: 3100, y: 512 }
    },
    {
      level: 3,
      playerSpawn: { x: 96, y: 500 },
      coins: [
        { x: 200, y: 450 }, { x: 260, y: 450 },
        { x: 410, y: 380 }, { x: 470, y: 380 },
        { x: 600, y: 280 }, { x: 660, y: 280 },
        { x: 800, y: 320 }, { x: 860, y: 320 },
        { x: 1000, y: 400 }, { x: 1060, y: 400 },
        { x: 1200, y: 220 }, { x: 1260, y: 220 },
        { x: 1400, y: 320 }, { x: 1460, y: 320 },
        { x: 1600, y: 220 }, { x: 1660, y: 220 },
        { x: 1800, y: 380 }, { x: 1860, y: 380 },
        { x: 2000, y: 250 }, { x: 2060, y: 250 },
        { x: 2200, y: 320 }, { x: 2260, y: 320 },
        { x: 2400, y: 220 }, { x: 2460, y: 220 },
        { x: 2600, y: 380 }, { x: 2660, y: 380 },
        { x: 2800, y: 250 }, { x: 2860, y: 250 },
        { x: 2960, y: 500 }, { x: 3020, y: 500 },
        // High coins
        { x: 630, y: 150 }, { x: 1230, y: 100 },
        { x: 1830, y: 150 }, { x: 2430, y: 100 },
        { x: 2830, y: 120 }
      ], // 35 coins total
      enemies: [
        { x: 830, y: 320, patrolLeft: 730, patrolRight: 930 },
        { x: 2230, y: 320, patrolLeft: 2130, patrolRight: 2330 }
      ],
      spikeBalls: [
        { x: 350, y: 300, rangeY: 150, speed: 2 },
        { x: 950, y: 250, rangeY: 120, speed: 2.5 },
        { x: 1550, y: 200, rangeY: 180, speed: 3.2 },
        { x: 2150, y: 250, rangeY: 150, speed: 2.8 },
        { x: 2750, y: 200, rangeY: 130, speed: 2.5 }
      ],
      door: { x: 3100, y: 448 } // on the final cloud
    }
  ]
};

const gameDir = './game_runs/NinjaCat/game';
fs.writeFileSync(path.join(gameDir, 'tilemap.json'), JSON.stringify(tilemapData, null, 2));
fs.writeFileSync(path.join(gameDir, 'entities.json'), JSON.stringify(entitiesData, null, 2));

console.log('✓ tilemap.json and entities.json written successfully.');
