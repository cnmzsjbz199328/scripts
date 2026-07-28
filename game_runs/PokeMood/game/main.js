/* Phaser 装配 + 对外契约（MIGRATION §3）。
 *
 * 本游戏对契约的一处**有意偏离**：不设 window.__gameState.player。
 * game-verify 的 L2 一旦发现该字段，就会断言"按方向键后 player.x/y 必须变化"。
 * 这是个不能移动的触碰玩具，暴露它等于自造一条必挂的断言。
 * 画面变化断言由常驻的 idle 动画满足。
 */
window.PM = window.PM || {};

(function () {
  const C = PM.Config;

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-container',
    width: C.WIDTH,
    height: C.HEIGHT,
    backgroundColor: '#0d1119',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [PM.BootScene, PM.StageScene],
    disableVisibilityChange: false,   // 失焦自动暂停，无 UI
  });

  PM.game = game;

  const stage = () => game.scene.getScene('Stage');

  /* ── 对外契约 ──────────────────────────────────────────── */

  window.__probe = function () {
    const s = stage();
    if (!s || !s.state) {
      return { started: false, mood: 'NEUTRAL', patience: 100, heat: {},
               lastRegion: null, lastTier: 0, locked: false, reactionsPlayed: 0,
               combo: 0, playingTier: 0, queuedTier: 0, aborting: false, voicing: false,
               anim: null, loaded: 0, allLoaded: !!PM.allLoaded };
    }
    const st = s.state;
    return {
      started: true,
      mood: st.mood,
      patience: Math.round(st.patience),
      heat: Object.fromEntries(Object.entries(st.heat).map(([k, v]) => [k, Math.round(v)])),
      lastRegion: st.lastRegion,
      lastTier: st.lastTier,
      locked: !!s.perform,                                   // 表演中（含收尾让位）
      playingTier: s.perform ? s.perform.tier : 0,            // 正在演的等级
      queuedTier: s.pending ? s.pending.tier : 0,             // 排队槽里的等级
      aborting: !!(s.perform && s.perform.phase === 'abort'), // 正在快速收尾归位
      voicing: !!s._currentVoice,                             // 有没有配音在响（查交叉说话）
      combo: st.combo,
      reactionsPlayed: st.reactionsPlayed,
      anim: s.char?.anims?.currentAnim?.key ?? null,
      loaded: PM.loaded ? PM.loaded.size : 0,
      allLoaded: !!PM.allLoaded,
    };
  };

  /* 测试接缝：绕过指针直接注入一次触碰。
   * 无头环境下合成 pointer 事件不可靠（ShadowForge 那条教训：直调场景方法，
   * 不要指望敲输入层），poke-bot 主要走这条，另外单独验一次真实指针路径。 */
  window.__poke = function (regionId, gesture) {
    const s = stage();
    if (!s || !s.state) return null;
    return s.poke(regionId, gesture || 'tap');
  };

  // 本游戏没有叙事卡；保留契约供通用脚本调用
  window.__advanceCard = function () { return false; };

  // bot / ?autostart 直接进玩法，跳过开始遮罩
  if (navigator.webdriver || location.search.includes('autostart')) {
    const kick = () => (window.__hudStart ? window.__hudStart() : setTimeout(kick, 40));
    setTimeout(kick, 60);
  }
})();
