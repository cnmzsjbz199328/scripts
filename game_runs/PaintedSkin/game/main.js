window.HuaPi = window.HuaPi || {};
(function () {
  const empty = {
    started: false, nodeId: null, pov: 'wang', vars: { xin: 0, dao: 0 }, flags: [], achievements: [],
    lineIdx: 0, typing: false, choicesOpen: false, choiceCount: 0, ended: false, endingId: null,
    won: false, pathLen: 0, bg: null, cg: null, stage: { L: null, C: null, R: null },
  };
  const game = window.HuaPi.Game = {
    boot: null, scene: null, runtime: null, view: null,
    started: false, startRequested: false, fast: false, events: [],
    botChoices: [], botIndex: 0, autoBot: false,
    start() {
      if (this.started) return false;
      this.startRequested = true;
      const overlay = document.getElementById('start-screen');
      if (overlay) overlay.style.display = 'none';
      if (!this.boot) return false;
      this.started = true;
      this.boot.scene.start('StoryScene');
      return true;
    },
    probe() { return this.runtime ? this.runtime.probe() : { ...empty, stage: { ...empty.stage }, vars: { ...empty.vars } }; },
  };

  window.__gameState = empty;
  window.__probe = () => game.probe();
  window.__hudStart = () => game.start();
  window.__advanceCard = () => game.runtime?.advance() ?? false;
  window.__advance = () => game.runtime?.advance() ?? false;
  window.__choose = (index) => game.runtime?.choose(Number(index)) ?? false;

  game.phaser = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-container',
    width: window.HuaPi.Config.WIDTH,
    height: window.HuaPi.Config.HEIGHT,
    backgroundColor: window.HuaPi.Config.BACKGROUND,
    antialias: true,
    roundPixels: false,
    disableContextMenu: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: window.HuaPi.Config.WIDTH,
      height: window.HuaPi.Config.HEIGHT,
    },
    fps: { target: 60, forceSetTimeOut: false },
    scene: [window.HuaPi.BootScene, window.HuaPi.StoryScene],
  });
})();
