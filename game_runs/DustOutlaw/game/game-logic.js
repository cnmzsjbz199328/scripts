/* DustOutlaw — 荒尘亡命徒（完整管线版）
 * 西部俯视快枪对决 (western top-down-action).
 * - 角色：char-sprite 真序列帧 DustCowboy（idle/walk/shoot，俯视朝上，配合瞄准旋转）
 * - 掩体：material-texture 木箱瓦片，经 tilemap.json obstacles 层渲染并生成静态碰撞体
 * - 地图：scene/panorama.png
 */

const GAME_W = 960;
const GAME_H = 540;
const MAP_W = 1280;
const MAP_H = 1280;

const PLAYER_SPEED = 200;
const BULLET_SPEED = 560;
const ENEMY_SPEED = 70;
const ENEMY_BULLET_SPEED = 300;
const FIRE_CD = 230;
const WIN_SCORE = 20;
const MAX_ALIVE = 7;

class DustOutlawScene extends Phaser.Scene {
  constructor() { super('DustOutlawScene'); }

  preload() {
    this.load.image('townmap', 'scene/panorama.png');
    const idx = TILEMAP_DATA.tileIndex || {};
    for (const [id, name] of Object.entries(idx)) this.load.image(`tile_${id}`, `assets/tiles/${name}.png`);
    this.load.spritesheet('cowboy', 'assets/sprites/DustCowboy.webp', { frameWidth: 192, frameHeight: 208 });
  }

  create() {
    this.physics.world.setBounds(0, 0, MAP_W, MAP_H);
    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);

    this._makeTextures();
    this.add.image(0, 0, 'townmap').setOrigin(0, 0).setDisplaySize(MAP_W, MAP_H).setDepth(-100);

    // 木箱掩体（瓦片层 + 碰撞）
    this.covers = this.physics.add.staticGroup();
    this._renderTileLayer('obstacles', 5, true);

    this._makeAnims();

    // 玩家
    this.player = this.physics.add.sprite(MAP_W / 2, MAP_H / 2, 'cowboy', 0);
    this.player.setScale(0.32);
    this.player.body.setSize(70, 70).setOffset(60, 70);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(20);
    this.player.play('cb_idle');
    this.physics.add.collider(this.player, this.covers);

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

    this.maxHp = 4; this.hp = 4; this.score = 0;
    this.lastFire = 0; this.shootUntil = 0;
    this.gameStarted = false; this.gameOver = false; this.invuln = false;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,SPACE,J');
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this.spawnTimer = this.time.addEvent({ delay: 850, loop: true, callback: this._spawnEnemy, callbackScope: this });

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

  _renderTileLayer(layerName, depth, collision) {
    const data = (TILEMAP_DATA.layers || {})[layerName];
    if (!data) return;
    const W = TILEMAP_DATA.width, TW = TILEMAP_DATA.tileWidth, TH = TILEMAP_DATA.tileHeight;
    data.forEach((id, i) => {
      if (!id) return;
      const x = (i % W) * TW + TW / 2;
      const y = Math.floor(i / W) * TH + TH / 2;
      const sp = this.add.image(x, y, `tile_${id}`).setDisplaySize(TW, TH).setDepth(depth);
      if (collision) { this.covers.add(sp); sp.body.setSize(TW, TH); }
    });
  }

  _makeAnims() {
    const def = (key, row, fps, loop) => {
      if (this.anims.exists(key)) return;
      this.anims.create({ key, frames: this.anims.generateFrameNumbers('cowboy', { start: row * 9, end: row * 9 + 8 }), frameRate: fps, repeat: loop ? -1 : 0 });
    };
    def('cb_idle', 0, 8, true);
    def('cb_walk', 1, 12, true);
    def('cb_shoot', 2, 16, false);
  }

  _makeTextures() {
    // 敌人匪徒（俯视）30x30
    let g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x3a2414, 1); g.fillCircle(15, 15, 13);
    g.fillStyle(0x7a2a1a, 1); g.fillCircle(15, 15, 7);
    g.fillStyle(0xc23b22, 1); g.fillCircle(15, 11, 2.5);
    g.generateTexture('bandit', 30, 30); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xfff0c0, 1); g.fillCircle(4, 4, 4);
    g.fillStyle(0xffffff, 1); g.fillCircle(4, 4, 1.8);
    g.generateTexture('pbullet', 8, 8); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xff6644, 1); g.fillCircle(4, 4, 4);
    g.fillStyle(0xffd2c0, 1); g.fillCircle(4, 4, 1.6);
    g.generateTexture('ebullet', 8, 8); g.destroy();
  }

  _spawnEnemy() {
    if (!this.gameStarted || this.gameOver) return;
    if (this.enemies.countActive(true) >= MAX_ALIVE || this.score >= WIN_SCORE) return;
    const edge = Phaser.Math.Between(0, 3);
    let x, y;
    if (edge === 0) { x = Phaser.Math.Between(40, MAP_W - 40); y = 40; }
    else if (edge === 1) { x = MAP_W - 40; y = Phaser.Math.Between(40, MAP_H - 40); }
    else if (edge === 2) { x = Phaser.Math.Between(40, MAP_W - 40); y = MAP_H - 40; }
    else { x = 40; y = Phaser.Math.Between(40, MAP_H - 40); }
    const e = this.enemies.create(x, y, 'bandit');
    e.setDepth(18); e.body.setCircle(12, 3, 3);
    e.setData('nextFire', this.time.now + Phaser.Math.Between(800, 2000));
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
    this.shootUntil = this.time.now + 260;
    const ang = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
    this.player.setRotation(ang + Math.PI / 2);
    this.player.play('cb_shoot', true);
    const b = this.bullets.create(this.player.x, this.player.y, 'pbullet');
    b.setDepth(19); b.body.setAllowGravity(false);
    this.physics.velocityFromRotation(ang, BULLET_SPEED, b.body.velocity);
    const mz = this.add.circle(this.player.x + Math.cos(ang) * 18, this.player.y + Math.sin(ang) * 18, 5, 0xfff0c0, 0.9).setDepth(22);
    this.tweens.add({ targets: mz, scale: 0, alpha: 0, duration: 120, onComplete: () => mz.destroy() });
  }

  _enemyFire(e) {
    const ang = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
    const b = this.enemyBullets.create(e.x, e.y, 'ebullet');
    b.setDepth(17); b.body.setAllowGravity(false);
    this.physics.velocityFromRotation(ang, ENEMY_BULLET_SPEED, b.body.velocity);
  }

  _bulletHitsEnemy(bullet, enemy) {
    bullet.destroy(); enemy.destroy(); this.score++;
    window.GameHUD?.setScore(this.score);
    const p = this.add.circle(enemy.x, enemy.y, 8, 0xb98a4a, 0.7).setDepth(25);
    this.tweens.add({ targets: p, scale: 2.4, alpha: 0, duration: 320, onComplete: () => p.destroy() });
    if (this.score >= WIN_SCORE) { this._win(); return; }
    window.GameHUD?.setObjective(`清空响尾蛇帮：击倒 ${WIN_SCORE} 名亡命徒（已 ${this.score}）`);
  }
  _enemyBulletHitsPlayer(player, bullet) { bullet.destroy(); this._damage(1); }
  _enemyTouchesPlayer(player, enemy) { enemy.destroy(); this._damage(1); }

  _damage(n) {
    if (this.invuln || this.gameOver) return;
    this.hp = Math.max(0, this.hp - n);
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    this.invuln = true; this.player.setTint(0xff6644); this.cameras.main.shake(120, 0.006);
    this.time.delayedCall(700, () => { this.invuln = false; this.player.clearTint(); });
    if (this.hp <= 0) this._lose();
  }

  _win() {
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0); this.spawnTimer.remove();
    window.GameHUD?.showGameOver(true, '尘埃落定，最后一名枪手倒地。科尔拾起兄弟的怀表，翻身上马，背影消失在被落日烧红的荒野尽头——公道，已经讨回。');
  }
  _lose() {
    if (this.gameOver) return;
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0); this.spawnTimer.remove();
    window.GameHUD?.showGameOver(false, '科尔倒在了红石镇的尘土里，怀表滑落在血色的落日下……');
  }

  update(time) {
    if (!this.gameStarted || this.gameOver) return;

    let vx = 0, vy = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown) vx = -1;
    else if (this.cursors.right.isDown || this.keys.D.isDown) vx = 1;
    if (this.cursors.up.isDown || this.keys.W.isDown) vy = -1;
    else if (this.cursors.down.isDown || this.keys.S.isDown) vy = 1;
    const len = Math.hypot(vx, vy) || 1;
    this.player.setVelocity((vx / len) * PLAYER_SPEED, (vy / len) * PLAYER_SPEED);
    const moving = vx !== 0 || vy !== 0;

    if (this.keys.SPACE.isDown || this.keys.J.isDown) this._fire();

    // 朝向：有敌人则瞄准最近敌人，否则朝移动方向
    const tgt = this._nearestEnemy();
    if (tgt) this.player.setRotation(Phaser.Math.Angle.Between(this.player.x, this.player.y, tgt.x, tgt.y) + Math.PI / 2);
    else if (moving) this.player.setRotation(Math.atan2(vy, vx) + Math.PI / 2);

    // 动画：开火短暂播 shoot，否则 walk/idle
    if (time < this.shootUntil) {
      if (this.player.anims.currentAnim?.key !== 'cb_shoot' || !this.player.anims.isPlaying) this.player.play('cb_shoot', true);
    } else {
      const target = moving ? 'cb_walk' : 'cb_idle';
      if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== target) this.player.play(target, true);
    }

    this.enemies.getChildren().forEach(e => {
      if (!e.active) return;
      const ang = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
      this.physics.velocityFromRotation(ang, ENEMY_SPEED, e.body.velocity);
      e.setRotation(ang + Math.PI / 2);
      if (time > e.getData('nextFire')) {
        if (Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y) < 560) this._enemyFire(e);
        e.setData('nextFire', time + Phaser.Math.Between(1400, 2600));
      }
    });

    const cull = (grp) => grp.getChildren().forEach(b => { if (b.x < -40 || b.x > MAP_W + 40 || b.y < -40 || b.y > MAP_H + 40) b.destroy(); });
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
