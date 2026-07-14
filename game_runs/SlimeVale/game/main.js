/* SlimeVale — Phaser 装配（手写运动/命中，无物理引擎；世界宽 14000，镜头是滑动窗口）。 */
new Phaser.Game({
  type: Phaser.AUTO,
  width: Forge.W,
  height: Forge.H,
  parent: 'game-container',
  backgroundColor: '#bfe8f5',
  scene: MeadowScene,
});
