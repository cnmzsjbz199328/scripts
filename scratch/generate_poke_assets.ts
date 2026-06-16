import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const TILE_SIZE = 64;
const OUTPUT_DIR = './texture_runs/PokePixel/output';

// Ensure directories exist
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function setPixel(buf: Buffer, x: number, y: number, r: number, g: number, b: number, a = 255) {
  if (x >= 0 && x < TILE_SIZE && y >= 0 && y < TILE_SIZE) {
    const idx = (y * TILE_SIZE + x) * 4;
    buf[idx] = r;
    buf[idx + 1] = g;
    buf[idx + 2] = b;
    buf[idx + 3] = a;
  }
}

function drawRect(buf: Buffer, x1: number, y1: number, x2: number, y2: number, r: number, g: number, b: number, a = 255) {
  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      setPixel(buf, x, y, r, g, b, a);
    }
  }
}

async function saveTile(name: string, drawFn: (buf: Buffer) => void) {
  const buf = Buffer.alloc(TILE_SIZE * TILE_SIZE * 4, 0);
  drawFn(buf);
  const outPath = path.join(OUTPUT_DIR, `${name}.png`);
  await sharp(buf, { raw: { width: TILE_SIZE, height: TILE_SIZE, channels: 4 } })
    .png()
    .toFile(outPath);
  console.log(`Generated tile: ${name}.png -> ${outPath}`);
}

async function main() {
  // 1. grass_base
  await saveTile('grass_base', (buf) => {
    // Fill with nice forest green
    drawRect(buf, 0, 0, TILE_SIZE - 1, TILE_SIZE - 1, 46, 125, 50);
    // Add pixel noise / textures
    for (let i = 0; i < 200; i++) {
      const x = Math.floor(Math.random() * TILE_SIZE);
      const y = Math.floor(Math.random() * TILE_SIZE);
      const isDark = Math.random() > 0.5;
      if (isDark) {
        setPixel(buf, x, y, 27, 94, 32); // Dark green
      } else {
        setPixel(buf, x, y, 76, 175, 80); // Light green
      }
    }
    // Add tiny flower/clover details
    for (let k = 0; k < 5; k++) {
      const cx = Math.floor(Math.random() * (TILE_SIZE - 4)) + 2;
      const cy = Math.floor(Math.random() * (TILE_SIZE - 4)) + 2;
      setPixel(buf, cx, cy, 255, 235, 59); // Yellow center
      setPixel(buf, cx - 1, cy, 255, 255, 255);
      setPixel(buf, cx + 1, cy, 255, 255, 255);
      setPixel(buf, cx, cy - 1, 255, 255, 255);
      setPixel(buf, cx, cy + 1, 255, 255, 255);
    }
  });

  // 2. tall_grass
  await saveTile('tall_grass', (buf) => {
    // Fill with grass base color
    drawRect(buf, 0, 0, TILE_SIZE - 1, TILE_SIZE - 1, 46, 125, 50);
    // Add base noise
    for (let i = 0; i < 100; i++) {
      const x = Math.floor(Math.random() * TILE_SIZE);
      const y = Math.floor(Math.random() * TILE_SIZE);
      setPixel(buf, x, y, 27, 94, 32);
    }
    
    // Draw thick, classic Pokemon-style tall grass tufts
    const drawTuft = (bx: number, by: number) => {
      // Grass blades mask (relative to bx, by)
      const blades = [
        [0, 1, 0, 1, 0],
        [1, 1, 1, 1, 1],
        [1, 0, 1, 0, 1],
        [1, 1, 1, 1, 1],
        [0, 1, 1, 1, 0]
      ];
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (blades[r][c] === 1) {
            // Draw blade with dark outline
            const px = bx + c * 2;
            const py = by + r * 2;
            drawRect(buf, px, py, px + 1, py + 1, 19, 58, 22); // Shadow green
            drawRect(buf, px + 1, py + 1, px + 1, py + 1, 120, 220, 100); // Highlight green
          }
        }
      }
    };

    drawTuft(12, 10);
    drawTuft(36, 28);
    drawTuft(16, 42);
    drawTuft(40, 8);
  });

  // 3. cave_floor
  await saveTile('cave_floor', (buf) => {
    // Fill dark blue-grey rock color
    drawRect(buf, 0, 0, TILE_SIZE - 1, TILE_SIZE - 1, 55, 71, 79);
    // Dark spots
    for (let i = 0; i < 150; i++) {
      const x = Math.floor(Math.random() * TILE_SIZE);
      const y = Math.floor(Math.random() * TILE_SIZE);
      setPixel(buf, x, y, 38, 50, 56);
    }
    // Lighter highlight spots
    for (let i = 0; i < 80; i++) {
      const x = Math.floor(Math.random() * TILE_SIZE);
      const y = Math.floor(Math.random() * TILE_SIZE);
      setPixel(buf, x, y, 80, 110, 120);
    }
    // Draw crack lines
    const drawCrack = (x: number, y: number, len: number) => {
      let cx = x;
      let cy = y;
      for (let j = 0; j < len; j++) {
        setPixel(buf, cx, cy, 28, 37, 41);
        cx += Math.random() > 0.5 ? 1 : 0;
        cy += Math.random() > 0.5 ? 1 : 0;
      }
    };
    drawCrack(10, 15, 12);
    drawCrack(45, 38, 15);
    drawCrack(20, 48, 10);
  });

  // 4. rock_wall (Obstacle)
  await saveTile('rock_wall', (buf) => {
    // Background wall dark
    drawRect(buf, 0, 0, TILE_SIZE - 1, TILE_SIZE - 1, 28, 37, 41);
    // Inner blocky rock shape
    drawRect(buf, 4, 4, TILE_SIZE - 5, TILE_SIZE - 5, 69, 90, 100);
    // Highlights top and left edges
    drawRect(buf, 4, 4, TILE_SIZE - 5, 8, 120, 144, 156);
    drawRect(buf, 4, 4, 8, TILE_SIZE - 5, 120, 144, 156);
    // Darker shadow bottom and right edges
    drawRect(buf, TILE_SIZE - 8, 8, TILE_SIZE - 5, TILE_SIZE - 5, 38, 50, 56);
    drawRect(buf, 8, TILE_SIZE - 8, TILE_SIZE - 5, TILE_SIZE - 5, 38, 50, 56);
    // Add stone texture inside
    for (let i = 0; i < 30; i++) {
      const rx = Math.floor(Math.random() * (TILE_SIZE - 16)) + 8;
      const ry = Math.floor(Math.random() * (TILE_SIZE - 16)) + 8;
      setPixel(buf, rx, ry, 100, 120, 130);
    }
  });

  // 5. snow_floor
  await saveTile('snow_floor', (buf) => {
    // Fill soft snow white-cyan
    drawRect(buf, 0, 0, TILE_SIZE - 1, TILE_SIZE - 1, 230, 248, 250);
    // Blue-grey snow drift details
    for (let i = 0; i < 120; i++) {
      const x = Math.floor(Math.random() * TILE_SIZE);
      const y = Math.floor(Math.random() * TILE_SIZE);
      setPixel(buf, x, y, 200, 230, 240);
    }
    // Tiny ice sparkle spots
    for (let i = 0; i < 15; i++) {
      const x = Math.floor(Math.random() * TILE_SIZE);
      const y = Math.floor(Math.random() * TILE_SIZE);
      setPixel(buf, x, y, 255, 255, 255);
      setPixel(buf, x + 1, y, 230, 250, 255);
      setPixel(buf, x, y + 1, 230, 250, 255);
    }
  });

  // 6. ice_rock (Obstacle)
  await saveTile('ice_rock', (buf) => {
    // Ice block dark blue background
    drawRect(buf, 0, 0, TILE_SIZE - 1, TILE_SIZE - 1, 13, 71, 161);
    // Solid ice core (cyan-blue)
    drawRect(buf, 4, 4, TILE_SIZE - 5, TILE_SIZE - 5, 79, 195, 247);
    // Ice specular reflection (white diagonal stripes)
    for (let i = 8; i < TILE_SIZE - 8; i++) {
      setPixel(buf, i, i, 255, 255, 255);
      setPixel(buf, i + 1, i, 255, 255, 255);
      setPixel(buf, i - 1, i, 179, 229, 252);
    }
    // Shading bottom-right
    drawRect(buf, TILE_SIZE - 12, 12, TILE_SIZE - 5, TILE_SIZE - 5, 41, 182, 246);
    drawRect(buf, 12, TILE_SIZE - 12, TILE_SIZE - 5, TILE_SIZE - 5, 41, 182, 246);
    // Dark blue outline accent
    drawRect(buf, 4, 4, 4, TILE_SIZE - 5, 3, 155, 229);
    drawRect(buf, 4, 4, TILE_SIZE - 5, 4, 3, 155, 229);
  });

  // 7. gym_floor
  await saveTile('gym_floor', (buf) => {
    // Rich brown mahogany wood color
    drawRect(buf, 0, 0, TILE_SIZE - 1, TILE_SIZE - 1, 93, 64, 55);
    // Horizontal wood planks lines (every 16 pixels)
    for (let y = 0; y < TILE_SIZE; y += 16) {
      drawRect(buf, 0, y, TILE_SIZE - 1, y, 62, 39, 35);
      drawRect(buf, 0, y + 15, TILE_SIZE - 1, y + 15, 141, 110, 99); // Highlight line
    }
    // Vertical wood plank gaps
    for (let y = 0; y < TILE_SIZE; y += 16) {
      const xOffset = (y % 32 === 0) ? 16 : 48;
      drawRect(buf, xOffset, y, xOffset, y + 15, 62, 39, 35);
    }
  });

  // 8. gym_wall (Obstacle)
  await saveTile('gym_wall', (buf) => {
    // Stone foundation (grey)
    drawRect(buf, 0, 0, TILE_SIZE - 1, TILE_SIZE - 1, 117, 117, 117);
    // Golden brick center
    drawRect(buf, 6, 6, TILE_SIZE - 7, TILE_SIZE - 7, 251, 191, 36);
    // Golden bevel highlight
    drawRect(buf, 6, 6, TILE_SIZE - 7, 10, 253, 224, 71);
    drawRect(buf, 6, 6, 10, TILE_SIZE - 7, 253, 224, 71);
    // Dark golden shadow
    drawRect(buf, TILE_SIZE - 11, 11, TILE_SIZE - 7, TILE_SIZE - 7, 217, 119, 6);
    drawRect(buf, 11, TILE_SIZE - 11, TILE_SIZE - 7, TILE_SIZE - 7, 217, 119, 6);
    // Dark border
    drawRect(buf, 0, 0, TILE_SIZE - 1, 1, 33, 33, 33);
    drawRect(buf, 0, 0, 1, TILE_SIZE - 1, 33, 33, 33);
    drawRect(buf, TILE_SIZE - 2, 0, TILE_SIZE - 1, TILE_SIZE - 1, 33, 33, 33);
    drawRect(buf, 0, TILE_SIZE - 2, TILE_SIZE - 1, TILE_SIZE - 1, 33, 33, 33);
  });

  // 9. Set up Trainer character assets in char_runs/Trainer/output
  const trainerOutputDir = './char_runs/Trainer/output';
  fs.mkdirSync(trainerOutputDir, { recursive: true });

  const farmerSrcDir = './char_runs/Farmer/output';
  if (fs.existsSync(farmerSrcDir)) {
    fs.copyFileSync(
      path.join(farmerSrcDir, 'spritesheet.webp'),
      path.join(trainerOutputDir, 'spritesheet.webp')
    );
    
    // Copy and rename character metadata
    const charMetadata = JSON.parse(fs.readFileSync(path.join(farmerSrcDir, 'char.json'), 'utf-8'));
    charMetadata.name = 'Trainer';
    fs.writeFileSync(
      path.join(trainerOutputDir, 'char.json'),
      JSON.stringify(charMetadata, null, 2)
    );
    console.log('Set up Trainer character based on Farmer spritesheet!');
  } else {
    console.warn('Farmer output directory not found, cannot copy Farmer to Trainer.');
  }
}

main().catch(console.error);
