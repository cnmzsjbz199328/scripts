/* WyrmsEnd — Phaser 装配（手写运动/命中，无物理引擎；世界宽 16000，镜头是滑动窗口）。 */
new Phaser.Game({
  type: Phaser.AUTO,
  width: Forge.W,
  height: Forge.H,
  parent: 'game-container',
  backgroundColor: '#05060c',
  scene: JourneyScene,
});
