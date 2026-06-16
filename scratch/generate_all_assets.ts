import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// ─── TILE SVG GENERATORS ───────────────────────────────────────────

function getBambooGroundSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <rect width="512" height="512" fill="#4d7c0f"/>
    <rect y="0" width="512" height="40" fill="#65a30d"/>
    <path d="M 50 40 L 60 10 L 70 40 Z" fill="#a3e635" stroke="#365314" stroke-width="8"/>
    <path d="M 150 40 L 165 5 L 180 40 Z" fill="#a3e635" stroke="#365314" stroke-width="8"/>
    <path d="M 300 40 L 310 12 L 320 40 Z" fill="#a3e635" stroke="#365314" stroke-width="8"/>
    <path d="M 420 40 L 435 8 L 450 40 Z" fill="#a3e635" stroke="#365314" stroke-width="8"/>
    <circle cx="100" cy="200" r="15" fill="#3f6212"/>
    <circle cx="280" cy="350" r="20" fill="#3f6212"/>
    <circle cx="400" cy="220" r="12" fill="#3f6212"/>
    <circle cx="150" cy="400" r="18" fill="#3f6212"/>
    <circle cx="350" cy="150" r="15" fill="#3f6212"/>
  </svg>`;
}

function getBambooPlatformSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <!-- Log 1 -->
    <rect x="10" y="100" width="492" height="70" rx="35" fill="#84cc16" stroke="#1e3a0a" stroke-width="12"/>
    <line x1="150" y1="100" x2="150" y2="170" stroke="#1e3a0a" stroke-width="12"/>
    <line x1="350" y1="100" x2="350" y2="170" stroke="#1e3a0a" stroke-width="12"/>
    <!-- Log 2 -->
    <rect x="10" y="180" width="492" height="70" rx="35" fill="#65a30d" stroke="#1e3a0a" stroke-width="12"/>
    <line x1="120" y1="180" x2="120" y2="250" stroke="#1e3a0a" stroke-width="12"/>
    <line x1="320" y1="180" x2="320" y2="250" stroke="#1e3a0a" stroke-width="12"/>
    <!-- Log 3 -->
    <rect x="10" y="260" width="492" height="70" rx="35" fill="#4d7c0f" stroke="#1e3a0a" stroke-width="12"/>
    <line x1="170" y1="260" x2="170" y2="330" stroke="#1e3a0a" stroke-width="12"/>
    <line x1="370" y1="260" x2="370" y2="330" stroke="#1e3a0a" stroke-width="12"/>
    <!-- Rope bindings -->
    <rect x="80" y="85" width="25" height="260" rx="5" fill="#ca8a04" stroke="#451a03" stroke-width="8"/>
    <rect x="400" y="85" width="25" height="260" rx="5" fill="#ca8a04" stroke="#451a03" stroke-width="8"/>
  </svg>`;
}

function getCastleRoofSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <rect width="512" height="512" fill="#1e293b"/>
    <!-- Row 1 of tiles -->
    <path d="M -20 100 Q 44 150 108 100 Q 172 150 236 100 Q 300 150 364 100 Q 428 150 492 100 Q 556 150 620 100" fill="none" stroke="#64748b" stroke-width="24"/>
    <path d="M -20 100 Q 44 150 108 100 Q 172 150 236 100 Q 300 150 364 100 Q 428 150 492 100 Q 556 150 620 100" fill="none" stroke="#0f172a" stroke-width="12"/>
    <!-- Row 2 of tiles -->
    <path d="M -20 250 Q 44 300 108 250 Q 172 300 236 250 Q 300 300 364 250 Q 428 300 492 250 Q 556 300 620 250" fill="none" stroke="#475569" stroke-width="24"/>
    <path d="M -20 250 Q 44 300 108 250 Q 172 300 236 250 Q 300 300 364 250 Q 428 300 492 250 Q 556 300 620 250" fill="none" stroke="#0f172a" stroke-width="12"/>
    <!-- Row 3 of tiles -->
    <path d="M -20 400 Q 44 450 108 400 Q 172 450 236 400 Q 300 450 364 400 Q 428 450 492 400 Q 556 450 620 400" fill="none" stroke="#334155" stroke-width="24"/>
    <path d="M -20 400 Q 44 450 108 400 Q 172 450 236 400 Q 300 450 364 400 Q 428 450 492 400 Q 556 450 620 400" fill="none" stroke="#0f172a" stroke-width="12"/>
  </svg>`;
}

function getCastlePlatformSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <rect x="0" y="120" width="512" height="120" fill="#78350f" stroke="#451a03" stroke-width="14"/>
    <rect x="20" y="140" width="472" height="80" fill="#92400e" stroke="#451a03" stroke-width="8"/>
    <!-- Metallic borders -->
    <rect x="0" y="120" width="40" height="120" fill="#eab308" stroke="#451a03" stroke-width="10"/>
    <rect x="472" y="120" width="40" height="120" fill="#eab308" stroke="#451a03" stroke-width="10"/>
    <circle cx="20" cy="150" r="6" fill="#ca8a04"/>
    <circle cx="20" cy="210" r="6" fill="#ca8a04"/>
    <circle cx="492" cy="150" r="6" fill="#ca8a04"/>
    <circle cx="492" cy="210" r="6" fill="#ca8a04"/>
  </svg>`;
}

function getCloudPlatformSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <path d="M 80 300 
             A 50 50 0 0 1 150 200 
             A 70 70 0 0 1 290 180 
             A 60 60 0 0 1 380 230 
             A 50 50 0 0 1 430 300 
             A 50 50 0 0 1 400 370 
             L 110 370 
             A 40 40 0 0 1 80 300 Z" fill="#f0f9ff" stroke="#38bdf8" stroke-width="16"/>
    <path d="M 110 320 A 30 30 0 0 1 150 250 A 50 50 0 0 1 270 230 A 40 40 0 0 1 340 270" fill="none" stroke="#e0f2fe" stroke-width="10"/>
  </svg>`;
}

// ─── CHARACTER SVG GENERATORS ──────────────────────────────────────

function getCatNinjaSvg(row: string, frame: number): string {
  // Center is 96, 104
  let bobY = 0;
  if (row === 'idle') {
    bobY = Math.sin(frame * Math.PI / 4) * 4;
  } else if (row === 'walk-left') {
    bobY = Math.abs(Math.sin(frame * Math.PI / 2)) * 6;
  } else if (row === 'jump') {
    // Jump arc
    if (frame < 3) bobY = -frame * 10;
    else if (frame < 6) bobY = -30 + (frame - 3) * 5;
    else bobY = -15 + (frame - 6) * 7.5;
  }

  const headX = 96;
  const headY = 90 + bobY;

  // Bandana knot wiggle
  let knotPath = '';
  if (row === 'idle') {
    const w = Math.sin(frame * Math.PI / 4) * 6;
    knotPath = `<path d="M ${headX - 26} ${headY} Q ${headX - 42} ${headY + 10 + w} ${headX - 52} ${headY + w * 0.8}" fill="none" stroke="#ef4444" stroke-width="8" stroke-linecap="round"/>`;
  } else {
    // Running / Jumping: trail behind
    const w = Math.sin(frame * Math.PI / 2.5) * 8;
    knotPath = `<path d="M ${headX - 26} ${headY} Q ${headX - 48} ${headY - 5 + w} ${headX - 60} ${headY - 12 + w * 0.7}" fill="none" stroke="#ef4444" stroke-width="8" stroke-linecap="round"/>`;
  }

  // Running hands / feet swing
  let leftHand = '';
  let rightHand = '';
  let leftFoot = '';
  let rightFoot = '';

  if (row === 'idle') {
    leftHand = `<circle cx="78" cy="${132 + bobY}" r="7" fill="#1e293b" stroke="#000" stroke-width="4"/>`;
    rightHand = `<circle cx="114" cy="${132 + bobY}" r="7" fill="#1e293b" stroke="#000" stroke-width="4"/>`;
    leftFoot = `<ellipse cx="82" cy="160" rx="8" ry="6" fill="#1e293b" stroke="#000" stroke-width="4"/>`;
    rightFoot = `<ellipse cx="110" cy="160" rx="8" ry="6" fill="#1e293b" stroke="#000" stroke-width="4"/>`;
  } else if (row === 'walk-left') {
    // swing legs and arms
    const swing = Math.sin(frame * Math.PI / 4.5);
    const handX = headX + 18 + swing * 12;
    const handY = 132 + bobY + Math.cos(frame * Math.PI / 4.5) * 6;
    leftHand = `<circle cx="76" cy="${130 + bobY}" r="7" fill="#1e293b" stroke="#000" stroke-width="4"/>`;
    rightHand = `<circle cx="${handX}" cy="${handY}" r="7" fill="#1e293b" stroke="#000" stroke-width="4"/>`;

    const lFootX = headX - 14 + swing * 16;
    const lFootY = 160 + Math.max(0, Math.cos(frame * Math.PI / 4.5) * 8);
    const rFootX = headX + 14 - swing * 16;
    const rFootY = 160 + Math.max(0, -Math.cos(frame * Math.PI / 4.5) * 8);
    leftFoot = `<ellipse cx="${lFootX}" cy="${lFootY}" rx="8" ry="6" fill="#1e293b" stroke="#000" stroke-width="4"/>`;
    rightFoot = `<ellipse cx="${rFootX}" cy="${rFootY}" rx="8" ry="6" fill="#1e293b" stroke="#000" stroke-width="4"/>`;
  } else if (row === 'jump') {
    leftHand = `<circle cx="76" cy="${125 + bobY}" r="7" fill="#1e293b" stroke="#000" stroke-width="4"/>`;
    rightHand = `<circle cx="116" cy="${125 + bobY}" r="7" fill="#1e293b" stroke="#000" stroke-width="4"/>`;
    leftFoot = `<ellipse cx="84" cy="${152 + bobY}" rx="8" ry="6" fill="#1e293b" stroke="#000" stroke-width="4"/>`;
    rightFoot = `<ellipse cx="108" cy="${152 + bobY}" rx="8" ry="6" fill="#1e293b" stroke="#000" stroke-width="4"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="208" viewBox="0 0 192 208">
    <!-- Katana Handle -->
    <line x1="${headX - 12}" y1="${headY + 12}" x2="${headX - 30}" y2="${headY - 12}" stroke="#64748b" stroke-width="8" stroke-linecap="round"/>
    <line x1="${headX - 22}" y1="${headY + 2}" x2="${headX - 14}" y2="${headY - 3}" stroke="#eab308" stroke-width="10" stroke-linecap="round"/>
    
    <!-- Ears -->
    <polygon points="${headX - 22},${headY - 14} ${headX - 26},${headY - 38} ${headX - 8},${headY - 20}" fill="#1e293b" stroke="#000" stroke-width="4"/>
    <polygon points="${headX + 22},${headY - 14} ${headX + 26},${headY - 38} ${headX + 8},${headY - 20}" fill="#1e293b" stroke="#000" stroke-width="4"/>

    <!-- Body -->
    <ellipse cx="${headX}" cy="${130 + bobY}" rx="20" ry="22" fill="#1e293b" stroke="#000" stroke-width="5"/>

    <!-- Left & Right Hands/Feet -->
    ${leftHand}
    ${rightHand}
    ${leftFoot}
    ${rightFoot}

    <!-- Head -->
    <ellipse cx="${headX}" cy="${headY}" rx="28" ry="22" fill="#1e293b" stroke="#000" stroke-width="5"/>

    <!-- Bandana knot trailing -->
    ${knotPath}

    <!-- Red Mask -->
    <rect x="${headX - 25}" y="${headY - 6}" width="50" height="14" fill="#ef4444" stroke="#000" stroke-width="4" rx="4"/>
    
    <!-- Eyes inside mask -->
    <ellipse cx="${headX - 10}" cy="${headY}" rx="6" ry="6" fill="#facc15"/>
    <circle cx="${headX - 10}" cy="${headY}" r="2" fill="#000"/>
    <ellipse cx="${headX + 10}" cy="${headY}" rx="6" ry="6" fill="#facc15"/>
    <circle cx="${headX + 10}" cy="${headY}" r="2" fill="#000"/>
  </svg>`;
}

function getSamuraiBotSvg(row: string, frame: number): string {
  let bobY = 0;
  if (row === 'idle') {
    bobY = Math.sin(frame * Math.PI / 4) * 4;
  } else {
    bobY = Math.abs(Math.sin(frame * Math.PI / 2)) * 5;
  }

  const headX = 96;
  const headY = 90 + bobY;

  let leftFoot = '';
  let rightFoot = '';

  if (row === 'idle') {
    leftFoot = `<rect x="76" y="156" width="14" height="10" rx="3" fill="#334155" stroke="#000" stroke-width="4"/>`;
    rightFoot = `<rect x="102" y="156" width="14" height="10" rx="3" fill="#334155" stroke="#000" stroke-width="4"/>`;
  } else {
    const swing = Math.sin(frame * Math.PI / 4.5);
    const lY = 156 + Math.max(0, Math.cos(frame * Math.PI / 4.5) * 8);
    const rY = 156 + Math.max(0, -Math.cos(frame * Math.PI / 4.5) * 8);
    leftFoot = `<rect x="${76 + swing * 8}" y="${lY}" width="14" height="10" rx="3" fill="#334155" stroke="#000" stroke-width="4"/>`;
    rightFoot = `<rect x="${102 - swing * 8}" y="${rY}" width="14" height="10" rx="3" fill="#334155" stroke="#000" stroke-width="4"/>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="208" viewBox="0 0 192 208">
    <!-- Robotic joints -->
    <line x1="84" y1="${120 + bobY}" x2="84" y2="158" stroke="#000" stroke-width="8"/>
    <line x1="108" y1="${120 + bobY}" x2="108" y2="158" stroke="#000" stroke-width="8"/>

    ${leftFoot}
    ${rightFoot}

    <!-- Body armor -->
    <rect x="72" y="${120 + bobY}" width="48" height="36" rx="6" fill="#ef4444" stroke="#000" stroke-width="5"/>
    <!-- Yellow core symbol -->
    <circle cx="96" cy="${138 + bobY}" r="8" fill="#eab308" stroke="#000" stroke-width="3"/>

    <!-- Head -->
    <rect x="74" y="${headY - 18}" width="44" height="34" rx="8" fill="#334155" stroke="#000" stroke-width="5"/>
    
    <!-- Kabuto helmet horn -->
    <polygon points="${headX - 12},${headY - 18} ${headX},${headY - 36} ${headX + 12},${headY - 18} ${headX},${headY - 12}" fill="#eab308" stroke="#000" stroke-width="4"/>

    <!-- Glowing Blue Eyes -->
    <rect x="82" y="${headY - 6}" width="8" height="6" rx="1.5" fill="#38bdf8"/>
    <rect x="102" y="${headY - 6}" width="8" height="6" rx="1.5" fill="#38bdf8"/>

    <!-- Shoulder armor pads -->
    <rect x="62" y="${120 + bobY}" width="12" height="18" rx="2" fill="#ef4444" stroke="#000" stroke-width="3"/>
    <rect x="118" y="${120 + bobY}" width="12" height="18" rx="2" fill="#ef4444" stroke="#000" stroke-width="3"/>
  </svg>`;
}

// ─── OBJECT SVG GENERATORS ─────────────────────────────────────────

function getCoinSvg(frame: number): string {
  const scaleX = Math.cos(frame * Math.PI / 3);
  const displayScale = Math.abs(scaleX) < 0.05 ? 0.05 : scaleX;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <g transform="translate(64,64) scale(${displayScale}, 1)">
      <!-- Gold outer ring -->
      <circle cx="0" cy="0" r="42" fill="#fbbf24" stroke="#d97706" stroke-width="6"/>
      <!-- Inner detail ring -->
      <circle cx="0" cy="0" r="28" fill="none" stroke="#f59e0b" stroke-width="3" stroke-dasharray="6 4"/>
      <!-- Square hole in the middle -->
      <rect x="-10" y="-10" width="20" height="20" fill="#f59e0b" stroke="#d97706" stroke-width="4" rx="2"/>
    </g>
  </svg>`;
}

function getSpikeBallSvg(frame: number): string {
  const angle = frame * 90;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <g transform="translate(64,64) rotate(${angle})">
      <!-- 8 Spikes -->
      <path d="M 0 -38 L -8 -52 L 0 -64 L 8 -52 Z" fill="#ef4444" stroke="#7f1d1d" stroke-width="4"/>
      <path d="M 0 38 L -8 52 L 0 64 L 8 52 Z" fill="#ef4444" stroke="#7f1d1d" stroke-width="4"/>
      <path d="M -38 0 L -52 -8 L -64 0 L -52 8 Z" fill="#ef4444" stroke="#7f1d1d" stroke-width="4"/>
      <path d="M 38 0 L 52 -8 L 64 0 L 52 8 Z" fill="#ef4444" stroke="#7f1d1d" stroke-width="4"/>
      
      <g transform="rotate(45)">
        <path d="M 0 -38 L -8 -52 L 0 -64 L 8 -52 Z" fill="#ef4444" stroke="#7f1d1d" stroke-width="4"/>
        <path d="M 0 38 L -8 52 L 0 64 L 8 52 Z" fill="#ef4444" stroke="#7f1d1d" stroke-width="4"/>
        <path d="M -38 0 L -52 -8 L -64 0 L -52 8 Z" fill="#ef4444" stroke="#7f1d1d" stroke-width="4"/>
        <path d="M 38 0 L 52 -8 L 64 0 L 52 8 Z" fill="#ef4444" stroke="#7f1d1d" stroke-width="4"/>
      </g>

      <!-- Main ball body -->
      <circle cx="0" cy="0" r="35" fill="#475569" stroke="#0f172a" stroke-width="5"/>
      <circle cx="0" cy="0" r="24" fill="#334155"/>

      <!-- Angry eyebrows & eyes -->
      <path d="M -16 -12 L -6 -8" stroke="#000" stroke-width="4" stroke-linecap="round"/>
      <path d="M 16 -12 L 6 -8" stroke="#000" stroke-width="4" stroke-linecap="round"/>
      <ellipse cx="-10" cy="-2" rx="4" ry="6" fill="#fff"/>
      <circle cx="-10" cy="-2" r="2.5" fill="#000"/>
      <ellipse cx="10" cy="-2" rx="4" ry="6" fill="#fff"/>
      <circle cx="10" cy="-2" r="2.5" fill="#000"/>
    </g>
  </svg>`;
}

function getExitDoorSvg(frame: number): string {
  // Swirl rotation
  const angle = frame * 90;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <!-- Glowing Portal Center -->
    <ellipse cx="64" cy="72" rx="32" ry="40" fill="#0284c7" opacity="0.3"/>
    <g transform="translate(64,72) rotate(${angle})">
      <path d="M -22 -22 Q 0 -35 22 -22 Q 35 0 22 22 Q 0 35 -22 22 Q -35 0 -22 -22 Z" fill="none" stroke="#38bdf8" stroke-width="5" stroke-dasharray="8 12"/>
      <path d="M -12 -12 Q 0 -20 12 -12 Q 20 0 12 12 Q 0 20 -12 12 Q -20 0 -12 -12 Z" fill="none" stroke="#e0f2fe" stroke-width="3" stroke-dasharray="6 8"/>
    </g>

    <!-- Torii Gate Pillars -->
    <!-- Left Pillar -->
    <rect x="22" y="32" width="10" height="83" fill="#475569" stroke="#0f172a" stroke-width="4" rx="1"/>
    <!-- Right Pillar -->
    <rect x="96" y="32" width="10" height="83" fill="#475569" stroke="#0f172a" stroke-width="4" rx="1"/>
    
    <!-- Top lintel beams -->
    <rect x="10" y="20" width="108" height="12" fill="#334155" stroke="#0f172a" stroke-width="4" rx="3"/>
    <rect x="16" y="12" width="96" height="8" fill="#0f172a" rx="1"/>

    <!-- Base Stones -->
    <rect x="16" y="112" width="22" height="8" fill="#334155" stroke="#0f172a" stroke-width="3" rx="1"/>
    <rect x="90" y="112" width="22" height="8" fill="#334155" stroke="#0f172a" stroke-width="3" rx="1"/>
  </svg>`;
}

// ─── EXECUTION SCRIPT ──────────────────────────────────────────────

async function main() {
  console.log('Generating cartoon assets programmatically...');

  // 1. Generate textures
  const textureOut = './texture_runs/NinjaCat/output';
  await ensureDir(textureOut);

  await sharp(Buffer.from(getBambooGroundSvg())).png().toFile(path.join(textureOut, 'bamboo_ground_base.png'));
  await sharp(Buffer.from(getBambooPlatformSvg())).png().toFile(path.join(textureOut, 'bamboo_platform_base.png'));
  await sharp(Buffer.from(getCastleRoofSvg())).png().toFile(path.join(textureOut, 'castle_roof_base.png'));
  await sharp(Buffer.from(getCastlePlatformSvg())).png().toFile(path.join(textureOut, 'castle_platform_base.png'));
  await sharp(Buffer.from(getCloudPlatformSvg())).png().toFile(path.join(textureOut, 'cloud_platform_base.png'));
  console.log('✓ Textures generated.');

  // 2. Generate CatNinja frames
  const catAnims = ['idle', 'walk-left', 'jump'];
  const catRunsDir = './char_runs/CatNinja';
  await ensureDir(catRunsDir);
  await ensureDir(path.join(catRunsDir, 'reference'));

  // Save reference frame
  await sharp(Buffer.from(getCatNinjaSvg('idle', 0))).png().toFile(path.join(catRunsDir, 'reference', 'frame_0.png'));

  for (const anim of catAnims) {
    const rowDir = path.join(catRunsDir, 'rows', anim);
    await ensureDir(rowDir);
    for (let f = 0; f < 9; f++) {
      await sharp(Buffer.from(getCatNinjaSvg(anim, f))).png().toFile(path.join(rowDir, `frame_${f}.png`));
    }
  }

  // Create CatNinja manifest
  const catManifest = {
    name: 'CatNinja',
    status: 'initialized',
    created_at: new Date().toISOString(),
    reference: { status: 'completed', path: 'char_runs/CatNinja/reference' },
    rows: {
      'idle': { fps: 8, loop: true, status: 'completed' },
      'walk-left': { fps: 12, loop: true, status: 'completed' },
      'jump': { fps: 10, loop: false, status: 'completed' }
    }
  };
  fs.writeFileSync(path.join(catRunsDir, 'manifest.json'), JSON.stringify(catManifest, null, 2));
  console.log('✓ CatNinja character frames and manifest generated.');

  // 3. Generate SamuraiBot frames
  const botAnims = ['idle', 'walk-left'];
  const botRunsDir = './char_runs/SamuraiBot';
  await ensureDir(botRunsDir);
  await ensureDir(path.join(botRunsDir, 'reference'));

  // Save reference frame
  await sharp(Buffer.from(getSamuraiBotSvg('idle', 0))).png().toFile(path.join(botRunsDir, 'reference', 'frame_0.png'));

  for (const anim of botAnims) {
    const rowDir = path.join(botRunsDir, 'rows', anim);
    await ensureDir(rowDir);
    for (let f = 0; f < 9; f++) {
      await sharp(Buffer.from(getSamuraiBotSvg(anim, f))).png().toFile(path.join(rowDir, `frame_${f}.png`));
    }
  }

  // Create SamuraiBot manifest
  const botManifest = {
    name: 'SamuraiBot',
    status: 'initialized',
    created_at: new Date().toISOString(),
    reference: { status: 'completed', path: 'char_runs/SamuraiBot/reference' },
    rows: {
      'idle': { fps: 8, loop: true, status: 'completed' },
      'walk-left': { fps: 10, loop: true, status: 'completed' }
    }
  };
  fs.writeFileSync(path.join(botRunsDir, 'manifest.json'), JSON.stringify(botManifest, null, 2));
  console.log('✓ SamuraiBot character frames and manifest generated.');

  // 4. Generate objects (coin, spike_ball, exit_door)
  const objectsDef = [
    { name: 'coin', frames: 6, fps: 12, loop: true, svgGen: getCoinSvg },
    { name: 'spike_ball', frames: 4, fps: 10, loop: true, svgGen: getSpikeBallSvg },
    { name: 'exit_door', frames: 4, fps: 6, loop: false, svgGen: getExitDoorSvg }
  ];

  for (const obj of objectsDef) {
    const objRunsDir = `./object_runs/${obj.name}`;
    const framesDir = path.join(objRunsDir, 'frames');
    await ensureDir(objRunsDir);
    await ensureDir(framesDir);

    for (let f = 0; f < obj.frames; f++) {
      await sharp(Buffer.from(obj.svgGen(f))).png().toFile(path.join(framesDir, `frame_${f}.png`));
    }

    // Create object manifest
    const objManifest = {
      name: obj.name,
      status: 'initialized',
      created_at: new Date().toISOString(),
      frameCount: obj.frames,
      frameSize: 128,
      fps: obj.fps,
      loop: obj.loop,
      animation: { status: 'completed' }
    };
    fs.writeFileSync(path.join(objRunsDir, 'manifest.json'), JSON.stringify(objManifest, null, 2));
    console.log(`✓ Object: ${obj.name} frames and manifest generated.`);
  }

  console.log('✓ All assets generated successfully!');
}

main().catch(console.error);
