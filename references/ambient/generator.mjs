import fs from 'fs';
import path from 'path';

const OUT_DIR = 'game_runs/AmbientSandbox/assets/svg';
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// 帮助函数：生成 SVG 文件
function saveSVG(name, content) {
  const filePath = path.join(OUT_DIR, name);
  fs.writeFileSync(filePath, content.trim());
}

// Helper: Point calculation
function pt(x, y, len, deg) {
  const rad = (deg * Math.PI) / 180;
  return [x + len * Math.sin(rad), y + len * Math.cos(rad)];
}

console.log("Generating 20 ambient SVG animation elements...");

// ==========================================
// 1. Windmill (风车) - 6 frames
// ==========================================
for (let f = 0; f < 6; f++) {
  const angle = f * 20; // 0, 20, 40, 60, 80, 100 degrees
  const blade1 = pt(64, 64, 40, angle);
  const blade2 = pt(64, 64, 40, angle + 90);
  const blade3 = pt(64, 64, 40, angle + 180);
  const blade4 = pt(64, 64, 40, angle + 270);
  
  const content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <!-- Stand -->
    <polygon points="56,128 72,128 66,64 62,64" fill="#0c101b" />
    <circle cx="64" cy="64" r="6" fill="#1e293b" />
    <!-- Blades -->
    <line x1="64" y1="64" x2="${blade1[0].toFixed(1)}" y2="${blade1[1].toFixed(1)}" stroke="#ffffff" stroke-width="4" stroke-linecap="round" />
    <line x1="64" y1="64" x2="${blade2[0].toFixed(1)}" y2="${blade2[1].toFixed(1)}" stroke="#ffffff" stroke-width="4" stroke-linecap="round" />
    <line x1="64" y1="64" x2="${blade3[0].toFixed(1)}" y2="${blade3[1].toFixed(1)}" stroke="#ffffff" stroke-width="4" stroke-linecap="round" />
    <line x1="64" y1="64" x2="${blade4[0].toFixed(1)}" y2="${blade4[1].toFixed(1)}" stroke="#ffffff" stroke-width="4" stroke-linecap="round" />
    <!-- Pin -->
    <circle cx="64" cy="64" r="3" fill="#ef4444" />
  </svg>`;
  saveSVG(`windmill_${f}.svg`, content);
}

// ==========================================
// 2. Swaying Tree (摇曳树木) - 6 frames
// ==========================================
for (let f = 0; f < 6; f++) {
  const phase = (f * Math.PI) / 3;
  const sway = Math.sin(phase) * 6; // -6 to +6
  
  const content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <!-- Trunk with sway -->
    <path d="M 60,128 L 68,128 L ${65 + sway * 0.4},64 L ${63 + sway * 0.4},64 Z" fill="#0d111d" />
    <!-- Branches -->
    <line x1="${64 + sway * 0.4}" y1="80" x2="${48 + sway * 0.7}" y2="65" stroke="#0d111d" stroke-width="4" stroke-linecap="round" />
    <line x1="${64 + sway * 0.4}" y1="75" x2="${80 + sway * 0.7}" y2="60" stroke="#0d111d" stroke-width="4" stroke-linecap="round" />
    <!-- Foliage circles -->
    <circle cx="${64 + sway}" cy="45" r="28" fill="#111827" />
    <circle cx="${45 + sway}" cy="55" r="20" fill="#1f2937" />
    <circle cx="${83 + sway}" cy="50" r="22" fill="#374151" />
  </svg>`;
  saveSVG(`tree_${f}.svg`, content);
}

// ==========================================
// 3. Streetlight (路灯闪烁) - 4 frames
// ==========================================
const lightOpacities = [0.9, 0.4, 0.95, 0.75];
for (let f = 0; f < 4; f++) {
  const op = lightOpacities[f];
  const content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <!-- Light Cone -->
    <polygon points="80,36 30,128 110,128" fill="url(#lamp-glow)" opacity="${op * 0.5}" />
    <!-- Stand -->
    <path d="M 40,128 L 44,128 L 44,24 Q 44,16 56,16 L 80,16 Q 84,16 84,24 L 80,36 L 76,36 L 80,24 Q 80,20 76,20 L 56,20 Q 48,20 48,24 L 48,128 Z" fill="#0c101b" />
    <!-- Light bulb -->
    <circle cx="80" cy="30" r="5" fill="#fef08a" />
    <defs>
      <radialGradient id="lamp-glow" cx="80%" cy="30%" r="70%">
        <stop offset="0%" stop-color="#fef08a" stop-opacity="1" />
        <stop offset="50%" stop-color="#eab308" stop-opacity="0.5" />
        <stop offset="100%" stop-color="#eab308" stop-opacity="0" />
      </radialGradient>
    </defs>
  </svg>`;
  saveSVG(`streetlight_${f}.svg`, content);
}

// ==========================================
// 4. Campfire (篝火火焰) - 6 frames
// ==========================================
for (let f = 0; f < 6; f++) {
  const phase = (f * Math.PI) / 3;
  const h1 = 70 + Math.sin(phase) * 12;
  const h2 = 80 + Math.cos(phase) * 10;
  const h3 = 75 + Math.sin(phase + 1) * 8;
  
  const content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <!-- Logs -->
    <line x1="40" y1="110" x2="88" y2="100" stroke="#0d111d" stroke-width="8" stroke-linecap="round" />
    <line x1="88" y1="110" x2="40" y2="100" stroke="#0d111d" stroke-width="8" stroke-linecap="round" />
    <!-- Outer Flame -->
    <path d="M 44,104 C 36,90 48,${h1} 64,30 C 80,${h1} 92,90 84,104 Z" fill="#f97316" opacity="0.8" />
    <!-- Inner Flame -->
    <path d="M 52,104 C 46,94 54,${h2} 64,50 C 74,${h2} 82,94 76,104 Z" fill="#eab308" opacity="0.9" />
    <!-- Fire Core -->
    <path d="M 58,104 C 54,98 58,${h3} 64,70 C 70,${h3} 74,98 70,104 Z" fill="#ffffff" />
  </svg>`;
  saveSVG(`campfire_${f}.svg`, content);
}

// ==========================================
// 5. Waving Flag (旗帜飘扬) - 8 frames
// ==========================================
for (let f = 0; f < 8; f++) {
  const phase = (f * Math.PI) / 4;
  
  // Create wavy flag path using sine waves at key points
  const yTop0 = 24 + Math.sin(phase) * 3;
  const yTop1 = 26 + Math.sin(phase + 1.5) * 4;
  const yTop2 = 25 + Math.sin(phase + 3.0) * 3;
  const yTop3 = 27 + Math.sin(phase + 4.5) * 4;
  
  const yBot0 = 64 + Math.sin(phase) * 3;
  const yBot1 = 66 + Math.sin(phase + 1.5) * 4;
  const yBot2 = 65 + Math.sin(phase + 3.0) * 3;
  const yBot3 = 67 + Math.sin(phase + 4.5) * 4;

  const content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <!-- Pole -->
    <line x1="36" y1="120" x2="36" y2="16" stroke="#0d111d" stroke-width="5" stroke-linecap="round" />
    <circle cx="36" cy="14" r="4" fill="#6b7280" />
    <!-- Flag Body -->
    <path d="M 36,24 C 50,${yTop0} 64,${yTop1} 78,${yTop2} C 92,${yTop3} 94,${yTop3} 94,${yTop3} L 94,${yBot3} C 94,${yBot3} 92,${yBot3} 78,${yBot2} C 64,${yBot1} 50,${yBot0} 36,64 Z" fill="#ef4444" stroke="#0d111d" stroke-width="2" />
    <!-- Star on Flag (silhouette decoration) -->
    <polygon points="50,38 53,44 60,45 55,49 57,56 50,52 43,56 45,49 40,45 47,44" fill="#ffffff" />
  </svg>`;
  saveSVG(`flag_${f}.svg`, content);
}

// ==========================================
// 6. Rain (下雨) - 4 frames
// ==========================================
for (let f = 0; f < 4; f++) {
  const yShift = f * 32; // 0, 32, 64, 96
  const content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <g stroke="#94a3b8" stroke-width="1.5" opacity="0.6">
      <!-- Grid of diagonal raindrops -->
      ${Array.from({ length: 4 }, (_, i) => {
        return Array.from({ length: 4 }, (_, j) => {
          const startX = i * 40 - 20 - yShift * 0.3;
          const startY = j * 40 - 20 + yShift;
          const wrapY = startY % 160 - 20;
          const wrapX = (startX + 160) % 160 - 20;
          return `<line x1="${wrapX}" y1="${wrapY}" x2="${wrapX - 6}" y2="${wrapY + 18}" />`;
        }).join('\n');
      }).join('\n')}
    </g>
  </svg>`;
  saveSVG(`rain_${f}.svg`, content);
}

// ==========================================
// 7. Snow (下雪) - 6 frames
// ==========================================
for (let f = 0; f < 6; f++) {
  const yShift = f * 21.3;
  const content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <g fill="#ffffff" opacity="0.8">
      ${Array.from({ length: 5 }, (_, i) => {
        return Array.from({ length: 4 }, (_, j) => {
          const seed = (i * 7 + j * 13) % 10;
          const startX = i * 30 + 10;
          const startY = j * 35 + yShift;
          const wrapY = startY % 140 - 10;
          const sway = Math.sin(wrapY / 15 + f) * 5;
          const r = seed > 5 ? 2.5 : 1.5;
          return `<circle cx="${startX + sway}" cy="${wrapY}" r="${r}" />`;
        }).join('\n');
      }).join('\n')}
    </g>
  </svg>`;
  saveSVG(`snow_${f}.svg`, content);
}

// ==========================================
// 8. Drifting Clouds (流云) - 8 frames
// ==========================================
for (let f = 0; f < 8; f++) {
  const xShift = f * 16; // 0 to 112
  const content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <g fill="#4b5563" opacity="0.4">
      <!-- Clouds wrapped around 0-160 -->
      ${[0, 160].map(offset => {
        const cx = ((xShift + 20) % 160) - 20 + offset;
        return `
          <path d="M ${cx},60 
                   A 16,16 0 0,1 ${cx + 24},48 
                   A 22,22 0 0,1 ${cx + 60},44 
                   A 18,18 0 0,1 ${cx + 84},52 
                   A 14,14 0 0,1 ${cx + 94},66 
                   L ${cx},66 Z" />
        `;
      }).join('')}
    </g>
  </svg>`;
  saveSVG(`cloud_${f}.svg`, content);
}

// ==========================================
// 9. Water Waves (水面波浪) - 6 frames
// ==========================================
for (let f = 0; f < 6; f++) {
  const phase = (f * Math.PI) / 3;
  const dx = f * 8;
  const content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <!-- Wave 1 (darker) -->
    <path d="M -16,80 
             Q 16,${76 + Math.sin(phase)*3} 48,80 
             T 112,80 
             T 176,80 L 176,128 L -16,128 Z" fill="#1f2937" opacity="0.9" transform="translate(${-dx}, 0)" />
    <!-- Wave 2 (lighter) -->
    <path d="M -16,88 
             Q 16,${84 + Math.cos(phase)*3} 48,88 
             T 112,88 
             T 176,88 L 176,128 L -16,128 Z" fill="#374151" opacity="0.95" transform="translate(${dx - 48}, 0)" />
  </svg>`;
  saveSVG(`wave_${f}.svg`, content);
}

// ==========================================
// 10. Twinkling Stars (星光) - 4 frames
// ==========================================
for (let f = 0; f < 4; f++) {
  const sizes = [
    [6, 3, 8],
    [3, 8, 4],
    [8, 4, 6],
    [4, 6, 3]
  ][f];
  
  const content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <!-- Star 1 -->
    <polygon points="30,${30 - sizes[0]} 32,30 30,${30 + sizes[0]} 28,30" fill="#ffffff" />
    <polygon points="${30 - sizes[0]},30 30,32 ${30 + sizes[0]},30 30,28" fill="#ffffff" />
    
    <!-- Star 2 -->
    <polygon points="90,${45 - sizes[1]} 92,45 90,${45 + sizes[1]} 88,45" fill="#fef08a" />
    <polygon points="${90 - sizes[1]},45 90,47 ${90 + sizes[1]},45 90,43" fill="#fef08a" />

    <!-- Star 3 -->
    <polygon points="60,${80 - sizes[2]} 62,80 60,${80 + sizes[2]} 58,80" fill="#ffffff" />
    <polygon points="${60 - sizes[2]},80 60,82 ${60 + sizes[2]},80 60,78" fill="#ffffff" />
  </svg>`;
  saveSVG(`star_${f}.svg`, content);
}

// ==========================================
// 11. Falling Leaves (落叶) - 6 frames
// ==========================================
for (let f = 0; f < 6; f++) {
  const yShift = f * 20;
  const rot1 = f * 60;
  const rot2 = f * -45;
  const content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <!-- Leaf 1 -->
    <g transform="translate(${40 - f*5}, ${20 + yShift}) rotate(${rot1}, 10, 10)">
      <path d="M 0,10 C 5,0 15,0 20,10 C 15,20 5,20 0,10" fill="#f97316" />
      <line x1="0" y1="10" x2="20" y2="10" stroke="#000" stroke-width="0.5" />
    </g>
    <!-- Leaf 2 -->
    <g transform="translate(${80 - f*3}, ${40 + yShift * 1.2}) rotate(${rot2}, 8, 8)">
      <path d="M 0,8 C 4,0 12,0 16,8 C 12,16 4,16 0,8" fill="#ef4444" />
      <line x1="0" y1="8" x2="16" y2="8" stroke="#000" stroke-width="0.5" />
    </g>
  </svg>`;
  saveSVG(`leaf_${f}.svg`, content);
}

// ==========================================
// 12. Chimney Smoke (烟囱烟雾) - 6 frames
// ==========================================
for (let f = 0; f < 6; f++) {
  const t = f / 6; // 0 to 0.83
  // Three puffs at different stages
  const getPuff = (offsetT) => {
    const pt = (t + offsetT) % 1.0;
    const y = 100 - pt * 80;
    const x = 50 + Math.sin(pt * Math.PI * 2) * 8;
    const r = 4 + pt * 16;
    const op = (1.0 - pt) * 0.6;
    if (y < 10) return '';
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#94a3b8" opacity="${op.toFixed(2)}" />`;
  };

  const content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <!-- Chimney -->
    <rect x="44" y="100" width="12" height="28" fill="#0d111d" />
    <rect x="42" y="96" width="16" height="6" fill="#1e293b" />
    <!-- Smoke puffs -->
    ${getPuff(0)}
    ${getPuff(0.33)}
    ${getPuff(0.66)}
  </svg>`;
  saveSVG(`smoke_${f}.svg`, content);
}

// ==========================================
// 13. Flying Birds (飞鸟) - 4 frames
// ==========================================
const wingPaths = [
  "M 30,64 Q 40,50 50,60 Q 60,50 70,64 Q 60,60 50,62 Q 40,60 30,64 Z", // wings up V
  "M 30,64 Q 40,58 50,60 Q 60,58 70,64 Q 60,62 50,62 Q 40,62 30,64 Z", // wings flat
  "M 30,64 Q 40,74 50,60 Q 60,74 70,64 Q 60,66 50,62 Q 40,66 30,64 Z", // wings down inverted V
  "M 30,64 Q 40,58 50,60 Q 60,58 70,64 Q 60,62 50,62 Q 40,62 30,64 Z"  // wings flat
];
for (let f = 0; f < 4; f++) {
  const content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <!-- Bird body & wings -->
    <path d="${wingPaths[f]}" fill="#0c101b" />
  </svg>`;
  saveSVG(`bird_${f}.svg`, content);
}

// ==========================================
// 14. Neon Sign (霓虹灯招牌) - 4 frames
// ==========================================
const neonFlickers = [
  { text: "#f43f5e", shadow: "#e11d48", border: "#f43f5e" }, // All bright
  { text: "#4c0519", shadow: "transparent", border: "#f43f5e" }, // Border only
  { text: "#f43f5e", shadow: "#e11d48", border: "#4c0519" }, // Text only
  { text: "#4c0519", shadow: "transparent", border: "#4c0519" }  // Dark
];
for (let f = 0; f < 4; f++) {
  const sign = neonFlickers[f];
  const content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <!-- Board -->
    <rect x="24" y="38" width="80" height="52" rx="6" fill="#020617" stroke="#1e293b" stroke-width="4" />
    <!-- Neon Border -->
    <rect x="28" y="42" width="72" height="44" rx="4" fill="none" stroke="${sign.border}" stroke-width="3" filter="url(#neon-glow)" />
    <!-- Neon Text "LIVE" -->
    <text x="64" y="70" font-family="'Impact', monospace" font-size="20" font-weight="bold" text-anchor="middle" fill="${sign.text}" style="text-shadow: 0 0 5px ${sign.shadow}, 0 0 10px ${sign.shadow}">LIVE</text>
    <defs>
      <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  </svg>`;
  saveSVG(`neon_${f}.svg`, content);
}

// ==========================================
// 15. Sun/Moon Rays (光斑/日冕) - 6 frames
// ==========================================
for (let f = 0; f < 6; f++) {
  const scale = 1.0 + Math.sin((f * Math.PI) / 3) * 0.08;
  const op = 0.5 + Math.sin((f * Math.PI) / 3) * 0.2;
  
  const content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <!-- Center Orb -->
    <circle cx="64" cy="64" r="20" fill="#fffef0" />
    <circle cx="64" cy="64" r="32" fill="#fef08a" opacity="0.3" />
    <!-- Radial Rays -->
    <g stroke="#fef08a" stroke-width="2" opacity="${op}" transform="translate(64,64) scale(${scale}) translate(-64,-64)">
      ${Array.from({ length: 8 }, (_, i) => {
        const deg = i * 45;
        const p1 = pt(64, 64, 34, deg);
        const p2 = pt(64, 64, 56, deg);
        return `<line x1="${p1[0]}" y1="${p1[1]}" x2="${p2[0]}" y2="${p2[1]}" />`;
      }).join('\n')}
    </g>
  </svg>`;
  saveSVG(`ray_${f}.svg`, content);
}

// ==========================================
// 16. Bubbles (气泡) - 6 frames
// ==========================================
for (let f = 0; f < 6; f++) {
  const yShift = f * 18;
  const content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <g stroke="#ffffff" stroke-width="1" fill="none">
      <!-- Bubble 1 -->
      <circle cx="${32 + Math.sin(f)*3}" cy="${110 - yShift}" r="6" opacity="0.5" />
      <circle cx="${30 + Math.sin(f)*3}" cy="${108 - yShift}" r="1.5" fill="#fff" stroke="none" />
      
      <!-- Bubble 2 -->
      <circle cx="${64 + Math.cos(f)*4}" cy="${90 - yShift * 1.3}" r="10" opacity="0.4" />
      <circle cx="${61 + Math.cos(f)*4}" cy="${87 - yShift * 1.3}" r="2" fill="#fff" stroke="none" />

      <!-- Bubble 3 -->
      <circle cx="${96 + Math.sin(f + 2)*3}" cy="${100 - yShift * 0.8}" r="8" opacity="0.6" />
      <circle cx="${94 + Math.sin(f + 2)*3}" cy="${98 - yShift * 0.8}" r="2" fill="#fff" stroke="none" />
    </g>
  </svg>`;
  saveSVG(`bubble_${f}.svg`, content);
}

// ==========================================
// 17. Lighthouse (灯塔扫射) - 8 frames
// ==========================================
for (let f = 0; f < 8; f++) {
  // Angle sweeps back and forth between -30 and +30 degrees
  const angle = Math.sin((f * Math.PI) / 4) * 35;
  const beamLeft = pt(64, 40, 90, angle - 18);
  const beamRight = pt(64, 40, 90, angle + 18);

  const content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <!-- Light Cone -->
    <polygon points="64,40 ${beamLeft[0].toFixed(1)},${beamLeft[1].toFixed(1)} ${beamRight[0].toFixed(1)},${beamRight[1].toFixed(1)}" fill="url(#light-glow)" opacity="0.6" />
    <!-- Lighthouse Base -->
    <polygon points="56,128 72,128 66,48 62,48" fill="#0c101b" />
    <!-- Light room and cap -->
    <rect x="58" y="40" width="12" height="8" fill="#1e293b" />
    <polygon points="56,40 72,40 64,30" fill="#0c101b" />
    <!-- Lens bulb -->
    <circle cx="64" cy="44" r="3" fill="#ffffff" />
    <defs>
      <linearGradient id="light-glow" x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stop-color="#fff" stop-opacity="1" />
        <stop offset="100%" stop-color="#38bdf8" stop-opacity="0" />
      </linearGradient>
    </defs>
  </svg>`;
  saveSVG(`lighthouse_${f}.svg`, content);
}

// ==========================================
// 18. Water Dripping (水滴与水波纹) - 8 frames
// ==========================================
for (let f = 0; f < 8; f++) {
  let content = '';
  if (f < 4) {
    // Stage 1: Water drop falls
    const y = 20 + f * 24; // 20, 44, 68, 92
    const stretch = f === 3 ? 1.4 : 1.0;
    content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
      <!-- Droplet shape -->
      <path d="M 64,${y + 8} C ${64 - 4*stretch},${y + 8} ${64 - 4},${y + 2} 64,${y} C 64,${y + 2} ${64 + 4*stretch},${y + 8} 64,${y + 8} Z" fill="#38bdf8" />
    </svg>`;
  } else {
    // Stage 2: Ripple expands and fades
    const step = f - 4; // 0, 1, 2, 3
    const r1 = (step + 1) * 10;
    const r2 = step * 10;
    const op = (1.0 - step * 0.25) * 0.8;
    content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
      <!-- Inner and outer concentric ripples -->
      <ellipse cx="64" cy="110" rx="${r1}" ry="${r1 * 0.3}" fill="none" stroke="#38bdf8" stroke-width="2" opacity="${op}" />
      ${step > 0 ? `<ellipse cx="64" cy="110" rx="${r2}" ry="${r2 * 0.3}" fill="none" stroke="#38bdf8" stroke-width="1" opacity="${op * 0.6}" />` : ''}
    </svg>`;
  }
  saveSVG(`drip_${f}.svg`, content);
}

// ==========================================
// 19. Waterfall (瀑布流水) - 6 frames
// ==========================================
for (let f = 0; f < 6; f++) {
  const yShift = f * 8; // 0 to 40
  const content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <!-- Back Rock Layer -->
    <rect x="0" y="0" width="128" height="128" fill="#0d111d" />
    <!-- Waterfall stream pattern -->
    <g stroke="#38bdf8" stroke-width="3" opacity="0.6">
      ${Array.from({ length: 4 }, (_, i) => {
        const startX = 34 + i * 20;
        return `
          <line x1="${startX}" y1="${(yShift) % 48}" x2="${startX}" y2="128" stroke-dasharray="24, 16" stroke-width="${4 - (i%2)}" />
          <line x1="${startX - 6}" y1="${(yShift + 24) % 48}" x2="${startX - 6}" y2="128" stroke-dasharray="16, 24" stroke-width="2" />
        `;
      }).join('\n')}
    </g>
    <!-- Top Ledger -->
    <rect x="24" y="0" width="80" height="24" rx="4" fill="#1e293b" />
    <!-- Splashes at bottom -->
    <g fill="#ffffff" opacity="0.9">
      <circle cx="${44 + Math.sin(f)*3}" cy="${118 + Math.cos(f)*2}" r="${3 + (f%3)}" />
      <circle cx="${64 + Math.cos(f)*3}" cy="${116 + Math.sin(f)*3}" r="${4 + (f%2)}" />
      <circle cx="${84 + Math.sin(f + 2)*3}" cy="${118 + Math.cos(f + 2)*2}" r="${3 + (f%2)}" />
    </g>
  </svg>`;
  saveSVG(`waterfall_${f}.svg`, content);
}

// ==========================================
// 20. Wind Trails (风之轨迹) - 4 frames
// ==========================================
for (let f = 0; f < 4; f++) {
  const xShift = f * 32; // 0, 32, 64, 96
  const content = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
    <!-- Flow lines translating horizontally -->
    <g stroke="#e2e8f0" stroke-width="1.5" opacity="0.5" stroke-linecap="round">
      <!-- Line 1 -->
      <path d="M ${-40 + xShift},40 C ${0 + xShift},35 ${40 + xShift},45 ${80 + xShift},40" fill="none" stroke-dasharray="30, 20" />
      <!-- Line 2 -->
      <path d="M ${-10 + xShift},68 C ${30 + xShift},72 ${70 + xShift},64 ${110 + xShift},68" fill="none" stroke-dasharray="40, 15" />
      <!-- Line 3 -->
      <path d="M ${-60 + xShift},90 C ${-20 + xShift},85 ${20 + xShift},95 ${60 + xShift},90" fill="none" stroke-dasharray="25, 25" />
    </g>
  </svg>`;
  saveSVG(`wind_${f}.svg`, content);
}

console.log("All 20 elements generated successfully!");
