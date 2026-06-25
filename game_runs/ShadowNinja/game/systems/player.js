/* ShadowNinja — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(ShadowNinjaScene.prototype, {

  _collect(player, key) {
    if (!this.gameStarted || this.gameOver || this.cardActive) return;
    key.destroy(); this.score++;
    window.GameHUD?.setScore(this.score);
    const f = this.add.circle(key.x, key.y, 5, WARM, 0.9).setDepth(30);
    this.tweens.add({ targets: f, scale: 3, alpha: 0, duration: 320, onComplete: () => f.destroy() });
    this._updateObjective();
  },


  // 站立 / 匍匐碰撞体切换（共享脚底，不抖动）。匍匐体极矮 → 够不着高处门钥。
  _applyPosture(prone) {
    if (prone === this._postureProne) return;
    this._postureProne = prone;
    const b = prone ? BODY_PRONE : BODY_STAND;
    this.player.body.setSize(b.w, b.h).setOffset(b.ox, b.oy);
  },


  _followFriend() {
    const f = this.friend, p = this.player;
    const tx = p.x - (p.flipX ? -36 : 36);
    f.x += (tx - f.x) * 0.16; f.y += (p.y - f.y) * 0.22;
    f.setFlipX(p.flipX);
    const key = p.anims.currentAnim?.key || 'nj_idle';
    if (f.anims.currentAnim?.key !== key) f.play(key, true);
  }
});
