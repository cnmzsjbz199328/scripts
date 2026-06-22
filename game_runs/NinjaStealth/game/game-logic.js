/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Depth constants according to specifications
const DEPTH = {
  GROUND:      0,
  DECOR_FLOOR: 100,
  YSORT:       1000,   // objects + entities share this pool: DEPTH.YSORT + y
  DECOR_TOP:   9000,
  EFFECTS:     9500,
};

// Retro Web Audio Sound Effects Synthesizer
class SoundEffects {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  play(type) {
    this.init();
    if (!this.ctx || this.ctx.state === 'suspended') {
      // Web Audio requires user interaction to resume
      this.ctx?.resume();
    }
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      const now = this.ctx.currentTime;

      if (type === 'scroll') {
        // Double-beep chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.setValueAtTime(987.77, now + 0.08); // B5
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'smoke_throw') {
        // Pitch drop swoosh
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(250, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'smoke_explode') {
        // Low pitch blast
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.35);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'slash') {
        // Sword slash swoosh
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'alert') {
        // Alarm beep
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, now); // A5
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'damage') {
        // Crunch sound
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.linearRampToValueAtTime(30, now + 0.25);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'win_level') {
        // Ascending chime
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, index) => {
          const oscNode = this.ctx.createOscillator();
          const gainNode = this.ctx.createGain();
          oscNode.type = 'sine';
          oscNode.frequency.setValueAtTime(freq, now + index * 0.1);
          gainNode.gain.setValueAtTime(0.08, now + index * 0.1);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + index * 0.1 + 0.3);
          oscNode.connect(gainNode);
          gainNode.connect(this.ctx.destination);
          oscNode.start(now + index * 0.1);
          oscNode.stop(now + index * 0.1 + 0.3);
        });
      }
    } catch (e) {
      console.warn('AudioContext play error:', e);
    }
  }
}

const sfx = new SoundEffects();

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

  // Small non-blocking toast for item pickups — does not dim the screen or pause gameplay
  showPickupToast(lines, duration = 1800) {
    const existing = document.getElementById('ninja-pickup-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'ninja-pickup-toast';
    toast.style.cssText = `
      position:absolute; bottom:80px; left:50%; transform:translateX(-50%);
      z-index:100; padding:10px 24px; pointer-events:none;
      background:rgba(0,0,0,0.72); border:1px solid #f59e0b;
      border-radius:6px; font-family:'Courier New',monospace; text-align:center;
    `;
    toast.innerHTML = lines.map((l, i) =>
      `<div style="color:${i===0?'#f59e0b':'#e2e8f0'};font-size:${i===0?'15px':'12px'};
        font-weight:${i===0?'bold':'normal'};margin:2px 0;
        text-shadow:0 0 8px rgba(245,158,11,0.6);letter-spacing:1px">${l}</div>`
    ).join('');
    const gameContainer = document.querySelector('#game-container') || document.body;
    gameContainer.appendChild(toast);

    this.time.delayedCall(duration, () => {
      toast.style.transition = 'opacity 0.4s';
      toast.style.opacity = '0';
      this.time.delayedCall(400, () => toast.remove());
    });
  }

  showNarrativeBanner(lines, duration = 3000, callback = null) {
    const existing = document.getElementById('ninja-narration');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'ninja-narration';
    banner.style.cssText = `
      position:absolute; inset:0; z-index:100; display:flex; flex-direction:column;
      align-items:center; justify-content:center; pointer-events:none;
      background:rgba(0,0,0,0.80); font-family:'Courier New',monospace;
    `;
    banner.innerHTML = lines.map((l, i) =>
      `<div style="color:${i===0?'#f59e0b':'#e2e8f0'};font-size:${i===0?'19px':'14px'};
        font-weight:${i===0?'bold':'normal'};text-align:center;margin:3px 40px;
        text-shadow:0 0 10px rgba(245,158,11,0.7);letter-spacing:1px">${l}</div>`
    ).join('');
    const gameContainer = document.querySelector('#game-container') || document.body;
    gameContainer.appendChild(banner);

    this.time.delayedCall(duration, () => {
      banner.style.transition = 'opacity 0.5s';
      banner.style.opacity = '0';
      this.time.delayedCall(500, () => { banner.remove(); if (callback) callback(); });
    });
  }

  createCharAnimations(charName, metaKey, sheetKey) {
    const meta = this.cache.json.get(metaKey);
    if (!meta || !meta.animations) return;

    Object.keys(meta.animations).forEach(key => {
      const animData = meta.animations[key];
      const frames = this.anims.generateFrameNumbers(sheetKey, {
        start: animData.row * 9,
        end: animData.row * 9 + animData.frameCount - 1
      });
      const phaserKey = `${charName}_${key.replace('-', '_')}`;
      this.anims.create({
        key: phaserKey,
        frames: frames,
        frameRate: animData.fps,
        repeat: animData.loop ? -1 : 0
      });
    });
  }

  loadLevel(levelNum) {
    console.log(`Loading level: ${levelNum}...`);
    this.currentLevel = levelNum;
    this.levelScrolls = 0;

    // Reset items and enemies from previous level
    this.scrolls.clear(true, true);
    this.smokeBombPickups.clear(true, true);
    this.guards.clear(true, true);
    this.collidables.clear(true, true);
    this.ysortGroup.clear();
    this.ysortGroup.add(this.player);

    if (this.exitPortal) {
      this.exitPortal.destroy();
      this.exitPortal = null;
    }

    // Get active level datasets
    const levelMapData = window.TILEMAP_DATA.levels[levelNum - 1];
    const levelEntitiesData = window.ENTITIES_DATA.levels[levelNum - 1];

    if (!levelMapData || !levelEntitiesData) {
      console.error(`Missing level dataset for level: ${levelNum}`);
      return;
    }

    this.currentLevelLayers = levelMapData.layers;

    // Set player position to spawn point
    this.player.setPosition(levelEntitiesData.playerSpawn.x, levelEntitiesData.playerSpawn.y);

    // Render Tile layers
    this.renderTileLayer('ground', DEPTH.GROUND, levelMapData.layers.ground);
    this.renderTileLayer('decor_floor', DEPTH.DECOR_FLOOR, levelMapData.layers.decor_floor);
    
    // Objects layer has collisions and Y-sort
    this.ysortObjects = this.renderTileLayer('objects', DEPTH.YSORT, levelMapData.layers.objects, true);
    
    this.renderTileLayer('decor_top', DEPTH.DECOR_TOP, levelMapData.layers.decor_top);

    // Exit portal drawing (spinning magical circle at exit position)
    this.exitPos = levelEntitiesData.exit;
    this.exitPortal = this.add.graphics().setDepth(DEPTH.GROUND + 10);
    this.exitPulseAngle = 0;

    // Spawn Scrolls
    levelEntitiesData.scrolls.forEach(s => {
      const scroll = this.scrolls.create(s.x, s.y, 'scroll');
      scroll.body.setSize(48, 48);
      scroll.body.setOffset(40, 40);
      scroll.play('scroll_float');
      scroll.setDepth(DEPTH.YSORT + s.y);
      this.ysortGroup.add(scroll);
    });

    // Spawn Smoke bomb items
    levelEntitiesData.smokeBombs.forEach(b => {
      const bomb = this.smokeBombPickups.create(b.x, b.y, 'smoke_bomb');
      bomb.body.setSize(48, 48);
      bomb.body.setOffset(40, 40);
      bomb.play('smoke_bomb_float');
      bomb.setDepth(DEPTH.YSORT + b.y);
      this.ysortGroup.add(bomb);
    });

    // Spawn Guards
    levelEntitiesData.guards.forEach(g => {
      const guard = this.guards.create(g.spawn.x, g.spawn.y, 'guard_sheet');
      guard.id = g.id;
      guard.body.setSize(48, 48);
      guard.body.setOffset(72, 110);
      guard.patrolPath = g.patrol;
      guard.patrolIndex = 0;
      guard.facingAngle = 0; // angle in radians
      guard.state = 'patrol'; // states: patrol, alert, combat
      guard.alertTimer = 0;
      guard.detectionProgress = 0; // goes from 0 to 100
      guard.setDepth(DEPTH.YSORT + guard.y);
      guard.play('SamuraiGuard_idle');
      
      // Floating alert indicator symbol (! / ?)
      guard.alertIcon = this.add.text(guard.x, guard.y - 80, '', {
        fontSize: '24px',
        fontStyle: 'bold',
        fill: '#ff0000',
        stroke: '#000000',
        strokeThickness: 3
      }).setOrigin(0.5).setDepth(DEPTH.EFFECTS);

      this.ysortGroup.add(guard);
    });

    // Update HUD
    window.GameHUD?.setObjective(levelEntitiesData.objective);
    this.updateHUDText();
  }

  renderTileLayer(layerName, baseDepth, data, isObjectsLayer = false) {
    if (!data) return [];
    const sprites = [];
    const W = window.TILEMAP_DATA.width;
    const TW = window.TILEMAP_DATA.tileWidth;
    const TH = window.TILEMAP_DATA.tileHeight;

    data.forEach((id, i) => {
      if (id === 0) return;
      const x = (i % W) * TW + TW / 2;
      const y = Math.floor(i / W) * TH + TH / 2;
      const sp = this.add.image(x, y, `tile_${id}`).setDisplaySize(TW, TH);
      
      sp.setDepth(isObjectsLayer ? DEPTH.YSORT + y : baseDepth);

      const tileName = window.TILEMAP_DATA.tileIndex[id];
      // Generate static physical colliders for solid obstacles
      if (isObjectsLayer && tileName) {
        const blocksCollisions = tileName.includes('wall') || tileName.includes('crate') || tileName.includes('barrel') || tileName.includes('bush') || tileName.includes('lantern');
        if (blocksCollisions) {
          this.physics.add.existing(sp, true);
          this.collidables.add(sp);
        }
      }
      if (isObjectsLayer) sprites.push(sp);
    });
    return sprites;
  }

  updateHUDText() {
    const levelName = window.ENTITIES_DATA.levels[this.currentLevel - 1].name;
    window.GameHUD?.setObjective(`${levelName} | 卷轴: ${this.levelScrolls}/3 | 烟雾弹: ${this.smokeBombs}`);
  }

  collectScroll(player, scroll) {
    scroll.destroy();
    this.levelScrolls++;
    this.score++;
    sfx.play('scroll');
    window.GameHUD?.setScore(this.score);
    this.updateHUDText();

    const scrollTexts = {
      1: ['📜 情报卷轴 获取！', '卷轴一：将军的兵力部署图。', '看，伏兵就藏在这里……'],
      2: ['📜 情报卷轴 获取！', '卷轴二：密道入口坐标。', '这将成为撤离时的生命线。'],
      3: ['📜 情报卷轴 获取！', '卷轴三：将军的真实身份文书。', '这将是推翻其统治的关键证据！']
    };
    const text = scrollTexts[this.levelScrolls];
    if (text) {
      this.showPickupToast(text, 1800);
    }

    // Spawn sparkle effects
    this.spawnSparkles(scroll.x, scroll.y);

    if (this.levelScrolls === 3) {
      window.GameHUD?.setObjective(`所有卷轴已集齐！快前往石门出口撤离！`);
      sfx.play('win_level');
    }
  }

  collectSmokeBomb(player, bomb) {
    bomb.destroy();
    this.smokeBombs += 2; // pick up 2 smoke bombs
    sfx.play('scroll');
    this.updateHUDText();
    this.spawnSparkles(bomb.x, bomb.y, 0x55ff55);
  }

  spawnSparkles(x, y, color = 0xfbbf24) {
    for (let i = 0; i < 8; i++) {
      const p = this.add.circle(x, y, 4, color).setDepth(DEPTH.EFFECTS);
      this.physics.add.existing(p);
      p.body.setVelocity(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-100, 100));
      this.tweens.add({
        targets: p,
        alpha: 0,
        scale: 0.1,
        duration: 500,
        onComplete: () => p.destroy()
      });
    }
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

  handlePlayerMovement() {
    let vx = 0;
    let vy = 0;
    const speed = window.GAME_CONFIG.player.speed * (this.isSneaking ? 0.5 : 1);

    if (this.cursors.left.isDown || this.keys.A.isDown) {
      vx = -speed;
    } else if (this.cursors.right.isDown || this.keys.D.isDown) {
      vx = speed;
    }

    if (this.cursors.up.isDown || this.keys.W.isDown) {
      vy = -speed;
    } else if (this.cursors.down.isDown || this.keys.S.isDown) {
      vy = speed;
    }

    // Normalize diagonal speed
    if (vx !== 0 && vy !== 0) {
      vx *= 0.7071;
      vy *= 0.7071;
    }

    this.player.body.setVelocity(vx, vy);

    // Choose animation
    if (vx === 0 && vy === 0) {
      this.player.play('NinjaKage_idle', true);
    } else {
      if (Math.abs(vx) >= Math.abs(vy)) {
        this.player.play('NinjaKage_walk_left', true);
        // Flip logic: assets drawn facing LEFT. SetFlipX(true) mirrors it to face RIGHT
        if (vx < 0) {
          this.player.setFlipX(false); // face left
        } else {
          this.player.setFlipX(true); // face right
        }
      } else {
        if (vy < 0) {
          this.player.play('NinjaKage_walk_up', true);
        } else {
          this.player.play('NinjaKage_walk_down', true);
        }
        this.player.setFlipX(false);
      }
    }
  }

  executeAssassination() {
    let targetGuard = null;
    let closestDist = 65; // within 65 pixels for assassination

    this.guards.getChildren().forEach(g => {
      if (g.state === 'dead') return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, g.x, g.y);
      if (d < closestDist && this.canAssassinate(g)) {
        closestDist = d;
        targetGuard = g;
      }
    });

    if (targetGuard) {
      this.isPlayerAttacking = true;
      this.player.body.setVelocity(0, 0);
      sfx.play('slash');
      this.spawnSlash(targetGuard.x, targetGuard.y);

      // Face the guard
      if (targetGuard.x < this.player.x) {
        this.player.setFlipX(false); // face left
      } else {
        this.player.setFlipX(true); // face right
      }

      this.player.play('NinjaKage_attack', true);
      
      // Disable guard movement and prep death
      const guardToKill = targetGuard;
      guardToKill.state = 'dead';
      guardToKill.body.setVelocity(0, 0);
      guardToKill.alertIcon.setText('');

      this.time.delayedCall(250, () => {
        // Guard dissolves in smoke!
        sfx.play('smoke_explode');
        this.spawnSmokePuff(guardToKill.x, guardToKill.y);
        
        // Randomly drops a smoke bomb pickup (25% chance)
        if (Math.random() < 0.25) {
          const pickup = this.smokeBombPickups.create(guardToKill.x, guardToKill.y, 'smoke_bomb');
          pickup.body.setSize(48, 48);
          pickup.body.setOffset(40, 40);
          pickup.play('smoke_bomb_float');
          pickup.setDepth(DEPTH.YSORT + guardToKill.y);
          this.ysortGroup.add(pickup);
        }

        guardToKill.destroy();
      });

      this.time.delayedCall(500, () => {
        this.isPlayerAttacking = false;
      });
    } else {
      // Normal swing (whiff)
      this.isPlayerAttacking = true;
      this.player.body.setVelocity(0, 0);
      sfx.play('slash');
      this.player.play('NinjaKage_attack', true);
      this.time.delayedCall(400, () => {
        this.isPlayerAttacking = false;
      });
    }
  }

  canAssassinate(guard) {
    // Stunned guards in smoke can be assassinated from any angle
    if (this.isGuardInSmoke(guard)) return true;

    // Calculate angle from guard to player
    const angleToPlayer = Math.atan2(this.player.y - guard.y, this.player.x - guard.x);
    let diff = angleToPlayer - guard.facingAngle;
    
    // Normalize to -PI to PI
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));

    // If angle difference is greater than 100 degrees, player is behind the guard
    return Math.abs(diff) > (100 * Math.PI / 180);
  }

  throwSmokeBomb() {
    if (this.smokeBombs <= 0) return;
    this.smokeBombs--;
    this.updateHUDText();
    sfx.play('smoke_throw');

    // Spawn a flying smoke bomb visual
    const bombVisual = this.add.sprite(this.player.x, this.player.y, 'smoke_bomb').setScale(0.8).setDepth(DEPTH.EFFECTS);
    
    // Animate bomb landing
    const targetX = this.player.x + (this.player.flipX ? 64 : -64);
    const targetY = this.player.y;

    this.tweens.add({
      targets: bombVisual,
      x: targetX,
      y: targetY,
      angle: 360,
      duration: 300,
      onComplete: () => {
        bombVisual.destroy();
        sfx.play('smoke_explode');
        this.spawnSmokeCloud(targetX, targetY);
      }
    });
  }

  spawnSmokeCloud(x, y) {
    const cloud = this.smokeClouds.create(x, y, 'smoke_cloud');
    cloud.body.setCircle(70);
    cloud.body.setOffset(-6, -6);
    cloud.play('smoke_puff');
    cloud.setDepth(DEPTH.EFFECTS);

    // Shake camera slightly on explosion
    this.cameras.main.shake(150, 0.005);

    // Destroy smoke cloud after 5 seconds
    this.time.delayedCall(5000, () => {
      this.tweens.add({
        targets: cloud,
        alpha: 0,
        duration: 500,
        onComplete: () => cloud.destroy()
      });
    });
  }

  // White crescent slash arc for assassinations (code-drawn, no asset).
  spawnSlash(x, y) {
    const g = this.add.graphics({ x, y }).setDepth(DEPTH.EFFECTS);
    g.lineStyle(5, 0xffffff, 0.95);
    g.beginPath();
    g.arc(0, 0, 40, -Math.PI * 0.25, Math.PI * 0.55, false);
    g.strokePath();
    g.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
    this.tweens.add({
      targets: g,
      alpha: 0,
      scaleX: 1.8,
      scaleY: 1.8,
      duration: 280,
      ease: 'Quad.easeOut',
      onComplete: () => g.destroy()
    });
  }

  spawnSmokePuff(x, y) {
    const puff = this.add.sprite(x, y, 'smoke_cloud').setDepth(DEPTH.EFFECTS);
    puff.play('smoke_puff');
    puff.on('animationcomplete', () => {
      puff.destroy();
    });
  }

  isPlayerInSmoke() {
    let inSmoke = false;
    this.smokeClouds.getChildren().forEach(c => {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x, c.y);
      if (dist < 100) {
        inSmoke = true;
      }
    });
    return inSmoke;
  }

  isGuardInSmoke(guard) {
    let inSmoke = false;
    this.smokeClouds.getChildren().forEach(c => {
      const dist = Phaser.Math.Distance.Between(guard.x, guard.y, c.x, c.y);
      if (dist < 100) {
        inSmoke = true;
      }
    });
    return inSmoke;
  }

  updateGuard(guard, delta) {
    if (guard.state === 'dead') return;

    // Check if guard is stunned by smoke
    const stunned = this.isGuardInSmoke(guard);
    if (stunned) {
      guard.body.setVelocity(0, 0);
      guard.play('SamuraiGuard_idle', true);
      guard.alertIcon.setText('░').setFill('#a5f3fc'); // confused symbols
      guard.detectionProgress = 0;
      return;
    }

    const distToPlayer = Phaser.Math.Distance.Between(guard.x, guard.y, this.player.x, this.player.y);

    // GUARD BEHAVIOR FINITE STATE MACHINE (FSM)
    if (guard.state === 'combat') {
      // Alarm red Alert
      guard.alertIcon.setText('🚨').setFill('#ff0000');
      
      // Move rapidly towards player
      const dx = this.player.x - guard.x;
      const dy = this.player.y - guard.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 5) {
        const vx = (dx / dist) * (window.GAME_CONFIG.player.speed * 1.15);
        const vy = (dy / dist) * (window.GAME_CONFIG.player.speed * 1.15);
        guard.body.setVelocity(vx, vy);
        guard.facingAngle = Math.atan2(vy, vx);
        this.playGuardWalkAnim(guard, vx, vy);
      }

      // Check collision for damage
      if (dist < 50 && !this.isInvincible && !this.isPlayerAttacking) {
        this.damagePlayer(guard);
      }

      // Lose sight if player gets too far or enters smoke
      if (dist > 350 || this.isPlayerInSmoke()) {
        guard.state = 'alert';
        guard.alertTimer = 4000; // Look around for 4 seconds
        guard.body.setVelocity(0, 0);
      }
    } else if (guard.state === 'alert') {
      // Stunned / searching area
      guard.alertIcon.setText('❓').setFill('#fbbf24');
      guard.body.setVelocity(0, 0);
      guard.play('SamuraiGuard_idle', true);

      // Rotate vision back and forth slowly
      guard.facingAngle = guard.facingAngle + 0.02 * Math.sin(this.time.now * 0.005);
      
      // Check if player is detected again
      if (this.checkPlayerDetection(guard)) {
        guard.state = 'combat';
        sfx.play('alert');
      }

      guard.alertTimer -= delta;
      if (guard.alertTimer <= 0) {
        guard.state = 'patrol';
        guard.alertIcon.setText('');
      }
    } else {
      // Normal Patrol state
      guard.alertIcon.setText('');

      // Patrol movement
      const pathNodes = guard.patrolPath;
      if (pathNodes && pathNodes.length > 0) {
        const target = pathNodes[guard.patrolIndex];
        const dx = target.x - guard.x;
        const dy = target.y - guard.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 8) {
          // Move to next node
          guard.patrolIndex = (guard.patrolIndex + 1) % pathNodes.length;
        } else {
          const patrolSpeed = window.GAME_CONFIG.player.speed * 0.55;
          const vx = (dx / dist) * patrolSpeed;
          const vy = (dy / dist) * patrolSpeed;
          guard.body.setVelocity(vx, vy);
          guard.facingAngle = Math.atan2(vy, vx);
          this.playGuardWalkAnim(guard, vx, vy);
        }
      } else {
        guard.body.setVelocity(0, 0);
        guard.play('SamuraiGuard_idle', true);
      }

      // Detection check
      if (this.checkPlayerDetection(guard)) {
        // Spots player! Sneaking slows the build-up, buying reaction time.
        guard.detectionProgress += this.isSneaking ? 2 : 4;
        if (guard.detectionProgress >= 100) {
          guard.state = 'combat';
          sfx.play('alert');
          this.cameras.main.flash(200, 200, 0, 0); // brief red screen flash
        }
        guard.alertIcon.setText('!').setFill('#fbbf24');
      } else {
        guard.detectionProgress = Math.max(0, guard.detectionProgress - 2);
        if (guard.detectionProgress > 0) {
          guard.alertIcon.setText('?').setFill('#a5f3fc');
        } else {
          guard.alertIcon.setText('');
        }
      }
    }

    // Draw vision cone
    this.drawVisionCone(guard);
  }

  playGuardWalkAnim(guard, vx, vy) {
    const angle = guard.facingAngle * 180 / Math.PI;
    if (angle > -135 && angle < -45) {
      guard.play('SamuraiGuard_walk_up', true);
      guard.setFlipX(false);
    } else if (angle > 45 && angle < 135) {
      guard.play('SamuraiGuard_walk_down', true);
      guard.setFlipX(false);
    } else {
      guard.play('SamuraiGuard_walk_left', true);
      if (vx > 0) {
        guard.setFlipX(true); // face right
      } else {
        guard.setFlipX(false); // face left
      }
    }
  }

  checkPlayerDetection(guard) {
    // If player is dead, invincible, or in smoke, cannot be detected
    if (this.playerHp <= 0 || this.isPlayerInSmoke()) return false;

    const dist = Phaser.Math.Distance.Between(guard.x, guard.y, this.player.x, this.player.y);
    const maxSight = this.isSneaking ? 130 : 240; // crouching shrinks guards' effective sight

    if (dist > maxSight) return false;

    // Check angle relative to facing direction
    const angleToPlayer = Math.atan2(this.player.y - guard.y, this.player.x - guard.x);
    let diff = angleToPlayer - guard.facingAngle;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));

    // 65-degree field of view (±32.5 degrees)
    const fov = 65 * Math.PI / 180;
    if (Math.abs(diff) < fov / 2) {
      // Check line-of-sight raycasting to ensure walls block vision
      if (!this.isLineOfSightBlocked(guard.x, guard.y, this.player.x, this.player.y)) {
        return true;
      }
    }
    return false;
  }

  isLineOfSightBlocked(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(distance / 16); // check every 16px

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const px = x1 + dx * t;
      const py = y1 + dy * t;
      const tx = Math.floor(px / 64);
      const ty = Math.floor(py / 64);

      if (tx >= 0 && tx < window.TILEMAP_DATA.width && ty >= 0 && ty < window.TILEMAP_DATA.height) {
        const idx = ty * window.TILEMAP_DATA.width + tx;
        const tileId = this.currentLevelLayers.objects[idx];
        if (tileId && tileId !== 0) {
          const tileName = window.TILEMAP_DATA.tileIndex[tileId];
          // Blocks vision: walls, crates, barrels, bushes
          if (tileName && (tileName.includes('wall') || tileName.includes('crate') || tileName.includes('barrel') || tileName.includes('bush'))) {
            return true;
          }
        }
      }
    }
    return false;
  }

  drawVisionCone(guard) {
    if (guard.state === 'dead' || this.isGuardInSmoke(guard)) return;

    const color = guard.state === 'combat' ? 0xff3333 : 0xffd700;
    const opacity = guard.state === 'combat' ? 0.3 : 0.15;
    const maxSight = 240;
    const fov = 65 * Math.PI / 180; // 65-degree cone

    const startAngle = guard.facingAngle - fov / 2;
    const endAngle = guard.facingAngle + fov / 2;

    this.visionGraphics.lineStyle(2, color, opacity * 1.5);
    this.visionGraphics.fillStyle(color, opacity);

    this.visionGraphics.beginPath();
    this.visionGraphics.moveTo(guard.x, guard.y);

    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      const angle = startAngle + (endAngle - startAngle) * (i / steps);
      const targetX = guard.x + Math.cos(angle) * maxSight;
      const targetY = guard.y + Math.sin(angle) * maxSight;

      // raycast to trim the vision cone when it hits walls!
      let actualX = targetX;
      let actualY = targetY;
      const raySteps = 24;

      for (let j = 1; j <= raySteps; j++) {
        const t = j / raySteps;
        const rx = guard.x + (targetX - guard.x) * t;
        const ry = guard.y + (targetY - guard.y) * t;
        const tx = Math.floor(rx / 64);
        const ty = Math.floor(ry / 64);

        if (tx >= 0 && tx < window.TILEMAP_DATA.width && ty >= 0 && ty < window.TILEMAP_DATA.height) {
          const idx = ty * window.TILEMAP_DATA.width + tx;
          const tileId = this.currentLevelLayers.objects[idx];
          if (tileId && tileId !== 0) {
            const name = window.TILEMAP_DATA.tileIndex[tileId];
            if (name && (name.includes('wall') || name.includes('crate') || name.includes('barrel') || name.includes('bush'))) {
              actualX = rx;
              actualY = ry;
              break;
            }
          }
        }
      }

      this.visionGraphics.lineTo(actualX, actualY);
    }
    
    this.visionGraphics.closePath();
    this.visionGraphics.fillPath();
    this.visionGraphics.strokePath();
  }

  drawExitPortal() {
    if (!this.exitPortal) return;
    this.exitPortal.clear();

    const color = this.levelScrolls === 3 ? 0x06b6d4 : 0x475569; // cyan when open, grey when locked
    const cx = this.exitPos.x;
    const cy = this.exitPos.y;

    this.exitPulseAngle += 0.04;
    const pulseRadius = 48 + Math.sin(this.exitPulseAngle) * 8;

    // Draw portal base ring
    this.exitPortal.lineStyle(4, color, 0.8);
    this.exitPortal.strokeCircle(cx, cy, pulseRadius);

    // Inner rotating rays if open
    if (this.levelScrolls === 3) {
      this.exitPortal.fillStyle(color, 0.15);
      this.exitPortal.fillCircle(cx, cy, pulseRadius);

      const rays = 4;
      this.exitPortal.lineStyle(2, 0xffffff, 0.5);
      for (let i = 0; i < rays; i++) {
        const angle = this.exitPulseAngle + (i * Math.PI / 2);
        const x1 = cx - Math.cos(angle) * pulseRadius;
        const y1 = cy - Math.sin(angle) * pulseRadius;
        const x2 = cx + Math.cos(angle) * pulseRadius;
        const y2 = cy + Math.sin(angle) * pulseRadius;
        this.exitPortal.line(x1, y1, x2, y2);
      }
    } else {
      // Locked lock shape
      this.exitPortal.lineStyle(3, 0xffffff, 0.6);
      this.exitPortal.strokeRect(cx - 10, cy - 6, 20, 16);
      // strokeArc doesn't exist in Phaser 3 Graphics; use arc() + strokePath()
      this.exitPortal.beginPath();
      this.exitPortal.arc(cx, cy - 6, 8, Math.PI, 0, false);
      this.exitPortal.strokePath();
    }
  }

  damagePlayer(guard) {
    this.isInvincible = true;
    this.invincibilityTimer = 2000; // 2 seconds invincibility
    this.playerHp--;
    sfx.play('damage');
    window.GameHUD?.setHearts(this.playerHp, 3);
    this.cameras.main.shake(250, 0.015);

    // Knockback
    const angle = Math.atan2(this.player.y - guard.y, this.player.x - guard.x);
    this.player.body.setVelocity(Math.cos(angle) * 350, Math.sin(angle) * 350);
    this.isPlayerAttacking = true;

    this.time.delayedCall(300, () => {
      this.isPlayerAttacking = false;
    });

    if (this.playerHp <= 0) {
      this.gameOver(false);
    }
  }

  completeLevel() {
    const levelBriefs = [
      null,
      ['🥷 任务：敌营仓库', '城堡庭院已清理，卷轴在握。', '情报显示：第二份卷轴藏于敌营仓库深处。', '守卫已更换阵型，小心视野锥——行动！'],
      ['🥷 终极任务：将军御所', '两份卷轴已到手。最后一份……', '就在将军寝殿之内。', '警戒级别最高，一旦暴露将引来全军围攻。', '沉住气，为了幕府的和平，这是最后一战！']
    ];

    if (this.currentLevel === 3) {
      this.gameOver(true);
    } else {
      this.currentLevel++;
      sfx.play('win_level');
      const brief = levelBriefs[this.currentLevel - 1];
      if (brief) {
        this.gameStarted = false;
        this.showNarrativeBanner(brief, 3000, () => {
          this.loadLevel(this.currentLevel);
          this.gameStarted = true;
        });
      } else {
        this.loadLevel(this.currentLevel);
      }
    }
  }

  gameOver(win) {
    this.gameStarted = false;
    if (win) this._won = true; else this._lost = true;
    this.player.body.setVelocity(0, 0);

    if (win) {
      sfx.play('win_level');
      window.GameHUD?.showGameOver(true,
        '🥷 任务完成！\n\n黑影（Kage）成功从将军御所取回了全部九份机密卷轴，\n' +
        '穿越城堡庭院、敌营仓库与将军寝殿，如同一道无声的风影。\n\n' +
        '幕府将这些情报秘密送达了天皇御所——\n将军的政权土崩瓦解，动乱的国家重归和平。\n\n' +
        '没有人知道那个夜晚究竟发生了什么，\n只有风，见证了影的归来。'
      );
    } else {
      sfx.play('damage');
      window.GameHUD?.showGameOver(false,
        '⚠️ 任务失败\n\n守卫发现了你的踪迹，鸣钟示警！\n' +
        '在重重包围下，黑影负伤倒地……\n\n' +
        '情报卷轴仍在将军手中。\n幕府的命运，悬于一线。'
      );
    }
  }
}

const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 960,
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

// Start the game!
new Phaser.Game(config);
