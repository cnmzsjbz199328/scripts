/* WyrmsEnd — 玩家状态机（Object.assign 到 JourneyScene 原型）。
 * 动势格斗：J/K 攻击自带位移，招式与推进融为一体（与竞技场"站定读招"相反）。
 * 夺形即堕落：击杀精英段主强制夺其形（不可逆）——
 *   knight（J 化剑突刺 / K 化锤震地）→ halfdrake（夺爪失剑：J 变爪袭）
 *   → winged（夺翼失锤：K 变掷旋刃）。L 雾化冲刺全程保留。
 * 受击裁决同 ShadowForge：位移化形招（剑/爪/雾）本体无立足点 → i-frame；
 * 原地招（锤）与起手僵直（掷）可被击。 */
Object.assign(JourneyScene.prototype, {

  _isSolid() {
    const s = this.P.state;
    return s === 'free' || s === 'hammer' || s === 'shard';
  },

  _buildPlayer() {
    const C = Forge.C, F = Forge.FORMS.knight;
    this.P = {
      x: 120, dir: 1, hp: Forge.PLAYER.maxHp,
      state: 'free', form: 'knight', scale: F.scale,
      invuln: 0, queued: null,
      cds: { sword: 0, hammer: 0, claw: 0, shard: 0, mist: 0 },
    };
    this.playerShadow = this.add.ellipse(this.P.x, C.FEET_Y - 10, 70, 12, 0x000000, 0.3)
      .setDepth(C.DEPTH.SHADOW);
    this.player = this.add.sprite(this.P.x, this._pY(), F.tex)
      .setOrigin(0.5, 1).setScale(this.P.scale).setDepth(C.DEPTH.CHAR);
    this.player.play(F.idle);
    this.playerGlow = this.add.sprite(this.P.x, this._pY() - 60, 'glow_circle')
      .setOrigin(0.5, 0.5).setDepth(C.DEPTH.CHAR - 0.5)
      .setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
    this._glowT = 0;
  },

  _pY() {
    return Forge.C.FEET_Y + Forge.C.GLB_PAD * this.P.scale;
  },

  _playerCloud() {
    return Forge.Cloud.fromTexture(this, Forge.FORMS[this.P.form].tex, Forge.FXN.morph);
  },

  // 玩家粒子渐染色：按世界 x 在段内向下一段的调色板平滑蜕变（旅途即堕落）
  _lightMix() {
    const s = this.segIdx || 0;
    const cur = Forge.C.PALETTE[s], next = Forge.C.PALETTE[s + 1];
    if (!next) return cur;
    const seg = Forge.SEGMENTS[s];
    const t = Phaser.Math.Clamp((this.P.x - seg.x0) / (seg.x1 - seg.x0), 0, 1);
    const c1 = cur.accent, c2 = next.accent;
    const r = Math.round(((c1 >> 16) & 0xff) + t * (((c2 >> 16) & 0xff) - ((c1 >> 16) & 0xff)));
    const g = Math.round(((c1 >> 8) & 0xff) + t * (((c2 >> 8) & 0xff) - ((c1 >> 8) & 0xff)));
    const b = Math.round((c1 & 0xff) + t * ((c2 & 0xff) - (c1 & 0xff)));
    return { ratio: cur.ratio + t * (next.ratio - cur.ratio), accent: (r << 16) | (g << 8) | b };
  },

  _updateGlow(dms) {
    const g = this.playerGlow, mix = this._lightMix();
    this._glowT += dms;
    const py = this.player.y - this.player.displayHeight / 2;
    g.setVisible(this.player.visible)
      .setPosition(this.player.x, py)
      .setScale(1.15)
      .setTint(mix.accent)
      .setAlpha(0.38 + Math.sin(this._glowT / 400) * 0.08);
  },

  // 150ms 输入缓冲：free 立即执行，非 free 记录最近一次意图，招式落地瞬间消费
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
    const P = this.P, F = Forge.FORMS[P.form];
    for (const k in P.cds) P.cds[k] = Math.max(0, P.cds[k] - dms);
    P.invuln = Math.max(0, P.invuln - dms);
    this._updateGlow(dms);

    if (!this.auto) {
      const K = Phaser.Input.Keyboard.JustDown;
      if (K(this.keys.J)) this._queueOrRun(() =>
        F.J === 'claw' ? this._doClaw() : this._doSword());
      if (K(this.keys.K)) this._queueOrRun(() =>
        F.K === 'shard' ? this._doShard() : this._doHammer());
      if (K(this.keys.L) || K(this.keys.SPACE)) this._queueOrRun(() => this._doMist());
      if (P.state === 'mist') {   // 雾化转向：化雾中按反方向 → 原地重发新方向的雾
        let steer = 0;
        if (K(this.keys.A) || K(this.keys.LEFT)) steer = -1;
        else if (K(this.keys.D) || K(this.keys.RIGHT)) steer = 1;
        if (steer && steer !== P.dir) this._startMist(steer, ++this._mistGen);
      }
    }
    if (P.state !== 'free') return;

    let mv = 0;
    if (this.auto) mv = this._botMv || 0;
    else {
      if (this.keys.A.isDown || this.keys.LEFT.isDown) mv = -1;
      else if (this.keys.D.isDown || this.keys.RIGHT.isDown) mv = 1;
    }
    if (mv) {
      P.dir = mv;
      P.x = this._clampX(P.x + mv * F.speed * dms / 1000);
    } else {
      P.x = this._clampX(P.x);   // 镜头棘轮推进时也要把站桩的玩家兜进窗口
    }
    this.player.setX(P.x).setFlipX(P.dir < 0);
    const want = mv ? F.walk : F.idle;
    if (!this.player.anims.currentAnim || this.player.anims.currentAnim.key !== want)
      this.player.play(want, true);
  },

  // ── J 化剑突刺（knight 主攻）：人→横持长剑(morph) → 离弦贯穿突进 → 剑→人(morph, 继承惯性) ──
  _doSword() {
    const S = Forge.SWORDDASH, P = this.P, C = Forge.C;
    if (P.state !== 'free' || P.cds.sword > 0) return;
    P.state = 'sword'; P.cds.sword = S.cd;
    const dir = P.dir, x0 = P.x, py = this._pY();
    const xDraw = this._clampX(x0 - dir * 14);   // 拉弓式反向预备
    const x1 = this._clampX(x0 + dir * S.range);
    const wKey = Forge.Cloud.weapon(this, 'sword');
    const wCloud = Forge.Cloud.fromTexture(this, wKey, Forge.FXN.morph);
    const hCloud = this._playerCloud();
    this.player.setVisible(false);
    window.GameAudio && GameAudio.play('morph');

    Forge.FX.morph({
      src: { cloud: hCloud, x: x0, y: py, scale: P.scale, flip: dir },
      dst: { cloud: wCloud, x: xDraw, y: C.FEET_Y - 60, scale: 0.8, flip: dir },
      dur: S.inMs, turb: 22, rise: 14, mix: this._lightMix(),
      onDone: () => {
        const img = this.add.image(xDraw, C.FEET_Y - 60, wKey)
          .setOrigin(0.5, 0.5).setDepth(C.DEPTH.FX).setFlipX(dir < 0).setScale(0.8);
        const hit = new Set();
        let lastX = xDraw, trailAcc = 0;
        this.tweens.add({
          targets: img, x: x1, duration: S.dashMs, ease: 'Cubic.easeOut',
          onUpdate: () => {
            // 扫掠判定：低帧率下 tween 单帧可跳 200px+，瞬时判定会隧穿命中窗口——
            // 以 [上一帧, 当前帧] 的扫过区间（±hitW）为准
            const px = lastX;
            trailAcc += Math.abs(img.x - lastX); lastX = img.x;
            const lo = Math.min(px, img.x) - S.hitW, hi = Math.max(px, img.x) + S.hitW;
            while (trailAcc >= 25) {
              trailAcc -= 25;
              Forge.FX.burst({
                cloud: wCloud, x: img.x, y: img.y, scale: 0.8, flip: dir,
                n: 8, dur: 200, dirX: -dir, mix: this._lightMix(),
              });
            }
            for (const e of this.enemies)
              if (!hit.has(e) && !e.dead && e.x > lo && e.x < hi) {
                hit.add(e);
                Forge.FX.burst({
                  cloud: wCloud, x: img.x, y: img.y, scale: 0.8, flip: dir,
                  n: 14, dur: 220, dirX: dir, mix: this._lightMix(),
                });
                this._hitEnemy(e, S.dmg, dir * 46, 'sword');
              }
          },
          onComplete: () => {
            img.destroy();
            Forge.FX.morph({
              src: { cloud: wCloud, x: x1, y: C.FEET_Y - 60, scale: 0.8, flip: dir },
              dst: { cloud: hCloud, x: x1, y: py, scale: P.scale, flip: dir },
              dur: S.outMs, turb: 24, rise: 16, mix: this._lightMix(),
              drift: { x: dir * 460 },   // 继承飞行末速：粒子向前甩过落点再回聚成人
              onDone: () => {
                P.x = this._clampX(x1);
                this.player.setX(P.x).setVisible(true);
                P.state = 'free';
                this._flushQueued();
              },
            });
          },
        });
      },
    });
  },

  // ── K 化锤震地：人→锤(morph) → 抡砸 AOE 击退 → 锤→人(morph)。原地重击=可被击的代价 ──
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

    const OY = 0.95, WH2 = 200;
    const pvX = x, pvY = C.FEET_Y - 72;
    const dy = (1 - OY) * WH2;
    const hx = x + dir * 144;
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
            this.tweens.add({ targets: img, scaleX: 1.4, scaleY: 0.55, duration: 70, yoyo: true, ease: 'Cubic.easeOut' });
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

  // ── J 爪袭（halfdrake/winged 主攻）：人躯化爪突进——夺自爪龙长，与其扑袭完全同构 ──
  _doClaw() {
    const L = Forge.CLAW, P = this.P, C = Forge.C;
    if (P.state !== 'free' || P.cds.claw > 0) return;
    P.state = 'claw'; P.cds.claw = L.cd;
    const dir = P.dir, x0 = P.x, py = this._pY(), s = L.ws;
    const A = this._wpnAssets('claw');
    const wCloud = Forge.Cloud.fromTexture(this, A.key, Forge.FXN.morph);
    const hCloud = this._playerCloud();
    const wy = py - this.player.displayHeight * 0.45;
    this.player.setVisible(false);
    window.GameAudio && GameAudio.play('morph');
    Forge.FX.morph({
      src: { cloud: hCloud, x: x0, y: py, scale: P.scale, flip: dir },
      dst: { cloud: wCloud, x: x0, y: wy + A.H * s / 2, scale: s, flip: dir },
      dur: L.inMs, turb: 26, rise: 14, mix: this._lightMix(),
      onDone: () => {
        const img = this.add.image(x0, wy, A.key).setOrigin(0.5, 0.5)
          .setDepth(C.DEPTH.FX).setFlipX(dir < 0).setScale(s).setAlpha(0.95);
        const x1 = this._clampX(x0 + dir * L.dist);
        const hit = new Set();
        let trailAcc = 0, lastX = img.x;
        window.GameAudio && GameAudio.play('release');
        this.tweens.add({
          targets: img, x: x1, duration: L.ms, ease: 'Cubic.easeOut',
          onUpdate: () => {
            const px = lastX;   // 扫掠判定（同剑突刺）：防低帧率隧穿
            trailAcc += Math.abs(img.x - lastX); lastX = img.x;
            const lo = Math.min(px, img.x) - 52, hi = Math.max(px, img.x) + 52;
            while (trailAcc >= 28) {
              trailAcc -= 28;
              Forge.FX.burst({ cloud: wCloud, x: img.x, y: img.y, scale: s, flip: dir, n: 8, dur: 180, dirX: -dir, mix: this._lightMix() });
            }
            for (const e of this.enemies)
              if (!hit.has(e) && !e.dead && e.x > lo && e.x < hi) {
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
                P.x = this._clampX(x1);
                this.player.setX(P.x).setVisible(true);
                P.state = 'free';
                this._flushQueued();
              },
            });
          },
        });
      },
    });
  },

  // ── K 掷旋刃（winged 重击）：起手僵直剥离本体粒子凝弹再掷出——夺自翼裔巫母 ──
  _doShard() {
    const T = Forge.SHARD, P = this.P;
    if (P.state !== 'free' || P.cds.shard > 0) return;
    P.state = 'shard'; P.cds.shard = T.cd;
    const dir = P.dir, x0 = P.x, y0 = this._pY() - 100;
    window.GameAudio && GameAudio.play('morph');
    this._peelBurst(this._playerCloud(), P.x, this._pY(), P.scale, dir, dir, this._lightMix());
    this.time.delayedCall(T.windup, () => {
      if (P.state !== 'shard' || this.ended) return;   // 起手被打断（死亡等）则不发弹
      const dart = this._makeDart(x0, y0, dir, this._lightMix());
      window.GameAudio && GameAudio.play('release');
      const hit = new Set();
      const pos = { x: x0 };
      let lastPX = x0;
      this.tweens.add({
        targets: pos, x: x0 + dir * 440, duration: T.ms, ease: 'Linear',
        onUpdate: () => {
          dart.setPos(pos.x, y0);
          const lo = Math.min(lastPX, pos.x) - 40, hi = Math.max(lastPX, pos.x) + 40;
          lastPX = pos.x;
          for (const e of this.enemies)
            if (!hit.has(e) && !e.dead && e.x > lo && e.x < hi) {
              hit.add(e);
              this._hitEnemy(e, T.dmg, dir * 30, 'shard');
            }
        },
        onComplete: () => dart.die(),
      });
      P.state = 'free';
      this._flushQueued();
    });
  },

  // ── L 雾化冲刺：同形态两点间 morph，高湍流高上浮，全程无敌；化雾中可反向改落点 ──
  _doMist() {
    const P = this.P;
    if (P.state !== 'free' || P.cds.mist > 0) return;
    P.cds.mist = Forge.MIST.cd;
    this._mistGen = (this._mistGen || 0) + 1;
    this._mistCloud = this._playerCloud();
    this._startMist(P.dir, this._mistGen);
  },

  _startMist(dir, gen) {
    const M = Forge.MIST, P = this.P;
    P.state = 'mist'; P.dir = dir;
    P.invuln = Math.max(P.invuln, M.ms + 180);
    const x0 = P.x, py = this._pY();
    const x1 = this._clampX(x0 + dir * M.dist);
    this.player.setVisible(false);
    window.GameAudio && GameAudio.play('morph');
    Forge.FX.morph({
      src: { cloud: this._mistCloud, x: x0, y: py, scale: P.scale, flip: dir },
      dst: { cloud: this._mistCloud, x: x1, y: py, scale: P.scale, flip: dir },
      dur: M.ms, turb: 55, rise: 44, mix: this._lightMix(),
      onDone: () => {
        if (gen !== this._mistGen) return;   // 已被转向覆盖，交给新一段收尾
        P.x = this._clampX(x1);
        this.player.setX(P.x).setVisible(true);
        P.state = 'free';
        this._flushQueued();
      },
    });
  },

  // ── 夺形（强制、不可逆）：击杀持形精英后，其形烙进你的身体——获得新招，剥离旧技 ──
  _stealForm(formKey) {
    const P = this.P, F = Forge.FORMS[formKey];
    const tryGo = () => {
      if (this.ended || P.form === formKey) return;
      if (P.state !== 'free') return this.time.delayedCall(150, tryGo);
      P.state = 'morphing';
      const dir = P.dir, x = P.x;
      const srcCloud = this._playerCloud();
      const dstCloud = Forge.Cloud.fromTexture(this, F.tex, Forge.FXN.morph);
      const dstY = Forge.C.FEET_Y + Forge.C.GLB_PAD * F.scale;
      this.player.setVisible(false);
      window.GameAudio && GameAudio.play('morph');
      window.GameAudio && GameAudio.play('unlock');
      Forge.FX.morph({
        src: { cloud: srcCloud, x, y: this._pY(), scale: P.scale, flip: dir },
        dst: { cloud: dstCloud, x, y: dstY, scale: F.scale, flip: dir },
        dur: 780, turb: 36, rise: 32, mix: this._lightMix(),
        onDone: () => {
          P.form = formKey; P.scale = F.scale;
          this.player.setTexture(F.tex).setScale(P.scale).setY(this._pY()).setVisible(true);
          this.player.play(F.idle, true);
          this._toast(Forge.STEAL_TOAST[formKey], 3200);
          P.state = 'free';
          this._flushQueued();
        },
      });
    };
    tryGo();
  },

  // ── 受击（小迸溅 + 顿帧 + 无敌闪烁）──
  _playerHit(dmg, fromX) {
    const P = this.P;
    if (this.ended || P.invuln > 0 || !this._isSolid()) return;
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

  // ── 死亡：全身消散 → 检查点重生（残命耗尽才 gameover）──
  _diePlayer() {
    const P = this.P;
    P.state = 'dead';
    this.lives--;
    this.player.setVisible(false);
    this.playerShadow.setVisible(false);
    Forge.FX.dissolve({
      cloud: this._playerCloud(), x: P.x, y: this._pY(), scale: P.scale, flip: P.dir,
      n: 620, dur: 1200, mix: this._lightMix(),
    });
    window.GameAudio && GameAudio.play('splashBad');
    if (this.lives <= 0) return this._gameover();
    this.time.delayedCall(1150, () => this._respawn());
  },

  // ── 十字长剑「蓄力猛劈」共享动作（终局龙王 _swingWeapon 用）──
  _swordChargeSlash(img, opt) {
    const K = Forge.SWORD_SLASH, dir = opt.dir, s = opt.s;
    const tipLX = dir * 302 * s;
    const spark = () => {
      const r = img.rotation;
      Forge.FX.burst({
        cloud: opt.cloud, x: img.x + tipLX * Math.cos(r), y: img.y + tipLX * Math.sin(r),
        scale: s, flip: dir, n: 7, dur: 190, dirX: dir, mix: opt.mix,
      });
    };
    this.tweens.add({
      targets: img, angle: dir * K.raiseA, duration: K.raiseMs, ease: 'Sine.easeOut',
      onComplete: () => {
        this.time.delayedCall(K.chargeMs, () => {
          if (!img.active) return;
          opt.onRelease && opt.onRelease();
          let acc = 0, lastA = img.angle;
          this.tweens.add({
            targets: img, angle: dir * K.fallA, duration: K.fallMs, ease: 'Quart.easeIn',
            onUpdate: () => { acc += Math.abs(img.angle - lastA); lastA = img.angle; while (acc >= 11) { acc -= 11; spark(); } },
            onComplete: () => { opt.onImpact && opt.onImpact(); },
          });
        });
      },
    });
  },
});
