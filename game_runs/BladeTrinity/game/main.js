/* BladeTrinity — Phaser 装配。必须最后加载。 */
new Phaser.Game({
  type: Phaser.AUTO,
  width: BT.GAME_W,
  height: BT.GAME_H,
  parent: 'game-container',
  backgroundColor: '#1a1430',
  pixelArt: false,
  physics: { default: 'arcade', arcade: { gravity: { y: BT.GRAVITY }, debug: false } },
  scene: BladeTrinityScene,
});
