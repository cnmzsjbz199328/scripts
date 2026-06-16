import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Helper to draw single pixel in raw buffer
function drawPixel(buf: Buffer, w: number, h: number, x: number, y: number, r: number, g: number, b: number, a: number) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  if (rx >= 0 && rx < w && ry >= 0 && ry < h) {
    const idx = (ry * w + rx) * 4;
    buf[idx] = r;
    buf[idx + 1] = g;
    buf[idx + 2] = b;
    buf[idx + 3] = a;
  }
}

// Helper to draw filled rectangle
function drawRect(buf: Buffer, w: number, h: number, x1: number, y1: number, x2: number, y2: number, r: number, g: number, b: number, a: number) {
  const minX = Math.max(0, Math.min(x1, x2));
  const maxX = Math.min(w - 1, Math.max(x1, x2));
  const minY = Math.max(0, Math.min(y1, y2));
  const maxY = Math.min(h - 1, Math.max(y1, y2));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      drawPixel(buf, w, h, x, y, r, g, b, a);
    }
  }
}

// Helper to draw circle
function drawCircle(buf: Buffer, w: number, h: number, cx: number, cy: number, radius: number, r: number, g: number, b: number, a: number) {
  const rad = Math.round(radius);
  for (let dy = -rad; dy <= rad; dy++) {
    for (let dx = -rad; dx <= rad; dx++) {
      if (dx * dx + dy * dy <= radius * radius) {
        drawPixel(buf, w, h, cx + dx, cy + dy, r, g, b, a);
      }
    }
  }
}

// Helper to draw line
function drawLine(buf: Buffer, w: number, h: number, x1: number, y1: number, x2: number, y2: number, r: number, g: number, b: number, a: number, thickness: number = 2) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) * 2;
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    drawCircle(buf, w, h, x, y, thickness / 2, r, g, b, a);
  }
}

// 1. Generate Tiles
async function generateTiles() {
  const destDir = './texture_runs/NeonTowerDefense/output';
  fs.mkdirSync(destDir, { recursive: true });
  const size = 64;

  // A. Cyber Grid Blue: #0b0f19 background with neon blue grid borders
  const gridBlueBuf = Buffer.alloc(size * size * 4, 0);
  drawRect(gridBlueBuf, size, size, 0, 0, size - 1, size - 1, 11, 15, 25, 255); // #0b0f19
  // Grid lines (borders) - Neon Blue/Cyan #00ffff
  drawRect(gridBlueBuf, size, size, 0, 0, size - 1, 1, 0, 180, 255, 255); // top
  drawRect(gridBlueBuf, size, size, 0, 0, 1, size - 1, 0, 180, 255, 255); // left
  // Inner wireframe design
  for (let i = 0; i < size; i += 8) {
    drawPixel(gridBlueBuf, size, size, i, i, 0, 100, 200, 100);
  }
  await sharp(gridBlueBuf, { raw: { width: size, height: size, channels: 4 } }).png().toFile(path.join(destDir, 'cyber_grid_blue.png'));

  // B. Cyber Grid Green: #0b0f19 background with emerald green grid borders
  const gridGreenBuf = Buffer.alloc(size * size * 4, 0);
  drawRect(gridGreenBuf, size, size, 0, 0, size - 1, size - 1, 11, 15, 25, 255);
  // Grid lines - Neon Green #10b981
  drawRect(gridGreenBuf, size, size, 0, 0, size - 1, 1, 16, 185, 129, 255); // top
  drawRect(gridGreenBuf, size, size, 0, 0, 1, size - 1, 16, 185, 129, 255); // left
  await sharp(gridGreenBuf, { raw: { width: size, height: size, channels: 4 } }).png().toFile(path.join(destDir, 'cyber_grid_green.png'));

  // C. Cyber Grid Pink: #0b0f19 background with neon pink grid borders
  const gridPinkBuf = Buffer.alloc(size * size * 4, 0);
  drawRect(gridPinkBuf, size, size, 0, 0, size - 1, size - 1, 11, 15, 25, 255);
  // Grid lines - Neon Pink/Magenta #ec4899
  drawRect(gridPinkBuf, size, size, 0, 0, size - 1, 1, 236, 72, 153, 255); // top
  drawRect(gridPinkBuf, size, size, 0, 0, 1, size - 1, 236, 72, 153, 255); // left
  await sharp(gridPinkBuf, { raw: { width: size, height: size, channels: 4 } }).png().toFile(path.join(destDir, 'cyber_grid_pink.png'));

  // D. Cyber Wall: Dark metallic wall with bright blue warning glow lines
  const wallBuf = Buffer.alloc(size * size * 4, 0);
  drawRect(wallBuf, size, size, 0, 0, size - 1, size - 1, 24, 24, 27, 255); // #18181b
  // Metal diagonal striping
  for (let x = 0; x < size; x += 16) {
    drawLine(wallBuf, size, size, x, 0, (x + 32) % size, size - 1, 39, 39, 42, 255, 3);
  }
  // Cyber electric border glow
  drawRect(wallBuf, size, size, 0, 0, size - 1, 3, 0, 255, 255, 255); // neon cyan header
  drawRect(wallBuf, size, size, 0, 0, size - 1, 1, 255, 255, 255, 255); // white core
  await sharp(wallBuf, { raw: { width: size, height: size, channels: 4 } }).png().toFile(path.join(destDir, 'cyber_wall.png'));

  console.log('Dojo tiles / cyber grids generated successfully.');
}

// 2. Generate Player: MechGuard spritesheet (96x96, 5 cols, 5 rows)
async function generateMechGuard() {
  const destDir = './char_runs/MechGuard/output';
  fs.mkdirSync(destDir, { recursive: true });

  const frameSize = 96;
  const cols = 5;
  const rows = 5;
  const sheetW = frameSize * cols;
  const sheetH = frameSize * rows;
  const buf = Buffer.alloc(sheetW * sheetH * 4, 0);

  // Draw 5 animation rows
  // Row 0: Idle, Row 1: Walk, Row 2: Build, Row 3: Shoot, Row 4: Hit
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const fx = c * frameSize;
      const fy = r * frameSize;
      const cx = fx + frameSize / 2;
      const cy = fy + frameSize / 2;

      // Bobbing/Jet flicker
      const bob = r === 0 ? Math.sin(c * Math.PI / 2) * 3 : 0;
      const jetPulse = 8 + (c % 2 === 0 ? 4 : 0);

      // A. Draw Hovering Engine Jets (bottom)
      if (r !== 4) { // no jets if hit hard
        drawCircle(buf, sheetW, sheetH, cx, cy + 24, jetPulse, 6, 182, 212, 180); // Cyan jet
        drawCircle(buf, sheetW, sheetH, cx, cy + 22, jetPulse * 0.6, 255, 255, 255, 255); // Hot core
      }

      // B. Draw Robotic Chassis (Metal grey sphere #475569)
      const chassisY = cy + bob;
      drawCircle(buf, sheetW, sheetH, cx, chassisY, 15, 71, 85, 105, 255);
      drawCircle(buf, sheetW, sheetH, cx, chassisY - 2, 13, 100, 116, 139, 255); // lighting highlight

      // C. Draw Blue Visor Head
      drawCircle(buf, sheetW, sheetH, cx, chassisY - 14, 9, 30, 41, 59, 255); // dark cap
      drawRect(buf, sheetW, sheetH, cx - 7, chassisY - 16, cx + 7, chassisY - 12, 6, 182, 212, 255); // Cyan neon visor
      drawRect(buf, sheetW, sheetH, cx - 3, chassisY - 15, cx + 3, chassisY - 13, 255, 255, 255, 255); // Glint

      // D. Draw Arms and Actions
      if (r === 2) {
        // BUILD: Robotic arm pointing down-right firing a welding laser beam
        drawLine(buf, sheetW, sheetH, cx + 10, chassisY, cx + 24, chassisY + 16, 100, 116, 139, 255, 3);
        drawLine(buf, sheetW, sheetH, cx + 24, chassisY + 16, cx + 36, chassisY + 28, 236, 72, 153, 255, 2); // pink laser spark
      } else if (r === 3) {
        // SHOOT: Robotic arm pointing forward firing a cyan pulse orb
        drawLine(buf, sheetW, sheetH, cx + 10, chassisY, cx + 26, chassisY, 100, 116, 139, 255, 3);
        drawCircle(buf, sheetW, sheetH, cx + 32 + (c * 2), chassisY, 6, 6, 182, 212, 255); // projectile particle
      } else if (r === 4) {
        // HIT: Red alert flashing, robot tilted back
        drawCircle(buf, sheetW, sheetH, cx - 6, chassisY + 2, 15, 239, 68, 68, 200); // red tint outline
      } else {
        // Idle/Walk: Resting arms
        drawLine(buf, sheetW, sheetH, cx - 12, chassisY + 2, cx - 18, chassisY + 14, 71, 85, 105, 255, 3);
        drawLine(buf, sheetW, sheetH, cx + 12, chassisY + 2, cx + 18, chassisY + 14, 71, 85, 105, 255, 3);
      }
    }
  }

  await sharp(buf, { raw: { width: sheetW, height: sheetH, channels: 4 } }).webp().toFile(path.join(destDir, 'spritesheet.webp'));
  const meta = { name: 'MechGuard', frameWidth: frameSize, frameHeight: frameSize, columns: cols, rows: rows };
  fs.writeFileSync(path.join(destDir, 'char.json'), JSON.stringify(meta, null, 2));
  console.log('MechGuard spritesheet generated.');
}

// 3. Generate Enemy: VirusRed spritesheet (96x96, 5 cols, 4 rows)
async function generateVirusRed() {
  const destDir = './char_runs/VirusRed/output';
  fs.mkdirSync(destDir, { recursive: true });

  const frameSize = 96;
  const cols = 5;
  const rows = 4;
  const sheetW = frameSize * cols;
  const sheetH = frameSize * rows;
  const buf = Buffer.alloc(sheetW * sheetH * 4, 0);

  // Rows: 0: Idle, 1: Walk, 2: Hit, 3: Die
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const fx = c * frameSize;
      const fy = r * frameSize;
      const cx = fx + frameSize / 2;
      const cy = fy + frameSize / 2;

      if (r === 3) {
        // DIE: Dissolving particles expanding
        const radius = 5 + c * 5;
        drawCircle(buf, sheetW, sheetH, cx - radius, cy - radius, 3, 239, 68, 68, 255 - c * 50);
        drawCircle(buf, sheetW, sheetH, cx + radius, cy + radius, 2, 239, 68, 68, 255 - c * 50);
        drawCircle(buf, sheetW, sheetH, cx - radius, cy + radius, 4, 255, 255, 255, 200 - c * 40);
        drawCircle(buf, sheetW, sheetH, cx + radius, cy - radius, 3, 249, 115, 22, 255 - c * 50);
        continue;
      }

      // Draw Red Glitchy Insectoid Core
      const pulse = Math.sin(c * Math.PI / 2) * 2;
      const coreColor = r === 2 ? [255, 255, 255] : [239, 68, 68]; // White flash when hit

      // Red malware orb body
      drawCircle(buf, sheetW, sheetH, cx, cy, 14 + pulse, coreColor[0], coreColor[1], coreColor[2], 255);
      drawCircle(buf, sheetW, sheetH, cx, cy, 8, 254, 243, 199, 255); // glowing center core

      // Glitch spikes/legs
      const legOffset = r === 1 ? Math.sin(c * Math.PI) * 4 : 0;
      // Draw 6 spiky legs
      drawLine(buf, sheetW, sheetH, cx - 10, cy + 4, cx - 22, cy + 12 + legOffset, coreColor[0], coreColor[1], coreColor[2], 255, 2);
      drawLine(buf, sheetW, sheetH, cx - 10, cy, cx - 24, cy + legOffset, coreColor[0], coreColor[1], coreColor[2], 255, 2);
      drawLine(buf, sheetW, sheetH, cx - 10, cy - 4, cx - 22, cy - 12 + legOffset, coreColor[0], coreColor[1], coreColor[2], 255, 2);

      drawLine(buf, sheetW, sheetH, cx + 10, cy + 4, cx + 22, cy + 12 - legOffset, coreColor[0], coreColor[1], coreColor[2], 255, 2);
      drawLine(buf, sheetW, sheetH, cx + 10, cy, cx + 24, cy - legOffset, coreColor[0], coreColor[1], coreColor[2], 255, 2);
      drawLine(buf, sheetW, sheetH, cx + 10, cy - 4, cx + 22, cy - 12 - legOffset, coreColor[0], coreColor[1], coreColor[2], 255, 2);

      // Glowing red eyes
      drawPixel(buf, sheetW, sheetH, cx - 4, cy - 4, 0, 0, 0, 255);
      drawPixel(buf, sheetW, sheetH, cx + 4, cy - 4, 0, 0, 0, 255);
    }
  }

  await sharp(buf, { raw: { width: sheetW, height: sheetH, channels: 4 } }).webp().toFile(path.join(destDir, 'spritesheet.webp'));
  const meta = { name: 'VirusRed', frameWidth: frameSize, frameHeight: frameSize, columns: cols, rows: rows };
  fs.writeFileSync(path.join(destDir, 'char.json'), JSON.stringify(meta, null, 2));
  console.log('VirusRed spritesheet generated.');
}

// 4. Generate Boss: SuperTrojan spritesheet (96x96, 5 cols, 4 rows)
async function generateSuperTrojan() {
  const destDir = './char_runs/SuperTrojan/output';
  fs.mkdirSync(destDir, { recursive: true });

  const frameSize = 96;
  const cols = 5;
  const rows = 4;
  const sheetW = frameSize * cols;
  const sheetH = frameSize * rows;
  const buf = Buffer.alloc(sheetW * sheetH * 4, 0);

  // Rows: 0: Idle, 1: Walk, 2: Hit, 3: Die
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const fx = c * frameSize;
      const fy = r * frameSize;
      const cx = fx + frameSize / 2;
      const cy = fy + frameSize / 2;

      if (r === 3) {
        // DIE: Giant data explosion ring
        const radius = 8 + c * 8;
        drawCircle(buf, sheetW, sheetH, cx, cy, radius, 168, 85, 247, 200 - c * 40); // fading purple ring
        drawCircle(buf, sheetW, sheetH, cx, cy, radius - 3, 0, 0, 0, 0); // cut hollow core
        continue;
      }

      // Draw SuperTrojan giant processor: Dark Purple, pulsing warning rings
      const pulse = Math.sin(c * Math.PI / 2) * 4;
      const mainColor = r === 2 ? [255, 0, 0] : [147, 51, 234]; // Flashes bright red on hit

      // Holographic rotating database shield rings
      drawCircle(buf, sheetW, sheetH, cx, cy, 26 + pulse, mainColor[0], mainColor[1], mainColor[2], 80); // outer shield
      drawCircle(buf, sheetW, sheetH, cx, cy, 23 + pulse, 0, 0, 0, 0); // hollow it out

      // Solid central processor hexagon/core
      drawRect(buf, sheetW, sheetH, cx - 14, cy - 14, cx + 14, cy + 14, 30, 41, 59, 255); // dark base
      drawRect(buf, sheetW, sheetH, cx - 10, cy - 10, cx + 10, cy + 10, mainColor[0], mainColor[1], mainColor[2], 255); // glowing center
      drawRect(buf, sheetW, sheetH, cx - 4, cy - 4, cx + 4, cy + 4, 255, 255, 255, 255); // core matrix
    }
  }

  await sharp(buf, { raw: { width: sheetW, height: sheetH, channels: 4 } }).webp().toFile(path.join(destDir, 'spritesheet.webp'));
  const meta = { name: 'SuperTrojan', frameWidth: frameSize, frameHeight: frameSize, columns: cols, rows: rows };
  fs.writeFileSync(path.join(destDir, 'char.json'), JSON.stringify(meta, null, 2));
  console.log('SuperTrojan spritesheet generated.');
}

// 5. Generate Object: laser_turret (64x64, 4 frames)
async function generateLaserTurret() {
  const destDir = './object_runs/laser_turret/output';
  fs.mkdirSync(destDir, { recursive: true });

  const size = 64;
  const count = 4;
  const sheetW = size * count;
  const sheetH = size;
  const buf = Buffer.alloc(sheetW * sheetH * 4, 0);

  for (let c = 0; c < count; c++) {
    const fx = c * size;
    const cx = fx + size / 2;
    const cy = size / 2;

    // Pedestal base (dark grey metal square)
    drawRect(buf, sheetW, sheetH, fx + 12, cy + 6, fx + 52, cy + 24, 71, 85, 105, 255);
    drawRect(buf, sheetW, sheetH, fx + 16, cy + 10, fx + 48, cy + 24, 30, 41, 59, 255);

    // Scanner mount & barrel rotating (indicated by angle offset)
    const angleOffset = (c * Math.PI) / 6;
    const bx = cx + Math.cos(angleOffset) * 12;
    const by = cy - 4 + Math.sin(angleOffset) * 12;

    drawLine(buf, sheetW, sheetH, cx, cy - 4, bx, by, 100, 116, 139, 255, 4); // gun barrel
    drawCircle(buf, sheetW, sheetH, cx, cy - 4, 8, 6, 182, 212, 255); // neon cyan lens
    drawCircle(buf, sheetW, sheetH, cx, cy - 4, 4, 255, 255, 255, 255);
  }

  await sharp(buf, { raw: { width: sheetW, height: sheetH, channels: 4 } }).webp().toFile(path.join(destDir, 'object.webp'));
  const meta = { name: 'laser_turret', frameWidth: size, frameHeight: size, frameCount: count };
  fs.writeFileSync(path.join(destDir, 'object.json'), JSON.stringify(meta, null, 2));
  console.log('laser_turret object generated.');
}

// 6. Generate Object: plasma_turret (64x64, 4 frames)
async function generatePlasmaTurret() {
  const destDir = './object_runs/plasma_turret/output';
  fs.mkdirSync(destDir, { recursive: true });

  const size = 64;
  const count = 4;
  const sheetW = size * count;
  const sheetH = size;
  const buf = Buffer.alloc(sheetW * sheetH * 4, 0);

  for (let c = 0; c < count; c++) {
    const fx = c * size;
    const cx = fx + size / 2;
    const cy = size / 2;

    // Pedestal base (dark slate triangle/pyramid shape)
    drawLine(buf, sheetW, sheetH, cx - 18, cy + 22, cx, cy + 2, 71, 85, 105, 255, 4);
    drawLine(buf, sheetW, sheetH, cx + 18, cy + 22, cx, cy + 2, 71, 85, 105, 255, 4);
    drawRect(buf, sheetW, sheetH, fx + 10, cy + 18, fx + 54, cy + 24, 30, 41, 59, 255);

    // Pulsing plasma sphere on top
    const pulse = Math.sin(c * Math.PI / 2) * 3;
    drawCircle(buf, sheetW, sheetH, cx, cy, 10 + pulse, 16, 185, 129, 255); // emerald green
    drawCircle(buf, sheetW, sheetH, cx, cy, 6 + pulse, 110, 231, 183, 255); // light core
    drawCircle(buf, sheetW, sheetH, cx, cy, 3, 255, 255, 255, 255);
  }

  await sharp(buf, { raw: { width: sheetW, height: sheetH, channels: 4 } }).webp().toFile(path.join(destDir, 'object.webp'));
  const meta = { name: 'plasma_turret', frameWidth: size, frameHeight: size, frameCount: count };
  fs.writeFileSync(path.join(destDir, 'object.json'), JSON.stringify(meta, null, 2));
  console.log('plasma_turret object generated.');
}

// 7. Generate Object: energy_crystal (64x64, 4 frames)
async function generateEnergyCrystal() {
  const destDir = './object_runs/energy_crystal/output';
  fs.mkdirSync(destDir, { recursive: true });

  const size = 64;
  const count = 4;
  const sheetW = size * count;
  const sheetH = size;
  const buf = Buffer.alloc(sheetW * sheetH * 4, 0);

  for (let c = 0; c < count; c++) {
    const fx = c * size;
    const cx = fx + size / 2;
    const cy = size / 2;

    // Hovering yellow octahedron crystal spinning
    const yOffset = Math.sin(c * Math.PI / 2) * 4;
    const height = 14;
    const width = 8;

    // Outer bright yellow neon outline
    drawLine(buf, sheetW, sheetH, cx, cy - height + yOffset, cx - width, cy + yOffset, 234, 179, 8, 255, 2);
    drawLine(buf, sheetW, sheetH, cx - width, cy + yOffset, cx, cy + height + yOffset, 234, 179, 8, 255, 2);
    drawLine(buf, sheetW, sheetH, cx, cy + height + yOffset, cx + width, cy + yOffset, 234, 179, 8, 255, 2);
    drawLine(buf, sheetW, sheetH, cx + width, cy + yOffset, cx, cy - height + yOffset, 234, 179, 8, 255, 2);

    // Glowing core fill
    drawCircle(buf, sheetW, sheetH, cx, cy + yOffset, 5, 253, 224, 71, 200);
    drawCircle(buf, sheetW, sheetH, cx, cy + yOffset, 2, 255, 255, 255, 255);
  }

  await sharp(buf, { raw: { width: sheetW, height: sheetH, channels: 4 } }).webp().toFile(path.join(destDir, 'object.webp'));
  const meta = { name: 'energy_crystal', frameWidth: size, frameHeight: size, frameCount: count };
  fs.writeFileSync(path.join(destDir, 'object.json'), JSON.stringify(meta, null, 2));
  console.log('energy_crystal object generated.');
}

// 8. Generate Object: core_database (64x64, 4 frames)
async function generateCoreDatabase() {
  const destDir = './object_runs/core_database/output';
  fs.mkdirSync(destDir, { recursive: true });

  const size = 64;
  const count = 4;
  const sheetW = size * count;
  const sheetH = size;
  const buf = Buffer.alloc(sheetW * sheetH * 4, 0);

  for (let c = 0; c < count; c++) {
    const fx = c * size;
    const cx = fx + size / 2;
    const cy = size / 2;

    // Glowing blue holographic database block spinning
    const pulse = Math.sin(c * Math.PI / 2) * 2;

    // Cyber Pedestal Base
    drawRect(buf, sheetW, sheetH, fx + 8, cy + 14, fx + 56, cy + 24, 71, 85, 105, 255);
    drawRect(buf, sheetW, sheetH, fx + 12, cy + 18, fx + 52, cy + 24, 30, 41, 59, 255);

    // Database Server Tower
    drawRect(buf, sheetW, sheetH, fx + 18, cy - 22, fx + 46, cy + 14, 15, 23, 42, 255); // server shell
    drawRect(buf, sheetW, sheetH, fx + 20, cy - 20, fx + 44, cy + 12, 30, 41, 59, 255);

    // Flashing green/cyan data nodes
    const nodeColor = c % 2 === 0 ? [6, 182, 212] : [16, 185, 129];
    drawRect(buf, sheetW, sheetH, fx + 24, cy - 14, fx + 38, cy - 10, nodeColor[0], nodeColor[1], nodeColor[2], 255);
    drawRect(buf, sheetW, sheetH, fx + 24, cy - 4, fx + 38, cy, nodeColor[0], nodeColor[1], nodeColor[2], 255);
    drawRect(buf, sheetW, sheetH, fx + 24, cy + 6, fx + 38, cy + 10, nodeColor[0], nodeColor[1], nodeColor[2], 255);
  }

  await sharp(buf, { raw: { width: sheetW, height: sheetH, channels: 4 } }).webp().toFile(path.join(destDir, 'object.webp'));
  const meta = { name: 'core_database', frameWidth: size, frameHeight: size, frameCount: count };
  fs.writeFileSync(path.join(destDir, 'object.json'), JSON.stringify(meta, null, 2));
  console.log('core_database object generated.');
}

async function main() {
  await generateTiles();
  await generateMechGuard();
  await generateVirusRed();
  await generateSuperTrojan();
  await generateLaserTurret();
  await generatePlasmaTurret();
  await generateEnergyCrystal();
  await generateCoreDatabase();
  console.log('All NeonTowerDefense assets generated successfully.');
}

main().catch(console.error);
