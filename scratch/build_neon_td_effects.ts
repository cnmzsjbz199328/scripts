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

// Helper to write object files
async function saveObject(name: string, buf: Buffer, w: number, h: number, count: number) {
  const destDir = `./object_runs/${name}/output`;
  fs.mkdirSync(destDir, { recursive: true });
  await sharp(buf, { raw: { width: w, height: h, channels: 4 } }).webp().toFile(path.join(destDir, 'object.webp'));
  const meta = { name: name, frameWidth: w / count, frameHeight: h, frameCount: count };
  fs.writeFileSync(path.join(destDir, 'object.json'), JSON.stringify(meta, null, 2));
  console.log(`Effect generated: ${name}`);
}

// 1. Upgrade Burst Laser: 64x64, 4 frames
async function makeUpgradeBurstLaser() {
  const size = 64;
  const count = 4;
  const buf = Buffer.alloc(size * count * size * 4, 0);

  for (let c = 0; c < count; c++) {
    const fx = c * size;
    const cx = fx + size / 2;
    const cy = size / 2;

    if (c === 0) {
      // Frame 1: small cyan spark ring
      drawCircle(buf, size * count, size, cx, cy, 6, 0, 229, 255, 120);
      drawCircle(buf, size * count, size, cx, cy, 4, 0, 229, 255, 255);
    } else if (c === 1) {
      // Frame 2: expanding six pointed star
      drawCircle(buf, size * count, size, cx, cy, 14, 0, 180, 255, 100);
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI) / 3;
        drawLine(buf, size * count, size, cx, cy, cx + Math.cos(ang) * 16, cy + Math.sin(ang) * 16, 0, 229, 255, 255, 2);
      }
    } else if (c === 2) {
      // Frame 3: full starburst radiating neon lines, white core
      drawCircle(buf, size * count, size, cx, cy, 22, 0, 229, 255, 60);
      for (let i = 0; i < 12; i++) {
        const ang = (i * Math.PI) / 6;
        drawLine(buf, size * count, size, cx + Math.cos(ang) * 8, cy + Math.sin(ang) * 8, cx + Math.cos(ang) * 26, cy + Math.sin(ang) * 26, 0, 229, 255, 200, 1.5);
      }
      drawCircle(buf, size * count, size, cx, cy, 6, 255, 255, 255, 255);
    } else if (c === 3) {
      // Frame 4: "+LV" text glyph in cyan
      // Draw '+'
      drawLine(buf, size * count, size, cx - 12, cy, cx - 4, cy, 0, 229, 255, 255, 2);
      drawLine(buf, size * count, size, cx - 8, cy - 4, cx - 8, cy + 4, 0, 229, 255, 255, 2);
      // Draw 'L'
      drawLine(buf, size * count, size, cx, cy - 6, cx, cy + 6, 0, 229, 255, 255, 2);
      drawLine(buf, size * count, size, cx, cy + 6, cx + 6, cy + 6, 0, 229, 255, 255, 2);
      // Draw 'V'
      drawLine(buf, size * count, size, cx + 10, cy - 6, cx + 13, cy + 6, 0, 229, 255, 255, 2);
      drawLine(buf, size * count, size, cx + 16, cy - 6, cx + 13, cy + 6, 0, 229, 255, 255, 2);
    }
  }
  await saveObject('upgrade_burst_laser', buf, size * count, size, count);
}

// 2. Upgrade Burst Plasma: 64x64, 4 frames
async function makeUpgradeBurstPlasma() {
  const size = 64;
  const count = 4;
  const buf = Buffer.alloc(size * count * size * 4, 0);

  for (let c = 0; c < count; c++) {
    const fx = c * size;
    const cx = fx + size / 2;
    const cy = size / 2;

    if (c === 0) {
      // Frame 1: small violet pulse ring
      drawCircle(buf, size * count, size, cx, cy, 6, 167, 139, 250, 255); // violet
    } else if (c === 1) {
      // Frame 2: expanding hexagon wave in purple-pink
      drawCircle(buf, size * count, size, cx, cy, 18, 167, 139, 250, 100);
      // Draw hexagon lines
      for (let i = 0; i < 6; i++) {
        const a1 = (i * Math.PI) / 3;
        const a2 = ((i + 1) * Math.PI) / 3;
        drawLine(buf, size * count, size, cx + Math.cos(a1) * 16, cy + Math.sin(a1) * 16, cx + Math.cos(a2) * 16, cy + Math.sin(a2) * 16, 217, 70, 239, 255, 2);
      }
    } else if (c === 2) {
      // Frame 3: crystalline freeze star/snowflake
      drawCircle(buf, size * count, size, cx, cy, 24, 167, 139, 250, 50);
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI) / 3;
        drawLine(buf, size * count, size, cx, cy, cx + Math.cos(ang) * 22, cy + Math.sin(ang) * 22, 167, 139, 250, 255, 2);
        // crossbar
        const lx = cx + Math.cos(ang) * 14;
        const ly = cy + Math.sin(ang) * 14;
        const tang1 = ang + Math.PI/2;
        const tang2 = ang - Math.PI/2;
        drawLine(buf, size * count, size, lx + Math.cos(tang1)*6, ly + Math.sin(tang1)*6, lx + Math.cos(tang2)*6, ly + Math.sin(tang2)*6, 255, 255, 255, 255, 1.5);
      }
    } else if (c === 3) {
      // Frame 4: dissolve/shards
      drawCircle(buf, size * count, size, cx - 14, cy - 10, 3, 167, 139, 250, 150);
      drawCircle(buf, size * count, size, cx + 12, cy - 14, 2, 217, 70, 239, 150);
      drawCircle(buf, size * count, size, cx + 15, cy + 12, 3, 167, 139, 250, 100);
      drawCircle(buf, size * count, size, cx - 10, cy + 14, 2, 255, 255, 255, 180);
    }
  }
  await saveObject('upgrade_burst_plasma', buf, size * count, size, count);
}

// 3. Range Up Aura: 64x64, 4 frames
async function makeRangeRing() {
  const size = 64;
  const count = 4;
  const buf = Buffer.alloc(size * count * size * 4, 0);

  for (let c = 0; c < count; c++) {
    const fx = c * size;
    const cx = fx + size / 2;
    const cy = size / 2;
    const radius = 8 + c * 7;

    // Draw center dot
    drawCircle(buf, size * count, size, cx, cy, 2, 0, 255, 136, 255);

    // Draw dashed ring
    const segments = 16;
    const alpha = Math.max(0, 255 - c * 60);
    for (let i = 0; i < segments; i += 2) {
      const a1 = (i * 2 * Math.PI) / segments;
      const a2 = ((i + 1) * 2 * Math.PI) / segments;
      const steps = 8;
      for (let s = 0; s <= steps; s++) {
        const ang = a1 + (a2 - a1) * (s / steps);
        drawPixel(buf, size * count, size, cx + Math.cos(ang) * radius, cy + Math.sin(ang) * radius, 0, 255, 136, alpha);
      }
    }
  }
  await saveObject('range_ring', buf, size * count, size, count);
}

// 4. Attack Speed Gear: 64x64, 4 frames
async function makeFireRateGear() {
  const size = 64;
  const count = 4;
  const buf = Buffer.alloc(size * count * size * 4, 0);

  for (let c = 0; c < count; c++) {
    const fx = c * size;
    const cx = fx + size / 2;
    const cy = size / 2;

    const angle = (c * Math.PI) / 6; // gear rotation

    // A. Draw Gear Body (Gold #fbbf24)
    drawCircle(buf, size * count, size, cx, cy, 14, 251, 191, 36, 255);
    drawCircle(buf, size * count, size, cx, cy, 10, 0, 0, 0, 0); // hollow core

    // Draw Gear teeth
    const teeth = 8;
    for (let i = 0; i < teeth; i++) {
      const ang = angle + (i * 2 * Math.PI) / teeth;
      const tx = cx + Math.cos(ang) * 17;
      const ty = cy + Math.sin(ang) * 17;
      drawCircle(buf, size * count, size, tx, ty, 3, 251, 191, 36, 255);
    }

    // B. Draw Yellow Lightning Bolt in center
    // Zig-zag bolt coordinates
    const lx1 = cx + 2;
    const ly1 = cy - 12;
    const lx2 = cx - 5;
    const ly2 = cy + 1;
    const lx3 = cx + 4;
    const ly3 = cy - 1;
    const lx4 = cx - 2;
    const ly4 = cy + 12;

    drawLine(buf, size * count, size, lx1, ly1, lx2, ly2, 255, 255, 255, 255, 2.5);
    drawLine(buf, size * count, size, lx2, ly2, lx3, ly3, 255, 255, 255, 255, 2.5);
    drawLine(buf, size * count, size, lx3, ly3, lx4, ly4, 255, 255, 255, 255, 2.5);

    // Outline yellow
    drawLine(buf, size * count, size, lx1, ly1, lx2, ly2, 251, 191, 36, 120, 4.5);
    drawLine(buf, size * count, size, lx2, ly2, lx3, ly3, 251, 191, 36, 120, 4.5);
    drawLine(buf, size * count, size, lx3, ly3, lx4, ly4, 251, 191, 36, 120, 4.5);
  }
  await saveObject('firerate_gear', buf, size * count, size, count);
}

// 5. Crystal Pickup Burst: 32x32, 4 frames
async function makeCrystalBurst() {
  const size = 32;
  const count = 4;
  const buf = Buffer.alloc(size * count * size * 4, 0);

  for (let c = 0; c < count; c++) {
    const fx = c * size;
    const cx = fx + size / 2;
    const cy = size / 2;

    if (c === 0) {
      // Frame 1: crystal glowing bright gold
      drawCircle(buf, size * count, size, cx, cy, 6, 251, 191, 36, 255);
      drawCircle(buf, size * count, size, cx, cy, 3, 255, 255, 255, 255);
    } else if (c === 1) {
      // Frame 2: expanding ring of 6 tiny sparks
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI) / 3;
        const sx = cx + Math.cos(ang) * 9;
        const sy = cy + Math.sin(ang) * 9;
        drawCircle(buf, size * count, size, sx, sy, 2, 251, 191, 36, 255);
      }
    } else if (c === 2) {
      // Frame 3: sparks fade
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI) / 3;
        const sx = cx + Math.cos(ang) * 14;
        const sy = cy + Math.sin(ang) * 14;
        drawPixel(buf, size * count, size, sx, sy, 251, 191, 36, 120);
      }
    }
    // Frame 4 (c === 3) is transparent
  }
  await saveObject('crystal_burst', buf, size * count, size, count);
}

// 6. Core Database Shield: 96x96, 4 frames
async function makeCoreShield() {
  const size = 96;
  const count = 4;
  const buf = Buffer.alloc(size * count * size * 4, 0);

  for (let c = 0; c < count; c++) {
    const fx = c * size;
    const cx = fx + size / 2;
    const cy = size / 2;

    const rad = 36;
    const alpha = c === 0 ? 80 : (c === 1 ? 230 : (c === 2 ? 150 : 180));

    // Draw Hexagon shield
    const drawHex = (colorR, colorG, colorB, thick) => {
      for (let i = 0; i < 6; i++) {
        const a1 = (i * Math.PI) / 3;
        const a2 = ((i + 1) * Math.PI) / 3;
        drawLine(
          buf,
          size * count,
          size,
          cx + Math.cos(a1) * rad,
          cy + Math.sin(a1) * rad,
          cx + Math.cos(a2) * rad,
          cy + Math.sin(a2) * rad,
          colorR,
          colorG,
          colorB,
          alpha,
          thick
        );
      }
    };

    if (c === 0) {
      // Frame 1: faint outline
      drawHex(59, 130, 246, 2);
    } else if (c === 1) {
      // Frame 2: solid glowing with inner grid
      drawHex(59, 130, 246, 4);
      // inner blue glow
      drawCircle(buf, size * count, size, cx, cy, rad - 4, 6, 182, 212, 60);
    } else if (c === 2) {
      // Frame 3: outer cracks
      drawHex(239, 68, 68, 4); // turns red on cracking hit!
      // draw small crack lines in core
      drawLine(buf, size * count, size, cx - 10, cy - 10, cx + 5, cy, 255, 255, 255, 255, 2);
      drawLine(buf, size * count, size, cx + 5, cy, cx + 12, cy + 14, 255, 255, 255, 255, 2);
    } else if (c === 3) {
      // Frame 4: shield reasserts glow
      drawHex(59, 130, 246, 3);
      drawCircle(buf, size * count, size, cx, cy, rad - 6, 6, 182, 212, 30);
    }
  }
  await saveObject('core_shield', buf, size * count, size, count);
}

// 7. Chain Lightning: 32x32, 6 frames
async function makeChainLightning() {
  const size = 32;
  const count = 6;
  const buf = Buffer.alloc(size * count * size * 4, 0);

  for (let c = 0; c < count; c++) {
    const fx = c * size;
    const cx = fx + size / 2;
    const cy = size / 2;

    // Draw electric zig-zag arc from left center (fx+2, cy) to right center (fx+size-3, cy)
    // We can define 2 intermediates that randomize offsets per frame to animate!
    const rx = (val) => fx + val;

    const x0 = rx(2);
    const y0 = cy;
    const x1 = rx(10);
    const y1 = cy + (Math.sin(c + 1) * 7);
    const x2 = rx(22);
    const y2 = cy + (Math.cos(c * 2) * 8);
    const x3 = rx(size - 3);
    const y3 = cy;

    // Outer glow (electric blue)
    drawLine(buf, size * count, size, x0, y0, x1, y1, 59, 130, 246, 140, 4);
    drawLine(buf, size * count, size, x1, y1, x2, y2, 59, 130, 246, 140, 4);
    drawLine(buf, size * count, size, x2, y2, x3, y3, 59, 130, 246, 140, 4);

    // Inner core (white hot)
    drawLine(buf, size * count, size, x0, y0, x1, y1, 255, 255, 255, 255, 1.5);
    drawLine(buf, size * count, size, x1, y1, x2, y2, 255, 255, 255, 255, 1.5);
    drawLine(buf, size * count, size, x2, y2, x3, y3, 255, 255, 255, 255, 1.5);

    // Side fork
    if (c % 2 === 0) {
      const fx1 = x1;
      const fy1 = y1;
      const fx2 = x1 + 4;
      const fy2 = y1 - 10;
      drawLine(buf, size * count, size, fx1, fy1, fx2, fy2, 59, 130, 246, 180, 2.5);
      drawLine(buf, size * count, size, fx1, fy1, fx2, fy2, 255, 255, 255, 255, 1);
    }
  }
  await saveObject('chain_lightning', buf, size * count, size, count);
}

// 8. Wave Incoming Warning Alert Banner: 128x32, 4 frames
async function makeWaveAlert() {
  const width = 128;
  const height = 32;
  const count = 4;
  const buf = Buffer.alloc(width * count * height * 4, 0);

  for (let c = 0; c < count; c++) {
    const fx = c * width;

    // Terminal warning banner frame background (dark red #5f1111)
    drawRect(buf, width * count, height, fx + 2, 2, fx + width - 3, height - 3, 95, 17, 17, 255);

    // Flashing neon warning indicators
    const isBright = c === 1 || c === 2;
    const borderCol = isBright ? [239, 68, 68] : [127, 29, 29]; // Neon bright red / dark red
    const textCol = isBright ? [255, 255, 255] : [239, 68, 68];

    // Border outline
    drawRect(buf, width * count, height, fx + 3, 3, fx + width - 4, 5, borderCol[0], borderCol[1], borderCol[2], 255);
    drawRect(buf, width * count, height, fx + 3, height - 6, fx + width - 4, height - 4, borderCol[0], borderCol[1], borderCol[2], 255);
    drawRect(buf, width * count, height, fx + 3, 3, fx + 5, height - 4, borderCol[0], borderCol[1], borderCol[2], 255);
    drawRect(buf, width * count, height, fx + width - 6, 3, fx + width - 4, height - 4, borderCol[0], borderCol[1], borderCol[2], 255);

    // Draw text: "⚠ WARNING" in terminal pixel look
    const textX = fx + 18;
    const textY = height / 2;

    // Warning sign: Triangle ⚠
    drawLine(buf, width * count, height, textX + 6, textY - 8, textX, textY + 4, textCol[0], textCol[1], textCol[2], 255, 2);
    drawLine(buf, width * count, height, textX + 6, textY - 8, textX + 12, textY + 4, textCol[0], textCol[1], textCol[2], 255, 2);
    drawLine(buf, width * count, height, textX, textY + 4, textX + 12, textY + 4, textCol[0], textCol[1], textCol[2], 255, 2);
    // Warning point
    drawPixel(buf, width * count, height, textX + 6, textY - 3, 0, 0, 0, 255);
    drawPixel(buf, width * count, height, textX + 6, textY + 1, 0, 0, 0, 255);

    // "INCOMING" horizontal line segments
    const barX = textX + 18;
    drawLine(buf, width * count, height, barX, textY - 4, barX + 68, textY - 4, textCol[0], textCol[1], textCol[2], 255, 3);
    drawLine(buf, width * count, height, barX + 4, textY + 2, barX + 64, textY + 2, textCol[0], textCol[1], textCol[2], 255, 2);

    // Frame 3: Scanline scan flicker effect
    if (c === 2) {
      for (let y = 4; y < height - 4; y += 4) {
        drawRect(buf, width * count, height, fx + 4, y, fx + width - 5, y + 1, 0, 0, 0, 150); // scanlines
      }
    }
  }
  await saveObject('wave_alert', buf, width * count, height, count);
}

async function main() {
  await makeUpgradeBurstLaser();
  await makeUpgradeBurstPlasma();
  await makeRangeRing();
  await makeFireRateGear();
  await makeCrystalBurst();
  await makeCoreShield();
  await makeChainLightning();
  await makeWaveAlert();
  console.log('All upgraded tower defense visual effects generated successfully!');
}

main().catch(console.error);
