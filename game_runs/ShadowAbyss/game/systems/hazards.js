/* ShadowAbyss — 危害系统：情欲之风 + 抉择点。 */
Object.assign(AbyssScene.prototype, {

  // 情欲之风：阵风区内施加随时间正弦摆动的横向速度叠加。
  // force < PLAYER_SPEED（150/200），逆风时净速仍为正 → 不会把玩家（或 bot）彻底顶死，
  // 但"风停间隙"（phase≈0）明显更好走。选「伸手拉住」后 windCalm=true → 风为之平息。
  _applyWind(time) {
    const ci = this._currentCircleIdx();
    const c = this.circles[ci];
    if (!c.gusts.length || this.windCalm) { this._windNow = 0; return; }
    const p = this.player;
    const gust = c.gusts.find(g => p.x >= g.x0 && p.x <= g.x1);
    if (!gust) { this._windNow = 0; return; }
    const phase = Math.sin((time % WIND_PERIOD_MS) / WIND_PERIOD_MS * Math.PI * 2);
    const force = (gust.force ?? WIND_GUST_DEFAULT) * phase;
    this._windNow = force;
    p.setVelocityX(p.body.velocity.x + force);
  },

  // 弹出抉择卡（双选项）。bot/headless 自动选「拉住」并继续（见 cards.js）。
  _presentChoice(soul) {
    if (this.soulResolved) return;
    this.soulResolved = true;
    this.gameStarted = false;
    const resolve = (choice) => {
      this.choiceMade = choice;
      if (choice === 'pull') {
        this.windCalm = true;
        if (this.soulSprite) this.tweens.add({ targets: this.soulSprite, alpha: 0, y: soul.y + 30, duration: 700, onComplete: () => this.soulSprite?.destroy() });
        this._flashObjective('你握住了那只手，风为之一静。');
      } else {
        if (this.soulSprite) this.tweens.add({ targets: this.soulSprite, alpha: 0, x: soul.x - 120, duration: 600, onComplete: () => this.soulSprite?.destroy() });
        this._flashObjective('你借风冲了过去，没有回头。');
      }
      this._dismissCard();
      this.gameStarted = true;
    };
    this._showChoice(soul.title, soul.body, resolve);
  },

  _flashObjective(text) {
    window.GameHUD?.setObjective(text);
    this.time.delayedCall(2600, () => {
      if (!this.gameOver) window.GameHUD?.setObjective(this.circles[this._currentCircleIdx()]?.sin || '');
    });
  },
});
