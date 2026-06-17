/**
 * NeonTowerDefense - Core Game Logic File
 * Handles top-down action controls, grid mechanics, waves, tower building, and maps.
 * Integrates visual upgrades, shields, overclock buffs, and lightning.
 */

// Depth settings matching SKILL.md specs
const DEPTH = {
  GROUND:      0,
  DECOR_FLOOR: 100,
  YSORT:       1000,
  DECOR_TOP:   9000,
  EFFECTS:     9500,
};

class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
  }

  init() {
    // Stage configurations
    this.currentLevel = 1;
    this.maxLevel = 3;
    this.gameStarted = false;
    this.bossDefeated = false;
    this.gameCleared = false;

    // Game stats
    this.hearts = 3;
    this.score = 60; // Start with 60 crystals to build first Laser Turret
    this.scoreGoal = 300;
    this.scoreLabel = '能量水晶';

    // Wave status
    this.currentWave = 1;
    this.maxWaves = 3;
    this.waveActive = false;
    this.enemiesSpawned = 0;
    this.totalEnemiesInWave = 0;
    this.waveTimer = null;

    // Buff states
    this.isOverclocked = false;
    this.overclockUntil = 0;

    // Grid details
    this.gridW = 20;
    this.gridH = 15;
    this.tileW = 64;
    this.tileH = 64;

    // Level-specific configurations
    // 0 = Path, 1 = Buildable Ground, 2 = Cyber Wall (Obstacle)
    this.levelMaps = {
      1: {
        themeColor: 0x00ffff, // Blue
        grid: [
          [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
          [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
          [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
          [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,2],
          [2,2,2,2,2,1,2,2,2,2,2,1,2,2,2,0,1,1,1,2],
          [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,2],
          [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,2],
          [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,2],
          [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,2],
          [2,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,2],
          [2,1,1,0,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2],
          [2,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
          [2,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2]
        ],
        waypoints: [
          { x: -32, y: 4.5 * 64 },
          { x: 15.5 * 64, y: 4.5 * 64 },
          { x: 15.5 * 64, y: 10.5 * 64 },
          { x: 3.5 * 64, y: 10.5 * 64 },
          { x: 3.5 * 64, y: 13.5 * 64 },
          { x: 20.5 * 64, y: 13.5 * 64 }
        ],
        spawnPoint: { x: -32, y: 4.5 * 64 },
        corePoint: { x: 19.5 * 64, y: 13.5 * 64 },
        playerSpawn: { x: 640, y: 480 }
      },
      2: {
        themeColor: 0x10b981, // Emerald Green
        grid: [
          [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
          [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
          [0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,2],
          [2,2,2,2,2,2,0,1,1,1,1,1,1,1,1,1,1,1,1,2],
          [2,1,1,1,1,2,0,1,1,1,1,0,0,0,0,0,0,0,0,2],
          [2,1,1,1,1,2,0,1,1,1,1,0,2,2,2,2,2,2,0,2],
          [2,1,1,1,1,2,0,1,1,1,1,0,2,1,1,1,1,2,0,2],
          [2,1,1,1,1,2,0,1,1,1,1,0,2,1,1,1,1,2,0,2],
          [2,1,1,1,1,2,0,1,1,1,1,0,2,1,1,1,1,2,0,2],
          [2,1,1,1,1,2,0,1,1,1,1,0,2,1,1,1,1,2,0,2],
          [2,1,1,1,1,2,0,1,1,1,1,0,2,1,1,1,1,2,0,2],
          [2,1,1,1,1,2,0,1,1,1,1,0,2,1,1,1,1,2,0,2],
          [2,1,1,1,1,2,0,0,0,0,0,0,2,1,1,1,1,2,0,2],
          [2,1,1,1,1,2,2,2,2,2,2,2,2,1,1,1,1,2,0,2],
          [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,0,2]
        ],
        waypoints: [
          { x: -32, y: 2.5 * 64 },
          { x: 6.5 * 64, y: 2.5 * 64 },
          { x: 6.5 * 64, y: 12.5 * 64 },
          { x: 11.5 * 64, y: 12.5 * 64 },
          { x: 11.5 * 64, y: 4.5 * 64 },
          { x: 18.5 * 64, y: 4.5 * 64 },
          { x: 18.5 * 64, y: 15.5 * 64 }
        ],
        spawnPoint: { x: -32, y: 2.5 * 64 },
        corePoint: { x: 18.5 * 64, y: 14.5 * 64 },
        playerSpawn: { x: 300, y: 480 }
      },
      3: {
        themeColor: 0xec4899, // Magenta / Pink Warning
        grid: [
          [2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
          [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
          [2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2],
          [0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0],
          [2,2,2,2,2,2,2,2,0,1,1,0,2,2,2,2,2,2,2,2],
          [2,1,1,1,1,1,1,2,0,1,1,0,2,1,1,1,1,1,1,2],
          [2,1,1,1,1,1,1,2,0,1,1,0,2,1,1,1,1,1,1,2],
          [2,1,1,1,1,1,1,2,0,1,1,0,2,1,1,1,1,1,1,2],
          [2,1,1,1,1,1,1,2,0,1,1,0,2,1,1,1,1,1,1,2],
          [2,1,1,1,1,1,1,2,0,1,1,0,2,1,1,1,1,1,1,2],
          [2,1,1,1,1,1,1,2,0,0,0,0,2,1,1,1,1,1,1,2],
          [2,1,1,1,1,1,1,2,2,0,0,2,2,1,1,1,1,1,1,2],
          [2,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,2],
          [2,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,2],
          [2,2,2,2,2,2,2,2,2,0,0,2,2,2,2,2,2,2,2,2]
        ],
        waypointsA: [
          { x: -32, y: 3.5 * 64 },
          { x: 8.5 * 64, y: 3.5 * 64 },
          { x: 8.5 * 64, y: 10.5 * 64 },
          { x: 9.5 * 64, y: 10.5 * 64 },
          { x: 9.5 * 64, y: 15.5 * 64 }
        ],
        waypointsB: [
          { x: 20.5 * 64, y: 3.5 * 64 },
          { x: 11.5 * 64, y: 3.5 * 64 },
          { x: 11.5 * 64, y: 10.5 * 64 },
          { x: 10.5 * 64, y: 10.5 * 64 },
          { x: 10.5 * 64, y: 15.5 * 64 }
        ],
        spawnPointA: { x: -32, y: 3.5 * 64 },
        spawnPointB: { x: 20.5 * 64, y: 3.5 * 64 },
        corePoint: { x: 10.0 * 64, y: 14.0 * 64 },
        playerSpawn: { x: 640, y: 480 }
      }
    };
  }

  preload() {
    // 1. Load tiles
    this.load.image('tile_cyber_grid_blue', 'assets/tiles/cyber_grid_blue.png');
    this.load.image('tile_cyber_grid_green', 'assets/tiles/cyber_grid_green.png');
    this.load.image('tile_cyber_grid_pink', 'assets/tiles/cyber_grid_pink.png');
    this.load.image('tile_cyber_wall', 'assets/tiles/cyber_wall.png');

    // 2. Load characters (using custom spritesheets)
    this.load.spritesheet('MechGuard', 'assets/sprites/MechGuard.webp', { frameWidth: 96, frameHeight: 96 });
    this.load.spritesheet('VirusRed', 'assets/sprites/VirusRed.webp', { frameWidth: 96, frameHeight: 96 });
    this.load.spritesheet('SuperTrojan', 'assets/sprites/SuperTrojan.webp', { frameWidth: 96, frameHeight: 96 });

    // 3. Load objects
    this.load.spritesheet('laser_turret', 'assets/objects/laser_turret.webp', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('plasma_turret', 'assets/objects/plasma_turret.webp', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('energy_crystal', 'assets/objects/energy_crystal.webp', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('core_database', 'assets/objects/core_database.webp', { frameWidth: 64, frameHeight: 64 });

    // 4. Load Visual Upgrade & VFX Spritesheets
    this.load.spritesheet('upgrade_burst_laser', 'assets/objects/upgrade_burst_laser.webp', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('upgrade_burst_plasma', 'assets/objects/upgrade_burst_plasma.webp', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('range_ring', 'assets/objects/range_ring.webp', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('firerate_gear', 'assets/objects/firerate_gear.webp', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('crystal_burst', 'assets/objects/crystal_burst.webp', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('core_shield', 'assets/objects/core_shield.webp', { frameWidth: 96, frameHeight: 96 });
    this.load.spritesheet('chain_lightning', 'assets/objects/chain_lightning.webp', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('wave_alert', 'assets/objects/wave_alert.webp', { frameWidth: 128, frameHeight: 32 });
  }

  create() {
    this.gameStarted = false;

    // Groups
    this.ysortGroup = this.add.group();
    this.collidables = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group();
    this.crystals = this.physics.add.group();
    this.turrets = this.physics.add.group();
    this.plasmaProjectiles = this.physics.add.group();

    // Laser FX Layer
    this.laserGraphics = this.add.graphics();
    this.laserGraphics.setDepth(DEPTH.EFFECTS);

    // Setup animations
    this.createAnimations();

    // Spawn player
    this.player = this.physics.add.sprite(640, 480, 'MechGuard');
    this.player.setOrigin(0.5, 0.8);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(36, 36);
    this.player.body.setOffset(30, 44);
    this.player.setDepth(DEPTH.YSORT + this.player.y);
    this.ysortGroup.add(this.player);

    // Setup input keys
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    });

    this.keyJ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J); // Build Laser Turret
    this.keyK = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K); // Build Plasma Turret
    this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E); // Upgrade Turret
    this.keyZ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z); // Chain Lightning Attack
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE); // Overclock speed buff

    // Overlaps & Collisions
    this.physics.add.collider(this.player, this.collidables);
    this.physics.add.overlap(this.player, this.crystals, this.collectCrystal, null, this);
    this.physics.add.overlap(this.plasmaProjectiles, this.enemies, this.hitPlasma, null, this);

    // Camera
    this.cameras.main.setBounds(0, 0, 1280, 960);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Load Level 1 initially
    this.loadLevel(1);

    // Game HUD Communication
    if (window.GameHUD) {
      window.GameHUD.onStart(() => {
        this.gameStarted = true;
        this.startLevelWaves();
      });
    }

    // Set initial HUD
    window.GameHUD?.setHearts(this.hearts, 3);
    window.GameHUD?.setScore(this.score);
    window.GameHUD?.setDay(this.currentLevel);
  }

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
  }

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
  }

  startLevelWaves() {
    this.time.delayedCall(2000, () => {
      this.startWave();
    });
  }

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
  }

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

  update() {
    if (!this.gameStarted) return;

    // 1. Player actions
    this.handlePlayerMovement();
    this.handleBuildingControls();
    this.handleUpgradeInteract();
    this.handlePowerups();

    // 2. Enemy path logic
    this.handleEnemyMovement();

    // 3. Turret auto-targeting & firing
    this.handleTurrets();

    // 4. Update depths
    this.player.setDepth(DEPTH.YSORT + this.player.y);
    this.ysortGroup.getChildren().forEach(ent => {
      ent.setDepth(DEPTH.YSORT + ent.y);
    });

    // 5. Crystal magnet: auto-attract & collect within range
    this.crystals.getChildren().forEach(c => {
      if (this.time.now > c.expiryTime) {
        c.destroy();
        return;
      }
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x, c.y);
      if (dist < 96 && c.active) {
        this.collectCrystal(this.player, c);
      } else if (dist < 220) {
        const angle = Phaser.Math.Angle.Between(c.x, c.y, this.player.x, this.player.y);
        c.setVelocity(Math.cos(angle) * 160, Math.sin(angle) * 160);
      } else {
        c.setVelocity(0, 0);
      }
    });

    // 6. Check Win/Lose states
    this.checkWinLose();
  }

  handlePlayerMovement() {
    let vx = 0;
    let vy = 0;
    const speed = this.isOverclocked ? 340 : 220;

    if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -speed;
    else if (this.cursors.right.isDown || this.wasd.right.isDown) vx = speed;

    if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -speed;
    else if (this.cursors.down.isDown || this.wasd.down.isDown) vy = speed;

    this.player.setVelocity(vx, vy);

    if (vx !== 0 || vy !== 0) {
      if (this.player.anims.currentAnim?.key !== 'player_walk' || !this.player.anims.isPlaying) {
        this.player.play('player_walk');
      }
      // Flip left/right (Walk frame faces right)
      if (vx < 0) this.player.setFlipX(true);
      else if (vx > 0) this.player.setFlipX(false);
    } else {
      if (this.player.anims.currentAnim?.key !== 'player_idle' && this.player.anims.currentAnim?.key !== 'player_build' && this.player.anims.currentAnim?.key !== 'player_shoot') {
        this.player.play('player_idle');
      }
    }
  }

  handleBuildingControls() {
    // Grid alignment
    const col = Math.floor(this.player.x / this.tileW);
    const row = Math.floor(this.player.y / this.tileH);

    // Press J: Build Laser Turret (Cost: 50)
    if (Phaser.Input.Keyboard.JustDown(this.keyJ)) {
      this.attemptBuild('laser_turret', 50, col, row);
    }

    // Press K: Build Plasma Turret (Cost: 80)
    if (Phaser.Input.Keyboard.JustDown(this.keyK)) {
      this.attemptBuild('plasma_turret', 80, col, row);
    }
  }

  attemptBuild(type, cost, col, row) {
    if (col < 0 || col >= this.gridW || row < 0 || row >= this.gridH) return;

    const mapConfig = this.levelMaps[this.currentLevel];
    const cellType = mapConfig.grid[row][col];

    if (cellType !== 1) {
      this.spawnFloatingText(this.player.x, this.player.y - 40, '此处无法建造 🚫', '#ef4444');
      return;
    }

    if (this.score < cost) {
      this.spawnFloatingText(this.player.x, this.player.y - 40, '能量水晶不足 🔋', '#fbbf24');
      return;
    }

    let spotOccupied = false;
    this.turrets.getChildren().forEach(t => {
      if (t.gridX === col && t.gridY === row) {
        spotOccupied = true;
      }
    });

    if (spotOccupied) {
      this.spawnFloatingText(this.player.x, this.player.y - 40, '已有防御建筑 🚫', '#ef4444');
      return;
    }

    this.score -= cost;
    window.GameHUD?.setScore(this.score);

    this.player.play('player_build', true);
    this.cameras.main.shake(100, 0.005);

    const px = col * this.tileW + this.tileW / 2;
    const py = row * this.tileH + this.tileH / 2;

    const turret = this.turrets.create(px, py, type);
    turret.setOrigin(0.5, 0.75);
    turret.gridX = col;
    turret.gridY = row;
    turret.type = type;
    turret.tier = 1;
    turret.range = type === 'laser_turret' ? 220 : 180;
    turret.damage = type === 'laser_turret' ? 7 : 12;
    turret.fireRate = type === 'laser_turret' ? 300 : 850;
    turret.lastFired = 0;
    turret.setDepth(DEPTH.YSORT + py);
    this.ysortGroup.add(turret);

    // Play base anim
    turret.play(type === 'laser_turret' ? 'anim_laser' : 'anim_plasma');

    this.spawnFloatingText(px, py - 32, `-${cost} 💎 建造成功`, '#00ff66');
  }

  handleUpgradeInteract() {
    // Press E to upgrade closest turret
    if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
      let closestTurret = null;
      let minDist = 80; // interactive distance

      this.turrets.getChildren().forEach(t => {
        const dx = t.x - this.player.x;
        const dy = t.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          closestTurret = t;
        }
      });

      if (closestTurret) {
        this.attemptUpgrade(closestTurret);
      } else {
        this.spawnFloatingText(this.player.x, this.player.y - 40, '附近没有可升级的防御塔', '#cbd5e1');
      }
    }
  }

  attemptUpgrade(t) {
    if (t.tier >= 2) {
      this.spawnFloatingText(t.x, t.y - 40, '已达到最大等级 🛡️', '#38bdf8');
      return;
    }

    // Costs: Laser T2 = 80, Plasma T2 = 120
    const cost = t.type === 'laser_turret' ? 80 : 120;
    if (this.score < cost) {
      this.spawnFloatingText(this.player.x, this.player.y - 40, `升级需要 ${cost} 💎 能量不足!`, '#fbbf24');
      return;
    }

    this.score -= cost;
    window.GameHUD?.setScore(this.score);

    t.tier = 2;

    // Upgrade Stats
    if (t.type === 'laser_turret') {
      t.range = 300;
      t.damage = 16;
      t.fireRate = 200; // faster laser overloading
      t.setTint(0x00e5ff); // Cyan tint for upgraded laser

      // Play laser upgrade burst (Effect 1)
      const burst = this.add.sprite(t.x, t.y - 10, 'upgrade_burst_laser');
      burst.setDepth(DEPTH.EFFECTS);
      burst.play('anim_upgrade_laser');
      burst.once('animationcomplete', () => burst.destroy());
      
      this.spawnFloatingText(t.x, t.y - 48, 'LASER OVERLOAD! ⚡💎', '#00e5ff');
    } else {
      t.range = 240;
      t.damage = 28;
      t.fireRate = 550; // faster plasma storm
      t.setTint(0xa78bfa); // Violet tint for upgraded plasma

      // Play plasma upgrade burst (Effect 2)
      const burst = this.add.sprite(t.x, t.y - 10, 'upgrade_burst_plasma');
      burst.setDepth(DEPTH.EFFECTS);
      burst.play('anim_upgrade_plasma');
      burst.once('animationcomplete', () => burst.destroy());

      this.spawnFloatingText(t.x, t.y - 48, 'PLASMA STORM! 🌀💎', '#a78bfa');
    }

    // Play Range Indicator Ring (Effect 3)
    const rangeRing = this.add.sprite(t.x, t.y - 12, 'range_ring');
    rangeRing.setDepth(DEPTH.EFFECTS);
    // scale to match custom range
    rangeRing.setDisplaySize(t.range * 2, t.range * 2);
    rangeRing.play('anim_range_ring');
    this.tweens.add({
      targets: rangeRing,
      alpha: 0,
      delay: 1000,
      duration: 500,
      onComplete: () => rangeRing.destroy()
    });

    this.cameras.main.shake(150, 0.008);
  }

  handlePowerups() {
    // 1. Press SPACE: Activate Overclock speed boost (Cost: 50) (Effect 4)
    if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
      const cost = 50;
      if (this.score < cost) {
        this.spawnFloatingText(this.player.x, this.player.y - 40, `超频需要 ${cost} 💎 能量不足!`, '#fbbf24');
        return;
      }

      if (this.isOverclocked) {
        this.spawnFloatingText(this.player.x, this.player.y - 40, '系统已处于超频状态! ⚡', '#fbbf24');
        return;
      }

      this.score -= cost;
      window.GameHUD?.setScore(this.score);

      this.isOverclocked = true;
      this.overclockUntil = this.time.now + 6000; // 6s duration

      this.spawnFloatingText(this.player.x, this.player.y - 64, 'SYSTEM OVERCLOCK! ⚡🔥', '#fbbf24');
      this.cameras.main.shake(200, 0.012);

      // Create Gear VFX sprites floating over all turrets
      this.gearSprites = [];
      this.turrets.getChildren().forEach(t => {
        const gear = this.add.sprite(t.x, t.y - 42, 'firerate_gear');
        gear.setDepth(DEPTH.EFFECTS);
        gear.setDisplaySize(32, 32);
        gear.play('anim_gear');
        this.gearSprites.push(gear);
      });
    }

    // Handle Overclock timer cleanup
    if (this.isOverclocked && this.time.now > this.overclockUntil) {
      this.isOverclocked = false;
      this.spawnFloatingText(this.player.x, this.player.y - 64, '超频状态结束', '#cbd5e1');
      if (this.gearSprites) {
        this.gearSprites.forEach(g => g.destroy());
        this.gearSprites = [];
      }
    }

    // 2. Press Z: Chain Lightning Arc Attack (Cost: 15) (Effect 7)
    if (Phaser.Input.Keyboard.JustDown(this.keyZ)) {
      const cost = 15;
      if (this.score < cost) {
        this.spawnFloatingText(this.player.x, this.player.y - 40, `闪电需要 ${cost} 💎 能量不足!`, '#fbbf24');
        return;
      }

      // Find closest virus to player
      let target = null;
      let minDist = 300;

      this.enemies.getChildren().forEach(e => {
        if (e.isDead) return;
        const dx = e.x - this.player.x;
        const dy = e.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          target = e;
        }
      });

      if (target) {
        this.score -= cost;
        window.GameHUD?.setScore(this.score);
        this.player.play('player_shoot', true);
        this.triggerChainLightning(target);
      } else {
        this.spawnFloatingText(this.player.x, this.player.y - 40, '范围无敌方程序 🚫', '#cbd5e1');
      }
    }
  }

  triggerChainLightning(firstTarget) {
    this.spawnFloatingText(this.player.x, this.player.y - 64, 'CHAIN LIGHTNING! ⚡', '#f59e0b');
    
    // Jump list
    const targets = [firstTarget];
    let current = firstTarget;

    // Search for 2 more jumps
    for (let j = 0; j < 2; j++) {
      let nextTarget = null;
      let minDist = 200;

      this.enemies.getChildren().forEach(e => {
        if (e.isDead || targets.includes(e)) return;
        const dx = e.x - current.x;
        const dy = e.y - current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          nextTarget = e;
        }
      });

      if (nextTarget) {
        targets.push(nextTarget);
        current = nextTarget;
      } else {
        break;
      }
    }

    // Render lightning bolt overlays connecting jumps
    let startPoint = { x: this.player.x, y: this.player.y - 16 };
    targets.forEach((t, idx) => {
      const bolt = this.add.sprite(startPoint.x, startPoint.y, 'chain_lightning');
      bolt.setDepth(DEPTH.EFFECTS);
      bolt.setOrigin(0, 0.5);
      
      // Calculate angle and scale to reach target
      const dx = t.x - startPoint.x;
      const dy = (t.y - 16) - startPoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      bolt.setRotation(angle);
      bolt.setDisplaySize(dist, 16);
      bolt.play('anim_lightning');

      // Lightning damage
      t.health -= 20; // deals 20 chain lightning damage
      this.spawnSparks(t.x, t.y - 15, 0xfbbf24);

      if (t.health <= 0) {
        this.time.delayedCall(150 * idx, () => this.killEnemy(t));
      } else {
        t.play('virus_hit', true);
      }

      // Chain delay destroy
      this.time.delayedCall(300, () => {
        bolt.destroy();
      });

      startPoint = { x: t.x, y: t.y - 16 };
    });

    this.cameras.main.shake(150, 0.015);
  }

  handleEnemyMovement() {
    this.enemies.getChildren().forEach(e => {
      if (e.isDead) return;

      const wp = e.waypoints[e.waypointIdx];
      if (!wp) {
        this.damageCore(e);
        return;
      }

      const dx = wp.x - e.x;
      const dy = wp.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 4) {
        e.waypointIdx++;
      } else {
        const speed = e.isSlowed ? e.speed * 0.45 : e.speed;
        const vx = (dx / dist) * speed;
        const vy = (dy / dist) * speed;
        e.setVelocity(vx, vy);

        if (vx < 0) e.setFlipX(true);
        else if (vx > 0) e.setFlipX(false);
      }

      this.drawEnemyHealthBar(e);

      // Handle slows timing
      if (e.isSlowed && this.time.now > e.slowUntil) {
        e.isSlowed = false;
        if (e.isFast) e.setTint(0x00ff66);
        else if (e.isBoss) e.clearTint();
        else e.setTint(0xff3333);
      }
    });
  }

  drawEnemyHealthBar(e) {
    if (!e.healthBar) return;
    const bar = e.healthBar;
    bar.clear();
    const bw = 36;
    const bh = 4;
    const bx = e.x - bw / 2;
    const by = e.y - 28;
    const pct = Math.max(0, e.health / e.maxHealth);
    bar.fillStyle(0x000000, 0.6);
    bar.fillRect(bx, by, bw, bh);
    const color = pct > 0.5 ? 0x00ff66 : pct > 0.25 ? 0xffaa00 : 0xff3333;
    bar.fillStyle(color, 1);
    bar.fillRect(bx, by, bw * pct, bh);
    bar.setDepth(DEPTH.EFFECTS);
  }

  damageCore(enemy) {
    const damage = enemy.isBoss ? 2.0 : 0.5;
    this.hearts = Math.max(0, this.hearts - damage);
    window.GameHUD?.setHearts(Math.round(this.hearts * 2) / 2, 3);

    // Play Hexagon Shield flash pulse (Effect 6)
    const shield = this.add.sprite(this.coreStation.x, this.coreStation.y - 12, 'core_shield');
    shield.setDepth(DEPTH.EFFECTS);
    shield.setScale(1.35);
    shield.play('anim_shield');
    shield.once('animationcomplete', () => shield.destroy());

    // FX Screen shake
    this.cameras.main.shake(200, 0.02);
    this.cameras.main.flash(100, 255, 0, 0);

    enemy.healthBar.destroy();
    enemy.destroy();

    this.spawnFloatingText(this.coreStation.x, this.coreStation.y - 48, `数据库核心受损!`, '#ef4444');
  }

  handleTurrets() {
    this.laserGraphics.clear();
    const time = this.time.now;

    this.turrets.getChildren().forEach(t => {
      let target = null;
      let minDist = t.range;

      this.enemies.getChildren().forEach(e => {
        if (e.isDead || e.x < 0 || e.x > 1280) return;
        const dx = e.x - t.x;
        const dy = e.y - t.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < minDist) {
          minDist = dist;
          target = e;
        }
      });

      if (target) {
        // Adjust fire rate if system is overclocked (Effect 4)
        const currentFireRate = this.isOverclocked ? t.fireRate * 0.5 : t.fireRate;

        if (time - t.lastFired > currentFireRate) {
          t.lastFired = time;

          if (t.type === 'laser_turret') {
            this.fireLaser(t, target);
          } else {
            this.firePlasma(t, target);
          }
        }
      }
    });
  }

  fireLaser(turret, target) {
    target.health -= turret.damage;
    this.spawnSparks(target.x, target.y - 15, 0x00ffff);

    // Upgraded laser color is Cyan, Tier 1 is Darker Blue
    const laserCol = turret.tier === 2 ? 0x00ffff : 0x3b82f6;

    this.laserGraphics.lineStyle(turret.tier === 2 ? 5 : 3, laserCol, 0.85);
    this.laserGraphics.beginPath();
    this.laserGraphics.moveTo(turret.x, turret.y - 20);
    this.laserGraphics.lineTo(target.x, target.y - 16);
    this.laserGraphics.strokePath();

    this.laserGraphics.lineStyle(2, 0xffffff, 1.0); // hot white center core
    this.laserGraphics.beginPath();
    this.laserGraphics.moveTo(turret.x, turret.y - 20);
    this.laserGraphics.lineTo(target.x, target.y - 16);
    this.laserGraphics.strokePath();

    this.time.delayedCall(100, () => {
      this.laserGraphics.clear();
    });

    if (target.health <= 0) {
      this.killEnemy(target);
    } else {
      target.play('virus_hit', true);
    }
  }

  firePlasma(turret, target) {
    const proj = this.plasmaProjectiles.create(turret.x, turret.y - 20, 'energy_crystal');
    proj.setDisplaySize(turret.tier === 2 ? 22 : 16, turret.tier === 2 ? 22 : 16);
    // Green tint for Tier 1, Purple tint for Tier 2 upgraded plasma storm
    const tintColor = turret.tier === 2 ? 0xa78bfa : 0x10b981;
    proj.setTint(tintColor);
    proj.damage = turret.damage;
    proj.tier = turret.tier;

    const dx = target.x - turret.x;
    const dy = (target.y - 16) - (turret.y - 20);
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = turret.tier === 2 ? 400 : 300;

    proj.setVelocity((dx / dist) * speed, (dy / dist) * speed);
  }

  hitPlasma(proj, enemy) {
    proj.destroy();
    if (enemy.isDead) return;

    enemy.health -= proj.damage;

    // Apply slow state (Tier 2 plasma slows by 65%, Tier 1 slows by 45%)
    enemy.isSlowed = true;
    const slowLength = proj.tier === 2 ? 3500 : 2500;
    enemy.slowUntil = this.time.now + slowLength;
    
    const slowColor = proj.tier === 2 ? 0xa78bfa : 0x06b6d4; // purple or cyan tint
    enemy.setTint(slowColor);

    this.spawnSparks(enemy.x, enemy.y - 15, proj.tier === 2 ? 0xa78bfa : 0x10b981);

    if (enemy.health <= 0) {
      this.killEnemy(enemy);
    } else {
      enemy.play('virus_hit', true);
    }
  }

  killEnemy(enemy) {
    if (enemy.isDead) return;
    enemy.isDead = true;
    enemy.setVelocity(0, 0);

    enemy.healthBar.destroy();

    // Drop energy crystal
    const crystal = this.crystals.create(enemy.x, enemy.y - 10, 'energy_crystal');
    crystal.play('anim_crystal');
    crystal.setDisplaySize(32, 32);
    crystal.setDepth(DEPTH.YSORT + crystal.y);
    this.ysortGroup.add(crystal);

    // Pulse crystal
    this.tweens.add({
      targets: crystal,
      y: crystal.y - 8,
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    crystal.expiryTime = this.time.now + 8000;

    // Explosion animation
    enemy.play(enemy.isBoss ? 'boss_die' : 'virus_die');
    enemy.once('animationcomplete', () => {
      enemy.destroy();
    });

    if (enemy.isBoss) {
      this.bossDefeated = true;
      this.spawnFloatingText(enemy.x, enemy.y - 64, '木马清除成功！系统安全！', '#00ff66');
    }
  }

  collectCrystal(player, crystal) {
    if (!crystal.active) return;
    const cx = crystal.x;
    const cy = crystal.y;
    crystal.destroy();
    
    // Play Gold Diamond collect burst (Effect 5)
    const burst = this.add.sprite(cx, cy, 'crystal_burst');
    burst.setDepth(DEPTH.EFFECTS);
    burst.setScale(1.2);
    burst.play('anim_crystal_burst');
    burst.once('animationcomplete', () => burst.destroy());

    const gain = 10;
    this.score += gain;
    window.GameHUD?.setScore(this.score);

    this.spawnFloatingText(player.x, player.y - 48, `+10 💎`, '#fbbf24');
  }

  checkWinLose() {
    if (this.hearts <= 0) {
      this.triggerGameOver(false, "核心被攻破，数据库系统彻底崩溃！💻💾");
      return;
    }

    if (this.waveActive && this.enemiesSpawned >= this.totalEnemiesInWave && this.enemies.countActive() === 0) {
      this.waveActive = false;

      if (this.currentWave < this.maxWaves) {
        const nextWave = this.currentWave + 1;
        const waveWarnings = {
          2: `⚠ 波次 ${nextWave} 来袭：病毒已进化！快速病毒单元检测到接近中……`,
          3: this.currentLevel === 3
            ? `🔴 终极威胁：超级木马首领即将登场！全力防守！`
            : `⚠ 波次 ${nextWave} 来袭：木马程序全面渗透——加强防线！`
        };
        this.currentWave++;
        const warning = waveWarnings[this.currentWave] || `波次清理完毕！新波次将在 4 秒内抵达！`;
        window.GameHUD?.setObjective(warning);
        this.spawnFloatingText(640, 400, `安全检测：波次 ${this.currentWave - 1} 清理完成`, '#00ff66');
        this.time.delayedCall(4000, () => {
          this.startWave();
        });
      } else {
        this.handleLevelCleared();
      }
    }
  }

  showCyberBanner(lines, duration = 3000) {
    const existing = document.getElementById('cyber-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'cyber-banner';
    banner.style.cssText = `
      position:absolute; left:50%; transform:translateX(-50%); top:15%;
      z-index:100; pointer-events:none; text-align:center;
      background:rgba(0,10,30,0.88); border:1px solid #00ffff;
      border-radius:8px; padding:14px 28px; font-family:'Courier New',monospace;
      box-shadow:0 0 18px rgba(0,255,255,0.3);
    `;
    banner.innerHTML = lines.map((l, i) =>
      `<div style="color:${i===0?'#00ffff':'#a5f3fc'};font-size:${i===0?'16px':'12px'};
        font-weight:${i===0?'bold':'normal'};margin:2px 0;
        text-shadow:0 0 8px rgba(0,255,255,0.8)">${l}</div>`
    ).join('');
    const gameContainer = document.querySelector('#game-container') || document.body;
    gameContainer.appendChild(banner);

    this.time.delayedCall(duration, () => {
      banner.style.transition = 'opacity 0.5s';
      banner.style.opacity = '0';
      this.time.delayedCall(500, () => banner.remove());
    });
  }

  handleLevelCleared() {
    if (this.currentLevel < this.maxLevel) {
      const nextZone = this.currentLevel === 1 ? '内存缓冲区' : '数据库神殿';
      this.showCyberBanner([
        `✅ 防区净化成功！`,
        `进入下一防区：【${nextZone}】`,
        `病毒已溯源——根除核心木马，才能彻底安全！`
      ], 3000);
      this.currentLevel++;
      this.spawnFloatingText(640, 400, `网关净化成功！解锁下一防区`, '#00ff66');
      this.loadLevel(this.currentLevel);
      this.startLevelWaves();
    } else {
      if (this.bossDefeated) {
        this.gameCleared = true;
        this.triggerGameOver(true,
          '🏆 赛博核心已净化！\n\n' +
          '安全防御机甲以光速清除了所有病毒波次，\n' +
          '超级木马首领也在最终决战中被彻底摧毁。\n\n' +
          '整个数字世界重新回到了稳定运行状态，\n赛博网络的守护者赢得了终极战线的胜利！\n\n' +
          '>> 系统状态：安全 | 威胁等级：零 | 防护：完整 <<'
        );
      }
    }
  }

  triggerGameOver(isWin, endingText) {
    this.gameStarted = false;
    this.player.setVelocity(0, 0);

    if (this.waveTimer) { this.waveTimer.destroy(); this.waveTimer = null; }

    window.GameHUD?.showGameOver(isWin, endingText);
  }

  spawnSparks(x, y, color) {
    const graphics = this.add.graphics({ x: x, y: y });
    graphics.setDepth(DEPTH.EFFECTS);
    graphics.lineStyle(2.5, color, 1.0);

    graphics.beginPath();
    graphics.moveTo(-10, 0);
    graphics.lineTo(10, 0);
    graphics.moveTo(0, -10);
    graphics.lineTo(0, 10);
    graphics.strokePath();

    this.tweens.add({
      targets: graphics,
      scaleX: 2.0,
      scaleY: 2.0,
      alpha: 0,
      duration: 220,
      onComplete: () => graphics.destroy()
    });
  }

  spawnFloatingText(x, y, textString, color) {
    const text = this.add.text(x, y, textString, {
      font: 'bold 14px Courier',
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
}

const config = {
  type: Phaser.AUTO,
  width: 960,
  height: 576,
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
