/* ShadowAbyss（影渊：但丁的下降）SVG 资产生成器
 * 参数化骨骼 + 逐帧 SVG（rig.mjs）。LIMBO 剪影风：纯黑前景、零图像额度。
 * 角色：巡逻怪 fiend / 撒旦 satan（但丁/维吉尔/亡魂已迁移到 glb-sprite 轨）
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

const renderHuman = (c, extras) => (p) => svg(VB, humanoid(c, p, { extras }));

// ── 但丁/维吉尔/风中亡魂：已迁移到 glb-sprite 轨（3D 骨骼动画→剪影 PNG，assets/3d/），不再走 SVG。
//    生成命令见 scratch/glb_dante_hooks.mjs / glb_virgil_hooks.mjs / glb_soul_hooks.mjs 顶部注释。──

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
