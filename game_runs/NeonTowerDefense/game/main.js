/* NeonTowerDefense — Phaser 装配;由 game-logic.js 尾部平移。 */
const config = {
  type: Phaser.AUTO,
  width: 960,
  height: 576,
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: MainScene
};

new Phaser.Game(config);
