/* RaccoonDungeon — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
  }


  init() {
    // Game state
    this.currentLevel = 1;
    this.playerHp = 5;
    this.maxHp = 5;
    this.enemiesKilled = 0;
    this.totalEnemiesInLevel = 0;
    this.portalActive = false;
    this.bossDefeated = false;
    this.healingCooldown = 0;
    this.magicCooldown = 0;
    this.dashCooldown = 0;
    this.isDashing = false;
    this.isTransitioning = false;
    
    // Player status
    this.facingDirection = 'down'; // 'down', 'up', 'left', 'right'
  }


  preload() {
    // 1. Load tiles dynamically from tileIndex
    for (const key in TILEMAP_DATA.tileIndex) {
      const name = TILEMAP_DATA.tileIndex[key];
      this.load.image(`tile_${key}`, `assets/tiles/${name}.png`);
    }

    // 2. Load characters spritesheets
    this.load.spritesheet('raccoon_sheet', 'assets/sprites/RaccoonMage.webp', {
      frameWidth: 192,
      frameHeight: 208
    });
    this.load.spritesheet('slime_sheet', 'assets/sprites/Slime.webp', {
      frameWidth: 192,
      frameHeight: 208
    });
    this.load.spritesheet('gargoyle_sheet', 'assets/sprites/Gargoyle.webp', {
      frameWidth: 192,
      frameHeight: 208
    });
    this.load.spritesheet('dragon_sheet', 'assets/sprites/BossDragon.webp', {
      frameWidth: 192,
      frameHeight: 208
    });

    // 3. Load chest spritesheet
    this.load.spritesheet('chest_sheet', 'assets/objects/chest.webp', {
      frameWidth: 128,
      frameHeight: 128
    });
  }


  create() {
    this.DEPTH = DEPTH;
    this.mapW = GAME_CONFIG.map.width;
    this.mapH = GAME_CONFIG.map.height;
    this.tileW = GAME_CONFIG.map.tileWidth;
    this.tileH = GAME_CONFIG.map.tileHeight;

    // Build Physics Groups
    this.ysortGroup = this.add.group();
    this.obstaclesGroup = this.physics.add.staticGroup();
    this.enemiesGroup = this.physics.add.group();
    this.projectilesGroup = this.physics.add.group();
    this.trapsGroup = this.physics.add.staticGroup();
    this.chestsGroup = this.physics.add.staticGroup();
    this.portalGroup = this.physics.add.staticGroup();

    // Create Animations
    this.createAnimations();

    // Initialize Game state UI hooks
    this.gameStarted = false;
    if (window.GameHUD) {
      window.GameHUD.onStart(() => {
        this.gameStarted = true;
        // Set initial HUD
        window.GameHUD.setHearts(this.playerHp, this.maxHp);
        window.GameHUD.setScore(this.currentLevel);
        window.GameHUD.setObjective("消灭本层所有怪物以开启传送门！");
      });
    } else {
      this.gameStarted = true;
    }

    // Generate Level Map
    this.generateLevel(this.currentLevel);

    // Create inputs
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    this.keyJ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J); // Melee
    this.keyK = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K); // Magic Fireball
    this.keyL = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L); // Healing
    this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E); // Interact
    this.keyShift = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT); // Dodge roll

    // Camera
    this.cameras.main.setBounds(0, 0, this.mapW, this.mapH);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.0);

    // Colliders
    this.physics.add.collider(this.player, this.obstaclesGroup);
    this.physics.add.collider(this.enemiesGroup, this.obstaclesGroup);
    this.physics.add.collider(this.enemiesGroup, this.enemiesGroup);
    
    // Projectiles overlaps
    this.physics.add.overlap(this.projectilesGroup, this.enemiesGroup, this.handleProjectileEnemyOverlap, null, this);
    this.physics.add.overlap(this.projectilesGroup, this.obstaclesGroup, this.handleProjectileObstacleOverlap, null, this);

    // Traps overlap
    this.physics.add.overlap(this.player, this.trapsGroup, this.handlePlayerTrapOverlap, null, this);
    
    // Portal overlap
    this.physics.add.overlap(this.player, this.portalGroup, this.handlePlayerPortalOverlap, null, this);

    // Screen Flash Overlay (Red for damage, green for healing)
    this.flashOverlay = this.add.rectangle(0, 0, this.sys.game.config.width, this.sys.game.config.height, 0xff0000)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(DEPTH.EFFECTS + 100)
      .setAlpha(0);

    // Floor Display Text Banner
    this.showFloorBanner(`第 ${this.currentLevel} 层：${this.getFloorName(this.currentLevel)}`);

    // ── game-playtest 探针（俯视：朝最近敌人/激活传送门移动 + 近战）──
    window.__probe = () => {
      const pl = this.player;
      if (!pl || !pl.body) return null;
      const enemies = this.enemiesGroup.getChildren().filter(e => e.active);
      let tx, ty, atk = false;
      if (enemies.length) {
        let best = null, bd = 1e9;
        for (const e of enemies) { const d = Math.hypot(e.x - pl.x, e.y - pl.y); if (d < bd) { bd = d; best = e; } }
        tx = best.x; ty = best.y; atk = bd < 95;            // 近战范围 80，进 95 就开砍（持续朝敌人保持朝向）
      } else if (this.portalActive) {
        const p = this.portalGroup.getChildren()[0];
        if (p) { tx = p.x; ty = p.y; }
      }
      let mx = 0, my = 0, dist = 9999;
      if (tx !== undefined) { const dx = tx - pl.x, dy = ty - pl.y; dist = Math.hypot(dx, dy) || 1; mx = dx / dist; my = dy / dist; }
      // 单调递增进度：关卡基线 + 击杀 + 接近目标（避免跨房间赶路被误判卡死）
      const base = (this.currentLevel - 1) * 5000 + this.enemiesKilled * 300 + (1200 - Math.min(1200, dist));
      this._prog = Math.max(this._prog || 0, base);
      const score = this._prog;
      return {
        x: pl.x, y: pl.y, vx: pl.body.velocity.x, onGround: true,
        hp: this.playerHp, maxHp: this.maxHp, score, goalScore: 5000,
        act: this.currentLevel, deaths: 0, deathBudget: 1,
        won: !!this._won, lost: !!this._lost,
        cardActive: false, started: this.gameStarted,
        nextGoalX: tx !== undefined ? tx : pl.x, worldW: 99999, cellX: 99999,
        moveX: mx, moveY: my, attack: atk,
        dangerNow: false, dangerAhead: false,
      };
    };
  }


  update(time, delta) {
    if (!this.gameStarted || this.playerHp <= 0 || this.isTransitioning) {
      if (this.player && this.player.body) this.player.body.setVelocity(0);
      return;
    }

    // 1. Handle Cooldowns
    if (this.healingCooldown > 0) this.healingCooldown -= delta;
    if (this.magicCooldown > 0) this.magicCooldown -= delta;
    if (this.dashCooldown > 0) this.dashCooldown -= delta;

    // 2. Handle Player Input and Movement
    this.handlePlayerMovement();

    // 3. Handle Player Skills
    this.handlePlayerSkills();

    // 4. Update Depth Sorting (Y-Sort)
    this.player.setDepth(DEPTH.YSORT + this.player.y);
    this.ysortGroup.getChildren().forEach(sprite => {
      sprite.setDepth(DEPTH.YSORT + sprite.y);
    });

    // 5. Update Enemies AI
    this.updateEnemies();
  }
}
