/* ShadowNinja — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(ShadowNinjaScene.prototype, {

  _reachCell() {
    if (!this.gameStarted || this.gameOver || this.rescued || this.cardActive) return;
    if (this.score >= GOAL_SCORE) this._startEscape();
    else window.GameHUD?.setObjective(`牢锁还需 ${GOAL_SCORE - this.score} 把门钥`);
  },


  // 高潮：救出师弟 → 警报 → 限时逃向府门
  _startEscape() {
    this.rescued = true; this.reachedCell = true;
    this.friend.setAlpha(0.85).setPosition(this.player.x - 34, this.player.y);
    this.exit.setVisible(true);
    this._showCard('救出师弟！',
      '铁锁应声而开，师弟跌出牢笼。\n开锁声惊动了守卫——警钟骤响，整座将军府正在苏醒！\n趁铁闸尚能穿过，带他冲向府门，逃离这里！',
      () => {
        this.escaping = true; this.gameStarted = true; this._updateObjective();
        this.cameras.main.shake(400, 0.012);
        // 警报：逃脱段增设扫射探照灯（蹲伏可避），避开铁闸候门点以免不公
        this.lights.push({ x: 4180, phase: 0.4 }, { x: 4620, phase: 1.2 });
      });
  },


  _reachExit() {
    if (!this.escaping || this.gameOver || this.cardActive) return;
    this._win();
  },


  _win() {
    this.gameOver = true; this.escaped = true; this.gameStarted = false; this.player.setVelocity(0, 0);
    this._showCard('归 家',
      '两道黑影翻出府门，融入夜色，将军府的灯火在身后渐渐远去——\n师兄弟，平安归家。',
      () => window.GameHUD?.showGameOver(true, '师弟重获自由，师兄弟平安归家。'));
  },


  _lose() {
    if (this.gameOver) return;
    this.gameOver = true; this.gameStarted = false; this.player.setVelocity(0, 0);
    window.GameHUD?.showGameOver(false, '一次次失手惊动了整座将军府，警钟长鸣，今夜的营救……功亏一篑。');
  },


  // ── 暴露状态给 verify / autoplay 白盒自测 ───────────────────
  _exposeState() {
    const self = this;
    window.__gameState = { player: this.player };
    // 最近的必拾门钥（未集齐时），bot 据此对位、起身/跳起拾取
    const nearestKey = () => {
      if (self.score >= GOAL_SCORE) return null;
      let best = null, bestD = Infinity;
      self.keys2.getChildren().forEach(k => {
        if (k.active && !k.getData('bonus')) {
          const d = k.x - self.player.x;
          if (d > -24 && Math.abs(d) < bestD) { bestD = Math.abs(d); best = k; }
        }
      });
      return best;
    };
    // 下一目标 x：未集齐则最近未拾门钥，否则牢笼
    const nextGoalX = () => {
      if (self.escaping) return EXIT_X;
      const k = nearestKey();
      return k ? k.x : CELL_X;
    };
    // 前方是否有"关闭中的铁闸"挡路（bot 据此停下等待开启）
    const gateWaitX = () => {
      if (!self.gateList) return null;
      for (const g of self.gateList) {
        const d = g.x - self.player.x;
        if (d > 6 && d < 170 && !g.openNow) return g.x;
      }
      return null;
    };
    window.__probe = () => {
      const p = self.player, t = self.time.now;
      const onGround = p.body.blocked.down || p.body.touching.down;
      const nk = nearestKey();
      return {
        x: p.x, y: p.y, vx: p.body.velocity.x, onGround,
        hp: self.hp, maxHp: self.maxHp, act: self.actIdx, score: self.score, goalScore: GOAL_SCORE,
        deaths: self.deaths, deathBudget: DEATH_BUDGET,
        won: self.gameOver && self.escaped, lost: self.gameOver && !self.escaped,
        cardActive: self.cardActive, started: self.gameStarted,
        rescued: self.rescued, escaping: self.escaping,
        nextGoalX: nextGoalX(), worldW: WORLD_W, cellX: CELL_X, exitX: EXIT_X,
        // 站立时此刻是否危险 / 前方一步是否危险（蹲伏可免）
        dangerNow: self._dangerAt(p.x, p.y, t),
        dangerAhead: self._dangerAt(p.x + 90, p.y, t) || self._dangerAt(p.x + 160, p.y, t),
        gateWaitX: gateWaitX(),   // 非 null = 前方铁闸关闭，应停下等待
        crouch: self.crouch,
        // 起身够钥机制：匍匐够不着高悬门钥，须对位后趁安全间隙起身/跳起拾取
        keyX: nk ? nk.x : null,
        keyNeedJump: nk ? !!nk.getData('jump') : false,
        atKey: nk ? Math.abs(nk.x - p.x) < 16 : false,  // 已对准门钥正下方
      };
    };
    window.__advanceCard = () => self._advanceCard();
  }
});
