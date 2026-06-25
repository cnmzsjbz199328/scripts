/* RaccoonDungeon — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  // -------------------------------------------------------------
  // COLLISION ACTIONS
  // -------------------------------------------------------------
  handleProjectileEnemyOverlap(projectile, enemy) {
    if (!enemy.active || enemy.getData('hp') <= 0) return;
    
    // Deal damage
    const dmg = projectile.getData('damage');
    this.damageEnemy(enemy, dmg);

    // Apply knockback
    const dir = projectile.body.velocity.x > 0 ? 'right' : projectile.body.velocity.x < 0 ? 'left' : projectile.body.velocity.y > 0 ? 'down' : 'up';
    this.applyKnockback(enemy, dir, 250);

    // Spark blast
    this.createSparks(projectile.x, projectile.y, 0xff7700, 12);

    // Destroy fireball
    projectile.destroy();
  },


  handleProjectileObstacleOverlap(projectile, obstacle) {
    this.createSparks(projectile.x, projectile.y, 0xffaa00, 8);
    projectile.destroy();
  },


  handlePlayerTrapOverlap(player, trap) {
    const time = this.time.now;
    const lastDmg = trap.getData('lastDamageTime') || 0;
    if (time - lastDmg > 1500) { // 1.5s damage interval
      trap.setData('lastDamageTime', time);
      
      // Flash trap visual warning
      this.tweens.add({
        targets: trap,
        tint: 0xff0000,
        duration: 100,
        yoyo: true,
        repeat: 2
      });

      this.damagePlayer(1); // Trap deals 1 damage
    }
  },


  handlePlayerPortalOverlap(player, portal) {
    if (!this.portalActive || this.isTransitioning) return;
    
    this.isTransitioning = true;
    player.body.setVelocity(0);
    
    // Zoom/fade transition animation
    this.tweens.add({
      targets: player,
      angle: 720,
      scaleX: 0.1,
      scaleY: 0.1,
      alpha: 0,
      duration: 800,
      onComplete: () => {
        this.advanceToNextLevel();
      }
    });
  }
});
