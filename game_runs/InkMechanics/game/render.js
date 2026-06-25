/* game/render.js — 程序化绘图（蓝图纸 + 蓝墨水）
 * ─────────────────────────────────────────────────────────────────────────
 * 从原 game-logic.js 平移而来。Ink.Render.draw(scene) 读取 scene 的几何/水滴状态，
 * 把帧画到 scene.gfx。纯绘制，不改游戏状态。
 */
window.Ink = window.Ink || {};

(function () {
  const C = window.Ink.Config;
  const { GAME_W, GAME_H } = C;
  const COL = C.COLOR;
  const { DROP_R } = C.PHYS;

  function drawPaper(g) {
    g.fillStyle(COL.PAPER, 1).fillRect(0, 0, GAME_W, GAME_H);
    g.lineStyle(1, COL.GRID, 0.55);
    for (let x = 40; x < GAME_W; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, GAME_H); g.strokePath(); }
    for (let y = 40; y < GAME_H; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(GAME_W, y); g.strokePath(); }
    g.lineStyle(2, COL.LINE, 0.8).strokeRect(8, 8, GAME_W - 16, GAME_H - 16);
  }

  function dashRect(g, x, y, w, h, dash = 7, gap = 5) {
    const edges = [[x, y, x + w, y], [x + w, y, x + w, y + h], [x + w, y + h, x, y + h], [x, y + h, x, y]];
    for (const [ax, ay, bx, by] of edges) {
      const len = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / len, uy = (by - ay) / len;
      for (let s = 0; s < len; s += dash + gap) {
        const e = Math.min(s + dash, len);
        g.beginPath(); g.moveTo(ax + ux * s, ay + uy * s); g.lineTo(ax + ux * e, ay + uy * e); g.strokePath();
      }
    }
  }

  function ellipsePts(cx, cy, rx, ry, ang, n = 20) {
    const c = Math.cos(ang), s = Math.sin(ang), pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
      pts.push({ x: cx + ex * c - ey * s, y: cy + ex * s + ey * c });
    }
    return pts;
  }
  function fillEllipse(g, cx, cy, rx, ry, ang) {
    const p = ellipsePts(cx, cy, rx, ry, ang);
    g.beginPath(); g.moveTo(p[0].x, p[0].y); for (let i = 1; i < p.length; i++) g.lineTo(p[i].x, p[i].y); g.closePath(); g.fillPath();
  }
  function strokeEllipse(g, cx, cy, rx, ry, ang) {
    const p = ellipsePts(cx, cy, rx, ry, ang);
    g.beginPath(); g.moveTo(p[0].x, p[0].y); for (let i = 1; i < p.length; i++) g.lineTo(p[i].x, p[i].y); g.closePath(); g.strokePath();
  }

  // 主帧绘制。s = LevelScene 实例（读字段，不改）
  function draw(s) {
    const g = s.gfx;
    g.clear();
    const L = window.Ink.LEVELS[s.level];

    // 禁画区（红色斜纹阴影 + 虚框）
    for (const r of s.noDraw) {
      g.fillStyle(COL.SPIKE, 0.07).fillRect(r.x, r.y, r.w, r.h);
      g.lineStyle(1, COL.SPIKE, 0.5);
      for (let x = r.x - r.h; x < r.x + r.w; x += 14) {
        const x0 = Math.max(r.x, x), y0 = r.y + (x0 - x);
        const x1 = Math.min(r.x + r.w, x + r.h), y1 = r.y + (x1 - x);
        if (y0 <= r.y + r.h && y1 >= r.y) { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.strokePath(); }
      }
      g.lineStyle(1.5, COL.SPIKE, 0.55); dashRect(g, r.x, r.y, r.w, r.h);
    }

    // 墙体
    for (const [x, y, w, h] of (L.walls || [])) {
      g.fillStyle(COL.LINE, 0.16).fillRect(x, y, w, h);
      g.lineStyle(2.5, COL.INK, 0.85).strokeRect(x, y, w, h);
    }

    // 尖刺
    for (const sp of s.spikes) {
      const apexY = sp.by - sp.w * 0.9;
      g.fillStyle(COL.SPIKE, 0.22); g.lineStyle(2, COL.SPIKE, 0.9);
      g.beginPath();
      g.moveTo(sp.x - sp.w / 2, sp.by); g.lineTo(sp.x, apexY); g.lineTo(sp.x + sp.w / 2, sp.by); g.closePath();
      g.fillPath(); g.strokePath();
    }

    // 旋转杠杆
    for (const sg of window.Ink.Physics.leverSegs(s.levers, s._t)) {
      g.lineStyle(7, COL.LINE, 0.25); g.beginPath(); g.moveTo(sg.ax, sg.ay); g.lineTo(sg.bx, sg.by); g.strokePath();
      g.lineStyle(4, COL.INK, 0.9); g.beginPath(); g.moveTo(sg.ax, sg.ay); g.lineTo(sg.bx, sg.by); g.strokePath();
      const cx = (sg.ax + sg.bx) / 2, cy = (sg.ay + sg.by) / 2;
      g.fillStyle(COL.PAPER, 1).fillCircle(cx, cy, 6); g.lineStyle(2.5, COL.INK, 0.95).strokeCircle(cx, cy, 6);
      g.fillStyle(COL.INK, 0.9).fillCircle(cx, cy, 2.5);
    }

    // 墨井（终点光晕随 juice 脉动）
    if (s.well) {
      const { x, y, r } = s.well;
      const pulse = 1 + Math.sin(s._t * 3) * 0.05;
      g.fillStyle(COL.GOAL, 0.12).fillCircle(x, y, r * pulse);
      g.lineStyle(2.5, COL.GOAL, 0.9).strokeCircle(x, y, r);
      g.lineStyle(1.5, COL.GOAL, 0.5).strokeCircle(x, y, r * 0.6);
      g.fillStyle(COL.GOAL, 0.85).fillCircle(x, y, 3.5);
    }

    // 龙头
    if (s.source) {
      const sc = s.source;
      g.fillStyle(COL.INK, 0.85).fillRect(sc.x - 16, sc.y - 24, 32, 10);
      g.fillStyle(COL.LINE, 0.9).fillRect(sc.x - 5, sc.y - 16, 10, 8);
    }

    // 墨线
    const drawStroke = (st, alpha) => {
      const p = st.pts; if (p.length < 2) return;
      g.lineStyle(7, COL.WATER, alpha * 0.35);
      g.beginPath(); g.moveTo(p[0].x, p[0].y); for (let i = 1; i < p.length; i++) g.lineTo(p[i].x, p[i].y); g.strokePath();
      g.lineStyle(3, COL.STROKE, alpha);
      g.beginPath(); g.moveTo(p[0].x, p[0].y); for (let i = 1; i < p.length; i++) g.lineTo(p[i].x, p[i].y); g.strokePath();
    };
    for (const st of s.strokes) drawStroke(st, 0.95);
    if (s.curStroke) drawStroke(s.curStroke, 0.7);

    // 水滴尾迹（juice：run 模式留淡蓝残影）
    if (s.trail && s.trail.length) {
      for (let i = 0; i < s.trail.length; i++) {
        const tp = s.trail[i];
        g.fillStyle(COL.WATER, (i / s.trail.length) * 0.22).fillCircle(tp.x, tp.y, DROP_R * 0.6);
      }
    }

    // 水滴（运动方向拉伸 + 高光）
    const d = s.drop, sp = Math.hypot(d.vx, d.vy);
    const stretch = Phaser.Math.Clamp(1 + sp * 0.0016, 1, 1.5);
    const ang = Math.atan2(d.vy, d.vx);
    const rx = DROP_R * stretch, ry = DROP_R / Math.sqrt(stretch);
    g.fillStyle(COL.WATER, 0.9); fillEllipse(g, d.x, d.y, rx, ry, ang);
    g.lineStyle(2, COL.INK, 0.9); strokeEllipse(g, d.x, d.y, rx, ry, ang);
    g.fillStyle(COL.WATER_HI, 0.85).fillCircle(d.x - 3, d.y - 4, DROP_R * 0.32);

    // 墨量条
    const bx = 20, by = GAME_H - 26, bw = 180;
    g.fillStyle(0xffffff, 0.6).fillRect(bx, by, bw, 10);
    g.lineStyle(1.5, COL.INK, 0.7).strokeRect(bx, by, bw, 10);
    const frac = Phaser.Math.Clamp(1 - s.inkUsed / s.inkBudget, 0, 1);
    g.fillStyle(frac > 0.25 ? COL.WATER : COL.SPIKE, 0.9).fillRect(bx + 1, by + 1, (bw - 2) * frac, 8);
    // par 刻度线（低于此用量给三星）
    const parFrac = 1 - (L.par / s.inkBudget);
    g.lineStyle(1.5, COL.STAR, 0.9);
    g.beginPath(); g.moveTo(bx + bw * parFrac, by - 2); g.lineTo(bx + bw * parFrac, by + 12); g.strokePath();
  }

  window.Ink.Render = { draw, drawPaper };
})();
