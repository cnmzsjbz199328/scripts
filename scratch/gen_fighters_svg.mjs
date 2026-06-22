/* ShadowArena 格斗角色 SVG 生成器（多帧飘逸版）
 * 复用参数化骨骼(pt/limb + 绝对关节角度)。每个招式输出"关键帧序列"
 * (预备→发力→过头→收招)，使动作连贯飘逸，而非单帧定格。
 * 4 角色 × 多帧动作；明亮舞台 + 手里剑 / 气功波。全部纯 SVG。
 * 输出：game_runs/ShadowArena/assets/svg/
 */
import fs from 'fs';
import path from 'path';
import { tween, stagger, ease } from '../skills/svg-sprite/rig.mjs';

const OUT = 'game_runs/ShadowArena/assets/svg';
fs.mkdirSync(OUT, { recursive: true });

const INK = '#0a0c12';
const rad = d => d * Math.PI / 180;
const pt = (x, y, len, deg) => [x + len * Math.sin(rad(deg)), y + len * Math.cos(rad(deg))];
const line = (x1, y1, x2, y2, w) => `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${INK}" stroke-width="${w}" stroke-linecap="round"/>`;
const circle = (x, y, r) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${INK}"/>`;

const VB = { x: -52, y: -20, w: 236, h: 188 };
const wrap = inner => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB.x} ${VB.y} ${VB.w} ${VB.h}" width="${VB.w}" height="${VB.h}">${inner}</svg>`;

const CHARS = {
  samurai: { limbW: 11, torsoW: 18, torsoLen: 32, headR: 9, head: 'topknot', weapon: 'sword' },
  ninja: { limbW: 9, torsoW: 14, torsoLen: 32, headR: 8.5, head: 'scarf', weapon: null },
  monk: { limbW: 12, torsoW: 20, torsoLen: 31, headR: 10, head: 'bald', robe: true, weapon: null },
  brawler: { limbW: 16, torsoW: 28, torsoLen: 30, headR: 12, head: 'bald', big: true, weapon: null },
};

function fighter(c, p) {
  const bob = p.bob || 0, lean = p.lean || 0;
  const hipX = 52 + (p.hipDx || 0), hipY = 92 + bob;
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

  let headExtra = '';
  if (c.head === 'topknot') { const [tx, ty] = pt(headX, headY, c.headR + 2, 180 - lean); headExtra = circle(tx, ty, 3.5); }
  else if (c.head === 'scarf') headExtra = `<path d="M ${headX.toFixed(1)} ${headY.toFixed(1)} q -16 -3 -26 5 q 12 -2 20 3 z" fill="${INK}"/>`;
  const robe = c.robe ? `<path d="M ${hipX - 11} ${hipY} L ${hipX + 11} ${hipY} L ${hipX + 19} ${hipY + 26} L ${hipX - 19} ${hipY + 26} Z" fill="${INK}"/>` : '';
  const sword = c.weapon === 'sword' ? (() => { const [tx, ty] = pt(fHx, fHy, 46, p.fFore); return line(fHx, fHy, tx, ty, 4); })() : '';
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

// 关键姿态（绝对角度：0=下，90=前/+x，180=上）
const G = { lean: 6, bob: 0, fThigh: 12, fShin: 4, bThigh: -12, bShin: -4, fUp: 58, fFore: 128, bUp: 54, bFore: 124 };
const m = (o) => ({ ...G, ...o });

// 多帧序列（每个动作 = 关键帧数组，依序播放即连贯）
const SEQ = {};
// idle：轻柔呼吸 + 持械微摆（4 帧）
SEQ.idle = [
  m({ bob: 0, fFore: 128, bFore: 124 }),
  m({ bob: -2, fFore: 133, bFore: 128, lean: 7 }),
  m({ bob: -3, fFore: 135, bFore: 130, lean: 7 }),
  m({ bob: -1, fFore: 131, bFore: 126 }),
];
// walk：6 帧腿部循环（手维持架势带微摆）
SEQ.walk = Array.from({ length: 6 }, (_, i) => {
  const t = i / 6 * Math.PI * 2;
  const fThigh = 30 * Math.sin(t), bThigh = 30 * Math.sin(t + Math.PI);
  const fShin = fThigh - 36 * Math.max(0, Math.sin(t + 1.0));
  const bShin = bThigh - 36 * Math.max(0, Math.sin(t + Math.PI + 1.0));
  return m({ lean: 8, bob: -Math.abs(Math.cos(t)) * 3, fThigh, fShin, bThigh, bShin, fFore: 128 - 6 * Math.sin(t), bFore: 124 + 6 * Math.sin(t) });
});
// punch：三件套重做版——稀疏极限帧 → favoring 补间 → 关节滞后(鞭打)
//   治僵硬：hipDx 重心后坐→前冲；逐段帧数让"蓄力慢/命中急"；fFore 滞后上臂=甩拳。
const PUNCH_KEYS = [
  m({}),                                                                                  // 架势
  m({ lean: -4, bob: 1, fThigh: 10, bThigh: -16, bShin: -8, fUp: 36, fFore: 56, bUp: 64, bFore: 134, hipDx: -5 }), // 预备：收拳后引、重心后坐、髋蓄
  m({ lean: 22, fThigh: 26, fShin: 10, bThigh: -26, bShin: -12, fUp: 94, fFore: 96, bUp: 46, bFore: 116, hipDx: 10 }), // 命中：伸直爆发、重心前冲
  m({ lean: 25, bob: -1, fThigh: 28, fShin: 11, bThigh: -26, bShin: -12, fUp: 99, fFore: 100, bUp: 44, bFore: 114, hipDx: 13 }), // 过头：略过靶点
  m({ lean: 10, fUp: 70, fFore: 120, bUp: 54, bFore: 122, hipDx: 3 }),                     // 收招：回架势、重心回中
];
// 逐段帧数 [蓄4慢, 发力2急, 过头1, 收招3] + smoothstep；再让前/后臂滞后 1 帧 = 鞭打
SEQ.punch = stagger(tween(PUNCH_KEYS, [4, 2, 1, 3], { ease: ease.smooth }), { fFore: 1, bFore: 1 });
// kick：架势→提膝蓄力→高扫踢出→过头→收腿（5 帧）
SEQ.kick = [
  m({}),
  m({ lean: -2, fThigh: 38, fShin: 84, bThigh: -12, fUp: 34, fFore: 96, bUp: -8, bFore: 52 }),
  m({ lean: -10, fThigh: 76, fShin: 90, bThigh: -16, bShin: -8, fUp: 22, fFore: 90, bUp: -26, bFore: 38 }),
  m({ lean: -12, fThigh: 84, fShin: 96, bThigh: -16, bShin: -8, fUp: 20, fFore: 88, bUp: -30, bFore: 34 }),
  m({ lean: 2, fThigh: 18, fShin: 6, fUp: 44, fFore: 112, bUp: 44, bFore: 120 }),
];
// block：2 帧（沉身格挡微沉）
SEQ.block = [
  m({ bob: 2, fUp: 72, fFore: 150, bUp: 70, bFore: 146, fThigh: 14, fShin: 8, bThigh: -14, bShin: -8 }),
  m({ bob: 3, fUp: 73, fFore: 152, bUp: 71, bFore: 148, fThigh: 14, fShin: 8, bThigh: -14, bShin: -8 }),
];
// hurt：3 帧（受击后仰→深仰→回稳）
SEQ.hurt = [
  m({ lean: -16, fThigh: -6, fShin: -22, bThigh: 18, bShin: 8, fUp: -28, fFore: -6, bUp: -42, bFore: -18 }),
  m({ lean: -26, bob: -2, fThigh: -10, fShin: -28, bThigh: 22, bShin: 10, fUp: -38, fFore: -12, bUp: -50, bFore: -24 }),
  m({ lean: -8, fUp: 30, fFore: 110, bUp: 30, bFore: 116 }),
];
// special：架势→深蓄力(后引)→聚气→爆发前推→过头→收势（6 帧）
SEQ.special = [
  m({}),
  m({ lean: -12, bob: 1, fThigh: 18, bThigh: -26, bShin: -12, fUp: -42, fFore: -18, bUp: -52, bFore: -26 }),
  m({ lean: -16, bob: 2, fUp: -30, fFore: 4, bUp: -40, bFore: -8 }),
  m({ lean: 18, fThigh: 26, fShin: 12, bThigh: -22, bShin: -10, fUp: 90, fFore: 90, bUp: 84, bFore: 84 }),
  m({ lean: 22, bob: -1, fUp: 95, fFore: 95, bUp: 89, bFore: 89 }),
  m({ lean: 12, fUp: 74, fFore: 118, bUp: 60, bFore: 120 }),
];
// ko：3 帧（踉跄→后倒→倒地）
SEQ.ko = [
  m({ lean: -28, bob: 2, fThigh: -16, fShin: -8, bThigh: 18, bShin: 6, fUp: -40, fFore: -20, bUp: -50, bFore: -28 }),
  m({ lean: -48, bob: 7, fThigh: -34, fShin: -16, bThigh: -30, bShin: -14, fUp: -64, fFore: -44, bUp: -74, bFore: -54 }),
  m({ lean: -64, bob: 12, fThigh: -44, fShin: -24, bThigh: -54, bShin: -32, fUp: -74, fFore: -56, bUp: -82, bFore: -64 }),
];

let count = 0;
for (const [id, c] of Object.entries(CHARS)) {
  for (const [act, frames] of Object.entries(SEQ)) {
    frames.forEach((p, i) => { fs.writeFileSync(path.join(OUT, `${id}_${act}_${i}.svg`), fighter(c, p)); count++; });
  }
}

// 投射物
fs.writeFileSync(path.join(OUT, 'shuriken.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <polygon points="12,0 15,9 24,12 15,15 12,24 9,15 0,12 9,9" fill="${INK}"/>
  <circle cx="12" cy="12" r="2.4" fill="#dfe6ef"/></svg>`);
fs.writeFileSync(path.join(OUT, 'qiwave.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 36" width="44" height="36">
  <defs><radialGradient id="q" cx="40%" cy="50%" r="60%">
    <stop offset="0%" stop-color="#ffffff"/><stop offset="40%" stop-color="#7fe6dd"/>
    <stop offset="100%" stop-color="#19a99c" stop-opacity="0"/></radialGradient></defs>
  <ellipse cx="20" cy="18" rx="20" ry="15" fill="url(#q)"/>
  <ellipse cx="16" cy="18" rx="7" ry="11" fill="#ffffff" opacity="0.9"/></svg>`);

// 明亮黎明舞台
fs.writeFileSync(path.join(OUT, 'stage.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" width="960" height="540">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#bfe0f0"/><stop offset="45%" stop-color="#ffe6b8"/>
      <stop offset="78%" stop-color="#ffc98a"/><stop offset="100%" stop-color="#f3aa6e"/></linearGradient>
    <radialGradient id="sun" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fffdf2"/><stop offset="55%" stop-color="#fff0c0"/>
      <stop offset="100%" stop-color="#ffe6b8" stop-opacity="0"/></radialGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#b9a892"/><stop offset="100%" stop-color="#8a7866"/></linearGradient>
  </defs>
  <rect width="960" height="540" fill="url(#sky)"/>
  <circle cx="480" cy="250" r="150" fill="url(#sun)"/><circle cx="480" cy="250" r="58" fill="#fffdf0"/>
  <g fill="#caa9a0" opacity="0.5"><path d="M0 360 L150 250 L320 360 Z"/><path d="M260 360 L470 220 L700 360 Z"/><path d="M620 360 L820 260 L960 360 Z"/></g>
  <g fill="#7d6a74" opacity="0.7"><rect x="120" y="300" width="40" height="90"/><path d="M110 300 L140 270 L170 300 Z"/>
    <rect x="770" y="290" width="46" height="100"/><path d="M760 290 L793 256 L826 290 Z"/><path d="M793 256 L793 236" stroke="#7d6a74" stroke-width="4"/></g>
  <g fill="#4a4350" opacity="0.8"><rect x="40" y="330" width="10" height="80"/><circle cx="45" cy="322" r="22"/>
    <rect x="910" y="330" width="10" height="80"/><circle cx="915" cy="322" r="22"/></g>
  <rect x="0" y="392" width="960" height="148" fill="url(#floor)"/><rect x="0" y="392" width="960" height="6" fill="#cdbfa8"/>
  <g stroke="#7a6a58" stroke-width="1.5" opacity="0.5"><line x1="120" y1="398" x2="120" y2="540"/><line x1="300" y1="398" x2="300" y2="540"/>
    <line x1="480" y1="398" x2="480" y2="540"/><line x1="660" y1="398" x2="660" y2="540"/><line x1="840" y1="398" x2="840" y2="540"/><line x1="0" y1="460" x2="960" y2="460"/></g>
</svg>`);

const counts = Object.fromEntries(Object.entries(SEQ).map(([k, v]) => [k, v.length]));
console.log(`ShadowArena 多帧 SVG 已生成：角色帧 ${count} + 投射物 2 + 舞台 1`);
console.log('每动作帧数:', JSON.stringify(counts));
