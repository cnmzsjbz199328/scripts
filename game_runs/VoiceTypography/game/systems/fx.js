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

  // Deterministic pseudo-random from an integer seed (fast hash)
  _hash(n) {
    n = ((n >> 16) ^ n) * 0x45d9f3b | 0;
    n = ((n >> 16) ^ n) * 0x45d9f3b | 0;
    return (((n >> 16) ^ n) >>> 0) / 0xffffffff;
  },

  // Smooth (value) noise: linearly interpolated between hashed lattice points.
  // t is a continuous coordinate; returns a value in [0, 1].
  _valueNoise(t) {
    const i = Math.floor(t);
    const f = t - i;
    const u = f * f * (3 - 2 * f);   // smoothstep
    return this._lerp(this._hash(i), this._hash(i + 1), u);
  },

  // Fractional Brownian motion: 3 octaves of value noise for natural-looking scatter.
  _smoothNoise(t) {
    return this._valueNoise(t) * 0.5
         + this._valueNoise(t * 2.1 + 5.3) * 0.33
         + this._valueNoise(t * 4.3 + 11.7) * 0.17;
  },

  // Coherent tilt: ±8°–75°, driven by smooth noise so adjacent segments
  // don't cluster at the same angle (avoids random clumping).
  _randTilt() {
    const idx = this.bgLines.length;
    const n1  = this._smoothNoise(idx * 0.37 + this._noiseSeed);
    const n2  = this._smoothNoise(idx * 0.37 + this._noiseSeed + 50);
    const deg = 8 + n1 * 67;
    const sign = n2 < 0.5 ? 1 : -1;
    return sign * deg * (Math.PI / 180);
  },

  // Coherent scatter: smooth noise distributes positions across the canvas
  // more evenly than pure random, avoiding visible clumping.
  _scatterPos() {
    const idx = this.bgLines.length;
    return {
      x: this._smoothNoise(idx * 0.41 + this._noiseSeed + 20) * this.logicalWidth,
      y: this._smoothNoise(idx * 0.41 + this._noiseSeed + 80) * this.logicalHeight
    };
  }

});
