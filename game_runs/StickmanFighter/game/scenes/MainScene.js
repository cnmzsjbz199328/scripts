/* StickmanFighter — 核心场景 (启动/预载/创建/主循环/玩家输入/结算)
 * 由 game-logic.js 单体机械拆分而来；方法体逐字保留，PvP 已移除。 */
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

    // Dash/Dodge systems
    this.playerLastDashLeft = 0;
    this.playerLastDashRight = 0;
    this.playerDashUntil = 0;
    this.playerDodgeUntil = 0;
    this.playerDodgeInvulUntil = 0;
    this.playerDashCooldownUntil = 0;
    this.playerWasDashing = false;
    this.playerWasDodging = false;

    this.p2LastDashLeft = 0;
    this.p2LastDashRight = 0;
    this.p2DashUntil = 0;
    this.p2DodgeUntil = 0;
    this.p2DodgeInvulUntil = 0;
    this.p2DashCooldownUntil = 0;
    this.p2WasDashing = false;
    this.p2WasDodging = false;

    // Wakeup invulnerability systems
    this.playerWakeupUntil = 0;
    this.p2WakeupUntil = 0;
    this.playerWakeupEvent = null;
    this.p2WakeupEvent = null;
    this.playerWakeupCleanup = null;
    this.p2WakeupCleanup = null;

    // Grab key window tracking (80ms window for simultaneous J+K / I+O)
    this.keyJLastDown = 0;
    this.keyKLastDown = 0;
    this.p2KeyILastDown = 0;
    this.p2KeyOLastDown = 0;

    // PvP best of 3 systems
    this.pvpRound = 1;
    this.p1Wins = 0;
    this.p2Wins = 0;
    this.pvpRoundActive = true;

    // AI Spawning params
    this.maxWaveEnemies = 3;
    this.enemiesSpawned = 0;
    this.bossSpawned = false;

    // Visual Hazards: Electric Wall Graphics & Flicker
    this.electricGraphics = this.add.graphics();
    this.electricGraphics.setDepth(DEPTH.DECOR_TOP);

    // GameHUD Integration —— 单机闯关（PvP 已移除，忽略入参强制 story）
    window.GameHUD?.onStart(() => {
      this.isPvP = false;
      this.showFightBanner([
        '🔥 火柴人：终极决斗',
        '黑白线条与霓虹交织的几何次元，',
        '阴影核心派出了无尽的暗影克隆体。',
        '小红，挺起脊梁——击败3名暗影战士与首领，',
        '让几何次元重见光明！'
      ], 3500, () => { this.gameStarted = true; });

      // Configure visual layouts and custom HUD elements
      this.setupHUD();

      // Story Mode starting values
      window.GameHUD?.setHearts(Math.ceil(this.hearts), 3);
      window.GameHUD?.setScore(this.score);
      window.GameHUD?.setObjective("击败暗影战士！ A/D: 移动 | W: 跳跃 | S: 防守 | J: 出拳 | K: 回旋踢 | Space: 必杀");
    });

    if (!window.GameHUD) {
      this.gameStarted = true;
    }

    // ── game-playtest 探针（横版格斗：逼近最近敌人/Boss 出拳 J）──
    window.__probe = () => {
      const pl = this.player;
      if (!pl || !pl.body) return null;
      const live = this.enemies.getChildren().filter(e => e.active && !e.isDead);
      let best = null, bd = 1e9;
      for (const e of live) { const d = Math.abs(e.x - pl.x); if (d < bd) { bd = d; best = e; } }
      const goalX = best ? best.x : pl.x;
      const inRange = best && bd < 80 && Math.abs(best.y - pl.y) < 70;
      // 俯视模式上报（moveX 仅左右逼近，moveY=0）→ playtest 用 score 而非 x 位移判卡死，
      // 避免"原地对打不前进"被误判；score=击杀数随击败递增。
      const mx = best ? Math.sign(goalX - pl.x) : 0;   // 始终朝敌人，保持朝向，出拳才命中
      return {
        x: pl.x, y: pl.y, vx: pl.body.velocity.x, onGround: pl.body.onFloor(),
        hp: Math.ceil(this.hearts), maxHp: 3, score: this.enemiesDefeated || 0, goalScore: 999,
        act: 1, deaths: 0, deathBudget: 1,
        won: !!this.bossDefeated, lost: this.hearts <= 0,
        cardActive: false, started: this.gameStarted,
        nextGoalX: goalX, worldW: 960, cellX: 960,
        moveX: mx, moveY: 0, attack: !!inRange,
        dangerNow: false, dangerAhead: false,
      };
    };

    window.__scene = this;   // 测试/调试钩子：playtest 可直接读写场景状态
  }

  update() {
    if (!this.gameStarted) return;

    if (this.isPvP) {
      // Local PvP Win/Lose checks
      if (this.pvpRoundActive) {
        if (this.hearts <= 0 || this.p2Hearts <= 0) {
          this.handlePvPRoundEnd();
          return;
        }
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
        this.triggerGameOver(false,
          '💀 战败……\n\n' +
          '暗影兵团的人海战术终究压垮了小红——\n' +
          '几何次元陷入了彻底的黑暗。\n\n' +
          '但这不是终点。每一次倒下，\n都是下一次站起来的力量。'
        );
        return;
      }

      if (this.bossDefeated) {
        this.triggerGameOver(true,
          '🔥 传奇！K.O！\n\n' +
          '小红以最后一口气，将暗影首领击落！\n' +
          '阴影核心轰然崩塌，黑白次元重现色彩。\n\n' +
          '被囚禁的斗士们重获自由，\n几何次元的街头，回响着他们的欢呼声。\n\n' +
          '没有人知道小红会在下一次的战场中出现——\n但凡有黑暗之处，就有他的身影。'
        );
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
    if (this.isPvP && !this.pvpRoundActive) return;
    if (this.isHit || this.hearts <= 0 || this.time.now < this.playerStunnedUntil) return;

    // Check Dash/Dodge Active duration
    if (this.time.now < this.playerDashUntil) {
      this.player.setVelocityX(480);
      return;
    }
    if (this.time.now < this.playerDodgeUntil) {
      this.player.setVelocityX(-380);
      return;
    }
    if (this.playerWasDashing) {
      this.player.setVelocityX(0);
      this.playerWasDashing = false;
    }
    if (this.playerWasDodging) {
      this.player.setVelocityX(0);
      this.playerWasDodging = false;
    }

    // Grab Detection: 80ms window — both J and K must be held within 80ms of each other.
    // NOTE: JustDown() is a consuming read (it resets the key's _justDown flag), so we
    // capture it once here and reuse the result for the attack input below. Calling
    // JustDown again in the same frame would always return false and break punch/kick.
    const jJustDown = Phaser.Input.Keyboard.JustDown(this.keyJ);
    const kJustDown = Phaser.Input.Keyboard.JustDown(this.keyK);
    if (jJustDown) this.keyJLastDown = this.time.now;
    if (kJustDown) this.keyKLastDown = this.time.now;
    const isGrabP1 = this.keyJ.isDown && this.keyK.isDown &&
      (this.time.now - this.keyJLastDown) < 80 &&
      (this.time.now - this.keyKLastDown) < 80;
    if (isGrabP1) {
      if (this.player.body.onFloor() && !this.isAttacking) {
        this.executeGrab(this.player, true);
      }
      return;
    }

    // Double tap dash/dodge detection
    if (Phaser.Input.Keyboard.JustDown(this.keyD) || Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
      const now = this.time.now;
      if (now - this.playerLastDashRight < 200 && now > this.playerDashCooldownUntil) {
        this.playerDashUntil = now + 180;
        this.playerWasDashing = true;
        this.playerDashCooldownUntil = now + 500;
        this.player.setVelocityX(480);
        this.spawnDust(this.player.x, this.player.y);
        return;
      }
      this.playerLastDashRight = now;
    }
    if (Phaser.Input.Keyboard.JustDown(this.keyA) || Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
      const now = this.time.now;
      if (now - this.playerLastDashLeft < 200 && now > this.playerDashCooldownUntil) {
        this.playerDodgeUntil = now + 180;
        this.playerWasDodging = true;
        this.playerDodgeInvulUntil = now + 100;
        this.playerDashCooldownUntil = now + 500;
        this.player.setVelocityX(-380);
        this.spawnDust(this.player.x, this.player.y);
        return;
      }
      this.playerLastDashLeft = now;
    }

    let vx = 0;
    const speed = GAME_CONFIG.player.speed;
    const isBlocking = (this.keyS.isDown || this.cursors.down.isDown) && this.player.body.onFloor();

    // Opening a guard arms a brief perfect-parry window
    if (Phaser.Input.Keyboard.JustDown(this.keyS) || Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
      this.playerParryUntil = this.time.now + 160;
    }

    // 1. Capture Combo Input queue
    const time = this.time.now;
    let attackInput = null;

    if (jJustDown) {
      attackInput = 'J';
    } else if (kJustDown) {
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

      // Execute basic attack: isAttacking guard always applies; blocking only blocks on ground
      const inAir = !this.player.body.onFloor();
      if (!this.isAttacking && (inAir || !isBlocking)) {
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
