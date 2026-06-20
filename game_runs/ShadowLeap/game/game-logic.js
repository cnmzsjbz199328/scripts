/* ShadowLeap — 影跃：迷雾森林
 * 剪影解谜跑酷 (silhouette side-scroller). 全部前景美术程序化绘制为纯黑剪影，
 * scene/panorama.png 作为视差背景。逻辑自包含，无外部贴图/精灵素材。
 */

const GAME_W = 960;
const GAME_H = 540;
const WORLD_W = 4800;

const GROUND_TOP = 460;          // 地面顶部 y
const GOAL_SCORE = 8;            // 通关所需光点
const PLAYER_SPEED = 210;
const JUMP_V = 500;

// 连续地面分段（中间留两处沟壑，需跳跃跨越）
const GROUND_SEGMENTS = [
  { x0: 0,    x1: 1380 },
  { x0: 1560, x1: 2880 },
  { x0: 3060, x1: WORLD_W },
];
const PITS = [ { x0: 1380, x1: 1560 }, { x0: 2880, x1: 3060 } ];

// 光点位置（>= GOAL_SCORE 个）
const MOTES = [
  { x: 360,  y: 380 }, { x: 620,  y: 320 }, { x: 900,  y: 360 },
  { x: 1180, y: 300 }, { x: 1470, y: 250 }, { x: 1780, y: 360 },
  { x: 2120, y: 320 }, { x: 2460, y: 360 }, { x: 2780, y: 290 },
  { x: 3180, y: 360 }, { x: 3520, y: 320 }, { x: 3980, y: 360 },
];
// 捕兽夹（地面静态危险）
const TRAPS = [ { x: 760 }, { x: 1280 }, { x: 2000 }, { x: 2620 }, { x: 3400 }, { x: 4100 } ];

class ShadowLeapScene extends Phaser.Scene {
  constructor() { super('ShadowLeapScene'); }

  preload() {
    this.load.image('panorama', 'scene/panorama.png');
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_W, GAME_H + 300);
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_H);

    this._makeTextures();

    // ── 背景：panorama 视差（铺满视口，固定于摄像机） ──
    this.bg = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'panorama')
      .setOrigin(0, 0).setScrollFactor(0).setTileScale(GAME_H / 864, GAME_H / 864);
    this.bg.setDepth(-100);

    // 前景远景剪影树（轻视差，营造纵深）
    this.fardecor = [];
    for (let x = 120; x < WORLD_W; x += 520) {
      const t = this.add.image(x, GROUND_TOP + 10, 'tree')
        .setOrigin(0.5, 1).setScrollFactor(0.6).setTint(0x000000).setAlpha(0.9);
      t.setScale(1.4 + ((x % 3) * 0.25)).setDepth(-50);
      this.fardecor.push(t);
    }

    // ── 地面 ──
    this.grounds = this.physics.add.staticGroup();
    for (const seg of GROUND_SEGMENTS) {
      const w = seg.x1 - seg.x0;
      const r = this.add.rectangle(seg.x0 + w / 2, GROUND_TOP + 40, w, 160, 0x04050a);
      this.grounds.add(r);
    }

    // ── 玩家剪影 ──
    this.player = this.physics.add.sprite(120, GROUND_TOP - 40, 'boy');
    this.player.setCollideWorldBounds(false);
    this.player.body.setSize(20, 40).setOffset(6, 4);
    this.player.setDepth(20);
    this.physics.add.collider(this.player, this.grounds);
    this.lastSafeX = 120;

    // 玩家眼睛微光（跟随）
    this.eye = this.add.circle(0, 0, 2.5, 0xffe9b0).setDepth(21);

    // ── 光点 ──
    this.motes = this.physics.add.group({ allowGravity: false, immovable: true });
    for (const m of MOTES) {
      const s = this.motes.create(m.x, m.y, 'mote');
      s.setDepth(15);
      s.baseY = m.y;
      this.tweens.add({ targets: s, y: m.y - 12, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    this.physics.add.overlap(this.player, this.motes, this._collectMote, null, this);

    // ── 捕兽夹 ──
    this.traps = this.physics.add.staticGroup();
    for (const t of TRAPS) {
      const s = this.traps.create(t.x, GROUND_TOP - 6, 'trap');
      s.body.setSize(34, 16).setOffset(3, 12);
      s.setDepth(16);
    }
    this.physics.add.overlap(this.player, this.traps, this._hitHazard, null, this);

    // ── 坠石（定时从天而降） ──
    this.rocks = this.physics.add.group();
    this.physics.add.collider(this.rocks, this.grounds, (rock) => {
      this.tweens.add({ targets: rock, alpha: 0, duration: 200, onComplete: () => rock.destroy() });
    });
    this.physics.add.overlap(this.player, this.rocks, this._hitHazard, null, this);

    // ── 终点光源 ──
    this.goal = this.physics.add.staticImage(WORLD_W - 120, GROUND_TOP - 60, 'goal').setDepth(15);
    this.goalGlow = this.add.circle(WORLD_W - 120, GROUND_TOP - 60, 60, 0xfff0c0, 0.18).setDepth(14);
    this.tweens.add({ targets: this.goalGlow, scale: 1.3, alpha: 0.32, duration: 1400, yoyo: true, repeat: -1 });
    this.physics.add.overlap(this.player, this.goal, this._reachGoal, null, this);

    // ── 状态 ──
    this.maxHp = 3; this.hp = 3;
    this.score = 0; this.reachedGoal = false;
    this.invuln = false; this.gameStarted = false; this.gameOver = false;

    // ── 输入 ──
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE');

    // 摄像机跟随
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(180, 200);

    // 坠石定时器
    this.rockTimer = this.time.addEvent({
      delay: 1600, loop: true, callback: this._dropRock, callbackScope: this,
    });

    // 暴露给 game-verify 精确断言移动
    window.__gameState = { player: this.player };

    // 等待开始信号
    if (window.GameHUD) {
      window.GameHUD.onStart(() => {
        this.gameStarted = true;
        window.GameHUD.setHearts(this.hp, this.maxHp);
        window.GameHUD.setScore(this.score);
        window.GameHUD.setObjective(`向右奔跑，收集 ${GOAL_SCORE} 点微光（已 ${this.score}）`);
      });
    }
  }

  // ── 程序化剪影纹理 ──
  _makeTextures() {
    // 男孩剪影 32x48
    let g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x000000, 1);
    g.fillCircle(16, 9, 8);                       // 头
    g.fillRoundedRect(9, 15, 14, 22, 5);          // 身体
    g.fillRect(8, 33, 6, 14);                     // 左腿
    g.fillRect(18, 33, 6, 14);                    // 右腿
    g.generateTexture('boy', 32, 48); g.destroy();

    // 光点 16x16（暖色辉光）
    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xfff3c0, 0.25); g.fillCircle(8, 8, 8);
    g.fillStyle(0xfff7d6, 0.6);  g.fillCircle(8, 8, 4.5);
    g.fillStyle(0xffffff, 1);    g.fillCircle(8, 8, 2);
    g.generateTexture('mote', 16, 16); g.destroy();

    // 捕兽夹 40x28（黑色张开的颚）
    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x000000, 1);
    g.fillTriangle(2, 26, 8, 6, 14, 26);
    g.fillTriangle(14, 26, 20, 8, 26, 26);
    g.fillTriangle(26, 26, 32, 6, 38, 26);
    g.fillRect(2, 24, 36, 4);
    g.generateTexture('trap', 40, 28); g.destroy();

    // 坠石 28x28（黑色多边形）
    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x05060b, 1);
    g.fillCircle(14, 14, 13);
    g.generateTexture('rock', 28, 28); g.destroy();

    // 终点光源 24x80（光柱）
    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xfff0c0, 0.9); g.fillCircle(12, 14, 10);
    g.fillStyle(0xffffff, 1);   g.fillCircle(12, 14, 5);
    g.fillStyle(0xfff0c0, 0.35); g.fillRect(9, 14, 6, 66);
    g.generateTexture('goal', 24, 84); g.destroy();

    // 剪影树 120x180
    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x000000, 1);
    g.fillRect(54, 60, 12, 120);                  // 树干
    g.fillTriangle(60, 0, 30, 70, 90, 70);
    g.fillRect(40, 70, 8, 60); g.fillRect(74, 80, 8, 50);
    g.generateTexture('tree', 120, 180); g.destroy();
  }

  _collectMote(player, mote) {
    if (!this.gameStarted || this.gameOver) return;
    mote.destroy();
    this.score++;
    window.GameHUD?.setScore(this.score);
    // 收集闪光
    const flash = this.add.circle(mote.x, mote.y, 6, 0xffffff, 0.9).setDepth(30);
    this.tweens.add({ targets: flash, scale: 3, alpha: 0, duration: 350, onComplete: () => flash.destroy() });
    if (this.score >= GOAL_SCORE) {
      window.GameHUD?.setObjective('微光已聚齐！奔向森林深处的光源 →');
    } else {
      window.GameHUD?.setObjective(`向右奔跑，收集 ${GOAL_SCORE} 点微光（已 ${this.score}）`);
    }
  }

  _dropRock() {
    if (!this.gameStarted || this.gameOver) return;
    const px = Phaser.Math.Clamp(this.player.x + Phaser.Math.Between(-40, 160), 60, WORLD_W - 60);
    const rock = this.rocks.create(px, this.cameras.main.scrollY - 20, 'rock');
    rock.setDepth(18);
    rock.body.setCircle(13);
    rock.setVelocityY(180);
    rock.setData('hazard', true);
  }

  _hitHazard(player, hazard) {
    if (!this.gameStarted || this.gameOver || this.invuln) return;
    if (hazard.texture && hazard.texture.key === 'rock') {
      this.tweens.add({ targets: hazard, alpha: 0, duration: 150, onComplete: () => hazard.destroy() });
    }
    this._damage(1);
    // 击退
    const dir = this.player.flipX ? 1 : -1;
    this.player.setVelocity(120 * dir, -200);
  }

  _damage(n) {
    this.hp = Math.max(0, this.hp - n);
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    this.invuln = true;
    this.player.setAlpha(0.4);
    this.time.delayedCall(900, () => { this.invuln = false; this.player.setAlpha(1); });
    if (this.hp <= 0) this._lose();
  }

  _reachGoal() {
    if (!this.gameStarted || this.gameOver || this.reachedGoal) return;
    if (this.score >= GOAL_SCORE) {
      this.reachedGoal = true;
      this._win();
    } else {
      window.GameHUD?.setObjective(`光源还需 ${GOAL_SCORE - this.score} 点微光才能点亮`);
    }
  }

  _win() {
    this.gameOver = true;
    this.gameStarted = false;
    this.player.setVelocity(0, 0);
    window.GameHUD?.showGameOver(true, '男孩触到了那团光——迷雾退散，妹妹的剪影在晨曦中向他伸出手，森林第一次有了颜色。');
  }

  _lose() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.gameStarted = false;
    this.player.setVelocity(0, 0);
    window.GameHUD?.showGameOver(false, '迷雾吞没了那点微光……');
  }

  update() {
    // 背景视差始终更新
    if (this.bg) this.bg.tilePositionX = this.cameras.main.scrollX * 0.35;
    // 眼睛跟随
    if (this.eye && this.player) {
      this.eye.x = this.player.x + (this.player.flipX ? -4 : 4);
      this.eye.y = this.player.y - 14;
    }

    if (!this.gameStarted || this.gameOver) return;

    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    const left = this.cursors.left.isDown || this.keys.A.isDown;
    const right = this.cursors.right.isDown || this.keys.D.isDown;
    const jump = this.cursors.up.isDown || this.keys.W.isDown || this.keys.SPACE.isDown;

    if (left) { this.player.setVelocityX(-PLAYER_SPEED); this.player.setFlipX(true); }
    else if (right) { this.player.setVelocityX(PLAYER_SPEED); this.player.setFlipX(false); }
    else { this.player.setVelocityX(0); }

    if (jump && onGround) { this.player.setVelocityY(-JUMP_V); }

    // 记录安全点（站在地面且不在坑上）
    if (onGround) {
      const overPit = PITS.some(p => this.player.x > p.x0 - 10 && this.player.x < p.x1 + 10);
      if (!overPit) this.lastSafeX = this.player.x;
    }

    // 坠入沟壑：扣血并回到安全点
    if (this.player.y > GROUND_TOP + 180) {
      this.player.setVelocity(0, 0);
      this.player.setPosition(this.lastSafeX, GROUND_TOP - 60);
      if (!this.invuln) this._damage(1);
    }

    // 清理飞出世界的坠石
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
