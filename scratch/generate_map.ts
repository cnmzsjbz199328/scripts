import fs from 'fs';
import path from 'path';

const GAME_DIR = './game_runs/PokePixel/game';
fs.mkdirSync(GAME_DIR, { recursive: true });

const W = 30;
const H = 30;
const TW = 64;
const TH = 64;

// Tile index mappings
// 0 = empty
// 1 = grass_base
// 2 = tall_grass (decor_floor)
// 3 = cave_floor
// 4 = rock_wall (objects, collision)
// 5 = snow_floor
// 6 = ice_rock (objects, collision)
// 7 = gym_floor
// 8 = gym_wall (objects, collision)

const tileIndex = {
  "1": "grass_base",
  "2": "tall_grass",
  "3": "cave_floor",
  "4": "rock_wall",
  "5": "snow_floor",
  "6": "ice_rock",
  "7": "gym_floor",
  "8": "gym_wall"
};

const ground = new Array(W * H).fill(0);
const decor_floor = new Array(W * H).fill(0);
const objects = new Array(W * H).fill(0);
const decor_top = new Array(W * H).fill(0);

// Helper to check coordinates
const getIdx = (c: number, r: number) => r * W + c;

// Fill ground base layers
for (let r = 0; r < H; r++) {
  for (let c = 0; c < W; c++) {
    const idx = getIdx(c, r);
    if (c < 15 && r < 15) {
      ground[idx] = 1; // Grassland
    } else if (c < 15 && r >= 15) {
      ground[idx] = 3; // Cave
    } else if (c >= 15 && r < 15) {
      ground[idx] = 5; // Snowy Mountain
    } else {
      ground[idx] = 7; // Gym
    }
  }
}

// Draw separating border walls on objects layer
// 1. Divider between Grass and Cave (Row 14, col 0..14)
for (let c = 0; c < 15; c++) {
  // Let column 7 be the passageway
  if (c !== 7) {
    objects[getIdx(c, 14)] = 4; // rock_wall
  }
}

// 2. Divider between Grass and Snow (Column 14, row 0..14)
for (let r = 0; r < 15; r++) {
  // Let row 7 be the passageway
  if (r !== 7) {
    objects[getIdx(14, r)] = 6; // ice_rock
  }
}

// 3. Divider between Snow and Gym (Row 14, col 15..29)
for (let c = 15; c < 30; c++) {
  // Let column 22 be the Gym Entrance Gate
  if (c !== 22) {
    objects[getIdx(c, 14)] = 8; // gym_wall
  }
}

// 4. Divider between Cave and Gym (Column 14, row 15..29)
// Keep completely blocked so player goes Grass -> Cave/Snow -> Gym
for (let r = 15; r < 30; r++) {
  objects[getIdx(14, r)] = 8; // gym_wall
}

// Outer boundaries around the entire 30x30 map
for (let c = 0; c < W; c++) {
  // Top boundary (Grass/Snow)
  objects[getIdx(c, 0)] = c < 15 ? 4 : 6;
  // Bottom boundary (Cave/Gym)
  objects[getIdx(c, H - 1)] = c < 15 ? 4 : 8;
}
for (let r = 0; r < H; r++) {
  // Left boundary (Grass/Cave)
  objects[getIdx(0, r)] = r < 15 ? 4 : 4;
  // Right boundary (Snow/Gym)
  objects[getIdx(W - 1, r)] = r < 15 ? 6 : 8;
}

// Scatter tall grass in Grassland
const addTallGrassPatch = (sc: number, sr: number, w: number, h: number) => {
  for (let r = sr; r < sr + h; r++) {
    for (let c = sc; c < sc + w; c++) {
      if (c >= 0 && c < 15 && r >= 0 && r < 15) {
        // Only if ground is grass and objects is empty
        const idx = getIdx(c, r);
        if (ground[idx] === 1 && objects[idx] === 0) {
          decor_floor[idx] = 2; // tall_grass
        }
      }
    }
  }
};
addTallGrassPatch(2, 2, 4, 3);
addTallGrassPatch(9, 2, 4, 4);
addTallGrassPatch(2, 9, 3, 4);
addTallGrassPatch(10, 10, 3, 3);

// Add obstacles inside areas to guide exploration
// 1. Grassland trees/rocks
objects[getIdx(4, 5)] = 4;
objects[getIdx(4, 6)] = 4;
objects[getIdx(5, 5)] = 4;
objects[getIdx(10, 7)] = 4;
objects[getIdx(11, 7)] = 4;

// 2. Cave obstacles (rocks layout)
for (let c = 3; c < 12; c++) {
  if (c !== 7) objects[getIdx(c, 20)] = 4; // rock wall barrier
}
objects[getIdx(7, 24)] = 4;
objects[getIdx(6, 24)] = 4;
objects[getIdx(8, 24)] = 4;
objects[getIdx(3, 27)] = 4;
objects[getIdx(11, 27)] = 4;

// 3. Snowy Mountain ice obstacles
for (let r = 3; r < 12; r++) {
  if (r !== 7) objects[getIdx(22, r)] = 6; // Ice wall barrier
}
objects[getIdx(18, 5)] = 6;
objects[getIdx(18, 6)] = 6;
objects[getIdx(26, 10)] = 6;
objects[getIdx(27, 10)] = 6;

// 4. Gym interior walls (create a cool maze / foyer structure)
// Outer shell for gym center
for (let c = 18; c <= 26; c++) {
  objects[getIdx(c, 17)] = 8; // Inner wall
}
for (let r = 18; r <= 26; r++) {
  if (r !== 22) {
    objects[getIdx(18, r)] = 8; // Left wall
    objects[getIdx(26, r)] = 8; // Right wall
  }
}
// Gym Leader stands at col 22, row 22 (inside this shell!)
// Foyer gate at row 22, col 18/26 (left/right entrance)

// Assemble config
const gameConfig = {
  map: {
    width: W * TW,
    height: H * TH,
    tileWidth: TW,
    tileHeight: TH
  },
  player: {
    spawn: {
      x: 3 * TW + TW / 2, // col 3, row 3
      y: 3 * TH + TH / 2
    },
    speed: 180
  },
  layers: [
    { name: "ground", collision: false, ysort: false },
    { name: "decor_floor", collision: false, ysort: false },
    { name: "objects", collision: true, ysort: true },
    { name: "decor_top", collision: false, ysort: false }
  ]
};

// Assemble tilemap
const tilemap = {
  width: W,
  height: H,
  tileWidth: TW,
  tileHeight: TH,
  tileIndex,
  layers: {
    ground,
    decor_floor,
    objects,
    decor_top
  }
};

// Assemble entities
const entities = [
  {
    type: "character",
    name: "Trainer",
    x: 3 * TW + TW / 2,
    y: 3 * TH + TH / 2,
    sprite: "Trainer"
  },
  {
    type: "character",
    name: "GymLeader",
    x: 22 * TW + TW / 2, // col 22, row 22
    y: 22 * TH + TH / 2,
    sprite: "Trainer",
    tint: "0xd8b4fe" // purple tint for gym leader
  },
  {
    type: "character",
    name: "TrainerJack",
    x: 9 * TW + TW / 2, // col 9, row 7 (Grassland)
    y: 7 * TH + TH / 2,
    sprite: "Trainer",
    tint: "0xa7f3d0" // light green tint
  },
  {
    type: "character",
    name: "TrainerRocky",
    x: 5 * TW + TW / 2, // col 5, row 20 (Cave)
    y: 20 * TH + TH / 2,
    sprite: "Trainer",
    tint: "0xfde047" // yellow tint
  },
  {
    type: "character",
    name: "TrainerYeti",
    x: 23 * TW + TW / 2, // col 23, row 6 (Snowy Mountain)
    y: 6 * TH + TH / 2,
    sprite: "Trainer",
    tint: "0x93c5fd" // ice blue tint
  },
  // Chests that give balls
  {
    type: "object",
    name: "chest",
    x: 2 * TW + TW / 2,
    y: 10 * TH + TH / 2,
    sprite: "chest"
  },
  {
    type: "object",
    name: "chest",
    x: 13 * TW + TW / 2,
    y: 27 * TH + TH / 2,
    sprite: "chest"
  },
  {
    type: "object",
    name: "chest",
    x: 27 * TW + TW / 2,
    y: 3 * TH + TH / 2,
    sprite: "chest"
  }
];

fs.writeFileSync(path.join(GAME_DIR, 'game-config.json'), JSON.stringify(gameConfig, null, 2));
fs.writeFileSync(path.join(GAME_DIR, 'tilemap.json'), JSON.stringify(tilemap, null, 2));
fs.writeFileSync(path.join(GAME_DIR, 'entities.json'), JSON.stringify(entities, null, 2));

console.log('Map configuration, tilemap and entities written successfully!');
