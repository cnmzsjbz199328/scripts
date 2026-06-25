/* NeonTowerDefense — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  handleTurrets() {
    this.laserGraphics.clear();
    const time = this.time.now;

    this.turrets.getChildren().forEach(t => {
      let target = null;
      let minDist = t.range;

      this.enemies.getChildren().forEach(e => {
        if (e.isDead || e.x < 0 || e.x > 1280) return;
        const dx = e.x - t.x;
        const dy = e.y - t.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < minDist) {
          minDist = dist;
          target = e;
        }
      });

      if (target) {
        // Adjust fire rate if system is overclocked (Effect 4)
        const currentFireRate = this.isOverclocked ? t.fireRate * 0.5 : t.fireRate;

        if (time - t.lastFired > currentFireRate) {
          t.lastFired = time;

          if (t.type === 'laser_turret') {
            this.fireLaser(t, target);
          } else {
            this.firePlasma(t, target);
          }
        }
      }
    });
  },


  fireLaser(turret, target) {
    target.health -= turret.damage;
    this.spawnSparks(target.x, target.y - 15, 0x00ffff);

    // Upgraded laser color is Cyan, Tier 1 is Darker Blue
    const laserCol = turret.tier === 2 ? 0x00ffff : 0x3b82f6;

    this.laserGraphics.lineStyle(turret.tier === 2 ? 5 : 3, laserCol, 0.85);
    this.laserGraphics.beginPath();
    this.laserGraphics.moveTo(turret.x, turret.y - 20);
    this.laserGraphics.lineTo(target.x, target.y - 16);
    this.laserGraphics.strokePath();

    this.laserGraphics.lineStyle(2, 0xffffff, 1.0); // hot white center core
    this.laserGraphics.beginPath();
    this.laserGraphics.moveTo(turret.x, turret.y - 20);
    this.laserGraphics.lineTo(target.x, target.y - 16);
    this.laserGraphics.strokePath();

    this.time.delayedCall(100, () => {
      this.laserGraphics.clear();
    });

    if (target.health <= 0) {
      this.killEnemy(target);
    } else {
      target.play('virus_hit', true);
    }
  },


  firePlasma(turret, target) {
    const proj = this.plasmaProjectiles.create(turret.x, turret.y - 20, 'energy_crystal');
    proj.setDisplaySize(turret.tier === 2 ? 22 : 16, turret.tier === 2 ? 22 : 16);
    // Green tint for Tier 1, Purple tint for Tier 2 upgraded plasma storm
    const tintColor = turret.tier === 2 ? 0xa78bfa : 0x10b981;
    proj.setTint(tintColor);
    proj.damage = turret.damage;
    proj.tier = turret.tier;

    const dx = target.x - turret.x;
    const dy = (target.y - 16) - (turret.y - 20);
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = turret.tier === 2 ? 400 : 300;

    proj.setVelocity((dx / dist) * speed, (dy / dist) * speed);
  },


  hitPlasma(proj, enemy) {
    proj.destroy();
    if (enemy.isDead) return;

    enemy.health -= proj.damage;

    // Apply slow state (Tier 2 plasma slows by 65%, Tier 1 slows by 45%)
    enemy.isSlowed = true;
    const slowLength = proj.tier === 2 ? 3500 : 2500;
    enemy.slowUntil = this.time.now + slowLength;
    
    const slowColor = proj.tier === 2 ? 0xa78bfa : 0x06b6d4; // purple or cyan tint
    enemy.setTint(slowColor);

    this.spawnSparks(enemy.x, enemy.y - 15, proj.tier === 2 ? 0xa78bfa : 0x10b981);

    if (enemy.health <= 0) {
      this.killEnemy(enemy);
    } else {
      enemy.play('virus_hit', true);
    }
  }
});
