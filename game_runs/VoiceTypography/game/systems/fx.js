"use strict";

// Animation math + colour helpers — injected into Stage.prototype
Object.assign(Stage.prototype, {

  _clamp(v, a, b) { return Math.max(a, Math.min(b, v)); },
  _lerp(a, b, t)  { return a + (b - a) * t; },

  _hexToRgb(hex) {
    const h = hex.replace('#', '');
    return [
      parseInt(h.substring(0, 2), 16),
      parseInt(h.substring(2, 4), 16),
      parseInt(h.substring(4, 6), 16)
    ];
  },

  lerpColor(hexA, hexB, t) {
    t = this._clamp(t, 0, 1);
    const a = this._hexToRgb(hexA), b = this._hexToRgb(hexB);
    return `rgb(${Math.round(this._lerp(a[0],b[0],t))},` +
                `${Math.round(this._lerp(a[1],b[1],t))},` +
                `${Math.round(this._lerp(a[2],b[2],t))})`;
  },

  computeBaseSize() {
    return this._clamp(Math.min(this.logicalWidth, this.logicalHeight) * 0.1, 26, 96);
  },

  computeScale(tok, now) {
    const age   = now - tok.spawnTime;
    const boost = this.reduceMotion
      ? tok.spawnVolume * 0.3
      : tok.spawnVolume * this.sensitivity * 0.95;
    const decay = tok.effect === 'shake' ? 600 : 360;
    return 1 + boost * Math.exp(-age / decay);
  },

  computeRot(tok, now) {
    if (this.reduceMotion) return tok.tilt * 0.25;
    const age = now - tok.spawnTime;
    if (tok.effect === 'tilt')  return tok.tilt;
    if (tok.effect === 'shake') return Math.sin(age / 68  + tok.seed) * 0.34 * Math.exp(-age / 520);
    return                             Math.sin(age / 95  + tok.seed) * 0.11 * Math.exp(-age / 300);
  },

  colorForToken(tok) {
    const t = this._clamp(tok.spawnVolume * this.sensitivity * 1.3, 0, 1);
    return this.lerpColor(COLORS.base, COLORS.hot, t);
  },

  // Random tilt for background lines: ±12°–38°, never within ±5° of upright
  _randTilt() {
    const deg = 12 + Math.random() * 26;
    return (Math.random() < 0.5 ? 1 : -1) * deg * (Math.PI / 180);
  },

  // Random scatter position, biased toward the outer 28% of each axis
  _scatterPos() {
    const axisVal = (size) => {
      if (Math.random() < 0.7) {
        return Math.random() < 0.5
          ? Math.random() * size * 0.28
          : size * 0.72 + Math.random() * size * 0.28;
      }
      return Math.random() * size;
    };
    return { x: axisVal(this.logicalWidth), y: axisVal(this.logicalHeight) };
  }

});
