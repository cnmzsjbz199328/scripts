/* ShadowAbyss — 叙事卡系统（画布内，自包含）。
 * 普通卡：SPACE 继续。抉择卡：1 拉住 / 2 冲过。
 * headless（navigator.webdriver：verify / playtest bot）自动推进，避免卡在卡片上。 */
Object.assign(AbyssScene.prototype, {

  _buildCardLayer() {
    const cx = GAME_W / 2;
    this.cardBg = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x05060c, 0.9)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.CARD).setVisible(false);
    this.cardTitle = this.add.text(cx, 150, '', { fontFamily: 'Georgia, serif', fontSize: '34px', color: '#e8d6b0', align: 'center' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.CARD + 1).setVisible(false);
    this.cardBody = this.add.text(cx, 250, '', { fontFamily: 'Segoe UI, sans-serif', fontSize: '17px', color: '#b9b2a4', align: 'center', lineSpacing: 9, wordWrap: { width: 720 } })
      .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.CARD + 1).setVisible(false);
    this.cardHint = this.add.text(cx, GAME_H - 70, '', { fontFamily: 'Segoe UI, sans-serif', fontSize: '14px', color: '#6b6456' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.CARD + 1).setVisible(false);
    this._cardEls = [this.cardBg, this.cardTitle, this.cardBody, this.cardHint];
  },

  _showCard(title, body, onContinue) {
    this.cardActive = true; this._cardMode = 'normal'; this._cardOnContinue = onContinue;
    this.cardTitle.setText(title); this.cardBody.setText(body); this.cardHint.setText('▸ 按 空格 继续');
    this._cardEls.forEach(e => e.setVisible(true));
    if (navigator.webdriver) this.time.delayedCall(220, () => this.cardActive && this._advanceCard());
  },

  _showChoice(title, body, onResolve) {
    this.cardActive = true; this._cardMode = 'choice'; this._cardResolve = onResolve;
    this.cardTitle.setText(title); this.cardBody.setText(body); this.cardHint.setText('▸ 按 1 伸手拉住    ·    按 2 借风冲过');
    this._cardEls.forEach(e => e.setVisible(true));
    if (navigator.webdriver) this.time.delayedCall(260, () => this.cardActive && this._cardResolve && this._cardResolve('pull'));
  },

  _dismissCard() {
    this.cardActive = false;
    this._cardEls.forEach(e => e.setVisible(false));
  },

  // 对外契约：普通卡推进 / 抉择卡默认选「拉住」（安全）
  _advanceCard() {
    if (!this.cardActive) return;
    if (this._cardMode === 'choice') { this._cardResolve?.('pull'); return; }
    const cb = this._cardOnContinue; this._cardOnContinue = null;
    this._dismissCard();
    if (cb) cb();
  },

  // 每帧在 update 顶部调用：卡片激活时读键
  _updateCardInput() {
    if (!this.cardActive) return;
    if (this._cardMode === 'choice') {
      if (Phaser.Input.Keyboard.JustDown(this.k1)) this._cardResolve?.('pull');
      else if (Phaser.Input.Keyboard.JustDown(this.k2)) this._cardResolve?.('rush');
    } else if (Phaser.Input.Keyboard.JustDown(this.kkeys.SPACE)) {
      this._advanceCard();
    }
  },
});
