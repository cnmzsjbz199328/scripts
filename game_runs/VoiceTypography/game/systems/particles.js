"use strict";

// Short-lived spark particles emitted when a live token first appears on screen
Object.assign(Stage.prototype, {

  emitBurst(x, y, volume) {
    if (this.reduceMotion) return;
    const vol   = volume * this.sensitivity;
    const count = Math.round(4 + vol * 10);
    const speed = 55 + vol * 170;
    const color = vol > 0.55 ? COLORS.glow : COLORS.hot;
    const now   = performance.now();
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const spd   = speed * (0.3 + Math.random() * 0.7);
      this.particles.push({
        x, y,
        vx:   Math.cos(angle) * spd,
        vy:   Math.sin(angle) * spd,
        born: now,
        life: 350 + Math.random() * 450,   // 350–800 ms
        size: 1.5 + Math.random() * 2.5,
        color
      });
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
      ctx.shadowBlur  = 5;
      ctx.beginPath();
      ctx.arc(p.x + p.vx * ts, p.y + p.vy * ts, p.size * (1 - t * 0.5), 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    }
    this.particles = alive;
  }

});
