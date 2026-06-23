/* Coalesce — 聚水成珠：墨水滴的远行（短篇完整游戏版）
 * 单屏俯视成长生存 (lineart top-down). 程序化蓝墨水珠 + 浊墨团 + 铅笔网格纸。
 *
 * 灵感来源 InkLine：吸收比自己小的墨滴变大；撞上更大的浊墨团会「逸散」缩小并溅出墨滴。
 *
 * demo → 短篇完整游戏的结构（单屏用「分阶段」代替「分幕」，按墨量推进）：
 *  · HTML 开始屏即开场叙事 →【一阶·浅滩微滴】→【二阶·游墨渐起】→【三阶·聚珠之刻】高潮 → 结局卡
 *  · 受击逸散 + 无敌帧 + 生命(3) 死亡即败；浊墨团逐阶增多、变快、变大
 *  · 贴角出生 + 世界边界碰撞，保证 game-verify L2 移动断言稳过（见 svg/verify 边界坑）
 *  · 暴露 window.__gameState / __probe()(俯视 moveX/moveY 走位建议) / __advanceCard()
 */

const GAME_W = 960;
const GAME_H = 540;
const WIN_SCORE = 30;
const MAX_HP = 3;
const FOOD_ON_FIELD = 5;

// 颜色（蓝墨水 + 米色水彩纸）
const PAPER   = 0xfaf6ea;
const INK     = 0x1f3a5f;   // 深墨轮廓
const WATER   = 0x2f6fb0;   // 玩家水珠蓝
const WATER_HI= 0x8fc4f0;   // 高光
const FOOD    = 0x57a6e0;   // 可吸收小墨滴
const MURKY   = 0x6b7280;   // 浊墨团（威胁）
const GRID    = 0xd9cfb8;   // 铅笔网格
const WARN    = 0xc0524a;   // 危险环

const BASE_R  = 13;
const GROW_K  = 1.7;        // 每点墨量增加的半径
const MAX_R   = 58;
const BASE_SPEED = 250;

// 三阶段（按已吸收墨量推进）
const PHASES = [
  { name: '浅滩微滴', upTo: 10, rivals: 2, rivalSpd: 52, rSpan: [10, 22], fogA: 0.0,
    intro: ['第一阶 · 浅滩微滴',
      '我从一滴墨水醒来，纸上散落着比我更小的墨滴。\nWASD / 方向键游动，触碰比你小的墨滴就能吸收、变大。\n但躲开比你大的浊墨团——撞上去，我会被挤破。'] },
  { name: '游墨渐起', upTo: 20, rivals: 4, rivalSpd: 84, rSpan: [16, 36], fogA: 0.10,
    intro: ['第二阶 · 游墨渐起',
      '墨色在纸上晕开，浊墨团多了起来、游得更快。\n等我长得够大，原本的威胁也能反过来吸收。\n边吸边躲，把墨量一点点攒起来。'] },
  { name: '聚珠之刻', upTo: 30, rivals: 6, rivalSpd: 118, rSpan: [20, 50], fogA: 0.16,
    intro: ['第三阶 · 聚珠之刻',
      '最后的墨量，最大的浊墨团在纸面巡游。\n避开锋芒、吞下残余——\n把自己，聚成纸上最饱满的一颗水珠。'] },
];

class CoalesceScene extends Phaser.Scene {
  constructor() { super('CoalesceScene'); }

  create() {
    this.physics.world.setBounds(0, 0, GAME_W, GAME_H);

    this.score = 0;
    this.hp = MAX_HP;
    this.maxHp = MAX_HP;
    this.phase = 0;
    this.invuln = false;
    this.gameStarted = false;
    this.gameOver = false;
    this.cardActive = false;
    this._pendingCardCb = null;
    this._wob = 0;

    this._drawPaper();

    // 阶段渐深的纸面氛围
    this.fog = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x2b3550, 0).setOrigin(0, 0).setDepth(-60);

    // 程序化绘制层（玩家/食物/浊墨团都用 Graphics 重画）
    this.gfx = this.add.graphics().setDepth(10);
    this.cardGfx = null;

    // 玩家：物理体（圆），贴左上角出生 → 稳过 verify L2 移动断言
    const tex = this.make.graphics({ x: 0, y: 0, add: false });
    tex.fillStyle(0xffffff, 1).fillCircle(BASE_R, BASE_R, BASE_R);
    tex.generateTexture('blob', BASE_R * 2, BASE_R * 2);
    tex.destroy();
    this.player = this.physics.add.image(80, 80, 'blob').setVisible(false);
    this.player.body.setCircle(BASE_R);          // 固定小圆体：仅供移动 / 世界边界
    this.player.setCollideWorldBounds(true);
    this.playerR = BASE_R;                        // 视觉/玩法半径随墨量增长（手动碰撞）

    // 食物墨滴 / 浊墨团
    this.foods = [];
    this.rivals = [];

    this.cursors = this.input.keyboard.createCursorKeys();
    this.kkeys = this.input.keyboard.addKeys('W,A,S,D');

    // 起始填充
    for (let i = 0; i < FOOD_ON_FIELD; i++) this._spawnFood();

    if (window.GameHUD) {
      window.GameHUD.onStart(() => {
        window.GameHUD.setHearts(this.hp, this.maxHp);
        window.GameHUD.setScore(this.score);
        // HTML 开始屏即开场叙事卡：点 START 后立即开玩（开局不再阻塞），保证 verify 能立刻移动
        this.gameStarted = true;
        this._enterPhase(0, false);
      });
    }

    this._exposeState();
  }

  // ── 米色水彩纸 + 铅笔网格 ──
  _drawPaper() {
    const g = this.add.graphics().setDepth(-100);
    g.fillStyle(PAPER, 1).fillRect(0, 0, GAME_W, GAME_H);
    g.lineStyle(1, GRID, 0.5);
    for (let x = 60; x < GAME_W; x += 60) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, GAME_H); g.strokePath(); }
    for (let y = 60; y < GAME_H; y += 60) { g.beginPath(); g.moveTo(0, y); g.lineTo(GAME_W, y); g.strokePath(); }
    // 边框（练习纸留白边）
    g.lineStyle(2, GRID, 0.9).strokeRect(6, 6, GAME_W - 12, GAME_H - 12);
  }

  _rand(a, b) { return a + Math.random() * (b - a); }

  _freeSpot(r) {
    for (let t = 0; t < 30; t++) {
      const x = this._rand(r + 20, GAME_W - r - 20);
      const y = this._rand(r + 20, GAME_H - r - 20);
      if (Math.hypot(x - this.player.x, y - this.player.y) > this.playerR + r + 60) return { x, y };
    }
    return { x: this._rand(60, GAME_W - 60), y: this._rand(60, GAME_H - 60) };
  }

  _spawnFood() {
    const r = this._rand(7, 11);
    const p = this._freeSpot(r);
    this.foods.push({ x: p.x, y: p.y, r, ph: Math.random() * 6.28 });
  }

  _spawnRival() {
    const ph = PHASES[this.phase];
    const r = this._rand(ph.rSpan[0], ph.rSpan[1]);
    const p = this._freeSpot(r);
    const a = Math.random() * 6.28;
    const spd = ph.rivalSpd * this._rand(0.7, 1.2);
    this.rivals.push({ x: p.x, y: p.y, r, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, ph: Math.random() * 6.28 });
  }

  _enterPhase(idx, showCard) {
    this.phase = idx;
    const ph = PHASES[idx];
    // 调整浊墨团数量到本阶目标
    while (this.rivals.length < ph.rivals) this._spawnRival();
    this.tweens.add({ targets: this.fog, fillAlpha: ph.fogA, duration: 600 });
    window.GameHUD?.setObjective(`【${'一二三'[idx]}阶·${ph.name}】 吸小躲大，墨量 ${this.score}/${WIN_SCORE}`);
    if (showCard) this._showCard(ph.intro[0], ph.intro[1], null);
  }

  // ── 叙事卡（阻塞，仅阶段切换用；开局不调用，避免吃掉 verify 的移动键）──
  _showCard(title, body, cb) {
    this.cardActive = true;
    this._pendingCardCb = cb;
    this.player.setVelocity(0, 0);
    const cont = this.add.container(0, 0).setDepth(200);
    const dim = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0c1422, 0.74).setOrigin(0, 0);
    const panel = this.add.rectangle(GAME_W / 2, GAME_H / 2, 560, 240, PAPER, 0.98).setStrokeStyle(2, INK, 0.9);
    const t = this.add.text(GAME_W / 2, GAME_H / 2 - 78, title, { fontFamily: 'Segoe UI, sans-serif', fontSize: '26px', color: '#1f3a5f', fontStyle: 'bold' }).setOrigin(0.5);
    const b = this.add.text(GAME_W / 2, GAME_H / 2 - 10, body, { fontFamily: 'Segoe UI, sans-serif', fontSize: '15px', color: '#3a4a63', align: 'center', lineSpacing: 7, wordWrap: { width: 500 } }).setOrigin(0.5);
    const hint = this.add.text(GAME_W / 2, GAME_H / 2 + 92, '空格 / 回车 / 点击 继续', { fontFamily: 'Segoe UI, sans-serif', fontSize: '13px', color: '#8a7f63' }).setOrigin(0.5);
    cont.add([dim, panel, t, b, hint]);
    this.cardGfx = cont;
    this.input.keyboard.once('keydown-SPACE', () => this._advanceCard());
    this.input.keyboard.once('keydown-ENTER', () => this._advanceCard());
    this.input.once('pointerdown', () => this._advanceCard());
  }

  _advanceCard() {
    if (!this.cardActive) return;
    this.cardActive = false;
    if (this.cardGfx) { this.cardGfx.destroy(); this.cardGfx = null; }
    const cb = this._pendingCardCb; this._pendingCardCb = null;
    if (cb) cb();
  }

  _setScore(v) {
    this.score = Phaser.Math.Clamp(v, 0, WIN_SCORE + 4);
    window.GameHUD?.setScore(Math.min(this.score, WIN_SCORE));
    // 半径随墨量增长（仅视觉/手动碰撞用，物理体保持固定小圆）
    this.playerR = Math.min(MAX_R, BASE_R + this.score * GROW_K);
    const ph = PHASES[this.phase];
    window.GameHUD?.setObjective(`【${'一二三'[this.phase]}阶·${ph.name}】 吸小躲大，墨量 ${Math.min(this.score, WIN_SCORE)}/${WIN_SCORE}`);
  }

  _absorbFood(i) {
    const f = this.foods[i];
    // 溅入动画：小滴飞向玩家（简化为直接吸收 + 计分）
    this.foods.splice(i, 1);
    this._setScore(this.score + 1);
    this._splash(f.x, f.y, FOOD, 4);
    this._spawnFood();
    this._checkPhaseAndWin();
  }

  _absorbRival(i) {
    const rv = this.rivals[i];
    this.rivals.splice(i, 1);
    this._setScore(this.score + 2);           // 吃掉比自己小的浊墨团：双倍奖励
    this._splash(rv.x, rv.y, WATER, 8);
    // 维持本阶浊墨团数量
    if (this.rivals.length < PHASES[this.phase].rivals) this._spawnRival();
    this._checkPhaseAndWin();
  }

  _hitByRival(rv) {
    if (this.invuln) return;
    this.hp -= 1;
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    // 逸散：缩小 + 溅出可再吸收的墨滴 + 击退
    const lost = 3;
    for (let k = 0; k < lost; k++) {
      const a = Math.random() * 6.28, d = this.playerR + 14;
      this.foods.push({ x: this.player.x + Math.cos(a) * d, y: this.player.y + Math.sin(a) * d, r: this._rand(7, 10), ph: Math.random() * 6.28 });
    }
    this._setScore(this.score - lost);
    this._splash(this.player.x, this.player.y, WATER, 14);
    // 击退
    const ka = Math.atan2(this.player.y - rv.y, this.player.x - rv.x);
    this.player.setVelocity(Math.cos(ka) * 320, Math.sin(ka) * 320);
    if (this.hp <= 0) { this._lose(); return; }
    // 无敌帧
    this.invuln = true;
    this.time.delayedCall(1100, () => { this.invuln = false; });
  }

  _splash(x, y, color, n) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * 6.28, sp = this._rand(40, 160);
      const dot = this.add.circle(x, y, this._rand(2, 4), color, 0.9).setDepth(12);
      this.tweens.add({ targets: dot, x: x + Math.cos(a) * sp, y: y + Math.sin(a) * sp, alpha: 0, duration: 420, onComplete: () => dot.destroy() });
    }
  }

  _checkPhaseAndWin() {
    if (this.score >= WIN_SCORE) { this._win(); return; }
    const ph = PHASES[this.phase];
    if (this.score >= ph.upTo && this.phase < PHASES.length - 1) {
      const next = this.phase + 1;
      this.gameStarted = false;
      this._showCard(PHASES[next].intro[0], PHASES[next].intro[1], () => {
        this.gameStarted = true;
        this._enterPhase(next, false);
      });
    }
  }

  _win() {
    if (this.gameOver) return;
    this.gameOver = true; this.gameStarted = false;
    this.player.setVelocity(0, 0);
    window.GameHUD?.showGameOver(true, '墨滴聚成了纸上最饱满的一颗水珠，澄澈的蓝在水彩纸上漾开。');
  }

  _lose() {
    if (this.gameOver) return;
    this.gameOver = true; this.gameStarted = false;
    this.player.setVelocity(0, 0);
    window.GameHUD?.showGameOver(false, '被浊墨团一次次挤破，墨色逸散殆尽，散回了纸的纤维里……');
  }

  update(_t, dms) {
    const dt = Math.min(dms, 50) / 1000;
    this._wob += dt * 3;

    // 浊墨团游动（即使叙事卡时也缓动，画面不僵）
    const ph = PHASES[this.phase];
    for (const rv of this.rivals) {
      rv.x += rv.vx * dt; rv.y += rv.vy * dt;
      if (rv.x < rv.r + 8 || rv.x > GAME_W - rv.r - 8) { rv.vx *= -1; rv.x = Phaser.Math.Clamp(rv.x, rv.r + 8, GAME_W - rv.r - 8); }
      if (rv.y < rv.r + 8 || rv.y > GAME_H - rv.r - 8) { rv.vy *= -1; rv.y = Phaser.Math.Clamp(rv.y, rv.r + 8, GAME_H - rv.r - 8); }
    }

    this._render();

    if (!this.gameStarted || this.gameOver || this.cardActive) { this.player.setVelocity(0, 0); return; }

    // 玩家移动（越大越慢一点）
    const speed = Math.max(150, BASE_SPEED - this.score * 3.2);
    let vx = 0, vy = 0;
    if (this.cursors.left.isDown || this.kkeys.A.isDown) vx -= 1;
    if (this.cursors.right.isDown || this.kkeys.D.isDown) vx += 1;
    if (this.cursors.up.isDown || this.kkeys.W.isDown) vy -= 1;
    if (this.cursors.down.isDown || this.kkeys.S.isDown) vy += 1;
    const len = Math.hypot(vx, vy);
    if (len > 0 && !this.invuln) this.player.setVelocity((vx / len) * speed, (vy / len) * speed);
    else if (len > 0) { /* 无敌击退期间不抢夺速度 */ }

    // 大水珠按视觉半径夹进纸面（物理体只有 BASE_R）
    this.player.x = Phaser.Math.Clamp(this.player.x, this.playerR + 6, GAME_W - this.playerR - 6);
    this.player.y = Phaser.Math.Clamp(this.player.y, this.playerR + 6, GAME_H - this.playerR - 6);

    // 碰撞检测：食物 / 浊墨团
    const px = this.player.x, py = this.player.y, pr = this.playerR;
    for (let i = this.foods.length - 1; i >= 0; i--) {
      const f = this.foods[i];
      if (Math.hypot(f.x - px, f.y - py) < pr + f.r) this._absorbFood(i);
    }
    for (let i = this.rivals.length - 1; i >= 0; i--) {
      const rv = this.rivals[i];
      const d = Math.hypot(rv.x - px, rv.y - py);
      if (d < pr + rv.r) {
        if (rv.r < pr * 0.88) this._absorbRival(i);     // 比我小 → 吸收
        else this._hitByRival(rv);                       // 比我大/相当 → 逸散
      }
    }
  }

  // ── 程序化渲染：水珠 / 食物 / 浊墨团 ──
  _render() {
    const g = this.gfx;
    g.clear();

    // 食物小墨滴（实心软蓝 + 高光点）
    for (const f of this.foods) {
      const w = 1 + 0.12 * Math.sin(this._wob + f.ph);
      g.fillStyle(FOOD, 0.92).fillCircle(f.x, f.y, f.r * w);
      g.lineStyle(1.2, INK, 0.5).strokeCircle(f.x, f.y, f.r * w);
      g.fillStyle(WATER_HI, 0.8).fillCircle(f.x - f.r * 0.3, f.y - f.r * 0.3, f.r * 0.28);
    }

    // 浊墨团：比玩家小=可吸(蓝绿实心)，否则=威胁(灰底 + 危险虚环)
    const pr = this.playerR;
    for (const rv of this.rivals) {
      const eatable = rv.r < pr * 0.88;
      const wob = 1 + 0.06 * Math.sin(this._wob * 1.3 + rv.ph);
      if (eatable) {
        g.fillStyle(0x5fa0a8, 0.55).fillCircle(rv.x, rv.y, rv.r * wob);
        g.lineStyle(1.5, INK, 0.6).strokeCircle(rv.x, rv.y, rv.r * wob);
      } else {
        g.fillStyle(MURKY, 0.5).fillCircle(rv.x, rv.y, rv.r * wob);
        g.lineStyle(2, INK, 0.7).strokeCircle(rv.x, rv.y, rv.r * wob);
        // 危险环
        g.lineStyle(2, WARN, 0.7).strokeCircle(rv.x, rv.y, rv.r * wob + 4);
      }
    }

    // 玩家水珠
    const blink = this.invuln && (Math.floor(this._wob * 6) % 2 === 0);
    const wob = 1 + 0.07 * Math.sin(this._wob * 1.6);
    g.fillStyle(WATER, blink ? 0.4 : 0.85).fillCircle(this.player.x, this.player.y, pr * wob);
    g.lineStyle(2.5, INK, blink ? 0.4 : 0.95).strokeCircle(this.player.x, this.player.y, pr * wob);
    // 表面张力高光
    g.fillStyle(WATER_HI, blink ? 0.3 : 0.85).fillCircle(this.player.x - pr * 0.32, this.player.y - pr * 0.34, pr * 0.26);
    g.fillStyle(0xffffff, blink ? 0.2 : 0.6).fillCircle(this.player.x - pr * 0.38, this.player.y - pr * 0.4, pr * 0.1);
  }

  // ── 暴露状态给 verify / autoplay（俯视走位建议）──
  _exposeState() {
    const self = this;
    window.__gameState = { player: this.player };

    const suggest = () => {
      const px = self.player.x, py = self.player.y, pr = self.playerR;
      // 1) 趋近最近「可吸收」目标（食物 + 比我小的浊墨团）
      let tk = [0, 0], bd = 1e9;
      const consider = (x, y) => { const d = Math.hypot(x - px, y - py); if (d < bd) { bd = d; tk = [(x - px) / (d || 1), (y - py) / (d || 1)]; } };
      self.foods.forEach(f => consider(f.x, f.y));
      self.rivals.forEach(rv => { if (rv.r < pr * 0.85) consider(rv.x, rv.y); });
      // 2) 躲避「比我大」的浊墨团（近距离斥力）
      let av = [0, 0];
      self.rivals.forEach(rv => {
        if (rv.r < pr * 0.88) return;
        const dx = px - rv.x, dy = py - rv.y, d = Math.hypot(dx, dy);
        const safe = pr + rv.r + 60;
        if (d < safe && d > 1) { const w = (safe - d) / safe; av[0] += dx / d * w; av[1] += dy / d * w; }
      });
      // 3) 远离边缘
      const m = 50; let eb = [0, 0];
      if (px < m) eb[0] += 1; if (px > GAME_W - m) eb[0] -= 1;
      if (py < m) eb[1] += 1; if (py > GAME_H - m) eb[1] -= 1;
      const am = Math.hypot(av[0], av[1]);
      let mx, my;
      if (am > 0.3) { mx = av[0] * 2.6 + eb[0] * 0.6 + tk[0] * 0.4; my = av[1] * 2.6 + eb[1] * 0.6 + tk[1] * 0.4; }
      else { mx = tk[0] + eb[0] * 0.5; my = tk[1] + eb[1] * 0.5; }
      const mm = Math.hypot(mx, my) || 1;
      return [mx / mm, my / mm];
    };

    window.__probe = () => {
      const [mx, my] = suggest();
      return {
        x: self.player.x, y: self.player.y, topdown: true,
        hp: self.hp, maxHp: self.maxHp,
        score: Math.min(self.score, WIN_SCORE), goalScore: WIN_SCORE, phase: self.phase,
        deaths: self.maxHp - self.hp, deathBudget: self.maxHp,
        won: self.gameOver && self.score >= WIN_SCORE,
        lost: self.gameOver && self.score < WIN_SCORE,
        cardActive: self.cardActive, started: self.gameStarted,
        moveX: mx, moveY: my,
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
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  scene: CoalesceScene,
};

new Phaser.Game(config);
