/* InkLine — Phaser 装配；由 game-logic.js 尾部平移。 */
const config = {
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  parent: 'game-container',
  backgroundColor: '#faf6ea',
  physics: { default: 'arcade', arcade: { gravity: { y: 1100 }, debug: false } },
  scene: InkLineScene,
};

new Phaser.Game(config);
