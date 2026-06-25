/* StarVanguard — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
  }


  preload() {
    // We generate pixel art textures programmatically in preload
    // 1. Player Ship Sprite (16x16)
    createPixelTexture(this, 'player_ship', [
      ".......WW.......",
      "......WBBW......",
      ".....WBBBBW.....",
      ".....WCWWCW.....",
      ".....WBBBBW.....",
      "....WBBBBBBW....",
      "...WBBBCBCBBW...",
      "..WBBBBBBBBBBW..",
      ".WBBWCCCCCCWBBW.",
      ".WBBWWWWWWWWBBW.",
      "WbBW........WbBW",
      "WbW..........WbW",
      ".W............W.",
      "..R..........R..",
      "..RY........YR..",
      "...Y........Y..."
    ], 3.2); // Sized to ~50x50px

    // 2. Large Asteroid (16x16)
    createPixelTexture(this, 'asteroid_large', [
      "......ssss......",
      "....ssssssSS....",
      "...ssskkkssSS...",
      "..ssskkkkkssSS..",
      ".ssskkkkkkkssSS.",
      ".ssskkkkkkkssSS.",
      "ssssskkkkkssssss",
      "sssssskkksssssss",
      "ssssssssssssssss",
      "ssssssssssssssss",
      "sssskkkKssssssss",
      ".ssskkkkkKsssss.",
      ".ssskkkkkKsssss.",
      "..ssskkkKsssss..",
      "....ssssssss....",
      "......ssss......"
    ], 3.8); // ~60x60px

    // 3. Small Asteroid (8x8)
    createPixelTexture(this, 'asteroid_small', [
      "..ssss..",
      ".ssssss.",
      "sskkksss",
      "sskkksss",
      "ssssssss",
      "sskkKsss",
      ".ssssss.",
      "..ssss.."
    ], 3.5); // ~30x30px

    // 4. Enemy Scout (16x16)
    createPixelTexture(this, 'enemy_scout', [
      ".......RR.......",
      "......WRRW......",
      ".....WRRRRW.....",
      ".....WYoYoW.....",
      ".....WRRRRW.....",
      "....WRRRRRRW....",
      "...WRRRYYYYRW...",
      "..WRRRRRRRRRRW..",
      ".WRRWkkkkkkWRRW.",
      ".WROWWWWWWWWORW.",
      "WoRW........WRoW",
      "WwW..........WwW",
      ".W............W.",
      "..P..........P..",
      "..PO........OP..",
      "...O........O..."
    ], 3.0); // ~48x48px

    // 5. Enemy Bomber (16x16)
    createPixelTexture(this, 'enemy_bomber', [
      "......GGGG......",
      "....WGGGGGGW....",
      "...WGGGGGGGGW...",
      "..WGGPWWWWPGGW..",
      "..WGGGGGGGGGGW..",
      ".WGGGGGGGGGGGGW.",
      "WGGGGGGGGGGGGGGW",
      "WGGYYGGGGGGYYGGW",
      "WGGWWGGGGGGWWGGW",
      "WGGW........WGGW",
      ".WW..........WW.",
      ".WW..........WW.",
      "..P..........P..",
      "..PR........RP..",
      "...R........R...",
      "................"
    ], 3.5); // ~56x56px

    // 6. Energy Crystal (8x8)
    createPixelTexture(this, 'crystal', [
      "...CC...",
      "..CCCC..",
      ".CCCCCC.",
      "CCCCCCCC",
      "CCCCCCCC",
      ".CCCCCC.",
      "..CCCC..",
      "...CC..."
    ], 2.8); // ~22x22px

    // 7. Normal Bullet (4x8)
    createPixelTexture(this, 'bullet_normal', [
      ".YY.",
      "YYYY",
      "YYYY",
      "YYYY",
      "YWWY",
      "YWWY",
      "YYYY",
      ".YY."
    ], 2.0);

    // 8. Enemy Bullet (6x6)
    createPixelTexture(this, 'bullet_enemy', [
      "..PP..",
      ".PPPP.",
      "PPPPPP",
      "PPPPPP",
      ".PPPP.",
      "..PP.."
    ], 2.2);

    // 9. Boss Core (32x32)
    createPixelTexture(this, 'boss_core', [
      "............WWWWWWWW............",
      "..........WWRRRRRRRRWW..........",
      "........WWRRRRRRRRRRRRWW........",
      "......WWRRRRRRRRRRRRRRRRWW......",
      "....WWRRRRRRkkkkkkkkRRRRRRWW....",
      "...WWRRRRRkkkkkkkkkkkkRRRRRWW...",
      "..WWRRRRRkkkkCCCCCCkkkkRRRRRWW..",
      ".WWRRRRRkkkkCCCCCCCCkkkkRRRRRWW.",
      "WWRRRRRkkkkCCCCCCCCCCkkkkRRRRRWW",
      "WWRRRRkkkkCCCCCCCCCCCCkkkkRRRRWW",
      "WWRRRkkkkCCCCCCCCCCCCCCkkkkRRRWW",
      "WWRRRkkkkCCCCCCWWCCCCCCkkkkRRRWW",
      "WWRRkkkkCCCCCCWWWWCCCCCCkkkkRRWW",
      "WWRRkkkkCCCCCCWWWWCCCCCCkkkkRRWW",
      "WWRRkkkkCCCCCCWWWWCCCCCCkkkkRRWW",
      "WWRRkkkkCCCCCCWWWWCCCCCCkkkkRRWW",
      "WWRRkkkkCCCCCCWWWWCCCCCCkkkkRRWW",
      "WWRRkkkkCCCCCCWWWWCCCCCCkkkkRRWW",
      "WWRRkkkkCCCCCCWWWWCCCCCCkkkkRRWW",
      "WWRRkkkkCCCCCCWWWWCCCCCCkkkkRRWW",
      "WWRRkkkkCCCCCCWWWWCCCCCCkkkkRRWW",
      "WWRRkkkkCCCCCCWWWWCCCCCCkkkkRRWW",
      "WWRRRkkkkCCCCCCWWCCCCCCkkkkRRRWW",
      "WWRRRkkkkCCCCCCCCCCCCCCkkkkRRRWW",
      "WWRRRRkkkkCCCCCCCCCCCCkkkkRRRRWW",
      "WWRRRRRkkkkCCCCCCCCCCkkkkRRRRRWW",
      "WWRRRRRRkkkkCCCCCCCCkkkkRRRRRRWW",
      ".WWRRRRRRkkkkCCCCCCkkkkRRRRRRWW.",
      "..WWRRRRRRkkkkkkkkkkkkRRRRRRWW..",
      "...WWRRRRRRRkkkkkkkkRRRRRRRWW...",
      ".....WWRRRRRRRRRRRRRRRRRRWW.....",
      ".......WWWWWWWWWWWWWWWWWW......."
    ], 3.8); // Large 120x120px core

    // 10. Boss Turret (16x16)
    createPixelTexture(this, 'boss_turret', [
      "......kkkk......",
      ".....kkRRkk.....",
      "....kkRRRRkk....",
      "....kkRRRRkk....",
      "....kkYYYYkk....",
      "....kkYYYYkk....",
      "....kkWWWWkk....",
      "...kkkkWWkkkk...",
      "..kkkkkkkkkkkk..",
      ".kkkkkkkkkkkkkk.",
      "kkkkkkkkkkkkkkkk",
      "kkkkkkkkkkkkkkkk",
      "kkkk..kkkk..kkkk",
      "kkkk..kkkk..kkkk",
      "kkkk..kkkk..kkkk",
      "................"
    ], 3.0); // ~48x48px
  }


  create() {
    this.cameras.main.setBackgroundColor('#0b0f19');

    // ── Stars Background (Parallax Effect) ──
    this.stars = [];
    const starColors = [0xffffff, 0x94a3b8, 0x38bdf8, 0xfef08a];
    
    // Slow starfield layer
    for (let i = 0; i < 40; i++) {
      let star = this.add.circle(
        Phaser.Math.Between(0, 800),
        Phaser.Math.Between(0, 600),
        Phaser.Math.Between(1, 2),
        Phaser.Utils.Array.GetRandom(starColors)
      );
      star.setDepth(DEPTH.STARFIELD_1);
      this.stars.push({ sprite: star, speed: Phaser.Math.Between(15, 30) });
    }

    // Fast starfield layer
    for (let i = 0; i < 20; i++) {
      let star = this.add.circle(
        Phaser.Math.Between(0, 800),
        Phaser.Math.Between(0, 600),
        Phaser.Math.Between(2, 3),
        0xffffff,
        0.8
      );
      star.setDepth(DEPTH.STARFIELD_2);
      this.stars.push({ sprite: star, speed: Phaser.Math.Between(45, 80) });
    }

    // Nebula dust patches
    this.nebulas = [];
    for (let i = 0; i < 3; i++) {
      let neb = this.add.graphics();
      neb.fillStyle(i === 0 ? 0x1e1b4b : i === 1 ? 0x311042 : 0x082f49, 0.25);
      neb.fillCircle(0, 0, Phaser.Math.Between(120, 200));
      neb.setDepth(DEPTH.BACKGROUND);
      neb.x = Phaser.Math.Between(0, 800);
      neb.y = Phaser.Math.Between(0, 600);
      this.nebulas.push({ sprite: neb, speed: 8 });
    }

    // ── Groups & Physics ──
    this.asteroids = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.crystals = this.physics.add.group();
    this.playerBullets = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();

    // ── Player Setup ──
    const spawnX = window.GAME_CONFIG?.player?.spawn?.x ?? 400;
    const spawnY = window.GAME_CONFIG?.player?.spawn?.y ?? 520;
    
    this.player = this.physics.add.sprite(spawnX, spawnY, 'player_ship');
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(DEPTH.PLAYER);
    this.player.body.setSize(36, 40); // tight hit box for dodging

    // Invincibility status
    this.playerHp = 3;
    this.crystalsCollected = 0;
    this.isInvincible = false;
    this.invincibleTimer = 0;
    
    // Weapon stats
    this.weaponLevel = 1;
    this.lastFired = 0;
    
    // Laser Beam Graphics object
    this.laserGraphics = this.add.graphics();
    this.laserGraphics.setDepth(DEPTH.LASER);
    this.laserHum = null;

    // ── Level System Slices ──
    this.currentLevel = 1;
    this.levelScore = 0; // Kills in the current level
    this.levelComplete = false;
    this.levelTransitionTimer = 0;

    // Level settings
    this.nextSpawnTime = 0;
    this.bossSpawned = false;
    
    // Boss objects (Level 3)
    this.boss = null;
    this.bossTurrets = [];
    this.bossShieldGraphics = this.add.graphics();
    this.bossShieldGraphics.setDepth(DEPTH.EFFECTS);
    this.bossShieldActive = true;
    this.bossShieldPulse = 0;
    this.bossPhase = 1; // 1 = Turrets alive, 2 = Core vulnerable, 3 = Core low HP laser sweep
    this.bossLaserSweepAngle = 0;
    this.bossLaserDir = 1;
    this.bossLaserActive = false;
    this.bossLaserWarning = false;
    this.bossLaserWarningTimer = 0;
    this.bossHealthBar = this.add.graphics().setDepth(DEPTH.HUD_OVERLAY);
    
    // ── Colliders & Overlaps ──
    this.physics.add.overlap(this.playerBullets, this.asteroids, this.hitAsteroid, null, this);
    this.physics.add.overlap(this.playerBullets, this.enemies, this.hitEnemy, null, this);
    this.physics.add.overlap(this.player, this.asteroids, this.playerHit, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.playerHit, null, this);
    this.physics.add.overlap(this.player, this.enemyBullets, this.playerHit, null, this);
    this.physics.add.overlap(this.player, this.crystals, this.collectCrystal, null, this);

    // ── Keyboard Controls ──
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyBomb = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X); // Screen-clear bomb

    // Auto-fire is enabled by default to allow players to focus on left-right steering
    this.autoFire = true;

    // Smart bombs — independent emergency resource (does not consume weapon crystals)
    this.bombs = 3;

    // Screen Flash overlay for damage/boss
    this.flashOverlay = this.add.graphics();
    this.flashOverlay.setDepth(DEPTH.HUD_OVERLAY + 10);

    // ── GameHUD Integration ──
    this.gameStarted = false;
    this.gameOverTriggered = false;

    if (window.GameHUD) {
      window.GameHUD.onStart(() => {
        this.gameStarted = true;
        sounds.init();
        window.GameHUD.setHearts(this.playerHp, 3);
        window.GameHUD.setScore(0);
        window.GameHUD.setObjective("第一关：冲出陨石风暴带！ (摧毁15颗陨石)");
      });
    } else {
      this.gameStarted = true;
    }

    // Make screen flash red on init to prompt user action
    this.cameras.main.flash(500, 0, 10, 30);

    // ── game-playtest 探针（俯视射击：自动开火，bot 只需走位闪避）──
    window.__probe = () => {
      const pl = this.player;
      if (!pl || !pl.body) return null;
      const W = this.scale.width, H = this.scale.height;
      const threats = [];
      const add = grp => grp && grp.getChildren().forEach(o => { if (o.active) threats.push(o); });
      add(this.asteroids); add(this.enemies); add(this.enemyBullets);
      let mx = 0, my = 0;
      for (const o of threats) {
        const dx = pl.x - o.x, dy = pl.y - o.y, d = Math.hypot(dx, dy) || 1;
        if (d < 170) { const w = (170 - d) / 170; mx += (dx / d) * w; my += (dy / d) * w; }
      }
      // 水平对齐最近敌机/陨石，让直射 autofire 打得中（不对齐就永远清不掉敌人）
      let aim = null, ad = 1e9;
      const aimGrp = (this.enemies && this.enemies.countActive(true)) ? this.enemies : this.asteroids;
      aimGrp && aimGrp.getChildren().forEach(o => { if (o.active && o.y < pl.y) { const d = Math.abs(o.x - pl.x); if (d < ad) { ad = d; aim = o; } } });
      if (aim) mx += Math.max(-0.7, Math.min(0.7, (aim.x - pl.x) / 120));
      // 留在屏幕下半区，远离边界
      my += (H * 0.72 - pl.y) / H * 0.6;
      const m = 60;
      if (pl.x < m) mx += 1; if (pl.x > W - m) mx -= 1;
      if (pl.y < m) my += 1; if (pl.y > H - m) my -= 1;
      const L = Math.hypot(mx, my); if (L > 0.05) { mx /= L; my /= L; } else { mx = my = 0; }
      const bhp = this.boss ? (this.boss.hp ?? this.boss.getData?.('hp') ?? 0) : 0;
      this._bossMaxHp = Math.max(this._bossMaxHp || 0, bhp);
      const prog = (this.bossSpawned ? 100000 : 0) + (this.levelScore || 0) * 2000
        + (this.crystalsCollected || 0) * 100 + (this._bossMaxHp ? (this._bossMaxHp - bhp) * 80 : 0);
      this._prog = Math.max(this._prog || 0, prog);
      const danger = threats.some(o => Math.hypot(pl.x - o.x, pl.y - o.y) < 70);
      return {
        x: pl.x, y: pl.y, vx: pl.body.velocity.x, onGround: true,
        hp: this.playerHp, maxHp: 3, score: this._prog, goalScore: 1e9,
        act: this.bossSpawned ? 3 : 1, deaths: 0, deathBudget: 1,
        won: !!this._won, lost: !!this._lost,
        cardActive: false, started: this.gameStarted,
        nextGoalX: pl.x, worldW: W, cellX: W,
        moveX: mx, moveY: my, attack: false,
        dangerNow: danger, dangerAhead: danger,
      };
    };
  }


  update(time, delta) {
    if (!this.gameStarted || this.gameOverTriggered) {
      if (this.laserHum) {
        this.stopLaserHum();
      }
      this.laserGraphics.clear();
      return;
    }

    // ── Update Starfields & Nebulas ──
    this.stars.forEach(star => {
      star.sprite.y += star.speed * (delta / 1000);
      if (star.sprite.y > 600) {
        star.sprite.y = -10;
        star.sprite.x = Phaser.Math.Between(0, 800);
      }
    });

    this.nebulas.forEach(neb => {
      neb.sprite.y += neb.speed * (delta / 1000);
      if (neb.sprite.y > 750) {
        neb.sprite.y = -150;
        neb.sprite.x = Phaser.Math.Between(0, 800);
      }
    });

    // ── Player Movement (Left/Right Constrained) ──
    const speed = window.GAME_CONFIG?.player?.speed ?? 400;
    this.player.setVelocityX(0);

    if (this.cursors.left.isDown || this.keyA.isDown) {
      this.player.setVelocityX(-speed);
      this.player.setAngle(-12); // tilt effect
    } else if (this.cursors.right.isDown || this.keyD.isDown) {
      this.player.setVelocityX(speed);
      this.player.setAngle(12);
    } else {
      this.player.setAngle(0);
    }

    // Keep within bounds manually for tight response
    if (this.player.x < 30) this.player.x = 30;
    if (this.player.x > 770) this.player.x = 770;

    // ── Weapon Handling (Auto/Manual) ──
    const isShooting = this.autoFire || this.cursors.space.isDown || this.keySpace.isDown || this.input.activePointer.isDown;
    this.handleShooting(time, isShooting);

    // ── Smart Bomb (X) ──
    if (Phaser.Input.Keyboard.JustDown(this.keyBomb)) {
      this.useBomb();
    }

    // ── Invincibility Flash Timer ──
    if (this.isInvincible) {
      this.invincibleTimer -= delta;
      const pulse = Math.floor(time / 80) % 2;
      this.player.setVisible(pulse === 0);

      if (this.invincibleTimer <= 0) {
        this.isInvincible = false;
        this.player.setVisible(true);
      }
    }

    // ── Level Spawners & State Machine ──
    if (!this.levelComplete) {
      this.handleSpawning(time);
    } else {
      this.levelTransitionTimer -= delta;
      if (this.levelTransitionTimer <= 0) {
        this.transitionToNextLevel();
      }
    }

    // ── Level 3 Boss Logic ──
    if (this.currentLevel === 3 && this.bossSpawned) {
      this.updateBoss(time, delta);
    }

    // ── Clean Up Out-Of-Bounds Bullets & Entities ──
    this.playerBullets.getChildren().forEach(bullet => {
      if (bullet.y < -20) bullet.destroy();
    });
    this.enemyBullets.getChildren().forEach(bullet => {
      if (bullet.y > 620) bullet.destroy();
    });
    this.asteroids.getChildren().forEach(ast => {
      if (ast.y > 630) ast.destroy();
    });
    this.enemies.getChildren().forEach(enemy => {
      if (enemy.y > 630) enemy.destroy();
    });
    this.crystals.getChildren().forEach(c => {
      if (c.y > 620) c.destroy();
    });
  }
}
