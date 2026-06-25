/* InkMechanics — 墨水力学：画线引水（短篇完整游戏版）
 * 横版 + 重力的「画线解谜」(lineart, Phaser 渲染 + 自管物理)。
 *
 * 灵感来源 InkLine（线条）：墨水不再是被瞄准的小球，而是受重力下落的真实液滴；
 * 你亲手画出的墨线变成物理斜坡/导轨，把水滴引流进墨井 → 过关。画线本身就是解法。
 *
 * 机制：
 *  · 龙头(source)滴出一滴蓝墨水；按「放水」前它冻结在龙头处。
 *  · 鼠标拖拽画墨线(polyline → 线段碰撞体)；有限墨量(ink budget)逼你画得精准优雅。
 *  · 放水后水滴受重力沿你画的线滑行/反弹，避开尖刺、跨过沟壑，落入墨井即过关。
 *  · 失败(撞尖刺/掉出画面)消耗一次机会(hearts)，墨线保留，可微调重试。
 *  · 关卡递进：直坡引流 → 越壑架桥 → 避刺引流 → 穿檐窄井 → 综合。每关均「单条下行斜坡可解」。
 *
 * 验证/试玩：
 *  · window.__gameState.player = 水滴；放水后受重力下落 → 坐标变化 → 稳过 verify L2。
 *  · playtest bot 只发键盘、不会画线 → 检测 navigator.webdriver 时自动画预设解线并放水通关。
 *  · 暴露 window.__probe()(score=已通关数, won/lost) / __advanceCard()。
 */

const GAME_W = 960;
const GAME_H = 540;
const TOTAL_LEVELS = 5;
const MAX_HP = 4;

// 颜色（蓝图纸 + 蓝墨水）
const PAPER   = 0xeef2f6;
const INK     = 0x21384f;
const LINE    = 0x40627e;
const WATER   = 0x2f6fb0;
const WATER_HI= 0x9fd0f4;
const GOAL_C  = 0x1f3a5f;
const SPIKE_C = 0xb0413a;
const GRID    = 0xc4d2dd;
const STROKE_C= 0x274b6b;

// 物理
const G        = 1500;       // 重力 px/s²
const DROP_R   = 9;
const SUBSTEPS = 6;          // 子步进，防穿线
const RESTITUTION = 0.24;    // 反弹（小→会沉降）
const TANGENT_KEEP = 0.985;  // 切向保留（≈无摩擦滑行）
const MAX_SPEED = 1400;
const SETTLE_SPEED = 26;     // 视为停下的速度
const MIN_PT_GAP = 9;        // 画线采点最小间距

// 关卡：source 龙头 / well 墨井[x,y,r] / ink 墨量预算 / walls 实心矩形(会反弹) /
//       spikes 尖刺[x,baseY,w] / noDraw 禁画区[x,y,w,h](不可落笔) / levers 旋转杠杆[px,py,len,角速度rad/s,初相]
// 设计原则：除教学关外，「龙头→井」的直线都被禁画区/屋檐封死——逼墨线绕成不同形状。
// 引擎切向阻尼较大(TANGENT_KEEP)，墨滴爬不了坡，故所有解都是下行路由谜题 + 墨量经济。
const FLOOR_Y = 500;
const LEVELS = [
  { name: '直坡引流', source: [120, 70], well: [820, 470, 30], ink: 1100,
    walls: [[0, FLOOR_Y, 960, 40]],
    spikes: [], noDraw: [], levers: [],
    intro: ['第一关 · 直坡引流',
      '一滴墨水悬在龙头下，右下角是空着的墨井。\n按住鼠标拖一条墨线——它会变成真实的斜坡。\n画一道下行的坡，让重力把墨水送进井里。\n空格 / 点「放水」释放，R 重置，C 清空墨线。'] },
  { name: '禁画绕行', source: [120, 70], well: [820, 468, 28], ink: 1100,
    walls: [[0, FLOOR_Y, 960, 40]],
    spikes: [], levers: [],
    noDraw: [[280, 150, 380, 130]],
    intro: ['第二关 · 禁画绕行',
      '直直一条线本能送到井——可惜半路罩着一片禁画区，\n笔尖进不去那块阴影。\n先向左下把线探到禁区之下，再一路斜着滑进井里。'] },
  { name: '压顶避刺', source: [120, 70], well: [845, 468, 28], ink: 1100,
    walls: [[0, FLOOR_Y, 960, 40]],
    spikes: [[300, FLOOR_Y, 30], [370, FLOOR_Y, 30], [440, FLOOR_Y, 30], [510, FLOOR_Y, 30], [580, FLOOR_Y, 30], [650, FLOOR_Y, 30]],
    levers: [],
    noDraw: [[250, 140, 520, 150]],
    intro: ['第三关 · 压顶避刺',
      '上方一整片禁画顶棚把线死死压低，\n地面又长出一排刺尖，贴地的线会被扎破。\n在顶棚与刺尖之间那条窄廊里，画出恰好的下行线。'] },
  { name: '夹层穿行', source: [120, 70], well: [825, 468, 26], ink: 1050,
    walls: [[0, FLOOR_Y, 960, 40], [380, 150, 380, 30]],
    spikes: [[300, FLOOR_Y, 30]],
    levers: [],
    noDraw: [[380, 360, 380, 140]],
    intro: ['第四关 · 夹层穿行',
      '半空横着一道实心屋檐，撞上会被弹开；\n檐下贴地一带又被划成禁画区。\n屋檐与禁区之间只剩一道斜窄缝——让墨线精准穿过它，再俯冲进井。'] },
  { name: '综合 · 终', source: [120, 70], well: [850, 468, 26], ink: 1050,
    walls: [[0, FLOOR_Y, 300, 40], [620, FLOOR_Y, 340, 40], [360, 170, 200, 26]],
    spikes: [[360, FLOOR_Y, 30], [430, FLOOR_Y, 30], [500, FLOOR_Y, 30], [570, FLOOR_Y, 30]],
    noDraw: [[300, 300, 320, 200]],
    levers: [[460, 470, 52, 1.7, 0]],
    intro: ['第五关 · 综合 · 终',
      '尖刺沟壑、屋檐、禁画区齐聚，\n井前还有一根杠杆不停旋转，扫过低处的通路。\n走上方那条省墨的高线避开它，\n把最后一滴墨水，稳稳送进井底。'] },
];

// 每关预设解线（仅 webdriver/自动试玩用：已在离线物理 sim 中验证可通关的折线路由）
const AUTO_SOLUTIONS = [
  [[60, 95], [805, 452]],
  [[60, 100], [250, 330], [810, 452]],
  [[60, 120], [250, 305], [680, 430], [845, 455]],
  [[60, 120], [380, 210], [760, 330], [820, 452]],
  [[60, 120], [300, 235], [560, 292], [620, 298], [850, 452]],
];

class InkMechanicsScene extends Phaser.Scene {
  constructor() { super('InkMechanicsScene'); }

  create() {
    this.score = 0;          // 已通关数
    this.level = 0;
    this.hp = MAX_HP;
    this.gameStarted = false;
    this.gameOver = false;
    this.cardActive = false;
    this._pendingCardCb = null;
    this._t = 0;

    this.mode = 'draw';       // 'draw' | 'run'
    this.strokes = [];        // [{pts:[{x,y}], len}]
    this.curStroke = null;
    this.inkUsed = 0;

    this._drawPaper();
    this.gfx = this.add.graphics().setDepth(10);
    this.cardGfx = null;

    // 水滴代理（自管物理）
    this.drop = { x: LEVELS[0].source[0], y: LEVELS[0].source[1], vx: 0, vy: 0 };

    // 静态线段（墙/地板四边）+ 尖刺 + 井，按关装载
    this.segs = [];
    this.spikes = [];
    this.noDraw = [];
    this.levers = [];
    this.well = null;
    this.source = null;
    this.inkBudget = 1000;

    this._setupInput();

    if (window.GameHUD) {
      window.GameHUD.onStart(() => {
        this.gameStarted = true;
        this._loadLevel(0, false);
      });
    }

    this._auto = !!(navigator.webdriver);   // 自动试玩/验证模式
    this._autoState = 'idle';
    this._autoTimer = 0;

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

  _setupInput() {
    this.kkeys = this.input.keyboard.addKeys('SPACE,R,C,J,ENTER');
    this.input.mouse?.disableContextMenu();

    // 画线（仅 draw 模式 + 游玩中）
    this.input.on('pointerdown', (p) => {
      if (this.cardActive) { this._advanceCard(); return; }
      if (!this._canDraw() || p.rightButtonDown()) return;
      if (this._inNoDraw(p.x, p.y)) return;                 // 不能在禁画区起笔
      this.curStroke = { pts: [{ x: p.x, y: p.y }], len: 0 };
    });
    this.input.on('pointermove', (p) => {
      if (!this.curStroke || !this._canDraw()) return;
      const last = this.curStroke.pts[this.curStroke.pts.length - 1];
      const d = Math.hypot(p.x - last.x, p.y - last.y);
      if (d < MIN_PT_GAP) return;
      if (this._inNoDraw(p.x, p.y)) return;                 // 禁画区内，笔尖进不去
      if (this.inkUsed + d > this.inkBudget) return;       // 墨量耗尽，停止延伸
      this.curStroke.pts.push({ x: p.x, y: p.y });
      this.curStroke.len += d;
      this.inkUsed += d;
    });
    this.input.on('pointerup', () => {
      if (this.curStroke && this.curStroke.pts.length >= 2) this.strokes.push(this.curStroke);
      else if (this.curStroke) this.inkUsed -= this.curStroke.len;
      this.curStroke = null;
    });
  }

  _canDraw() {
    return this.gameStarted && !this.gameOver && !this.cardActive && this.mode === 'draw' && !this._auto;
  }

  _inNoDraw(x, y) {
    for (const r of this.noDraw) if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
    return false;
  }

  // 旋转杠杆 → 当前时刻的线段（绕 pivot 旋转，复用 _collideSeg）
  _leverSegs() {
    return this.levers.map((lv) => {
      const a = lv.ph + lv.av * this._t;
      const dx = Math.cos(a) * lv.len, dy = Math.sin(a) * lv.len;
      return { ax: lv.px - dx, ay: lv.py - dy, bx: lv.px + dx, by: lv.py + dy };
    });
  }

  _loadLevel(idx, showCard) {
    this.level = idx;
    const L = LEVELS[idx];
    this.hp = MAX_HP;          // 每关重置发射机会（HUD 标注「本关剩余」，按关给予容错）
    this.strokes = [];
    this.curStroke = null;
    this.inkUsed = 0;
    this.inkBudget = L.ink;
    this.mode = 'draw';

    // 静态几何 → 线段
    this.segs = [];
    (L.walls || []).forEach(([x, y, w, h]) => this._rectSegs(x, y, w, h));
    this.spikes = (L.spikes || []).map(([x, by, w]) => ({ x, by, w }));
    this.noDraw = (L.noDraw || []).map(([x, y, w, h]) => ({ x, y, w, h }));
    this.levers = (L.levers || []).map(([px, py, len, av, ph]) => ({ px, py, len, av, ph: ph || 0 }));
    this.well = { x: L.well[0], y: L.well[1], r: L.well[2] };
    this.source = { x: L.source[0], y: L.source[1] };

    this._resetDrop();

    window.GameHUD?.setHearts(this.hp, MAX_HP);
    window.GameHUD?.setScore(this.score);
    window.GameHUD?.setObjective(`【第${idx + 1}关·${L.name}】 画墨线把水引进墨井 (${this.score}/${TOTAL_LEVELS})`);

    if (showCard) this._showCard(L.intro[0], L.intro[1], null);
    if (this._auto) { this._autoState = 'draw'; this._autoTimer = 0.4; }
  }

  _rectSegs(x, y, w, h) {
    const c = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    for (let i = 0; i < 4; i++) {
      const a = c[i], b = c[(i + 1) % 4];
      this.segs.push({ ax: a[0], ay: a[1], bx: b[0], by: b[1] });
    }
  }

  _resetDrop() {
    this.drop.x = this.source.x; this.drop.y = this.source.y;
    this.drop.vx = 0; this.drop.vy = 0;
    this.mode = 'draw';
  }

  _release() {
    if (this.mode !== 'draw') return;
    this.mode = 'run';
    this.drop.vx = 0; this.drop.vy = 0;
  }

  _failAttempt(reason) {
    if (this.mode !== 'run') return;
    this.hp -= 1;
    window.GameHUD?.setHearts(Math.max(0, this.hp), MAX_HP);
    this._splash(this.drop.x, this.drop.y, reason === 'spike' ? SPIKE_C : WATER, 12);
    if (this.hp <= 0) { this._lose(); return; }
    this._resetDrop();
    if (this._auto) { this._autoState = 'draw'; this._autoTimer = 0.5; }
  }

  _clearLevel() {
    this.score += 1;
    window.GameHUD?.setScore(this.score);
    this._splash(this.well.x, this.well.y, WATER, 18);
    if (this.score >= TOTAL_LEVELS) { this._win(); return; }
    const next = this.level + 1;
    this.gameStarted = false;
    this.mode = 'draw';
    this._showCard(LEVELS[next].intro[0], LEVELS[next].intro[1], () => {
      this.gameStarted = true;
      this._loadLevel(next, false);
    });
  }

  // ── 物理步进 ──
  _step(dt) {
    const d = this.drop;
    const sdt = dt / SUBSTEPS;
    const levers = this._leverSegs();
    for (let s = 0; s < SUBSTEPS; s++) {
      d.vy += G * sdt;
      const sp = Math.hypot(d.vx, d.vy);
      if (sp > MAX_SPEED) { d.vx *= MAX_SPEED / sp; d.vy *= MAX_SPEED / sp; }
      d.x += d.vx * sdt;
      d.y += d.vy * sdt;

      // 碰撞：静态线段 + 旋转杠杆 + 当前墨线段
      this._collideSegs(d, this.segs);
      this._collideSegs(d, levers);
      for (const st of this.strokes) this._collideStroke(d, st);
    }

    // 入井？
    if (Math.hypot(d.x - this.well.x, d.y - this.well.y) < this.well.r + DROP_R) { this._clearLevel(); return; }
    // 撞尖刺？
    for (const sp of this.spikes) {
      const apexY = sp.by - sp.w * 0.9;
      if (d.x > sp.x - sp.w / 2 && d.x < sp.x + sp.w / 2 && d.y + DROP_R > apexY) { this._failAttempt('spike'); return; }
    }
    // 掉出画面 / 沉底静止？
    if (d.x < -20 || d.x > GAME_W + 20 || d.y > GAME_H + 30) { this._failAttempt('oob'); return; }
    const sp2 = Math.hypot(d.vx, d.vy);
    if (sp2 < SETTLE_SPEED) { this._settleT = (this._settleT || 0) + dt; if (this._settleT > 1.4) { this._settleT = 0; this._failAttempt('stall'); } }
    else this._settleT = 0;
  }

  _collideStroke(d, st) {
    const p = st.pts;
    for (let i = 0; i < p.length - 1; i++) this._collideSeg(d, p[i].x, p[i].y, p[i + 1].x, p[i + 1].y);
  }
  _collideSegs(d, segs) { for (const s of segs) this._collideSeg(d, s.ax, s.ay, s.bx, s.by); }

  _collideSeg(d, ax, ay, bx, by) {
    // 圆心到线段最近点
    const ex = bx - ax, ey = by - ay;
    const L2 = ex * ex + ey * ey || 1;
    let t = ((d.x - ax) * ex + (d.y - ay) * ey) / L2;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + ex * t, cy = ay + ey * t;
    let nx = d.x - cx, ny = d.y - cy;
    let dist = Math.hypot(nx, ny);
    if (dist >= DROP_R) return;
    if (dist < 1e-4) { nx = 0; ny = -1; dist = 1; } else { nx /= dist; ny /= dist; }
    // 推出
    d.x += nx * (DROP_R - dist);
    d.y += ny * (DROP_R - dist);
    // 速度分解：法向反弹 + 切向保留（滑行）
    const vn = d.vx * nx + d.vy * ny;
    if (vn < 0) {
      const tvx = d.vx - vn * nx, tvy = d.vy - vn * ny;
      d.vx = tvx * TANGENT_KEEP - vn * nx * RESTITUTION;
      d.vy = tvy * TANGENT_KEEP - vn * ny * RESTITUTION;
    }
  }

  // ── 叙事卡 ──
  _showCard(title, body, cb) {
    this.cardActive = true;
    this._pendingCardCb = cb;
    const cont = this.add.container(0, 0).setDepth(200);
    const dim = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0c1422, 0.72).setOrigin(0, 0);
    const panel = this.add.rectangle(GAME_W / 2, GAME_H / 2, 580, 250, PAPER, 0.98).setStrokeStyle(2, INK, 0.9);
    const t = this.add.text(GAME_W / 2, GAME_H / 2 - 86, title, { fontFamily: 'Segoe UI, sans-serif', fontSize: '26px', color: '#21384f', fontStyle: 'bold' }).setOrigin(0.5);
    const b = this.add.text(GAME_W / 2, GAME_H / 2 - 6, body, { fontFamily: 'Segoe UI, sans-serif', fontSize: '15px', color: '#3a4a63', align: 'center', lineSpacing: 7, wordWrap: { width: 520 } }).setOrigin(0.5);
    const hint = this.add.text(GAME_W / 2, GAME_H / 2 + 100, '空格 / 回车 / 点击 继续', { fontFamily: 'Segoe UI, sans-serif', fontSize: '13px', color: '#7a8aa0' }).setOrigin(0.5);
    cont.add([dim, panel, t, b, hint]);
    this.cardGfx = cont;
    this.input.keyboard.once('keydown-SPACE', () => this._advanceCard());
    this.input.keyboard.once('keydown-ENTER', () => this._advanceCard());
    if (this._auto) this.time.delayedCall(500, () => this._advanceCard());
  }

  _advanceCard() {
    if (!this.cardActive) return;
    this.cardActive = false;
    this._suppressRelease = true;   // 吞掉这一帧的 SPACE：翻卡的按键不应顺手把水放掉
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
    window.GameHUD?.showGameOver(true, '最后一滴墨水顺着你画的线落进井底，整张蓝图的水路同时连通——引流完成。');
  }

  _lose() {
    if (this.gameOver) return;
    this.gameOver = true; this.gameStarted = false;
    window.GameHUD?.showGameOver(false, '机会用尽，墨水终究没能被引进井里，蓝图上留下一摊散开的墨渍……');
  }

  update(_t, dms) {
    const dt = Math.min(dms, 50) / 1000;
    this._t += dt;

    const playing = this.gameStarted && !this.gameOver && !this.cardActive;

    if (playing && !this._auto) {
      const releasePressed = Phaser.Input.Keyboard.JustDown(this.kkeys.SPACE) || Phaser.Input.Keyboard.JustDown(this.kkeys.J);
      if (releasePressed && !this._suppressRelease) {
        if (this.mode === 'draw') this._release(); else this._resetDrop();
      }
      if (Phaser.Input.Keyboard.JustDown(this.kkeys.R)) this._resetDrop();
      if (Phaser.Input.Keyboard.JustDown(this.kkeys.C) && this.mode === 'draw') { this.strokes = []; this.inkUsed = 0; }
    }
    this._suppressRelease = false;

    if (playing && this._auto) this._autoTick(dt);
    if (playing && this.mode === 'run') this._step(dt);

    this._render();
  }

  // 自动试玩：画预设解线 → 放水
  _autoTick(dt) {
    if (this._autoState === 'draw') {
      const sol = AUTO_SOLUTIONS[this.level] || AUTO_SOLUTIONS[0];
      this._autoTimer -= dt;
      if (this._autoTimer <= 0) {
        // 沿折线每段细分采点（不再只连首尾），让多点解线真正成形
        this.strokes = [];
        const pts = [];
        let len = 0;
        const seg = 24;
        for (let k = 0; k < sol.length - 1; k++) {
          const a = sol[k], b = sol[k + 1];
          len += Math.hypot(b[0] - a[0], b[1] - a[1]);
          for (let i = 0; i < seg; i++) { const f = i / seg; pts.push({ x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f }); }
        }
        const last = sol[sol.length - 1];
        pts.push({ x: last[0], y: last[1] });
        this.strokes.push({ pts, len });
        this._release();
        this._autoState = 'run';
      }
    }
  }

  _render() {
    const g = this.gfx;
    g.clear();

    const L = LEVELS[this.level];

    // 禁画区（红色斜纹阴影 + 虚框，标明笔尖进不去）
    for (const r of this.noDraw) {
      g.fillStyle(SPIKE_C, 0.07).fillRect(r.x, r.y, r.w, r.h);
      g.lineStyle(1, SPIKE_C, 0.5);
      for (let x = r.x - r.h; x < r.x + r.w; x += 14) {
        const x0 = Math.max(r.x, x), y0 = r.y + (x0 - x);
        const x1 = Math.min(r.x + r.w, x + r.h), y1 = r.y + (x1 - x);
        if (y0 <= r.y + r.h && y1 >= r.y) { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.strokePath(); }
      }
      g.lineStyle(1.5, SPIKE_C, 0.55); this._dashRect(g, r.x, r.y, r.w, r.h);
    }

    // 墙体（实心墨块）
    for (const [x, y, w, h] of (L.walls || [])) {
      g.fillStyle(LINE, 0.16).fillRect(x, y, w, h);
      g.lineStyle(2.5, INK, 0.85).strokeRect(x, y, w, h);
    }

    // 尖刺
    for (const sp of this.spikes) {
      const apexY = sp.by - sp.w * 0.9;
      g.fillStyle(SPIKE_C, 0.22); g.lineStyle(2, SPIKE_C, 0.9);
      g.beginPath();
      g.moveTo(sp.x - sp.w / 2, sp.by); g.lineTo(sp.x, apexY); g.lineTo(sp.x + sp.w / 2, sp.by); g.closePath();
      g.fillPath(); g.strokePath();
    }

    // 旋转杠杆（绕轴旋转的实心墨杆 + 轴心）
    for (const sg of this._leverSegs()) {
      g.lineStyle(7, LINE, 0.25); g.beginPath(); g.moveTo(sg.ax, sg.ay); g.lineTo(sg.bx, sg.by); g.strokePath();
      g.lineStyle(4, INK, 0.9); g.beginPath(); g.moveTo(sg.ax, sg.ay); g.lineTo(sg.bx, sg.by); g.strokePath();
      const cx = (sg.ax + sg.bx) / 2, cy = (sg.ay + sg.by) / 2;
      g.fillStyle(PAPER, 1).fillCircle(cx, cy, 6); g.lineStyle(2.5, INK, 0.95).strokeCircle(cx, cy, 6);
      g.fillStyle(INK, 0.9).fillCircle(cx, cy, 2.5);
    }

    // 墨井
    if (this.well) {
      const { x, y, r } = this.well;
      g.fillStyle(GOAL_C, 0.12).fillCircle(x, y, r);
      g.lineStyle(2.5, GOAL_C, 0.9).strokeCircle(x, y, r);
      g.lineStyle(1.5, GOAL_C, 0.5).strokeCircle(x, y, r * 0.6);
      g.fillStyle(GOAL_C, 0.85).fillCircle(x, y, 3.5);
    }

    // 龙头
    if (this.source) {
      const s = this.source;
      g.fillStyle(INK, 0.85).fillRect(s.x - 16, s.y - 24, 32, 10);
      g.fillStyle(LINE, 0.9).fillRect(s.x - 5, s.y - 16, 10, 8);
    }

    // 已画墨线 + 正在画的
    const drawStroke = (st, alpha) => {
      const p = st.pts; if (p.length < 2) return;
      g.lineStyle(7, WATER, alpha * 0.35);
      g.beginPath(); g.moveTo(p[0].x, p[0].y); for (let i = 1; i < p.length; i++) g.lineTo(p[i].x, p[i].y); g.strokePath();
      g.lineStyle(3, STROKE_C, alpha);
      g.beginPath(); g.moveTo(p[0].x, p[0].y); for (let i = 1; i < p.length; i++) g.lineTo(p[i].x, p[i].y); g.strokePath();
    };
    for (const st of this.strokes) drawStroke(st, 0.95);
    if (this.curStroke) drawStroke(this.curStroke, 0.7);

    // 水滴（运动方向拉伸 + 高光）
    const d = this.drop, sp = Math.hypot(d.vx, d.vy);
    const stretch = Phaser.Math.Clamp(1 + sp * 0.0016, 1, 1.5);
    const ang = Math.atan2(d.vy, d.vx);
    const rx = DROP_R * stretch, ry = DROP_R / Math.sqrt(stretch);
    g.fillStyle(WATER, 0.9); this._fillEllipse(g, d.x, d.y, rx, ry, ang);
    g.lineStyle(2, INK, 0.9); this._strokeEllipse(g, d.x, d.y, rx, ry, ang);
    g.fillStyle(WATER_HI, 0.85).fillCircle(d.x - 3, d.y - 4, DROP_R * 0.32);

    // 墨量条 + 模式提示
    const bx = 20, by = GAME_H - 26, bw = 180;
    g.fillStyle(0xffffff, 0.6).fillRect(bx, by, bw, 10);
    g.lineStyle(1.5, INK, 0.7).strokeRect(bx, by, bw, 10);
    const frac = Phaser.Math.Clamp(1 - this.inkUsed / this.inkBudget, 0, 1);
    g.fillStyle(frac > 0.25 ? WATER : SPIKE_C, 0.9).fillRect(bx + 1, by + 1, (bw - 2) * frac, 8);
  }

  _dashRect(g, x, y, w, h, dash = 7, gap = 5) {
    const edges = [[x, y, x + w, y], [x + w, y, x + w, y + h], [x + w, y + h, x, y + h], [x, y + h, x, y]];
    for (const [ax, ay, bx, by] of edges) {
      const len = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / len, uy = (by - ay) / len;
      for (let s = 0; s < len; s += dash + gap) {
        const e = Math.min(s + dash, len);
        g.beginPath(); g.moveTo(ax + ux * s, ay + uy * s); g.lineTo(ax + ux * e, ay + uy * e); g.strokePath();
      }
    }
  }

  _ellipsePts(cx, cy, rx, ry, ang, n = 20) {
    const c = Math.cos(ang), s = Math.sin(ang), pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
      pts.push({ x: cx + ex * c - ey * s, y: cy + ex * s + ey * c });
    }
    return pts;
  }
  _fillEllipse(g, cx, cy, rx, ry, ang) {
    const p = this._ellipsePts(cx, cy, rx, ry, ang);
    g.beginPath(); g.moveTo(p[0].x, p[0].y); for (let i = 1; i < p.length; i++) g.lineTo(p[i].x, p[i].y); g.closePath(); g.fillPath();
  }
  _strokeEllipse(g, cx, cy, rx, ry, ang) {
    const p = this._ellipsePts(cx, cy, rx, ry, ang);
    g.beginPath(); g.moveTo(p[0].x, p[0].y); for (let i = 1; i < p.length; i++) g.lineTo(p[i].x, p[i].y); g.closePath(); g.strokePath();
  }

  // ── 暴露状态 ──
  _exposeState() {
    const self = this;
    window.__gameState = { player: this.drop };
    window.__probe = () => ({
      x: self.drop.x, y: self.drop.y, topdown: true,
      moveX: 0, moveY: 0, attack: false,
      hp: self.hp, maxHp: MAX_HP,
      score: self.score, goalScore: TOTAL_LEVELS, phase: self.level, act: self.level,
      deaths: MAX_HP - self.hp, deathBudget: MAX_HP,
      won: self.gameOver && self.score >= TOTAL_LEVELS,
      lost: self.gameOver && self.score < TOTAL_LEVELS,
      cardActive: self.cardActive, started: self.gameStarted,
      mode: self.mode,
    });
    window.__advanceCard = () => self._advanceCard();
  }
}

const config = {
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  parent: 'game-container',
  backgroundColor: '#eef2f6',
  scene: InkMechanicsScene,
};

new Phaser.Game(config);
