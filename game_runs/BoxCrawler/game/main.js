/* game/main.js — 控制器 + Phaser 装配 + 对外契约
 * ─────────────────────────────────────────────────────────────────────────
 * 即开即玩：无存档、无选舱。BC.Game 只持有当前关卡引用 + 委派 __probe。
 * 必须最后引入（config/levels/path/systems/render/scenes 全部就位）。
 */
window.BC = window.BC || {};

window.BC.Game = {
  auto: false,
  active: null,          // 当前 LevelScene
  _phaser: null,

  startLevel(idx) {
    const sm = this._phaser.scene;
    sm.stop('BootScene');
    sm.start('LevelScene', { idx });
  },

  // __probe：有活动关卡时取其状态，否则返回启动态 stub（始终合法）
  probe() {
    if (this.active && this.active.probe) return this.active.probe();
    const C = window.BC.Config;
    return {
      x: 0, y: 0, worldW: C.TOTAL_LEVELS * 1000, cellX: C.TOTAL_LEVELS * 1000,
      nextGoalX: 0, progress: 0, segment: 0, locked: false,
      dangerNow: false, dangerAhead: false,
      hp: C.MAX_HP, maxHp: C.MAX_HP,
      score: 0, goalScore: C.TOTAL_LEVELS, phase: -1, act: -1,
      deaths: 0, deathBudget: C.MAX_HP,
      won: false, lost: false, cardActive: false, started: true, mode: 'boot',
    };
  },
};

// 对外全局契约
window.__gameState = { player: { x: 0, y: 0, vx: 0, vy: 0 } };
window.__probe = () => window.BC.Game.probe();
window.__advanceCard = () => { if (window.BC.Game.active) window.BC.Game.active._advanceCard(); };

const config = {
  type: Phaser.AUTO,
  width: window.BC.Config.GAME_W,
  height: window.BC.Config.GAME_H,
  parent: 'game-container',
  backgroundColor: '#120e0a',
  scene: [window.BC.BootScene, window.BC.LevelScene],
};

window.BC.Game._phaser = new Phaser.Game(config);
