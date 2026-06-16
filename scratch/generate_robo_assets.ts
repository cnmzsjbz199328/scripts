import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const TEXTURE_OUTPUT_DIR = './texture_runs/RoboWarehouse/output';
const BOTTY_RUN_DIR = './char_runs/Botty';
const BOX_RED_DIR = './object_runs/box_red/frames';
const BOX_GREEN_DIR = './object_runs/box_green/frames';
const BOX_BLUE_DIR = './object_runs/box_blue/frames';
const GEAR_DIR = './object_runs/gear/frames';

// Ensure directories exist
fs.mkdirSync(TEXTURE_OUTPUT_DIR, { recursive: true });
fs.mkdirSync(path.join(BOTTY_RUN_DIR, 'reference'), { recursive: true });
fs.mkdirSync(path.join(BOTTY_RUN_DIR, 'rows', 'walk-down'), { recursive: true });
fs.mkdirSync(path.join(BOTTY_RUN_DIR, 'rows', 'walk-up'), { recursive: true });
fs.mkdirSync(path.join(BOTTY_RUN_DIR, 'rows', 'walk-left'), { recursive: true });
fs.mkdirSync(BOX_RED_DIR, { recursive: true });
fs.mkdirSync(BOX_GREEN_DIR, { recursive: true });
fs.mkdirSync(BOX_BLUE_DIR, { recursive: true });
fs.mkdirSync(GEAR_DIR, { recursive: true });

// SVG rendering helper
async function renderSvgToPng(svgString: string, width: number, height: number, outputPath: string) {
  const buf = Buffer.from(svgString);
  await sharp(buf)
    .resize(width, height)
    .png()
    .toFile(outputPath);
}

// ==========================================
// 1. GENERATE TILES (256x256)
// ==========================================

async function generateTiles() {
  console.log('Generating tiles...');

  // FLOOR
  const floorSvg = `
    <svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
      <rect width="256" height="256" fill="#4b5563" />
      <rect x="8" y="8" width="240" height="240" fill="#6b7280" stroke="#1f2937" stroke-width="8" rx="8" />
      <!-- Rivets -->
      <circle cx="28" cy="28" r="8" fill="#374151" stroke="#1f2937" stroke-width="4" />
      <circle cx="228" cy="28" r="8" fill="#374151" stroke="#1f2937" stroke-width="4" />
      <circle cx="28" cy="228" r="8" fill="#374151" stroke="#1f2937" stroke-width="4" />
      <circle cx="228" cy="228" r="8" fill="#374151" stroke="#1f2937" stroke-width="4" />
      <!-- Scratches/Details -->
      <line x1="60" y1="80" x2="196" y2="80" stroke="#4b5563" stroke-width="4" stroke-dasharray="8 8" />
      <line x1="60" y1="176" x2="196" y2="176" stroke="#4b5563" stroke-width="4" stroke-dasharray="8 8" />
    </svg>
  `;
  await renderSvgToPng(floorSvg, 256, 256, path.join(TEXTURE_OUTPUT_DIR, 'floor_base.png'));

  // WALL
  const wallSvg = `
    <svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
      <!-- Dark brick base -->
      <rect width="256" height="256" fill="#3f2314" />
      
      <!-- Brass plates -->
      <rect x="8" y="8" width="240" height="110" fill="#78350f" stroke="#1e1b4b" stroke-width="8" rx="4" />
      <rect x="8" y="128" width="115" height="120" fill="#78350f" stroke="#1e1b4b" stroke-width="8" rx="4" />
      <rect x="133" y="128" width="115" height="120" fill="#78350f" stroke="#1e1b4b" stroke-width="8" rx="4" />
      
      <!-- Highlights -->
      <line x1="16" y1="16" x2="240" y2="16" stroke="#d97706" stroke-width="4" />
      <line x1="16" y1="136" x2="115" y2="136" stroke="#d97706" stroke-width="4" />
      <line x1="141" y1="136" x2="240" y2="136" stroke="#d97706" stroke-width="4" />

      <!-- Horizontal Pipe running across the wall -->
      <rect x="0" y="70" width="256" height="30" fill="#b45309" stroke="#1e1b4b" stroke-width="6" />
      <rect x="60" y="65" width="20" height="40" fill="#f59e0b" stroke="#1e1b4b" stroke-width="4" rx="2" />
      <rect x="180" y="65" width="20" height="40" fill="#f59e0b" stroke="#1e1b4b" stroke-width="4" rx="2" />
    </svg>
  `;
  await renderSvgToPng(wallSvg, 256, 256, path.join(TEXTURE_OUTPUT_DIR, 'wall_base.png'));

  // TARGET RED, GREEN, BLUE
  const targetColors = {
    red: '#ef4444',
    green: '#22c55e',
    blue: '#3b82f6'
  };
  for (const [colorName, hex] of Object.entries(targetColors)) {
    const targetSvg = `
      <svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <!-- Floor base -->
        <rect width="256" height="256" fill="#374151" />
        <rect x="8" y="8" width="240" height="240" fill="#4b5563" stroke="#1f2937" stroke-width="8" rx="8" />
        
        <!-- Glowing colored border -->
        <rect x="16" y="16" width="224" height="224" fill="none" stroke="${hex}" stroke-width="12" rx="6" opacity="0.8" />
        
        <!-- Target indicator crosshair -->
        <circle cx="128" cy="128" r="50" fill="none" stroke="${hex}" stroke-width="8" stroke-dasharray="24 16" />
        <circle cx="128" cy="128" r="16" fill="${hex}" />
        <line x1="128" y1="40" x2="128" y2="70" stroke="${hex}" stroke-width="8" stroke-linecap="round" />
        <line x1="128" y1="186" x2="128" y2="216" stroke="${hex}" stroke-width="8" stroke-linecap="round" />
        <line x1="40" y1="128" x2="70" y2="128" stroke="${hex}" stroke-width="8" stroke-linecap="round" />
        <line x1="186" y1="128" x2="216" y2="128" stroke="${hex}" stroke-width="8" stroke-linecap="round" />
      </svg>
    `;
    await renderSvgToPng(targetSvg, 256, 256, path.join(TEXTURE_OUTPUT_DIR, `target_${colorName}_base.png`));
  }

  // CONVEYOR BELTS (UP, DOWN, LEFT, RIGHT)
  const beltDirs = {
    up: { rotation: 0, arrow: 'M128,60 L78,130 L108,130 L108,200 L148,200 L148,130 L178,130 Z' },
    down: { rotation: 180, arrow: 'M128,60 L78,130 L108,130 L108,200 L148,200 L148,130 L178,130 Z' },
    left: { rotation: 270, arrow: 'M128,60 L78,130 L108,130 L108,200 L148,200 L148,130 L178,130 Z' },
    right: { rotation: 90, arrow: 'M128,60 L78,130 L108,130 L108,200 L148,200 L148,130 L178,130 Z' }
  };
  for (const [dir, config] of Object.entries(beltDirs)) {
    const beltSvg = `
      <svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <!-- Background -->
        <rect width="256" height="256" fill="#1e293b" />
        
        <!-- Conveyor belt surface (treads) -->
        <g transform="rotate(${config.rotation}, 128, 128)">
          <!-- Left and right steel borders -->
          <rect x="12" y="0" width="16" height="256" fill="#64748b" stroke="#0f172a" stroke-width="6" />
          <rect x="228" y="0" width="16" height="256" fill="#64748b" stroke="#0f172a" stroke-width="6" />
          
          <!-- Diagonal hazard stripes -->
          <path d="M28,-40 L60,-40 L228,128 L228,160 Z" fill="#ffd214" opacity="0.9" />
          <path d="M28,20 L60,20 L228,188 L228,218 Z" fill="#ffd214" opacity="0.9" />
          <path d="M28,80 L60,80 L228,248 L228,278 Z" fill="#ffd214" opacity="0.9" />
          <path d="M28,140 L60,140 L228,308 L228,338 Z" fill="#ffd214" opacity="0.9" />
          <path d="M28,200 L60,200 L228,368 L228,398 Z" fill="#ffd214" opacity="0.9" />
          
          <!-- Big arrow -->
          <path d="${config.arrow}" fill="#3b82f6" stroke="#0f172a" stroke-width="10" opacity="0.85" />
        </g>
      </svg>
    `;
    await renderSvgToPng(beltSvg, 256, 256, path.join(TEXTURE_OUTPUT_DIR, `belt_${dir}_base.png`));
  }

  // GRAVITY SWITCH
  const gravitySwitchSvg = `
    <svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
      <rect width="256" height="256" fill="#4b5563" />
      <rect x="8" y="8" width="240" height="240" fill="#374151" stroke="#1f2937" stroke-width="8" rx="8" />
      <!-- Pressure plate -->
      <circle cx="128" cy="128" r="85" fill="#581c87" stroke="#1f2937" stroke-width="8" />
      <circle cx="128" cy="128" r="65" fill="#701a75" stroke="#1f2937" stroke-width="6" />
      <!-- Glowing purple gravity indicator vortex -->
      <circle cx="128" cy="128" r="40" fill="none" stroke="#d8b4fe" stroke-width="10" stroke-dasharray="16 8" />
      <path d="M128,100 L128,156 M100,128 L156,128 M108,108 L148,148 M108,148 L148,108" stroke="#f472b6" stroke-width="8" stroke-linecap="round" />
    </svg>
  `;
  await renderSvgToPng(gravitySwitchSvg, 256, 256, path.join(TEXTURE_OUTPUT_DIR, 'gravity_switch_base.png'));

  // GRAVITY INDICATORS
  const gravDirs = {
    down: { arrow: 'M128,40 L128,200 M70,140 L128,200 L186,140' },
    up: { arrow: 'M128,216 L128,56 M70,116 L128,56 L186,116' }
  };
  for (const [dir, config] of Object.entries(gravDirs)) {
    const gravSvg = `
      <svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
        <rect width="256" height="256" fill="#1e1b4b" />
        <rect x="8" y="8" width="240" height="240" fill="#311042" stroke="#1f2937" stroke-width="8" rx="8" />
        <!-- Glowing arrows -->
        <path d="${config.arrow}" fill="none" stroke="#c084fc" stroke-width="20" stroke-linecap="round" stroke-linejoin="round" opacity="0.8" />
        <path d="${config.arrow}" fill="none" stroke="#e9d5ff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    `;
    await renderSvgToPng(gravSvg, 256, 256, path.join(TEXTURE_OUTPUT_DIR, `gravity_indicator_${dir}_base.png`));
  }
}

// ==========================================
// 2. GENERATE BOX OBJECTS (128x128, 4 frames pulse)
// ==========================================

async function generateBoxes() {
  console.log('Generating colored box frames...');
  const boxColors = {
    red: { base: '#ef4444', dark: '#991b1b', light: '#fca5a5' },
    green: { base: '#22c55e', dark: '#166534', light: '#86efac' },
    blue: { base: '#3b82f6', dark: '#1e40af', light: '#93c5fd' }
  };

  for (const [colorName, palette] of Object.entries(boxColors)) {
    const destDir = colorName === 'red' ? BOX_RED_DIR : (colorName === 'green' ? BOX_GREEN_DIR : BOX_BLUE_DIR);
    
    for (let f = 0; f < 4; f++) {
      // Glow sizes pulse: f=0 (14), f=1 (20), f=2 (26), f=3 (20)
      const glowRadii = [14, 20, 26, 20];
      const glowR = glowRadii[f];
      const glowOpacity = 0.5 + (f * 0.15);

      const boxSvg = `
        <svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
          <!-- Main Box Body -->
          <rect x="8" y="8" width="112" height="112" fill="${palette.base}" stroke="#0f172a" stroke-width="8" rx="8" />
          
          <!-- Outer Corner Brackets -->
          <rect x="8" y="8" width="30" height="30" fill="${palette.dark}" stroke="#0f172a" stroke-width="6" rx="2" />
          <rect x="90" y="8" width="30" height="30" fill="${palette.dark}" stroke="#0f172a" stroke-width="6" rx="2" />
          <rect x="8" y="90" width="30" height="30" fill="${palette.dark}" stroke="#0f172a" stroke-width="6" rx="2" />
          <rect x="90" y="90" width="30" height="30" fill="${palette.dark}" stroke="#0f172a" stroke-width="6" rx="2" />
          
          <!-- Diagonal cross bars -->
          <line x1="38" y1="38" x2="90" y2="90" stroke="#0f172a" stroke-width="8" />
          <line x1="90" y1="38" x2="38" y2="90" stroke="#0f172a" stroke-width="8" />

          <!-- Center Glowing Core -->
          <circle cx="64" cy="64" r="32" fill="${palette.dark}" stroke="#0f172a" stroke-width="6" />
          <circle cx="64" cy="64" r="${glowR}" fill="${palette.light}" opacity="${glowOpacity}" />
          <circle cx="64" cy="64" r="10" fill="#ffffff" />
        </svg>
      `;
      await renderSvgToPng(boxSvg, 128, 128, path.join(destDir, `frame_${f}.png`));
    }
  }
}

// ==========================================
// 3. GENERATE GEAR OBJECT (128x128, 6 frames spin)
// ==========================================

async function generateGear() {
  console.log('Generating gear frames...');
  for (let f = 0; f < 6; f++) {
    const rot = f * 10; // 0, 10, 20, 30, 40, 50 degrees rotation. Loops perfectly at 60 deg because gear has 6 teeth (360/6 = 60).
    const gearSvg = `
      <svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
        <g transform="rotate(${rot}, 64, 64)">
          <!-- Outer teeth (6 teeth) -->
          <!-- We can draw teeth by drawing rotated rects -->
          <rect x="49" y="8" width="30" height="112" rx="4" fill="#b45309" stroke="#0f172a" stroke-width="8" />
          <rect x="49" y="8" width="30" height="112" rx="4" fill="#b45309" stroke="#0f172a" stroke-width="8" transform="rotate(60, 64, 64)" />
          <rect x="49" y="8" width="30" height="112" rx="4" fill="#b45309" stroke="#0f172a" stroke-width="8" transform="rotate(120, 64, 64)" />
          
          <!-- Inner Core plate -->
          <circle cx="64" cy="64" r="40" fill="#d97706" stroke="#0f172a" stroke-width="8" />
          
          <!-- Center bolt cutout -->
          <circle cx="64" cy="64" r="16" fill="#78350f" stroke="#0f172a" stroke-width="6" />
          
          <!-- Highlights -->
          <circle cx="64" cy="64" r="32" fill="none" stroke="#f59e0b" stroke-width="4" opacity="0.6" />
        </g>
      </svg>
    `;
    await renderSvgToPng(gearSvg, 128, 128, path.join(GEAR_DIR, `frame_${f}.png`));
  }
}

// ==========================================
// 4. GENERATE BOTTY CHARACTER (192x208, 9 frames per row)
// ==========================================

async function generateBotty() {
  console.log('Generating Botty character frames...');
  
  // Reference (Standing Front, static)
  const refSvg = drawBottyFrame('down', 0);
  await renderSvgToPng(refSvg, 192, 208, path.join(BOTTY_RUN_DIR, 'reference', 'frame_0.png'));

  // Rows: walk-down, walk-up, walk-left
  for (let f = 0; f < 9; f++) {
    const downSvg = drawBottyFrame('down', f);
    await renderSvgToPng(downSvg, 192, 208, path.join(BOTTY_RUN_DIR, 'rows', 'walk-down', `frame_${f}.png`));

    const upSvg = drawBottyFrame('up', f);
    await renderSvgToPng(upSvg, 192, 208, path.join(BOTTY_RUN_DIR, 'rows', 'walk-up', `frame_${f}.png`));

    const leftSvg = drawBottyFrame('left', f); //Facing right as required
    await renderSvgToPng(leftSvg, 192, 208, path.join(BOTTY_RUN_DIR, 'rows', 'walk-left', `frame_${f}.png`));
  }
}

function drawBottyFrame(dir: 'down' | 'up' | 'left', frame: number): string {
  // Movement parameters: bobbing up and down. Frame goes 0..8
  // Use simple sine wave for bobbing
  const bobY = Math.sin((frame / 9) * Math.PI * 2) * 8;
  const scaleSpring = 1 + Math.sin((frame / 9) * Math.PI * 2) * 0.08;
  
  // Arms sway
  const leftArmAngle = Math.sin((frame / 9) * Math.PI * 2) * 20;
  const rightArmAngle = -Math.sin((frame / 9) * Math.PI * 2) * 20;

  if (dir === 'down') {
    return `
      <svg width="192" height="208" viewBox="0 0 192 208" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(0, ${bobY})">
          <!-- Antenna -->
          <line x1="96" y1="52" x2="96" y2="28" stroke="#1e293b" stroke-width="8" stroke-linecap="round" />
          <circle cx="96" cy="24" r="10" fill="#ef4444" stroke="#1e293b" stroke-width="4" />
          <circle cx="96" cy="24" r="4" fill="#fca5a5" />

          <!-- Rubber Hose Arms -->
          <!-- Left Arm -->
          <g transform="translate(56, 120) rotate(${leftArmAngle})">
            <path d="M0,0 Q-30,20 -15,40" fill="none" stroke="#1e293b" stroke-width="10" stroke-linecap="round" />
            <circle cx="-15" cy="40" r="10" fill="#fbbf24" stroke="#1e293b" stroke-width="4" />
          </g>
          <!-- Right Arm -->
          <g transform="translate(136, 120) rotate(${rightArmAngle})">
            <path d="M0,0 Q30,20 15,40" fill="none" stroke="#1e293b" stroke-width="10" stroke-linecap="round" />
            <circle cx="15" cy="40" r="10" fill="#fbbf24" stroke="#1e293b" stroke-width="4" />
          </g>

          <!-- Head (bouncing) -->
          <rect x="51" y="52" width="90" height="72" rx="22" fill="#94a3b8" stroke="#1e293b" stroke-width="8" />
          <rect x="61" y="62" width="70" height="52" rx="14" fill="#cbd5e1" />
          
          <!-- Visor -->
          <rect x="68" y="70" width="56" height="34" rx="8" fill="#1e293b" />
          
          <!-- Glowing Eyes -->
          <circle cx="84" cy="87" r="8" fill="#38bdf8" />
          <circle cx="84" cy="87" r="3" fill="#ffffff" />
          <circle cx="108" cy="87" r="8" fill="#38bdf8" />
          <circle cx="108" cy="87" r="3" fill="#ffffff" />

          <!-- Body (bobbing) -->
          <rect x="61" y="118" width="70" height="54" rx="16" fill="#64748b" stroke="#1e293b" stroke-width="8" />
          
          <!-- Chest Gauge -->
          <circle cx="96" cy="144" r="16" fill="#f8fafc" stroke="#1e293b" stroke-width="4" />
          <line x1="96" y1="144" x2="104" y2="138" stroke="#ef4444" stroke-width="3" stroke-linecap="round" />
        </g>
        
        <!-- Bouncy Spring Leg & Wheel (Wheel stays on floor, spring compresses) -->
        <g transform="translate(96, 172)">
          <!-- Spring -->
          <path d="M -12,-3 Q 12,-15 0,-25 Q -12,-35 0,-45 Q 12,-50 0,-54" fill="none" stroke="#1e293b" stroke-width="8" stroke-linecap="round" transform="scale(1, ${scaleSpring}) translate(0, ${bobY * 0.5})" />
          
          <!-- Wheel -->
          <circle cx="0" cy="15" r="16" fill="#334155" stroke="#1e293b" stroke-width="8" />
          <!-- Hubcap decoration -->
          <circle cx="0" cy="15" r="5" fill="#f1f5f9" />
          <line x1="-10" y1="15" x2="10" y2="15" stroke="#1e293b" stroke-width="2" transform="rotate(${frame * 40})" />
        </g>
      </svg>
    `;
  } else if (dir === 'up') {
    // Back view of the robot, no face, puffing steam
    // Steam puff animates over frames
    const steamRadius = 4 + (frame % 5) * 4;
    const steamOpacity = 1 - (frame % 5) * 0.22;
    const steamX = 126 + (frame % 5) * 6;
    const steamY = 48 - (frame % 5) * 8;

    return `
      <svg width="192" height="208" viewBox="0 0 192 208" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(0, ${bobY})">
          <!-- Antenna -->
          <line x1="96" y1="52" x2="96" y2="28" stroke="#1e293b" stroke-width="8" stroke-linecap="round" />
          <circle cx="96" cy="24" r="10" fill="#ef4444" stroke="#1e293b" stroke-width="4" />
          <circle cx="96" cy="24" r="4" fill="#fca5a5" />

          <!-- Steam exhaust pipes on back -->
          <rect x="114" y="65" width="12" height="20" fill="#b45309" stroke="#1e293b" stroke-width="4" rx="2" transform="rotate(20, 120, 75)" />
          
          <!-- Steam cloud -->
          <circle cx="${steamX}" cy="${steamY}" r="${steamRadius}" fill="#ffffff" opacity="${steamOpacity}" />

          <!-- Left Arm -->
          <g transform="translate(56, 120) rotate(${leftArmAngle})">
            <path d="M0,0 Q-30,20 -15,40" fill="none" stroke="#1e293b" stroke-width="10" stroke-linecap="round" />
            <circle cx="-15" cy="40" r="10" fill="#fbbf24" stroke="#1e293b" stroke-width="4" />
          </g>
          <!-- Right Arm -->
          <g transform="translate(136, 120) rotate(${rightArmAngle})">
            <path d="M0,0 Q30,20 15,40" fill="none" stroke="#1e293b" stroke-width="10" stroke-linecap="round" />
            <circle cx="15" cy="40" r="10" fill="#fbbf24" stroke="#1e293b" stroke-width="4" />
          </g>

          <!-- Head (bouncing, no face) -->
          <rect x="51" y="52" width="90" height="72" rx="22" fill="#94a3b8" stroke="#1e293b" stroke-width="8" />
          
          <!-- Body (bobbing, back panel details) -->
          <rect x="61" y="118" width="70" height="54" rx="16" fill="#64748b" stroke="#1e293b" stroke-width="8" />
          <!-- Battery/back plate -->
          <rect x="76" y="130" width="40" height="30" rx="4" fill="#475569" stroke="#1e293b" stroke-width="4" />
          <line x1="84" y1="140" x2="108" y2="140" stroke="#fbbf24" stroke-width="4" />
          <line x1="84" y1="148" x2="108" y2="148" stroke="#fbbf24" stroke-width="4" />
        </g>
        
        <!-- Bouncy Spring Leg & Wheel -->
        <g transform="translate(96, 172)">
          <path d="M -12,-3 Q 12,-15 0,-25 Q -12,-35 0,-45 Q 12,-50 0,-54" fill="none" stroke="#1e293b" stroke-width="8" stroke-linecap="round" transform="scale(1, ${scaleSpring}) translate(0, ${bobY * 0.5})" />
          <circle cx="0" cy="15" r="16" fill="#334155" stroke="#1e293b" stroke-width="8" />
          <circle cx="0" cy="15" r="5" fill="#f1f5f9" />
          <line x1="-10" y1="15" x2="10" y2="15" stroke="#1e293b" stroke-width="2" transform="rotate(${frame * 40})" />
        </g>
      </svg>
    `;
  } else {
    // Side profile facing right
    // Spring wheel tilted slightly forward
    const wheelRot = frame * 40;
    return `
      <svg width="192" height="208" viewBox="0 0 192 208" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(0, ${bobY}) rotate(5, 96, 110)">
          <!-- Antenna tilted -->
          <line x1="86" y1="52" x2="76" y2="28" stroke="#1e293b" stroke-width="8" stroke-linecap="round" />
          <circle cx="72" cy="24" r="10" fill="#ef4444" stroke="#1e293b" stroke-width="4" />
          <circle cx="72" cy="24" r="4" fill="#fca5a5" />

          <!-- Arm (only right side arm visible in profile) -->
          <g transform="translate(96, 125) rotate(${rightArmAngle})">
            <path d="M0,0 Q25,20 10,45" fill="none" stroke="#1e293b" stroke-width="10" stroke-linecap="round" />
            <circle cx="10" cy="45" r="10" fill="#fbbf24" stroke="#1e293b" stroke-width="4" />
          </g>

          <!-- Head (profile, visor visible on right side) -->
          <rect x="56" y="52" width="76" height="72" rx="22" fill="#94a3b8" stroke="#1e293b" stroke-width="8" />
          <path d="M106,70 L132,70 L132,104 L106,104 Z" fill="#94a3b8" />
          
          <!-- Visor extending to front-right -->
          <rect x="96" y="70" width="30" height="34" rx="4" fill="#1e293b" />
          <!-- Eye -->
          <circle cx="114" cy="87" r="8" fill="#38bdf8" />
          <circle cx="114" cy="87" r="3" fill="#ffffff" />

          <!-- Body profile -->
          <rect x="66" y="118" width="60" height="54" rx="16" fill="#64748b" stroke="#1e293b" stroke-width="8" />
          <!-- Gauge profile -->
          <rect x="120" y="132" width="8" height="24" fill="#cbd5e1" stroke="#1e293b" stroke-width="3" rx="1" />
        </g>
        
        <!-- Bouncy Spring Leg & Wheel -->
        <g transform="translate(96, 172)">
          <path d="M -8,-3 Q 10,-15 -2,-25 Q -10,-35 0,-45 Q 8,-50 -2,-54" fill="none" stroke="#1e293b" stroke-width="8" stroke-linecap="round" transform="scale(1, ${scaleSpring}) translate(0, ${bobY * 0.5})" />
          <circle cx="0" cy="15" r="16" fill="#334155" stroke="#1e293b" stroke-width="8" />
          <circle cx="0" cy="15" r="5" fill="#f1f5f9" />
          <line x1="-10" y1="15" x2="10" y2="15" stroke="#1e293b" stroke-width="2" transform="rotate(${wheelRot})" />
        </g>
      </svg>
    `;
  }
}

// ==========================================
// 5. MAIN RUNNER
// ==========================================

async function main() {
  await generateTiles();
  await generateBoxes();
  await generateGear();
  await generateBotty();
  
  // Write a simple panorama image for visual reference so compilation proceeds smoothly
  const panoramaSvg = `
    <svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="600" fill="#1e293b" />
      <text x="400" y="300" font-family="Segoe UI" font-size="48" fill="#ffffff" text-anchor="middle" font-weight="bold">RoboWarehouse Panorama</text>
      <text x="400" y="360" font-family="Segoe UI" font-size="24" fill="#94a3b8" text-anchor="middle">Q-Version Brass Gear Factory</text>
    </svg>
  `;
  await renderSvgToPng(panoramaSvg, 800, 600, path.join('./game_runs/RoboWarehouse/scene/panorama.png'));
  
  console.log('Procedural asset generation complete!');
}

main().catch(console.error);
