/* SlimeVale — 草谷主场景：装配 / 对外契约 / bot 三管线 / 通用小件。
 * 世界推进见 systems/world.js，背景 systems/bg.js，贴图 systems/chars.js，
 * 玩家 systems/player.js，敌人 systems/enemies.js，战斗回放 systems/replay.js
 * （全部 Object.assign 到本类原型）。零外部素材：preload 为空，一切程序化。 */
class MeadowScene extends Phaser.Scene {
  constructor() { super('Meadow'); }

  preload() { /* 全程序化，无外部素材 */ }

  create() {
    this.auto = !!navigator.webdriver || /autoplay|autostart/.test(location.search);
    this.botMode = /bot=godmode/.test(location.search) ? 'godmode'
      : /bot=dumb/.test(location.search) ? 'dumb' : 'smart';
    this.started = false; this.ended = false; this.won = false;
    this.kills = 0; this.lives = Forge.PLAYER.lives;
    this.enemies = []; this.projectiles = []; this.packs = []; this.hazards = [];
    this._freeze = 0;
    this.lock = null; this.cine = null; this._rec = null;
    this.segIdx = 0; this.camMinX = 0;
    this._trigs = [];
    for (const seg of Forge.SEGMENTS)
      for (const tr of seg.triggers) this._trigs.push(Object.assign({ done: false }, tr));
    this._trigs.sort((a, b) => a.at - b.at);

    Forge.FX.init(this);
    this._buildCharTextures();
    this._makeCommonTextures();
    this._bgBuildTextures();
    this._buildParallax();
    this._buildPlayer();
    this.bars = this.add.graphics().setDepth(Forge.C.DEPTH.BAR);

    this.keys = this.input.keyboard.addKeys('A,D,LEFT,RIGHT,W,UP,SPACE,J,K,R,M');
    this.input.keyboard.on('keydown-R', () => { if (this.started) location.reload(); });
    this.input.keyboard.on('keydown-M', () => {
      if (window.GameAudio) this.sound.mute = window.GameAudio.toggle();
    });

    this._exposeContract();
    window.GameHUD && GameHUD.onStart(() => this._begin());
  }

  _makeCommonTextures() {
    const W = Forge.W, H = Forge.H;
    if (this.textures.exists('vign')) return;
    const cv = this.textures.createCanvas('vign', W, H), ctx = cv.getContext();
    const rg = ctx.createRadialGradient(W / 2, H / 2, H * 0.44, W / 2, H / 2, H * 0.95);
    rg.addColorStop(0, 'rgba(46,90,60,0)'); rg.addColorStop(1, 'rgba(30,70,52,0.16)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    cv.refresh();
  }

  _begin() {
    this.started = true;
    // ?warp=<x> 调试参数：直接投放到指定世界 x（此前触发器视为已消费）
    const wm = location.search.match(/warp=(\d+)/);
    if (wm) {
      const wx = Phaser.Math.Clamp(+wm[1], 60, Forge.WORLD.W - 200);
      this.P.x = wx;
      for (const tr of this._trigs) if (tr.at < wx) tr.done = true;
      this.camMinX = Math.max(0, Math.min(wx - Forge.W * Forge.CAM.aheadFrac, Forge.WORLD.W - Forge.W));
      this.cameras.main.scrollX = this.camMinX;
      this.player.setX(wx);
      this.segIdx = this._segAt(wx);
    }
    // ?skill=<key> 调试参数：warp 跳段时指定当前形状技能
    const sm = location.search.match(/skill=(\w+)/);
    if (sm && Forge.SKILLS[sm[1]]) this.P.skill = sm[1];
    window.GameHUD && GameHUD.setHearts(this.P.hp, Forge.PLAYER.maxHp);
    this._enterSegment(this._segAt(this.P.x), true);
    if (this.auto) this.time.addEvent({ delay: 140, loop: true, callback: () => this._botTick() });
  }

  update(t, delta) {
    if (!this.started) return;
    let dms = Math.min(delta, 50);
    if (this.cine) { this._updateCine(dms); return; }
    if (this._freeze > 0) { this._freeze -= delta; dms = 0; }
    if (!this.ended) {
      this._updatePlayer(dms);
      this._updateEnemies(dms);
      this._updateProjectiles(dms);
      this._updatePacks(dms);
      this._updateTriggers();
      this._updateSegment();
      this._recTick(dms);
      if (this.hazards.length) this.hazards = this.hazards.filter((h) => h.t > this.time.now - 150);
    }
    this._updateCamera(dms);
    this._updateParallax(t);
    this._drawBars();
  }

  // ── 通用小件 ──
  _hitstop(ms) { this._freeze = Math.max(this._freeze, ms); }

  _shockRing(x, y, r, mix, dur = 320) {
    Forge.FX.ring({ x, y, r, dur, mode: 'out', n: Forge.FXN.ring, mix });
  }

  _warnRing(x, y, r, dur) {
    Forge.FX.ring({ x, y, r, dur, mode: 'in', n: Forge.FXN.ring, mix: Forge.ENEMY_MIX });
  }

  // 叙事卡 toast：屏幕空间（蓝图 §2.3），清新白卡样式
  _toast(msg, hold = 1700) {
    if (this._toastEls) for (const e of this._toastEls) e.destroy();
    const bg = this.add.rectangle(Forge.W / 2, 92, 420, 52, 0xffffff, 0.92)
      .setDepth(Forge.C.DEPTH.TOAST).setStrokeStyle(2, 0x7bd8ae, 0.9).setAlpha(0).setScrollFactor(0);
    const t = this.add.text(Forge.W / 2, 92, msg, {
      fontFamily: 'Trebuchet MS, PingFang SC, Microsoft YaHei, sans-serif',
      fontSize: '15px', color: '#2c6e57', align: 'center', lineSpacing: 6,
    }).setOrigin(0.5).setDepth(Forge.C.DEPTH.TOAST + 1).setAlpha(0).setScrollFactor(0);
    bg.width = Math.max(260, t.width + 48); bg.height = t.height + 22;
    this._toastEls = [bg, t];
    this.tweens.add({
      targets: [bg, t], alpha: 1, y: 104, duration: 300, hold, yoyo: true,
      onComplete: () => { bg.destroy(); t.destroy(); this._toastEls = null; },
    });
  }

  // 飘字：伤害/露水回流的即时数字反馈（世界空间）
  _popup(x, y, text, color) {
    const t = this.add.text(x, y, text, {
      fontFamily: 'Trebuchet MS, PingFang SC, sans-serif', fontSize: '17px', fontStyle: 'bold',
      color, stroke: '#ffffff', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(Forge.C.DEPTH.BAR + 1);
    this.tweens.add({
      targets: t, y: y - 30, alpha: 0, duration: 750, ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  _updateScore() {
    window.GameHUD && GameHUD.setScore(Math.round(this.P.x / Forge.WORLD.W * 100) + '%');
  }

  _win() {
    this.ended = true; this.won = true;
    window.GameAudio && GameAudio.play('win');
    this.time.delayedCall(900, () =>
      window.GameHUD && GameHUD.showGameOver(true,
        `枯萎之冠碎成了灰，露水像小溪一样淌回山谷。\n草绿回来了，花抬起了头——露露打了个饱嗝，滚下山坡去晒太阳。\n击杀 ${this.kills} · 残命 ${this.lives} —— 春天被弹回来了。`));
  }

  _gameover() {
    this.ended = true; this.won = false;
    window.GameAudio && GameAudio.play('lose');
    this.time.delayedCall(1000, () =>
      window.GameHUD && GameHUD.showGameOver(false,
        `露露在${Forge.SEGMENTS[this.segIdx].name}散成了一滩小水洼。\n别难过——露水只是蒸发了，攒够了云，还会再落回清泉谷的。`));
  }

  // ── 对外契约（verify / playtest / 调试）──
  _exposeContract() {
    const self = this;
    window.__scene = this;
    window.__probe = () => ({
      started: self.started, ended: self.ended, won: self.won,
      lost: self.ended && !self.won,
      hp: self.P.hp, maxHp: Forge.PLAYER.maxHp, lives: self.lives,
      deaths: Forge.PLAYER.lives - self.lives,
      progress: Math.round(self.P.x / Forge.WORLD.W * 100),
      cellX: Forge.WORLD.W,
      segment: self.segIdx, locked: !!self.lock || !!self.cine,
      cardActive: !!self.cine,                       // 回放=剧情卡：bot 走 __advanceCard 跳过
      wave: self.lock ? self.lock.wi : -1,
      enemies: self.enemies.length, kills: self.kills,
      skill: self.P.skill, state: self.P.state,
      x: Math.round(self.P.x), y: Math.round(self.P.y),
      onGround: self.P.y >= Forge.C.FEET_Y - 0.5,
    });
    window.__advanceCard = () => { if (self.cine) self._endCine(); };
    window.__gameState = { player: this.P };
  }

  // ── bot 三管线（蓝图 §6）：smart 日常 / godmode 必胜回归 / dumb 必败回归 ──
  _botTick() {
    if (this.ended || !this.started || this.cine) return;
    if (this.botMode === 'godmode') return this._botGodmode();
    if (this.botMode === 'dumb') return this._botDumb();
    const P = this.P;
    if (P.state !== 'free') { this._botMv = 0; return; }
    const cam = this.cameras.main.scrollX;
    const grounded = P.y >= Forge.C.FEET_Y - 0.5;
    let near = null, nd = 1e9, diveLock = false, ringDanger = false;

    for (const e of this.enemies) {
      if (e.dead || e.spr.alpha < 1) continue;
      if (!this.lock && (e.x < cam - 80 || e.x > cam + Forge.W + 140)) continue;
      if (this.lock && (e.x < this.lock.camX + 20 || e.x > this.lock.camX + Forge.W - 20)) continue;
      const d = Math.abs(e.x - P.x);
      // 身后远处的伏兵不回头追（它们自己会撵上来）——回头空跑会被 playtest 判位移停滞
      const chaseable = this.lock || e.x >= P.x - 40 || d < 260;
      if (chaseable && d < nd) { nd = d; near = e; }
      // 闪避读的是"判定还有多久落下"（e.stateT），不是"前摇开始了"——太早跳会落回判定窗口
      if (e.state === 'tele') {
        if (e.def.stomp || e.def.swipe) {
          if (d < (e.def.stomp || e.def.swipe).r + 40 && e.stateT < 400) ringDanger = true;
        } else if (e.def.charge) {
          if (d < 300 && e.stateT < 430) ringDanger = true;
        } else if (e.def.dive && d < 300) diveLock = true;
      }
      if (e.state === 'atk' && e.def.hopAtk && d < 230) ringDanger = true;   // 大跳在空中，落点将至
      if (e.state === 'charge' && d < 220) ringDanger = true;
      if (e.state === 'dive' && d < 130) ringDanger = true;
    }
    // 弹幕落点（孢子雨/根刺）：站在圈里且 0.5s 内落下 → 跳
    const now = this.time.now;
    for (const hz of this.hazards)
      if (Math.abs(hz.x - P.x) < hz.r + 26 && hz.t - now < 520 && hz.t > now - 150 && grounded) ringDanger = true;
    // 低空来弹 → 跳；高弹从头顶过，不理
    for (const pr of this.projectiles) {
      const dx = pr.x - P.x;
      if (Math.sign(-dx) === Math.sign(pr.vx || 1) && Math.abs(dx) < 170
          && pr.y > Forge.C.FEET_Y - 86 && grounded) this._doJump();
    }
    if (ringDanger && grounded) this._doJump();   // 地面 AOE 前摇 → 跳过判定窗口

    if (!near) {
      // 附近无敌 → 顺路吃技能包，否则持续向右推进
      let pk = null, pd = 1e9;
      for (const p of this.packs) {
        const d = p.x - P.x;
        if (d > -60 && d < 420 && Math.abs(d) < pd) { pd = Math.abs(d); pk = p; }
      }
      if (pk) {
        this._botMv = Math.abs(pk.x - P.x) > 24 ? Math.sign(pk.x - P.x) : 0;
        if (Math.abs(pk.x - P.x) < 64 && grounded) this._doJump();
        return;
      }
      this._botMv = 1;
      return;
    }

    const dir = Math.sign(near.x - P.x) || 1;
    const dyBody = this._eBody(near) - this._pBodyY();
    if (diveLock && nd < 220) { this._botMv = -dir; return; }   // 俯冲锁定 → 拉开身位

    const sk = P.skill;
    if (P.cd <= 0) {
      if (sk === 'splash') {
        if (Math.abs(dyBody) < 70 && nd < 225) { P.dir = dir; this._botMv = 0; return this._useSkill(); }
        if (near.def.fly && nd < 175 && grounded) return this._doJump();   // 跳到同高再冲
      } else if (sk === 'slam') {
        const low = Forge.C.FEET_Y - near.ey < 110;
        if (low && nd < 130) { P.dir = dir; this._botMv = 0; return this._useSkill(); }
        if (!low && near.def.fly && nd < 140 && grounded) return this._doJump();
      } else if (sk === 'star') {
        // 星刃自动瞄准，高低差交给俯仰
        if (Math.abs(dyBody) < 150 && nd < 370 && nd > 55) { P.dir = dir; this._botMv = 0; return this._useSkill(); }
      } else {
        if (Math.abs(dyBody) < 52 && nd < 370 && nd > 55) { P.dir = dir; this._botMv = 0; return this._useSkill(); }
        if (near.def.fly && Math.abs(dyBody) >= 52 && nd < 260 && grounded) return this._doJump();
      }
    }
    // 站位：按当前技能射程走——远了逼近，近过安全线后撤（防慢速敌长期对峙判 stuck）
    const reach = sk === 'slam' ? 125 : sk === 'splash' ? 215 : 350;
    if (near.def.boss) this._botMv = nd > reach ? dir : (nd < reach - 130 ? -dir : 0);
    else this._botMv = nd > 130 ? dir : (nd < 88 ? -dir : 0);
    // 撞墙保护：锁点里撤退方向顶到边界 → 反向穿过敌人（本作无接触伤害，穿身安全）
    if (this.lock) {
      if (this._botMv > 0 && P.x >= this.lock.camX + Forge.W - 80) this._botMv = -1;
      else if (this._botMv < 0 && P.x <= this.lock.camX + 80) this._botMv = 1;
    }
  }

  // 回归·godmode：钉血 + 秒杀 + 强制右移——验证「触发器全消费 → 锁点开/清/解 → win」全链路
  _botGodmode() {
    this.P.hp = Forge.PLAYER.maxHp;
    this._botMv = 1;
    for (const e of this.enemies) if (!e.dead) { e.hp = 0; this._killEnemy(e); }
  }

  // 回归·dumb：只朝最近敌人走、不出招不跳；无敌人也向右走（覆盖 gameover 路径）
  _botDumb() {
    const P = this.P;
    if (P.state !== 'free') { this._botMv = 0; return; }
    let near = null, nd = 1e9;
    for (const e of this.enemies) {
      if (e.dead || e.spr.alpha < 1) continue;
      const d = Math.abs(e.x - P.x);
      if (d < nd) { nd = d; near = e; }
    }
    this._botMv = near ? (Math.sign(near.x - P.x) || 1) : 1;
  }
}
