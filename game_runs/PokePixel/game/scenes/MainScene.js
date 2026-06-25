/* PokePixel — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
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

    // 2. Load Trainer Spritesheet
    this.load.spritesheet('trainer_sheet', 'assets/sprites/Trainer.webp', {
      frameWidth: 192,
      frameHeight: 208
    });

    // 3. Load Chest Spritesheet
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

    // Render layers dynamically
    GAME_CONFIG.layers.forEach(layerConfig => {
      this.renderTileLayer(layerConfig.name, layerConfig);
    });

    // Set up Trainer animations
    this.anims.create({
      key: 'trainer_walk_down',
      frames: this.anims.generateFrameNumbers('trainer_sheet', { start: 0, end: 8 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'trainer_walk_up',
      frames: this.anims.generateFrameNumbers('trainer_sheet', { start: 9, end: 17 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'trainer_walk_left',
      frames: this.anims.generateFrameNumbers('trainer_sheet', { start: 18, end: 26 }),
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

    // Create Player (Trainer)
    const playerData = ENTITIES_DATA.find(e => e.name === 'Trainer') || { x: 200, y: 200 };
    this.player = this.physics.add.sprite(playerData.x, playerData.y, 'trainer_sheet');
    this.player.setDisplaySize(96, 104);
    this.player.setCollideWorldBounds(true);
    // Adjust bounding box to feet to look correct in Y-sort
    this.player.body.setSize(50, 40);
    this.player.body.setOffset(71, 130);
    this.player.setDepth(DEPTH.YSORT + this.player.y);

    // Create NPC Trainers
    this.trainersGroup = this.physics.add.staticGroup();
    this.trainersList = [];
    const npcDataList = ENTITIES_DATA.filter(e => e.type === 'character' && e.name !== 'Trainer');
    npcDataList.forEach(npc => {
      const npcSprite = this.trainersGroup.create(npc.x, npc.y, 'trainer_sheet', 0);
      npcSprite.setDisplaySize(96, 104);
      npcSprite.name = npc.name;
      npcSprite.body.setSize(48, 40);
      npcSprite.body.setOffset(71, 130);
      npcSprite.refreshBody();
      
      // Apply tint to distinguish trainers
      if (npc.tint) {
        npcSprite.setTint(parseInt(npc.tint));
      }
      npcSprite.setDepth(DEPTH.YSORT + npc.y);
      this.ysortGroup.add(npcSprite);
      
      // Defeated flag
      npcSprite.setData('defeated', false);
      this.trainersList.push(npcSprite);
    });

    // Create locked gate at col 22, row 14 (Snowy Mountain to Gym entrance)
    this.gymGateUnlocked = false;
    this.gymGate = this.add.sprite(22 * 64 + 32, 14 * 64 + 32, 'tile_gym_wall');
    this.gymGate.setDisplaySize(64, 64);
    this.gymGate.setTint(0xff6666); // Tint red initially
    this.gymGate.setDepth(DEPTH.YSORT + 14 * 64 + 32);
    this.physics.add.existing(this.gymGate, true);
    this.ysortGroup.add(this.gymGate);

    // Create Healing泉 (Healing Station) at col 5, row 2 (Grassland)
    this.healingStation = this.add.sprite(5 * 64 + 32, 2 * 64 + 32, 'tile_gym_floor');
    this.healingStation.setDisplaySize(64, 64);
    this.healingStation.setTint(0x4ade80); // Bright green tint
    this.healingStation.setDepth(DEPTH.GROUND + 1);
    this.physics.add.existing(this.healingStation, true);
    
    this.healingLabel = this.add.text(5 * 64 + 32, 2 * 64 - 10, '💖 治疗泉 HEAL', {
      font: 'bold 11px monospace',
      fill: '#4ade80',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(DEPTH.EFFECTS);

    // Create Shop Merchant NPC at col 3, row 6 (Grassland)
    this.shopMerchant = this.physics.add.staticSprite(3 * 64 + 32, 6 * 64 + 32, 'trainer_sheet', 0);
    this.shopMerchant.setDisplaySize(96, 104);
    this.shopMerchant.setTint(0x60a5fa); // blue merchant tint
    this.shopMerchant.body.setSize(48, 40);
    this.shopMerchant.body.setOffset(71, 130);
    this.shopMerchant.refreshBody();
    this.shopMerchant.setDepth(DEPTH.YSORT + 6 * 64 + 32);
    this.ysortGroup.add(this.shopMerchant);

    this.shopLabel = this.add.text(3 * 64 + 32, 6 * 64 - 10, '🛒 商人 SHOP', {
      font: 'bold 11px monospace',
      fill: '#60a5fa',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(DEPTH.EFFECTS);

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
    this.physics.add.collider(this.player, this.trainersGroup);
    this.physics.add.collider(this.player, this.chestsGroup);
    this.physics.add.collider(this.player, this.shopMerchant);
    this.gymGateCollider = this.physics.add.collider(this.player, this.gymGate);

    // Inputs (WASD + Arrow Keys)
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    this.keyShift = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT); // Run
    this._lastDust = 0;

    // Camera follow bounds — mapW/mapH are tile counts, so convert to pixels.
    // (Previously passed tile counts, making the world a 30×30px box that pinned
    // the player in the corner via collideWorldBounds and blocked all movement.)
    this.physics.world.setBounds(0, 0, mapW * this.tileW, mapH * this.tileH);
    this.cameras.main.setBounds(0, 0, mapW * this.tileW, mapH * this.tileH);
    this.cameras.main.startFollow(this.player, true, 0.05, 0.05);

    // Proximity Interaction Prompt
    this.interactPrompt = this.add.text(0, 0, '', {
      font: 'bold 12px monospace',
      fill: '#ffffff',
      backgroundColor: '#1e293b',
      padding: { x: 8, y: 6 },
      border: '1px solid #3b82f6',
      borderRadius: '4px'
    }).setOrigin(0.5).setDepth(DEPTH.EFFECTS).setVisible(false);

    // Player State
    this.monstersTeam = []; // Up to 6 active monsters
    this.monsterStorage = []; // Extra caught monsters
    this.inventory = {
      balls: 10,
      potions: 5
    };
    this.gold = 150;
    this.gymLeaderDefeated = false;
    this.playerDefeated = false;
    this.lastTile = { col: -1, row: -1 };

    // Active NPC proximity tracker
    this.activeInteractable = null;
    this.activeInteractType = ''; // 'npc', 'chest', 'shop', 'healing', 'gym_gate'

    // Combat State
    this.inBattle = false;
    this.battleState = null;

    // Mini-HUD Phaser text objects (shown during exploration)
    this.goldText = this.add.text(8, 8, '', {
      font: 'bold 12px monospace', fill: '#fbbf24', stroke: '#000', strokeThickness: 3
    }).setScrollFactor(0).setDepth(DEPTH.EFFECTS);

    this.clockText = this.add.text(8, 26, '', {
      font: '11px monospace', fill: '#a5f3fc', stroke: '#000', strokeThickness: 2
    }).setScrollFactor(0).setDepth(DEPTH.EFFECTS);

    this.questText = this.add.text(8, 42, '', {
      font: '11px monospace', fill: '#86efac', stroke: '#000', strokeThickness: 2
    }).setScrollFactor(0).setDepth(DEPTH.EFFECTS);

    // Inject UI Overlays (Starter select, Battle overlay, Shop overlay, Monster swap list)
    this.injectHTMLOverlays();

    // Event hooks
    this.gameStarted = false;
    window.GameHUD?.onStart(() => {
      // Trigger Starter Selection Screen
      this.showStarterSelect();
    });

    if (!window.GameHUD) {
      this.showStarterSelect();
    }
  }


  update(time, delta) {
    if (!this.gameStarted || this.inBattle) {
      this.player.setVelocity(0);
      return;
    }

    this.player.setVelocity(0);

    // Keyboard 'C': Open monsters list team manager
    if (Phaser.Input.Keyboard.JustDown(this.keyC)) {
      this.openMonstersMenu();
    }

    // Keyboard 'E': Interact with active object/NPC
    if (Phaser.Input.Keyboard.JustDown(this.keyE) && this.activeInteractable) {
      this.triggerInteraction();
      return;
    }

    // Movement checks
    let vx = 0;
    let vy = 0;
    const isRunning = this.keyShift.isDown;
    const speed = (GAME_CONFIG.player?.speed || 180) * (isRunning ? 1.7 : 1);
    let moved = false;

    if (this.cursors.left.isDown || this.keyA.isDown) {
      vx = -speed;
      this.facingDir = 'left';
      moved = true;
    } else if (this.cursors.right.isDown || this.keyD.isDown) {
      vx = speed;
      this.facingDir = 'right';
      moved = true;
    }

    if (this.cursors.up.isDown || this.keyW.isDown) {
      vy = -speed;
      this.facingDir = 'up';
      moved = true;
    } else if (this.cursors.down.isDown || this.keyS.isDown) {
      vy = speed;
      this.facingDir = 'down';
      moved = true;
    }

    if (moved) {
      if (vx !== 0 && vy !== 0) {
        vx *= 0.7071;
        vy *= 0.7071;
      }
      this.player.setVelocity(vx, vy);

      // Play walk animations
      if (this.facingDir === 'down') {
        if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== 'trainer_walk_down') {
          this.player.play('trainer_walk_down');
        }
      } else if (this.facingDir === 'up') {
        if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== 'trainer_walk_up') {
          this.player.play('trainer_walk_up');
        }
      } else if (this.facingDir === 'left') {
        if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== 'trainer_walk_left') {
          this.player.play('trainer_walk_left');
        }
        this.player.setFlipX(true);
      } else if (this.facingDir === 'right') {
        if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== 'trainer_walk_left') {
          this.player.play('trainer_walk_left');
        }
        this.player.setFlipX(false);
      }

      // Running kicks up dust behind the trainer (throttled)
      if (isRunning && time > this._lastDust + 90) {
        this._lastDust = time;
        this.spawnBurst(this.player.x, this.player.y + 36, 0xd6c39a, 3, 22);
      }

      // Check for tile step transition (random encounters)
      this.checkStepEncounters();
    } else {
      this.setPlayerIdleFrame();
      // Breathing scale effect
      this.player.displayHeight = 104 + Math.sin(time * 0.005) * 1.5;
    }

    // Dynamic Depth Sorting
    this.player.setDepth(DEPTH.YSORT + this.player.y);
    this.ysortGroup.getChildren().forEach(sprite => {
      sprite.setDepth(DEPTH.YSORT + sprite.y);
    });

    // Check proximity to interactive items
    this.updateProximityPrompts();
  }
}
