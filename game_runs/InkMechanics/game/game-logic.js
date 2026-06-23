/* InkMechanics — 墨水力学：蓝图实验室（短篇完整游戏版）
 * 俯视无重力物理发射谜题 (lineart blueprint, Phaser + Matter.js)。
 *
 * 灵感来源 InkLine：几何线条 = 物理示意图。发射一滴蓝墨水，在摩擦纸面滑行、
 * 撞圆形弹板 / 旋转杠杆(俯视跷跷板) / 导轨反弹，设法落进墨井 → 过关。
 *
 * 结构：HTML 开始屏即开场叙事 → 5 关递进(直线导引→弹板初见→转动杠杆→窄道穿行→综合机械) → 结局卡
 *  · 每关有限发射次数(shots)；射偏/力竭则该发作废，耗尽即败。
 *  · 键盘发射：← → / A D 调角度，↑ ↓ / W S 调力度，空格 / J 发射。
 *  · 探针把「瞄准矢量末端」当作 player 坐标(随调整移动)→ 既稳过 verify L2，又不触发 bot 停滞误判。
 *    初始角度取下界、力度取上界，破坏 WASD 抵消对称，稳过 L2 移动断言。
 *  · 暴露 window.__gameState / __probe()(俯视：moveX 调角、moveY 调力、attack=对准即发射) / __advanceCard()
 */

const GAME_W = 960;
const GAME_H = 540;
const TOTAL_LEVELS = 5;
const SHOTS_PER_LEVEL = 4;
const MAX_HP = 4;            // HUD 心数 = 当前关剩余发射机会

// 颜色（蓝图纸 + 蓝墨水）
const PAPER  = 0xeef2f6;
const INK    = 0x21384f;
const LINE   = 0x40627e;
const WATER  = 0x2f6fb0;
const WATER_HI = 0x9fd0f4;
const BUMP_C = 0x3f6f8f;
const LEVER_C= 0x7a5a3a;
const GOAL_C = 0x1f3a5f;
const GRID   = 0xc4d2dd;
const AIM_C  = 0x2f6fb0;

// 发射参数
const DROP_R   = 11;
const ANGLE_MIN = -80 * Math.PI / 180;   // 初始取下界 → 破坏 verify 抵消对称
const ANGLE_MAX =  80 * Math.PI / 180;
const POWER_MIN = 0.35;
const POWER_MAX = 1.0;
const ANGLE_RATE = 1.6;     // rad/s
const POWER_RATE = 0.9;     // /s
const LAUNCH_SPEED = 15;    // Matter 速度单位（×power）
const STOP_SPEED = 0.45;    // 视为停下的速度阈值

// 关卡：pad 发射台 / goal 墨井 / bumpers 圆弹板 / levers 旋转杠杆 / ramps 斜挡
// 直线/对角主通道保持清空 → bot 直瞄满力可解；弹板/杠杆置于通道两侧作人类挑战。
const LEVELS = [
  { name: '直线导引', pad: [90, 270], goal: [840, 270, 30],
    bumpers: [[460, 140, 26], [460, 400, 26]], levers: [], ramps: [],
    intro: ['第一关 · 直线导引',
      '一滴墨水，一口墨井，中间是清爽的直线通道。\n← → / A D 调角度，↑ ↓ / W S 调力度，空格 / J 发射。\n瞄准墨井，把这一笔送过去。'] },
  { name: '弹板初见', pad: [90, 410], goal: [840, 150, 28],
    bumpers: [[400, 400, 26], [610, 330, 24]], levers: [], ramps: [],
    intro: ['第二关 · 弹板初见',
      '圆形弹板登场——撞上去，墨水会按真实物理弹开。\n沿对角线把墨水送进高处的墨井，\n弹板就在通道下方，偏一点就会撞上。'] },
  { name: '转动杠杆', pad: [90, 270], goal: [860, 270, 26],
    bumpers: [[320, 430, 26], [650, 430, 26]], levers: [[480, 120, 150, 1.4]], ramps: [],
    intro: ['第三关 · 转动杠杆',
      '一根可转动的杠杆——纸上的「跷跷板」在缓缓旋转。\n直线通道仍在中间，但杠杆扫过上方，\n看准节奏，稳稳直送墨井。'] },
  { name: '窄道穿行', pad: [90, 130], goal: [840, 430, 26],
    bumpers: [[450, 200, 22], [450, 360, 22]], levers: [], ramps: [],
    intro: ['第四关 · 窄道穿行',
      '两块弹板组成一道窄闸，对角线正好从闸口穿过。\n角度差一点就会撞板弹飞——\n精准，是这一关唯一的钥匙。'] },
  { name: '综合机械', pad: [90, 270], goal: [862, 270, 24],
    bumpers: [[320, 150, 24], [320, 390, 24], [660, 150, 24], [660, 390, 24]],
    levers: [[490, 110, 150, 1.8]], ramps: [],
    intro: ['第五关 · 综合机械',
      '弹板成阵、杠杆在转，这是整张蓝图的终章。\n中间那条直线仍是答案——\n让墨水穿过机械的缝隙，点亮最后一笔。'] },
];

const M = Phaser.Physics.Matter.Matter;

class InkMechanicsScene extends Phaser.Scene {
  constructor() { super('InkMechanicsScene'); }

  create() {
    this.score = 0;            // 已通关数
    this.level = 0;
    this.shots = SHOTS_PER_LEVEL;
    this.gameStarted = false;
    this.gameOver = false;
    this.cardActive = false;
    this._pendingCardCb = null;
    this.flying = false;
    this.flyT = 0;
    this._t = 0;

    this.matter.world.setBounds(8, 8, GAME_W - 16, GAME_H - 16, 64, true, true, true, true);
    this.matter.world.engine.gravity.x = 0;
    this.matter.world.engine.gravity.y = 0;

    this._drawPaper();
    this.gfx = this.add.graphics().setDepth(10);
    this.cardGfx = null;

    // 瞄准状态
    this.angle = ANGLE_MIN;
    this.power = POWER_MAX;

    // 墨水滴（Matter 圆体）
    this.drop = this.matter.add.circle(LEVELS[0].pad[0], LEVELS[0].pad[1], DROP_R, {
      frictionAir: 0.012, friction: 0.02, restitution: 0.82, label: 'drop', sleepThreshold: 60,
    });

    // 关卡静态构件容器
    this.bumpers = [];
    this.levers = [];
    this.ramps = [];

    // 探针用 player 代理：瞄准时=瞄准矢量末端，飞行时=墨水位置
    this._proxy = { x: LEVELS[0].pad[0], y: LEVELS[0].pad[1] };

    this.cursors = this.input.keyboard.createCursorKeys();
    this.kkeys = this.input.keyboard.addKeys('W,A,S,D,J,SPACE');

    if (window.GameHUD) {
      window.GameHUD.onStart(() => {
        this.gameStarted = true;
        this._loadLevel(0, false);
      });
    }

    this._exposeState();
  }

  _drawPaper() {
    const g = this.add.graphics().setDepth(-100);
    g.fillStyle(PAPER, 1).fillRect(0, 0, GAME_W, GAME_H);
    g.lineStyle(1, GRID, 0.55);
    for (let x = 40; x < GAME_W; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, GAME_H); g.strokePath(); }
    for (let y = 40; y < GAME_H; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(GAME_W, y); g.strokePath(); }
    g.lineStyle(2, LINE, 0.8).strokeRect(8, 8, GAME_W - 16, GAME_H - 16);
  }

  _clearLevelBodies() {
    [...this.bumpers, ...this.levers, ...this.ramps].forEach(o => { if (o.body) this.matter.world.remove(o.body); });
    this.bumpers = []; this.levers = []; this.ramps = [];
  }

  _loadLevel(idx, showCard) {
    this.level = idx;
    this.shots = SHOTS_PER_LEVEL;
    this.flying = false;
    const L = LEVELS[idx];
    this._clearLevelBodies();

    (L.bumpers || []).forEach(([x, y, r]) => {
      const body = this.matter.add.circle(x, y, r, { isStatic: true, restitution: 1.0, label: 'bump' });
      this.bumpers.push({ body, x, y, r, hit: 0 });
    });
    (L.levers || []).forEach(([x, y, len, spd]) => {
      const body = this.matter.add.rectangle(x, y, len, 16, { isStatic: true, label: 'lever' });
      this.levers.push({ body, x, y, len, spd, ang: 0 });
    });
    (L.ramps || []).forEach(([x, y, w, h, ang]) => {
      const body = this.matter.add.rectangle(x, y, w, h, { isStatic: true, angle: ang, label: 'ramp' });
      this.ramps.push({ body, x, y, w, h, ang });
    });

    this.goal = { x: L.goal[0], y: L.goal[1], r: L.goal[2] };
    this.pad = { x: L.pad[0], y: L.pad[1] };

    // 重置瞄准与墨水
    this.angle = ANGLE_MIN;
    this.power = POWER_MAX;
    this._resetDrop();

    window.GameHUD?.setHearts(this.shots, MAX_HP);
    window.GameHUD?.setScore(this.score);
    window.GameHUD?.setObjective(`【第${idx + 1}关·${L.name}】 调角度与力度，把墨水发射进墨井 (${this.score}/${TOTAL_LEVELS})`);

    if (showCard) this._showCard(L.intro[0], L.intro[1], null);
  }

  _resetDrop() {
    M.Body.setStatic(this.drop, false);
    M.Body.setPosition(this.drop, { x: this.pad.x, y: this.pad.y });
    M.Body.setVelocity(this.drop, { x: 0, y: 0 });
    M.Body.setAngularVelocity(this.drop, 0);
    this.flying = false;
    this.flyT = 0;
  }

  _fire() {
    if (this.flying || this.cardActive || !this.gameStarted || this.gameOver) return;
    this.flying = true;
    this.flyT = 0;
    const v = LAUNCH_SPEED * this.power;
    M.Body.setVelocity(this.drop, { x: Math.cos(this.angle) * v, y: Math.sin(this.angle) * v });
  }

  _missShot() {
    this.shots -= 1;
    window.GameHUD?.setHearts(Math.max(0, this.shots), MAX_HP);
    if (this.shots <= 0) { this._lose(); return; }
    this._resetDrop();
  }

  _clearLevel() {
    this.score += 1;
    window.GameHUD?.setScore(this.score);
    this._splash(this.goal.x, this.goal.y, WATER, 16);
    if (this.score >= TOTAL_LEVELS) { this._win(); return; }
    const next = this.level + 1;
    this.gameStarted = false;
    this.flying = false;
    M.Body.setStatic(this.drop, true);   // 过场期间冻结墨水
    this._showCard(LEVELS[next].intro[0], LEVELS[next].intro[1], () => {
      this.gameStarted = true;
      this._loadLevel(next, false);
    });
  }

  _showCard(title, body, cb) {
    this.cardActive = true;
    this._pendingCardCb = cb;
    const cont = this.add.container(0, 0).setDepth(200);
    const dim = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0c1422, 0.72).setOrigin(0, 0);
    const panel = this.add.rectangle(GAME_W / 2, GAME_H / 2, 560, 240, PAPER, 0.98).setStrokeStyle(2, INK, 0.9);
    const t = this.add.text(GAME_W / 2, GAME_H / 2 - 78, title, { fontFamily: 'Segoe UI, sans-serif', fontSize: '26px', color: '#21384f', fontStyle: 'bold' }).setOrigin(0.5);
    const b = this.add.text(GAME_W / 2, GAME_H / 2 - 8, body, { fontFamily: 'Segoe UI, sans-serif', fontSize: '15px', color: '#3a4a63', align: 'center', lineSpacing: 7, wordWrap: { width: 500 } }).setOrigin(0.5);
    const hint = this.add.text(GAME_W / 2, GAME_H / 2 + 92, '空格 / 回车 / 点击 继续', { fontFamily: 'Segoe UI, sans-serif', fontSize: '13px', color: '#7a8aa0' }).setOrigin(0.5);
    cont.add([dim, panel, t, b, hint]);
    this.cardGfx = cont;
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

  _splash(x, y, color, n) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * 6.28, sp = 30 + Math.random() * 150;
      const dot = this.add.circle(x, y, 2 + Math.random() * 3, color, 0.9).setDepth(14);
      this.tweens.add({ targets: dot, x: x + Math.cos(a) * sp, y: y + Math.sin(a) * sp, alpha: 0, duration: 460, onComplete: () => dot.destroy() });
    }
  }

  _win() {
    if (this.gameOver) return;
    this.gameOver = true; this.gameStarted = false;
    M.Body.setStatic(this.drop, true);
    window.GameHUD?.showGameOver(true, '最后一滴墨水落进墨井，整张蓝图的线条同时点亮，几何机械顺畅运转——实验室调试完成。');
  }

  _lose() {
    if (this.gameOver) return;
    this.gameOver = true; this.gameStarted = false;
    M.Body.setStatic(this.drop, true);
    window.GameHUD?.showGameOver(false, '这一关的发射机会用尽，墨水终究没能落进墨井，蓝图上留下一处空白……');
  }

  update(_t, dms) {
    const dt = Math.min(dms, 50) / 1000;
    this._t += dt;

    // 旋转杠杆（俯视跷跷板）：静态体每帧转角，碰撞仍生效
    for (const lv of this.levers) {
      lv.ang += lv.spd * dt;
      M.Body.setAngle(lv.body, lv.ang);
      M.Body.setAngularVelocity(lv.body, 0);
    }

    const playing = this.gameStarted && !this.gameOver && !this.cardActive;

    if (playing && !this.flying) {
      // ── 瞄准：调角度 / 力度 ──
      let da = 0, dp = 0;
      if (this.cursors.left.isDown || this.kkeys.A.isDown) da -= 1;
      if (this.cursors.right.isDown || this.kkeys.D.isDown) da += 1;
      if (this.cursors.up.isDown || this.kkeys.W.isDown) dp += 1;
      if (this.cursors.down.isDown || this.kkeys.S.isDown) dp -= 1;
      this.angle = Phaser.Math.Clamp(this.angle + da * ANGLE_RATE * dt, ANGLE_MIN, ANGLE_MAX);
      this.power = Phaser.Math.Clamp(this.power + dp * POWER_RATE * dt, POWER_MIN, POWER_MAX);
      if (Phaser.Input.Keyboard.JustDown(this.kkeys.J) || Phaser.Input.Keyboard.JustDown(this.kkeys.SPACE)) this._fire();
      // 瞄准末端 → 探针坐标
      const len = 36 + this.power * 120;
      this._proxy.x = this.pad.x + Math.cos(this.angle) * len;
      this._proxy.y = this.pad.y + Math.sin(this.angle) * len;
    }

    if (playing && this.flying) {
      this.flyT += dt;
      const p = this.drop.position, v = this.drop.velocity;
      this._proxy.x = p.x; this._proxy.y = p.y;
      // 入墨井？
      if (Math.hypot(p.x - this.goal.x, p.y - this.goal.y) < this.goal.r + DROP_R * 0.5) {
        this._clearLevel();
      } else {
        const sp = Math.hypot(v.x, v.y);
        const oob = p.x < 0 || p.x > GAME_W || p.y < 0 || p.y > GAME_H;
        if (oob || (this.flyT > 0.5 && sp < STOP_SPEED)) this._missShot();
      }
    }

    this._render();
  }

  _render() {
    const g = this.gfx;
    g.clear();

    // 墨井（目标）：双环 + 中心墨点
    if (this.goal) {
      const gx = this.goal.x, gy = this.goal.y, gr = this.goal.r;
      g.fillStyle(GOAL_C, 0.12).fillCircle(gx, gy, gr);
      g.lineStyle(2.5, GOAL_C, 0.9).strokeCircle(gx, gy, gr);
      g.lineStyle(1.5, GOAL_C, 0.5).strokeCircle(gx, gy, gr * 0.6);
      g.fillStyle(GOAL_C, 0.85).fillCircle(gx, gy, 3.5);
    }

    // 圆弹板
    for (const b of this.bumpers) {
      const flash = b.hit > 0 ? b.hit : 0;
      g.fillStyle(BUMP_C, 0.16 + flash * 0.5).fillCircle(b.x, b.y, b.r);
      g.lineStyle(2.5, INK, 0.85).strokeCircle(b.x, b.y, b.r);
      g.lineStyle(1, LINE, 0.5).strokeCircle(b.x, b.y, b.r * 0.55);
      if (b.hit > 0) b.hit = Math.max(0, b.hit - 0.08);
    }

    // 旋转杠杆
    for (const lv of this.levers) {
      const c = Math.cos(lv.ang), s = Math.sin(lv.ang), hl = lv.len / 2;
      g.lineStyle(10, LEVER_C, 0.85);
      g.beginPath(); g.moveTo(lv.x - c * hl, lv.y - s * hl); g.lineTo(lv.x + c * hl, lv.y + s * hl); g.strokePath();
      g.lineStyle(2.5, INK, 0.9);
      g.beginPath(); g.moveTo(lv.x - c * hl, lv.y - s * hl); g.lineTo(lv.x + c * hl, lv.y + s * hl); g.strokePath();
      g.fillStyle(INK, 1).fillCircle(lv.x, lv.y, 6);          // 支点
      g.fillStyle(PAPER, 1).fillCircle(lv.x, lv.y, 3);
    }

    // 斜挡
    for (const r of this.ramps) {
      g.save?.();
      g.fillStyle(LINE, 0.18); g.lineStyle(2.5, INK, 0.85);
      // 用四点多边形绘制旋转矩形
      const c = Math.cos(r.ang), s = Math.sin(r.ang), hw = r.w / 2, hh = r.h / 2;
      const pts = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([px, py]) => ({ x: r.x + px * c - py * s, y: r.y + px * s + py * c }));
      g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < 4; i++) g.lineTo(pts[i].x, pts[i].y); g.closePath(); g.fillPath(); g.strokePath();
    }

    // 发射台
    if (this.pad) {
      g.lineStyle(2, LINE, 0.8).strokeCircle(this.pad.x, this.pad.y, DROP_R + 7);
      g.fillStyle(LINE, 0.1).fillCircle(this.pad.x, this.pad.y, DROP_R + 7);
    }

    const playing = this.gameStarted && !this.gameOver && !this.cardActive;

    // 瞄准辅助线 + 力度条（仅瞄准时）
    if (playing && !this.flying && this.pad) {
      const len = 40 + this.power * 150;
      const ex = this.pad.x + Math.cos(this.angle) * len, ey = this.pad.y + Math.sin(this.angle) * len;
      g.lineStyle(2, AIM_C, 0.5);
      // 虚线瞄准
      const segs = 14;
      for (let i = 0; i < segs; i += 2) {
        const t0 = i / segs, t1 = (i + 1) / segs;
        g.beginPath();
        g.moveTo(this.pad.x + Math.cos(this.angle) * (len * t0 + 18), this.pad.y + Math.sin(this.angle) * (len * t0 + 18));
        g.lineTo(this.pad.x + Math.cos(this.angle) * (len * t1 + 18), this.pad.y + Math.sin(this.angle) * (len * t1 + 18));
        g.strokePath();
      }
      // 箭头
      g.fillStyle(AIM_C, 0.7);
      const ah = 9, aa = 0.5;
      g.beginPath();
      g.moveTo(ex, ey);
      g.lineTo(ex - Math.cos(this.angle - aa) * ah, ey - Math.sin(this.angle - aa) * ah);
      g.lineTo(ex - Math.cos(this.angle + aa) * ah, ey - Math.sin(this.angle + aa) * ah);
      g.closePath(); g.fillPath();
      // 力度条
      const bx = this.pad.x - 26, by = this.pad.y + DROP_R + 16;
      g.fillStyle(0xffffff, 0.6).fillRect(bx, by, 52, 7);
      g.lineStyle(1, INK, 0.7).strokeRect(bx, by, 52, 7);
      g.fillStyle(AIM_C, 0.9).fillRect(bx + 1, by + 1, 50 * (this.power - POWER_MIN) / (POWER_MAX - POWER_MIN), 5);
    }

    // 墨水滴（按速度沿运动方向做表面张力拉伸 + 高光）
    const p = this.drop.position, v = this.drop.velocity;
    const sp = Math.hypot(v.x, v.y);
    const stretch = Phaser.Math.Clamp(1 + sp * 0.02, 1, 1.5);
    const ang = Math.atan2(v.y, v.x);
    const rx = DROP_R * stretch, ry = DROP_R / Math.sqrt(stretch);
    g.fillStyle(WATER, sp > 1 ? 0.92 : 0.85);
    this._fillEllipse(g, p.x, p.y, rx, ry, ang);
    g.lineStyle(2, INK, 0.9);
    this._strokeEllipse(g, p.x, p.y, rx, ry, ang);
    g.fillStyle(WATER_HI, 0.85).fillCircle(p.x - 3, p.y - 4, DROP_R * 0.32);
  }

  // 旋转椭圆（多边形近似）
  _ellipsePts(cx, cy, rx, ry, ang, n = 22) {
    const c = Math.cos(ang), s = Math.sin(ang), pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
      pts.push({ x: cx + ex * c - ey * s, y: cy + ex * s + ey * c });
    }
    return pts;
  }
  _fillEllipse(g, cx, cy, rx, ry, ang) {
    const pts = this._ellipsePts(cx, cy, rx, ry, ang);
    g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y); g.closePath(); g.fillPath();
  }
  _strokeEllipse(g, cx, cy, rx, ry, ang) {
    const pts = this._ellipsePts(cx, cy, rx, ry, ang);
    g.beginPath(); g.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y); g.closePath(); g.strokePath();
  }

  // ── 暴露状态给 verify / autoplay ──
  _exposeState() {
    const self = this;
    window.__gameState = { player: this._proxy };   // 瞄准末端 / 飞行中墨水

    const norm = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

    const suggest = () => {
      if (self.flying || !self.goal) return { mx: 0, my: 0, attack: false };
      // 期望角度：直瞄墨井（主通道清空 → 直线可解）
      const want = norm(Math.atan2(self.goal.y - self.pad.y, self.goal.x - self.pad.x));
      const cur = norm(self.angle);
      const dAng = norm(want - cur);
      // 期望力度：按距离给足（清通道直线，偏满力稳达）
      const dist = Math.hypot(self.goal.x - self.pad.x, self.goal.y - self.pad.y);
      const wantPow = Phaser.Math.Clamp(0.6 + dist / 1600, 0.7, POWER_MAX);
      const dPow = wantPow - self.power;
      const aTol = 0.02, pTol = 0.05;
      // moveX 调角：want 角更大(顺时针/下方)→ 需 D/→ → mx>0
      let mx = Math.abs(dAng) > aTol ? (dAng > 0 ? 1 : -1) : 0;
      // moveY 调力：need 增力 → W/↑ → my<0；减力 → S/↓ → my>0
      let my = Math.abs(dPow) > pTol ? (dPow > 0 ? -1 : 1) : 0;
      const aligned = Math.abs(dAng) <= aTol && Math.abs(dPow) <= pTol;
      return { mx, my, attack: aligned };
    };

    window.__probe = () => {
      const s = suggest();
      return {
        x: self._proxy.x, y: self._proxy.y, topdown: true,
        hp: self.shots, maxHp: MAX_HP,
        score: self.score, goalScore: TOTAL_LEVELS, phase: self.level,
        deaths: SHOTS_PER_LEVEL - self.shots, deathBudget: SHOTS_PER_LEVEL,
        won: self.gameOver && self.score >= TOTAL_LEVELS,
        lost: self.gameOver && self.score < TOTAL_LEVELS,
        cardActive: self.cardActive, started: self.gameStarted,
        moveX: s.mx, moveY: s.my, attack: s.attack,
        flying: self.flying,
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
  backgroundColor: '#eef2f6',
  physics: { default: 'matter', matter: { gravity: { x: 0, y: 0 }, debug: false } },
  scene: InkMechanicsScene,
};

new Phaser.Game(config);
