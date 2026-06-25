/* DustOutlaw — §4B 原型分割；方法体逐字保留。 */
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

    // ── game-playtest 探针（俯视模式：给 moveX/moveY 走位建议 + 持续开火）──
    window.__probe = () => {
      const pl = this.player;
      if (!pl || !pl.body) return null;
      const enemies = this.enemies.getChildren().filter(e => e.active);
      const ebullets = this.enemyBullets.getChildren().filter(b => b.active);
      let mx = 0, my = 0;
      // 远离附近敌人（反平方权重）
      for (const e of enemies) { const dx = pl.x - e.x, dy = pl.y - e.y, d = Math.hypot(dx, dy) || 1; if (d < 380) { mx += (dx / d) * (380 - d) / 380; my += (dy / d) * (380 - d) / 380; } }
      // 急闪附近子弹
      for (const b of ebullets) { const dx = pl.x - b.x, dy = pl.y - b.y, d = Math.hypot(dx, dy) || 1; if (d < 130) { mx += (dx / d) * 2.5; my += (dy / d) * 2.5; } }
      // 远离边界、回到地图中心
      const m = 150;
      if (pl.x < m) mx += 1.2; if (pl.x > MAP_W - m) mx -= 1.2;
      if (pl.y < m) my += 1.2; if (pl.y > MAP_H - m) my -= 1.2;
      const L = Math.hypot(mx, my); if (L > 0.05) { mx /= L; my /= L; } else { mx = my = 0; }
      const danger = ebullets.some(b => Math.hypot(pl.x - b.x, pl.y - b.y) < 90) || enemies.some(e => Math.hypot(pl.x - e.x, pl.y - e.y) < 70);
      return {
        x: pl.x, y: pl.y, vx: pl.body.velocity.x, onGround: true,
        hp: this.hp, maxHp: this.maxHp, score: this.score, goalScore: WIN_SCORE,
        act: 1, deaths: 0, deathBudget: 1,
        won: !!this._won, lost: !!this._lost,
        cardActive: false, started: this.gameStarted,
        nextGoalX: pl.x, worldW: MAP_W, cellX: MAP_W,
        moveX: mx, moveY: my, attack: true,
        dangerNow: danger, dangerAhead: danger,
      };
    };
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
