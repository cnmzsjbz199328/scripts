/* game/scenes/BootScene.js — 启动：加载图集 → 画箱体底 → START 后直接进第 1 舱
 * ─────────────────────────────────────────────────────────────────────────
 * 即开即玩：无存档、无选舱菜单。五舱线性流，START → 第 1 舱 → … → 爬出箱子。
 * navigator.webdriver（verify / playtest）→ 不显示菜单，直接开局。
 */
window.BC = window.BC || {};

class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload() {
    const S = window.BC.Config.SPRITE;
    this.load.spritesheet('crawler', 'assets/spritesheet.webp', { frameWidth: S.FW, frameHeight: S.FH });
  }

  create() {
    const G = window.BC.Game;
    G.auto = !!navigator.webdriver;

    // 三个动画（图集 16 列，帧号 = row*16 + col）
    const A = this.anims;
    if (!A.exists('crawl')) {
      A.create({ key: 'crawl',       frames: A.generateFrameNumbers('crawler', { start: 16, end: 23 }), frameRate: 10, repeat: -1 });
      A.create({ key: 'turnAround',  frames: A.generateFrameNumbers('crawler', { start: 0,  end: 13 }), frameRate: 14, repeat: 0 });
      A.create({ key: 'cornerCrawl', frames: A.generateFrameNumbers('crawler', { start: 32, end: 47 }), frameRate: 13, repeat: 0 });
    }

    // 箱体底纹
    window.BC.Render.drawCrate(this.add.graphics().setDepth(-100), window.BC.Config);

    const C = window.BC.Config;
    this.add.text(C.GAME_W / 2, C.GAME_H / 2 - 20, '📦', { fontSize: '52px' }).setOrigin(0.5).setDepth(1);
    this.add.text(C.GAME_W / 2, C.GAME_H / 2 + 44, 'BOX CRAWLER', {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '22px', color: '#8fd3ff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1);

    // START（DOM 遮罩）→ 直接开局
    window.GameHUD.onStart(() => { if (!G.active) G.startLevel(0); });
    if (G.auto) G.startLevel(0);
  }
}
window.BC.BootScene = BootScene;
