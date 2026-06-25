/* Coalesce — Phaser 装配；由 game-logic.js 尾部平移(自管 AABB 物理，无 arcade 配置)。 */
const config = {
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  parent: 'game-container',
  backgroundColor: '#faf6ea',
  scene: CoalesceScene,
};

new Phaser.Game(config);
