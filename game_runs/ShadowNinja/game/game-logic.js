/* ShadowNinja — 影忍：将军府之夜
 * 剪影潜行 (silhouette stealth side-scroller). scene/panorama.png 作将军府夜景背景，
 * 忍者/守卫/视野光锥/探照灯/门钥程序化绘制。S/↓ 蹲伏潜入阴影（不被察觉）。
 */

const GAME_W = 960;
const GAME_H = 540;
const WORLD_W = 4800;

const FLOOR_TOP = 470;
const GOAL_SCORE = 5;
const PLAYER_SPEED = 200;
const CROUCH_SPEED = 90;
const JUMP_V = 480;

const WARM = 0xffd27a;

// 巡逻武士 {x, range}
const GUARDS = [
  { x: 1000, range: 240 }, { x: 1900, range: 220 },
  { x: 2700, range: 240 }, { x: 3500, range: 220 },
];
// 望楼探照灯 x 位置
const LIGHTS = [1450, 2300, 3100, 3900];
// 门钥
const KEYS = [
  { x: 520, y: 410 }, { x: 1300, y: 410 }, { x: 2150, y: 410 },
  { x: 2950, y: 410 }, { x: 3750, y: 410 }, { x: 4250, y: 410 },
];

class ShadowNinjaScene extends Phaser.Scene {
  constructor() { super('ShadowNinjaScene'); }

  preload() { this.load.image('manor', 'scene/panorama.png'); }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_W, GAME_H + 300);
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_H);

    this._makeTextures();

    this.bg = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'manor')
      .setOrigin(0, 0).setScrollFactor(0).setTileScale(GAME_H / 864, GAME_H / 864).setDepth(-100);

    // 地面
    this.solids = this.physics.add.staticGroup();
    const floor = this.add.rectangle(WORLD_W / 2, FLOOR_TOP + 40, WORLD_W, 100, 0x05060c);
    this.solids.add(floor);

    // 玩家（贴左出生 + 世界边界碰撞）
    this.player = this.physics.add.sprite(60, FLOOR_TOP - 40, 'ninja');
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(20, 42).setOffset(6, 4);
    this.player.setDepth(20);
    this.physics.add.collider(this.player, this.solids);
    this.lastSafeX = 60;

    // 门钥
    this.keys2 = this.physics.add.group({ allowGravity: false, immovable: true });
    for (const k of KEYS) {
      const s = this.keys2.create(k.x, k.y, 'key'); s.setDepth(15);
      this.tweens.add({ targets: s, y: k.y - 8, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    this.physics.add.overlap(this.player, this.keys2, this._collect, null, this);

    // 守卫
    this.guards = [];
    for (const gd of GUARDS) {
      const s = this.physics.add.sprite(gd.x, FLOOR_TOP - 34, 'guard');
      s.setDepth(18); s.body.setSize(22, 46).setAllowGravity(false);
      s.setData('minX', gd.x - gd.range); s.setData('maxX', gd.x + gd.range);
      s.setData('dir', 1); s.setVelocityX(70);
      this.guards.push(s);
    }

    // 探照灯（望楼）
    this.lights = LIGHTS.map((lx, i) => ({ x: lx, phase: i * 1.3 }));

    // 光锥绘制层
    this.coneGfx = this.add.graphics().setDepth(9);

    // 终点牢笼
    this.goal = this.physics.add.staticImage(WORLD_W - 110, FLOOR_TOP - 36, 'cell').setDepth(15);
    this.physics.add.overlap(this.player, this.goal, this._reachCell, null, this);

    // 状态
    this.maxHp = 3; this.hp = 3; this.score = 0;
    this.reachedCell = false; this.invuln = false; this.crouch = false;
    this.gameStarted = false; this.gameOver = false;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.kkeys = this.input.keyboard.addKeys('W,A,S,D,SPACE');
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(180, 200);

    window.__gameState = { player: this.player };

    if (window.GameHUD) {
      window.GameHUD.onStart(() => {
        this.gameStarted = true;
        window.GameHUD.setHearts(this.hp, this.maxHp);
        window.GameHUD.setScore(this.score);
        window.GameHUD.setObjective(`潜行向右，避开光锥（S 蹲伏潜影），拾取 ${GOAL_SCORE} 把门钥（已 ${this.score}）`);
      });
    }
  }

  _makeTextures() {
    // 忍者 32x48
    let g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x000000, 1);
    g.fillCircle(16, 9, 7); g.fillRoundedRect(9, 14, 14, 22, 5);
    g.fillRect(9, 33, 6, 14); g.fillRect(17, 33, 6, 14);
    g.fillStyle(0xbfe0ff, 1); g.fillRect(13, 7, 6, 2);     // 一线寒光（眼带）
    g.generateTexture('ninja', 32, 48); g.destroy();

    // 守卫 34x50（持灯笼）
    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x05060c, 1);
    g.fillCircle(14, 10, 8); g.fillRoundedRect(7, 16, 16, 24, 5);
    g.fillRect(7, 37, 6, 12); g.fillRect(16, 37, 6, 12);
    g.fillStyle(0x3a2a14, 1); g.fillRect(27, 18, 3, 14);    // 灯杆
    g.fillStyle(WARM, 1); g.fillCircle(29, 34, 5);          // 灯笼
    g.generateTexture('guard', 34, 50); g.destroy();

    // 门钥 18x18
    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(WARM, 1); g.fillCircle(6, 6, 5);
    g.fillStyle(0x000000, 1); g.fillCircle(6, 6, 2);
    g.fillStyle(WARM, 1); g.fillRect(9, 5, 8, 3); g.fillRect(14, 8, 3, 4);
    g.generateTexture('key', 18, 18); g.destroy();

    // 牢笼 60x70
    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x05060c, 1); g.fillRect(0, 0, 60, 70);
    g.fillStyle(0x1a1410, 1); g.fillRect(6, 8, 48, 56);
    g.lineStyle(3, 0x000000, 1);
    for (let i = 0; i <= 48; i += 12) { g.beginPath(); g.moveTo(6 + i, 8); g.lineTo(6 + i, 64); g.strokePath(); }
    g.fillStyle(WARM, 0.7); g.fillCircle(30, 40, 6);        // 师弟微光
    g.generateTexture('cell', 60, 70); g.destroy();
  }

  _collect(player, key) {
    if (!this.gameStarted || this.gameOver) return;
    key.destroy(); this.score++;
    window.GameHUD?.setScore(this.score);
    const f = this.add.circle(key.x, key.y, 5, WARM, 0.9).setDepth(30);
    this.tweens.add({ targets: f, scale: 3, alpha: 0, duration: 320, onComplete: () => f.destroy() });
    window.GameHUD?.setObjective(this.score >= GOAL_SCORE
      ? '门钥已集齐！潜抵最深处的牢笼救出师弟 →'
      : `潜行向右，避开光锥（S 蹲伏潜影），拾取 ${GOAL_SCORE} 把门钥（已 ${this.score}）`);
  }

  _spotted() {
    if (this.invuln || this.gameOver) return;
    this.hp = Math.max(0, this.hp - 1);
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    this.invuln = true;
    this.cameras.main.flash(180, 255, 120, 60);
    this.cameras.main.shake(140, 0.008);
    // 回到上一处安全暗影
    this.player.setVelocity(0, 0);
    this.player.setPosition(this.lastSafeX, FLOOR_TOP - 40);
    this.time.delayedCall(900, () => { this.invuln = false; });
    if (this.hp <= 0) this._lose();
  }

  _reachCell() {
    if (!this.gameStarted || this.gameOver || this.reachedCell) return;
    if (this.score >= GOAL_SCORE) { this.reachedCell = true; this._win(); }
    else window.GameHUD?.setObjective(`牢锁还需 ${GOAL_SCORE - this.score} 把门钥`);
  }

  _win() {
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0);
    window.GameHUD?.showGameOver(true, '最后一道铁锁应声而开，师弟重获自由。两道黑影翻上屋脊，融入夜色——师兄弟，平安归家。');
  }
  _lose() {
    if (this.gameOver) return;
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0);
    window.GameHUD?.showGameOver(false, '一道光锥牢牢钉住了影的身形，警钟骤响，整座将军府醒了过来……');
  }

  update(time) {
    if (this.bg) this.bg.tilePositionX = this.cameras.main.scrollX * 0.3;

    // 始终绘制光锥（即使未开始也展示氛围）
    this._drawCones(time);

    if (!this.gameStarted || this.gameOver) return;

    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    this.crouch = (this.cursors.down.isDown || this.kkeys.S.isDown) && onGround;
    this.player.setScale(1, this.crouch ? 0.62 : 1);

    const spd = this.crouch ? CROUCH_SPEED : PLAYER_SPEED;
    const left = this.cursors.left.isDown || this.kkeys.A.isDown;
    const right = this.cursors.right.isDown || this.kkeys.D.isDown;
    const jump = (this.cursors.up.isDown || this.kkeys.W.isDown || this.kkeys.SPACE.isDown) && !this.crouch;

    if (left) { this.player.setVelocityX(-spd); this.player.setFlipX(true); }
    else if (right) { this.player.setVelocityX(spd); this.player.setFlipX(false); }
    else this.player.setVelocityX(0);
    if (jump && onGround) this.player.setVelocityY(-JUMP_V);

    // 守卫巡逻
    this.guards.forEach(s => {
      let dir = s.getData('dir');
      if (s.x >= s.getData('maxX')) dir = -1; else if (s.x <= s.getData('minX')) dir = 1;
      s.setData('dir', dir); s.setVelocityX(70 * dir); s.setFlipX(dir < 0);
    });

    if (onGround && !this.crouch) this.lastSafeX = this.player.x;

    // 检测：蹲伏潜影时不被发现
    if (!this.crouch && !this.invuln) {
      const px = this.player.x, py = this.player.y;
      let caught = false;
      this.guards.forEach(s => { if (this._coneHit(s, px, py)) caught = true; });
      this.lights.forEach(l => { if (this._beamHit(l, time, px, py)) caught = true; });
      if (caught) this._spotted();
    }
  }

  _guardCone(s) {
    const dir = s.getData('dir') ?? 1;
    const ex = s.x + dir * 10, ey = s.y - 6;
    const len = 230, half = 60;
    return new Phaser.Geom.Triangle(ex, ey, ex + dir * len, ey - half, ex + dir * len, ey + half);
  }
  _beamTri(l, time) {
    const sx = l.x, sy = 40;
    const sweep = Math.sin(time / 700 + l.phase) * 120;
    const cx = sx + sweep, spread = 70;
    return new Phaser.Geom.Triangle(sx, sy, cx - spread, FLOOR_TOP, cx + spread, FLOOR_TOP);
  }

  _coneHit(s, px, py) { return Phaser.Geom.Triangle.ContainsPoint(this._guardCone(s), new Phaser.Geom.Point(px, py)); }
  _beamHit(l, time, px, py) { return Phaser.Geom.Triangle.ContainsPoint(this._beamTri(l, time), new Phaser.Geom.Point(px, py)); }

  _drawCones(time) {
    const g = this.coneGfx; g.clear();
    this.guards.forEach(s => {
      const t = this._guardCone(s);
      g.fillStyle(WARM, 0.12); g.fillTriangleShape(t);
      g.lineStyle(1, WARM, 0.25); g.strokeTriangleShape(t);
    });
    this.lights.forEach(l => {
      const t = this._beamTri(l, time);
      g.fillStyle(0xfff0c0, 0.10); g.fillTriangleShape(t);
    });
  }
}

const config = {
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  parent: 'game-container',
  backgroundColor: '#0a0e1a',
  physics: { default: 'arcade', arcade: { gravity: { y: 1100 }, debug: false } },
  scene: ShadowNinjaScene,
};

new Phaser.Game(config);
