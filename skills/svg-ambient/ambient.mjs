/* svg-ambient — 参数化环境元素工厂（唯一真源 / single source of truth）
 *
 * 由 scratch/gen_ambient_sandbox.mjs（写死颜色的 20 元素生成器）重构而来。
 * 每个元素是一个 factory(opts) → string[]（逐帧完整 SVG 文档）。同一份代码靠
 * palette/scale/frames/speed/density 跨游戏复用：红战旗←→灰破幡同一个 flag()。
 *
 * 与角色轨 svg-sprite/rig.mjs 同构：rig 是库、每个游戏自己生成帧；本库是环境轨。
 *
 * 三条硬约束（栅格化体检的前提，见 check.mjs / SKILL.md）：
 *   1. 只用图元 + 多层半透叠出辉光，绝不用 <filter>/feGaussianBlur —— 滤镜跨设备
 *      渲染不一致、离屏栅格化常崩。
 *   2. 文字一律转 polygon/polyline，绝不用 <text> —— 字体不可控、栅格化字形漂移。
 *   3. 不用 <linearGradient>/<radialGradient> —— 用 fadeCone()/radGlow() 叠出falloff。
 *
 * API:
 *   import { make, list, meta, ELEMENTS } from './ambient.mjs';
 *   make('flag', { frames: 8, palette: { cloth: '#9aa0a8' }, scale: 1.2 }) → SVG 字符串数组
 *   list() → ['windmill', ...];  meta('flag') → { frames, fps, layer, motionType, palette, params }
 */

// ---- 几何/工具 -------------------------------------------------------------
export function pt(x, y, len, deg) {
  const rad = (deg * Math.PI) / 180;
  return [x + len * Math.sin(rad), y + len * Math.cos(rad)];
}
const f1 = (n) => Number(n).toFixed(1);
const f2 = (n) => Number(n).toFixed(2);

// 包成完整 SVG 文档；scale!==1 时绕中心(64,64)缩放
function doc(inner, scale = 1) {
  const body = scale === 1
    ? inner
    : `<g transform="translate(64,64) scale(${f2(scale)}) translate(-64,-64)">${inner}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">${body}</svg>`;
}

// 多层半透明锥形叠出"近光源亮、远端淡"的光锥（替代 linearGradient）
function fadeCone(ax, ay, by, hw, color, maxOp = 0.5, layers = 5) {
  let s = '';
  for (let i = layers; i >= 1; i--) {
    const t = i / layers;
    const y = ay + (by - ay) * t;
    const w = hw * t;
    const op = maxOp * (1 - t + 1 / layers);
    s += `<polygon points="${f1(ax)},${f1(ay)} ${f1(ax - w)},${f1(y)} ${f1(ax + w)},${f1(y)}" fill="${color}" opacity="${f2(op)}" />`;
  }
  return s;
}

// 多层同心圆叠出径向辉光（替代 radialGradient）
function radGlow(cx, cy, r, color, layers = 5, maxOp = 0.4) {
  let s = '';
  for (let i = layers; i >= 1; i--) {
    const t = i / layers;
    s += `<circle cx="${cx}" cy="${cy}" r="${f1(r * t)}" fill="${color}" opacity="${f2(maxOp * (1 - t) + maxOp / layers)}" />`;
  }
  return s;
}

// 多层同描边叠出霓虹辉光（替代 feGaussianBlur）：宽→窄、淡→亮
function glowStroke(d, color, w = 3, layers = [[3, 0.12], [2, 0.3], [1, 1]]) {
  return layers.map(([mul, op]) =>
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f1(w * mul)}" opacity="${op}" stroke-linecap="round" stroke-linejoin="round" />`
  ).join('');
}
function glowRect(x, y, w, h, rx, color, sw = 3) {
  return [[3, 0.12], [2, 0.3], [1, 1]].map(([mul, op]) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="none" stroke="${color}" stroke-width="${f1(sw * mul)}" opacity="${op}" />`
  ).join('');
}

const cnt = (base, density) => Math.max(1, Math.round(base * density));

// ---- 元素定义 --------------------------------------------------------------
// 每个元素: { meta, render(o) } —— o 已合并默认值: {frames,speed,scale,density,palette}
const ELEMENTS = {};
function def(name, meta, render) {
  ELEMENTS[name] = {
    meta: { name, fps: 8, layer: 'mid', motionType: 'loop', anchor: 'center', scalable: true, ...meta },
    render,
  };
}

// 1. 风车
def('windmill', { frames: 6, layer: 'structure', palette: { blade: '#ffffff', hub: '#1e293b', stand: '#0c101b', pin: '#ef4444' } }, (o) => {
  const P = o.palette, out = [];
  for (let f = 0; f < o.frames; f++) {
    const a = (f / o.frames) * 120 * o.speed;
    const blades = [0, 90, 180, 270].map((d) => pt(64, 64, 40, a + d))
      .map((p) => `<line x1="64" y1="64" x2="${f1(p[0])}" y2="${f1(p[1])}" stroke="${P.blade}" stroke-width="4" stroke-linecap="round" />`).join('');
    out.push(doc(`<polygon points="56,128 72,128 66,64 62,64" fill="${P.stand}" /><circle cx="64" cy="64" r="6" fill="${P.hub}" />${blades}<circle cx="64" cy="64" r="3" fill="${P.pin}" />`, o.scale));
  }
  return out;
});

// 2. 摇曳树木
def('tree', { frames: 6, layer: 'ground', motionType: 'loop', palette: { trunk: '#0d111d', f1: '#111827', f2: '#1f2937', f3: '#374151' } }, (o) => {
  const P = o.palette, out = [];
  for (let f = 0; f < o.frames; f++) {
    const sway = Math.sin((f / o.frames) * Math.PI * 2 * o.speed) * 6;
    out.push(doc(`
      <path d="M 60,128 L 68,128 L ${f1(65 + sway * 0.4)},64 L ${f1(63 + sway * 0.4)},64 Z" fill="${P.trunk}" />
      <line x1="${f1(64 + sway * 0.4)}" y1="80" x2="${f1(48 + sway * 0.7)}" y2="65" stroke="${P.trunk}" stroke-width="4" stroke-linecap="round" />
      <line x1="${f1(64 + sway * 0.4)}" y1="75" x2="${f1(80 + sway * 0.7)}" y2="60" stroke="${P.trunk}" stroke-width="4" stroke-linecap="round" />
      <circle cx="${f1(64 + sway)}" cy="45" r="28" fill="${P.f1}" />
      <circle cx="${f1(45 + sway)}" cy="55" r="20" fill="${P.f2}" />
      <circle cx="${f1(83 + sway)}" cy="50" r="22" fill="${P.f3}" />`, o.scale));
  }
  return out;
});

// 3. 路灯闪烁（gradient → fadeCone）
def('streetlight', { frames: 4, layer: 'structure', motionType: 'flicker', palette: { stand: '#0c101b', bulb: '#fef08a', glow: '#eab308' } }, (o) => {
  const P = o.palette, ops = [0.9, 0.4, 0.95, 0.75], out = [];
  for (let f = 0; f < o.frames; f++) {
    const op = ops[f % ops.length];
    out.push(doc(`
      ${fadeCone(80, 36, 128, 40, P.glow, 0.5 * op, 5)}
      <path d="M 40,128 L 44,128 L 44,24 Q 44,16 56,16 L 80,16 Q 84,16 84,24 L 80,36 L 76,36 L 80,24 Q 80,20 76,20 L 56,20 Q 48,20 48,24 L 48,128 Z" fill="${P.stand}" />
      <circle cx="80" cy="30" r="5" fill="${P.bulb}" opacity="${f2(0.4 + op * 0.6)}" />`, o.scale));
  }
  return out;
});

// 4. 篝火
def('campfire', { frames: 6, layer: 'ground', palette: { log: '#0d111d', outer: '#f97316', inner: '#eab308', core: '#ffffff' } }, (o) => {
  const P = o.palette, out = [];
  for (let f = 0; f < o.frames; f++) {
    const ph = (f / o.frames) * Math.PI * 2 * o.speed;
    const h1 = 70 + Math.sin(ph) * 12, h2 = 80 + Math.cos(ph) * 10, h3 = 75 + Math.sin(ph + 1) * 8;
    out.push(doc(`
      <line x1="40" y1="110" x2="88" y2="100" stroke="${P.log}" stroke-width="8" stroke-linecap="round" />
      <line x1="88" y1="110" x2="40" y2="100" stroke="${P.log}" stroke-width="8" stroke-linecap="round" />
      <path d="M 44,104 C 36,90 48,${f1(h1)} 64,30 C 80,${f1(h1)} 92,90 84,104 Z" fill="${P.outer}" opacity="0.8" />
      <path d="M 52,104 C 46,94 54,${f1(h2)} 64,50 C 74,${f1(h2)} 82,94 76,104 Z" fill="${P.inner}" opacity="0.9" />
      <path d="M 58,104 C 54,98 58,${f1(h3)} 64,70 C 70,${f1(h3)} 74,98 70,104 Z" fill="${P.core}" />`, o.scale));
  }
  return out;
});

// 5. 飘扬旗帜（红战旗←→灰破幡：调 cloth/emblem）
def('flag', { frames: 8, layer: 'structure', palette: { pole: '#0d111d', knob: '#6b7280', cloth: '#ef4444', outline: '#0d111d', emblem: '#ffffff' } }, (o) => {
  const P = o.palette, out = [];
  for (let f = 0; f < o.frames; f++) {
    const ph = (f / o.frames) * Math.PI * 2 * o.speed;
    const t0 = 24 + Math.sin(ph) * 3, t1 = 26 + Math.sin(ph + 1.5) * 4, t2 = 25 + Math.sin(ph + 3) * 3, t3 = 27 + Math.sin(ph + 4.5) * 4;
    const b0 = 64 + Math.sin(ph) * 3, b1 = 66 + Math.sin(ph + 1.5) * 4, b2 = 65 + Math.sin(ph + 3) * 3, b3 = 67 + Math.sin(ph + 4.5) * 4;
    const emblem = P.emblem === 'none' ? '' : `<polygon points="50,38 53,44 60,45 55,49 57,56 50,52 43,56 45,49 40,45 47,44" fill="${P.emblem}" />`;
    out.push(doc(`
      <line x1="36" y1="120" x2="36" y2="16" stroke="${P.pole}" stroke-width="5" stroke-linecap="round" />
      <circle cx="36" cy="14" r="4" fill="${P.knob}" />
      <path d="M 36,24 C 50,${f1(t0)} 64,${f1(t1)} 78,${f1(t2)} C 92,${f1(t3)} 94,${f1(t3)} 94,${f1(t3)} L 94,${f1(b3)} C 94,${f1(b3)} 92,${f1(b3)} 78,${f1(b2)} C 64,${f1(b1)} 50,${f1(b0)} 36,64 Z" fill="${P.cloth}" stroke="${P.outline}" stroke-width="2" />
      ${emblem}`, o.scale));
  }
  return out;
});

// 6. 雨（particle）
def('rain', { frames: 4, layer: 'weather', motionType: 'particle', palette: { drop: '#94a3b8' } }, (o) => {
  const P = o.palette, out = [], N = cnt(4, o.density);
  for (let f = 0; f < o.frames; f++) {
    const yShift = (f / o.frames) * 128 * o.speed;
    let g = '';
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const sx = i * (160 / N) - 20 - yShift * 0.3, sy = j * (160 / N) - 20 + yShift;
      const wy = ((sy % 160) + 160) % 160 - 20, wx = ((sx % 160) + 160) % 160 - 20;
      g += `<line x1="${f1(wx)}" y1="${f1(wy)}" x2="${f1(wx - 6)}" y2="${f1(wy + 18)}" />`;
    }
    out.push(doc(`<g stroke="${P.drop}" stroke-width="1.5" opacity="0.6">${g}</g>`, o.scale));
  }
  return out;
});

// 7. 雪（particle）
def('snow', { frames: 6, layer: 'weather', motionType: 'particle', palette: { flake: '#ffffff' } }, (o) => {
  const P = o.palette, out = [], NI = cnt(5, o.density), NJ = cnt(4, o.density);
  for (let f = 0; f < o.frames; f++) {
    const yShift = (f / o.frames) * 128 * o.speed;
    let g = '';
    for (let i = 0; i < NI; i++) for (let j = 0; j < NJ; j++) {
      const seed = (i * 7 + j * 13) % 10, sx = i * 30 + 10, sy = j * 35 + yShift;
      const wy = ((sy % 140) + 140) % 140 - 10, sway = Math.sin(wy / 15 + f) * 5, r = seed > 5 ? 2.5 : 1.5;
      g += `<circle cx="${f1(sx + sway)}" cy="${f1(wy)}" r="${r}" />`;
    }
    out.push(doc(`<g fill="${P.flake}" opacity="0.8">${g}</g>`, o.scale));
  }
  return out;
});

// 8. 流云（particle/drift）
def('cloud', { frames: 8, layer: 'sky', motionType: 'particle', palette: { cloud: '#4b5563' } }, (o) => {
  const P = o.palette, out = [];
  for (let f = 0; f < o.frames; f++) {
    const xShift = (f / o.frames) * 128 * o.speed;
    const puff = [0, 160].map((off) => {
      const cx = ((xShift + 20) % 160) - 20 + off;
      return `<path d="M ${f1(cx)},60 A 16,16 0 0,1 ${f1(cx + 24)},48 A 22,22 0 0,1 ${f1(cx + 60)},44 A 18,18 0 0,1 ${f1(cx + 84)},52 A 14,14 0 0,1 ${f1(cx + 94)},66 L ${f1(cx)},66 Z" />`;
    }).join('');
    out.push(doc(`<g fill="${P.cloud}" opacity="0.4">${puff}</g>`, o.scale));
  }
  return out;
});

// 9. 水面波浪
def('wave', { frames: 6, layer: 'ground', palette: { back: '#1f2937', front: '#374151' } }, (o) => {
  const P = o.palette, out = [];
  for (let f = 0; f < o.frames; f++) {
    const ph = (f / o.frames) * Math.PI * 2 * o.speed, dx = (f / o.frames) * 48 * o.speed;
    out.push(doc(`
      <path d="M -16,80 Q 16,${f1(76 + Math.sin(ph) * 3)} 48,80 T 112,80 T 176,80 L 176,128 L -16,128 Z" fill="${P.back}" opacity="0.9" transform="translate(${f1(-dx)}, 0)" />
      <path d="M -16,88 Q 16,${f1(84 + Math.cos(ph) * 3)} 48,88 T 112,88 T 176,88 L 176,128 L -16,128 Z" fill="${P.front}" opacity="0.95" transform="translate(${f1(dx - 48)}, 0)" />`, o.scale));
  }
  return out;
});

// 10. 星光闪烁
def('star', { frames: 4, layer: 'sky', motionType: 'flicker', palette: { a: '#ffffff', b: '#fef08a' } }, (o) => {
  const P = o.palette, out = [];
  const seq = [[6, 3, 8], [3, 8, 4], [8, 4, 6], [4, 6, 3]];
  const spark = (cx, cy, s, c) => `<polygon points="${cx},${f1(cy - s)} ${cx + 2},${cy} ${cx},${f1(cy + s)} ${cx - 2},${cy}" fill="${c}" /><polygon points="${f1(cx - s)},${cy} ${cx},${cy + 2} ${f1(cx + s)},${cy} ${cx},${cy - 2}" fill="${c}" />`;
  for (let f = 0; f < o.frames; f++) {
    const s = seq[f % 4];
    out.push(doc(spark(30, 30, s[0], P.a) + spark(90, 45, s[1], P.b) + spark(60, 80, s[2], P.a), o.scale));
  }
  return out;
});

// 11. 落叶（particle）
def('leaf', { frames: 6, layer: 'foreground', motionType: 'particle', palette: { a: '#f97316', b: '#ef4444', vein: '#000000' } }, (o) => {
  const P = o.palette, out = [];
  for (let f = 0; f < o.frames; f++) {
    const yShift = (f / o.frames) * 120 * o.speed, r1 = f * 60, r2 = f * -45;
    out.push(doc(`
      <g transform="translate(${f1(40 - f * 5)}, ${f1(20 + yShift)}) rotate(${r1}, 10, 10)">
        <path d="M 0,10 C 5,0 15,0 20,10 C 15,20 5,20 0,10" fill="${P.a}" />
        <line x1="0" y1="10" x2="20" y2="10" stroke="${P.vein}" stroke-width="0.5" /></g>
      <g transform="translate(${f1(80 - f * 3)}, ${f1(40 + yShift * 1.2)}) rotate(${r2}, 8, 8)">
        <path d="M 0,8 C 4,0 12,0 16,8 C 12,16 4,16 0,8" fill="${P.b}" />
        <line x1="0" y1="8" x2="16" y2="8" stroke="${P.vein}" stroke-width="0.5" /></g>`, o.scale));
  }
  return out;
});

// 12. 烟囱烟雾（particle）
def('smoke', { frames: 6, layer: 'mid', motionType: 'particle', palette: { chimney: '#0d111d', cap: '#1e293b', smoke: '#94a3b8' } }, (o) => {
  const P = o.palette, out = [];
  for (let f = 0; f < o.frames; f++) {
    const t = (f / o.frames) * o.speed;
    const puff = (off) => {
      const p = (t + off) % 1, y = 100 - p * 80, x = 50 + Math.sin(p * Math.PI * 2) * 8, r = 4 + p * 16, op = (1 - p) * 0.6;
      return y < 10 ? '' : `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${P.smoke}" opacity="${f2(op)}" />`;
    };
    out.push(doc(`<rect x="44" y="100" width="12" height="28" fill="${P.chimney}" /><rect x="42" y="96" width="16" height="6" fill="${P.cap}" />${puff(0)}${puff(0.33)}${puff(0.66)}`, o.scale));
  }
  return out;
});

// 13. 飞鸟扑翼
def('bird', { frames: 4, layer: 'sky', palette: { body: '#0c101b' } }, (o) => {
  const P = o.palette;
  const wings = [
    "M 30,64 Q 40,50 50,60 Q 60,50 70,64 Q 60,60 50,62 Q 40,60 30,64 Z",
    "M 30,64 Q 40,58 50,60 Q 60,58 70,64 Q 60,62 50,62 Q 40,62 30,64 Z",
    "M 30,64 Q 40,74 50,60 Q 60,74 70,64 Q 60,66 50,62 Q 40,66 30,64 Z",
    "M 30,64 Q 40,58 50,60 Q 60,58 70,64 Q 60,62 50,62 Q 40,62 30,64 Z",
  ];
  const out = [];
  for (let f = 0; f < o.frames; f++) out.push(doc(`<path d="${wings[f % 4]}" fill="${P.body}" />`, o.scale));
  return out;
});

// 14. 霓虹招牌（text+feGaussianBlur → polyline 字形 + glowStroke 多层叠）
//    glyph: 简易矢量字形序列，默认 "OPEN"。每个字母用 0..1 的 polyline 描点表达。
const NEON_FONT = {
  O: 'M0,0 L1,0 L1,1 L0,1 Z', P: 'M0,1 L0,0 L1,0 L1,0.5 L0,0.5', E: 'M1,0 L0,0 L0,0.5 L0.7,0.5 M0,0.5 L0,1 L1,1', N: 'M0,1 L0,0 L1,1 L1,0',
  L: 'M0,0 L0,1 L1,1', I: 'M0.5,0 L0.5,1', V: 'M0,0 L0.5,1 L1,0', A: 'M0,1 L0.5,0 L1,1 M0.2,0.6 L0.8,0.6', C: 'M1,0 L0,0 L0,1 L1,1',
};
function neonGlyphs(word, x0, y0, gw, gh, gap, color, sw) {
  let s = '', x = x0;
  for (const ch of word.toUpperCase()) {
    const tpl = NEON_FONT[ch];
    if (tpl) {
      const d = tpl.replace(/([0-9.]+),([0-9.]+)/g, (_, a, b) => `${f1(x + parseFloat(a) * gw)},${f1(y0 + parseFloat(b) * gh)}`);
      s += glowStroke(d, color, sw);
    }
    x += gw + gap;
  }
  return s;
}
def('neon', { frames: 4, layer: 'structure', motionType: 'flicker', params: { word: 'OPEN' }, palette: { board: '#020617', frame: '#1e293b', on: '#f43f5e', off: '#4c0519' } }, (o) => {
  const P = o.palette, word = (o.word || 'OPEN').slice(0, 4), out = [];
  // 每帧: 边框亮/灭 × 文字亮/灭
  const states = [[true, true], [true, false], [false, true], [false, false]];
  for (let f = 0; f < o.frames; f++) {
    const [border, text] = states[f % 4];
    const gw = 13, gap = 5, total = word.length * gw + (word.length - 1) * gap, x0 = 64 - total / 2;
    out.push(doc(`
      <rect x="24" y="38" width="80" height="52" rx="6" fill="${P.board}" stroke="${P.frame}" stroke-width="4" />
      ${glowRect(28, 42, 72, 44, 4, border ? P.on : P.off, 3)}
      ${neonGlyphs(word, x0, 56, gw, 20, gap, text ? P.on : P.off, 2)}`, o.scale));
  }
  return out;
});

// 15. 日冕光斑（radialGradient → radGlow）
def('ray', { frames: 6, layer: 'sky', palette: { orb: '#fffef0', ray: '#fef08a' } }, (o) => {
  const P = o.palette, out = [];
  for (let f = 0; f < o.frames; f++) {
    const ph = (f / o.frames) * Math.PI * 2 * o.speed;
    const scale = 1 + Math.sin(ph) * 0.08, op = 0.5 + Math.sin(ph) * 0.2;
    const rays = Array.from({ length: 8 }, (_, i) => {
      const p1 = pt(64, 64, 34, i * 45), p2 = pt(64, 64, 56, i * 45);
      return `<line x1="${f1(p1[0])}" y1="${f1(p1[1])}" x2="${f1(p2[0])}" y2="${f1(p2[1])}" />`;
    }).join('');
    out.push(doc(`
      ${radGlow(64, 64, 34, P.ray, 5, 0.3)}
      <circle cx="64" cy="64" r="20" fill="${P.orb}" />
      <g stroke="${P.ray}" stroke-width="2" opacity="${f2(op)}" transform="translate(64,64) scale(${f2(scale)}) translate(-64,-64)">${rays}</g>`, o.scale));
  }
  return out;
});

// 16. 气泡（particle）
def('bubble', { frames: 6, layer: 'foreground', motionType: 'particle', palette: { rim: '#ffffff', spark: '#ffffff' } }, (o) => {
  const P = o.palette, out = [];
  for (let f = 0; f < o.frames; f++) {
    const y = (f / o.frames) * 108 * o.speed;
    out.push(doc(`<g stroke="${P.rim}" stroke-width="1" fill="none">
      <circle cx="${f1(32 + Math.sin(f) * 3)}" cy="${f1(110 - y)}" r="6" opacity="0.5" />
      <circle cx="${f1(30 + Math.sin(f) * 3)}" cy="${f1(108 - y)}" r="1.5" fill="${P.spark}" stroke="none" />
      <circle cx="${f1(64 + Math.cos(f) * 4)}" cy="${f1(90 - y * 1.3)}" r="10" opacity="0.4" />
      <circle cx="${f1(61 + Math.cos(f) * 4)}" cy="${f1(87 - y * 1.3)}" r="2" fill="${P.spark}" stroke="none" />
      <circle cx="${f1(96 + Math.sin(f + 2) * 3)}" cy="${f1(100 - y * 0.8)}" r="8" opacity="0.6" />
      <circle cx="${f1(94 + Math.sin(f + 2) * 3)}" cy="${f1(98 - y * 0.8)}" r="2" fill="${P.spark}" stroke="none" /></g>`, o.scale));
  }
  return out;
});

// 17. 灯塔扫射（linearGradient → fadeCone, sweep）
def('lighthouse', { frames: 8, layer: 'structure', motionType: 'sweep', palette: { base: '#0c101b', room: '#1e293b', bulb: '#ffffff', beam: '#bae6fd' } }, (o) => {
  const P = o.palette, out = [];
  for (let f = 0; f < o.frames; f++) {
    const angle = Math.sin((f / o.frames) * Math.PI * 2 * o.speed) * 35;
    const bl = pt(64, 40, 90, angle - 18), br = pt(64, 40, 90, angle + 18), bc = pt(64, 40, 90, angle);
    // 用三层渐窄锥近似 beam 的方向性 falloff
    const beam = [[1, 0.12], [0.6, 0.2], [0.25, 0.4]].map(([t, op]) => {
      const l = pt(64, 40, 90 * t, angle - 18 * t), r = pt(64, 40, 90 * t, angle + 18 * t);
      return `<polygon points="64,40 ${f1(l[0])},${f1(l[1])} ${f1(r[0])},${f1(r[1])}" fill="${P.beam}" opacity="${op}" />`;
    }).join('');
    out.push(doc(`
      ${beam}
      <polygon points="56,128 72,128 66,48 62,48" fill="${P.base}" />
      <rect x="58" y="40" width="12" height="8" fill="${P.room}" />
      <polygon points="56,40 72,40 64,30" fill="${P.base}" />
      <circle cx="64" cy="44" r="3" fill="${P.bulb}" />`, o.scale));
  }
  return out;
});

// 18. 水滴+涟漪（sequence，非 loop；frames 固定 8）
def('drip', { frames: 8, layer: 'foreground', motionType: 'sequence', palette: { water: '#38bdf8' } }, (o) => {
  const P = o.palette, out = [], N = 8;
  for (let f = 0; f < N; f++) {
    if (f < 4) {
      const y = 20 + f * 24, st = f === 3 ? 1.4 : 1;
      out.push(doc(`<path d="M 64,${f1(y + 8)} C ${f1(64 - 4 * st)},${f1(y + 8)} 60,${f1(y + 2)} 64,${y} C 64,${f1(y + 2)} ${f1(64 + 4 * st)},${f1(y + 8)} 64,${f1(y + 8)} Z" fill="${P.water}" />`, o.scale));
    } else {
      const step = f - 4, r1 = (step + 1) * 10, r2 = step * 10, op = (1 - step * 0.25) * 0.8;
      out.push(doc(`<ellipse cx="64" cy="110" rx="${r1}" ry="${f1(r1 * 0.3)}" fill="none" stroke="${P.water}" stroke-width="2" opacity="${f2(op)}" />${step > 0 ? `<ellipse cx="64" cy="110" rx="${r2}" ry="${f1(r2 * 0.3)}" fill="none" stroke="${P.water}" stroke-width="1" opacity="${f2(op * 0.6)}" />` : ''}`, o.scale));
    }
  }
  return out;
});

// 19. 瀑布
def('waterfall', { frames: 6, layer: 'mid', palette: { rock: '#0d111d', ledge: '#1e293b', water: '#38bdf8', splash: '#ffffff' } }, (o) => {
  const P = o.palette, out = [];
  for (let f = 0; f < o.frames; f++) {
    const yShift = (f / o.frames) * 48 * o.speed;
    const streams = Array.from({ length: 4 }, (_, i) => {
      const sx = 34 + i * 20;
      return `<line x1="${sx}" y1="${f1(yShift % 48)}" x2="${sx}" y2="128" stroke-dasharray="24, 16" stroke-width="${4 - (i % 2)}" /><line x1="${sx - 6}" y1="${f1((yShift + 24) % 48)}" x2="${sx - 6}" y2="128" stroke-dasharray="16, 24" stroke-width="2" />`;
    }).join('');
    out.push(doc(`
      <rect x="0" y="0" width="128" height="128" fill="${P.rock}" />
      <g stroke="${P.water}" stroke-width="3" opacity="0.6">${streams}</g>
      <rect x="24" y="0" width="80" height="24" rx="4" fill="${P.ledge}" />
      <g fill="${P.splash}" opacity="0.9">
        <circle cx="${f1(44 + Math.sin(f) * 3)}" cy="${f1(118 + Math.cos(f) * 2)}" r="${3 + (f % 3)}" />
        <circle cx="${f1(64 + Math.cos(f) * 3)}" cy="${f1(116 + Math.sin(f) * 3)}" r="${4 + (f % 2)}" />
        <circle cx="${f1(84 + Math.sin(f + 2) * 3)}" cy="${f1(118 + Math.cos(f + 2) * 2)}" r="${3 + (f % 2)}" /></g>`, o.scale));
  }
  return out;
});

// 20. 风之轨迹
def('wind', { frames: 4, layer: 'mid', palette: { trail: '#e2e8f0' } }, (o) => {
  const P = o.palette, out = [];
  for (let f = 0; f < o.frames; f++) {
    const x = (f / o.frames) * 128 * o.speed;
    out.push(doc(`<g stroke="${P.trail}" stroke-width="1.5" opacity="0.5" stroke-linecap="round" fill="none">
      <path d="M ${f1(-40 + x)},40 C ${f1(x)},35 ${f1(40 + x)},45 ${f1(80 + x)},40" stroke-dasharray="30, 20" />
      <path d="M ${f1(-10 + x)},68 C ${f1(30 + x)},72 ${f1(70 + x)},64 ${f1(110 + x)},68" stroke-dasharray="40, 15" />
      <path d="M ${f1(-60 + x)},90 C ${f1(-20 + x)},85 ${f1(20 + x)},95 ${f1(60 + x)},90" stroke-dasharray="25, 25" /></g>`, o.scale));
  }
  return out;
});

// ---- 公共 API --------------------------------------------------------------
const DEFAULTS = { speed: 1, scale: 1, density: 1 };

export function list() { return Object.keys(ELEMENTS); }
export function meta(name) {
  const e = ELEMENTS[name];
  if (!e) throw new Error(`svg-ambient: unknown element "${name}"`);
  return e.meta;
}
export function make(name, opts = {}) {
  const e = ELEMENTS[name];
  if (!e) throw new Error(`svg-ambient: unknown element "${name}". Known: ${list().join(', ')}`);
  const o = {
    ...DEFAULTS,
    frames: e.meta.frames,
    ...opts,
    palette: { ...e.meta.palette, ...(opts.palette || {}) },
  };
  return e.render(o);
}
export { ELEMENTS };
