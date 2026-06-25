/* PixelFarm — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
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

    // 2. Load Farmer Spritesheet
    this.load.spritesheet('farmer_sheet', 'assets/sprites/Farmer.webp', {
      frameWidth: 192,
      frameHeight: 208
    });

    // 3. Load Bonfire Spritesheet
    this.load.spritesheet('bonfire_sheet', 'assets/objects/bonfire.webp', {
      frameWidth: 128,
      frameHeight: 128
    });

    // 4. Load Chest Spritesheet
    this.load.spritesheet('chest_sheet', 'assets/objects/chest.webp', {
      frameWidth: 128,
      frameHeight: 128
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
    this.obstaclesGroup = this.physics.add.staticGroup();

    // Map 2D array to track tile sprites on screen for dynamic tilling
    this.tileSprites = [];

    // Render layers dynamically
    GAME_CONFIG.layers.forEach(layerConfig => {
      this.renderTileLayer(layerConfig.name, layerConfig);
    });

    // Set up column 8 fences to block the map vertically
    for (let r = 1; r < mapH; r++) {
      if (r === 6) continue; // Row 6 is where the Locked Gate will be placed
      const fx = 544; // Column 8 center
      const fy = r * 64 + 32;
      const fenceBlock = this.add.sprite(fx, fy, 'tile_fence_base');
      fenceBlock.setDisplaySize(64, 64);
      fenceBlock.setDepth(DEPTH.YSORT + fy);
      this.physics.add.existing(fenceBlock, true);
      this.obstaclesGroup.add(fenceBlock);
      this.ysortGroup.add(fenceBlock);
    }

    // Set up Farmer animations
    this.anims.create({
      key: 'farmer_walk_down',
      frames: this.anims.generateFrameNumbers('farmer_sheet', { start: 0, end: 8 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'farmer_walk_up',
      frames: this.anims.generateFrameNumbers('farmer_sheet', { start: 9, end: 17 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'farmer_walk_left',
      frames: this.anims.generateFrameNumbers('farmer_sheet', { start: 18, end: 26 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'farmer_tool_use',
      frames: this.anims.generateFrameNumbers('farmer_sheet', { start: 27, end: 35 }),
      frameRate: 10,
      repeat: 0
    });
    this.anims.create({
      key: 'farmer_sleep',
      frames: this.anims.generateFrameNumbers('farmer_sheet', { start: 36, end: 44 }),
      frameRate: 6,
      repeat: -1
    });

    // Bonfire animation
    this.anims.create({
      key: 'burn',
      frames: this.anims.generateFrameNumbers('bonfire_sheet', { start: 0, end: 5 }),
      frameRate: 8,
      repeat: -1
    });

    // Chest animations
    this.anims.create({
      key: 'chest_open',
      frames: this.anims.generateFrameNumbers('chest_sheet', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: 0
    });

    // Create Player (Farmer)
    const playerData = ENTITIES_DATA.find(e => e.sprite === 'Farmer') || { x: 150, y: 150 };
    this.player = this.physics.add.sprite(playerData.x, playerData.y, 'farmer_sheet');
    this.player.setDisplaySize(96, 104);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(50, 40);
    this.player.body.setOffset(71, 130);
    this.player.setDepth(DEPTH.YSORT + this.player.y);

    // Create Bonfire entity (unlit initially)
    const bonfireData = ENTITIES_DATA.find(e => e.sprite === 'bonfire');
    this.bonfireLit = false;
    if (bonfireData) {
      this.bonfireObj = this.add.sprite(bonfireData.x, bonfireData.y, 'bonfire_sheet');
      this.bonfireObj.setDisplaySize(96, 96);
      this.bonfireObj.setFrame(0); // static unlit wood pile
      this.bonfireObj.setDepth(DEPTH.YSORT + bonfireData.y);
      this.ysortGroup.add(this.bonfireObj);
    }

    // Create locked gate at x: 544, y: 416
    this.gateUnlocked = false;
    this.lockedGate = this.add.sprite(544, 416, 'tile_fence_base');
    this.lockedGate.setDisplaySize(64, 64);
    this.lockedGate.setTint(0xff8888); // Red tint to represent locked
    this.lockedGate.setDepth(DEPTH.YSORT + 416);
    this.physics.add.existing(this.lockedGate, true);
    this.ysortGroup.add(this.lockedGate);

    // Create Shipping Bin
    this.shippingBin = this.add.sprite(600, 300, 'chest_sheet', 0);
    this.shippingBin.setDisplaySize(64, 64);
    this.shippingBin.setTint(0x60a5fa); // Blue tint
    this.shippingBin.setDepth(DEPTH.YSORT + 300);
    this.physics.add.existing(this.shippingBin, true);
    this.ysortGroup.add(this.shippingBin);

    this.shippingLabel = this.add.text(600, 260, 'SHIPPING BIN', {
      font: 'bold 10px monospace',
      fill: '#60a5fa',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    this.shippingLabel.setDepth(DEPTH.EFFECTS);

    // Create Chest entities
    const chestDataList = ENTITIES_DATA.filter(e => e.sprite === 'chest');
    this.chestsGroup = this.physics.add.staticGroup();
    this.chestsList = [];
    chestDataList.forEach((chestData) => {
      const chestObj = this.chestsGroup.create(chestData.x, chestData.y, 'chest_sheet', 0);
      chestObj.setDisplaySize(64, 64);
      chestObj.setData('opened', false);
      chestObj.body.setSize(48, 40);
      chestObj.body.setOffset(40, 44);
      chestObj.refreshBody();
      chestObj.setDepth(DEPTH.YSORT + chestData.y);
      this.ysortGroup.add(chestObj);
      this.chestsList.push(chestObj);
    });

    // Colliders
    this.physics.add.collider(this.player, this.obstaclesGroup);
    this.physics.add.collider(this.player, this.chestsGroup);
    this.physics.add.collider(this.player, this.shippingBin);
    this.gateCollider = this.physics.add.collider(this.player, this.lockedGate);

    // Inputs (WASD + Arrow Keys + Digits for Hotbar Selection)
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    
    this.keyZ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.keyX = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    this.key1 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.key2 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    this.key3 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
    this.key4 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR);
    this.key5 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FIVE);
    this.key6 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SIX);
    this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.keyShift = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

    // Camera bounds
    this.physics.world.setBounds(0, 0, mapW * this.tileW, mapH * this.tileH);
    this.cameras.main.setBounds(0, 0, mapW * this.tileW, mapH * this.tileH);
    this.cameras.main.startFollow(this.player, true, 0.05, 0.05);

    // Interaction Prompt
    this.interactPrompt = this.add.text(0, 0, '', {
      font: '14px monospace',
      fill: '#ffffff',
      backgroundColor: '#1e293b',
      padding: { x: 6, y: 4 }
    });
    this.interactPrompt.setOrigin(0.5);
    this.interactPrompt.setDepth(DEPTH.EFFECTS);
    this.interactPrompt.setVisible(false);

    // Tile highlight — shows the tile the player will act on
    this.tileHighlight = this.add.graphics();
    this.tileHighlight.setDepth(DEPTH.DECOR_FLOOR + 50);

    this.tileHint = this.add.text(0, 0, '', {
      font: 'bold 11px monospace',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5, 1).setDepth(DEPTH.EFFECTS).setVisible(false);

    // Day/Night Cycle variables
    this.timeOfDay = 600; // starts at 10:00 AM (minutes)
    this.dayCount = 1;

    // Set up fullscreen Day/Night overlay graphic
    this.dayNightOverlay = this.add.graphics();
    this.dayNightOverlay.setScrollFactor(0);
    this.dayNightOverlay.setDepth(99);

    // Inventory State
    this.inventory = {
      1: { name: 'Hoe', icon: '⛏', count: 1 },
      2: { name: 'Tomato Seeds', icon: '', count: 0 },
      3: { name: 'Watering Can', icon: '', count: 0 },
      4: { name: 'Wood Logs', icon: '', count: 0 },
      5: { name: 'Tomatoes', icon: '', count: 0 },
      6: { name: 'Golden Seed', icon: '', count: 0 }
    };
    this.activeSlot = 1;

    // Story flags
    this.hasRustyKey = false;
    this.tomatoesShipped = 0;
    this.hasGoldenSeedClaimed = false;
    this.harvestedGolden = false;
    this.victoryShown = false;

    // Farming growth systems tracker
    this.crops = {};
    this.tilledCount = 0;
    this.plantedCount = 0;
    this.wateredCount = 0;
    this.harvestCount = 0;

    // State Variables
    this.isAttacking = false;
    this.isSleeping = false;
    this.facingDir = 'down';
    this.gold = 100; // Starting gold
    this.activeInteractable = null;
    this.activeInteractType = '';

    // HUD Display
    this.createHUD();

    this.setPlayerIdleFrame();

    // GameHUD Integration
    this.gameStarted = false;
    window.GameHUD?.onStart(() => {
      this.gameStarted = true;
      window.GameHUD?.setScore(this.gold);
      window.GameHUD?.setObjective("打开祖父留下的左侧宝箱 📦");
    });
    // Fallback if HUD script is not present
    if (!window.GameHUD) {
      this.gameStarted = true;
    }
  }


  update(time, delta) {
    // Restart logic
    if (this.victoryShown) {
      this.player.setVelocity(0);
      if (Phaser.Input.Keyboard.JustDown(this.keyR)) {
        this.victoryShown = false;
        this.scene.restart();
      }
      return;
    }

    if (!this.gameStarted) return;

    this.player.setVelocity(0);

    // Update Clock & Day/Night Overlay
    this.updateDayNight(delta);

    // Dynamic Questline Progression Updates
    this.updateQuestsHUD();

    // Interaction Check for all objects
    this.handleInteractions();

    // Tile highlight feedback for farming actions
    this.updateTileHighlight();

    // Grow planted crops
    this.updateCropsGrowth(delta);

    // Hotbar selection checking
    if (Phaser.Input.Keyboard.JustDown(this.key1)) { this.activeSlot = 1; this.updateHotbarUI(); }
    if (Phaser.Input.Keyboard.JustDown(this.key2)) { this.activeSlot = 2; this.updateHotbarUI(); }
    if (Phaser.Input.Keyboard.JustDown(this.key3)) { this.activeSlot = 3; this.updateHotbarUI(); }
    if (Phaser.Input.Keyboard.JustDown(this.key4)) { this.activeSlot = 4; this.updateHotbarUI(); }
    if (Phaser.Input.Keyboard.JustDown(this.key5)) { this.activeSlot = 5; this.updateHotbarUI(); }
    if (Phaser.Input.Keyboard.JustDown(this.key6)) { this.activeSlot = 6; this.updateHotbarUI(); }

    if (this.isAttacking || this.isSleeping) {
      return;
    }

    // Action Key (Z): Use Active Item
    if (Phaser.Input.Keyboard.JustDown(this.keyZ)) {
      this.isAttacking = true;
      this.player.play('farmer_tool_use');
      this.useActiveItem();
      this.player.once('animationcomplete', () => {
        this.isAttacking = false;
        this.setPlayerIdleFrame();
      });
      return;
    }

    // Sleeping Key (X) - Triggers fade transition & overnight growth
    if (Phaser.Input.Keyboard.JustDown(this.keyX)) {
      this.goToSleep();
      return;
    }

    // E Key: Interact with active object
    if (Phaser.Input.Keyboard.JustDown(this.keyE) && this.activeInteractable) {
      this.triggerInteraction();
      return;
    }

    // Movement checks
    let vx = 0;
    let vy = 0;
    const speed = (GAME_CONFIG.player?.speed || 160) * (this.keyShift.isDown ? 1.6 : 1);

    if (this.cursors.left.isDown || this.keyA.isDown) {
      vx = -speed;
      this.facingDir = 'left';
    } else if (this.cursors.right.isDown || this.keyD.isDown) {
      vx = speed;
      this.facingDir = 'right';
    }

    if (this.cursors.up.isDown || this.keyW.isDown) {
      vy = -speed;
      this.facingDir = 'up';
    } else if (this.cursors.down.isDown || this.keyS.isDown) {
      vy = speed;
      this.facingDir = 'down';
    }

    if (vx !== 0 || vy !== 0) {
      if (vx !== 0 && vy !== 0) {
        vx *= 0.7071;
        vy *= 0.7071;
      }
      this.player.setVelocity(vx, vy);

      // Play walk animation
      if (this.facingDir === 'down') {
        if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== 'farmer_walk_down') {
          this.player.play('farmer_walk_down');
        }
      } else if (this.facingDir === 'up') {
        if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== 'farmer_walk_up') {
          this.player.play('farmer_walk_up');
        }
      } else if (this.facingDir === 'left') {
        if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== 'farmer_walk_left') {
          this.player.play('farmer_walk_left');
        }
        this.player.setFlipX(true);   // walk-left row visually faces right; flip=true to face left
      } else if (this.facingDir === 'right') {
        if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== 'farmer_walk_left') {
          this.player.play('farmer_walk_left');
        }
        this.player.setFlipX(false);  // walk-left row visually faces right; flip=false to keep facing right
      }
      this.player.displayHeight = 104;
    } else {
      if (!this.isAttacking) {
        this.setPlayerIdleFrame();
        // Breathing scale wiggle
        this.player.displayHeight = 104 + Math.sin(time * 0.005) * 1.5;
      }
    }

    // Dynamic Y-sort depth refresh
    this.player.setDepth(DEPTH.YSORT + this.player.y);
    this.ysortGroup?.getChildren().forEach(s => {
      s.setDepth(DEPTH.YSORT + s.y);
    });
  }
}
