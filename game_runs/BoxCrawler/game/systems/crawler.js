/* game/systems/crawler.js — 沿轨道推进 s + 决定动作态（纯函数）
 * ─────────────────────────────────────────────────────────────────────────
 * advance(state, input, dt, cfg) 就地更新 state 并返回事件，供 LevelScene
 * 决定后果（播一次性动画 / 减速）。不碰 Phaser、不碰渲染。
 *
 * state = { s, dir, mode:'crawl'|'cornerTurn'|'turnAround', turnLockT,
 *            cornerT, cornerS, cornerSign, moving, cornerIdx }
 * input = -1 | 0 | 1          （沿 +s / 停 / 沿 -s 的期望方向）
 * cfg   = { speed, pathLen, corners:[{s,deg}], cornerWindow, cornerSlow, turnLockMs }
 * 返回  = { state, event:'turnAround'|'corner'|'cornerHandoff'|'endClamp'|null,
 *            corner, slow:bool, moving:bool }
 */
window.BC = window.BC || {};

(function () {
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(v, hi)); }

  function enteredCorner(prevS, nextS, dir, corner, window) {
    const enter = dir > 0 ? corner.s - window : corner.s + window;
    if (dir > 0) return prevS <= enter && nextS >= enter;
    return prevS >= enter && nextS <= enter;
  }

  function findEnteredCorner(prevS, nextS, dir, corners, window) {
    for (let i = 0; i < corners.length; i++) {
      if (enteredCorner(prevS, nextS, dir, corners[i], window)) return { ...corners[i], index: i };
    }
    return null;
  }

  function advance(state, input, dt, cfg) {
    const sign = input > 0 ? 1 : (input < 0 ? -1 : 0);
    let event = null;

    // ── 180° 调头：锁定逻辑位置，先播完整 turnAround ──
    if (state.mode === 'turnAround') {
      state.turnLockT -= dt;
      if (state.turnLockT <= 0) {
        state.mode = 'crawl';
        state.turnLockT = 0;
      } else {
        state.moving = false;
        return { state, event: null, corner: null, slow: false, moving: false };
      }
    }

    // ── 角点动作：逻辑位置锁在 cornerS；立即反向会取消旧交接 ──
    if (state.mode === 'cornerTurn') {
      if (sign !== 0 && sign !== state.dir) {
        state.mode = 'turnAround';
        state.turnLockT = cfg.turnLockMs / 1000;
        state.dir = sign;
        state.cornerIdx = -1;
        state.moving = false;
        return { state, event: 'turnAround', corner: null, slow: false, moving: false };
      }
      state.cornerT -= dt;
      if (state.cornerT <= 0) {
        state.cornerT = 0;
        state.mode = 'crawl';
        state.s = clamp(state.cornerS + state.dir * cfg.cornerHandoffS, 0, cfg.pathLen);
        state.cornerIdx = -1;
        state.moving = sign !== 0 && sign === state.dir;
        return { state, event: 'cornerHandoff', corner: null, slow: false, moving: state.moving };
      }
      state.s = state.cornerS;
      state.moving = false;
      return { state, event: null, corner: null, slow: true, moving: false };
    }

    // ── 调头请求：只有实际移动时才需要 180° 动作 ──
    if (state.mode === 'crawl' && sign !== 0 && sign !== state.dir) {
      state.cornerIdx = -1;
      if (state.moving) {
        state.mode = 'turnAround';
        state.turnLockT = cfg.turnLockMs / 1000;
        state.dir = sign;
        state.moving = false;
        return { state, event: 'turnAround', corner: null, slow: false, moving: false };
      }
    }

    // ── 普通爬行 ──
    if (sign !== 0) state.dir = sign;
    if (sign === 0) { state.moving = false; return { state, event: null, corner: null, slow: false, moving: false }; }

    const baseNext = state.s + sign * cfg.speed * dt;
    const entered = findEnteredCorner(state.s, baseNext, sign, cfg.corners, cfg.cornerWindow);
    if (entered) {
      state.s = entered.s;
      state.cornerS = entered.s;
      state.cornerSign = entered.sign * sign;
      state.cornerIdx = entered.index;
      state.cornerT = (cfg.cornerTurnMs ?? 320) / 1000;
      state.mode = 'cornerTurn';
      state.moving = false;
      return { state, event: 'corner', corner: entered, slow: true, moving: false };
    }

    let slow = false;
    for (const corner of cfg.corners) {
      if (Math.abs(state.s - corner.s) < cfg.cornerWindow) { slow = true; break; }
    }
    const v = cfg.speed * (slow ? cfg.cornerSlow : 1);
    let ns = state.s + sign * v * dt;
    if (ns <= 0) { if (state.s > 0) event = event || 'endClamp'; ns = 0; }
    else if (ns >= cfg.pathLen) { if (state.s < cfg.pathLen) event = event || 'endClamp'; ns = cfg.pathLen; }

    const moved = Math.abs(ns - state.s) > 1e-4;
    state.s = ns;
    state.moving = moved;
    return { state, event, corner: null, slow, moving: moved };
  }

  window.BC.Crawler = { advance };
})();
