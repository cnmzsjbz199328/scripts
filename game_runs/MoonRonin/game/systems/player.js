/* MoonRonin — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MoonRoninScene.prototype, {

  _collect(player, orb) {
    if (!this.gameStarted || this.gameOver || this.cardActive) return;
    orb.destroy(); this.score++;
    window.GameHUD?.setScore(this.score);
    const f = this.add.circle(orb.x, orb.y, 6, 0xffe9a8, 0.9).setDepth(30);
    this.tweens.add({ targets: f, scale: 3.5, alpha: 0, duration: 350, onComplete: () => f.destroy() });
    // 月光入手：光晕短暂涨溢，世界豁然开朗一瞬
    this.tweens.add({ targets: this, _lightPulse: 1.22, duration: 160, yoyo: true, ease: 'Quad.out' });
    this._updateObjective();
  },


  _slash(time) {
    this.slashUntil = time + 360;
    this.player.play('ro_slash', true);
    const dir = this.player.flipX ? -1 : 1;
    const arc = this.add.arc(this.player.x + dir * 36, this.player.y - 6, 40, dir > 0 ? -60 : 120, dir > 0 ? 60 : 240, false, 0xffe9a8, 0.35).setDepth(25);
    this.tweens.add({ targets: arc, alpha: 0, scale: 1.3, duration: 220, onComplete: () => arc.destroy() });
    this.crows.getChildren().forEach(c => {
      if (!c.active) return;
      const dx = c.x - this.player.x;
      if (Math.sign(dx) === dir && Math.abs(dx) < 80 && Math.abs(c.y - this.player.y) < 70) {
        const puff = this.add.circle(c.x, c.y, 8, 0x222633, 0.8).setDepth(26);
        this.tweens.add({ targets: puff, scale: 2.6, alpha: 0, duration: 300, onComplete: () => puff.destroy() });
        c.destroy();
      }
    });
  },


  _hitCrow(player, crow) {
    if (!this.gameStarted || this.gameOver || this.invuln || this.cardActive) return;
    const dir = this.player.x < crow.x ? -1 : 1;
    this.player.setVelocity(150 * dir, -220);
    this._damage(1);
  },


  _damage(n) {
    if (this.invuln || this.gameOver || this.cardActive) return;
    this.hp = Math.max(0, this.hp - n);
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    if (this.hp <= 0) {
      this.deaths++;
      if (this.deaths >= DEATH_BUDGET) { this._lose(); return; }
      this._showCard('坠 落',
        `黑影没入庭院的深暗……鹭翻身攀回飞檐。\n（第 ${this.deaths}/${DEATH_BUDGET} 次失手，退回本幕起点重来）`,
        () => this._enterAct(this.actIdx, false));
    } else {
      this.invuln = true; this.player.setAlpha(0.4);
      this.time.delayedCall(850, () => { this.invuln = false; this.player.setAlpha(1); });
    }
  }
});
