import fs from 'fs';
import path from 'path';
import { pt, line, circle, svg, humanoid, mergePose } from '../skills/svg-sprite/rig.mjs';

const OUT = 'game_runs/AmbientSandbox/assets/svg';
if (!fs.existsSync(OUT)) {
  fs.mkdirSync(OUT, { recursive: true });
}

const INK = '#090d16'; // 近乎全黑的暗深色，契合剪影风格
const VB = { x: -34, y: -22, w: 178, h: 190 };

const HERO = { limbW: 9, torsoW: 13, torsoLen: 30, headR: 8, ink: INK };

// 测绘观测员的特殊装备（双肩背包 + 前遮帽檐）
function surveyorExtras(j, p) {
  const hx = j.headX, hy = j.headY;
  const sx = j.shX, sy = j.shY;
  const lean = j.lean;

  // 1. 测绘背包：背在后侧的厚矩形
  const backpack = line(sx - 4, sy + 4, sx - 14, sy + 18, 10, INK);
  
  // 2. 遮阳帽檐：帽舌向前伸出
  const visorAngle = 90 - lean; // 朝向斜前方
  const pVisorStart = pt(hx, hy - 4, 4, visorAngle);
  const pVisorEnd = pt(hx, hy - 4, 11, visorAngle);
  const visor = line(pVisorStart[0], pVisorStart[1], pVisorEnd[0], pVisorEnd[1], 3, INK);
  
  return { back: backpack, front: visor };
}

function renderHero(p) {
  const drop = p.drop ?? 0;
  return svg(VB, humanoid(HERO, p, { hipX: 52, hipY: 92 + drop, extras: surveyorExtras }));
}

// 基础站姿
const G = {
  lean: 6, bob: 0, drop: 0,
  fThigh: 12, fShin: 2, bThigh: -12, bShin: -2,
  fUp: 56, fFore: 122, bUp: 52, bFore: 118,
};
const m = (o) => mergePose(G, o);

const SEQ = {};

// idle：观测员警觉呼吸（5 帧）
SEQ.idle = [
  m({ bob: 0, fFore: 122, bFore: 118 }),
  m({ bob: -1.5, lean: 7, fFore: 126, bFore: 121 }),
  m({ bob: -2.2, lean: 7, fFore: 128, bFore: 122 }),
  m({ bob: -1.5, lean: 6, fFore: 125, bFore: 120 }),
  m({ bob: -0.3, fFore: 123, bFore: 119 }),
];

// run：大迈步奔跑，左右腿与双臂严格 180° 反相交替（6 帧循环，完美步态）
SEQ.run = Array.from({ length: 6 }, (_, i) => {
  const t = i / 6 * Math.PI * 2;
  const fThigh = 34 * Math.sin(t) + 8;
  const bThigh = 34 * Math.sin(t + Math.PI) + 8; // 180° 反向，实现完美左右交替
  const fShin = fThigh - 40 * Math.max(0, Math.sin(t + 1.1));
  const bShin = bThigh - 40 * Math.max(0, Math.sin(t + Math.PI + 1.1));
  return m({
    lean: 20, 
    bob: -Math.abs(Math.cos(t)) * 3.5, // 奔跑中起伏
    fThigh, fShin, bThigh, bShin,
    // 摆臂与腿反相
    fUp: 70 - 26 * Math.sin(t), fFore: 110 - 14 * Math.sin(t),
    bUp: 70 + 26 * Math.sin(t), bFore: 110 + 14 * Math.sin(t),
  });
});

// jump：蹬地起跳（3 帧）
SEQ.jump = [
  m({ lean: 16, drop: 10, fThigh: 40, fShin: -20, bThigh: -34, bShin: 14, fUp: 100, fFore: 60, bUp: 60, bFore: 30 }),
  m({ lean: 14, bob: -4, fThigh: 56, fShin: 30, bThigh: 40, bShin: 16, fUp: 36, fFore: 80, bUp: 30, bFore: 70 }),
  m({ lean: 10, bob: -6, fThigh: 18, fShin: 6, bThigh: -18, bShin: -6, fUp: 20, fFore: 60, bUp: 18, bFore: 56 }),
];

let count = 0;
for (const [act, frames] of Object.entries(SEQ)) {
  frames.forEach((p, i) => {
    fs.writeFileSync(path.join(OUT, `hero_${act}_${i}.svg`), renderHero(p));
    count++;
  });
}
console.log(`Hero 观测员 SVG 精灵已生成：${count} 帧.`);
