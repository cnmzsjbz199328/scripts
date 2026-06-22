import fs from 'fs';
import path from 'path';

const OUT = 'game_runs/AmbientSandbox/assets/svg';
if (!fs.existsSync(OUT)) {
  fs.mkdirSync(OUT, { recursive: true });
}

const VB = { x: -34, y: -22, w: 178, h: 190 };
const HERO = { headR: 8, torsoLen: 30 };

// Helper: Point calculation
function pt(x, y, len, deg) {
  const rad = (deg * Math.PI) / 180;
  return [x + len * Math.sin(rad), y + len * Math.cos(rad)];
}

// 帮助函数：绘制带黑边描线的肢体 (添加肘部/膝部/脚踝折皱修饰线)
function drawLimb(x1, y1, x2, y2, w, fill) {
  const outline = `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#090d16" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" />`;
  const core = `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${fill}" stroke-width="${w - 4.5}" stroke-linecap="round" stroke-linejoin="round" />`;
  
  // 关节折皱小折线，增加质感
  const mx = (x1 + x2) * 0.5;
  const my = (y1 + y2) * 0.5;
  const jointLine = `<line x1="${(mx - 2).toFixed(1)}" y1="${my.toFixed(1)}" x2="${(mx + 2).toFixed(1)}" y2="${(my + 1).toFixed(1)}" stroke="#090d16" stroke-width="1.2" stroke-linecap="round" />`;

  return outline + core + jointLine;
}

// 帮助函数：绘制带手指细节的精细手掌
function drawHand(hx, hy, r, skinColor) {
  return `
    <path d="M ${(hx - 3).toFixed(1)} ${(hy - 3).toFixed(1)} 
             C ${(hx - 3).toFixed(1)} ${(hy - 5.5).toFixed(1)} ${(hx + 2).toFixed(1)} ${(hy - 5.5).toFixed(1)} ${(hx + 4).toFixed(1)} ${(hy - 2).toFixed(1)} 
             C ${(hx + 6.5).toFixed(1)} ${(hy - 2).toFixed(1)} ${(hx + 6.5).toFixed(1)} ${(hy + 1).toFixed(1)} ${(hx + 3).toFixed(1)} ${(hy + 1.5).toFixed(1)} 
             C ${(hx + 5).toFixed(1)} ${(hy + 2.5).toFixed(1)} ${(hx + 4).toFixed(1)} ${(hy + 4.5).toFixed(1)} ${(hx + 2).toFixed(1)} ${(hy + 4.5).toFixed(1)} 
             C ${(hx + 3).toFixed(1)} ${(hy + 5.5).toFixed(1)} ${(hx + 1).toFixed(1)} ${(hy + 6.5).toFixed(1)} ${(hx - 1.5).toFixed(1)} ${(hy + 5.5).toFixed(1)} 
             C ${(hx - 4).toFixed(1)} ${(hy + 4).toFixed(1)} ${(hx - 4).toFixed(1)} ${(hy - 1.5).toFixed(1)} ${(hx - 3).toFixed(1)} ${(hy - 3).toFixed(1)} Z" 
          fill="${skinColor}" stroke="#090d16" stroke-width="1.8" stroke-linejoin="round" />
  `;
}

// 帮助函数：绘制带鞋底和鞋头细节的运动鞋
function drawFoot(fx, fy, color) {
  const sole = `<path d="M ${(fx - 7.5).toFixed(1)} ${(fy + 1).toFixed(1)} 
                          L ${(fx + 8.5).toFixed(1)} ${(fy + 1).toFixed(1)} 
                          C ${(fx + 9.5).toFixed(1)} ${(fy + 1).toFixed(1)} ${(fx + 9.5).toFixed(1)} ${(fy + 5).toFixed(1)} ${(fx + 8.5).toFixed(1)} ${(fy + 5).toFixed(1)} 
                          L ${(fx - 7.5).toFixed(1)} ${(fy + 5).toFixed(1)} 
                          C ${(fx - 8.5).toFixed(1)} ${(fy + 5).toFixed(1)} ${(fx - 8.5).toFixed(1)} ${(fy + 1).toFixed(1)} ${(fx - 7.5).toFixed(1)} ${(fy + 1).toFixed(1)} Z" 
                       fill="#ffffff" stroke="#090d16" stroke-width="1.8" stroke-linejoin="round" />`;

  const body = `<path d="M ${(fx - 6.5).toFixed(1)} ${(fy + 1).toFixed(1)} 
                          L ${(fx - 5.5).toFixed(1)} ${(fy - 5.5).toFixed(1)} 
                          C ${(fx - 4.5).toFixed(1)} ${(fy - 7.5).toFixed(1)} ${(fx + 2.5).toFixed(1)} ${(fy - 7.5).toFixed(1)} ${(fx + 3.5).toFixed(1)} ${(fy - 2.5).toFixed(1)} 
                          L ${(fx + 7.5).toFixed(1)} ${(fy + 1).toFixed(1)} Z" 
                       fill="${color}" stroke="#090d16" stroke-width="1.8" stroke-linejoin="round" />`;
                       
  const toeCap = `<path d="M ${(fx + 4.5).toFixed(1)} ${(fy - 1.5).toFixed(1)} 
                            L ${(fx + 7.5).toFixed(1)} ${(fy + 1).toFixed(1)} 
                            L ${(fx + 3.5).toFixed(1)} ${(fy + 1).toFixed(1)} Z" 
                         fill="#ffffff" stroke="#090d16" stroke-width="1.2" />`;
                         
  const stripe = `<line x1="${(fx - 4.5).toFixed(1)}" y1="${(fy - 2.5).toFixed(1)}" x2="${(fx + 1.5).toFixed(1)}" y2="${(fy - 2.5).toFixed(1)}" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" />`;

  return body + toeCap + sole + stripe;
}

// 帮助函数：绘制户外探索观测背包 (添加网袋、水壶与背带)
function drawBackpack(sx, sy, packColor) {
  const body = `<path d="M ${(sx - 4).toFixed(1)} ${(sy + 4).toFixed(1)} 
                         H ${(sx - 15).toFixed(1)} 
                         C ${(sx - 20).toFixed(1)} ${(sy + 4).toFixed(1)} ${(sx - 20).toFixed(1)} ${(sy + 22).toFixed(1)} ${(sx - 15).toFixed(1)} ${(sy + 22).toFixed(1)} 
                         H ${(sx - 4).toFixed(1)} Z" 
                      fill="${packColor}" stroke="#090d16" stroke-width="2" stroke-linejoin="round" />`;
  
  const pocket = `<path d="M ${(sx - 15).toFixed(1)} ${(sy + 10).toFixed(1)} 
                           H ${(sx - 20).toFixed(1)} 
                           C ${(sx - 23).toFixed(1)} ${(sy + 10).toFixed(1)} ${(sx - 23).toFixed(1)} ${(sy + 18).toFixed(1)} ${(sx - 20).toFixed(1)} ${(sy + 18).toFixed(1)} 
                           H ${(sx - 15).toFixed(1)} Z" 
                        fill="#b45309" stroke="#090d16" stroke-width="1.5" />`;
                        
  const zipLine = `<line x1="${(sx - 10).toFixed(1)}" y1="${(sy + 4).toFixed(1)}" x2="${(sx - 10).toFixed(1)}" y2="${(sy + 22).toFixed(1)}" stroke="#090d16" stroke-width="1.2" stroke-dasharray="1.5,1.5" />`;
  
  const bottle = `
    <rect x="${(sx - 14).toFixed(1)}" y="${(sy + 12).toFixed(1)}" width="5" height="7" rx="1.5" fill="#f8fafc" stroke="#090d16" stroke-width="1" />
    <rect x="${(sx - 13).toFixed(1)}" y="${(sy + 7).toFixed(1)}" width="3" height="6" rx="0.8" fill="#10b981" stroke="#090d16" stroke-width="1" />
    <rect x="${(sx - 12).toFixed(1)}" y="${(sy + 5).toFixed(1)}" width="1" height="2" fill="#3b82f6" />
  `;

  const straps = `
    <path d="M ${(sx - 4).toFixed(1)} ${(sy + 4).toFixed(1)} Q ${(sx + 2).toFixed(1)} ${(sy + 6).toFixed(1)} ${(sx - 1).toFixed(1)} ${(sy + 12).toFixed(1)}" fill="none" stroke="#090d16" stroke-width="2" stroke-linecap="round" />
    <path d="M ${(sx - 4).toFixed(1)} ${(sy + 18).toFixed(1)} Q ${(sx + 1).toFixed(1)} ${(sy + 17).toFixed(1)} ${(sx - 2).toFixed(1)} ${(sy + 13).toFixed(1)}" fill="none" stroke="#090d16" stroke-width="2" stroke-linecap="round" />
  `;

  return body + pocket + zipLine + bottle + straps;
}

// 帮助函数：绘制头部，带表情轮廓、耳、腮红、侧发及微表情
function drawHead(x, y, r, skinColor) {
  const backHair = `<path d="M ${(x - 7).toFixed(1)} ${(y - 1).toFixed(1)} C ${(x - 11).toFixed(1)} ${(y + 3).toFixed(1)} ${(x - 6).toFixed(1)} ${(y + 8).toFixed(1)} ${(x - 4).toFixed(1)} ${(y + 5).toFixed(1)} Z" fill="#2d3748" stroke="#090d16" stroke-width="1.8" stroke-linejoin="round" />`;
  
  const face = `<path d="M ${(x - 6).toFixed(1)} ${(y - 5).toFixed(1)} 
                        C ${(x + 4).toFixed(1)} ${(y - 6).toFixed(1)} ${(x + 5).toFixed(1)} ${(y - 3).toFixed(1)} ${(x + 5).toFixed(1)} ${(y - 1).toFixed(1)} 
                        C ${(x + 8).toFixed(1)} ${(y - 1).toFixed(1)} ${(x + 8).toFixed(1)} ${(y + 2).toFixed(1)} ${(x + 5).toFixed(1)} ${(y + 2).toFixed(1)} 
                        C ${(x + 5).toFixed(1)} ${(y + 5).toFixed(1)} ${(x + 3).toFixed(1)} ${(y + 7).toFixed(1)} ${(x - 2).toFixed(1)} ${(y + 7).toFixed(1)} 
                        C ${(x - 7).toFixed(1)} ${(y + 7).toFixed(1)} ${(x - 7).toFixed(1)} ${(y - 2).toFixed(1)} ${(x - 6).toFixed(1)} ${(y - 5).toFixed(1)} Z" 
                      fill="${skinColor}" stroke="#090d16" stroke-width="1.8" stroke-linejoin="round" />`;

  const frontHair = `<path d="M ${(x + 1).toFixed(1)} ${(y - 5).toFixed(1)} Q ${(x + 4).toFixed(1)} ${(y - 3).toFixed(1)} ${(x + 3).toFixed(1)} ${(y - 1).toFixed(1)} Q ${(x + 1).toFixed(1)} ${(y - 2).toFixed(1)} ${(x + 1).toFixed(1)} ${(y - 4).toFixed(1)} Z" fill="#2d3748" stroke="#090d16" stroke-width="1.2" />`;

  const ear = `<path d="M ${(x - 4).toFixed(1)} ${(y + 1).toFixed(1)} C ${(x - 6).toFixed(1)} ${(y + 1).toFixed(1)} ${(x - 6).toFixed(1)} ${(y + 4).toFixed(1)} ${(x - 4).toFixed(1)} ${(y + 4).toFixed(1)} Z" fill="${skinColor}" stroke="#090d16" stroke-width="1.2" />`;

  const eye = `<circle cx="${(x + 2.5).toFixed(1)}" cy="${(y - 1.2).toFixed(1)}" r="1.5" fill="#090d16" />
               <circle cx="${(x + 2.8).toFixed(1)}" cy="${(y - 1.5).toFixed(1)}" r="0.5" fill="#ffffff" />`;

  const eyebrow = `<path d="M ${(x + 1.2).toFixed(1)} ${(y - 3.5).toFixed(1)} Q ${(x + 2.8).toFixed(1)} ${(y - 4.2).toFixed(1)} ${(x + 4.2).toFixed(1)} ${(y - 3.5).toFixed(1)}" fill="none" stroke="#090d16" stroke-width="1.2" stroke-linecap="round" />`;

  const blush = `<ellipse cx="${(x + 3.5).toFixed(1)}" cy="${(y + 2.0).toFixed(1)}" rx="2" ry="1.2" fill="#f43f5e" opacity="0.4" />`;

  const smile = `<path d="M ${(x + 2.5).toFixed(1)} ${(y + 3.8).toFixed(1)} Q ${(x + 3.8).toFixed(1)} ${(y + 5.2).toFixed(1)} ${(x + 4.5).toFixed(1)} ${(y + 3.8).toFixed(1)}" fill="none" stroke="#090d16" stroke-width="1.2" stroke-linecap="round" />`;

  return backHair + face + frontHair + ear + eye + eyebrow + blush + smile;
}

// 帮助函数：绘制工装遮阳帽 (带帽顶、缝合线、曲面帽檐与星形徽章)
function drawCap(hx, hy, r, capColor, lean) {
  const dome = `<path d="M ${(hx - 7.5).toFixed(1)} ${(hy - 3.5).toFixed(1)} 
                           C ${(hx - 7.5).toFixed(1)} ${(hy - 11.5).toFixed(1)} ${(hx + 4.5).toFixed(1)} ${(hy - 11.5).toFixed(1)} ${(hx + 5.5).toFixed(1)} ${(hy - 3.5).toFixed(1)} Z" 
                        fill="${capColor}" stroke="#090d16" stroke-width="1.8" />`;
                        
  const visor = `<path d="M ${(hx + 4.5).toFixed(1)} ${(hy - 4.5).toFixed(1)} 
                           C ${(hx + 9.5).toFixed(1)} ${(hy - 4.5).toFixed(1)} ${(hx + 12.5).toFixed(1)} ${(hy - 1.5).toFixed(1)} ${(hx + 11.5).toFixed(1)} ${(hy + 0.5).toFixed(1)} 
                           C ${(hx + 9.5).toFixed(1)} ${(hy + 0.5).toFixed(1)} ${(hx + 5.5).toFixed(1)} ${(hy - 1.5).toFixed(1)} ${(hx + 4.5).toFixed(1)} ${(hy - 3.5).toFixed(1)}" 
                        fill="${capColor}" stroke="#090d16" stroke-width="1.5" stroke-linejoin="round" />`;
                        
  const button = `<circle cx="${(hx - 1.5).toFixed(1)}" cy="${(hy - 11.0).toFixed(1)}" r="1.5" fill="#ffffff" stroke="#090d16" stroke-width="1.2" />`;
  
  const badge = `<polygon points="${(hx - 1.5).toFixed(1)}, ${(hy - 7.5).toFixed(1)} ${(hx + 0.5).toFixed(1)}, ${(hy - 6.0).toFixed(1)} ${(hx - 1.5).toFixed(1)}, ${(hy - 4.5).toFixed(1)} ${(hx - 3.5).toFixed(1)}, ${(hy - 6.0).toFixed(1)}" fill="#fcd34d" stroke="#090d16" stroke-width="0.8" />`;

  return dome + visor + button + badge;
}

// 帮助函数：生成外层 SVG
function svgWrap(vb, inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" width="${vb.w}" height="${vb.h}">${inner}</svg>`;
}

// 帮助函数：绘制微倒梯形剪裁上衣 (包含领口及口袋细节)
function drawTorso(x1, y1, x2, y2, w, fill) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const dx = -w * Math.sin(angle) * 0.5;
  const dy = w * Math.cos(angle) * 0.5;
  
  const p1x = x1 - dx;
  const p1y = y1 - dy;
  const p2x = x1 + dx;
  const p2y = y1 + dy;
  const p3x = x2 + dx * 0.85;
  const p3y = y2 + dy * 0.85;
  const p4x = x2 - dx * 0.85;
  const p4y = y2 - dy * 0.85;

  const poly = `<path d="M ${p1x.toFixed(1)} ${p1y.toFixed(1)} L ${p2x.toFixed(1)} ${p2y.toFixed(1)} L ${p3x.toFixed(1)} ${p3y.toFixed(1)} L ${p4x.toFixed(1)} ${p4y.toFixed(1)} Z" fill="${fill}" stroke="#090d16" stroke-width="2" stroke-linejoin="round" />`;
  
  const px = (p2x + p3x) * 0.5 + (p4x - p1x) * 0.1;
  const py = (p2y + p3y) * 0.5 + (p4y - p1y) * 0.1;
  const pocket = `<rect x="${(px - 3).toFixed(1)}" y="${(py - 3).toFixed(1)}" width="6" height="7" rx="1.5" fill="${fill}" stroke="#090d16" stroke-width="1.2" />`;
  
  const collar = `<path d="M ${(x2 - dx * 0.45).toFixed(1)} ${y2.toFixed(1)} L ${(x2 + dx * 0.45).toFixed(1)} ${y2.toFixed(1)} L ${(x2 + dx * 0.2).toFixed(1)} ${(y2 + 4.5).toFixed(1)} Z" fill="#ffffff" stroke="#090d16" stroke-width="1.2" />`;

  return poly + pocket + collar;
}

// 渲染完整角色帧
function renderHero(p) {
  const bob = p.bob || 0, lean = p.lean || 0;
  const drop = p.drop ?? 0;
  const hipX = 52, hipY = 92 + bob + drop;
  
  const c = HERO;
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

  // 设计配色 (参考 Meeting.svg 中温暖而现代的插画风格)
  const CLR_SKIN = '#fffdfd';  // 干净米白肤色
  const CLR_SHIRT = '#1b82fb'; // 活力天蓝上衣
  const CLR_PANTS = '#f8fafc'; // 清爽洁白工装裤
  const CLR_SHOE = '#ef4444';  // 经典红色运动鞋
  const CLR_PACK = '#eab308';  // 亮黄观测背包
  const CLR_CAP = '#ef4444';   // 经典红色工作帽

  // 图层分层绘制 (自底向上，保证关节前后遮挡层级)
  const backLeg = `
    ${drawLimb(hipX, hipY, bKx, bKy, 11, CLR_PANTS)}
    ${drawLimb(bKx, bKy, bFx, bFy, 9, CLR_PANTS)}
    ${drawFoot(bFx, bFy, CLR_SHOE)}
  `;

  const backArm = `
    ${drawLimb(shX, shY, bEx, bEy, 9, CLR_SHIRT)}
    ${drawLimb(bEx, bEy, bHx, bHy, 8, CLR_SKIN)}
    ${drawHand(bHx, bHy, 4, CLR_SKIN)}
  `;

  const pack = drawBackpack(shX, shY, CLR_PACK);
  const torso = drawTorso(hipX, hipY, neckX, neckY, 16, CLR_SHIRT);
  const head = drawHead(headX, headY, c.headR, CLR_SKIN) + drawCap(headX, headY, c.headR, CLR_CAP, lean);

  const frontLeg = `
    ${drawLimb(hipX, hipY, fKx, fKy, 12, CLR_PANTS)}
    ${drawLimb(fKx, fKy, fFx, fFy, 10, CLR_PANTS)}
    ${drawFoot(fFx, fFy, CLR_SHOE)}
  `;

  const frontArm = `
    ${drawLimb(shX, shY, fEx, fEy, 10, CLR_SHIRT)}
    ${drawLimb(fEx, fEy, fHx, fHy, 9, CLR_SKIN)}
    ${drawHand(fHx, fHy, 4.5, CLR_SKIN)}
  `;

  const inner = `
    ${backLeg}
    ${backArm}
    ${pack}
    ${torso}
    ${head}
    ${frontLeg}
    ${frontArm}
  `;

  return svgWrap(VB, inner);
}

// 动画姿态参数集 (左右腿及手臂做反相位差)
const G = {
  lean: 6, bob: 0, drop: 0,
  fThigh: 12, fShin: 2, bThigh: -12, bShin: -2,
  fUp: 56, fFore: 122, bUp: 52, bFore: 118,
};
const m = (o) => ({ ...G, ...o });

const SEQ = {};

// idle: 警觉呼吸
SEQ.idle = [
  m({ bob: 0, fFore: 122, bFore: 118 }),
  m({ bob: -1.5, lean: 7, fFore: 126, bFore: 121 }),
  m({ bob: -2.2, lean: 7, fFore: 128, bFore: 122 }),
  m({ bob: -1.5, lean: 6, fFore: 125, bFore: 120 }),
  m({ bob: -0.3, fFore: 123, bFore: 119 }),
];

// run: 完美交替步态疾奔 (180° 反相)
SEQ.run = Array.from({ length: 6 }, (_, i) => {
  const t = i / 6 * Math.PI * 2;
  const fThigh = 34 * Math.sin(t) + 8;
  const bThigh = 34 * Math.sin(t + Math.PI) + 8;
  const fShin = fThigh - 40 * Math.max(0, Math.sin(t + 1.1));
  const bShin = bThigh - 40 * Math.max(0, Math.sin(t + Math.PI + 1.1));
  return m({
    lean: 20, 
    bob: -Math.abs(Math.cos(t)) * 3.5, 
    fThigh, fShin, bThigh, bShin,
    fUp: 70 - 26 * Math.sin(t), fFore: 110 - 14 * Math.sin(t),
    bUp: 70 + 26 * Math.sin(t), bFore: 110 + 14 * Math.sin(t),
  });
});

// jump: 起跳
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
console.log(`Surveyor character SVGs generated successfully: ${count} frames written to ${OUT}`);
