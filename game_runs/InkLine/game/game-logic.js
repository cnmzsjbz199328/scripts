/* InkLine — 一线：未完成的画（短篇完整游戏版）
 * 线条平台跳跃 (lineart platformer). 程序化墨团(squash 多帧，线条风本就可控，沿用) + 线框瓦片。
 *
 * demo → 短篇完整游戏的结构升级（同 ShadowNinja/MoonRonin/ShadowLeap 方法）：
 *  · 开场卡 →【一幕·草稿浅滩】学跳 →【二幕·断线峡谷】断桥+尖刺 →【三幕·橡皮回廊】高潮 → 结局卡
 *  · 检查点 + 每幕满血 + 死亡预算；橡皮怪逐幕增多
 *  · 墨滴落在地面奔跑高度；尖刺/沟壑须留落地间距；暴露 __probe()/__advanceCard()
 */

const GAME_W = 960;
const GAME_H = 540;
const TILE = 64;
const WORLD_W = (TILEMAP_DATA.width || 75) * TILE;
const WORLD_H = (TILEMAP_DATA.height || 9) * TILE;
const FLOOR_TOP = WORLD_H - 2 * TILE;   // 448
const SPAWN_Y = FLOOR_TOP - 60;         // 388
const PLAYER_SPEED = 230;
const JUMP_V = 560;   // 192px 沟壑留足余量(reach~234)
const DEATH_BUDGET = 5;
const INK = 0x1a1a1a;
const PAPER = 0xfaf6ea;

// 原 192px 沟壑对单跳余量过紧→补地砖收窄为干净 128px（同 ShadowLeap）
const GAP_FILL_COLS = [21, 45];
const PITS = [[1408, 1536], [2944, 3072]];   // 收窄后沟壑(各 128 宽)
const SPIKES = [700, 1000, 1900, 2500, 3500, 4000];  // 地面尖刺(避开沟壑、与沟壑留落地间距)

const ACTS = [
  { name: '草稿浅滩', startX: 60,   wash: 0xfaf6ea, washA: 0.0,
    intro: ['第一幕 · 草稿浅滩',
      '我只是一根线，却想亲手画完属于自己的世界。\n铅笔辅助线指引方向——← → / A D 移动，↑ / W / 空格 跳。\n越过断裂的线条，拾起散落的墨滴。'] },
  { name: '断线峡谷', startX: 1650, wash: 0xede6d4, washA: 0.16,
    intro: ['第二幕 · 断线峡谷',
      '线条在这里崩塌成断桥与尖刺，沟壑横亘。\n看准边缘起跳，别落进画纸的空白里。\n橡皮怪开始在走廊里游荡——别被它擦去轮廓。'] },
  { name: '橡皮回廊', startX: 3150, wash: 0xe2dccb, washA: 0.22,
    intro: ['第三幕 · 橡皮回廊',
      '灰色的橡皮怪在最后的回廊里巡逻，尽头是画纸的留白与笔尖。\n聚齐墨滴，跃过最后的断线——\n把这个世界，亲手画完。'] },
];

const GOAL_SCORE = 8;
// 墨滴：地面奔跑高度(y430，贴合小墨团着地高度)，避开沟壑与尖刺 x，共 12 → 目标 8
const DROPS = [
  { x: 300, y: 430 }, { x: 560, y: 430 }, { x: 860, y: 430 }, { x: 1150, y: 430 },
  { x: 1700, y: 430 }, { x: 2050, y: 430 }, { x: 2300, y: 430 }, { x: 2700, y: 430 },
  { x: 3300, y: 430 }, { x: 3700, y: 430 }, { x: 3900, y: 430 }, { x: 4300, y: 430 },
];
// 橡皮怪（巡逻，跳跃可越）：二幕起
const ERASERS = [{ x: 2200, range: 200, act: 1 }, { x: 3400, range: 200, act: 2 }, { x: 4050, range: 150, act: 2 }];
const GOAL_X = WORLD_W - 120;

class InkLineScene extends Phaser.Scene {
  constructor() { super('InkLineScene'); }

  preload() { this.load.image('paper', 'scene/panorama.png'); }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H + 200);
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_H);

    this._makeTextures();

    this.bg = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'paper')
      .setOrigin(0, 0).setScrollFactor(0).setTileScale(GAME_H / 864, GAME_H / 864).setDepth(-100);
    this.wash = this.add.rectangle(0, 0, GAME_W, GAME_H, ACTS[0].wash, 0)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(-50);

    this.solids = this.physics.add.staticGroup();
    this._renderTileLayer('solid', 0, true);
    for (const c of GAP_FILL_COLS) for (const r of [7, 8]) {  // 补地砖收窄沟壑
      const sp = this.add.image(c * TILE + TILE / 2, r * TILE + TILE / 2, 'tile_1').setDisplaySize(TILE, TILE).setDepth(0);
      this.solids.add(sp); sp.body.setSize(TILE, TILE);
    }

    this._makeAnims();

    this.player = this.physics.add.sprite(ACTS[0].startX, SPAWN_Y, 'blobf0');
    this.player.setCollideWorldBounds(true);
    this.player.body.setCircle(12, 3, 3);
    this.player.setDepth(20);
    this.physics.add.collider(this.player, this.solids);
    this.player.play('ink_idle');
    this.lastSafeX = ACTS[0].startX;

    this.drops = this.physics.add.group({ allowGravity: false, immovable: true });
    for (const d of DROPS) {
      const s = this.drops.create(d.x, d.y, 'drop'); s.setDepth(15);
      this.tweens.add({ targets: s, y: d.y - 10, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    this.physics.add.overlap(this.player, this.drops, this._collect, null, this);

    this.spikes = this.physics.add.staticGroup();
    for (const sx of SPIKES) {
      const s = this.spikes.create(sx, FLOOR_TOP - 8, 'spike');
      s.body.setSize(30, 14).setOffset(3, 12); s.setDepth(16);
    }
    this.physics.add.overlap(this.player, this.spikes, this._hit, null, this);

    // 橡皮怪（按幕激活）
    this.erasers = this.physics.add.group({ allowGravity: false });
    for (const e of ERASERS) {
      const s = this.erasers.create(e.x, FLOOR_TOP - 18, 'eraser');
      s.setDepth(17); s.body.setSize(34, 30);
      s.setData('minX', e.x - e.range); s.setData('maxX', e.x + e.range); s.setData('act', e.act);
      s.setVelocityX(60); s.setImmovable(true); s.setVisible(false); s.body.enable = false;
    }
    this.physics.add.overlap(this.player, this.erasers, this._hit, null, this);

    this.goal = this.physics.add.staticImage(GOAL_X, FLOOR_TOP - 50, 'nib').setDepth(15);
    this.goalGlow = this.add.circle(GOAL_X, FLOOR_TOP - 50, 46, 0x6fd0c8, 0.18).setDepth(14);
    this.tweens.add({ targets: this.goalGlow, scale: 1.3, alpha: 0.34, duration: 1300, yoyo: true, repeat: -1 });
    this.physics.add.overlap(this.player, this.goal, this._reachGoal, null, this);

    this.maxHp = 3; this.hp = 3; this.score = 0;
    this.actIdx = 0; this.deaths = 0;
    this.reachedGoal = false; this.invuln = false;
    this.gameStarted = false; this.gameOver = false; this.cardActive = false;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.kkeys = this.input.keyboard.addKeys('W,A,S,D,SPACE');
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(180, 200);

    this._buildCardLayer();
    this._exposeState();

    if (window.GameHUD) {
      window.GameHUD.onStart(() => {
        window.GameHUD.setHearts(this.hp, this.maxHp);
        window.GameHUD.setScore(this.score);
        this._showCard('一线 · 未完成的画',
          '一根想画完自己世界的线。\n奔跑、跳跃，越过断线与尖刺，聚齐 ' + GOAL_SCORE + ' 滴墨，抵达画纸尽头的笔尖。\n\n移动 ← → / A D    ·    跳 ↑ / W / 空格    ·    继续 SPACE',
          () => this._enterAct(0, true));
      });
    }
  }

  _buildCardLayer() {
    this.cardBg = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x1a1a1a, 0.86).setOrigin(0, 0).setScrollFactor(0).setDepth(200).setVisible(false);
    this.cardTitle = this.add.text(GAME_W / 2, 170, '', { fontFamily: 'Segoe UI, sans-serif', fontSize: '30px', color: '#faf6ea', align: 'center', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setVisible(false);
    this.cardBody = this.add.text(GAME_W / 2, 300, '', { fontFamily: 'Segoe UI, sans-serif', fontSize: '18px', color: '#d8d2c4', align: 'center', lineSpacing: 10, wordWrap: { width: 720 } }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setVisible(false);
    this.cardHint = this.add.text(GAME_W / 2, 470, '— 按 SPACE 继续 —', { fontFamily: 'Segoe UI, sans-serif', fontSize: '14px', color: '#8a8475' }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setVisible(false);
  }

  _showCard(title, body, cb) {
    this.cardActive = true; this._pendingCardCb = cb;
    this.player.setVelocity(0, 0);
    this.cardTitle.setText(title); this.cardBody.setText(body);
    [this.cardBg, this.cardTitle, this.cardBody, this.cardHint].forEach(o => o.setVisible(true));
    this.input.keyboard.once('keydown-SPACE', () => this._advanceCard());
    this.input.keyboard.once('keydown-ENTER', () => this._advanceCard());
    this.input.once('pointerdown', () => this._advanceCard());
  }

  _advanceCard() {
    if (!this.cardActive) return;
    this.cardActive = false;
    [this.cardBg, this.cardTitle, this.cardBody, this.cardHint].forEach(o => o.setVisible(false));
    const cb = this._pendingCardCb; this._pendingCardCb = null;
    if (cb) cb();
  }

  _enterAct(idx, isStart) {
    this.actIdx = idx;
    const act = ACTS[idx];
    this.checkpointX = act.startX;
    this.hp = this.maxHp;
    if (isStart) this.gameStarted = true;
    this.player.setVelocity(0, 0);
    this.player.setPosition(act.startX, SPAWN_Y);
    this.lastSafeX = act.startX;
    this.invuln = true; this.player.setAlpha(0.5);
    this.time.delayedCall(700, () => { this.invuln = false; this.player.setAlpha(1); });
    this.tweens.add({ targets: this.wash, fillAlpha: act.washA, duration: 600 });
    this.wash.setFillStyle(act.wash, this.wash.fillAlpha);
    // 激活本幕及之前的橡皮怪
    this.erasers.getChildren().forEach(e => {
      if (e.getData('act') <= idx) { e.setVisible(true); e.body.enable = true; }
    });
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    this._updateObjective();
    this.cameras.main.flash(300, 230, 220, 200, false);
  }

  _updateObjective() {
    const act = ACTS[this.actIdx];
    const tail = this.score >= GOAL_SCORE
      ? '墨滴已集齐 → 奔向画纸尽头的笔尖 →'
      : `越断线避尖刺，聚墨滴（${this.score}/${GOAL_SCORE}）`;
    window.GameHUD?.setObjective(`【第${'一二三'[this.actIdx]}幕·${act.name}】 ${tail}`);
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
    const idle = ['blobf0', 'blobf1', 'blobf2', 'blobf1'];
    const move = ['blobf0', 'blobf3', 'blobf4', 'blobf3'];
    if (!this.anims.exists('ink_idle')) this.anims.create({ key: 'ink_idle', frames: idle.map(k => ({ key: k })), frameRate: 5, repeat: -1 });
    if (!this.anims.exists('ink_move')) this.anims.create({ key: 'ink_move', frames: move.map(k => ({ key: k })), frameRate: 12, repeat: -1 });
  }

  _makeTextures() {
    let g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(PAPER, 1); g.fillRect(0, 0, 64, 64);
    g.lineStyle(3, INK, 1); g.strokeRect(1, 1, 62, 62);
    g.lineStyle(1, INK, 0.25); g.beginPath(); g.moveTo(0, 20); g.lineTo(64, 20); g.strokePath();
    g.generateTexture('tile_1', 64, 64); g.destroy();

    const blob = (key, sx, sy) => {
      const w = 30, h = 30; const g2 = this.make.graphics({ x: 0, y: 0, add: false });
      const cx = 15, cy = 16, rx = 13 * sx, ry = 13 * sy;
      g2.fillStyle(INK, 1); g2.fillEllipse(cx, cy + (13 - ry), rx, ry);
      g2.fillStyle(0xffffff, 1); g2.fillCircle(cx - 4, cy - 4 + (13 - ry), 3); g2.fillCircle(cx + 4, cy - 4 + (13 - ry), 3);
      g2.fillStyle(INK, 1); g2.fillCircle(cx - 4, cy - 4 + (13 - ry), 1.3); g2.fillCircle(cx + 4, cy - 4 + (13 - ry), 1.3);
      g2.generateTexture(key, w, h); g2.destroy();
    };
    blob('blobf0', 1.0, 1.0); blob('blobf1', 1.05, 0.95); blob('blobf2', 0.95, 1.05);
    blob('blobf3', 1.15, 0.82); blob('blobf4', 0.82, 1.18);

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(INK, 1); g.fillCircle(8, 12, 6); g.fillTriangle(8, 0, 3, 9, 13, 9);
    g.fillStyle(0xffffff, 0.7); g.fillCircle(6, 10, 1.6);
    g.generateTexture('drop', 16, 18); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(PAPER, 1); g.lineStyle(3, INK, 1);
    [0, 12, 24].forEach(ox => { g.fillTriangle(ox, 26, ox + 6, 4, ox + 12, 26); g.strokeTriangle(ox, 26, ox + 6, 4, ox + 12, 26); });
    g.generateTexture('spike', 36, 26); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xc9c4bb, 1); g.lineStyle(3, INK, 1);
    g.fillRoundedRect(2, 2, 34, 30, 6); g.strokeRoundedRect(2, 2, 34, 30, 6);
    g.fillStyle(INK, 1); g.fillRect(10, 12, 5, 6); g.fillRect(23, 12, 5, 6);
    g.generateTexture('eraser', 38, 34); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x6fd0c8, 1); g.fillCircle(11, 12, 9);
    g.fillStyle(0xffffff, 1); g.fillCircle(11, 12, 4);
    g.lineStyle(3, INK, 1); g.beginPath(); g.moveTo(11, 20); g.lineTo(11, 68); g.strokePath();
    g.generateTexture('nib', 22, 72); g.destroy();
  }

  _collect(player, drop) {
    if (!this.gameStarted || this.gameOver || this.cardActive) return;
    drop.destroy(); this.score++;
    window.GameHUD?.setScore(this.score);
    const f = this.add.circle(drop.x, drop.y, 5, INK, 0.8).setDepth(30);
    this.tweens.add({ targets: f, scale: 3, alpha: 0, duration: 320, onComplete: () => f.destroy() });
    this._updateObjective();
  }

  _hit(player, hazard) {
    if (!this.gameStarted || this.gameOver || this.invuln || this.cardActive) return;
    this._damage(1);
    const dir = this.player.x < hazard.x ? -1 : 1;
    this.player.setVelocity(150 * dir, -220);
  }

  _damage(n) {
    if (this.invuln || this.gameOver || this.cardActive) return;
    this.hp = Math.max(0, this.hp - n);
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    if (this.hp <= 0) {
      this.deaths++;
      if (this.deaths >= DEATH_BUDGET) { this._lose(); return; }
      this._showCard('被擦去了',
        `橡皮抹淡了小墨的轮廓……它在画纸上重新凝聚。\n（第 ${this.deaths}/${DEATH_BUDGET} 次失手，退回本幕起点重来）`,
        () => this._enterAct(this.actIdx, false));
    } else {
      this.invuln = true; this.player.setAlpha(0.4);
      this.time.delayedCall(850, () => { this.invuln = false; this.player.setAlpha(1); });
    }
  }

  _reachGoal() {
    if (!this.gameStarted || this.gameOver || this.reachedGoal || this.cardActive) return;
    if (this.score >= GOAL_SCORE) { this.reachedGoal = true; this._win(); }
    else window.GameHUD?.setObjective(`笔尖还需 ${GOAL_SCORE - this.score} 滴墨才能落下`);
  }

  _win() {
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0);
    this._showCard('落 笔',
      '最后一滴墨落下，断裂的线条自动连缀成完整的画，\n米白画纸绽放出第一抹色彩——\n小墨终于画完了自己的世界。',
      () => window.GameHUD?.showGameOver(true, '断线连缀成画，小墨画完了自己的世界。'));
  }

  _lose() {
    if (this.gameOver) return;
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0);
    window.GameHUD?.showGameOver(false, '一次次被橡皮擦去轮廓……世界重新变回一片空白。');
  }

  update() {
    if (this.bg) this.bg.tilePositionX = this.cameras.main.scrollX * 0.3;
    if (this.cardActive || !this.gameStarted || this.gameOver) return;

    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    const left = this.cursors.left.isDown || this.kkeys.A.isDown;
    const right = this.cursors.right.isDown || this.kkeys.D.isDown;
    const jump = this.cursors.up.isDown || this.kkeys.W.isDown || this.kkeys.SPACE.isDown;

    if (left) { this.player.setVelocityX(-PLAYER_SPEED); this.player.setFlipX(true); }
    else if (right) { this.player.setVelocityX(PLAYER_SPEED); this.player.setFlipX(false); }
    else this.player.setVelocityX(0);
    if (jump && onGround) this.player.setVelocityY(-JUMP_V);

    const anim = (left || right || !onGround) ? 'ink_move' : 'ink_idle';
    if (this.player.anims.currentAnim?.key !== anim) this.player.play(anim, true);

    this.erasers.getChildren().forEach(e => {
      if (!e.body.enable) return;
      if (e.x <= e.getData('minX')) e.setVelocityX(60);
      else if (e.x >= e.getData('maxX')) e.setVelocityX(-60);
    });

    if (onGround) {
      const overPit = PITS.some(p => this.player.x > p[0] - 10 && this.player.x < p[1] + 10);
      if (!overPit) this.lastSafeX = this.player.x;
    }

    const nextIdx = this.actIdx + 1;
    if (nextIdx < ACTS.length && this.player.x >= ACTS[nextIdx].startX) {
      const act = ACTS[nextIdx];
      this.gameStarted = false;
      this._showCard(act.intro[0], act.intro[1], () => this._enterAct(nextIdx, true));
      return;
    }

    if (this.player.y > WORLD_H + 80) {
      this.player.setVelocity(0, 0);
      this.player.setPosition(this.lastSafeX, SPAWN_Y);
      this._damage(1);
    }
  }

  _exposeState() {
    const self = this;
    window.__gameState = { player: this.player };
    const nextGoalX = () => {
      if (self.score < GOAL_SCORE) {
        let best = GOAL_X, bestD = Infinity;
        self.drops.getChildren().forEach(o => { if (o.active) { const d = o.x - self.player.x; if (d > 20 && d < bestD) { bestD = d; best = o.x; } } });
        return best;
      }
      return GOAL_X;
    };
    const needJump = () => {
      const p = self.player;
      const onGround = p.body.blocked.down || p.body.touching.down;
      if (!onGround) return false;
      for (const [a] of PITS) if (p.x > a - 95 && p.x < a - 12) return true;
      for (const sx of SPIKES) if (sx - p.x > 8 && sx - p.x < 76) return true;
      // 前方有橡皮怪 → 跳过
      let jump = false;
      self.erasers.getChildren().forEach(e => { if (e.body.enable && e.x - p.x > 8 && e.x - p.x < 76) jump = true; });
      return jump;
    };
    window.__probe = () => {
      const p = self.player;
      const onGround = p.body.blocked.down || p.body.touching.down;
      return {
        x: p.x, y: p.y, vx: p.body.velocity.x, onGround,
        hp: self.hp, maxHp: self.maxHp, act: self.actIdx, score: self.score, goalScore: GOAL_SCORE,
        deaths: self.deaths, deathBudget: DEATH_BUDGET,
        won: self.gameOver && self.reachedGoal, lost: self.gameOver && !self.reachedGoal,
        cardActive: self.cardActive, started: self.gameStarted,
        nextGoalX: nextGoalX(), worldW: WORLD_W, goalX: GOAL_X,
        needJump: needJump(),
      };
    };
    window.__advanceCard = () => self._advanceCard();
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
