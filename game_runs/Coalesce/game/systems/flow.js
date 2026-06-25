/* Coalesce — §4B 原型分割；方法体逐字保留。 */
Object.assign(CoalesceScene.prototype, {

  _splash(x, y, color, n) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * 6.28, sp = 40 + Math.random() * 150;
      const dot = this.add.circle(x, y, 2 + Math.random() * 3, color, 0.9).setDepth(14);
      this.tweens.add({ targets: dot, x: x + Math.cos(a) * sp, y: y + Math.sin(a) * sp, alpha: 0, duration: 440, onComplete: () => dot.destroy() });
    }
  },


  _hurt(reason) {
    if (this.invuln > 0 || this.gameOver) return;
    this.hp -= 1;
    window.GameHUD?.setHearts(Math.max(0, this.hp), MAX_HP);
    this._splash(this.player.x, this.player.y, reason === 'murky' ? ROCK : WATER, 14);
    if (this.hp <= 0) { this._lose(); return; }
    this.invuln = 1.1;
    if (reason === 'fall') {
      // 掉出世界：回最近检查点（位置已丢失，必须重置）
      this.player.x = this.checkpoint; this.player.y = FLOOR_Y - 60;
      this.player.vx = 0; this.player.vy = 0;
    } else {
      // 浊墨：原地弹开 + 略失水量，但不夺走前进进度（无瞬移惩罚）
      this._setVol(this.vol - 1);
      this.player.vy = -480; this.player.vx = 0;
    }
  },


  _win() {
    if (this.gameOver) return;
    this.gameOver = true; this.gameStarted = false;
    this.player.vx = 0;
    window.GameHUD?.showGameOver(true, '聚成一团饱满沉重的墨珠，一头撞开裂纹堤坝——水光与天光在洞口漫了开来。');
  },


  _lose() {
    if (this.gameOver) return;
    this.gameOver = true; this.gameStarted = false;
    this.player.vx = 0;
    window.GameHUD?.showGameOver(false, '水量一次次被挤破、被浊墨夺走，终究没能聚起撞坝的那一团……');
  },
});
