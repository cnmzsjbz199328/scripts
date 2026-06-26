"use strict";

// All canvas drawing: background pulse, live tokens, history scroll
Object.assign(Stage.prototype, {

  paintGlyph(text, x, y, size, rot, color, glowColor, glowBlur) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.font          = `800 ${size}px ${FONT_FAMILY}`;
    ctx.textAlign     = 'center';
    ctx.textBaseline  = 'middle';
    if (glowBlur > 0.4) { ctx.shadowColor = glowColor; ctx.shadowBlur = glowBlur; }
    ctx.fillStyle = color;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  },

  layoutLine(items, centerX, centerY) {
    if (!items.length) return;
    const ctx     = this.ctx;
    const gapBase = this.computeBaseSize() * 0.16;
    const dims    = [];
    let total     = 0;
    for (const it of items) {
      ctx.font = `800 ${it.size}px ${FONT_FAMILY}`;
      const dim = this.orientation === 'horizontal'
        ? ctx.measureText(it.text).width
        : it.size * 1.05;
      dims.push(dim);
      total += dim + gapBase;
    }
    total -= gapBase;
    let pos = -total / 2;
    for (let i = 0; i < items.length; i++) {
      const center = pos + dims[i] / 2;
      pos += dims[i] + gapBase;
      const x = this.orientation === 'horizontal' ? centerX + center : centerX;
      const y = this.orientation === 'horizontal' ? centerY           : centerY + center;
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

  drawLive(now, cx, cy, baseSize) {
    if (!this.liveTokens.length) return;
    const items = this.liveTokens.map(tok => {
      const age  = now - tok.spawnTime;
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
  },

  drawHistory(now, cx, cy, baseSize) {
    for (let i = 0; i < this.historyLines.length; i++) {
      const line  = this.historyLines[i];
      const depth = i;
      line.currentOffset  = this._lerp(line.currentOffset,  (depth + 1) * baseSize * 1.55, 0.12);
      line.currentOpacity = this._lerp(line.currentOpacity, Math.max(0, 1 - (depth + 1) * 0.16), 0.12);

      if (line.currentOpacity < 0.02 && depth >= MAX_HISTORY - 1) {
        this.historyLines.splice(i, 1); i--; continue;
      }

      const age        = now - line.finalizedAt;
      const pop        = 1 + 0.32 * Math.exp(-age / 170);
      const depthScale = Math.pow(0.9, depth + 1);
      const mixFactor  = this._clamp(depth * 0.18, 0, 1);

      let lineCx = cx, lineCy = cy;
      if (this.orientation === 'horizontal') {
        lineCy = cy - line.currentOffset;
        lineCx = cx + line.jitterOffset * 0.4;
      } else {
        lineCx = cx - line.currentOffset;
        lineCy = cy + line.jitterOffset * 0.4;
      }

      const items = line.tokens.map(tok => ({
        text:      tok.text,
        size:      baseSize * depthScale * pop * (1 + tok.spawnVolume * 0.35),
        rotation:  tok.tilt * 0.6,
        color:     this.lerpColor(this.colorForToken(tok), COLORS.faded, mixFactor),
        glowColor: COLORS.glow,
        glowBlur:  0
      }));

      this.ctx.save();
      this.ctx.globalAlpha = this._clamp(line.currentOpacity, 0, 1);
      this.layoutLine(items, lineCx, lineCy);
      this.ctx.restore();
    }
  }

});
