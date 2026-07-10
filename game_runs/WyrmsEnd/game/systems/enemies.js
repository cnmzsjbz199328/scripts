/* WyrmsEnd — 敌人 AI 与生命周期（Object.assign 到 JourneyScene 原型）。
 * 分支按 def 能力判定（不写死 type）：stab 贴身刺 / lunge 扑袭 / ranged 保距掷弹 /
 * swipe 宽幅挥砍 Boss（+sky 天降凝剑 / summonMs 召唤）。
 * 横版补三条生命周期规则（蓝图 §5）：
 *   1) 镜头右缘 +200px 外不行动（休眠）；2) 非锁点敌落后镜头 1.5 屏 → 静默清理；
 *   3) 弹丸离开镜头 ±0.5 屏销毁。
 * 精英（def.steal）被杀 → 尸身粒子烙进玩家（强制夺形，见 player.js _stealForm）。 */
Object.assign(JourneyScene.prototype, {

  _spawnEnemy(type, x, origin) {
    const def = Forge.ENEMY[type], C = Forge.C;
    const y = C.FEET_Y + (def.glb ? C.GLB_PAD * def.scale : 0);
    const spr = this.add.sprite(x, y, def.tex)
      .setOrigin(0.5, 1).setScale(def.scale).setDepth(C.DEPTH.CHAR - 1);
    spr.play(def.animIdle || def.animWalk);
    const shadow = this.add.ellipse(x, C.FEET_Y - 10, 66 * def.scale, 11, 0x000000, 0.26)
      .setDepth(C.DEPTH.SHADOW);
    const e = {
      type, def, spr, shadow, x, y,
      hp: def.hp, dead: false, lockbound: false,
      state: 'walk', stateT: 0, atkCd: 800, summonT: 0,
      skyT: 0, skyX: 0,
    };
    e._cloud = Forge.Cloud.fromTexture(this, def.tex, Forge.FXN.kill);
    spr.setAlpha(0);   // 入场凝聚中 alpha<1：不行动、不可击（防隐形死锁的既有惯例）
    const src = origin
      ? { cloud: origin.cloud || e._cloud, x: origin.x, y: origin.y, scale: def.scale * 0.4, flip: origin.flip || 1 }
      : { cloud: e._cloud, x, y: y - 130, scale: def.scale * 0.4 };
    Forge.FX.morph({
      src, dst: { cloud: e._cloud, x, y, scale: def.scale },
      dur: origin ? 620 : 460, turb: 40, rise: origin ? 34 : 10, n: 420,
      mix: origin ? Forge.ENEMY_MIX : undefined,
      onDone: () => { if (!e.dead) spr.setAlpha(1); },
    });
    this.enemies.push(e);
    return e;
  },

  _updateEnemies(dms) {
    const P = this.P, C = Forge.C, cam = this.cameras.main.scrollX;
    const dt = dms / 1000;
    let culled = false;
    for (const e of this.enemies) {
      if (e.dead) continue;
      // 甩开清理：非锁点敌落后镜头左缘 >1.5 屏 → 静默销毁（不掉落不计杀）
      if (!e.lockbound && e.x < cam - Forge.W * Forge.CAM.leashScreens) {
        e.dead = true; e._culled = culled = true;
        if (e._wpn) { e._wpn.destroy(); e._wpn = null; }
        e.spr.destroy(); e.shadow.destroy();
        continue;
      }
      e.atkCd = Math.max(0, e.atkCd - dms);
      if (e.spr.alpha < 1) continue;                       // 凝聚入场中，不行动
      if (e.x > cam + Forge.W + 200 && e.state === 'walk') continue;   // 休眠：未进镜头右缘 +200
      const dx = P.x - e.x, adx = Math.abs(dx), dir = Math.sign(dx) || 1;

      if (e.def.stab) {
        const ST = e.def.stab;
        if (e.state === 'walk') {
          if (adx < ST.reach + 10 && e.atkCd <= 0) {
            e.state = 'tele'; e.stateT = ST.tele;
            Forge.FX.gather({ x: e.x, y: e.y - e.spr.displayHeight * 0.5, r: 40, dur: ST.tele, n: Forge.FXN.gather, mix: Forge.ENEMY_MIX });
            this._morphToStab(e, dir, ST);
          } else {
            e.x += dir * e.def.speed * dt;
          }
        } else if (e.state === 'tele') {
          e.stateT -= dms;
          if (e.stateT <= 0) { e.state = 'stab'; e.stateT = ST.ms; this._stabThrust(e, ST); }
        } else if (e.state === 'stab' || e.state === 'reform') {
          e.stateT -= dms;
          if (e.state === 'reform' && e.stateT <= 0) e.state = 'walk';
        }

      } else if (e.def.ranged) {
        const R = e.def.ranged;
        if (adx < R.keep - 20) e.x -= dir * e.def.speed * dt;
        else if (adx > R.keep + 60) e.x += dir * e.def.speed * dt;
        // 保距不许保出镜头外打隐身炮（蓝图 §5）：钳回镜头内
        e.x = Phaser.Math.Clamp(e.x, cam + 50, cam + Forge.W - 50);
        if (e.state === 'walk' && e.atkCd <= 0) {
          e.state = 'tele'; e.stateT = R.tele;
          Forge.FX.gather({ x: e.x, y: e.y - 95, r: 48, dur: R.tele, n: Forge.FXN.gather, mix: Forge.ENEMY_MIX });
        } else if (e.state === 'tele') {
          e.stateT -= dms;
          if (e.stateT <= 0) {
            e.state = 'walk'; e.atkCd = R.cd;
            this._peelBurst(this._enemyCloud(e), e.x, e.y - 95, e.def.scale, e.spr.flipX ? -1 : 1, dir, Forge.ENEMY_MIX);
            this._spawnProjectile(e.x, e.y - 95, dir, R.projSpeed, R.dmg);
            window.GameAudio && GameAudio.play('tick');
          }
        }

      } else if (e.def.lunge) {
        const L = e.def.lunge;
        if (e.state === 'walk') {
          e.x += dir * e.def.speed * dt;
          if (adx < L.dist && e.atkCd <= 0) {
            e.state = 'tele'; e.stateT = L.tele;
            Forge.FX.gather({ x: e.x, y: e.y - 50, r: 54, dur: L.tele, n: Forge.FXN.gather, mix: Forge.ENEMY_MIX });
            this._morphToClaw(e, dir, L);
          }
        } else if (e.state === 'tele') {
          e.stateT -= dms;
          if (e.stateT <= 0) { e.state = 'lunge'; e.stateT = L.ms; this._clawDash(e, L); }
        } else if (e.state === 'lunge') {
          e.stateT -= dms;
        } else if (e.state === 'reform') {
          e.stateT -= dms;
          if (e.stateT <= 0) e.state = 'walk';
        }

      } else if (e.def.swipe) {
        const S = e.def.swipe;
        if (e.state === 'walk') {
          e.x += dir * e.def.speed * dt;
          if (adx < S.r - 20 && e.atkCd <= 0) {
            e.state = 'tele'; e.stateT = S.tele;
            this._warnRing(e.x, C.FEET_Y - 8, S.r, S.tele);
            this._morphToWeapon(e, dir, S);
          }
        } else if (e.state === 'tele') {
          e.stateT -= dms;
          if (e.stateT <= 0) {
            const swingMs = S.weapon === 'sword' ? Forge.SWORD_SLASH.total : 130;
            e.state = 'reform'; e.stateT = swingMs + 330;
            e.atkCd = S.cd;
            this.cameras.main.shake(110, 0.007);
            this._swingWeapon(e);
          }
        } else if (e.state === 'reform') {
          e.stateT -= dms;
          if (e.stateT <= 0) e.state = 'walk';
        }
        // 天降凝剑闭环（wyrm 专属）：全身化形升空 → 凝剑俯冲插地 → 落点重组
        if (e.def.sky) {
          e.skyT += dms;
          if (e.skyT >= e.def.sky.cd && e.state === 'walk' && e.spr.alpha >= 1) {
            e.skyT = 0; e.state = 'sky'; this._bossSwordSky(e, P.x);
          }
        }
        // 周期召唤（warden）：从 Boss 躯体剥离粒子飞抵出生点凝成仆从
        if (e.def.summonMs) {
          e.summonT += dms;
          if (e.summonT >= e.def.summonMs) {
            e.summonT = 0;
            const adds = this.enemies.filter(o => !o.dead && o.type === e.def.summonType).length;
            if (adds < e.def.maxAdds) {
              const base = this.lock ? this.lock.camX : cam;
              const sx = e.x > base + Forge.W / 2 ? base + 100 : base + Forge.W - 100;
              const add = this._spawnEnemy(e.def.summonType, sx,
                { x: e.x, y: e.y, cloud: this._enemyCloud(e), flip: e.spr.flipX ? -1 : 1 });
              add.lockbound = e.lockbound;
            }
          }
        }
      }

      e.x = this._clampEnemyX(e.x, e);
      // 行走/待机动画（无被动接触伤害：所有敌方伤害由化形武器承载）
      let moving = e.state === 'walk' || e.state === 'lunge';
      if (e.def.ranged && e.state === 'walk')
        moving = adx < e.def.ranged.keep - 20 || adx > e.def.ranged.keep + 60;
      const want = moving ? e.def.animWalk : (e.def.animIdle || e.def.animWalk);
      if (e.spr.anims.currentAnim?.key !== want) e.spr.play(want, true);
      e.spr.setX(e.x).setFlipX(dx < 0);
      e.shadow.setX(e.x).setVisible(e.spr.visible && e.spr.alpha > 0.05);
    }
    if (culled) this.enemies = this.enemies.filter((e) => !e._culled);
  },

  // ── wyrm 天降凝剑：本体离场（alpha=0 免疫）→ 高空凝剑 → 锋尖俯冲插地 → 落点重组 ──
  _bossSwordSky(e, x0) {
    const S = e.def.sky, C = Forge.C;
    const cam = this.cameras.main.scrollX;
    x0 = Phaser.Math.Clamp(x0, cam + 60, cam + Forge.W - 60);
    e.skyX = x0;
    const wKey = Forge.Cloud.weapon(this, 'sword');
    const wCloud = Forge.Cloud.fromTexture(this, wKey, Forge.FXN.morph);
    const eCloud = this._enemyCloud(e);
    const flip = e.spr.flipX ? -1 : 1;
    const topY = C.FEET_Y - 340;
    e.spr.setVisible(false).setAlpha(0);
    window.GameAudio && GameAudio.play('morph');
    this._warnRing(x0, C.FEET_Y - 8, S.r, S.tele);
    const img = this.add.image(x0, topY, wKey)
      .setOrigin(0.5, 0.5).setDepth(C.DEPTH.FX).setAngle(78).setScale(0.85).setAlpha(0);
    Forge.FX.morph({
      src: { cloud: eCloud, x: e.x, y: e.y, scale: e.def.scale, flip },
      dst: { cloud: wCloud, x: x0, y: topY, scale: 1.1 },
      dur: S.tele * 0.7, turb: 34, rise: 44, n: 480, mix: Forge.ENEMY_MIX,
      onDone: () => {
        if (this.ended || e.dead) { img.destroy(); return; }
        img.setAlpha(1);
        window.GameAudio && GameAudio.play('release');
        this.tweens.add({
          targets: img, y: C.FEET_Y - 150, angle: 92, duration: 220, ease: 'Cubic.easeIn',
          onComplete: () => {
            this._shockRing(x0, C.FEET_Y - 8, S.r, Forge.ENEMY_MIX);
            if (!this.ended && Math.abs(this.P.x - x0) < S.r) this._playerHit(S.dmg, x0);
            this._hitstop(80);
            this.cameras.main.shake(160, 0.01);
            window.GameAudio && GameAudio.play('splashBad');
            this.time.delayedCall(90, () => {
              if (this.ended || e.dead) { img.destroy(); return; }
              img.destroy();
              e.x = x0;
              Forge.FX.morph({
                src: { cloud: wCloud, x: x0, y: C.FEET_Y - 150, scale: 0.85, flip },
                dst: { cloud: eCloud, x: x0, y: e.y, scale: e.def.scale, flip },
                dur: 300, turb: 28, rise: 18, n: 480, mix: Forge.ENEMY_MIX,
                onDone: () => {
                  if (!this.ended && !e.dead) e.spr.setX(x0).setVisible(true).setAlpha(1);
                  e.state = 'walk'; e.atkCd = 420;
                },
              });
            });
          },
        });
      },
    });
  },

  _enemyCloud(e) {
    return e._cloud || (e._cloud = Forge.Cloud.fromTexture(this, e.def.tex, Forge.FXN.kill));
  },

  _wpnAssets(kind) {
    this._waCache = this._waCache || {};
    if (!this._waCache[kind]) {
      const key = Forge.Cloud.weapon(this, kind);
      const src = this.textures.get(key).getSourceImage();
      this._waCache[kind] = { key, cloud: Forge.Cloud.fromTexture(this, key, 240), W: src.width, H: src.height };
    }
    return this._waCache[kind];
  },

  // ── 仆从贴身刺击：本体化短匕(前摇) → 突刺抽回 → 重组回躯体 ──
  _morphToStab(e, dir, ST) {
    const A = this._wpnAssets(ST.weapon), s = ST.ws;
    const wy = e.y - e.spr.displayHeight * 0.5;
    e._wpnDir = dir;
    e.spr.setVisible(false);
    Forge.FX.morph({
      src: { cloud: this._enemyCloud(e), x: e.x, y: e.y, scale: e.def.scale, flip: dir },
      dst: { cloud: A.cloud, x: e.x, y: wy + A.H * s / 2, scale: s, flip: dir },
      dur: ST.tele * 0.8, turb: 26, rise: 12, n: 300, mix: Forge.ENEMY_MIX,
      onDone: () => {
        if (this.ended || e.dead || e.state !== 'tele') return;
        e._wpn = this.add.image(e.x, wy, A.key).setOrigin(0.5, 0.5)
          .setDepth(Forge.C.DEPTH.FX).setFlipX(dir < 0).setScale(s).setAlpha(0.95);
        e._wpnInfo = { cloud: A.cloud, W: A.W, H: A.H, s, ox: 0.5, oy: 0.5 };
      },
    });
  },

  _stabThrust(e, ST) {
    const wp = e._wpn, dir = e._wpnDir || 1;
    if (!wp) {
      e.state = 'walk'; e.atkCd = ST.cd;
      if (!e.dead && !this.ended) e.spr.setVisible(true);
      return;
    }
    const outX = wp.x + dir * ST.reach;
    let struck = false;
    window.GameAudio && GameAudio.play('tick');
    this.tweens.add({
      targets: wp, x: outX, duration: ST.ms * 0.4, ease: 'Cubic.easeOut', yoyo: true, hold: ST.ms * 0.2,
      onUpdate: () => {
        if (e.dead || this.ended) return;
        if (!struck && Math.abs(this.P.x - wp.x) < 36) { struck = true; this._playerHit(e.def.dmg, wp.x); }
      },
      onComplete: () => {
        if (e.dead || this.ended) return;
        if (e._wpn === wp) e._wpn = null;
        const I = e._wpnInfo, ax = wp.x, ay = wp.y + (1 - I.oy) * I.H * I.s;
        wp.destroy(); e._wpnInfo = null;
        e.state = 'reform'; e.stateT = 280; e.atkCd = ST.cd;
        Forge.FX.morph({
          src: { cloud: I.cloud, x: ax, y: ay, scale: I.s, flip: dir },
          dst: { cloud: this._enemyCloud(e), x: e.x, y: e.y, scale: e.def.scale, flip: dir },
          dur: 260, turb: 24, rise: 14, n: 300, mix: Forge.ENEMY_MIX,
          onDone: () => { if (!e.dead && !this.ended) e.spr.setVisible(true); },
        });
      },
    });
  },

  // ── 扑袭化形：本体散作粒子凝成爪(前摇) → 爪实体贯穿突进 → 重组回躯体 ──
  _morphToClaw(e, dir, L) {
    const A = this._wpnAssets('claw'), s = L.ws;
    const wy = e.y - e.spr.displayHeight * 0.45;
    e._wpnDir = dir;
    e.spr.setVisible(false);
    Forge.FX.morph({
      src: { cloud: this._enemyCloud(e), x: e.x, y: e.y, scale: e.def.scale, flip: dir },
      dst: { cloud: A.cloud, x: e.x, y: wy + A.H * s / 2, scale: s, flip: dir },
      dur: L.tele * 0.8, turb: 30, rise: 14, n: 420, mix: Forge.ENEMY_MIX,
      onDone: () => {
        if (this.ended || e.dead || e.state !== 'tele') return;
        e._wpn = this.add.image(e.x, wy, A.key).setOrigin(0.5, 0.5)
          .setDepth(Forge.C.DEPTH.FX).setFlipX(dir < 0).setScale(s).setAlpha(0.95);
        e._wpnInfo = { cloud: A.cloud, W: A.W, H: A.H, s, ox: 0.5, oy: 0.5 };
      },
    });
  },

  _clawDash(e, L) {
    const wp = e._wpn, dir = e._wpnDir || 1;
    if (!wp) {
      e.state = 'walk'; e.atkCd = L.cd;
      if (!e.dead && !this.ended) e.spr.setVisible(true);
      return;
    }
    const x1 = this._clampEnemyX(e.x + dir * L.dist, e);
    let struck = false, trailAcc = 0, lastX = wp.x;
    window.GameAudio && GameAudio.play('release');
    this.tweens.add({
      targets: wp, x: x1, duration: L.ms, ease: 'Cubic.easeOut',
      onUpdate: () => {
        if (e.dead || this.ended) return;
        e.x = wp.x;
        const px = lastX;   // 扫掠判定（同玩家侧）：防低帧率隧穿
        trailAcc += Math.abs(wp.x - lastX); lastX = wp.x;
        while (trailAcc >= 30) {
          trailAcc -= 30;
          Forge.FX.burst({
            cloud: e._wpnInfo.cloud, x: wp.x, y: wp.y, scale: e._wpnInfo.s,
            flip: dir, n: 10, dur: 180, dirX: -dir, mix: Forge.ENEMY_MIX,
          });
        }
        if (!struck && this.P.x > Math.min(px, wp.x) - 48 && this.P.x < Math.max(px, wp.x) + 48) {
          struck = true;
          this._playerHit(e.def.dmg, wp.x);
        }
      },
      onComplete: () => {
        if (e.dead || this.ended) return;
        if (e._wpn === wp) e._wpn = null;
        const I = e._wpnInfo, ax = wp.x, ay = wp.y + (1 - I.oy) * I.H * I.s;
        wp.destroy(); e._wpnInfo = null;
        e.state = 'reform'; e.stateT = 320; e.atkCd = L.cd;
        Forge.FX.morph({
          src: { cloud: I.cloud, x: ax, y: ay, scale: I.s, flip: dir },
          dst: { cloud: this._enemyCloud(e), x: e.x, y: e.y, scale: e.def.scale, flip: dir },
          dur: 300, turb: 26, rise: 16, n: 420, drift: { x: dir * 220 }, mix: Forge.ENEMY_MIX,
          onDone: () => { if (!e.dead && !this.ended) e.spr.setVisible(true); },
        });
      },
    });
  },

  // ── Boss 化形武器（warden 斧 / wyrm 剑）：本体化武器(预备) → 挥扫(落帧) → 重组 ──
  _bossWpn(e) {
    const META = {
      sword:  { s: 0.72, ox: 0.15, oy: 0.5,  holdDx: 24, holdHy: 0.5,  a0: 0,   a1: 42 },
      axe:    { s: 0.75, ox: 0.5,  oy: 0.92, holdDx: 30, holdHy: 0.32, a0: -16, a1: 100 },
    };
    const kind = (e.def.swipe && e.def.swipe.weapon) || 'axe';
    this._bwCache = this._bwCache || {};
    if (!this._bwCache[kind]) {
      const key = Forge.Cloud.weapon(this, kind);
      const src = this.textures.get(key).getSourceImage();
      this._bwCache[kind] = Object.assign(
        { kind, key, cloud: Forge.Cloud.fromTexture(this, key, 240), W: src.width, H: src.height },
        META[kind]);
    }
    return this._bwCache[kind];
  },

  _morphToWeapon(e, dir, S) {
    const A = this._bossWpn(e);
    const ix = e.x + dir * A.holdDx, iy = e.y - e.spr.displayHeight * A.holdHy;
    const dx = dir * (0.5 - A.ox) * A.W * A.s, dy = (1 - A.oy) * A.H * A.s;
    e._wpnDir = dir;
    e.spr.setVisible(false);
    Forge.FX.morph({
      src: { cloud: this._enemyCloud(e), x: e.x, y: e.y, scale: e.def.scale, flip: dir },
      dst: { cloud: A.cloud, x: ix + dx, y: iy + dy, scale: A.s, flip: dir },
      dur: S.tele * 0.8, turb: 30, rise: 14, n: 420, mix: Forge.ENEMY_MIX,
      onDone: () => {
        if (this.ended || e.dead || e.state !== 'tele') return;
        e._wpn = this.add.image(ix, iy, A.key)
          .setOrigin(dir < 0 ? 1 - A.ox : A.ox, A.oy)
          .setDepth(Forge.C.DEPTH.FX).setFlipX(dir < 0)
          .setScale(A.s).setAlpha(0.95).setAngle(dir * A.a0);
      },
    });
  },

  _swingWeapon(e) {
    const wp = e._wpn; e._wpn = null;
    const A = this._bossWpn(e), d0 = e._wpnDir || 1, S = e.def.swipe, C = Forge.C;
    if (!wp) return this._reformBoss(e, A, d0, null);
    const impact = () => {
      this._shockRing(e.x, C.FEET_Y - 8, S.r, Forge.ENEMY_MIX);
      if (!this.ended && !e.dead && Math.abs(this.P.x - e.x) < S.r) this._playerHit(e.def.dmg, e.x);
      Forge.FX.burst({
        cloud: A.cloud, x: wp.x + d0 * (0.5 - A.ox) * A.W * A.s, y: wp.y + (1 - A.oy) * A.H * A.s,
        scale: A.s, flip: d0, n: 90, dur: 380, dirX: d0, mix: Forge.ENEMY_MIX,
      });
      this._reformBoss(e, A, d0, wp);
    };
    if (A.kind === 'sword') {
      this._swordChargeSlash(wp, {
        dir: d0, s: A.s, cloud: A.cloud, mix: Forge.ENEMY_MIX,
        onRelease: () => window.GameAudio && GameAudio.play('release'),
        onImpact: () => { this._hitstop(70); this.cameras.main.shake(140, 0.008); impact(); },
      });
    } else {
      this.tweens.add({ targets: wp, angle: d0 * A.a1, duration: 130, ease: 'Cubic.easeIn', onComplete: impact });
    }
  },

  _reformBoss(e, A, d0, wp) {
    const show = () => { if (!e.dead && !this.ended) e.spr.setVisible(true); };
    if (!wp) return show();
    const sx = wp.x + d0 * (0.5 - A.ox) * A.W * A.s, sy = wp.y + (1 - A.oy) * A.H * A.s;
    wp.destroy();
    Forge.FX.morph({
      src: { cloud: A.cloud, x: sx, y: sy, scale: A.s, flip: d0 },
      dst: { cloud: this._enemyCloud(e), x: e.x, y: e.y, scale: e.def.scale, flip: d0 },
      dur: 300, turb: 26, rise: 16, n: 420, drift: { x: d0 * 160 }, mix: Forge.ENEMY_MIX,
      onDone: show,
    });
  },

  _dropWeapon(e) {
    const wp = e._wpn; e._wpn = null;
    if (!wp) return;
    const d0 = e._wpnDir || 1;
    if (e._wpnInfo) {
      const I = e._wpnInfo;
      Forge.FX.dissolve({ cloud: I.cloud, x: wp.x, y: wp.y, scale: I.s, flip: d0, n: 120, dur: 320, mix: Forge.ENEMY_MIX });
      e._wpnInfo = null;
    } else {
      const A = this._bossWpn(e);
      Forge.FX.dissolve({
        cloud: A.cloud, x: wp.x + d0 * (0.5 - A.ox) * A.W * A.s, y: wp.y + (1 - A.oy) * A.H * A.s,
        scale: A.s, flip: d0, n: 150, dur: 340, mix: Forge.ENEMY_MIX,
      });
    }
    wp.destroy();
  },

  // 掷弹起手剥离（敌我共用，只差染色）
  _peelBurst(cloud, x, y, scale, flip, dir, mix) {
    Forge.FX.burst({ cloud, x, y, scale, flip, n: 96, dur: 440, dirX: dir, mix });
  },

  _dartAssets() {
    if (!this._dartA) {
      const key = Forge.Cloud.weapon(this, 'shard');
      this._dartA = { key, cloud: Forge.Cloud.fromTexture(this, key, 140), W: 90, H: 90, ORY: 0.5 };
    }
    return this._dartA;
  },

  _makeDart(x, y, dir, mix) {
    const A = this._dartAssets(), s = 0.5;
    const img = this.add.image(x, y, A.key).setOrigin(0.5, A.ORY)
      .setDepth(Forge.C.DEPTH.FX).setScale(s).setFlipX(dir < 0).setAlpha(0.95);
    const fx = Forge.FX.follow({ x, y, n: Forge.FXN.proj, rad: 9, life: 260, mix });
    const x0 = x;
    return {
      setPos(px, py) { img.setPosition(px, py); img.setRotation(dir * (px - x0) * 0.045); fx.setPos(px, py); },
      die: () => {
        fx.die();
        Forge.FX.burst({
          cloud: A.cloud, x: img.x, y: img.y + (1 - A.ORY) * A.H * s, scale: s, flip: dir,
          n: 16, dur: 320, dirX: dir, mix,
        });
        img.destroy();
      },
    };
  },

  _spawnProjectile(x, y, dir, speed, dmg) {
    const dart = this._makeDart(x, y, dir, Forge.ENEMY_MIX);
    this.projectiles.push({ x, y, dir, speed, dmg, dart });
  },

  _updateProjectiles(dms) {
    const dt = dms / 1000, P = this.P, cam = this.cameras.main.scrollX;
    for (const pr of this.projectiles) {
      const px = pr.x;
      pr.x += pr.dir * pr.speed * dt;
      pr.dart.setPos(pr.x, pr.y);
      // 纯横向扫掠判定（全场约定，敌我弹一致；扫掠防低帧率隧穿）；免疫/无敌时穿身继续飞
      if (!this.ended && P.x > Math.min(px, pr.x) - 30 && P.x < Math.max(px, pr.x) + 30) {
        const before = P.hp;
        this._playerHit(pr.dmg, pr.x);
        if (P.hp < before) pr.dead = true;
      } else if (pr.x < cam - Forge.W * 0.5 || pr.x > cam + Forge.W * 1.5) pr.dead = true;   // 出屏清理
    }
    this.projectiles = this.projectiles.filter((pr) => {
      if (pr.dead) pr.dart.die();
      return !pr.dead;
    });
  },

  // ── 普通命中：局部迸溅 + 顿帧 + 击退 + 闪烁 ──
  _hitEnemy(e, dmg, knock, weapon) {
    if (e.dead || e.spr.alpha < 1) return;   // 入场凝聚中不可击（防隐形死锁）
    if (e.def.superArmor && e.state === 'tele' && weapon === 'hammer') {
      e.state = 'walk'; e.atkCd = (e.def.swipe && e.def.swipe.cd) || 1500;
      this._dropWeapon(e);
      e.spr.setVisible(true);
    }
    e.hp -= dmg;
    const flip = e.spr.flipX ? -1 : 1;
    Forge.FX.burst({
      cloud: this._enemyCloud(e), x: e.x, y: e.y, scale: e.def.scale, flip,
      n: Forge.FXN.burst, dirX: Math.sign(knock) || 1,
    });
    this._hitstop(40);
    window.GameAudio && GameAudio.play('tick');
    const k = e.def.boss ? knock * 0.25 : knock;
    e.x = this._clampEnemyX(e.x + k, e);
    this.tweens.add({ targets: e.spr, alpha: 0.4, duration: 70, yoyo: true,
      onComplete: () => { if (!e.dead) e.spr.setAlpha(1); } });
    if (e.hp <= 0) this._killEnemy(e);
  },

  _killSlowmo() {
    const gen = (this._slowGen = (this._slowGen || 0) + 1);
    this.time.timeScale = 0.3; this.tweens.timeScale = 0.3;
    setTimeout(() => {
      if (this._slowGen === gen) { this.time.timeScale = 1; this.tweens.timeScale = 1; }
    }, 80);
  },

  // ── 死亡：精英 → 形烙归体（强制夺形）；其余黑雾消散 ──
  _killEnemy(e) {
    e.dead = true;
    this.kills++;
    this._dropWeapon(e);
    this._killSlowmo();
    const flip = e.spr.flipX ? -1 : 1;
    e.spr.setVisible(false); e.shadow.setVisible(false);
    const cloud = this._enemyCloud(e);
    if (e.def.steal) {
      Forge.FX.absorb({
        cloud, x: e.x, y: e.y, scale: e.def.scale, flip,
        targetFn: () => ({ x: this.P.x, y: this._pY() - 70 }),
        onDone: () => { if (!this.ended) this._stealForm(e.def.steal); },
      });
    } else {
      Forge.FX.dissolve({ cloud, x: e.x, y: e.y, scale: e.def.scale, flip,
        dur: e.def.boss ? 1400 : 850, n: e.def.boss ? 700 : Forge.FXN.kill });
      if (e.def.boss) this.cameras.main.shake(240, 0.01);
    }
    this.time.delayedCall(50, () => { e.spr.destroy(); e.shadow.destroy(); });
    this.enemies = this.enemies.filter(o => o !== e);
    this._checkLock();
  },
});
