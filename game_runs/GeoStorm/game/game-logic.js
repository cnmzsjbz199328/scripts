/* GeoStorm — 几何风暴：最后的光点（完整管线版）
 * 单屏几何弹幕闪避 (lineart top-down-action).
 * - 角色：程序化多帧脉冲光点动画（几何材质程序化最可控，真帧动画）
 * - 掩体：tilemap.json obstacles 层 + 程序化线条几何方块 + 静态碰撞体(可躲弹幕)
 * - 背景：scene/panorama.png（蓝图竞技场）
 */

const GAME_W = 960;
const GAME_H = 540;

const PLAYER_SPEED = 230;
const WIN_SCORE = 15;
const SHARDS_ON_FIELD = 4;

const INK = 0x14233a;
const GLOW = 0x18c2b0;
const SHARD_C = 0xffb020;

class GeoStormScene extends Phaser.Scene {
  constructor() { super('GeoStormScene'); }

  preload() { this.load.image('blueprint', 'scene/panorama.png'); }

  create() {
    this.physics.world.setBounds(0, 0, GAME_W, GAME_H);

    this._makeTextures();

    this.add.image(0, 0, 'blueprint').setOrigin(0, 0).setDisplaySize(GAME_W, GAME_H).setDepth(-100);
    this.pulse = this.add.circle(GAME_W / 2, GAME_H / 2, 40, GLOW, 0).setStrokeStyle(2, GLOW, 0.25).setDepth(-50);

    // 几何掩体方块（瓦片 + 碰撞）
    this.blocks = this.physics.add.staticGroup();
    this._renderTileLayer('obstacles', 2, true);

    this._makeAnims();

    // 玩家光点（贴角出生 + 世界边界）— 程序化脉冲帧动画
    this.player = this.physics.add.sprite(60, 60, 'pt0');
    this.player.setCollideWorldBounds(true);
    this.player.body.setCircle(7, 3, 3);
    this.player.setDepth(20);
    this.player.play('geo_pulse');
    this.physics.add.collider(this.player, this.blocks);

    this.shots = this.physics.add.group({ allowGravity: false });
    this.shards = this.physics.add.group({ allowGravity: false, immovable: true });
    this.physics.add.overlap(this.player, this.shots, this._hit, null, this);
    this.physics.add.overlap(this.player, this.shards, this._collect, null, this);
    this.physics.add.collider(this.shots, this.blocks, (b) => b.destroy());   // 弹幕被掩体挡下

    this.maxHp = 3; this.hp = 3; this.score = 0;
    this.invuln = false; this.gameStarted = false; this.gameOver = false;
    this.beat = 600;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D');

    window.__gameState = { player: this.player };

    this.shotTimer = this.time.addEvent({ delay: this.beat, loop: true, callback: this._spawnWave, callbackScope: this });

    if (window.GameHUD) {
      window.GameHUD.onStart(() => {
        this.gameStarted = true;
        window.GameHUD.setHearts(this.hp, this.maxHp);
        window.GameHUD.setScore(this.score);
        window.GameHUD.setObjective(`走位躲避几何弹幕(可躲掩体后)，收集 ${WIN_SCORE} 枚光碎片（已 ${this.score}）`);
        for (let i = 0; i < SHARDS_ON_FIELD; i++) this._spawnShard();
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
      if (collision) { this.blocks.add(sp); sp.body.setSize(TW, TH); }
    });
  }

  _makeAnims() {
    const frames = ['pt0', 'pt1', 'pt2', 'pt1'];
    if (!this.anims.exists('geo_pulse'))
      this.anims.create({ key: 'geo_pulse', frames: frames.map(k => ({ key: k })), frameRate: 8, repeat: -1 });
  }

  _makeTextures() {
    // 光点脉冲帧 pt0..2（发光三角，不同辉光半径）
    const pt = (key, glowR, coreR) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(GLOW, 0.22); g.fillCircle(11, 11, glowR);
      g.fillStyle(GLOW, 1); g.fillTriangle(11, 3, 4, 18, 18, 18);
      g.fillStyle(0xffffff, 1); g.fillCircle(11, 12, coreR);
      g.generateTexture(key, 22, 22); g.destroy();
    };
    pt('pt0', 9, 2.2); pt('pt1', 11, 3.0); pt('pt2', 7, 1.8);

    // 几何掩体方块 tile_1（线条风：浅蓝填充 + 黑描边 + 内嵌菱形）
    let g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xc7d8ea, 1); g.fillRect(0, 0, 64, 64);
    g.lineStyle(3, INK, 1); g.strokeRect(2, 2, 60, 60);
    g.lineStyle(2, INK, 0.7);
    g.beginPath(); g.moveTo(32, 10); g.lineTo(54, 32); g.lineTo(32, 54); g.lineTo(10, 32); g.closePath(); g.strokePath();
    g.generateTexture('tile_1', 64, 64); g.destroy();

    // 弹幕：三角
    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.lineStyle(3, INK, 1); g.strokeTriangle(11, 2, 2, 20, 20, 20);
    g.fillStyle(INK, 0.12); g.fillTriangle(11, 2, 2, 20, 20, 20);
    g.generateTexture('s_tri', 22, 22); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.lineStyle(3, INK, 1); g.strokeRect(2, 2, 16, 16);
    g.fillStyle(INK, 0.12); g.fillRect(2, 2, 16, 16);
    g.generateTexture('s_sq', 20, 20); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.lineStyle(3, INK, 1);
    g.beginPath(); g.moveTo(12, 1); g.lineTo(23, 12); g.lineTo(12, 23); g.lineTo(1, 12); g.closePath(); g.strokePath();
    g.generateTexture('s_dia', 24, 24); g.destroy();

    // 光碎片
    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(SHARD_C, 0.3); g.fillCircle(8, 8, 8);
    g.fillStyle(SHARD_C, 1); g.fillTriangle(8, 1, 2, 14, 14, 14);
    g.fillStyle(0xffffff, 1); g.fillCircle(8, 9, 2);
    g.generateTexture('shard', 16, 16); g.destroy();
  }

  _spawnShard() {
    const x = Phaser.Math.Between(70, GAME_W - 70);
    const y = Phaser.Math.Between(70, GAME_H - 70);
    const s = this.shards.create(x, y, 'shard'); s.setDepth(12);
    this.tweens.add({ targets: s, scale: 1.25, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  _spawnWave() {
    if (!this.gameStarted || this.gameOver) return;
    const n = 1 + Math.floor(this.score / 4);
    const tex = ['s_tri', 's_sq', 's_dia'];
    for (let i = 0; i < n; i++) {
      const edge = Phaser.Math.Between(0, 3);
      let x, y;
      if (edge === 0) { x = Phaser.Math.Between(0, GAME_W); y = -20; }
      else if (edge === 1) { x = GAME_W + 20; y = Phaser.Math.Between(0, GAME_H); }
      else if (edge === 2) { x = Phaser.Math.Between(0, GAME_W); y = GAME_H + 20; }
      else { x = -20; y = Phaser.Math.Between(0, GAME_H); }
      const s = this.shots.create(x, y, Phaser.Utils.Array.GetRandom(tex));
      s.setDepth(14); s.body.setCircle(8, (s.width - 16) / 2, (s.height - 16) / 2);
      let ang;
      if (Phaser.Math.Between(0, 1) === 0) ang = Phaser.Math.Angle.Between(x, y, this.player.x, this.player.y);
      else ang = Phaser.Math.Angle.Between(x, y, GAME_W - x, GAME_H - y);
      const spd = 130 + this.score * 4 + Phaser.Math.Between(-20, 40);
      this.physics.velocityFromRotation(ang, spd, s.body.velocity);
      s.setAngularVelocity(Phaser.Math.Between(-180, 180));
    }
  }

  _collect(player, shard) {
    if (!this.gameStarted || this.gameOver) return;
    shard.destroy(); this.score++;
    window.GameHUD?.setScore(this.score);
    const f = this.add.circle(shard.x, shard.y, 6, SHARD_C, 0.9).setDepth(30);
    this.tweens.add({ targets: f, scale: 3.5, alpha: 0, duration: 350, onComplete: () => f.destroy() });
    this.pulse.setPosition(this.player.x, this.player.y).setScale(0.3);
    this.tweens.add({ targets: this.pulse, scale: 3, duration: 400, ease: 'Quad.out' });
    if (this.score >= WIN_SCORE) { this._win(); return; }
    window.GameHUD?.setObjective(`走位躲避几何弹幕(可躲掩体后)，收集 ${WIN_SCORE} 枚光碎片（已 ${this.score}）`);
    this._spawnShard();
  }

  _hit(player, shot) {
    if (!this.gameStarted || this.gameOver || this.invuln) return;
    shot.destroy();
    this.hp = Math.max(0, this.hp - 1);
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    this.invuln = true; this.player.setAlpha(0.35); this.cameras.main.shake(120, 0.008);
    this.time.delayedCall(900, () => { this.invuln = false; this.player.setAlpha(1); });
    if (this.hp <= 0) this._lose();
  }

  _win() {
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0); this.shotTimer.remove();
    window.GameHUD?.showGameOver(true, '第 15 枚光碎片归位，崩解的线条逆向重连，浅蓝蓝图重新铺满璀璨的几何秩序——宇宙，被这最后一个光点重新画亮。');
  }
  _lose() {
    if (this.gameOver) return;
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0); this.shotTimer.remove();
    window.GameHUD?.showGameOver(false, '光点被几何弹幕击碎，最后一抹亮光熄灭，蓝图被虚空彻底吞没……');
  }

  update() {
    if (!this.gameStarted || this.gameOver) return;
    let vx = 0, vy = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown) vx = -1;
    else if (this.cursors.right.isDown || this.keys.D.isDown) vx = 1;
    if (this.cursors.up.isDown || this.keys.W.isDown) vy = -1;
    else if (this.cursors.down.isDown || this.keys.S.isDown) vy = 1;
    const len = Math.hypot(vx, vy) || 1;
    this.player.setVelocity((vx / len) * PLAYER_SPEED, (vy / len) * PLAYER_SPEED);

    this.shots.getChildren().forEach(s => {
      if (s.x < -60 || s.x > GAME_W + 60 || s.y < -60 || s.y > GAME_H + 60) s.destroy();
    });
  }
}

const config = {
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  parent: 'game-container',
  backgroundColor: '#dce8f2',
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  scene: GeoStormScene,
};

new Phaser.Game(config);
