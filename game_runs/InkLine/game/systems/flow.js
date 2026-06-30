/* InkLine — §4B 原型分割；方法体逐字保留。 */
Object.assign(InkLineScene.prototype, {

  _collect(player, drop) {
    if (!this.gameStarted || this.gameOver || this.cardActive) return;
    drop.destroy(); this.score++;
    window.GameHUD?.setScore(this.score);
    this._revealAt(drop.x, drop.y, 150 + this.score * 26);   // 吃墨即在此处泼开一大片画面
    const f = this.add.circle(drop.x, drop.y, 5, INK, 0.8).setDepth(30);
    this.tweens.add({ targets: f, scale: 3, alpha: 0, duration: 320, onComplete: () => f.destroy() });
    this._updateObjective();
  },


  _hit(player, hazard) {
    if (!this.gameStarted || this.gameOver || this.invuln || this.cardActive) return;
    this._damage(1);
    const dir = this.player.x < hazard.x ? -1 : 1;
    this.player.setVelocity(150 * dir, -220);
  },


  _damage(n) {
    if (this.invuln || this.gameOver || this.cardActive) return;
    this.hp = Math.max(0, this.hp - n);
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    if (this.hp <= 0) {
      this.deaths++;
      if (this.deaths >= DEATH_BUDGET) { this._lose(); return; }
      this._showCard('被擦去了',
        `橡皮抹淡了小墨的轮廓……它在画纸上重新凝聚。\n（第 ${this.deaths}/${DEATH_BUDGET} 次失手，退回本幕起点重来）`,
        () => this._enterAct(this.actIdx, false));
    } else {
      this.invuln = true; this.player.setAlpha(0.4);
      this.time.delayedCall(850, () => { this.invuln = false; this.player.setAlpha(1); });
    }
  },


  _reachGoal() {
    if (!this.gameStarted || this.gameOver || this.reachedGoal || this.cardActive) return;
    if (this.score >= GOAL_SCORE) { this.reachedGoal = true; this._win(); }
    else window.GameHUD?.setObjective(`笔尖还需 ${GOAL_SCORE - this.score} 滴墨才能落下`);
  },


  _win() {
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0);
    if (this.cover) this.tweens.add({ targets: this.cover, alpha: 0, duration: 900, ease: 'Sine.out' });  // 落笔 → 整幅画绽放
    this._showCard('落 笔',
      '最后一滴墨落下，断裂的线条自动连缀成完整的画，\n米白画纸绽放出第一抹色彩——\n小墨终于画完了自己的世界。',
      () => window.GameHUD?.showGameOver(true, '断线连缀成画，小墨画完了自己的世界。'));
  },


  _lose() {
    if (this.gameOver) return;
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0);
    window.GameHUD?.showGameOver(false, '一次次被橡皮擦去轮廓……世界重新变回一片空白。');
  },
});
