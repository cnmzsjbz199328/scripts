/* ShadowForge — 竞技场主场景：资源装配 / 波次控制 / 输入 / 对外契约 / bot。
 * 玩家状态机见 systems/player.js，敌人 AI 见 systems/enemies.js（Object.assign 原型）。 */
class ArenaScene extends Phaser.Scene {
  constructor() { super('Arena'); }

  preload() {
    for (let i = 0; i < 8; i++) {
      this.load.image(`dante_idle_${i}`, `assets/3d/dante_idle_${i}.png`);
      this.load.image(`dante_walk_${i}`, `assets/3d/dante_walk_${i}.png`);
      this.load.image(`soul_walk_${i}`, `assets/3d/soul_walk_${i}.png`);
      this.load.image(`minos_idle_${i}`, `assets/3d/minos_idle_${i}.png`);
      this.load.svg(`chfog_${i}`, `assets/svg/amb_chfog_ch2_${i}.svg`, { width: 320, height: 320 });
    }
    for (let i = 0; i < 2; i++)
      this.load.svg(`fiend_${i}`, `assets/svg/fiend_move_${i}.svg`, { width: 168, height: 176 });
    this.load.image('bg_limbo', 'scene/panorama_limbo.png');
    this.load.image('bg_wrath', 'scene/panorama_wrath.png');
    this.load.image('bg_violence', 'scene/panorama_violence.png');
    this.load.on('loaderror', () => {});   // 缺图静默，create 时补渐变占位
  }

  create() {
    this.auto = !!navigator.webdriver || /autoplay|autostart/.test(location.search);
    this.started = false; this.ended = false; this.won = false;
    this.kills = 0; this.wave = -1;
    this.enemies = []; this._freeze = 0; this._toSpawn = 0;

    Forge.FX.init(this);
    this._makeFallbacks();
    this._buildLayers();
    this._buildAnims();
    this._buildPlayer();

    this.keys = this.input.keyboard.addKeys('A,D,LEFT,RIGHT,J,K,L,E,R,M,SPACE');
    this.input.keyboard.on('keydown-R', () => { if (this.started) location.reload(); });
    this.input.keyboard.on('keydown-M', () => window.GameAudio && GameAudio.toggle());

    this._exposeContract();
    window.GameHUD && GameHUD.onStart(() => this._begin());
  }

  // ── 缺图占位 + 地面带 + 暗角 ──
  _makeFallbacks() {
    const W = Forge.W, H = Forge.H;
    for (const key of ['bg_limbo', 'bg_wrath', 'bg_violence']) {
      if (this.textures.exists(key)) continue;
      const cv = this.textures.createCanvas(key, W, H), ctx = cv.getContext();
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#170c0a'); g.addColorStop(0.55, '#0e0606'); g.addColorStop(1, '#070304');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      cv.refresh();
    }
    // 地面带：不规则地脊剪影 + 碎岩尖片（人物脚底沉入其后 → 接地）
    if (!this.textures.exists('fg_band')) {
      const BW = W + 16, BH = 150, TOP = 16;
      const cv = this.textures.createCanvas('fg_band', BW, BH), ctx = cv.getContext();
      let seed = 77813;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      ctx.beginPath();
      ctx.moveTo(0, BH); ctx.lineTo(0, TOP + rnd() * 12);
      for (let x = 0; x < BW;) { x += 26 + rnd() * 44; ctx.lineTo(Math.min(x, BW), TOP + rnd() * 18); }
      ctx.lineTo(BW, BH); ctx.closePath();
      const g = ctx.createLinearGradient(0, TOP, 0, BH);
      g.addColorStop(0, '#0e0808'); g.addColorStop(1, '#060303');
      ctx.fillStyle = g; ctx.fill();
      for (let i = 0; i < 22; i++) {
        const bx = rnd() * BW, w2 = 8 + rnd() * 20, h2 = 8 + rnd() * 26;
        ctx.beginPath();
        ctx.moveTo(bx - w2 / 2, TOP + 16);
        ctx.lineTo(bx + (rnd() - 0.5) * 6, TOP + 16 - h2);
        ctx.lineTo(bx + w2 / 2, TOP + 16);
        ctx.closePath(); ctx.fill();
      }
      cv.refresh();
    }
    if (!this.textures.exists('vign')) {
      const cv = this.textures.createCanvas('vign', W, H), ctx = cv.getContext();
      const rg = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.95);
      rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
      cv.refresh();
    }
  }

  _buildLayers() {
    const cx = Forge.W / 2, D = Forge.C.DEPTH;
    this.bgA = this.add.image(cx, Forge.H / 2, 'bg_limbo').setDisplaySize(Forge.W, Forge.H).setDepth(D.BG);
    this.bgB = this.add.image(cx, Forge.H / 2, 'bg_limbo').setDisplaySize(Forge.W, Forge.H).setDepth(D.BG + 1).setAlpha(0);
    this.add.image(cx, Forge.H / 2, 'vign').setDepth(-40);
    this.fgBand = this.add.image(cx, 408, 'fg_band').setOrigin(0.5, 0).setDepth(D.FG);
    this.fgFogs = [];
    for (let i = 0; i < 2; i++) {
      const f = this.add.sprite(240 + i * 500, 400 + i * 16, 'chfog_0')
        .setDepth(D.FOG).setAlpha(0.15).setScale(1.5 + i * 0.5);
      this.tweens.add({ targets: f, x: f.x + (i ? -90 : 110), duration: 11000 + i * 4000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.fgFogs.push(f);
    }
  }

  _buildAnims() {
    const mk = (key, tex, n, rate) => this.anims.create({
      key, frames: Array.from({ length: n }, (_, i) => ({ key: `${tex}_${i}` })), frameRate: rate, repeat: -1,
    });
    mk('dante_idle', 'dante_idle', 8, 7);
    mk('dante_walk', 'dante_walk', 8, 10);
    mk('soul_walk', 'soul_walk', 8, 8);
    mk('minos_idle', 'minos_idle', 8, 6);
    mk('fiend_move', 'fiend', 2, 6);
    mk('chfog', 'chfog', 8, 5);
    for (const f of this.fgFogs) f.play('chfog');
  }

  _begin() {
    this.started = true;
    window.GameHUD && GameHUD.setHearts(this.P.hp, Forge.PLAYER.maxHp);
    this._updateScore();
    this._startWave(0);
    if (this.auto) this.time.addEvent({ delay: 140, loop: true, callback: () => this._botTick() });
  }

  // ── 波次控制 ──
  _startWave(i) {
    this.wave = i;
    const w = Forge.WAVES[i];
    window.GameHUD && GameHUD.setObjective(`${w.name}`);
    this._toast(`${w.name}\n${w.hint}`, 2400);
    if (this.textures.exists(w.bg) && this.bgA.texture.key !== w.bg) {
      this.bgB.setTexture(w.bg).setDisplaySize(Forge.W, Forge.H).setAlpha(0);
      this.tweens.add({
        targets: this.bgB, alpha: 1, duration: 700,
        onComplete: () => { this.bgA.setTexture(w.bg).setDisplaySize(Forge.W, Forge.H); this.bgB.setAlpha(0); },
      });
    }
    this._toSpawn = w.spawns.length;
    for (const s of w.spawns)
      this.time.delayedCall(s.t, () => {
        if (this.ended) return;
        this._spawnEnemy(s.type, s.x);
        this._toSpawn--;
        this._checkWave();   // 覆盖"最后一个还没出生时场上已清空"的边界
      });
  }

  _checkWave() {
    if (this.ended || this._toSpawn > 0 || this.enemies.length > 0) return;
    if (this.wave + 1 < Forge.WAVES.length)
      this.time.delayedCall(1200, () => { if (!this.ended) this._startWave(this.wave + 1); });
    else this._win();
  }

  _win() {
    this.ended = true; this.won = true;
    window.GameAudio && GameAudio.play('win');
    this.time.delayedCall(900, () =>
      window.GameHUD && GameHUD.showGameOver(true,
        `三波皆破。\n击杀 ${this.kills} · 剩余生命 ${this.P.hp}/${Forge.PLAYER.maxHp}\n影可成锋，雾可避锋——变形即武艺。`));
  }

  update(_t, delta) {
    if (!this.started) return;
    // 顿帧：冻结实体推进（tween 继续走，50~70ms 内不可察觉）
    let dms = delta;
    if (this._freeze > 0) { this._freeze -= delta; dms = 0; }
    if (!this.ended) {
      this._updatePlayer(dms);
      this._updateEnemies(dms);
    }
    this.playerShadow.setX(this.P.x)
      .setVisible(this.player.visible && this.player.alpha > 0.05)
      .setAlpha(0.3 * this.player.alpha);
  }

  // ── 通用小件 ──
  _hitstop(ms) { this._freeze = Math.max(this._freeze, ms); }

  _shockRing(x, y, r, color = 0xd8c8a8, dur = 280) {
    const ring = this.add.ellipse(x, y, r * 2, r * 0.55)
      .setStrokeStyle(3, color, 0.85).setDepth(Forge.C.DEPTH.RING).setScale(0.15).setFillStyle();
    this.tweens.add({
      targets: ring, scaleX: 1, scaleY: 1, alpha: 0, duration: dur, ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }

  _toast(msg, hold = 1700) {
    if (this._toastEls) for (const e of this._toastEls) e.destroy();
    const bg = this.add.rectangle(Forge.W / 2, 92, 420, 52, 0x0a0c14, 0.88)
      .setDepth(Forge.C.DEPTH.TOAST).setStrokeStyle(1, 0xffd98a, 0.5).setAlpha(0);
    const t = this.add.text(Forge.W / 2, 92, msg, {
      fontFamily: 'Georgia, serif', fontSize: '15px', color: '#ffd98a', align: 'center', lineSpacing: 6,
    }).setOrigin(0.5).setDepth(Forge.C.DEPTH.TOAST + 1).setAlpha(0);
    bg.width = Math.max(260, t.width + 48); bg.height = t.height + 22;
    this._toastEls = [bg, t];
    this.tweens.add({
      targets: [bg, t], alpha: 1, y: 104, duration: 300, hold, yoyo: true,
      onComplete: () => { bg.destroy(); t.destroy(); this._toastEls = null; },
    });
  }

  _updateScore() { window.GameHUD && GameHUD.setScore(this.P.essence); }

  // ── 对外契约（verify / playtest / 调试） ──
  _exposeContract() {
    const self = this;
    window.__scene = this;
    window.__probe = () => ({
      started: self.started, ended: self.ended, won: self.won,
      hp: self.P.hp, maxHp: Forge.PLAYER.maxHp,
      wave: self.wave, enemies: self.enemies.length, toSpawn: self._toSpawn,
      kills: self.kills, essence: self.P.essence,
      form: self.P.form, state: self.P.state, x: Math.round(self.P.x),
    });
    window.__gameState = { player: this.P };
  }

  // ── 无头/自动模式 bot：贴近→矛刺，群聚→锤震，近身→雾穿，有魄→化形 ──
  _botTick() {
    if (this.ended || !this.started) return;
    const P = this.P;
    if (P.state !== 'free') { this._botMv = 0; return; }
    const bossUp = this.enemies.some(e => !e.dead && e.def.boss);
    // 恶鬼形是清群用的近战——Boss 在场时留人形用矛风筝
    if (P.essence > 0 && P.form === 'dante' && !bossUp) return this._doTransform();

    let near = null, nd = 1e9, threats = 0, danger = false;
    for (const e of this.enemies) {
      if (e.dead || e.spr.alpha < 1) continue;
      const d = Math.abs(e.x - P.x);
      if (d < nd) { nd = d; near = e; }
      if (d < 170) threats++;
      if (e.state === 'lunge' || (e.state === 'tele' && d < 200) || d < 66) danger = true;
    }
    if (!near) { this._botMv = 0; return; }
    const dir = Math.sign(near.x - P.x) || 1;

    if (danger && P.cds.mist <= 0) { P.dir = dir; this._botMv = 0; return this._doMist(); }
    if (threats >= 2 && P.cds.hammer <= 0 && nd < 140) { this._botMv = 0; return this._doHammer(); }
    if (P.form === 'fiend' && !near.def.boss && nd < 150 && P.cds.lunge <= 0) { P.dir = dir; this._botMv = 0; return this._fiendLunge(); }
    if (P.form === 'dante' && nd < 260 && P.cds.spear <= 0) { P.dir = dir; this._botMv = 0; return this._doSpear(); }
    // Boss 挥臂半径 175：保持 205px 风筝距离，矛(280px)够得着它、它够不着我
    const keep = near.def.boss ? 205 : 90;
    this._botMv = nd > 250 ? dir : (nd < keep ? -dir : 0);
  }
}
