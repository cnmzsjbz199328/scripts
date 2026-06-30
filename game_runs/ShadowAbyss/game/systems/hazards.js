/* ShadowAbyss — 危害系统：横向风 / 坠落物 / 巡逻怪 / 地面危害 / 抉择点。
 * 数据驱动：每圈在 levels.js 列出 gusts/fallers/groundHazards/patrollers/soul，本文件读取并实现。
 * bot 可解性：主通道清空（怪可跳越、坠落物稀疏低伤）+ 过圈回血 + 命数充足。 */
Object.assign(AbyssScene.prototype, {

  // ── 程序化危害纹理（坠落物 / 地面危害），零素材 ──
  _makeHazardTextures() {
    const blob = (key, color, w, h, draw) => {
      if (this.textures.exists(key)) return;
      const tex = this.textures.createCanvas(key, w, h), ctx = tex.getContext();
      ctx.fillStyle = color; draw(ctx); tex.refresh();
    };
    blob('hz_boulder', '#0b0d12', 40, 40, c => { c.beginPath(); c.arc(20, 20, 18, 0, 7); c.fill(); c.fillStyle = '#05060a'; c.beginPath(); c.arc(14, 15, 4, 0, 7); c.arc(27, 24, 5, 0, 7); c.fill(); });
    blob('hz_mud', '#241a10', 30, 24, c => { c.beginPath(); c.ellipse(15, 12, 14, 9, 0, 0, 7); c.fill(); });
    blob('hz_ember', '#ff6a2a', 22, 30, c => { c.beginPath(); c.moveTo(11, 0); c.quadraticCurveTo(22, 16, 11, 30); c.quadraticCurveTo(0, 16, 11, 0); c.fill(); c.fillStyle = '#ffd08a'; c.beginPath(); c.arc(11, 20, 4, 0, 7); c.fill(); });
    blob('hz_spike', '#0a0c12', 48, 30, c => { for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(i * 12, 30); c.lineTo(i * 12 + 6, 2); c.lineTo(i * 12 + 12, 30); c.closePath(); c.fill(); } });
    blob('hz_fire', '#ff5a1e', 48, 40, c => { c.beginPath(); c.moveTo(24, 0); c.quadraticCurveTo(46, 22, 30, 40); c.lineTo(18, 40); c.quadraticCurveTo(2, 22, 24, 0); c.fill(); c.fillStyle = '#ffce6a'; c.beginPath(); c.moveTo(24, 14); c.quadraticCurveTo(34, 26, 26, 40); c.lineTo(22, 40); c.quadraticCurveTo(16, 26, 24, 14); c.fill(); });
    blob('hz_bog', '#0a1410', 64, 18, c => { c.globalAlpha = 0.9; c.beginPath(); c.ellipse(32, 9, 31, 8, 0, 0, 7); c.fill(); });
  },

  // ── 搭建本世界所有圈的地面危害 + 巡逻怪 + 坠落区（一次建好） ──
  _buildHazards() {
    this.groundHazards = this.physics.add.staticGroup();
    this.patrollers = this.add.group();
    this.fallers = this.physics.add.group({ allowGravity: true });
    this.fallerZones = [];
    this.hazardPoints = [];        // 供 probe needJump：需跳越的危害 x

    for (const c of this.circles) {
      // 地面危害（跳越）
      for (const g of (c.groundHazards || [])) {
        const key = `hz_${g.type || 'spike'}`;
        const sp = this.groundHazards.create(g.x, FLOOR_Y - 8, key).setOrigin(0.5, 1).setDepth(DEPTH.SOUL);
        const w = g.w || 48;
        sp.setDisplaySize(w, key === 'hz_fire' ? 42 : 28);
        sp.body.setSize(w * 0.7, 22).setOffset((sp.width - w * 0.7) / 2, sp.height - 24);
        if (key === 'hz_fire') this.tweens.add({ targets: sp, scaleY: sp.scaleY * 1.25, duration: 320, yoyo: true, repeat: -1 });
        this.hazardPoints.push(g.x);
      }
      // 巡逻怪（接触伤，可跳越）
      for (const pt of (c.patrollers || [])) {
        const key = pt.type === 'satan' ? 'satan_0' : 'fiend_move_0';
        const m = this.add.sprite(pt.x0, FLOOR_Y - 6, key).setOrigin(0.5, 1)
          .setDepth(DEPTH.PLAYER - 1).setScale(pt.scale || 0.7);
        m.play(pt.type === 'satan' ? 'satan_fly' : 'fiend_move');
        this.physics.add.existing(m);
        m.body.setAllowGravity(false);
        const bw = (pt.type === 'satan' ? 70 : 40) * (pt.scale || 0.7);
        m.body.setSize(bw, m.height * 0.6);
        m._x0 = pt.x0; m._x1 = pt.x1; m._spd = pt.speed || 70; m._dir = 1; m._satan = pt.type === 'satan';
        this.patrollers.add(m);
        this.physics.add.overlap(this.player, m, () => this._damage(1, pt.type === 'satan' ? '撒旦的冰风' : '恶鬼的爪'), null, this);
        if (!m._satan) this.hazardPoints.push((pt.x0 + pt.x1) / 2);
      }
      // 坠落区
      for (const f of (c.fallers || [])) {
        this.fallerZones.push({ x0: f.x0, x1: f.x1, type: f.type || 'boulder', every: f.every || 900, _t: 0 });
      }
    }
    this.physics.add.collider(this.fallers, this.solids, (o) => { this._poof(o.x, o.y, 0x222024); o.destroy(); });
    this.physics.add.overlap(this.player, this.fallers, (pl, o) => { this._damage(1, '坠物'); this._poof(o.x, o.y, 0x222024); o.destroy(); }, null, this);
    this.physics.add.overlap(this.player, this.groundHazards, () => this._damage(1, '地面的刑罚'), null, this);
  },

  _poof(x, y, color) {
    const c = this.add.circle(x, y, 7, color, 0.85).setDepth(DEPTH.EFFECTS);
    this.tweens.add({ targets: c, scale: 2.4, alpha: 0, duration: 280, onComplete: () => c.destroy() });
  },

  // 坠落物：玩家进入某坠落区时按间隔从顶部投下危害（稀疏、低伤、可走位）
  _updateFallers(time, delta) {
    if (!this.player) return;
    const px = this.player.x;
    for (const z of this.fallerZones) {
      if (px < z.x0 - 80 || px > z.x1 + 80) continue;     // 只在区内/边缘生成
      z._t += delta;
      if (z._t < z.every) continue;
      z._t = 0;
      const dropX = Phaser.Math.Between(Math.max(z.x0, px - 160), Math.min(z.x1, px + 200));
      const o = this.fallers.create(dropX, this.cameras.main.scrollY - 20, `hz_${z.type}`).setDepth(DEPTH.SOUL);
      o.setVelocityY(140 + Math.random() * 80);
      if (z.type === 'boulder') o.setAngularVelocity(120);
    }
    this.fallers.getChildren().forEach(o => { if (o.y > FLOOR_Y + 260) o.destroy(); });
  },

  // 巡逻怪：在 [x0,x1] 往返，到界翻向，朝行进方向
  _updatePatrollers() {
    if (!this.patrollers) return;
    this.patrollers.getChildren().forEach(m => {
      if (m.x <= m._x0) m._dir = 1; else if (m.x >= m._x1) m._dir = -1;
      m.x += m._dir * m._spd * 0.016;
      m.setFlipX(m._dir < 0);
      m.y = FLOOR_Y - 6 + (m._satan ? Math.sin(this.time.now / 500) * 8 : 0);
    });
  },

  // ── 情欲之风（横向力，逆相位净速仍为正） ──
  _applyWind(time) {
    const ci = this._currentCircleIdx();
    const c = this.circles[ci];
    if (!c.gusts || !c.gusts.length || this.windCalm) { this._windNow = 0; return; }
    const p = this.player;
    const gust = c.gusts.find(g => p.x >= g.x0 && p.x <= g.x1);
    if (!gust) { this._windNow = 0; return; }
    const phase = Math.sin((time % WIND_PERIOD_MS) / WIND_PERIOD_MS * Math.PI * 2);
    const force = (gust.force ?? WIND_GUST_DEFAULT) * phase;
    this._windNow = force;
    p.setVelocityX(p.body.velocity.x + force);
  },

  // ── 抉择点（bot/headless 自动选「拉住」并继续） ──
  _presentChoice(cir) {
    if (cir._soulDone) return;
    cir._soulDone = true; this.soulResolved = true;
    const soul = cir.soul, sprite = cir.soulSprite;
    this.gameStarted = false;
    const resolve = (choice) => {
      this.choiceMade = choice;
      if (choice === 'pull') {
        this.windCalm = true;
        if (sprite) this.tweens.add({ targets: sprite, alpha: 0, y: soul.y + 30, duration: 700, onComplete: () => sprite.destroy() });
        this._flashObjective(soul.pullMsg || '你握住了那只手。');
      } else {
        if (sprite) this.tweens.add({ targets: sprite, alpha: 0, x: soul.x - 120, duration: 600, onComplete: () => sprite.destroy() });
        this._flashObjective(soul.rushMsg || '你没有回头。');
      }
      this._dismissCard();
      this.gameStarted = true;
    };
    this._showChoice(soul.title, soul.body, resolve);
  },

  _flashObjective(text) {
    window.GameHUD?.setObjective(text);
    this.time.delayedCall(2600, () => {
      if (!this.gameOver) window.GameHUD?.setObjective(this.circles[this._currentCircleIdx()]?.sin || '');
    });
  },
});
