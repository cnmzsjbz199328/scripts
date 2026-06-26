"use strict";

// All canvas drawing: background pulse, scattered bg lines, live tokens
Object.assign(Stage.prototype, {

  paintGlyph(text, x, y, size, rot, color, glowColor, glowBlur) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.font         = `800 ${size}px ${FONT_FAMILY}`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    if (glowBlur > 0.4) { ctx.shadowColor = glowColor; ctx.shadowBlur = glowBlur; }
    ctx.fillStyle = color;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  },

  // orient overrides this.orientation — used by bgLines which are always horizontal
  layoutLine(items, centerX, centerY, orient) {
    if (!items.length) return;
    const ctx = this.ctx;
    const isH = (orient || this.orientation) === 'horizontal';
    const gap  = this.computeBaseSize() * 0.16;
    const dims = [];
    let total  = 0;
    for (const it of items) {
      ctx.font = `800 ${it.size}px ${FONT_FAMILY}`;
      const dim = isH ? ctx.measureText(it.text).width : it.size * 1.05;
      dims.push(dim);
      total += dim + gap;
    }
    total -= gap;
    let pos = -total / 2;
    for (let i = 0; i < items.length; i++) {
      const center = pos + dims[i] / 2;
      pos += dims[i] + gap;
      const x = isH ? centerX + center : centerX;
      const y = isH ? centerY           : centerY + center;
      const it = items[i];
      this.paintGlyph(it.text, x, y, it.size, it.rotation, it.color, it.glowColor, it.glowBlur);
    }
  },

  drawBackground() {
    const { ctx, logicalWidth: w, logicalHeight: h } = this;
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const r  = 90 + this.smoothVol * this.sensitivity * 260;
    const g  = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(255,77,109,${(0.08 + this.smoothVol * 0.18).toFixed(3)})`);
    g.addColorStop(1, 'rgba(255,77,109,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  },

  drawBgLines(now) {
    const base = this.computeBaseSize();

    // 1. Animate + prune dead lines (backward to allow safe splice)
    for (let i = this.bgLines.length - 1; i >= 0; i--) {
      const line = this.bgLines[i];
      // Position / tilt / scale drift toward scatter targets
      line.cx    = this._lerp(line.cx,    line.tcx,    0.05);
      line.cy    = this._lerp(line.cy,    line.tcy,    0.05);
      line.tilt  = this._lerp(line.tilt,  line.tTilt,  0.05);
      line.scale = this._lerp(line.scale, line.tScale, 0.06);
      // Opacity: fast fade-in for living, slow (~1.2 s) fade-out for dying
      line.alpha = this._lerp(line.alpha, line.tAlpha, line.dying ? 0.025 : 0.06);
      if (line.dying && line.alpha < 0.02) { this.bgLines.splice(i, 1); }
    }

    // 2. Draw remaining lines oldest-first (oldest behind newest)
    for (const line of this.bgLines) {
      // Colour shifts toward faded over time (full desaturation at ~30 s)
      const age      = (now - line.createdAt) / 1000;
      const mixFade  = this._clamp(age / 30, 0, 0.6);

      const items = line.tokens.map(tok => ({
        text:      tok.text,
        size:      base * line.scale * (1 + tok.spawnVolume * 0.25),
        rotation:  0,   // per-token spin removed in bg — whole line tilts instead
        color:     this.lerpColor(this.colorForToken(tok), COLORS.faded, 0.4 + mixFade),
        glowColor: COLORS.glow,
        glowBlur:  0
      }));

      // Apply whole-line tilt via canvas transform, items centered at origin
      this.ctx.save();
      this.ctx.globalAlpha = this._clamp(line.alpha, 0, 1);
      this.ctx.translate(line.cx, line.cy);
      this.ctx.rotate(line.tilt);
      this.layoutLine(items, 0, 0, 'horizontal');
      this.ctx.restore();
    }
  },

  drawLive(now, cx, cy, baseSize) {
    if (!this.liveTokens.length) return;
    const items = this.liveTokens.map(tok => {
      const age   = now - tok.spawnTime;
      const fresh = this._clamp(1 - age / 420, 0, 1);
      const tier  = this._clamp(tok.spawnVolume * this.sensitivity, 0, 1);
      return {
        text:      tok.text,
        size:      baseSize * this.computeScale(tok, now),
        rotation:  this.computeRot(tok, now),
        color:     this.colorForToken(tok),
        glowColor: tier > 0.5 ? COLORS.glow : COLORS.hot,
        glowBlur:  16 * fresh * tier
      };
    });
    this.layoutLine(items, cx, cy);
  }

});
