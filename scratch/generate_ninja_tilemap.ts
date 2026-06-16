import fs from 'fs';
import path from 'path';

const TILE_INDEX = {
  "1": "grass_base",
  "2": "stone_base",
  "3": "stone_wall",
  "4": "wood_floor",
  "5": "brick_wall",
  "6": "tatami_floor",
  "7": "shoji_wall",
  "8": "bush",
  "9": "crate",
  "10": "barrel",
  "11": "lantern"
};

const W = 20;
const H = 15;

function createEmptyGrid(fillValue: number = 0): number[] {
  return new Array(W * H).fill(fillValue);
}

function setTile(grid: number[], x: number, y: number, value: number) {
  if (x >= 0 && x < W && y >= 0 && y < H) {
    grid[y * W + x] = value;
  }
}

// LEVEL 1: CASTLE COURTYARD
function generateLevel1() {
  const ground = createEmptyGrid(1); // grass everywhere
  const decor = createEmptyGrid(0);
  const objects = createEmptyGrid(0);
  const decorTop = createEmptyGrid(0);

  // Outer stone walls
  for (let x = 0; x < W; x++) {
    setTile(objects, x, 0, 3);
    setTile(objects, x, H - 1, 3);
  }
  for (let y = 0; y < H; y++) {
    setTile(objects, 0, y, 3);
    setTile(objects, W - 1, y, 3);
  }

  // Stone path from player spawn (2,13) winding around to exit (18, 1)
  const pathCoords = [
    // Bottom corridor
    [1, 13], [2, 13], [3, 13], [4, 13], [5, 13], [6, 13], [7, 13], [8, 13], [9, 13], [10, 13], [11, 13], [12, 13], [13, 13], [14, 13], [15, 13], [16, 13], [17, 13], [18, 13],
    // Right upward path
    [17, 12], [17, 11], [17, 10], [17, 9], [17, 8], [17, 7], [17, 6], [17, 5], [17, 4], [17, 3], [17, 2], [17, 1], [18, 1],
    // Middle cross paths
    [7, 12], [7, 11], [7, 10], [7, 9], [7, 8], [7, 7], [7, 6], [7, 5],
    [8, 6], [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6], [15, 6], [16, 6],
    // Left upper path
    [2, 12], [2, 11], [2, 10], [2, 9], [2, 8], [2, 7], [2, 6], [2, 5], [2, 4], [2, 3], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2], [10, 2], [11, 2], [12, 2]
  ];

  for (const [px, py] of pathCoords) {
    setTile(ground, px, py, 2); // stone paving
  }

  // Inner walls for obstacles
  // Wall 1: dividing left side
  for (let y = 3; y <= 11; y++) {
    if (y !== 6 && y !== 7) {
      setTile(objects, 4, y, 3);
    }
  }
  // Wall 2: dividing bottom center
  for (let x = 8; x <= 14; x++) {
    if (x !== 11) {
      setTile(objects, x, 10, 3);
    }
  }
  // Wall 3: dividing top right
  for (let y = 2; y <= 9; y++) {
    if (y !== 5 && y !== 6) {
      setTile(objects, 13, y, 3);
    }
  }

  // Lanterns for lights
  setTile(objects, 2, 11, 11);
  setTile(objects, 6, 5, 11);
  setTile(objects, 15, 7, 11);
  setTile(objects, 16, 2, 11);
  setTile(objects, 10, 12, 11);

  // Bushes for cover/decor
  setTile(objects, 2, 3, 8);
  setTile(objects, 3, 3, 8);
  setTile(objects, 5, 2, 8);
  setTile(objects, 9, 8, 8);
  setTile(objects, 10, 8, 8);
  setTile(objects, 11, 8, 8);
  setTile(objects, 15, 11, 8);
  setTile(objects, 16, 11, 8);
  setTile(objects, 15, 5, 8);

  return { ground, decor, objects, decorTop };
}

// LEVEL 2: ENEMY CAMP WAREHOUSE
function generateLevel2() {
  const ground = createEmptyGrid(4); // wood floor everywhere
  const decor = createEmptyGrid(0);
  const objects = createEmptyGrid(0);
  const decorTop = createEmptyGrid(0);

  // Outer brick walls
  for (let x = 0; x < W; x++) {
    setTile(objects, x, 0, 5);
    setTile(objects, x, H - 1, 5);
  }
  for (let y = 0; y < H; y++) {
    setTile(objects, 0, y, 5);
    setTile(objects, W - 1, y, 5);
  }

  // Interior Brick Walls forming warehouse chambers
  // Left vertical partition
  for (let y = 1; y <= 11; y++) {
    if (y !== 4 && y !== 8) {
      setTile(objects, 5, y, 5);
    }
  }
  // Center horizontal partition
  for (let x = 6; x <= 14; x++) {
    if (x !== 10) {
      setTile(objects, x, 7, 5);
    }
  }
  // Right vertical partition
  for (let y = 4; y <= 13; y++) {
    if (y !== 6 && y !== 10) {
      setTile(objects, 14, y, 5);
    }
  }

  // Crates and Barrels stack obstacles
  // Corner piles
  setTile(objects, 2, 2, 9);
  setTile(objects, 3, 2, 9);
  setTile(objects, 2, 3, 10);

  setTile(objects, 1, 12, 10);
  setTile(objects, 2, 12, 9);
  setTile(objects, 3, 12, 9);

  // Storage corridors
  setTile(objects, 8, 2, 9);
  setTile(objects, 8, 3, 10);
  setTile(objects, 9, 3, 9);
  setTile(objects, 10, 2, 9);

  setTile(objects, 11, 11, 9);
  setTile(objects, 12, 11, 10);
  setTile(objects, 11, 12, 9);

  setTile(objects, 17, 4, 9);
  setTile(objects, 18, 4, 10);
  setTile(objects, 17, 5, 9);

  setTile(objects, 16, 10, 9);
  setTile(objects, 17, 10, 9);
  setTile(objects, 17, 11, 10);

  // Lanterns/Lights
  setTile(objects, 4, 4, 11);
  setTile(objects, 10, 6, 11);
  setTile(objects, 8, 12, 11);
  setTile(objects, 15, 3, 11);

  return { ground, decor, objects, decorTop };
}

// LEVEL 3: SHOGUN'S PALACE
function generateLevel3() {
  const ground = createEmptyGrid(6); // tatami everywhere
  const decor = createEmptyGrid(0);
  const objects = createEmptyGrid(0);
  const decorTop = createEmptyGrid(0);

  // Outer Shoji walls
  for (let x = 0; x < W; x++) {
    setTile(objects, x, 0, 7);
    setTile(objects, x, H - 1, 7);
  }
  for (let y = 0; y < H; y++) {
    setTile(objects, 0, y, 7);
    setTile(objects, W - 1, y, 7);
  }

  // Outer Veranda (wood floor) along bottom and left edges
  for (let x = 1; x < W - 1; x++) {
    setTile(ground, x, H - 2, 4);
    setTile(ground, x, H - 3, 4);
  }
  for (let y = 1; y < H - 2; y++) {
    setTile(ground, 1, y, 4);
    setTile(ground, 2, y, 4);
  }

  // Palace Room Divider walls (Shoji screens)
  // Hallway screen separating veranda from interior rooms
  for (let y = 2; y <= 11; y++) {
    setTile(objects, 3, y, 7);
  }
  setTile(objects, 3, 6, 0); // door gap

  for (let x = 3; x <= 18; x++) {
    setTile(objects, x, 11, 7);
  }
  setTile(objects, 10, 11, 0); // door gap

  // Interior Room separators
  // Room A (left interior)
  for (let x = 4; x <= 10; x++) {
    setTile(objects, x, 5, 7);
  }
  setTile(objects, 7, 5, 0); // door gap

  // Room B (right interior)
  for (let y = 1; y <= 10; y++) {
    setTile(objects, 11, y, 7);
  }
  setTile(objects, 11, 4, 0); // door gap
  setTile(objects, 11, 8, 0); // door gap

  // Shogun's Inner Chamber (top right) separator
  for (let x = 12; x <= 18; x++) {
    setTile(objects, x, 5, 7);
  }
  setTile(objects, 15, 5, 0); // door gap

  // Lanterns for beautiful palace glows
  setTile(objects, 2, 2, 11);
  setTile(objects, 2, 10, 11);
  setTile(objects, 6, 3, 11);
  setTile(objects, 15, 3, 11);
  setTile(objects, 8, 8, 11);
  setTile(objects, 16, 9, 11);

  // Decorative crates (lacquered chest style)
  setTile(objects, 5, 1, 9);
  setTile(objects, 6, 1, 9);
  setTile(objects, 17, 2, 9);

  return { ground, decor, objects, decorTop };
}

function main() {
  const l1 = generateLevel1();
  const l2 = generateLevel2();
  const l3 = generateLevel3();

  const tilemapJson = {
    width: W,
    height: H,
    tileWidth: 64,
    tileHeight: 64,
    tileIndex: TILE_INDEX,
    levels: [
      {
        level: 1,
        layers: {
          ground: l1.ground,
          decor_floor: l1.decor,
          objects: l1.objects,
          decor_top: l1.decorTop
        }
      },
      {
        level: 2,
        layers: {
          ground: l2.ground,
          decor_floor: l2.decor,
          objects: l2.objects,
          decor_top: l2.decorTop
        }
      },
      {
        level: 3,
        layers: {
          ground: l3.ground,
          decor_floor: l3.decor,
          objects: l3.objects,
          decor_top: l3.decorTop
        }
      }
    ]
  };

  const outPath = path.join('./game_runs/NinjaStealth/game/tilemap.json');
  fs.writeFileSync(outPath, JSON.stringify(tilemapJson, null, 2));
  console.log(`Generated tilemaps for NinjaStealth at ${outPath}`);
}

main();
