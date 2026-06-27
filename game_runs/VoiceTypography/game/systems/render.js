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

  // Always lays out items horizontally, centred at (centerX, centerY).
  // offsets: optional array of {dx, dy} applied per-item for rhythm effects.
  layoutLine(items, centerX, centerY, offsets) {
    if (!items.length) return;
    const ctx = this.ctx;
    const gap  = this.computeBaseSize() * 0.16;
    const dims = [];
    let total  = 0;
    for (const it of items) {
      ctx.font = `800 ${it.size}px ${FONT_FAMILY}`;
      const w = ctx.measureText(it.text).width;
      dims.push(w);
      total += w + gap;
    }
    total -= gap;
    let pos = -total / 2;
    for (let i = 0; i < items.length; i++) {
      const center = pos + dims[i] / 2;
      pos += dims[i] + gap;
      const off = offsets ? offsets[i] : null;
      const it  = items[i];
      this.paintGlyph(
        it.text,
        centerX + center + (off ? off.dx : 0),
        centerY           + (off ? off.dy : 0),
        it.size, it.rotation, it.color, it.glowColor, it.glowBlur
      );
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

    // 1. Animate + prune dead lines (backward for safe splice)
    for (let i = this.bgLines.length - 1; i >= 0; i--) {
      const line = this.bgLines[i];
      line.cx    = this._lerp(line.cx,    line.tcx,    0.05);
      line.cy    = this._lerp(line.cy,    line.tcy,    0.05);
      line.tilt  = this._lerp(line.tilt,  line.tTilt,  0.05);
      line.scale = this._lerp(line.scale, line.tScale, 0.06);
      line.alpha = this._lerp(line.alpha, line.tAlpha, line.dying ? 0.025 : 0.06);
      if (line.dying && line.alpha < 0.02) { this.bgLines.splice(i, 1); }
    }

    // 2. Draw oldest-first so newer lines appear on top
    for (const line of this.bgLines) {
      const age     = (now - line.createdAt) / 1000;
      const mixFade = this._clamp(age / 30, 0, 0.6);
      const items   = line.tokens.map(tok => ({
        text:      tok.text,
        size:      base * line.scale * (1 + tok.spawnVolume * 0.25),
        rotation:  0,
        color:     this.lerpColor(COLORS.base, COLORS.faded, mixFade * 0.5),
        glowColor: COLORS.base,
        glowBlur:  0
      }));

      this.ctx.save();
      this.ctx.globalAlpha = this._clamp(line.alpha, 0, 1);
      this.ctx.translate(line.cx, line.cy);
      this.ctx.rotate(line.tilt);
      this.layoutLine(items, 0, 0);
      this.ctx.restore();
    }
  },

  drawLive(now, cx, cy, baseSize) {
    if (!this.liveTokens.length) return;

    // In vertical mode the line width becomes screen height — cap it to prevent overflow
    let effectiveBase = baseSize;
    if (this.orientation === 'vertical') {
      const maxFit = Math.max(1, Math.floor(this.logicalHeight / (baseSize * 1.15)));
      if (this.liveTokens.length > maxFit) {
        effectiveBase = baseSize * maxFit / this.liveTokens.length;
      }
    }

    const items   = this.liveTokens.map(tok => {
      const age   = now - tok.spawnTime;
      const fresh = this._clamp(1 - age / 420, 0, 1);
      const tier  = this._clamp(tok.spawnVolume * this.sensitivity, 0, 1);
      return {
        text:      tok.text,
        size:      effectiveBase * this.computeScale(tok, now),
        rotation:  this.computeRot(tok, now),
        color:     this.colorForToken(tok),
        glowColor: tier > 0.5 ? COLORS.glow : COLORS.hot,
        glowBlur:  16 * fresh * tier
      };
    });
    const offsets = this.rhythmOffsets(this.liveTokens, now, effectiveBase);

    if (this.orientation === 'vertical') {
      this.ctx.save();
      this.ctx.translate(cx, cy);
      this.ctx.rotate(-Math.PI / 2);
      this.layoutLine(items, 0, 0, offsets);
      this.ctx.restore();
    } else {
      this.layoutLine(items, cx, cy, offsets);
    }
  }

});
