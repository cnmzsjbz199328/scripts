/* game/physics.js — 水滴自管物理（子步进 verlet + 线段碰撞）
 * ─────────────────────────────────────────────────────────────────────────
 * 从原 game-logic.js 平移而来，行为零改动。改为接收显式状态、返回事件，
 * 让 LevelScene 决定后果（过关/失败），物理本身不碰场景/HUD —— 可单测。
 *
 * Ink.Physics.step(state, dt) → null | 'clear' | { fail:'spike'|'oob'|'stall' }
 *   state: { drop, segs, strokes, levers, spikes, well, _t, _settleT }
 */
window.Ink = window.Ink || {};

(function () {
  const P = window.Ink.Config.PHYS;
  const { DROP_R, G, SUBSTEPS, RESTITUTION, TANGENT_KEEP, MAX_SPEED, SETTLE_SPEED } = P;
  const { GAME_W, GAME_H } = window.Ink.Config;

  // 旋转杠杆 → 当前时刻线段（绕 pivot 旋转）
  function leverSegs(levers, t) {
    return levers.map((lv) => {
      const a = lv.ph + lv.av * t;
      const dx = Math.cos(a) * lv.len, dy = Math.sin(a) * lv.len;
      return { ax: lv.px - dx, ay: lv.py - dy, bx: lv.px + dx, by: lv.py + dy };
    });
  }

  function collideSeg(d, ax, ay, bx, by) {
    const ex = bx - ax, ey = by - ay;
    const L2 = ex * ex + ey * ey || 1;
    let t = ((d.x - ax) * ex + (d.y - ay) * ey) / L2;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + ex * t, cy = ay + ey * t;
    let nx = d.x - cx, ny = d.y - cy;
    let dist = Math.hypot(nx, ny);
    if (dist >= DROP_R) return;
    if (dist < 1e-4) { nx = 0; ny = -1; dist = 1; } else { nx /= dist; ny /= dist; }
    d.x += nx * (DROP_R - dist);
    d.y += ny * (DROP_R - dist);
    const vn = d.vx * nx + d.vy * ny;
    if (vn < 0) {
      const tvx = d.vx - vn * nx, tvy = d.vy - vn * ny;
      d.vx = tvx * TANGENT_KEEP - vn * nx * RESTITUTION;
      d.vy = tvy * TANGENT_KEEP - vn * ny * RESTITUTION;
    }
  }
  function collideSegs(d, segs) { for (const s of segs) collideSeg(d, s.ax, s.ay, s.bx, s.by); }
  function collideStroke(d, st) {
    const p = st.pts;
    for (let i = 0; i < p.length - 1; i++) collideSeg(d, p[i].x, p[i].y, p[i + 1].x, p[i + 1].y);
  }

  function step(state, dt) {
    const d = state.drop;
    const sdt = dt / SUBSTEPS;
    const levers = leverSegs(state.levers, state._t);
    for (let s = 0; s < SUBSTEPS; s++) {
      d.vy += G * sdt;
      const sp = Math.hypot(d.vx, d.vy);
      if (sp > MAX_SPEED) { d.vx *= MAX_SPEED / sp; d.vy *= MAX_SPEED / sp; }
      d.x += d.vx * sdt;
      d.y += d.vy * sdt;
      collideSegs(d, state.segs);
      collideSegs(d, levers);
      for (const st of state.strokes) collideStroke(d, st);
    }

    // 入井？
    if (Math.hypot(d.x - state.well.x, d.y - state.well.y) < state.well.r + DROP_R) return 'clear';
    // 撞尖刺？
    for (const sp of state.spikes) {
      const apexY = sp.by - sp.w * 0.9;
      if (d.x > sp.x - sp.w / 2 && d.x < sp.x + sp.w / 2 && d.y + DROP_R > apexY) return { fail: 'spike' };
    }
    // 掉出画面？
    if (d.x < -20 || d.x > GAME_W + 20 || d.y > GAME_H + 30) return { fail: 'oob' };
    // 沉底静止？
    const sp2 = Math.hypot(d.vx, d.vy);
    if (sp2 < SETTLE_SPEED) {
      state._settleT = (state._settleT || 0) + dt;
      if (state._settleT > 1.4) { state._settleT = 0; return { fail: 'stall' }; }
    } else state._settleT = 0;
    return null;
  }

  window.Ink.Physics = { step, leverSegs };
})();
