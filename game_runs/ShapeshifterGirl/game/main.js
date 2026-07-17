/* game/main.js — 控制器 + Phaser 装配 + 对外契约
 * ─────────────────────────────────────────────────────────────────────────
 * 即开即玩：无存档、无选关。SSG.Game 持有当前场景引用 + 委派 __probe。
 * 必须最后引入（依赖 config/levels/systems/scenes 全部就位）。
 */
window.SSG = window.SSG || {};

window.SSG.Game = {
  auto: false,
  active: null,         // 当前 LevelScene 实例
  _phaser: null,

  startLevel(idx) {
    const sm = this._phaser.scene;
    if (sm.isActive('BootScene')) {
      sm.stop('BootScene');
    }
    // 启动 LevelScene
    sm.start('LevelScene', { idx });
  },

  // __probe：外部（自动化验证 bot/verify）接口契约
  probe() {
    const C = window.SSG.Config;
    if (this.active && this.active.probe) {
      return this.active.probe();
    }
    return {
      x: 0,
      y: 0,
      hp: C.MAX_HP,
      maxHp: C.MAX_HP,
      score: 0,
      goalScore: C.TOTAL_LEVELS,
      won: false,
      lost: false,
      started: true,
      mode: 'boot',
      // 本作特有契约字段
      form: 'girl',
      morphing: false,
      nextGate: { at: 999999, need: 'none' },
      progress: 0,
      segment: 0,
      locked: false,
      cardActive: false
    };
  }
};

// 对外全局契约
window.__gameState = { player: { x: 0, y: 0, vx: 0, vy: 0 } };
window.__probe = () => window.SSG.Game.probe();
window.__advanceCard = () => {
  if (window.SSG.Game.active) {
    window.SSG.Game.active._advanceCard();
  }
};

// Phaser 装配（不留裸全局，基准重力唯一真源在 Config.PHYSICS）
window.SSG.Game._phaser = new Phaser.Game({
  type: Phaser.AUTO,
  width: window.SSG.Config.GAME_W,
  height: window.SSG.Config.GAME_H,
  parent: 'game-container',
  backgroundColor: '#070a13',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: window.SSG.Config.PHYSICS.GRAVITY_Y },
      debug: false
    }
  },
  scene: [window.SSG.BootScene, window.SSG.LevelScene]
});
