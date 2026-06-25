/* GeoStorm — §4B 原型分割；方法体逐字保留。 */
Object.assign(GeoStormScene.prototype, {

  _collect(player, shard) {
    if (!this.gameStarted || this.gameOver || this.cardActive) return;
    shard.destroy(); this.score++;
    window.GameHUD?.setScore(this.score);
    const f = this.add.circle(shard.x, shard.y, 6, SHARD_C, 0.9).setDepth(30);
    this.tweens.add({ targets: f, scale: 3.5, alpha: 0, duration: 350, onComplete: () => f.destroy() });
    this.pulse.setPosition(this.player.x, this.player.y).setScale(0.3);
    this.tweens.add({ targets: this.pulse, scale: 3, duration: 400, ease: 'Quad.out' });

    if (this.score >= WIN_SCORE) { this._win(); return; }
    // 阶段推进
    const newPhase = this.score < 5 ? 0 : this.score < 10 ? 1 : 2;
    if (newPhase > this.phase) {
      this.gameStarted = false;
      const ph = PHASES[newPhase];
      this._showCard(ph.intro[0], ph.intro[1], () => this._enterPhase(newPhase, true));
      return;
    }
    this._updateObjective();
    this._spawnShard();
  },


  _hit(player, shot) {
    if (!this.gameStarted || this.gameOver || this.invuln || this.cardActive) return;
    shot.destroy();
    this.hp = Math.max(0, this.hp - 1);
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    this.invuln = true; this.player.setAlpha(0.35); this.cameras.main.shake(120, 0.008);
    this.time.delayedCall(900, () => { this.invuln = false; this.player.setAlpha(1); });
    if (this.hp <= 0) {
      this.deaths++;
      if (this.deaths >= DEATH_BUDGET) { this._lose(); return; }
      this.gameStarted = false;
      this.hp = this.maxHp; window.GameHUD?.setHearts(this.hp, this.maxHp);
      this._showCard('光点重凝',
        `光点被弹幕击碎，又在蓝图中央重新凝聚。\n（第 ${this.deaths}/${DEATH_BUDGET} 次，已点亮的光碎片仍在）`,
        () => this._enterPhase(this.phase, true));
    }
  },


  _win() {
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0); if (this.shotTimer) this.shotTimer.remove();
    this.shots.clear(true, true);
    this._showCard('重 绘',
      '第 15 枚光碎片归位，崩解的线条逆向重连，\n浅蓝蓝图重新铺满璀璨的几何秩序，虚空退散——\n宇宙，被这最后一个光点重新画亮。',
      () => window.GameHUD?.showGameOver(true, '十五枚光碎片归位，几何宇宙被重新画亮。'));
  },


  _lose() {
    if (this.gameOver) return;
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0); if (this.shotTimer) this.shotTimer.remove();
    window.GameHUD?.showGameOver(false, '光点被虚空彻底击碎，蓝图上最后一抹亮光熄灭……');
  },
});
