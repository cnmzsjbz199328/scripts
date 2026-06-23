/* MoonRonin — 月影：屋脊浪人（短篇完整游戏版）
 * 剪影屋脊跑酷 (silhouette parkour). 全 SVG（角色逐帧 + 瓦片），以 ShadowNinja 夜景为风格锚。
 *
 * demo → 短篇完整游戏的结构升级（与 ShadowNinja 同一套方法）：
 *  · 开场卡 →【一幕·外院飞檐】学跑跳 →【二幕·中庭高脊】缺口更宽+夜枭 →【三幕·府墙尽头】高潮 → 结局卡
 *  · 检查点：失足/受击退回本幕起点（满血），死亡预算耗尽才真正失败
 *  · 叙事卡画布内浮层；月光散落于必经屋脊；夜枭逐幕增多
 *  · 暴露 window.__probe()/__advanceCard() 供 autoplay 白盒自测（坐标/缺口/夜枭/目标）
 */

const GAME_W = 960;
const GAME_H = 540;
const TILE = 64;
const WORLD_W = (TILEMAP_DATA.width || 80) * TILE;   // 5120
const WORLD_H = (TILEMAP_DATA.height || 9) * TILE;
const PLAYER_SPEED = 230;
const JUMP_V = 640;   // 跳跃留足余量：缺口/升高屋脊都能宽松越过（对人/ bot 都更可靠）
const END_X = WORLD_W - 5 * TILE;   // 4800
const DEATH_BUDGET = 5;
const SPAWN_Y = 320;

// ── 月光视界（月光越多，照亮的世界越大）──
// 暗幕只盖在背景全景上（深度 -50，介于 bg -100 与瓦片 0 之间）：
// 脚下屋脊 / 月光 / 夜枭 / 鹭 永远清晰可读，仅远景庙宇剪影被夜色吞没。
const LIGHT_MIN = 210;       // 下限：零月光时也照亮脚下与前方落点，保证公平
const LIGHT_PER_ORB = 26;    // 每拾一缕月光，光晕半径增长
const LIGHT_BIAS = 70;       // 光晕朝奔跑方向前倾，多看前路

// 屋脊段（来自 tilemap _segs：[c0,c1,row]）→ x 区间与顶面 y
const SEGS = (TILEMAP_DATA._segs || []).map(([c0, c1, row]) => ({
  x0: c0 * TILE, x1: (c1 + 1) * TILE, topY: row * TILE,
}));
const segAt = (x) => SEGS.find(s => x >= s.x0 - 4 && x <= s.x1 + 4) || null;

// ── 三幕（沿屋脊推进；startX 落在安全屋脊上）──
const ACTS = [
  { name: '外院飞檐', startX: 90,   fog: 0x140d04, fogA: 0.5,
    intro: ['第一幕 · 外院飞檐',
      '截获了将军通敌的密信，鹭必须趁夜踏过层层屋脊带它出府。\n← → / A D 奔跑，W / ↑ / 空格 起跳，越过屋脊间的庭院缺口。\n沿途的月光，要在它熄灭前聚齐。'] },
  { name: '中庭高脊', startX: 2150, fog: 0x06101c, fogA: 0.68,
    intro: ['第二幕 · 中庭高脊',
      '屋脊更高，缺口更宽，夜枭开始在庭院上空盘旋。\n看准起跳的边缘，别在半空被夜枭扑中——\nJ 挥刀，可将扑来的夜枭斩落。'] },
  { name: '府墙尽头', startX: 4190, fog: 0x1a0608, fogA: 0.82,
    intro: ['第三幕 · 府墙尽头',
      '最后一段断续飞檐，尽头便是可纵身跃下的府墙。\n月光将尽，夜枭最密。\n聚齐月光，奔过最后的缺口，跃下府墙，把密信带向黎明！'] },
];

const GOAL_SCORE = 7;
// 月光：每段屋脊面上 1 缕（必经，奔跑即可拾），共 8 → 目标 7（容错 1）
const ORBS = SEGS.map(s => ({ x: (s.x0 + s.x1) / 2, y: s.topY - 30 }));
// 夜枭（盘旋于缺口上空）：逐幕增多
const CROWS = [
  { x: 700,  y: 300, range: 70 },                         // 一幕 1 只
  { x: 2050, y: 250, range: 90 }, { x: 2760, y: 240, range: 80 },  // 二幕
  { x: 4120, y: 300, range: 80 }, { x: 4720, y: 250, range: 90 },  // 三幕
];

class MoonRoninScene extends Phaser.Scene {
  constructor() { super('MoonRoninScene'); }

  preload() {
    this.load.image('manor', 'scene/panorama.png');
    this.load.svg('tile_1', 'assets/svg/tile_roof.svg', { width: 64, height: 64 });
    this.load.svg('tile_2', 'assets/svg/tile_beam.svg', { width: 64, height: 64 });
    for (let i = 0; i < 3; i++) this.load.svg(`r_idle_${i}`, `assets/svg/ronin_idle_${i}.svg`, { width: 164, height: 150 });
    for (let i = 0; i < 6; i++) this.load.svg(`r_run_${i}`, `assets/svg/ronin_run_${i}.svg`, { width: 164, height: 150 });
    for (let i = 0; i < 3; i++) this.load.svg(`r_jump_${i}`, `assets/svg/ronin_jump_${i}.svg`, { width: 164, height: 150 });
    for (let i = 0; i < 3; i++) this.load.svg(`r_slash_${i}`, `assets/svg/ronin_slash_${i}.svg`, { width: 164, height: 150 });
    this.load.svg('orb', 'assets/svg/orb.svg', { width: 24, height: 24 });
    for (let i = 0; i < 2; i++) this.load.svg(`crow_${i}`, `assets/svg/crow_${i}.svg`, { width: 28, height: 22 });
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H + 400);
    this.physics.world.setBoundsCollision(true, true, true, false);
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_H);

    this.bg = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'manor')
      .setOrigin(0, 0).setScrollFactor(0).setTileScale(GAME_H / 864, GAME_H / 864).setDepth(-100);
    // 夜色暗幕（盖在全景背景上）+ 跟随鹭的月光晕（反相位图遮罩在暗幕上挖洞）
    this.fog = this.add.rectangle(0, 0, GAME_W, GAME_H, ACTS[0].fog, 0)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(-50);
    this._makeLightTexture();
    this.light = this.add.image(GAME_W / 2, GAME_H / 2, 'moonlight')
      .setScrollFactor(0).setVisible(false);
    this._lightR = LIGHT_MIN; this._lightPulse = 1;
    const lightMask = this.light.createBitmapMask();
    lightMask.invertAlpha = true;   // 光晕处擦除暗幕 → 露出背后的庙宇剪影
    this.fog.setMask(lightMask);

    this.solids = this.physics.add.staticGroup();
    this._renderTileLayer('solid', 0, true);

    this._makeAnims();

    this.player = this.physics.add.sprite(ACTS[0].startX, SPAWN_Y, 'r_idle_0');
    this.player.setScale(0.72);
    this.player.body.setSize(40, 104).setOffset(40, 36);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(20);
    this.physics.add.collider(this.player, this.solids);
    this.player.play('ro_idle');
    this.lastSafeX = ACTS[0].startX;

    this.orbs = this.physics.add.group({ allowGravity: false, immovable: true });
    for (const o of ORBS) {
      const s = this.orbs.create(o.x, o.y, 'orb'); s.setDepth(15);
      this.tweens.add({ targets: s, y: o.y - 12, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.tweens.add({ targets: s, scale: 1.2, duration: 700, yoyo: true, repeat: -1 });
    }
    this.physics.add.overlap(this.player, this.orbs, this._collect, null, this);

    this.crows = this.physics.add.group({ allowGravity: false });
    for (const c of CROWS) {
      const s = this.crows.create(c.x, c.y, 'crow_0'); s.setDepth(18);
      s.body.setSize(20, 14); s.setImmovable(true);
      s.setData('home', c.y); s.setData('range', c.range); s.setData('dir', 1);
      s.play('crow_fly');
    }
    this.physics.add.overlap(this.player, this.crows, this._hitCrow, null, this);

    this.endGlow = this.add.rectangle(END_X + 80, GAME_H / 2, 26, GAME_H, 0xffe9a8, 0.14).setDepth(2);

    this.maxHp = 3; this.hp = 3; this.score = 0;
    this.actIdx = 0; this.deaths = 0;
    this.reachedEnd = false; this.invuln = false; this.slashUntil = 0;
    this.gameStarted = false; this.gameOver = false; this.cardActive = false;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.kkeys = this.input.keyboard.addKeys('W,A,S,D,SPACE');
    this.jKey = this.input.keyboard.addKey('J');
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(180, 200);

    this._buildCardLayer();
    this._exposeState();

    if (window.GameHUD) {
      window.GameHUD.onStart(() => {
        window.GameHUD.setHearts(this.hp, this.maxHp);
        window.GameHUD.setScore(this.score);
        this._showCard('月影 · 屋脊浪人',
          '密信在怀，府门重重。\n踏过将军府的层层屋脊，越过庭院缺口，聚齐 ' + GOAL_SCORE + ' 缕月光，奔向府墙尽头。\n\n奔跑 ← → / A D    ·    起跳 ↑ / W / 空格    ·    挥刀 J    ·    继续 SPACE',
          () => this._enterAct(0, true));
      });
    }
  }

  // ── 叙事卡浮层（与 ShadowNinja 同构）──
  _buildCardLayer() {
    this.cardBg = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x05070d, 0.9)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(200).setVisible(false);
    this.cardTitle = this.add.text(GAME_W / 2, 170, '', { fontFamily: 'Segoe UI, sans-serif', fontSize: '30px', color: '#ffe9a8', align: 'center', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setVisible(false);
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
    this.cameras.main.flash(300, 255, 233, 168, false);
  }

  _updateObjective() {
    const act = ACTS[this.actIdx];
    const tail = this.score >= GOAL_SCORE
      ? '月光已聚齐 → 奔向府墙尽头的光柱，跃下！'
      : `踏屋脊越缺口，聚月光（${this.score}/${GOAL_SCORE}）`;
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

  // 月光晕的放射状渐变笔刷（中心白→边缘透明，软边）
  _makeLightTexture() {
    if (this.textures.exists('moonlight')) return;
    const S = 256, tex = this.textures.createCanvas('moonlight', S, S);
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0.0, 'rgba(255,255,255,1)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.85)');
    g.addColorStop(1.0, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    tex.refresh();
  }

  // 光晕跟随鹭、随月光数平滑变大、朝奔跑方向前倾
  _updateLight() {
    if (!this.light) return;
    const cam = this.cameras.main;
    const dir = this.player.flipX ? -1 : 1;
    const sx = this.player.x - cam.scrollX + LIGHT_BIAS * dir;
    const sy = this.player.y - cam.scrollY - 6;
    const targetR = LIGHT_MIN + this.score * LIGHT_PER_ORB;
    this._lightR += (targetR - this._lightR) * 0.08;   // 缓动，月光入手时柔和扩张
    const d = this._lightR * 2 * 1.7 * this._lightPulse;  // 1.7：补偿渐变软边，使可视半径≈_lightR
    this.light.setPosition(sx, sy).setDisplaySize(d, d);
  }

  _makeAnims() {
    const mk = (key, keys, fps, loop) => {
      if (this.anims.exists(key)) return;
      this.anims.create({ key, frames: keys.map(k => ({ key: k })), frameRate: fps, repeat: loop ? -1 : 0 });
    };
    mk('ro_idle', ['r_idle_0', 'r_idle_1', 'r_idle_2', 'r_idle_1'], 4, true);
    mk('ro_run', ['r_run_0', 'r_run_1', 'r_run_2', 'r_run_3', 'r_run_4', 'r_run_5'], 14, true);
    mk('ro_jump', ['r_jump_0', 'r_jump_1', 'r_jump_2'], 8, false);
    mk('ro_slash', ['r_slash_0', 'r_slash_1', 'r_slash_2'], 14, false);
    mk('crow_fly', ['crow_0', 'crow_1'], 6, true);
  }

  _collect(player, orb) {
    if (!this.gameStarted || this.gameOver || this.cardActive) return;
    orb.destroy(); this.score++;
    window.GameHUD?.setScore(this.score);
    const f = this.add.circle(orb.x, orb.y, 6, 0xffe9a8, 0.9).setDepth(30);
    this.tweens.add({ targets: f, scale: 3.5, alpha: 0, duration: 350, onComplete: () => f.destroy() });
    // 月光入手：光晕短暂涨溢，世界豁然开朗一瞬
    this.tweens.add({ targets: this, _lightPulse: 1.22, duration: 160, yoyo: true, ease: 'Quad.out' });
    this._updateObjective();
  }

  _slash(time) {
    this.slashUntil = time + 360;
    this.player.play('ro_slash', true);
    const dir = this.player.flipX ? -1 : 1;
    const arc = this.add.arc(this.player.x + dir * 36, this.player.y - 6, 40, dir > 0 ? -60 : 120, dir > 0 ? 60 : 240, false, 0xffe9a8, 0.35).setDepth(25);
    this.tweens.add({ targets: arc, alpha: 0, scale: 1.3, duration: 220, onComplete: () => arc.destroy() });
    this.crows.getChildren().forEach(c => {
      if (!c.active) return;
      const dx = c.x - this.player.x;
      if (Math.sign(dx) === dir && Math.abs(dx) < 80 && Math.abs(c.y - this.player.y) < 70) {
        const puff = this.add.circle(c.x, c.y, 8, 0x222633, 0.8).setDepth(26);
        this.tweens.add({ targets: puff, scale: 2.6, alpha: 0, duration: 300, onComplete: () => puff.destroy() });
        c.destroy();
      }
    });
  }

  _hitCrow(player, crow) {
    if (!this.gameStarted || this.gameOver || this.invuln || this.cardActive) return;
    const dir = this.player.x < crow.x ? -1 : 1;
    this.player.setVelocity(150 * dir, -220);
    this._damage(1);
  }

  _damage(n) {
    if (this.invuln || this.gameOver || this.cardActive) return;
    this.hp = Math.max(0, this.hp - n);
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    if (this.hp <= 0) {
      this.deaths++;
      if (this.deaths >= DEATH_BUDGET) { this._lose(); return; }
      this._showCard('坠 落',
        `黑影没入庭院的深暗……鹭翻身攀回飞檐。\n（第 ${this.deaths}/${DEATH_BUDGET} 次失手，退回本幕起点重来）`,
        () => this._enterAct(this.actIdx, false));
    } else {
      this.invuln = true; this.player.setAlpha(0.4);
      this.time.delayedCall(850, () => { this.invuln = false; this.player.setAlpha(1); });
    }
  }

  _win() {
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0);
    this._showCard('黎明 · 出府',
      '最后一道飞檐被踏过，鹭纵身跃下府墙，密信紧贴胸口。\n晨曦微露，黑色的身影没入山雾——\n将军的阴谋，终将大白于天下。',
      () => window.GameHUD?.showGameOver(true, '密信带出府门，阴谋终将大白于天下。'));
  }

  _lose() {
    if (this.gameOver) return;
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0);
    window.GameHUD?.showGameOver(false, '一次次失足坠入深院……密信，终究没能带出府门。');
  }

  update(time) {
    if (this.bg) this.bg.tilePositionX = this.cameras.main.scrollX * 0.3;
    this._updateLight();
    if (this.cardActive || !this.gameStarted || this.gameOver) return;

    const onGround = this.player.body.blocked.down || this.player.body.touching.down;
    const left = this.cursors.left.isDown || this.kkeys.A.isDown;
    const right = this.cursors.right.isDown || this.kkeys.D.isDown;
    const jump = this.cursors.up.isDown || this.kkeys.W.isDown || this.kkeys.SPACE.isDown;

    if (left) { this.player.setVelocityX(-PLAYER_SPEED); this.player.setFlipX(true); }
    else if (right) { this.player.setVelocityX(PLAYER_SPEED); this.player.setFlipX(false); }
    else this.player.setVelocityX(0);
    if (jump && onGround) this.player.setVelocityY(-JUMP_V);

    if (Phaser.Input.Keyboard.JustDown(this.jKey) && time >= this.slashUntil) this._slash(time);

    let anim;
    if (time < this.slashUntil) anim = 'ro_slash';
    else if (!onGround) anim = 'ro_jump';
    else if (left || right) anim = 'ro_run';
    else anim = 'ro_idle';
    if (anim !== 'ro_slash' && this.player.anims.currentAnim?.key !== anim) this.player.play(anim, true);

    this.crows.getChildren().forEach(c => {
      const home = c.getData('home'), range = c.getData('range');
      let dir = c.getData('dir');
      if (c.y > home + range) dir = -1; else if (c.y < home - range) dir = 1;
      c.setData('dir', dir); c.setVelocityY(50 * dir);
    });

    if (onGround) this.lastSafeX = this.player.x;

    // 幕推进
    const nextIdx = this.actIdx + 1;
    if (nextIdx < ACTS.length && this.player.x >= ACTS[nextIdx].startX) {
      const act = ACTS[nextIdx];
      this.gameStarted = false;
      this._showCard(act.intro[0], act.intro[1], () => this._enterAct(nextIdx, true));
      return;
    }

    // 坠入缺口
    if (this.player.y > WORLD_H + 120) {
      this.player.setVelocity(0, 0);
      this.player.setPosition(this.lastSafeX, SPAWN_Y);
      this._damage(1);
    }

    // 抵达府墙尽头
    if (!this.reachedEnd && this.player.x > END_X) {
      if (this.score >= GOAL_SCORE) { this.reachedEnd = true; this._win(); }
      else window.GameHUD?.setObjective(`府墙还需 ${GOAL_SCORE - this.score} 缕月光才能跃下`);
    }
  }

  // ── 暴露状态给 verify / autoplay ──
  _exposeState() {
    const self = this;
    window.__gameState = { player: this.player };
    const nextGoalX = () => {
      if (self.score < GOAL_SCORE) {
        // 只追"明确在前方"的月光，绝不回头（回头会在错过的月光旁来回抖动卡死）
        let best = END_X, bestD = Infinity;
        self.orbs.getChildren().forEach(o => { if (o.active) { const d = o.x - self.player.x; if (d > 20 && d < bestD) { bestD = d; best = o.x; } } });
        return best;
      }
      return END_X;
    };
    // 前方临近缺口边缘 → 需要起跳
    const needJump = () => {
      const p = self.player;
      const onGround = p.body.blocked.down || p.body.touching.down;
      if (!onGround) return false;
      const seg = segAt(p.x);
      if (!seg) return false;
      const isLast = seg.x1 >= SEGS[SEGS.length - 1].x1 - 1;
      return !isLast && (seg.x1 - p.x) < 120;   // 距右缘 <120px 提前起跳，留足越缺口余量
    };
    // 身前有夜枭在斩程内 → 攻击
    const attack = () => {
      const p = self.player, dir = p.flipX ? -1 : 1;
      return self.crows.getChildren().some(c => c.active && Math.sign(c.x - p.x) === dir && Math.abs(c.x - p.x) < 95 && Math.abs(c.y - p.y) < 75);
    };
    window.__probe = () => {
      const p = self.player;
      const onGround = p.body.blocked.down || p.body.touching.down;
      return {
        x: p.x, y: p.y, vx: p.body.velocity.x, onGround,
        hp: self.hp, maxHp: self.maxHp, act: self.actIdx, score: self.score, goalScore: GOAL_SCORE,
        deaths: self.deaths, deathBudget: DEATH_BUDGET,
        won: self.gameOver && self.reachedEnd, lost: self.gameOver && !self.reachedEnd,
        cardActive: self.cardActive, started: self.gameStarted,
        nextGoalX: nextGoalX(), worldW: WORLD_W, endX: END_X,
        needJump: needJump(), attack: attack(),
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
  scene: MoonRoninScene,
};

new Phaser.Game(config);
