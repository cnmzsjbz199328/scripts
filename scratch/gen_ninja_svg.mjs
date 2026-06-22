/* ShadowNinja 角色 SVG 生成器（替换 AI 精灵图）
 * 用 svg-sprite/rig 的参数化骨骼，做风格统一、姿态可控的剪影忍者。
 * 重点：优雅的低姿潜行(crouch/sneak)——屈膝压低、躯干前倾、一手贴近地面、平滑潜行循环，
 * 取代原 AI 帧"弯腰前折"的笨拙姿。另含 idle / run / jump / hurt，供玩法纵深(跳跃/屋脊)用。
 * 输出：game_runs/ShadowNinja/assets/svg/nj_<act>_<i>.svg
 *
 * 约定(rig)：角度 0=下 / 90=前(+x) / 180=上。所有"着地"动作脚底保持 ~y140 一致，避免抖动。
 */
import fs from 'fs';
import path from 'path';
import { pt, line, circle, svg, humanoid, mergePose } from '../skills/svg-sprite/rig.mjs';

const OUT = 'game_runs/ShadowNinja/assets/svg';
fs.mkdirSync(OUT, { recursive: true });

const INK = '#05060c';
const VB = { x: -34, y: -22, w: 178, h: 190 };

const NINJA = { limbW: 9, torsoW: 13, torsoLen: 30, headR: 8, ink: INK };

// 头巾飘带（背后层，随 scarf 量飘动）+ 蒙面小尖角
function ninjaExtras(j, p) {
  const s = p.scarf ?? 0;
  const hx = j.headX, hy = j.headY;
  // 飘带：从头后向 -x 飘出，末端随 s 上下摆
  const tail = `<path d="M ${(hx - 3).toFixed(1)} ${(hy - 2).toFixed(1)}
    q ${(-18).toFixed(1)} ${(-6 + s).toFixed(1)} ${(-34).toFixed(1)} ${(2 - s * 0.6).toFixed(1)}
    q ${(10).toFixed(1)} ${(3 + s * 0.4).toFixed(1)} ${(16).toFixed(1)} ${(6 - s * 0.3).toFixed(1)} z"
    fill="${INK}"/>`;
  // 背后忍刀（细长，斜挎）
  const sx = j.shX, sy = j.shY;
  const sword = line(sx - 2, sy - 4, sx - 16, sy - 22, 2.4, INK);
  return { back: tail + sword, front: '' };
}

// 渲染一帧：drop = 髋部下沉量（着地动作借此压低重心而脚底不变）
function ninja(p) {
  const drop = p.drop ?? 0;
  return svg(VB, humanoid(NINJA, p, { hipX: 52, hipY: 92 + drop, extras: ninjaExtras }));
}

// 基础站姿（轻微预备，重心略沉，符合忍者警觉感）
const G = {
  lean: 6, bob: 0, scarf: 0, drop: 0,
  fThigh: 12, fShin: 2, bThigh: -12, bShin: -2,
  fUp: 56, fFore: 122, bUp: 52, bFore: 118,
};
const m = (o) => mergePose(G, o);

const SEQ = {};

// idle：低警戒呼吸 + 飘带轻摆（5 帧）
SEQ.idle = [
  m({ bob: 0, scarf: 0, fFore: 122, bFore: 118 }),
  m({ bob: -1.5, scarf: 2, lean: 7, fFore: 126, bFore: 121 }),
  m({ bob: -2.2, scarf: 3, lean: 7, fFore: 128, bFore: 122 }),
  m({ bob: -1.5, scarf: 2, lean: 6, fFore: 125, bFore: 120 }),
  m({ bob: -0.3, scarf: 1, fFore: 123, bFore: 119 }),
];

// run：前倾疾奔，强摆臂强迈步（6 帧循环）
SEQ.run = Array.from({ length: 6 }, (_, i) => {
  const t = i / 6 * Math.PI * 2;
  const fThigh = 34 * Math.sin(t) + 8;
  const bThigh = 34 * Math.sin(t + Math.PI) + 8;
  const fShin = fThigh - 40 * Math.max(0, Math.sin(t + 1.1));
  const bShin = bThigh - 40 * Math.max(0, Math.sin(t + Math.PI + 1.1));
  return m({
    lean: 22, bob: -Math.abs(Math.cos(t)) * 3, scarf: 4 + 3 * Math.sin(t),
    fThigh, fShin, bThigh, bShin,
    // 摆臂与腿反相
    fUp: 70 - 26 * Math.sin(t), fFore: 110 - 14 * Math.sin(t),
    bUp: 70 + 26 * Math.sin(t), bFore: 110 + 14 * Math.sin(t),
  });
});

// crouch / prone：匍匐前进——躯干压成近水平贴地、双臂前伸划行、双腿向后拖曳交替蹬地（5 帧爬行循环）
// 设计意图（玩法）：匍匐时人极矮，够不着高处的门钥；要拾钥须在安全间隙起身/跳起。
const C = {
  lean: 82, drop: 44, scarf: 1,
  // 腿向后拖曳贴地（≈ -90 即正后方），一屈一伸交替爬行
  fThigh: -68, fShin: -118, bThigh: -96, bShin: -84,
  // 双臂前伸贴地划行
  fUp: 96, fFore: 92, bUp: 116, bFore: 86,
};
const c = (o) => mergePose(m(C), o);
SEQ.crouch = Array.from({ length: 5 }, (_, i) => {
  const t = i / 5 * Math.PI * 2;
  const s = Math.sin(t);
  return c({
    bob: 1.5 * Math.abs(Math.cos(t)),       // 贴地起伏（极小）
    fThigh: -68 - 12 * s, fShin: -118 + 10 * s,  // 双腿交替推蹬
    bThigh: -96 + 12 * s, bShin: -84 - 10 * s,
    fUp: 96 + 8 * s, fFore: 92 + 10 * s,    // 双臂交替前划
    bUp: 116 - 8 * s, bFore: 86 - 10 * s,
    scarf: 1 + s,
  });
});

// jump：蹬地蓄力 → 腾空收腿 → 顶点舒展（3 帧；脚可离地）
SEQ.jump = [
  m({ lean: 16, drop: 10, fThigh: 40, fShin: -20, bThigh: -34, bShin: 14, fUp: 100, fFore: 60, bUp: 60, bFore: 30, scarf: 0 }),
  m({ lean: 14, bob: -4, fThigh: 56, fShin: 30, bThigh: 40, bShin: 16, fUp: 36, fFore: 80, bUp: 30, bFore: 70, scarf: 6 }),
  m({ lean: 10, bob: -6, fThigh: 18, fShin: 6, bThigh: -18, bShin: -6, fUp: 20, fFore: 60, bUp: 18, bFore: 56, scarf: 9 }),
];

// hurt：受击后仰（3 帧）
SEQ.hurt = [
  m({ lean: -14, fThigh: -6, fShin: -20, bThigh: 16, bShin: 6, fUp: -24, fFore: -4, bUp: -36, bFore: -16, scarf: -4 }),
  m({ lean: -22, bob: -2, fThigh: -10, fShin: -26, bThigh: 20, bShin: 8, fUp: -34, fFore: -10, bUp: -44, bFore: -22, scarf: -6 }),
  m({ lean: -6, fUp: 30, fFore: 110, bUp: 30, bFore: 114, scarf: -2 }),
];

let count = 0;
const counts = {};
for (const [act, frames] of Object.entries(SEQ)) {
  frames.forEach((p, i) => { fs.writeFileSync(path.join(OUT, `nj_${act}_${i}.svg`), ninja(p)); count++; });
  counts[act] = frames.length;
}
console.log(`ShadowNinja 忍者 SVG 已生成：${count} 帧 →`, JSON.stringify(counts));
console.log('viewBox:', JSON.stringify(VB));
