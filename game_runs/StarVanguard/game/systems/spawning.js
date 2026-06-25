/* StarVanguard — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  // ── Spawners for Levels ──
  handleSpawning(time) {
    if (time < this.nextSpawnTime) return;

    if (this.currentLevel === 1) {
      // Spawn asteroid
      this.spawnAsteroid();
      this.nextSpawnTime = time + Phaser.Math.Between(700, 1400);
    } else if (this.currentLevel === 2) {
      // Spawn fleet enemy
      this.spawnFleetEnemy();
      this.nextSpawnTime = time + Phaser.Math.Between(1000, 2000);
    } else if (this.currentLevel === 3) {
      // Spawn Boss fortress once
      if (!this.bossSpawned) {
        this.spawnStarFortress();
        this.bossSpawned = true;
      }
      
      // Spawn support drones occasionally during Phase 1 & 2
      if (this.boss && this.boss.active && this.bossPhase < 3) {
        this.spawnBossDrone();
        this.nextSpawnTime = time + Phaser.Math.Between(3000, 5000);
      }
    }
  },


  spawnAsteroid() {
    const x = Phaser.Math.Between(40, 760);
    const isLarge = Math.random() < 0.45;
    
    let key = isLarge ? 'asteroid_large' : 'asteroid_small';
    let ast = this.asteroids.create(x, -30, key);
    
    ast.setDepth(DEPTH.ENEMIES);
    ast.setVelocityY(Phaser.Math.Between(80, 200));
    ast.setVelocityX(Phaser.Math.Between(-30, 30));
    
    ast.hp = isLarge ? 3 : 1;
    ast.isLarge = isLarge;
    
    // slow spin
    ast.spinSpeed = Phaser.Math.Between(-80, 80);
    ast.setAngularVelocity(ast.spinSpeed);
  },


  spawnFleetEnemy() {
    const x = Phaser.Math.Between(60, 740);
    const isBomber = Math.random() < 0.35; // 35% bomber, 65% scout
    
    if (isBomber) {
      let enemy = this.enemies.create(x, -40, 'enemy_bomber');
      enemy.setDepth(DEPTH.ENEMIES);
      enemy.type = 'bomber';
      enemy.hp = 6;
      enemy.setVelocityY(80);
      enemy.shootCooldown = 1500;
      enemy.nextShoot = this.time.now + Phaser.Math.Between(500, 1200);
    } else {
      let enemy = this.enemies.create(x, -40, 'enemy_scout');
      enemy.setDepth(DEPTH.ENEMIES);
      enemy.type = 'scout';
      enemy.hp = 2;
      // Zigzag velocity pattern
      enemy.setVelocityY(Phaser.Math.Between(160, 240));
      enemy.setVelocityX(Math.random() < 0.5 ? -100 : 100);
      enemy.shootCooldown = 1000;
      enemy.nextShoot = this.time.now + Phaser.Math.Between(400, 900);
    }
  },


  spawnBossDrone() {
    const x = Math.random() < 0.5 ? -20 : 820;
    const drone = this.enemies.create(x, Phaser.Math.Between(120, 280), 'enemy_scout');
    drone.setDepth(DEPTH.ENEMIES);
    drone.type = 'drone';
    drone.hp = 1;
    drone.setVelocityX(x < 0 ? 180 : -180);
    drone.setVelocityY(40);
    drone.setDisplaySize(32, 32);
    drone.body.setSize(24, 24);
  },


  // ── Level 3 Boss Specific spawning details ──
  spawnStarFortress() {
    // Core is at center
    this.boss = this.physics.add.sprite(400, -100, 'boss_core');
    this.boss.setDepth(DEPTH.ENEMIES);
    this.boss.hp = 50; // High health
    this.boss.body.setCircle(55, 5, 5); // Circular hitbox

    // Left turret
    const tLeft = this.physics.add.sprite(260, -110, 'boss_turret');
    tLeft.setDepth(DEPTH.ENEMIES + 5);
    tLeft.hp = 10;
    this.bossTurrets.push(tLeft);

    // Right turret
    const tRight = this.physics.add.sprite(540, -110, 'boss_turret');
    tRight.setDepth(DEPTH.ENEMIES + 5);
    tRight.hp = 10;
    this.bossTurrets.push(tRight);

    // Allow player bullets to overlap with turrets and core
    this.physics.add.overlap(this.playerBullets, tLeft, (turret, bullet) => {
      bullet.destroy();
      this.damageBossTurret(turret, bullet.damageAmount);
    });
    this.physics.add.overlap(this.playerBullets, tRight, (turret, bullet) => {
      bullet.destroy();
      this.damageBossTurret(turret, bullet.damageAmount);
    });

    this.physics.add.overlap(this.playerBullets, this.boss, (core, bullet) => {
      bullet.destroy();
      if (this.bossShieldActive) {
        // Shield absorbs bullet
        sounds.playShieldHit();
        this.bossShieldPulse = 1.0;
      } else {
        this.damageBossCore(bullet.damageAmount);
      }
    });

    // Also add collisions with player
    this.physics.add.overlap(this.player, this.boss, this.playerHit, null, this);
    this.physics.add.overlap(this.player, tLeft, this.playerHit, null, this);
    this.physics.add.overlap(this.player, tRight, this.playerHit, null, this);

    // Play warning sound & trigger brief red alert overlay
    sounds.playExplosion(true);
    this.cameras.main.shake(1000, 0.015);
  }
});
