/* game/scenes/BootScene.js — 启动场景
 * ─────────────────────────────────────────────────────────────────────────
 * 画渐变底图，当 START 按下时直接开局进入第 1 关。
 */
window.SSG = window.SSG || {};

class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    const G = window.SSG.Game;
    G.auto = !!navigator.webdriver;

    // 创建背景画板并绘制远景
    window.SSG.Render.init(this);
    window.SSG.Render.drawParallaxBackground(this);

    // 绑定 HUD START 按钮动作进入第一关
    window.GameHUD.onStart(() => {
      G.startLevel(0);
    });

    // 如果是自动运行模式，自动点击开始游戏
    if (G.auto) {
      this.time.delayedCall(500, () => {
        window.__hudStart();
      });
    }
  }
}

window.SSG.BootScene = BootScene;
