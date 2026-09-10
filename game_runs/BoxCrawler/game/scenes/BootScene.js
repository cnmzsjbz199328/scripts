/* game/scenes/BootScene.js — 启动：加载图集 → 画箱体底 → 直接进拐角测试舱
 * ─────────────────────────────────────────────────────────────────────────
 * 即开即玩：无存档、无入口按钮。四舱线性流，从拐角测试舱开始。
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

    // 三个动画（图集 14 列，帧号 = row*14 + col）
    const A = this.anims;
    const S = window.BC.Config.SPRITE;
    const cornerStart = S.CORNER_TURN_START + S.CORNER_TURN_SKIP;
    if (!A.exists('crawl')) {
      A.create({ key: 'crawl',       frames: A.generateFrameNumbers('crawler', { start: S.CRAWL_START, end: S.CRAWL_START + 7 }), frameRate: 10, repeat: -1 });
      A.create({ key: 'turnAround',  frames: A.generateFrameNumbers('crawler', { start: 0,  end: 13 }), frameRate: 14, repeat: 0 });
      A.create({ key: 'cornerTurnCCW', frames: A.generateFrameNumbers('crawler', { start: cornerStart, end: cornerStart + S.CORNER_TURN_COUNT - 1 }), frameRate: 16, repeat: 0 });
    }

    // 箱体底纹
    window.BC.Render.drawCrate(this.add.graphics().setDepth(-100), window.BC.Config);

    const C = window.BC.Config;
    this.add.text(C.GAME_W / 2, C.GAME_H / 2 - 20, '📦', { fontSize: '52px' }).setOrigin(0.5).setDepth(1);
    this.add.text(C.GAME_W / 2, C.GAME_H / 2 + 44, 'BOX CRAWLER', {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '22px', color: '#8fd3ff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1);

    // 直接进入拐角测试舱；自动试玩与手动测试都从这里开始。
    window.__hudStart && window.__hudStart();
    G.startLevel(0);
  }
}
window.BC.BootScene = BootScene;
