import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Helper for pure pixel-art canvas drawing
class PixelCanvas {
  width: number;
  height: number;
  data: Buffer;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = Buffer.alloc(width * height * 4, 0); // RGBA (0,0,0,0)
  }

  setPixel(x: number, y: number, r: number, g: number, b: number, a: number = 255) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const idx = (y * this.width + x) * 4;
    this.data[idx] = r;
    this.data[idx + 1] = g;
    this.data[idx + 2] = b;
    this.data[idx + 3] = a;
  }

  rect(x: number, y: number, w: number, h: number, r: number, g: number, b: number, a: number = 255) {
    for (let py = Math.floor(y); py < y + h; py++) {
      for (let px = Math.floor(x); px < x + w; px++) {
        this.setPixel(px, py, r, g, b, a);
      }
    }
  }

  circle(cx: number, cy: number, radius: number, r: number, g: number, b: number, a: number = 255) {
    for (let y = Math.floor(cy - radius); y <= cy + radius; y++) {
      for (let x = Math.floor(cx - radius); x <= cx + radius; x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2) {
          this.setPixel(x, y, r, g, b, a);
        }
      }
    }
  }

  line(x1: number, y1: number, x2: number, y2: number, r: number, g: number, b: number, a: number = 255) {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = (x1 < x2) ? 1 : -1;
    const sy = (y1 < y2) ? 1 : -1;
    let err = dx - dy;
    let x = Math.floor(x1);
    let y = Math.floor(y1);

    while (true) {
      this.setPixel(x, y, r, g, b, a);
      if (x === Math.floor(x2) && y === Math.floor(y2)) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  // Draw scaled pixel art into a destination canvas
  drawScaled(dest: PixelCanvas, destX: number, destY: number, scale: number) {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const sidx = (y * this.width + x) * 4;
        const r = this.data[sidx];
        const g = this.data[sidx + 1];
        const b = this.data[sidx + 2];
        const a = this.data[sidx + 3];
        if (a > 0) {
          dest.rect(destX + x * scale, destY + y * scale, scale, scale, r, g, b, a);
        }
      }
    }
  }
}

// Draw Ninja character onto a 32x32 canvas
function drawNinja(dir: 'down' | 'up' | 'left' | 'attack' | 'smoke', frameIdx: number, isGuard: boolean = false): PixelCanvas {
  const c = new PixelCanvas(32, 32);
  const cycle = frameIdx % 9;

  // Colors
  const black = [15, 15, 20];
  const darkGrey = [35, 35, 45];
  const lightGrey = [90, 95, 105];
  const red = [180, 20, 20];
  const gold = [218, 165, 32];
  const blue = [20, 40, 90];
  const white = [240, 240, 255];
  const skin = [240, 185, 150];

  const primaryColor = isGuard ? red : black;
  const secondaryColor = isGuard ? gold : darkGrey;
  const eyeColor = isGuard ? red : (dir === 'attack' ? red : white);

  if (dir === 'smoke') {
    // Ninja disappearing in a puff of smoke
    const smokeRadius = 3 + cycle * 1.2;
    const opacity = Math.max(0, 255 - cycle * 30);
    if (opacity <= 0) return c; // completely disappeared
    
    // Draw some ninja silhouettes breaking apart
    if (cycle < 6) {
      const offset = cycle * 2;
      c.circle(16 + offset, 16 - offset, 4 - cycle/2, primaryColor[0], primaryColor[1], primaryColor[2], opacity);
      c.circle(16 - offset, 16 + offset, 3 - cycle/2, primaryColor[0], primaryColor[1], primaryColor[2], opacity);
    }

    // Draw puffing smoke cloud
    c.circle(16, 16, smokeRadius, 100, 100, 120, opacity);
    c.circle(12, 14, smokeRadius * 0.8, 130, 130, 150, opacity);
    c.circle(20, 15, smokeRadius * 0.85, 120, 120, 140, opacity);
    c.circle(16, 20, smokeRadius * 0.7, 90, 90, 110, opacity);
    return c;
  }

  // Animation values
  const walkPhase = cycle * Math.PI / 4;
  let headBob = 0;
  let leftLegY = 27;
  let rightLegY = 27;
  let leftArmX = 8;
  let rightArmX = 24;
  let armY = 16;

  if (cycle > 0) {
    headBob = Math.abs(Math.sin(walkPhase)) * 1.2;
    leftLegY += Math.sin(walkPhase) * 2;
    rightLegY -= Math.sin(walkPhase) * 2;
    leftArmX += Math.cos(walkPhase) * 1.5;
    rightArmX -= Math.cos(walkPhase) * 1.5;
  }

  // Draw shadow
  c.circle(16, 28, 7, 0, 0, 0, 100);

  // 1. LEGS (always draw pants and feet)
  c.rect(12, 24, 3, leftLegY - 24 + 1, primaryColor[0], primaryColor[1], primaryColor[2]);
  c.rect(17, 24, 3, rightLegY - 24 + 1, primaryColor[0], primaryColor[1], primaryColor[2]);
  // feet
  c.rect(11, leftLegY, 2, 2, secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  c.rect(19, rightLegY, 2, 2, secondaryColor[0], secondaryColor[1], secondaryColor[2]);

  // 2. BODY
  c.rect(10, 14 + headBob, 12, 11, primaryColor[0], primaryColor[1], primaryColor[2]);
  // Chest plate / armor detail
  if (isGuard) {
    c.rect(12, 15 + headBob, 8, 8, secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    c.rect(14, 15 + headBob, 4, 8, red[0], red[1], red[2]);
  } else {
    // Ninja sash/belt
    c.rect(10, 20 + headBob, 12, 2, red[0], red[1], red[2]);
    // Scarf tail drifting
    const scarfOffset = Math.sin(walkPhase) * 2;
    c.line(10, 14 + headBob, 6 - scarfOffset, 16 + headBob + scarfOffset, red[0], red[1], red[2]);
    c.line(6 - scarfOffset, 16 + headBob + scarfOffset, 4 - scarfOffset*1.5, 15 + headBob + scarfOffset, red[0], red[1], red[2]);
  }

  // 3. HEAD
  const hY = 8 + headBob;
  c.circle(16, hY, 5, primaryColor[0], primaryColor[1], primaryColor[2]);
  
  if (dir === 'up') {
    // Back of the head, draw headband knot/tails
    c.rect(15, hY + 3, 2, 2, red[0], red[1], red[2]);
    c.line(16, hY + 4, 14, hY + 8, red[0], red[1], red[2]);
    c.line(16, hY + 4, 18, hY + 9, red[0], red[1], red[2]);
  } else if (dir === 'down') {
    // Face mask cutout
    c.rect(13, hY - 1, 6, 3, darkGrey[0], darkGrey[1], darkGrey[2]);
    // Headband wrapped around
    c.rect(11, hY - 3, 10, 2, red[0], red[1], red[2]);
    // Eyes
    c.setPixel(14, hY - 2, eyeColor[0], eyeColor[1], eyeColor[2]);
    c.setPixel(17, hY - 2, eyeColor[0], eyeColor[1], eyeColor[2]);
  } else if (dir === 'left') {
    // Side profile face cutout (facing left)
    c.rect(11, hY - 1, 3, 3, darkGrey[0], darkGrey[1], darkGrey[2]);
    c.rect(12, hY - 3, 5, 2, red[0], red[1], red[2]);
    c.setPixel(12, hY - 2, eyeColor[0], eyeColor[1], eyeColor[2]);
  } else if (dir === 'attack') {
    // Menacing pose, facing forward with mask down, red eyes glowing
    c.rect(13, hY - 1, 6, 3, darkGrey[0], darkGrey[1], darkGrey[2]);
    c.rect(11, hY - 3, 10, 2, red[0], red[1], red[2]);
    c.setPixel(14, hY - 2, eyeColor[0], eyeColor[1], eyeColor[2]);
    c.setPixel(17, hY - 2, eyeColor[0], eyeColor[1], eyeColor[2]);
  }

  // Helmet crest for Guard
  if (isGuard && dir !== 'up') {
    c.rect(15, hY - 7, 2, 3, gold[0], gold[1], gold[2]);
    c.rect(14, hY - 8, 4, 1, red[0], red[1], red[2]);
  }

  // 4. ARMS & WEAPONS
  if (dir === 'attack') {
    // Wielding sword slashing!
    const slashFrame = cycle % 9;
    if (slashFrame < 3) {
      // Draw sword raised on back
      c.line(22, 16, 27, 8, lightGrey[0], lightGrey[1], lightGrey[2]);
      c.rect(21, 15, 2, 2, secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    } else if (slashFrame >= 3 && slashFrame <= 6) {
      // Sword slashing forwards!
      c.line(16, 17, 8, 17, lightGrey[0], lightGrey[1], lightGrey[2]);
      c.rect(16, 16, 2, 2, secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      // Slash arc effect
      const arcAlpha = Math.max(0, 200 - (slashFrame - 3) * 50);
      c.line(7, 10, 5, 17, white[0], white[1], white[2], arcAlpha);
      c.line(5, 17, 7, 24, white[0], white[1], white[2], arcAlpha);
    } else {
      // Follow through
      c.line(16, 18, 10, 22, lightGrey[0], lightGrey[1], lightGrey[2]);
    }
  } else {
    // Normal walking / idle arms
    if (dir === 'left') {
      // Facing left, right arm swinging, left holding sword sheath
      c.rect(15, 15 + headBob, 3, 6, primaryColor[0], primaryColor[1], primaryColor[2]);
      // Katana on back
      c.line(19, 13 + headBob, 25, 6 + headBob, lightGrey[0], lightGrey[1], lightGrey[2]);
      c.rect(18, 14 + headBob, 2, 2, secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    } else {
      // Facing forward or back
      c.rect(leftArmX, armY + headBob, 3, 5, primaryColor[0], primaryColor[1], primaryColor[2]);
      c.rect(rightArmX, armY + headBob, 3, 5, primaryColor[0], primaryColor[1], primaryColor[2]);
      // Katana on back
      if (!isGuard) {
        c.line(21, 12 + headBob, 26, 5 + headBob, lightGrey[0], lightGrey[1], lightGrey[2]);
        c.rect(20, 13 + headBob, 2, 2, secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      } else {
        // Guard holds a spear
        c.line(24, 4 + headBob, 24, 28 + headBob, lightGrey[0], lightGrey[1], lightGrey[2]);
        c.rect(23, 3 + headBob, 3, 3, gold[0], gold[1], gold[2]); // spear tip
      }
    }
  }

  return c;
}

// Draw static tile texture 128x128
function drawTile(type: string): PixelCanvas {
  const c = new PixelCanvas(128, 128);

  if (type === 'grass_base') {
    // Dark mossy grass
    c.rect(0, 0, 128, 128, 22, 38, 26);
    // Draw some leafy grass clumps
    for (let i = 0; i < 20; i++) {
      const gx = Math.floor(Math.sin(i * 32.1) * 60 + 64);
      const gy = Math.floor(Math.cos(i * 17.5) * 60 + 64);
      c.rect(gx, gy, 4, 6, 16, 28, 19);
      c.rect(gx + 2, gy - 2, 2, 4, 28, 48, 32);
    }
  } else if (type === 'stone_base') {
    // Cobblestone pavement
    c.rect(0, 0, 128, 128, 45, 45, 52); // Grout/borders
    // Grid of cobblestones
    const size = 32;
    for (let gy = 0; gy < 4; gy++) {
      for (let gx = 0; gx < 4; gx++) {
        c.rect(gx * size + 2, gy * size + 2, size - 4, size - 4, 70, 72, 82);
        // Highlight
        c.rect(gx * size + 2, gy * size + 2, size - 4, 2, 95, 98, 110);
        c.rect(gx * size + 2, gy * size + 2, 2, size - 4, 95, 98, 110);
      }
    }
  } else if (type === 'stone_wall') {
    // Dark castle brick wall
    c.rect(0, 0, 128, 128, 25, 25, 32); // grout
    const rHeight = 32;
    for (let r = 0; r < 4; r++) {
      const offset = (r % 2) * 32;
      for (let bx = -1; bx < 3; bx++) {
        const x = bx * 64 + offset;
        c.rect(x + 2, r * rHeight + 2, 60, rHeight - 4, 50, 52, 62);
        // Highlight
        c.rect(x + 2, r * rHeight + 2, 60, 2, 80, 85, 95);
        c.rect(x + 2, r * rHeight + 2, 2, rHeight - 4, 80, 85, 95);
      }
    }
  } else if (type === 'wood_floor') {
    // Warehouse wooden planks
    c.rect(0, 0, 128, 128, 48, 30, 18); // gaps
    const w = 32;
    for (let i = 0; i < 4; i++) {
      c.rect(i * w + 2, 0, w - 4, 128, 92, 60, 36);
      // Wood grain lines
      for (let y = 10; y < 120; y += 20) {
        c.rect(i * w + 6, y, 2, 8, 70, 42, 22);
      }
    }
  } else if (type === 'brick_wall') {
    // Deep red warehouse brick wall
    c.rect(0, 0, 128, 128, 30, 20, 20); // grout
    const rH = 16;
    for (let r = 0; r < 8; r++) {
      const offset = (r % 2) * 24;
      for (let bx = -1; bx < 4; bx++) {
        const x = bx * 48 + offset;
        c.rect(x + 2, r * rH + 2, 44, rH - 4, 85, 45, 35);
        // highlight
        c.rect(x + 2, r * rH + 2, 44, 1, 120, 75, 65);
        c.rect(x + 2, r * rH + 2, 1, rH - 4, 120, 75, 65);
      }
    }
  } else if (type === 'tatami_floor') {
    // Pale straw tatami floor
    c.rect(0, 0, 128, 128, 205, 195, 140);
    // Dark brown side bands
    c.rect(0, 0, 8, 128, 45, 35, 20);
    c.rect(120, 0, 8, 128, 45, 35, 20);
    // Subtle straw lines
    for (let y = 8; y < 128; y += 8) {
      c.line(8, y, 120, y, 190, 180, 125);
    }
  } else if (type === 'shoji_wall') {
    // Shoji screen wall
    c.rect(0, 0, 128, 128, 235, 230, 215); // paper
    // Wooden frame outlines
    c.rect(0, 0, 128, 8, 65, 45, 25);
    c.rect(0, 120, 128, 8, 65, 45, 25);
    c.rect(0, 0, 8, 128, 65, 45, 25);
    c.rect(120, 0, 8, 128, 65, 45, 25);
    // Inner grid
    c.rect(40, 0, 4, 128, 65, 45, 25);
    c.rect(80, 0, 4, 128, 65, 45, 25);
    c.rect(0, 40, 128, 4, 65, 45, 25);
    c.rect(0, 80, 128, 4, 65, 45, 25);
  } else if (type === 'bush') {
    // Bush obstacle, dark green leaves
    c.circle(64, 64, 48, 18, 55, 26);
    c.circle(50, 50, 32, 28, 76, 38);
    c.circle(78, 55, 30, 24, 70, 34);
    c.circle(64, 80, 32, 12, 42, 20);
    // Add leaf pixels
    for (let i = 0; i < 30; i++) {
      const lx = Math.floor(Math.sin(i * 14.5) * 35 + 64);
      const ly = Math.floor(Math.cos(i * 22.1) * 35 + 64);
      c.rect(lx, ly, 4, 4, 45, 105, 55);
    }
  } else if (type === 'crate') {
    // Wooden crate
    c.rect(4, 4, 120, 120, 130, 95, 65); // main box
    c.rect(4, 4, 120, 12, 160, 120, 85); // border top
    c.rect(4, 112, 120, 12, 100, 70, 45); // border bottom
    c.rect(4, 4, 12, 120, 160, 120, 85); // border left
    c.rect(112, 4, 12, 120, 100, 70, 45); // border right
    // Diagonal brace
    c.line(16, 16, 112, 112, 100, 70, 45);
    c.line(16, 15, 112, 111, 100, 70, 45);
    c.line(17, 16, 112, 111, 100, 70, 45);
  } else if (type === 'barrel') {
    // Wooden barrel
    c.circle(64, 64, 52, 95, 60, 36);
    // Vertical plank lines
    c.rect(60, 12, 8, 104, 70, 42, 22);
    c.rect(32, 16, 6, 96, 70, 42, 22);
    c.rect(90, 16, 6, 96, 70, 42, 22);
    // Metal straps
    c.rect(20, 36, 88, 10, 120, 125, 135);
    c.rect(16, 82, 96, 10, 120, 125, 135);
  } else if (type === 'lantern') {
    // Japanese Stone lantern (灯笼)
    c.rect(54, 88, 20, 32, 70, 75, 80); // base pedestal
    c.rect(44, 76, 40, 12, 90, 95, 100); // lower plate
    c.rect(48, 48, 32, 28, 60, 65, 70); // screen chamber
    c.rect(54, 54, 20, 16, 255, 210, 50); // warm light glow!
    c.rect(32, 36, 64, 12, 90, 95, 100); // roof lid
    c.rect(58, 20, 12, 16, 70, 75, 80); // top spire knob
  }

  return c;
}

// Draw object frames (128x128px)
function drawObject(type: string, frameIdx: number): PixelCanvas {
  const c = new PixelCanvas(128, 128);
  const cycle = frameIdx % 6;

  if (type === 'scroll') {
    // Golden intelligence scroll, floating/spinning animation
    const floatY = Math.sin(frameIdx * Math.PI / 3) * 6;
    const scrollW = 70 + Math.sin(frameIdx * Math.PI / 3) * 6; // spinning stretch effect
    const cx = 64;
    const cy = 64 + floatY;

    // Shadow on ground
    c.circle(64, 110, 16, 0, 0, 0, 70);

    // Scroll roller bar
    c.rect(cx - scrollW / 2, cy - 12, scrollW, 24, 218, 165, 32); // gold scroll
    c.rect(cx - scrollW / 2 + 10, cy - 10, scrollW - 20, 20, 245, 230, 180); // cream parchment
    c.rect(cx - 4, cy - 12, 8, 24, 180, 20, 20); // red ribbon tie
    // wooden ends
    c.rect(cx - scrollW / 2 - 3, cy - 14, 3, 28, 110, 70, 30);
    c.rect(cx + scrollW / 2, cy - 14, 3, 28, 110, 70, 30);
    // sparkles around
    if (frameIdx % 2 === 0) {
      c.rect(cx - 25, cy - 25, 2, 2, 255, 255, 255);
      c.rect(cx + 25, cy + 20, 2, 2, 255, 255, 255);
    }
  } else if (type === 'smoke_bomb') {
    // Small grey smoke bomb ninja tool
    const floatY = Math.sin(frameIdx * Math.PI / 4) * 4;
    const cx = 64;
    const cy = 64 + floatY;

    c.circle(64, 100, 8, 0, 0, 0, 90); // shadow

    c.circle(cx, cy, 12, 60, 65, 75); // bomb body
    c.circle(cx - 3, cy - 3, 4, 100, 105, 115); // highlight
    c.rect(cx - 2, cy - 14, 4, 4, 120, 70, 30); // wood fuse cap
    // sparkling fuse fire
    const sparkC = cycle % 2 === 0 ? [255, 100, 0] : [255, 220, 0];
    c.rect(cx - 1 + Math.sin(frameIdx) * 2, cy - 17, 2, 2, sparkC[0], sparkC[1], sparkC[2]);
  } else if (type === 'smoke_cloud') {
    // Puffing smoke cloud effect
    const maxRadius = 15 + frameIdx * 8; // grows over time
    const cx = 64;
    const cy = 64;
    const opacity = Math.max(0, 240 - frameIdx * 35); // fades out

    if (opacity > 0) {
      c.circle(cx, cy, maxRadius, 120, 120, 140, opacity);
      c.circle(cx - maxRadius * 0.4, cy - maxRadius * 0.2, maxRadius * 0.8, 140, 140, 160, opacity);
      c.circle(cx + maxRadius * 0.4, cy + maxRadius * 0.1, maxRadius * 0.75, 110, 110, 130, opacity);
      c.circle(cx, cy + maxRadius * 0.3, maxRadius * 0.85, 90, 90, 110, opacity);
    }
  }

  return c;
}

// Generate character spritesheet and write to files
async function generateCharAsset(name: string, isGuard: boolean) {
  const runDir = path.join('./char_runs', name);
  const outDir = path.join(runDir, 'output');
  fs.mkdirSync(outDir, { recursive: true });

  const anims = isGuard 
    ? ['idle', 'walk-down', 'walk-up', 'walk-left']
    : ['idle', 'walk-down', 'walk-up', 'walk-left', 'attack', 'smoke'];
  
  const numRows = anims.length;
  const sheetWidth = 1728; // 9 frames * 192px
  const sheetHeight = numRows * 208;

  const finalSheet = new PixelCanvas(sheetWidth, sheetHeight);

  const charJson: any = {
    name: name,
    type: "char-sprite-v1",
    dimensions: {
      width: sheetWidth,
      height: sheetHeight
    },
    frameSize: {
      width: 192,
      height: 208
    },
    rows: anims,
    animations: {}
  };

  for (let r = 0; r < numRows; r++) {
    const anim = anims[r];
    
    // Determine drawing direction
    let drawDir: 'down' | 'up' | 'left' | 'attack' | 'smoke' = 'down';
    if (anim === 'idle') drawDir = 'down';
    else if (anim === 'walk-down') drawDir = 'down';
    else if (anim === 'walk-up') drawDir = 'up';
    else if (anim === 'walk-left') drawDir = 'left';
    else if (anim === 'attack') drawDir = 'attack';
    else if (anim === 'smoke') drawDir = 'smoke';

    // Populate char.json details
    charJson.animations[anim] = {
      row: r,
      frameCount: 9,
      fps: anim === 'smoke' ? 12 : (anim === 'attack' ? 12 : 8),
      loop: anim !== 'attack' && anim !== 'smoke'
    };

    // Draw 9 frames
    for (let f = 0; f < 9; f++) {
      const frameCanvas = drawNinja(drawDir, f, isGuard);
      
      // Upscale 32x32 frame by 4x to 128x128 and center inside 192x208
      const destX = f * 192 + (192 - 128) / 2;
      const destY = r * 208 + (208 - 128) / 2;
      
      frameCanvas.drawScaled(finalSheet, destX, destY, 4);
    }
  }

  // Save to WebP spritesheet
  await sharp(finalSheet.data, { raw: { width: sheetWidth, height: sheetHeight, channels: 4 } })
    .webp()
    .toFile(path.join(outDir, 'spritesheet.webp'));

  fs.writeFileSync(path.join(outDir, 'char.json'), JSON.stringify(charJson, null, 2));

  // Also write manifest
  const manifest = {
    name: name,
    status: "initialized",
    created_at: new Date().toISOString(),
    reference: {
      status: "completed",
      path: `char_runs/${name}/reference`
    },
    rows: {} as any
  };
  anims.forEach(a => {
    manifest.rows[a] = {
      fps: a === 'smoke' ? 12 : (a === 'attack' ? 12 : 8),
      loop: a !== 'attack' && a !== 'smoke',
      status: "completed"
    };
  });
  fs.writeFileSync(path.join(runDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`Generated character asset: ${name}`);
}

// Generate animated objects
async function generateObjectAsset(name: string, frameCount: number, fps: number, loop: boolean) {
  const runDir = path.join('./object_runs', name);
  const outDir = path.join(runDir, 'output');
  fs.mkdirSync(outDir, { recursive: true });

  const frameSize = 128;
  const sheetWidth = frameCount * frameSize;
  const sheetHeight = frameSize;

  const finalSheet = new PixelCanvas(sheetWidth, sheetHeight);

  for (let f = 0; f < frameCount; f++) {
    const frameCanvas = drawObject(name, f);
    frameCanvas.drawScaled(finalSheet, f * frameSize, 0, 1);
  }

  await sharp(finalSheet.data, { raw: { width: sheetWidth, height: sheetHeight, channels: 4 } })
    .webp()
    .toFile(path.join(outDir, 'object.webp'));

  const objJson = {
    name: name,
    type: "anim-object-v1",
    frameCount: frameCount,
    frameSize: frameSize,
    fps: fps,
    loop: loop,
    strip: {
      width: sheetWidth,
      height: sheetHeight
    }
  };

  fs.writeFileSync(path.join(outDir, 'object.json'), JSON.stringify(objJson, null, 2));

  // Write manifest
  const manifest = {
    name: name,
    status: "initialized",
    created_at: new Date().toISOString(),
    objectProject: name,
    fps: fps,
    loop: loop,
    frameCount: frameCount
  };
  fs.writeFileSync(path.join(runDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`Generated object asset: ${name}`);
}

// Generate environment tiles
async function generateTiles() {
  const runDir = path.join('./texture_runs', 'NinjaStealth');
  const outDir = path.join(runDir, 'output');
  fs.mkdirSync(outDir, { recursive: true });

  const tiles = [
    'grass_base',
    'stone_base',
    'stone_wall',
    'wood_floor',
    'brick_wall',
    'tatami_floor',
    'shoji_wall',
    'bush',
    'crate',
    'barrel',
    'lantern'
  ];

  for (const t of tiles) {
    const tileCanvas = drawTile(t);
    // Write 128x128 PNG
    await sharp(tileCanvas.data, { raw: { width: 128, height: 128, channels: 4 } })
      .png()
      .toFile(path.join(outDir, `${t}.png`));
  }

  // Write manifest
  const manifest = {
    name: "NinjaStealth",
    style: "pixel",
    status: "completed",
    created_at: new Date().toISOString(),
    tiles: tiles.map(t => ({ name: t, variants: ["base"] }))
  };
  fs.writeFileSync(path.join(runDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`Generated tiles for NinjaStealth`);
}

async function main() {
  console.log('Generating assets for NinjaStealth...');
  await generateCharAsset('NinjaKage', false);
  await generateCharAsset('SamuraiGuard', true);
  await generateObjectAsset('scroll', 6, 8, true);
  await generateObjectAsset('smoke_bomb', 6, 8, true);
  await generateObjectAsset('smoke_cloud', 6, 12, false);
  await generateTiles();
  console.log('All assets generated successfully!');
}

main().catch(console.error);
