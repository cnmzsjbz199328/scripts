/* StarVanguard — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  // ── Bullet Collisions & Damages ──
  hitAsteroid(bullet, asteroid) {
    bullet.destroy();
    this.damageAsteroid(asteroid, bullet.damageAmount);
  },


  damageAsteroid(asteroid, damage) {
    asteroid.hp -= damage;
    
    // flash red
    asteroid.setTint(0xff8888);
    this.time.delayedCall(80, () => {
      if (asteroid.active) asteroid.clearTint();
    });

    if (asteroid.hp <= 0) {
      this.explodeEntity(asteroid, asteroid.isLarge ? 'large' : 'small');
      
      // If large, split into 2 smaller ones sliding sideways
      if (asteroid.isLarge) {
        for (let i = 0; i < 2; i++) {
          const smallAst = this.asteroids.create(asteroid.x, asteroid.y, 'asteroid_small');
          smallAst.setDepth(DEPTH.ENEMIES);
          smallAst.hp = 1;
          smallAst.isLarge = false;
          smallAst.setVelocity(
            (i === 0 ? -120 : 120) + Phaser.Math.Between(-30, 30),
            Phaser.Math.Between(120, 200)
          );
          smallAst.setAngularVelocity(Phaser.Math.Between(-100, 100));
        }
      }

      asteroid.destroy();
      sounds.playExplosion(asteroid.isLarge);

      // Score counter
      if (this.currentLevel === 1) {
        this.levelScore++;
        const left = Math.max(0, 15 - this.levelScore);
        window.GameHUD?.setObjective(`第一关：冲出陨石风暴带！ (还需摧毁 ${left} 颗陨石)`);
        
        if (this.levelScore >= 15) {
          this.triggerLevelClear();
        }
      }
    }
  },


  hitEnemy(bullet, enemy) {
    bullet.destroy();
    this.damageEnemy(enemy, bullet.damageAmount);
  },


  damageEnemy(enemy, damage) {
    enemy.hp -= damage;
    
    enemy.setTint(0xff8888);
    this.time.delayedCall(80, () => {
      if (enemy.active) enemy.clearTint();
    });

    if (enemy.hp <= 0) {
      this.explodeEntity(enemy, 'large');
      enemy.destroy();
      sounds.playExplosion(enemy.type === 'bomber');

      if (this.currentLevel === 2) {
        this.levelScore++;
        const left = Math.max(0, 15 - this.levelScore);
        window.GameHUD?.setObjective(`第二关：击溃敌舰先锋编队！ (还需击落 ${left} 架敌机)`);
        
        if (this.levelScore >= 15) {
          this.triggerLevelClear();
        }
      }
    }
  },


  // ── Crystal Collection & Level-up system ──
  collectCrystal(player, crystal) {
    crystal.destroy();
    this.crystalsCollected++;
    sounds.playCrystal();
    window.GameHUD?.setScore(this.crystalsCollected);

    // level up flash if crossing threshold
    if (this.crystalsCollected === 5 || this.crystalsCollected === 10) {
      sounds.playLevelUp();
      this.cameras.main.flash(200, 34, 211, 238); // Cyan flash
      this.createSparks(player.x, player.y, 0x22d3ee, 20);
    }
  },


  // ── Player Damage handling & Collisions ──
  playerHit(player, entity) {
    // If bullet, destroy bullet
    if (entity.texture && entity.texture.key === 'bullet_enemy') {
      entity.destroy();
    }

    this.triggerPlayerDamage();
  },


  triggerPlayerDamage() {
    if (this.isInvincible || this.gameOverTriggered) return;

    this.playerHp--;
    sounds.playHurt();
    
    // Weapon penalty - lose 2 crystals (which degrades level!)
    this.crystalsCollected = Math.max(0, this.crystalsCollected - 2);
    window.GameHUD?.setScore(this.crystalsCollected);

    // Update HUD hearts
    window.GameHUD?.setHearts(this.playerHp, 3);
    
    // Screen Flash
    this.cameras.main.flash(200, 239, 68, 68, 0.6); // Red flash
    this.cameras.main.shake(200, 0.015);

    if (this.playerHp <= 0) {
      this.triggerGameOver(false);
    } else {
      // Trigger invincibility frames
      this.isInvincible = true;
      this.invincibleTimer = 1500; // 1.5 seconds
    }
  }
});
