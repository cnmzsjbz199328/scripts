/* StarVanguard — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  // ── Enemy Bullet logic ──
  // Loop enemies and fire bullets
  updateBoss(time, delta) {
    // Enemy Bombers / Scouts shoot at intervals
    this.enemies.getChildren().forEach(enemy => {
      if (enemy.type === 'drone') return; // drones don't shoot, they ram

      if (time > enemy.nextShoot) {
        if (enemy.type === 'scout') {
          this.fireEnemyBulletAimed(enemy);
        } else if (enemy.type === 'bomber') {
          this.fireEnemyBulletSpread(enemy);
        }
        enemy.nextShoot = time + enemy.shootCooldown * Phaser.Math.Between(0.8, 1.2);
      }

      // Bomber custom movement: stops at Y=150, drifts left-right, then falls down
      if (enemy.type === 'bomber') {
        if (enemy.y >= 130 && enemy.body.velocity.y > 0) {
          enemy.setVelocityY(0);
          enemy.setVelocityX(Phaser.Math.Between(0, 1) === 0 ? -60 : 60);
          // drop down after 4.5 seconds
          this.time.delayedCall(4500, () => {
            if (enemy.active) {
              enemy.setVelocityY(120);
              enemy.setVelocityX(0);
            }
          });
        }
        // bounce on walls
        if (enemy.x < 60) { enemy.x = 60; enemy.setVelocityX(60); }
        if (enemy.x > 740) { enemy.x = 740; enemy.setVelocityX(-60); }
      }

      // Scout custom movement: bounce on walls to create zig-zag pattern
      if (enemy.type === 'scout') {
        if (enemy.x < 40) { enemy.x = 40; enemy.setVelocityX(120); }
        if (enemy.x > 760) { enemy.x = 760; enemy.setVelocityX(-120); }
      }
    });

    // ── Boss Fortress Core logic ──
    const boss = this.boss;
    if (!boss || !boss.active) return;

    // Boss entries/movement
    if (boss.y < 110) {
      boss.y += 0.8 * (delta / 16.6); // slow slide down
      // Align turrets
      if (this.bossTurrets[0]) {
        this.bossTurrets[0].x = boss.x - 140;
        this.bossTurrets[0].y = boss.y - 10;
      }
      if (this.bossTurrets[1]) {
        this.bossTurrets[1].x = boss.x + 140;
        this.bossTurrets[1].y = boss.y - 10;
      }
      return; // Wait until entry complete
    }

    // Drifting motion left/right in Phase 2 & 3
    if (this.bossPhase >= 2) {
      if (!this.bossDriftDir) this.bossDriftDir = 1;
      boss.x += this.bossDriftDir * 0.7 * (delta / 16.6);
      if (boss.x < 300) { boss.x = 300; this.bossDriftDir = 1; }
      if (boss.x > 500) { boss.x = 500; this.bossDriftDir = -1; }
    }

    // Draw Shields if active
    this.bossShieldGraphics.clear();
    if (this.bossShieldActive) {
      const shieldPulseRadius = 160 + Math.sin(time * 0.006) * 6 + (this.bossShieldPulse * 15);
      
      // reduce impact swell
      if (this.bossShieldPulse > 0) this.bossShieldPulse -= 0.08;
      
      this.bossShieldGraphics.lineStyle(3, 0x06b6d4, 0.7 + (Math.sin(time * 0.008) * 0.15));
      this.bossShieldGraphics.fillStyle(0x22d3ee, 0.07 + (Math.sin(time * 0.008) * 0.03));
      
      // Draw hex shields
      this.bossShieldGraphics.beginPath();
      for (let i = 0; i <= 6; i++) {
        const angle = i * Math.PI / 3;
        const sx = boss.x + Math.cos(angle) * shieldPulseRadius;
        const sy = boss.y + Math.sin(angle) * shieldPulseRadius;
        if (i === 0) this.bossShieldGraphics.moveTo(sx, sy);
        else this.bossShieldGraphics.lineTo(sx, sy);
      }
      this.bossShieldGraphics.closePath();
      this.bossShieldGraphics.fillPath();
      this.bossShieldGraphics.strokePath();
    }

    // ── Boss Fire Script ──
    this.handleBossCombat(time, delta);

    // Draw Boss HP bar
    this.drawBossHPBar();
  },


  fireEnemyBulletAimed(enemy) {
    const b = this.enemyBullets.create(enemy.x, enemy.y + 15, 'bullet_enemy');
    b.setDepth(DEPTH.BULLETS);
    
    // Vector towards player
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
    b.setVelocity(
      Math.cos(angle) * 260,
      Math.sin(angle) * 260
    );
    sounds.playEnemyPew();
  },


  fireEnemyBulletSpread(enemy) {
    const angles = [45, 90, 135];
    angles.forEach(angleDeg => {
      const b = this.enemyBullets.create(enemy.x, enemy.y + 15, 'bullet_enemy');
      b.setDepth(DEPTH.BULLETS);
      const rad = Phaser.Math.DegToRad(angleDeg);
      b.setVelocity(
        Math.cos(rad) * 220,
        Math.sin(rad) * 220
      );
    });
    sounds.playEnemyPew();
  },


  // ── Level 3 Boss Specific Combat Loops ──
  handleBossCombat(time, delta) {
    const boss = this.boss;

    // 1. Turrets Fire (Phase 1)
    if (this.bossPhase === 1) {
      this.bossTurrets.forEach((turret, idx) => {
        if (!turret.active) return;
        
        if (!turret.nextFire) turret.nextFire = 0;
        if (time > turret.nextFire) {
          // Fire burst of 3 aimed shots
          let burstCount = 0;
          const fireInterval = this.time.addEvent({
            delay: 150,
            repeat: 2,
            callback: () => {
              if (turret.active && boss.active) {
                const b = this.enemyBullets.create(turret.x, turret.y + 25, 'bullet_enemy');
                b.setDepth(DEPTH.BULLETS);
                const angle = Phaser.Math.Angle.Between(turret.x, turret.y, this.player.x, this.player.y);
                b.setVelocity(Math.cos(angle) * 280, Math.sin(angle) * 280);
                sounds.playEnemyPew();
              }
            }
          });
          turret.nextFire = time + Phaser.Math.Between(2500, 3500);
        }
      });

      // Check if both turrets are destroyed
      if (!this.bossTurrets[0].active && !this.bossTurrets[1].active) {
        this.bossShieldActive = false;
        this.bossPhase = 2;
        sounds.playExplosion(true);
        this.cameras.main.shake(500, 0.02);
        this.cameras.main.flash(400, 255, 255, 255);
        window.GameHUD?.setObjective("要塞护盾已瓦解！全力击破中央核心！");
        this.createSparks(boss.x, boss.y, 0xef4444, 40);
        this.showCinematicBanner([
          '💥 护盾崩溃！PHASE 2',
          '双联炮塔已击毁，能量护盾消散。',
          '中央核心暴露——集中火力！'
        ], 2500);
      }
    }

    // 2. Core vulnerable (Phase 2 & 3)
    if (this.bossPhase === 2) {
      if (!this.nextCoreFire) this.nextCoreFire = 0;
      if (time > this.nextCoreFire) {
        // Fire spiral ring of bullets
        const count = 12;
        for (let i = 0; i < count; i++) {
          const b = this.enemyBullets.create(boss.x, boss.y + 40, 'bullet_enemy');
          b.setDepth(DEPTH.BULLETS);
          const angle = (i * Math.PI * 2) / count;
          b.setVelocity(Math.cos(angle) * 200, Math.sin(angle) * 200);
        }
        sounds.playEnemyPew();
        this.nextCoreFire = time + 2000;
      }

      // Transition to Phase 3 at <50% HP
      if (boss.hp < 25) { // max is 50
        this.bossPhase = 3;
        window.GameHUD?.setObjective("要塞核心超负荷！躲避毁灭死亡射线！");
        this.cameras.main.flash(300, 239, 68, 68); // red flash
        this.showCinematicBanner([
          '🔴 核心超负荷！PHASE 3 — FINAL',
          '星际堡垒濒死，正在释放毁灭死亡射线！',
          '全速闪避——不能让它触碰到先锋号！'
        ], 2500);
      }
    }

    // 3. Death Sweep Laser (Phase 3)
    if (this.bossPhase === 3) {
      // Fire fast spiral projectiles
      if (!this.nextCoreFire) this.nextCoreFire = 0;
      if (time > this.nextCoreFire) {
        const count = 8;
        const rotOffset = (time * 0.005);
        for (let i = 0; i < count; i++) {
          const b = this.enemyBullets.create(boss.x, boss.y + 40, 'bullet_enemy');
          b.setDepth(DEPTH.BULLETS);
          const angle = ((i * Math.PI * 2) / count) + rotOffset;
          b.setVelocity(Math.cos(angle) * 250, Math.sin(angle) * 250);
        }
        sounds.playEnemyPew();
        this.nextCoreFire = time + 1400;
      }

      // Handle Sweep Laser
      if (!this.laserSweepCycle) this.laserSweepCycle = 0;
      
      // Sweep cycle: 3 seconds cool, 1 second warning, 3 seconds firing
      const cycleDuration = 7000; // ms
      const phaseTime = time % cycleDuration;

      if (phaseTime < 3000) {
        // Cooldown
        this.bossLaserActive = false;
        this.bossLaserWarning = false;
      } else if (phaseTime < 4000) {
        // Warning
        this.bossLaserWarning = true;
        this.bossLaserActive = false;
        if (!this.bossLaserWarnSfx) {
          sounds.playShieldHit();
          this.bossLaserWarnSfx = true;
        }
      } else {
        // Laser sweeping active!
        this.bossLaserActive = true;
        this.bossLaserWarning = false;
        this.bossLaserWarnSfx = false;

        // Sweep angle back and forth (between 45 and 135 deg)
        const sweepSpeed = 0.001 * delta;
        this.bossLaserSweepAngle += sweepSpeed * this.bossLaserDir;
        if (this.bossLaserSweepAngle > 1.2) {
          this.bossLaserSweepAngle = 1.2;
          this.bossLaserDir = -1;
        }
        if (this.bossLaserSweepAngle < -1.2) {
          this.bossLaserSweepAngle = -1.2;
          this.bossLaserDir = 1;
        }

        // Draw sweeping laser line
        const bx = boss.x;
        const by = boss.y + 40;
        const laserLength = 700;
        // Project sweeping coordinates
        const targetX = bx + Math.sin(this.bossLaserSweepAngle) * laserLength;
        const targetY = by + Math.cos(this.bossLaserSweepAngle) * laserLength;

        this.laserGraphics.clear();
        
        // draw warning beam (thin red)
        this.laserGraphics.lineStyle(16, 0xef4444, 0.45);
        this.laserGraphics.beginPath();
        this.laserGraphics.moveTo(bx, by);
        this.laserGraphics.lineTo(targetX, targetY);
        this.laserGraphics.strokePath();

        this.laserGraphics.lineStyle(6, 0xffffff, 0.9);
        this.laserGraphics.beginPath();
        this.laserGraphics.moveTo(bx, by);
        this.laserGraphics.lineTo(targetX, targetY);
        this.laserGraphics.strokePath();

        // Laser Sweep Collision Detection (intersect line with player)
        // Check distance from player point to segment (bx, by) -> (targetX, targetY)
        const hit = this.checkPointToSegmentDistance(this.player.x, this.player.y, bx, by, targetX, targetY, 26);
        if (hit) {
          this.triggerPlayerDamage();
        }
      }

      // Draw Laser Sweep warnings
      if (this.bossLaserWarning) {
        this.laserGraphics.clear();
        this.laserGraphics.lineStyle(2, 0xef4444, Math.floor(time / 100) % 2 === 0 ? 0.7 : 0.1);
        // show warning line from core straight down
        this.laserGraphics.beginPath();
        this.laserGraphics.moveTo(boss.x, boss.y + 40);
        this.laserGraphics.lineTo(boss.x + Math.sin(this.bossLaserSweepAngle) * 700, boss.y + 40 + Math.cos(this.bossLaserSweepAngle) * 700);
        this.laserGraphics.strokePath();
      }
    }
  },


  // Math helper for laser sweep segment collision
  checkPointToSegmentDistance(px, py, x1, y1, x2, y2, tolerance) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    return dist < tolerance;
  },


  drawBossHPBar() {
    this.bossHealthBar.clear();
    const boss = this.boss;
    if (!boss || !boss.active) return;

    // Draw background outline
    this.bossHealthBar.fillStyle(0x1e293b, 0.8);
    this.bossHealthBar.fillRect(150, 24, 500, 16);
    this.bossHealthBar.lineStyle(2, 0x64748b, 1.0);
    this.bossHealthBar.strokeRect(150, 24, 500, 16);

    // HP Fill color
    // If shield active -> blue. If Core HP -> Red/Yellow
    let pct = boss.hp / 50;
    let color = 0xef4444; // red
    let label = "堡垒核心防御系统";

    if (this.bossShieldActive) {
      // Shield health based on turrets
      const turretHp = (this.bossTurrets[0].hp + this.bossTurrets[1].hp);
      pct = turretHp / 20; // 10 hp each
      color = 0x06b6d4; // cyan
      label = "要塞能量护盾发生器 (击破两侧炮塔)";
    } else if (this.bossPhase === 3) {
      color = 0xeab308; // flashing yellow
      label = "要塞核心能量熔毁中！";
    }

    this.bossHealthBar.fillStyle(color, 1.0);
    this.bossHealthBar.fillRect(151, 25, Math.max(0, 498 * pct), 14);
  },


  // ── Bullet hits Boss core/turrets ──
  damageBossTurret(turret, damage) {
    if (!turret.active) return;
    turret.hp -= damage;
    
    turret.setTint(0xff8888);
    this.time.delayedCall(80, () => {
      if (turret.active) turret.clearTint();
    });

    if (turret.hp <= 0) {
      this.explodeEntity(turret, 'large');
      turret.destroy();
      sounds.playExplosion(true);
      this.cameras.main.shake(300, 0.015);
    }
  },


  damageBossCore(damage) {
    const boss = this.boss;
    if (!boss || !boss.active) return;
    
    boss.hp -= damage;
    
    boss.setTint(0xff8888);
    this.time.delayedCall(80, () => {
      if (boss.active) boss.clearTint();
    });

    if (boss.hp <= 0) {
      this.triggerBossDefeat();
    }
  }
});
