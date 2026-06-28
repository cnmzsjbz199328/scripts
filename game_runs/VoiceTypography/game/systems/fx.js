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
    const age   = (now - tok.spawnTime) / 1000;  // seconds for oscillator math
    const boost = this.reduceMotion
      ? tok.spawnVolume * 0.3
      : tok.spawnVolume * this.sensitivity * 0.95;
    if (this.reduceMotion || boost < 0.01) return 1 + boost;

    // Underdamped oscillator: scale = 1 + boost · e^(−ζωt) · cos(ω_d · t)
    // ζ < 1 → overshoot on pop, then rings down — different feel per effect type.
    let zeta, omega;
    switch (tok.effect) {
      case 'shake': zeta = 0.35; omega = 12; break;  // springy, fast ringing
      case 'tilt':  zeta = 0.80; omega = 6;  break;  // near-critical, smooth settle
      default:      zeta = 0.50; omega = 8;  break;  // pulse: one clean overshoot
    }
    const omegaD = omega * Math.sqrt(1 - zeta * zeta);
    return Math.max(0.25, 1 + boost * Math.exp(-zeta * omega * age) * Math.cos(omegaD * age));
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

  // Per-token {dx, dy} offsets driven by frequency band energies.
  // Horizontal: low-freq band (bass) drives bounce amplitude — loud bass = big stagger.
  // Vertical:   high-freq band (treble) drives cascade snap speed — bright highs = snappier entry.
  rhythmOffsets(tokens, now, baseSize) {
    if (this.reduceMotion || !tokens.length) return null;

    if (this.orientation === 'horizontal') {
      // freqLow: 0–1 smoothed bass energy; falls back to smoothVol when no FFT data
      const drive = this._clamp((this.freqLow || this.smoothVol) * this.sensitivity, 0.12, 1);
      return tokens.map((tok, i) => {
        const age = now - tok.spawnTime;
        const amp = baseSize * 0.38 * drive;
        return { dx: 0, dy: (i % 2 === 0 ? -1 : 1) * amp * Math.exp(-age / 400) };
      });
    }

    // Vertical mode — layout is rotated -90°, so layout +X = upward on screen.
    // freqHigh controls how far each char slides in from above before settling.
    const snap = 0.55 + this._clamp((this.freqHigh || this.smoothVol) * this.sensitivity, 0, 1) * 0.65;
    return tokens.map(tok => {
      const age = now - tok.spawnTime;
      return { dx: baseSize * snap * Math.exp(-age / 340), dy: 0 };
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
