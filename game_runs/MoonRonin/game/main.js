/* MoonRonin — Phaser 装配；由 game-logic.js 尾部平移。 */
const config = {
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  parent: 'game-container',
  backgroundColor: '#0a0e1a',
  physics: { default: 'arcade', arcade: { gravity: { y: 1100 }, debug: false } },
  scene: MoonRoninScene,
};

new Phaser.Game(config);
