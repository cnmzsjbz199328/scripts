/* MoonRonin — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MoonRoninScene.prototype, {

  _win() {
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0);
    this._showCard('黎明 · 出府',
      '最后一道飞檐被踏过，鹭纵身跃下府墙，密信紧贴胸口。\n晨曦微露，黑色的身影没入山雾——\n将军的阴谋，终将大白于天下。',
      () => window.GameHUD?.showGameOver(true, '密信带出府门，阴谋终将大白于天下。'));
  },


  _lose() {
    if (this.gameOver) return;
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0);
    window.GameHUD?.showGameOver(false, '一次次失足坠入深院……密信，终究没能带出府门。');
  },


  // ── 暴露状态给 verify / autoplay ──
  _exposeState() {
    const self = this;
    window.__gameState = { player: this.player };
    const nextGoalX = () => {
      if (self.score < GOAL_SCORE) {
        // 只追"明确在前方"的月光，绝不回头（回头会在错过的月光旁来回抖动卡死）
        let best = END_X, bestD = Infinity;
        self.orbs.getChildren().forEach(o => { if (o.active) { const d = o.x - self.player.x; if (d > 20 && d < bestD) { bestD = d; best = o.x; } } });
        return best;
      }
      return END_X;
    };
    // 前方临近缺口边缘 → 需要起跳
    const needJump = () => {
      const p = self.player;
      const onGround = p.body.blocked.down || p.body.touching.down;
      if (!onGround) return false;
      const seg = segAt(p.x);
      if (!seg) return false;
      const isLast = seg.x1 >= SEGS[SEGS.length - 1].x1 - 1;
      return !isLast && (seg.x1 - p.x) < 120;   // 距右缘 <120px 提前起跳，留足越缺口余量
    };
    // 身前有夜枭在斩程内 → 攻击
    const attack = () => {
      const p = self.player, dir = p.flipX ? -1 : 1;
      return self.crows.getChildren().some(c => c.active && Math.sign(c.x - p.x) === dir && Math.abs(c.x - p.x) < 95 && Math.abs(c.y - p.y) < 75);
    };
    window.__probe = () => {
      const p = self.player;
      const onGround = p.body.blocked.down || p.body.touching.down;
      return {
        x: p.x, y: p.y, vx: p.body.velocity.x, onGround,
        hp: self.hp, maxHp: self.maxHp, act: self.actIdx, score: self.score, goalScore: GOAL_SCORE,
        deaths: self.deaths, deathBudget: DEATH_BUDGET,
        won: self.gameOver && self.reachedEnd, lost: self.gameOver && !self.reachedEnd,
        cardActive: self.cardActive, started: self.gameStarted,
        nextGoalX: nextGoalX(), worldW: WORLD_W, endX: END_X,
        needJump: needJump(), attack: attack(),
      };
    };
    window.__advanceCard = () => self._advanceCard();
  }
});
