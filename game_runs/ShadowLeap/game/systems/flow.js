/* ShadowLeap — §4B 原型分割；方法体逐字保留。 */
Object.assign(ShadowLeapScene.prototype, {

  _collectMote(player, mote) {
    if (!this.gameStarted || this.gameOver || this.cardActive) return;
    mote.destroy(); this.score++;
    window.GameHUD?.setScore(this.score);
    const flash = this.add.circle(mote.x, mote.y, 6, 0xffffff, 0.9).setDepth(DEPTH.EFFECTS);
    this.tweens.add({ targets: flash, scale: 3, alpha: 0, duration: 350, onComplete: () => flash.destroy() });
    this._updateObjective();
  },


  _dropRock() {
    if (!this.gameStarted || this.gameOver || this.cardActive || this.actIdx < 1) return;  // 坠石二幕起
    const px = Phaser.Math.Clamp(this.player.x + Phaser.Math.Between(-40, 160), 60, WORLD_W - 60);
    const rock = this.rocks.create(px, this.cameras.main.scrollY - 20, 'rock');
    rock.setDepth(18); rock.body.setCircle(13); rock.setVelocityY(190);
  },


  _hitHazard(player, hazard, kind) {
    if (!this.gameStarted || this.gameOver || this.invuln || this.cardActive) return;
    if (kind === 'rock') {
      this.tweens.add({ targets: hazard, alpha: 0, duration: 150, onComplete: () => hazard.destroy() });
      this._damage(1);   // 坠石仅扣血，不大幅击退（避免把 bot/玩家甩进沟壑）
    } else {
      this._damage(1);
      const dir = this.player.flipX ? 1 : -1;
      this.player.setVelocity(120 * dir, -200);
    }
  },


  _damage(n) {
    if (this.invuln || this.gameOver || this.cardActive) return;
    this.hp = Math.max(0, this.hp - n);
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    if (this.hp <= 0) {
      this.deaths++;
      if (this.deaths >= DEATH_BUDGET) { this._lose(); return; }
      this._showCard('被迷雾吞没',
        `那点微光在眼前熄灭……男孩在雾中重新睁开眼。\n（第 ${this.deaths}/${DEATH_BUDGET} 次失手，退回本幕起点重来）`,
        () => this._enterAct(this.actIdx, false));
    } else {
      this.invuln = true; this.player.setAlpha(0.4);
      this.time.delayedCall(900, () => { this.invuln = false; this.player.setAlpha(1); });
    }
  },


  _reachGoal() {
    if (!this.gameStarted || this.gameOver || this.reachedGoal || this.cardActive) return;
    if (this.score >= GOAL_SCORE) { this.reachedGoal = true; this._win(); }
    else window.GameHUD?.setObjective(`光源还需 ${GOAL_SCORE - this.score} 点微光才能点亮`);
  },


  _win() {
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0);
    this._showCard('光 · 重逢',
      '男孩跃过最后的断崖，触到那团光——\n迷雾退散，妹妹的剪影在晨曦中向他伸出手，\n森林第一次有了颜色。',
      () => window.GameHUD?.showGameOver(true, '迷雾退散，男孩找回了妹妹，森林有了颜色。'));
  },


  _lose() {
    if (this.gameOver) return;
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0);
    window.GameHUD?.showGameOver(false, '一次次被迷雾吞没……那团光，终究没能触到。');
  },
});
