/* ShadowNinja — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(ShadowNinjaScene.prototype, {

  // ── 叙事卡浮层 ──────────────────────────────────────────────
  _buildCardLayer() {
    this.cardBg = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x05070d, 0.9)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(200).setVisible(false);
    this.cardTitle = this.add.text(GAME_W / 2, 170, '', {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '30px', color: '#ffd27a',
      align: 'center', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setVisible(false);
    this.cardBody = this.add.text(GAME_W / 2, 300, '', {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '18px', color: '#cbd5e1',
      align: 'center', lineSpacing: 10, wordWrap: { width: 720 } })
      .setOrigin(0.5).setScrollFactor(0).setDepth(201).setVisible(false);
    this.cardHint = this.add.text(GAME_W / 2, 470, '— 按 SPACE 继续 —', {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '14px', color: '#64748b' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(201).setVisible(false);
  },


  _showCard(title, body, cb) {
    this.cardActive = true;
    this._pendingCardCb = cb;
    this.player.setVelocity(0, 0);
    this.cardTitle.setText(title); this.cardBody.setText(body);
    [this.cardBg, this.cardTitle, this.cardBody, this.cardHint].forEach(o => o.setVisible(true));
    // 一次性推进：SPACE / ENTER / 指针
    this.input.keyboard.once('keydown-SPACE', () => this._advanceCard());
    this.input.keyboard.once('keydown-ENTER', () => this._advanceCard());
    this.input.once('pointerdown', () => this._advanceCard());
  },


  _advanceCard() {
    if (!this.cardActive) return;
    this.cardActive = false;
    [this.cardBg, this.cardTitle, this.cardBody, this.cardHint].forEach(o => o.setVisible(false));
    const cb = this._pendingCardCb; this._pendingCardCb = null;
    if (cb) cb();
  },


  // ── 进入某一幕（检查点 + 满血 + 氛围切换）────────────────────
  _enterAct(idx, isStart) {
    this.actIdx = idx;
    const act = ACTS[idx];
    this.checkpointX = act.startX;
    this.hp = this.maxHp;
    if (isStart) this.gameStarted = true;
    this.player.setVelocity(0, 0);
    this.player.setPosition(act.startX, SPAWN_Y);
    this.invuln = true; this.time.delayedCall(700, () => { this.invuln = false; });
    this.tweens.add({ targets: this.fog, fillAlpha: act.fogA, duration: 600 });
    this.fog.setFillStyle(act.fog, this.fog.fillAlpha); // 立即切色，alpha 由 tween 接管
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    this._updateObjective();
    this.cameras.main.flash(300, 255, 210, 122, false);
  },


  _updateObjective() {
    if (this.escaping) { window.GameHUD?.setObjective('⚠ 警报大作！带师弟趁铁闸冲向府门逃离 →'); return; }
    const act = ACTS[this.actIdx];
    const tail = this.score >= GOAL_SCORE
      ? '门钥已集齐 → 潜抵尽头的牢笼救出师弟'
      : `拾门钥（${this.score}/${GOAL_SCORE}）：匍匐避光潜行，趁安全间隙起身/跳起取钥`;
    window.GameHUD?.setObjective(`【第${'一二三'[this.actIdx]}幕·${act.name}】 ${tail}`);
  }
});
