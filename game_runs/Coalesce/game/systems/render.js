/* Coalesce — §4B 原型分割；方法体逐字保留。 */
Object.assign(CoalesceScene.prototype, {

  _drawWorld() {
    const g = this.add.graphics().setDepth(-100);
    g.fillStyle(PAPER, 1).fillRect(0, 0, WORLD_W, GAME_H);
    g.lineStyle(1, GRID, 0.5);
    for (let x = 60; x < WORLD_W; x += 60) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, GAME_H); g.strokePath(); }
    for (let y = 60; y < GAME_H; y += 60) { g.beginPath(); g.moveTo(0, y); g.lineTo(WORLD_W, y); g.strokePath(); }
    // 平台（岩壁）
    for (const [x, y, w, h] of PLATFORMS) {
      g.fillStyle(ROCK, 0.5).fillRect(x, y, w, h);
      g.lineStyle(2.5, INK, 0.8).strokeRect(x, y, w, h);
      g.lineStyle(1.5, ROCK_HI, 0.5); g.beginPath(); g.moveTo(x + 4, y + 4); g.lineTo(x + w - 4, y + 4); g.strokePath();
    }
  },


  _render() {
    const g = this.gfx;
    g.clear();

    // 墨滴
    for (const d of this.drops) {
      if (d.taken) continue;
      const w = 1 + 0.12 * Math.sin(this._t * 3 + d.ph);
      g.fillStyle(FOOD, 0.92).fillCircle(d.x, d.y, 8 * w);
      g.lineStyle(1.2, INK, 0.5).strokeCircle(d.x, d.y, 8 * w);
      g.fillStyle(WATER_HI, 0.8).fillCircle(d.x - 2.4, d.y - 2.4, 2.3);
    }

    // 浊墨水洼
    for (const h of HAZARDS) {
      g.fillStyle(ROCK, 0.5).fillEllipse(h.x, h.y, h.w, h.h * 2.2);
      g.lineStyle(2, WARN, 0.7).strokeEllipse(h.x, h.y, h.w, h.h * 2.2);
    }

    // 堤坝
    if (!this.damBroken) {
      g.fillStyle(DAM_C, 0.6).fillRect(DAM.x, DAM.y, DAM.w, DAM.h);
      g.lineStyle(2.5, INK, 0.85).strokeRect(DAM.x, DAM.y, DAM.w, DAM.h);
      // 裂纹
      g.lineStyle(1.5, WARN, 0.7);
      g.beginPath(); g.moveTo(DAM.x + DAM.w * 0.5, DAM.y + 8); g.lineTo(DAM.x + DAM.w * 0.3, DAM.y + DAM.h * 0.5); g.lineTo(DAM.x + DAM.w * 0.6, DAM.y + DAM.h - 8); g.strokePath();
    }

    // 玩家水珠
    const p = this.player, blink = this.invuln > 0 && (Math.floor(this._t * 12) % 2 === 0);
    const wob = 1 + 0.06 * Math.sin(this._t * 6);
    g.fillStyle(WATER, blink ? 0.4 : 0.85).fillCircle(p.x, p.y, p.r * wob);
    g.lineStyle(2.5, INK, blink ? 0.4 : 0.95).strokeCircle(p.x, p.y, p.r * wob);
    g.fillStyle(WATER_HI, blink ? 0.3 : 0.85).fillCircle(p.x - p.r * 0.32, p.y - p.r * 0.34, p.r * 0.26);
    g.fillStyle(0xffffff, blink ? 0.2 : 0.6).fillCircle(p.x - p.r * 0.38, p.y - p.r * 0.4, p.r * 0.1);
    // 够大撞坝时的提示环
    if (p.r >= BREAK_R && !this.damBroken) g.lineStyle(2, WATER_HI, 0.5 + 0.3 * Math.sin(this._t * 6)).strokeCircle(p.x, p.y, p.r * wob + 5);

    // 屏幕固定 HUD：水量条
    const hg = this.hudGfx; hg.clear();
    const bx = 20, by = GAME_H - 28, bw = 200;
    hg.fillStyle(0xffffff, 0.6).fillRect(bx, by, bw, 12);
    hg.lineStyle(1.5, INK, 0.7).strokeRect(bx, by, bw, 12);
    const frac = Phaser.Math.Clamp(this.vol / WIN_VOL, 0, 1);
    hg.fillStyle(this.player.r >= BREAK_R ? WATER_HI : WATER, 0.9).fillRect(bx + 1, by + 1, (bw - 2) * frac, 10);
    // 撞坝阈值刻度
    const tx = bx + 1 + (bw - 2) * Phaser.Math.Clamp((BREAK_R - BASE_R) / GROW_K / WIN_VOL, 0, 1);
    hg.lineStyle(2, DAM_C, 0.9); hg.beginPath(); hg.moveTo(tx, by - 2); hg.lineTo(tx, by + 14); hg.strokePath();
  },
});
