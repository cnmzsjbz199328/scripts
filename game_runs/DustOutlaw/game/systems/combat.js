/* DustOutlaw — §4B 原型分割；方法体逐字保留。 */
Object.assign(DustOutlawScene.prototype, {

  _nearestEnemy() {
    let best = null, bestD = Infinity;
    this.enemies.getChildren().forEach(e => {
      if (!e.active) return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
      if (d < bestD) { bestD = d; best = e; }
    });
    return best;
  },


  _fire() {
    if (this.time.now < this.lastFire + FIRE_CD) return;
    const target = this._nearestEnemy();
    if (!target) return;
    this.lastFire = this.time.now;
    this.shootUntil = this.time.now + 260;
    const ang = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
    this.player.setRotation(ang + Math.PI / 2);
    this.player.play('cb_shoot', true);
    const b = this.bullets.create(this.player.x, this.player.y, 'pbullet');
    b.setDepth(19); b.body.setAllowGravity(false);
    this.physics.velocityFromRotation(ang, BULLET_SPEED, b.body.velocity);
    const mz = this.add.circle(this.player.x + Math.cos(ang) * 18, this.player.y + Math.sin(ang) * 18, 5, 0xfff0c0, 0.9).setDepth(22);
    this.tweens.add({ targets: mz, scale: 0, alpha: 0, duration: 120, onComplete: () => mz.destroy() });
  },


  _enemyFire(e) {
    const ang = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
    const b = this.enemyBullets.create(e.x, e.y, 'ebullet');
    b.setDepth(17); b.body.setAllowGravity(false);
    this.physics.velocityFromRotation(ang, ENEMY_BULLET_SPEED, b.body.velocity);
  },


  _bulletHitsEnemy(bullet, enemy) {
    bullet.destroy(); enemy.destroy(); this.score++;
    window.GameHUD?.setScore(this.score);
    const p = this.add.circle(enemy.x, enemy.y, 8, 0xb98a4a, 0.7).setDepth(25);
    this.tweens.add({ targets: p, scale: 2.4, alpha: 0, duration: 320, onComplete: () => p.destroy() });
    if (this.score >= WIN_SCORE) { this._win(); return; }
    window.GameHUD?.setObjective(`清空响尾蛇帮：击倒 ${WIN_SCORE} 名亡命徒（已 ${this.score}）`);
  },

  _enemyBulletHitsPlayer(player, bullet) { bullet.destroy(); this._damage(1); },

  _enemyTouchesPlayer(player, enemy) { enemy.destroy(); this._damage(1); },


  _damage(n) {
    if (this.invuln || this.gameOver) return;
    this.hp = Math.max(0, this.hp - n);
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    this.invuln = true; this.player.setTint(0xff6644); this.cameras.main.shake(120, 0.006);
    this.time.delayedCall(700, () => { this.invuln = false; this.player.clearTint(); });
    if (this.hp <= 0) this._lose();
  },
});
