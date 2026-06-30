"use strict";

// All canvas drawing: background pulse, scattered bg lines, live tokens
Object.assign(Stage.prototype, {

  // Draw a glyph with layered glow so it looks like glowing energy rather than
  // solid ink. Double-render: wide diffuse pass first, tight core pass on top.
  paintGlyph(text, x, y, size, rot, color, glowColor, glowBlur) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.font         = `800 ${size}px ${FONT_FAMILY}`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = color;
    if (glowBlur > 0.4) {
      // Wide diffuse outer glow — looks like a particle cloud surrounding the glyph
      ctx.shadowColor = glowColor;
      ctx.shadowBlur  = glowBlur * 2.4;
      ctx.fillText(text, 0, 0);
      // Tight inner glow drawn on top — crisp core
      ctx.shadowBlur  = glowBlur * 0.5;
      ctx.fillText(text, 0, 0);
    } else {
      ctx.fillText(text, 0, 0);
    }
    ctx.restore();
  },

  // Always lays out items horizontally, centred at (centerX, centerY).
  // offsets: optional array of {dx, dy} applied per-item for rhythm effects.
  // onPlace: optional callback(index, worldX, worldY) fired after each glyph is drawn.
  layoutLine(items, centerX, centerY, offsets, onPlace) {
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
      const gx  = centerX + center + (off ? off.dx : 0);
      const gy  = centerY           + (off ? off.dy : 0);
      this.paintGlyph(it.text, gx, gy, it.size, it.rotation, it.color, it.glowColor, it.glowBlur);
      if (onPlace) onPlace(i, gx, gy);
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

    // 2. Draw oldest-first so newer lines appear on top.
    //    Power-law depth: newest = 1.0, each older line drops off steeply.
    //    depth = (1/ageRank)^1.1  where ageRank=1 for newest, n for oldest.
    const n = this.bgLines.length;
    for (let idx = 0; idx < n; idx++) {
      const line     = this.bgLines[idx];
      const ageRank  = n - idx;                        // 1 = newest, n = oldest
      const depth    = Math.pow(1 / ageRank, 1.1);    // 1.0 → near-zero for oldest

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
      this.ctx.globalAlpha = this._clamp(line.alpha * depth, 0, 1);
      this.ctx.translate(line.cx, line.cy);
      this.ctx.rotate(line.tilt);
      this.layoutLine(items, 0, 0);
      this.ctx.restore();
    }
  },

  drawLive(now, dt, cx, cy, baseSize) {
    if (!this.liveTokens.length) return;

    if (this.orientation === 'circular') {
      this._drawLiveCircular(now, dt, cx, cy, baseSize);
      return;
    }
    if (this.orientation === 'wave') {
      this._drawLiveWave(now, dt, cx, cy, baseSize);
      return;
    }

    // In vertical mode the line width becomes screen height — cap to prevent overflow
    let effectiveBase = baseSize;
    if (this.orientation === 'vertical') {
      const maxFit = Math.max(1, Math.floor(this.logicalHeight / (baseSize * 1.15)));
      if (this.liveTokens.length > maxFit) {
        effectiveBase = Math.max(1, baseSize * maxFit / this.liveTokens.length);
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
      // layoutLine coords are in the rotated frame; transform back to world for burst:
      // world = (cx + ly, cy − lx)  (from translate+rotate(−π/2))
      this.layoutLine(items, 0, 0, offsets, (i, lx, ly) => {
        const tok = this.liveTokens[i];
        tok._rx = cx + ly;
        tok._ry = cy - lx;
        if (!tok._burst) { tok._burst = true; this.emitBurst(tok._rx, tok._ry, tok.spawnVolume); }
      });
      this.ctx.restore();
    } else {
      this.layoutLine(items, cx, cy, offsets, (i, gx, gy) => {
        const tok = this.liveTokens[i];
        tok._rx = gx;
        tok._ry = gy;
        if (!tok._burst) { tok._burst = true; this.emitBurst(gx, gy, tok.spawnVolume); }
      });
    }
  },

  // Wave mode: characters arranged along a scrolling sine path.
  // Amplitude scales with volume; wave frequency scales with treble energy.
  // Each char's rotation follows the local tangent so text "rides" the wave.
  _drawLiveWave(now, dt, cx, cy, baseSize) {
    const n = this.liveTokens.length;

    // Wave scrolls forward; volume boosts speed
    const waveSpeed = 1.2 + this.smoothVol * this.sensitivity * 2.5;
    this._wavePhase = (this._wavePhase + waveSpeed * dt) % (2 * Math.PI);

    // Amplitude: 0.5–3x baseSize driven by volume
    const amp = baseSize * (0.5 + this._clamp(this.smoothVol * this.sensitivity, 0, 1) * 2.5);

    // 1–2.5 cycles across the canvas width; treble pushes frequency up
    const cycles = 1 + this._clamp((this.freqHigh || 0) * this.sensitivity, 0, 1) * 1.5;
    const k = cycles * 2 * Math.PI / this.logicalWidth;

    // Auto-scale to keep all chars on screen horizontally
    let effectiveBase = baseSize;
    const spacing0 = baseSize * 1.35;
    const maxFit   = Math.max(1, Math.floor(this.logicalWidth / spacing0));
    if (n > maxFit) effectiveBase = Math.max(1, baseSize * maxFit / n);
    const spacing = effectiveBase * 1.35;

    const totalSpan = (n > 1 ? n - 1 : 0) * spacing;

    for (let i = 0; i < n; i++) {
      const tok   = this.liveTokens[i];
      const age   = now - tok.spawnTime;
      const fresh = this._clamp(1 - age / 420, 0, 1);
      const tier  = this._clamp(tok.spawnVolume * this.sensitivity, 0, 1);

      const xOff = n > 1 ? -totalSpan / 2 + i * spacing : 0;
      const xW   = cx + xOff;
      const yW   = cy + amp * Math.sin(k * xOff + this._wavePhase);
      // tangent angle: arctan(dy/dx) = arctan(amp · k · cos(...))
      const rot  = Math.atan(amp * k * Math.cos(k * xOff + this._wavePhase));

      tok._rx = xW;
      tok._ry = yW;
      if (!tok._burst) { tok._burst = true; this.emitBurst(xW, yW, tok.spawnVolume); }

      this.paintGlyph(
        tok.text, xW, yW,
        effectiveBase * this.computeScale(tok, now),
        rot,
        this.colorForToken(tok),
        tier > 0.5 ? COLORS.glow : COLORS.hot,
        16 * fresh * tier
      );
    }
  },

  // Circular mode: characters arranged on a rotating ring.
  // Chars stay upright (using normal oscillation rotation) so the ring
  // is legible at all arc positions — the circular shape is clear from
  // positions alone without relying on tangent rotation that makes edge
  // chars unreadable at 100–150°.
  _drawLiveCircular(now, dt, cx, cy, baseSize) {
    const n = this.liveTokens.length;
    const R = Math.min(this.logicalWidth, this.logicalHeight) * 0.38;

    // Global rotation: 1 rev / 16 s, volume accelerates up to 4×
    const omegaBase = (2 * Math.PI / 16) * (1 + this.smoothVol * this.sensitivity * 3);
    this._circleAngle = (this._circleAngle + omegaBase * dt) % (2 * Math.PI);

    // Arc span: ~40° per char, capped at 320° so a near-complete ring forms at 8+ chars
    const arcSpan = Math.min(2 * Math.PI * 8 / 9, n * (2 * Math.PI / 9));

    for (let i = 0; i < n; i++) {
      const tok   = this.liveTokens[i];
      const age   = now - tok.spawnTime;
      const fresh = this._clamp(1 - age / 420, 0, 1);
      const tier  = this._clamp(tok.spawnVolume * this.sensitivity, 0, 1);

      // Slight radius variation per token keeps visual depth without destroying arc shape
      const radiusFrac = 0.90 + (tok.seed / (2 * Math.PI)) * 0.20;  // 0.90–1.10
      const r0 = R * radiusFrac;

      // Radial bounce: new chars pop outward then settle
      const bounce = baseSize * 0.22 * tier * Math.exp(-age / 380);
      const r      = r0 + bounce;

      const frac      = n > 1 ? i / (n - 1) : 0.5;
      const baseAngle = -Math.PI / 2 + (frac - 0.5) * arcSpan;
      const theta     = this._circleAngle + baseAngle;

      const x = cx + r * Math.cos(theta);
      const y = cy + r * Math.sin(theta);

      // Keep chars upright so every glyph on the ring is fully readable.
      // The ring shape is evident from the arc of positions, not character tilt.
      const rot = this.computeRot(tok, now);

      tok._rx = x;
      tok._ry = y;
      if (!tok._burst) { tok._burst = true; this.emitBurst(x, y, tok.spawnVolume); }

      this.paintGlyph(
        tok.text, x, y,
        baseSize * this.computeScale(tok, now),
        rot,
        this.colorForToken(tok),
        tier > 0.5 ? COLORS.glow : COLORS.hot,
        16 * fresh * tier
      );
    }
  }

});
