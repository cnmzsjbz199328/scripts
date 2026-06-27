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

  // Per-token {dx, dy} offsets that give each orientation its own rhythm personality.
  // Horizontal: alternating up/down stagger (piano-key bounce).
  // Vertical:   each char slides down from above; chars naturally cascade because
  //             makeToken records a fresh spawnTime for every new character added.
  rhythmOffsets(tokens, now, baseSize) {
    if (this.reduceMotion || !tokens.length) return null;

    if (this.orientation === 'horizontal') {
      return tokens.map((tok, i) => {
        const age = now - tok.spawnTime;
        const amp = baseSize * 0.32 * this._clamp(tok.spawnVolume * this.sensitivity, 0.12, 1);
        return { dx: 0, dy: (i % 2 === 0 ? -1 : 1) * amp * Math.exp(-age / 400) };
      });
    }

    // Vertical mode — layout is rotated -90°, so layout +X = upward on screen.
    // Positive dx offset = char starts above its resting position and falls down.
    return tokens.map(tok => {
      const age = now - tok.spawnTime;
      const amp = baseSize * 0.85;
      return { dx: amp * Math.exp(-age / 340), dy: 0 };
    });
  },

  // Random tilt: ±8°–75°, wide range including near-vertical for visual variety
  _randTilt() {
    const deg = 8 + Math.random() * 67;
    return (Math.random() < 0.5 ? 1 : -1) * deg * (Math.PI / 180);
  },

  // Uniform scatter across the full canvas so text fills edge-to-edge
  _scatterPos() {
    return {
      x: Math.random() * this.logicalWidth,
      y: Math.random() * this.logicalHeight
    };
  }

});
