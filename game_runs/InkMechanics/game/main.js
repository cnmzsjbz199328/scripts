/* game/main.js — 控制器 + Phaser 装配 + 对外契约
 * ─────────────────────────────────────────────────────────────────────────
 * 即开即玩：无存档、无选关。Ink.Game 只持有当前关卡引用 + 委派 __probe。
 * 必须最后引入（依赖 config/levels/physics/render/scenes 全部就位）。
 */
window.Ink = window.Ink || {};

window.Ink.Game = {
  auto: false,
  active: null,         // 当前 LevelScene
  _phaser: null,

  startLevel(idx) {
    const sm = this._phaser.scene;
    sm.stop('BootScene');
    sm.start('LevelScene', { idx });
  },

  // __probe：有活动关卡时取其状态，否则返回启动态 stub（始终合法）
  probe() {
    if (this.active && this.active.probe) return this.active.probe();
    const C = window.Ink.Config;
    return {
      x: 0, y: 0, topdown: true, moveX: 0, moveY: 0, attack: false,
      hp: C.MAX_HP, maxHp: C.MAX_HP,
      score: 0, goalScore: C.TOTAL_LEVELS, phase: -1, act: -1,
      deaths: 0, deathBudget: C.MAX_HP,
      won: false, lost: false, cardActive: false, started: true, mode: 'boot',
    };
  },
};

// 对外全局契约（与原 game-logic.js 一致）
window.__gameState = { player: { x: 0, y: 0, vx: 0, vy: 0 } };
window.__probe = () => window.Ink.Game.probe();
window.__advanceCard = () => { if (window.Ink.Game.active) window.Ink.Game.active._advanceCard(); };

const config = {
  type: Phaser.AUTO,
  width: window.Ink.Config.GAME_W,
  height: window.Ink.Config.GAME_H,
  parent: 'game-container',
  backgroundColor: '#eef2f6',
  // disableVisibilityChange 默认 false → 切走标签页/失焦时 Phaser 自动暂停主循环（无 UI）
  scene: [window.Ink.BootScene, window.Ink.LevelScene],
};

window.Ink.Game._phaser = new Phaser.Game(config);
