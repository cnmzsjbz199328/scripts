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

    // segment splitting: track how many tokens from the current interim transcript
    // have already been committed, so each interim event doesn't re-add them
    this._interimOffset  = 0;
    this._splitThreshold = 5 + Math.floor(Math.random() * 4);  // 5–8 chars

    // circular mode: accumulated rotation angle in radians
    this._circleAngle = 0;

    // Markov chain: tracks last assigned effect so next token's probability is state-dependent
    this._lastEffect = 'pulse';

    // Frequency band energies — updated each frame from FFT data
    // freqLow  drives horizontal bounce amplitude (bass = big bounce)
    // freqHigh drives vertical cascade snap speed (treble = snappier entry)
    this.freqLow  = 0;
    this.freqHigh = 0;

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
    let prevNow = performance.now();
    const tick = (now) => {
      // Clamp dt to 50 ms so a hidden/backgrounded tab doesn't cause a jump
      const dt = Math.min((now - prevNow) / 1000, 0.05);
      prevNow = now;
      this.updateVolume();
      this.drawBackground();
      this.drawBgLines(now);
      const base = this.computeBaseSize();
      const cx = this.logicalWidth / 2, cy = this.logicalHeight / 2;
      this.drawLive(now, dt, cx, cy, base);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}
