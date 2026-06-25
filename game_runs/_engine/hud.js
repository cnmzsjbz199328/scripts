/* engine/hud.js — 跨游戏共享 HUD 契约
 * ─────────────────────────────────────────────────────────────────────────
 * 历史：这段 GameHUD 曾被复制粘贴在 22 个游戏的 index.html 里。现提取为共享层，
 * 各游戏只需在 index.html 引入本文件 + 保留对应的 DOM 节点(#hud / #start-screen /
 * #gameover-screen)即可。API 字节级保持不变，老的 game-logic 无需改动。
 *
 * 依赖的 DOM id（由各游戏 index.html 提供）：
 *   #hud, #hud-hearts, #hud-score-value, #hud-objective-text,
 *   #start-screen, #gameover-screen, #gameover-title, #gameover-message
 *
 * 暴露：window.GameHUD、window.__hudStart
 */
(function () {
  if (window.GameHUD) return;          // 幂等：避免重复注入

  let _startCallback = null;
  let _started = false;
  let _isPvP = false;

  function $(id) { return document.getElementById(id); }
  function showHud() { const el = $('hud'); if (el) el.style.display = 'flex'; }

  // __hudStart 必须在 return 前定义，以便从闭包捕获 _startCallback / showHud
  window.__hudStart = function (isPvP = false) {
    if (_started) return;
    _started = true;
    _isPvP = isPvP;
    const ss = $('start-screen'); if (ss) ss.style.display = 'none';
    showHud();
    if (_startCallback) _startCallback(isPvP);
  };

  const GameHUD = {
    setHearts(current, maxHp) {
      const el = $('hud-hearts');
      if (!el) return;
      const g = window.GAME_HUD_GLYPHS || { full: '◆', empty: '◇' };   // 各游戏可覆盖字形(♥/◆…)
      const max = maxHp ?? 4;
      const filled = Math.max(0, Math.min(current, max));
      const empty = max - filled;
      el.textContent = g.full.repeat(filled) + g.empty.repeat(empty);
    },
    setScore(value) {
      const el = $('hud-score-value');
      if (el) el.textContent = value;
    },
    setObjective(text) {
      const el = $('hud-objective-text');
      if (el) el.textContent = text;
    },
    onStart(cb) {
      _startCallback = cb;
      if (_started) cb(_isPvP);
    },
    showGameOver(win, message) {
      const overlay = $('gameover-screen');
      const title = $('gameover-title');
      const msg = $('gameover-message');
      if (title) {
        title.textContent = win ? '🎉 YOU WIN' : 'GAME OVER';
        title.className = win ? 'win' : 'lose';
      }
      if (msg) msg.textContent = message ?? '';
      if (overlay) overlay.style.display = 'flex';
      const hud = $('hud'); if (hud) hud.style.display = 'none';
    },
    // 隐藏胜负遮罩（供「再玩一次/返回菜单」复用，不必 location.reload）
    hideGameOver() {
      const overlay = $('gameover-screen');
      if (overlay) overlay.style.display = 'none';
    },
  };

  window.GameHUD = GameHUD;

  // Headless 截图：URL 带 ?autostart 时自动开局
  if (window.location.search.includes('autostart')) {
    setTimeout(() => {
      if (window.__hudStart) window.__hudStart(window.location.search.includes('pvp'));
    }, 300);
  }
})();
