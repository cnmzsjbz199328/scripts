/* RaccoonDungeon — Phaser 装配;由 game-logic.js 尾部平移。 */
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
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

// Start the game!
new Phaser.Game(config);
