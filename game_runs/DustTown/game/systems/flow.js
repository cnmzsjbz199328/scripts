/* DustTown — §4B 原型分割；方法体逐字保留。 */
Object.assign(DustTownScene.prototype, {

  _caught(player, thug) {
    if (!this.gameStarted || this.gameOver || this.invuln || this.cardActive) return;
    this.hp = Math.max(0, this.hp - 1);
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    const ang = Phaser.Math.Angle.Between(thug.x, thug.y, this.player.x, this.player.y);
    this.player.setVelocity(Math.cos(ang) * 220, Math.sin(ang) * 220);
    this.invuln = true; this.player.setTint(0xff6644); this.cameras.main.shake(120, 0.006);
    this.time.delayedCall(800, () => { this.invuln = false; this.player.clearTint(); });
    if (this.hp <= 0) {
      this.deaths++;
      if (this.deaths >= DEATH_BUDGET) { this._lose(); return; }
      this.gameStarted = false;
      this.hp = this.maxHp; window.GameHUD?.setHearts(this.hp, this.maxHp);
      this._showCard('被打倒了',
        `打手把杰西打翻在尘土里……她抹掉嘴角的血，退回镇口。\n（第 ${this.deaths}/${DEATH_BUDGET} 次，已收集的证词仍在）`,
        () => { this.player.setPosition(SPAWN.x, SPAWN.y); this.gameStarted = true; this.invuln = true; this.player.setTint(0xffe0a0); this.time.delayedCall(800, () => { this.invuln = false; this.player.clearTint(); }); });
    }
  },


  _win() {
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0);
    this._showCard('真相 · 落槌',
      '杰西推开法庭大门，把铁证拍在桌上。卡特帮的末日来临，\n枯井镇的人们第一次敢在阳光下抬起头——\n正义，回到了这片尘土。',
      () => window.GameHUD?.showGameOver(true, '铁证钉上法庭的门，卡特帮覆灭，正义回到枯井镇。'));
  },


  _lose() {
    if (this.gameOver) return;
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0);
    window.GameHUD?.showGameOver(false, '杰西一次次被打倒在后巷，警徽滚落进尘土……枯井镇重归沉默。');
  },
});
