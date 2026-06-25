/* game/scenes/BootScene.js — 启动：画蓝图底 → START 后直接进第1关
 * ─────────────────────────────────────────────────────────────────────────
 * 即开即玩原则：无存档、无选关菜单。五关线性流，START → 第1关 → … → 通关。
 */
window.Ink = window.Ink || {};

class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  create() {
    const G = window.Ink.Game;
    G.auto = !!navigator.webdriver;                 // 自动试玩/验证模式

    // 蓝图底纹
    window.Ink.Render.drawPaper(this.add.graphics().setDepth(-100));

    // START（DOM 遮罩）按下 → 直接开局
    window.GameHUD.onStart(() => G.startLevel(0));
  }
}
window.Ink.BootScene = BootScene;
