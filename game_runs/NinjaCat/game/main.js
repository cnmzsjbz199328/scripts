/* NinjaCat — Phaser 装配；由 game-logic.js 尾部平移。 */
const phaserConfig = {
  type: Phaser.AUTO,
  width: 960,
  height: 640,
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: window.GAME_CONFIG.gravity },
      debug: false
    }
  },
  scene: MainScene
};

// Start the game instance
const game = new Phaser.Game(phaserConfig);
