/* ShadowAbyss（影渊：但丁的下降）SVG 资产生成器
 * 参数化骨骼 + 逐帧 SVG（rig.mjs）。LIMBO 剪影风：纯黑前景、零图像额度。
 * 角色：但丁(dante, 持微光的旅人) / 维吉尔(virgil, 略亮一线的引路者) / 风中亡魂(soul)
 * 道具：地岩瓦片 tile_rock / 下行裂口 rift
 * 输出：game_runs/ShadowAbyss/assets/svg/
 */
import fs from 'fs';
import path from 'path';
import { pt, line, circle, poly, svg, humanoid, mergePose, writeFrames } from '../skills/svg-sprite/rig.mjs';

const OUT = 'game_runs/ShadowAbyss/assets/svg';
fs.mkdirSync(OUT, { recursive: true });

// 共用画布：留足斗篷/伸臂边距，全角色共用同一 viewBox → Phaser 里对齐不抖
const VB = { x: -24, y: -4, w: 168, h: 176 };

// ── 角色参数 ──
const DANTE  = { limbW: 11, torsoW: 18, torsoLen: 30, headR: 9,  ink: '#0a0c12' };  // 近黑旅人
const VIRGIL = { limbW: 12, torsoW: 19, torsoLen: 35, headR: 9,  ink: '#1b2436' };  // 比但丁亮一线的引路者
const SOUL   = { limbW: 9,  torsoW: 14, torsoLen: 26, headR: 7,  ink: '#141a26' };

// 基础站姿（绝对角：0下/90前/180上）
const BASE = { lean: 7, bob: 0, hipDx: 0,
  fThigh: 10, fShin: 4, bThigh: -10, bShin: -4,
  fUp: 52, fFore: 122, bUp: 46, bFore: 118 };
const m = (o) => mergePose(BASE, o);

// 斗篷：从肩到髋后方垂下的一道弧（剪影披风）
const cloak = (j, c) => {
  const sx = j.shX, sy = j.shY, hx = j.hipX, hy = j.hipY;
  const sway = (j.lean || 0) * 0.6;
  return `<path d="M ${sx.toFixed(1)} ${sy.toFixed(1)}
    Q ${(sx - 26 - sway).toFixed(1)} ${(sy + 30).toFixed(1)} ${(hx - 18 - sway).toFixed(1)} ${(hy + 40).toFixed(1)}
    Q ${(hx - 4).toFixed(1)} ${(hy + 30).toFixed(1)} ${hx.toFixed(1)} ${hy.toFixed(1)} Z" fill="${c.ink}"/>`;
};
// 兜帽：罩住头顶并向后拖一截尖角
const hood = (j, c) => `<path d="M ${j.headX.toFixed(1)} ${(j.headY - c.headR).toFixed(1)}
  q ${(-c.headR - 6)} 2 ${(-c.headR - 2)} ${c.headR + 8}
  q ${c.headR + 2} -3 ${c.headR + 5} -2 Z" fill="${c.ink}"/>`;

// 但丁：背斗篷 + 兜帽 + 前手提一盏小灯（灯光由引擎叠加，这里只画灯体）
const danteExtras = (j, p, c) => ({
  back: cloak(j, c),
  front: `${hood(j, c)}<circle cx="${j.fHx.toFixed(1)}" cy="${j.fHy.toFixed(1)}" r="3.4" fill="#3a4256"/>`,
});
// 维吉尔：长袍（更长的斗篷）+ 头顶月桂尖
const virgilExtras = (j, p, c) => ({
  back: cloak(j, c),
  front: hood(j, c),
});

const renderHuman = (c, extras) => (p) => svg(VB, humanoid(c, p, { extras }));

// ── 步态：以正弦摆腿/摆臂生成 n 帧 walk 循环 ──
function walkFrames(n, opts = {}) {
  const amp = opts.amp ?? 26, lean = opts.lean ?? 12;
  const frames = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const fThigh = amp * Math.sin(t);
    const bThigh = amp * Math.sin(t + Math.PI);
    frames.push(m({
      lean, bob: -Math.abs(Math.cos(t)) * 2.5,
      fThigh, fShin: fThigh - 30 * Math.max(0, Math.sin(t + 1.0)),
      bThigh, bShin: bThigh - 30 * Math.max(0, Math.sin(t + Math.PI + 1.0)),
      fUp: 52 + 22 * Math.sin(t + Math.PI), fFore: 122,
      bUp: 46 + 22 * Math.sin(t),           bFore: 118,
    }));
  }
  return frames;
}

function idleFrames(n) {
  return Array.from({ length: n }, (_, i) =>
    m({ bob: [0, -1.5, -0.5, -1][i % 4], fFore: 122 + (i % 2) * 4 }));
}

// ── 但丁 ──
writeFrames(fs, path, OUT, 'dante', 'idle', idleFrames(4), renderHuman(DANTE, danteExtras));
writeFrames(fs, path, OUT, 'dante', 'walk', walkFrames(6, { amp: 28, lean: 13 }), renderHuman(DANTE, danteExtras));
writeFrames(fs, path, OUT, 'dante', 'jump', [
  m({ bob: 4, lean: 20, fThigh: 34, fShin: -26, bThigh: 16, bShin: -20, fUp: 18, fFore: 70, bUp: 12, bFore: 64 }),  // 蹲
  m({ bob: -8, lean: 12, fThigh: 44, fShin: 20, bThigh: -36, bShin: -60, fUp: -8, fFore: 40, bUp: 84, bFore: 150 }), // 腾空
  m({ bob: -2, lean: 16, fThigh: 22, fShin: -8, bThigh: -22, bShin: -44, fUp: 6, fFore: 56, bUp: 60, bFore: 132 }),  // 下落
], renderHuman(DANTE, danteExtras));

// ── 维吉尔（只需 idle/walk，作引路者跟随） ──
writeFrames(fs, path, OUT, 'virgil', 'idle', idleFrames(4), renderHuman(VIRGIL, virgilExtras));
writeFrames(fs, path, OUT, 'virgil', 'walk', walkFrames(6, { amp: 24, lean: 11 }), renderHuman(VIRGIL, virgilExtras));

// ── 风中亡魂（2 帧：被风扯向两侧的挣扎，伸手求援） ──
writeFrames(fs, path, OUT, 'soul', 'flutter', [
  m({ lean: 34, bob: -2, fThigh: 40, fShin: 10, bThigh: 8, bShin: -30, fUp: 150, fFore: 168, bUp: 130, bFore: 150 }),
  m({ lean: 26, bob: 2, fThigh: 28, fShin: 0, bThigh: -4, bShin: -36, fUp: 138, fFore: 158, bUp: 120, bFore: 142 }),
], renderHuman(SOUL, (j, p, c) => ({ back: cloak(j, c), front: '' })));

// ── 巡逻怪 fiend（恶鬼/半人马/刻耳柏洛斯通用：佝偻双足兽形 + 头角，2 帧步态） ──
const FIEND = { limbW: 13, torsoW: 22, torsoLen: 26, headR: 11, ink: '#0a0c12' };
const fiendExtras = (j, p, c) => ({
  // 头顶双角 + 后背棘刺
  front: `${line(j.headX, j.headY, ...pt(j.headX, j.headY, 16, 150), 4, c.ink)}${line(j.headX, j.headY, ...pt(j.headX, j.headY, 16, 210), 4, c.ink)}`,
  back: poly([[j.shX, j.shY - 4], [j.shX - 20, j.shY - 18], [j.shX - 8, j.shY], [j.shX - 26, j.shY - 4]], c.ink),
});
const fiendPose = (o) => mergePose({ lean: 26, bob: 0, hipDx: 0, fThigh: 30, fShin: 0, bThigh: -28, bShin: -8, fUp: 96, fFore: 150, bUp: 70, bFore: 140 }, o);
writeFrames(fs, path, OUT, 'fiend', 'move', [
  fiendPose({ fThigh: 34, fShin: 4, bThigh: -30, bShin: -12, bob: 1 }),
  fiendPose({ fThigh: -28, fShin: -10, bThigh: 32, bShin: 2, bob: -2 }),
], renderHuman(FIEND, fiendExtras));

// ── 撒旦 satan（科库托斯冰湖终局：巨大三对翼的剪影，2 帧扇翼） ──
const satanFrame = (wing) => {
  const cx = 84, cy = 96, ink = '#06070c';
  const W = (dx, dy, sp) => `<path d="M ${cx} ${cy} q ${dx * 0.5} ${dy - sp} ${dx} ${dy} q ${-dx * 0.3} ${sp} ${-dx * 0.7} ${sp * 1.4} Z" fill="${ink}"/>`;
  return svg(VB, `
    ${W(-70, -10 - wing, 26)}${W(70, -10 - wing, 26)}
    ${W(-78, 26 + wing, 30)}${W(78, 26 + wing, 30)}
    ${W(-60, 56 + wing, 22)}${W(60, 56 + wing, 22)}
    ${line(cx, cy - 30, cx, cy + 54, 30, ink)}
    ${circle(cx, cy - 40, 18, ink)}
    ${line(cx - 8, cy - 52, cx - 14, cy - 66, 5, ink)}${line(cx + 8, cy - 52, cx + 14, cy - 66, 5, ink)}
    ${line(cx, cy + 50, cx - 22, cy + 78, 14, ink)}${line(cx, cy + 50, cx + 22, cy + 78, 14, ink)}`);
};
fs.writeFileSync(path.join(OUT, 'satan_0.svg'), satanFrame(0));
fs.writeFileSync(path.join(OUT, 'satan_1.svg'), satanFrame(14));

// ── 道具（原样写入完整 <svg>） ──
const raw = (name, full) => fs.writeFileSync(path.join(OUT, name), full);

// 地岩瓦片 48x48，水平可拼接的剪影崖面
raw('tile_rock.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect x="0" y="0" width="48" height="48" fill="#080a10"/>
  <path d="M0 8 Q12 2 24 7 Q36 12 48 6 L48 14 L0 14 Z" fill="#0d1019"/>
  <g stroke="#05060b" stroke-width="1.4" opacity="0.7">
    <line x1="12" y1="14" x2="12" y2="48"/><line x1="28" y1="14" x2="28" y2="48"/><line x1="40" y1="14" x2="40" y2="48"/>
    <line x1="0" y1="30" x2="48" y2="30"/>
  </g>
</svg>`);

// 下行裂口 rift：一道朝下渐隐的暖红光柱（通往更深一圈）
raw('rift.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 160" width="64" height="160">
  <defs><linearGradient id="r" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#ff6a3d" stop-opacity="0"/>
    <stop offset="55%" stop-color="#ff7a48" stop-opacity="0.55"/>
    <stop offset="100%" stop-color="#ffb070" stop-opacity="0.9"/></linearGradient></defs>
  <path d="M22 0 L42 0 L52 160 L12 160 Z" fill="url(#r)"/>
  <line x1="32" y1="10" x2="32" y2="158" stroke="#ffd9a8" stroke-width="2" opacity="0.5"/>
</svg>`);

const files = fs.readdirSync(OUT);
console.log(`ShadowAbyss SVG 资产已生成：${files.length} 个文件`);
console.log(files.join(', '));
