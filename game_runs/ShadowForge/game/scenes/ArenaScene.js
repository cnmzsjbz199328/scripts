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
      this.load.image(`furies_idle_${i}`, `assets/3d/furies_idle_${i}.png`);
      this.load.image(`furies_walk_${i}`, `assets/3d/furies_walk_${i}.png`);
      this.load.image(`icesoul_idle_${i}`, `assets/3d/icesoul_idle_${i}.png`);
      this.load.image(`icesoul_walk_${i}`, `assets/3d/icesoul_walk_${i}.png`);
      this.load.image(`fiend_idle_${i}`, `assets/3d/fiend_idle_${i}.png`);
      this.load.image(`fiend_walk_${i}`, `assets/3d/fiend_walk_${i}.png`);
      this.load.image(`satan_idle_${i}`, `assets/3d/satan_idle_${i}.png`);
      this.load.image(`satan_walk_${i}`, `assets/3d/satan_walk_${i}.png`);
      this.load.svg(`chfog_${i}`, `assets/svg/amb_chfog_ch2_${i}.svg`, { width: 320, height: 320 });
    }
    this.load.image('bg_limbo', 'scene/panorama_limbo.png');
    this.load.image('bg_wrath', 'scene/panorama_wrath.png');
    this.load.image('bg_violence', 'scene/panorama_violence.png');
    this.load.image('bg_fraud', 'scene/panorama_fraud.png');
    this.load.image('bg_betrayal', 'scene/panorama_betrayal.png');
    this.load.audio('music_limbo', 'assets/audio/Under_the_Iron_Sky.mp3');
    this.load.audio('music_wrath', 'assets/audio/Scorch_and_Marrow.mp3');
    this.load.audio('music_violence', 'assets/audio/Judgment_at_the_Iron_Bastion.mp3');
    this.load.audio('music_fraud', 'assets/audio/Scurrying_Beneath_the_Floorboards.mp3');
    this.load.audio('music_betrayal', 'assets/audio/Last_Light_in_the_Nave.mp3');
    this.load.on('loaderror', () => {});   // 缺图静默，create 时补渐变占位
  }

  create() {
    this.auto = !!navigator.webdriver || /autoplay|autostart/.test(location.search);
    // 回归双管线（?bot=godmode 全清必胜 / ?bot=dumb 必败），默认沿用聪明 bot 做日常 playtest
    this.botMode = /bot=godmode/.test(location.search) ? 'godmode'
      : /bot=dumb/.test(location.search) ? 'dumb' : 'smart';
    this.started = false; this.ended = false; this.won = false;
    this.kills = 0; this.wave = -1;
    this.enemies = []; this._freeze = 0; this._toSpawn = 0;
    this.projectiles = []; this.slowZones = [];

    Forge.FX.init(this);
    this._makeFallbacks();
    this._buildLayers();
    this._buildAnims();
    this._buildPlayer();

    this.keys = this.input.keyboard.addKeys('A,D,LEFT,RIGHT,J,K,I,L,E,R,M,SPACE');
    this.input.keyboard.on('keydown-R', () => { if (this.started) location.reload(); });
    this.input.keyboard.on('keydown-M', () => {
      if (window.GameAudio) {
        const muted = window.GameAudio.toggle();
        this.sound.mute = muted;
      }
    });

    this._exposeContract();
    window.GameHUD && GameHUD.onStart(() => this._begin());
  }

  // ── 缺图占位 + 地面带 + 暗角 ──
  // bg_fraud/bg_betrayal 目前还没有真全景图（agy 生成需要交互式会话授权），先用同款渐变占位，
  // 色相按地狱圈区分（欺诈=浑浊土黄雾、背叛=极寒冰蓝），有真图后 loaderror 静默、纹理键一致自动切换。
  _makeFallbacks() {
    const W = Forge.W, H = Forge.H;
    const FALLBACK = {
      bg_limbo:    ['#170c0a', '#0e0606', '#070304'],
      bg_wrath:    ['#170c0a', '#0e0606', '#070304'],
      bg_violence: ['#170c0a', '#0e0606', '#070304'],
      bg_fraud:    ['#141208', '#0c0a05', '#050402'],
      bg_betrayal: ['#0a1420', '#060d16', '#02060a'],
    };
    for (const key in FALLBACK) {
      if (this.textures.exists(key)) continue;
      const cv = this.textures.createCanvas(key, W, H), ctx = cv.getContext();
      const [c0, c1, c2] = FALLBACK[key];
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, c0); g.addColorStop(0.55, c1); g.addColorStop(1, c2);
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
    if (!this.textures.exists('glow_circle')) {
      const s = 256;
      const cv = this.textures.createCanvas('glow_circle', s, s), ctx = cv.getContext();
      const rg = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      rg.addColorStop(0, 'rgba(255,255,255,1)');
      rg.addColorStop(0.35, 'rgba(255,255,255,0.72)');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, s, s);
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
    mk('furies_idle', 'furies_idle', 8, 7);
    mk('furies_walk', 'furies_walk', 8, 10);
    mk('icesoul_idle', 'icesoul_idle', 8, 7);
    mk('icesoul_walk', 'icesoul_walk', 8, 10);
    mk('fiend_idle', 'fiend_idle', 8, 7);
    mk('fiend_walk', 'fiend_walk', 8, 12);
    mk('satan_idle', 'satan_idle', 8, 7);
    mk('satan_walk', 'satan_walk', 8, 10);
    // 兼容层别名
    mk('furies_move', 'furies_walk', 8, 10);
    mk('icesoul_move', 'icesoul_walk', 8, 10);
    mk('fiend_move', 'fiend_walk', 8, 12);
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
    const bgmKeys = ['music_limbo', 'music_wrath', 'music_violence', 'music_fraud', 'music_betrayal'];
    this._playBGM(bgmKeys[i]);
    const card = w.intro ? `${w.name}\n${w.intro}\n${w.hint}` : `${w.name}\n${w.hint}`;
    this._toast(card, w.intro ? 3200 : 2400);
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
    if (this.wave + 1 < Forge.WAVES.length) {
      // 波间回血：人类玩家（不像 bot 会风筝）容易在最后一波前残血见底
      const P = this.P, before = P.hp;
      P.hp = Math.min(Forge.PLAYER.maxHp, P.hp + 2);
      if (P.hp !== before) window.GameHUD && GameHUD.setHearts(P.hp, Forge.PLAYER.maxHp);
      if (P.hp === Forge.PLAYER.maxHp && before < Forge.PLAYER.maxHp)
        this.time.delayedCall(300, () => this._toast('影力回满 ✦'));
      this.time.delayedCall(1200, () => { if (!this.ended) this._startWave(this.wave + 1); });
    } else this._win();
  }

  _win() {
    this.ended = true; this.won = true;
    if (this.currentBGM) {
      this.tweens.add({
        targets: this.currentBGM,
        volume: 0,
        duration: 900,
        onComplete: () => this.currentBGM.stop()
      });
    }
    window.GameAudio && GameAudio.play('win');
    this.time.delayedCall(900, () =>
      window.GameHUD && GameHUD.showGameOver(true,
        `五关皆破，撒旦亦坠。\n击杀 ${this.kills} · 剩余生命 ${this.P.hp}/${Forge.PLAYER.maxHp}\n影可成锋，雾可避锋——变形即武艺。`));
  }

  update(_t, delta) {
    if (!this.started) return;
    // 顿帧：冻结实体推进（tween 继续走，50~70ms 内不可察觉）
    let dms = delta;
    if (this._freeze > 0) { this._freeze -= delta; dms = 0; }
    if (!this.ended) {
      this._updatePlayer(dms);
      this._updateEnemies(dms);
      this._updateProjectiles(dms);
    }
    this.playerShadow.setX(this.P.x)
      .setVisible(this.player.visible && this.player.alpha > 0.05)
      .setAlpha(0.3 * this.player.alpha);
  }

  // ── 通用小件 ──
  _hitstop(ms) { this._freeze = Math.max(this._freeze, ms); }

  // 冲击环（命中/落地）：粒子从中心炸开到半径 r（曾是描边椭圆 tween，现全粒子化）
  // mix 决定染色：玩家招式传 _lightMix()，敌方传 Forge.ENEMY_MIX，缺省纯墨
  _shockRing(x, y, r, mix, dur = 320) {
    Forge.FX.ring({ x, y, r, dur, mode: 'out', n: Forge.FXN.ring, mix });
  }

  // 预警环（预备帧）：粒子沿攻击半径周界闪烁收拢，持续整个前摇时长
  _warnRing(x, y, r, dur) {
    Forge.FX.ring({ x, y, r, dur, mode: 'in', n: Forge.FXN.ring, mix: Forge.ENEMY_MIX });
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
      lost: self.ended && !self.won,
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
    if (this.botMode === 'godmode') return this._botGodmode();
    if (this.botMode === 'dumb') return this._botDumb();
    const P = this.P;
    if (P.state !== 'free') { this._botMv = 0; return; }
    const bossUp = this.enemies.some(e => !e.dead && e.def.boss);
    // 恶鬼形是清群用的近战——Boss 在场时留人形用矛风筝
    if (P.essence > 0 && P.form === 'dante' && !bossUp) return this._doTransform();

    let near = null, nd = 1e9, threats = 0, danger = false;
    for (const e of this.enemies) {
      if (e.dead) continue;
      // 天降长剑闭环中（本体已离场 alpha=0）且落剑列罩着自己 → 危险（雾化水平位移可脱离锁定列）；须在 alpha 守卫前判
      if (e.def.sky && e.state === 'sky' && Math.abs(P.x - e.skyX) < e.def.sky.r + 20) danger = true;
      if (e.spr.alpha < 1) continue;
      const d = Math.abs(e.x - P.x);
      if (d < nd) { nd = d; near = e; }
      if (d < 170) threats++;
      if (e.state === 'lunge' || (e.state === 'tele' && d < 200) || d < 66) danger = true;
    }
    // 飞向自己且已近的敌方弹丸 → 危险（furies 投掷弹每发 2 伤，站桩硬吃 5 发就死）
    for (const pr of this.projectiles)
      if (Math.sign(P.x - pr.x) === pr.dir && Math.abs(pr.x - P.x) < 130) danger = true;
    if (!near) { this._botMv = 0; return; }
    const dir = Math.sign(near.x - P.x) || 1;

    if (danger && P.cds.mist <= 0) { P.dir = dir; this._botMv = 0; return this._doMist(); }
    if (threats >= 2 && P.cds.hammer <= 0 && nd < 140) { this._botMv = 0; return this._doHammer(); }
    if (P.form === 'fiend' && !near.def.boss && nd < 150 && P.cds.lunge <= 0) { P.dir = dir; this._botMv = 0; return this._fiendLunge(); }
    if (P.form === 'furies' && !near.def.boss && nd < 320 && P.cds.throw <= 0) { P.dir = dir; this._botMv = 0; return this._furiesThrow(); }
    if (P.form === 'dante' && nd < 260 && P.cds.spear <= 0) { P.dir = dir; this._botMv = 0; return this._doSpear(); }
    // Boss 挥臂半径 175：保持 205px 风筝距离，矛(280px)够得着它、它够不着我
    const keep = near.def.boss ? 205 : 90;
    this._botMv = nd > 250 ? dir : (nd < keep ? -dir : 0);
  }

  // 回归·godmode：每 tick 秒杀场上敌人，走通 kill/wave/boss/win 全流程，验证"必能通关"
  _botGodmode() {
    this._botMv = 0;
    for (const e of this.enemies) if (!e.dead) { e.hp = 0; this._killEnemy(e); }
  }

  // 回归·dumb：只会朝最近敌人走位，从不触发任何技能键，验证"受击/gameover 必能走到终局"
  _botDumb() {
    const P = this.P;
    if (P.state !== 'free') { this._botMv = 0; return; }
    let near = null, nd = 1e9;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = Math.abs(e.x - P.x);
      if (d < nd) { nd = d; near = e; }
    }
    this._botMv = near ? (Math.sign(near.x - P.x) || 1) : 0;
  }

  _playBGM(key) {
    if (this.currentBGM && this.currentBGM.key === key) return;
    
    // Mute state check on start
    this.sound.mute = !!(window.GameAudio && window.GameAudio.muted);

    if (this.currentBGM) {
      const prev = this.currentBGM;
      this.tweens.add({
        targets: prev,
        volume: 0,
        duration: 800,
        onComplete: () => prev.stop()
      });
    }

    const track = this.sound.add(key, { loop: true, volume: 0 });
    this.currentBGM = track;
    track.play();
    this.tweens.add({
      targets: track,
      volume: 0.35,
      duration: 800
    });
  }
}
