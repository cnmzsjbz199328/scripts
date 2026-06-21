/* MoonRonin SVG 资产生成器
 * 用"骨骼 + 关节角度"参数化生成剪影浪人的序列帧 SVG（idle/run/jump），
 * 以及屋脊瓦片 / 月光 / 夜枭 SVG。全部纯 SVG 产物。
 * 输出：game_runs/MoonRonin/assets/svg/
 */
import fs from 'fs';
import path from 'path';

const OUT = 'game_runs/MoonRonin/assets/svg';
fs.mkdirSync(OUT, { recursive: true });

const INK = '#05060c';        // 近黑剪影
const W = 96, H = 128;

// 角度约定：0=正下方(+y)，正值偏向 +x(朝右/前)，180=正上方
const rad = d => d * Math.PI / 180;
const pt = (x, y, len, deg) => [x + len * Math.sin(rad(deg)), y + len * Math.cos(rad(deg))];

function limb(x1, y1, x2, y2, w) {
  return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${INK}" stroke-width="${w}" stroke-linecap="round"/>`;
}

// 画一个浪人姿态。参数为各关节角度(度)。facing right。
function ronin({ bob = 0, lean = 14,
  fThigh = 0, fKnee = 0, bThigh = 0, bKnee = 0,
  fArm = 0, fElbow = 20, bArm = 0, bElbow = 20, swordDeg = null }) {
  const hipX = 46, hipY = 84 + bob;
  // 躯干（向前微倾）
  const [neckX, neckY] = pt(hipX, hipY, 30, 180 - lean);
  const shoulderX = neckX, shoulderY = neckY + 4;
  // 头
  const [headX, headY] = pt(neckX, neckY, 11, 180 - lean);
  // 腿：大腿→膝→小腿(相对回折)
  const [fKneeX, fKneeY] = pt(hipX, hipY, 24, fThigh);
  const [fFootX, fFootY] = pt(fKneeX, fKneeY, 24, fThigh - fKnee);
  const [bKneeX, bKneeY] = pt(hipX, hipY, 24, bThigh);
  const [bFootX, bFootY] = pt(bKneeX, bKneeY, 24, bThigh - bKnee);
  // 臂：上臂→肘→前臂
  const [fElX, fElY] = pt(shoulderX, shoulderY, 18, fArm);
  const [fHandX, fHandY] = pt(fElX, fElY, 16, fArm - fElbow);
  const [bElX, bElY] = pt(shoulderX, shoulderY, 18, bArm);
  const [bHandX, bHandY] = pt(bElX, bElY, 16, bArm - bElbow);
  // 刀：swordDeg 为 null 时背刀，否则握于前手挥砍
  let swordLine;
  if (swordDeg === null) {
    const [swA0x, swA0y] = pt(shoulderX, shoulderY, 6, 60 - lean);
    const [swA1x, swA1y] = pt(shoulderX, shoulderY, 40, 200 - lean);
    swordLine = `<line x1="${swA0x.toFixed(1)}" y1="${swA0y.toFixed(1)}" x2="${swA1x.toFixed(1)}" y2="${swA1y.toFixed(1)}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
  } else {
    const [tipX, tipY] = pt(fHandX, fHandY, 40, swordDeg);
    swordLine = `<line x1="${fHandX.toFixed(1)}" y1="${fHandY.toFixed(1)}" x2="${tipX.toFixed(1)}" y2="${tipY.toFixed(1)}" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
  }

  return `
  <!-- 后肢/后臂(略浅以分层，仍近黑) -->
  ${limb(hipX, hipY, bKneeX, bKneeY, 11)}
  ${limb(bKneeX, bKneeY, bFootX, bFootY, 9)}
  ${limb(shoulderX, shoulderY, bElX, bElY, 9)}
  ${limb(bElX, bElY, bHandX, bHandY, 8)}
  <!-- 刀 -->
  ${swordLine}
  <!-- 躯干 -->
  <line x1="${hipX}" y1="${hipY.toFixed(1)}" x2="${neckX.toFixed(1)}" y2="${neckY.toFixed(1)}" stroke="${INK}" stroke-width="18" stroke-linecap="round"/>
  <!-- 头 + 头巾尾 -->
  <circle cx="${headX.toFixed(1)}" cy="${headY.toFixed(1)}" r="10" fill="${INK}"/>
  <path d="M ${headX.toFixed(1)} ${headY.toFixed(1)} q -14 -2 -22 6 q 10 -2 18 2 z" fill="${INK}"/>
  <!-- 前肢/前臂 -->
  ${limb(hipX, hipY, fKneeX, fKneeY, 12)}
  ${limb(fKneeX, fKneeY, fFootX, fFootY, 10)}
  ${limb(shoulderX, shoulderY, fElX, fElY, 10)}
  ${limb(fElX, fElY, fHandX, fHandY, 9)}
  `;
}

function svg(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${inner}</svg>`;
}
function write(name, inner) {
  fs.writeFileSync(path.join(OUT, name), svg(inner));
}

// ── idle（3 帧轻微呼吸 + 站立持刀） ──
for (let i = 0; i < 3; i++) {
  const b = [0, -1.5, -0.5][i];
  write(`ronin_idle_${i}.svg`, ronin({
    bob: b, lean: 8,
    fThigh: 8, fKnee: 6, bThigh: -8, bKnee: 8,
    fArm: 10, fElbow: 25, bArm: -6, bElbow: 30,
  }));
}

// ── run（6 帧循环） ──
for (let i = 0; i < 6; i++) {
  const t = (i / 6) * Math.PI * 2;
  const fThigh = 34 * Math.sin(t);
  const bThigh = 34 * Math.sin(t + Math.PI);
  const fKnee = 55 * Math.max(0, Math.sin(t + 1.1));
  const bKnee = 55 * Math.max(0, Math.sin(t + Math.PI + 1.1));
  const bob = -Math.abs(Math.cos(t)) * 3;
  write(`ronin_run_${i}.svg`, ronin({
    bob, lean: 18,
    fThigh, fKnee, bThigh, bKnee,
    fArm: 28 * Math.sin(t + Math.PI), fElbow: 45,
    bArm: 28 * Math.sin(t), bElbow: 45,
  }));
}

// ── jump（3 帧：蹲→腾空→下落） ──
write('ronin_jump_0.svg', ronin({ bob: 4, lean: 22, fThigh: 30, fKnee: 60, bThigh: 18, bKnee: 60, fArm: -20, fElbow: 30, bArm: -30, bElbow: 20 }));
write('ronin_jump_1.svg', ronin({ bob: -6, lean: 14, fThigh: 40, fKnee: 70, bThigh: -34, bKnee: 30, fArm: -60, fElbow: 20, bArm: 40, bElbow: 20 }));
write('ronin_jump_2.svg', ronin({ bob: -2, lean: 16, fThigh: 20, fKnee: 40, bThigh: -20, bKnee: 50, fArm: -30, fElbow: 30, bArm: 20, bElbow: 30 }));

// ── slash（3 帧挥刀：抬刀蓄力 → 前劈 → 收势） ──
write('ronin_slash_0.svg', ronin({ bob: -1, lean: 10, fThigh: 22, fKnee: 22, bThigh: -26, bKnee: 32, fArm: -75, fElbow: 8, bArm: -20, bElbow: 30, swordDeg: 210 }));
write('ronin_slash_1.svg', ronin({ bob: 1, lean: 20, fThigh: 26, fKnee: 24, bThigh: -22, bKnee: 30, fArm: 72, fElbow: 6, bArm: 20, bElbow: 25, swordDeg: 78 }));
write('ronin_slash_2.svg', ronin({ bob: 0, lean: 14, fThigh: 20, fKnee: 20, bThigh: -20, bKnee: 28, fArm: 40, fElbow: 22, bArm: 5, bElbow: 30, swordDeg: 105 }));

// ── 屋脊瓦片 tile_roof（64x64，水平可拼接） ──
write('tile_roof.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect x="0" y="20" width="64" height="44" fill="${INK}"/>
  <path d="M -2 22 Q 32 8 66 22 L 66 30 L -2 30 Z" fill="#04050a"/>
  <line x1="0" y1="30" x2="64" y2="30" stroke="#10131f" stroke-width="1.5" opacity="0.7"/>
  <g stroke="#0c0f18" stroke-width="1.4" opacity="0.6">
    <line x1="10" y1="32" x2="10" y2="62"/><line x1="22" y1="32" x2="22" y2="62"/>
    <line x1="34" y1="32" x2="34" y2="62"/><line x1="46" y1="32" x2="46" y2="62"/><line x1="56" y1="32" x2="56" y2="62"/>
  </g>
  <circle cx="6" cy="26" r="2.2" fill="#0c0f18"/><circle cx="58" cy="26" r="2.2" fill="#0c0f18"/>
</svg>`);

// ── 支撑梁瓦片 tile_beam（64x64，屋脊下方填充/碰撞） ──
write('tile_beam.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect x="0" y="0" width="64" height="64" fill="#04050a"/>
  <g stroke="#0b0e16" stroke-width="2" opacity="0.7">
    <line x1="16" y1="0" x2="16" y2="64"/><line x1="48" y1="0" x2="48" y2="64"/>
    <line x1="0" y1="32" x2="64" y2="32"/>
  </g>
</svg>`);

// ── 月光 orb（24x24，暖色辉光） ──
write('orb.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <defs><radialGradient id="g" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="#fffbe8"/><stop offset="45%" stop-color="#ffe9a8"/>
    <stop offset="100%" stop-color="#ffd27a" stop-opacity="0"/></radialGradient></defs>
  <circle cx="12" cy="12" r="11" fill="url(#g)"/>
  <circle cx="12" cy="12" r="3.2" fill="#fffef5"/>
</svg>`);

// ── 夜枭 crow（2 帧扑翅，28x22 黑色剪影） ──
function crow(wingUp) {
  const wy = wingUp ? 4 : 14;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 22" width="28" height="22">
  <ellipse cx="14" cy="13" rx="6" ry="4" fill="${INK}"/>
  <circle cx="20" cy="11" r="3" fill="${INK}"/>
  <polygon points="22,10 27,8 23,12" fill="${INK}"/>
  <path d="M 12 12 Q 4 ${wy} 1 ${wy + 2} Q 6 13 12 13 Z" fill="${INK}"/>
  <path d="M 16 12 Q 24 ${wy} 27 ${wy + 2} Q 22 13 16 13 Z" fill="${INK}"/>
</svg>`;
}
write('crow_0.svg', crow(true));
write('crow_1.svg', crow(false));

console.log('MoonRonin SVG 资产已生成：', fs.readdirSync(OUT).length, '个文件');
console.log(fs.readdirSync(OUT).join(', '));
