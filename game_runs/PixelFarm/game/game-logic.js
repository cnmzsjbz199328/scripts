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

        // Keep reference for dynamic tilling/watering:
        if (layerName === 'ground') {
          this.tileSprites[r * width + c] = tileSprite;
        }
      }
    }
  }

  createHUD() {
    this.hudContainer = this.add.container(0, 0).setScrollFactor(0);
    this.hudContainer.setDepth(DEPTH.EFFECTS);

    // Gold Counter
    this.goldText = this.add.text(780, 20, `Gold: $${this.gold}`, {
      font: 'bold 16px monospace',
      fill: '#fbbf24',
      backgroundColor: '#1e293b',
      padding: { x: 10, y: 6 }
    }).setOrigin(1, 0);
    this.hudContainer.add(this.goldText);

    // Time Clock
    this.clockText = this.add.text(20, 20, '', {
      font: 'bold 16px monospace',
      fill: '#f8fafc',
      backgroundColor: '#1e293b',
      padding: { x: 10, y: 6 }
    });
    this.hudContainer.add(this.clockText);

    // Active Quest Objective HUD
    this.questText = this.add.text(20, 70, 'Quest: Open grandfather\'s left chest', {
      font: 'bold 14px monospace',
      fill: '#60a5fa',
      backgroundColor: '#1e293b',
      padding: { x: 10, y: 6 }
    });
    this.hudContainer.add(this.questText);

    // Hotbar (6 slots)
    const hotbarY = 530;
    const slotSize = 54;
    const spacing = 8;
    this.hotbarStartX = 400 - ((slotSize * 6 + spacing * 5) / 2);

    this.hotbarBorders = [];
    this.hotbarIcons = [];
    this.hotbarCounts = [];

    for (let i = 0; i < 6; i++) {
      const x = this.hotbarStartX + i * (slotSize + spacing);
      
      // Slot background
      const bg = this.add.graphics();
      bg.fillStyle(0x1e293b, 0.85);
      bg.fillRect(x, hotbarY, slotSize, slotSize);
      this.hudContainer.add(bg);

      // Slot border reference
      const border = this.add.graphics();
      this.drawSlotBorder(border, x, hotbarY, slotSize, i === 0);
      this.hudContainer.add(border);
      this.hotbarBorders.push(border);

      // Slot label number
      this.hudContainer.add(
        this.add.text(x + 5, hotbarY + 5, `${i + 1}`, { font: '9px monospace', fill: '#94a3b8' })
      );

      // Item icon
      const item = this.inventory[i + 1];
      const iconText = this.add.text(x + 27, hotbarY + 27, item?.icon || '', { font: '24px Arial', fill: '#f8fafc' }).setOrigin(0.5);
      this.hudContainer.add(iconText);
      this.hotbarIcons.push(iconText);

      // Item count
      const countText = this.add.text(x + 48, hotbarY + 48, (item?.count > 0) ? `x${item.count}` : '', { font: 'bold 10px monospace', fill: '#10b981' }).setOrigin(1, 1);
      this.hudContainer.add(countText);
      this.hotbarCounts.push(countText);
    }
  }

  drawSlotBorder(graphics, x, y, size, isActive) {
    graphics.clear();
    graphics.lineStyle(isActive ? 3 : 1, isActive ? 0xfbbd23 : 0x475569, 1);
    graphics.strokeRect(x, y, size, size);
  }

  updateHotbarUI() {
    const slotSize = 54;
    const spacing = 8;
    for (let i = 0; i < 6; i++) {
      const x = this.hotbarStartX + i * (slotSize + spacing);
      const border = this.hotbarBorders[i];
      const item = this.inventory[i + 1];

      // Draw border highlight
      this.drawSlotBorder(border, x, 530, slotSize, (this.activeSlot === i + 1));

      // Update icon & count
      this.hotbarIcons[i].setText(item?.icon || '');
      this.hotbarCounts[i].setText((item?.count > 0) ? `x${item.count}` : '');
    }
  }

  setPlayerIdleFrame() {
    this.player.anims.stop();
    if (this.facingDir === 'down') {
      this.player.setFrame(0);
    } else if (this.facingDir === 'up') {
      this.player.setFrame(9);
    } else if (this.facingDir === 'left') {
      this.player.setFrame(18);
      this.player.setFlipX(true);   // row 2 visually faces right; flip to face left
    } else if (this.facingDir === 'right') {
      this.player.setFrame(18);
      this.player.setFlipX(false);  // row 2 visually faces right; no flip needed
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
    const speed = GAME_CONFIG.player?.speed || 160;

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
        if (this.player.anims.currentAnim?.key !== 'farmer_walk_down') {
          this.player.play('farmer_walk_down');
        }
      } else if (this.facingDir === 'up') {
        if (this.player.anims.currentAnim?.key !== 'farmer_walk_up') {
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

  getFacingTile() {
    const mapW = TILEMAP_DATA.width;
    const mapH = TILEMAP_DATA.height;
    // +20 approximates the player's feet offset from sprite center
    const playerCol = Math.floor(this.player.x / this.tileW);
    const playerRow = Math.floor((this.player.y + 20) / this.tileH);
    let col = playerCol;
    let row = playerRow;
    if (this.facingDir === 'down') row++;
    else if (this.facingDir === 'up') row--;
    else if (this.facingDir === 'left') col--;
    else if (this.facingDir === 'right') col++;
    col = Phaser.Math.Clamp(col, 0, mapW - 1);
    row = Phaser.Math.Clamp(row, 0, mapH - 1);
    return { col, row, mapW, mapH };
  }

  useActiveItem() {
    const { col, row, mapW, mapH } = this.getFacingTile();
    const targetX = col * this.tileW + this.tileW / 2;
    const targetY = row * this.tileH + this.tileH / 2;

    if (col >= 0 && col < mapW && row >= 0 && row < mapH) {
      const index = row * mapW + col;
      const groundId = TILEMAP_DATA.layers.ground[index];
      const activeTool = this.inventory[this.activeSlot];

      // 1. Hoe Tool (Slot 1): Till Grass OR Harvest Ripe Crops
      if (this.activeSlot === 1) {
        const activeCrop = this.crops[index];
        if (activeCrop && activeCrop.stage === 'ripe') {
          activeCrop.sprite.destroy();
          const isGolden = activeCrop.isGolden;
          delete this.crops[index];
          this.tileSprites[index].clearTint(); // restore wet soil tint
          
          if (isGolden) {
            this.harvestedGolden = true;
            this.spawnFloatingText(targetX, targetY, 'Harvested Golden Flower! 🏆', '#fbbf24');
            this.showVictoryScreen();
          } else {
            // Add tomato to inventory Slot 5
            this.inventory[5].count++;
            this.inventory[5].icon = '🍅';
            this.updateHotbarUI();
            this.harvestCount++;
            this.spawnFloatingText(targetX, targetY, 'Harvested Tomato 🍅', '#10b981');
          }
        } else if (groundId === 1 || groundId === 5) {
          // Till soil (groundId 1 is grass_base, 5 is grass_dry)
          TILEMAP_DATA.layers.ground[index] = 2; // tilled soil ID
          this.tileSprites[index].setTexture('tile_dirt_tilled');
          this.tilledCount++;
          this.spawnFloatingText(targetX, targetY, 'Tilled!', '#fbbf24');
        }
      }
      
      // 2. Tomato Seeds (Slot 2): Plant sprout on tilled soil
      else if (this.activeSlot === 2 && activeTool.count > 0) {
        if (groundId === 2 && !this.crops[index]) {
          const sproutSprite = this.add.text(targetX, targetY - 10, '🌱', { font: '24px Arial' }).setOrigin(0.5);
          sproutSprite.setDepth(DEPTH.YSORT + targetY);
          this.ysortGroup.add(sproutSprite);
          this.crops[index] = {
            stage: 'sprout',
            watered: false,
            growthTimer: 0,
            sprite: sproutSprite,
            isGolden: false
          };
          
          activeTool.count--;
          if (activeTool.count === 0) activeTool.icon = ''; // remove icon
          this.updateHotbarUI();
          this.plantedCount++;
          this.spawnFloatingText(targetX, targetY, 'Planted 🌱', '#10b981');
        }
      }

      // 3. Watering Can (Slot 3): Water seed (darken soil tint)
      else if (this.activeSlot === 3 && activeTool.count > 0) {
        const crop = this.crops[index];
        if (crop && !crop.watered) {
          crop.watered = true;
          this.tileSprites[index].setTint(0x7c7c7c); // Darken soil to wet
          this.wateredCount++;
          this.spawnFloatingText(targetX, targetY, 'Watered 💧', '#60a5fa');
        }
      }

      // 6. Golden Seed (Slot 6): Plant Golden Seed on tilled soil
      else if (this.activeSlot === 6 && activeTool.count > 0) {
        if (groundId === 2 && !this.crops[index]) {
          const sproutSprite = this.add.text(targetX, targetY - 10, '🌟', { font: '24px Arial' }).setOrigin(0.5);
          sproutSprite.setDepth(DEPTH.YSORT + targetY);
          this.ysortGroup.add(sproutSprite);
          this.crops[index] = {
            stage: 'sprout',
            watered: false,
            growthTimer: 0,
            sprite: sproutSprite,
            isGolden: true
          };

          activeTool.count--;
          if (activeTool.count === 0) activeTool.icon = '';
          this.updateHotbarUI();
          this.spawnFloatingText(targetX, targetY, 'Planted Golden Seed! 🌟', '#fbbf24');
        }
      }
    }
  }

  updateTileHighlight() {
    this.tileHighlight.clear();
    this.tileHint.setVisible(false);

    if (this.isAttacking || this.isSleeping) return;

    const { col, row, mapW, mapH } = this.getFacingTile();
    if (col < 0 || col >= mapW || row < 0 || row >= mapH) return;

    const index = row * mapW + col;
    const groundId = TILEMAP_DATA.layers.ground[index];
    const activeTool = this.inventory[this.activeSlot];
    const crop = this.crops[index];

    const px = col * this.tileW;
    const py = row * this.tileH;

    let borderColor = 0x94a3b8;
    let fillColor = 0x94a3b8;
    let fillAlpha = 0.0;
    let actionText = '';

    if (this.activeSlot === 1) {
      if (crop && crop.stage === 'ripe') {
        borderColor = 0xfbbf24; fillColor = 0xfbbf24; fillAlpha = 0.3;
        actionText = crop.isGolden ? 'Z: 收获黄金花 🌻' : 'Z: 收获番茄 🍅';
      } else if (groundId === 1 || groundId === 5) {
        borderColor = 0x10b981; fillColor = 0x10b981; fillAlpha = 0.25;
        actionText = 'Z: 耕地 ⛏';
      } else if (groundId === 2 && !crop) {
        borderColor = 0x94a3b8; fillColor = 0x94a3b8; fillAlpha = 0.12;
        actionText = '已耕地';
      } else if (groundId === 2 && crop) {
        borderColor = 0x94a3b8; fillColor = 0x94a3b8; fillAlpha = 0.1;
        if (crop.stage === 'sprout') {
          actionText = crop.watered ? '🌱 生长中...' : '🌱 需要浇水';
        }
      }
    } else if (this.activeSlot === 2) {
      if (activeTool.count <= 0) {
        borderColor = 0xef4444; fillAlpha = 0.0; actionText = '种子不足';
      } else if (groundId === 2 && !crop) {
        borderColor = 0x10b981; fillColor = 0x10b981; fillAlpha = 0.25;
        actionText = 'Z: 种植番茄 🌱';
      } else if (groundId !== 2) {
        borderColor = 0xef4444; fillAlpha = 0.0; actionText = '需先耕地';
      } else {
        borderColor = 0x94a3b8; fillAlpha = 0.1; actionText = '已占用';
      }
    } else if (this.activeSlot === 3) {
      if (activeTool.count <= 0) {
        borderColor = 0xef4444; fillAlpha = 0.0; actionText = '无水';
      } else if (crop && !crop.watered && crop.stage !== 'ripe') {
        borderColor = 0x60a5fa; fillColor = 0x60a5fa; fillAlpha = 0.3;
        actionText = 'Z: 浇水 💧';
      } else if (crop && crop.watered) {
        borderColor = 0x60a5fa; fillColor = 0x60a5fa; fillAlpha = 0.1;
        actionText = '💧 已浇水';
      } else {
        borderColor = 0x94a3b8; fillAlpha = 0.0; actionText = '无作物';
      }
    } else if (this.activeSlot === 6) {
      if (activeTool.count <= 0) {
        borderColor = 0xef4444; fillAlpha = 0.0; actionText = '无黄金种子';
      } else if (groundId === 2 && !crop) {
        borderColor = 0xfbbf24; fillColor = 0xfbbf24; fillAlpha = 0.3;
        actionText = 'Z: 种植黄金种子 🌟';
      } else if (groundId !== 2) {
        borderColor = 0xef4444; fillAlpha = 0.0; actionText = '需先耕地';
      }
    }

    // Draw tile border
    this.tileHighlight.lineStyle(2, borderColor, 0.9);
    this.tileHighlight.strokeRect(px + 2, py + 2, this.tileW - 4, this.tileH - 4);
    if (fillAlpha > 0) {
      this.tileHighlight.fillStyle(fillColor, fillAlpha);
      this.tileHighlight.fillRect(px + 2, py + 2, this.tileW - 4, this.tileH - 4);
    }

    if (actionText) {
      this.tileHint.setPosition(px + this.tileW / 2, py - 2);
      this.tileHint.setText(actionText);
      this.tileHint.setVisible(true);
    }
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
      y: y - 35,
      alpha: 0,
      duration: 1200,
      onComplete: () => text.destroy()
    });
  }

  spawnFloatingItem(x, y, iconStr, color) {
    const itemText = this.add.text(x, y, iconStr, { font: '24px Arial' }).setOrigin(0.5);
    itemText.setDepth(DEPTH.YSORT + y);
    
    this.tweens.add({
      targets: itemText,
      y: y - 60,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 1500,
      ease: 'Cubic.easeOut',
      onComplete: () => itemText.destroy()
    });
  }

  openChest(chest) {
    chest.setData('opened', true);
    chest.play('chest_open');
    this.interactPrompt.setVisible(false);

    // Yield items based on chest position
    const isLeftChest = chest.x < 500;
    if (isLeftChest) {
      this.hasRustyKey = true;
      this.inventory[2] = { name: 'Tomato Seeds', icon: '🌱', count: 5 };
      this.inventory[4] = { name: 'Wood Logs', icon: '🪵', count: 3 };
      
      this.spawnFloatingItem(chest.x - 24, chest.y - 10, '🔑', '#fbbf24');
      this.spawnFloatingItem(chest.x, chest.y - 10, '🌱', '#10b981');
      this.spawnFloatingItem(chest.x + 24, chest.y - 10, '🪵', '#b45309');
      this.spawnFloatingText(chest.x, chest.y - 36, 'Obtained Key, Seeds & Logs!', '#fbbf24');
    } else {
      this.inventory[3] = { name: 'Watering Can', icon: '💧', count: 1 };
      this.inventory[2].count += 5;
      this.inventory[2].icon = '🌱';
      
      this.spawnFloatingItem(chest.x - 12, chest.y - 10, '💧', '#60a5fa');
      this.spawnFloatingItem(chest.x + 12, chest.y - 10, '🌱', '#10b981');
      this.spawnFloatingText(chest.x, chest.y - 36, 'Obtained Toolkit!', '#60a5fa');
    }
    
    this.updateHotbarUI();
  }

  handleInteractions() {
    let closestInteractable = null;
    let closestDist = 80;
    let interactType = '';

    // 1. Check chests
    for (const chest of this.chestsList) {
      if (chest.getData('opened')) continue;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, chest.x, chest.y);
      if (dist < closestDist) {
        closestDist = dist;
        closestInteractable = chest;
        interactType = 'chest';
      }
    }

    // 2. Check locked wooden gate at column 8
    if (!this.gateUnlocked && this.lockedGate) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.lockedGate.x, this.lockedGate.y);
      if (dist < 64) {
        closestDist = dist;
        closestInteractable = this.lockedGate;
        interactType = 'gate';
      }
    }

    // 3. Check bonfire
    if (this.bonfireObj && !this.bonfireLit) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.bonfireObj.x, this.bonfireObj.y);
      if (dist < closestDist) {
        closestDist = dist;
        closestInteractable = this.bonfireObj;
        interactType = 'bonfire';
      }
    }

    // 4. Check shipping bin
    if (this.shippingBin) {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.shippingBin.x, this.shippingBin.y);
      if (dist < closestDist) {
        closestDist = dist;
        closestInteractable = this.shippingBin;
        interactType = 'shipping';
      }
    }

    this.activeInteractable = closestInteractable;
    this.activeInteractType = interactType;

    if (closestInteractable) {
      this.interactPrompt.setPosition(closestInteractable.x, closestInteractable.y - 48);
      this.interactPrompt.setVisible(true);

      if (interactType === 'chest') {
        this.interactPrompt.setText('E: Open Chest 📦');
      } else if (interactType === 'gate') {
        if (this.hasRustyKey) {
          this.interactPrompt.setText('E: Unlock Gate 🔑');
        } else {
          this.interactPrompt.setText('Locked Wood Gate 🔒');
        }
      } else if (interactType === 'bonfire') {
        if (this.inventory[4].count >= 3) {
          this.interactPrompt.setText('E: Kindle Bonfire 🔥 (Uses 3 Logs)');
        } else {
          this.interactPrompt.setText('Cold Campfire (Needs 3 Logs 🪵)');
        }
      } else if (interactType === 'shipping') {
        const tomatoCount = this.inventory[5].count;
        if (tomatoCount > 0) {
          this.interactPrompt.setText(`E: Ship Tomatoes 🍅 (Have ${tomatoCount})`);
        } else if (this.tomatoesShipped >= 3 && !this.hasGoldenSeedClaimed) {
          this.interactPrompt.setText('E: Claim Golden Seed ⭐');
        } else {
          this.interactPrompt.setText('Shipping Bin 📦 (Ship 3 Tomatoes)');
        }
      }
    } else {
      this.interactPrompt.setVisible(false);
    }
  }

  triggerInteraction() {
    if (!this.activeInteractable) return;

    if (this.activeInteractType === 'chest') {
      this.openChest(this.activeInteractable);
    } 
    
    else if (this.activeInteractType === 'gate' && this.hasRustyKey) {
      this.gateUnlocked = true;
      this.lockedGate.destroy();
      this.gateCollider.destroy();
      this.spawnFloatingText(544, 416, 'Gate Unlocked! 🔑', '#fbbf24');
      this.activeInteractable = null;
      this.interactPrompt.setVisible(false);
    } 
    
    else if (this.activeInteractType === 'bonfire') {
      if (this.inventory[4].count >= 3) {
        this.inventory[4].count -= 3;
        if (this.inventory[4].count === 0) this.inventory[4].icon = '';
        this.updateHotbarUI();
        this.bonfireLit = true;
        this.bonfireObj.play('burn');
        this.spawnFloatingText(this.bonfireObj.x, this.bonfireObj.y, 'Bonfire Lit! 🔥', '#fbbf24');
        this.activeInteractable = null;
        this.interactPrompt.setVisible(false);
      } else {
        this.spawnFloatingText(this.player.x, this.player.y, 'Need 3 Wood Logs! 🪵', '#ef4444');
      }
    } 
    
    else if (this.activeInteractType === 'shipping') {
      const tomatoCount = this.inventory[5].count;
      if (tomatoCount > 0) {
        this.tomatoesShipped += tomatoCount;
        this.gold += tomatoCount * 150;
        this.goldText.setText(`Gold: $${this.gold}`);
        window.GameHUD?.setScore(this.gold);
        this.inventory[5].count = 0;
        this.inventory[5].icon = '';
        this.updateHotbarUI();
        this.spawnFloatingText(this.shippingBin.x, this.shippingBin.y, `Shipped! +$${tomatoCount * 150} 💰`, '#fbbf24');
        
        if (this.tomatoesShipped >= 3 && !this.hasGoldenSeedClaimed) {
          this.spawnFloatingText(this.shippingBin.x, this.shippingBin.y - 24, 'Compartment Unlocked! ⭐', '#fbbf24');
        }
      } else if (this.tomatoesShipped >= 3 && !this.hasGoldenSeedClaimed) {
        this.hasGoldenSeedClaimed = true;
        this.inventory[6] = { name: 'Golden Seed', icon: '⭐', count: 1 };
        this.updateHotbarUI();
        this.spawnFloatingText(this.shippingBin.x, this.shippingBin.y, 'Obtained Golden Seed! ⭐', '#fbbf24');
      }
    }
  }

  goToSleep() {
    if (this.isSleeping) return;
    this.isSleeping = true;
    this.player.play('farmer_sleep');

    // Display overnight camera transition
    this.cameras.main.fadeOut(800, 11, 15, 25);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      // Complete crop growth overnight for watered crops
      for (const index in this.crops) {
        const crop = this.crops[index];
        if (crop.watered) {
          crop.stage = 'ripe';
          if (crop.isGolden) {
            crop.sprite.setText('🌻');
            // pulse animation
            this.tweens.add({
              targets: crop.sprite,
              scaleX: 1.3,
              scaleY: 1.3,
              duration: 500,
              yoyo: true,
              repeat: -1
            });
          } else {
            crop.sprite.setText('🍅');
          }
          crop.watered = false;
          this.tileSprites[index].clearTint(); // Soil dries out
        }
      }

      // Reset time to 6:00 AM next day
      this.dayCount++;
      this.timeOfDay = 360; 

      this.cameras.main.fadeIn(800, 11, 15, 25);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, () => {
        this.spawnFloatingText(this.player.x, this.player.y - 32, `Day ${this.dayCount} Morning!`, '#fbbf24');
        this.isSleeping = false;
        this.setPlayerIdleFrame();
      });
    });
  }

  updateCropsGrowth(delta) {
    for (const index in this.crops) {
      const crop = this.crops[index];
      if (crop.stage === 'sprout' && crop.watered) {
        let growthSpeed = 1;
        if (this.bonfireLit) {
          // Bonfire is at 600, 400. Warmth speeds up growth if nearby
          const col = index % TILEMAP_DATA.width;
          const row = Math.floor(index / TILEMAP_DATA.width);
          const cx = col * this.tileW + this.tileW / 2;
          const cy = row * this.tileH + this.tileH / 2;
          const distToFire = Phaser.Math.Distance.Between(cx, cy, 600, 400);
          if (distToFire < 200) {
            growthSpeed = 2.5; // Warmth speeds up growth
          }
        }
        
        crop.growthTimer += delta * growthSpeed;
        
        const targetTime = crop.isGolden ? 12000 : 8000;
        if (crop.growthTimer >= targetTime) {
          crop.stage = 'ripe';
          if (crop.isGolden) {
            crop.sprite.setText('🌻');
            this.tweens.add({
              targets: crop.sprite,
              scaleX: 1.3,
              scaleY: 1.3,
              duration: 500,
              yoyo: true,
              repeat: -1
            });
            const col = index % TILEMAP_DATA.width;
            const row = Math.floor(index / TILEMAP_DATA.width);
            const x = col * this.tileW + this.tileW / 2;
            const y = row * this.tileH + this.tileH / 2;
            this.spawnFloatingText(x, y, 'Golden Flower Ripe! ✨🌻✨', '#fbbf24');
          } else {
            crop.sprite.setText('🍅');
            const col = index % TILEMAP_DATA.width;
            const row = Math.floor(index / TILEMAP_DATA.width);
            const x = col * this.tileW + this.tileW / 2;
            const y = row * this.tileH + this.tileH / 2;
            this.spawnFloatingText(x, y, 'Ripe 🍅!', '#f87171');
          }
        }
      }
    }
  }

  updateQuestsHUD() {
    let currentObjective = '';
    if (!this.hasRustyKey && !this.gateUnlocked) {
      currentObjective = `打开祖父留下的左侧宝箱 📦 (${this.hasRustyKey ? 1 : 0}/1)`;
    } else if (!this.gateUnlocked) {
      currentObjective = '使用钥匙解锁大门 🔑';
    } else if (!this.bonfireLit) {
      currentObjective = '用3块木头点燃寒冷的篝火 🔥';
    } else if (this.tilledCount < 3) {
      currentObjective = `在东侧开垦3块土地 (${this.tilledCount}/3) ⛏`;
    } else if (this.harvestCount < 3) {
      const hasWateringCan = this.inventory[3].count > 0;
      if (!hasWateringCan) {
        currentObjective = '打开右侧宝箱获取洒水壶 💧';
      } else {
        currentObjective = `种植并收获3个番茄 🍅 (${this.harvestCount}/3)`;
      }
    } else if (this.tomatoesShipped < 3) {
      currentObjective = `在出货箱出售3个番茄 📦 (${this.tomatoesShipped}/3)`;
    } else if (!this.harvestedGolden) {
      const hasGoldenSeed = this.inventory[6].count > 0;
      if (hasGoldenSeed) {
        currentObjective = '种植并浇灌黄金种子！🌟';
      } else {
        currentObjective = '从出货箱领取黄金种子 ⭐';
      }
    } else {
      currentObjective = '黄金花朵绽放！农场重现荣光！🏆';
    }

    if (this.questText.text !== currentObjective) {
      this.questText.setText(currentObjective);
      window.GameHUD?.setObjective(currentObjective);
    }
  }

  updateDayNight(delta) {
    this.timeOfDay += (delta / 500);

    if (this.timeOfDay >= 1440) {
      this.timeOfDay = 0;
      this.dayCount++;
    }

    const hours = Math.floor(this.timeOfDay / 60);
    const minutes = Math.floor(this.timeOfDay % 60);
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
    
    this.clockText.setText(`Day ${this.dayCount} - ${displayHours}:${displayMinutes} ${ampm}`);

    this.dayNightOverlay.clear();

    let color = 0x000000;
    let alpha = 0.0;

    if (hours >= 20 || hours < 5) {
      color = 0x1e1b4b;
      alpha = 0.45;
    } else if (hours === 5) {
      color = 0xf59e0b;
      alpha = 0.3 * (1 - minutes / 60);
    } else if (hours >= 17 && hours < 20) {
      color = 0x701a75;
      const sunsetProg = (hours - 17) * 60 + minutes;
      alpha = 0.45 * (sunsetProg / 180);
    }

    if (alpha > 0) {
      this.dayNightOverlay.fillStyle(color, alpha);
      this.dayNightOverlay.fillRect(0, 0, 800, 600);
    }
  }

  showVictoryScreen() {
    if (this.victoryShown) return;
    this.victoryShown = true;

    this.physics.pause();
    this.player.setVelocity(0, 0);
    this.player.anims.stop();

    // GameHUD Integration
    window.GameHUD?.showGameOver(true, '你培育出了黄金花朵，恢复了祖父农场的荣光！✨🌻✨');
    this.gameStarted = false;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x0f172a, 0.9);
    overlay.fillRect(0, 0, 800, 600);
    overlay.setScrollFactor(0);
    overlay.setDepth(DEPTH.EFFECTS);

    const title = this.add.text(400, 200, 'LEGACY RESTORED! 🏆', {
      font: 'bold 36px monospace',
      fill: '#fbbf24',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.EFFECTS + 1);

    const subtitle = this.add.text(400, 285, "You grew the Golden Flower and saved Grandfather's Farm!", {
      font: '16px monospace',
      fill: '#f8fafc'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.EFFECTS + 1);

    const statsText = `Tomatoes Shipped: ${this.tomatoesShipped}\nTotal Days Elapsed: ${this.dayCount}\nGold Earned: $${this.gold}`;
    const stats = this.add.text(400, 360, statsText, {
      font: '14px monospace',
      fill: '#94a3b8',
      align: 'center',
      lineSpacing: 8
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.EFFECTS + 1);

    const restartText = this.add.text(400, 460, 'Press R to Restart Game', {
      font: 'bold 16px monospace',
      fill: '#60a5fa'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.EFFECTS + 1);

    this.tweens.add({
      targets: title,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
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
