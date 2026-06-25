/* NinjaCat — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  collectCoin(player, coin) {
    this.spawnBurst(coin.x, coin.y, 0xfbbf24, 10, 50);
    coin.destroy();
    this.score += 1;
    window.GameHUD?.setScore(this.score);
    this.showFloatingText(coin.x, coin.y - 20, '+1 金币', '#fbbf24');
  },


  handleEnemyCollision(player, enemy) {
    // Check if player lands on top of the enemy
    const isSquishing = player.body.velocity.y > 0 && player.y < enemy.y - 12;

    if (isSquishing) {
      player.setVelocityY(-400); // Bounce
      this.spawnBurst(enemy.x, enemy.y, 0xa855f7, 14, 75);
      enemy.destroy();
      this.score += 5;
      window.GameHUD?.setScore(this.score);
      this.showFloatingText(enemy.x, enemy.y - 20, '+5 击破', '#a855f7');
    } else {
      this.damagePlayer();
    }
  },


  handleHazardCollision(player, hazard) {
    this.damagePlayer();
  },


  damagePlayer() {
    if (this.isInvincible) return;

    this.hearts--;
    window.GameHUD?.setHearts(this.hearts, 3);
    this.showFloatingText(this.player.x, this.player.y - 40, '-1 生命', '#ef4444');

    if (this.hearts <= 0) {
      this.gameStarted = false;
      this._lost = true;
      this.player.setVelocity(0, 0);
      this.player.setTint(0xff0000);
      window.GameHUD?.showGameOver(false, '生命值归零，猫咪忍者小爪倒下了……');
    } else {
      this.isInvincible = true;
      this.player.setVelocity(-150 * (this.player.flipX ? -1 : 1), -250);
      
      // Flash player transparency
      this.tweens.add({
        targets: this.player,
        alpha: 0.2,
        duration: 150,
        yoyo: true,
        repeat: 4,
        onComplete: () => {
          this.player.alpha = 1.0;
          this.isInvincible = false;
        }
      });
    }
  }
});
