/* WyrmsEnd — 旅途主场景：资源装配 / 对外契约 / bot 三管线 / 通用小件。
 * 世界与摄像机/触发器/锁点见 systems/world.js，背景视差见 systems/bg.js，
 * 玩家状态机 systems/player.js，敌人 AI systems/enemies.js（Object.assign 原型）。 */
class JourneyScene extends Phaser.Scene {
  constructor() { super('Journey'); }

  preload() {
    // 角色剪影帧（glb-sprite 产物，拷自素材库；键名=本作图鉴名，文件名=原始角色名）
    const F8 = (key, file) => {
      for (let i = 0; i < 8; i++) this.load.image(`${key}_${i}`, `assets/3d/${file}_${i}.png`);
    };
    F8('knight_idle', 'dante_idle');   F8('knight_walk', 'dante_walk');
    F8('thrall_walk', 'soul_walk');
    F8('drake_idle', 'fiend_idle');    F8('drake_walk', 'fiend_walk');
    F8('slinger_idle', 'furies_idle'); F8('slinger_walk', 'furies_walk');
    F8('warden_idle', 'minos_idle');
    F8('wyrm_idle', 'satan_idle');     F8('wyrm_walk', 'satan_walk');
    // 视差层真图（agy 生成，见 PROMPTS.md）：按 manifest.js（process-bg 产出）只加载
    // 现存的图，缺席的段 create 时补程序化降级层——不产生 404
    const BGF = window.WYRM_BG;
    for (let i = 0; i < 5; i++)
      for (const kind of ['far', 'mid']) {
        const f = `seg${i + 1}_${kind}.png`;
        if (!BGF || BGF.includes(f)) this.load.image(`bg${i}_${kind}`, `assets/bg/${f}`);
      }
    // 前景草丛簇（svg-ambient grass 工厂产物，gen_wyrmsend_ambient.mjs 生成）：
    // 5 段 × 2 变体 × 8 帧，缺帧静默（_buildForeground 会跳过没纹理的变体）
    for (let s = 0; s < 5; s++)
      for (let v = 0; v < 2; v++)
        for (let i = 0; i < 8; i++)
          this.load.svg(`amb_grass_s${s}v${v}_${i}`, `assets/svg/amb_grass_s${s}v${v}_${i}.svg`, { width: 128, height: 128 });
    // BGM 复用 ShadowForge 曲库（相对路径跨目录引用，缺失静默跳过）
    const BGM = ['Under_the_Iron_Sky', 'Scorch_and_Marrow', 'Judgment_at_the_Iron_Bastion',
                 'Scurrying_Beneath_the_Floorboards', 'Last_Light_in_the_Nave'];
    BGM.forEach((f, i) => this.load.audio(`music_${i}`, `../ShadowForge/assets/audio/${f}.mp3`));
    this.load.on('loaderror', () => {});
  }

  create() {
    this.auto = !!navigator.webdriver || /autoplay|autostart/.test(location.search);
    this.botMode = /bot=godmode/.test(location.search) ? 'godmode'
      : /bot=dumb/.test(location.search) ? 'dumb' : 'smart';
    this.started = false; this.ended = false; this.won = false;
    this.kills = 0; this.lives = Forge.PLAYER.lives;
    this.enemies = []; this.projectiles = [];
    this._freeze = 0;
    this.lock = null; this.segIdx = 0; this.camMinX = 0;
    // 触发器全局扁平化（升序），done 标记一次性消费；respawn 时重臂检查点之后的
    this._trigs = [];
    for (const seg of Forge.SEGMENTS)
      for (const tr of seg.triggers) this._trigs.push(Object.assign({ done: false }, tr));
    this._trigs.sort((a, b) => a.at - b.at);

    Forge.FX.init(this);
    this._makeCommonTextures();
    this._bgEnsureTextures();
    this._buildParallax();
    this._buildForeground();
    this._buildAnims();
    this._buildPlayer();

    this.keys = this.input.keyboard.addKeys('A,D,LEFT,RIGHT,J,K,L,SPACE,R,M');
    this.input.keyboard.on('keydown-R', () => { if (this.started) location.reload(); });
    this.input.keyboard.on('keydown-M', () => {
      if (window.GameAudio) this.sound.mute = window.GameAudio.toggle();
    });

    this._exposeContract();
    window.GameHUD && GameHUD.onStart(() => this._begin());
  }

  _makeCommonTextures() {
    const W = Forge.W, H = Forge.H;
    if (!this.textures.exists('vign')) {
      const cv = this.textures.createCanvas('vign', W, H), ctx = cv.getContext();
      const rg = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.95);
      rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,0.3)');
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

  _buildAnims() {
    const mk = (key, tex, n, rate) => this.anims.create({
      key, frames: Array.from({ length: n }, (_, i) => ({ key: `${tex}_${i}` })), frameRate: rate, repeat: -1,
    });
    mk('knight_idle', 'knight_idle', 8, 7);
    mk('knight_walk', 'knight_walk', 8, 10);
    mk('thrall_walk', 'thrall_walk', 8, 8);
    mk('drake_idle', 'drake_idle', 8, 7);
    mk('drake_walk', 'drake_walk', 8, 12);
    mk('slinger_idle', 'slinger_idle', 8, 7);
    mk('slinger_walk', 'slinger_walk', 8, 10);
    mk('warden_idle', 'warden_idle', 8, 6);
    mk('wyrm_idle', 'wyrm_idle', 8, 7);
    mk('wyrm_walk', 'wyrm_walk', 8, 10);
  }

  _begin() {
    this.started = true;
    // ?warp=<x> 调试参数：直接把玩家投放到指定世界 x（此前触发器视为已消费）
    const wm = location.search.match(/warp=(\d+)/);
    if (wm) {
      const wx = Phaser.Math.Clamp(+wm[1], 60, Forge.WORLD.W - 200);
      this.P.x = wx;
      for (const tr of this._trigs) if (tr.at < wx) tr.done = true;
      this.camMinX = Math.max(0, wx - Forge.W * Forge.CAM.aheadFrac);
      this.cameras.main.scrollX = Math.min(this.camMinX, Forge.WORLD.W - Forge.W);
      this.player.setX(wx);
    }
    window.GameHUD && GameHUD.setHearts(this.P.hp, Forge.PLAYER.maxHp);
    this._enterSegment(this._segAt(this.P.x), true);
    if (this.auto) this.time.addEvent({ delay: 140, loop: true, callback: () => this._botTick() });
  }

  update(_t, delta) {
    if (!this.started) return;
    let dms = Math.min(delta, 50);
    if (this._freeze > 0) { this._freeze -= delta; dms = 0; }
    if (!this.ended) {
      this._updatePlayer(dms);
      this._updateEnemies(dms);
      this._updateProjectiles(dms);
      this._updateTriggers();
      this._updateSegment();
    }
    this._updateCamera(dms);
    this._updateParallax();
    this.playerShadow.setX(this.P.x)
      .setVisible(this.player.visible && this.player.alpha > 0.05)
      .setAlpha(0.3 * this.player.alpha);
  }

  // ── 通用小件 ──
  _hitstop(ms) { this._freeze = Math.max(this._freeze, ms); }

  _shockRing(x, y, r, mix, dur = 320) {
    Forge.FX.ring({ x, y, r, dur, mode: 'out', n: Forge.FXN.ring, mix });
  }

  _warnRing(x, y, r, dur) {
    Forge.FX.ring({ x, y, r, dur, mode: 'in', n: Forge.FXN.ring, mix: Forge.ENEMY_MIX });
  }

  // 叙事卡 toast：屏幕空间（scrollFactor 0），否则会被镜头甩在身后（蓝图 §2.3）
  _toast(msg, hold = 1700) {
    if (this._toastEls) for (const e of this._toastEls) e.destroy();
    const bg = this.add.rectangle(Forge.W / 2, 92, 420, 52, 0x0a0c14, 0.88)
      .setDepth(Forge.C.DEPTH.TOAST).setStrokeStyle(1, 0xffd98a, 0.5).setAlpha(0).setScrollFactor(0);
    const t = this.add.text(Forge.W / 2, 92, msg, {
      fontFamily: 'Georgia, serif', fontSize: '15px', color: '#ffd98a', align: 'center', lineSpacing: 6,
    }).setOrigin(0.5).setDepth(Forge.C.DEPTH.TOAST + 1).setAlpha(0).setScrollFactor(0);
    bg.width = Math.max(260, t.width + 48); bg.height = t.height + 22;
    this._toastEls = [bg, t];
    this.tweens.add({
      targets: [bg, t], alpha: 1, y: 104, duration: 300, hold, yoyo: true,
      onComplete: () => { bg.destroy(); t.destroy(); this._toastEls = null; },
    });
  }

  _updateScore() {
    window.GameHUD && GameHUD.setScore(Math.round(this.P.x / Forge.WORLD.W * 100) + '%');
  }

  _win() {
    this.ended = true; this.won = true;
    this._stopBGM();
    window.GameAudio && GameAudio.play('win');
    this.time.delayedCall(900, () =>
      window.GameHUD && GameHUD.showGameOver(true,
        `屠龙者终成恶龙。\n你带着夺来的爪与翼站上金山，剑与锤早已丢在来路上。\n击杀 ${this.kills} · 残命 ${this.lives} —— 而下一个屠龙者，已在麦田出发。`));
  }

  _gameover() {
    this.ended = true; this.won = false;
    this._stopBGM();
    window.GameAudio && GameAudio.play('lose');
    this.time.delayedCall(1000, () =>
      window.GameHUD && GameHUD.showGameOver(false,
        `影散于${Forge.SEGMENTS[this.segIdx].name}。\n三条残命都留在了去龙巢的路上——夺来的形态，救不了走不完的路。`));
  }

  // ── 对外契约（verify / playtest / 调试）：老字段保持，新增 progress/segment/locked ──
  _exposeContract() {
    const self = this;
    window.__scene = this;
    window.__probe = () => ({
      started: self.started, ended: self.ended, won: self.won,
      lost: self.ended && !self.won,
      hp: self.P.hp, maxHp: Forge.PLAYER.maxHp, lives: self.lives,
      progress: Math.round(self.P.x / Forge.WORLD.W * 100),
      cellX: Forge.WORLD.W,   // playtest 进度分母（世界终点 x）
      segment: self.segIdx, locked: !!self.lock,
      wave: self.lock ? self.lock.wi : -1,
      enemies: self.enemies.length, kills: self.kills,
      form: self.P.form, state: self.P.state, x: Math.round(self.P.x),
    });
    window.__gameState = { player: this.P };
  }

  // ── bot 三管线（蓝图 §6）：smart 日常 / godmode 必胜回归 / dumb 必败回归 ──
  _botTick() {
    if (this.ended || !this.started) return;
    if (this.botMode === 'godmode') return this._botGodmode();
    if (this.botMode === 'dumb') return this._botDumb();
    const P = this.P;
    if (P.state !== 'free') { this._botMv = 0; return; }
    const cam = this.cameras.main.scrollX;
    let near = null, nd = 1e9, threats = 0, danger = false;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (e.def.sky && e.state === 'sky' && Math.abs(P.x - e.skyX) < e.def.sky.r + 20) danger = true;
      if (e.spr.alpha < 1) continue;
      if (!this.lock && (e.x < cam - 80 || e.x > cam + Forge.W + 140)) continue;   // 视野外不纠缠
      if (this.lock && (e.x < this.lock.camX + 20 || e.x > this.lock.camX + Forge.W - 20)) continue;   // 锁点外的不追（追不到，会被边界钳死）
      const d = Math.abs(e.x - P.x);
      if (d < nd) { nd = d; near = e; }
      if (d < 170) threats++;
      if (e.state === 'lunge' || (e.state === 'tele' && d < 200) || d < 66) danger = true;
    }
    for (const pr of this.projectiles)
      if (Math.sign(P.x - pr.x) === pr.dir && Math.abs(pr.x - P.x) < 130) danger = true;
    // 横版兜底：视野内无活敌且不在锁点 → 持续向右推进
    if (!near) { this._botMv = 1; return; }
    const dir = Math.sign(near.x - P.x) || 1;
    const F = Forge.FORMS[P.form];

    if (danger && P.cds.mist <= 0) { P.dir = dir; this._botMv = 0; return this._doMist(); }
    if (threats >= 2 && F.K === 'hammer' && P.cds.hammer <= 0 && nd < 140) { this._botMv = 0; return this._doHammer(); }
    if (F.K === 'shard' && !near.def.boss && nd > 180 && nd < 420 && P.cds.shard <= 0) { P.dir = dir; this._botMv = 0; return this._doShard(); }
    if (F.J === 'sword' && nd < 240 && P.cds.sword <= 0) { P.dir = dir; this._botMv = 0; return this._doSword(); }
    if (F.J === 'claw' && nd < 165 && P.cds.claw <= 0) { P.dir = dir; this._botMv = 0; return this._doClaw(); }
    // Boss 挥臂半径 ≤190：保持 210px 风筝距离；杂兵则主动贴近——
    // 站位带太宽会与慢速敌长时间对峙（横版 bot 站桩 >6s 会被 playtest 判 stuck）
    const keep = near.def.boss ? 210 : 90;
    this._botMv = nd > (near.def.boss ? 250 : 130) ? dir : (nd < keep ? -dir : 0);
  }

  // 回归·godmode：钉血 + 每 tick 秒杀 + 强制右移——验证「触发器全消费 → 锁点开/清/解 → 推进到终点 → win」
  _botGodmode() {
    this.P.hp = Forge.PLAYER.maxHp;
    this._botMv = 1;
    for (const e of this.enemies) if (!e.dead) { e.hp = 0; this._killEnemy(e); }
  }

  // 回归·dumb：只朝最近敌人走、从不出招；无敌人也向右走（否则卡空旷段走不到 gameover）
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

  // ── BGM：按段切换（曲库跨目录复用，缺失静默）──
  _playBGM(i) {
    const key = `music_${i}`;
    if (!this.cache.audio.exists(key)) return;
    if (this.currentBGM && this.currentBGM.key === key) return;
    this.sound.mute = !!(window.GameAudio && window.GameAudio.muted);
    if (this.currentBGM) {
      const prev = this.currentBGM;
      this.tweens.add({ targets: prev, volume: 0, duration: 800, onComplete: () => prev.stop() });
    }
    const track = this.sound.add(key, { loop: true, volume: 0 });
    this.currentBGM = track;
    track.play();
    this.tweens.add({ targets: track, volume: 0.35, duration: 800 });
  }

  _stopBGM() {
    if (!this.currentBGM) return;
    this.tweens.add({ targets: this.currentBGM, volume: 0, duration: 900,
      onComplete: () => this.currentBGM && this.currentBGM.stop() });
  }
}
