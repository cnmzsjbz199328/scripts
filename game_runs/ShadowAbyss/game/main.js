/* ShadowAbyss — Phaser 装配（叙事游戏，无物理）。 */
const config = {
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  parent: 'game-container',
  backgroundColor: '#05060c',
  scene: StoryScene,
};

new Phaser.Game(config);
