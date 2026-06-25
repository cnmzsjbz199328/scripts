/* Coalesce — §4B 原型分割；方法体逐字保留。 */
Object.assign(CoalesceScene.prototype, {

  _enterAct(idx, showCard) {
    this.act = idx;
    window.GameHUD?.setObjective(`【${'一二三'[idx]}段·${ACTS[idx].name}】 聚水/挤身，撞开堤坝 (水量 ${Math.min(this.vol, WIN_VOL)}/${WIN_VOL})`);
    if (showCard) this._showCard(ACTS[idx].intro[0], ACTS[idx].intro[1], null);
  },


  _setVol(v) {
    this.vol = Phaser.Math.Clamp(v, 0, WIN_VOL + 8);
    this.player.r = this._rFor(this.vol);
    window.GameHUD?.setScore(Math.min(this.vol, WIN_VOL));
    window.GameHUD?.setObjective(`【${'一二三'[this.act]}段·${ACTS[this.act].name}】 聚水/挤身，撞开堤坝 (水量 ${Math.min(this.vol, WIN_VOL)}/${WIN_VOL})`);
  },


  _showCard(title, body, cb) {
    this.cardActive = true;
    this._pendingCardCb = cb;
    this.player.vx = 0;
    const cont = this.add.container(0, 0).setScrollFactor(0).setDepth(200);
    const dim = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0c1422, 0.74).setOrigin(0, 0);
    const panel = this.add.rectangle(GAME_W / 2, GAME_H / 2, 580, 250, PAPER, 0.98).setStrokeStyle(2, INK, 0.9);
    const t = this.add.text(GAME_W / 2, GAME_H / 2 - 86, title, { fontFamily: 'Segoe UI, sans-serif', fontSize: '26px', color: '#1f3a5f', fontStyle: 'bold' }).setOrigin(0.5);
    const b = this.add.text(GAME_W / 2, GAME_H / 2 - 6, body, { fontFamily: 'Segoe UI, sans-serif', fontSize: '15px', color: '#3a4a63', align: 'center', lineSpacing: 7, wordWrap: { width: 520 } }).setOrigin(0.5);
    const hint = this.add.text(GAME_W / 2, GAME_H / 2 + 100, '空格 / 回车 / 点击 继续', { fontFamily: 'Segoe UI, sans-serif', fontSize: '13px', color: '#8a7f63' }).setOrigin(0.5);
    cont.add([dim, panel, t, b, hint]);
    this.cardGfx = cont;
    this.input.keyboard.once('keydown-SPACE', () => this._advanceCard());
    this.input.keyboard.once('keydown-ENTER', () => this._advanceCard());
    this.input.once('pointerdown', () => this._advanceCard());
    if (this._auto) this.time.delayedCall(500, () => this._advanceCard());
  },


  _advanceCard() {
    if (!this.cardActive) return;
    this.cardActive = false;
    if (this.cardGfx) { this.cardGfx.destroy(); this.cardGfx = null; }
    const cb = this._pendingCardCb; this._pendingCardCb = null;
    if (cb) cb();
  },
});
