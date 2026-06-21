/* MoonRonin — 月影：屋脊浪人（全 SVG 版）
 * 剪影屋脊跑酷 (silhouette side-scroller). 以 ShadowNinja 夜景全景为风格锚。
 * - 角色序列帧 + 瓦片：全部 SVG（assets/svg/*.svg），Phaser load.svg 栅格化为纹理，
 *   逐帧 SVG 串成 Phaser 动画（idle/run/jump）。
 * - 屋脊瓦片经 tilemap.json solid 层渲染并生成静态碰撞体；段间缺口可坠落。
 */

const GAME_W = 960;
const GAME_H = 540;
const TILE = 64;
const WORLD_W = (TILEMAP_DATA.width || 80) * TILE;
const WORLD_H = (TILEMAP_DATA.height || 9) * TILE;

const GOAL_SCORE = 8;
const PLAYER_SPEED = 230;
const JUMP_V = 560;
const END_X = WORLD_W - 6 * TILE;

// 月光（屋脊上方，跳跃可及）
const ORBS = [
  { x: 300, y: 408 }, { x: 1024, y: 344 }, { x: 1700, y: 408 },
  { x: 2380, y: 344 }, { x: 3040, y: 280 }, { x: 3712, y: 344 },
  { x: 4400, y: 408 }, { x: 4960, y: 344 }, { x: 1380, y: 300 }, { x: 2720, y: 300 },
];
// 夜枭（在缺口上空盘旋）
const CROWS = [
  { x: 700, y: 300, range: 70 }, { x: 2100, y: 260, range: 90 }, { x: 3450, y: 240, range: 80 },
];

class MoonRoninScene extends Phaser.Scene {
  constructor() { super('MoonRoninScene'); }

  preload() {
    this.load.image('manor', 'scene/panorama.png');
    // 瓦片 SVG
    this.load.svg('tile_1', 'assets/svg/tile_roof.svg', { width: 64, height: 64 });
    this.load.svg('tile_2', 'assets/svg/tile_beam.svg', { width: 64, height: 64 });
    // 角色序列帧 SVG
    for (let i = 0; i < 3; i++) this.load.svg(`r_idle_${i}`, `assets/svg/ronin_idle_${i}.svg`, { width: 96, height: 128 });
    for (let i = 0; i < 6; i++) this.load.svg(`r_run_${i}`, `assets/svg/ronin_run_${i}.svg`, { width: 96, height: 128 });
    for (let i = 0; i < 3; i++) this.load.svg(`r_jump_${i}`, `assets/svg/ronin_jump_${i}.svg`, { width: 96, height: 128 });
    // 道具 SVG
    this.load.svg('orb', 'assets/svg/orb.svg', { width: 24, height: 24 });
    for (let i = 0; i < 2; i++) this.load.svg(`crow_${i}`, `assets/svg/crow_${i}.svg`, { width: 28, height: 22 });
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H + 400);
    this.physics.world.setBoundsCollision(true, true, true, false); // 底部开放 → 缺口可坠落
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_H);

    // 背景视差（夜景全景）
    this.bg = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'manor')
      .setOrigin(0, 0).setScrollFactor(0).setTileScale(GAME_H / 864, GAME_H / 864).setDepth(-100);

    // 屋脊瓦片 + 碰撞
    this.solids = this.physics.add.staticGroup();
    this._renderTileLayer('solid', 0, true);

    this._makeAnims();

    // 玩家浪人（贴左出生 + 横向边界）
    this.player = this.physics.add.sprite(80, 360, 'r_idle_0');
    this.player.setScale(0.72);
    this.player.body.setSize(40, 96).setOffset(28, 28);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(20);
    this.physics.add.collider(this.player, this.solids);
    this.player.play('ro_idle');
    this.lastSafeX = 80;

    // 月光
    this.orbs = this.physics.add.group({ allowGravity: false, immovable: true });
    for (const o of ORBS) {
      const s = this.orbs.create(o.x, o.y, 'orb'); s.setDepth(15);
      this.tweens.add({ targets: s, y: o.y - 12, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.tweens.add({ targets: s, scale: 1.2, duration: 700, yoyo: true, repeat: -1 });
    }
    this.physics.add.overlap(this.player, this.orbs, this._collect, null, this);

    // 夜枭
    this.crows = this.physics.add.group({ allowGravity: false });
    for (const c of CROWS) {
      const s = this.crows.create(c.x, c.y, 'crow_0'); s.setDepth(18);
      s.body.setSize(20, 14); s.setImmovable(true);
      s.setData('home', c.y); s.setData('range', c.range); s.setData('dir', 1);
      s.play('crow_fly');
    }
    this.physics.add.overlap(this.player, this.crows, this._hitCrow, null, this);

    // 终点光柱
    this.endGlow = this.add.rectangle(END_X + 60, GAME_H / 2, 24, GAME_H, 0xffe9a8, 0.12).setDepth(2).setScrollFactor(1);

    this.maxHp = 3; this.hp = 3; this.score = 0;
    this.reachedEnd = false; this.invuln = false;
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
        window.GameHUD.setObjective(`踏过屋脊，收集 ${GOAL_SCORE} 缕月光，抵达府墙尽头（已 ${this.score}）`);
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
    const mk = (key, keys, fps, loop) => {
      if (this.anims.exists(key)) return;
      this.anims.create({ key, frames: keys.map(k => ({ key: k })), frameRate: fps, repeat: loop ? -1 : 0 });
    };
    mk('ro_idle', ['r_idle_0', 'r_idle_1', 'r_idle_2', 'r_idle_1'], 4, true);
    mk('ro_run', ['r_run_0', 'r_run_1', 'r_run_2', 'r_run_3', 'r_run_4', 'r_run_5'], 14, true);
    mk('ro_jump', ['r_jump_0', 'r_jump_1', 'r_jump_2'], 8, false);
    mk('crow_fly', ['crow_0', 'crow_1'], 6, true);
  }

  _collect(player, orb) {
    if (!this.gameStarted || this.gameOver) return;
    orb.destroy(); this.score++;
    window.GameHUD?.setScore(this.score);
    const f = this.add.circle(orb.x, orb.y, 6, 0xffe9a8, 0.9).setDepth(30);
    this.tweens.add({ targets: f, scale: 3.5, alpha: 0, duration: 350, onComplete: () => f.destroy() });
    window.GameHUD?.setObjective(this.score >= GOAL_SCORE
      ? '月光已聚齐！奔向府墙尽头的光柱 →'
      : `踏过屋脊，收集 ${GOAL_SCORE} 缕月光，抵达府墙尽头（已 ${this.score}）`);
  }

  _hitCrow(player, crow) {
    if (!this.gameStarted || this.gameOver || this.invuln) return;
    this._damage(1);
    const dir = this.player.x < crow.x ? -1 : 1;
    this.player.setVelocity(150 * dir, -220);
  }

  _damage(n) {
    this.hp = Math.max(0, this.hp - n);
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    this.invuln = true; this.player.setAlpha(0.4);
    this.time.delayedCall(850, () => { this.invuln = false; this.player.setAlpha(1); });
    if (this.hp <= 0) this._lose();
  }

  _win() {
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0);
    window.GameHUD?.showGameOver(true, '最后一道飞檐被踏过，鹭纵身跃下府墙，密信紧贴胸口。晨曦微露，黑色的身影没入山雾——将军的阴谋，终将大白于天下。');
  }
  _lose() {
    if (this.gameOver) return;
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0);
    window.GameHUD?.showGameOver(false, '鹭一脚踏空，黑影坠入深不见底的庭院……密信，终究没能带出府门。');
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

    let anim;
    if (!onGround) anim = 'ro_jump';
    else if (left || right) anim = 'ro_run';
    else anim = 'ro_idle';
    if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== anim) this.player.play(anim, true);

    // 夜枭上下盘旋
    this.crows.getChildren().forEach(c => {
      const home = c.getData('home'), range = c.getData('range');
      let dir = c.getData('dir');
      if (c.y > home + range) dir = -1; else if (c.y < home - range) dir = 1;
      c.setData('dir', dir); c.setVelocityY(50 * dir);
    });

    if (onGround) this.lastSafeX = this.player.x;

    // 坠入缺口 → 扣体力并回到上一处屋脊
    if (this.player.y > WORLD_H + 120) {
      this.player.setVelocity(0, 0);
      this.player.setPosition(this.lastSafeX, 360);
      if (!this.invuln) this._damage(1);
    }

    // 抵达府墙尽头
    if (!this.reachedEnd && this.player.x > END_X) {
      if (this.score >= GOAL_SCORE) { this.reachedEnd = true; this._win(); }
      else window.GameHUD?.setObjective(`府墙还需 ${GOAL_SCORE - this.score} 缕月光才能跃下`);
    }
  }
}

const config = {
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  parent: 'game-container',
  backgroundColor: '#0a0e1a',
  physics: { default: 'arcade', arcade: { gravity: { y: 1100 }, debug: false } },
  scene: MoonRoninScene,
};

new Phaser.Game(config);
