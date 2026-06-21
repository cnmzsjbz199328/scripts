/* svg-sprite/rig.mjs — 参数化骨骼 + 逐帧 SVG 序列帧库
 *
 * 用于剪影 / 几何 / 线条风格游戏的角色与物件动画。
 * 核心理念：每帧 = 一张独立 SVG（不切割），姿态 = 绝对关节角度的参数集，
 * 招式 = 关键帧数组（预备→发力→过头→收招）。在 MoonRonin / ShadowArena 验证。
 *
 * 用法（Node 生成器里 import）：
 *   import { rad, pt, line, circle, svg, mergePose, lerpPose, tween, writeFrames } from '../../skills/svg-sprite/rig.mjs';
 *
 * 角度约定（关键！全项目统一）：0=向下，90=向前/+x，180=向上。
 *   pt(x,y,len,deg) 从 (x,y) 出发、长 len、朝 deg 方向，返回末端 [x2,y2]。
 *   关节用"绝对世界角度"而非相对父骨骼角度——摆姿态时直接可读、好调。
 */

export const rad = d => d * Math.PI / 180;

/** 从 (x,y) 沿 deg 方向（0下/90前/180上）伸出 len，返回末端坐标 */
export const pt = (x, y, len, deg) => [x + len * Math.sin(rad(deg)), y + len * Math.cos(rad(deg))];

/** 圆头粗线段——肢体/武器的基本笔画 */
export const line = (x1, y1, x2, y2, w, ink = '#0a0c12') =>
  `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${ink}" stroke-width="${w}" stroke-linecap="round"/>`;

/** 实心圆——头/拳/关节 */
export const circle = (x, y, r, ink = '#0a0c12') =>
  `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${ink}"/>`;

/** 实心多边形——刀光/手里剑等几何件，pts=[[x,y],...] */
export const poly = (pts, fill = '#0a0c12') =>
  `<polygon points="${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}" fill="${fill}"/>`;

/**
 * SVG 包裹器。viewBox 必须留出"动作边距"——挥刀/踢腿/后仰会让肢体伸出
 * 站立包围盒，viewBox 太紧会裁切（MoonRonin 踩过的坑）。给四周各留 1~2 个肢节长度。
 * vb = { x, y, w, h }
 */
export const svg = (vb, inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" width="${vb.w}" height="${vb.h}">${inner}</svg>`;

/** 在基础姿态 base 上叠加局部覆盖 override，返回新姿态对象 */
export const mergePose = (base, override = {}) => ({ ...base, ...override });

const lerp = (a, b, t) => a + (b - a) * t;

/** 线性插值两个姿态对象（同名数值键）。用于在关键帧之间补间出更顺滑的过渡帧 */
export function lerpPose(a, b, t) {
  const out = { ...a };
  for (const k of Object.keys(b)) {
    out[k] = (typeof a[k] === 'number' && typeof b[k] === 'number') ? lerp(a[k], b[k], t) : b[k];
  }
  return out;
}

/**
 * 把"稀疏关键帧数组"补间成"密集播放帧数组"。
 * keys = [pose0, pose1, ...]，每段插 steps 帧（含起点，不含终点），尾帧补上。
 * ease：缓动函数 t∈[0,1]→[0,1]，默认平滑 smoothstep。loop=true 时首尾也补间。
 */
export function tween(keys, steps = 3, { loop = false, ease = t => t * t * (3 - 2 * t) } = {}) {
  if (keys.length < 2 || steps <= 1) return keys.slice();
  const segEnd = loop ? keys.length : keys.length - 1;
  const out = [];
  for (let i = 0; i < segEnd; i++) {
    const a = keys[i], b = keys[(i + 1) % keys.length];
    for (let s = 0; s < steps; s++) out.push(lerpPose(a, b, ease(s / steps)));
  }
  if (!loop) out.push(keys[keys.length - 1]);
  return out;
}

/**
 * 写出一组帧文件：<dir>/<id>_<act>_<i>.svg。
 * render(pose, i) → SVG 字符串。返回写出的帧数。
 */
export function writeFrames(fs, path, dir, id, act, frames, render) {
  fs.mkdirSync(dir, { recursive: true });
  frames.forEach((p, i) => fs.writeFileSync(path.join(dir, `${id}_${act}_${i}.svg`), render(p, i)));
  return frames.length;
}

/**
 * 通用人形骨骼渲染。绝对关节角度姿态 p（缺省走 base），角色参数 c。
 * 返回未包裹的 inner SVG（自行用 svg(vb, ...) 包裹，以便控制 viewBox 边距）。
 *
 * c: { limbW, torsoW, torsoLen, headR, ink? }
 * p（角度，0下/90前/180上）: lean, bob, fThigh,fShin,bThigh,bShin, fUp,fFore,bUp,bFore
 * opts.extras(j) 可在关节坐标 j 上追加武器/头饰/披风等部件。
 */
export function humanoid(c, p, opts = {}) {
  const ink = c.ink || '#0a0c12';
  const bob = p.bob || 0, lean = p.lean || 0;
  const hipX = opts.hipX ?? 52, hipY = (opts.hipY ?? 92) + bob;
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
  const j = { hipX, hipY, neckX, neckY, shX, shY, headX, headY, fKx, fKy, fFx, fFy, bKx, bKy, bFx, bFy, fEx, fEy, fHx, fHy, bEx, bEy, bHx, bHy, lean };
  const extras = opts.extras ? opts.extras(j, p, c) : { back: '', front: '' };
  return `
    ${line(hipX, hipY, bKx, bKy, lw, ink)}${line(bKx, bKy, bFx, bFy, lw - 2, ink)}
    ${line(shX, shY, bEx, bEy, lw - 2, ink)}${line(bEx, bEy, bHx, bHy, lw - 3, ink)}${circle(bHx, bHy, lw * 0.55, ink)}
    ${extras.back || ''}
    ${line(hipX, hipY, neckX, neckY, c.torsoW, ink)}
    ${circle(headX, headY, c.headR, ink)}
    ${line(hipX, hipY, fKx, fKy, lw + 1, ink)}${line(fKx, fKy, fFx, fFy, lw - 1, ink)}
    ${line(shX, shY, fEx, fEy, lw, ink)}${line(fEx, fEy, fHx, fHy, lw - 1, ink)}${circle(fHx, fHy, lw * 0.75, ink)}
    ${extras.front || ''}`;
}
