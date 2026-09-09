/* game/systems/hazards.js — 危险物判定（纯函数，吃显式关卡时钟 t 秒）
 * ─────────────────────────────────────────────────────────────────────────
 * strip  = { s0, s1, period, duty, phase }   定时伸缩的尖刺段（弧长区间）
 *          伸出条件：((t+phase) % period) < duty*period
 * rival  = { s0, s1, speed, phase }           在 [s0,s1] 间往返的爬行者
 *
 * 供 LevelScene 命中测试 + probe 的 danger 字段 + _auto 的「等刺收回」用。
 */
window.BC = window.BC || {};

(function () {
  function stripOut(st, t) {
    const per = st.period || 1;
    const p = (((t + (st.phase || 0)) % per) + per) % per;
    return p < (st.duty || 0.5) * per;
  }

  // 伸出目标程度 0..1（渲染侧再做插值缓动）
  function stripExt(st, t) { return stripOut(st, t) ? 1 : 0; }

  // 巡逻者当前弧长（三角波往返）
  function rivalS(r, t) {
    const span = Math.abs(r.s1 - r.s0);
    if (span < 1) return r.s0;
    const cycle = 2 * span;
    let u = ((t * r.speed) + (r.phase || 0) * span) % cycle;
    if (u < 0) u += cycle;
    return u <= span ? r.s0 + u : r.s0 + (cycle - u);
  }

  // s 处此刻是否「危险」（含安全余量 gap）——用于规避决策 / probe
  function dangerAt(s, strips, rival, t, gap) {
    for (const st of (strips || [])) {
      if (s >= st.s0 - gap && s <= st.s1 + gap && stripOut(st, t)) return true;
    }
    if (rival && Math.abs(s - rivalS(rival, t)) < gap) return true;
    return false;
  }

  // s 处此刻是否真正被击中（贴身判定，无余量或半余量）
  function hitTest(s, strips, rival, t, gap) {
    for (const st of (strips || [])) {
      if (s >= st.s0 && s <= st.s1 && stripOut(st, t)) return { hit: true, kind: 'strip' };
    }
    if (rival && Math.abs(s - rivalS(rival, t)) < gap * 0.5) return { hit: true, kind: 'rival' };
    return { hit: false, kind: null };
  }

  window.BC.Hazards = { stripOut, stripExt, rivalS, dangerAt, hitTest };
})();
