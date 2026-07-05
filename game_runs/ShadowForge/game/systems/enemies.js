/* ShadowForge — 敌人 AI 与分级受击（Object.assign 到 ArenaScene 原型）。
 * soul 亡魂: 缓慢逼近，接触伤害。
 * fiend 恶鬼: 快速，近身有预备帧扑袭；死后掉「魄」（金尘归体 → E 化形）。
 * minos 判官: Boss，宽幅挥臂（长预备帧），周期召唤亡魂。
 * 分级反馈: 普通命中=局部迸溅+顿帧+击退；死亡=全身消散/吸魄。 */
Object.assign(ArenaScene.prototype, {

  _spawnEnemy(type, x) {
    const def = Forge.ENEMY[type], C = Forge.C;
    const y = C.FEET_Y + (def.glb ? C.GLB_PAD * def.scale : 0);
    const spr = this.add.sprite(x, y, def.tex)
      .setOrigin(0.5, 1).setScale(def.scale).setDepth(C.DEPTH.CHAR - 1);
    spr.play(def.anim);
    const shadow = this.add.ellipse(x, C.FEET_Y - 10, 66 * def.scale, 11, 0x000000, 0.26)
      .setDepth(C.DEPTH.SHADOW);
    const e = {
      type, def, spr, shadow, x, y,
      hp: def.hp, dead: false,
      state: 'walk', stateT: 0, atkCd: 800, touchCd: 600, summonT: 0,
    };
    // 入场也走粒子凝聚：雾团从上方聚成敌形
    spr.setAlpha(0);
    Forge.FX.morph({
      src: { cloud: e._cloud || (e._cloud = Forge.Cloud.fromTexture(this, def.tex, Forge.FXN.kill)), x, y: y - 130, scale: def.scale * 0.4 },
      dst: { cloud: e._cloud, x, y, scale: def.scale },
      dur: 460, turb: 40, rise: 10, n: 420,
      onDone: () => { if (!e.dead) spr.setAlpha(1); },
    });
    this.enemies.push(e);
    return e;
  },

  _updateEnemies(dms) {
    const P = this.P, C = Forge.C;
    const dt = dms / 1000;
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.atkCd = Math.max(0, e.atkCd - dms);
      e.touchCd = Math.max(0, e.touchCd - dms);
      if (e.spr.alpha < 1) continue;               // 凝聚入场中，不行动
      const dx = P.x - e.x, adx = Math.abs(dx), dir = Math.sign(dx) || 1;

      if (e.type === 'soul' || e.type === 'icesoul') {
        e.x += dir * e.def.speed * dt;

      } else if (e.type === 'furies') {
        const R = e.def.ranged;
        // 保持距离放风筝：太近后退、太远才追近，不吃接触伤害的近身逻辑
        if (adx < R.keep - 20) e.x -= dir * e.def.speed * dt;
        else if (adx > R.keep + 60) e.x += dir * e.def.speed * dt;
        if (e.state === 'walk' && e.atkCd <= 0) { e.state = 'tele'; e.stateT = R.tele; }
        else if (e.state === 'tele') {
          e.stateT -= dms;
          if (e.stateT <= 0) {
            e.state = 'walk'; e.atkCd = R.cd;
            this._spawnProjectile(e.x, e.y - 40, dir, R.projSpeed, R.dmg);
            window.GameAudio && GameAudio.play('tick');
          }
        }

      } else if (e.type === 'fiend') {
        const L = e.def.lunge;
        if (e.state === 'walk') {
          e.x += dir * e.def.speed * dt;
          if (adx < L.dist && e.atkCd <= 0) {
            e.state = 'tele'; e.stateT = L.tele; e.lungeDir = dir;
            this.tweens.add({ targets: e.spr, scaleX: e.def.scale * 1.12, duration: 110, yoyo: true, repeat: 1 });
          }
        } else if (e.state === 'tele') {
          e.stateT -= dms;
          if (e.stateT <= 0) { e.state = 'lunge'; e.stateT = L.ms; }
        } else if (e.state === 'lunge') {
          e.stateT -= dms;
          e.x += e.lungeDir * L.speed * dt;
          if (e.stateT <= 0) { e.state = 'walk'; e.atkCd = L.cd; }
        }

      } else if (e.type === 'minos') {
        const S = e.def.swipe;
        if (e.state === 'walk') {
          e.x += dir * e.def.speed * dt;
          if (adx < S.r - 20 && e.atkCd <= 0) {
            e.state = 'tele'; e.stateT = S.tele;
            this.tweens.add({ targets: e.spr, scaleY: e.def.scale * 1.07, duration: S.tele / 2, yoyo: true });
            this._shockRing(e.x, C.FEET_Y - 8, S.r, 0x8a2c18, S.tele);   // 预警圈：给闪避窗口
          }
        } else if (e.state === 'tele') {
          e.stateT -= dms;
          if (e.stateT <= 0) {
            e.state = 'walk'; e.atkCd = S.cd;
            this.cameras.main.shake(110, 0.007);
            this._shockRing(e.x, C.FEET_Y - 8, S.r);
            if (Math.abs(P.x - e.x) < S.r) this._playerHit(e.def.dmg, e.x);
          }
        }
        // 周期召唤亡魂（限量，避免车轮战失控）
        e.summonT += dms;
        if (e.summonT >= e.def.summonMs) {
          e.summonT = 0;
          const adds = this.enemies.filter(o => !o.dead && o.type === 'soul').length;
          if (adds < e.def.maxAdds)
            this._spawnEnemy('soul', e.x > Forge.W / 2 ? 100 : 860);
        }
      }

      e.x = Phaser.Math.Clamp(e.x, C.X_MIN - 10, C.X_MAX + 10);
      // 接触伤害（扑袭中的恶鬼也算；纯远程单位 dmg:0 不触发，避免 0 伤害的空反馈）
      if (e.def.dmg > 0 && adx < e.def.touchR && e.touchCd <= 0 && e.state !== 'tele') {
        e.touchCd = 1000;
        this._playerHit(e.def.dmg, e.x);
      }
      e.spr.setX(e.x).setFlipX(dx < 0);
      e.shadow.setX(e.x).setVisible(e.spr.visible && e.spr.alpha > 0.05);
    }
  },

  _enemyCloud(e) {
    return e._cloud || (e._cloud = Forge.Cloud.fromTexture(this, e.def.tex, Forge.FXN.kill));
  },

  // ── furies 远程弹丸：飞向玩家所在方向的直线弹，命中/出界即销毁 ──
  _spawnProjectile(x, y, dir, speed, dmg) {
    const spr = this.add.ellipse(x, y, 12, 12, 0x1a0f08, 0.92)
      .setStrokeStyle(2, 0x3a2418, 0.8).setDepth(Forge.C.DEPTH.FX);
    this.projectiles.push({ x, y, dir, speed, dmg, spr });
  },

  _updateProjectiles(dms) {
    const dt = dms / 1000, C = Forge.C, P = this.P;
    for (const pr of this.projectiles) {
      pr.x += pr.dir * pr.speed * dt;
      pr.spr.setX(pr.x);
      if (!this.ended && P.invuln <= 0 && (P.state === 'free' || P.state === 'hammer') &&
          Math.abs(pr.x - P.x) < 30 && Math.abs(pr.y - this._pY()) < 60) {
        this._playerHit(pr.dmg, pr.x);
        pr.dead = true;
      } else if (pr.x < C.X_MIN - 30 || pr.x > C.X_MAX + 30) pr.dead = true;
    }
    this.projectiles = this.projectiles.filter((pr) => {
      if (pr.dead) pr.spr.destroy();
      return !pr.dead;
    });
  },

  // ── icesoul 死亡地带：持续降速圈，淡出的地面装饰 + 玩家移动速度检测（见 player.js _updatePlayer） ──
  _spawnSlowZone(x, y, r, dur, factor) {
    const deco = this.add.ellipse(x, Forge.C.FEET_Y - 6, r * 2, r * 0.6, 0x3a6ea8, 0.16)
      .setStrokeStyle(2, 0x3a6ea8, 0.35).setDepth(Forge.C.DEPTH.FOG);
    this.slowZones.push({ x, r, factor, deco });
    this.tweens.add({
      targets: deco, alpha: 0, duration: dur, ease: 'Sine.easeIn',
      onComplete: () => {
        deco.destroy();
        this.slowZones = this.slowZones.filter((z) => z.deco !== deco);
      },
    });
  },

  // ── 普通命中：局部迸溅 + 顿帧 + 击退 + 闪烁（不整体消散） ──
  // weapon：命中来源（'spear'/'hammer'/'sickle'），给 superArmor 敌人判断"是否被打断预备帧"用
  _hitEnemy(e, dmg, knock, weapon) {
    if (e.dead || e.spr.alpha < 1) return;   // 入场凝聚中不可击（否则闪烁 yoyo 会把 alpha 打回 0 → 永久隐形死锁）
    // 超甲：预备帧中只有锤能打断，其余武器只扣血不打断
    if (e.def.superArmor && e.state === 'tele' && weapon === 'hammer') {
      e.state = 'walk'; e.atkCd = (e.def.swipe && e.def.swipe.cd) || 1500;
    }
    e.hp -= dmg;
    const flip = e.spr.flipX ? -1 : 1;
    Forge.FX.burst({
      cloud: this._enemyCloud(e), x: e.x, y: e.y, scale: e.def.scale, flip,
      n: Forge.FXN.burst, dirX: Math.sign(knock) || 1,
    });
    this._hitstop(40);
    window.GameAudio && GameAudio.play('tick');
    if (!e.def.boss) e.x = Phaser.Math.Clamp(e.x + knock, Forge.C.X_MIN, Forge.C.X_MAX);
    else e.x = Phaser.Math.Clamp(e.x + knock * 0.25, Forge.C.X_MIN, Forge.C.X_MAX);
    this.tweens.add({ targets: e.spr, alpha: 0.4, duration: 70, yoyo: true,
      onComplete: () => { if (!e.dead) e.spr.setAlpha(1); } });
    if (e.hp <= 0) this._killEnemy(e);
  },

  // 击杀微慢放：80ms 内 timeScale 0.3，把"全身消散"这档最高反馈看清（真实时间计时，不受 timeScale 自身影响）
  _killSlowmo() {
    const gen = (this._slowGen = (this._slowGen || 0) + 1);
    this.time.timeScale = 0.3; this.tweens.timeScale = 0.3;
    setTimeout(() => {
      if (this._slowGen === gen) { this.time.timeScale = 1; this.tweens.timeScale = 1; }
    }, 80);
  },

  // ── 死亡：可吸收 → 金尘归体得魄；否则黑雾消散 ──
  _killEnemy(e) {
    e.dead = true;
    this.kills++;
    this._killSlowmo();
    const flip = e.spr.flipX ? -1 : 1;
    e.spr.setVisible(false); e.shadow.setVisible(false);
    const cloud = this._enemyCloud(e);
    if (e.def.absorb) {
      Forge.FX.absorb({
        cloud, x: e.x, y: e.y, scale: e.def.scale, flip,
        targetFn: () => ({ x: this.P.x, y: this._pY() - 70 }),
        onDone: () => {
          if (this.ended) return;
          this.P.essence++;
          this.P.pendingForm = e.type;   // 最近一次吸收的敌形，E 化形时读这个
          this._updateScore();
          this._toast(e.type === 'furies' ? '吸收魂魄 ✦ 按 E 化身女妖投掷' : '吸收恶鬼之魄 ✦ 按 E 化形');
          window.GameAudio && GameAudio.play('unlock');
        },
      });
    } else {
      Forge.FX.dissolve({ cloud, x: e.x, y: e.y, scale: e.def.scale, flip, dur: e.def.boss ? 1400 : 850, n: e.def.boss ? 700 : Forge.FXN.kill });
      if (e.def.boss) this.cameras.main.shake(240, 0.01);
      if (e.def.leavesSlowZone) {
        const Z = e.def.leavesSlowZone;
        this._spawnSlowZone(e.x, e.y, Z.r, Z.dur, Z.factor);
      }
    }
    this.time.delayedCall(50, () => { e.spr.destroy(); e.shadow.destroy(); });
    this.enemies = this.enemies.filter(o => o !== e);
    this._checkWave();
  },
});
