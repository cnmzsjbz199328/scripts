/* ShadowAbyss — 流程系统：开局/圈推进/受伤/胜负 + __probe/__gameState/__advanceCard 契约。 */
Object.assign(AbyssScene.prototype, {

  _enterWorld() {
    this._dismissCard();
    this.gameStarted = true; this.gameOver = false;
    this._applyAtmosphere(0);
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    window.GameHUD?.setObjective(this.circles[0].sin);
  },

  // 跨入下一圈：切氛围 + 弹该圈叙事卡（同一世界，x 单调，不重建）
  _advanceCircle(idx) {
    this.curCircle = idx;                 // 防重复触发
    this.circleCleared = idx;             // 已走完前 idx 圈
    this.gameStarted = false;
    this.windCalm = false;
    this.tweens.add({ targets: this, _lightPulse: 1.4, duration: 220, yoyo: true });
    const c = CIRCLES[idx];
    this._showCard(c.card.title, c.card.body, () => {
      this._applyAtmosphere(idx);
      this._dismissCard();
      this.gameStarted = true;
      window.GameHUD?.setObjective(c.sin);
    });
  },

  _damage(n, cause) {
    if (this.invuln || this.gameOver) return;
    this.hp = Math.max(0, this.hp - n);
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    this.cameras.main.shake(160, 0.006);
    if (this.hp <= 0) {
      this.lives--;
      if (this.lives <= 0) { this._lose(cause); return; }
      this.hp = this.maxHp;
      window.GameHUD?.setHearts(this.hp, this.maxHp);
      this._flashObjective(`${cause}……还剩 ${this.lives} 次机会`);
    } else {
      this.invuln = true; this.player.setAlpha(0.4);
      this.time.delayedCall(800, () => { this.invuln = false; this.player?.setAlpha(1); });
    }
  },

  _win() {
    if (this.gameOver) return;
    this.gameOver = true; this.won = true; this.gameStarted = false;
    this.circleCleared = CIRCLES.length;
    this.tweens.add({ targets: this, _lightPulse: 1.6, duration: 300, yoyo: true });
    const ending = ENDINGS[this.choiceMade] || ENDINGS.none;
    window.GameHUD?.showGameOver(true, ending);
  },

  _lose(cause) {
    if (this.gameOver) return;
    this.gameOver = true; this.lost = true; this.gameStarted = false;
    window.GameHUD?.showGameOver(false, `${cause || '黑暗'}吞没了你。\n但地狱仍要有人走完——按 重来。`);
  },

  _exposeState() {
    const self = this;
    window.__gameState = { player: this.player || null };
    window.__advanceCard = () => self._advanceCard();
    window.__choose = (c) => self._cardResolve?.(c === 'rush' ? 'rush' : 'pull');
    window.__probe = () => {
      const p = self.player;
      const onGround = p ? (p.body.blocked.down || p.body.touching.down) : false;
      // 平台 bot 导航提示：前方若有沟壑边缘则该起跳
      let needJump = false;
      if (p && onGround && self.circles)
        for (const c of self.circles) for (const [a] of c.pits)
          if (p.x > a - 90 && p.x < a - 8) needJump = true;
      return {
        x: p ? p.x : null, y: p ? p.y : null, vx: p ? p.body.velocity.x : 0, onGround,
        hp: self.hp, maxHp: self.maxHp, lives: self.lives,
        circle: self.curCircle, circleCleared: self.circleCleared,
        choiceMade: self.choiceMade, soulResolved: self.soulResolved,
        won: self.won, lost: self.lost,
        started: self.gameStarted, cardActive: self.cardActive,
        needJump, nextGoalX: FINAL_RIFT_X, goalX: FINAL_RIFT_X, worldW: WORLD_W,
      };
    };
  },
});
