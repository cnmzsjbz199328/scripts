/* NeonTowerDefense — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  createAnimations() {
    // MechGuard (Player)
    if (!this.anims.exists('player_idle')) {
      this.anims.create({
        key: 'player_idle',
        frames: this.anims.generateFrameNumbers('MechGuard', { start: 0, end: 4 }),
        frameRate: 8,
        repeat: -1
      });
    }
    if (!this.anims.exists('player_walk')) {
      this.anims.create({
        key: 'player_walk',
        frames: this.anims.generateFrameNumbers('MechGuard', { start: 5, end: 9 }),
        frameRate: 10,
        repeat: -1
      });
    }
    if (!this.anims.exists('player_build')) {
      this.anims.create({
        key: 'player_build',
        frames: this.anims.generateFrameNumbers('MechGuard', { start: 10, end: 14 }),
        frameRate: 12,
        repeat: 0
      });
    }
    if (!this.anims.exists('player_shoot')) {
      this.anims.create({
        key: 'player_shoot',
        frames: this.anims.generateFrameNumbers('MechGuard', { start: 15, end: 19 }),
        frameRate: 12,
        repeat: 0
      });
    }
    if (!this.anims.exists('player_hit')) {
      this.anims.create({
        key: 'player_hit',
        frames: this.anims.generateFrameNumbers('MechGuard', { start: 20, end: 24 }),
        frameRate: 10,
        repeat: 0
      });
    }

    // VirusRed (Malware Enemy)
    if (!this.anims.exists('virus_idle')) {
      this.anims.create({
        key: 'virus_idle',
        frames: this.anims.generateFrameNumbers('VirusRed', { start: 0, end: 4 }),
        frameRate: 8,
        repeat: -1
      });
    }
    if (!this.anims.exists('virus_walk')) {
      this.anims.create({
        key: 'virus_walk',
        frames: this.anims.generateFrameNumbers('VirusRed', { start: 5, end: 9 }),
        frameRate: 8,
        repeat: -1
      });
    }
    if (!this.anims.exists('virus_hit')) {
      this.anims.create({
        key: 'virus_hit',
        frames: this.anims.generateFrameNumbers('VirusRed', { start: 10, end: 14 }),
        frameRate: 12,
        repeat: 0
      });
    }
    if (!this.anims.exists('virus_die')) {
      this.anims.create({
        key: 'virus_die',
        frames: this.anims.generateFrameNumbers('VirusRed', { start: 15, end: 19 }),
        frameRate: 12,
        repeat: 0
      });
    }

    // SuperTrojan (Boss)
    if (!this.anims.exists('boss_idle')) {
      this.anims.create({
        key: 'boss_idle',
        frames: this.anims.generateFrameNumbers('SuperTrojan', { start: 0, end: 4 }),
        frameRate: 8,
        repeat: -1
      });
    }
    if (!this.anims.exists('boss_walk')) {
      this.anims.create({
        key: 'boss_walk',
        frames: this.anims.generateFrameNumbers('SuperTrojan', { start: 5, end: 9 }),
        frameRate: 6,
        repeat: -1
      });
    }
    if (!this.anims.exists('boss_hit')) {
      this.anims.create({
        key: 'boss_hit',
        frames: this.anims.generateFrameNumbers('SuperTrojan', { start: 10, end: 14 }),
        frameRate: 10,
        repeat: 0
      });
    }
    if (!this.anims.exists('boss_die')) {
      this.anims.create({
        key: 'boss_die',
        frames: this.anims.generateFrameNumbers('SuperTrojan', { start: 15, end: 19 }),
        frameRate: 8,
        repeat: 0
      });
    }

    // Objects base animations
    if (!this.anims.exists('anim_laser')) {
      this.anims.create({
        key: 'anim_laser',
        frames: this.anims.generateFrameNumbers('laser_turret', { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1
      });
    }
    if (!this.anims.exists('anim_plasma')) {
      this.anims.create({
        key: 'anim_plasma',
        frames: this.anims.generateFrameNumbers('plasma_turret', { start: 0, end: 3 }),
        frameRate: 8,
        repeat: -1
      });
    }
    if (!this.anims.exists('anim_crystal')) {
      this.anims.create({
        key: 'anim_crystal',
        frames: this.anims.generateFrameNumbers('energy_crystal', { start: 0, end: 3 }),
        frameRate: 6,
        repeat: -1
      });
    }
    if (!this.anims.exists('anim_core')) {
      this.anims.create({
        key: 'anim_core',
        frames: this.anims.generateFrameNumbers('core_database', { start: 0, end: 3 }),
        frameRate: 4,
        repeat: -1
      });
    }

    // New Upgrade & VFX Animations
    if (!this.anims.exists('anim_upgrade_laser')) {
      this.anims.create({
        key: 'anim_upgrade_laser',
        frames: this.anims.generateFrameNumbers('upgrade_burst_laser', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: 0
      });
    }
    if (!this.anims.exists('anim_upgrade_plasma')) {
      this.anims.create({
        key: 'anim_upgrade_plasma',
        frames: this.anims.generateFrameNumbers('upgrade_burst_plasma', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: 0
      });
    }
    if (!this.anims.exists('anim_range_ring')) {
      this.anims.create({
        key: 'anim_range_ring',
        frames: this.anims.generateFrameNumbers('range_ring', { start: 0, end: 3 }),
        frameRate: 8,
        repeat: 0
      });
    }
    if (!this.anims.exists('anim_gear')) {
      this.anims.create({
        key: 'anim_gear',
        frames: this.anims.generateFrameNumbers('firerate_gear', { start: 0, end: 3 }),
        frameRate: 12,
        repeat: -1
      });
    }
    if (!this.anims.exists('anim_crystal_burst')) {
      this.anims.create({
        key: 'anim_crystal_burst',
        frames: this.anims.generateFrameNumbers('crystal_burst', { start: 0, end: 3 }),
        frameRate: 12,
        repeat: 0
      });
    }
    if (!this.anims.exists('anim_shield')) {
      this.anims.create({
        key: 'anim_shield',
        frames: this.anims.generateFrameNumbers('core_shield', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: 0
      });
    }
    if (!this.anims.exists('anim_lightning')) {
      this.anims.create({
        key: 'anim_lightning',
        frames: this.anims.generateFrameNumbers('chain_lightning', { start: 0, end: 5 }),
        frameRate: 12,
        repeat: -1
      });
    }
    if (!this.anims.exists('anim_alert')) {
      this.anims.create({
        key: 'anim_alert',
        frames: this.anims.generateFrameNumbers('wave_alert', { start: 0, end: 3 }),
        frameRate: 6,
        repeat: -1
      });
    }
  },


  loadLevel(levelNum) {
    this.currentLevel = levelNum;
    window.GameHUD?.setDay(this.currentLevel);

    const mapConfig = this.levelMaps[this.currentLevel];

    // Clear previous obstacles
    this.collidables.clear(true, true);
    this.enemies.clear(true, true);
    this.crystals.clear(true, true);
    this.turrets.clear(true, true);
    this.plasmaProjectiles.clear(true, true);

    if (this.coreStation) this.coreStation.destroy();
    if (this.gridSprites) {
      this.gridSprites.forEach(s => s.destroy());
    }

    // Render floor grids
    this.gridSprites = [];
    const floorKey = this.currentLevel === 1 ? 'tile_cyber_grid_blue' : (this.currentLevel === 2 ? 'tile_cyber_grid_green' : 'tile_cyber_grid_pink');

    for (let r = 0; r < this.gridH; r++) {
      for (let c = 0; c < this.gridW; c++) {
        const val = mapConfig.grid[r][c];
        const px = c * this.tileW + this.tileW / 2;
        const py = r * this.tileH + this.tileH / 2;

        // Base Floor
        const fSprite = this.add.image(px, py, floorKey).setDisplaySize(this.tileW, this.tileH);
        fSprite.setDepth(DEPTH.GROUND);
        this.gridSprites.push(fSprite);

        // Cyber Wall block
        if (val === 2) {
          const wSprite = this.collidables.create(px, py, 'tile_cyber_wall');
          wSprite.setDisplaySize(this.tileW, this.tileH);
          wSprite.setDepth(DEPTH.YSORT + py);
          wSprite.refreshBody();
        }
      }
    }

    // Set core station at end point
    this.coreStation = this.physics.add.sprite(mapConfig.corePoint.x, mapConfig.corePoint.y, 'core_database');
    this.coreStation.setOrigin(0.5, 0.8);
    this.coreStation.setDisplaySize(64, 64);
    this.coreStation.setDepth(DEPTH.YSORT + mapConfig.corePoint.y);
    this.coreStation.play('anim_core');
    this.physics.add.existing(this.coreStation, true); // static body

    // Spawn player at start point
    this.player.setPosition(mapConfig.playerSpawn.x, mapConfig.playerSpawn.y);

    // Initial message
    const zoneName = this.currentLevel === 1 ? "核心安全网关" : (this.currentLevel === 2 ? "内存缓冲区" : "数据库神殿");
    window.GameHUD?.setObjective(`到达【${zoneName}】！准备御敌！`);
    this.spawnFloatingText(640, 400, `【${zoneName}】已载入`, '#00ffff');

    this.currentWave = 1;
    this.waveActive = false;
  },


  startLevelWaves() {
    this.time.delayedCall(2000, () => {
      this.startWave();
    });
  },


  startWave() {
    this.waveActive = true;
    this.enemiesSpawned = 0;

    // Calculate wave size
    if (this.currentLevel === 1) {
      this.totalEnemiesInWave = 4 + this.currentWave * 3; // 7, 10, 13
    } else if (this.currentLevel === 2) {
      this.totalEnemiesInWave = 6 + this.currentWave * 4; // 10, 14, 18
    } else {
      this.totalEnemiesInWave = 8 + this.currentWave * 5; // 13, 18, 23
    }

    // Display Terminal Wave Alert Banner (Effect 8)
    const viewCenterX = this.cameras.main.worldView.centerX || 640;
    const viewCenterY = this.cameras.main.worldView.centerY || 480;
    const alertBanner = this.add.sprite(viewCenterX, viewCenterY - 120, 'wave_alert');
    alertBanner.setScale(2.5);
    alertBanner.setDepth(DEPTH.EFFECTS);
    alertBanner.play('anim_alert');
    
    // Wave start audio-visual alerts
    this.cameras.main.flash(200, 220, 38, 38);
    this.time.delayedCall(2600, () => {
      alertBanner.destroy();
    });

    window.GameHUD?.setObjective(`波次 ${this.currentWave} / ${this.maxWaves} 正在入侵中！`);
    this.spawnFloatingText(640, 400, `波次 ${this.currentWave} 开始！`, '#ef4444');

    // Spawning timer
    if (this.waveTimer) this.waveTimer.destroy();
    this.waveTimer = this.time.addEvent({
      delay: 1500 - (this.currentLevel * 200),
      loop: true,
      callback: () => {
        this.spawnEnemy();
      }
    });
  },


  spawnEnemy() {
    if (!this.gameStarted) return;
    if (this.enemiesSpawned >= this.totalEnemiesInWave) {
      if (this.waveTimer) { this.waveTimer.destroy(); this.waveTimer = null; }
      return;
    }

    this.enemiesSpawned++;
    const mapConfig = this.levelMaps[this.currentLevel];

    // Determine type: Standard Red or Fast Green
    let type = 'red';
    let isBoss = false;

    // In Level 3, Wave 3, spawn one SuperTrojan boss
    if (this.currentLevel === 3 && this.currentWave === 3 && this.enemiesSpawned === this.totalEnemiesInWave) {
      isBoss = true;
    } else {
      const fastChance = 0.15 * this.currentWave + (this.currentLevel * 0.1);
      if (Math.random() < fastChance) {
        type = 'fast';
      }
    }

    let spawnX, spawnY;
    let waypoints;

    // Level 3 dual lanes spawning
    if (this.currentLevel === 3) {
      const side = Math.random() < 0.5 ? 'A' : 'B';
      if (side === 'A') {
        spawnX = mapConfig.spawnPointA.x;
        spawnY = mapConfig.spawnPointA.y;
        waypoints = mapConfig.waypointsA;
      } else {
        spawnX = mapConfig.spawnPointB.x;
        spawnY = mapConfig.spawnPointB.y;
        waypoints = mapConfig.waypointsB;
      }
    } else {
      spawnX = mapConfig.spawnPoint.x;
      spawnY = mapConfig.spawnPoint.y;
      waypoints = mapConfig.waypoints;
    }

    // Spawn enemy
    const spriteKey = isBoss ? 'SuperTrojan' : 'VirusRed';
    const enemy = this.enemies.create(spawnX, spawnY, spriteKey);
    enemy.setOrigin(0.5, 0.8);

    // Stats config
    if (isBoss) {
      enemy.health = 250;
      enemy.maxHealth = 250;
      enemy.speed = 40;
      enemy.isBoss = true;
      enemy.play('boss_walk');
      enemy.setDisplaySize(96, 96);
      this.spawnFloatingText(enemy.x, enemy.y - 64, '⚠️ 超级木马警报 ⚠️', '#ec4899');
    } else {
      if (type === 'fast') {
        enemy.health = 25;
        enemy.maxHealth = 25;
        enemy.speed = 120;
        enemy.setTint(0x00ff66); // green tint for fast malware
        enemy.isFast = true;
      } else {
        enemy.health = 45;
        enemy.maxHealth = 45;
        enemy.speed = 65;
        enemy.setTint(0xff3333); // red tint for standard virus
      }
      enemy.play('virus_walk');
      enemy.setDisplaySize(54, 54);
    }

    // Keep track of movement waypoint indexes
    enemy.waypointIdx = 1;
    enemy.waypoints = waypoints;
    enemy.isDead = false;

    // Health bar graphics
    enemy.healthBar = this.add.graphics();
    enemy.setDepth(DEPTH.YSORT + enemy.y);
    this.ysortGroup.add(enemy);
  }
});
