/* game/scenes/LevelScene.js — 玩法本体（画线引水）
 * ─────────────────────────────────────────────────────────────────────────
 * 从原 InkMechanicsScene 平移：物理/绘制已外移到 Ink.Physics / Ink.Render，
 * 本场景只管「状态机 + 输入 + 关卡流程 + juice」。新增：星级评分、暂停、打击感、音效。
 * __probe / __gameState 契约保持不变（经 Ink.Game 暴露）。
 */
window.Ink = window.Ink || {};

class LevelScene extends Phaser.Scene {
  constructor() { super('LevelScene'); }

  init(data) { this._startIdx = (data && data.idx) || 0; }

  create() {
    const C = window.Ink.Config;
    window.Ink.Game.active = this;

    this.score = 0;
    this.level = this._startIdx;
    this.hp = C.MAX_HP;
    this.gameStarted = true;
    this.gameOver = false;
    this.cardActive = false;
    this._pendingCardCb = null;
    this._t = 0;
    this._hitStop = 0;
    this._settleT = 0;
    this.levelFails = 0;
    this.trail = [];

    this.mode = 'draw';
    this.strokes = [];
    this.curStroke = null;
    this.inkUsed = 0;
    this.inkBudget = 1000;

    this.reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    window.Ink.Render.drawPaper(this.add.graphics().setDepth(-100));
    this.gfx = this.add.graphics().setDepth(10);
    this.cardGfx = null;

    this.drop = { x: 0, y: 0, vx: 0, vy: 0 };
    window.__gameState = { player: this.drop };

    this.segs = []; this.spikes = []; this.noDraw = []; this.levers = [];
    this.well = null; this.source = null;

    this._auto = window.Ink.Game.auto;
    this._autoState = 'idle';
    this._autoTimer = 0;

    this._setupInput();
    this._loadLevel(this.level, !this._auto);   // 人类玩家进关先看叙事卡

    this.events.once('shutdown', () => { if (window.Ink.Game.active === this) window.Ink.Game.active = null; });
  }

  // ── 输入 ──
  _setupInput() {
    this.kkeys = this.input.keyboard.addKeys('SPACE,R,C,J,ENTER,M');
    this.input.mouse?.disableContextMenu();

    this.input.on('pointerdown', (p) => {
      if (this.cardActive) { this._advanceCard(); return; }
      if (!this._canDraw() || p.rightButtonDown()) return;
      if (this._inNoDraw(p.x, p.y)) return;
      this.curStroke = { pts: [{ x: p.x, y: p.y }], len: 0 };
      this._lastTick = 0;
    });
    this.input.on('pointermove', (p) => {
      if (!this.curStroke || !this._canDraw()) return;
      const last = this.curStroke.pts[this.curStroke.pts.length - 1];
      const d = Math.hypot(p.x - last.x, p.y - last.y);
      if (d < window.Ink.Config.PHYS.MIN_PT_GAP) return;
      if (this._inNoDraw(p.x, p.y)) return;
      if (this.inkUsed + d > this.inkBudget) return;
      this.curStroke.pts.push({ x: p.x, y: p.y });
      this.curStroke.len += d;
      this.inkUsed += d;
      this._lastTick = (this._lastTick || 0) + d;
      if (this._lastTick > 36) { window.GameAudio?.play('tick'); this._lastTick = 0; }   // 画线沙沙声
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

  // ── 关卡装载 ──
  _loadLevel(idx, showCard) {
    const C = window.Ink.Config, L = window.Ink.LEVELS[idx];
    this.level = idx;
    this.hp = C.MAX_HP;
    this.levelFails = 0;
    this.strokes = []; this.curStroke = null; this.inkUsed = 0;
    this.inkBudget = L.ink;
    this.mode = 'draw';
    this.trail = [];

    this.segs = [];
    (L.walls || []).forEach(([x, y, w, h]) => this._rectSegs(x, y, w, h));
    this.spikes = (L.spikes || []).map(([x, by, w]) => ({ x, by, w }));
    this.noDraw = (L.noDraw || []).map(([x, y, w, h]) => ({ x, y, w, h }));
    this.levers = (L.levers || []).map(([px, py, len, av, ph]) => ({ px, py, len, av, ph: ph || 0 }));
    this.well = { x: L.well[0], y: L.well[1], r: L.well[2] };
    this.source = { x: L.source[0], y: L.source[1] };

    this._resetDrop();

    window.GameHUD?.setHearts(this.hp, C.MAX_HP);
    window.GameHUD?.setScore(`${this.score}/${C.TOTAL_LEVELS}`);
    window.GameHUD?.setObjective(`【第${idx + 1}关·${L.name}】 画墨线把水引进墨井`);

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
    this.drop.vx = 0; this.drop.vy = 0; this.mode = 'draw'; this.trail = [];
  }
  _release() {
    if (this.mode !== 'draw') return;
    this.mode = 'run'; this.drop.vx = 0; this.drop.vy = 0;
    window.GameAudio?.play('release');
  }

  _failAttempt(reason) {
    if (this.mode !== 'run') return;
    const C = window.Ink.Config;
    this.hp -= 1; this.levelFails += 1;
    window.GameHUD?.setHearts(Math.max(0, this.hp), C.MAX_HP);
    this._splash(this.drop.x, this.drop.y, reason === 'spike' ? C.COLOR.SPIKE : C.COLOR.WATER, 12);
    window.GameAudio?.play('splashBad');
    this._shake(0.12, 0.006);
    if (this.hp <= 0) { this._lose(); return; }
    this._resetDrop();
    if (this._auto) { this._autoState = 'draw'; this._autoTimer = 0.5; }
  }

  _clearLevel() {
    const C = window.Ink.Config, L = window.Ink.LEVELS[this.level];
    this.score += 1;
    window.GameHUD?.setScore(`${this.score}/${C.TOTAL_LEVELS}`);

    // juice：顿帧 + 多层水花 + 轻微震屏（无星级、无存档）
    this._hitStop = this.reducedMotion ? 0 : 0.09;
    this._splash(this.well.x, this.well.y, C.COLOR.WATER, 22);
    window.GameAudio?.play('splashGood');
    this._shake(0.1, 0.004);
    this.mode = 'draw';

    if (this._auto) {                              // bot：顺序自动推进，保持 won 契约
      if (this.score >= C.TOTAL_LEVELS) { this._win(); return; }
      this.time.delayedCall(500, () => this._loadLevel(this.level + 1, false));
      return;
    }

    const isLast = this.level + 1 >= C.TOTAL_LEVELS;
    if (isLast) { this.time.delayedCall(this._hitStop * 1000 + 400, () => this._win()); return; }

    // 单关即时反馈（不存档、不累星）+ 折进下一关叙事卡，一次点击过渡
    const eff = this.inkUsed <= L.par ? '墨量精简 ✓' : '墨量偏多，可画得更省 ·';
    const flaw = this.levelFails === 0 ? ' 一次成功 ✓' : ` 重试 ${this.levelFails} 次`;
    const nextL = window.Ink.LEVELS[this.level + 1];
    this.time.delayedCall(this._hitStop * 1000 + 350, () => {
      this._loadLevel(this.level + 1, false);
      this._showCard(nextL.intro[0], `上关：${eff}${flaw}\n\n${nextL.intro[1]}`, null, '下一关');
    });
  }

  // ── 叙事 / 结算卡 ──
  _showCard(title, body, cb, btnLabel) {
    const C = window.Ink.Config, COL = C.COLOR;
    this.cardActive = true;
    this._pendingCardCb = cb;
    const cont = this.add.container(0, 0).setDepth(200);
    const dim = this.add.rectangle(0, 0, C.GAME_W, C.GAME_H, 0x0c1422, 0.72).setOrigin(0, 0);
    const panel = this.add.rectangle(C.GAME_W / 2, C.GAME_H / 2, 580, 250, COL.PAPER, 0.98).setStrokeStyle(2, COL.INK, 0.9);
    const t = this.add.text(C.GAME_W / 2, C.GAME_H / 2 - 86, title, { fontFamily: 'Segoe UI, sans-serif', fontSize: '26px', color: '#21384f', fontStyle: 'bold' }).setOrigin(0.5);
    const b = this.add.text(C.GAME_W / 2, C.GAME_H / 2 - 6, body, { fontFamily: 'Segoe UI, sans-serif', fontSize: '15px', color: '#3a4a63', align: 'center', lineSpacing: 7, wordWrap: { width: 520 } }).setOrigin(0.5);
    const hint = this.add.text(C.GAME_W / 2, C.GAME_H / 2 + 100, `空格 / 回车 / 点击 ${btnLabel || '继续'}`, { fontFamily: 'Segoe UI, sans-serif', fontSize: '13px', color: '#7a8aa0' }).setOrigin(0.5);
    cont.add([dim, panel, t, b, hint]);
    this.cardGfx = cont;
    this.input.keyboard.once('keydown-SPACE', () => this._advanceCard());
    this.input.keyboard.once('keydown-ENTER', () => this._advanceCard());
    if (this._auto) this.time.delayedCall(500, () => this._advanceCard());
  }
  _advanceCard() {
    if (!this.cardActive) return;
    this.cardActive = false;
    this._suppressRelease = true;
    if (this.cardGfx) { this.cardGfx.destroy(); this.cardGfx = null; }
    const cb = this._pendingCardCb; this._pendingCardCb = null;
    window.GameAudio?.play('ui');
    if (cb) cb();
  }

  // ── juice helpers ──
  _splash(x, y, color, n) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * 6.28, sp = 30 + Math.random() * 150;
      const dot = this.add.circle(x, y, 2 + Math.random() * 3, color, 0.9).setDepth(14);
      this.tweens.add({ targets: dot, x: x + Math.cos(a) * sp, y: y + Math.sin(a) * sp, alpha: 0, duration: 460, onComplete: () => dot.destroy() });
    }
  }
  _shake(dur, intensity) { if (!this.reducedMotion) this.cameras.main.shake(dur * 1000, intensity); }

  _win() {
    if (this.gameOver) return;
    this.gameOver = true; this.gameStarted = false;
    window.GameAudio?.play('win');
    window.GameHUD?.showGameOver(true, '最后一滴墨水顺着你画的线落进井底，整张蓝图的水路同时连通——引流完成。');
  }
  _lose() {
    if (this.gameOver) return;
    this.gameOver = true; this.gameStarted = false;
    window.GameAudio?.play('lose');
    window.GameHUD?.showGameOver(false, '机会用尽，墨水终究没能被引进井里，蓝图上留下一摊散开的墨渍……');
  }

  // ── 主循环 ──
  update(_t, dms) {
    const dt = Math.min(dms, 50) / 1000;
    this._t += dt;
    const playing = this.gameStarted && !this.gameOver && !this.cardActive;

    if (Phaser.Input.Keyboard.JustDown(this.kkeys.M)) window.GameAudio?.toggle();   // 单键静音，无菜单

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

    // 顿帧：命中井后短暂冻结物理，强化打击感
    if (this._hitStop > 0) { this._hitStop -= dt; }
    else if (playing && this.mode === 'run') {
      // 尾迹采样
      this.trail.push({ x: this.drop.x, y: this.drop.y });
      if (this.trail.length > (this.reducedMotion ? 0 : 9)) this.trail.shift();
      const ev = window.Ink.Physics.step(this, dt);
      if (ev === 'clear') this._clearLevel();
      else if (ev && ev.fail) this._failAttempt(ev.fail);
    }

    window.Ink.Render.draw(this);
  }

  // 自动试玩：画预设解线 → 放水
  _autoTick(dt) {
    if (this._autoState !== 'draw') return;
    const sol = window.Ink.AUTO_SOLUTIONS[this.level] || window.Ink.AUTO_SOLUTIONS[0];
    this._autoTimer -= dt;
    if (this._autoTimer > 0) return;
    this.strokes = [];
    const pts = []; let len = 0; const seg = 24;
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

  // ── __probe 契约（经 Ink.Game 暴露）──
  probe() {
    const C = window.Ink.Config;
    return {
      x: this.drop.x, y: this.drop.y, topdown: true,
      moveX: 0, moveY: 0, attack: false,
      hp: this.hp, maxHp: C.MAX_HP,
      score: this.score, goalScore: C.TOTAL_LEVELS, phase: this.level, act: this.level,
      deaths: C.MAX_HP - this.hp, deathBudget: C.MAX_HP,
      won: this.gameOver && this.score >= C.TOTAL_LEVELS,
      lost: this.gameOver && this.score < C.TOTAL_LEVELS,
      cardActive: this.cardActive, started: this.gameStarted,
      mode: this.mode,
    };
  }
}
window.Ink.LevelScene = LevelScene;
