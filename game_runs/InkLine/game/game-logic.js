/* InkLine — 一线：未完成的画（完整管线版）
 * 线条平台跳跃 (lineart side-scroller).
 * - 角色：程序化多帧 squash 动画墨团（线条风用程序化更可控，真帧动画）
 * - 地面/平台：tilemap.json solid 层 + 程序化线框瓦片(米白填充黑描边)+ 静态碰撞体
 * - 背景：scene/panorama.png（米白画纸）
 */

const GAME_W = 960;
const GAME_H = 540;
const TILE = 64;
const WORLD_W = (TILEMAP_DATA.width || 75) * TILE;
const WORLD_H = (TILEMAP_DATA.height || 9) * TILE;
const FLOOR_TOP = WORLD_H - 2 * TILE;

const GOAL_SCORE = 10;
const PLAYER_SPEED = 210;
const JUMP_V = 520;
const INK = 0x1a1a1a;
const PAPER = 0xfaf6ea;

const DROPS = [
  { x: 360, y: FLOOR_TOP - 60 }, { x: 560, y: 300 }, { x: 820, y: 360 },
  { x: 1180, y: 320 }, { x: 1500, y: 260 }, { x: 1900, y: 360 },
  { x: 2300, y: 280 }, { x: 2700, y: 360 }, { x: 3120, y: 260 },
  { x: 3520, y: 320 }, { x: 3960, y: 300 }, { x: 4300, y: FLOOR_TOP - 60 },
];
const SPIKES = [700, 1350, 2150, 2950, 3700];
const ERASERS = [{ x: 1000, range: 180 }, { x: 2400, range: 220 }, { x: 3300, range: 200 }];

class InkLineScene extends Phaser.Scene {
  constructor() { super('InkLineScene'); }

  preload() { this.load.image('paper', 'scene/panorama.png'); }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H + 200);
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_H);

    this._makeTextures();

    this.bg = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'paper')
      .setOrigin(0, 0).setScrollFactor(0).setTileScale(GAME_H / 864, GAME_H / 864).setDepth(-100);

    // 瓦片地面/平台（程序化线框瓦片 + 碰撞）
    this.solids = this.physics.add.staticGroup();
    this._renderTileLayer('solid', 0, true);

    this._makeAnims();

    // 玩家墨团（贴左出生 + 世界边界）— 程序化多帧 squash 动画
    this.player = this.physics.add.sprite(60, FLOOR_TOP - 40, 'blobf0');
    this.player.setCollideWorldBounds(true);
    this.player.body.setCircle(12, 3, 3);
    this.player.setDepth(20);
    this.physics.add.collider(this.player, this.solids);
    this.player.play('ink_idle');
    this.lastSafeX = 60;

    // 墨滴
    this.drops = this.physics.add.group({ allowGravity: false, immovable: true });
    for (const d of DROPS) {
      const s = this.drops.create(d.x, d.y, 'drop'); s.setDepth(15);
      this.tweens.add({ targets: s, y: d.y - 10, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    this.physics.add.overlap(this.player, this.drops, this._collect, null, this);

    // 尖刺
    this.spikes = this.physics.add.staticGroup();
    for (const sx of SPIKES) {
      const s = this.spikes.create(sx, FLOOR_TOP - 8, 'spike');
      s.body.setSize(30, 14).setOffset(3, 12); s.setDepth(16);
    }
    this.physics.add.overlap(this.player, this.spikes, this._hit, null, this);

    // 橡皮怪
    this.erasers = this.physics.add.group({ allowGravity: false });
    for (const e of ERASERS) {
      const s = this.erasers.create(e.x, FLOOR_TOP - 18, 'eraser');
      s.setDepth(17); s.body.setSize(34, 30);
      s.setData('minX', e.x - e.range); s.setData('maxX', e.x + e.range);
      s.setVelocityX(60); s.setImmovable(true);
    }
    this.physics.add.overlap(this.player, this.erasers, this._hit, null, this);

    // 终点笔尖
    this.goal = this.physics.add.staticImage(WORLD_W - 120, FLOOR_TOP - 50, 'nib').setDepth(15);
    this.goalGlow = this.add.circle(WORLD_W - 120, FLOOR_TOP - 50, 46, 0x6fd0c8, 0.18).setDepth(14);
    this.tweens.add({ targets: this.goalGlow, scale: 1.3, alpha: 0.34, duration: 1300, yoyo: true, repeat: -1 });
    this.physics.add.overlap(this.player, this.goal, this._reachGoal, null, this);

    this.maxHp = 3; this.hp = 3; this.score = 0;
    this.reachedGoal = false; this.invuln = false;
    this.gameStarted = false; this.gameOver = false;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE');
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(180, 200);

    window.__gameState = { player: this.player };

    if (window.GameHUD) {
      window.GameHUD.onStart(() => {
        this.gameStarted = true;
        window.GameHUD.setHearts(this.hp, this.maxHp);
        window.GameHUD.setScore(this.score);
        window.GameHUD.setObjective(`收集 ${GOAL_SCORE} 滴墨，抵达画纸尽头（已 ${this.score}）`);
      });
    }
  }

  _renderTileLayer(layerName, depth, collision) {
    const data = (TILEMAP_DATA.layers || {})[layerName];
    if (!data) return;
    const W = TILEMAP_DATA.width, TW = TILEMAP_DATA.tileWidth, TH = TILEMAP_DATA.tileHeight;
    data.forEach((id, i) => {
      if (!id) return;
      const x = (i % W) * TW + TW / 2;
      const y = Math.floor(i / W) * TH + TH / 2;
      const sp = this.add.image(x, y, `tile_${id}`).setDisplaySize(TW, TH).setDepth(depth);
      if (collision) { this.solids.add(sp); sp.body.setSize(TW, TH); }
    });
  }

  _makeAnims() {
    // 程序化帧动画：idle 轻微 squash 呼吸，move 更快弹跳
    const idle = ['blobf0', 'blobf1', 'blobf2', 'blobf1'];
    const move = ['blobf0', 'blobf3', 'blobf4', 'blobf3'];
    if (!this.anims.exists('ink_idle'))
      this.anims.create({ key: 'ink_idle', frames: idle.map(k => ({ key: k })), frameRate: 5, repeat: -1 });
    if (!this.anims.exists('ink_move'))
      this.anims.create({ key: 'ink_move', frames: move.map(k => ({ key: k })), frameRate: 12, repeat: -1 });
  }

  _makeTextures() {
    // 线框瓦片 tile_1：米白填充 + 黑描边
    let g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(PAPER, 1); g.fillRect(0, 0, 64, 64);
    g.lineStyle(3, INK, 1); g.strokeRect(1, 1, 62, 62);
    g.lineStyle(1, INK, 0.25); g.beginPath(); g.moveTo(0, 20); g.lineTo(64, 20); g.strokePath();
    g.generateTexture('tile_1', 64, 64); g.destroy();

    // 墨团 squash 帧 blobf0..4（圆头 + 白眼，不同压扁度）
    const blob = (key, sx, sy) => {
      const w = 30, h = 30; const g2 = this.make.graphics({ x: 0, y: 0, add: false });
      const cx = 15, cy = 16, rx = 13 * sx, ry = 13 * sy;
      g2.fillStyle(INK, 1); g2.fillEllipse(cx, cy + (13 - ry), rx, ry);
      g2.fillStyle(0xffffff, 1); g2.fillCircle(cx - 4, cy - 4 + (13 - ry), 3); g2.fillCircle(cx + 4, cy - 4 + (13 - ry), 3);
      g2.fillStyle(INK, 1); g2.fillCircle(cx - 4, cy - 4 + (13 - ry), 1.3); g2.fillCircle(cx + 4, cy - 4 + (13 - ry), 1.3);
      g2.generateTexture(key, w, h); g2.destroy();
    };
    blob('blobf0', 1.0, 1.0);
    blob('blobf1', 1.05, 0.95);
    blob('blobf2', 0.95, 1.05);
    blob('blobf3', 1.15, 0.82);
    blob('blobf4', 0.82, 1.18);

    // 墨滴
    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(INK, 1); g.fillCircle(8, 12, 6); g.fillTriangle(8, 0, 3, 9, 13, 9);
    g.fillStyle(0xffffff, 0.7); g.fillCircle(6, 10, 1.6);
    g.generateTexture('drop', 16, 18); g.destroy();

    // 尖刺
    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(PAPER, 1); g.lineStyle(3, INK, 1);
    [0, 12, 24].forEach(ox => { g.fillTriangle(ox, 26, ox + 6, 4, ox + 12, 26); g.strokeTriangle(ox, 26, ox + 6, 4, ox + 12, 26); });
    g.generateTexture('spike', 36, 26); g.destroy();

    // 橡皮怪
    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xc9c4bb, 1); g.lineStyle(3, INK, 1);
    g.fillRoundedRect(2, 2, 34, 30, 6); g.strokeRoundedRect(2, 2, 34, 30, 6);
    g.fillStyle(INK, 1); g.fillRect(10, 12, 5, 6); g.fillRect(23, 12, 5, 6);
    g.generateTexture('eraser', 38, 34); g.destroy();

    // 笔尖
    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x6fd0c8, 1); g.fillCircle(11, 12, 9);
    g.fillStyle(0xffffff, 1); g.fillCircle(11, 12, 4);
    g.lineStyle(3, INK, 1); g.beginPath(); g.moveTo(11, 20); g.lineTo(11, 68); g.strokePath();
    g.generateTexture('nib', 22, 72); g.destroy();
  }

  _collect(player, drop) {
    if (!this.gameStarted || this.gameOver) return;
    drop.destroy(); this.score++;
    window.GameHUD?.setScore(this.score);
    const f = this.add.circle(drop.x, drop.y, 5, INK, 0.8).setDepth(30);
    this.tweens.add({ targets: f, scale: 3, alpha: 0, duration: 320, onComplete: () => f.destroy() });
    window.GameHUD?.setObjective(this.score >= GOAL_SCORE
      ? '墨滴已集齐！奔向画纸尽头的笔尖 →'
      : `收集 ${GOAL_SCORE} 滴墨，抵达画纸尽头（已 ${this.score}）`);
  }

  _hit(player, hazard) {
    if (!this.gameStarted || this.gameOver || this.invuln) return;
    this._damage(1);
    const dir = this.player.x < hazard.x ? -1 : 1;
    this.player.setVelocity(150 * dir, -220);
  }

  _damage(n) {
    this.hp = Math.max(0, this.hp - n);
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    this.invuln = true; this.player.setAlpha(0.4);
    this.time.delayedCall(850, () => { this.invuln = false; this.player.setAlpha(1); });
    if (this.hp <= 0) this._lose();
  }

  _reachGoal() {
    if (!this.gameStarted || this.gameOver || this.reachedGoal) return;
    if (this.score >= GOAL_SCORE) { this.reachedGoal = true; this._win(); }
    else window.GameHUD?.setObjective(`笔尖还需 ${GOAL_SCORE - this.score} 滴墨才能落下`);
  }

  _win() {
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0);
    window.GameHUD?.showGameOver(true, '最后一滴墨落下，断裂的线条自动连缀成完整的画，米白画纸绽放出第一抹色彩——小墨终于画完了自己的世界。');
  }
  _lose() {
    if (this.gameOver) return;
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0);
    window.GameHUD?.showGameOver(false, '小墨被橡皮怪擦去了轮廓，世界重新变回一片空白……');
  }

  update() {
    if (this.bg) this.bg.tilePositionX = this.cameras.main.scrollX * 0.3;
    if (!this.gameStarted || this.gameOver) return;

    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const jump = this.cursors.up.isDown || this.keys.W.isDown || this.keys.SPACE.isDown;

    if (left) { this.player.setVelocityX(-PLAYER_SPEED); this.player.setFlipX(true); }
    else if (right) { this.player.setVelocityX(PLAYER_SPEED); this.player.setFlipX(false); }
    else this.player.setVelocityX(0);
    if (jump && onGround) this.player.setVelocityY(-JUMP_V);

    const moving = left || right || !onGround;
    const anim = moving ? 'ink_move' : 'ink_idle';
    if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== anim) this.player.play(anim, true);

    this.erasers.getChildren().forEach(e => {
      if (e.x <= e.getData('minX')) e.setVelocityX(60);
      else if (e.x >= e.getData('maxX')) e.setVelocityX(-60);
    });

    if (onGround) this.lastSafeX = this.player.x;
    if (this.player.y > WORLD_H + 80) {
      this.player.setVelocity(0, 0);
      this.player.setPosition(this.lastSafeX, FLOOR_TOP - 60);
      if (!this.invuln) this._damage(1);
    }
  }
}

const config = {
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  parent: 'game-container',
  backgroundColor: '#faf6ea',
  physics: { default: 'arcade', arcade: { gravity: { y: 1100 }, debug: false } },
  scene: InkLineScene,
};

new Phaser.Game(config);
