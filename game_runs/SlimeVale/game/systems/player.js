/* SlimeVale — 玩家状态机（Object.assign 到 MeadowScene 原型）。
 * 三段跳是唯一的纵向手段也是万用防御：地面 AOE 全部跳得过，飞行敌逼你回地面。
 * 单格形状记忆：J 触发当前技能（初始露珠冲撞）；吃技能包覆盖旧技能。
 * 受击裁决沿用项目约定：位移化形招（冲撞/下砸）本体无立足点 → i-frame；
 * 原地招（地面重锤/掷星/吐泡）可被击。
 * 露水流转：受击时等量露水流向攻击者（其血条可见回升，上限=其总血量）。 */
Object.assign(MeadowScene.prototype, {

  _isSolid() {
    const s = this.P.state;
    return s === 'free' || s === 'throw' || s === 'burst' || s === 'slamg';
  },

  _buildPlayer() {
    const C = Forge.C;
    this.P = {
      x: 120, y: C.FEET_Y, vy: 0, jumps: 0, dir: 1,
      hp: Forge.PLAYER.maxHp, state: 'free', skill: 'splash',
      scale: Forge.PLAYER.scale, invuln: 0, cd: 0, queued: null, jumpQueued: null,
    };
    this.playerShadow = this.add.ellipse(this.P.x, C.FEET_Y - 8, 66, 12, 0x1d5c3a, 0.28)
      .setDepth(C.DEPTH.SHADOW);
    this.player = this.add.image(this.P.x, this.P.y, 'p_slime')
      .setOrigin(0.5, 1).setScale(this.P.scale).setDepth(C.DEPTH.CHAR);
    this._walkT = 0; this._squashT = 0; this._idleT = 0;
    this._stars = []; this._shots = [];
  },

  _playerCloud() {
    return Forge.Cloud.fromTexture(this, 'p_slime', Forge.FXN.morph);
  },

  _pBodyY() { return this.P.y - 28; },

  // 玩家粒子渐染色：按世界 x 在段内向下一段调色板平滑过渡（越走越暖亮）
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
    return { ratio: cur.ratio, accent: (r << 16) | (g << 8) | b };
  },

  // 通用纹理资产（形态图 + 点云 + 尺寸），供技能 morph 用
  _texAssets(key) {
    this._taCache = this._taCache || {};
    if (!this._taCache[key]) {
      const src = this.textures.get(key).getSourceImage();
      this._taCache[key] = { key, cloud: Forge.Cloud.fromTexture(this, key, 260), W: src.width, H: src.height };
    }
    return this._taCache[key];
  },

  // 150ms 输入缓冲：free 立即执行，非 free 记录最近意图，招式落地瞬间消费
  _queueOrRun(fn) {
    if (this.P.state === 'free') fn();
    else this.P.queued = { fn, t: this.time.now };
  },

  _flushQueued() {
    const P = this.P;
    const jt = P.jumpQueued;
    P.jumpQueued = null;
    if (jt !== null && this.time.now - jt <= 150) this._doJump();
    const q = P.queued;
    P.queued = null;
    if (q && this.time.now - q.t <= 150) q.fn();
  },

  // 跳跃版输入缓冲：free 立即跳，非 free（放技能中）记录意图，动作落地瞬间补发
  _queueOrJump() {
    if (this.P.state === 'free') this._doJump();
    else this.P.jumpQueued = this.time.now;
  },

  // ── 三段跳 ──
  _doJump() {
    const P = this.P, PH = Forge.PHYS;
    if (P.state !== 'free' || P.jumps >= PH.maxJumps) return;
    P.vy = PH.jumpV[P.jumps];
    P.jumps++;
    this._squashT = 0;
    window.GameAudio && GameAudio.play('tick');
    // 起跳粒子环：一段=草屑白，二三段=空中露圈（越跳越亮，读出"还剩几段"）
    Forge.FX.ring({
      x: P.x, y: P.y - 4, r: P.jumps === 1 ? 30 : 24 + P.jumps * 6,
      dur: 260, mode: 'out', n: 40, mix: this._lightMix(),
    });
  },

  _updatePlayer(dms) {
    const P = this.P, dt = dms / 1000;
    P.cd = Math.max(0, P.cd - dms);
    P.invuln = Math.max(0, P.invuln - dms);
    this._idleT += dms;

    if (P.state === 'dead' || P.state === 'cinema') return;

    if (!this.auto) {
      const K = Phaser.Input.Keyboard.JustDown;
      if (K(this.keys.J)) this._queueOrRun(() => this._useSkill());
      if (K(this.keys.W) || K(this.keys.UP) || K(this.keys.SPACE)) this._queueOrJump();
    }
    this._updatePlayerShots(dms);
    if (P.state !== 'free') return;

    // 横向
    let mv = 0;
    if (this.auto) mv = this._botMv || 0;
    else {
      if (this.keys.A.isDown || this.keys.LEFT.isDown) mv = -1;
      else if (this.keys.D.isDown || this.keys.RIGHT.isDown) mv = 1;
    }
    if (mv) {
      P.dir = mv;
      P.x = this._clampX(P.x + mv * Forge.PLAYER.speed * dt);
    } else {
      P.x = this._clampX(P.x);   // 镜头棘轮推进时也要把站桩的玩家兜进窗口
    }

    // 纵向：重力 + 落地
    const wasAir = P.y < Forge.C.FEET_Y - 0.5;
    P.vy += Forge.PHYS.grav * dt;
    P.y = Math.min(Forge.C.FEET_Y, P.y + P.vy * dt);
    if (P.y >= Forge.C.FEET_Y && wasAir) {
      P.vy = 0; P.jumps = 0;
      this._squashT = 150;
      Forge.FX.ring({ x: P.x, y: P.y - 4, r: 26, dur: 220, mode: 'out', n: 26, mix: this._lightMix() });
    }
    if (P.y >= Forge.C.FEET_Y) { P.vy = Math.min(P.vy, 0); P.jumps = Math.min(P.jumps, Forge.PHYS.maxJumps); }

    this._checkPacks();
    this._updatePlayerSprite(dms, mv);
  },

  // 果冻手感：走路弹跳 + 起跳拉伸 + 落地压扁 + 待机呼吸
  _updatePlayerSprite(dms, mv) {
    const P = this.P;
    const grounded = P.y >= Forge.C.FEET_Y - 0.5;
    if (mv && grounded) this._walkT += dms;
    const bob = mv && grounded ? Math.abs(Math.sin(this._walkT * 0.013)) * 9 : 0;
    let sx = 1, sy = 1;
    if (this._squashT > 0) {
      this._squashT -= dms;
      const k = this._squashT / 150;
      sx = 1 + 0.16 * k; sy = 1 - 0.2 * k;
    } else if (!grounded && Math.abs(P.vy) > 240) {
      sx = 0.94; sy = 1.08;
    } else if (!mv && grounded) {
      sy = 1 + Math.sin(this._idleT * 0.004) * 0.03;
    }
    this.player.setPosition(P.x, P.y - bob)
      .setScale(sx * P.scale, sy * P.scale)
      .setFlipX(P.dir < 0);
    const alt = Forge.C.FEET_Y - P.y;
    this.playerShadow.setX(P.x)
      .setScale(Phaser.Math.Clamp(1 - alt / 700, 0.45, 1))
      .setVisible(this.player.visible && this.player.alpha > 0.05)
      .setAlpha(0.28 * this.player.alpha * Phaser.Math.Clamp(1 - alt / 900, 0.4, 1));
  },

  // ── 技能分发 ──
  _useSkill() {
    const P = this.P;
    if (P.state !== 'free' || P.cd > 0) return;
    if (P.skill === 'splash') this._doSplash();
    else if (P.skill === 'slam') this._doSlam();
    else if (P.skill === 'star') this._doStar();
    else if (P.skill === 'bubble') this._doBubble();
  },

  // ── 露珠冲撞：身体化露珠彗星贯穿突进（空中保持高度），位移化形 → i-frame ──
  _doSplash() {
    const S = Forge.SKILLS.splash, P = this.P, C = Forge.C;
    P.state = 'dash'; P.cd = S.cd;
    const dir = P.dir, x0 = P.x, y0 = P.y;
    const dashY = y0 - 26;
    const A = this._texAssets('s_drop');
    const hCloud = this._playerCloud();
    const x1 = this._clampX(x0 + dir * S.dist);
    this.player.setVisible(false);
    window.GameAudio && GameAudio.play('morph');
    Forge.FX.morph({
      src: { cloud: hCloud, x: x0, y: y0, scale: P.scale, flip: dir },
      dst: { cloud: A.cloud, x: x0, y: dashY + A.H / 2, scale: 1, flip: dir },
      dur: S.inMs, turb: 24, rise: 10, mix: this._lightMix(),
      onDone: () => {
        if (this.ended || P.state !== 'dash') return;
        const img = this.add.image(x0, dashY, A.key).setOrigin(0.5, 0.5)
          .setDepth(C.DEPTH.FX).setFlipX(dir < 0).setAlpha(0.95);
        const hit = new Set();
        let trailAcc = 0, lastX = img.x;
        window.GameAudio && GameAudio.play('release');
        this.tweens.add({
          targets: img, x: x1, duration: S.ms, ease: 'Cubic.easeOut',
          onUpdate: () => {
            const px = lastX;   // 扫掠判定：防低帧率隧穿
            trailAcc += Math.abs(img.x - lastX); lastX = img.x;
            const lo = Math.min(px, img.x) - 52, hi = Math.max(px, img.x) + 52;
            while (trailAcc >= 26) {
              trailAcc -= 26;
              Forge.FX.burst({ cloud: A.cloud, x: img.x, y: img.y, scale: 1, flip: dir, n: 8, dur: 180, dirX: -dir, mix: this._lightMix() });
            }
            for (const e of this.enemies)
              if (!hit.has(e) && !e.dead && e.x > lo && e.x < hi
                  && Math.abs(this._eBody(e) - dashY) < S.hitH) {
                hit.add(e);
                Forge.FX.burst({ cloud: A.cloud, x: img.x, y: img.y, scale: 1, flip: dir, n: 12, dur: 200, dirX: dir, mix: this._lightMix() });
                this._hitEnemy(e, S.dmg, dir * 56, 'splash');
              }
          },
          onComplete: () => {
            img.destroy();
            Forge.FX.morph({
              src: { cloud: A.cloud, x: x1, y: dashY + A.H / 2, scale: 1, flip: dir },
              dst: { cloud: hCloud, x: x1, y: y0, scale: P.scale, flip: dir },
              dur: S.outMs, turb: 26, rise: 14, drift: { x: dir * 300 }, mix: this._lightMix(),
              onDone: () => {
                P.x = this._clampX(x1); P.y = y0; P.vy = 0;
                this.player.setPosition(P.x, P.y).setVisible(true);
                P.state = 'free';
                this._flushQueued();
              },
            });
          },
        });
      },
    });
  },

  // ── 果冻重锤：地面=抡砸震圈（原地可被击）；空中=化刺球下砸（位移化形 i-frame）──
  _doSlam() {
    const P = this.P;
    if (P.y < Forge.C.FEET_Y - 30) return this._doSlamAir();
    const S = Forge.SKILLS.slam, C = Forge.C;
    P.state = 'slamg'; P.cd = S.cd;
    const dir = P.dir, x = P.x;
    const A = this._texAssets('s_hammer');
    const hCloud = this._playerCloud();
    const OY = 0.95, pvY = C.FEET_Y - 70;
    const dy = (1 - OY) * A.H;
    const hx = x + dir * 122;
    this.player.setVisible(false);
    window.GameAudio && GameAudio.play('morph');
    Forge.FX.morph({
      src: { cloud: hCloud, x, y: P.y, scale: P.scale, flip: dir },
      dst: { cloud: A.cloud, x, y: pvY + dy, scale: 1, flip: dir },
      dur: S.inMs, turb: 24, rise: 34, mix: this._lightMix(),
      onDone: () => {
        if (this.ended || P.state !== 'slamg') return;
        const img = this.add.image(x, pvY, A.key)
          .setOrigin(0.5, OY).setDepth(C.DEPTH.FX).setFlipX(dir < 0);
        this.tweens.add({
          targets: img, angle: dir * 95, duration: S.slamMs, ease: 'Cubic.easeIn',
          onComplete: () => {
            this.tweens.add({ targets: img, scaleX: 1.35, scaleY: 0.6, duration: 70, yoyo: true, ease: 'Cubic.easeOut' });
            this._shockRing(hx, C.FEET_Y - 8, S.radius, this._lightMix());
            for (const e of this.enemies)
              if (!e.dead && Math.abs(e.x - hx) < S.radius && Forge.C.FEET_Y - e.ey < 110)
                this._hitEnemy(e, S.dmg, Math.sign(e.x - hx || dir) * S.knock, 'slam');
            this._hitstop(70);
            this.cameras.main.shake(130, 0.008);
            window.GameAudio && GameAudio.play('splashBad');
            this.time.delayedCall(90, () => {
              img.destroy();
              Forge.FX.morph({
                src: { cloud: A.cloud, x, y: pvY + dy, scale: 1, flip: dir },
                dst: { cloud: hCloud, x, y: P.y, scale: P.scale, flip: dir },
                dur: S.outMs, turb: 26, rise: 20, mix: this._lightMix(),
                onDone: () => { this.player.setVisible(true); P.state = 'free'; this._flushQueued(); },
              });
            });
          },
        });
      },
    });
  },

  _doSlamAir() {
    const S = Forge.SKILLS.slam, P = this.P, C = Forge.C;
    P.state = 'slama'; P.cd = S.cd;
    const x = P.x;
    const A = this._texAssets('s_spike');
    this.player.setVisible(false);
    window.GameAudio && GameAudio.play('morph');
    this._peelBurst(this._playerCloud(), x, P.y, P.scale, P.dir, -P.dir, this._lightMix());
    const img = this.add.image(x, P.y - 40, A.key).setOrigin(0.5, 0.5).setDepth(C.DEPTH.FX);
    const dur = Math.max(120, (C.FEET_Y - P.y + 40) / S.plungeV * 1000);
    this.tweens.add({
      targets: img, y: C.FEET_Y - 34, angle: 340, duration: dur, ease: 'Quad.easeIn',
      onComplete: () => {
        img.destroy();
        P.y = C.FEET_Y; P.vy = 0; P.jumps = 0;
        this._shockRing(x, C.FEET_Y - 8, S.airRadius, this._lightMix());
        for (const e of this.enemies)
          if (!e.dead && Math.abs(e.x - x) < S.airRadius && Forge.C.FEET_Y - e.ey < 130)
            this._hitEnemy(e, S.airDmg, Math.sign(e.x - x || P.dir) * S.knock, 'slam');
        this._hitstop(80);
        this.cameras.main.shake(150, 0.009);
        window.GameAudio && GameAudio.play('splashBad');
        this._squashT = 150;
        this.player.setPosition(P.x, P.y).setVisible(true);
        P.state = 'free';
        this._flushQueued();
      },
    });
  },

  // ── 回旋星刃：短起手掷星，去程回程都伤；掷出后即可移动 ──
  _doStar() {
    const S = Forge.SKILLS.star, P = this.P;
    if (this._stars.length) return;   // 同屏只飞一颗
    P.state = 'throw'; P.cd = S.cd;
    const dir = P.dir;
    this._squashT = 130;
    window.GameAudio && GameAudio.play('morph');
    this._peelBurst(this._playerCloud(), P.x, P.y, P.scale, dir, dir, this._lightMix());
    this.time.delayedCall(S.windup, () => {
      if (this.ended || P.state !== 'throw') return;
      const y = this._pBodyY();
      // 自动瞄准：面向方向射程内最近敌人的身体（悬停的刺蜂也够得着），俯仰限 ±35°
      let ux = dir, uy = 0;
      let best = null, bd = 1e9;
      for (const e of this.enemies) {
        if (e.dead || e.spr.alpha < 1) continue;
        const ddx = e.x - P.x;
        if (Math.sign(ddx) !== dir || Math.abs(ddx) > S.range + 60) continue;
        if (Math.abs(ddx) < bd) { bd = Math.abs(ddx); best = e; }
      }
      if (best) {
        const ddx = best.x - P.x, ddy = this._eBody(best) - y;
        const d = Math.hypot(ddx, ddy) || 1;
        ux = ddx / d; uy = ddy / d;
        if (Math.abs(uy) > 0.57) { uy = 0.57 * Math.sign(uy); ux = Math.sqrt(1 - uy * uy) * dir; }
      }
      const img = this.add.image(P.x, y, 's_star').setOrigin(0.5).setDepth(Forge.C.DEPTH.FX).setScale(0.9);
      const fx = Forge.FX.follow({ x: P.x, y, n: Forge.FXN.proj, rad: 10, life: 240, mix: this._lightMix() });
      this._stars.push({
        x: P.x, y, dir, vx: ux * S.speed, vy: uy * S.speed,
        phase: 'out', dist: 0, hit: new Set(), img, fx, spin: 0,
      });
      window.GameAudio && GameAudio.play('release');
      P.state = 'free';
      this._flushQueued();
    });
  },

  // ── 泡泡连珠：原地快速吐三连泡（吐泡中可被击——射手的代价）──
  _doBubble() {
    const S = Forge.SKILLS.bubble, P = this.P;
    P.state = 'burst'; P.cd = S.cd;
    const dir = P.dir;
    for (let i = 0; i < S.count; i++) {
      this.time.delayedCall(i * S.gap, () => {
        if (this.ended || P.state === 'dead') return;
        const y = this._pBodyY() - 6;
        const img = this.add.image(P.x + dir * 26, y, 's_bubble').setOrigin(0.5).setDepth(Forge.C.DEPTH.FX).setScale(0.7);
        this.tweens.add({ targets: img, scaleX: 1, scaleY: 1, duration: 140 });
        this._shots.push({ x: P.x + dir * 26, y, vx: dir * S.speed, dmg: S.dmg, dist: 0, range: S.range, img });
        this._squashT = 90;
        window.GameAudio && GameAudio.play('tick');
      });
    }
    this.time.delayedCall(S.count * S.gap + 60, () => {
      if (P.state === 'burst') { P.state = 'free'; this._flushQueued(); }
    });
  },

  // 玩家弹体更新：回旋星 + 泡泡（扫掠判定；星回程会自动追玩家）
  _updatePlayerShots(dms) {
    const dt = dms / 1000, S = Forge.SKILLS;
    for (const st of this._stars) {
      const px = st.x;
      if (st.phase === 'out') {
        st.x += st.vx * dt; st.y += st.vy * dt;
        st.dist += Math.hypot(st.vx * dt, st.vy * dt);
        if (st.dist >= S.star.range) { st.phase = 'back'; st.hit.clear(); }
      } else {
        const tx = this.P.x, ty = this._pBodyY();
        const dx = tx - st.x, dy = ty - st.y, d = Math.hypot(dx, dy) || 1;
        const v = S.star.speed * 1.05 * dt;
        st.x += dx / d * v; st.y += dy / d * v;
        if (d < 34) { st.done = true; }
      }
      st.spin += dms * 0.9 * st.dir;
      st.img.setPosition(st.x, st.y).setAngle(st.spin);
      st.fx.setPos(st.x, st.y);
      const lo = Math.min(px, st.x) - 38, hi = Math.max(px, st.x) + 38;
      for (const e of this.enemies)
        if (!st.hit.has(e) && !e.dead && e.x > lo && e.x < hi
            && Math.abs(this._eBody(e) - st.y) < S.star.hitH) {
          st.hit.add(e);
          this._hitEnemy(e, S.star.dmg, st.dir * 30, 'star');
        }
      if (st.done || this.ended) { st.fx.die(); st.img.destroy(); st.done = true; }
    }
    this._stars = this._stars.filter((s) => !s.done);

    for (const sh of this._shots) {
      const px = sh.x;
      sh.x += sh.vx * dt;
      sh.dist += Math.abs(sh.x - px);
      sh.img.setX(sh.x).setY(sh.y + Math.sin(sh.dist * 0.03) * 3);
      const lo = Math.min(px, sh.x) - 30, hi = Math.max(px, sh.x) + 30;
      for (const e of this.enemies)
        if (!sh.done && !e.dead && e.x > lo && e.x < hi
            && Math.abs(this._eBody(e) - sh.y) < Forge.SKILLS.bubble.hitH) {
          sh.done = true;
          this._hitEnemy(e, sh.dmg, Math.sign(sh.vx) * 24, 'bubble');
        }
      if (sh.dist >= sh.range) sh.done = true;
      if (sh.done) {
        Forge.FX.ring({ x: sh.x, y: sh.y, r: 26, dur: 200, mode: 'out', n: 24, mix: this._lightMix() });
        sh.img.destroy();
      }
    }
    this._shots = this._shots.filter((s) => !s.done);
  },

  _clearPlayerShots() {
    for (const st of this._stars) { st.fx.die(); st.img.destroy(); }
    for (const sh of this._shots) sh.img.destroy();
    this._stars = []; this._shots = [];
  },

  // ── 技能包拾取（覆盖旧技能）──
  _checkPacks() {
    const P = this.P;
    for (const p of this.packs) {
      if (p._culled) continue;
      if (Math.abs(P.x - p.x) < 48 && Math.abs(this._pBodyY() - p.img.y) < 58) {
        p._culled = true;
        const same = P.skill === p.skill;
        P.skill = p.skill; P.cd = 400;
        const A = this._texAssets('pack_' + p.skill);
        Forge.FX.absorb({
          cloud: A.cloud, x: p.x, y: p.img.y + A.H / 2, scale: 1, flip: 1, n: 110, dur: 560,
          targetFn: () => ({ x: this.P.x, y: this._pBodyY() }),
        });
        Forge.FX.gather({ x: P.x, y: this._pBodyY(), r: 60, dur: 360, n: Forge.FXN.gather, mix: this._lightMix() });
        window.GameAudio && GameAudio.play('unlock');
        this._toast(same ? `形状记忆刷新 · ${Forge.SKILLS[p.skill].name}` : Forge.SKILL_TOAST[p.skill], 2600);
        p.img.destroy(); p.label.destroy();
      }
    }
    this.packs = this.packs.filter((x) => !x._culled);
  },

  // ── 受击：露水流向攻击者（其血条回升，上限=总血量）──
  _playerHit(dmg, fromX, srcE) {
    const P = this.P;
    if (this.ended || P.invuln > 0 || !this._isSolid()) return;
    P.hp = Math.max(0, P.hp - dmg);
    window.GameHUD && GameHUD.setHearts(P.hp, Forge.PLAYER.maxHp);
    P.invuln = Forge.PLAYER.invulnMs;
    Forge.FX.burst({
      cloud: this._playerCloud(), x: P.x, y: P.y, scale: P.scale, flip: P.dir,
      n: 46, dirX: P.x >= fromX ? 1 : -1, mix: this._lightMix(),
    });
    this._popup(P.x, P.y - 86, `-${dmg}`, '#e85a4f');
    if (srcE && !srcE.dead && srcE.hp < srcE.def.hp) {
      const rate = srcE.def.boss ? Forge.DEW.bossHitRate : Forge.DEW.hitRate;
      const heal = Math.min(Math.ceil(dmg * rate), srcE.def.hp - srcE.hp);
      srcE.hp += heal;
      Forge.FX.absorb({
        cloud: this._playerCloud(), x: P.x, y: P.y, scale: P.scale * 0.7, flip: P.dir,
        n: 60, dur: 520,
        targetFn: () => ({ x: srcE.x, y: this._eBody(srcE) }),
      });
      this._popup(srcE.x, this._eBody(srcE) - 30, `+${heal}`, '#9a7bd0');
    }
    this._hitstop(50);
    this.cameras.main.shake(90, 0.006);
    window.GameAudio && GameAudio.play('splashBad');
    this.tweens.add({ targets: this.player, alpha: 0.35, duration: 90, yoyo: true, repeat: 4,
      onComplete: () => this.player.setAlpha(1) });
    if (P.hp <= 0) this._diePlayer();
  },

  _diePlayer() {
    const P = this.P;
    P.state = 'dead';
    this.lives--;
    this.player.setVisible(false);
    this.playerShadow.setVisible(false);
    Forge.FX.dissolve({
      cloud: this._playerCloud(), x: P.x, y: P.y, scale: P.scale, flip: P.dir,
      n: 620, dur: 1200, mix: this._lightMix(),
    });
    window.GameAudio && GameAudio.play('splashBad');
    if (this.lives <= 0) return this._gameover();
    this.time.delayedCall(1150, () => this._respawn());
  },
});
