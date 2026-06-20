/* ShadowLeap — 影跃：迷雾森林（完整管线版）
 * 剪影解谜跑酷 (silhouette side-scroller).
 * - 角色：char-sprite 真序列帧图集 ShadowBoy（idle/run/jump，9帧/行）
 * - 地面：material-texture 瓦片，经 tilemap.json 的 solid 层渲染并生成静态碰撞体
 * - 背景：scene/panorama.png 视差
 */

const GAME_W = 960;
const GAME_H = 540;
const TILE = 64;
const WORLD_W = (TILEMAP_DATA.width || 75) * TILE;   // 4800
const WORLD_H = (TILEMAP_DATA.height || 9) * TILE;    // 576

const GOAL_SCORE = 8;
const PLAYER_SPEED = 220;
const JUMP_V = 560;

// 空中漂浮的光点（跳跃可及）
const MOTES = [
  { x: 360, y: 430 }, { x: 620, y: 360 }, { x: 980, y: 300 },
  { x: 1180, y: 360 }, { x: 1500, y: 250 }, { x: 1800, y: 360 },
  { x: 2150, y: 320 }, { x: 2520, y: 360 }, { x: 2900, y: 300 },
  { x: 3200, y: 360 }, { x: 3600, y: 320 }, { x: 4100, y: 360 },
];
const TRAPS = [780, 1280, 2050, 2650, 3450, 4150];
const PITS = [[21 * TILE, 25 * TILE], [45 * TILE, 48 * TILE]];

const DEPTH = { GROUND: 0, YSORT: 1000, EFFECTS: 9500 };

class ShadowLeapScene extends Phaser.Scene {
  constructor() { super('ShadowLeapScene'); }

  preload() {
    this.load.image('panorama', 'scene/panorama.png');
    // 瓦片贴图（按 tileIndex 加载）
    const idx = TILEMAP_DATA.tileIndex || {};
    for (const [id, name] of Object.entries(idx)) {
      this.load.image(`tile_${id}`, `assets/tiles/${name}.png`);
    }
    // 角色精灵图集
    this.load.spritesheet('shadowboy', 'assets/sprites/ShadowBoy.webp', { frameWidth: 192, frameHeight: 208 });
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H + 200);
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_H);

    this._makeFxTextures();

    // 背景视差
    this.bg = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'panorama')
      .setOrigin(0, 0).setScrollFactor(0).setTileScale(GAME_H / 864, GAME_H / 864).setDepth(-100);

    // 瓦片地面（从 tilemap.json solid 层渲染 + 静态碰撞体）
    this.solids = this.physics.add.staticGroup();
    this._renderTileLayer('solid', DEPTH.GROUND, true);

    // 角色动画
    this._makeAnims();

    // 玩家
    this.player = this.physics.add.sprite(120, WORLD_H - 3 * TILE, 'shadowboy', 0);
    this.player.setScale(0.42);
    this.player.body.setSize(70, 150).setOffset(60, 55);
    this.player.setCollideWorldBounds(false);
    this.player.setDepth(DEPTH.YSORT);
    this.physics.add.collider(this.player, this.solids);
    this.player.play('sb_idle');
    this.lastSafeX = 120;

    // 光点
    this.motes = this.physics.add.group({ allowGravity: false, immovable: true });
    for (const m of MOTES) {
      const s = this.motes.create(m.x, m.y, 'mote'); s.setDepth(15);
      this.tweens.add({ targets: s, y: m.y - 12, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    this.physics.add.overlap(this.player, this.motes, this._collectMote, null, this);

    // 捕兽夹
    this.traps = this.physics.add.staticGroup();
    for (const tx of TRAPS) {
      const s = this.traps.create(tx, WORLD_H - 2 * TILE - 6, 'trap');
      s.body.setSize(34, 16).setOffset(3, 12); s.setDepth(16);
    }
    this.physics.add.overlap(this.player, this.traps, this._hitHazard, null, this);

    // 坠石
    this.rocks = this.physics.add.group();
    this.physics.add.collider(this.rocks, this.solids, (rock) => {
      this.tweens.add({ targets: rock, alpha: 0, duration: 200, onComplete: () => rock.destroy() });
    });
    this.physics.add.overlap(this.player, this.rocks, this._hitHazard, null, this);

    // 终点光源
    this.goal = this.physics.add.staticImage(WORLD_W - 120, WORLD_H - 2 * TILE - 60, 'goal').setDepth(15);
    this.goalGlow = this.add.circle(WORLD_W - 120, WORLD_H - 2 * TILE - 60, 60, 0xfff0c0, 0.18).setDepth(14);
    this.tweens.add({ targets: this.goalGlow, scale: 1.3, alpha: 0.32, duration: 1400, yoyo: true, repeat: -1 });
    this.physics.add.overlap(this.player, this.goal, this._reachGoal, null, this);

    // 状态
    this.maxHp = 3; this.hp = 3; this.score = 0;
    this.reachedGoal = false; this.invuln = false;
    this.gameStarted = false; this.gameOver = false;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE');
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(180, 200);

    this.rockTimer = this.time.addEvent({ delay: 1700, loop: true, callback: this._dropRock, callbackScope: this });

    window.__gameState = { player: this.player };

    if (window.GameHUD) {
      window.GameHUD.onStart(() => {
        this.gameStarted = true;
        window.GameHUD.setHearts(this.hp, this.maxHp);
        window.GameHUD.setScore(this.score);
        window.GameHUD.setObjective(`向右奔跑，收集 ${GOAL_SCORE} 点微光（已 ${this.score}）`);
      });
    }
  }

  // 从 tilemap 层渲染瓦片并按需生成静态碰撞体
  _renderTileLayer(layerName, baseDepth, collision) {
    const data = (TILEMAP_DATA.layers || {})[layerName];
    if (!data) return;
    const W = TILEMAP_DATA.width, TW = TILEMAP_DATA.tileWidth, TH = TILEMAP_DATA.tileHeight;
    data.forEach((id, i) => {
      if (!id) return;
      const x = (i % W) * TW + TW / 2;
      const y = Math.floor(i / W) * TH + TH / 2;
      const sp = this.add.image(x, y, `tile_${id}`).setDisplaySize(TW, TH).setDepth(baseDepth);
      if (collision) { this.solids.add(sp); sp.body.setSize(TW, TH); }
    });
  }

  _makeAnims() {
    const def = (key, row, fps, loop) => {
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers('shadowboy', { start: row * 9, end: row * 9 + 8 }),
        frameRate: fps, repeat: loop ? -1 : 0,
      });
    };
    def('sb_idle', 0, 8, true);
    def('sb_run', 1, 14, true);
    def('sb_jump', 2, 10, false);
  }

  _makeFxTextures() {
    let g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xfff3c0, 0.25); g.fillCircle(8, 8, 8);
    g.fillStyle(0xfff7d6, 0.6); g.fillCircle(8, 8, 4.5);
    g.fillStyle(0xffffff, 1); g.fillCircle(8, 8, 2);
    g.generateTexture('mote', 16, 16); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x000000, 1);
    g.fillTriangle(2, 26, 8, 6, 14, 26); g.fillTriangle(14, 26, 20, 8, 26, 26);
    g.fillTriangle(26, 26, 32, 6, 38, 26); g.fillRect(2, 24, 36, 4);
    g.generateTexture('trap', 40, 28); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x05060b, 1); g.fillCircle(14, 14, 13);
    g.generateTexture('rock', 28, 28); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xfff0c0, 0.9); g.fillCircle(12, 14, 10);
    g.fillStyle(0xffffff, 1); g.fillCircle(12, 14, 5);
    g.fillStyle(0xfff0c0, 0.35); g.fillRect(9, 14, 6, 66);
    g.generateTexture('goal', 24, 84); g.destroy();
  }

  _collectMote(player, mote) {
    if (!this.gameStarted || this.gameOver) return;
    mote.destroy(); this.score++;
    window.GameHUD?.setScore(this.score);
    const flash = this.add.circle(mote.x, mote.y, 6, 0xffffff, 0.9).setDepth(DEPTH.EFFECTS);
    this.tweens.add({ targets: flash, scale: 3, alpha: 0, duration: 350, onComplete: () => flash.destroy() });
    window.GameHUD?.setObjective(this.score >= GOAL_SCORE
      ? '微光已聚齐！奔向森林深处的光源 →'
      : `向右奔跑，收集 ${GOAL_SCORE} 点微光（已 ${this.score}）`);
  }

  _dropRock() {
    if (!this.gameStarted || this.gameOver) return;
    const px = Phaser.Math.Clamp(this.player.x + Phaser.Math.Between(-40, 160), 60, WORLD_W - 60);
    const rock = this.rocks.create(px, this.cameras.main.scrollY - 20, 'rock');
    rock.setDepth(18); rock.body.setCircle(13); rock.setVelocityY(180);
  }

  _hitHazard(player, hazard) {
    if (!this.gameStarted || this.gameOver || this.invuln) return;
    if (hazard.texture && hazard.texture.key === 'rock') {
      this.tweens.add({ targets: hazard, alpha: 0, duration: 150, onComplete: () => hazard.destroy() });
    }
    this._damage(1);
    const dir = this.player.flipX ? 1 : -1;
    this.player.setVelocity(120 * dir, -200);
  }

  _damage(n) {
    this.hp = Math.max(0, this.hp - n);
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    this.invuln = true; this.player.setAlpha(0.4);
    this.time.delayedCall(900, () => { this.invuln = false; this.player.setAlpha(1); });
    if (this.hp <= 0) this._lose();
  }

  _reachGoal() {
    if (!this.gameStarted || this.gameOver || this.reachedGoal) return;
    if (this.score >= GOAL_SCORE) { this.reachedGoal = true; this._win(); }
    else window.GameHUD?.setObjective(`光源还需 ${GOAL_SCORE - this.score} 点微光才能点亮`);
  }

  _win() {
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0);
    window.GameHUD?.showGameOver(true, '男孩触到了那团光——迷雾退散，妹妹的剪影在晨曦中向他伸出手，森林第一次有了颜色。');
  }
  _lose() {
    if (this.gameOver) return;
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0);
    window.GameHUD?.showGameOver(false, '迷雾吞没了那点微光……');
  }

  update() {
    if (this.bg) this.bg.tilePositionX = this.cameras.main.scrollX * 0.35;
    if (!this.gameStarted || this.gameOver) return;

    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const jump = this.cursors.up.isDown || this.keys.W.isDown || this.keys.SPACE.isDown;

    if (left) { this.player.setVelocityX(-PLAYER_SPEED); this.player.setFlipX(true); }
    else if (right) { this.player.setVelocityX(PLAYER_SPEED); this.player.setFlipX(false); }
    else this.player.setVelocityX(0);
    if (jump && onGround) this.player.setVelocityY(-JUMP_V);

    // 动画状态机
    let target;
    if (!onGround) target = 'sb_jump';
    else if (left || right) target = 'sb_run';
    else target = 'sb_idle';
    if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== target) {
      this.player.play(target, true);
    }

    if (onGround) {
      const overPit = PITS.some(p => this.player.x > p[0] - 10 && this.player.x < p[1] + 10);
      if (!overPit) this.lastSafeX = this.player.x;
    }
    if (this.player.y > WORLD_H + 80) {
      this.player.setVelocity(0, 0);
      this.player.setPosition(this.lastSafeX, WORLD_H - 3 * TILE);
      if (!this.invuln) this._damage(1);
    }

    this.rocks.getChildren().forEach(r => { if (r.y > GAME_H + 200) r.destroy(); });
  }
}

const config = {
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  parent: 'game-container',
  backgroundColor: '#0a0e16',
  physics: { default: 'arcade', arcade: { gravity: { y: 1100 }, debug: false } },
  scene: ShadowLeapScene,
};

new Phaser.Game(config);
