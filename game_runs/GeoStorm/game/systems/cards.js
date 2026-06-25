/* GeoStorm — §4B 原型分割；方法体逐字保留。 */
Object.assign(GeoStormScene.prototype, {

  _buildCardLayer() {
    this.cardBg = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x07101e, 0.9).setOrigin(0, 0).setScrollFactor(0).setDepth(200).setVisible(false);
    this.cardTitle = this.add.text(GAME_W / 2, 160, '', { fontFamily: 'Segoe UI, sans-serif', fontSize: '30px', color: '#5fe6da', align: 'center', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setVisible(false);
    this.cardBody = this.add.text(GAME_W / 2, 290, '', { fontFamily: 'Segoe UI, sans-serif', fontSize: '18px', color: '#cbd5e1', align: 'center', lineSpacing: 10, wordWrap: { width: 720 } }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setVisible(false);
    this.cardHint = this.add.text(GAME_W / 2, 460, '— 按 SPACE 继续 —', { fontFamily: 'Segoe UI, sans-serif', fontSize: '14px', color: '#64748b' }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setVisible(false);
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


  _enterPhase(idx, isStart) {
    this.phase = idx;
    const ph = PHASES[idx];
    this.beat = ph.beat; this.spd = ph.spd;
    if (isStart) this.gameStarted = true;
    // 清场 + 短暂无敌，避免恢复即被击
    this.shots.clear(true, true);
    this.player.setVelocity(0, 0).setPosition(GAME_W / 2, GAME_H / 2);
    this.invuln = true; this.player.setAlpha(0.5);
    this.time.delayedCall(900, () => { this.invuln = false; this.player.setAlpha(1); });
    this.tweens.add({ targets: this.fog, fillAlpha: ph.fogA, duration: 600 });
    this.fog.setFillStyle(ph.fog, this.fog.fillAlpha);
    if (this.shotTimer) this.shotTimer.remove();
    this.shotTimer = this.time.addEvent({ delay: this.beat, loop: true, callback: this._spawnWave, callbackScope: this });
    // 维持场上碎片数
    while (this.shards.countActive(true) < SHARDS_ON_FIELD) this._spawnShard();
    this._updateObjective();
    this.cameras.main.flash(280, 95, 230, 218, false);
  },


  _updateObjective() {
    const ph = PHASES[this.phase];
    window.GameHUD?.setObjective(`【${'一二三'[this.phase]}阶·${ph.name}】 走位躲弹(可躲掩体后)，点亮光碎片 ${this.score}/${WIN_SCORE}`);
  },
});
