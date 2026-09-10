/* game/systems/crawler.js — 沿轨道推进 s + 决定动作态（纯函数）
 * ─────────────────────────────────────────────────────────────────────────
 * advance(state, input, dt, cfg) 就地更新 state 并返回事件，供 LevelScene
 * 决定后果（播一次性动画 / 减速）。不碰 Phaser、不碰渲染。
 *
 * state = { s, dir, mode:'crawl'|'turn', turnLockT, moving, cornerIdx }
 * input = -1 | 0 | 1          （沿 +s / 停 / 沿 -s 的期望方向）
 * cfg   = { speed, pathLen, corners:[{s,deg}], cornerWindow, cornerSlow, turnLockMs }
 * 返回  = { state, event:'turn'|'corner'|'endClamp'|null, slow:bool, moving:bool }
 */
window.BC = window.BC || {};

(function () {
  function advance(state, input, dt, cfg) {
    const sign = input > 0 ? 1 : (input < 0 ? -1 : 0);
    let event = null;

    // ── 调头：正在爬行且方向反转 → 锁定移动、播 turnAround ──
    // 反向时清掉角点触发标记；否则刚完成正向过角后按返回，会在同一
    // 个 cornerWindow 内再次触发正向 corner 动画，把 s 拉回角点。
    if (state.mode === 'crawl' && sign !== 0 && sign !== state.dir) {
      state.cornerIdx = -1;
      if (state.moving) {
        state.mode = 'turn';
        state.turnLockT = cfg.turnLockMs / 1000;
        state.dir = sign;
        state.moving = false;
        return { state, event: 'turn', slow: false, moving: false };
      }
    }

    // ── 调头锁定中：不推进 s，等锁定结束 ──
    if (state.mode === 'turn') {
      state.turnLockT -= dt;
      if (state.turnLockT <= 0) { state.mode = 'crawl'; state.turnLockT = 0; }
      state.moving = false;
      return { state, event: null, slow: false, moving: false };
    }

    // ── 普通爬行 ──
    if (sign !== 0) state.dir = sign;

    // 拐角窗口：进入某个大转角顶点的 ±cornerWindow → 减速 + 首帧发 'corner'
    let slow = false, curCorner = -1;
    for (let i = 0; i < cfg.corners.length; i++) {
      if (Math.abs(state.s - cfg.corners[i].s) < cfg.cornerWindow) { curCorner = i; slow = true; break; }
    }
    // cornerTurnCCW is authored for +s only. Returning traverses the same
    // polyline in reverse and must never enter the forward-only corner lock.
    if (sign > 0) {
      if (curCorner !== -1 && curCorner !== state.cornerIdx) event = 'corner';
      state.cornerIdx = curCorner;
    } else if (sign < 0) {
      slow = false;
      state.cornerIdx = -1;
    }

    if (sign === 0) { state.moving = false; return { state, event, slow, moving: false }; }

    const v = cfg.speed * (slow ? cfg.cornerSlow : 1);
    let ns = state.s + sign * v * dt;
    if (ns <= 0) { if (state.s > 0) event = event || 'endClamp'; ns = 0; }
    else if (ns >= cfg.pathLen) { if (state.s < cfg.pathLen) event = event || 'endClamp'; ns = cfg.pathLen; }

    const moved = Math.abs(ns - state.s) > 1e-4;
    state.s = ns;
    state.moving = moved;
    return { state, event, slow, moving: moved };
  }

  window.BC.Crawler = { advance };
})();
