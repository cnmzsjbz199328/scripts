/* NeonTowerDefense — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
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
    this.keyX = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X); // Sell/dismantle turret

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
}
