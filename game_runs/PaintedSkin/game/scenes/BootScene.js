window.HuaPi = window.HuaPi || {};
window.HuaPi.BootScene = class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }

  create() {
    this.cameras.main.setBackgroundColor(window.HuaPi.Config.BACKGROUND);
    this.add.text(640, 360, '画皮', { fontFamily: 'serif', fontSize: '36px', color: '#d8c6b1' }).setOrigin(0.5).setAlpha(0.65);
    window.HuaPi.Game.boot = this;
    const params = new URLSearchParams(window.location.search);
    if (navigator.webdriver || params.has('autostart')) {
      if (navigator.webdriver) window.HuaPi.Game.fast = true;
      window.HuaPi.Game.startRequested = true;
      this.time.delayedCall(0, () => window.HuaPi.Game.start());
    }
    if (window.HuaPi.Game.startRequested) this.time.delayedCall(0, () => window.HuaPi.Game.start());
  }
};
