const DEPTH = {
  GROUND: 0,
  DECOR_FLOOR: 100,
  YSORT: 1000,
  DECOR_TOP: 9000,
  EFFECTS: 9500
};

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
  }

  renderTileLayer(layerName, layerConfig) {
    const data = TILEMAP_DATA.layers[layerName];
    if (!data) return;

    const width = TILEMAP_DATA.width;
    const height = TILEMAP_DATA.height;
    
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const id = data[r * width + c];
        if (id === 0) continue; // 0 means empty

        const tileName = TILEMAP_DATA.tileIndex[id];
        if (!tileName) continue;

        const x = c * this.tileW + this.tileW / 2;
        const y = r * this.tileH + this.tileH / 2;

        const tileSprite = this.add.sprite(x, y, `tile_${tileName}`);
        tileSprite.setDisplaySize(this.tileW, this.tileH);

        // Determine base depth
        let baseDepth = DEPTH.GROUND;
        if (layerName === 'decor_floor') baseDepth = DEPTH.DECOR_FLOOR;
        else if (layerName === 'objects') baseDepth = DEPTH.YSORT;
        else if (layerName === 'decor_top') baseDepth = DEPTH.DECOR_TOP;

        // Apply Y-sort if ysort is enabled
        if (layerConfig.ysort) {
          tileSprite.setDepth(baseDepth + y);
          this.ysortGroup.add(tileSprite);
        } else {
          tileSprite.setDepth(baseDepth);
        }

        // Apply static physics collision if collision is enabled
        if (layerConfig.collision) {
          this.physics.add.existing(tileSprite, true);
          this.obstaclesGroup.add(tileSprite);
        }

        // Keep reference
        if (layerName === 'ground') {
          this.tileSprites[r * width + c] = tileSprite;
        }
      }
    }
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

    // Cleanup offscreen objects to free memory
    this.cleanupOffscreenObjects();
  }

  spawnWave(spawnY) {
    // Road lanes: x coordinates centered around road columns 4-10
    const lanes = [288, 352, 416, 480, 544, 608, 672];
    Phaser.Utils.Array.Shuffle(lanes);

    // Spawn 1-2 roadblock obstacles
    const roadblockCount = Phaser.Math.Between(1, 2);
    for (let i = 0; i < roadblockCount; i++) {
      const laneX = lanes.pop();
      const roadblock = this.roadblocks.create(laneX, spawnY + Phaser.Math.Between(-40, 40), 'roadblock_sheet');
      roadblock.setDisplaySize(54, 54);
      roadblock.body.setSize(40, 40);
      roadblock.play('roadblock_flash');
      roadblock.setDepth(DEPTH.YSORT + roadblock.y);
      this.ysortGroup.add(roadblock);
    }

    // Spawn 1-2 batteries
    const batteryCount = Phaser.Math.Between(1, 2);
    for (let i = 0; i < batteryCount; i++) {
      const laneX = lanes.pop();
      const battery = this.batteries.create(laneX, spawnY + Phaser.Math.Between(-50, 50), 'battery_sheet');
      battery.setDisplaySize(44, 44);
      battery.body.setSize(32, 32);
      battery.play('battery_sparkle');
      battery.setDepth(DEPTH.YSORT + battery.y);
      this.ysortGroup.add(battery);

      // Pulsating scale tween to represent neon pulsating glow
      this.tweens.add({
        targets: battery,
        scaleX: battery.scaleX * 1.3,
        scaleY: battery.scaleY * 1.3,
        duration: 450,
        yoyo: true,
        repeat: -1
      });
    }

    // Spawn floating neon signs/hologram billboards in the side gutters
    if (Phaser.Math.Between(1, 10) <= 6) {
      const isLeft = Phaser.Math.Between(0, 1) === 0;
      const x = isLeft ? Phaser.Math.Between(40, 160) : Phaser.Math.Between(800, 920);
      const isBillboard = Phaser.Math.Between(1, 2) === 1;

      if (isBillboard) {
        const billboard = this.decors.create(x, spawnY, 'billboard');
        billboard.setDisplaySize(110, 55);
        billboard.play('billboard_blink');
        billboard.setDepth(DEPTH.DECOR_FLOOR + billboard.y);
      } else {
        const signs = ['NEON', 'SPEED', '2099', 'TOKYO', 'PHANTOM', '⚡', '🤖', '🍒', '🔋', 'BOOST'];
        const word = Phaser.Utils.Array.GetRandom(signs);
        const colors = ['#f43f5e', '#06b6d4', '#eab308', '#a855f7', '#10b981'];
        const color = Phaser.Utils.Array.GetRandom(colors);
        const txt = this.add.text(x, spawnY, word, {
          font: 'bold 20px Courier',
          fill: color,
          stroke: '#ffffff',
          strokeThickness: 2
        }).setOrigin(0.5);
        // Give text a subtle glow shadow
        txt.setShadow(0, 0, color, 12, true, true);
        txt.setDepth(DEPTH.DECOR_FLOOR + txt.y);
        this.decors.add(txt);
      }
    }
  }

  collectBattery(player, battery) {
    battery.destroy();
    
    // Increase speed/score
    this.score += 20;
    window.GameHUD?.setScore(this.score);
    this.spawnFloatingText(battery.x, battery.y, '+20 速度 ⚡', '#10b981');
    
    // Spawn sparkle effect
    this.spawnFloatingItem(battery.x, battery.y, '✨', '#10b981');
  }

  hitRoadblock(player, roadblock) {
    roadblock.destroy();
    
    this.hearts--;
    window.GameHUD?.setHearts(this.hearts, 3);
    this.cameras.main.shake(150, 0.015);
    this.spawnFloatingText(roadblock.x, roadblock.y, '-1 护盾 💥', '#ef4444');
    
    // Flashing visual red tint feedback
    this.player.setTint(0xff3333);
    this.time.delayedCall(300, () => {
      this.player.clearTint();
    });

    if (this.hearts <= 0) {
      this.triggerGameOver(false, '护盾完全破损！赛车在巨大的冲击下熄火损毁。');
    }
  }

  cleanupOffscreenObjects() {
    // Destroy obstacles/batteries/decors that the player has completely passed
    const limitY = this.player.y + 400;
    this.batteries.getChildren().forEach(b => {
      if (b.y > limitY) b.destroy();
    });
    this.roadblocks.getChildren().forEach(r => {
      if (r.y > limitY) r.destroy();
    });
    this.decors.getChildren().forEach(d => {
      if (d.y > limitY) d.destroy();
    });
  }

  spawnFloatingText(x, y, textString, color) {
    const text = this.add.text(x, y - 10, textString, {
      font: 'bold 12px monospace',
      fill: color,
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);
    text.setDepth(DEPTH.EFFECTS);
    
    this.tweens.add({
      targets: text,
      y: y - 45,
      alpha: 0,
      duration: 1000,
      onComplete: () => text.destroy()
    });
  }

  spawnFloatingItem(x, y, iconStr, color) {
    const itemText = this.add.text(x, y, iconStr, { font: '24px Arial' }).setOrigin(0.5);
    itemText.setDepth(DEPTH.YSORT + y);
    
    this.tweens.add({
      targets: itemText,
      y: y - 50,
      alpha: 0,
      scaleX: 1.6,
      scaleY: 1.6,
      duration: 1200,
      ease: 'Cubic.easeOut',
      onComplete: () => itemText.destroy()
    });
  }

  triggerGameOver(isWin, endingText) {
    if (this.victoryShown || this.defeatShown) return;
    if (isWin) {
      this.victoryShown = true;
    } else {
      this.defeatShown = true;
    }

    this.physics.pause();
    this.player.setVelocity(0, 0);
    this.player.anims.stop();

    if (!isWin) {
      this.player.play('crash');
    }

    // Call GameHUDGameOver Integration
    window.GameHUD?.showGameOver(isWin, endingText);
    this.gameStarted = false;
  }
}

const config = {
  type: Phaser.AUTO,
  width: 960,
  height: 600,
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: MainScene
};

new Phaser.Game(config);
