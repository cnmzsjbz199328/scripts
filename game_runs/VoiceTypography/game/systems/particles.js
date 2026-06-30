"use strict";

// Particle system: spawn burst on token appearance + continuous orbital aura
Object.assign(Stage.prototype, {

  // One-shot radial burst when a token first appears — dramatic pop effect.
  emitBurst(x, y, volume) {
    if (this.reduceMotion) return;
    const vol   = this._clamp(volume * this.sensitivity, 0, 1);
    const count = Math.round(3 + vol * 8);
    const speed = 45 + vol * 130;
    const color = vol > 0.55 ? COLORS.glow : COLORS.hot;
    const now   = performance.now();
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const spd   = speed * (0.25 + Math.random() * 0.75);
      this.particles.push({
        x, y,
        vx:   Math.cos(angle) * spd,
        vy:   Math.sin(angle) * spd,
        born: now,
        life: 280 + Math.random() * 360,
        size: 1.2 + Math.random() * 2.2,
        color
      });
    }
  },

  // Slow orbital micro-particles emitted continuously from a glyph's current position.
  // They spawn close to the glyph, move tangentially at low speed, and fade quickly —
  // creating a persistent aura that makes the text look like glowing plasma.
  emitOrbit(x, y, volume, color) {
    if (this.reduceMotion) return;
    const vol   = this._clamp(volume * this.sensitivity, 0, 1);
    const count = 1 + Math.round(vol * 2);
    const now   = performance.now();
    for (let i = 0; i < count; i++) {
      const a    = Math.random() * 2 * Math.PI;
      const r    = 3 + Math.random() * 9;           // spawn within ~9px of glyph centre
      const spd  = 5 + Math.random() * 13;
      // Tangential direction (±90° from radial) so particles orbit rather than escape
      const tang = a + Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1);
      this.particles.push({
        x:    x + Math.cos(a) * r,
        y:    y + Math.sin(a) * r,
        vx:   Math.cos(tang) * spd,
        vy:   Math.sin(tang) * spd,
        born: now,
        life: 180 + Math.random() * 160,
        size: 0.4 + Math.random() * 0.8,
        color
      });
    }
  },

  // Called each frame after drawLive. Emits orbital aura particles from every
  // live token's current rendered world position (tok._rx / tok._ry set by render.js).
  // Throttled to ~45 ms per token so particle count stays manageable.
  _emitLiveOrbits(now) {
    for (const tok of this.liveTokens) {
      if (tok._rx === undefined) continue;
      if (!tok._orbitAt || now - tok._orbitAt > 45) {
        tok._orbitAt = now;
        this.emitOrbit(tok._rx, tok._ry, tok.spawnVolume, this.colorForToken(tok));
      }
    }
  },

  drawParticles(now) {
    if (!this.particles.length) return;
    const ctx   = this.ctx;
    const alive = [];
    for (const p of this.particles) {
      const age = now - p.born;
      if (age >= p.life) continue;
      alive.push(p);
      const t  = age / p.life;
      const ts = age / 1000;
      ctx.save();
      ctx.globalAlpha = (1 - t) * (1 - t);
      ctx.fillStyle   = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur  = 4;
      ctx.beginPath();
      ctx.arc(p.x + p.vx * ts, p.y + p.vy * ts, p.size * (1 - t * 0.5), 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    }
    this.particles = alive;
  }

});
