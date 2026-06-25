/* DustTown — §4B 原型分割；方法体逐字保留。 */
Object.assign(DustTownScene.prototype, {

  _buildCardLayer() {
    this.cardBg = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x140c05, 0.9).setOrigin(0, 0).setScrollFactor(0).setDepth(200).setVisible(false);
    this.cardTitle = this.add.text(GAME_W / 2, 160, '', { fontFamily: 'Segoe UI, sans-serif', fontSize: '30px', color: '#e8c84a', align: 'center', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setVisible(false);
    this.cardBody = this.add.text(GAME_W / 2, 290, '', { fontFamily: 'Segoe UI, sans-serif', fontSize: '18px', color: '#e9dcc4', align: 'center', lineSpacing: 10, wordWrap: { width: 720 } }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setVisible(false);
    this.cardHint = this.add.text(GAME_W / 2, 460, '— 按 SPACE 继续 —', { fontFamily: 'Segoe UI, sans-serif', fontSize: '14px', color: '#8a7a55' }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setVisible(false);
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


  _enterChapter(idx, isStart) {
    this.chapter = idx;
    const ch = CHAPTERS[idx];
    this.thugSpeed = ch.thug;
    if (isStart) this.gameStarted = true;
    // 章节增援
    REINFORCE.filter(r => r.ch === idx).forEach(r => this._addThug(r));
    // 回到安全（镇口附近）+ 短暂无敌
    this.player.setVelocity(0, 0);
    this.invuln = true; this.player.setTint(0xffe0a0);
    this.time.delayedCall(800, () => { this.invuln = false; this.player.clearTint(); });
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    this._updateObjective();
    this.cameras.main.flash(280, 232, 200, 120, false);
  },


  _updateObjective() {
    const ch = CHAPTERS[this.chapter];
    const tail = this.score >= WIN_SCORE
      ? '证词已集齐 → 突破护卫，冲进法庭(金色旗标) →'
      : `走访镇民按 E 倾听，收集证词 ${this.score}/${WIN_SCORE}`;
    window.GameHUD?.setObjective(`【第${'一二三'[this.chapter]}章·${ch.name}】 ${tail}`);
  },
});
