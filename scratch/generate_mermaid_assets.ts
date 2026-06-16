import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const CHAR_RUNS_DIR = './char_runs';
const TEXTURE_RUNS_DIR = './texture_runs';
const OBJECT_RUNS_DIR = './object_runs';
const GAME_RUNS_DIR = './game_runs';

// Ensure directories
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ──────────────────────────────────────────────────────────────────────────
// CHARACTER SVG GENERATORS
// ──────────────────────────────────────────────────────────────────────────

function drawMermaid(frameIdx: number, mode: 'idle' | 'walk-left' | 'jump'): string {
  let xOffset = 0;
  let yOffset = 0;
  let tailAngle = 0;
  let hairWiggle = 0;
  let armsPose = '';
  
  const phase = (frameIdx / 9) * Math.PI * 2;
  
  if (mode === 'idle') {
    yOffset = Math.sin(phase) * 6;
    tailAngle = Math.sin(phase) * 12;
    hairWiggle = Math.cos(phase) * 4;
    armsPose = `
      <path d="M 72,110 Q 58,122 70,135" stroke="#fed8be" stroke-width="7" stroke-linecap="round" fill="none"/>
      <path d="M 120,110 Q 134,122 122,135" stroke="#fed8be" stroke-width="7" stroke-linecap="round" fill="none"/>
    `;
  } else if (mode === 'walk-left') {
    // Swimming horizontally
    tailAngle = Math.sin(phase) * 25 - 45; // bent backwards
    hairWiggle = Math.sin(phase) * 8;
    yOffset = Math.sin(phase) * 2;
    armsPose = `
      <path d="M 75,105 Q 45,98 35,110" stroke="#fed8be" stroke-width="7" stroke-linecap="round" fill="none"/>
      <path d="M 115,105 Q 145,112 155,100" stroke="#fed8be" stroke-width="7" stroke-linecap="round" fill="none"/>
    `;
  } else if (mode === 'jump') {
    // Swimming / leaping up
    yOffset = Math.sin(phase) * 3 - 5;
    tailAngle = Math.sin(phase) * 8;
    armsPose = `
      <path d="M 75,105 Q 65,75 58,55" stroke="#fed8be" stroke-width="7" stroke-linecap="round" fill="none"/>
      <path d="M 117,105 Q 127,75 134,55" stroke="#fed8be" stroke-width="7" stroke-linecap="round" fill="none"/>
    `;
  }

  return `
    <svg width="192" height="208" viewBox="0 0 192 208" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tailGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ff79c6" />
          <stop offset="100%" stop-color="#bd93f9" />
        </linearGradient>
        <linearGradient id="finGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#8be9fd" />
          <stop offset="100%" stop-color="#50fa7b" />
        </linearGradient>
        <linearGradient id="hairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ff5555" />
          <stop offset="100%" stop-color="#ffb86c" />
        </linearGradient>
      </defs>
      
      <!-- Hair Back -->
      <g transform="translate(${xOffset}, ${yOffset + hairWiggle})">
        <path d="M 96,55 C 50,55 45,135 65,160 C 80,180 112,180 127,160 C 147,135 142,55 96,55 Z" fill="url(#hairGrad)" opacity="0.95"/>
      </g>

      <!-- Tail -->
      <g transform="translate(${96 + xOffset}, ${118 + yOffset}) rotate(${tailAngle})">
        <path d="M -15,0 C -15,35 15,35 15,0 C 12,25 -12,25 -15,0 Z" fill="url(#tailGrad)"/>
        <path d="M -12,15 C -12,45 12,45 12,15 C 8,40 -8,40 -12,15 Z" fill="url(#tailGrad)"/>
        <path d="M -8,35 Q 0,65 10,85 Q 0,75 -8,35" fill="url(#tailGrad)"/>
        <!-- Fins -->
        <path d="M 10,85 Q -10,105 -25,110 Q -5,95 10,85 Q 25,95 45,110 Q 30,105 10,85 Z" fill="url(#finGrad)"/>
      </g>

      <!-- Waist scales -->
      <g transform="translate(${xOffset}, ${yOffset})">
        <path d="M 81,118 Q 96,124 111,118 Q 111,126 96,130 Q 81,126 81,118 Z" fill="#50fa7b"/>
      </g>

      <!-- Arms -->
      <g transform="translate(${xOffset}, ${yOffset})">
        ${armsPose}
      </g>

      <!-- Body / Torso -->
      <g transform="translate(${xOffset}, ${yOffset})">
        <rect x="93" y="82" width="6" height="15" fill="#fed8be"/>
        <path d="M 81,92 Q 96,88 111,92 L 109,118 Q 96,122 83,118 Z" fill="#fed8be"/>
        <!-- Shell Bra -->
        <circle cx="90" cy="100" r="6" fill="#a855f7"/>
        <path d="M 85,100 Q 90,96 95,100 Z" fill="#ffffff" opacity="0.6"/>
        <circle cx="102" cy="100" r="6" fill="#a855f7"/>
        <path d="M 97,100 Q 102,96 107,100 Z" fill="#ffffff" opacity="0.6"/>
      </g>

      <!-- Head / Face -->
      <g transform="translate(${xOffset}, ${yOffset})">
        <circle cx="96" cy="68" r="16" fill="#fed8be"/>
        <!-- Hair Bangs -->
        <path d="M 80,66 Q 96,48 112,66 Q 96,58 80,66 Z" fill="url(#hairGrad)"/>
        <!-- Eyes -->
        <circle cx="90" cy="67" r="2" fill="#282a36"/>
        <circle cx="102" cy="67" r="2" fill="#282a36"/>
        <circle cx="89.5" cy="66" r="0.8" fill="#ffffff"/>
        <circle cx="101.5" cy="66" r="0.8" fill="#ffffff"/>
        <!-- Smile -->
        <path d="M 94,74 Q 96,76 98,74" stroke="#ff5555" stroke-width="1.2" stroke-linecap="round" fill="none"/>
      </g>
    </svg>
  `;
}

function drawOctopus(frameIdx: number, mode: 'idle' | 'walk-left'): string {
  const phase = (frameIdx / 9) * Math.PI * 2;
  const bob = Math.sin(phase) * 6;
  
  // Tentacle offsets
  const t1 = Math.sin(phase + 0) * 10;
  const t2 = Math.sin(phase + Math.PI/3) * 10;
  const t3 = Math.sin(phase + 2*Math.PI/3) * 10;
  
  let scaleX = 1;
  let scaleY = 1;
  let skew = 0;
  
  if (mode === 'walk-left') {
    skew = Math.sin(phase) * 8;
    scaleX = 1 + Math.sin(phase) * 0.05;
    scaleY = 1 - Math.sin(phase) * 0.05;
  }

  return `
    <svg width="192" height="208" viewBox="0 0 192 208" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="octoGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#bd93f9" />
          <stop offset="100%" stop-color="#ff79c6" />
        </linearGradient>
      </defs>
      
      <g transform="translate(96, 110) scale(${scaleX}, ${scaleY}) skewX(${skew}) translate(-96, -110)">
        <!-- Tentacles -->
        <path d="M 60,110 Q 40,140 ${35+t1},160" stroke="url(#octoGrad)" stroke-width="12" stroke-linecap="round" fill="none"/>
        <path d="M 80,115 Q 70,145 ${70+t2},165" stroke="url(#octoGrad)" stroke-width="12" stroke-linecap="round" fill="none"/>
        <path d="M 100,115 Q 110,145 ${110+t3},165" stroke="url(#octoGrad)" stroke-width="12" stroke-linecap="round" fill="none"/>
        <path d="M 120,110 Q 140,140 ${145-t1},160" stroke="url(#octoGrad)" stroke-width="12" stroke-linecap="round" fill="none"/>

        <!-- Little suction cups -->
        <circle cx="43" cy="130" r="3" fill="#ffb86c"/>
        <circle cx="34" cy="148" r="3" fill="#ffb86c"/>
        <circle cx="137" cy="130" r="3" fill="#ffb86c"/>
        <circle cx="146" cy="148" r="3" fill="#ffb86c"/>

        <!-- Head / Body -->
        <ellipse cx="96" cy="90" rx="34" ry="38" fill="url(#octoGrad)"/>
        
        <!-- Forehead highlight -->
        <path d="M 75,70 Q 96,60 117,70 Q 96,65 75,70 Z" fill="#ffffff" opacity="0.3"/>

        <!-- Expressive Ghibli Eyes -->
        <circle cx="82" cy="95" r="7" fill="#282a36"/>
        <circle cx="110" cy="95" r="7" fill="#282a36"/>
        <!-- Eye shine -->
        <circle cx="80" cy="92" r="2.5" fill="#ffffff"/>
        <circle cx="84" cy="97" r="1" fill="#ffffff"/>
        <circle cx="108" cy="92" r="2.5" fill="#ffffff"/>
        <circle cx="112" cy="97" r="1" fill="#ffffff"/>
        
        <!-- Blush -->
        <ellipse cx="74" cy="103" rx="4" ry="2" fill="#ff5555" opacity="0.6"/>
        <ellipse cx="118" cy="103" rx="4" ry="2" fill="#ff5555" opacity="0.6"/>

        <!-- Mouth -->
        <path d="M 93,101 Q 96,104 99,101" stroke="#282a36" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      </g>
    </svg>
  `;
}

function drawShark(frameIdx: number, mode: 'idle' | 'walk-left'): string {
  const phase = (frameIdx / 9) * Math.PI * 2;
  const tailWag = Math.sin(phase) * 16;
  const bob = Math.sin(phase) * 5;

  return `
    <svg width="192" height="208" viewBox="0 0 192 208" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sharkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#6272a4" />
          <stop offset="60%" stop-color="#8be9fd" />
          <stop offset="100%" stop-color="#f8f8f2" />
        </linearGradient>
      </defs>

      <g transform="translate(96, 104 + ${bob})">
        <!-- Tail Fin (Behind) -->
        <g transform="translate(50, 0) rotate(${tailWag})">
          <path d="M 0,-15 Q 40,-45 45,-30 Q 30,0 45,30 Q 40,45 0,15 Z" fill="#6272a4"/>
        </g>
        
        <!-- Pectoral Fin (Backside) -->
        <path d="M -15,12 Q 10,35 -5,45 Q -25,30 -15,12" fill="#6272a4" opacity="0.7"/>

        <!-- Main Body (Torpedo Shape) -->
        <path d="M -65,0 C -65,-35 45,-25 55,0 C 45,25 -65,25 -65,0 Z" fill="url(#sharkGrad)"/>
        
        <!-- White Belly Overlay -->
        <path d="M -50,5 C -50,18 30,18 42,0 C 30,10 -50,12 -50,5 Z" fill="#f8f8f2"/>

        <!-- Dorsal Fin (Top) -->
        <path d="M -10,-18 Q 0,-52 18,-48 Q 15,-18 -10,-18 Z" fill="#6272a4"/>

        <!-- Pectoral Fin (Front) -->
        <path d="M -25,8 Q 0,40 -20,48 Q -40,35 -25,8" fill="#6272a4"/>

        <!-- Gill Slits -->
        <path d="M -30,-5 Q -28,0 -30,5" stroke="#44475a" stroke-width="1.5" stroke-linecap="round" fill="none"/>
        <path d="M -26,-4 Q -24,0 -26,4" stroke="#44475a" stroke-width="1.5" stroke-linecap="round" fill="none"/>
        <path d="M -22,-3 Q -20,0 -22,3" stroke="#44475a" stroke-width="1.5" stroke-linecap="round" fill="none"/>

        <!-- Cute Shark Eye -->
        <circle cx="-48" cy="-8" r="4.5" fill="#282a36"/>
        <circle cx="-49.5" cy="-9.5" r="1.5" fill="#ffffff"/>

        <!-- Blush -->
        <ellipse cx="-44" cy="-2" rx="3" ry="1.5" fill="#ff5555" opacity="0.6"/>

        <!-- Smug/Friendly Smile & Tiny White Tooth -->
        <path d="M -54,3 Q -44,5 -38,1" stroke="#282a36" stroke-width="2" stroke-linecap="round" fill="none"/>
        <polygon points="-46,4 -42,4 -44,8" fill="#ffffff"/>
      </g>
    </svg>
  `;
}

// ──────────────────────────────────────────────────────────────────────────
// OBJECT SVG GENERATORS
// ──────────────────────────────────────────────────────────────────────────

function drawPearlFrame(frameIdx: number): string {
  const phase = (frameIdx / 6) * Math.PI * 2;
  const scale = 1 + Math.sin(phase) * 0.08;
  const glow = 20 + Math.sin(phase) * 6;
  const sparkleRot = frameIdx * 60;

  return `
    <svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="pearlGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
          <stop offset="50%" stop-color="#ffb86c" stop-opacity="0.9"/>
          <stop offset="70%" stop-color="#ff79c6" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="#ff79c6" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="pearlBody" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="40%" stop-color="#f8f8f2"/>
          <stop offset="75%" stop-color="#ff79c6"/>
          <stop offset="100%" stop-color="#bd93f9"/>
        </radialGradient>
      </defs>

      <!-- Glow ring behind -->
      <circle cx="64" cy="64" r="${glow + 15}" fill="url(#pearlGlow)" opacity="0.65"/>

      <!-- Floating Pearl Body -->
      <g transform="translate(64, 64) scale(${scale})">
        <circle cx="0" cy="0" r="18" fill="url(#pearlBody)"/>
        <!-- Highlight -->
        <circle cx="-6" cy="-6" r="5" fill="#ffffff" opacity="0.7"/>
        <circle cx="-7.5" cy="-7.5" r="2" fill="#ffffff" opacity="0.9"/>
      </g>

      <!-- Little sparkles rotating -->
      <g transform="translate(64, 64) rotate(${sparkleRot})">
        <path d="M 0,-24 L 2,-26 L 0,-32 L -2,-26 Z" fill="#ffb86c"/>
        <path d="M 22,10 L 26,11 L 28,15 L 25,12 Z" fill="#ff79c6" transform="scale(0.8)"/>
        <path d="M -20,-10 L -24,-11 L -28,-15 L -25,-12 Z" fill="#8be9fd" transform="scale(0.8)"/>
      </g>
    </svg>
  `;
}

function drawJellyfishElectricFrame(frameIdx: number): string {
  const phase = (frameIdx / 4) * Math.PI * 2;
  const pulseY = Math.sin(phase) * 8;
  const pulseW = 1 + Math.cos(phase) * 0.05;
  const pulseH = 1 + Math.sin(phase) * 0.08;
  const sparks = frameIdx % 2 === 0;

  return `
    <svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="jellyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#8be9fd" stop-opacity="0.9"/>
          <stop offset="60%" stop-color="#bd93f9" stop-opacity="0.7"/>
          <stop offset="100%" stop-color="#ff79c6" stop-opacity="0.1"/>
        </linearGradient>
        <radialGradient id="electricGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#50fa7b" stop-opacity="0.7"/>
          <stop offset="100%" stop-color="#50fa7b" stop-opacity="0"/>
        </radialGradient>
      </defs>

      <!-- Electric aura background -->
      <circle cx="64" cy="54" r="32" fill="url(#electricGlow)" opacity="${sparks ? 0.7 : 0.3}"/>

      <!-- Lightning bolts if sparking -->
      ${sparks ? `
        <path d="M 30,30 L 22,25 L 28,20" stroke="#f1fa8c" stroke-width="2.5" stroke-linecap="round" fill="none"/>
        <path d="M 98,30 L 106,25 L 100,20" stroke="#f1fa8c" stroke-width="2.5" stroke-linecap="round" fill="none"/>
        <path d="M 32,80 L 25,85 L 20,80" stroke="#f1fa8c" stroke-width="2.5" stroke-linecap="round" fill="none"/>
        <path d="M 96,80 L 103,85 L 108,80" stroke="#f1fa8c" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      ` : ''}

      <!-- Jellyfish Body -->
      <g transform="translate(64, 50 + ${pulseY}) scale(${pulseW}, ${pulseH}) translate(-64, -50)">
        <!-- Tentacles -->
        <path d="M 50,60 Q 42,85 50,110 Q 45,120 48,125" stroke="url(#jellyGrad)" stroke-width="4.5" stroke-linecap="round" fill="none"/>
        <path d="M 64,62 Q 64,95 68,115 Q 60,123 64,128" stroke="url(#jellyGrad)" stroke-width="5" stroke-linecap="round" fill="none"/>
        <path d="M 78,60 Q 86,85 78,110 Q 83,120 80,125" stroke="url(#jellyGrad)" stroke-width="4.5" stroke-linecap="round" fill="none"/>

        <!-- Umbrella Cap -->
        <path d="M 40,55 C 40,25 88,25 88,55 C 88,60 40,60 40,55 Z" fill="url(#jellyGrad)"/>
        
        <!-- Glowing Dots on Umbrella -->
        <circle cx="52" cy="42" r="2" fill="#50fa7b"/>
        <circle cx="76" cy="42" r="2" fill="#50fa7b"/>
        <circle cx="64" cy="36" r="2" fill="#8be9fd"/>
      </g>
    </svg>
  `;
}

function drawPufferfishSpinyFrame(frameIdx: number): string {
  const phase = (frameIdx / 4) * Math.PI * 2;
  const inflate = 0.85 + Math.sin(phase) * 0.15;
  const isBig = inflate > 0.95;

  return `
    <svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pufferGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffb86c" />
          <stop offset="60%" stop-color="#f1fa8c" />
          <stop offset="100%" stop-color="#ff5555" />
        </linearGradient>
      </defs>

      <g transform="translate(64, 64) scale(${inflate})">
        <!-- Spines -->
        <g stroke="#ff5555" stroke-width="${isBig ? '4' : '2.5'}" stroke-linecap="round">
          <line x1="0" y1="-22" x2="0" y2="${isBig ? '-36' : '-28'}"/>
          <line x1="0" y1="22" x2="0" y2="${isBig ? '36' : '28'}"/>
          <line x1="-22" y1="0" x2="${isBig ? '-36' : '-28'}" y2="0"/>
          <line x1="22" y1="0" x2="${isBig ? '36' : '28'}" y2="0"/>
          <line x1="-15" y1="-15" x2="${isBig ? '-26' : '-20'}" y2="${isBig ? '-26' : '-20'}"/>
          <line x1="15" y1="-15" x2="${isBig ? '26' : '20'}" y2="${isBig ? '-26' : '-20'}"/>
          <line x1="-15" y1="15" x2="${isBig ? '-26' : '-20'}" y2="${isBig ? '26' : '20'}"/>
          <line x1="15" y1="15" x2="${isBig ? '26' : '20'}" y2="${isBig ? '26' : '20'}"/>
        </g>

        <!-- Tail Fin -->
        <path d="M 20,-5 L 34,-14 L 30,0 L 34,14 L 20,5 Z" fill="#ff5555"/>

        <!-- Main Round Body -->
        <circle cx="0" cy="0" r="22" fill="url(#pufferGrad)"/>
        
        <!-- White Belly Overlay -->
        <path d="M -20,4 C -20,16 10,16 18,2 C 10,8 -20,10 -20,4 Z" fill="#ffffff" opacity="0.9"/>

        <!-- Tiny Fins -->
        <path d="M -5,12 Q 2,24 -6,26 Z" fill="#ffb86c"/>

        <!-- Big Derpy Eyes -->
        <circle cx="-11" cy="-6" r="4.5" fill="#282a36"/>
        <circle cx="-12.5" cy="-7.5" r="1.5" fill="#ffffff"/>

        <!-- Derpy Mouth -->
        ${isBig 
          ? `<ellipse cx="-18" cy="4" rx="2" ry="3.5" fill="#282a36"/>`
          : `<path d="M -20,3 Q -17,5 -15,3" stroke="#282a36" stroke-width="1.5" stroke-linecap="round" fill="none"/>`
        }
      </g>
    </svg>
  `;
}

function drawShellPortalFrame(frameIdx: number): string {
  const openProgress = frameIdx / 3;
  const lidY = -openProgress * 22;
  const lidAngle = -openProgress * 30;

  return `
    <svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shellGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ff79c6" />
          <stop offset="50%" stop-color="#ffb86c" />
          <stop offset="100%" stop-color="#bd93f9" />
        </linearGradient>
        <radialGradient id="portalGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#8be9fd" stop-opacity="1"/>
          <stop offset="60%" stop-color="#bd93f9" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#ff79c6" stop-opacity="0"/>
        </radialGradient>
      </defs>

      <!-- Portal inside -->
      ${openProgress > 0.3 ? `
        <g transform="translate(64, 66) scale(${openProgress})">
          <circle cx="0" cy="0" r="30" fill="url(#portalGrad)"/>
          <path d="M -15,-15 Q 0,0 15,15" stroke="#ffffff" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.6"/>
          <path d="M 15,-15 Q 0,0 -15,15" stroke="#ffffff" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.6"/>
        </g>
      ` : ''}

      <!-- Bottom Clam Shell -->
      <path d="M 24,76 C 24,96 104,96 104,76 C 104,70 24,70 24,76 Z" fill="url(#shellGrad)"/>
      <path d="M 28,76 L 36,92 M 46,76 L 50,94 M 64,76 L 64,95 M 82,76 L 78,94 M 100,76 L 92,92" stroke="#44475a" stroke-width="1" opacity="0.5"/>

      <!-- Pearl placeholder -->
      ${openProgress < 0.5 ? `
        <circle cx="64" cy="74" r="8" fill="#ffffff"/>
        <circle cx="62" cy="72" r="3" fill="#8be9fd" opacity="0.5"/>
      ` : ''}

      <!-- Top Clam Shell -->
      <g transform="translate(64, 72) rotate(${lidAngle}) translate(-64, -72) translate(0, ${lidY})">
        <path d="M 24,68 C 24,48 104,48 104,68 C 104,74 24,74 24,68 Z" fill="url(#shellGrad)"/>
        <path d="M 28,68 L 36,52 M 46,68 L 50,50 M 64,68 L 64,48 M 82,68 L 78,50 M 100,68 L 92,52" stroke="#44475a" stroke-width="1" opacity="0.5"/>
        <ellipse cx="64" cy="58" rx="8" ry="4" fill="#44475a" opacity="0.15"/>
      </g>
    </svg>
  `;
}

// ──────────────────────────────────────────────────────────────────────────
// TILE SVG GENERATORS (512x512)
// ──────────────────────────────────────────────────────────────────────────

function drawCoralGroundTile(): string {
  return `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="groundGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffb86c" />
          <stop offset="100%" stop-color="#ff79c6" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" fill="url(#groundGrad)"/>
      <circle cx="60" cy="80" r="45" fill="#bd93f9" opacity="0.6"/>
      <circle cx="450" cy="400" r="60" fill="#a855f7" opacity="0.6"/>
      <circle cx="280" cy="240" r="50" fill="#bd93f9" opacity="0.4"/>
      <path d="M 80,480 Q 70,410 90,360 Q 80,330 95,290" stroke="#ff5555" stroke-width="24" stroke-linecap="round" fill="none"/>
      <path d="M 90,380 Q 120,360 130,320" stroke="#ff5555" stroke-width="16" stroke-linecap="round" fill="none"/>
      <path d="M 430,480 Q 450,420 420,380 Q 400,340 435,280" stroke="#ff79c6" stroke-width="32" stroke-linecap="round" fill="none"/>
      <path d="M 425,400 Q 380,390 370,350" stroke="#ff79c6" stroke-width="18" stroke-linecap="round" fill="none"/>
      <path d="M 230,120 Q 250,90 270,120 Z" fill="#f1fa8c"/>
      <circle cx="250" cy="115" r="4" fill="#ffffff"/>
      <path d="M 0,160 Q 120,180 256,150 Q 380,120 512,160" stroke="#ffffff" stroke-width="6" fill="none" opacity="0.2"/>
      <path d="M 0,340 Q 180,320 256,350 Q 400,370 512,330" stroke="#ffffff" stroke-width="6" fill="none" opacity="0.2"/>
    </svg>
  `;
}

function drawCoralPlatformTile(): string {
  return `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" fill="#ff79c6"/>
      <rect width="512" height="120" fill="#50fa7b" opacity="0.85"/>
      <path d="M 0,120 Q 64,150 128,120 Q 192,90 256,120 Q 320,150 384,120 Q 448,90 512,120 L 512,0 L 0,0 Z" fill="#50fa7b"/>
      <circle cx="100" cy="280" r="35" fill="#ff5555" opacity="0.6"/>
      <circle cx="400" cy="220" r="45" fill="#ff5555" opacity="0.6"/>
      <circle cx="250" cy="380" r="50" fill="#bd93f9" opacity="0.5"/>
      <path d="M 64,512 Q 50,420 64,360" stroke="#50fa7b" stroke-width="16" stroke-linecap="round" fill="none"/>
      <path d="M 320,512 Q 340,430 310,380" stroke="#50fa7b" stroke-width="22" stroke-linecap="round" fill="none"/>
    </svg>
  `;
}

function drawJellyfishGroundTile(): string {
  return `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="jgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#282a36" />
          <stop offset="100%" stop-color="#44475a" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" fill="url(#jgGrad)"/>
      <circle cx="120" cy="180" r="70" fill="#bd93f9" opacity="0.25"/>
      <circle cx="380" cy="320" r="90" fill="#8be9fd" opacity="0.25"/>
      <circle cx="120" cy="180" r="12" fill="#bd93f9" opacity="0.8"/>
      <circle cx="380" cy="320" r="15" fill="#8be9fd" opacity="0.8"/>
      <circle cx="260" cy="400" r="8" fill="#50fa7b" opacity="0.8"/>
      <circle cx="420" cy="100" r="6" fill="#ff79c6" opacity="0.6"/>
      <path d="M 60,512 C 40,450 120,400 100,340" stroke="#bd93f9" stroke-width="12" stroke-linecap="round" fill="none" opacity="0.6"/>
      <path d="M 400,512 C 430,460 360,420 380,360" stroke="#8be9fd" stroke-width="14" stroke-linecap="round" fill="none" opacity="0.6"/>
    </svg>
  `;
}

function drawJellyfishPlatformTile(): string {
  return `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" fill="#282a36"/>
      <rect width="512" height="80" fill="#bd93f9" opacity="0.9"/>
      <path d="M 0,80 Q 128,120 256,80 Q 384,40 512,80 L 512,0 L 0,0 Z" fill="#8be9fd"/>
      <circle cx="100" cy="250" r="40" fill="#44475a"/>
      <circle cx="410" cy="320" r="50" fill="#44475a"/>
      <circle cx="280" cy="400" r="30" fill="#ff79c6" opacity="0.2"/>
    </svg>
  `;
}

function drawShipwreckGroundTile(): string {
  return `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" fill="#44475a"/>
      <line x1="0" y1="128" x2="512" y2="128" stroke="#282a36" stroke-width="16"/>
      <line x1="0" y1="256" x2="512" y2="256" stroke="#282a36" stroke-width="16"/>
      <line x1="0" y1="384" x2="512" y2="384" stroke="#282a36" stroke-width="16"/>
      <line x1="180" y1="0" x2="180" y2="128" stroke="#282a36" stroke-width="8"/>
      <line x1="360" y1="128" x2="360" y2="256" stroke="#282a36" stroke-width="8"/>
      <line x1="120" y1="256" x2="120" y2="384" stroke="#282a36" stroke-width="8"/>
      <line x1="420" y1="384" x2="420" y2="512" stroke="#282a36" stroke-width="8"/>
      <circle cx="80" cy="64" r="16" fill="#f1fa8c"/>
      <circle cx="95" cy="74" r="14" fill="#ffb86c"/>
      <circle cx="290" cy="200" r="15" fill="#f1fa8c"/>
      <circle cx="240" cy="320" r="16" fill="#ffb86c"/>
      <circle cx="30" cy="30" r="4" fill="#282a36"/>
      <circle cx="160" cy="30" r="4" fill="#282a36"/>
      <circle cx="200" cy="158" r="4" fill="#282a36"/>
      <circle cx="340" cy="158" r="4" fill="#282a36"/>
    </svg>
  `;
}

function drawShipwreckPlatformTile(): string {
  return `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" fill="#44475a"/>
      <rect width="512" height="60" fill="#6272a4"/>
      <line x1="0" y1="60" x2="512" y2="60" stroke="#282a36" stroke-width="8"/>
      <path d="M 100,60 Q 80,200 90,350 Q 100,450 80,512" stroke="#ffb86c" stroke-width="12" stroke-dasharray="16, 8" stroke-linecap="round" fill="none" opacity="0.8"/>
      <path d="M 400,60 Q 420,180 410,300 Q 400,400 420,512" stroke="#ffb86c" stroke-width="10" stroke-dasharray="14, 8" stroke-linecap="round" fill="none" opacity="0.8"/>
    </svg>
  `;
}

// ──────────────────────────────────────────────────────────────────────────
// PANORAMA SVG GENERATOR (1920x1080)
// ──────────────────────────────────────────────────────────────────────────

function drawPanoramaScene(): string {
  return `
    <svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#8be9fd" />
          <stop offset="35%" stop-color="#6272a4" />
          <stop offset="70%" stop-color="#282a36" />
          <stop offset="100%" stop-color="#1b1c25" />
        </linearGradient>
        <radialGradient id="sunRay" cx="50%" cy="0%" r="60%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.45"/>
          <stop offset="50%" stop-color="#8be9fd" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="#6272a4" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1920" height="1080" fill="url(#bgGrad)"/>
      <polygon points="400,0 800,0 1200,1080 600,1080" fill="url(#sunRay)"/>
      <polygon points="1000,0 1400,0 1800,1080 1200,1080" fill="url(#sunRay)"/>
      <polygon points="100,0 300,0 700,1080 400,1080" fill="url(#sunRay)"/>
      <circle cx="150" cy="800" r="16" fill="#ffffff" opacity="0.15" stroke="#ffffff" stroke-width="2"/>
      <circle cx="160" cy="760" r="8" fill="#ffffff" opacity="0.15" stroke="#ffffff" stroke-width="2"/>
      <circle cx="480" cy="400" r="24" fill="#ffffff" opacity="0.15" stroke="#ffffff" stroke-width="2"/>
      <circle cx="510" cy="350" r="12" fill="#ffffff" opacity="0.15" stroke="#ffffff" stroke-width="2"/>
      <circle cx="1200" cy="600" r="20" fill="#ffffff" opacity="0.1" stroke="#ffffff" stroke-width="2"/>
      <circle cx="1220" cy="540" r="10" fill="#ffffff" opacity="0.1" stroke="#ffffff" stroke-width="2"/>
      <path d="M -50,1080 Q 200,900 350,1080 Z" fill="#ff79c6" opacity="0.8"/>
      <path d="M 150,1080 Q 300,850 450,1080 Z" fill="#bd93f9" opacity="0.8"/>
      <path d="M 80,1080 Q 50,900 120,800 Q 150,850 180,1080" fill="#ff5555"/>
      <path d="M 280,1080 Q 340,920 290,830 Q 250,910 240,1080" fill="#ff79c6"/>
      <g transform="translate(850, 450)">
        <path d="M -30,0 C -30,-30 30,-30 30,0 Z" fill="#8be9fd" opacity="0.7"/>
        <path d="M -20,10 Q -30,60 -15,100" stroke="#bd93f9" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.8"/>
        <path d="M 0,10 Q 0,80 15,110" stroke="#8be9fd" stroke-width="4.5" stroke-linecap="round" fill="none" opacity="0.8"/>
        <path d="M 20,10 Q 30,60 5,100" stroke="#bd93f9" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.8"/>
      </g>
      <g transform="translate(1100, 300) scale(0.7)">
        <path d="M -30,0 C -30,-30 30,-30 30,0 Z" fill="#ff79c6" opacity="0.7"/>
        <path d="M -20,10 Q -30,60 -10,95" stroke="#ff79c6" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.8"/>
        <path d="M 0,10 Q 10,70 -5,105" stroke="#8be9fd" stroke-width="4.5" stroke-linecap="round" fill="none" opacity="0.8"/>
        <path d="M 20,10 Q 10,60 25,95" stroke="#ff79c6" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.8"/>
      </g>
      <g transform="translate(1500, 650)">
        <path d="M 0,150 L 300,100 L 400,430 L -50,430 Z" fill="#44475a"/>
        <path d="M 50,140 Q 60,250 10,430" stroke="#282a36" stroke-width="12" fill="none"/>
        <path d="M 150,120 Q 170,250 120,430" stroke="#282a36" stroke-width="12" fill="none"/>
        <path d="M 250,110 Q 280,250 230,430" stroke="#282a36" stroke-width="12" fill="none"/>
        <rect x="120" y="-120" width="16" height="300" fill="#282a36" transform="rotate(-15)"/>
        <path d="M 120,-100 Q 60,-70 50,0 Q 120,-30 120,-100 Z" fill="#f8f8f2" opacity="0.4"/>
        <rect x="230" y="320" width="80" height="60" fill="#ffb86c" rx="5"/>
        <circle cx="250" cy="310" r="10" fill="#f1fa8c"/>
        <circle cx="270" cy="305" r="12" fill="#ffb86c"/>
        <circle cx="290" cy="310" r="8" fill="#f1fa8c"/>
      </g>
      <path d="M 0,1000 Q 400,950 960,1020 Q 1500,960 1920,1040 L 1920,1080 L 0,1080 Z" fill="#1b1c25"/>
    </svg>
  `;
}

// ──────────────────────────────────────────────────────────────────────────
// COMPILING AND ASSEMBLING ASSETS
// ──────────────────────────────────────────────────────────────────────────

async function buildCharacter(charName: string, rows: string[], svgGenerator: (frameIdx: number, rowName: any) => string) {
  console.log(`Building character: ${charName}...`);
  const runDir = path.join(CHAR_RUNS_DIR, charName);
  
  ensureDir(path.join(runDir, 'reference'));
  ensureDir(path.join(runDir, 'output'));

  // Generate Reference Frame
  const refSvg = svgGenerator(0, rows[0]);
  const refBuf = await sharp(Buffer.from(refSvg)).png().toBuffer();
  fs.writeFileSync(path.join(runDir, 'reference', 'frame_0.png'), refBuf);

  // Generate all Row Frames
  const FRAME_WIDTH = 192;
  const FRAME_HEIGHT = 208;
  const FRAME_COUNT = 9;
  
  const composites: sharp.OverlayOptions[] = [];

  for (let rIdx = 0; rIdx < rows.length; rIdx++) {
    const rowName = rows[rIdx];
    const rowDir = path.join(runDir, 'rows', rowName);
    ensureDir(rowDir);

    for (let fIdx = 0; fIdx < FRAME_COUNT; fIdx++) {
      const frameSvg = svgGenerator(fIdx, rowName as any);
      const frameBuf = await sharp(Buffer.from(frameSvg)).png().toBuffer();
      
      const frameFile = `frame_${fIdx}.png`;
      fs.writeFileSync(path.join(rowDir, frameFile), frameBuf);

      composites.push({
        input: path.join(rowDir, frameFile),
        left: fIdx * FRAME_WIDTH,
        top: rIdx * FRAME_HEIGHT
      });
    }
  }

  // Assemble Atlas
  const atlasWidth = FRAME_COUNT * FRAME_WIDTH;
  const atlasHeight = rows.length * FRAME_HEIGHT;
  const outputWebp = path.join(runDir, 'output', 'spritesheet.webp');
  const outputJson = path.join(runDir, 'output', 'char.json');

  await sharp({
    create: { width: atlasWidth, height: atlasHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite(composites)
    .webp({ quality: 90 })
    .toFile(outputWebp);

  const animations = Object.fromEntries(
    rows.map((name, idx) => [name, { row: idx, frameCount: FRAME_COUNT, fps: 8, loop: name !== 'jump' }])
  );

  const charMetadata = {
    name: charName,
    type: 'char-sprite-v1',
    dimensions: { width: atlasWidth, height: atlasHeight },
    frameSize: { width: FRAME_WIDTH, height: FRAME_HEIGHT },
    rows,
    animations
  };

  fs.writeFileSync(outputJson, JSON.stringify(charMetadata, null, 2));

  // Write Manifest for character
  const manifest = {
    name: charName,
    status: 'completed',
    created_at: new Date().toISOString(),
    frameCount: 9,
    reference: { status: 'completed', path: `char_runs/${charName}/reference` },
    rows: Object.fromEntries(rows.map(name => [name, { status: 'completed', fps: 8, loop: name !== 'jump' }]))
  };
  fs.writeFileSync(path.join(runDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`Character ${charName} built successfully.`);
}

async function buildObject(objectName: string, frameCount: number, frameSize: number, fps: number, loop: boolean, svgGenerator: (frameIdx: number) => string) {
  console.log(`Building object: ${objectName}...`);
  const runDir = path.join(OBJECT_RUNS_DIR, objectName);
  
  ensureDir(path.join(runDir, 'frames'));
  ensureDir(path.join(runDir, 'output'));

  const composites: sharp.OverlayOptions[] = [];

  for (let i = 0; i < frameCount; i++) {
    const frameSvg = svgGenerator(i);
    const frameBuf = await sharp(Buffer.from(frameSvg)).png().toBuffer();
    
    const frameFile = `frame_${i}.png`;
    fs.writeFileSync(path.join(runDir, 'frames', frameFile), frameBuf);

    composites.push({
      input: path.join(runDir, 'frames', frameFile),
      left: i * frameSize,
      top: 0
    });
  }

  const stripWidth = frameCount * frameSize;
  const stripHeight = frameSize;
  const outputWebp = path.join(runDir, 'output', 'object.webp');
  const outputJson = path.join(runDir, 'output', 'object.json');

  await sharp({
    create: { width: stripWidth, height: stripHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite(composites)
    .webp({ quality: 90 })
    .toFile(outputWebp);

  const metadata = {
    name: objectName,
    type: 'anim-object-v1',
    frameCount,
    frameSize,
    fps,
    loop,
    strip: { width: stripWidth, height: stripHeight }
  };

  fs.writeFileSync(outputJson, JSON.stringify(metadata, null, 2));

  // Write Manifest for object
  const manifest = {
    name: objectName,
    status: 'assembled',
    created_at: new Date().toISOString(),
    frameCount,
    frameSize,
    fps,
    loop,
    animation: { status: 'completed' },
    updated_at: new Date().toISOString()
  };
  fs.writeFileSync(path.join(runDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`Object ${objectName} built successfully.`);
}

async function buildTile(gameName: string, tileName: string, svgGenerator: () => string) {
  console.log(`Building tile: ${tileName}...`);
  const runDir = path.join(TEXTURE_RUNS_DIR, gameName);
  ensureDir(path.join(runDir, 'output'));

  const tileSvg = svgGenerator();
  const tileBuf = await sharp(Buffer.from(tileSvg)).png().toBuffer();
  
  const outputPng = path.join(runDir, 'output', `${tileName}_base.png`);
  fs.writeFileSync(outputPng, tileBuf);

  console.log(`Tile ${tileName} built successfully.`);
}

async function updateGlobalRegistry() {
  const registryPath = './char_runs/registry.js';
  const registry: Record<string, any> = {};

  const chars = ['MermaidPrincess', 'OctopusMonster', 'Shark'];
  for (const charName of chars) {
    const jsonPath = path.join(CHAR_RUNS_DIR, charName, 'output', 'char.json');
    if (fs.existsSync(jsonPath)) {
      const meta = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      registry[charName] = {
        ...meta,
        spritesheet: `${charName}/output/spritesheet.webp`
      };
    }
  }

  // Load existing other registry entries if possible to keep them
  if (fs.existsSync(registryPath)) {
    try {
      const src = fs.readFileSync(registryPath, 'utf-8');
      const match = src.match(/window\.CHAR_REGISTRY\s*=\s*(\{[\s\S]*\})\s*;/);
      if (match) {
        const oldRegistry = JSON.parse(match[1]);
        Object.assign(registry, oldRegistry);
      }
    } catch (e) {
      console.warn('Could not merge existing registry, replacing.', e);
    }
  }

  fs.writeFileSync(
    registryPath,
    `// Auto-generated by assemble.ts — do not edit manually\n` +
    `window.CHAR_REGISTRY = ${JSON.stringify(registry, null, 2)};\n`
  );
  console.log(`Global registry.js updated.`);
}

// Main execution function
async function main() {
  console.log('--- STARTING MERMAID ASSET GENERATION ---');
  
  // 1. Build Characters
  await buildCharacter('MermaidPrincess', ['idle', 'walk-left', 'jump'], drawMermaid);
  await buildCharacter('OctopusMonster', ['idle', 'walk-left'], drawOctopus);
  await buildCharacter('Shark', ['idle', 'walk-left'], drawShark);
  
  // 2. Build Objects
  await buildObject('pearl', 6, 128, 12, true, drawPearlFrame);
  await buildObject('jellyfish_electric', 4, 128, 10, true, drawJellyfishElectricFrame);
  await buildObject('pufferfish_spiny', 4, 128, 8, true, drawPufferfishSpinyFrame);
  await buildObject('shell_portal', 4, 128, 6, false, drawShellPortalFrame);

  // 3. Build Tiles for MermaidPrincess textureProject
  await buildTile('MermaidPrincess', 'coral_ground', drawCoralGroundTile);
  await buildTile('MermaidPrincess', 'coral_platform', drawCoralPlatformTile);
  await buildTile('MermaidPrincess', 'jellyfish_ground', drawJellyfishGroundTile);
  await buildTile('MermaidPrincess', 'jellyfish_platform', drawJellyfishPlatformTile);
  await buildTile('MermaidPrincess', 'shipwreck_ground', drawShipwreckGroundTile);
  await buildTile('MermaidPrincess', 'shipwreck_platform', drawShipwreckPlatformTile);

  // Write texture project manifest
  const textureManifest = {
    name: 'MermaidPrincess',
    status: 'assembled',
    created_at: new Date().toISOString(),
    textures: {
      'coral_ground_base.png': { material: 'coral_ground', suffix: 'base', size: 512, grid_source: 'manual', updated_at: new Date().toISOString() },
      'coral_platform_base.png': { material: 'coral_platform', suffix: 'base', size: 512, grid_source: 'manual', updated_at: new Date().toISOString() },
      'jellyfish_ground_base.png': { material: 'jellyfish_ground', suffix: 'base', size: 512, grid_source: 'manual', updated_at: new Date().toISOString() },
      'jellyfish_platform_base.png': { material: 'jellyfish_platform', suffix: 'base', size: 512, grid_source: 'manual', updated_at: new Date().toISOString() },
      'shipwreck_ground_base.png': { material: 'shipwreck_ground', suffix: 'base', size: 512, grid_source: 'manual', updated_at: new Date().toISOString() },
      'shipwreck_platform_base.png': { material: 'shipwreck_platform', suffix: 'base', size: 512, grid_source: 'manual', updated_at: new Date().toISOString() }
    },
    updated_at: new Date().toISOString()
  };
  fs.writeFileSync(
    path.join(TEXTURE_RUNS_DIR, 'MermaidPrincess', 'manifest.json'),
    JSON.stringify(textureManifest, null, 2)
  );

  // 4. Build Panorama Scene
  ensureDir(path.join(GAME_RUNS_DIR, 'MermaidPrincess', 'scene'));
  const panoSvg = drawPanoramaScene();
  const panoBuf = await sharp(Buffer.from(panoSvg)).jpeg({ quality: 90 }).toBuffer();
  fs.writeFileSync(path.join(GAME_RUNS_DIR, 'MermaidPrincess', 'scene', 'panorama.jpg'), panoBuf);
  console.log('Scene panorama.jpg generated.');

  // 5. Update Global character registry
  await updateGlobalRegistry();

  console.log('--- ASSET GENERATION COMPLETED ---');
}

main().catch(console.error);
