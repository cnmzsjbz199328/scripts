/* game/scenes/LevelScene.js — 玩法本体（箱内爬行）
 * ─────────────────────────────────────────────────────────────────────────
 * 状态机 + 输入 + 关流程 + juice + _auto 自驱 + probe()。
 * 物理只是「沿轨道一维推进 s + 折线采样」——纯 BC.Path / BC.Crawler / BC.Hazards。
 * __probe / __gameState 契约经 BC.Game 暴露，回归安全网照抄不可漏。
 */
window.BC = window.BC || {};

class LevelScene extends Phaser.Scene {
  constructor() { super('LevelScene'); }

  init(data) { this._startIdx = (data && data.idx) || 0; }

  create() {
    const C = window.BC.Config;
    window.BC.Game.active = this;
    window.__scene = this;

    this.score = 0;                 // 已通过的舱数
    this.level = this._startIdx;
    this.hp = C.MAX_HP;
    this.gameStarted = true;
    this.gameOver = false;
    this.cardActive = false;
    this._pendingCardCb = null;
    this._t = 0; this._dt = 0.016;
    this._levelT = 0;
    this._hitStop = 0;
    this._invulnT = 0;
    this._clearing = false;
    this._autoHold = false;
    this.trail = [];
    this.reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._auto = window.BC.Game.auto;

    // 箱体底（LevelScene 自己也画一次，覆盖 BootScene 的）
    window.BC.Render.drawCrate(this.add.graphics().setDepth(-100), C);
    this.gfx = this.add.graphics().setDepth(5);
    this.cardGfx = null;

    // 爬行者精灵
    this.sprite = this.add.sprite(0, 0, 'crawler', C.SPRITE.CRAWL_START)
      .setOrigin(0.5, C.SPRITE.ORIGIN_Y)
      .setScale(C.SPRITE.SCALE)
      .setDepth(20);

    // 有实时 x/y 的爬行者对象（verify L2 / playtest 契约）
    this.player = { x: 0, y: 0, vx: 0, vy: 0 };
    window.__gameState = { player: this.player };

    this.cstate = { s: 0, dir: 1, mode: 'crawl', turnLockT: 0, moving: false, cornerIdx: -1 };
    this._cornerTurnActive = false;
    this._cornerTurnSnap = false;
    this._cornerTurnS = 0;
    this._cornerTurnAnchorS = 0;

    this._setupInput();
    // The first playable scene is the corner test level; skip the story card
    // so a reload immediately presents a controllable test surface.
    this._loadLevel(this.level, false);

    this.events.once('shutdown', () => { if (window.BC.Game.active === this) window.BC.Game.active = null; });
  }

  // ── 输入 ──
  _setupInput() {
    this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,A,D,R,M,SPACE,ENTER');
    this.input.mouse && this.input.mouse.disableContextMenu();
    this.input.on('pointerdown', () => { if (this.cardActive) this._advanceCard(); });
  }

  // ── 关卡装载 ──
  _loadLevel(idx, showCard) {
    const C = window.BC.Config, P = window.BC.Path, L = window.BC.LEVELS[idx];
    this.level = idx;
    this.hp = C.MAX_HP;
    this._levelT = 0;
    this._clearing = false;
    this._autoHold = false;
    this.trail = [];

    this.pathPts = L.path;
    this.pathLen = P.length(L.path);
    this.corners = P.corners(L.path).filter(c => c.deg >= C.CORNER_MIN_DEG);
    this.sExit = (L.sExit != null) ? L.sExit : this.pathLen;
    this.exitPos = P.sample(L.path, this.sExit);

    this.needCells = L.needCells || 0;
    this.cells = (L.cells || []).map(s => ({ s, got: false }));
    this.strips = (L.strips || []).map(x => Object.assign({}, x));
    this.rival = L.rival ? Object.assign({}, L.rival) : null;
    this._exitArmed = this.needCells === 0;

    this.cstate.s = L.startS || 0;
    this.cstate.dir = 1;
    this.cstate.mode = 'crawl';
    this.cstate.turnLockT = 0;
    this.cstate.moving = false;
    this.cstate.cornerIdx = -1;
    this._cornerTurnActive = false;
    this._cornerTurnSnap = false;
    this._cornerTurnS = this.cstate.s;
    this._cornerTurnAnchorS = this.cstate.s;

    this.sprite.setFlipX(false);
    this.sprite.play('crawl');
    this.sprite.anims.pause();
    this._syncSprite(true);

    window.GameHUD && window.GameHUD.setHearts(this.hp, C.MAX_HP);
    window.GameHUD && window.GameHUD.setScore(`${this.score}/${C.TOTAL_LEVELS}`);
    window.GameHUD && window.GameHUD.setObjective(
      this.needCells
        ? `【第${idx + 1}舱·${L.name}】 ${L.obj}（电池 0/${this.needCells}）`
        : `【第${idx + 1}舱·${L.name}】 ${L.obj}`,
    );

    if (showCard) this._showCard(L.intro[0], L.intro[1], null, '开爬');
  }

  // ── 精灵位姿同步（顺带更新契约用的 player.x/y）──
  // snap=true 立刻对齐角度（装载/重生）；否则朝目标角快速转（过拐角不瞬转）
  _syncSprite(snap) {
    // The corner-turn frames contain their own body translation. Keep the
    // track anchor at the vertex while they play; advancing the polyline at
    // the same time makes the character appear to step forward, retract,
    // then snap into the outgoing wall.
    // Keep gameplay/hazard coordinates on the logical path point, while the
    // corner pose itself is rendered slightly back along the incoming rail.
    // At the lower-right corner this is the small leftward move needed for
    // the hands to brace the wall without the silhouette crossing it.
    const logicalP = window.BC.Path.sample(this.pathPts, this.cstate.s);
    const visualS = this._cornerTurnActive ? this._cornerTurnAnchorS : this.cstate.s;
    const visualP = window.BC.Path.sample(this.pathPts, visualS);
    this.sprite.x = visualP.x;
    this.sprite.y = visualP.y;
    if (snap) this.sprite.rotation = logicalP.angle;
    else if (this._cornerTurnActive) {
      // cornerTurnCCW already contains the visual horizontal -> vertical
      // body transition. Do not rotate those frames a second time with the
      // polyline; hold the incoming wall angle until the hand-off is done.
    } else if (this._cornerTurnSnap) {
      this.sprite.rotation = logicalP.angle;
      this._cornerTurnSnap = false;
    } else this.sprite.rotation = Phaser.Math.Angle.RotateTo(this.sprite.rotation, logicalP.angle, 14 * this._dt);
    this.player.x = logicalP.x;
    this.player.y = logicalP.y;
    this._segIdx = logicalP.seg;
  }

  _updateAnim(res) {
    const sp = this.sprite, st = this.cstate;
    let cur = sp.anims.currentAnim && sp.anims.currentAnim.key;
    if (res.event === 'corner') {
      this._cornerTurnS = this.corners[this.cstate.cornerIdx]?.s ?? this.cstate.s;
      this.cstate.s = this._cornerTurnS;
      this._cornerTurnAnchorS = Math.max(0, this._cornerTurnS - window.BC.Config.CORNER_TURN_RETRACT_S);
      this._cornerTurnActive = true;
    }
    if (st.mode === 'turn') {
      this._cornerTurnActive = false;
      if (cur !== 'turnAround') sp.play('turnAround');
    } else if (this._cornerTurnActive) {
      if (cur !== 'cornerTurnCCW') sp.play('cornerTurnCCW', true);
      else if (!sp.anims.isPlaying) {
        this._cornerTurnActive = false;
        // The first crawl pose has a different local body anchor. Start it a
        // short distance along the outgoing segment so its visual contact
        // point meets the final corner pose instead of appearing to retreat.
        this.cstate.s = Math.min(this.pathLen, this._cornerTurnS + window.BC.Config.CORNER_HANDOFF_S);
        this._cornerTurnSnap = true;
        // The next crawl frame uses the outgoing wall angle. Its visual
        // anchor is aligned below when the hand-off is rendered.
        sp.play('crawl', true);
      }
      // Keep the final corner pose visible until this hand-off frame. The
      // normal crawl animation starts only once the outgoing wall advances.
    } else if (st.moving) {
      if (cur !== 'crawl') sp.play('crawl');
      else if (!sp.anims.isPlaying) sp.anims.resume();
    } else {
      if (sp.anims.isPlaying && cur === 'crawl') sp.anims.pause();
    }
    if (st.mode !== 'turn') sp.setFlipX(st.dir < 0);
  }

  // ── 自动试玩：就近取 cell → 只在尖刺整段穿越时间内都缩回时才起步 → 冲舱口
  //    （forward-only，保 won 契约；probe 报 locked 让 stuck 检测不误判等待）──
  _autoInput(dt) {
    const C = window.BC.Config, H = window.BC.Hazards;
    this._autoHold = false;
    const pend = this.cells.filter(c => !c.got).map(c => c.s).sort((a, b) => a - b);
    const target = pend.length ? pend[0] : this.sExit;
    const s = this.cstate.s;
    const dir = target > s + 2 ? 1 : (target < s - 2 ? -1 : 1);
    const speed = C.CRAWL_SPEED * C.AUTO_SPEED_MULT;
    const t = this._levelT;

    // 尖刺：正在进入 / 位于某段危险区时，要求「从现在起、穿完整段所需时间内」它始终缩回
    for (const st of this.strips) {
      const lo = st.s0 - C.HAZARD_GAP, hi = st.s1 + C.HAZARD_GAP;
      const engaging = dir > 0 ? (s + C.HAZARD_GAP > lo && s < hi) : (s - C.HAZARD_GAP < hi && s > lo);
      if (!engaging) continue;
      const crossT = Math.max(0.1, Math.abs(hi - s)) / speed + 0.18;
      let clear = true;
      for (let k = 0; k <= 6; k++) if (H.stripOut(st, t + crossT * k / 6)) { clear = false; break; }
      if (!clear) { this._autoHold = true; return 0; }
    }

    // 巡逻者：一步 gap 内危险 → 停
    if (this.rival) {
      const g = C.HAZARD_GAP;
      if (H.dangerAt(s + dir * 10, null, this.rival, t, g) || H.dangerAt(s + dir * g, null, this.rival, t, g)) {
        this._autoHold = true; return 0;
      }
    }
    return dir;
  }

  // ── 事件后果 ──
  _onCell(c) {
    const C = window.BC.Config, L = window.BC.LEVELS[this.level];
    window.GameAudio && window.GameAudio.play('unlock');
    const p = window.BC.Path.sample(this.pathPts, c.s);
    this._splash(p.x, p.y, C.COLOR.CELL, 10);
    const got = this.cells.filter(x => x.got).length;
    window.GameHUD && window.GameHUD.setObjective(`【第${this.level + 1}舱·${L.name}】 ${L.obj}（电池 ${got}/${this.needCells}）`);
    if (got >= this.needCells) window.GameAudio && window.GameAudio.play('ui');
  }

  _onHit() {
    const C = window.BC.Config;
    this.hp -= 1;
    window.GameHUD && window.GameHUD.setHearts(Math.max(0, this.hp), C.MAX_HP);
    this._splash(this.player.x, this.player.y, C.COLOR.STRIP, 14);
    window.GameAudio && window.GameAudio.play('splashBad');
    this._shake(0.14, 0.006);
    this._hitStop = this.reducedMotion ? 0 : 0.06;
    this._invulnT = C.RESPAWN_INVULN_MS / 1000;
    if (this.hp <= 0) { this._lose(); return; }
    this._respawn();
  }

  _respawn() {
    const L = window.BC.LEVELS[this.level];
    this.cstate.s = L.startS || 0;
    this.cstate.dir = 1;
    this.cstate.mode = 'crawl';
    this.cstate.turnLockT = 0;
    this.cstate.moving = false;
    this.cstate.cornerIdx = -1;
    this._cornerTurnActive = false;
    this._cornerTurnSnap = false;
    this._cornerTurnS = this.cstate.s;
    this._cornerTurnAnchorS = this.cstate.s;
    this.trail = [];
    this.sprite.setFlipX(false);
    this._syncSprite(true);
  }

  _clearLevel() {
    const C = window.BC.Config;
    this._clearing = true;
    this.score += 1;
    window.GameHUD && window.GameHUD.setScore(`${this.score}/${C.TOTAL_LEVELS}`);
    this._hitStop = this.reducedMotion ? 0 : 0.08;
    this._splash(this.exitPos.x, this.exitPos.y, C.COLOR.EXIT, 22);
    window.GameAudio && window.GameAudio.play('splashGood');
    this._shake(0.1, 0.004);

    if (this.score >= C.TOTAL_LEVELS) {
      this.time.delayedCall(this._hitStop * 1000 + 320, () => this._win());
      return;
    }
    if (this._auto) {
      this.time.delayedCall(420, () => { this._loadLevel(this.level + 1, false); });
      return;
    }
    const nextL = window.BC.LEVELS[this.level + 1];
    this.time.delayedCall(this._hitStop * 1000 + 300, () => {
      this._loadLevel(this.level + 1, false);
      this._showCard(nextL.intro[0], `上一舱通过 ✓\n\n${nextL.intro[1]}`, null, '下一舱');
    });
  }

  // ── 叙事 / 结算卡 ──
  _showCard(title, body, cb, btnLabel) {
    const C = window.BC.Config;
    this.cardActive = true;
    this._pendingCardCb = cb || null;
    const cont = this.add.container(0, 0).setDepth(200);
    const dim = this.add.rectangle(0, 0, C.GAME_W, C.GAME_H, 0x0a0704, 0.78).setOrigin(0, 0);
    const panel = this.add.rectangle(C.GAME_W / 2, C.GAME_H / 2, 580, 250, 0x241b12, 0.98).setStrokeStyle(2, 0x8fd3ff, 0.85);
    const t = this.add.text(C.GAME_W / 2, C.GAME_H / 2 - 88, title, { fontFamily: 'Segoe UI, sans-serif', fontSize: '25px', color: '#8fd3ff', fontStyle: 'bold' }).setOrigin(0.5);
    const b = this.add.text(C.GAME_W / 2, C.GAME_H / 2 - 4, body, { fontFamily: 'Segoe UI, sans-serif', fontSize: '15px', color: '#f3e9d8', align: 'center', lineSpacing: 7, wordWrap: { width: 520 } }).setOrigin(0.5);
    const hint = this.add.text(C.GAME_W / 2, C.GAME_H / 2 + 100, `空格 / 回车 / 点击 ${btnLabel || '继续'}`, { fontFamily: 'Segoe UI, sans-serif', fontSize: '13px', color: '#9bb0c4' }).setOrigin(0.5);
    cont.add([dim, panel, t, b, hint]);
    this.cardGfx = cont;
    this.input.keyboard.once('keydown-SPACE', () => this._advanceCard());
    this.input.keyboard.once('keydown-ENTER', () => this._advanceCard());
    if (this._auto) this.time.delayedCall(500, () => this._advanceCard());
  }

  _advanceCard() {
    if (!this.cardActive) return;
    this.cardActive = false;
    if (this.cardGfx) { this.cardGfx.destroy(); this.cardGfx = null; }
    const cb = this._pendingCardCb; this._pendingCardCb = null;
    window.GameAudio && window.GameAudio.play('ui');
    if (cb) cb();
  }

  // ── juice ──
  _splash(x, y, color, n) {
    if (this.reducedMotion) n = Math.min(n, 4);
    for (let k = 0; k < n; k++) {
      const a = Math.random() * 6.28, sp = 28 + Math.random() * 140;
      const dot = this.add.circle(x, y, 2 + Math.random() * 3, color, 0.9).setDepth(24);
      this.tweens.add({ targets: dot, x: x + Math.cos(a) * sp, y: y + Math.sin(a) * sp, alpha: 0, duration: 440, onComplete: () => dot.destroy() });
    }
  }
  _shake(dur, intensity) { if (!this.reducedMotion) this.cameras.main.shake(dur * 1000, intensity); }

  _win() {
    if (this.gameOver) return;
    this.gameOver = true; this.gameStarted = false;
    window.GameAudio && window.GameAudio.play('win');
    window.GameHUD && window.GameHUD.showGameOver(true, '最后一撑，你翻过箱口的边缘落到外面——四道内壁总算爬到了头。');
  }
  _lose() {
    if (this.gameOver) return;
    this.gameOver = true; this.gameStarted = false;
    window.GameAudio && window.GameAudio.play('lose');
    window.GameHUD && window.GameHUD.showGameOver(false, '四肢一软，你从内壁滑落回箱底——这一舱，没能爬出去。');
  }

  // ── 主循环 ──
  update(_t, dms) {
    const C = window.BC.Config;
    const dt = Math.min(dms, 50) / 1000;
    this._dt = dt;
    this._t += dt;

    if (Phaser.Input.Keyboard.JustDown(this.keys.M)) window.GameAudio && window.GameAudio.toggle();

    const playing = this.gameStarted && !this.gameOver && !this.cardActive;

    if (this._hitStop > 0) { this._hitStop -= dt; window.BC.Render.draw(this); return; }

    if (playing) {
      this._levelT += dt;
      if (this._invulnT > 0) this._invulnT -= dt;

      let input = 0;
      if (this._auto) {
        input = this._autoInput(dt);
      } else {
        if (Phaser.Input.Keyboard.JustDown(this.keys.R)) this._respawn();
        const goL = this.keys.LEFT.isDown || this.keys.A.isDown;
        const goR = this.keys.RIGHT.isDown || this.keys.D.isDown;
        input = (goR ? 1 : 0) - (goL ? 1 : 0);
      }

      // A corner animation is a short forward-only movement lock. If the
      // player reverses during it, cancel the pending forward hand-off before
      // it can apply CORNER_HANDOFF_S and start the normal turn lock instead.
      // Otherwise the reverse input is ignored for a few frames and the next
      // crawl pose appears to fall off the rail, then jump back to the vertex.
      if (this._cornerTurnActive && input !== 0 && input !== this.cstate.dir) {
        this._cornerTurnActive = false;
        this._cornerTurnSnap = false;
        this.cstate.cornerIdx = -1;
        this.cstate.mode = 'turn';
        this.cstate.turnLockT = C.TURN_LOCK_MS / 1000;
        this.cstate.dir = input;
        this.cstate.moving = false;
      }

      const res = this._cornerTurnActive
        ? { state: this.cstate, event: null, slow: true, moving: false }
        : window.BC.Crawler.advance(this.cstate, input, dt, {
          speed: C.CRAWL_SPEED * (this._auto ? C.AUTO_SPEED_MULT : 1),
          pathLen: this.pathLen,
          corners: this.corners,
          cornerWindow: C.CORNER_WINDOW,
          cornerSlow: C.CORNER_SLOW,
          turnLockMs: C.TURN_LOCK_MS,
        });

      if (res.event === 'turn') window.GameAudio && window.GameAudio.play('ui');
      else if (res.event === 'corner') { window.GameAudio && window.GameAudio.play('tick'); this._shake(0.05, 0.0016); }

      this._updateAnim(res);
      this._syncSprite();

      if (!this.reducedMotion && res.moving) {
        this.trail.push({ x: this.player.x, y: this.player.y });
        if (this.trail.length > 8) this.trail.shift();
      } else if (this.trail.length) {
        this.trail.shift();
      }

      // 电池
      for (const c of this.cells) {
        if (!c.got && Math.abs(this.cstate.s - c.s) < C.CELL_PICK_R) { c.got = true; this._onCell(c); }
      }
      this._exitArmed = this.cells.filter(c => c.got).length >= this.needCells;

      // 危险命中
      if (this._invulnT <= 0 && !this._clearing) {
        const ht = window.BC.Hazards.hitTest(this.cstate.s, this.strips, this.rival, this._levelT, C.HAZARD_GAP);
        if (ht.hit) this._onHit(ht.kind);
      }

      // 过关
      if (!this._clearing && this._exitArmed && this.cstate.s >= this.sExit - 6) this._clearLevel();
    }

    window.BC.Render.draw(this);
  }

  // ── __probe 契约（经 BC.Game 暴露）──
  probe() {
    const C = window.BC.Config;
    const pathLen = this.pathLen || 1;
    const frac = Phaser.Math.Clamp(this.cstate.s / pathLen, 0, 1);
    const globalX = this.level * 1000 + frac * 1000;

    const pend = this.cells.filter(c => !c.got).map(c => c.s).sort((a, b) => a - b);
    const targetS = pend.length ? pend[0] : this.sExit;
    const goalX = this.level * 1000 + Phaser.Math.Clamp(targetS / pathLen, 0, 1) * 1000;

    const H = window.BC.Hazards;
    const dNow = H.dangerAt(this.cstate.s, this.strips, this.rival, this._levelT, C.HAZARD_GAP);
    const ahead = this.cstate.s + this.cstate.dir * 44;
    const dAhead = H.dangerAt(ahead, this.strips, this.rival, this._levelT, C.HAZARD_GAP);

    return {
      x: globalX, y: 0,
      worldW: C.TOTAL_LEVELS * 1000,
      cellX: C.TOTAL_LEVELS * 1000,
      nextGoalX: goalX,
      progress: frac,
      segment: this._segIdx || 0,
      locked: this.cstate.mode === 'turn' || !!this._autoHold || this._invulnT > 0 || this._clearing,
      dangerNow: !!dNow, dangerAhead: !!dAhead,
      hp: this.hp, maxHp: C.MAX_HP,
      score: this.score, goalScore: C.TOTAL_LEVELS,
      phase: this.level, act: this.level,
      deaths: C.MAX_HP - this.hp, deathBudget: C.MAX_HP,
      won: this.gameOver && this.score >= C.TOTAL_LEVELS,
      lost: this.gameOver && this.score < C.TOTAL_LEVELS,
      cardActive: this.cardActive, started: this.gameStarted,
      mode: 'crawl',
    };
  }
}
window.BC.LevelScene = LevelScene;
