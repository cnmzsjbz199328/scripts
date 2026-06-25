/* DustTown — Phaser 装配；由 game-logic.js 尾部平移。 */
const config = {
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  parent: 'game-container',
  backgroundColor: '#2a1a0e',
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  scene: DustTownScene,
};

new Phaser.Game(config);
