/* game/render.js — 程序化绘图（深色木箱内壁 + 亮色导轨）
 * ─────────────────────────────────────────────────────────────────────────
 * BC.Render.drawCrate(g, C)  一次性画箱体底（BootScene / LevelScene create 各调一次）
 * BC.Render.draw(scene)      每帧画动态层：导轨 / 电池 / 尖刺 / 巡逻者 / 舱口
 * 纯绘制，不改游戏状态。
 */
window.BC = window.BC || {};

(function () {
  const TAU = Math.PI * 2;

  function drawCrate(g, C) {
    const { GAME_W, GAME_H } = C, COL = C.COLOR;
    g.clear();
    g.fillStyle(COL.BG, 1).fillRect(0, 0, GAME_W, GAME_H);

    // 木箱内区
    const x0 = 96, y0 = 54, w = GAME_W - 192, h = GAME_H - 108;
    g.fillStyle(COL.CRATE_FILL, 1).fillRect(x0, y0, w, h);

    // 竖木纹板
    const plankW = 74;
    for (let i = 0, x = x0; x < x0 + w; i++, x += plankW) {
      const pw = Math.min(plankW, x0 + w - x);
      g.fillStyle(i % 2 ? COL.PLANK_B : COL.PLANK_A, 1).fillRect(x, y0, pw, h);
      g.lineStyle(2, COL.PLANK_LINE, 0.7);
      g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y0 + h); g.strokePath();
      // 疏落的木节
      g.fillStyle(COL.PLANK_LINE, 0.35);
      const kn = (i * 37) % (h - 40);
      g.fillCircle(x + pw * 0.5, y0 + 30 + kn, 3.5);
    }

    // 内框 + 四角铆钉
    g.lineStyle(4, COL.PLANK_LINE, 0.9).strokeRect(x0, y0, w, h);
    g.lineStyle(2, 0x000000, 0.35).strokeRect(x0 + 5, y0 + 5, w - 10, h - 10);
    g.fillStyle(COL.RIVET, 0.9);
    for (const [rx, ry] of [[x0 + 16, y0 + 16], [x0 + w - 16, y0 + 16], [x0 + 16, y0 + h - 16], [x0 + w - 16, y0 + h - 16]]) {
      g.fillCircle(rx, ry, 5);
    }

    // 暗角
    g.fillStyle(0x000000, 0.28).fillRect(0, 0, GAME_W, y0);
    g.fillStyle(0x000000, 0.28).fillRect(0, GAME_H - y0, GAME_W, y0);
  }

  // 沿折线画一条带辉光的粗导轨
  function drawRail(g, pts, C, t) {
    const COL = C.COLOR;
    const line = (width, color, alpha) => {
      g.lineStyle(width, color, alpha);
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.strokePath();
    };
    line(12, COL.RAIL_GLOW, 0.22);
    line(6, COL.RAIL_GLOW, 0.4);
    line(2.5, COL.RAIL, 0.92);
    // 顶点节点
    for (let i = 1; i < pts.length - 1; i++) {
      g.fillStyle(COL.RAIL, 0.85).fillCircle(pts[i][0], pts[i][1], 3.4);
      g.lineStyle(1.5, COL.RAIL_GLOW, 0.6).strokeCircle(pts[i][0], pts[i][1], 6 + Math.sin(t * 3 + i) * 1.2);
    }
  }

  function draw(s) {
    const C = window.BC.Config, COL = C.COLOR, P = window.BC.Path, H = window.BC.Hazards;
    const g = s.gfx;
    g.clear();
    if (!s.pathPts) return;
    const t = s._t, lt = s._levelT || 0;

    drawRail(g, s.pathPts, C, t);

    // 电池：贴内壁法线略微离壁，脉动
    for (const c of s.cells) {
      if (c.got) continue;
      const pt = P.sample(s.pathPts, c.s);
      const n = P.inwardNormal(s.pathPts, c.s);
      const cx = pt.x + n.x * 15, cy = pt.y + n.y * 15;
      const pr = 7 + Math.sin(t * 6 + c.s) * 1.6;
      g.fillStyle(COL.CELL, 0.18).fillCircle(cx, cy, pr + 7);
      g.fillStyle(COL.CELL, 0.95).fillCircle(cx, cy, pr);
      g.fillStyle(COL.CELL_CORE, 0.95).fillCircle(cx, cy, pr * 0.45);
    }

    // 尖刺段：沿区间等距画三角，朝箱体内部伸出，长度缓动
    for (const st of s.strips) {
      const target = H.stripExt(st, lt);
      if (st._ext === undefined) st._ext = target;
      st._ext += (target - st._ext) * Math.min(1, (s._dt || 0.016) * 12);
      const ext = st._ext;
      const baseH = 4, tipH = 24;
      const hgt = baseH + (tipH - baseH) * ext;
      const step = 15;
      g.fillStyle(ext > 0.5 ? COL.STRIP : COL.STRIP_DIM, 0.5 + 0.45 * ext);
      g.lineStyle(1.5, COL.STRIP, 0.5 + 0.4 * ext);
      for (let q = st.s0; q <= st.s1; q += step) {
        const pt = P.sample(s.pathPts, q);
        const n = P.inwardNormal(s.pathPts, q);
        // 沿轨切向的半宽
        const tx = -n.y, ty = n.x;
        const bx = pt.x, by = pt.y;
        g.beginPath();
        g.moveTo(bx - tx * step * 0.42, by - ty * step * 0.42);
        g.lineTo(bx + n.x * hgt, by + n.y * hgt);
        g.lineTo(bx + tx * step * 0.42, by + ty * step * 0.42);
        g.closePath(); g.fillPath(); g.strokePath();
      }
    }

    // 巡逻者
    if (s.rival) {
      const rs = H.rivalS(s.rival, lt);
      const pt = P.sample(s.pathPts, rs);
      g.fillStyle(COL.RIVAL_GLOW, 0.3).fillCircle(pt.x, pt.y, 20);
      g.fillStyle(COL.RIVAL, 0.95).fillCircle(pt.x, pt.y, 9);
      for (let k = 0; k < 6; k++) {
        const a = t * 4 + k * TAU / 6;
        g.lineStyle(2, COL.RIVAL, 0.8);
        g.beginPath(); g.moveTo(pt.x, pt.y);
        g.lineTo(pt.x + Math.cos(a) * 15, pt.y + Math.sin(a) * 15); g.strokePath();
      }
    }

    // 舱口：集齐电池后点亮 + 呼吸光
    if (s.exitPos) {
      const armed = s._exitArmed;
      const ang = s.exitPos.angle;
      const n = P.inwardNormal(s.pathPts, s.sExit);
      const ex = s.exitPos.x, ey = s.exitPos.y;
      const col = armed ? COL.EXIT : COL.EXIT_DIM;
      const pulse = armed ? 1 + Math.sin(t * 4) * 0.12 : 1;
      g.fillStyle(col, armed ? 0.16 : 0.08).fillCircle(ex, ey, 26 * pulse);
      g.lineStyle(3, col, armed ? 0.95 : 0.5).strokeCircle(ex, ey, 15);
      g.lineStyle(1.5, col, armed ? 0.7 : 0.35).strokeCircle(ex, ey, 9);
      // 朝内的小箭头
      if (armed) {
        g.fillStyle(COL.EXIT, 0.9);
        g.beginPath();
        g.moveTo(ex + n.x * 20, ey + n.y * 20);
        g.lineTo(ex + n.x * 8 - Math.cos(ang) * 7, ey + n.y * 8 - Math.sin(ang) * 7);
        g.lineTo(ex + n.x * 8 + Math.cos(ang) * 7, ey + n.y * 8 + Math.sin(ang) * 7);
        g.closePath(); g.fillPath();
      }
    }

    // 受击 / 重生无敌闪
    if (s._invulnT > 0 && Math.floor(s._t * 20) % 2 === 0) {
      g.fillStyle(COL.STRIP, 0.06).fillRect(0, 0, C.GAME_W, C.GAME_H);
    }

    // 尾迹
    if (s.trail && s.trail.length) {
      for (let i = 0; i < s.trail.length; i++) {
        const tp = s.trail[i];
        g.fillStyle(COL.RAIL, (i / s.trail.length) * 0.14).fillCircle(tp.x, tp.y, 5);
      }
    }
  }

  window.BC.Render = { drawCrate, draw };
})();
