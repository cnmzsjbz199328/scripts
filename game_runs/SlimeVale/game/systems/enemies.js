/* SlimeVale — 敌人 AI 与生命周期（Object.assign 到 MeadowScene 原型）。
 * 分支按 def 能力判定：hopAtk 大跳砸落 / fly+dive 悬停俯冲 / spit 定点吐种 /
 * charge 贴地猛冲 / stomp|swipe+rain|roots|volley+summon 三只 Boss。
 * 所有伤害都有前摇；地面 AOE 一律跳得过（跳跃=万用防御），飞行与俯冲负责反制赖空。
 * 横版三条生命周期规则（蓝图 §5）：休眠出生 / 甩开清理 / 弹丸出屏销毁。
 * 露水流转：击杀 → def.absorb 流回玩家（金露吸收特效）；详见 player.js _playerHit 的反向流。 */
Object.assign(MeadowScene.prototype, {

  _eBody(e) { return e.ey - e.spr.displayHeight * 0.45; },

  _spawnEnemy(type, x, origin) {
    const def = Forge.ENEMY[type], C = Forge.C;
    const ey = def.fly ? C.FEET_Y - def.fly.h : C.FEET_Y;
    const spr = this.add.image(x, ey, def.tex)
      .setOrigin(0.5, 1).setScale(def.scale).setDepth(C.DEPTH.CHAR - 1);
    const shadow = this.add.ellipse(x, C.FEET_Y - 8, 60 * def.scale, 10, 0x1d5c3a, 0.24)
      .setDepth(C.DEPTH.SHADOW);
    const e = {
      type, def, spr, shadow, x, ey, homeX: x,
      vy: 0, vx: 0, grounded: !def.fly, hopT: 300 + Math.random() * 300, bobT: Math.random() * 4000,
      hp: def.hp, dead: false, lockbound: false, struck: false,
      state: 'walk', stateT: 0, atkCd: 900,
      volleyT: 0, rainT: 1600, summonT: 0,
    };
    e._cloud = Forge.Cloud.fromTexture(this, def.tex, Forge.FXN.kill);
    spr.setAlpha(0);   // 入场凝聚中 alpha<1：不行动、不可击
    const src = origin
      ? { cloud: origin.cloud || e._cloud, x: origin.x, y: origin.y, scale: def.scale * 0.4, flip: origin.flip || 1 }
      : { cloud: e._cloud, x, y: ey - 130, scale: def.scale * 0.4 };
    Forge.FX.morph({
      src, dst: { cloud: e._cloud, x, y: ey, scale: def.scale },
      dur: origin ? 620 : 460, turb: 40, rise: origin ? 34 : 10, n: 420,
      mix: origin ? Forge.ENEMY_MIX : undefined,
      onDone: () => { if (!e.dead) spr.setAlpha(1); },
    });
    this.enemies.push(e);
    return e;
  },

  _removeEnemy(e) {
    e.dead = true; e._culled = true;
    e.spr.destroy(); e.shadow.destroy();
  },

  _updateEnemies(dms) {
    const P = this.P, cam = this.cameras.main.scrollX;
    const dt = dms / 1000;
    let culled = false;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (!e.lockbound && e.x < cam - Forge.W * Forge.CAM.leashScreens) {
        this._removeEnemy(e); culled = true; continue;
      }
      e.atkCd = Math.max(0, e.atkCd - dms);
      e.bobT += dms;
      if (e.spr.alpha < 1) { this._placeEnemy(e); continue; }        // 凝聚入场中
      if (e.x > cam + Forge.W + 200 && e.state === 'walk') { this._placeEnemy(e); continue; }   // 休眠

      const dx = P.x - e.x, adx = Math.abs(dx), dir = Math.sign(dx) || 1;
      const D = e.def;
      if (D.hopAtk) this._updHopper(e, dms, dt, adx, dir);
      else if (D.spit) this._updPuff(e, dms, dt, adx, dir);
      else if (D.charge) this._updSnail(e, dms, dt, adx, dir);
      else if (D.fly) this._updFlyer(e, dms, dt, adx, dir);
      else if (D.stomp || D.swipe) this._updBossGround(e, dms, dt, adx, dir);

      if (D.boss) this._updBossShared(e, dms);
      e.x = this._clampEnemyX(e.x, e);
      this._placeEnemy(e, dx);
    }
    if (culled) this.enemies = this.enemies.filter((x) => !x._culled);
  },

  _placeEnemy(e, dx) {
    // 姿态：前摇下蹲 / 力竭压扁 / 飞行微倾
    let sx = 1, sy = 1, ang = 0;
    if (e.state === 'tele') { sx = 1.1; sy = 0.86; }
    else if (e.state === 'tired') { sx = 1.18; sy = 0.74; }
    else if (e.state === 'dive') ang = (e.dvx || 0) > 0 ? 18 : -18;
    else if (e.def.fly) ang = Math.sin(e.bobT / 300) * 4;
    else if (e.def.rooted) ang = Math.sin(e.bobT / 620) * 3;
    e.spr.setPosition(e.x, e.ey)
      .setScale(sx * e.def.scale, sy * e.def.scale)
      .setFlipX(dx !== undefined ? dx < 0 : e.spr.flipX)
      .setAngle(ang);
    const alt = Forge.C.FEET_Y - e.ey;
    e.shadow.setX(e.x)
      .setScale(Phaser.Math.Clamp(1 - alt / 800, 0.4, 1))
      .setVisible(e.spr.visible && e.spr.alpha > 0.05)
      .setAlpha(0.24 * e.spr.alpha * Phaser.Math.Clamp(1 - alt / 1000, 0.4, 1));
  },

  // ── 灰兔蹦蹦：蹦跳逼近 → 蓄力大跳砸向玩家脚下（落点 AOE）──
  _updHopper(e, dms, dt, adx, dir) {
    const A = e.def.hopAtk;
    if (!e.grounded) {
      e.vy += 2200 * dt;
      e.ey += e.vy * dt;
      e.x += e.vx * dt;
      if (e.ey >= Forge.C.FEET_Y) {
        e.ey = Forge.C.FEET_Y; e.grounded = true; e.vx = 0;
        if (e.state === 'atk') {
          this._shockRing(e.x, Forge.C.FEET_Y - 8, A.r, Forge.ENEMY_MIX, 260);
          if (Math.abs(this.P.x - e.x) < A.r && this.P.y > Forge.C.FEET_Y - 56)
            this._playerHit(e.def.dmg, e.x, e);
          e.state = 'walk'; e.atkCd = A.cd;
          window.GameAudio && GameAudio.play('tick');
        }
      }
      return;
    }
    if (e.state === 'walk') {
      if (adx < A.range && e.atkCd <= 0) {
        e.state = 'tele'; e.stateT = A.tele;
        Forge.FX.gather({ x: e.x, y: e.ey - 30, r: 46, dur: A.tele, n: Forge.FXN.gather, mix: Forge.ENEMY_MIX });
      } else {
        e.hopT -= dms;
        if (e.hopT <= 0 && adx > 46) {
          e.grounded = false; e.vy = -360; e.vx = dir * e.def.speed * 2.2;
          e.hopT = 620 + Math.random() * 260;
        }
      }
    } else if (e.state === 'tele') {
      e.stateT -= dms;
      if (e.stateT <= 0) {
        e.state = 'atk'; e.grounded = false; e.vy = A.jumpV;
        e.vx = Phaser.Math.Clamp((this.P.x - e.x) / (A.ms / 1000), -520, 520);
      }
    }
  },

  // ── 刺蜂 / 蜂后：低空悬停（单跳可及）→ 锁定起手瞬间的身位俯冲；蜂后俯冲后落地喘息 ──
  _updFlyer(e, dms, dt, adx, dir) {
    const F = e.def.fly, D = e.def.dive;
    if (e.state === 'walk') {
      const targetY = Forge.C.FEET_Y - F.h + Math.sin(e.bobT / 480) * F.bob;
      e.ey += (targetY - e.ey) * Math.min(1, dms / 220);
      if (adx > 180) e.x += dir * e.def.speed * dt;
      else if (adx < 100) e.x -= dir * e.def.speed * dt * 0.7;
      if (adx < D.range && e.atkCd <= 0) {
        e.state = 'tele'; e.stateT = D.tele;
        Forge.FX.gather({ x: e.x, y: this._eBody(e), r: 50, dur: D.tele, n: Forge.FXN.gather, mix: Forge.ENEMY_MIX });
      }
    } else if (e.state === 'tele') {
      e.stateT -= dms;
      if (e.stateT <= 0) {
        e.state = 'dive'; e.stateT = D.ms; e.struck = false;
        e.dvx = (this.P.x - e.x) / (D.ms / 1000);
        e.dvy = (this.P.y - 8 - e.ey) / (D.ms / 1000);
        window.GameAudio && GameAudio.play('release');
      }
    } else if (e.state === 'dive') {
      e.x += e.dvx * dt; e.ey += e.dvy * dt;
      e.ey = Math.min(e.ey, Forge.C.FEET_Y);
      if (!e.struck && Math.abs(this.P.x - e.x) < D.r && Math.abs(this.P.y - e.ey) < D.r + 10) {
        e.struck = true;
        this._playerHit(e.def.dmg, e.x, e);
      }
      e.stateT -= dms;
      if (e.stateT <= 0) {
        if (D.ground) { e.state = 'tired'; e.stateT = D.ground; }
        else { e.state = 'rise'; e.stateT = D.rise; }
      }
    } else if (e.state === 'tired') {
      e.ey += (Forge.C.FEET_Y - e.ey) * Math.min(1, dms / 140);
      e.stateT -= dms;
      if (e.stateT <= 0) { e.state = 'rise'; e.stateT = D.rise; }
    } else if (e.state === 'rise') {
      e.ey += ((Forge.C.FEET_Y - F.h) - e.ey) * Math.min(1, dms / 260);
      e.stateT -= dms;
      if (e.stateT <= 0) { e.state = 'walk'; e.atkCd = D.cd; }
    }
  },

  // ── 蒲公英炮手：生根，瞄准玩家此刻身位吐种子（射后位移即空弹）──
  _updPuff(e, dms, dt, adx, dir) {
    const S = e.def.spit;
    if (e.state === 'walk') {
      if (adx < S.range && e.atkCd <= 0) {
        e.state = 'tele'; e.stateT = S.tele;
        Forge.FX.gather({ x: e.x, y: e.ey - 82, r: 44, dur: S.tele, n: Forge.FXN.gather, mix: Forge.ENEMY_MIX });
      }
    } else if (e.state === 'tele') {
      e.stateT -= dms;
      if (e.stateT <= 0) {
        e.state = 'walk'; e.atkCd = S.cd;
        const sy = e.ey - 82;
        const ang = Math.atan2(this._pBodyY() - sy, this.P.x - e.x);
        this._spawnProjectile(e.x, sy, Math.cos(ang) * S.speed, Math.sin(ang) * S.speed, e.def.dmg, e);
        this._peelBurst(e._cloud, e.x, sy, e.def.scale * 0.7, e.spr.flipX ? -1 : 1, dir, Forge.ENEMY_MIX);
        window.GameAudio && GameAudio.play('tick');
      }
    }
  },

  // ── 硬壳蜗牛：慢速逼近 → 壳光一闪贴地猛冲 → 力竭喘息（输出窗口）──
  _updSnail(e, dms, dt, adx, dir) {
    const C = e.def.charge;
    if (e.state === 'walk') {
      e.x += dir * e.def.speed * dt;
      if (adx < C.range && e.atkCd <= 0) {
        e.state = 'tele'; e.stateT = C.tele;
        Forge.FX.gather({ x: e.x, y: e.ey - 34, r: 48, dur: C.tele, n: Forge.FXN.gather, mix: Forge.ENEMY_MIX });
        this.tweens.add({ targets: e.spr, alpha: 0.55, duration: 110, yoyo: true, repeat: 2 });
      }
    } else if (e.state === 'tele') {
      e.stateT -= dms;
      if (e.stateT <= 0) {
        e.state = 'charge'; e.stateT = C.ms; e.struck = false;
        e.cvx = dir * C.dist / (C.ms / 1000);
        window.GameAudio && GameAudio.play('release');
      }
    } else if (e.state === 'charge') {
      const px = e.x;
      e.x += e.cvx * dt;
      if (!e.struck && this.P.x > Math.min(px, e.x) - 48 && this.P.x < Math.max(px, e.x) + 48
          && this.P.y > Forge.C.FEET_Y - 52) {
        e.struck = true;
        this._playerHit(e.def.dmg, e.x, e);
      }
      e.stateT -= dms;
      if (e.stateT <= 0) { e.state = 'tired'; e.stateT = C.tired; }
    } else if (e.state === 'tired') {
      e.stateT -= dms;
      if (e.stateT <= 0) { e.state = 'walk'; e.atkCd = C.cd; }
    }
  },

  // ── 地面 Boss（蘑菇酋长踏地 / 枯萎之冠藤扫）：近身圆形 AOE，预警环期间跳走即可 ──
  _updBossGround(e, dms, dt, adx, dir) {
    const S = e.def.stomp || e.def.swipe;
    if (e.state === 'walk') {
      if (!e.def.rooted) e.x += dir * e.def.speed * dt;
      if (adx < S.r - 20 && e.atkCd <= 0) {
        e.state = 'tele'; e.stateT = S.tele;
        this._warnRing(e.x, Forge.C.FEET_Y - 8, S.r, S.tele);
        Forge.FX.gather({ x: e.x, y: this._eBody(e), r: 60, dur: S.tele, n: Forge.FXN.gather, mix: Forge.ENEMY_MIX });
      }
    } else if (e.state === 'tele') {
      e.stateT -= dms;
      if (e.stateT <= 0) {
        e.state = 'walk'; e.atkCd = S.cd;
        this._shockRing(e.x, Forge.C.FEET_Y - 8, S.r, Forge.ENEMY_MIX);
        Forge.FX.burst({ cloud: e._cloud, x: e.x, y: e.ey, scale: e.def.scale, flip: 1, n: 60, dur: 360, dirX: dir, mix: Forge.ENEMY_MIX });
        if (Math.abs(this.P.x - e.x) < S.r && this.P.y > Forge.C.FEET_Y - 60)
          this._playerHit(e.def.dmg, e.x, e);
        this._hitstop(60);
        this.cameras.main.shake(120, 0.007);
        window.GameAudio && GameAudio.play('splashBad');
      }
    }
  },

  // ── Boss 共有：孢子雨/根刺三连（追玩家的预警列）+ 种子扇 + 召唤 ──
  _updBossShared(e, dms) {
    const D = e.def;
    if (D.rain || D.roots) {
      e.rainT += dms;
      const R = D.rain || D.roots;
      if (e.rainT >= R.cd && e.state === 'walk') {
        e.rainT = 0;
        this._barrage(e, R, D.rain ? 'rain' : 'roots');
      }
    }
    if (D.volley) {
      e.volleyT += dms;
      if (e.volleyT >= D.volley.cd && e.state === 'walk') {
        e.volleyT = 0;
        const V = D.volley, sy = this._eBody(e);
        const ang0 = Math.atan2(this._pBodyY() - sy, this.P.x - e.x);
        for (let i = 0; i < V.n; i++) {
          const a = ang0 + (i - (V.n - 1) / 2) * V.spread;
          this._spawnProjectile(e.x, sy, Math.cos(a) * V.speed, Math.sin(a) * V.speed, V.dmg, e);
        }
        this._peelBurst(e._cloud, e.x, sy, e.def.scale * 0.6, e.spr.flipX ? -1 : 1, Math.sign(this.P.x - e.x) || 1, Forge.ENEMY_MIX);
        window.GameAudio && GameAudio.play('tick');
      }
    }
    if (D.summonMs) {
      e.summonT += dms;
      if (e.summonT >= D.summonMs) {
        e.summonT = 0;
        const adds = this.enemies.filter((o) => !o.dead && o.type === D.summonType).length;
        if (adds < D.maxAdds) {
          const base = this.lock ? this.lock.camX : this.cameras.main.scrollX;
          const sx = e.x > base + Forge.W / 2 ? base + 110 : base + Forge.W - 110;
          const add = this._spawnEnemy(D.summonType, sx,
            { x: e.x, y: this._eBody(e), cloud: e._cloud, flip: e.spr.flipX ? -1 : 1 });
          add.lockbound = e.lockbound;
        }
      }
    }
  },

  // 三列地面轰炸：预警环 → 落孢子（rain）或地刺拔起（roots），只打贴地目标 → 跳/挪即可
  _barrage(e, R, kind) {
    const base = this.lock ? this.lock.camX : this.cameras.main.scrollX;
    for (let i = 0; i < R.n; i++) {
      const bx = Phaser.Math.Clamp(
        this.P.x + (i - (R.n - 1) / 2) * R.gap, base + 50, base + Forge.W - 50);
      this._warnRing(bx, Forge.C.FEET_Y - 8, R.r, R.tele);
      this.hazards.push({ x: bx, r: R.r, t: this.time.now + R.tele });   // bot 闪避感知

      this.time.delayedCall(R.tele, () => {
        if (this.ended || e.dead) return;
        const impact = () => {
          this._shockRing(bx, Forge.C.FEET_Y - 8, R.r, Forge.ENEMY_MIX, 280);
          if (Math.abs(this.P.x - bx) < R.r && this.P.y > Forge.C.FEET_Y - 60)
            this._playerHit(R.dmg, bx, null);   // 轰炸不吸露（防雪崩钳制 2）
          window.GameAudio && GameAudio.play('tick');
        };
        if (kind === 'rain') {
          const img = this.add.image(bx, -30, 'p_seed').setDepth(Forge.C.DEPTH.FX).setScale(1.4);
          this.tweens.add({
            targets: img, y: Forge.C.FEET_Y - 14, angle: 160, duration: 300, ease: 'Quad.easeIn',
            onComplete: () => { img.destroy(); impact(); },
          });
        } else {
          const img = this.add.image(bx, Forge.C.FEET_Y + 46, 'e_spike')
            .setOrigin(0.5, 1).setDepth(Forge.C.DEPTH.FX);
          img.y = Forge.C.FEET_Y + 46;
          this.tweens.add({
            targets: img, y: Forge.C.FEET_Y + 6, duration: 130, ease: 'Back.easeOut',
            onStart: impact,
            onComplete: () => this.tweens.add({
              targets: img, alpha: 0, y: Forge.C.FEET_Y + 30, delay: 260, duration: 220,
              onComplete: () => img.destroy(),
            }),
          });
        }
      });
    }
  },

  // 掷弹起手剥离（敌我共用，只差染色）
  _peelBurst(cloud, x, y, scale, flip, dir, mix) {
    Forge.FX.burst({ cloud, x, y, scale, flip, n: 80, dur: 420, dirX: dir, mix });
  },

  // ── 敌方弹体：枯萎种子（直线，带 vy；两步子采样防隧穿）──
  _spawnProjectile(x, y, vx, vy, dmg, src) {
    const img = this.add.image(x, y, 'p_seed').setDepth(Forge.C.DEPTH.FX);
    const fx = Forge.FX.follow({ x, y, n: Forge.FXN.proj, rad: 8, life: 240, mix: Forge.ENEMY_MIX });
    this.projectiles.push({
      x, y, vx, vy, dmg, src,
      dart: {
        setPos(px, py, ang) { img.setPosition(px, py).setAngle(ang); fx.setPos(px, py); },
        die: () => {
          fx.die();
          Forge.FX.ring({ x: img.x, y: img.y, r: 20, dur: 180, mode: 'out', n: 18, mix: Forge.ENEMY_MIX });
          img.destroy();
        },
      },
    });
  },

  _updateProjectiles(dms) {
    const dt = dms / 1000, P = this.P, cam = this.cameras.main.scrollX;
    for (const pr of this.projectiles) {
      for (let s = 0; s < 2 && !pr.dead; s++) {   // 两步子采样
        pr.x += pr.vx * dt / 2; pr.y += pr.vy * dt / 2;
        if (!this.ended && Math.abs(P.x - pr.x) < 36 && Math.abs(this._pBodyY() - pr.y) < 36) {
          const before = P.hp;
          this._playerHit(pr.dmg, pr.x, null);   // 弹幕不吸露（防雪崩钳制 2）
          if (P.hp < before) pr.dead = true;
        }
      }
      pr.dart.setPos(pr.x, pr.y, (pr.vx > 0 ? 1 : -1) * (this.time.now % 3600) * 0.1);
      if (pr.y > Forge.C.FEET_Y - 6 || pr.y < -60
          || pr.x < cam - Forge.W * 0.5 || pr.x > cam + Forge.W * 1.5) pr.dead = true;
    }
    this.projectiles = this.projectiles.filter((pr) => {
      if (pr.dead) pr.dart.die();
      return !pr.dead;
    });
  },

  // ── 命中：迸溅 + 顿帧 + 击退 + 闪烁 ──
  _hitEnemy(e, dmg, knock, weapon) {
    if (e.dead || e.spr.alpha < 1) return;   // 入场凝聚中不可击
    e.hp -= dmg;
    const flip = e.spr.flipX ? -1 : 1;
    Forge.FX.burst({
      cloud: e._cloud, x: e.x, y: e.ey, scale: e.def.scale, flip,
      n: Forge.FXN.burst, dirX: Math.sign(knock) || 1,
    });
    this._hitstop(40);
    window.GameAudio && GameAudio.play('tick');
    if (!e.def.rooted) {
      const k = e.def.boss ? knock * 0.25 : knock;
      e.x = this._clampEnemyX(e.x + k, e);
    }
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

  // ── 死亡：露水归还（金露吸收 → 玩家回血）+ 躯壳消散 ──
  _killEnemy(e) {
    e.dead = true;
    this.kills++;
    this._killSlowmo();
    const flip = e.spr.flipX ? -1 : 1;
    e.spr.setVisible(false); e.shadow.setVisible(false);
    Forge.FX.dissolve({
      cloud: e._cloud, x: e.x, y: e.ey, scale: e.def.scale, flip,
      dur: e.def.boss ? 1400 : 850, n: e.def.boss ? 700 : Forge.FXN.kill, mix: Forge.ENEMY_MIX,
    });
    const heal = e.def.absorb;
    if (heal > 0 && !this.ended) {
      Forge.FX.absorb({
        cloud: e._cloud, x: e.x, y: e.ey, scale: e.def.scale, flip,
        targetFn: () => ({ x: this.P.x, y: this._pBodyY() }),
        onDone: () => {
          if (this.ended || this.P.state === 'dead') return;
          const before = this.P.hp;
          this.P.hp = Math.min(Forge.PLAYER.maxHp, this.P.hp + heal);
          if (this.P.hp !== before) {
            window.GameHUD && GameHUD.setHearts(this.P.hp, Forge.PLAYER.maxHp);
            this._popup(this.P.x, this.P.y - 92, `+${this.P.hp - before}`, '#2fae7d');
          }
          window.GameAudio && GameAudio.play('splashGood');
        },
      });
    }
    if (e.def.boss) this.cameras.main.shake(240, 0.01);
    this.time.delayedCall(50, () => { e.spr.destroy(); e.shadow.destroy(); });
    this.enemies = this.enemies.filter((o) => o !== e);
    this._checkLock();
  },

  // ── 全角色血条（用户契约：所有角色都显示血条）：共享 Graphics 每帧重绘 ──
  _drawBars() {
    const g = this.bars;
    g.clear();
    const bar = (x, top, w, frac, color) => {
      g.fillStyle(0xffffff, 0.62);
      g.fillRoundedRect(x - w / 2 - 1.5, top - 1.5, w + 3, 8, 4);
      if (frac > 0) {
        g.fillStyle(color, 1);
        g.fillRoundedRect(x - w / 2, top, Math.max(4, w * frac), 5, 2.5);
      }
    };
    const P = this.P;
    if (this.player.visible && P.state !== 'dead')
      bar(P.x, P.y - 92, 54, P.hp / Forge.PLAYER.maxHp,
        P.hp / Forge.PLAYER.maxHp < 0.34 ? 0xff8a70 : 0x35d08e);
    for (const e of this.enemies) {
      if (e.dead || e.spr.alpha < 1 || !e.spr.visible) continue;
      const w = e.def.boss ? 78 : 46;
      bar(e.x, e.ey - e.spr.displayHeight - 12, w, Phaser.Math.Clamp(e.hp / e.def.hp, 0, 1), 0xa886e0);
    }
  },
});
