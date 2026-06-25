/* StickmanFighter — Phaser 装配
 * 由 game-logic.js 单体机械拆分而来；方法体逐字保留，PvP 已移除。 */
const config = {
  type: Phaser.AUTO,
  width: 960,
  height: 576,
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1000 },
      debug: false
    }
  },
  scene: MainScene
};

new Phaser.Game(config);
