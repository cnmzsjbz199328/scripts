const DEPTH = {
  GROUND: 0,
  DECOR_FLOOR: 100,
  YSORT: 1000,
  DECOR_TOP: 9000,
  EFFECTS: 9500
};

// Monster Base Stats & Database
const MONSTER_DB = {
  "叶兔": {
    name: "叶兔 LeafHare",
    type: "Grass",
    maxHp: 45,
    attack: 12,
    defense: 10,
    speed: 15,
    icon: "🐰",
    color: "#22c55e",
    skills: [
      { name: "撞击 Tackle", type: "Normal", power: 40, effect: "damage" },
      { name: "藤鞭 Vine Whip", type: "Grass", power: 45, effect: "damage" },
      { name: "飞叶快刀 Razor Leaf", type: "Grass", power: 55, effect: "damage" },
      { name: "光合作用 Synthesis", type: "Grass", power: 0, effect: "heal", healAmount: 20 }
    ]
  },
  "炎狐": {
    name: "炎狐 FlameFox",
    type: "Fire",
    maxHp: 40,
    attack: 16,
    defense: 8,
    speed: 18,
    icon: "🦊",
    color: "#f97316",
    skills: [
      { name: "抓 Scratch", type: "Normal", power: 40, effect: "damage" },
      { name: "火花 Ember", type: "Fire", power: 45, effect: "damage" },
      { name: "火焰轮 Flame Wheel", type: "Fire", power: 60, effect: "damage" },
      { name: "嚎叫 Growl", type: "Normal", power: 0, effect: "debuff_atk" }
    ]
  },
  "水龟": {
    name: "水龟 AquaTurtle",
    type: "Water",
    maxHp: 50,
    attack: 10,
    defense: 14,
    speed: 10,
    icon: "🐢",
    color: "#3b82f6",
    skills: [
      { name: "撞击 Tackle", type: "Normal", power: 40, effect: "damage" },
      { name: "水枪 Water Gun", type: "Water", power: 45, effect: "damage" },
      { name: "水之波动 Water Pulse", type: "Water", power: 60, effect: "damage" },
      { name: "缩入壳中 Withdraw", type: "Water", power: 0, effect: "buff_def" }
    ]
  },
  "雷鼠": {
    name: "雷鼠 SparkMarmot",
    type: "Electric",
    maxHp: 48,
    attack: 15,
    defense: 9,
    speed: 22,
    icon: "⚡",
    color: "#eab308",
    skills: [
      { name: "电光一闪 Quick Attack", type: "Normal", power: 40, effect: "damage" },
      { name: "电击 Thunder Shock", type: "Electric", power: 45, effect: "damage" },
      { name: "火花电击 Spark", type: "Electric", power: 60, effect: "damage" },
      { name: "充电 Charge", type: "Electric", power: 0, effect: "buff_atk" }
    ]
  },
  "岩偶": {
    name: "岩偶 StoneGolem",
    type: "Rock",
    maxHp: 65,
    attack: 13,
    defense: 18,
    speed: 8,
    icon: "🗿",
    color: "#a1a1aa",
    skills: [
      { name: "撞击 Tackle", type: "Normal", power: 40, effect: "damage" },
      { name: "落石 Rock Throw", type: "Rock", power: 50, effect: "damage" },
      { name: "岩崩 Rock Slide", type: "Rock", power: 75, effect: "damage" },
      { name: "铁壁 Iron Defense", type: "Rock", power: 0, effect: "buff_def" }
    ]
  },
  "影蝠": {
    name: "影蝠 ShadowBat",
    type: "Ghost",
    maxHp: 42,
    attack: 14,
    defense: 9,
    speed: 20,
    icon: "🦇",
    color: "#a855f7",
    skills: [
      { name: "起风 Gust", type: "Normal", power: 40, effect: "damage" },
      { name: "惊吓 Astonish", type: "Ghost", power: 35, effect: "damage" },
      { name: "暗影球 Shadow Ball", type: "Ghost", power: 70, effect: "damage" },
      { name: "吸血 Leech", type: "Ghost", power: 40, effect: "leech" }
    ]
  },
  "霜狼": {
    name: "霜狼 FrostWolf",
    type: "Ice",
    maxHp: 60,
    attack: 17,
    defense: 11,
    speed: 16,
    icon: "🐺",
    color: "#06b6d4",
    skills: [
      { name: "咬住 Bite", type: "Normal", power: 45, effect: "damage" },
      { name: "冰砾 Ice Shard", type: "Ice", power: 40, effect: "damage" },
      { name: "急冻光线 Ice Beam", type: "Ice", power: 65, effect: "damage" },
      { name: "嚎叫 Howl", type: "Normal", power: 0, effect: "buff_atk" }
    ]
  },
  "冰晶兽": {
    name: "冰晶兽 FrostCrystal",
    type: "Ice",
    maxHp: 80,
    attack: 21,
    defense: 16,
    speed: 14,
    icon: "❄️",
    color: "#0891b2",
    skills: [
      { name: "撞击 Tackle", type: "Normal", power: 40, effect: "damage" },
      { name: "急冻光线 Ice Beam", type: "Ice", power: 65, effect: "damage" },
      { name: "暴风雪 Blizzard", type: "Ice", power: 90, effect: "damage" },
      { name: "自我再生 Recover", type: "Normal", power: 0, effect: "heal", healAmount: 40 }
    ]
  },
  "极光龙": {
    name: "极光龙 AuroraDragon",
    type: "Dragon",
    maxHp: 130,
    attack: 26,
    defense: 20,
    speed: 22,
    icon: "🐉",
    color: "#f43f5e",
    skills: [
      { name: "龙息 Dragon Breath", type: "Dragon", power: 60, effect: "damage" },
      { name: "龙之爪 Dragon Claw", type: "Dragon", power: 80, effect: "damage" },
      { name: "暴风雪 Blizzard", type: "Ice", power: 90, effect: "damage" },
      { name: "自我再生 Recover", type: "Normal", power: 0, effect: "heal", healAmount: 50 }
    ]
  }
};

// Type Effectiveness Chart
const TYPE_EFFECTIVENESS = {
  Grass: { Water: 2, Fire: 0.5, Grass: 0.5, Rock: 2, Dragon: 0.5 },
  Fire: { Grass: 2, Water: 0.5, Fire: 0.5, Ice: 2, Rock: 0.5, Dragon: 0.5 },
  Water: { Fire: 2, Grass: 0.5, Water: 0.5, Rock: 2, Dragon: 0.5 },
  Electric: { Water: 2, Grass: 0.5, Electric: 0.5, Dragon: 0.5 },
  Ice: { Grass: 2, Fire: 0.5, Water: 0.5, Ice: 0.5, Dragon: 2 },
  Rock: { Fire: 2, Ice: 2, Rock: 0.5 },
  Ghost: { Ghost: 2 },
  Dragon: { Dragon: 2, Steel: 0.5 }
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

    // Camera follow bounds
    this.physics.world.setBounds(0, 0, mapW, mapH);
    this.cameras.main.setBounds(0, 0, mapW, mapH);
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

        let baseDepth = DEPTH.GROUND;
        if (layerName === 'decor_floor') baseDepth = DEPTH.DECOR_FLOOR;
        else if (layerName === 'objects') baseDepth = DEPTH.YSORT;
        else if (layerName === 'decor_top') baseDepth = DEPTH.DECOR_TOP;

        if (layerConfig.ysort) {
          tileSprite.setDepth(baseDepth + y);
          this.ysortGroup.add(tileSprite);
        } else {
          tileSprite.setDepth(baseDepth);
        }

        if (layerConfig.collision) {
          this.physics.add.existing(tileSprite, true);
          this.obstaclesGroup.add(tileSprite);
        }
      }
    }
  }

  setPlayerIdleFrame(dir) {
    this.player.anims.stop();
    const facing = dir || this.facingDir || 'down';
    if (facing === 'down') {
      this.player.setFrame(0);
    } else if (facing === 'up') {
      this.player.setFrame(9);
    } else if (facing === 'left') {
      this.player.setFrame(18);
      this.player.setFlipX(true);
    } else if (facing === 'right') {
      this.player.setFrame(18);
      this.player.setFlipX(false);
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
    const speed = GAME_CONFIG.player?.speed || 180;
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

  checkStepEncounters() {
    const col = Math.floor(this.player.x / 64);
    const row = Math.floor((this.player.y + 20) / 64); // foot offset

    if (col !== this.lastTile.col || row !== this.lastTile.row) {
      this.lastTile = { col, row };

      // Make sure coordinate is inside bounds
      if (col < 0 || col >= TILEMAP_DATA.width || row < 0 || row >= TILEMAP_DATA.height) return;

      const idx = row * TILEMAP_DATA.width + col;
      const groundId = TILEMAP_DATA.layers.ground[idx];
      const decorId = TILEMAP_DATA.layers.decor_floor[idx];

      let encounterChance = 0;
      let area = '';

      // Determine which area we are in and if encounters are possible
      if (col < 15 && row < 15) {
        // Grassland: only in tall grass (decorId === 2)
        if (decorId === 2) {
          encounterChance = 0.08; // 8% chance per step
          area = 'Grassland';
        }
      } else if (col < 15 && row >= 15) {
        // Cave: anywhere on floor (groundId === 3)
        encounterChance = 0.08;
        area = 'Cave';
      } else if (col >= 15 && row < 15) {
        // Snowy Mountain: anywhere on floor (groundId === 5)
        encounterChance = 0.08;
        area = 'SnowyMountain';
      }

      if (encounterChance > 0 && Math.random() < encounterChance) {
        this.triggerRandomEncounter(area);
      }
    }
  }

  triggerRandomEncounter(area) {
    this.player.setVelocity(0);
    this.setPlayerIdleFrame();

    // Trigger visual screen flash effect
    this.cameras.main.flash(400, 255, 255, 255);
    
    // Pick wild monster based on area
    let possibleMonsters = [];
    if (area === 'Grassland') {
      possibleMonsters = ['叶兔', '炎狐', '水龟'];
    } else if (area === 'Cave') {
      possibleMonsters = ['雷鼠', '岩偶', '影蝠'];
    } else if (area === 'SnowyMountain') {
      possibleMonsters = ['霜狼', '冰晶兽'];
    }

    const monsterName = possibleMonsters[Math.floor(Math.random() * possibleMonsters.length)];
    const wildLevel = Math.floor(Math.random() * 4) + (area === 'Grassland' ? 3 : area === 'Cave' ? 7 : 11);
    
    const monsterInstance = this.createMonsterInstance(monsterName, wildLevel);

    // Stop physics and movement, and trigger battle
    this.time.delayedCall(400, () => {
      this.startBattle('wild', {
        name: "野生 " + monsterInstance.name,
        monsters: [monsterInstance]
      });
    });
  }

  createMonsterInstance(name, level) {
    const template = MONSTER_DB[name];
    if (!template) return null;

    const scale = 1 + (level - 5) * 0.08; // grow stats by level
    const maxHp = Math.floor(template.maxHp * scale);
    const attack = Math.floor(template.attack * scale);
    const defense = Math.floor(template.defense * scale);
    const speed = Math.floor(template.speed * scale);

    return {
      name: name,
      fullName: template.name,
      type: template.type,
      level: level,
      maxHp: maxHp,
      hp: maxHp,
      attack: attack,
      defense: defense,
      speed: speed,
      exp: 0,
      icon: template.icon,
      color: template.color,
      skills: JSON.parse(JSON.stringify(template.skills))
    };
  }

  updateProximityPrompts() {
    let closestInteractable = null;
    let type = '';
    let minDist = 75; // Proximity threshold (in pixels)

    // Check distance to healing station
    const healDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.healingStation.x, this.healingStation.y);
    if (healDist < minDist) {
      closestInteractable = this.healingStation;
      type = 'healing';
      minDist = healDist;
    }

    // Check distance to shop merchant
    const shopDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.shopMerchant.x, this.shopMerchant.y);
    if (shopDist < minDist) {
      closestInteractable = this.shopMerchant;
      type = 'shop';
      minDist = shopDist;
    }

    // Check distance to chests
    this.chestsList.forEach(chest => {
      if (!chest.getData('opened')) {
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, chest.x, chest.y);
        if (d < minDist) {
          closestInteractable = chest;
          type = 'chest';
          minDist = d;
        }
      }
    });

    // Check distance to npc trainers
    this.trainersList.forEach(npc => {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
      if (d < minDist) {
        closestInteractable = npc;
        type = 'npc';
        minDist = d;
      }
    });

    // Check distance to gym gate
    const gateDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.gymGate.x, this.gymGate.y);
    if (gateDist < minDist) {
      closestInteractable = this.gymGate;
      type = 'gym_gate';
      minDist = gateDist;
    }

    if (closestInteractable) {
      this.activeInteractable = closestInteractable;
      this.activeInteractType = type;

      // Position prompt box slightly above the player
      this.interactPrompt.setPosition(this.player.x, this.player.y - 70);
      
      let promptText = '';
      if (type === 'healing') promptText = 'E 键：使用治疗泉 💖';
      else if (type === 'shop') promptText = 'E 键：打开怪兽商店 🛒';
      else if (type === 'chest') promptText = 'E 键：开启宝箱 📦';
      else if (type === 'gym_gate') {
        promptText = this.gymGateUnlocked ? '已解锁通道 🔓' : 'E 键：开启道馆大门 🔒';
      } else if (type === 'npc') {
        const isDefeated = closestInteractable.getData('defeated');
        if (isDefeated) {
          promptText = `${closestInteractable.name} (已战胜)`;
        } else {
          promptText = `E 键：与 ${closestInteractable.name} 战斗 ⚔️`;
        }
      }

      this.interactPrompt.setText(promptText);
      this.interactPrompt.setVisible(true);
    } else {
      this.activeInteractable = null;
      this.activeInteractType = '';
      this.interactPrompt.setVisible(false);
    }
  }

  triggerInteraction() {
    const type = this.activeInteractType;
    const obj = this.activeInteractable;
    if (!obj) return;

    if (type === 'healing') {
      this.healTeam();
    } else if (type === 'shop') {
      this.openShop();
    } else if (type === 'chest') {
      this.openChest(obj);
    } else if (type === 'gym_gate') {
      this.interactGymGate();
    } else if (type === 'npc') {
      const isDefeated = obj.getData('defeated');
      if (!isDefeated) {
        this.startNpcTrainerBattle(obj);
      }
    }
  }

  healTeam() {
    this.monstersTeam.forEach(m => {
      m.hp = m.maxHp;
    });
    this.spawnFloatingText(this.healingStation.x, this.healingStation.y - 32, "队伍已恢复全满！💖", "#22c55e");
    
    // Play camera color tint flash
    this.cameras.main.flash(300, 34, 197, 94);
  }

  openShop() {
    this.inBattle = true; // Pause map updates
    this.player.setVelocity(0);
    this.setPlayerIdleFrame();

    const shopEl = document.getElementById('shop-overlay');
    if (shopEl) {
      shopEl.style.display = 'flex';
      this.updateShopUI();
    }
  }

  updateShopUI() {
    const goldText = document.getElementById('shop-gold');
    const ballCount = document.getElementById('shop-balls-count');
    const potionCount = document.getElementById('shop-potions-count');
    
    if (goldText) goldText.textContent = this.gold;
    if (ballCount) ballCount.textContent = this.inventory.balls;
    if (potionCount) potionCount.textContent = this.inventory.potions;
  }

  openChest(chest) {
    chest.setData('opened', true);
    chest.play('chest_open');

    // Give random rewards
    const giveBalls = 5;
    const givePotions = 2;
    this.inventory.balls += giveBalls;
    this.inventory.potions += givePotions;

    this.spawnFloatingText(chest.x, chest.y - 32, `获得 精灵球x${giveBalls} 伤药x${givePotions}! 🎒`, "#fbbf24");
    this.updateWorldHUD();
  }

  interactGymGate() {
    if (this.gymGateUnlocked) return;

    // Check player team size
    if (this.monstersTeam.length < 3) {
      this.spawnFloatingText(this.gymGate.x, this.gymGate.y - 32, "守卫：你的怪兽队伍需要至少 3 只怪兽才能挑战道馆！", "#f87171");
    } else {
      this.gymGateUnlocked = true;
      this.gymGate.setTint(0x4ade80); // green tint for unlocked
      this.gymGateCollider.destroy(); // Remove wall physics collider!
      this.spawnFloatingText(this.gymGate.x, this.gymGate.y - 32, "大门已解锁！进入巅峰道馆挑战馆主吧 🔓", "#4ade80");
      window.GameHUD?.setObjective("前往道馆，击败道馆馆主！🏆");
    }
  }

  startNpcTrainerBattle(npc) {
    this.player.setVelocity(0);
    this.setPlayerIdleFrame();

    const trainerSpeeches = {
      TrainerJack: [
        '⚔️ 训练师 Jack 发起挑战！',
        '"我在草地上训练了好几个月……"',
        '"你这个新人，准备见识一下我的水龟和叶兔！"'
      ],
      TrainerRocky: [
        '⚔️ 训练师 Rocky 拦住了你的去路！',
        '"洞窟是我的主场——岩石与闪电，无人能敌！"',
        '"击败我，才配进入雪山！"'
      ],
      TrainerYeti: [
        '⚔️ 训练师 Yeti 从暴风雪中现身！',
        '"终于有人闯到这里了……寒冰是我的礼物。"',
        '"我的霜狼和冰晶兽会让你领略极地的力量！"'
      ],
      GymLeader: [
        '🏆 道馆馆主 烈达 踏前一步！',
        '"年轻的训练师……你能走到这里，已经让我刮目相看。"',
        '"但这里是顶峰——我的极光龙不曾败北。"',
        '"拿出你最强的伙伴，用羁绊之力挑战极限！"'
      ]
    };

    let enemyTeam = [];
    if (npc.name === 'TrainerJack') {
      enemyTeam = [
        this.createMonsterInstance('水龟', 6),
        this.createMonsterInstance('叶兔', 6)
      ];
    } else if (npc.name === 'TrainerRocky') {
      enemyTeam = [
        this.createMonsterInstance('岩偶', 9),
        this.createMonsterInstance('雷鼠', 10)
      ];
    } else if (npc.name === 'TrainerYeti') {
      enemyTeam = [
        this.createMonsterInstance('霜狼', 13),
        this.createMonsterInstance('冰晶兽', 14)
      ];
    } else if (npc.name === 'GymLeader') {
      enemyTeam = [
        this.createMonsterInstance('冰晶兽', 18),
        this.createMonsterInstance('极光龙', 20)
      ];
    }

    const speech = trainerSpeeches[npc.name];
    const flashDuration = npc.name === 'GymLeader' ? 800 : 500;
    this.cameras.main.flash(flashDuration, 244, 63, 94);

    if (speech) {
      this.showStoryBanner(speech, npc.name === 'GymLeader' ? 3500 : 2500, () => {
        this.startBattle('trainer', {
          name: npc.name === 'GymLeader' ? "道馆馆主 烈达" : `训练师 ${npc.name}`,
          npcRef: npc,
          monsters: enemyTeam
        });
      });
    } else {
      this.time.delayedCall(500, () => {
        this.startBattle('trainer', {
          name: `训练师 ${npc.name}`,
          npcRef: npc,
          monsters: enemyTeam
        });
      });
    }
  }

  // --- Battle System Logic ---
  startBattle(type, enemyData) {
    this.inBattle = true;
    
    // Select player's first alive monster
    let activePlayerIdx = this.monstersTeam.findIndex(m => m.hp > 0);
    if (activePlayerIdx === -1) {
      alert("没有可以战斗的怪兽！请前往治疗泉回复。");
      this.inBattle = false;
      return;
    }

    // Hide world HUD and show battle screen
    const hudEl = document.getElementById('hud');
    if (hudEl) hudEl.style.display = 'none';
    const battleOverlay = document.getElementById('battle-overlay');
    if (battleOverlay) {
      battleOverlay.style.display = 'flex';
    }

    const openingLog = type === 'wild'
      ? `野生的 ${enemyData.name} 出现了！它露出了警觉的眼神！`
      : `${enemyData.name} 发起了挑战！`;

    this.battleState = {
      type: type, // 'wild' or 'trainer'
      enemyName: enemyData.name,
      enemyTeam: enemyData.monsters,
      enemyActiveIdx: 0,
      playerActiveIdx: activePlayerIdx,
      npcRef: enemyData.npcRef,
      logs: [openingLog]
    };

    this.initBattleUI();
    this.writeBattleLog(openingLog);
  }

  initBattleUI() {
    const state = this.battleState;
    const playerActive = this.monstersTeam[state.playerActiveIdx];
    const enemyActive = state.enemyTeam[state.enemyActiveIdx];

    // Catch button visibility (only wild encounters)
    const catchBtn = document.getElementById('bt-catch-btn');
    if (catchBtn) {
      catchBtn.style.display = state.type === 'wild' ? 'block' : 'none';
    }

    this.renderBattleMonsters();
  }

  renderBattleMonsters() {
    const state = this.battleState;
    const pActive = this.monstersTeam[state.playerActiveIdx];
    const eActive = state.enemyTeam[state.enemyActiveIdx];

    // Player Card
    document.getElementById('bt-p-name').textContent = pActive.fullName;
    document.getElementById('bt-p-level').textContent = pActive.level;
    document.getElementById('bt-p-type').textContent = pActive.type;
    document.getElementById('bt-p-hp-text').textContent = `${pActive.hp}/${pActive.maxHp}`;
    
    const pHpPct = Math.max(0, (pActive.hp / pActive.maxHp) * 100);
    const pHpBar = document.getElementById('bt-p-hp-bar');
    pHpBar.style.width = `${pHpPct}%`;
    pHpBar.style.backgroundColor = pHpPct < 25 ? '#ef4444' : pHpPct < 50 ? '#eab308' : '#22c55e';

    const pXpPct = Math.max(0, (pActive.exp / (pActive.level * 100)) * 100);
    document.getElementById('bt-p-xp-bar').style.width = `${pXpPct}%`;
    document.getElementById('bt-p-avatar').textContent = pActive.icon;
    document.getElementById('bt-p-avatar').style.color = pActive.color;

    // Enemy Card
    document.getElementById('bt-e-name').textContent = eActive.fullName;
    document.getElementById('bt-e-level').textContent = eActive.level;
    document.getElementById('bt-e-type').textContent = eActive.type;
    document.getElementById('bt-e-hp-text').textContent = `${eActive.hp}/${eActive.maxHp}`;

    const eHpPct = Math.max(0, (eActive.hp / eActive.maxHp) * 100);
    const eHpBar = document.getElementById('bt-e-hp-bar');
    eHpBar.style.width = `${eHpPct}%`;
    eHpBar.style.backgroundColor = eHpPct < 25 ? '#ef4444' : eHpPct < 50 ? '#eab308' : '#22c55e';
    document.getElementById('bt-e-avatar').textContent = eActive.icon;
    document.getElementById('bt-e-avatar').style.color = eActive.color;

    // Skills Grid
    const skillsGrid = document.getElementById('bt-skills-grid');
    skillsGrid.innerHTML = '';
    pActive.skills.forEach((skill, index) => {
      const btn = document.createElement('button');
      btn.className = 'skill-btn';
      btn.innerHTML = `${skill.name}<br><small style="font-size:9px;opacity:0.8">${skill.type} / 威力 ${skill.power}</small>`;
      btn.onclick = () => this.executeBattleTurn(index);
      skillsGrid.appendChild(btn);
    });
  }

  writeBattleLog(text) {
    const logBox = document.getElementById('bt-log-box');
    if (logBox) {
      const p = document.createElement('p');
      p.textContent = text;
      p.style.margin = '4px 0';
      logBox.appendChild(p);
      logBox.scrollTop = logBox.scrollHeight;
    }
  }

  executeBattleTurn(playerSkillIdx) {
    const state = this.battleState;
    const playerMon = this.monstersTeam[state.playerActiveIdx];
    const enemyMon = state.enemyTeam[state.enemyActiveIdx];
    const skill = playerMon.skills[playerSkillIdx];

    // Determine move order based on speed
    const playerFirst = playerMon.speed >= enemyMon.speed;

    // Disable buttons during animation
    this.toggleBattleButtons(false);

    if (playerFirst) {
      // Player attacks first
      this.executeAction(playerMon, enemyMon, skill, 'player', () => {
        if (enemyMon.hp <= 0) {
          this.handleEnemyFainted();
        } else {
          // Enemy retaliates
          const enemySkill = enemyMon.skills[Math.floor(Math.random() * enemyMon.skills.length)];
          this.executeAction(enemyMon, playerMon, enemySkill, 'enemy', () => {
            if (playerMon.hp <= 0) {
              this.handlePlayerFainted();
            } else {
              this.toggleBattleButtons(true);
            }
          });
        }
      });
    } else {
      // Enemy attacks first
      const enemySkill = enemyMon.skills[Math.floor(Math.random() * enemyMon.skills.length)];
      this.executeAction(enemyMon, playerMon, enemySkill, 'enemy', () => {
        if (playerMon.hp <= 0) {
          this.handlePlayerFainted();
        } else {
          // Player attacks second
          this.executeAction(playerMon, enemyMon, skill, 'player', () => {
            if (enemyMon.hp <= 0) {
              this.handleEnemyFainted();
            } else {
              this.toggleBattleButtons(true);
            }
          });
        }
      });
    }
  }

  executeAction(attacker, defender, skill, attackerSide, onComplete) {
    const avatarId = attackerSide === 'player' ? 'bt-p-avatar' : 'bt-e-avatar';
    const defenderAvatarId = attackerSide === 'player' ? 'bt-e-avatar' : 'bt-p-avatar';
    const avatarEl = document.getElementById(avatarId);
    const defenderEl = document.getElementById(defenderAvatarId);

    // Play attack hop animation
    if (avatarEl) {
      avatarEl.classList.add('battle-hop');
      setTimeout(() => avatarEl.classList.remove('battle-hop'), 300);
    }

    this.writeBattleLog(`${attacker.fullName} 使用了 ${skill.name}!`);

    setTimeout(() => {
      if (skill.effect === 'damage' || skill.effect === 'leech') {
        // Calculate type multiplier
        let effectiveness = 1;
        if (TYPE_EFFECTIVENESS[skill.type] && TYPE_EFFECTIVENESS[skill.type][defender.type]) {
          effectiveness = TYPE_EFFECTIVENESS[skill.type][defender.type];
        }

        const baseDmg = skill.power * (attacker.attack / defender.defense) * 0.4;
        const randomMultiplier = 0.85 + Math.random() * 0.3;
        let damage = Math.floor(baseDmg * effectiveness * randomMultiplier) + 2;

        defender.hp = Math.max(0, defender.hp - damage);

        // Shake animation for taking damage
        if (defenderEl) {
          defenderEl.classList.add('battle-shake');
          setTimeout(() => defenderEl.classList.remove('battle-shake'), 400);
        }

        this.writeBattleLog(`对 ${defender.fullName} 造成了 ${damage} 点伤害！`);
        
        if (effectiveness > 1.1) {
          this.writeBattleLog("效果拔群！⚡");
        } else if (effectiveness < 0.9) {
          this.writeBattleLog("效果不佳... 🛡️");
        }

        if (skill.effect === 'leech') {
          const leechAmount = Math.floor(damage * 0.5);
          attacker.hp = Math.min(attacker.maxHp, attacker.hp + leechAmount);
          this.writeBattleLog(`${attacker.fullName} 吸取了 ${leechAmount} 点生命！`);
        }

      } else if (skill.effect === 'heal') {
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + skill.healAmount);
        this.writeBattleLog(`${attacker.fullName} 恢复了 ${skill.healAmount} 点生命！`);
      } else if (skill.effect === 'buff_atk') {
        attacker.attack = Math.floor(attacker.attack * 1.3);
        this.writeBattleLog(`${attacker.fullName} 的攻击力提升了！🚀`);
      } else if (skill.effect === 'buff_def') {
        attacker.defense = Math.floor(attacker.defense * 1.3);
        this.writeBattleLog(`${attacker.fullName} 的防御力提升了！🛡️`);
      } else if (skill.effect === 'debuff_atk') {
        defender.attack = Math.max(5, Math.floor(defender.attack * 0.7));
        this.writeBattleLog(`${defender.fullName} 的攻击力降低了！📉`);
      }

      // Update UI displays
      this.renderBattleMonsters();
      setTimeout(onComplete, 800);
    }, 500);
  }

  toggleBattleButtons(enabled) {
    const buttons = document.querySelectorAll('#battle-overlay button');
    buttons.forEach(b => {
      b.disabled = !enabled;
    });
  }

  handlePlayerFainted() {
    const state = this.battleState;
    const playerMon = this.monstersTeam[state.playerActiveIdx];
    this.writeBattleLog(`${playerMon.fullName} 战败了！😢`);

    setTimeout(() => {
      // Find another alive monster
      const nextIdx = this.monstersTeam.findIndex((m, idx) => idx !== state.playerActiveIdx && m.hp > 0);
      if (nextIdx !== -1) {
        state.playerActiveIdx = nextIdx;
        this.writeBattleLog(`派出 ${this.monstersTeam[nextIdx].fullName}！`);
        this.renderBattleMonsters();
        this.toggleBattleButtons(true);
      } else {
        // Player completely defeated (all fainted)
        this.writeBattleLog("你队伍中的怪兽已全部战败... 😵");
        setTimeout(() => this.endBattle(false), 1200);
      }
    }, 800);
  }

  handleEnemyFainted() {
    const state = this.battleState;
    const enemyMon = state.enemyTeam[state.enemyActiveIdx];
    this.writeBattleLog(`击败了 ${enemyMon.fullName}！🎉`);

    setTimeout(() => {
      // Player gains EXP
      const activeMon = this.monstersTeam[state.playerActiveIdx];
      const expGain = enemyMon.level * 18;
      activeMon.exp += expGain;
      this.writeBattleLog(`${activeMon.fullName} 获得了 ${expGain} 点经验值！`);

      // Check level up
      const expNeeded = activeMon.level * 100;
      if (activeMon.exp >= expNeeded) {
        activeMon.level++;
        activeMon.exp -= expNeeded;
        activeMon.maxHp += 5;
        activeMon.attack += 2;
        activeMon.defense += 2;
        activeMon.speed += 2;
        activeMon.hp = activeMon.maxHp; // fully heal on level up
        this.writeBattleLog(`🌟 太棒了！${activeMon.fullName} 升级到了 等级 ${activeMon.level}！`);
      }

      // Check next enemy monster
      const nextEnemyIdx = state.enemyActiveIdx + 1;
      if (nextEnemyIdx < state.enemyTeam.length) {
        state.enemyActiveIdx = nextEnemyIdx;
        this.writeBattleLog(`${state.enemyName} 派出了 ${state.enemyTeam[nextEnemyIdx].fullName}！`);
        this.renderBattleMonsters();
        this.toggleBattleButtons(true);
      } else {
        // Defeated all enemies!
        this.writeBattleLog(`战胜了 ${state.enemyName}！✨`);
        setTimeout(() => this.endBattle(true), 1200);
      }
    }, 800);
  }

  throwPokeBall() {
    const state = this.battleState;
    if (state.type !== 'wild') return;

    if (this.inventory.balls <= 0) {
      this.writeBattleLog("你的精灵球不足！🎒");
      return;
    }

    this.inventory.balls--;
    this.toggleBattleButtons(false);
    this.writeBattleLog("扔出了精灵球！🔴");

    const enemyMon = state.enemyTeam[state.enemyActiveIdx];
    const ballEl = document.getElementById('bt-e-avatar');
    
    if (ballEl) {
      ballEl.classList.add('battle-catch-shake');
    }

    setTimeout(() => {
      // Catch rate calculation: (1 - hp/maxHp) + bonus
      const hpRatio = enemyMon.hp / enemyMon.maxHp;
      const catchChance = (1 - hpRatio) * 0.75 + 0.15; // lower hp -> higher chance (up to 90%)

      if (ballEl) {
        ballEl.classList.remove('battle-catch-shake');
      }

      if (Math.random() < catchChance) {
        // Success
        this.writeBattleLog(`成功捕获 ${enemyMon.fullName}！🎉`);
        
        // Add to team or storage
        const capturedInstance = JSON.parse(JSON.stringify(enemyMon));
        capturedInstance.fullName = capturedInstance.fullName.replace("野生 ", "");
        
        if (this.monstersTeam.length < 6) {
          this.monstersTeam.push(capturedInstance);
          this.writeBattleLog(`${capturedInstance.fullName} 已加入你的战斗队伍！`);
        } else {
          this.monsterStorage.push(capturedInstance);
          this.writeBattleLog(`队伍已满，${capturedInstance.fullName} 被送往电脑仓库！`);
        }

        setTimeout(() => this.endBattle(true, true), 1200);
      } else {
        // Break free
        this.writeBattleLog(`差一点！${enemyMon.fullName} 从精灵球挣脱了！💨`);
        
        // Enemy counter attacks immediately
        setTimeout(() => {
          const enemySkill = enemyMon.skills[Math.floor(Math.random() * enemyMon.skills.length)];
          const playerMon = this.monstersTeam[state.playerActiveIdx];
          this.executeAction(enemyMon, playerMon, enemySkill, 'enemy', () => {
            if (playerMon.hp <= 0) {
              this.handlePlayerFainted();
            } else {
              this.toggleBattleButtons(true);
            }
          });
        }, 800);
      }
    }, 1500);
  }

  switchBattleMonster(teamIdx) {
    const state = this.battleState;
    if (teamIdx === state.playerActiveIdx) return;
    const mon = this.monstersTeam[teamIdx];
    if (mon.hp <= 0) return;

    // Close swap menu
    document.getElementById('bt-swap-menu').style.display = 'none';
    this.writeBattleLog(`收回了 ${this.monstersTeam[state.playerActiveIdx].fullName}！`);
    
    setTimeout(() => {
      state.playerActiveIdx = teamIdx;
      this.writeBattleLog(`派出 ${mon.fullName}！`);
      this.renderBattleMonsters();
      this.toggleBattleButtons(false);

      // Enemy counter attacks because switching takes a turn!
      const enemyActive = state.enemyTeam[state.enemyActiveIdx];
      const enemySkill = enemyActive.skills[Math.floor(Math.random() * enemyActive.skills.length)];
      
      this.executeAction(enemyActive, mon, enemySkill, 'enemy', () => {
        if (mon.hp <= 0) {
          this.handlePlayerFainted();
        } else {
          this.toggleBattleButtons(true);
        }
      });
    }, 800);
  }

  runAway() {
    if (this.battleState.type !== 'wild') return;
    
    this.writeBattleLog("正在尝试逃跑...");
    this.toggleBattleButtons(false);

    setTimeout(() => {
      if (Math.random() < 0.6) {
        this.writeBattleLog("成功逃跑！💨");
        setTimeout(() => this.endBattle(true, false, true), 800);
      } else {
        this.writeBattleLog("逃跑失败！");
        
        // Enemy attacks
        setTimeout(() => {
          const state = this.battleState;
          const enemyMon = state.enemyTeam[state.enemyActiveIdx];
          const enemySkill = enemyMon.skills[Math.floor(Math.random() * enemyMon.skills.length)];
          const playerMon = this.monstersTeam[state.playerActiveIdx];
          this.executeAction(enemyMon, playerMon, enemySkill, 'enemy', () => {
            if (playerMon.hp <= 0) {
              this.handlePlayerFainted();
            } else {
              this.toggleBattleButtons(true);
            }
          });
        }, 800);
      }
    }, 800);
  }

  endBattle(win, captured = false, ranAway = false) {
    const state = this.battleState;
    document.getElementById('battle-overlay').style.display = 'none';
    document.getElementById('bt-log-box').innerHTML = '';
    const hudEl = document.getElementById('hud');
    if (hudEl) hudEl.style.display = '';
    
    if (win) {
      if (ranAway) {
        // Just escape
      } else if (captured) {
        // Capturing award
        this.gold += 20;
      } else {
        // Victory award
        let goldReward = 50 + state.enemyTeam.length * 40;
        if (state.type === 'trainer') {
          goldReward *= 2;
          state.npcRef.setData('defeated', true);
          
          // Tint NPC grey to show defeated
          state.npcRef.setTint(0x777777);

          // Story Quest updates
          if (state.npcRef.name === 'TrainerJack') {
            window.GameHUD?.setObjective("探索幽暗洞窟，寻找并击败训练师 Rocky！⛰️");
            this.gold += 100;
          } else if (state.npcRef.name === 'TrainerRocky') {
            window.GameHUD?.setObjective("穿过雪山，寻找道馆馆主烈达进行终极对决！❄️");
            this.gold += 200;
          } else if (state.npcRef.name === 'TrainerYeti') {
            this.gold += 300;
          } else if (state.npcRef.name === 'GymLeader') {
            // Defeated Gym Leader! Player Wins!
            this.gymLeaderDefeated = true;
            this.showVictoryScreen();
          }
        }
        this.gold += goldReward;
        this.spawnFloatingText(this.player.x, this.player.y, `胜利！获得金币 +${goldReward} 💰`, "#eab308");
      }
    } else {
      // Player blackout (death)
      this.playerDefeated = true;
      this.cameras.main.fadeOut(800, 0, 0, 0);
      this.time.delayedCall(800, () => {
        // Teleport back to start point
        this.player.setPosition(224, 224);
        
        // Heal team
        this.monstersTeam.forEach(m => {
          m.hp = m.maxHp;
        });

        // Deduct money penalty (20% of current gold)
        const loss = Math.floor(this.gold * 0.2);
        this.gold -= loss;

        this.cameras.main.fadeIn(800);
        this.playerDefeated = false;
        
        this.spawnFloatingText(this.player.x, this.player.y, `战斗失败！黑屏传送回泉水，金币损失 -${loss} 💰`, "#ef4444");
        this.updateWorldHUD();
      });
    }

    this.updateWorldHUD();
    this.inBattle = false;
    this.battleState = null;
  }

  showVictoryScreen() {
    this.inBattle = true;
    this.gameStarted = false;
    this.player.setVelocity(0);
    this.setPlayerIdleFrame();

    window.GameHUD?.showGameOver(true, [
      '🏆 传奇诞生！',
      '你击败了从未败北的道馆馆主 烈达，',
      '用羁绊的力量征服了草地、洞窟、雪山与顶峰道馆。',
      '整个像素大陆将永远铭记这位怪兽训练大师的名字！'
    ].join('\n'));
  }

  // --- HTML DOM Integration ---
  injectHTMLOverlays() {
    // Inject Custom CSS
    const cssStyle = `
      /* --- Battle Overlay Container --- */
      #battle-overlay {
        display: none;
        position: absolute;
        inset: 0;
        z-index: 40;
        background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
        font-family: 'Segoe UI', 'Courier New', monospace;
        color: #f1f5f9;
        flex-direction: column;
        padding: 16px;
        box-sizing: border-box;
      }

      .bt-layout {
        display: flex;
        flex-direction: column;
        height: 100%;
        gap: 12px;
      }

      /* Arena Area */
      .bt-arena {
        flex: 1;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 24px;
        position: relative;
        background: radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%);
      }

      .bt-card {
        background: rgba(30, 41, 59, 0.75);
        backdrop-filter: blur(8px);
        border: 1px solid #475569;
        border-radius: 12px;
        padding: 12px 16px;
        width: 44%;
        box-shadow: 0 4px 15px rgba(0,0,0,0.35);
      }

      .bt-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        font-weight: bold;
      }

      .bt-name { font-size: 15px; color: #f8fafc; }
      .bt-level { font-size: 12px; color: #a5f3fc; }

      .bt-bar-wrapper {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 4px;
      }

      .bt-hp-bar-outer {
        width: 100%;
        height: 12px;
        background: #334155;
        border-radius: 6px;
        overflow: hidden;
      }

      .bt-hp-bar-inner {
        height: 100%;
        width: 100%;
        background-color: #22c55e;
        transition: width 0.3s ease;
      }

      .bt-xp-bar-outer {
        width: 60%;
        height: 4px;
        background: #1e293b;
        border-radius: 2px;
        overflow: hidden;
      }

      .bt-xp-bar-inner {
        height: 100%;
        width: 0%;
        background-color: #3b82f6;
      }

      .bt-avatar-box {
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 52px;
        height: 90px;
        margin-top: 8px;
        user-select: none;
        filter: drop-shadow(0 4px 10px rgba(0,0,0,0.5));
      }

      /* Control Deck */
      .bt-controls {
        background: rgba(15, 23, 42, 0.9);
        border: 1px solid #334155;
        border-radius: 12px;
        padding: 12px;
        display: flex;
        height: 150px;
        gap: 12px;
      }

      .bt-log {
        flex: 1;
        background: #090d16;
        border: 1px solid #273549;
        border-radius: 8px;
        padding: 8px 12px;
        overflow-y: auto;
        font-size: 12px;
        color: #e2e8f0;
        line-height: 1.5;
      }

      .bt-actions {
        width: 250px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .bt-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        height: 100%;
      }

      /* Buttons */
      .skill-btn, .opt-btn, .shop-btn, .starter-card button {
        padding: 6px 8px;
        font-size: 12px;
        font-weight: bold;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.1s;
        text-align: center;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        color: white;
      }

      .skill-btn {
        background: #312e81;
        border: 1px solid #4f46e5;
      }
      .skill-btn:hover { background: #4338ca; }
      .skill-btn:disabled { opacity: 0.5; cursor: not-allowed; }

      .opt-btn { background: #b45309; }
      .opt-btn:hover { background: #d97706; }
      .opt-btn:disabled { opacity: 0.5; cursor: not-allowed; }

      .opt-red { background: #b91c1c; }
      .opt-red:hover { background: #dc2626; }

      .opt-purple { background: #6d28d9; }
      .opt-purple:hover { background: #7c3aed; }

      /* Swap Menu popup */
      #bt-swap-menu {
        display: none;
        position: absolute;
        inset: 20px;
        background: rgba(15, 23, 42, 0.98);
        border: 2px solid #3b82f6;
        border-radius: 12px;
        padding: 16px;
        z-index: 50;
        flex-direction: column;
      }

      .bt-swap-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        flex: 1;
        margin-top: 12px;
      }

      .bt-swap-item {
        background: #1e293b;
        border: 1px solid #475569;
        border-radius: 8px;
        padding: 8px 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 12px;
        transition: background 0.2s;
      }

      .bt-swap-item:hover {
        background: #334155;
        border-color: #3b82f6;
      }
      
      .bt-swap-item.fainted {
        opacity: 0.4;
        cursor: not-allowed;
      }

      /* Starter Select and Shop Overlay */
      .modal-overlay {
        display: none;
        position: absolute;
        inset: 0;
        background: rgba(8, 12, 24, 0.92);
        z-index: 60;
        align-items: center;
        justify-content: center;
        font-family: monospace;
      }

      .modal-card {
        background: #0f172a;
        border: 2px solid #3b82f6;
        border-radius: 12px;
        padding: 24px 32px;
        width: 80%;
        max-width: 500px;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0,0,0,0.6);
      }

      .starter-grid {
        display: flex;
        justify-content: space-around;
        margin-top: 20px;
        gap: 12px;
      }

      .starter-card {
        background: #1e293b;
        border: 1px solid #475569;
        border-radius: 8px;
        padding: 16px 8px;
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        transition: transform 0.2s, border-color 0.2s;
      }

      .starter-card:hover {
        transform: translateY(-4px);
        border-color: #3b82f6;
      }

      .starter-icon {
        font-size: 44px;
        margin-bottom: 8px;
      }

      /* Shop UI elements */
      .shop-item-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #1e293b;
        padding: 8px 16px;
        border-radius: 8px;
        margin-bottom: 8px;
        border: 1px solid #334155;
      }

      /* Micro Animations */
      .battle-hop {
        animation: hop 0.3s ease-in-out;
      }
      .battle-shake {
        animation: shake 0.4s ease-in-out;
      }
      .battle-catch-shake {
        animation: catch-shake 0.5s ease-in-out infinite;
      }

      @keyframes hop {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-20px); }
      }
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        20%, 60% { transform: translateX(-8px); }
        40%, 80% { transform: translateX(8px); }
      }
      @keyframes catch-shake {
        0%, 100% { transform: rotate(0deg); }
        25% { transform: rotate(-15deg) translateY(-8px); }
        75% { transform: rotate(15deg) translateY(-8px); }
      }
    `;

    // Inject css
    const styleEl = document.createElement('style');
    styleEl.innerHTML = cssStyle;
    document.head.appendChild(styleEl);

    // Injected DOM nodes inside game wrapper
    const wrapper = document.getElementById('game-wrapper');
    if (!wrapper) return;

    // 1. Battle Overlay
    const battleHTML = `
      <div id="battle-overlay">
        <div class="bt-layout">
          <!-- Arena Area -->
          <div class="bt-arena">
            <!-- Player active monster -->
            <div class="bt-card">
              <div class="bt-card-header">
                <span id="bt-p-name">-</span>
                <span id="bt-p-level">-</span>
              </div>
              <div class="bt-avatar-box" id="bt-p-avatar">🐰</div>
              <div class="bt-bar-wrapper">
                <div style="font-size:10px; display:flex; justify-content:space-between">
                  <span>HP: <span id="bt-p-hp-text">0/0</span></span>
                  <span id="bt-p-type" style="font-weight:bold">-</span>
                </div>
                <div class="bt-hp-bar-outer">
                  <div class="bt-hp-bar-inner" id="bt-p-hp-bar"></div>
                </div>
                <div class="bt-xp-bar-outer">
                  <div class="bt-xp-bar-inner" id="bt-p-xp-bar"></div>
                </div>
              </div>
            </div>

            <div style="font-size: 28px; font-weight: bold; color: #94a3b8; text-shadow: 0 4px 6px rgba(0,0,0,0.5)">VS</div>

            <!-- Enemy active monster -->
            <div class="bt-card">
              <div class="bt-card-header">
                <span id="bt-e-name">-</span>
                <span id="bt-e-level">-</span>
              </div>
              <div class="bt-avatar-box" id="bt-e-avatar">🦊</div>
              <div class="bt-bar-wrapper">
                <div style="font-size:10px; display:flex; justify-content:space-between">
                  <span>HP: <span id="bt-e-hp-text">0/0</span></span>
                  <span id="bt-e-type" style="font-weight:bold">-</span>
                </div>
                <div class="bt-hp-bar-outer">
                  <div class="bt-hp-bar-inner" id="bt-e-hp-bar"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Battle Control Panel -->
          <div class="bt-controls">
            <div class="bt-log" id="bt-log-box"></div>
            <div class="bt-actions">
              <div class="bt-grid">
                <div style="display:contents" id="bt-skills-grid">
                  <!-- Skill buttons populated dynamically -->
                </div>
                <button class="opt-btn opt-purple" onclick="window.MainGame.triggerBattleSwapMenu()">🔁 换怪兽</button>
                <button class="opt-btn opt-red" id="bt-catch-btn" onclick="window.MainGame.triggerCatch()">🔴 扔飞球</button>
                <button class="opt-btn" onclick="window.MainGame.triggerRunAway()">🏃 逃跑</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Swap monster menu -->
        <div id="bt-swap-menu">
          <h3 style="text-align:center; border-bottom:1px solid #334155; padding-bottom:8px">选择出战怪兽</h3>
          <div class="bt-swap-grid" id="bt-swap-grid-box"></div>
          <button class="opt-btn opt-red" style="margin-top:12px; width:100%" onclick="document.getElementById('bt-swap-menu').style.display='none'">取消</button>
        </div>
      </div>
    `;
    wrapper.insertAdjacentHTML('beforeend', battleHTML);

    // 2. Starter Select Overlay
    const starterHTML = `
      <div id="starter-overlay" class="modal-overlay">
        <div class="modal-card">
          <h2 style="color:#60a5fa; font-size:1.6rem">选择你的初始伙伴</h2>
          <p style="color:#94a3b8; font-size:11px; margin-top:8px">这是你怪兽训练师旅程的起点。选择一只最吸引你的初始怪兽吧！</p>
          <div class="starter-grid">
            <div class="starter-card" onclick="window.MainGame.chooseStarter('叶兔')">
              <div class="starter-icon" style="color:#22c55e">🐰</div>
              <strong style="color:#22c55e">叶兔 (草系)</strong>
              <small style="font-size:10px; color:#94a3b8; margin-top:4px">高血量高防御<br>擅长回复治愈</small>
            </div>
            <div class="starter-card" onclick="window.MainGame.chooseStarter('炎狐')">
              <div class="starter-icon" style="color:#f97316">🦊</div>
              <strong style="color:#f97316">炎狐 (火系)</strong>
              <small style="font-size:10px; color:#94a3b8; margin-top:4px">高速度高攻击<br>输出暴力输出</small>
            </div>
            <div class="starter-card" onclick="window.MainGame.chooseStarter('水龟')">
              <div class="starter-icon" style="color:#3b82f6">🐢</div>
              <strong style="color:#3b82f6">水龟 (水系)</strong>
              <small style="font-size:10px; color:#94a3b8; margin-top:4px">全面均衡发展<br>极高物理防御</small>
            </div>
          </div>
        </div>
      </div>
    `;
    wrapper.insertAdjacentHTML('beforeend', starterHTML);

    // 3. Poke Shop Overlay
    const shopHTML = `
      <div id="shop-overlay" class="modal-overlay">
        <div class="modal-card" style="max-width:400px">
          <h2 style="color:#3b82f6; border-bottom:1px solid #334155; padding-bottom:8px">怪兽商店 🛒</h2>
          <div style="text-align:right; font-size:12px; color:#fbbf24; margin:10px 0">
            我的金币: <span id="shop-gold">0</span> 💰
          </div>
          <div style="display:flex; flex-direction:column; gap:8px">
            <div class="shop-item-row">
              <div>
                <strong>精灵球 (Catch Ball)</strong><br>
                <small style="color:#a5f3fc; font-size:9px">价格: 50 金币</small>
              </div>
              <button class="opt-btn opt-purple" onclick="window.MainGame.buyItem('balls', 50)">购买 (拥有:<span id="shop-balls-count">0</span>)</button>
            </div>
            <div class="shop-item-row">
              <div>
                <strong>全效伤药 (Potion)</strong><br>
                <small style="color:#a5f3fc; font-size:9px">价格: 75 金币 (回复 50HP)</small>
              </div>
              <button class="opt-btn opt-purple" onclick="window.MainGame.buyItem('potions', 75)">购买 (拥有:<span id="shop-potions-count">0</span>)</button>
            </div>
          </div>
          <button class="opt-btn opt-red" style="margin-top:16px; width:100%" onclick="window.MainGame.closeShop()">离开商店</button>
        </div>
      </div>
    `;
    wrapper.insertAdjacentHTML('beforeend', shopHTML);

    // 4. Map Menu Overlay (Monsters List Manager)
    const mapMenuHTML = `
      <div id="map-monsters-overlay" class="modal-overlay">
        <div class="modal-card">
          <h2 style="color:#a855f7; border-bottom:1px solid #334155; padding-bottom:8px">我的怪兽队伍</h2>
          <p style="color:#94a3b8; font-size:10px; margin-top:4px">在此查看你的队伍。首位怪兽将作为首发出战。伤药剩余: <span id="menu-potion-cnt">0</span></p>
          <div id="menu-monsters-list" style="margin-top:16px; display:flex; flex-direction:column; gap:8px; max-height:240px; overflow-y:auto">
            <!-- Monsters list row dynamically populated -->
          </div>
          <button class="opt-btn opt-red" style="margin-top:16px; width:100%" onclick="document.getElementById('map-monsters-overlay').style.display='none'; window.MainGame.resumeMap()">关闭界面</button>
        </div>
      </div>
    `;
    wrapper.insertAdjacentHTML('beforeend', mapMenuHTML);

    // Expose Javascript functions to window for onclick handlers
    window.MainGame = {
      chooseStarter: (name) => {
        const starter = this.createMonsterInstance(name, 5);
        this.monstersTeam.push(starter);
        
        document.getElementById('starter-overlay').style.display = 'none';
        
        // Let the game start now!
        this.gameStarted = true;
        
        this.writeBattleLog(`你获得了初始伙伴 ${starter.fullName}！`);
        this.updateWorldHUD();
        this.spawnFloatingText(this.player.x, this.player.y, `获得了初始伙伴 ${name}! 🐰`, "#22c55e");
      },
      triggerBattleSwapMenu: () => {
        const swapBox = document.getElementById('bt-swap-grid-box');
        swapBox.innerHTML = '';
        
        this.monstersTeam.forEach((m, idx) => {
          const item = document.createElement('div');
          const isFainted = m.hp <= 0;
          const isActive = idx === this.battleState.playerActiveIdx;
          
          item.className = `bt-swap-item ${isFainted ? 'fainted' : ''}`;
          item.innerHTML = `
            <div style="font-size:32px">${m.icon}</div>
            <div style="flex:1">
              <strong>${m.fullName}</strong> ${isActive ? '<small style="color:#3b82f6">(战斗中)</small>' : ''}<br>
              <small>等级 ${m.level} / HP: ${m.hp}/${m.maxHp}</small>
            </div>
          `;
          
          if (!isFainted && !isActive) {
            item.onclick = () => this.switchBattleMonster(idx);
          }
          
          swapBox.appendChild(item);
        });
        
        document.getElementById('bt-swap-menu').style.display = 'flex';
      },
      triggerCatch: () => {
        this.throwPokeBall();
      },
      triggerRunAway: () => {
        this.runAway();
      },
      buyItem: (type, price) => {
        if (this.gold < price) {
          alert("金币不足！💰");
          return;
        }
        this.gold -= price;
        this.inventory[type]++;
        this.updateShopUI();
        this.updateWorldHUD();
      },
      closeShop: () => {
        document.getElementById('shop-overlay').style.display = 'none';
        this.inBattle = false; // resume map updates
      },
      usePotionOnMonster: (idx) => {
        if (this.inventory.potions <= 0) {
          alert("没有可用的全效伤药！");
          return;
        }
        const mon = this.monstersTeam[idx];
        if (mon.hp <= 0) {
          alert("全效伤药不能复活濒死的怪兽！请前往治疗泉。");
          return;
        }
        if (mon.hp >= mon.maxHp) {
          alert("该怪兽生命值已经是满的！");
          return;
        }
        
        this.inventory.potions--;
        mon.hp = Math.min(mon.maxHp, mon.hp + 50);
        
        // Refresh UI
        this.updateMonstersMenuUI();
        this.updateWorldHUD();
      },
      setFirstActive: (idx) => {
        if (idx === 0) return;
        if (this.monstersTeam[idx].hp <= 0) {
          alert("战败的怪兽不能作为首发！");
          return;
        }
        
        // Swap idx with 0
        const temp = this.monstersTeam[0];
        this.monstersTeam[0] = this.monstersTeam[idx];
        this.monstersTeam[idx] = temp;
        
        this.updateMonstersMenuUI();
      },
      resumeMap: () => {
        this.inBattle = false;
      }
    };
  }

  showStoryBanner(lines, duration = 3500, callback = null) {
    const existing = document.getElementById('story-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'story-banner';
    banner.style.cssText = `
      position:absolute; inset:0; z-index:100; display:flex; flex-direction:column;
      align-items:center; justify-content:center; pointer-events:none;
      background:rgba(0,0,0,0.72); font-family:'Segoe UI',monospace;
    `;
    banner.innerHTML = lines.map((l, i) =>
      `<div style="color:${i===0?'#fbbf24':'#e2e8f0'};font-size:${i===0?'20px':'15px'};
        font-weight:${i===0?'bold':'normal'};text-align:center;margin:4px 32px;
        text-shadow:0 0 12px rgba(251,191,36,0.6)">${l}</div>`
    ).join('');
    const gameContainer = document.querySelector('#game-container') || document.body;
    gameContainer.appendChild(banner);

    this.time.delayedCall(duration, () => {
      banner.style.transition = 'opacity 0.6s';
      banner.style.opacity = '0';
      this.time.delayedCall(600, () => { banner.remove(); if (callback) callback(); });
    });
  }

  showStarterSelect() {
    this.inBattle = true;
    this.showStoryBanner([
      '🌿 怪兽收集：像素物语',
      '一个充满奇妙怪兽的像素世界向你敞开大门。',
      '草地、洞窟、雪山……每一片土地都潜藏着传说中的伙伴。',
      '收集怪兽，磨砺羁绊，挑战道馆馆主，成为顶级大师！',
      '',
      '首先，选择你的初始伙伴——'
    ], 3000, () => {
      document.getElementById('starter-overlay').style.display = 'flex';
    });
  }

  openMonstersMenu() {
    this.inBattle = true;
    this.player.setVelocity(0);
    this.setPlayerIdleFrame();

    document.getElementById('map-monsters-overlay').style.display = 'flex';
    this.updateMonstersMenuUI();
  }

  updateMonstersMenuUI() {
    document.getElementById('menu-potion-cnt').textContent = this.inventory.potions;
    const box = document.getElementById('menu-monsters-list');
    box.innerHTML = '';

    this.monstersTeam.forEach((m, idx) => {
      const row = document.createElement('div');
      row.className = 'shop-item-row';
      row.style.background = '#1e293b';
      row.style.margin = '4px 0';
      row.style.padding = '8px 12px';
      
      const isFirst = idx === 0;
      const isFainted = m.hp <= 0;

      row.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px; flex:1; text-align:left">
          <div style="font-size:32px">${m.icon}</div>
          <div>
            <strong>${m.fullName}</strong> <small style="color:#a5f3fc">(Lv ${m.level})</small><br>
            <span style="font-size:10px; color:${isFainted ? '#ef4444' : '#22c55e'}">${isFainted ? '战败 😵' : `HP: ${m.hp}/${m.maxHp}`}</span>
          </div>
        </div>
        <div style="display:flex; gap:6px">
          <button class="opt-btn opt-purple" style="font-size:10px; padding:4px 8px" onclick="window.MainGame.usePotionOnMonster(${idx})" ${this.inventory.potions <= 0 || isFainted ? 'disabled' : ''}>💊 使用伤药</button>
          <button class="opt-btn" style="font-size:10px; padding:4px 8px; background:#10b981" onclick="window.MainGame.setFirstActive(${idx})" ${isFirst || isFainted ? 'disabled' : ''}>👑 设为首发出战</button>
        </div>
      `;
      box.appendChild(row);
    });
  }

  updateWorldHUD() {
    // Sync values with Global HUD overlay
    window.GameHUD?.setScore(this.monstersTeam.length); // Team size
    
    // Also sync the custom mini-HUD in Phaser
    if (this.goldText) this.goldText.setText(`金币: $${this.gold} 💰`);
    if (this.clockText) this.clockText.setText(`精灵球: ${this.inventory.balls} 🔴 | 伤药: ${this.inventory.potions} 💊`);
    if (this.questText) {
      this.questText.setText(`首发怪兽: ${this.monstersTeam[0] ? this.monstersTeam[0].fullName + ' (HP ' + this.monstersTeam[0].hp + '/' + this.monstersTeam[0].maxHp + ')' : '无'}`);
    }
  }

  spawnFloatingText(x, y, textString, color) {
    const text = this.add.text(x, y - 10, textString, {
      font: 'bold 12px monospace',
      fill: color,
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(DEPTH.EFFECTS);
    
    this.tweens.add({
      targets: text,
      y: y - 35,
      alpha: 0,
      duration: 1500,
      onComplete: () => text.destroy()
    });
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
