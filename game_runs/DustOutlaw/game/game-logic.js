/* DustOutlaw — 荒尘亡命徒
 * 西部俯视快枪对决 (western top-down-action). scene/panorama.png 作为小镇地图，
 * 角色/敌人/子弹/掩体程序化绘制。WASD 走位，自动瞄准最近敌人，SPACE/J 开火。
 */

const GAME_W = 960;
const GAME_H = 540;
const MAP_W = 1280;
const MAP_H = 1280;

const PLAYER_SPEED = 200;
const BULLET_SPEED = 560;
const ENEMY_SPEED = 70;
const ENEMY_BULLET_SPEED = 300;
const FIRE_CD = 230;          // 玩家开火冷却 ms
const WIN_SCORE = 20;
const MAX_ALIVE = 7;          // 同屏最多敌人

// 掩体（木桶/水槽）相对地图坐标
const COVERS = [
  { x: 360, y: 380 }, { x: 880, y: 300 }, { x: 300, y: 880 },
  { x: 900, y: 880 }, { x: 640, y: 520 }, { x: 520, y: 980 }, { x: 980, y: 600 },
];

class DustOutlawScene extends Phaser.Scene {
  constructor() { super('DustOutlawScene'); }

  preload() {
    this.load.image('townmap', 'scene/panorama.png');
  }

  create() {
    this.physics.world.setBounds(0, 0, MAP_W, MAP_H);
    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);

    this._makeTextures();

    // 地图背景
    this.add.image(0, 0, 'townmap').setOrigin(0, 0).setDisplaySize(MAP_W, MAP_H).setDepth(-100);

    // 掩体
    this.covers = this.physics.add.staticGroup();
    for (const c of COVERS) {
      const s = this.covers.create(c.x, c.y, 'barrel');
      s.setDepth(5); s.body.setCircle(18, 4, 4);
    }

    // 玩家
    this.player = this.physics.add.sprite(MAP_W / 2, MAP_H / 2, 'cowboy');
    this.player.setCollideWorldBounds(true);
    this.player.body.setCircle(13, 5, 5);
    this.player.setDepth(20);
    this.physics.add.collider(this.player, this.covers);

    // 群组
    this.bullets = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();
    this.enemies = this.physics.add.group();

    this.physics.add.collider(this.enemies, this.covers);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.overlap(this.bullets, this.enemies, this._bulletHitsEnemy, null, this);
    this.physics.add.overlap(this.enemyBullets, this.player, this._enemyBulletHitsPlayer, null, this);
    this.physics.add.overlap(this.player, this.enemies, this._enemyTouchesPlayer, null, this);
    this.physics.add.collider(this.bullets, this.covers, (b) => b.destroy());
    this.physics.add.collider(this.enemyBullets, this.covers, (b) => b.destroy());

    // 状态
    this.maxHp = 4; this.hp = 4;
    this.score = 0;
    this.lastFire = 0;
    this.gameStarted = false; this.gameOver = false;
    this.invuln = false;

    // 输入
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE,J');

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // 敌人生成
    this.spawnTimer = this.time.addEvent({
      delay: 850, loop: true, callback: this._spawnEnemy, callbackScope: this,
    });

    window.__gameState = { player: this.player };

    if (window.GameHUD) {
      window.GameHUD.onStart(() => {
        this.gameStarted = true;
        window.GameHUD.setHearts(this.hp, this.maxHp);
        window.GameHUD.setScore(this.score);
        window.GameHUD.setObjective(`清空响尾蛇帮：击倒 ${WIN_SCORE} 名亡命徒（已 ${this.score}）`);
      });
    }
  }

  _makeTextures() {
    // 玩家牛仔（俯视）32x32：宽边帽 + 帽顶 + 朝向点
    let g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x241a0e, 1); g.fillCircle(16, 16, 14);      // 帽檐
    g.fillStyle(0x6b4a26, 1); g.fillCircle(16, 16, 8);       // 帽顶
    g.fillStyle(0xd8b27a, 1); g.fillCircle(16, 11, 3);       // 朝向指示点（枪口侧）
    g.generateTexture('cowboy', 32, 32); g.destroy();

    // 敌人匪徒（俯视）30x30：红头巾
    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x3a2414, 1); g.fillCircle(15, 15, 13);      // 帽檐
    g.fillStyle(0x7a2a1a, 1); g.fillCircle(15, 15, 7);       // 红头巾
    g.fillStyle(0xc23b22, 1); g.fillCircle(15, 11, 2.5);
    g.generateTexture('bandit', 30, 30); g.destroy();

    // 玩家子弹 8x8 暖金
    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xfff0c0, 1); g.fillCircle(4, 4, 4);
    g.fillStyle(0xffffff, 1); g.fillCircle(4, 4, 1.8);
    g.generateTexture('pbullet', 8, 8); g.destroy();

    // 敌人子弹 8x8 红
    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xff6644, 1); g.fillCircle(4, 4, 4);
    g.fillStyle(0xffd2c0, 1); g.fillCircle(4, 4, 1.6);
    g.generateTexture('ebullet', 8, 8); g.destroy();

    // 掩体木桶 40x40
    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x3a2614, 1); g.fillCircle(20, 20, 18);
    g.fillStyle(0x5a3a20, 1); g.fillCircle(20, 20, 14);
    g.lineStyle(2, 0x2a1a0c, 1); g.strokeCircle(20, 20, 14);
    g.generateTexture('barrel', 40, 40); g.destroy();
  }

  _spawnEnemy() {
    if (!this.gameStarted || this.gameOver) return;
    if (this.enemies.countActive(true) >= MAX_ALIVE) return;
    if (this.score >= WIN_SCORE) return;

    // 从地图四边随机出生
    const edge = Phaser.Math.Between(0, 3);
    let x, y;
    if (edge === 0) { x = Phaser.Math.Between(40, MAP_W - 40); y = 40; }
    else if (edge === 1) { x = MAP_W - 40; y = Phaser.Math.Between(40, MAP_H - 40); }
    else if (edge === 2) { x = Phaser.Math.Between(40, MAP_W - 40); y = MAP_H - 40; }
    else { x = 40; y = Phaser.Math.Between(40, MAP_H - 40); }

    const e = this.enemies.create(x, y, 'bandit');
    e.setDepth(18);
    e.body.setCircle(12, 3, 3);
    e.setData('nextFire', this.time.now + Phaser.Math.Between(800, 2000));
    e.setData('hp', 1);
  }

  _nearestEnemy() {
    let best = null, bestD = Infinity;
    this.enemies.getChildren().forEach(e => {
      if (!e.active) return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
      if (d < bestD) { bestD = d; best = e; }
    });
    return best;
  }

  _fire() {
    if (this.time.now < this.lastFire + FIRE_CD) return;
    const target = this._nearestEnemy();
    if (!target) return;
    this.lastFire = this.time.now;
    const ang = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
    this.player.setRotation(ang + Math.PI / 2);
    const b = this.bullets.create(this.player.x, this.player.y, 'pbullet');
    b.setDepth(19);
    b.body.setAllowGravity(false);
    this.physics.velocityFromRotation(ang, BULLET_SPEED, b.body.velocity);
    // 枪口闪光
    const mz = this.add.circle(this.player.x + Math.cos(ang) * 14, this.player.y + Math.sin(ang) * 14, 5, 0xfff0c0, 0.9).setDepth(22);
    this.tweens.add({ targets: mz, scale: 0, alpha: 0, duration: 120, onComplete: () => mz.destroy() });
  }

  _enemyFire(e) {
    const ang = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
    const b = this.enemyBullets.create(e.x, e.y, 'ebullet');
    b.setDepth(17);
    b.body.setAllowGravity(false);
    this.physics.velocityFromRotation(ang, ENEMY_BULLET_SPEED, b.body.velocity);
  }

  _bulletHitsEnemy(bullet, enemy) {
    bullet.destroy();
    enemy.destroy();
    this.score++;
    window.GameHUD?.setScore(this.score);
    // 击倒尘烟
    const p = this.add.circle(enemy.x, enemy.y, 8, 0xb98a4a, 0.7).setDepth(25);
    this.tweens.add({ targets: p, scale: 2.4, alpha: 0, duration: 320, onComplete: () => p.destroy() });
    if (this.score >= WIN_SCORE) { this._win(); return; }
    window.GameHUD?.setObjective(`清空响尾蛇帮：击倒 ${WIN_SCORE} 名亡命徒（已 ${this.score}）`);
  }

  _enemyBulletHitsPlayer(player, bullet) {
    bullet.destroy();
    this._damage(1);
  }

  _enemyTouchesPlayer(player, enemy) {
    enemy.destroy();
    this._damage(1);
  }

  _damage(n) {
    if (this.invuln || this.gameOver) return;
    this.hp = Math.max(0, this.hp - n);
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    this.invuln = true;
    this.player.setTint(0xff6644);
    this.cameras.main.shake(120, 0.006);
    this.time.delayedCall(700, () => { this.invuln = false; this.player.clearTint(); });
    if (this.hp <= 0) this._lose();
  }

  _win() {
    this.gameOver = true; this.gameStarted = false;
    this.player.setVelocity(0, 0);
    this.spawnTimer.remove();
    window.GameHUD?.showGameOver(true, '尘埃落定，最后一名枪手倒地。科尔拾起兄弟的怀表，翻身上马，背影消失在被落日烧红的荒野尽头——公道，已经讨回。');
  }

  _lose() {
    if (this.gameOver) return;
    this.gameOver = true; this.gameStarted = false;
    this.player.setVelocity(0, 0);
    this.spawnTimer.remove();
    window.GameHUD?.showGameOver(false, '科尔倒在了红石镇的尘土里，怀表滑落在血色的落日下……');
  }

  update(time) {
    if (!this.gameStarted || this.gameOver) return;

    // 移动
    let vx = 0, vy = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown) vx = -1;
    else if (this.cursors.right.isDown || this.keys.D.isDown) vx = 1;
    if (this.cursors.up.isDown || this.keys.W.isDown) vy = -1;
    else if (this.cursors.down.isDown || this.keys.S.isDown) vy = 1;
    const len = Math.hypot(vx, vy) || 1;
    this.player.setVelocity((vx / len) * PLAYER_SPEED, (vy / len) * PLAYER_SPEED);

    // 开火
    if (this.keys.SPACE.isDown || this.keys.J.isDown) this._fire();

    // 敌人 AI：追逐 + 定时射击
    this.enemies.getChildren().forEach(e => {
      if (!e.active) return;
      const ang = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
      this.physics.velocityFromRotation(ang, ENEMY_SPEED, e.body.velocity);
      e.setRotation(ang + Math.PI / 2);
      if (time > e.getData('nextFire')) {
        const d = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
        if (d < 560) this._enemyFire(e);
        e.setData('nextFire', time + Phaser.Math.Between(1400, 2600));
      }
    });

    // 子弹越界清理
    const cull = (grp) => grp.getChildren().forEach(b => {
      if (b.x < -40 || b.x > MAP_W + 40 || b.y < -40 || b.y > MAP_H + 40) b.destroy();
    });
    cull(this.bullets); cull(this.enemyBullets);
  }
}

const config = {
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  parent: 'game-container',
  backgroundColor: '#2a1a0e',
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  scene: DustOutlawScene,
};

new Phaser.Game(config);
