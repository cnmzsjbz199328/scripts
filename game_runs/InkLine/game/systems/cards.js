/* InkLine — §4B 原型分割；方法体逐字保留。 */
Object.assign(InkLineScene.prototype, {

  _buildCardLayer() {
    this.cardBg = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x1a1a1a, 0.86).setOrigin(0, 0).setScrollFactor(0).setDepth(200).setVisible(false);
    this.cardTitle = this.add.text(GAME_W / 2, 170, '', { fontFamily: 'Segoe UI, sans-serif', fontSize: '30px', color: '#faf6ea', align: 'center', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setVisible(false);
    this.cardBody = this.add.text(GAME_W / 2, 300, '', { fontFamily: 'Segoe UI, sans-serif', fontSize: '18px', color: '#d8d2c4', align: 'center', lineSpacing: 10, wordWrap: { width: 720 } }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setVisible(false);
    this.cardHint = this.add.text(GAME_W / 2, 470, '— 按 SPACE 继续 —', { fontFamily: 'Segoe UI, sans-serif', fontSize: '14px', color: '#8a8475' }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setVisible(false);
  },


  _showCard(title, body, cb) {
    this.cardActive = true; this._pendingCardCb = cb;
    this.player.setVelocity(0, 0);
    this.cardTitle.setText(title); this.cardBody.setText(body);
    [this.cardBg, this.cardTitle, this.cardBody, this.cardHint].forEach(o => o.setVisible(true));
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


  _enterAct(idx, isStart) {
    this.actIdx = idx;
    const act = ACTS[idx];
    this.checkpointX = act.startX;
    this.hp = this.maxHp;
    if (isStart) this.gameStarted = true;
    this.player.setVelocity(0, 0);
    this.player.setPosition(act.startX, SPAWN_Y);
    this.lastSafeX = act.startX;
    this.invuln = true; this.player.setAlpha(0.5);
    this.time.delayedCall(700, () => { this.invuln = false; this.player.setAlpha(1); });
    this.tweens.add({ targets: this.wash, fillAlpha: act.washA, duration: 600 });
    this.wash.setFillStyle(act.wash, this.wash.fillAlpha);
    // 激活本幕及之前的橡皮怪
    this.erasers.getChildren().forEach(e => {
      if (e.getData('act') <= idx) { e.setVisible(true); e.body.enable = true; }
    });
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    this._updateObjective();
    this.cameras.main.flash(300, 230, 220, 200, false);
  },


  _updateObjective() {
    const act = ACTS[this.actIdx];
    const tail = this.score >= GOAL_SCORE
      ? '墨滴已集齐 → 奔向画纸尽头的笔尖 →'
      : `越断线避尖刺，聚墨滴（${this.score}/${GOAL_SCORE}）`;
    window.GameHUD?.setObjective(`【第${'一二三'[this.actIdx]}幕·${act.name}】 ${tail}`);
  },
});
