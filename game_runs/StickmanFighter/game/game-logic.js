const DEPTH = {
  BACKGROUND: 0,
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

    // 2. Load characters
    this.load.spritesheet('player_stickman', 'assets/sprites/PlayerStickman.webp', {
      frameWidth: 96,
      frameHeight: 96
    });
    this.load.spritesheet('enemy_stickman', 'assets/sprites/EnemyStickman.webp', {
      frameWidth: 96,
      frameHeight: 96
    });

    // 3. Load objects
    this.load.spritesheet('street_barrel', 'assets/objects/street_barrel.webp', {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.spritesheet('health_pack', 'assets/objects/health_pack.webp', {
      frameWidth: 64,
      frameHeight: 64
    });
  }

  create() {
    this.DEPTH = DEPTH;
    const mapW = TILEMAP_DATA.width;
    const mapH = TILEMAP_DATA.height;
    this.tileW = TILEMAP_DATA.tileWidth;
    this.tileH = TILEMAP_DATA.tileHeight;

    // Groups
    this.ysortGroup = this.add.group();
    this.barrels = this.physics.add.group();
    this.healthPacks = this.physics.add.group();
    this.enemies = this.physics.add.group();

    // Set up Physics world bounds (floor top at 576px)
    this.physics.world.setBounds(0, 0, mapW * this.tileW, 576);
    this.cameras.main.setBounds(0, 0, mapW * this.tileW, mapH * this.tileH);

    // Render Tile layers
    GAME_CONFIG.layers.forEach(layerConfig => {
      this.renderTileLayer(layerConfig.name, layerConfig);
    });

    // Setup Animations
    this.setupAnimations();

    // Create Player 1 (Red Stickman)
    this.player = this.physics.add.sprite(120, 480, 'player_stickman');
    this.player.setOrigin(0.5, 1);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(32, 70);
    this.player.body.setOffset(32, 26);
    this.player.setDepth(DEPTH.YSORT + this.player.y);
    this.ysortGroup.add(this.player);

    // Colliders / Overlaps
    this.physics.add.overlap(this.player, this.healthPacks, this.collectHealth, null, this);

    // Inputs for P1 (A/D/W/S + J/K + Space)
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyJ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J); // P1 Punch
    this.keyK = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K); // P1 Kick
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE); // P1 Ultimate

    // Inputs for P2 (Arrow Keys + I/O/P)
    this.p2KeyLeft = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.p2KeyRight = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.p2KeyUp = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.p2KeyDown = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.p2KeyI = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I); // P2 Punch
    this.p2KeyO = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.O); // P2 Kick
    this.p2KeyP = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P); // P2 Ultimate

    // Camera follow player 1
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Load static entities (barrels) from entities.json
    ENTITIES_DATA.forEach(ent => {
      if (ent.sprite === 'street_barrel') {
        const barrel = this.barrels.create(ent.x, ent.y, 'street_barrel');
        barrel.setOrigin(0.5, 1);
        barrel.setImmovable(true);
        barrel.body.allowGravity = false;
        barrel.body.setSize(40, 48);
        barrel.body.setOffset(12, 16);
        barrel.play('barrel_flicker');
        barrel.setDepth(DEPTH.YSORT + barrel.y);
        barrel.isPrimed = false; // Custom state for exploding hazard
        this.ysortGroup.add(barrel);
      }
    });

    // Initial Stats & Settings
    this.hearts = 3.0; // P1 Health Hearts (Float: 3.0 max)
    this.playerEnergy = 0; // P1 Ultimate Energy
    this.score = 0; // K.O. Count
    this.enemiesDefeated = 0;
    this.bossDefeated = false;
    
    this.isAttacking = false; // P1 attack status
    this.isHit = false; // P1 hit stun state
    this.gameStarted = false;
    this.victoryShown = false;
    this.defeatShown = false;
    this.isPvP = false;

    // P1 states
    this.playerComboQueue = [];
    this.playerLastInputTime = 0;
    this.playerStunnedUntil = 0;
    this.playerFlashingUlt = false;
    this.playerWasOnFloor = true;

    // AI Spawning params
    this.maxWaveEnemies = 3;
    this.enemiesSpawned = 0;
    this.bossSpawned = false;

    // Visual Hazards: Electric Wall Graphics & Flicker
    this.electricGraphics = this.add.graphics();
    this.electricGraphics.setDepth(DEPTH.DECOR_TOP);

    // GameHUD Integration
    window.GameHUD?.onStart((isPvP) => {
      this.isPvP = !!isPvP;
      this.gameStarted = true;

      // Configure visual layouts and custom HUD elements
      this.setupHUD();

      if (this.isPvP) {
        this.setupPvP();
      } else {
        // Story Mode starting values
        window.GameHUD?.setHearts(Math.ceil(this.hearts), 3);
        window.GameHUD?.setScore(this.score);
        window.GameHUD?.setObjective("击败暗影战士！ A/D: 移动 | W: 跳跃 | S: 防守 | J: 出拳 | K: 回旋踢 | Space: 必杀");
      }
    });

    if (!window.GameHUD) {
      this.gameStarted = true;
    }
  }

  setupAnimations() {
    // Player animations
    this.anims.create({
      key: 'player_idle',
      frames: this.anims.generateFrameNumbers('player_stickman', { start: 0, end: 4 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'player_walk',
      frames: this.anims.generateFrameNumbers('player_stickman', { start: 5, end: 9 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: 'player_punch',
      frames: this.anims.generateFrameNumbers('player_stickman', { start: 10, end: 14 }),
      frameRate: 15,
      repeat: 0
    });
    this.anims.create({
      key: 'player_kick',
      frames: this.anims.generateFrameNumbers('player_stickman', { start: 15, end: 19 }),
      frameRate: 12,
      repeat: 0
    });
    this.anims.create({
      key: 'player_block',
      frames: [{ key: 'player_stickman', frame: 20 }],
      frameRate: 1
    });
    this.anims.create({
      key: 'player_hit',
      frames: [{ key: 'player_stickman', frame: 21 }],
      frameRate: 1
    });
    this.anims.create({
      key: 'player_fall',
      frames: this.anims.generateFrameNumbers('player_stickman', { start: 22, end: 24 }),
      frameRate: 8,
      repeat: 0
    });

    // Enemy animations
    this.anims.create({
      key: 'enemy_idle',
      frames: this.anims.generateFrameNumbers('enemy_stickman', { start: 0, end: 4 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'enemy_walk',
      frames: this.anims.generateFrameNumbers('enemy_stickman', { start: 5, end: 9 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: 'enemy_punch',
      frames: this.anims.generateFrameNumbers('enemy_stickman', { start: 10, end: 14 }),
      frameRate: 12,
      repeat: 0
    });
    this.anims.create({
      key: 'enemy_kick',
      frames: this.anims.generateFrameNumbers('enemy_stickman', { start: 15, end: 19 }),
      frameRate: 10,
      repeat: 0
    });
    this.anims.create({
      key: 'enemy_block',
      frames: [{ key: 'enemy_stickman', frame: 20 }],
      frameRate: 1
    });
    this.anims.create({
      key: 'enemy_hit',
      frames: [{ key: 'enemy_stickman', frame: 21 }],
      frameRate: 1
    });
    this.anims.create({
      key: 'enemy_fall',
      frames: this.anims.generateFrameNumbers('enemy_stickman', { start: 22, end: 24 }),
      frameRate: 8,
      repeat: 0
    });

    // Object animations
    this.anims.create({
      key: 'barrel_flicker',
      frames: this.anims.generateFrameNumbers('street_barrel', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'pack_pulse',
      frames: this.anims.generateFrameNumbers('health_pack', { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1
    });
  }

  renderTileLayer(layerName, layerConfig) {
    const data = TILEMAP_DATA.layers[layerName];
    if (!data) return;

    const width = TILEMAP_DATA.width;
    const height = TILEMAP_DATA.height;

    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const id = data[r * width + c];
        if (id === 0) continue;

        const tileName = TILEMAP_DATA.tileIndex[id];
        if (!tileName) continue;

        const x = c * this.tileW + this.tileW / 2;
        const y = r * this.tileH + this.tileH / 2;

        const tileSprite = this.add.sprite(x, y, `tile_${tileName}`);
        tileSprite.setDisplaySize(this.tileW, this.tileH);

        let baseDepth = DEPTH.BACKGROUND;
        if (layerName === 'decor_floor') baseDepth = DEPTH.DECOR_FLOOR;
        else if (layerName === 'objects') baseDepth = DEPTH.YSORT;
        else if (layerName === 'decor_top') baseDepth = DEPTH.DECOR_TOP;

        if (layerConfig.ysort) {
          tileSprite.setDepth(baseDepth + y);
          this.ysortGroup.add(tileSprite);
        } else {
          tileSprite.setDepth(baseDepth);
        }
      }
    }
  }

  setupHUD() {
    const hud = document.getElementById('hud');
    if (!hud) return;

    if (this.isPvP) {
      hud.innerHTML = `
        <div id="p1-hud" style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px;">
          <span style="color: #ef4444; font-weight: bold; font-size: 15px;">小红 (P1)</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span id="p1-hearts" style="color: #f87171; font-size: 18px; letter-spacing: 2px;">♥♥♥</span>
            <div style="width: 100px; height: 8px; background: rgba(255,255,255,0.2); border-radius: 4px; overflow: hidden; border: 1px solid #ef4444;">
              <div id="p1-energy-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #f59e0b, #ef4444); transition: width 0.1s;"></div>
            </div>
            <span id="p1-energy-text" style="color: #f59e0b; font-size: 11px; font-weight: bold;">0%</span>
          </div>
        </div>
        <div id="hud-objective" style="color: #a5f3fc; flex: 1; text-align: center; font-size: 13px;"><span id="hud-objective-text">双人决斗！生死一战！</span></div>
        <div id="p2-hud" style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
          <span style="color: #06b6d4; font-weight: bold; font-size: 15px;">小蓝 (P2)</span>
          <div style="display: flex; align-items: center; gap: 8px; flex-direction: row-reverse;">
            <span id="p2-hearts" style="color: #f87171; font-size: 18px; letter-spacing: 2px;">♥♥♥</span>
            <div style="width: 100px; height: 8px; background: rgba(255,255,255,0.2); border-radius: 4px; overflow: hidden; border: 1px solid #06b6d4;">
              <div id="p2-energy-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #06b6d4, #3b82f6); transition: width 0.1s;"></div>
            </div>
            <span id="p2-energy-text" style="color: #06b6d4; font-size: 11px; font-weight: bold;">0%</span>
          </div>
        </div>
      `;
    } else {
      hud.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <div id="hud-hearts" style="color: #f87171; letter-spacing: 2px; font-size: 18px;">♥♥♥</div>
          <div id="p1-energy-container" style="display: flex; align-items: center; gap: 6px;">
            <div style="width: 80px; height: 8px; background: rgba(255,255,255,0.2); border-radius: 4px; overflow: hidden; border: 1px solid #ef4444;">
              <div id="p1-energy-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #f59e0b, #ef4444); transition: width 0.1s;"></div>
            </div>
            <span id="p1-energy-text" style="color: #f59e0b; font-size: 11px; font-weight: bold;">0%</span>
          </div>
        </div>
        <div id="hud-score" style="color: #fbbf24; margin-left: 20px;">K.O.数: <span id="hud-score-value">0</span></div>
        <div id="hud-objective" style="color: #a5f3fc; flex: 1; text-align: center;"><span id="hud-objective-text">击败前来的暗影战士，证明你的格斗实力！</span></div>
      `;
    }
  }

  updateHUDHearts() {
    if (this.isPvP) {
      const p1El = document.getElementById('p1-hearts');
      if (p1El) {
        const p1Filled = Math.max(0, Math.ceil(this.hearts));
        p1El.textContent = '♥'.repeat(p1Filled) + '♡'.repeat(3 - p1Filled);
      }
      const p2El = document.getElementById('p2-hearts');
      if (p2El) {
        const p2Filled = Math.max(0, Math.ceil(this.p2Hearts));
        p2El.textContent = '♥'.repeat(p2Filled) + '♡'.repeat(3 - p2Filled);
      }
    } else {
      window.GameHUD?.setHearts(Math.ceil(this.hearts), 3);
    }
  }

  updateHUDValues() {
    const p1Bar = document.getElementById('p1-energy-bar');
    const p1Text = document.getElementById('p1-energy-text');
    if (p1Bar) p1Bar.style.width = `${this.playerEnergy}%`;
    if (p1Text) p1Text.textContent = `${this.playerEnergy}%`;

    if (this.isPvP) {
      const p2Bar = document.getElementById('p2-energy-bar');
      const p2Text = document.getElementById('p2-energy-text');
      if (p2Bar) p2Bar.style.width = `${this.p2Energy}%`;
      if (p2Text) p2Text.textContent = `${this.p2Energy}%`;
    } else {
      window.GameHUD?.setScore(this.score);
    }
  }

  setupPvP() {
    // Create P2 stickman using EnemyStickman assets tinted Cyan
    this.p2 = this.physics.add.sprite(840, 480, 'enemy_stickman');
    this.p2.setOrigin(0.5, 1);
    this.p2.setCollideWorldBounds(true);
    this.p2.body.setSize(32, 70);
    this.p2.body.setOffset(32, 26);
    this.p2.setDepth(DEPTH.YSORT + this.p2.y);
    this.ysortGroup.add(this.p2);

    // Apply cyan color to P2
    this.p2.setTint(0x00ffff);

    // P2 Stats
    this.p2Hearts = 3.0;
    this.p2Energy = 0;
    this.p2ComboQueue = [];
    this.p2LastInputTime = 0;
    this.p2StunnedUntil = 0;
    this.p2FlashingUlt = false;
    this.p2IsAttacking = false;
    this.p2IsHit = false;
    this.p2WasOnFloor = true;

    // Register overlaps for P2
    this.physics.add.overlap(this.p2, this.healthPacks, this.collectHealthP2, null, this);

    window.GameHUD?.setObjective("对决模式开始！P1: A/D/W/S/J/K/Space | P2: 方向键/I/O/P");
  }

  update() {
    if (!this.gameStarted) return;

    if (this.isPvP) {
      // Local PvP Win/Lose checks
      if (this.hearts <= 0) {
        this.triggerGameOver(false, "小红倒下了！小蓝 (P2) 获得了最终胜利！🏆");
        return;
      }
      if (this.p2Hearts <= 0) {
        this.triggerGameOver(true, "小蓝倒下了！小红 (P1) 获得了最终胜利！🏆");
        return;
      }

      // Read player actions
      this.handlePlayerActions();
      this.handleP2Actions();

      // Hazard collision checks
      this.checkElectricShock(this.player, true);
      if (this.p2) this.checkElectricShock(this.p2, false);

      // Dust puff on land
      if (this.player.body.onFloor() && !this.playerWasOnFloor) {
        this.spawnDust(this.player.x, this.player.y);
      }
      this.playerWasOnFloor = this.player.body.onFloor();

      if (this.p2 && this.p2.body.onFloor() && !this.p2WasOnFloor) {
        this.spawnDust(this.p2.x, this.p2.y);
      }
      this.p2WasOnFloor = this.p2 ? this.p2.body.onFloor() : true;

      // Update Depth
      this.player.setDepth(DEPTH.YSORT + this.player.y);
      if (this.p2) this.p2.setDepth(DEPTH.YSORT + this.p2.y);

    } else {
      // Original single-player story mode
      if (this.hearts <= 0) {
        this.triggerGameOver(false, "小红战败！暗影兵团彻底吞噬了几何次元……");
        return;
      }

      if (this.bossDefeated) {
        this.triggerGameOver(true, "K.O！小红击败了暗影首领，粉碎了阴影核心，拯救了几何次元！🏆");
        return;
      }

      // AI Wave Spawning
      this.handleAISpawning();

      // Player Actions
      this.handlePlayerActions();

      // AI Enemy Behavior
      this.handleAIBehavior();

      // Hazard checks
      this.checkElectricShock(this.player, true);
      this.enemies.getChildren().forEach(e => {
        if (!e.isDead) this.checkElectricShock(e, false, true);
      });

      // Dust puff check
      if (this.player.body.onFloor() && !this.playerWasOnFloor) {
        this.spawnDust(this.player.x, this.player.y);
      }
      this.playerWasOnFloor = this.player.body.onFloor();

      // Update Depth Sorting
      this.player.setDepth(DEPTH.YSORT + this.player.y);
      this.enemies.getChildren().forEach(e => {
        e.setDepth(DEPTH.YSORT + e.y);
        this.updateEnemyHealthBar(e);
      });
    }

    // Flicker/Animate Electric Wall Visuals
    this.renderElectricWalls();
  }

  handlePlayerActions() {
    if (this.isHit || this.hearts <= 0 || this.time.now < this.playerStunnedUntil) return;

    let vx = 0;
    const speed = GAME_CONFIG.player.speed;
    const isBlocking = (this.keyS.isDown || this.cursors.down.isDown) && this.player.body.onFloor();

    // 1. Capture Combo Input queue
    const time = this.time.now;
    let attackInput = null;

    if (Phaser.Input.Keyboard.JustDown(this.keyJ)) {
      attackInput = 'J';
    } else if (Phaser.Input.Keyboard.JustDown(this.keyK)) {
      attackInput = 'K';
    } else if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
      // Try Ultimate Skill
      if (this.playerEnergy >= 100) {
        this.fireUltimate(true);
        return;
      } else {
        this.spawnFloatingText(this.player.x, this.player.y - 80, `⚡ ${this.playerEnergy}% / 100%`, '#6b7280');
      }
    }

    if (attackInput) {
      // Check timestamp to chain combo sequence
      if (time - this.playerLastInputTime > 350) {
        this.playerComboQueue = [];
      }
      this.playerLastInputTime = time;
      this.playerComboQueue.push(attackInput);

      if (this.playerComboQueue.length > 3) {
        this.playerComboQueue.shift();
      }

      // Check combo sequences
      const comboStr = this.playerComboQueue.join('-');
      if (comboStr === 'J-J-J') {
        this.playerComboQueue = [];
        this.executeHeavyThrustCombo(this.player, true);
        return;
      } else if (comboStr === 'J-K') {
        this.playerComboQueue = [];
        this.executeUppercutCombo(this.player, true);
        return;
      }

      // Execute basic attack if no combo matched and not currently attacking or blocking
      if (!this.isAttacking && !isBlocking) {
        if (attackInput === 'J') {
          this.executeNormalPunch(this.player, true);
        } else if (attackInput === 'K') {
          this.executeNormalKick(this.player, true);
        }
      }
    }

    // 2. Handle standard P1 Movement
    if (!this.isAttacking) {
      if (isBlocking) {
        this.player.play('player_block', true);
        this.player.setVelocityX(0);
      } else {
        if (this.keyA.isDown || this.cursors.left.isDown) {
          vx = -speed;
          this.player.setFlipX(true);
          if (this.player.body.onFloor()) {
            this.player.play('player_walk', true);
          }
        } else if (this.keyD.isDown || this.cursors.right.isDown) {
          vx = speed;
          this.player.setFlipX(false);
          if (this.player.body.onFloor()) {
            this.player.play('player_walk', true);
          }
        } else {
          if (this.player.body.onFloor()) {
            this.player.play('player_idle', true);
          }
        }

        // Jump Input
        if ((Phaser.Input.Keyboard.JustDown(this.keyW) || Phaser.Input.Keyboard.JustDown(this.cursors.up)) && this.player.body.onFloor()) {
          this.player.setVelocityY(-450);
          this.spawnDust(this.player.x, this.player.y);
        }

        this.player.setVelocityX(vx);
      }
    }
  }

  handleP2Actions() {
    if (!this.isPvP || !this.p2 || this.p2IsHit || this.p2Hearts <= 0 || this.time.now < this.p2StunnedUntil) return;

    let vx = 0;
    const speed = GAME_CONFIG.player.speed;
    const isBlocking = this.p2KeyDown.isDown && this.p2.body.onFloor();

    // 1. Capture P2 Combo input
    const time = this.time.now;
    let attackInput = null;

    if (Phaser.Input.Keyboard.JustDown(this.p2KeyI)) {
      attackInput = 'I';
    } else if (Phaser.Input.Keyboard.JustDown(this.p2KeyO)) {
      attackInput = 'O';
    } else if (Phaser.Input.Keyboard.JustDown(this.p2KeyP)) {
      // Try Ultimate Skill for P2
      if (this.p2Energy >= 100) {
        this.fireUltimate(false);
        return;
      }
    }

    if (attackInput) {
      if (time - this.p2LastInputTime > 350) {
        this.p2ComboQueue = [];
      }
      this.p2LastInputTime = time;
      this.p2ComboQueue.push(attackInput);

      if (this.p2ComboQueue.length > 3) {
        this.p2ComboQueue.shift();
      }

      // Check combo sequences
      const comboStr = this.p2ComboQueue.join('-');
      if (comboStr === 'I-I-I') {
        this.p2ComboQueue = [];
        this.executeHeavyThrustCombo(this.p2, false);
        return;
      } else if (comboStr === 'I-O') {
        this.p2ComboQueue = [];
        this.executeUppercutCombo(this.p2, false);
        return;
      }

      // Execute basic attack if no combo matched
      if (!this.p2IsAttacking && !isBlocking) {
        if (attackInput === 'I') {
          this.executeNormalPunch(this.p2, false);
        } else if (attackInput === 'O') {
          this.executeNormalKick(this.p2, false);
        }
      }
    }

    // 2. Handle P2 Movement
    if (!this.p2IsAttacking) {
      if (isBlocking) {
        this.p2.play('enemy_block', true);
        this.p2.setVelocityX(0);
      } else {
        if (this.p2KeyLeft.isDown) {
          vx = -speed;
          this.p2.setFlipX(true);
          if (this.p2.body.onFloor()) {
            this.p2.play('enemy_walk', true);
          }
        } else if (this.p2KeyRight.isDown) {
          vx = speed;
          this.p2.setFlipX(false);
          if (this.p2.body.onFloor()) {
            this.p2.play('enemy_walk', true);
          }
        } else {
          if (this.p2.body.onFloor()) {
            this.p2.play('enemy_idle', true);
          }
        }

        // Jump Input
        if (Phaser.Input.Keyboard.JustDown(this.p2KeyUp) && this.p2.body.onFloor()) {
          this.p2.setVelocityY(-450);
          this.spawnDust(this.p2.x, this.p2.y);
        }

        this.p2.setVelocityX(vx);
      }
    }
  }

  // --- Attack execution helpers ---

  executeNormalPunch(char, isP1) {
    if (isP1) {
      this.isAttacking = true;
      char.setVelocityX(0);
      char.play('player_punch', true);
      this.time.delayedCall(200, () => this.registerPlayerHit(char, 75, 12, false, isP1, 'punch'));
      char.once('animationcomplete', () => { this.isAttacking = false; });
    } else {
      this.p2IsAttacking = true;
      char.setVelocityX(0);
      char.play('enemy_punch', true);
      this.time.delayedCall(200, () => this.registerPlayerHit(char, 75, 12, false, isP1, 'punch'));
      char.once('animationcomplete', () => { this.p2IsAttacking = false; });
    }
  }

  executeNormalKick(char, isP1) {
    if (isP1) {
      this.isAttacking = true;
      char.setVelocityX(0);
      char.play('player_kick', true);
      this.time.delayedCall(250, () => this.registerPlayerHit(char, 90, 20, true, isP1, 'kick'));
      char.once('animationcomplete', () => { this.isAttacking = false; });
    } else {
      this.p2IsAttacking = true;
      char.setVelocityX(0);
      char.play('enemy_kick', true);
      this.time.delayedCall(250, () => this.registerPlayerHit(char, 90, 20, true, isP1, 'kick'));
      char.once('animationcomplete', () => { this.p2IsAttacking = false; });
    }
  }

  executeHeavyThrustCombo(char, isP1) {
    const dir = char.flipX ? -1 : 1;
    this.spawnFloatingText(char.x, char.y - 80, 'THRUST COMBO! 👊💥', isP1 ? '#f59e0b' : '#38bdf8');
    
    if (isP1) {
      this.isAttacking = true;
      char.play('player_punch', true);
      char.setVelocityX(dir * 350); // slide forward
      this.time.delayedCall(150, () => this.registerPlayerHit(char, 95, 35, true, isP1, 'heavy_combo'));
      char.once('animationcomplete', () => {
        this.isAttacking = false;
        char.setVelocityX(0);
      });
    } else {
      this.p2IsAttacking = true;
      char.play('enemy_punch', true);
      char.setVelocityX(dir * 350); // slide forward
      this.time.delayedCall(150, () => this.registerPlayerHit(char, 95, 35, true, isP1, 'heavy_combo'));
      char.once('animationcomplete', () => {
        this.p2IsAttacking = false;
        char.setVelocityX(0);
      });
    }
  }

  executeUppercutCombo(char, isP1) {
    const dir = char.flipX ? -1 : 1;
    this.spawnFloatingText(char.x, char.y - 80, 'UPPERCUT! 🚀💥', isP1 ? '#a855f7' : '#38bdf8');

    if (isP1) {
      this.isAttacking = true;
      char.play('player_kick', true);
      char.setVelocityX(dir * 120);
      this.time.delayedCall(200, () => this.registerPlayerHit(char, 90, 25, true, isP1, 'launch_combo'));
      char.once('animationcomplete', () => {
        this.isAttacking = false;
        char.setVelocityX(0);
      });
    } else {
      this.p2IsAttacking = true;
      char.play('enemy_kick', true);
      char.setVelocityX(dir * 120);
      this.time.delayedCall(200, () => this.registerPlayerHit(char, 90, 25, true, isP1, 'launch_combo'));
      char.once('animationcomplete', () => {
        this.p2IsAttacking = false;
        char.setVelocityX(0);
      });
    }
  }

  registerPlayerHit(char, range, damage, hasKnockback, isP1, hitType) {
    const isFacingLeft = char.flipX;

    // Check hit on Barrels
    this.barrels.getChildren().forEach(b => {
      if (!b.active || b.isPrimed) return;
      const dist = Phaser.Math.Distance.Between(char.x, char.y, b.x, b.y);
      if (dist <= range + 15) {
        const isCorrectDirection = isFacingLeft ? (b.x < char.x) : (b.x > char.x);
        if (isCorrectDirection) {
          this.hitBarrel(b, char, damage);
        }
      }
    });

    if (this.isPvP) {
      // PvP target is the opponent player
      const opponent = isP1 ? this.p2 : this.player;
      if (opponent && opponent.active) {
        const dist = Phaser.Math.Distance.Between(char.x, char.y - 32, opponent.x, opponent.y - 32);
        if (dist <= range) {
          const isCorrectDirection = isFacingLeft ? (opponent.x < char.x) : (opponent.x > char.x);
          if (isCorrectDirection) {
            this.damageOpponentPlayer(opponent, damage, hasKnockback, isP1, hitType);
          }
        }
      }
    } else {
      // Story mode target is AI Enemies
      if (isP1) {
        this.enemies.getChildren().forEach(e => {
          if (e.isDead) return;
          const dist = Phaser.Math.Distance.Between(char.x, char.y - 32, e.x, e.y - 32);
          if (dist <= range) {
            const isCorrectDirection = isFacingLeft ? (e.x < char.x) : (e.x > char.x);
            if (isCorrectDirection) {
              this.damageAIEnemy(e, damage, hasKnockback, hitType);
            }
          }
        });
      }
    }
  }

  damageAIEnemy(enemy, damage, hasKnockback, hitType) {
    // P1 gets energy on hitting AI
    this.gainEnergy(true, 5);

    // Apply hit stop
    this.applyHitStop();

    enemy.health -= damage;
    this.cameras.main.shake(100, 0.008);
    this.spawnFloatingText(enemy.x, enemy.y - 64, `-${damage} HP 💥`, '#fbbf24');

    // Impact Sparks
    const hitX = (this.player.x + enemy.x) / 2;
    const hitY = enemy.y - 32;
    this.spawnSparks(hitX, hitY, 0xff3333);

    // Trigger hit visual effect
    enemy.setTint(0xff3333);
    this.time.delayedCall(200, () => {
      if (enemy.active && !enemy.isDead) enemy.clearTint();
    });

    if (enemy.health <= 0) {
      this.killEnemy(enemy);
    } else {
      enemy.play('enemy_hit', true);
      enemy.isHitState = true;
      
      // Knockback/Launch physics
      const knockDir = this.player.flipX ? -1 : 1;
      let kbVel = hasKnockback ? 300 : 120;
      let kbVelY = -100;

      if (hitType === 'launch_combo') {
        kbVel = 150;
        kbVelY = -350; // Launch
      } else if (hitType === 'heavy_combo') {
        kbVel = 450; // Super thrust
      }

      enemy.setVelocity(knockDir * kbVel, kbVelY);
      this.spawnDust(enemy.x, enemy.y);

      this.time.delayedCall(400, () => {
        if (enemy.active && !enemy.isDead) {
          enemy.isHitState = false;
          enemy.setVelocityX(0);
        }
      });
    }
  }

  damageOpponentPlayer(opponent, damage, hasKnockback, isP1Source, hitType) {
    // Attacker gains energy
    this.gainEnergy(isP1Source, 5);

    // Apply hit stop
    this.applyHitStop();

    const targetIsP1 = !isP1Source;
    const isBlocking = targetIsP1 
      ? ((this.keyS.isDown || this.cursors.down.isDown) && this.player.body.onFloor())
      : (this.p2KeyDown.isDown && this.p2.body.onFloor());

    if (isBlocking) {
      // Shield block logic
      const blockedDamage = Math.round(damage * 0.2); // 80% reduction
      this.gainEnergy(targetIsP1, 15); // Defender gains energy for blocks

      if (targetIsP1) {
        this.hearts = Math.max(0, this.hearts - blockedDamage / 100);
      } else {
        this.p2Hearts = Math.max(0, this.p2Hearts - blockedDamage / 100);
      }
      this.updateHUDHearts();

      this.spawnFloatingText(opponent.x, opponent.y - 75, '防御 🛡️', '#38bdf8');
      this.spawnFloatingItem(opponent.x + (opponent.flipX ? -15 : 15), opponent.y - 30, '✨', '#38bdf8');
    } else {
      // Full damage
      if (targetIsP1) {
        this.hearts = Math.max(0, this.hearts - damage / 100);
        this.isHit = true;
        this.player.play('player_hit', true);
      } else {
        this.p2Hearts = Math.max(0, this.p2Hearts - damage / 100);
        this.p2IsHit = true;
        opponent.play('enemy_hit', true);
      }
      this.updateHUDHearts();

      this.cameras.main.shake(150, 0.015);
      this.spawnFloatingText(opponent.x, opponent.y - 75, `-${damage} HP 🩸`, '#ef4444');

      // Sparks VFX
      const sourceChar = isP1Source ? this.player : this.p2;
      const hitX = (sourceChar.x + opponent.x) / 2;
      const hitY = opponent.y - 32;
      this.spawnSparks(hitX, hitY, isP1Source ? 0xff0055 : 0x00ffff);

      opponent.setTint(0xff3333);
      this.time.delayedCall(200, () => {
        if (opponent.active) {
          if (targetIsP1) opponent.clearTint();
          else opponent.setTint(0x00ffff); // restore blue tint
        }
      });

      // Knockback physics
      const knockDir = sourceChar.flipX ? -1 : 1;
      let kbVel = hasKnockback ? 320 : 140;
      let kbVelY = -120;

      if (hitType === 'launch_combo') {
        kbVel = 150;
        kbVelY = -380;
      } else if (hitType === 'heavy_combo') {
        kbVel = 480;
      }

      opponent.setVelocity(knockDir * kbVel, kbVelY);
      this.spawnDust(opponent.x, opponent.y);

      this.time.delayedCall(400, () => {
        if (opponent.active) {
          if (targetIsP1) this.isHit = false;
          else this.p2IsHit = false;
          opponent.setVelocityX(0);
        }
      });
    }
  }

  // --- Ultimate & Energy Mechanics ---

  gainEnergy(isP1, amount) {
    if (isP1) {
      this.playerEnergy = Math.min(100, this.playerEnergy + amount);
      this.updateHUDValues();
      if (this.playerEnergy >= 100 && !this.playerFlashingUlt) {
        this.triggerUltFlashing(true);
      }
    } else {
      this.p2Energy = Math.min(100, this.p2Energy + amount);
      this.updateHUDValues();
      if (this.p2Energy >= 100 && !this.p2FlashingUlt) {
        this.triggerUltFlashing(false);
      }
    }
  }

  triggerUltFlashing(isP1) {
    const char = isP1 ? this.player : this.p2;
    if (!char) return;

    if (isP1) this.playerFlashingUlt = true;
    else this.p2FlashingUlt = true;

    // Golden flashing color interpolation
    const tween = this.tweens.addCounter({
      from: 0,
      to: 100,
      duration: 400,
      yoyo: true,
      repeat: -1,
      onUpdate: (tw) => {
        if (!char.active) {
          tween.remove();
          return;
        }
        const pct = tw.getValue();
        const startColor = isP1 ? 0xffffff : 0x00ffff;
        const colorVal = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.ValueToColor(startColor),
          Phaser.Display.Color.ValueToColor(0xffd700), // Gold
          100,
          pct
        );
        char.setTint(Phaser.Display.Color.GetColor(colorVal.r, colorVal.g, colorVal.b));
      }
    });

    if (isP1) this.playerFlashTween = tween;
    else this.p2FlashTween = tween;
  }

  fireUltimate(isP1) {
    // Reset status
    if (isP1) {
      this.playerEnergy = 0;
      this.playerFlashingUlt = false;
      if (this.playerFlashTween) {
        this.playerFlashTween.remove();
        this.player.clearTint();
      }
    } else {
      this.p2Energy = 0;
      this.p2FlashingUlt = false;
      if (this.p2FlashTween) {
        this.p2FlashTween.remove();
        this.p2.setTint(0x00ffff);
      }
    }
    this.updateHUDValues();

    const char = isP1 ? this.player : this.p2;
    const dir = char.flipX ? -1 : 1;

    // Spawn floating announcement
    this.spawnFloatingText(char.x, char.y - 95, 'NEON KI BLAST! 🌀⚡', isP1 ? '#f59e0b' : '#06b6d4');

    // Create glowing projectile texture dynamically
    if (!this.textures.exists('hadouken')) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x00ffff, 1.0);
      g.fillCircle(12, 12, 12);
      g.fillStyle(0xffffff, 0.85);
      g.fillCircle(12, 12, 6);
      g.generateTexture('hadouken', 24, 24);
    }

    const proj = this.physics.add.sprite(char.x + dir * 45, char.y - 35, 'hadouken');
    proj.setDepth(DEPTH.EFFECTS);
    proj.body.allowGravity = false;
    proj.setVelocityX(dir * 650);
    proj.setTint(isP1 ? 0xffbb00 : 0x00ffff);

    // Pulse size tween
    this.tweens.add({
      targets: proj,
      scaleX: 1.6,
      scaleY: 1.6,
      duration: 150,
      yoyo: true,
      repeat: -1
    });

    // Add overlap trigger (pierces enemies)
    const targets = this.isPvP ? (isP1 ? this.p2 : this.player) : this.enemies;
    
    this.physics.add.overlap(proj, targets, (p, target) => {
      if (this.isPvP) {
        const targetIsP1 = target === this.player;
        if (targetIsP1 ? this.isHit : this.p2IsHit) return;

        // Damage PvP Player
        if (targetIsP1) {
          this.hearts = Math.max(0, this.hearts - 1.5); // 50 HP = 1.5 hearts
          this.isHit = true;
          this.player.play('player_hit', true);
        } else {
          this.p2Hearts = Math.max(0, this.p2Hearts - 1.5);
          this.p2IsHit = true;
          this.p2.play('enemy_hit', true);
        }
        this.updateHUDHearts();

        this.cameras.main.shake(200, 0.02);
        this.spawnFloatingText(target.x, target.y - 75, '-50 HP ⚡', '#f43f5e');
        this.spawnSparks(target.x, target.y - 32, 0xffd700);

        target.setTint(0xff3333);
        this.time.delayedCall(200, () => {
          if (target.active) {
            if (targetIsP1) target.clearTint();
            else target.setTint(0x00ffff);
          }
        });

        // Massive launch knockback
        const kbDir = p.body.velocity.x > 0 ? 1 : -1;
        target.setVelocity(kbDir * 450, -220);

        this.time.delayedCall(400, () => {
          if (target.active) {
            if (targetIsP1) this.isHit = false;
            else this.p2IsHit = false;
            target.setVelocityX(0);
          }
        });
      } else {
        // Damage AI
        if (target.isDead) return;
        this.damageAIEnemy(target, 50, true, 'hadouken');
      }
    }, null, this);

    // Destroy out of bounds
    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        if (proj.active && (proj.x < 0 || proj.x > this.physics.world.bounds.width)) {
          proj.destroy();
        }
      }
    });
  }

  // --- Visuals & VFX Sparks/Dust ---

  applyHitStop() {
    this.physics.pause();
    this.player.anims.pause();
    if (this.p2) this.p2.anims.pause();
    this.enemies.getChildren().forEach(e => e.anims.pause());

    this.time.delayedCall(60, () => {
      this.physics.resume();
      if (this.player.active) this.player.anims.resume();
      if (this.p2 && this.p2.active) this.p2.anims.resume();
      this.enemies.getChildren().forEach(e => {
        if (e.active) e.anims.resume();
      });
    });
  }

  spawnSparks(x, y, color) {
    const graphics = this.add.graphics({ x: x, y: y });
    graphics.setDepth(DEPTH.EFFECTS);
    graphics.lineStyle(3, color, 1.0);

    // Draw Cross
    graphics.beginPath();
    graphics.moveTo(-16, 0);
    graphics.lineTo(16, 0);
    graphics.moveTo(0, -16);
    graphics.lineTo(0, 16);
    graphics.strokePath();

    // Draw X
    graphics.beginPath();
    graphics.moveTo(-11, -11);
    graphics.lineTo(11, 11);
    graphics.moveTo(11, -11);
    graphics.lineTo(-11, 11);
    graphics.strokePath();

    this.tweens.add({
      targets: graphics,
      scaleX: 2.2,
      scaleY: 2.2,
      alpha: 0,
      angle: 45,
      duration: 250,
      onComplete: () => graphics.destroy()
    });
  }

  spawnDust(x, y) {
    const dust = this.add.text(x, y, '💨', { font: '16px Arial' }).setOrigin(0.5, 1);
    dust.setDepth(DEPTH.EFFECTS);

    this.tweens.add({
      targets: dust,
      y: y - 30,
      x: x + Phaser.Math.Between(-20, 20),
      scaleX: 1.7,
      scaleY: 1.7,
      alpha: 0,
      duration: 450,
      ease: 'Cubic.easeOut',
      onComplete: () => dust.destroy()
    });
  }

  spawnFloatingText(x, y, textString, color) {
    const text = this.add.text(x, y, textString, {
      font: 'bold 13px Courier',
      fill: color,
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);
    text.setDepth(DEPTH.EFFECTS);
    
    this.tweens.add({
      targets: text,
      y: y - 50,
      alpha: 0,
      duration: 1000,
      onComplete: () => text.destroy()
    });
  }

  spawnFloatingItem(x, y, iconStr, color) {
    const itemText = this.add.text(x, y, iconStr, { font: '24px Arial' }).setOrigin(0.5);
    itemText.setDepth(DEPTH.EFFECTS);
    
    this.tweens.add({
      targets: itemText,
      y: y - 40,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => itemText.destroy()
    });
  }

  // --- Hazard Mechanics: Barrels & Electric Mesh ---

  hitBarrel(barrel, source, damage) {
    if (barrel.isPrimed) return;
    barrel.isPrimed = true;

    this.spawnFloatingText(barrel.x, barrel.y - 48, 'DANGER! ⚠️', '#ef4444');

    // Rapidly flash red/white for 1 second
    let isRed = false;
    const flashTimer = this.time.addEvent({
      delay: 80,
      loop: true,
      callback: () => {
        if (!barrel.active) {
          flashTimer.destroy();
          return;
        }
        barrel.setTint(isRed ? 0xffffff : 0xff3333);
        isRed = !isRed;
      }
    });

    this.time.delayedCall(1000, () => {
      flashTimer.destroy();
      if (barrel.active) {
        this.explodeBarrel(barrel);
      }
    });
  }

  explodeBarrel(barrel) {
    const x = barrel.x;
    const y = barrel.y - 16;
    barrel.destroy();

    // Screen Shake
    this.cameras.main.shake(200, 0.025);

    // Boom Text
    this.spawnFloatingText(x, y - 40, 'BOOM! 💥', '#f97316');

    // Visual Explosion blast circle
    const blastCircle = this.add.graphics({ x: x, y: y });
    blastCircle.setDepth(DEPTH.EFFECTS);
    blastCircle.fillStyle(0xffaa00, 0.65);
    blastCircle.fillCircle(0, 0, 100);
    blastCircle.lineStyle(4, 0xff0000, 1.0);
    blastCircle.strokeCircle(0, 0, 100);

    this.tweens.add({
      targets: blastCircle,
      scaleX: 1.6,
      scaleY: 1.6,
      alpha: 0,
      duration: 350,
      onComplete: () => blastCircle.destroy()
    });

    // Check AoE Explosion damage (radius: 120 pixels)
    const blastRadius = 120;

    // Check Player 1
    if (this.player && this.player.active) {
      const dist = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y - 32);
      if (dist <= blastRadius) {
        this.hearts = Math.max(0, this.hearts - 1.0); // 1.0 heart damage
        this.updateHUDHearts();
        this.isHit = true;
        this.player.play('player_hit', true);
        const dir = this.player.x < x ? -1 : 1;
        this.player.setVelocity(dir * 420, -220);
        this.time.delayedCall(400, () => { this.isHit = false; });
        this.spawnFloatingText(this.player.x, this.player.y - 75, '-1.0 生命 🩸', '#ef4444');
      }
    }

    // Check Player 2
    if (this.isPvP && this.p2 && this.p2.active) {
      const dist = Phaser.Math.Distance.Between(x, y, this.p2.x, this.p2.y - 32);
      if (dist <= blastRadius) {
        this.p2Hearts = Math.max(0, this.p2Hearts - 1.0);
        this.updateHUDHearts();
        this.p2IsHit = true;
        this.p2.play('enemy_hit', true);
        const dir = this.p2.x < x ? -1 : 1;
        this.p2.setVelocity(dir * 420, -220);
        this.time.delayedCall(400, () => { this.p2IsHit = false; });
        this.spawnFloatingText(this.p2.x, this.p2.y - 75, '-1.0 生命 🩸', '#ef4444');
      }
    }

    // Check AI Enemies
    if (!this.isPvP) {
      this.enemies.getChildren().forEach(e => {
        if (e.isDead) return;
        const dist = Phaser.Math.Distance.Between(x, y, e.x, e.y - 32);
        if (dist <= blastRadius) {
          e.health -= 40;
          this.spawnFloatingText(e.x, e.y - 64, '-40 HP 💥', '#fbbf24');
          if (e.health <= 0) {
            this.killEnemy(e);
          } else {
            e.play('enemy_hit', true);
            e.isHitState = true;
            const dir = e.x < x ? -1 : 1;
            e.setVelocity(dir * 380, -200);
            this.time.delayedCall(400, () => { e.isHitState = false; });
          }
        }
      });
    }

    // 50% chance to drop health pack
    if (Phaser.Math.Between(1, 2) === 1) {
      const pack = this.healthPacks.create(x, y + 16, 'health_pack');
      pack.setOrigin(0.5, 1);
      pack.body.allowGravity = true;
      pack.body.setCollideWorldBounds(true);
      pack.play('pack_pulse');
      
      this.tweens.add({
        targets: pack,
        scaleX: 1.25,
        scaleY: 1.25,
        duration: 400,
        yoyo: true,
        repeat: -1
      });
    }
  }

  collectHealth(player, pack) {
    pack.destroy();
    this.hearts = Math.min(3.0, this.hearts + 1.0);
    this.updateHUDHearts();
    this.spawnFloatingText(player.x, player.y - 64, '+1 护盾 💚', '#10b981');
  }

  collectHealthP2(p2, pack) {
    pack.destroy();
    this.p2Hearts = Math.min(3.0, this.p2Hearts + 1.0);
    this.updateHUDHearts();
    this.spawnFloatingText(p2.x, p2.y - 64, '+1 护盾 💚', '#10b981');
  }

  checkElectricShock(char, isP1, isAI = false) {
    if (!char || !char.active) return;
    if (isAI && char.isDead) return;

    const time = this.time.now;
    if (char.electricCooldown && time < char.electricCooldown) return;

    // Electric boundaries (margins 64px and 1216px)
    if (char.x < 72 || char.x > 1208) {
      char.electricCooldown = time + 2000; // 2s cooldown to prevent lock stuns

      const isLeft = char.x < 72;
      const pushDir = isLeft ? 1 : -1;

      this.spawnFloatingText(char.x, char.y - 75, '⚡ SHOCKED ⚡', '#06b6d4');

      // Stun duration set
      if (isAI) {
        char.isHitState = true;
        this.time.delayedCall(1000, () => {
          if (char.active && !char.isDead) char.isHitState = false;
        });
      } else {
        if (isP1) {
          this.playerStunnedUntil = time + 1000;
        } else {
          this.p2StunnedUntil = time + 1000;
        }
      }

      // Damage and Hit animation
      if (isAI) {
        char.health -= 15;
        this.spawnFloatingText(char.x, char.y - 60, '-15 HP ⚡', '#fbbf24');
        if (char.health <= 0) {
          this.killEnemy(char);
          return;
        } else {
          char.play('enemy_hit', true);
        }
      } else {
        if (isP1) {
          this.hearts = Math.max(0, this.hearts - 0.34); // ~10 damage
          this.isHit = true;
          char.play('player_hit', true);
          this.time.delayedCall(400, () => { this.isHit = false; });
        } else {
          this.p2Hearts = Math.max(0, this.p2Hearts - 0.34);
          this.p2IsHit = true;
          char.play('enemy_hit', true);
          this.time.delayedCall(400, () => { this.p2IsHit = false; });
        }
        this.updateHUDHearts();
      }

      // Physics Shock knockback
      char.setVelocity(pushDir * 320, -180);
      this.cameras.main.shake(100, 0.01);

      // Flickering cyan/yellow stun effect
      let isYellow = false;
      const stunFlash = this.time.addEvent({
        delay: 80,
        loop: true,
        callback: () => {
          if (!char.active) { stunFlash.destroy(); return; }
          char.setTint(isYellow ? 0x00ffff : 0xffff00);
          isYellow = !isYellow;
        }
      });

      this.time.delayedCall(600, () => {
        stunFlash.destroy();
        if (char.active) {
          if (isAI && char.isDead) return;
          if (!isAI && !isP1) char.setTint(0x00ffff); // blue for P2
          else char.clearTint();
        }
      });
    }
  }

  renderElectricWalls() {
    this.electricGraphics.clear();
    const time = this.time.now;

    const drawLine = (x) => {
      this.electricGraphics.lineStyle(3, 0x00ffff, 0.65 + Math.sin(time / 45) * 0.25);
      this.electricGraphics.beginPath();
      this.electricGraphics.moveTo(x, 0);

      const segments = 24;
      const segH = 576 / segments;
      for (let i = 1; i <= segments; i++) {
        const py = i * segH;
        const px = x + (Math.sin(time / 20 + i) * 6); // wave wiggle
        this.electricGraphics.lineTo(px, py);
      }
      this.electricGraphics.strokePath();

      // Spark graphics along boundary
      if (Phaser.Math.Between(1, 12) === 1) {
        const sparkY = Phaser.Math.Between(20, 550);
        const sparkG = this.add.graphics({ x: x, y: sparkY });
        sparkG.setDepth(DEPTH.EFFECTS);
        sparkG.lineStyle(2, 0xffffff, 1.0);
        sparkG.strokeCircle(0, 0, 5);
        this.tweens.add({
          targets: sparkG,
          scaleX: 2.2,
          scaleY: 2.2,
          alpha: 0,
          duration: 160,
          onComplete: () => sparkG.destroy()
        });
      }
    };

    drawLine(64);
    drawLine(1216);
  }

  // --- Wave Spawning & AI enemy logic ---

  handleAISpawning() {
    if (this.enemies.countActive() === 0) {
      if (this.enemiesSpawned < this.maxWaveEnemies) {
        this.enemiesSpawned++;
        this.spawnEnemy(false);
      } else if (!this.bossSpawned) {
        this.bossSpawned = true;
        this.spawnEnemy(true);
        window.GameHUD?.setObjective("警告：暗影首领降临！全力击败它！");
      }
    }
  }

  spawnEnemy(isBoss) {
    const spawnX = isBoss
      ? (this.player.x < 640 ? Phaser.Math.Between(950, 1150) : Phaser.Math.Between(80, 280))
      : Phaser.Math.Between(850, 1100);
    const enemy = this.enemies.create(spawnX, 480, 'enemy_stickman');
    enemy.setOrigin(0.5, 1);
    enemy.setCollideWorldBounds(true);
    enemy.body.setSize(32, 70);
    enemy.body.setOffset(32, 26);
    enemy.play('enemy_idle');

    // Attributes
    enemy.health = isBoss ? 150 : 50;
    enemy.maxHealth = enemy.health;
    enemy.isBoss = isBoss;
    enemy.isDead = false;
    enemy.isHitState = false;
    enemy.isAttacking = false;
    enemy.nextAttackTime = 0;

    // Scale boss
    if (isBoss) {
      enemy.setDisplaySize(130, 130);
      enemy.body.setSize(44, 95);
      enemy.body.setOffset(26, 15);
      enemy.setTint(0x7c3aed); // Purple boss tint
    } else {
      enemy.setDisplaySize(96, 96);
    }

    // Health bar graphics
    enemy.healthBarGraphics = this.add.graphics();
    enemy.healthBarGraphics.setDepth(DEPTH.EFFECTS);
    this.updateEnemyHealthBar(enemy);
  }

  updateEnemyHealthBar(enemy) {
    if (enemy.isDead) return;
    
    enemy.healthBarGraphics.clear();
    
    const barW = enemy.isBoss ? 80 : 50;
    const barH = 6;
    const barX = enemy.x - barW / 2;
    const barY = enemy.y - (enemy.isBoss ? 135 : 100);

    // Draw background (Black)
    enemy.healthBarGraphics.fillStyle(0x000000, 0.7);
    enemy.healthBarGraphics.fillRect(barX, barY, barW, barH);

    // Draw health (Red/Purple)
    const hpPct = Math.max(0, enemy.health / enemy.maxHealth);
    const fillW = barW * hpPct;
    const color = enemy.isBoss ? 0xa78bfa : 0xef4444;
    enemy.healthBarGraphics.fillStyle(color, 1.0);
    enemy.healthBarGraphics.fillRect(barX, barY, fillW, barH);
  }

  handleAIBehavior() {
    this.enemies.getChildren().forEach(e => {
      if (e.isDead || e.isHitState) return;

      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
      const isPlayerFacingLeft = this.player.x < e.x;

      e.setFlipX(isPlayerFacingLeft);

      if (e.isAttacking) return;

      const attackRange = e.isBoss ? 85 : 65;

      if (dist <= attackRange) {
        e.setVelocityX(0);
        const time = this.time.now;
        if (time > e.nextAttackTime) {
          e.isAttacking = true;
          const isKick = Phaser.Math.Between(0, 1) === 1;
          e.play(isKick ? 'enemy_kick' : 'enemy_punch', true);

          this.time.delayedCall(isKick ? 250 : 200, () => {
            if (e.isDead) return;
            const currentDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
            if (currentDist <= attackRange) {
              this.damagePlayerFromAI(isKick ? 20 : 10);
            }
          });

          e.once('animationcomplete', () => {
            e.isAttacking = false;
            e.nextAttackTime = this.time.now + Phaser.Math.Between(1000, 2000);
          });
        } else {
          e.play('enemy_idle', true);
        }
      } else {
        const speed = e.isBoss ? 110 : 80;
        const dir = this.player.x < e.x ? -1 : 1;
        e.setVelocityX(dir * speed);
        e.play('enemy_walk', true);
      }
    });
  }

  damagePlayerFromAI(damage) {
    if (this.isHit || this.victoryShown || this.defeatShown || this.hearts <= 0) return;

    const isBlocking = (this.keyS.isDown || this.cursors.down.isDown) && this.player.body.onFloor();
    if (isBlocking) {
      // 80% reduced damage on block, P1 gains energy
      const blockedDamage = Math.round(damage * 0.2);
      this.hearts = Math.max(0, this.hearts - blockedDamage / 100);
      this.gainEnergy(true, 15);
      
      this.updateHUDHearts();
      this.spawnFloatingText(this.player.x, this.player.y - 75, '防御 🛡️', '#38bdf8');
      this.spawnFloatingItem(this.player.x + (this.player.flipX ? -15 : 15), this.player.y - 30, '✨', '#38bdf8');
    } else {
      // Full damage
      this.hearts = Math.max(0, this.hearts - damage / 100);
      this.updateHUDHearts();
      this.cameras.main.shake(150, 0.015);
      this.spawnFloatingText(this.player.x, this.player.y - 75, `-${damage} HP 🩸`, '#ef4444');

      this.isHit = true;
      this.player.play('player_hit', true);
      this.player.setVelocityX(this.player.flipX ? 100 : -100);
      
      this.player.setTint(0xff3333);
      this.time.delayedCall(200, () => this.player.clearTint());

      this.time.delayedCall(400, () => {
        this.isHit = false;
        this.player.setVelocityX(0);
      });
    }
  }

  killEnemy(enemy) {
    enemy.isDead = true;
    enemy.body.enable = false;
    enemy.healthBarGraphics.clear();
    enemy.play('enemy_fall', true);
    
    this.score++;
    this.enemiesDefeated++;
    this.updateHUDValues();

    this.spawnFloatingText(enemy.x, enemy.y - 64, 'K.O. 💀', '#ef4444');

    if (enemy.isBoss) {
      this.bossDefeated = true;
    }

    this.time.delayedCall(1500, () => {
      this.tweens.add({
        targets: enemy,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          enemy.healthBarGraphics.destroy();
          enemy.destroy();
        }
      });
    });
  }

  // --- Game Over ---

  triggerGameOver(isWin, endingText) {
    if (this.isPvP) {
      this.physics.pause();
      this.player.setVelocity(0, 0);
      this.player.anims.stop();
      if (this.p2) {
        this.p2.setVelocity(0, 0);
        this.p2.anims.stop();
      }

      if (this.hearts <= 0) {
        this.player.play('player_fall', true);
      }
      if (this.p2Hearts <= 0 && this.p2) {
        this.p2.play('enemy_fall', true);
      }

      window.GameHUD?.showGameOver(isWin, endingText);
      this.gameStarted = false;
      return;
    }

    if (isWin) {
      this.victoryShown = true;
    } else {
      this.defeatShown = true;
    }

    this.physics.pause();
    this.player.setVelocity(0, 0);
    this.player.anims.stop();

    if (!isWin) {
      this.player.play('player_fall', true);
    }

    window.GameHUD?.showGameOver(isWin, endingText);
    this.gameStarted = false;
  }
}

const config = {
  type: Phaser.AUTO,
  width: 960,
  height: 576,
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1000 },
      debug: false
    }
  },
  scene: MainScene
};

new Phaser.Game(config);

