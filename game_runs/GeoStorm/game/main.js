/* GeoStorm — Phaser 装配；由 game-logic.js 尾部平移。 */
const config = {
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  parent: 'game-container',
  backgroundColor: '#dce8f2',
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  scene: GeoStormScene,
};

new Phaser.Game(config);
