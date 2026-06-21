/* ShadowLeap — 影跃：迷雾森林（短篇完整游戏版）
 * 剪影解谜跑酷 (silhouette platformer). AI 剪影男孩(idle/run/jump，姿态本就干净，沿用) + 瓦片地面。
 *
 * demo → 短篇完整游戏的结构升级（同 ShadowNinja/MoonRonin 方法）：
 *  · 开场卡 →【一幕·枯枝浅滩】学跳 →【二幕·捕兽夹林道】夹+坠石 →【三幕·齿轮废墟】高潮 → 结局卡
 *  · 检查点 + 每幕满血 + 死亡预算；每幕雾气加浓
 *  · 微光散落必经路径；捕兽夹/坠石逐幕增多；沟壑可越（跳跃留足余量）
 *  · 暴露 window.__probe()/__advanceCard()（坐标/沟壑+夹 needJump/目标）
 */

const GAME_W = 960;
const GAME_H = 540;
const TILE = 64;
const WORLD_W = (TILEMAP_DATA.width || 75) * TILE;   // 4800
const WORLD_H = (TILEMAP_DATA.height || 9) * TILE;    // 576
const FLOOR_TOP = WORLD_H - 2 * TILE;                 // 448
const SPAWN_Y = WORLD_H - 3 * TILE;                   // 384（高于地面，落下落顶面）

const PLAYER_SPEED = 230;
const JUMP_V = 580;   // 普通跳（不漂浮）；沟壑收窄到 128px 后余量充足
const DEATH_BUDGET = 5;

// 把原 256/192px 过宽沟壑收窄为干净的 128px（在 create 里补地砖实现），
// 原宽度落地余量仅 ~32px、对人/ bot 都过苛。
const GAP_FILL_COLS = [21, 24, 45];     // 补这些列的地砖 → 沟壑收窄
const PITS = [[1408, 1536], [2944, 3072]];  // 收窄后的沟壑 [起,止] px（各 128 宽）
// 捕兽夹（地面，跳跃可越）。须与沟壑保持落地间距：跳夹的落点不能落进沟壑。
const TRAPS = [780, 1080, 2050, 2650, 3450, 4150];

// ── 三幕 ──
const ACTS = [
  { name: '枯枝浅滩', startX: 120,  fog: 0x0c0f16, fogA: 0.0,
    intro: ['第一幕 · 枯枝浅滩',
      '妹妹被迷雾夺走，唯一的线索是森林深处那团不灭的光。\n男孩不会说话，只会奔跑与跳跃。\n← → / A D 跑，↑ / W / 空格 跳——越过枯枝间的第一道沟壑，拾起微光。'] },
  { name: '捕兽夹林道', startX: 1700, fog: 0x0a0d14, fogA: 0.16,
    intro: ['第二幕 · 捕兽夹林道',
      '浓雾压顶，林道里密布张口的捕兽夹，头顶还有坠石砸落。\n看准节奏起跳，越过陷阱与沟壑。\n微光忽明忽灭，别让迷雾先吞了它们。'] },
  { name: '齿轮废墟', startX: 3150, fog: 0x100a14, fogA: 0.2,
    intro: ['第三幕 · 齿轮废墟',
      '巨大的齿轮废墟在雾光中沉默，断桥与悬崖交错。\n尽头便是那团光。\n聚齐微光，跃过最后的断崖——把妹妹找回来。'] },
];

const GOAL_SCORE = 7;
// 微光：全部落在地面奔跑高度(y405)、避开沟壑与捕兽夹 x，奔跑即可拾，共 12 → 目标 7
const MOTES = [
  { x: 360, y: 405 }, { x: 640, y: 405 }, { x: 1000, y: 405 }, { x: 1240, y: 405 },
  { x: 1650, y: 405 }, { x: 1950, y: 405 }, { x: 2250, y: 405 }, { x: 2500, y: 405 },
  { x: 2820, y: 405 }, { x: 3250, y: 405 }, { x: 3700, y: 405 }, { x: 4050, y: 405 },
];
const GOAL_X = WORLD_W - 120;

const DEPTH = { GROUND: 0, YSORT: 1000, EFFECTS: 9500 };

class ShadowLeapScene extends Phaser.Scene {
  constructor() { super('ShadowLeapScene'); }

  preload() {
    this.load.image('panorama', 'scene/panorama.png');
    const idx = TILEMAP_DATA.tileIndex || {};
    for (const [id, name] of Object.entries(idx)) this.load.image(`tile_${id}`, `assets/tiles/${name}.png`);
    this.load.spritesheet('shadowboy', 'assets/sprites/ShadowBoy.webp', { frameWidth: 192, frameHeight: 208 });
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H + 200);
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_H);

    this._makeFxTextures();

    this.bg = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'panorama')
      .setOrigin(0, 0).setScrollFactor(0).setTileScale(GAME_H / 864, GAME_H / 864).setDepth(-100);
    this.fog = this.add.rectangle(0, 0, GAME_W, GAME_H, ACTS[0].fog, 0)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(-50);

    this.solids = this.physics.add.staticGroup();
    this._renderTileLayer('solid', DEPTH.GROUND, true);
    // 补地砖收窄过宽沟壑（行 7、8）
    for (const c of GAP_FILL_COLS) for (const r of [7, 8]) {
      const sp = this.add.image(c * TILE + TILE / 2, r * TILE + TILE / 2, 'tile_1').setDisplaySize(TILE, TILE).setDepth(DEPTH.GROUND);
      this.solids.add(sp); sp.body.setSize(TILE, TILE);
    }

    this._makeAnims();

    this.player = this.physics.add.sprite(ACTS[0].startX, SPAWN_Y, 'shadowboy', 0);
    this.player.setScale(0.42);
    this.player.body.setSize(70, 150).setOffset(60, 55);
    this.player.setDepth(DEPTH.YSORT);
    this.physics.add.collider(this.player, this.solids);
    this.player.play('sb_idle');
    this.lastSafeX = ACTS[0].startX;

    this.motes = this.physics.add.group({ allowGravity: false, immovable: true });
    for (const m of MOTES) {
      const s = this.motes.create(m.x, m.y, 'mote'); s.setDepth(15);
      this.tweens.add({ targets: s, y: m.y - 12, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    this.physics.add.overlap(this.player, this.motes, this._collectMote, null, this);

    this.traps = this.physics.add.staticGroup();
    for (const tx of TRAPS) {
      const s = this.traps.create(tx, FLOOR_TOP - 10, 'trap');
      s.body.setSize(34, 16).setOffset(3, 12); s.setDepth(16);
    }
    this.physics.add.overlap(this.player, this.traps, (p, h) => this._hitHazard(p, h, 'trap'), null, this);

    this.rocks = this.physics.add.group();
    this.physics.add.collider(this.rocks, this.solids, (rock) => {
      this.tweens.add({ targets: rock, alpha: 0, duration: 200, onComplete: () => rock.destroy() });
    });
    this.physics.add.overlap(this.player, this.rocks, (p, r) => this._hitHazard(p, r, 'rock'), null, this);

    this.goal = this.physics.add.staticImage(GOAL_X, FLOOR_TOP - 60, 'goal').setDepth(15);
    this.goalGlow = this.add.circle(GOAL_X, FLOOR_TOP - 60, 60, 0xfff0c0, 0.18).setDepth(14);
    this.tweens.add({ targets: this.goalGlow, scale: 1.3, alpha: 0.32, duration: 1400, yoyo: true, repeat: -1 });
    this.physics.add.overlap(this.player, this.goal, this._reachGoal, null, this);

    this.maxHp = 3; this.hp = 3; this.score = 0;
    this.actIdx = 0; this.deaths = 0;
    this.reachedGoal = false; this.invuln = false;
    this.gameStarted = false; this.gameOver = false; this.cardActive = false;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.kkeys = this.input.keyboard.addKeys('W,A,S,D,SPACE');
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(180, 200);

    this.rockTimer = this.time.addEvent({ delay: 1800, loop: true, callback: this._dropRock, callbackScope: this });

    this._buildCardLayer();
    this._exposeState();

    if (window.GameHUD) {
      window.GameHUD.onStart(() => {
        window.GameHUD.setHearts(this.hp, this.maxHp);
        window.GameHUD.setScore(this.score);
        this._showCard('影跃 · 迷雾森林',
          '迷雾夺走了妹妹，深处那团光是唯一的线索。\n奔跑、跳跃，越过沟壑与陷阱，聚齐 ' + GOAL_SCORE + ' 点微光，抵达光源。\n\n奔跑 ← → / A D    ·    跳 ↑ / W / 空格    ·    继续 SPACE',
          () => this._enterAct(0, true));
      });
    }
  }

  _buildCardLayer() {
    this.cardBg = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x05070d, 0.9).setOrigin(0, 0).setScrollFactor(0).setDepth(200).setVisible(false);
    this.cardTitle = this.add.text(GAME_W / 2, 170, '', { fontFamily: 'Segoe UI, sans-serif', fontSize: '30px', color: '#fff0c0', align: 'center', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setVisible(false);
    this.cardBody = this.add.text(GAME_W / 2, 300, '', { fontFamily: 'Segoe UI, sans-serif', fontSize: '18px', color: '#cbd5e1', align: 'center', lineSpacing: 10, wordWrap: { width: 720 } }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setVisible(false);
    this.cardHint = this.add.text(GAME_W / 2, 470, '— 按 SPACE 继续 —', { fontFamily: 'Segoe UI, sans-serif', fontSize: '14px', color: '#64748b' }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setVisible(false);
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
    this.tweens.add({ targets: this.fog, fillAlpha: act.fogA, duration: 600 });
    this.fog.setFillStyle(act.fog, this.fog.fillAlpha);
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    this._updateObjective();
    this.cameras.main.flash(300, 255, 240, 192, false);
  }

  _updateObjective() {
    const act = ACTS[this.actIdx];
    const tail = this.score >= GOAL_SCORE
      ? '微光已聚齐 → 奔向森林深处的光源 →'
      : `越沟壑避陷阱，聚微光（${this.score}/${GOAL_SCORE}）`;
    window.GameHUD?.setObjective(`【第${'一二三'[this.actIdx]}幕·${act.name}】 ${tail}`);
  }

  _renderTileLayer(layerName, baseDepth, collision) {
    const data = (TILEMAP_DATA.layers || {})[layerName];
    if (!data) return;
    const W = TILEMAP_DATA.width, TW = TILEMAP_DATA.tileWidth, TH = TILEMAP_DATA.tileHeight;
    data.forEach((id, i) => {
      if (!id) return;
      const x = (i % W) * TW + TW / 2;
      const y = Math.floor(i / W) * TH + TH / 2;
      const sp = this.add.image(x, y, `tile_${id}`).setDisplaySize(TW, TH).setDepth(baseDepth);
      if (collision) { this.solids.add(sp); sp.body.setSize(TW, TH); }
    });
  }

  _makeAnims() {
    const def = (key, row, fps, loop) => {
      if (this.anims.exists(key)) return;
      this.anims.create({ key, frames: this.anims.generateFrameNumbers('shadowboy', { start: row * 9, end: row * 9 + 8 }), frameRate: fps, repeat: loop ? -1 : 0 });
    };
    def('sb_idle', 0, 8, true);
    def('sb_run', 1, 14, true);
    def('sb_jump', 2, 10, false);
  }

  _makeFxTextures() {
    let g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xfff3c0, 0.25); g.fillCircle(8, 8, 8);
    g.fillStyle(0xfff7d6, 0.6); g.fillCircle(8, 8, 4.5);
    g.fillStyle(0xffffff, 1); g.fillCircle(8, 8, 2);
    g.generateTexture('mote', 16, 16); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x000000, 1);
    g.fillTriangle(2, 26, 8, 6, 14, 26); g.fillTriangle(14, 26, 20, 8, 26, 26);
    g.fillTriangle(26, 26, 32, 6, 38, 26); g.fillRect(2, 24, 36, 4);
    g.generateTexture('trap', 40, 28); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x05060b, 1); g.fillCircle(14, 14, 13);
    g.generateTexture('rock', 28, 28); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xfff0c0, 0.9); g.fillCircle(12, 14, 10);
    g.fillStyle(0xffffff, 1); g.fillCircle(12, 14, 5);
    g.fillStyle(0xfff0c0, 0.35); g.fillRect(9, 14, 6, 66);
    g.generateTexture('goal', 24, 84); g.destroy();
  }

  _collectMote(player, mote) {
    if (!this.gameStarted || this.gameOver || this.cardActive) return;
    mote.destroy(); this.score++;
    window.GameHUD?.setScore(this.score);
    const flash = this.add.circle(mote.x, mote.y, 6, 0xffffff, 0.9).setDepth(DEPTH.EFFECTS);
    this.tweens.add({ targets: flash, scale: 3, alpha: 0, duration: 350, onComplete: () => flash.destroy() });
    this._updateObjective();
  }

  _dropRock() {
    if (!this.gameStarted || this.gameOver || this.cardActive || this.actIdx < 1) return;  // 坠石二幕起
    const px = Phaser.Math.Clamp(this.player.x + Phaser.Math.Between(-40, 160), 60, WORLD_W - 60);
    const rock = this.rocks.create(px, this.cameras.main.scrollY - 20, 'rock');
    rock.setDepth(18); rock.body.setCircle(13); rock.setVelocityY(190);
  }

  _hitHazard(player, hazard, kind) {
    if (!this.gameStarted || this.gameOver || this.invuln || this.cardActive) return;
    if (kind === 'rock') {
      this.tweens.add({ targets: hazard, alpha: 0, duration: 150, onComplete: () => hazard.destroy() });
      this._damage(1);   // 坠石仅扣血，不大幅击退（避免把 bot/玩家甩进沟壑）
    } else {
      this._damage(1);
      const dir = this.player.flipX ? 1 : -1;
      this.player.setVelocity(120 * dir, -200);
    }
  }

  _damage(n) {
    if (this.invuln || this.gameOver || this.cardActive) return;
    this.hp = Math.max(0, this.hp - n);
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    if (this.hp <= 0) {
      this.deaths++;
      if (this.deaths >= DEATH_BUDGET) { this._lose(); return; }
      this._showCard('被迷雾吞没',
        `那点微光在眼前熄灭……男孩在雾中重新睁开眼。\n（第 ${this.deaths}/${DEATH_BUDGET} 次失手，退回本幕起点重来）`,
        () => this._enterAct(this.actIdx, false));
    } else {
      this.invuln = true; this.player.setAlpha(0.4);
      this.time.delayedCall(900, () => { this.invuln = false; this.player.setAlpha(1); });
    }
  }

  _reachGoal() {
    if (!this.gameStarted || this.gameOver || this.reachedGoal || this.cardActive) return;
    if (this.score >= GOAL_SCORE) { this.reachedGoal = true; this._win(); }
    else window.GameHUD?.setObjective(`光源还需 ${GOAL_SCORE - this.score} 点微光才能点亮`);
  }

  _win() {
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0);
    this._showCard('光 · 重逢',
      '男孩跃过最后的断崖，触到那团光——\n迷雾退散，妹妹的剪影在晨曦中向他伸出手，\n森林第一次有了颜色。',
      () => window.GameHUD?.showGameOver(true, '迷雾退散，男孩找回了妹妹，森林有了颜色。'));
  }

  _lose() {
    if (this.gameOver) return;
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0);
    window.GameHUD?.showGameOver(false, '一次次被迷雾吞没……那团光，终究没能触到。');
  }

  update() {
    if (this.bg) this.bg.tilePositionX = this.cameras.main.scrollX * 0.35;
    if (this.cardActive || !this.gameStarted || this.gameOver) return;

    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    const left = this.cursors.left.isDown || this.kkeys.A.isDown;
    const right = this.cursors.right.isDown || this.kkeys.D.isDown;
    const jump = this.cursors.up.isDown || this.kkeys.W.isDown || this.kkeys.SPACE.isDown;

    if (left) { this.player.setVelocityX(-PLAYER_SPEED); this.player.setFlipX(true); }
    else if (right) { this.player.setVelocityX(PLAYER_SPEED); this.player.setFlipX(false); }
    else this.player.setVelocityX(0);
    if (jump && onGround) this.player.setVelocityY(-JUMP_V);

    let target;
    if (!onGround) target = 'sb_jump';
    else if (left || right) target = 'sb_run';
    else target = 'sb_idle';
    if (this.player.anims.currentAnim?.key !== target) this.player.play(target, true);

    if (onGround) {
      const overPit = PITS.some(p => this.player.x > p[0] - 10 && this.player.x < p[1] + 10);
      if (!overPit) this.lastSafeX = this.player.x;
    }

    // 幕推进
    const nextIdx = this.actIdx + 1;
    if (nextIdx < ACTS.length && this.player.x >= ACTS[nextIdx].startX) {
      const act = ACTS[nextIdx];
      this.gameStarted = false;
      this._showCard(act.intro[0], act.intro[1], () => this._enterAct(nextIdx, true));
      return;
    }

    // 坠入沟壑
    if (this.player.y > WORLD_H + 80) {
      this.player.setVelocity(0, 0);
      this.player.setPosition(this.lastSafeX, SPAWN_Y);
      this._damage(1);
    }

    this.rocks.getChildren().forEach(r => { if (r.y > GAME_H + 200) r.destroy(); });

    if (!this.reachedGoal && this.player.x > GOAL_X - 30 && this.score < GOAL_SCORE)
      window.GameHUD?.setObjective(`光源还需 ${GOAL_SCORE - this.score} 点微光才能点亮`);
  }

  _exposeState() {
    const self = this;
    window.__gameState = { player: this.player };
    const nextGoalX = () => {
      if (self.score < GOAL_SCORE) {
        let best = GOAL_X, bestD = Infinity;
        self.motes.getChildren().forEach(o => { if (o.active) { const d = o.x - self.player.x; if (d > 20 && d < bestD) { bestD = d; best = o.x; } } });
        return best;
      }
      return GOAL_X;
    };
    // 前方有沟壑边缘 或 捕兽夹 → 起跳
    const needJump = () => {
      const p = self.player;
      const onGround = p.body.blocked.down || p.body.touching.down;
      if (!onGround) return false;
      for (const [a] of PITS) if (p.x > a - 95 && p.x < a - 12) return true;     // 沟壑边缘附近起跳
      for (const tx of TRAPS) if (tx - p.x > 8 && tx - p.x < 78) return true;   // 捕兽夹前起跳越过
      return false;
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
  backgroundColor: '#0a0e16',
  physics: { default: 'arcade', arcade: { gravity: { y: 1100 }, debug: false } },
  scene: ShadowLeapScene,
};

new Phaser.Game(config);
