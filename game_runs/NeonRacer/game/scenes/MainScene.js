/* NeonRacer — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
  }


  preload() {
    // 1. Load tiles dynamically from tileIndex
    for (const key in TILEMAP_DATA.tileIndex) {
      const name = TILEMAP_DATA.tileIndex[key];
      this.load.image(`tile_${name}`, `assets/tiles/${name}.png`);
    }

    // 2. Load PlayerCar Spritesheet
    this.load.spritesheet('playercar_sheet', 'assets/sprites/PlayerCar.webp', {
      frameWidth: 128,
      frameHeight: 128
    });

    // 3. Load Battery Spritesheet
    this.load.spritesheet('battery_sheet', 'assets/objects/battery.webp', {
      frameWidth: 64,
      frameHeight: 64
    });

    // 4. Load Roadblock Spritesheet
    this.load.spritesheet('roadblock_sheet', 'assets/objects/roadblock.webp', {
      frameWidth: 64,
      frameHeight: 64
    });

    // 5. Load Background Image
    this.load.image('neon_city_bg', 'assets/scene/neon_city_bg.jpg');

    // 6. Load Sky building textures
    this.load.image('building_a', 'assets/tiles/building_a.png');
    this.load.image('building_b', 'assets/tiles/building_b.png');

    // 7. Load Billboard Spritesheet
    this.load.spritesheet('billboard', 'assets/objects/billboard.webp', {
      frameWidth: 128,
      frameHeight: 64
    });
  }


  create() {
    this.DEPTH = DEPTH;
    const mapW = TILEMAP_DATA.width;
    const mapH = TILEMAP_DATA.height;
    this.tileW = TILEMAP_DATA.tileWidth;
    this.tileH = TILEMAP_DATA.tileHeight;

    // 0. Background Parallax City Skyline
    this.backgroundBg = this.add.tileSprite(480, 300, 960, 600, 'neon_city_bg');
    this.backgroundBg.setScrollFactor(0);
    this.backgroundBg.setDepth(-100);

    // Groups
    this.ysortGroup = this.add.group();
    this.obstaclesGroup = this.physics.add.staticGroup();
    
    // Dynamic obstacles and battery groups
    this.batteries = this.physics.add.group();
    this.roadblocks = this.physics.add.group();
    this.decors = this.add.group();

    // Map 2D array to track tile sprites on screen (ground/decor)
    this.tileSprites = [];

    // Billboard animation
    this.anims.create({
      key: 'billboard_blink',
      frames: this.anims.generateFrameNumbers('billboard', { start: 0, end: 1 }),
      frameRate: 2,
      repeat: -1
    });

    // Spawn parallax skyscrapers along side gutters
    this.skyscrapers = this.add.group();
    for (let y = 6000; y >= 400; y -= 600) {
      const bLeftType = Phaser.Math.Between(0, 1) === 0 ? 'building_a' : 'building_b';
      const bLeft = this.add.sprite(70, y + Phaser.Math.Between(-80, 80), bLeftType);
      bLeft.setOrigin(0.5, 1);
      bLeft.setScrollFactor(0.4, 0.4);
      bLeft.setDepth(-80);
      this.skyscrapers.add(bLeft);

      const bRightType = Phaser.Math.Between(0, 1) === 0 ? 'building_a' : 'building_b';
      const bRight = this.add.sprite(890, y + Phaser.Math.Between(-80, 80), bRightType);
      bRight.setOrigin(0.5, 1);
      bRight.setScrollFactor(0.4, 0.4);
      bRight.setDepth(-80);
      this.skyscrapers.add(bRight);
    }

    // Render layers dynamically
    GAME_CONFIG.layers.forEach(layerConfig => {
      this.renderTileLayer(layerConfig.name, layerConfig);
    });

    // Set up PlayerCar animations
    this.anims.create({
      key: 'drive',
      frames: this.anims.generateFrameNumbers('playercar_sheet', { start: 0, end: 4 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: 'steer_left',
      frames: this.anims.generateFrameNumbers('playercar_sheet', { start: 5, end: 9 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: 'steer_right',
      frames: this.anims.generateFrameNumbers('playercar_sheet', { start: 10, end: 14 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: 'boost',
      frames: this.anims.generateFrameNumbers('playercar_sheet', { start: 15, end: 19 }),
      frameRate: 15,
      repeat: -1
    });
    this.anims.create({
      key: 'crash',
      frames: this.anims.generateFrameNumbers('playercar_sheet', { start: 20, end: 24 }),
      frameRate: 12,
      repeat: 0
    });

    // Object animations
    this.anims.create({
      key: 'battery_sparkle',
      frames: this.anims.generateFrameNumbers('battery_sheet', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'roadblock_flash',
      frames: this.anims.generateFrameNumbers('roadblock_sheet', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1
    });

    // Create Player (Neon Sports Car)
    const playerData = ENTITIES_DATA.find(e => e.sprite === 'PlayerCar') || { x: 480, y: 6200 };
    this.player = this.physics.add.sprite(playerData.x, playerData.y, 'playercar_sheet');
    this.player.setDisplaySize(80, 80);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(48, 64);
    this.player.body.setOffset(40, 32);
    this.player.setDepth(DEPTH.YSORT + this.player.y);

    // Colliders
    this.physics.add.collider(this.player, this.obstaclesGroup);
    
    // Overlap handlers
    this.physics.add.overlap(this.player, this.batteries, this.collectBattery, null, this);
    this.physics.add.overlap(this.player, this.roadblocks, this.hitRoadblock, null, this);

    // Inputs (WASD + Arrow Keys + Space for Boost)
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Camera bounds following player (lock X to center or follow smoothly)
    this.physics.world.setBounds(0, 0, mapW * this.tileW, mapH * this.tileH);
    this.cameras.main.setBounds(0, 0, mapW * this.tileW, mapH * this.tileH);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Gameplay parameters
    this.hearts = 3;
    this.score = 100; // Starting Speed / Energy
    this.timeLeft = 45; // 45 seconds to win
    this.distanceLeft = 600; // in meters (player Y coordinate mapped to progress)
    
    this.lastSpawnY = 6200;
    this.isCrashed = false;
    this.victoryShown = false;
    this.defeatShown = false;

    // GameHUD Integration
    this.gameStarted = false;
    window.GameHUD?.onStart(() => {
      this.gameStarted = true;
      window.GameHUD?.setHearts(this.hearts, 3);
      window.GameHUD?.setScore(this.score);
      window.GameHUD?.setObjective("避开障碍，在 45 秒内冲过终点线！");
    });
    // Fallback if HUD script is not present
    if (!window.GameHUD) {
      this.gameStarted = true;
    }

    // ── game-playtest 探针（俯视：前进自动，bot 转向避障+吃电池；score 用距离进度防误判）──
    window.__probe = () => {
      const pl = this.player;
      if (!pl || !pl.body) return null;
      const aheadOf = o => o.active && o.y < pl.y && (pl.y - o.y) < 520;
      let steer = 0;
      // 避开前方路障/静态障碍（前瞻放大以应对高速）
      const avoid = grp => grp && grp.getChildren().forEach(o => { if (aheadOf(o)) { const dxn = pl.x - o.x; if (Math.abs(dxn) < 130) steer += Math.sign(dxn || 1) * (1 - Math.abs(dxn) / 130) * 2.6; } });
      avoid(this.roadblocks); avoid(this.obstaclesGroup);
      // 顺路吃最近电池（凑够能量 200 才算赢）
      let bn = null, bd = 1e9;
      this.batteries && this.batteries.getChildren().forEach(b => { if (aheadOf(b)) { const d = Math.hypot(b.x - pl.x, b.y - pl.y); if (d < bd) { bd = d; bn = b; } } });
      if (bn && Math.abs(steer) < 1.2) steer += Math.max(-1, Math.min(1, (bn.x - pl.x) / 130)) * 0.8;
      const mx = Math.max(-1, Math.min(1, steer));
      const prog = 600 - (this.distanceLeft ?? 600);
      return {
        x: pl.x, y: pl.y, vx: pl.body.velocity.x, onGround: true,
        hp: this.hearts ?? 3, maxHp: 3, score: prog, goalScore: 600,
        act: 1, deaths: 0, deathBudget: 3,
        won: !!this._won, lost: !!this._lost,
        cardActive: false, started: this.gameStarted,
        nextGoalX: bn ? bn.x : pl.x, worldW: 99999, cellX: 99999,
        moveX: mx, moveY: 0, attack: false,
        dangerNow: false, dangerAhead: Math.abs(steer) > 0.5,
      };
    };
  }


  update(time, delta) {
    if (!this.gameStarted) return;

    // Scroll Background Parallax
    if (this.backgroundBg) {
      this.backgroundBg.tilePositionY = this.player.y * 0.25;
    }

    if (this.isCrashed || this.victoryShown || this.defeatShown) {
      this.player.setVelocity(0, 0);
      return;
    }

    // Timer Countdown
    this.timeLeft -= delta / 1000;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.triggerGameOver(false, '超时！Arasaka 的雷达锁定了你，防线彻底关闭。');
      return;
    }

    // Distance Calculation (Player drives upwards from 6200 to 200)
    const rawDist = (this.player.y - 200) / 10;
    this.distanceLeft = Math.max(0, Math.ceil(rawDist));

    // Update HUD Objective text with timer and distance left
    const objText = `剩余时间: ${Math.ceil(this.timeLeft)}秒 | 距离终点: ${this.distanceLeft}米`;
    window.GameHUD?.setObjective(objText);

    // Check Win Condition
    if (this.distanceLeft <= 0) {
      if (this.score >= 200) {
        this.triggerGameOver(true,
          '🏁 冲线！\n\n' +
          '闪电号以近光速冲过了终点线，\n' +
          '将 Arasaka 的 AI 防线甩在了身后。\n\n' +
          '幻影（Phantom）将解密核心投入了中央主机——\n' +
          '城市的网络防火墙轰然倒塌，\n霓虹街头爆发出欢呼声！\n\n' +
          '新东京，再次属于街头的飙车手们。'
        );
      } else {
        this.triggerGameOver(false,
          `到达终点，但量子能量仅 ${this.score} / 200。\n\n` +
          '引力防护网需要充足的能量才能强行穿越，\n' +
          '这次冲刺功败垂成……\n\n收集更多电池，再来一次！'
        );
      }
      return;
    }

    // Dynamic Spawning of obstacles/batteries ahead of player
    if (this.player.y < this.lastSpawnY - 220) {
      this.lastSpawnY = this.player.y;
      this.spawnWave(this.player.y - 500);
    }

    // Controls and Movement
    let vx = 0;
    let vy = -this.score; // Continuous movement upwards, speed scaled by Score (energy)

    const baseSpeed = GAME_CONFIG.player?.speed || 250;
    let horizontalSpeed = 260;

    // Quantum Boost (Space key) increases speed significantly
    let isBoosting = false;
    if (this.keySpace.isDown) {
      isBoosting = true;
      vy -= 180; // boost speed
      horizontalSpeed = 320;
      // Exhaust flame trail behind the car (alternating cyan/orange).
      const tcolor = (time % 120 < 60) ? 0x06b6d4 : 0xf97316;
      this.spawnBurst(this.player.x + Phaser.Math.Between(-12, 12), this.player.y + 40, tcolor, 2, 28);
    }

    if (this.cursors.left.isDown || this.keyA.isDown) {
      vx = -horizontalSpeed;
      this.player.play('steer_left', true);
      this.player.setFlipX(false);
    } else if (this.cursors.right.isDown || this.keyD.isDown) {
      vx = horizontalSpeed;
      this.player.play('steer_left', true); // flip steer_left for right steering
      this.player.setFlipX(true);
    } else {
      this.player.setFlipX(false);
      if (isBoosting) {
        this.player.play('boost', true);
      } else {
        this.player.play('drive', true);
      }
    }

    if (this.cursors.up.isDown || this.keyW.isDown) {
      vy -= 80;
    } else if (this.cursors.down.isDown || this.keyS.isDown) {
      vy += 80;
    }

    this.player.setVelocity(vx, vy);

    // Refresh depth sorting
    this.player.setDepth(DEPTH.YSORT + this.player.y);
    this.ysortGroup?.getChildren().forEach(s => {
      s.setDepth(DEPTH.YSORT + s.y);
    });

    // Near-miss bonus: any roadblock that slips behind the car (it wasn't hit,
    // since a hit destroys it) and passed within a tight horizontal gap rewards
    // bonus energy — encourages risky precision weaving.
    this.roadblocks.getChildren().forEach(r => {
      if (!r.nearMissDone && r.y > this.player.y + 60) {
        r.nearMissDone = true;
        if (Math.abs(r.x - this.player.x) < 64) {
          this.score += 8;
          window.GameHUD?.setScore(this.score);
          this.spawnFloatingText(this.player.x, this.player.y - 30, 'NEAR MISS! +8 ⚡', '#facc15');
          this.spawnBurst(r.x, r.y, 0xfacc15, 10, 60);
        }
      }
    });

    // Cleanup offscreen objects to free memory
    this.cleanupOffscreenObjects();
  }
}
