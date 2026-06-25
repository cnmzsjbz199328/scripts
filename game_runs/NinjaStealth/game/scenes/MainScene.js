/* NinjaStealth — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
  }


  preload() {
    console.log('Preloading NinjaStealth assets...');

    // Load tile images from index
    const tileIndex = window.TILEMAP_DATA.tileIndex;
    Object.keys(tileIndex).forEach(id => {
      const name = tileIndex[id];
      this.load.image(`tile_${id}`, `assets/tiles/${name}.png`);
    });

    // Load character sheets
    this.load.json('ninja_meta', 'assets/sprites/NinjaKage.json');
    this.load.spritesheet('ninja_sheet', 'assets/sprites/NinjaKage.webp', {
      frameWidth: 192,
      frameHeight: 208
    });

    this.load.json('guard_meta', 'assets/sprites/SamuraiGuard.json');
    this.load.spritesheet('guard_sheet', 'assets/sprites/SamuraiGuard.webp', {
      frameWidth: 192,
      frameHeight: 208
    });

    // Load items
    this.load.spritesheet('scroll', 'assets/objects/scroll.webp', {
      frameWidth: 128,
      frameHeight: 128
    });
    this.load.spritesheet('smoke_bomb', 'assets/objects/smoke_bomb.webp', {
      frameWidth: 128,
      frameHeight: 128
    });
    this.load.spritesheet('smoke_cloud', 'assets/objects/smoke_cloud.webp', {
      frameWidth: 128,
      frameHeight: 128
    });
  }


  create() {
    console.log('Creating NinjaStealth scene...');

    // 1. Create Animations
    this.createCharAnimations('NinjaKage', 'ninja_meta', 'ninja_sheet');
    this.createCharAnimations('SamuraiGuard', 'guard_meta', 'guard_sheet');

    this.anims.create({
      key: 'scroll_float',
      frames: this.anims.generateFrameNumbers('scroll', { start: 0, end: 5 }),
      frameRate: 8,
      repeat: -1
    });

    this.anims.create({
      key: 'smoke_bomb_float',
      frames: this.anims.generateFrameNumbers('smoke_bomb', { start: 0, end: 5 }),
      frameRate: 8,
      repeat: -1
    });

    this.anims.create({
      key: 'smoke_puff',
      frames: this.anims.generateFrameNumbers('smoke_cloud', { start: 0, end: 5 }),
      frameRate: 12,
      repeat: 0
    });

    // 2. Initialize Groups
    this.collidables = this.physics.add.staticGroup();
    this.ysortGroup = this.add.group();
    this.scrolls = this.physics.add.group();
    this.smokeBombPickups = this.physics.add.group();
    this.smokeClouds = this.physics.add.group();
    this.guards = this.physics.add.group();

    // 3. Gameplay Stats
    this.playerHp = 3;
    this.score = 0;
    this.currentLevel = 1;
    this.levelScrolls = 0;
    this.smokeBombs = 3; // Start with 3 smoke bombs
    this.isInvincible = false;
    this.invincibilityTimer = 0;
    this.isPlayerAttacking = false;

    // 4. Input Setup
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
      J: Phaser.Input.Keyboard.KeyCodes.J,
      K: Phaser.Input.Keyboard.KeyCodes.K,
      X: Phaser.Input.Keyboard.KeyCodes.X,
      SHIFT: Phaser.Input.Keyboard.KeyCodes.SHIFT
    });
    this.isSneaking = false;

    // 5. Setup Vision graphics overlay
    this.visionGraphics = this.add.graphics().setDepth(DEPTH.YSORT - 50);

    // 6. Spawn Player
    const spawn = window.GAME_CONFIG.player.spawn;
    this.player = this.physics.add.sprite(spawn.x, spawn.y, 'ninja_sheet');
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(48, 48);
    this.player.body.setOffset(72, 110);
    this.player.setDepth(DEPTH.YSORT + this.player.y);
    this.ysortGroup.add(this.player);

    // 7. Load Level 1 Map and entities
    this.loadLevel(1);

    // Collisions
    this.physics.add.collider(this.player, this.collidables);
    this.physics.add.collider(this.guards, this.collidables);
    this.physics.add.collider(this.guards, this.guards);

    this.physics.add.overlap(this.player, this.scrolls, this.collectScroll, null, this);
    this.physics.add.overlap(this.player, this.smokeBombPickups, this.collectSmokeBomb, null, this);

    // Camera follow
    this.cameras.main.setBounds(0, 0, window.GAME_CONFIG.map.width, window.GAME_CONFIG.map.height);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // HUD Communication
    this.gameStarted = false;
    if (window.GameHUD) {
      window.GameHUD.onStart(() => {
        this.showNarrativeBanner([
          '🥷 暗影刺客 — 任务简报',
          '幕府时代。夜幕已降，行动开始。',
          '邪恶将军夺走了三份机密情报卷轴，',
          '藏于城堡庭院、敌营仓库和将军御所三处。',
          '以暗影之名，一一取回，不得被发现……',
        ], 3500, () => {
          this.gameStarted = true;
          sfx.play('win_level');
        });
      });
      window.GameHUD.setHearts(this.playerHp, 3);
      window.GameHUD.setScore(this.score);
    } else {
      this.gameStarted = true;
    }

    // ── game-playtest 探针（俯视潜入：集齐3卷轴→奔出口，强避守卫，贴身刺杀）──
    window.__probe = () => {
      const pl = this.player;
      if (!pl || !pl.body) return null;
      const scrolls = this.scrolls.getChildren().filter(s => s.active);
      let tx, ty;
      if ((this.levelScrolls || 0) < 3 && scrolls.length) {
        let b = null, bd = 1e9; for (const s of scrolls) { const d = Math.hypot(s.x - pl.x, s.y - pl.y); if (d < bd) { bd = d; b = s; } } tx = b.x; ty = b.y;
      } else if (this.exitPos) { tx = this.exitPos.x; ty = this.exitPos.y; }
      let mx = 0, my = 0, dist = 9999;
      if (tx !== undefined) { const dx = tx - pl.x, dy = ty - pl.y; dist = Math.hypot(dx, dy) || 1; mx = dx / dist; my = dy / dist; }
      let gnear = 1e9;
      this.guards.getChildren().forEach(g => { if (!g.active) return; const dx = pl.x - g.x, dy = pl.y - g.y, d = Math.hypot(dx, dy) || 1; gnear = Math.min(gnear, d); if (d < 160) { const w = (160 - d) / 160 * 2.2; mx += dx / d * w; my += dy / d * w; } });
      const L = Math.hypot(mx, my); if (L > 0.05) { mx /= L; my /= L; } else { mx = my = 0; }
      const base = (this.currentLevel - 1) * 3000 + (this.levelScrolls || 0) * 600 + (1000 - Math.min(1000, dist));
      this._prog = Math.max(this._prog || 0, base);
      return {
        x: pl.x, y: pl.y, vx: pl.body.velocity.x, onGround: true,
        hp: this.playerHp, maxHp: 3, score: this._prog, goalScore: 9000,
        act: this.currentLevel, deaths: 0, deathBudget: 1,
        won: !!this._won, lost: !!this._lost,
        cardActive: false, started: this.gameStarted,
        nextGoalX: tx !== undefined ? tx : pl.x, worldW: 99999, cellX: 99999,
        moveX: mx, moveY: my, attack: gnear < 46,
        dangerNow: gnear < 90, dangerAhead: gnear < 140,
      };
    };
  }


  update(time, delta) {
    if (!this.gameStarted || this.playerHp <= 0) return;

    // Sneak (crouch) mode — slower but harder to detect. Tint gives feedback.
    this.isSneaking = this.keys.SHIFT.isDown;
    if (!this.isInvincible) {
      if (this.isSneaking) this.player.setTint(0x6688cc);
      else this.player.clearTint();
    }

    // Update invincibility flash
    if (this.isInvincible) {
      this.invincibilityTimer -= delta;
      if (time % 8 < 4) {
        this.player.setAlpha(0.2);
      } else {
        this.player.setAlpha(0.9);
      }
      if (this.invincibilityTimer <= 0) {
        this.isInvincible = false;
        this.player.setAlpha(1.0);
      }
    }

    // Exit portal pulse rendering
    this.drawExitPortal();

    // Check level clear transition
    if (this.levelScrolls === 3) {
      const distToExit = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.exitPos.x, this.exitPos.y);
      if (distToExit < 60) {
        this.completeLevel();
      }
    }

    // 1. Player Attack/Behind Assassination logic
    if ((Phaser.Input.Keyboard.JustDown(this.keys.SPACE) || Phaser.Input.Keyboard.JustDown(this.keys.J)) && !this.isPlayerAttacking) {
      this.executeAssassination();
    }

    // 2. Player Smoke Bomb throw logic
    if (Phaser.Input.Keyboard.JustDown(this.keys.K) || Phaser.Input.Keyboard.JustDown(this.keys.X)) {
      this.throwSmokeBomb();
    }

    // 3. Player Movement
    if (!this.isPlayerAttacking) {
      this.handlePlayerMovement();
    }

    // 4. Update Guards
    this.visionGraphics.clear();
    this.guards.getChildren().forEach(g => {
      this.updateGuard(g, delta);
    });

    // 5. Y-Sorting depth updates
    this.player.setDepth(DEPTH.YSORT + this.player.y);
    this.guards.getChildren().forEach(g => {
      g.setDepth(DEPTH.YSORT + g.y);
      // reposition floating alert icons above heads
      g.alertIcon.setPosition(g.x, g.y - 70);
    });
  }
}
