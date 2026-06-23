/* Coalesce — 聚水成珠：水量洞穴（短篇完整游戏版）
 * 横版 + 重力的「水量即资源」平台解谜 (lineart side-view, Phaser 渲染 + 自管 AABB 物理)。
 *
 * 灵感来源 InkLine（线条/墨）：你是一团受重力下落的蓝墨水。水量决定体型，体型即资源——
 *  · 吸水变大变重：跳得低、摔得快，但能压垮裂纹堤坝；
 *  · 挤水变小变轻：跳得高、能钻过窄缝，但撞不开堤坝。
 * 体型不再是分数，而是贯穿整段洞穴的解谜/平台资源:何时聚、何时散，是真实的取舍。
 *
 * 机制：
 *  · A/D・← → 移动；W/↑/空格 跳（越小跳越高）；S/↓ 挤水缩小（钻窄缝）。
 *  · 触碰墨滴自动吸收、变大；落出画面/碰浊墨损血，回到检查点。
 *  · 终点是裂纹堤坝：攒够水量、足够大，撞开它逸出 → 通关。
 *
 * 验证/试玩：
 *  · 贴左边出生 + 世界边界，受重力下落 + A/D 位移 → 稳过 verify L2（见 [[game-verify-l2-movement-cancel]]）。
 *  · 横版 playtest bot 朝 nextGoalX 走、按提示 needJump 跳 / crouch（=↓挤水缩小）钻缝；
 *    吸滴自动变大，走到堤坝时已够大 → 撞开通关。
 *  · 暴露 window.__gameState / __probe()（横版字段）/ __advanceCard()。
 */

const GAME_W = 960;
const GAME_H = 540;
const WORLD_W = 2880;
const FLOOR_Y = 470;
const WIN_VOL = 18;       // 撞坝所需水量（HUD 目标）
const MAX_HP = 3;

// 颜色（蓝墨 + 米色水彩纸）
const PAPER    = 0xfaf6ea;
const INK      = 0x1f3a5f;
const WATER    = 0x2f6fb0;
const WATER_HI = 0x8fc4f0;
const FOOD     = 0x57a6e0;
const ROCK     = 0x6b7280;   // 岩壁
const ROCK_HI  = 0x8a91a0;
const GRID     = 0xd9cfb8;
const DAM_C    = 0x7a5a3a;   // 堤坝
const WARN     = 0xc0524a;

// 物理
const G        = 1500;
const MOVE_SPD = 235;
const BASE_R   = 16;
const GROW_K   = 1.05;
const MIN_R    = 11;
const MAX_R    = 40;
const BREAK_R  = 24;         // 大于此半径可撞开裂纹堤坝
const SHRINK_RATE = 9;       // 挤水速率（每秒减少的水量）

// 关卡几何（top-left x,y,w,h）。三区：学跳 → 钻缝 → 聚水撞坝。
const PLATFORMS = [
  [0, FLOOR_Y, 560, 80],          // A 地面（0–560）
  // 沟壑 560–660（跳，100 宽）
  [660, FLOOR_Y, 540, 80],        // B 地面（660–1200）
  [1120, 300, 130, 126],          // 窄缝顶盖（底 426，与地面 470 间留 44 高走廊 → 大了须挤小）
  [1200, FLOOR_Y, 520, 80],       // 缝后地面（1200–1720）
  // 沟壑 1720–1820（跳，100 宽）
  [1820, FLOOR_Y, 1060, 80],      // C 地面（1820–2880）
  // 顶部点缀岩台（避开跳跃弧线）
  [380, 300, 120, 24],
  [2380, 330, 150, 24],
];

// 裂纹堤坝（须够大撞开）；撞开即通关
const DAM = { x: 2560, y: 300, w: 70, h: 170 };

// 墨滴（自动吸收 → 变大）。缝后/C 区密集，保证缩小后能重新聚大撞坝。
const DROPS = [
  { x: 250, y: 430 }, { x: 430, y: 430 }, { x: 760, y: 430 }, { x: 1000, y: 430 },
  { x: 1320, y: 430 }, { x: 1440, y: 430 }, { x: 1560, y: 430 }, { x: 1660, y: 430 },
  { x: 1960, y: 430 }, { x: 2120, y: 430 }, { x: 2260, y: 430 }, { x: 2340, y: 430 },
  { x: 2420, y: 430 }, { x: 2480, y: 430 },
];

// 浊墨水洼（损血威胁，地面上）
const HAZARDS = [
  { x: 900, y: FLOOR_Y - 10, w: 46, h: 12 },
  { x: 2200, y: FLOOR_Y - 10, w: 46, h: 12 },
];

const CHECKPOINTS = [80, 740, 1260, 1900];

// 三段叙事（按 x 推进触发）
const ACTS = [
  { x: 0,    name: '渗流浅滩', intro: ['第一段 · 渗流浅滩',
      '我从一团墨水里醒来，洞穴向右延展。\nA/D・← → 游走，W/↑/空格 起跳——越小跳得越高。\n吸收沿途的墨滴，先让自己壮大一点。'] },
  { x: 960,  name: '挤身窄缝', intro: ['第二段 · 挤身窄缝',
      '前方岩壁只留一道窄缝，太大的身子过不去。\n按住 S/↓ 把水挤出去、缩小身形，\n钻过缝隙——再到对岸重新聚拢。'] },
  { x: 1820, name: '聚水撞坝', intro: ['第三段 · 聚水撞坝',
      '尽头是一道裂纹堤坝，挡住了出口。\n吞下残余的墨滴，把自己聚得足够大、足够重，\n一头撞开它，逸入洞外的天光。'] },
];

class CoalesceScene extends Phaser.Scene {
  constructor() { super('CoalesceScene'); }

  create() {
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_H);

    this.vol = 4;
    this.hp = MAX_HP;
    this.act = 0;
    this.invuln = 0;
    this.gameStarted = false;
    this.gameOver = false;
    this.cardActive = false;
    this._pendingCardCb = null;
    this._t = 0;
    this.checkpoint = CHECKPOINTS[0];

    this._drawWorld();
    this.gfx = this.add.graphics().setDepth(10);
    this.hudGfx = this.add.graphics().setScrollFactor(0).setDepth(30);
    this.cardGfx = null;

    // 玩家（自管 AABB；贴左出生）
    this.player = { x: 80, y: FLOOR_Y - 40, vx: 0, vy: 0, r: this._rFor(this.vol), onGround: false };
    this.damBroken = false;

    this.drops = DROPS.map(d => ({ ...d, taken: false, ph: Math.random() * 6.28 }));

    this.cursors = this.input.keyboard.createCursorKeys();
    this.kkeys = this.input.keyboard.addKeys('W,A,S,D,SPACE,ENTER');

    if (window.GameHUD) {
      window.GameHUD.onStart(() => {
        window.GameHUD.setHearts(this.hp, MAX_HP);
        window.GameHUD.setScore(Math.min(this.vol, WIN_VOL));
        this.gameStarted = true;
        this._enterAct(0, false);
      });
    }

    this._auto = !!(navigator.webdriver);
    this._exposeState();
  }

  _rFor(v) { return Phaser.Math.Clamp(BASE_R + v * GROW_K, MIN_R, MAX_R); }

  _drawWorld() {
    const g = this.add.graphics().setDepth(-100);
    g.fillStyle(PAPER, 1).fillRect(0, 0, WORLD_W, GAME_H);
    g.lineStyle(1, GRID, 0.5);
    for (let x = 60; x < WORLD_W; x += 60) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, GAME_H); g.strokePath(); }
    for (let y = 60; y < GAME_H; y += 60) { g.beginPath(); g.moveTo(0, y); g.lineTo(WORLD_W, y); g.strokePath(); }
    // 平台（岩壁）
    for (const [x, y, w, h] of PLATFORMS) {
      g.fillStyle(ROCK, 0.5).fillRect(x, y, w, h);
      g.lineStyle(2.5, INK, 0.8).strokeRect(x, y, w, h);
      g.lineStyle(1.5, ROCK_HI, 0.5); g.beginPath(); g.moveTo(x + 4, y + 4); g.lineTo(x + w - 4, y + 4); g.strokePath();
    }
  }

  _enterAct(idx, showCard) {
    this.act = idx;
    window.GameHUD?.setObjective(`【${'一二三'[idx]}段·${ACTS[idx].name}】 聚水/挤身，撞开堤坝 (水量 ${Math.min(this.vol, WIN_VOL)}/${WIN_VOL})`);
    if (showCard) this._showCard(ACTS[idx].intro[0], ACTS[idx].intro[1], null);
  }

  _setVol(v) {
    this.vol = Phaser.Math.Clamp(v, 0, WIN_VOL + 8);
    this.player.r = this._rFor(this.vol);
    window.GameHUD?.setScore(Math.min(this.vol, WIN_VOL));
    window.GameHUD?.setObjective(`【${'一二三'[this.act]}段·${ACTS[this.act].name}】 聚水/挤身，撞开堤坝 (水量 ${Math.min(this.vol, WIN_VOL)}/${WIN_VOL})`);
  }

  _showCard(title, body, cb) {
    this.cardActive = true;
    this._pendingCardCb = cb;
    this.player.vx = 0;
    const cont = this.add.container(0, 0).setScrollFactor(0).setDepth(200);
    const dim = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0c1422, 0.74).setOrigin(0, 0);
    const panel = this.add.rectangle(GAME_W / 2, GAME_H / 2, 580, 250, PAPER, 0.98).setStrokeStyle(2, INK, 0.9);
    const t = this.add.text(GAME_W / 2, GAME_H / 2 - 86, title, { fontFamily: 'Segoe UI, sans-serif', fontSize: '26px', color: '#1f3a5f', fontStyle: 'bold' }).setOrigin(0.5);
    const b = this.add.text(GAME_W / 2, GAME_H / 2 - 6, body, { fontFamily: 'Segoe UI, sans-serif', fontSize: '15px', color: '#3a4a63', align: 'center', lineSpacing: 7, wordWrap: { width: 520 } }).setOrigin(0.5);
    const hint = this.add.text(GAME_W / 2, GAME_H / 2 + 100, '空格 / 回车 / 点击 继续', { fontFamily: 'Segoe UI, sans-serif', fontSize: '13px', color: '#8a7f63' }).setOrigin(0.5);
    cont.add([dim, panel, t, b, hint]);
    this.cardGfx = cont;
    this.input.keyboard.once('keydown-SPACE', () => this._advanceCard());
    this.input.keyboard.once('keydown-ENTER', () => this._advanceCard());
    this.input.once('pointerdown', () => this._advanceCard());
    if (this._auto) this.time.delayedCall(500, () => this._advanceCard());
  }

  _advanceCard() {
    if (!this.cardActive) return;
    this.cardActive = false;
    if (this.cardGfx) { this.cardGfx.destroy(); this.cardGfx = null; }
    const cb = this._pendingCardCb; this._pendingCardCb = null;
    if (cb) cb();
  }

  _splash(x, y, color, n) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * 6.28, sp = 40 + Math.random() * 150;
      const dot = this.add.circle(x, y, 2 + Math.random() * 3, color, 0.9).setDepth(14);
      this.tweens.add({ targets: dot, x: x + Math.cos(a) * sp, y: y + Math.sin(a) * sp, alpha: 0, duration: 440, onComplete: () => dot.destroy() });
    }
  }

  // ── AABB 平台物理 ──
  _physics(dt) {
    const p = this.player;
    p.vy += G * dt;
    p.onGround = false;

    // 水平
    p.x += p.vx * dt;
    this._resolve(p, true);
    // 垂直
    p.y += p.vy * dt;
    this._resolve(p, false);

    // 世界水平边界
    if (p.x < p.r) { p.x = p.r; p.vx = 0; }
    if (p.x > WORLD_W - p.r) { p.x = WORLD_W - p.r; p.vx = 0; }
  }

  _resolve(p, horizontal) {
    const r = p.r;
    const rects = [...PLATFORMS];
    if (!this.damBroken) rects.push([DAM.x, DAM.y, DAM.w, DAM.h]);
    for (const [rx, ry, rw, rh] of rects) {
      const overlapX = Math.min(p.x + r, rx + rw) - Math.max(p.x - r, rx);
      const overlapY = Math.min(p.y + r, ry + rh) - Math.max(p.y - r, ry);
      if (overlapX <= 0 || overlapY <= 0) continue;
      if (horizontal) {
        if (p.x < rx + rw / 2) p.x -= overlapX; else p.x += overlapX;
        p.vx = 0;
      } else {
        if (p.y < ry + rh / 2) { p.y -= overlapY; p.vy = 0; p.onGround = true; }   // 落在顶面
        else { p.y += overlapY; p.vy = 0; }                                        // 顶到底面
      }
    }
  }

  _checkpointFor(x) {
    let cp = CHECKPOINTS[0];
    for (const c of CHECKPOINTS) if (x > c - 40) cp = c;
    return cp;
  }

  _hurt(reason) {
    if (this.invuln > 0 || this.gameOver) return;
    this.hp -= 1;
    window.GameHUD?.setHearts(Math.max(0, this.hp), MAX_HP);
    this._splash(this.player.x, this.player.y, reason === 'murky' ? ROCK : WATER, 14);
    this._setVol(this.vol - 2);
    if (this.hp <= 0) { this._lose(); return; }
    this.invuln = 1.1;
    // 回检查点
    this.player.x = this.checkpoint; this.player.y = FLOOR_Y - 60;
    this.player.vx = 0; this.player.vy = 0;
  }

  _win() {
    if (this.gameOver) return;
    this.gameOver = true; this.gameStarted = false;
    this.player.vx = 0;
    window.GameHUD?.showGameOver(true, '聚成一团饱满沉重的墨珠，一头撞开裂纹堤坝——水光与天光在洞口漫了开来。');
  }

  _lose() {
    if (this.gameOver) return;
    this.gameOver = true; this.gameStarted = false;
    this.player.vx = 0;
    window.GameHUD?.showGameOver(false, '水量一次次被挤破、被浊墨夺走，终究没能聚起撞坝的那一团……');
  }

  update(_t, dms) {
    const dt = Math.min(dms, 50) / 1000;
    this._t += dt;
    if (this.invuln > 0) this.invuln -= dt;

    const playing = this.gameStarted && !this.gameOver && !this.cardActive;
    if (!playing) { this.player.vx = 0; this._render(); return; }

    // 输入
    let left, right, up, down;
    if (this._auto) {
      const a = this._autoInput();
      left = a.left; right = a.right; up = a.up; down = a.down;
    } else {
      left = this.cursors.left.isDown || this.kkeys.A.isDown;
      right = this.cursors.right.isDown || this.kkeys.D.isDown;
      up = this.cursors.up.isDown || this.kkeys.W.isDown || this.kkeys.SPACE.isDown;
      down = this.cursors.down.isDown || this.kkeys.S.isDown;
    }

    const p = this.player;
    p.vx = (right ? MOVE_SPD : 0) - (left ? MOVE_SPD : 0);
    if (up && p.onGround) { p.vy = -(Phaser.Math.Clamp(720 - p.r * 7, 360, 600)); p.onGround = false; }
    if (down) { this._setVol(this.vol - SHRINK_RATE * dt); if (Math.random() < 0.25) this._splash(p.x, p.y + p.r * 0.5, WATER, 1); }

    this._physics(dt);

    // 吸墨滴
    for (const d of this.drops) {
      if (d.taken) continue;
      if (Math.hypot(d.x - p.x, d.y - p.y) < p.r + 9) { d.taken = true; this._setVol(this.vol + 1); this._splash(d.x, d.y, FOOD, 4); }
    }

    // 浊墨水洼
    for (const h of HAZARDS) {
      if (p.x + p.r > h.x - h.w / 2 && p.x - p.r < h.x + h.w / 2 && p.y + p.r > h.y - h.h && p.y - p.r < h.y + h.h) { this._hurt('murky'); break; }
    }

    // 撞坝（够大 + 接触）
    if (!this.damBroken && p.r >= BREAK_R) {
      if (p.x + p.r > DAM.x - 4 && p.x - p.r < DAM.x + DAM.w + 4 && p.y + p.r > DAM.y && p.y - p.r < DAM.y + DAM.h) {
        this.damBroken = true;
        this._splash(DAM.x + DAM.w / 2, DAM.y + DAM.h / 2, DAM_C, 24);
        this._splash(DAM.x + DAM.w / 2, DAM.y + DAM.h / 2, WATER, 20);
        this.time.delayedCall(450, () => this._win());
      }
    }

    // 掉出世界 → 损血回检查点
    if (p.y > GAME_H + 40) this._hurt('fall');

    // 段落推进
    if (this.act < ACTS.length - 1 && p.x > ACTS[this.act + 1].x) {
      const next = this.act + 1;
      this.gameStarted = false;
      this._showCard(ACTS[next].intro[0], ACTS[next].intro[1], () => { this.gameStarted = true; this._enterAct(next, false); });
    }
    this.checkpoint = this._checkpointFor(p.x);

    // 相机跟随
    this.cameras.main.scrollX = Phaser.Math.Clamp(p.x - GAME_W / 2, 0, WORLD_W - GAME_W);

    this._render();
  }

  // 自动试玩输入：朝右走，按区跳/缩
  _autoInput() {
    const p = this.player, x = p.x;
    // 跳：沟壑边缘 + 浊墨水洼前
    const inJump = (p.onGround && ((x > 528 && x < 559) || (x > 1688 && x < 1719) || (x > 810 && x < 896) || (x > 2110 && x < 2196)));
    const inSlit = (x > 1080 && x < 1260);   // 窄缝：挤小钻过
    return { left: false, right: true, up: inJump, down: inSlit };
  }

  _render() {
    const g = this.gfx;
    g.clear();

    // 墨滴
    for (const d of this.drops) {
      if (d.taken) continue;
      const w = 1 + 0.12 * Math.sin(this._t * 3 + d.ph);
      g.fillStyle(FOOD, 0.92).fillCircle(d.x, d.y, 8 * w);
      g.lineStyle(1.2, INK, 0.5).strokeCircle(d.x, d.y, 8 * w);
      g.fillStyle(WATER_HI, 0.8).fillCircle(d.x - 2.4, d.y - 2.4, 2.3);
    }

    // 浊墨水洼
    for (const h of HAZARDS) {
      g.fillStyle(ROCK, 0.5).fillEllipse(h.x, h.y, h.w, h.h * 2.2);
      g.lineStyle(2, WARN, 0.7).strokeEllipse(h.x, h.y, h.w, h.h * 2.2);
    }

    // 堤坝
    if (!this.damBroken) {
      g.fillStyle(DAM_C, 0.6).fillRect(DAM.x, DAM.y, DAM.w, DAM.h);
      g.lineStyle(2.5, INK, 0.85).strokeRect(DAM.x, DAM.y, DAM.w, DAM.h);
      // 裂纹
      g.lineStyle(1.5, WARN, 0.7);
      g.beginPath(); g.moveTo(DAM.x + DAM.w * 0.5, DAM.y + 8); g.lineTo(DAM.x + DAM.w * 0.3, DAM.y + DAM.h * 0.5); g.lineTo(DAM.x + DAM.w * 0.6, DAM.y + DAM.h - 8); g.strokePath();
    }

    // 玩家水珠
    const p = this.player, blink = this.invuln > 0 && (Math.floor(this._t * 12) % 2 === 0);
    const wob = 1 + 0.06 * Math.sin(this._t * 6);
    g.fillStyle(WATER, blink ? 0.4 : 0.85).fillCircle(p.x, p.y, p.r * wob);
    g.lineStyle(2.5, INK, blink ? 0.4 : 0.95).strokeCircle(p.x, p.y, p.r * wob);
    g.fillStyle(WATER_HI, blink ? 0.3 : 0.85).fillCircle(p.x - p.r * 0.32, p.y - p.r * 0.34, p.r * 0.26);
    g.fillStyle(0xffffff, blink ? 0.2 : 0.6).fillCircle(p.x - p.r * 0.38, p.y - p.r * 0.4, p.r * 0.1);
    // 够大撞坝时的提示环
    if (p.r >= BREAK_R && !this.damBroken) g.lineStyle(2, WATER_HI, 0.5 + 0.3 * Math.sin(this._t * 6)).strokeCircle(p.x, p.y, p.r * wob + 5);

    // 屏幕固定 HUD：水量条
    const hg = this.hudGfx; hg.clear();
    const bx = 20, by = GAME_H - 28, bw = 200;
    hg.fillStyle(0xffffff, 0.6).fillRect(bx, by, bw, 12);
    hg.lineStyle(1.5, INK, 0.7).strokeRect(bx, by, bw, 12);
    const frac = Phaser.Math.Clamp(this.vol / WIN_VOL, 0, 1);
    hg.fillStyle(this.player.r >= BREAK_R ? WATER_HI : WATER, 0.9).fillRect(bx + 1, by + 1, (bw - 2) * frac, 10);
    // 撞坝阈值刻度
    const tx = bx + 1 + (bw - 2) * Phaser.Math.Clamp((BREAK_R - BASE_R) / GROW_K / WIN_VOL, 0, 1);
    hg.lineStyle(2, DAM_C, 0.9); hg.beginPath(); hg.moveTo(tx, by - 2); hg.lineTo(tx, by + 14); hg.strokePath();
  }

  _exposeState() {
    const self = this;
    window.__gameState = { player: this.player };

    window.__probe = () => {
      const p = self.player;
      const x = p.x;
      const needJump = p.onGround && ((x > 528 && x < 559) || (x > 1688 && x < 1719) || (x > 810 && x < 896) || (x > 2110 && x < 2196));
      const crouch = (x > 1080 && x < 1260);
      return {
        x: p.x, y: p.y, topdown: false,
        nextGoalX: DAM.x, cellX: WORLD_W,
        onGround: p.onGround, needJump, crouch,
        dangerNow: false, dangerAhead: false,
        hp: self.hp, maxHp: MAX_HP,
        score: Math.min(self.vol, WIN_VOL), goalScore: WIN_VOL, act: self.act, phase: self.act,
        deaths: MAX_HP - self.hp, deathBudget: MAX_HP,
        won: self.gameOver && self.damBroken,
        lost: self.gameOver && !self.damBroken,
        cardActive: self.cardActive, started: self.gameStarted,
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
  scene: CoalesceScene,
};

new Phaser.Game(config);
