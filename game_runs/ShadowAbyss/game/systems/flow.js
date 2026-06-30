/* ShadowAbyss — 流程系统：进圈/过圈/受伤/胜负 + __probe/__gameState/__advanceCard 契约。 */
Object.assign(AbyssScene.prototype, {

  _enterLevel(idx) {
    this.levelIdx = idx;
    this.windCalm = false;
    this._dismissCard();
    this.gameStarted = true; this.gameOver = false;
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    window.GameHUD?.setObjective(LEVELS[idx].sin);
  },

  _clearCircle() {
    if (this._clearing) return;
    this._clearing = true;
    this.circleCleared = this.levelIdx + 1;
    this.gameStarted = false;
    // 入口顿光：光晕外溢一下
    this.tweens.add({ targets: this, _lightPulse: 1.4, duration: 220, yoyo: true });

    if (this.levelIdx + 1 < LEVELS.length) {
      const next = this.levelIdx + 1;
      this._showCard('沉入下一圈', `${LEVELS[this.levelIdx].name} —— 走完了。\n下行的裂口在脚下张开，更深的黑暗在等着。`, () => this._nextLevel(next));
    } else {
      this._win();
    }
  },

  _nextLevel(idx) {
    this._clearing = false;
    // 清掉本圈对象，重建下一圈
    this._teardownLevel();
    this._buildLevel(idx);
    this._enterLevel(idx);
  },

  _teardownLevel() {
    [this.bg, this.fog, this.lantern, this.glow, this.rift, this.player, this.virgil, this.soulSprite, this.ashEmitter]
      .forEach(o => { try { o?.destroy(); } catch (e) {} });
    this.solids?.clear(true, true);
    this.tweens.killAll();
    this.cameras.main.stopFollow();
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
    const ending = ENDINGS[this.choiceMade] || ENDINGS.none;
    window.GameHUD?.showGameOver(true, ending);
  },

  _lose(cause) {
    if (this.gameOver) return;
    this.gameOver = true; this.lost = true; this.gameStarted = false;
    window.GameHUD?.showGameOver(false, `${cause || '黑暗'}吞没了你。\n但地狱仍要有人走完——按 RESTART 重来。`);
  },

  _exposeState() {
    const self = this;
    window.__gameState = { player: this.player || null };
    window.__advanceCard = () => self._advanceCard();
    window.__choose = (c) => self._cardResolve?.(c === 'rush' ? 'rush' : 'pull');
    window.__probe = () => {
      const p = self.player, L = LEVELS[self.levelIdx] || {};
      const onGround = p ? (p.body.blocked.down || p.body.touching.down) : false;
      // 给俯视/平台 bot 的导航提示：前方若有沟壑边缘则该起跳
      let needJump = false;
      if (p && onGround) for (const [a] of (L.pits || [])) if (p.x > a - 90 && p.x < a - 8) needJump = true;
      return {
        x: p ? p.x : null, y: p ? p.y : null, vx: p ? p.body.velocity.x : 0, onGround,
        hp: self.hp, maxHp: self.maxHp, lives: self.lives,
        level: self.levelIdx, circleCleared: self.circleCleared,
        riftX: L.riftX ?? null, worldW: L.worldW ?? null,
        choiceMade: self.choiceMade, soulResolved: self.soulResolved,
        won: self.won, lost: self.lost,
        started: self.gameStarted, cardActive: self.cardActive,
        needJump, goalX: L.riftX ?? null,
      };
    };
  },
});
