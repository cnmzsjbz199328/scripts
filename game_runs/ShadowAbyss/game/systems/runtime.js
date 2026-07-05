/* ShadowAbyss — 剧本运行时：节点解释器（segments/choices/routes/changes/endings）
 * + __probe/__advance/__choose 契约 + 无头自动朝圣者。剧本真源：story/divine-comedy.json。 */
Object.assign(StoryScene.prototype, {

  _initRuntime() {
    this.state = {
      nodeId: null,
      val: STORY.meta.initialVariable || 0,   // 光照
      flags: new Set(),
      achs: new Set(),
      path: [],
      ended: false, endingId: null, won: false,
    };
    this._chapter = 1;
    this._chaptersShown = new Set();
    this._virgilOn = false;
    this._node = null; this._segQueue = []; this._segIdx = -1; this._nodeDone = false;
    this._continueCb = null; this._choicesActive = false; this._cardActive = false;
    this._typing = false; this._endingReady = false;
  },

  _begin() {
    if (this.auto) this.time.addEvent({ delay: AUTO_MS, loop: true, callback: () => this._autoTick() });
    this._enterNode(STORY.startNodeId);
  },

  _enterNode(id) {
    const n = STORY.nodes[id];
    if (!n) { console.error('剧本缺节点:', id); return; }
    this.state.nodeId = id;
    this.state.path.push(id);
    if (id === 'dc_virgil') this._virgilOn = true;              // 维吉尔登场
    if (id === 'dc_heaven_link') this._virgilOn = false;        // 告别之后不再同行
    if (n.isEnding) { this._showEnding(id, n); return; }

    const proceed = () => {
      if (n.scene) this._setScene(n.scene);
      this._updateProgress(n.progress);
      this._queueNode(n);
    };
    if (n.chapterTitle && !this._chaptersShown.has(n.chapterTitle)) {
      this._chaptersShown.add(n.chapterTitle);
      this._chapter = { 'Ⅰ': 1, 'Ⅱ': 2, 'Ⅲ': 3, 'Ⅳ': 4 }[CHAPTER_NUMERALS[n.chapterTitle]] || this._chapter;
      this._showChapterCard(n.chapterTitle, proceed);
    } else proceed();
  },

  _queueNode(n) {
    this._node = n; this._nodeDone = false;
    this._resetGuest();
    this._segQueue = [];
    if (n.scene && n.scene.arrival) this._segQueue.push({ text: n.scene.arrival, arrival: true });
    for (const s of (n.segments || [])) this._segQueue.push(s);
    this._segIdx = -1;
    this._clearChoices();
    this._nextSegment();
  },

  _nextSegment() {
    if (!this._node || this._nodeDone) return;
    this._segIdx++;
    if (this._segIdx < this._segQueue.length) {
      this._renderSegment(this._segQueue[this._segIdx]);
      return;
    }
    this._nodeDone = true;
    const n = this._node;
    if (n.choices && n.choices.length) this._renderChoices(n.choices);
    else if (n.routes) this._renderContinue(() => this._enterNode(this._evalRoutes(n.routes)));
    else this._renderContinue(() => {});   // 剧本校验保证不会走到（每节点必有出口）
  },

  // ── 统一推进：SPACE/ENTER/点击空白。抉择须显式选择。 ──
  _advance() {
    if (this.state.ended) { this._endingAdvance(); return; }
    if (this._cardActive) { this._dismissChapterCard(); return; }
    if (this._choicesActive) return;
    if (this._typing) { this._completeTyping(); return; }
    if (this._continueCb) { const cb = this._continueCb; this._continueCb = null; this._setHint(''); cb(); return; }
    this._nextSegment();
  },

  _choose(i) {
    if (!this._choicesActive || !this._node || !this._node.choices) return;
    const c = this._node.choices[i];
    if (!c) return;
    this._applyChanges(c.changes);
    this._clearChoices();
    this._enterNode(c.next);
  },

  _applyChanges(ch) {
    if (!ch) return;
    if (typeof ch.val === 'number') {
      this.state.val = Math.max(0, this.state.val + ch.val);
      this._floatVal(ch.val);
      this._updateLightHud();
    }
    if (ch.addFlag) this.state.flags.add(ch.addFlag);
    if (ch.unlockAchievement) this._unlockAch(ch.unlockAchievement);
  },

  // ── routes 条件："val >= 70" / "hasFlag 'x'" / "default" ──
  _evalRoutes(routes) {
    for (const r of routes) if (this._evalCond(r.condition)) return r.next;
    return routes[routes.length - 1].next;
  },

  _evalCond(c) {
    if (!c || c === 'default') return true;
    let m = c.match(/^val\s*(>=|<=|>|<|==)\s*(-?\d+)$/);
    if (m) {
      const v = this.state.val, n = +m[2];
      return m[1] === '>=' ? v >= n : m[1] === '<=' ? v <= n : m[1] === '>' ? v > n : m[1] === '<' ? v < n : v === n;
    }
    m = c.match(/^(!?)hasFlag\s+'([^']+)'$/);
    if (m) return m[1] ? !this.state.flags.has(m[2]) : this.state.flags.has(m[2]);
    console.warn('未知路由条件:', c);
    return false;
  },

  _unlockAch(id) {
    if (this.state.achs.has(id)) return;
    this.state.achs.add(id);
    const a = STORY.achievements[id];
    this._toast('✦ 成就 · ' + (a ? a.title : id));
  },

  // ── 无头/自动模式：朝圣者策略（避开直通结局的捷径 → 优先拿旗标 → 光照增益最大） ──
  _autoTick() {
    if (this.state.ended) { if (this._endingReady) this._endingAdvance(); return; }
    if (this._cardActive) { this._dismissChapterCard(); return; }
    if (this._choicesActive) { this._choose(this._autoPick(this._node.choices)); return; }
    if (this._typing) { this._completeTyping(); return; }
    if (this._continueCb) { const cb = this._continueCb; this._continueCb = null; cb(); return; }
    this._nextSegment();
  },

  _autoPick(cs) {
    let pool = cs.filter(c => !(STORY.nodes[c.next] && STORY.nodes[c.next].isEnding));
    if (!pool.length) pool = cs;
    const flagged = pool.filter(c => c.changes && (c.changes.addFlag || c.changes.unlockAchievement));
    if (flagged.length) pool = flagged;
    let best = pool[0], bv = -Infinity;
    for (const c of pool) { const v = (c.changes && c.changes.val) || 0; if (v > bv) { bv = v; best = c; } }
    return cs.indexOf(best);
  },

  // ── 对外契约（verify / playtest / 调试） ──
  _exposeContract() {
    const self = this;
    window.__probe = () => ({
      nodeId: self.state.nodeId,
      val: self.state.val,
      flags: [...self.state.flags],
      achievements: [...self.state.achs],
      progress: (self._node && self._node.progress) || 0,
      choicesOpen: self._choicesActive,
      ended: self.state.ended, endingId: self.state.endingId, won: self.state.won,
      pathLen: self.state.path.length,
    });
    window.__advance = () => self._advance();
    window.__choose = (i) => self._choose(i);
    window.__gameState = self.state;
  },
});
