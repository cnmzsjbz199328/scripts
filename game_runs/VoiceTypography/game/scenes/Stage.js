"use strict";

class Stage {
  constructor() {
    this.canvas  = document.getElementById('stage');
    this.ctx     = this.canvas.getContext('2d');

    this.logicalWidth  = window.innerWidth;
    this.logicalHeight = window.innerHeight;

    // app state
    this.lang              = 'zh-CN';
    this.orientation       = 'horizontal';
    this.sensitivity       = 1.2;
    this.listening         = false;
    this.smoothVol         = 0;
    this.liveTokens        = [];
    this.prevInterimTokens = [];
    this.bgLines           = [];   // scattered background history

    // audio / recognition handles
    this.recognition = null;
    this.audioCtx    = null;
    this.analyser    = null;
    this.micStream   = null;

    this.reduceMotion = !!(window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    window.addEventListener('resize', () => this.resize());
    this.resize();
    this._startLoop();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.logicalWidth  = window.innerWidth;
    this.logicalHeight = window.innerHeight;
    this.canvas.width  = Math.round(this.logicalWidth  * dpr);
    this.canvas.height = Math.round(this.logicalHeight * dpr);
    this.canvas.style.width  = this.logicalWidth  + 'px';
    this.canvas.style.height = this.logicalHeight + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  _startLoop() {
    const tick = () => {
      const now = performance.now();
      this.updateVolume();
      this.drawBackground();
      this.drawBgLines(now);
      const base = this.computeBaseSize();
      const cx = this.logicalWidth / 2, cy = this.logicalHeight / 2;
      this.drawLive(now, cx, cy, base);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}
