/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Helper: draw single pixel in buffer
function drawPixel(buf: Buffer, w: number, h: number, x: number, y: number, r: number, g: number, b: number, a: number) {
  const roundedX = Math.round(x);
  const roundedY = Math.round(y);
  if (roundedX >= 0 && roundedX < w && roundedY >= 0 && roundedY < h) {
    const idx = (roundedY * w + roundedX) * 4;
    buf[idx] = r;
    buf[idx + 1] = g;
    buf[idx + 2] = b;
    buf[idx + 3] = a;
  }
}

// Helper: draw solid circle in buffer
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

// Helper: draw pixel art 'Z' character
function drawZ(buf: Buffer, w: number, h: number, xStart: number, yStart: number, scale: number, color: { r: number; g: number; b: number }) {
  const zMask = [
    [1, 1, 1, 1, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 0, 0, 0],
    [1, 1, 1, 1, 1]
  ];
  
  // Draw with black outline first
  for (let r = -1; r <= 5; r++) {
    for (let c = -1; c <= 5; c++) {
      // check if adjacent is Z
      let isOutline = false;
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const zr = r + oy;
          const zc = c + ox;
          if (zr >= 0 && zr < 5 && zc >= 0 && zc < 5 && zMask[zr][zc] === 1) {
            isOutline = true;
          }
        }
      }
      
      const isZ = r >= 0 && r < 5 && c >= 0 && c < 5 && zMask[r][c] === 1;
      if (isOutline && !isZ) {
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            drawPixel(buf, w, h, xStart + c * scale + dx, yStart + r * scale + dy, 0, 0, 0, 255);
          }
        }
      }
    }
  }

  // Draw inner color
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (zMask[r][c] === 1) {
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            drawPixel(buf, w, h, xStart + c * scale + dx, yStart + r * scale + dy, color.r, color.g, color.b, 255);
          }
        }
      }
    }
  }
}

// 1. Redraw Bonfire Animation
async function redrawBonfire() {
  const runDir = './object_runs/bonfire';
  const framesDir = path.join(runDir, 'frames');
  fs.mkdirSync(framesDir, { recursive: true });

  const frameSize = 128;
  const frameCount = 6;
  console.log('Generating procedural bonfire animation...');

  for (let f = 0; f < frameCount; f++) {
    const buf = Buffer.alloc(frameSize * frameSize * 4, 0);

    // Draw logs crossing at the bottom
    // Log 1: top-left to bottom-right
    for (let i = 40; i <= 88; i++) {
      const x = i;
      const y = 92 + (x - 64) * 0.2;
      drawCircle(buf, frameSize, frameSize, x, y, 6, 92, 64, 51, 255); // Dark brown bark
      drawCircle(buf, frameSize, frameSize, x, y, 4, 139, 90, 43, 255); // Light wood inner
    }

    // Log 2: bottom-left to top-right
    for (let i = 40; i <= 88; i++) {
      const x = i;
      const y = 92 - (x - 64) * 0.2;
      drawCircle(buf, frameSize, frameSize, x, y, 6, 70, 48, 38, 255); // Darker brown
      drawCircle(buf, frameSize, frameSize, x, y, 4, 115, 75, 35, 255);
    }

    // Draw bonfire base (stones)
    for (let x = 32; x <= 96; x += 12) {
      drawCircle(buf, frameSize, frameSize, x + Math.sin(x) * 2, 98 + Math.cos(x) * 2, 6, 75, 85, 90, 255); // Grey stones
      drawCircle(buf, frameSize, frameSize, x + Math.sin(x) * 2, 98 + Math.cos(x) * 2, 4, 100, 110, 115, 255);
    }

    // Draw animated flickering flames (flowing upwards)
    const maxFlameH = 55 + Math.sin(f * Math.PI / 3 * 2) * 8;
    for (let y = 90; y > 90 - maxFlameH; y--) {
      const progress = (90 - y) / maxFlameH; // 0 to 1
      const wiggle = Math.sin(y * 0.08 + f * 1.5) * 8 * progress;
      const cx = 64 + wiggle;
      const rBase = 18 * Math.pow(1 - progress, 0.7); // Taper off at the top

      if (rBase > 0.5) {
        // Red outer flame
        drawCircle(buf, frameSize, frameSize, cx, y, rBase, 239, 68, 68, 255);
        // Orange middle flame
        if (rBase > 3) {
          drawCircle(buf, frameSize, frameSize, cx, y, rBase - 3, 249, 115, 22, 255);
        }
        // Yellow core
        if (rBase > 7) {
          drawCircle(buf, frameSize, frameSize, cx, y, rBase - 7, 245, 158, 11, 255);
        }
        // White-hot center
        if (rBase > 11) {
          drawCircle(buf, frameSize, frameSize, cx, y, rBase - 11, 254, 243, 199, 255);
        }
      }
    }

    const framePath = path.join(framesDir, `frame_${f}.png`);
    await sharp(buf, { raw: { width: frameSize, height: frameSize, channels: 4 } })
      .png()
      .toFile(framePath);
    console.log(`  Saved bonfire frame ${f}`);
  }
}

// 2. Redraw Sleeping Farmer Animation
async function redrawSleepingFarmer() {
  const refPath = './char_runs/Farmer/reference/frame_0.png';
  if (!fs.existsSync(refPath)) {
    console.error(`Error: Farmer reference not found at ${refPath}`);
    return;
  }

  const runDir = './char_runs/Farmer';
  const sleepDir = path.join(runDir, 'rows', 'sleeping');
  fs.mkdirSync(sleepDir, { recursive: true });

  const frameWidth = 192;
  const frameHeight = 208;
  const frameCount = 9;
  console.log('Generating sleeping farmer rotation + Zzz animation...');

  for (let f = 0; f < frameCount; f++) {
    let frameBuf: Buffer;

    if (f === 0) {
      // Frame 0: Standing normal
      frameBuf = await sharp(refPath).raw().toBuffer();
    } else if (f === 1) {
      // Frame 1: Squeezed / crouched slightly
      const squeezed = await sharp(refPath)
        .resize(frameWidth, Math.round(frameHeight * 0.9))
        .toBuffer();
      
      frameBuf = await sharp({
        create: { width: frameWidth, height: frameHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
      })
        .composite([{ input: squeezed, top: 20, left: 0 }])
        .raw()
        .toBuffer();
    } else if (f === 2) {
      // Frame 2: Kneeling lower
      const squeezed = await sharp(refPath)
        .resize(frameWidth, Math.round(frameHeight * 0.8))
        .toBuffer();
      
      frameBuf = await sharp({
        create: { width: frameWidth, height: frameHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
      })
        .composite([{ input: squeezed, top: 40, left: 0 }])
        .raw()
        .toBuffer();
    } else if (f === 3) {
      // Frame 3: Rotating down (30 deg)
      const rotated = await sharp(refPath)
        .rotate(30, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .resize(frameWidth, frameHeight, { fit: 'inside' })
        .toBuffer();
      
      frameBuf = await sharp({
        create: { width: frameWidth, height: frameHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
      })
        .composite([{ input: rotated, gravity: 'center' }])
        .raw()
        .toBuffer();
    } else if (f === 4) {
      // Frame 4: Rotating down more (60 deg)
      const rotated = await sharp(refPath)
        .rotate(60, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .resize(frameWidth, frameHeight, { fit: 'inside' })
        .toBuffer();
      
      frameBuf = await sharp({
        create: { width: frameWidth, height: frameHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
      })
        .composite([{ input: rotated, gravity: 'center' }])
        .raw()
        .toBuffer();
    } else {
      // Frame 5-8: Lying completely flat (90 deg rotated)
      const rotated = await sharp(refPath)
        .rotate(90, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .resize(frameWidth, frameHeight, { fit: 'inside' })
        .toBuffer();
      
      // Composite rotated sprite slightly lower
      const flatBase = await sharp({
        create: { width: frameWidth, height: frameHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
      })
        .composite([{ input: rotated, top: 45, left: 0 }])
        .raw()
        .toBuffer({ resolveWithObject: true });

      const buf = flatBase.data;

      // Draw floating Zzz indicators (light blue/white wiggling up)
      const zColor = { r: 147, g: 197, b: 253 }; // Light blue

      if (f === 5) {
        drawZ(buf, frameWidth, frameHeight, 115, 95, 1, zColor);
      } else if (f === 6) {
        drawZ(buf, frameWidth, frameHeight, 110, 95, 1, zColor);
        drawZ(buf, frameWidth, frameHeight, 122, 70, 2, zColor);
      } else if (f === 7) {
        drawZ(buf, frameWidth, frameHeight, 112, 95, 1, zColor);
        drawZ(buf, frameWidth, frameHeight, 120, 72, 2, zColor);
        drawZ(buf, frameWidth, frameHeight, 135, 45, 3, zColor);
      } else if (f === 8) {
        drawZ(buf, frameWidth, frameHeight, 115, 90, 1, zColor);
        drawZ(buf, frameWidth, frameHeight, 123, 67, 2, zColor);
        drawZ(buf, frameWidth, frameHeight, 137, 40, 3, zColor);
      }

      frameBuf = buf;
    }

    const framePath = path.join(sleepDir, `frame_${f}.png`);
    await sharp(frameBuf, { raw: { width: frameWidth, height: frameHeight, channels: 4 } })
      .png()
      .toFile(framePath);
    console.log(`  Saved sleeping frame ${f}`);
  }
}

// 3. Main runner to execute and re-assemble
async function main() {
  await redrawBonfire();
  await redrawSleepingFarmer();

  // Run the assembly scripts to rebuild the spritesheets
  const { execSync } = await import('child_process');
  
  console.log('Re-assembling bonfire object...');
  execSync('npx tsx skills/object-anim/assemble.ts bonfire', { stdio: 'inherit' });

  console.log('Re-assembling Farmer sprite...');
  execSync('npx tsx skills/char-sprite/assemble.ts Farmer', { stdio: 'inherit' });

  console.log('Re-assembling PixelFarm game...');
  execSync('npx tsx skills/game-gen/assemble.ts PixelFarm', { stdio: 'inherit' });
  
  console.log('Redraw and assembly complete!');
}

main().catch(console.error);
