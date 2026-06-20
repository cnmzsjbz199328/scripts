/* DustTown — 尘镇：新警长（完整管线版）
 * 西部俯视叙事探索 (western top-down-rpg). scene/panorama.png 作小镇地图。
 * - 警长：char-sprite 真序列帧 DustSheriff（idle/walk，俯视朝上+移动转向）
 * - 掩体：material-texture 木箱瓦片（复用 DustOutlawTiles），tilemap obstacles 层+静态碰撞
 * - 镇民/打手/对话框程序化。WASD 移动，E 倾听证词，集齐 5 份后入法庭终结卡特帮。
 */

const GAME_W = 960;
const GAME_H = 540;
const MAP_W = 1280;
const MAP_H = 1280;

const PLAYER_SPEED = 190;
const WIN_SCORE = 5;

// 镇民证人（走到身边按 E 倾听）
const NPCS = [
  { name: '杂货店老板', x: 300, y: 300, line: '卡特帮每月来收“保护费”……前任警长就是在查账本时不见的。' },
  { name: '牧师',       x: 820, y: 270, line: '我在教堂后看见他们半夜埋了样东西，愿主宽恕我没敢声张。' },
  { name: '铁匠',       x: 340, y: 820, line: '他们逼我改枪管。枪身刻着卡特的狼头记号，错不了。' },
  { name: '酒馆女招待', x: 900, y: 880, line: '头目卡特喝醉时漏的嘴——前警长的徽章还锁在他保险柜里。' },
  { name: '受惊的男孩', x: 620, y: 560, line: '那天夜里……是我看见谁开的枪。我可以作证，警长女士。' },
];
// 卡特帮打手（巡逻）
const THUGS = [
  { x: 520, y: 420, axis: 'x', range: 220 },
  { x: 760, y: 700, axis: 'y', range: 200 },
  { x: 380, y: 980, axis: 'x', range: 180 },
];
// 法庭（集齐证词后进入此区域胜利）
const COURT = { x: 1120, y: 160, r: 70 };

class DustTownScene extends Phaser.Scene {
  constructor() { super('DustTownScene'); }

  preload() {
    this.load.image('townmap', 'scene/panorama.png');
    const idx = TILEMAP_DATA.tileIndex || {};
    for (const [id, name] of Object.entries(idx)) this.load.image(`tile_${id}`, `assets/tiles/${name}.png`);
    this.load.spritesheet('sheriff', 'assets/sprites/DustSheriff.webp', { frameWidth: 192, frameHeight: 208 });
  }

  create() {
    this.physics.world.setBounds(0, 0, MAP_W, MAP_H);
    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);

    this._makeTextures();
    this.add.image(0, 0, 'townmap').setOrigin(0, 0).setDisplaySize(MAP_W, MAP_H).setDepth(-100);

    // 木箱掩体（瓦片层 + 碰撞）
    this.covers = this.physics.add.staticGroup();
    this._renderTileLayer('obstacles', 8, true);

    // 警长动画
    this._makeAnims();

    // 法庭光圈
    this.courtMark = this.add.circle(COURT.x, COURT.y, COURT.r, 0xe8c98a, 0.18).setDepth(2);
    this.courtFlag = this.add.image(COURT.x, COURT.y, 'court').setDepth(6);
    this.tweens.add({ targets: this.courtMark, scale: 1.25, alpha: 0.3, duration: 1400, yoyo: true, repeat: -1 });

    // 玩家警长（贴左上角出生 + 世界边界碰撞）— 真序列帧精灵
    this.player = this.physics.add.sprite(70, 70, 'sheriff', 0);
    this.player.setScale(0.3);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(64, 64).setOffset(64, 72);
    this.player.setDepth(20);
    this.player.play('sh_idle');
    this.physics.add.collider(this.player, this.covers);

    // NPC
    this.npcs = this.physics.add.staticGroup();
    NPCS.forEach((n, i) => {
      const s = this.npcs.create(n.x, n.y, 'npc');
      s.setDepth(15); s.setData('idx', i); s.setData('done', false);
      s.body.setCircle(14);
    });

    // 打手
    this.thugs = this.physics.add.group({ allowGravity: false });
    THUGS.forEach(t => {
      const s = this.thugs.create(t.x, t.y, 'thug');
      s.setDepth(16); s.body.setCircle(13, 3, 3); s.setImmovable(true);
      s.setData('home', { x: t.x, y: t.y }); s.setData('axis', t.axis); s.setData('range', t.range); s.setData('dir', 1);
    });
    this.physics.add.overlap(this.player, this.thugs, this._caught, null, this);
    this.physics.add.collider(this.thugs, this.covers);

    // 对话框（固定于摄像机）
    this._buildDialogue();
    // NPC 头顶提示
    this.prompt = this.add.text(0, 0, '按 E 倾听', {
      fontFamily: 'Segoe UI, monospace', fontSize: '14px', color: '#fff6e0',
      backgroundColor: '#00000088', padding: { x: 6, y: 2 },
    }).setOrigin(0.5, 1).setDepth(40).setVisible(false);

    // 状态
    this.maxHp = 4; this.hp = 4; this.score = 0;
    this.reachedCourt = false; this.invuln = false;
    this.gameStarted = false; this.gameOver = false;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D');
    this.eKey = this.input.keyboard.addKey('E');
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    window.__gameState = { player: this.player };

    if (window.GameHUD) {
      window.GameHUD.onStart(() => {
        this.gameStarted = true;
        window.GameHUD.setHearts(this.hp, this.maxHp);
        window.GameHUD.setScore(this.score);
        window.GameHUD.setObjective(`走访镇民（按 E 倾听），收集 ${WIN_SCORE} 份证词（已 ${this.score}）`);
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
      this.anims.create({ key, frames: this.anims.generateFrameNumbers('sheriff', { start: row * 9, end: row * 9 + 8 }), frameRate: fps, repeat: loop ? -1 : 0 });
    };
    def('sh_idle', 0, 8, true);
    def('sh_walk', 1, 12, true);
  }

  _makeTextures() {
    let g;
    // 镇民 28x28：朴素棕衣
    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x6b5536, 1); g.fillCircle(14, 14, 12);
    g.fillStyle(0xcdb182, 1); g.fillCircle(14, 11, 5);
    g.generateTexture('npc', 28, 28); g.destroy();

    // 打手 30x30：红黑
    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x2a1410, 1); g.fillCircle(15, 15, 13);
    g.fillStyle(0x7a2a1a, 1); g.fillCircle(15, 15, 7);
    g.fillStyle(0x000000, 1); g.fillCircle(15, 12, 2.5);
    g.generateTexture('thug', 30, 30); g.destroy();

    // 法庭旗标 28x40
    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x6b4a26, 1); g.fillRect(12, 6, 4, 32);
    g.fillStyle(0xe8c84a, 1); g.fillTriangle(16, 6, 16, 22, 30, 14);
    g.generateTexture('court', 28, 40); g.destroy();
  }

  _buildDialogue() {
    const w = 760, h = 96, x = (GAME_W - w) / 2, y = GAME_H - h - 18;
    this.dlgBg = this.add.graphics().setScrollFactor(0).setDepth(50).setVisible(false);
    this.dlgBg.fillStyle(0x1a120a, 0.92); this.dlgBg.fillRoundedRect(x, y, w, h, 10);
    this.dlgBg.lineStyle(2, 0xe8c84a, 0.8); this.dlgBg.strokeRoundedRect(x, y, w, h, 10);
    this.dlgName = this.add.text(x + 18, y + 12, '', {
      fontFamily: 'Segoe UI, monospace', fontSize: '16px', color: '#e8c84a', fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(51).setVisible(false);
    this.dlgText = this.add.text(x + 18, y + 40, '', {
      fontFamily: 'Segoe UI, monospace', fontSize: '15px', color: '#f3ead6',
      wordWrap: { width: w - 36 },
    }).setScrollFactor(0).setDepth(51).setVisible(false);
  }

  _showDialogue(name, line) {
    this.dlgBg.setVisible(true);
    this.dlgName.setText(name).setVisible(true);
    this.dlgText.setText(line).setVisible(true);
    if (this._dlgTimer) this._dlgTimer.remove();
    this._dlgTimer = this.time.delayedCall(4200, () => this._hideDialogue());
  }
  _hideDialogue() {
    this.dlgBg.setVisible(false); this.dlgName.setVisible(false); this.dlgText.setVisible(false);
  }

  _nearNpc() {
    let best = null, bestD = 60;
    this.npcs.getChildren().forEach(n => {
      if (n.getData('done')) return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, n.x, n.y);
      if (d < bestD) { bestD = d; best = n; }
    });
    return best;
  }

  _caught(player, thug) {
    if (!this.gameStarted || this.gameOver || this.invuln) return;
    this._damage(1);
    const ang = Phaser.Math.Angle.Between(thug.x, thug.y, this.player.x, this.player.y);
    this.player.setVelocity(Math.cos(ang) * 220, Math.sin(ang) * 220);
  }

  _damage(n) {
    this.hp = Math.max(0, this.hp - n);
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    this.invuln = true; this.player.setTint(0xff6644); this.cameras.main.shake(120, 0.006);
    this.time.delayedCall(800, () => { this.invuln = false; this.player.clearTint(); });
    if (this.hp <= 0) this._lose();
  }

  _win() {
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0);
    window.GameHUD?.showGameOver(true, '杰西推开法庭大门，把铁证拍在桌上。卡特帮的末日来临，枯井镇的人们第一次敢在阳光下抬起头——正义，回到了这片尘土。');
  }
  _lose() {
    if (this.gameOver) return;
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0);
    window.GameHUD?.showGameOver(false, '杰西被卡特帮的打手围倒在后巷，警徽滚落进尘土……枯井镇重归沉默。');
  }

  update() {
    if (!this.gameStarted || this.gameOver) return;

    // 移动
    let vx = 0, vy = 0;
    if (this.cursors.left.isDown || this.keys.A.isDown) vx = -1;
    else if (this.cursors.right.isDown || this.keys.D.isDown) vx = 1;
    if (this.cursors.up.isDown || this.keys.W.isDown) vy = -1;
    else if (this.cursors.down.isDown || this.keys.S.isDown) vy = 1;
    const len = Math.hypot(vx, vy) || 1;
    if (!this.invuln) this.player.setVelocity((vx / len) * PLAYER_SPEED, (vy / len) * PLAYER_SPEED);
    const moving = vx !== 0 || vy !== 0;

    // 朝向移动方向 + 行走/站立动画
    if (moving) this.player.setRotation(Math.atan2(vy, vx) + Math.PI / 2);
    const anim = moving ? 'sh_walk' : 'sh_idle';
    if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== anim) this.player.play(anim, true);

    // 打手巡逻
    this.thugs.getChildren().forEach(t => {
      const home = t.getData('home'); const axis = t.getData('axis');
      const range = t.getData('range'); let dir = t.getData('dir');
      const pos = axis === 'x' ? t.x : t.y; const base = axis === 'x' ? home.x : home.y;
      if (pos > base + range) dir = -1; else if (pos < base - range) dir = 1;
      t.setData('dir', dir);
      if (axis === 'x') t.setVelocity(80 * dir, 0); else t.setVelocity(0, 80 * dir);
    });

    // NPC 交互提示 + 收集
    const npc = this._nearNpc();
    if (npc) {
      this.prompt.setPosition(npc.x, npc.y - 22).setVisible(true);
      if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
        npc.setData('done', true);
        npc.setTint(0x88cc88);
        this.score++;
        window.GameHUD?.setScore(this.score);
        const data = NPCS[npc.getData('idx')];
        this._showDialogue(data.name, data.line);
        this.prompt.setVisible(false);
        if (this.score >= WIN_SCORE) {
          window.GameHUD?.setObjective('证词已集齐！前往法庭（金色旗标）终结卡特帮 →');
        } else {
          window.GameHUD?.setObjective(`走访镇民（按 E 倾听），收集 ${WIN_SCORE} 份证词（已 ${this.score}）`);
        }
      }
    } else {
      this.prompt.setVisible(false);
    }

    // 法庭终局
    if (this.score >= WIN_SCORE && !this.reachedCourt) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, COURT.x, COURT.y);
      if (d < COURT.r) { this.reachedCourt = true; this._win(); }
    }
  }
}

const config = {
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  parent: 'game-container',
  backgroundColor: '#2a1a0e',
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  scene: DustTownScene,
};

new Phaser.Game(config);
