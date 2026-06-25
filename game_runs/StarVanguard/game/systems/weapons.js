/* StarVanguard — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  // ── Weapon Mechanics: Bullet Types & Upgrade States ──
  handleShooting(time, isShooting) {
    // Determine Weapon Level from Crystal Count
    // 0-4: Level 1 (Single)
    // 5-9: Level 2 (Spread 3x)
    // >= 10: Level 3 (Giant continuous Laser Beam)
    if (this.crystalsCollected < 5) {
      this.weaponLevel = 1;
    } else if (this.crystalsCollected < 10) {
      this.weaponLevel = 2;
    } else {
      this.weaponLevel = 3;
    }

    // Disable Laser Beam if not shooting
    if (this.weaponLevel !== 3 || !isShooting) {
      this.laserGraphics.clear();
      this.stopLaserHum();
    }

    if (!isShooting) return;

    if (this.weaponLevel === 1) {
      const cooldown = 180; // ms
      if (time > this.lastFired + cooldown) {
        this.fireSingleBullet();
        this.lastFired = time;
      }
    } else if (this.weaponLevel === 2) {
      const cooldown = 240; // ms
      if (time > this.lastFired + cooldown) {
        this.fireSpreadBullet();
        this.lastFired = time;
      }
    } else if (this.weaponLevel === 3) {
      // Continuous Laser Beam!
      this.fireLaserBeam();
    }
  },


  fireSingleBullet() {
    const bullet = this.playerBullets.create(this.player.x, this.player.y - 25, 'bullet_normal');
    bullet.setVelocityY(-550);
    bullet.setDepth(DEPTH.BULLETS);
    bullet.damageAmount = 1;
    sounds.playPew(1);
  },


  fireSpreadBullet() {
    // 3 bullets in a cone
    const angles = [-15, 0, 15];
    angles.forEach(angle => {
      const bullet = this.playerBullets.create(this.player.x, this.player.y - 25, 'bullet_normal');
      bullet.setDepth(DEPTH.BULLETS);
      bullet.damageAmount = 1;
      
      const angleRad = Phaser.Math.DegToRad(angle - 90); // -90 offset because straight up is y negative
      bullet.setVelocity(
        Math.cos(angleRad) * 500,
        Math.sin(angleRad) * 500
      );
      bullet.setAngle(angle);
    });
    sounds.playPew(2);
  },


  fireLaserBeam() {
    // Hum sound loop
    if (!this.laserHum) {
      this.laserHum = sounds.playLaserHum();
    }

    const lx = this.player.x;
    const ly = this.player.y - 25;
    
    // Draw laser beam
    this.laserGraphics.clear();
    
    // Laser pulse effect
    const outerWidth = 14 + Math.sin(this.time.now * 0.05) * 4;
    const innerWidth = 4 + Math.sin(this.time.now * 0.08) * 1.5;
    
    // Outer cyan glow
    this.laserGraphics.lineStyle(outerWidth, 0x22d3ee, 0.45);
    this.laserGraphics.beginPath();
    this.laserGraphics.moveTo(lx, ly);
    this.laserGraphics.lineTo(lx, 0);
    this.laserGraphics.strokePath();

    // Core white hot line
    this.laserGraphics.lineStyle(innerWidth, 0xffffff, 0.95);
    this.laserGraphics.beginPath();
    this.laserGraphics.moveTo(lx, ly);
    this.laserGraphics.lineTo(lx, 0);
    this.laserGraphics.strokePath();

    // Particle spark details at player nose
    if (Math.random() < 0.35) {
      this.createSparks(lx, ly, 0x22d3ee, 5);
    }

    // Laser collision detection (scan vertically along lx)
    const tickTime = 60; // damage tick interval in ms
    if (!this.lastLaserTick) this.lastLaserTick = 0;
    
    if (this.time.now > this.lastLaserTick + tickTime) {
      this.lastLaserTick = this.time.now;

      // 1. Intersect Asteroids
      this.asteroids.getChildren().forEach(ast => {
        if (Math.abs(ast.x - lx) < (ast.displayWidth / 2 + 10) && ast.y < ly) {
          this.damageAsteroid(ast, 0.6); // continuous smaller laser damage
          this.createSparks(ast.x, ast.y, 0x22d3ee, 4);
        }
      });

      // 2. Intersect Enemies
      this.enemies.getChildren().forEach(enemy => {
        if (Math.abs(enemy.x - lx) < (enemy.displayWidth / 2 + 10) && enemy.y < ly) {
          this.damageEnemy(enemy, 0.6);
          this.createSparks(enemy.x, enemy.y, 0x22d3ee, 4);
        }
      });

      // 3. Intersect Boss components (Level 3)
      if (this.currentLevel === 3 && this.bossSpawned) {
        // Left Turret
        if (this.bossTurrets[0] && this.bossTurrets[0].active && Math.abs(this.bossTurrets[0].x - lx) < 30) {
          this.damageBossTurret(this.bossTurrets[0], 0.6);
          this.createSparks(this.bossTurrets[0].x, this.bossTurrets[0].y, 0x22d3ee, 4);
        }
        // Right Turret
        if (this.bossTurrets[1] && this.bossTurrets[1].active && Math.abs(this.bossTurrets[1].x - lx) < 30) {
          this.damageBossTurret(this.bossTurrets[1], 0.6);
          this.createSparks(this.bossTurrets[1].x, this.bossTurrets[1].y, 0x22d3ee, 4);
        }
        // Center Core (invulnerable if shield active)
        if (this.boss && this.boss.active && Math.abs(this.boss.x - lx) < 60) {
          if (this.bossShieldActive) {
            sounds.playShieldHit();
            this.bossShieldPulse = 1.0;
          } else {
            this.damageBossCore(0.6);
            this.createSparks(this.boss.x, this.boss.y + 40, 0x22d3ee, 4);
          }
        }
      }
    }
  },


  stopLaserHum() {
    if (this.laserHum) {
      try {
        this.laserHum.osc.stop();
        this.laserHum.lfo.stop();
      } catch(e) {}
      this.laserHum = null;
    }
  },


  // ── Smart Bomb: clear bullets + AoE damage everything on screen ──
  useBomb() {
    if (this.bombs <= 0) {
      this.createFloatingText?.(this.player.x, this.player.y - 40, '无炸弹', '#ef4444');
      return;
    }
    this.bombs--;

    // Snapshot lists so destroying/splitting during the sweep doesn't skip entries
    [...this.enemyBullets.getChildren()].forEach(b => {
      this.createSparks(b.x, b.y, 0xc084fc, 3);
      b.destroy();
    });
    [...this.enemies.getChildren()].forEach(e => this.damageEnemy(e, 3));
    [...this.asteroids.getChildren()].forEach(a => this.damageAsteroid(a, 3));

    // Boss components take bomb damage too (core only once shield is down)
    if (this.currentLevel === 3 && this.bossSpawned) {
      if (this.bossTurrets[0] && this.bossTurrets[0].active) this.damageBossTurret(this.bossTurrets[0], 3);
      if (this.bossTurrets[1] && this.bossTurrets[1].active) this.damageBossTurret(this.bossTurrets[1], 3);
      if (!this.bossShieldActive && this.boss && this.boss.active) this.damageBossCore(3);
    }

    sounds.playExplosion(true);
    this.cameras.main.flash(300, 255, 255, 255);
    this.cameras.main.shake(250, 0.012);
    this.spawnShockwave(this.player.x, this.player.y);

    // Brief grace window after detonation
    this.isInvincible = true;
    this.invincibleTimer = 800;
  },


  spawnShockwave(x, y) {
    const ring = this.add.graphics({ x, y }).setDepth(DEPTH.EFFECTS);
    ring.lineStyle(4, 0x22d3ee, 0.9);
    ring.strokeCircle(0, 0, 20);
    this.tweens.add({
      targets: ring,
      scaleX: 32,
      scaleY: 32,
      alpha: 0,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy()
    });
  }
});
