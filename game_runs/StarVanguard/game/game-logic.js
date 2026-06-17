// StarVanguard - Space Shooter Game Logic
// Procedural Pixel Art & Web Audio Synth Sound FX

const DEPTH = {
  BACKGROUND: 0,
  STARFIELD_1: 10,
  STARFIELD_2: 20,
  CRYSTALS: 100,
  ENEMIES: 200,
  PLAYER: 300,
  BULLETS: 400,
  LASER: 450,
  EFFECTS: 500,
  HUD_OVERLAY: 1000
};

// Web Audio API Retro Synth Sound Engine
class SoundEngine {
  constructor() {
    this.ctx = null;
  }
  
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playPew(level) {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    if (level === 1) {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.12);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (level === 2) {
      // Spread shot - triple pitch
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(500, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0.005, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    }
  }

  playLaserHum() {
    this.init();
    if (!this.ctx) return null;
    
    // We want a buzzing frequency hum for the Level 3 laser
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    
    // Low frequency modulation (LFO) for vibrating effect
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 30; // 30Hz rumble
    lfoGain.gain.value = 15;
    
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    
    gain.gain.setValueAtTime(0.03, now);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    lfo.start(now);
    osc.start(now);
    
    return { osc, lfo, gain };
  }

  playEnemyPew() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(350, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.linearRampToValueAtTime(0.005, now + 0.22);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  playExplosion(isLarge = false) {
    this.init();
    if (!this.ctx) return;
    const dur = isLarge ? 0.7 : 0.3;
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Generate white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isLarge ? 180 : 350, this.ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(20, this.ctx.currentTime + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isLarge ? 0.22 : 0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, this.ctx.currentTime + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
    noise.stop(this.ctx.currentTime + dur);
  }

  playCrystal() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    
    // Arpeggio sound
    const notes = [659.25, 880, 1046.5]; // E5, A5, C6
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.05;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.04, t);
      gain.gain.linearRampToValueAtTime(0.001, t + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
    });
  }

  playHurt() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(30, now + 0.3);
    
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.32);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  playLevelUp() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.linearRampToValueAtTime(0.001, t + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  }

  playShieldHit() {
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);
    
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.08);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }
}

const sounds = new SoundEngine();

// Procedural Pixel Art Generator
function createPixelTexture(scene, key, grid, pixelSize = 3) {
  const PALETTE = {
    '.': 'rgba(0,0,0,0)',
    'k': '#1e293b', // Outline slate-800
    'w': '#94a3b8', // Gray slate-400
    'W': '#ffffff', // White
    'b': '#1d4ed8', // Blue-700
    'B': '#3b82f6', // Blue-500
    'c': '#0891b2', // Cyan-600
    'C': '#22d3ee', // Cyan-400
    'r': '#b91c1c', // Red-700
    'R': '#ef4444', // Red-500
    'y': '#ca8a04', // Yellow-600
    'Y': '#fde047', // Yellow-300
    'g': '#15803d', // Green-700
    'G': '#22c55e', // Green-500
    'p': '#7e22ce', // Purple-700
    'P': '#c084fc', // Purple-400
    'o': '#c2410c', // Orange-700
    'O': '#f97316', // Orange-500
    's': '#475569', // Stone slate-600
    'S': '#64748b', // Light Stone slate-500
    'K': '#0f172a', // Dark slate-900
  };

  const height = grid.length;
  const width = grid[0].length;
  const canvas = document.createElement('canvas');
  canvas.width = width * pixelSize;
  canvas.height = height * pixelSize;
  const ctx = canvas.getContext('2d');
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const char = grid[y][x];
      if (char && char !== '.' && PALETTE[char]) {
        ctx.fillStyle = PALETTE[char];
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }
  }
  scene.textures.addCanvas(key, canvas);
}

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

  // ── Weapon Mechanics: Bullet Types & Upgrade States ──
  handleShooting(time, isShooting) {
    // Determine Weapon Level from Crystal Count
    // 0-4: Level 1 (Single)
    // 5-9: Level 2 (Spread 3x)
    // >= 10: Level 3 (Giant continuous Laser Beam)
    if (this.crystalsCollected < 5) {
      this.weaponLevel = 1;
    } else if (this.crystalsCollected < 10) {
      this.weaponLevel = 2;
    } else {
      this.weaponLevel = 3;
    }

    // Disable Laser Beam if not shooting
    if (this.weaponLevel !== 3 || !isShooting) {
      this.laserGraphics.clear();
      this.stopLaserHum();
    }

    if (!isShooting) return;

    if (this.weaponLevel === 1) {
      const cooldown = 180; // ms
      if (time > this.lastFired + cooldown) {
        this.fireSingleBullet();
        this.lastFired = time;
      }
    } else if (this.weaponLevel === 2) {
      const cooldown = 240; // ms
      if (time > this.lastFired + cooldown) {
        this.fireSpreadBullet();
        this.lastFired = time;
      }
    } else if (this.weaponLevel === 3) {
      // Continuous Laser Beam!
      this.fireLaserBeam();
    }
  }

  fireSingleBullet() {
    const bullet = this.playerBullets.create(this.player.x, this.player.y - 25, 'bullet_normal');
    bullet.setVelocityY(-550);
    bullet.setDepth(DEPTH.BULLETS);
    bullet.damageAmount = 1;
    sounds.playPew(1);
  }

  fireSpreadBullet() {
    // 3 bullets in a cone
    const angles = [-15, 0, 15];
    angles.forEach(angle => {
      const bullet = this.playerBullets.create(this.player.x, this.player.y - 25, 'bullet_normal');
      bullet.setDepth(DEPTH.BULLETS);
      bullet.damageAmount = 1;
      
      const angleRad = Phaser.Math.DegToRad(angle - 90); // -90 offset because straight up is y negative
      bullet.setVelocity(
        Math.cos(angleRad) * 500,
        Math.sin(angleRad) * 500
      );
      bullet.setAngle(angle);
    });
    sounds.playPew(2);
  }

  fireLaserBeam() {
    // Hum sound loop
    if (!this.laserHum) {
      this.laserHum = sounds.playLaserHum();
    }

    const lx = this.player.x;
    const ly = this.player.y - 25;
    
    // Draw laser beam
    this.laserGraphics.clear();
    
    // Laser pulse effect
    const outerWidth = 14 + Math.sin(this.time.now * 0.05) * 4;
    const innerWidth = 4 + Math.sin(this.time.now * 0.08) * 1.5;
    
    // Outer cyan glow
    this.laserGraphics.lineStyle(outerWidth, 0x22d3ee, 0.45);
    this.laserGraphics.beginPath();
    this.laserGraphics.moveTo(lx, ly);
    this.laserGraphics.lineTo(lx, 0);
    this.laserGraphics.strokePath();

    // Core white hot line
    this.laserGraphics.lineStyle(innerWidth, 0xffffff, 0.95);
    this.laserGraphics.beginPath();
    this.laserGraphics.moveTo(lx, ly);
    this.laserGraphics.lineTo(lx, 0);
    this.laserGraphics.strokePath();

    // Particle spark details at player nose
    if (Math.random() < 0.35) {
      this.createSparks(lx, ly, 0x22d3ee, 5);
    }

    // Laser collision detection (scan vertically along lx)
    const tickTime = 60; // damage tick interval in ms
    if (!this.lastLaserTick) this.lastLaserTick = 0;
    
    if (this.time.now > this.lastLaserTick + tickTime) {
      this.lastLaserTick = this.time.now;

      // 1. Intersect Asteroids
      this.asteroids.getChildren().forEach(ast => {
        if (Math.abs(ast.x - lx) < (ast.displayWidth / 2 + 10) && ast.y < ly) {
          this.damageAsteroid(ast, 0.6); // continuous smaller laser damage
          this.createSparks(ast.x, ast.y, 0x22d3ee, 4);
        }
      });

      // 2. Intersect Enemies
      this.enemies.getChildren().forEach(enemy => {
        if (Math.abs(enemy.x - lx) < (enemy.displayWidth / 2 + 10) && enemy.y < ly) {
          this.damageEnemy(enemy, 0.6);
          this.createSparks(enemy.x, enemy.y, 0x22d3ee, 4);
        }
      });

      // 3. Intersect Boss components (Level 3)
      if (this.currentLevel === 3 && this.bossSpawned) {
        // Left Turret
        if (this.bossTurrets[0] && this.bossTurrets[0].active && Math.abs(this.bossTurrets[0].x - lx) < 30) {
          this.damageBossTurret(this.bossTurrets[0], 0.6);
          this.createSparks(this.bossTurrets[0].x, this.bossTurrets[0].y, 0x22d3ee, 4);
        }
        // Right Turret
        if (this.bossTurrets[1] && this.bossTurrets[1].active && Math.abs(this.bossTurrets[1].x - lx) < 30) {
          this.damageBossTurret(this.bossTurrets[1], 0.6);
          this.createSparks(this.bossTurrets[1].x, this.bossTurrets[1].y, 0x22d3ee, 4);
        }
        // Center Core (invulnerable if shield active)
        if (this.boss && this.boss.active && Math.abs(this.boss.x - lx) < 60) {
          if (this.bossShieldActive) {
            sounds.playShieldHit();
            this.bossShieldPulse = 1.0;
          } else {
            this.damageBossCore(0.6);
            this.createSparks(this.boss.x, this.boss.y + 40, 0x22d3ee, 4);
          }
        }
      }
    }
  }

  stopLaserHum() {
    if (this.laserHum) {
      try {
        this.laserHum.osc.stop();
        this.laserHum.lfo.stop();
      } catch(e) {}
      this.laserHum = null;
    }
  }

  // ── Spawners for Levels ──
  handleSpawning(time) {
    if (time < this.nextSpawnTime) return;

    if (this.currentLevel === 1) {
      // Spawn asteroid
      this.spawnAsteroid();
      this.nextSpawnTime = time + Phaser.Math.Between(700, 1400);
    } else if (this.currentLevel === 2) {
      // Spawn fleet enemy
      this.spawnFleetEnemy();
      this.nextSpawnTime = time + Phaser.Math.Between(1000, 2000);
    } else if (this.currentLevel === 3) {
      // Spawn Boss fortress once
      if (!this.bossSpawned) {
        this.spawnStarFortress();
        this.bossSpawned = true;
      }
      
      // Spawn support drones occasionally during Phase 1 & 2
      if (this.boss && this.boss.active && this.bossPhase < 3) {
        this.spawnBossDrone();
        this.nextSpawnTime = time + Phaser.Math.Between(3000, 5000);
      }
    }
  }

  spawnAsteroid() {
    const x = Phaser.Math.Between(40, 760);
    const isLarge = Math.random() < 0.45;
    
    let key = isLarge ? 'asteroid_large' : 'asteroid_small';
    let ast = this.asteroids.create(x, -30, key);
    
    ast.setDepth(DEPTH.ENEMIES);
    ast.setVelocityY(Phaser.Math.Between(80, 200));
    ast.setVelocityX(Phaser.Math.Between(-30, 30));
    
    ast.hp = isLarge ? 3 : 1;
    ast.isLarge = isLarge;
    
    // slow spin
    ast.spinSpeed = Phaser.Math.Between(-80, 80);
    ast.setAngularVelocity(ast.spinSpeed);
  }

  spawnFleetEnemy() {
    const x = Phaser.Math.Between(60, 740);
    const isBomber = Math.random() < 0.35; // 35% bomber, 65% scout
    
    if (isBomber) {
      let enemy = this.enemies.create(x, -40, 'enemy_bomber');
      enemy.setDepth(DEPTH.ENEMIES);
      enemy.type = 'bomber';
      enemy.hp = 6;
      enemy.setVelocityY(80);
      enemy.shootCooldown = 1500;
      enemy.nextShoot = this.time.now + Phaser.Math.Between(500, 1200);
    } else {
      let enemy = this.enemies.create(x, -40, 'enemy_scout');
      enemy.setDepth(DEPTH.ENEMIES);
      enemy.type = 'scout';
      enemy.hp = 2;
      // Zigzag velocity pattern
      enemy.setVelocityY(Phaser.Math.Between(160, 240));
      enemy.setVelocityX(Math.random() < 0.5 ? -100 : 100);
      enemy.shootCooldown = 1000;
      enemy.nextShoot = this.time.now + Phaser.Math.Between(400, 900);
    }
  }

  spawnBossDrone() {
    const x = Math.random() < 0.5 ? -20 : 820;
    const drone = this.enemies.create(x, Phaser.Math.Between(120, 280), 'enemy_scout');
    drone.setDepth(DEPTH.ENEMIES);
    drone.type = 'drone';
    drone.hp = 1;
    drone.setVelocityX(x < 0 ? 180 : -180);
    drone.setVelocityY(40);
    drone.setDisplaySize(32, 32);
    drone.body.setSize(24, 24);
  }

  // ── Bullet Collisions & Damages ──
  hitAsteroid(bullet, asteroid) {
    bullet.destroy();
    this.damageAsteroid(asteroid, bullet.damageAmount);
  }

  damageAsteroid(asteroid, damage) {
    asteroid.hp -= damage;
    
    // flash red
    asteroid.setTint(0xff8888);
    this.time.delayedCall(80, () => {
      if (asteroid.active) asteroid.clearTint();
    });

    if (asteroid.hp <= 0) {
      this.explodeEntity(asteroid, asteroid.isLarge ? 'large' : 'small');
      
      // If large, split into 2 smaller ones sliding sideways
      if (asteroid.isLarge) {
        for (let i = 0; i < 2; i++) {
          const smallAst = this.asteroids.create(asteroid.x, asteroid.y, 'asteroid_small');
          smallAst.setDepth(DEPTH.ENEMIES);
          smallAst.hp = 1;
          smallAst.isLarge = false;
          smallAst.setVelocity(
            (i === 0 ? -120 : 120) + Phaser.Math.Between(-30, 30),
            Phaser.Math.Between(120, 200)
          );
          smallAst.setAngularVelocity(Phaser.Math.Between(-100, 100));
        }
      }

      asteroid.destroy();
      sounds.playExplosion(asteroid.isLarge);

      // Score counter
      if (this.currentLevel === 1) {
        this.levelScore++;
        const left = Math.max(0, 15 - this.levelScore);
        window.GameHUD?.setObjective(`第一关：冲出陨石风暴带！ (还需摧毁 ${left} 颗陨石)`);
        
        if (this.levelScore >= 15) {
          this.triggerLevelClear();
        }
      }
    }
  }

  hitEnemy(bullet, enemy) {
    bullet.destroy();
    this.damageEnemy(enemy, bullet.damageAmount);
  }

  damageEnemy(enemy, damage) {
    enemy.hp -= damage;
    
    enemy.setTint(0xff8888);
    this.time.delayedCall(80, () => {
      if (enemy.active) enemy.clearTint();
    });

    if (enemy.hp <= 0) {
      this.explodeEntity(enemy, 'large');
      enemy.destroy();
      sounds.playExplosion(enemy.type === 'bomber');

      if (this.currentLevel === 2) {
        this.levelScore++;
        const left = Math.max(0, 15 - this.levelScore);
        window.GameHUD?.setObjective(`第二关：击溃敌舰先锋编队！ (还需击落 ${left} 架敌机)`);
        
        if (this.levelScore >= 15) {
          this.triggerLevelClear();
        }
      }
    }
  }

  // ── Crystal Collection & Level-up system ──
  collectCrystal(player, crystal) {
    crystal.destroy();
    this.crystalsCollected++;
    sounds.playCrystal();
    window.GameHUD?.setScore(this.crystalsCollected);

    // level up flash if crossing threshold
    if (this.crystalsCollected === 5 || this.crystalsCollected === 10) {
      sounds.playLevelUp();
      this.cameras.main.flash(200, 34, 211, 238); // Cyan flash
      this.createSparks(player.x, player.y, 0x22d3ee, 20);
    }
  }

  // ── Smart Bomb: clear bullets + AoE damage everything on screen ──
  useBomb() {
    if (this.bombs <= 0) {
      this.createFloatingText?.(this.player.x, this.player.y - 40, '无炸弹', '#ef4444');
      return;
    }
    this.bombs--;

    // Snapshot lists so destroying/splitting during the sweep doesn't skip entries
    [...this.enemyBullets.getChildren()].forEach(b => {
      this.createSparks(b.x, b.y, 0xc084fc, 3);
      b.destroy();
    });
    [...this.enemies.getChildren()].forEach(e => this.damageEnemy(e, 3));
    [...this.asteroids.getChildren()].forEach(a => this.damageAsteroid(a, 3));

    // Boss components take bomb damage too (core only once shield is down)
    if (this.currentLevel === 3 && this.bossSpawned) {
      if (this.bossTurrets[0] && this.bossTurrets[0].active) this.damageBossTurret(this.bossTurrets[0], 3);
      if (this.bossTurrets[1] && this.bossTurrets[1].active) this.damageBossTurret(this.bossTurrets[1], 3);
      if (!this.bossShieldActive && this.boss && this.boss.active) this.damageBossCore(3);
    }

    sounds.playExplosion(true);
    this.cameras.main.flash(300, 255, 255, 255);
    this.cameras.main.shake(250, 0.012);
    this.spawnShockwave(this.player.x, this.player.y);

    // Brief grace window after detonation
    this.isInvincible = true;
    this.invincibleTimer = 800;
  }

  spawnShockwave(x, y) {
    const ring = this.add.graphics({ x, y }).setDepth(DEPTH.EFFECTS);
    ring.lineStyle(4, 0x22d3ee, 0.9);
    ring.strokeCircle(0, 0, 20);
    this.tweens.add({
      targets: ring,
      scaleX: 32,
      scaleY: 32,
      alpha: 0,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy()
    });
  }

  // ── Enemy Bullet logic ──
  // Loop enemies and fire bullets
  updateBoss(time, delta) {
    // Enemy Bombers / Scouts shoot at intervals
    this.enemies.getChildren().forEach(enemy => {
      if (enemy.type === 'drone') return; // drones don't shoot, they ram

      if (time > enemy.nextShoot) {
        if (enemy.type === 'scout') {
          this.fireEnemyBulletAimed(enemy);
        } else if (enemy.type === 'bomber') {
          this.fireEnemyBulletSpread(enemy);
        }
        enemy.nextShoot = time + enemy.shootCooldown * Phaser.Math.Between(0.8, 1.2);
      }

      // Bomber custom movement: stops at Y=150, drifts left-right, then falls down
      if (enemy.type === 'bomber') {
        if (enemy.y >= 130 && enemy.body.velocity.y > 0) {
          enemy.setVelocityY(0);
          enemy.setVelocityX(Phaser.Math.Between(0, 1) === 0 ? -60 : 60);
          // drop down after 4.5 seconds
          this.time.delayedCall(4500, () => {
            if (enemy.active) {
              enemy.setVelocityY(120);
              enemy.setVelocityX(0);
            }
          });
        }
        // bounce on walls
        if (enemy.x < 60) { enemy.x = 60; enemy.setVelocityX(60); }
        if (enemy.x > 740) { enemy.x = 740; enemy.setVelocityX(-60); }
      }

      // Scout custom movement: bounce on walls to create zig-zag pattern
      if (enemy.type === 'scout') {
        if (enemy.x < 40) { enemy.x = 40; enemy.setVelocityX(120); }
        if (enemy.x > 760) { enemy.x = 760; enemy.setVelocityX(-120); }
      }
    });

    // ── Boss Fortress Core logic ──
    const boss = this.boss;
    if (!boss || !boss.active) return;

    // Boss entries/movement
    if (boss.y < 110) {
      boss.y += 0.8 * (delta / 16.6); // slow slide down
      // Align turrets
      if (this.bossTurrets[0]) {
        this.bossTurrets[0].x = boss.x - 140;
        this.bossTurrets[0].y = boss.y - 10;
      }
      if (this.bossTurrets[1]) {
        this.bossTurrets[1].x = boss.x + 140;
        this.bossTurrets[1].y = boss.y - 10;
      }
      return; // Wait until entry complete
    }

    // Drifting motion left/right in Phase 2 & 3
    if (this.bossPhase >= 2) {
      if (!this.bossDriftDir) this.bossDriftDir = 1;
      boss.x += this.bossDriftDir * 0.7 * (delta / 16.6);
      if (boss.x < 300) { boss.x = 300; this.bossDriftDir = 1; }
      if (boss.x > 500) { boss.x = 500; this.bossDriftDir = -1; }
    }

    // Draw Shields if active
    this.bossShieldGraphics.clear();
    if (this.bossShieldActive) {
      const shieldPulseRadius = 160 + Math.sin(time * 0.006) * 6 + (this.bossShieldPulse * 15);
      
      // reduce impact swell
      if (this.bossShieldPulse > 0) this.bossShieldPulse -= 0.08;
      
      this.bossShieldGraphics.lineStyle(3, 0x06b6d4, 0.7 + (Math.sin(time * 0.008) * 0.15));
      this.bossShieldGraphics.fillStyle(0x22d3ee, 0.07 + (Math.sin(time * 0.008) * 0.03));
      
      // Draw hex shields
      this.bossShieldGraphics.beginPath();
      for (let i = 0; i <= 6; i++) {
        const angle = i * Math.PI / 3;
        const sx = boss.x + Math.cos(angle) * shieldPulseRadius;
        const sy = boss.y + Math.sin(angle) * shieldPulseRadius;
        if (i === 0) this.bossShieldGraphics.moveTo(sx, sy);
        else this.bossShieldGraphics.lineTo(sx, sy);
      }
      this.bossShieldGraphics.closePath();
      this.bossShieldGraphics.fillPath();
      this.bossShieldGraphics.strokePath();
    }

    // ── Boss Fire Script ──
    this.handleBossCombat(time, delta);

    // Draw Boss HP bar
    this.drawBossHPBar();
  }

  fireEnemyBulletAimed(enemy) {
    const b = this.enemyBullets.create(enemy.x, enemy.y + 15, 'bullet_enemy');
    b.setDepth(DEPTH.BULLETS);
    
    // Vector towards player
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
    b.setVelocity(
      Math.cos(angle) * 260,
      Math.sin(angle) * 260
    );
    sounds.playEnemyPew();
  }

  fireEnemyBulletSpread(enemy) {
    const angles = [45, 90, 135];
    angles.forEach(angleDeg => {
      const b = this.enemyBullets.create(enemy.x, enemy.y + 15, 'bullet_enemy');
      b.setDepth(DEPTH.BULLETS);
      const rad = Phaser.Math.DegToRad(angleDeg);
      b.setVelocity(
        Math.cos(rad) * 220,
        Math.sin(rad) * 220
      );
    });
    sounds.playEnemyPew();
  }

  // ── Level 3 Boss Specific Combat Loops ──
  handleBossCombat(time, delta) {
    const boss = this.boss;

    // 1. Turrets Fire (Phase 1)
    if (this.bossPhase === 1) {
      this.bossTurrets.forEach((turret, idx) => {
        if (!turret.active) return;
        
        if (!turret.nextFire) turret.nextFire = 0;
        if (time > turret.nextFire) {
          // Fire burst of 3 aimed shots
          let burstCount = 0;
          const fireInterval = this.time.addEvent({
            delay: 150,
            repeat: 2,
            callback: () => {
              if (turret.active && boss.active) {
                const b = this.enemyBullets.create(turret.x, turret.y + 25, 'bullet_enemy');
                b.setDepth(DEPTH.BULLETS);
                const angle = Phaser.Math.Angle.Between(turret.x, turret.y, this.player.x, this.player.y);
                b.setVelocity(Math.cos(angle) * 280, Math.sin(angle) * 280);
                sounds.playEnemyPew();
              }
            }
          });
          turret.nextFire = time + Phaser.Math.Between(2500, 3500);
        }
      });

      // Check if both turrets are destroyed
      if (!this.bossTurrets[0].active && !this.bossTurrets[1].active) {
        this.bossShieldActive = false;
        this.bossPhase = 2;
        sounds.playExplosion(true);
        this.cameras.main.shake(500, 0.02);
        this.cameras.main.flash(400, 255, 255, 255);
        window.GameHUD?.setObjective("要塞护盾已瓦解！全力击破中央核心！");
        this.createSparks(boss.x, boss.y, 0xef4444, 40);
        this.showCinematicBanner([
          '💥 护盾崩溃！PHASE 2',
          '双联炮塔已击毁，能量护盾消散。',
          '中央核心暴露——集中火力！'
        ], 2500);
      }
    }

    // 2. Core vulnerable (Phase 2 & 3)
    if (this.bossPhase === 2) {
      if (!this.nextCoreFire) this.nextCoreFire = 0;
      if (time > this.nextCoreFire) {
        // Fire spiral ring of bullets
        const count = 12;
        for (let i = 0; i < count; i++) {
          const b = this.enemyBullets.create(boss.x, boss.y + 40, 'bullet_enemy');
          b.setDepth(DEPTH.BULLETS);
          const angle = (i * Math.PI * 2) / count;
          b.setVelocity(Math.cos(angle) * 200, Math.sin(angle) * 200);
        }
        sounds.playEnemyPew();
        this.nextCoreFire = time + 2000;
      }

      // Transition to Phase 3 at <50% HP
      if (boss.hp < 25) { // max is 50
        this.bossPhase = 3;
        window.GameHUD?.setObjective("要塞核心超负荷！躲避毁灭死亡射线！");
        this.cameras.main.flash(300, 239, 68, 68); // red flash
        this.showCinematicBanner([
          '🔴 核心超负荷！PHASE 3 — FINAL',
          '星际堡垒濒死，正在释放毁灭死亡射线！',
          '全速闪避——不能让它触碰到先锋号！'
        ], 2500);
      }
    }

    // 3. Death Sweep Laser (Phase 3)
    if (this.bossPhase === 3) {
      // Fire fast spiral projectiles
      if (!this.nextCoreFire) this.nextCoreFire = 0;
      if (time > this.nextCoreFire) {
        const count = 8;
        const rotOffset = (time * 0.005);
        for (let i = 0; i < count; i++) {
          const b = this.enemyBullets.create(boss.x, boss.y + 40, 'bullet_enemy');
          b.setDepth(DEPTH.BULLETS);
          const angle = ((i * Math.PI * 2) / count) + rotOffset;
          b.setVelocity(Math.cos(angle) * 250, Math.sin(angle) * 250);
        }
        sounds.playEnemyPew();
        this.nextCoreFire = time + 1400;
      }

      // Handle Sweep Laser
      if (!this.laserSweepCycle) this.laserSweepCycle = 0;
      
      // Sweep cycle: 3 seconds cool, 1 second warning, 3 seconds firing
      const cycleDuration = 7000; // ms
      const phaseTime = time % cycleDuration;

      if (phaseTime < 3000) {
        // Cooldown
        this.bossLaserActive = false;
        this.bossLaserWarning = false;
      } else if (phaseTime < 4000) {
        // Warning
        this.bossLaserWarning = true;
        this.bossLaserActive = false;
        if (!this.bossLaserWarnSfx) {
          sounds.playShieldHit();
          this.bossLaserWarnSfx = true;
        }
      } else {
        // Laser sweeping active!
        this.bossLaserActive = true;
        this.bossLaserWarning = false;
        this.bossLaserWarnSfx = false;

        // Sweep angle back and forth (between 45 and 135 deg)
        const sweepSpeed = 0.001 * delta;
        this.bossLaserSweepAngle += sweepSpeed * this.bossLaserDir;
        if (this.bossLaserSweepAngle > 1.2) {
          this.bossLaserSweepAngle = 1.2;
          this.bossLaserDir = -1;
        }
        if (this.bossLaserSweepAngle < -1.2) {
          this.bossLaserSweepAngle = -1.2;
          this.bossLaserDir = 1;
        }

        // Draw sweeping laser line
        const bx = boss.x;
        const by = boss.y + 40;
        const laserLength = 700;
        // Project sweeping coordinates
        const targetX = bx + Math.sin(this.bossLaserSweepAngle) * laserLength;
        const targetY = by + Math.cos(this.bossLaserSweepAngle) * laserLength;

        this.laserGraphics.clear();
        
        // draw warning beam (thin red)
        this.laserGraphics.lineStyle(16, 0xef4444, 0.45);
        this.laserGraphics.beginPath();
        this.laserGraphics.moveTo(bx, by);
        this.laserGraphics.lineTo(targetX, targetY);
        this.laserGraphics.strokePath();

        this.laserGraphics.lineStyle(6, 0xffffff, 0.9);
        this.laserGraphics.beginPath();
        this.laserGraphics.moveTo(bx, by);
        this.laserGraphics.lineTo(targetX, targetY);
        this.laserGraphics.strokePath();

        // Laser Sweep Collision Detection (intersect line with player)
        // Check distance from player point to segment (bx, by) -> (targetX, targetY)
        const hit = this.checkPointToSegmentDistance(this.player.x, this.player.y, bx, by, targetX, targetY, 26);
        if (hit) {
          this.triggerPlayerDamage();
        }
      }

      // Draw Laser Sweep warnings
      if (this.bossLaserWarning) {
        this.laserGraphics.clear();
        this.laserGraphics.lineStyle(2, 0xef4444, Math.floor(time / 100) % 2 === 0 ? 0.7 : 0.1);
        // show warning line from core straight down
        this.laserGraphics.beginPath();
        this.laserGraphics.moveTo(boss.x, boss.y + 40);
        this.laserGraphics.lineTo(boss.x + Math.sin(this.bossLaserSweepAngle) * 700, boss.y + 40 + Math.cos(this.bossLaserSweepAngle) * 700);
        this.laserGraphics.strokePath();
      }
    }
  }

  // Math helper for laser sweep segment collision
  checkPointToSegmentDistance(px, py, x1, y1, x2, y2, tolerance) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    return dist < tolerance;
  }

  drawBossHPBar() {
    this.bossHealthBar.clear();
    const boss = this.boss;
    if (!boss || !boss.active) return;

    // Draw background outline
    this.bossHealthBar.fillStyle(0x1e293b, 0.8);
    this.bossHealthBar.fillRect(150, 24, 500, 16);
    this.bossHealthBar.lineStyle(2, 0x64748b, 1.0);
    this.bossHealthBar.strokeRect(150, 24, 500, 16);

    // HP Fill color
    // If shield active -> blue. If Core HP -> Red/Yellow
    let pct = boss.hp / 50;
    let color = 0xef4444; // red
    let label = "堡垒核心防御系统";

    if (this.bossShieldActive) {
      // Shield health based on turrets
      const turretHp = (this.bossTurrets[0].hp + this.bossTurrets[1].hp);
      pct = turretHp / 20; // 10 hp each
      color = 0x06b6d4; // cyan
      label = "要塞能量护盾发生器 (击破两侧炮塔)";
    } else if (this.bossPhase === 3) {
      color = 0xeab308; // flashing yellow
      label = "要塞核心能量熔毁中！";
    }

    this.bossHealthBar.fillStyle(color, 1.0);
    this.bossHealthBar.fillRect(151, 25, Math.max(0, 498 * pct), 14);
  }

  // ── Bullet hits Boss core/turrets ──
  damageBossTurret(turret, damage) {
    if (!turret.active) return;
    turret.hp -= damage;
    
    turret.setTint(0xff8888);
    this.time.delayedCall(80, () => {
      if (turret.active) turret.clearTint();
    });

    if (turret.hp <= 0) {
      this.explodeEntity(turret, 'large');
      turret.destroy();
      sounds.playExplosion(true);
      this.cameras.main.shake(300, 0.015);
    }
  }

  damageBossCore(damage) {
    const boss = this.boss;
    if (!boss || !boss.active) return;
    
    boss.hp -= damage;
    
    boss.setTint(0xff8888);
    this.time.delayedCall(80, () => {
      if (boss.active) boss.clearTint();
    });

    if (boss.hp <= 0) {
      this.triggerBossDefeat();
    }
  }

  // ── Player Damage handling & Collisions ──
  playerHit(player, entity) {
    // If bullet, destroy bullet
    if (entity.texture && entity.texture.key === 'bullet_enemy') {
      entity.destroy();
    }

    this.triggerPlayerDamage();
  }

  triggerPlayerDamage() {
    if (this.isInvincible || this.gameOverTriggered) return;

    this.playerHp--;
    sounds.playHurt();
    
    // Weapon penalty - lose 2 crystals (which degrades level!)
    this.crystalsCollected = Math.max(0, this.crystalsCollected - 2);
    window.GameHUD?.setScore(this.crystalsCollected);

    // Update HUD hearts
    window.GameHUD?.setHearts(this.playerHp, 3);
    
    // Screen Flash
    this.cameras.main.flash(200, 239, 68, 68, 0.6); // Red flash
    this.cameras.main.shake(200, 0.015);

    if (this.playerHp <= 0) {
      this.triggerGameOver(false);
    } else {
      // Trigger invincibility frames
      this.isInvincible = true;
      this.invincibleTimer = 1500; // 1.5 seconds
    }
  }

  // ── Boss defeat & Level transition logic ──
  triggerBossDefeat() {
    this.boss.active = false;
    this.bossHealthBar.clear();
    this.bossShieldGraphics.clear();
    this.laserGraphics.clear();
    this.stopLaserHum();

    // Spawn crystals explosion
    for (let i = 0; i < 15; i++) {
      const c = this.crystals.create(this.boss.x + Phaser.Math.Between(-80, 80), this.boss.y + Phaser.Math.Between(-40, 40), 'crystal');
      c.setDepth(DEPTH.CRYSTALS);
      c.setVelocity(Phaser.Math.Between(-150, 150), Phaser.Math.Between(-100, 200));
    }

    // Chain explosions
    let explCount = 0;
    const explEvent = this.time.addEvent({
      delay: 200,
      repeat: 8,
      callback: () => {
        explCount++;
        sounds.playExplosion(true);
        this.cameras.main.shake(200, 0.02);
        
        // Spawn particles at center
        const bx = this.boss.x + Phaser.Math.Between(-100, 100);
        const by = this.boss.y + Phaser.Math.Between(-50, 50);
        this.createSparks(bx, by, 0xf97316, 25);
        this.createSparks(bx, by, 0xfde047, 25);
        
        if (explCount >= 8) {
          // Final destroy
          this.explodeEntity(this.boss, 'large');
          this.boss.destroy();
          this.triggerGameOver(true);
        }
      }
    });
  }

  triggerLevelClear() {
    this.levelComplete = true;
    this.levelTransitionTimer = 2200; // 2.2 seconds wait

    // clear all active bullets, enemies, asteroids
    this.asteroids.getChildren().forEach(ast => {
      this.createSparks(ast.x, ast.y, 0x94a3b8, 10);
      ast.destroy();
    });
    this.enemies.getChildren().forEach(enemy => {
      this.createSparks(enemy.x, enemy.y, 0xef4444, 10);
      enemy.destroy();
    });
    this.playerBullets.clear(true, true);
    this.enemyBullets.clear(true, true);

    // Display "LEVEL CLEAR" text banner
    this.levelText = this.add.text(400, 280, 'LEVEL CLEAR', {
      fontFamily: 'monospace',
      fontSize: '48px',
      fontWeight: 'bold',
      fill: '#4ade80'
    }).setOrigin(0.5).setDepth(DEPTH.HUD_OVERLAY);

    sounds.playLevelUp();
    this.cameras.main.flash(300, 74, 222, 128); // Green flash
  }

  showCinematicBanner(lines, duration = 3000) {
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;
    const bg = this.add.rectangle(cx, cy, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.78)
      .setScrollFactor(0).setDepth(DEPTH.HUD_OVERLAY + 50);
    const textObjs = lines.map((line, i) => {
      const y = cy - (lines.length * 16) + i * 32;
      const isTitle = i === 0;
      return this.add.text(cx, y, line, {
        font: `${isTitle ? 'bold ' : ''}${isTitle ? '22px' : '14px'} monospace`,
        fill: isTitle ? '#f59e0b' : '#e2e8f0',
        stroke: '#000000',
        strokeThickness: 3,
        align: 'center'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.HUD_OVERLAY + 51);
    });
    this.time.delayedCall(duration, () => {
      bg.destroy();
      textObjs.forEach(t => t.destroy());
    });
  }

  transitionToNextLevel() {
    if (this.levelText) this.levelText.destroy();
    this.levelComplete = false;
    this.levelScore = 0;
    this.currentLevel++;

    if (this.currentLevel === 2) {
      window.GameHUD?.setObjective("第二关：击溃敌舰先锋编队！ (击落15架敌机)");
      this.nextSpawnTime = this.time.now + 1000;
      this.showCinematicBanner([
        '⚠ 第二关：帝国舰队先锋编队',
        '穿出陨石带，前方是帝国巡逻编队。',
        '15架战机已进入交战范围——',
        '全力开炮，击溃先锋！'
      ], 3000);
    } else if (this.currentLevel === 3) {
      window.GameHUD?.setObjective("终极关卡：决战星际堡垒要塞！");
      this.nextSpawnTime = this.time.now + 1000;
      this.showCinematicBanner([
        '🔴 终极关卡：星际堡垒',
        '帝国最强防御工事正前方出现。',
        '双联炮塔、能量护盾、核心死亡射线……',
        '这是最后的战役。先锋号，全力冲刺！'
      ], 3500);
    }
  }

  triggerGameOver(win) {
    if (this.gameOverTriggered) return;
    this.gameOverTriggered = true;
    this.physics.pause();
    this.stopLaserHum();

    if (win) {
      // Victory screen
      window.GameHUD?.showGameOver(true,
        '🌟 银河系得救了！\n\n' +
        '先锋号战机单枪匹马，穿越陨石风暴、击溃舰队先锋，\n' +
        '摧毁了帝国最强大的防御壁垒——星际堡垒。\n\n' +
        '核心爆炸的冲击波在宇宙中蔓延，\n如同第二颗太阳照亮了整个星系。\n\n' +
        '自由星系广播响彻银河：先锋号归来！'
      );
    } else {
      // Defeat screen
      this.explodeEntity(this.player, 'large');
      this.player.destroy();
      sounds.playExplosion(true);

      this.time.delayedCall(1200, () => {
        window.GameHUD?.showGameOver(false,
          '💀 先锋号坠毁\n\n' +
          '帝国防线坚不可摧，战机在炮火中化为灰烬……\n' +
          '星际堡垒启动超时空炮，星系的命运悬于一线。\n\n' +
          '但先锋号的牺牲绝不会被遗忘。\n也许，下一次会有所不同。'
        );
      });
    }
  }

  // ── Particle Sparks Effect & Explosion helpers ──
  createSparks(x, y, color = 0xffffff, count = 15) {
    const graphics = this.add.graphics();
    graphics.setDepth(DEPTH.EFFECTS);
    
    const particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: x,
        y: y,
        vx: Phaser.Math.Between(-250, 250),
        vy: Phaser.Math.Between(-250, 250),
        alpha: 1.0,
        size: Phaser.Math.Between(2, 4)
      });
    }

    const timer = this.time.addEvent({
      delay: 16,
      repeat: 24,
      callback: () => {
        graphics.clear();
        particles.forEach(p => {
          p.x += p.vx * 0.016;
          p.y += p.vy * 0.016;
          p.alpha -= 0.04;
          graphics.fillStyle(color, Math.max(0, p.alpha));
          graphics.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
        });
      },
      onComplete: () => {
        graphics.destroy();
      }
    });
  }

  explodeEntity(entity, size = 'small') {
    const color = (entity.texture.key === 'asteroid_large' || entity.texture.key === 'asteroid_small') 
      ? 0x94a3b8  // Grey debris
      : 0xef4444; // Red/orange flame
    
    // Spawn debris sparks
    this.createSparks(entity.x, entity.y, color, size === 'large' ? 30 : 15);
    
    // Drop energy crystal (40% drop rate, only from enemies/asteroids, not bullets/boss core)
    const canDrop = entity.texture.key !== 'player_ship' && entity.texture.key !== 'boss_core';
    if (canDrop && Math.random() < 0.40) {
      const crystal = this.crystals.create(entity.x, entity.y, 'crystal');
      crystal.setDepth(DEPTH.CRYSTALS);
      crystal.setVelocityY(100);
      crystal.setAngularVelocity(Phaser.Math.Between(100, 200));
    }
  }

  // ── Level 3 Boss Specific spawning details ──
  spawnStarFortress() {
    // Core is at center
    this.boss = this.physics.add.sprite(400, -100, 'boss_core');
    this.boss.setDepth(DEPTH.ENEMIES);
    this.boss.hp = 50; // High health
    this.boss.body.setCircle(55, 5, 5); // Circular hitbox

    // Left turret
    const tLeft = this.physics.add.sprite(260, -110, 'boss_turret');
    tLeft.setDepth(DEPTH.ENEMIES + 5);
    tLeft.hp = 10;
    this.bossTurrets.push(tLeft);

    // Right turret
    const tRight = this.physics.add.sprite(540, -110, 'boss_turret');
    tRight.setDepth(DEPTH.ENEMIES + 5);
    tRight.hp = 10;
    this.bossTurrets.push(tRight);

    // Allow player bullets to overlap with turrets and core
    this.physics.add.overlap(this.playerBullets, tLeft, (turret, bullet) => {
      bullet.destroy();
      this.damageBossTurret(turret, bullet.damageAmount);
    });
    this.physics.add.overlap(this.playerBullets, tRight, (turret, bullet) => {
      bullet.destroy();
      this.damageBossTurret(turret, bullet.damageAmount);
    });

    this.physics.add.overlap(this.playerBullets, this.boss, (core, bullet) => {
      bullet.destroy();
      if (this.bossShieldActive) {
        // Shield absorbs bullet
        sounds.playShieldHit();
        this.bossShieldPulse = 1.0;
      } else {
        this.damageBossCore(bullet.damageAmount);
      }
    });

    // Also add collisions with player
    this.physics.add.overlap(this.player, this.boss, this.playerHit, null, this);
    this.physics.add.overlap(this.player, tLeft, this.playerHit, null, this);
    this.physics.add.overlap(this.player, tRight, this.playerHit, null, this);

    // Play warning sound & trigger brief red alert overlay
    sounds.playExplosion(true);
    this.cameras.main.shake(1000, 0.015);
  }
}

// ── Game Boot Config ──
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

// Start the game!
new Phaser.Game(config);
