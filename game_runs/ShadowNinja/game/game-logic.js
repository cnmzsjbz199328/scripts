/* ShadowNinja — 影忍：将军府之夜（短篇完整游戏版）
 * 剪影潜行 (silhouette stealth side-scroller)，三幕结构 + 叙事过场 + 检查点。
 *
 * demo → 短篇完整游戏的结构升级：
 *  · 开场卡 →【一幕·外院回廊】教学 →【二幕·中庭望楼】探照灯 →【三幕·内牢深处】高潮 → 结局卡
 *  · 检查点：被照中退回本幕起点（满血），不从头来；死亡预算耗尽才真正失败
 *  · 每幕彩色雾气叠层区分氛围（暖灯笼 / 冷探照 / 红火盆）
 *  · 剧情卡为画布内浮层，自包含
 *  · 暴露 window.__probe() 供 autoplay 白盒自测（坐标/血量/幕/目标/危险判定）
 *
 * 角色：char-sprite 真序列帧 NinjaShade（idle/run/crouch）。地面 tilemap solid + 程序化近黑瓦片。
 */

const GAME_W = 960;
const GAME_H = 540;
const TILE = 64;
const WORLD_W = (TILEMAP_DATA.width || 75) * TILE;   // 4800
const WORLD_H = (TILEMAP_DATA.height || 9) * TILE;    // 576
const FLOOR_TOP = WORLD_H - 2 * TILE;                 // 448
const SPAWN_Y = FLOOR_TOP - 40;

const PLAYER_SPEED = 200;
const CROUCH_SPEED = 95;
const JUMP_V = 480;
const WARM = 0xffd27a;
const DEATH_BUDGET = 5;   // 死亡预算（耗尽才真正失败），检查点让每幕重来更友好

// ── 三幕定义（沿同一横向世界推进）────────────────────────────
// startX：本幕检查点（被照中退回此处）；fog：本幕氛围色叠层
const ACTS = [
  { name: '外院回廊', startX: 60,   fog: 0x1a0f05, fogA: 0.0,
    intro: ['第一幕 · 外院回廊',
      '纸灯笼在回廊间投下摇曳的暖光，一名武士提灯定线巡逻。\n月隐于云——按住 S / ↓ 蹲入阴影，灯笼的光锥便照不穿你的身形。\n趁光锥扫开的间隙，向右潜行。'] },
  { name: '中庭望楼', startX: 1500, fog: 0x06121e, fogA: 0.18,
    intro: ['第二幕 · 中庭望楼',
      '望楼上的探照灯笼开始来回扫射，光柱与立柱的阴影交错。\n守卫更密了。看准光柱扫过的节奏，蹲伏穿过——\n沿途的门钥，是打开最深处那道铁锁的唯一指望。'] },
  { name: '内牢深处', startX: 3150, fog: 0x1e0606, fogA: 0.22,
    intro: ['第三幕 · 内牢深处',
      '火盆的幽光映着铁栅，这里守备最密。\n师弟就关在尽头的牢笼里。\n集齐门钥，避开最后的光网，潜抵牢前——把他带回家。'] },
];

const GOAL_SCORE = 5;

// 巡逻守卫（带所属幕，用于氛围；逻辑相同）
const GUARDS = [
  { x: 900,  range: 210 },                       // 一幕：单个，教学
  { x: 2000, range: 230 }, { x: 2750, range: 200 }, // 二幕
  { x: 3600, range: 210 }, { x: 4250, range: 190 }, // 三幕
];
// 望楼探照灯（扫射光柱）：二幕起出现
const LIGHTS = [1850, 2900, 3950, 4500];
// 门钥（5 把，分布三幕）
const KEYS = [
  { x: 700,  y: SPAWN_Y }, { x: 1950, y: SPAWN_Y }, { x: 2600, y: SPAWN_Y },
  { x: 3750, y: SPAWN_Y }, { x: 4400, y: SPAWN_Y },
];
const CELL_X = WORLD_W - 110;

class ShadowNinjaScene extends Phaser.Scene {
  constructor() { super('ShadowNinjaScene'); }

  preload() {
    this.load.image('manor', 'scene/panorama.png');
    this.load.spritesheet('ninja', 'assets/sprites/NinjaShade.webp', { frameWidth: 192, frameHeight: 208 });
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H + 200);
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_H);

    this._makeTextures();

    this.bg = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'manor')
      .setOrigin(0, 0).setScrollFactor(0).setTileScale(GAME_H / 864, GAME_H / 864).setDepth(-100);

    // 每幕氛围雾气叠层（固定屏幕，按幕切色）
    this.fog = this.add.rectangle(0, 0, GAME_W, GAME_H, ACTS[0].fog, 0)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(-50);

    // 瓦片地面（程序化近黑瓦片 + 碰撞）
    this.solids = this.physics.add.staticGroup();
    this._renderTileLayer('solid', 0, true);

    this._makeAnims();

    // 玩家忍者（贴左出生 + 世界边界）
    this.player = this.physics.add.sprite(ACTS[0].startX, SPAWN_Y, 'ninja', 0);
    this.player.setScale(0.42);
    this.player.body.setSize(70, 150).setOffset(60, 55);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(20);
    this.physics.add.collider(this.player, this.solids);
    this.player.play('nj_idle');

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

    this.lights = LIGHTS.map((lx, i) => ({ x: lx, phase: i * 1.3 }));
    this.coneGfx = this.add.graphics().setDepth(9);

    // 牢笼（终点）
    this.goal = this.physics.add.staticImage(CELL_X, FLOOR_TOP - 36, 'cell').setDepth(15);
    this.physics.add.overlap(this.player, this.goal, this._reachCell, null, this);

    // 状态
    this.maxHp = 3; this.hp = 3; this.score = 0;
    this.actIdx = 0; this.deaths = 0;
    this.reachedCell = false; this.invuln = false; this.crouch = false;
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
        // 开场卡：进入第一幕
        this._showCard('影忍 · 将军府之夜',
          '今夜，是救出师弟的唯一机会。\n潜行向右，蹲伏避开一切光照，集齐 ' + GOAL_SCORE + ' 把门钥，直抵最深处的牢笼。\n\n移动 ← → / A D    ·    蹲伏 ↓ / S    ·    继续 SPACE',
          () => this._enterAct(0, true));
      });
    }
  }

  // ── 叙事卡浮层 ──────────────────────────────────────────────
  _buildCardLayer() {
    this.cardBg = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x05070d, 0.9)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(200).setVisible(false);
    this.cardTitle = this.add.text(GAME_W / 2, 170, '', {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '30px', color: '#ffd27a',
      align: 'center', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setVisible(false);
    this.cardBody = this.add.text(GAME_W / 2, 300, '', {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '18px', color: '#cbd5e1',
      align: 'center', lineSpacing: 10, wordWrap: { width: 720 } })
      .setOrigin(0.5).setScrollFactor(0).setDepth(201).setVisible(false);
    this.cardHint = this.add.text(GAME_W / 2, 470, '— 按 SPACE 继续 —', {
      fontFamily: 'Segoe UI, sans-serif', fontSize: '14px', color: '#64748b' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(201).setVisible(false);
  }

  _showCard(title, body, cb) {
    this.cardActive = true;
    this._pendingCardCb = cb;
    this.player.setVelocity(0, 0);
    this.cardTitle.setText(title); this.cardBody.setText(body);
    [this.cardBg, this.cardTitle, this.cardBody, this.cardHint].forEach(o => o.setVisible(true));
    // 一次性推进：SPACE / ENTER / 指针
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

  // ── 进入某一幕（检查点 + 满血 + 氛围切换）────────────────────
  _enterAct(idx, isStart) {
    this.actIdx = idx;
    const act = ACTS[idx];
    this.checkpointX = act.startX;
    this.hp = this.maxHp;
    if (isStart) this.gameStarted = true;
    this.player.setVelocity(0, 0);
    this.player.setPosition(act.startX, SPAWN_Y);
    this.invuln = true; this.time.delayedCall(700, () => { this.invuln = false; });
    this.tweens.add({ targets: this.fog, fillAlpha: act.fogA, duration: 600 });
    this.fog.setFillStyle(act.fog, this.fog.fillAlpha); // 立即切色，alpha 由 tween 接管
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    this._updateObjective();
    this.cameras.main.flash(300, 255, 210, 122, false);
  }

  _updateObjective() {
    const act = ACTS[this.actIdx];
    const left = GOAL_SCORE - this.score;
    const tail = this.score >= GOAL_SCORE
      ? '门钥已集齐 → 潜抵尽头的牢笼救出师弟'
      : `拾取门钥（${this.score}/${GOAL_SCORE}），蹲伏避开光照`;
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
    const def = (key, row, fps, loop) => {
      if (this.anims.exists(key)) return;
      this.anims.create({ key, frames: this.anims.generateFrameNumbers('ninja', { start: row * 9, end: row * 9 + 8 }), frameRate: fps, repeat: loop ? -1 : 0 });
    };
    def('nj_idle', 0, 8, true);
    def('nj_run', 1, 14, true);
    def('nj_crouch', 2, 8, true);
  }

  _makeTextures() {
    let g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x05060c, 1); g.fillRect(0, 0, 64, 64);
    g.fillStyle(0x0b0d16, 1);
    for (let i = 0; i < 18; i++) g.fillRect((i * 37) % 64, (i * 53) % 64, 3, 3);
    g.lineStyle(1, 0x10131f, 0.6); g.strokeRect(0, 0, 64, 64);
    g.generateTexture('tile_1', 64, 64); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x05060c, 1); g.fillCircle(14, 10, 8); g.fillRoundedRect(7, 16, 16, 24, 5);
    g.fillRect(7, 37, 6, 12); g.fillRect(16, 37, 6, 12);
    g.fillStyle(0x3a2a14, 1); g.fillRect(27, 18, 3, 14);
    g.fillStyle(WARM, 1); g.fillCircle(29, 34, 5);
    g.generateTexture('guard', 34, 50); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(WARM, 1); g.fillCircle(6, 6, 5);
    g.fillStyle(0x000000, 1); g.fillCircle(6, 6, 2);
    g.fillStyle(WARM, 1); g.fillRect(9, 5, 8, 3); g.fillRect(14, 8, 3, 4);
    g.generateTexture('key', 18, 18); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x05060c, 1); g.fillRect(0, 0, 60, 70);
    g.fillStyle(0x1a1410, 1); g.fillRect(6, 8, 48, 56);
    g.lineStyle(3, 0x000000, 1);
    for (let i = 0; i <= 48; i += 12) { g.beginPath(); g.moveTo(6 + i, 8); g.lineTo(6 + i, 64); g.strokePath(); }
    g.fillStyle(WARM, 0.7); g.fillCircle(30, 40, 6);
    g.generateTexture('cell', 60, 70); g.destroy();
  }

  _collect(player, key) {
    if (!this.gameStarted || this.gameOver || this.cardActive) return;
    key.destroy(); this.score++;
    window.GameHUD?.setScore(this.score);
    const f = this.add.circle(key.x, key.y, 5, WARM, 0.9).setDepth(30);
    this.tweens.add({ targets: f, scale: 3, alpha: 0, duration: 320, onComplete: () => f.destroy() });
    this._updateObjective();
  }

  _spotted() {
    if (this.invuln || this.gameOver || this.cardActive) return;
    this.hp = Math.max(0, this.hp - 1);
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    this.invuln = true;
    this.cameras.main.flash(180, 255, 120, 60); this.cameras.main.shake(140, 0.008);
    this.player.setVelocity(0, 0);
    if (this.hp <= 0) {
      this.deaths++;
      if (this.deaths >= DEATH_BUDGET) { this._lose(); return; }
      // 血量耗尽才退回本幕检查点，满血重来
      this._showCard('被发现了！',
        `警钟在回廊间回荡……影闪身退回阴影。\n（第 ${this.deaths}/${DEATH_BUDGET} 次失手，退回本幕起点重来）`,
        () => this._enterAct(this.actIdx, false));
    } else {
      // 被擦到：仅小幅击退 + 无敌帧，不退回检查点（避免反复回弹卡死）
      const back = Math.max(ACTS[this.actIdx].startX, this.player.x - 150);
      this.player.setPosition(back, SPAWN_Y);
      this.time.delayedCall(900, () => { this.invuln = false; });
    }
  }

  _reachCell() {
    if (!this.gameStarted || this.gameOver || this.reachedCell || this.cardActive) return;
    if (this.score >= GOAL_SCORE) { this.reachedCell = true; this._win(); }
    else window.GameHUD?.setObjective(`牢锁还需 ${GOAL_SCORE - this.score} 把门钥`);
  }

  _win() {
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0);
    this._showCard('归 家',
      '最后一道铁锁应声而开，师弟重获自由。\n两道黑影翻上屋脊，融入夜色，将军府的灯火在身后渐渐远去——\n师兄弟，平安归家。',
      () => window.GameHUD?.showGameOver(true, '师弟重获自由，师兄弟平安归家。'));
  }

  _lose() {
    if (this.gameOver) return;
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0);
    window.GameHUD?.showGameOver(false, '一次次失手惊动了整座将军府，警钟长鸣，今夜的营救……功亏一篑。');
  }

  update(time) {
    if (this.bg) this.bg.tilePositionX = this.cameras.main.scrollX * 0.3;
    this._drawCones(time);
    if (this.cardActive || !this.gameStarted || this.gameOver) return;

    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    this.crouch = (this.cursors.down.isDown || this.kkeys.S.isDown) && onGround;

    const spd = this.crouch ? CROUCH_SPEED : PLAYER_SPEED;
    const left = this.cursors.left.isDown || this.kkeys.A.isDown;
    const right = this.cursors.right.isDown || this.kkeys.D.isDown;
    const jump = (this.cursors.up.isDown || this.kkeys.W.isDown || this.kkeys.SPACE.isDown) && !this.crouch;

    if (left) { this.player.setVelocityX(-spd); this.player.setFlipX(true); }
    else if (right) { this.player.setVelocityX(spd); this.player.setFlipX(false); }
    else this.player.setVelocityX(0);
    if (jump && onGround) this.player.setVelocityY(-JUMP_V);

    let anim;
    if (this.crouch) anim = 'nj_crouch';
    else if (left || right) anim = 'nj_run';
    else anim = 'nj_idle';
    if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== anim) this.player.play(anim, true);

    this.guards.forEach(s => {
      let dir = s.getData('dir');
      if (s.x >= s.getData('maxX')) dir = -1; else if (s.x <= s.getData('minX')) dir = 1;
      s.setData('dir', dir); s.setVelocityX(70 * dir); s.setFlipX(dir < 0);
    });

    // 幕推进：跨过下一幕检查点 → 过场卡
    const nextIdx = this.actIdx + 1;
    if (nextIdx < ACTS.length && this.player.x >= ACTS[nextIdx].startX) {
      const act = ACTS[nextIdx];
      this.gameStarted = false; // 暂停直到卡片推进
      this._showCard(act.intro[0], act.intro[1], () => this._enterAct(nextIdx, true));
      return;
    }

    // 危险判定（蹲伏 = 隐身，不被察觉）
    if (!this.crouch && !this.invuln) {
      if (this._dangerAt(this.player.x, this.player.y, time)) this._spotted();
    }
  }

  // 给定世界坐标在 time 时刻是否处于任一光锥/光柱内
  _dangerAt(px, py, time) {
    for (const s of this.guards) if (this._coneHit(s, px, py)) return true;
    for (const l of this.lights) if (this._beamHit(l, time, px, py)) return true;
    return false;
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
    // 探照灯仅在已进入的幕（二幕起）显示，避免一幕教学被干扰
    if (this.actIdx >= 1) {
      this.lights.forEach(l => { g.fillStyle(0xfff0c0, 0.10); g.fillTriangleShape(this._beamTri(l, time)); });
    }
  }

  // ── 暴露状态给 verify / autoplay 白盒自测 ───────────────────
  _exposeState() {
    const self = this;
    window.__gameState = { player: this.player };
    // 下一目标 x：未集齐则最近未拾门钥，否则牢笼
    const nextGoalX = () => {
      if (self.score < GOAL_SCORE) {
        let best = CELL_X, bestD = Infinity;
        self.keys2.getChildren().forEach(k => { if (k.active) { const d = k.x - self.player.x; if (d > -20 && d < bestD) { bestD = d; best = k.x; } } });
        return best;
      }
      return CELL_X;
    };
    window.__probe = () => {
      const p = self.player, t = self.time.now;
      const onGround = p.body.blocked.down || p.body.touching.down;
      const dir = p.flipX ? -1 : 1;
      return {
        x: p.x, y: p.y, vx: p.body.velocity.x, onGround,
        hp: self.hp, maxHp: self.maxHp, act: self.actIdx, score: self.score, goalScore: GOAL_SCORE,
        deaths: self.deaths, deathBudget: DEATH_BUDGET,
        won: self.gameOver && self.reachedCell, lost: self.gameOver && !self.reachedCell,
        cardActive: self.cardActive, started: self.gameStarted,
        nextGoalX: nextGoalX(), worldW: WORLD_W, cellX: CELL_X,
        // 站立时此刻是否危险 / 前方一步是否危险（蹲伏可免）
        dangerNow: self._dangerAt(p.x, p.y, t),
        dangerAhead: self._dangerAt(p.x + 90, p.y, t) || self._dangerAt(p.x + 160, p.y, t),
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
  backgroundColor: '#0a0e1a',
  physics: { default: 'arcade', arcade: { gravity: { y: 1100 }, debug: false } },
  scene: ShadowNinjaScene,
};

new Phaser.Game(config);
