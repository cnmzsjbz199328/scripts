/* ShadowArena 格斗角色 SVG 生成器
 * 复用 MoonRonin 的参数化骨骼思路（pt/limb + 关节角度），改为"绝对角度"更易摆格斗姿态。
 * 4 个角色(武士/影忍/武僧/力士) × 姿态(idle/walk/punch/kick/block/hurt/special/ko)，
 * 以及明亮黎明舞台背景 + 手里剑 / 气功波 投射物。全部纯 SVG。
 * 输出：game_runs/ShadowArena/assets/svg/
 */
import fs from 'fs';
import path from 'path';

const OUT = 'game_runs/ShadowArena/assets/svg';
fs.mkdirSync(OUT, { recursive: true });

const INK = '#0a0c12';
const rad = d => d * Math.PI / 180;
const pt = (x, y, len, deg) => [x + len * Math.sin(rad(deg)), y + len * Math.cos(rad(deg))];
const line = (x1, y1, x2, y2, w) => `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${INK}" stroke-width="${w}" stroke-linecap="round"/>`;
const circle = (x, y, r) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${INK}"/>`;

// 帧画布：留足挥拳/踢腿/持刀的边距
const VB = { x: -44, y: -18, w: 220, h: 184 };
const wrap = inner => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB.x} ${VB.y} ${VB.w} ${VB.h}" width="${VB.w}" height="${VB.h}">${inner}</svg>`;

// 角色定义（靠剪影外形区分）
const CHARS = {
  samurai: { limbW: 11, torsoW: 18, torsoLen: 32, headR: 9, head: 'topknot', weapon: 'sword' },
  ninja: { limbW: 9, torsoW: 14, torsoLen: 32, headR: 8.5, head: 'scarf', weapon: null },
  monk: { limbW: 12, torsoW: 20, torsoLen: 31, headR: 10, head: 'bald', robe: true, weapon: null },
  brawler: { limbW: 16, torsoW: 28, torsoLen: 30, headR: 12, head: 'bald', big: true, weapon: null },
};

// 姿态：全部用绝对角度（0=正下方，90=正前/+x，180=正上）
const POSES = {
  idle_0: { lean: 6, fThigh: 12, fShin: 4, bThigh: -12, bShin: -4, fUp: 58, fFore: 128, bUp: 54, bFore: 124 },
  idle_1: { lean: 6, bob: -2, fThigh: 12, fShin: 4, bThigh: -12, bShin: -4, fUp: 58, fFore: 132, bUp: 54, bFore: 128 },
  walk_0: { lean: 8, bob: -1, fThigh: 26, fShin: 16, bThigh: -22, bShin: -34, fUp: 58, fFore: 126, bUp: 54, bFore: 122 },
  walk_1: { lean: 8, bob: -3, fThigh: -20, fShin: -34, bThigh: 24, bShin: 14, fUp: 58, fFore: 126, bUp: 54, bFore: 122 },
  punch: { lean: 16, fThigh: 16, fShin: 6, bThigh: -20, bShin: -8, fUp: 92, fFore: 92, bUp: 60, bFore: 132 },
  kick: { lean: -8, fThigh: 72, fShin: 84, bThigh: -14, bShin: -6, fUp: 30, fFore: 96, bUp: -20, bFore: 40 },
  block: { lean: 8, bob: 3, fThigh: 14, fShin: 8, bThigh: -14, bShin: -8, fUp: 72, fFore: 150, bUp: 70, bFore: 146 },
  hurt: { lean: -24, bob: -2, fThigh: -10, fShin: -28, bThigh: 22, bShin: 10, fUp: -34, fFore: -8, bUp: -48, bFore: -22 },
  special_0: { lean: -10, fThigh: 18, fShin: 8, bThigh: -26, bShin: -12, fUp: -42, fFore: -18, bUp: -52, bFore: -26 },
  special_1: { lean: 18, fThigh: 26, fShin: 12, bThigh: -22, bShin: -10, fUp: 90, fFore: 90, bUp: 84, bFore: 84 },
  ko: { lean: -62, bob: 10, fThigh: -42, fShin: -22, bThigh: -52, bShin: -30, fUp: -70, fFore: -50, bUp: -80, bFore: -60 },
};

function fighter(c, p) {
  const bob = p.bob || 0, lean = p.lean || 0;
  const hipX = 52, hipY = 92 + bob;
  const [neckX, neckY] = pt(hipX, hipY, c.torsoLen, 180 - lean);
  const shX = neckX, shY = neckY + 4;
  const [headX, headY] = pt(neckX, neckY, c.headR + 3, 180 - lean);
  const [fKx, fKy] = pt(hipX, hipY, 24, p.fThigh);
  const [fFx, fFy] = pt(fKx, fKy, 24, p.fShin);
  const [bKx, bKy] = pt(hipX, hipY, 24, p.bThigh);
  const [bFx, bFy] = pt(bKx, bKy, 24, p.bShin);
  const [fEx, fEy] = pt(shX, shY, 18, p.fUp);
  const [fHx, fHy] = pt(fEx, fEy, 16, p.fFore);
  const [bEx, bEy] = pt(shX, shY, 18, p.bUp);
  const [bHx, bHy] = pt(bEx, bEy, 16, p.bFore);
  const lw = c.limbW;

  // 头部装饰
  let headExtra = '';
  if (c.head === 'topknot') { const [tx, ty] = pt(headX, headY, c.headR + 2, 180 - lean); headExtra = circle(tx, ty, 3.5); }
  else if (c.head === 'scarf') headExtra = `<path d="M ${headX.toFixed(1)} ${headY.toFixed(1)} q -16 -3 -26 5 q 12 -2 20 3 z" fill="${INK}"/>`;
  // 僧袍裙摆
  const robe = c.robe ? `<path d="M ${hipX - 11} ${hipY} L ${hipX + 11} ${hipY} L ${hipX + 19} ${hipY + 26} L ${hipX - 19} ${hipY + 26} Z" fill="${INK}"/>` : '';
  // 武士刀（自前手沿前臂延伸）
  const sword = c.weapon === 'sword' ? (() => { const [tx, ty] = pt(fHx, fHy, 44, p.fFore); return line(fHx, fHy, tx, ty, 4); })() : '';
  // 力士大肚
  const belly = c.big ? `<ellipse cx="${(hipX + (neckX - hipX) * 0.4).toFixed(1)}" cy="${(hipY - 14).toFixed(1)}" rx="13" ry="15" fill="${INK}"/>` : '';

  return wrap(`
    ${line(hipX, hipY, bKx, bKy, lw)}${line(bKx, bKy, bFx, bFy, lw - 2)}
    ${line(shX, shY, bEx, bEy, lw - 2)}${line(bEx, bEy, bHx, bHy, lw - 3)}${circle(bHx, bHy, lw * 0.55)}
    ${robe}
    ${line(hipX, hipY, neckX, neckY, c.torsoW)}${belly}
    ${circle(headX, headY, c.headR)}${headExtra}
    ${line(hipX, hipY, fKx, fKy, lw + 1)}${line(fKx, fKy, fFx, fFy, lw - 1)}
    ${line(shX, shY, fEx, fEy, lw)}${line(fEx, fEy, fHx, fHy, lw - 1)}${circle(fHx, fHy, lw * 0.75)}
    ${sword}
  `);
}

let count = 0;
for (const [id, c] of Object.entries(CHARS)) {
  for (const [pose, p] of Object.entries(POSES)) {
    fs.writeFileSync(path.join(OUT, `${id}_${pose}.svg`), fighter(c, p)); count++;
  }
}

// ── 投射物 ──
// 手里剑（影忍）24x24 黑色四角星
fs.writeFileSync(path.join(OUT, 'shuriken.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <polygon points="12,0 15,9 24,12 15,15 12,24 9,15 0,12 9,9" fill="${INK}"/>
  <circle cx="12" cy="12" r="2.4" fill="#dfe6ef"/></svg>`);
// 气功波（武僧）44x36 青白能量
fs.writeFileSync(path.join(OUT, 'qiwave.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 36" width="44" height="36">
  <defs><radialGradient id="q" cx="40%" cy="50%" r="60%">
    <stop offset="0%" stop-color="#ffffff"/><stop offset="40%" stop-color="#7fe6dd"/>
    <stop offset="100%" stop-color="#19a99c" stop-opacity="0"/></radialGradient></defs>
  <ellipse cx="20" cy="18" rx="20" ry="15" fill="url(#q)"/>
  <ellipse cx="16" cy="18" rx="7" ry="11" fill="#ffffff" opacity="0.9"/></svg>`);

// ── 明亮黎明舞台背景 960x540 ──
fs.writeFileSync(path.join(OUT, 'stage.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" width="960" height="540">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#bfe0f0"/><stop offset="45%" stop-color="#ffe6b8"/>
      <stop offset="78%" stop-color="#ffc98a"/><stop offset="100%" stop-color="#f3aa6e"/>
    </linearGradient>
    <radialGradient id="sun" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fffdf2"/><stop offset="55%" stop-color="#fff0c0"/>
      <stop offset="100%" stop-color="#ffe6b8" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#b9a892"/><stop offset="100%" stop-color="#8a7866"/>
    </linearGradient>
  </defs>
  <rect width="960" height="540" fill="url(#sky)"/>
  <circle cx="480" cy="250" r="150" fill="url(#sun)"/>
  <circle cx="480" cy="250" r="58" fill="#fffdf0"/>
  <!-- 远山(淡) -->
  <g fill="#caa9a0" opacity="0.5">
    <path d="M0 360 L150 250 L320 360 Z"/><path d="M260 360 L470 220 L700 360 Z"/><path d="M620 360 L820 260 L960 360 Z"/>
  </g>
  <!-- 中景塔影(中等深，不至太暗) -->
  <g fill="#7d6a74" opacity="0.7">
    <rect x="120" y="300" width="40" height="90"/><path d="M110 300 L140 270 L170 300 Z"/>
    <rect x="770" y="290" width="46" height="100"/><path d="M760 290 L793 256 L826 290 Z"/>
    <path d="M793 256 L793 236" stroke="#7d6a74" stroke-width="4"/>
  </g>
  <!-- 近景树影 -->
  <g fill="#4a4350" opacity="0.8">
    <rect x="40" y="330" width="10" height="80"/><circle cx="45" cy="322" r="22"/>
    <rect x="910" y="330" width="10" height="80"/><circle cx="915" cy="322" r="22"/>
  </g>
  <!-- 石台地面 -->
  <rect x="0" y="392" width="960" height="148" fill="url(#floor)"/>
  <rect x="0" y="392" width="960" height="6" fill="#cdbfa8"/>
  <g stroke="#7a6a58" stroke-width="1.5" opacity="0.5">
    <line x1="120" y1="398" x2="120" y2="540"/><line x1="300" y1="398" x2="300" y2="540"/>
    <line x1="480" y1="398" x2="480" y2="540"/><line x1="660" y1="398" x2="660" y2="540"/><line x1="840" y1="398" x2="840" y2="540"/>
    <line x1="0" y1="460" x2="960" y2="460"/>
  </g>
</svg>`);

console.log(`ShadowArena SVG 已生成：角色帧 ${count} + 投射物 2 + 舞台 1 = ${count + 3} 个文件`);
console.log('角色:', Object.keys(CHARS).join(', '), '| 姿态:', Object.keys(POSES).join(', '));
