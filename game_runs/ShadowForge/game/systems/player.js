/* ShadowForge — 玩家状态机（Object.assign 到 ArenaScene 原型）。
 * 变形即招式：J 化矛突刺(击穿) / K 化锤震地(击退) / L 雾化闪避(无敌帧) /
 * E 消耗「魄」化形为恶鬼(限时,J 变爪袭)。
 * 状态: free / spear / hammer / sickle / throw / mist / morphing / lunge / dead。
 *
 * ── 统一受击裁决（_isSolid）：一条规则覆盖全部化形态 ──
 * 「本体是否留有可击的立足点」决定能否被击，与 Boss「打武器=打Boss」同源：
 *   · 原地化形招（锤/镰）与站立起手（掷弹）——武器/身体锚在原地，打它即打本体 → 可被击。
 *   · 位移化形招（矛/爪/雾）——本体散作自由粒子高速离开原地，没有可打的定点 → 免疫(i-frame，
 *     这是「变形过渡从僵直负债变成主动防御资产」的设计核心，见 gdd 支柱）。
 *   · 变身过渡（morphing）与死亡消散——纯粒子，免疫。 */
Object.assign(ArenaScene.prototype, {

  // 本体当前是否有可击的立足点（受击/被弹丸命中的唯一判据，敌我弹与近身共用）
  _isSolid() {
    const s = this.P.state;
    return s === 'free' || s === 'hammer' || s === 'sickle' || s === 'throw';
  },

  _buildPlayer() {
    const C = Forge.C, P = Forge.PLAYER;
    this.P = {
      x: 180, dir: 1, hp: P.maxHp, essence: 0,
      state: 'free', form: 'dante', scale: P.scale,
      formLeft: 0, invuln: 0, queued: null, pendingForm: null,
      cds: { spear: 0, hammer: 0, sickle: 0, mist: 0, lunge: 0, throw: 0 },
    };
    this.playerShadow = this.add.ellipse(this.P.x, C.FEET_Y - 10, 70, 12, 0x000000, 0.3)
      .setDepth(C.DEPTH.SHADOW);
    this.player = this.add.sprite(this.P.x, this._pY(), 'dante_idle_0')
      .setOrigin(0.5, 1).setScale(this.P.scale).setDepth(C.DEPTH.CHAR);
    this.player.play('dante_idle');
    // 常驻主角背景圆形光晕（高亮体现主角，位于角色后方）
    this.playerGlow = this.add.sprite(this.P.x, this._pY() - 60, 'glow_circle')
      .setOrigin(0.5, 0.5).setDepth(C.DEPTH.CHAR - 0.5)
      .setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    this._glowT = 0;
  },

  // 脚底锚点世界 y：glb-sprite 帧底部有 24px 透明留白须补偿，svg(恶鬼形)没有
  _pY() {
    const form = Forge.FORM_BY_TYPE[this.P.form];
    const glb = this.P.form === 'dante' || (form && form.glb);
    return Forge.C.FEET_Y + (glb ? Forge.C.GLB_PAD * this.P.scale : 0);
  },

  _playerCloud() {
    const form = Forge.FORM_BY_TYPE[this.P.form];
    return Forge.Cloud.fromTexture(this, this.P.form === 'dante' ? 'dante_idle_0' : form.tex, Forge.FXN.morph);
  },

  // 玩家粒子渐染色：按当前波次取染色比例，见 config.js PALETTE
  _lightMix() {
    return Forge.C.PALETTE[this.wave] || null;
  },

  // 光晕常驻跟随：贴着 this.player 的中心，呼吸式明暗；第一关也显示（灰色光晕）
  _updateGlow(dms) {
    const g = this.playerGlow, mix = this._lightMix();
    this._glowT += dms;
    const accent = (mix && mix.accent !== null) ? mix.accent : 0x4a5a6a; // 第一关没有 accent 时用雾灰色
    const py = this.player.y - this.player.displayHeight / 2;
    g.setVisible(this.player.visible)
      .setPosition(this.player.x, py)
      .setScale(1.15) // 圆形大小适当外扩，约覆盖整个身躯周围
      .setTint(accent) // 对于白色渐变图，用 setTint 能够完美染出带渐变的光晕颜色
      .setAlpha(0.38 + Math.sin(this._glowT / 400) * 0.08); // 柔和的呼吸明暗
  },

  // 150ms 输入缓冲：free 时立即执行，非 free 时记录最近一次意图（单槽覆盖），
  // 招式 onDone 落地瞬间消费——避免"矛落地前按下一招"被直接吞掉的发粘感
  _queueOrRun(fn) {
    if (this.P.state === 'free') fn();
    else this.P.queued = { fn, t: this.time.now };
  },

  _flushQueued() {
    const q = this.P.queued;
    this.P.queued = null;
    if (q && this.time.now - q.t <= 150) q.fn();
  },

  _updatePlayer(dms) {
    const P = this.P, C = Forge.C;
    for (const k in P.cds) P.cds[k] = Math.max(0, P.cds[k] - dms);
    P.invuln = Math.max(0, P.invuln - dms);
    this._updateGlow(dms);
    if (P.form !== 'dante') {
      P.formLeft -= dms;
      if (P.formLeft <= 0 && P.state === 'free') this._revertForm();
    }

    // 技能输入：每帧都判 JustDown（哪怕非 free 也要消费边沿，否则漏判/延迟触发）
    if (!this.auto) {
      const K = Phaser.Input.Keyboard.JustDown;
      if (K(this.keys.J)) this._queueOrRun(() => {
        if (P.form === 'fiend') this._fiendLunge();
        else if (P.form === 'furies') this._furiesThrow();
        else this._doSpear();
      });
      if (K(this.keys.K)) this._queueOrRun(() => this._doHammer());
      if (K(this.keys.I)) this._queueOrRun(() => this._doSickle());
      if (K(this.keys.L) || K(this.keys.SPACE)) this._queueOrRun(() => this._doMist());
      if (K(this.keys.E)) this._queueOrRun(() => this._doTransform());
      // 雾化转向：化雾中按反方向 → 从原地重发一段新方向的雾（见 _startMist 的世代号处理）
      if (P.state === 'mist') {
        let steer = 0;
        if (K(this.keys.A) || K(this.keys.LEFT)) steer = -1;
        else if (K(this.keys.D) || K(this.keys.RIGHT)) steer = 1;
        if (steer && steer !== P.dir) this._startMist(steer, ++this._mistGen);
      }
    }
    if (P.state !== 'free') return;

    // 移动：键盘或 bot 意图
    let mv = 0;
    if (this.auto) mv = this._botMv || 0;
    else {
      if (this.keys.A.isDown || this.keys.LEFT.isDown) mv = -1;
      else if (this.keys.D.isDown || this.keys.RIGHT.isDown) mv = 1;
    }
    const formCfg = Forge.FORM_BY_TYPE[P.form];
    if (mv) {
      P.dir = mv;
      const spd = (formCfg ? formCfg.speed : Forge.PLAYER.speed) * this._speedFactor();
      P.x = Phaser.Math.Clamp(P.x + mv * spd * dms / 1000, C.X_MIN, C.X_MAX);
    }
    this.player.setX(P.x).setFlipX(P.dir < 0);
    let want = 'dante_idle';
    if (P.form === 'dante') {
      want = mv ? 'dante_walk' : 'dante_idle';
    } else {
      want = mv ? `${P.form}_walk` : `${P.form}_idle`;
    }
    if (!this.player.anims.currentAnim || this.player.anims.currentAnim.key !== want)
      this.player.play(want, true);
  },

  // icesoul 减速地带：站在圈内按 factor 降速（多圈叠加取最小值，最容易踩坑先修）
  _speedFactor() {
    let f = 1;
    for (const z of this.slowZones)
      if (Math.abs(this.P.x - z.x) < z.r) f = Math.min(f, z.factor);
    return f;
  },

  // ── J 化矛突刺：人→矛(morph, 落点后偏=拉弓) → 离弦即满速、尾段减速(实体段) → 矛→人(morph, 继承惯性) ──
  // 速度曲线是打击感的命门：预备(凝聚+后偏) → 释放瞬间即最高速(easeOut) → 减速收尾 →
  // 重组时粒子带残余动量过冲回聚(drift)。反过来(easeIn+死停+原地重组)会有明显惯性断层。
  _doSpear() {
    const S = Forge.SPEAR, P = this.P, C = Forge.C;
    if (P.state !== 'free' || P.cds.spear > 0) return;
    P.state = 'spear'; P.cds.spear = S.cd;
    const dir = P.dir, x0 = P.x, py = this._pY();
    const xDraw = Phaser.Math.Clamp(x0 - dir * 14, C.X_MIN, C.X_MAX);   // 拉弓式反向预备
    const x1 = Phaser.Math.Clamp(x0 + dir * S.range, C.X_MIN, C.X_MAX);
    const wKey = Forge.Cloud.weapon(this, 'spear');
    const wCloud = Forge.Cloud.fromTexture(this, wKey, Forge.FXN.morph);
    const hCloud = this._playerCloud();
    this.player.setVisible(false);
    window.GameAudio && GameAudio.play('morph');

    Forge.FX.morph({
      src: { cloud: hCloud, x: x0, y: py, scale: P.scale, flip: dir },
      dst: { cloud: wCloud, x: xDraw, y: C.FEET_Y, scale: 1, flip: dir },
      dur: S.inMs, turb: 22, rise: 14, mix: this._lightMix(),
      onDone: () => {
        const img = this.add.image(xDraw, C.FEET_Y, wKey)
          .setOrigin(0.5, 1).setDepth(C.DEPTH.FX).setFlipX(dir < 0);
        const hit = new Set();
        // 突刺残影按飞行距离发（每 25px 一撮）而非按时间：高速段自然更密，拖尾密度=速度读数
        let lastX = xDraw, trailAcc = 0;
        this.tweens.add({
          targets: img, x: x1, duration: S.dashMs, ease: 'Cubic.easeOut',
          onUpdate: () => {
            trailAcc += Math.abs(img.x - lastX); lastX = img.x;
            while (trailAcc >= 25) {
              trailAcc -= 25;
              Forge.FX.burst({
                cloud: wCloud, x: img.x, y: img.y, scale: 1, flip: dir,
                n: 8, dur: 200, dirX: -dir, mix: this._lightMix(),
              });
            }
            for (const e of this.enemies)
              if (!hit.has(e) && !e.dead && Math.abs(e.x - img.x) < S.hitW) {
                hit.add(e);
                // 穿击涟漪：矛体自身也迸一撮（顿帧不停 tween，穿透反馈不能只靠敌人侧）
                Forge.FX.burst({
                  cloud: wCloud, x: img.x, y: img.y, scale: 1, flip: dir,
                  n: 14, dur: 220, dirX: dir, mix: this._lightMix(),
                });
                this._hitEnemy(e, S.dmg, dir * 46, 'spear');
              }
          },
          onComplete: () => {
            img.destroy();
            Forge.FX.morph({
              src: { cloud: wCloud, x: x1, y: C.FEET_Y, scale: 1, flip: dir },
              dst: { cloud: hCloud, x: x1, y: py, scale: P.scale, flip: dir },
              dur: S.outMs, turb: 24, rise: 16, mix: this._lightMix(),
              drift: { x: dir * 460 },   // 继承飞行末速：粒子向前甩过落点再回聚成人
              onDone: () => {
                P.x = x1;
                this.player.setX(x1).setVisible(true);
                P.state = 'free';
                this._flushQueued();
              },
            });
          },
        });
      },
    });
  },

  // ── K 化锤震地：人→锤(morph) → 砸地 AOE 击退(实体段) → 锤→人(morph) ──
  _doHammer() {
    const H = Forge.HAMMER, P = this.P, C = Forge.C;
    if (P.state !== 'free' || P.cds.hammer > 0) return;
    P.state = 'hammer'; P.cds.hammer = H.cd;
    const dir = P.dir, x = P.x, py = this._pY();
    const wKey = Forge.Cloud.weapon(this, 'hammer');
    const wCloud = Forge.Cloud.fromTexture(this, wKey, Forge.FXN.morph);
    const hCloud = this._playerCloud();
    this.player.setVisible(false);
    window.GameAudio && GameAudio.play('morph');

    // 抡砸几何：轴心在柄底(0.5,0.95)、置于胸高；锤头由过顶(0°=举锤)划弧抡向前下(dir·93°)砸地
    const OY = 0.95, WH2 = 200;
    const pvX = x, pvY = C.FEET_Y - 72;
    const dy = (1 - OY) * WH2;                 // 柄底(点云锚点=底中)相对轴心的落差
    const hx = x + dir * 144;                  // 锤头落点 x（B 震地波圆心）
    Forge.FX.morph({
      src: { cloud: hCloud, x, y: py, scale: P.scale, flip: dir },
      dst: { cloud: wCloud, x: pvX, y: pvY + dy, scale: 1, flip: dir },
      dur: H.inMs, turb: 24, rise: 34, mix: this._lightMix(),
      onDone: () => {
        const img = this.add.image(pvX, pvY, wKey)
          .setOrigin(0.5, OY).setDepth(C.DEPTH.FX).setFlipX(dir < 0).setScale(1, 0.94);
        this.tweens.add({
          targets: img, angle: dir * 93, scaleY: 1, duration: H.slamMs, ease: 'Cubic.easeIn',
          onComplete: () => {
            // 落锤瞬间：冲击挤压(宽扁一瞬) + 冲击环 + AOE 击退 + 顿帧 + 震屏
            this.tweens.add({ targets: img, scaleX: 1.4, scaleY: 0.55, duration: 70, yoyo: true, ease: 'Cubic.easeOut' });
            // B 震地波：冲击环与 AOE 判定都以锤头落点 hx 为心，向两侧扩散（视觉与判定统一到锤头）
            this._shockRing(hx, C.FEET_Y - 8, H.radius, this._lightMix());
            for (const e of this.enemies)
              if (!e.dead && Math.abs(e.x - hx) < H.radius)
                this._hitEnemy(e, H.dmg, Math.sign(e.x - hx || dir) * H.knock, 'hammer');
            this._hitstop(70);
            this.cameras.main.shake(130, 0.008);
            window.GameAudio && GameAudio.play('splashBad');
            this.time.delayedCall(90, () => {
              img.destroy();
              Forge.FX.morph({
                src: { cloud: wCloud, x: pvX, y: pvY + dy, scale: 1, flip: dir },
                dst: { cloud: hCloud, x, y: py, scale: P.scale, flip: dir },
                dur: H.outMs, turb: 26, rise: 20, mix: this._lightMix(),
                onDone: () => { this.player.setVisible(true); P.state = 'free'; this._flushQueued(); },
              });
            });
          },
        });
      },
    });
  },

  // ── I 化镰横扫：人→镰(morph) → 原地扇形横扫面前一段范围(实体段) → 镰→人(morph)；矛=长/镰=中/锤=近 ──
  _doSickle() {
    const S = Forge.SICKLE, P = this.P, C = Forge.C;
    if (P.state !== 'free' || P.cds.sickle > 0) return;
    P.state = 'sickle'; P.cds.sickle = S.cd;
    const dir = P.dir, x = P.x, py = this._pY();
    const wKey = Forge.Cloud.weapon(this, 'sword');   // 链镰 → 十字长剑：绕握柄劈砍
    const wCloud = Forge.Cloud.fromTexture(this, wKey, Forge.FXN.morph);
    const hCloud = this._playerCloud();
    // 长剑蓄力猛劈几何：偏心轴心在握柄(ox=0.15,oy=0.5)、支点举到头顶之上，绕手划一道大弧劈落至地脊
    const OX = 0.15, OY = 0.5, WS = 0.68, WW = 360, WH = 120;
    const pvX = x, pvY = C.FEET_Y - 150;
    // 点云锚点=底中(0.5,1)，实体图原点在轴心(OX,OY)，dx/dy 为两者换算（聚拢姿态=水平0°，与举剑前一致→无跳变）
    const dx = dir * (0.5 - OX) * WW * WS, dy = (1 - OY) * WH * WS;
    this.player.setVisible(false);
    window.GameAudio && GameAudio.play('morph');

    Forge.FX.morph({
      src: { cloud: hCloud, x, y: py, scale: P.scale, flip: dir },
      dst: { cloud: wCloud, x: pvX + dx, y: pvY + dy, scale: WS, flip: dir },
      dur: S.inMs, turb: 22, rise: 18, mix: this._lightMix(),
      onDone: () => {
        const img = this.add.image(pvX, pvY, wKey)
          .setOrigin(dir < 0 ? 1 - OX : OX, OY).setDepth(C.DEPTH.FX).setFlipX(dir < 0).setScale(WS);
        // 蓄力猛劈：水平(0°)聚拢 → 举顶后方(dir·-100°)蓄力 → Quart 硬抽下(dir·47°)触地结算（无跳变：起手即聚拢姿态）
        this.tweens.add({
          targets: img, angle: dir * -100, duration: 150, ease: 'Sine.easeOut',   // 举剑蓄力（Sine.easeOut 到顶微顿）
          onComplete: () => {
            window.GameAudio && GameAudio.play('release');   // 破空：劈下瞬间
            this.tweens.add({
              targets: img, angle: dir * 47, duration: 170, ease: 'Quart.easeIn',   // 猛抽下劈
              onComplete: () => {
                // 触地重击：顿帧 + 震屏 + 前向范围结算（刃锋落到地脊才判定）
                this._hitstop(70);
                this.cameras.main.shake(120, 0.006);
                for (const e of this.enemies)
                  if (!e.dead && dir * (e.x - x) > 0 && dir * (e.x - x) < S.range)
                    this._hitEnemy(e, S.dmg, dir * 70, 'sickle');
                this.time.delayedCall(90, () => {
                  img.destroy();
                  Forge.FX.morph({
                    src: { cloud: wCloud, x: pvX + dx, y: pvY + dy, scale: WS, flip: dir },
                    dst: { cloud: hCloud, x, y: py, scale: P.scale, flip: dir },
                    dur: S.outMs, turb: 24, rise: 16, mix: this._lightMix(),
                    onDone: () => { this.player.setVisible(true); P.state = 'free'; this._flushQueued(); },
                  });
                });
              },
            });
          },
        });
      },
    });
  },

  // ── L 雾化闪避：同形态两点间 morph，高湍流高上浮，全程无敌；化雾中可反向改落点（见 _steerMist） ──
  _doMist() {
    const P = this.P;
    if (P.state !== 'free' || P.cds.mist > 0) return;
    P.cds.mist = Forge.MIST.cd;
    this._mistGen = (this._mistGen || 0) + 1;
    this._mistCloud = this._playerCloud();
    this._startMist(P.dir, this._mistGen);
  },

  // 雾化中途改向：不等旧 morph 收尾，直接从原地重发一段新方向的雾（世代号让旧 onDone 失效，不覆盖新状态）
  _startMist(dir, gen) {
    const M = Forge.MIST, P = this.P, C = Forge.C;
    P.state = 'mist'; P.dir = dir;
    P.invuln = Math.max(P.invuln, M.ms + 180);
    const x0 = P.x, py = this._pY();
    const x1 = Phaser.Math.Clamp(x0 + dir * M.dist, C.X_MIN, C.X_MAX);
    this.player.setVisible(false);
    window.GameAudio && GameAudio.play('morph');
    Forge.FX.morph({
      src: { cloud: this._mistCloud, x: x0, y: py, scale: P.scale, flip: dir },
      dst: { cloud: this._mistCloud, x: x1, y: py, scale: P.scale, flip: dir },
      dur: M.ms, turb: 55, rise: 44, mix: this._lightMix(),
      onDone: () => {
        if (gen !== this._mistGen) return;   // 已被转向覆盖，交给新一段收尾
        P.x = x1;
        this.player.setX(x1).setVisible(true);
        P.state = 'free';
        this._flushQueued();
      },
    });
  },

  // ── E 吸收变形：消耗 1 魄，人形 → 最近一次吸收的敌形（限时）；每种形态的 tex/anim/scale/toast 见 config.js FORM_BY_TYPE ──
  _doTransform() {
    const P = this.P;
    if (P.essence < 1 || P.form !== 'dante' || P.state !== 'free' || !P.pendingForm) return;
    const F = Forge.FORM_BY_TYPE[P.pendingForm];
    P.essence--; this._updateScore();
    P.state = 'morphing';
    const dir = P.dir, x = P.x;
    const srcCloud = this._playerCloud();
    const dstCloud = Forge.Cloud.fromTexture(this, F.tex, Forge.FXN.morph);
    const dstY = Forge.C.FEET_Y + (F.glb ? Forge.C.GLB_PAD * F.scale : 0);
    this.player.setVisible(false);
    window.GameAudio && GameAudio.play('morph');
    window.GameAudio && GameAudio.play('unlock');
    Forge.FX.morph({
      src: { cloud: srcCloud, x, y: this._pY(), scale: P.scale, flip: dir },
      dst: { cloud: dstCloud, x, y: dstY, scale: F.scale, flip: dir },
      dur: F.morphMs, turb: 34, rise: 30, mix: this._lightMix(),
      onDone: () => {
        P.form = P.pendingForm; P.scale = F.scale; P.formLeft = F.ms;
        this.player.setTexture(F.tex).setScale(P.scale).setY(this._pY()).setVisible(true);
        this.player.play(F.anim, true);
        this._toast(F.toast);
        P.state = 'free';
        this._flushQueued();
      },
    });
  },

  _revertForm() {
    const P = this.P;
    if (P.form === 'dante' || P.state !== 'free') return;
    const F = Forge.FORM_BY_TYPE[P.form];
    P.state = 'morphing';
    const dir = P.dir, x = P.x;
    const srcCloud = this._playerCloud();
    const danteCloud = Forge.Cloud.fromTexture(this, 'dante_idle_0', Forge.FXN.morph);
    this.player.setVisible(false);
    window.GameAudio && GameAudio.play('morph');
    Forge.FX.morph({
      src: { cloud: srcCloud, x, y: this._pY(), scale: P.scale, flip: dir },
      dst: { cloud: danteCloud, x, y: Forge.C.FEET_Y + Forge.C.GLB_PAD * Forge.PLAYER.scale, scale: Forge.PLAYER.scale, flip: dir },
      dur: F.morphMs, turb: 34, rise: 30, mix: this._lightMix(),
      onDone: () => {
        P.form = 'dante'; P.scale = Forge.PLAYER.scale;
        this.player.setTexture('dante_idle_0').setScale(P.scale).setY(this._pY()).setVisible(true);
        this.player.play('dante_idle', true);
        P.state = 'free';
        this._flushQueued();
      },
    });
  },

  // ── 恶鬼形 J 爪袭：人躯化爪突进 → 爪穿击 → 爪重组回人躯（与敌恶鬼扑袭完全同构，只染玩家色）──
  // 化爪期间本体隐藏＝没有身体，突进无敌帧因此自洽（受击豁免的解释与化矛/化雾一致，见 _playerHit）
  _fiendLunge() {
    const L = Forge.FIEND_FORM.lunge, P = this.P, C = Forge.C;
    if (P.state !== 'free' || P.cds.lunge > 0) return;
    P.state = 'lunge'; P.cds.lunge = L.cd;
    const dir = P.dir, x0 = P.x, py = this._pY(), s = L.ws;
    const A = this._wpnAssets('claw');
    const wCloud = Forge.Cloud.fromTexture(this, A.key, Forge.FXN.morph);
    const hCloud = this._playerCloud();
    const wy = py - this.player.displayHeight * 0.45;   // 爪浮在躯干高度
    this.player.setVisible(false);
    window.GameAudio && GameAudio.play('morph');
    Forge.FX.morph({
      src: { cloud: hCloud, x: x0, y: py, scale: P.scale, flip: dir },
      dst: { cloud: wCloud, x: x0, y: wy + A.H * s / 2, scale: s, flip: dir },
      dur: L.inMs, turb: 26, rise: 14, mix: this._lightMix(),
      onDone: () => {
        const img = this.add.image(x0, wy, A.key).setOrigin(0.5, 0.5)
          .setDepth(C.DEPTH.FX).setFlipX(dir < 0).setScale(s).setAlpha(0.95);
        const x1 = Phaser.Math.Clamp(x0 + dir * L.dist, C.X_MIN, C.X_MAX);
        const hit = new Set();
        let trailAcc = 0, lastX = img.x;
        window.GameAudio && GameAudio.play('release');
        this.tweens.add({
          targets: img, x: x1, duration: L.ms, ease: 'Cubic.easeOut',
          onUpdate: () => {
            trailAcc += Math.abs(img.x - lastX); lastX = img.x;
            while (trailAcc >= 28) {
              trailAcc -= 28;
              Forge.FX.burst({ cloud: wCloud, x: img.x, y: img.y, scale: s, flip: dir, n: 8, dur: 180, dirX: -dir, mix: this._lightMix() });
            }
            for (const e of this.enemies)
              if (!hit.has(e) && !e.dead && Math.abs(e.x - img.x) < 52) {
                hit.add(e);
                Forge.FX.burst({ cloud: wCloud, x: img.x, y: img.y, scale: s, flip: dir, n: 12, dur: 200, dirX: dir, mix: this._lightMix() });
                this._hitEnemy(e, L.dmg, dir * 60, 'claw');
              }
          },
          onComplete: () => {
            img.destroy();
            Forge.FX.morph({
              src: { cloud: wCloud, x: x1, y: wy + A.H * s / 2, scale: s, flip: dir },
              dst: { cloud: hCloud, x: x1, y: py, scale: P.scale, flip: dir },
              dur: L.outMs, turb: 26, rise: 16, drift: { x: dir * 260 }, mix: this._lightMix(),
              onDone: () => {
                P.x = x1;
                this.player.setX(x1).setVisible(true);
                P.state = 'free';
                this._flushQueued();
              },
            });
          },
        });
      },
    });
  },

  // ── 女妖形 J 掷弹：起手僵直中剥离本体粒子凝成箭矢再掷出（有变形成本，不是零成本发射）──
  // 弹体与敌方 furies 共用 _makeDart（粒子凝成的箭矢），只是染玩家当前关卡色——"化形夺技"表现一致。
  // windup 期间 P.state='throw'：不能移动（成本），但身体仍在＝可被击（与化矛/化雾的无敌区分）
  _furiesThrow() {
    const T = Forge.FURIES_FORM.throw, P = this.P;
    if (P.state !== 'free' || P.cds.throw > 0) return;
    P.state = 'throw'; P.cds.throw = T.cd;
    const dir = P.dir, x0 = P.x, y0 = this._pY() - 100;   // 出手点抬到胸/手高（_pY 因 GLB 留白偏低）
    window.GameAudio && GameAudio.play('morph');
    // 起手：从本体点云剥离一撮粒子向出手方向迸出，弹丸源自躯体
    this._peelBurst(this._playerCloud(), P.x, this._pY(), P.scale, dir, dir, this._lightMix());
    this.time.delayedCall(T.windup, () => {
      if (P.state !== 'throw' || this.ended) return;   // 起手被打断（死亡等）则不发弹
      const dart = this._makeDart(x0, y0, dir, this._lightMix());
      window.GameAudio && GameAudio.play('release');
      const hit = new Set();
      const pos = { x: x0 };
      this.tweens.add({
        targets: pos, x: x0 + dir * 420, duration: T.ms, ease: 'Linear',
        onUpdate: () => {
          dart.setPos(pos.x, y0);
          for (const e of this.enemies)
            if (!hit.has(e) && !e.dead && Math.abs(e.x - pos.x) < 40) {
              hit.add(e);
              this._hitEnemy(e, T.dmg, dir * 30);
            }
        },
        onComplete: () => dart.die(),
      });
      P.state = 'free';
      this._flushQueued();
    });
  },

  // ── 受击（分级反馈的最低档：小迸溅 + 顿帧 + 无敌闪烁） ──
  _playerHit(dmg, fromX) {
    const P = this.P;
    if (this.ended || P.invuln > 0 || !this._isSolid()) return;   // 统一受击裁决，见文件头
    P.hp = Math.max(0, P.hp - dmg);
    window.GameHUD && GameHUD.setHearts(P.hp, Forge.PLAYER.maxHp);
    P.invuln = Forge.PLAYER.invulnMs;
    Forge.FX.burst({
      cloud: this._playerCloud(), x: P.x, y: this._pY(), scale: P.scale, flip: P.dir,
      n: 46, dirX: P.x >= fromX ? 1 : -1, mix: this._lightMix(),
    });
    this._hitstop(50);
    this.cameras.main.shake(90, 0.006);
    window.GameAudio && GameAudio.play('splashBad');
    this.tweens.add({ targets: this.player, alpha: 0.35, duration: 90, yoyo: true, repeat: 4,
      onComplete: () => this.player.setAlpha(1) });
    if (P.hp <= 0) this._diePlayer();
  },

  // ── 死亡：全身消散（分级反馈的最高档），不重组 ──
  _diePlayer() {
    const P = this.P;
    P.state = 'dead'; this.ended = true; this.won = false;
    this.player.setVisible(false);
    this.playerShadow.setVisible(false);
    Forge.FX.dissolve({
      cloud: this._playerCloud(), x: P.x, y: this._pY(), scale: P.scale, flip: P.dir,
      n: 620, dur: 1200, mix: this._lightMix(),
    });
    window.GameAudio && GameAudio.play('lose');
    if (this.currentBGM) {
      this.tweens.add({
        targets: this.currentBGM,
        volume: 0,
        duration: 900,
        onComplete: () => this.currentBGM.stop()
      });
    }
    this.time.delayedCall(1000, () =>
      window.GameHUD && GameHUD.showGameOver(false, `影散于${Forge.WAVES[this.wave].name}。\n变形不是护身符——化矛化雾时无敌，落地成形时脆弱。`));
  },
});
