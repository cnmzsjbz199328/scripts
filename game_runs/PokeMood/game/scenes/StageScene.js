/* 玩法本体：戳 → 反应 → 情绪升级。
 * 没有关卡、没有失败、没有通关（toy/sandbox，见 DESIGN §0）。
 */
window.PM = window.PM || {};

PM.StageScene = class StageScene extends Phaser.Scene {
  constructor() { super('Stage'); }

  create() {
    const C = PM.Config;
    this.state = PM.Mood.create();
    PM.React.reset();
    this.lockUntil = 0;
    this.lockHard = false;      // tier3/哭：不可打断
    this.showRegions = false;
    this._lastMood = 'NEUTRAL';

    this._buildBackdrop();
    this._buildCircle();
    this._buildCharacter();
    this._buildBubble();
    this._buildDebug();
    this._buildInput();

    this.playAnim('idle');
    this._setMoodVisual('NEUTRAL', true);

    if (window.GameHUD) {
      window.GameHUD.setObjective('戳戳看她会有什么反应');
      window.GameHUD.setScore(0);
    }

    // 供 poke-bot / verify 读写（注意：**不暴露 player 键** —— game-verify 一旦看到
    // __gameState.player 就会断言"按方向键后坐标要变"，本游戏角色不移动，必然误判失败）
    window.__gameState = { scene: this, sprite: this.char };
    window.__scene = this;
  }

  /* ── 画面 ──────────────────────────────────────────────── */

  _buildBackdrop() {
    const C = PM.Config;
    const g = this.add.graphics();
    g.fillGradientStyle(0x1b2334, 0x1b2334, 0x0d1119, 0x0d1119, 1);
    g.fillRect(0, 0, C.WIDTH, C.HEIGHT);
    // 角色背后的一团柔光，让剪影不至于糊在背景里。
    // 用径向渐变贴图而不是 ellipse —— 实心椭圆边缘是硬的，在深色背景上会看成一块蓝色圆盘。
    if (!this.textures.exists('pm-halo')) {
      const size = 512;
      const cv = this.textures.createCanvas('pm-halo', size, size);
      const ctx = cv.getContext();
      const gr = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      gr.addColorStop(0, 'rgba(255,255,255,0.85)');
      gr.addColorStop(0.45, 'rgba(255,255,255,0.30)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, size, size);
      cv.refresh();
    }
    this.halo = this.add.image(C.CHAR_X, 430, 'pm-halo')
      .setDisplaySize(620, 700)
      .setTint(0x33507a)
      .setAlpha(0.55)
      .setBlendMode(Phaser.BlendModes.ADD);
  }

  /* 程序化法阵覆盖层（DESIGN §4.5 ①）：
   * 素材里各段自带的法阵样式/颜色本来就不一致（六条视频分六次生成），
   * 与其修，不如在脚下盖一层统一的、跟着情绪变色的法阵，顺手变成情绪指示器。
   * 必须比素材自带的亮，否则底下的会透出来 —— 所以用 ADD 混合 + 高不透明度。 */
  _buildCircle() {
    this.circle = this.add.graphics().setDepth(1);
    this.circle.setBlendMode(Phaser.BlendModes.ADD);
    this.circleAngle = 0;
    this.circleColor = PM.Config.MOOD_COLOR.NEUTRAL;
    this.circlePulse = 0;
  }

  _drawCircle() {
    const C = PM.Config;
    const g = this.circle;
    const cx = C.CHAR_X, cy = 688;
    const rx = 168 + this.circlePulse * 26, ry = 44 + this.circlePulse * 8;
    const col = this.circleColor;

    g.clear();
    g.lineStyle(2.5, col, 0.85);
    g.strokeEllipse(cx, cy, rx * 2, ry * 2);
    g.lineStyle(1.5, col, 0.55);
    g.strokeEllipse(cx, cy, rx * 1.56, ry * 1.56);
    g.strokeEllipse(cx, cy, rx * 0.72, ry * 0.72);

    // 符文刻度：随情绪旋转，生气时转得快
    g.lineStyle(2, col, 0.7);
    for (let i = 0; i < 12; i++) {
      const a = this.circleAngle + (i * Math.PI) / 6;
      const x1 = cx + Math.cos(a) * rx * 0.78, y1 = cy + Math.sin(a) * ry * 0.78;
      const x2 = cx + Math.cos(a) * rx * 0.98, y2 = cy + Math.sin(a) * ry * 0.98;
      g.lineBetween(x1, y1, x2, y2);
    }
    // 内层反向小三角
    g.lineStyle(1.5, col, 0.5);
    for (let i = 0; i < 3; i++) {
      const a = -this.circleAngle * 1.6 + (i * Math.PI * 2) / 3;
      const b = a + (Math.PI * 2) / 3;
      g.lineBetween(cx + Math.cos(a) * rx * 0.55, cy + Math.sin(a) * ry * 0.55,
                    cx + Math.cos(b) * rx * 0.55, cy + Math.sin(b) * ry * 0.55);
    }
  }

  _buildCharacter() {
    const C = PM.Config;
    this.char = this.add.sprite(C.CHAR_X, C.CHAR_Y, 'idle', 0)
      .setOrigin(0.5, 0)
      .setDepth(5);
    this.char.on('animationcomplete', a => {
      if (PM.Config.ANIMS[a.key]?.mode === 'once') this._releaseLock();
    });
  }

  _buildBubble() {
    const C = PM.Config;
    this.bubble = this.add.container(C.CHAR_X + 150, 130).setDepth(20).setAlpha(0);
    this.bubbleBg = this.add.graphics();
    this.bubbleText = this.add.text(0, 0, '', {
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
      fontSize: '17px', color: '#12181f', wordWrap: { width: 250 }, lineSpacing: 5,
    }).setOrigin(0, 0);
    this.bubble.add([this.bubbleBg, this.bubbleText]);
  }

  _buildDebug() {
    this.debugG = this.add.graphics().setDepth(30).setVisible(false);
    this.hintText = this.add.text(14, PM.Config.HEIGHT - 26,
      'G 显示触碰区 · M 静音 · R 重来', {
        fontFamily: 'Consolas, monospace', fontSize: '12px', color: '#4c5a72',
      }).setDepth(30);
  }

  /* 「这一点是不是在角色身上」——查 base.png 的 alpha。
   * 采样一小圈而不是单点，免得被 1px 的透明缝隙误判成"点空了"（判定宁松勿紧）。 */
  _makeBodyTest() {
    const C = PM.Config;
    const tex = this.textures.exists('base') ? 'base' : null;
    if (!tex) return null;                    // 没有基准帧就退回"不设闸门"
    const OFF = [[0, 0], [-9, 0], [9, 0], [0, -9], [0, 9], [-7, -7], [7, 7]];

    return (fx, fy) => {
      const px = fx * C.FRAME_W, py = fy * C.FRAME_H;
      for (const [dx, dy] of OFF) {
        const x = Math.round(px + dx), y = Math.round(py + dy);
        if (x < 0 || y < 0 || x >= C.FRAME_W || y >= C.FRAME_H) continue;
        if (this.textures.getPixelAlpha(x, y, tex) > 24) return true;
      }
      return false;
    };
  }

  _buildInput() {
    this._isBody = this._makeBodyTest();

    this.input.on('pointerdown', p => {
      this._down = { t: this.time.now, x: p.x, y: p.y };
      this._travel = 0;
      this._prev = { x: p.x, y: p.y };
    });
    this.input.on('pointermove', p => {
      if (!this._down) return;
      this._travel += Math.hypot(p.x - this._prev.x, p.y - this._prev.y);
      this._prev = { x: p.x, y: p.y };
    });
    this.input.on('pointerup', p => {
      if (!this._down) return;
      const up = { t: this.time.now, x: p.x, y: p.y };
      const gesture = PM.Touch.classify(this._down, up, this._travel);
      // rub 用抬起点判区域最自然（手停在哪就是摸哪）
      const { fx, fy } = PM.Touch.toFrame(up.x, up.y);
      const region = PM.Touch.hitRegion(fx, fy, this._isBody);
      this._down = null;
      if (region) this.poke(region, gesture);
    });

    this.input.keyboard.on('keydown-G', () => {
      this.showRegions = !this.showRegions;
      this.debugG.setVisible(this.showRegions);
      this._drawDebug();
    });
    this.input.keyboard.on('keydown-M', () => {
      if (window.GameAudio) window.GameAudio.toggle();
    });
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
  }

  /* ── 玩法 ──────────────────────────────────────────────── */

  poke(region, gesture = 'tap') {
    const now = this.time.now;
    // 重反应/哭泣期间不播新反应，但热度照常累加（戳了不是没代价）
    const locked = this.lockHard && now < this.lockUntil;

    const ev = PM.Mood.poke(this.state, region, gesture, now);

    if (ev.punish) {
      // 惩罚是整局的高潮，**允许打断任何锁**。
      // （曾经写成"锁期间直接 return"，导致惩罚判定在锁里被丢掉，
      //   玩家永远看不到泼水、直接跳去哭 —— poke-bot 第 3 项就是抓这个的。）
      this._punish();
    } else if (locked) {
      this._nudge();
      this._syncHud();
      return ev;
    } else {
      const pick = PM.React.pick(region, ev.tier, PM.loaded);
      if (pick) {
        this.playAnim(pick.anim, ev.tier >= 3);
        if (pick.line) this.say(pick.line);
      }
      // 情绪本身也要有画面：升级时优先播情绪动画（若该 tier 没有专属反应）
      if (ev.moodChanged && ev.mood === 'HAPPY' && PM.loaded.has(PM.HAPPY_REACT.anim)) {
        this.playAnim(PM.HAPPY_REACT.anim, false);
      }
    }

    this._setMoodVisual(this.state.mood);
    this._feedback(ev);
    this._syncHud();
    return ev;
  }

  _punish() {
    const p = PM.PUNISH;
    if (PM.loaded.has(p.anim)) this.playAnim(p.anim, true);
    this.say(p.line);
    if (window.GameAudio) window.GameAudio.play('morph');
    // 前摇播到一半时把水泼出来（素材只有蓄力，释放由渲染层做）
    this.time.delayedCall(520, () => this._waterBurst());
  }

  _dropTexture() {
    if (this.textures.exists('pm-drop')) return;
    // 软边圆点。硬边圆放大后是一坨白球，看着像棉花不像水
    const size = 64;
    const cv = this.textures.createCanvas('pm-drop', size, size);
    const ctx = cv.getContext();
    const gr = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, size, size);
    cv.refresh();
  }

  /* 朝屏幕泼水（DESIGN §4.5 ②）：素材里的喷射方向三条视频都不对，索性用粒子做，方向可控。
   *
   * "冲着你来"分两层给：
   *   ① 从杖头炸开的小水滴 —— 又小又快、边扩边淡，是"水花"
   *   ② 溅在镜头上的水渍   —— 定在屏幕上不动、慢慢滑落淡出，是"泼到了你脸上"
   * 第二层才是真正卖掉方向感的东西；只有第一层的话，看起来只是她身上冒了团雾。 */
  _waterBurst() {
    const C = PM.Config;
    this._dropTexture();
    const ox = C.CHAR_X - 120, oy = 300;      // 杖头水球的大致位置

    // ① 水花
    const em = this.add.particles(ox, oy, 'pm-drop', {
      speed: { min: 340, max: 900 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.14, end: 0.62 },
      alpha: { start: 0.9, end: 0 },
      lifespan: { min: 380, max: 700 },
      quantity: 5,
      frequency: 16,
      tint: [0xbfe6ff, 0x6fb4f2, 0x8fd0ff],
      blendMode: Phaser.BlendModes.ADD,
    }).setDepth(40);
    this.time.delayedCall(330, () => em.stop());
    this.time.delayedCall(1400, () => em.destroy());

    // ② 镜头水渍
    this.time.delayedCall(160, () => {
      for (let i = 0; i < 16; i++) {
        const d = this.add.image(
          Phaser.Math.Between(60, C.WIDTH - 60),
          Phaser.Math.Between(60, C.HEIGHT - 120), 'pm-drop')
          .setDepth(42)
          .setTint(0xdff1ff)
          .setAlpha(0)
          .setScale(Phaser.Math.FloatBetween(0.5, 1.9))
          .setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: d, alpha: { from: 0, to: Phaser.Math.FloatBetween(0.35, 0.75) },
          duration: 90, delay: i * 14,
          onComplete: () => this.tweens.add({
            targets: d, alpha: 0, y: d.y + Phaser.Math.Between(14, 46),
            duration: Phaser.Math.Between(700, 1500),
            onComplete: () => d.destroy(),
          }),
        });
      }
    });

    const flash = this.add.rectangle(C.WIDTH / 2, C.HEIGHT / 2, C.WIDTH, C.HEIGHT, 0x7fc4ff, 0.38)
      .setDepth(41).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: flash, alpha: 0, duration: 620, onComplete: () => flash.destroy() });

    if (!this._reducedMotion()) this.cameras.main.shake(300, 0.009);
    if (window.GameAudio) window.GameAudio.play('splashBad');
  }

  playAnim(key, hard = false) {
    if (!PM.loaded.has(key)) key = 'idle';
    const cfg = PM.Config.ANIMS[key];
    this.char.play(key, true);

    if (cfg.mode === 'once') {
      // 锁 = 动画时长 + 冗余。带超时兜底：animationcomplete 万一丢了也能自动解锁，
      // 否则角色会永远卡在某个反应里（ShadowForge 踩过的同源坑）
      const dur = (cfg.frames / cfg.fps) * 1000;
      this.lockUntil = this.time.now + dur + PM.Config.LOCK_GRACE_MS;
      this.lockHard = hard;
    } else {
      this.lockUntil = 0;
      this.lockHard = false;
    }
  }

  /* 一段反应播完之后去哪：情绪还在维持期内就**接着播情绪动画**，否则回 idle。
   * 这条很关键 —— 惩罚播的是 water_threat（举水球），mood 却已经是 CRY；
   * 没有这一步，`cry` 这段素材永远不会出现在游戏里，人被惹哭了却看不到哭。
   * 情绪动画是 once，播完再回到这里，于是在维持期内自然循环。 */
  _releaseLock() {
    this.lockUntil = 0;
    this.lockHard = false;

    if (this.state.mood !== 'NEUTRAL' && this.time.now < this.state.moodUntil) {
      const moodAnim = PM.Config.MOOD_ANIM[this.state.mood];
      if (moodAnim && moodAnim !== 'idle' && PM.loaded.has(moodAnim)) {
        this.playAnim(moodAnim, this.state.mood === 'CRY');   // 哭不可打断
        return;
      }
      return;   // 没有对应素材就停在当前末帧
    }
    this.char.play('idle', true);
  }

  /* ── 表现 ──────────────────────────────────────────────── */

  say(text) {
    this.bubbleText.setText(text);
    const w = this.bubbleText.width + 26, h = this.bubbleText.height + 20;
    this.bubbleText.setPosition(13, 10);
    this.bubbleBg.clear();
    this.bubbleBg.fillStyle(0xf4f7fb, 0.96).fillRoundedRect(0, 0, w, h, 12);
    this.bubbleBg.lineStyle(2, this.circleColor, 0.9).strokeRoundedRect(0, 0, w, h, 12);
    this.bubbleBg.fillStyle(0xf4f7fb, 0.96)
      .fillTriangle(16, h, 40, h, 20, h + 13);

    this.bubble.setPosition(PM.Config.CHAR_X + 118, 120);
    this.tweens.killTweensOf(this.bubble);
    this.bubble.setAlpha(0).setScale(0.94);
    this.tweens.add({ targets: this.bubble, alpha: 1, scale: 1, duration: 130 });
    this.tweens.add({ targets: this.bubble, alpha: 0, delay: 2600, duration: 320 });
  }

  _setMoodVisual(mood, instant = false) {
    const col = PM.Config.MOOD_COLOR[mood] ?? PM.Config.MOOD_COLOR.NEUTRAL;
    if (instant) { this.circleColor = col; this._lastMood = mood; return; }
    if (mood === this._lastMood) return;
    this._lastMood = mood;

    // 法阵换色走插值，不然情绪一变整圈突然跳色
    const from = Phaser.Display.Color.IntegerToColor(this.circleColor);
    const to = Phaser.Display.Color.IntegerToColor(col);
    this.tweens.addCounter({
      from: 0, to: 100, duration: 320,
      onUpdate: t => {
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(from, to, 100, t.getValue());
        this.circleColor = Phaser.Display.Color.GetColor(c.r, c.g, c.b);
      },
    });
    this.halo.setTint(col);
  }

  _feedback(ev) {
    if (window.GameAudio) {
      window.GameAudio.play(
        ev.tier >= 3 ? (ev.mood === 'CRY' ? 'lose' : 'splashBad')
        : ev.tier === 2 ? 'ui'
        : ev.soothed ? 'splashGood' : 'tick'
      );
    }
    this.circlePulse = Math.min(1, this.circlePulse + (ev.tier >= 3 ? 0.9 : 0.35));
    if (ev.tier >= 3 && !this._reducedMotion()) this.cameras.main.shake(160, 0.004);
  }

  // 被锁住时的"没用"微反馈：她躲得更远一点
  _nudge() {
    if (this._reducedMotion()) return;
    this.tweens.killTweensOf(this.char);
    this.char.x = PM.Config.CHAR_X;
    this.tweens.add({ targets: this.char, x: PM.Config.CHAR_X + 9, duration: 70, yoyo: true, repeat: 1 });
  }

  _reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  _drawDebug() {
    const C = PM.Config;
    const g = this.debugG;
    g.clear();
    if (!this.showRegions) return;
    const left = C.CHAR_X - C.FRAME_W / 2;
    for (const id of PM.REGION_ORDER) {
      const r = PM.REGIONS[id];
      const hot = this.state.heat[id] / C.HEAT_MAX;
      g.lineStyle(2, 0x6ea8ff, 0.85);
      g.fillStyle(0xff5555, 0.10 + hot * 0.45);
      const x = left + r.x * C.FRAME_W, y = C.CHAR_Y + r.y * C.FRAME_H;
      g.fillRect(x, y, r.w * C.FRAME_W, r.h * C.FRAME_H);
      g.strokeRect(x, y, r.w * C.FRAME_W, r.h * C.FRAME_H);
    }
  }

  _syncHud() {
    if (!window.GameHUD) return;
    const s = this.state;
    window.GameHUD.setScore(s.reactionsPlayed);
    window.GameHUD.setObjective(
      `${PM.Config.MOOD_LABEL[s.mood]} · 耐心 ${Math.round(s.patience)}`
    );
  }

  update(time, delta) {
    const ev = PM.Mood.step(this.state, delta, time);
    if (ev?.moodChanged) {
      this._setMoodVisual(this.state.mood);
      this._syncHud();
      if (!this.lockHard) this.char.play('idle', true);
    }

    // 锁的超时兜底（动画事件丢失时的最后一道防线）
    if (this.lockUntil && time > this.lockUntil) this._releaseLock();

    const speed = this.state.mood === 'ANGRY' || this.state.mood === 'CRY' ? 1.9 : 1;
    this.circleAngle += 0.0006 * delta * speed;
    this.circlePulse = Math.max(0, this.circlePulse - delta / 900);
    this._drawCircle();
    if (this.showRegions) this._drawDebug();
  }
};
