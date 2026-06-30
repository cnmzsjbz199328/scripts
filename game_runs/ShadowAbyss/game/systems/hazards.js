/* ShadowAbyss — 危害系统：情欲之风 + 抉择点。 */
Object.assign(AbyssScene.prototype, {

  // 情欲之风：阵风区内施加随时间正弦摆动的横向加速度。
  // 选择「伸手拉住」后 windCalm=true → 风为之平息（安全路径）。
  _applyWind(time) {
    const L = LEVELS[this.levelIdx];
    if (!L.gusts || !L.gusts.length || this.windCalm) { this._windNow = 0; return; }
    const p = this.player;
    const gust = L.gusts.find(g => p.x >= g.x0 && p.x <= g.x1);
    if (!gust) { this._windNow = 0; return; }
    // 方向随时间正弦摆动：接近 0 时为"风停间隙"
    const phase = Math.sin((time % WIND_PERIOD_MS) / WIND_PERIOD_MS * Math.PI * 2);
    const force = (gust.force ?? WIND_GUST_DEFAULT) * phase;
    this._windNow = force;
    p.setVelocityX(p.body.velocity.x + force * 0.016);  // 叠加到位移（每帧 ~force*dt）
    // 视觉：灰烬随风偏
    if (this.ashEmitter) this.ashEmitter.setParticleSpeed({ min: force * 0.3 - 10, max: force * 0.3 + 10 }, { min: 14, max: 34 });
  },

  // 弹出抉择卡（双选项）。bot/headless 环境自动选「拉住」并继续。
  _presentChoice(soul) {
    if (this.soulResolved) return;
    this.soulResolved = true;       // 防重入
    this.gameStarted = false;
    const resolve = (choice) => {
      this.choiceMade = choice;
      if (choice === 'pull') {
        this.windCalm = true;
        // 拉住：亡魂被你定住，缓缓沉入安息
        if (this.soulSprite) this.tweens.add({ targets: this.soulSprite, alpha: 0, y: soul.y + 30, duration: 700, onComplete: () => this.soulSprite?.destroy() });
        this._flashObjective('你握住了那只手，风为之一静。');
      } else {
        // 冲过：亡魂被风卷走
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
      if (!this.gameOver) window.GameHUD?.setObjective(LEVELS[this.levelIdx]?.sin || '');
    });
  },
});
