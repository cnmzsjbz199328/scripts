/* DustOutlaw — §4B 原型分割；方法体逐字保留。 */
Object.assign(DustOutlawScene.prototype, {

  _win() {
    this.gameOver = true; this._won = true; this.gameStarted = false; this.player.setVelocity(0, 0); this.spawnTimer.remove();
    window.GameHUD?.showGameOver(true, '尘埃落定，最后一名枪手倒地。科尔拾起兄弟的怀表，翻身上马，背影消失在被落日烧红的荒野尽头——公道，已经讨回。');
  },

  _lose() {
    if (this.gameOver) return;
    this.gameOver = true; this._lost = true; this.gameStarted = false; this.player.setVelocity(0, 0); this.spawnTimer.remove();
    window.GameHUD?.showGameOver(false, '科尔倒在了红石镇的尘土里，怀表滑落在血色的落日下……');
  },
});
