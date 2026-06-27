"use strict";

// Token lifecycle: segmentation → live display → background commit
Object.assign(Stage.prototype, {

  tokenize(text) {
    text = (text || '').trim();
    if (!text) return [];
    return this.lang.startsWith('zh') ? Array.from(text) : text.split(/\s+/).filter(Boolean);
  },

  makeToken(text) {
    const r = Math.random();
    return {
      text,
      spawnVolume: this.smoothVol,
      spawnTime:   performance.now(),
      seed:        Math.random() * Math.PI * 2,
      effect:      r > 0.8 ? 'shake' : r > 0.62 ? 'tilt' : 'pulse',
      tilt:        (Math.random() - 0.5) * 0.28
    };
  },

  updateInterim(transcript) {
    const toks      = this.tokenize(transcript);
    const prevCount = this.prevInterimTokens.length;
    if (toks.length < prevCount) {
      // Recogniser revised downward — rebuild from scratch
      this.liveTokens = toks.map(t => this.makeToken(t));
    } else {
      for (const t of toks.slice(prevCount)) { this.liveTokens.push(this.makeToken(t)); }
    }
    this.prevInterimTokens = toks;
  },

  commitLine(transcript) {
    const toks = this.tokenize(transcript);
    for (const t of toks.slice(this.liveTokens.length)) { this.liveTokens.push(this.makeToken(t)); }

    if (this.liveTokens.length) {
      const cx = this.logicalWidth / 2;
      const cy = this.logicalHeight / 2;
      const sp = this._scatterPos();

      // Line starts at canvas centre (where live text was) and drifts to scatter target
      this.bgLines.push({
        tokens:    this.liveTokens,
        createdAt: performance.now(),

        // animated current state — starts exactly where live text was
        cx,  cy,
        tilt:  0,
        scale: 1.0,
        alpha: 0.9,

        // animated targets — scatter position, tilted, smaller
        tcx:    sp.x,
        tcy:    sp.y,
        tTilt:  this._randTilt(),
        tScale: 0.55 + Math.random() * 0.70,   // 0.55 – 1.25
        tAlpha: 0.70 + Math.random() * 0.22,   // 0.70 – 0.92

        dying: false
      });

      // Enforce cap: mark oldest living line for fade-out
      const alive = this.bgLines.filter(l => !l.dying);
      if (alive.length > BG_MAX) {
        alive[0].dying  = true;
        alive[0].tAlpha = 0;
      }
    }

    this.liveTokens        = [];
    this.prevInterimTokens = [];
  },

  onRecognitionResult(event) {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res        = event.results[i];
      const transcript = res[0] ? res[0].transcript : '';
      if (res.isFinal) this.commitLine(transcript);
      else             this.updateInterim(transcript);
    }
  }

});
