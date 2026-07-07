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
      skyState: 'idle', skyT: 0, skyStateT: 0,
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
        if (e.state === 'walk' && e.atkCd <= 0) {
          e.state = 'tele'; e.stateT = R.tele;
          // 投掷前摇：暗红粒子向出手点聚拢，给玩家"要扔了"的可读信号
          Forge.FX.gather({ x: e.x, y: e.y - 40, r: 48, dur: R.tele, n: Forge.FXN.gather, mix: Forge.ENEMY_MIX });
        }
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
            // 扑袭前摇：粒子向躯干收束（与 squash 缩放叠加，蓄势感）
            Forge.FX.gather({ x: e.x, y: e.y - 50, r: 54, dur: L.tele, n: Forge.FXN.gather, mix: Forge.ENEMY_MIX });
          }
        } else if (e.state === 'tele') {
          e.stateT -= dms;
          if (e.stateT <= 0) { e.state = 'lunge'; e.stateT = L.ms; e.trailT = 0; }
        } else if (e.state === 'lunge') {
          e.stateT -= dms;
          e.x += e.lungeDir * L.speed * dt;
          // 冲刺拖尾：与玩家矛突刺同款节奏（每 30ms 一小撮反向粒子），补高速位移的速度感
          e.trailT += dms;
          if (e.trailT >= 30) {
            e.trailT = 0;
            Forge.FX.burst({
              cloud: this._enemyCloud(e), x: e.x, y: e.y, scale: e.def.scale,
              flip: e.spr.flipX ? -1 : 1, n: 10, dur: 180, dirX: -e.lungeDir, mix: Forge.ENEMY_MIX,
            });
          }
          if (e.stateT <= 0) { e.state = 'walk'; e.atkCd = L.cd; }
        }

      } else if (e.def.swipe) {   // 宽幅挥砍 Boss 通用分支（minos/satan 共用，靠 def.swipe 判定而非写死 type）
        const S = e.def.swipe;
        if (e.state === 'walk') {
          e.x += dir * e.def.speed * dt;
          if (adx < S.r - 20 && e.atkCd <= 0) {
            e.state = 'tele'; e.stateT = S.tele;
            this._warnRing(e.x, C.FEET_Y - 8, S.r, S.tele);   // 粒子预警圈：标出挥砍半径，给闪避窗口
            this._morphToWeapon(e, dir, S);   // Boss 本体化形为武器——不是持械，是"变成"（与玩家变形即招式同构）
          }
        } else if (e.state === 'tele') {
          e.stateT -= dms;
          if (e.stateT <= 0) {
            e.state = 'reform'; e.stateT = 460;   // 挥砍(130ms)+重组(300ms)期间不移动不再攻击
            e.atkCd = S.cd;
            this.cameras.main.shake(110, 0.007);
            this._swingWeapon(e);   // 武器实体下扫 → 迸溅 → 整体重组回 Boss 躯体
            this._shockRing(e.x, C.FEET_Y - 8, S.r, Forge.ENEMY_MIX);
            if (Math.abs(P.x - e.x) < S.r) this._playerHit(e.def.dmg, e.x);
          }
        } else if (e.state === 'reform') {
          e.stateT -= dms;
          if (e.stateT <= 0) e.state = 'walk';
        }
        // 死亡镰刀天降：与近身挥臂独立并行的读招，锁定施放瞬间的玩家列，逼横移/雾化而非站桩硬吃
        if (e.def.sky) {
          if (e.skyState === 'idle') {
            e.skyT += dms;
            if (e.skyT >= e.def.sky.cd) {
              e.skyT = 0; e.skyState = 'tele'; e.skyStateT = e.def.sky.tele; e.skyX = P.x;
              this._warnRing(e.skyX, C.FEET_Y - 8, e.def.sky.r, e.def.sky.tele);
              window.GameAudio && GameAudio.play('tick');
            }
          } else {
            e.skyStateT -= dms;
            if (e.skyStateT <= 0) { e.skyState = 'idle'; this._bossSkyScythe(e, e.skyX); }
          }
        }
        // 周期召唤亡魂（限量，避免车轮战失控；summonMs 缺省则跳过——satan 终局不召唤，纯 1v1）
        if (e.def.summonMs) {
          e.summonT += dms;
          if (e.summonT >= e.def.summonMs) {
            e.summonT = 0;
            const adds = this.enemies.filter(o => !o.dead && o.type === 'soul').length;
            if (adds < e.def.maxAdds) {
              // 施法表现：Boss 胸口聚拢一团粒子，把"新亡魂出现"归因到 Boss 身上
              Forge.FX.gather({ x: e.x, y: e.y - e.spr.displayHeight * 0.6, r: 70, dur: 420, n: Forge.FXN.gather, mix: Forge.ENEMY_MIX });
              this._spawnEnemy('soul', e.x > Forge.W / 2 ? 100 : 860);
            }
          }
        }
      }

      e.x = Phaser.Math.Clamp(e.x, C.X_MIN - 10, C.X_MAX + 10);
      // 接触伤害（扑袭中的恶鬼也算；纯远程单位 dmg:0 不触发，避免 0 伤害的空反馈；
      // tele/reform 期间 Boss 没有"身体"——化形为武器时不产生贴身碰撞）
      if (e.def.dmg > 0 && adx < e.def.touchR && e.touchCd <= 0 && e.state !== 'tele' && e.state !== 'reform') {
        e.touchCd = 1000;
        // 攻击方也要有表现：敌人自身点云向玩家方向迸出一小片（否则接触伤害读作"走近自动掉血"）
        Forge.FX.burst({
          cloud: this._enemyCloud(e), x: e.x, y: e.y, scale: e.def.scale,
          flip: e.spr.flipX ? -1 : 1, n: Forge.FXN.touch, dur: 300, dirX: dir, mix: Forge.ENEMY_MIX,
        });
        this._playerHit(e.def.dmg, e.x);
      }
      // 动态更新敌人的行走与待机动画
      if (['furies', 'icesoul', 'fiend', 'satan'].includes(e.type)) {
        let activeAnim = `${e.type}_idle`;
        if (e.type === 'fiend' && e.state === 'lunge') {
          activeAnim = `${e.type}_walk`;   // 扑袭冲刺中高速位移，不能用静止的 idle 姿势
        } else if (e.state === 'walk') {
          let isMoving = true;
          if (e.type === 'furies') {
            const adx = Math.abs(P.x - e.x);
            const R = e.def.ranged;
            isMoving = (adx < R.keep - 20) || (adx > R.keep + 60);
          }
          activeAnim = isMoving ? `${e.type}_walk` : `${e.type}_idle`;
        }
        if (e.spr.anims.currentAnim?.key !== activeAnim) {
          e.spr.play(activeAnim, true);
        }
      }
      e.spr.setX(e.x).setFlipX(dx < 0);
      e.shadow.setX(e.x).setVisible(e.spr.visible && e.spr.alpha > 0.05);
    }
  },

  // ── Boss 天降镰刀：读招结束后于锁定列从高空凝聚+俯冲砸落，纵向窄 AOE ──
  _bossSkyScythe(e, x) {
    const S = e.def.sky, C = Forge.C;
    const wKey = Forge.Cloud.weapon(this, 'sickle');
    const wCloud = Forge.Cloud.fromTexture(this, wKey, Forge.FXN.morph);
    const topY = C.FEET_Y - 340;
    const img = this.add.image(x, topY, wKey)
      .setOrigin(0.5, 0.5).setDepth(C.DEPTH.FX).setAngle(70).setAlpha(0);
    // 凝聚：雾团在高空聚成镰刀形，成形后再俯冲砸落
    Forge.FX.morph({
      src: { cloud: wCloud, x, y: topY - 110, scale: 0.5 },
      dst: { cloud: wCloud, x, y: topY, scale: 1.3 },
      dur: 220, turb: 30, rise: 18, mix: Forge.ENEMY_MIX,
      onDone: () => {
        if (this.ended) { img.destroy(); return; }
        img.setAlpha(1);
        window.GameAudio && GameAudio.play('release');
        this.tweens.add({
          targets: img, y: C.FEET_Y, angle: 96, duration: 220, ease: 'Cubic.easeIn',
          onComplete: () => {
            img.destroy();
            this._shockRing(x, C.FEET_Y - 8, S.r, Forge.ENEMY_MIX);
            if (!this.ended && Math.abs(this.P.x - x) < S.r) this._playerHit(S.dmg, x);
            this._hitstop(80);
            this.cameras.main.shake(160, 0.01);
            window.GameAudio && GameAudio.play('splashBad');
          },
        });
      },
    });
  },

  _enemyCloud(e) {
    return e._cloud || (e._cloud = Forge.Cloud.fromTexture(this, e.def.tex, Forge.FXN.kill));
  },

  // ── Boss 化形武器：本体散作粒子化形为武器(预备帧) → 武器挥扫(落帧) → 重组回躯体。
  // 与玩家"变形即招式"完全同构——Boss 不是持械，是变成武器。全程纯视觉：
  // 判定仍是 tele 计时+半径检查，化形/挥砍不改变时长与范围；化形期间本体隐藏但 alpha=1，
  // 依然可被攻击(打武器=打 Boss)，超甲规则不变 → 可玩性(闪避窗口/打断窗口)零变化。
  // 每种武器的化形/旋扫元数据：s=缩放 ox,oy=实体图原点(旋扫轴心，镰=骨端/斧=柄底)
  // holdDx,holdHy=化形落点相对 Boss 的偏移 a0,a1=起/终摆角(乘 dir)。造型见 weapon_library_sheet 参考图 ──
  _bossWpn(e) {
    const META = {
      scythe: { s: 0.62, ox: 0.09, oy: 0.32, holdDx: 4,  holdHy: 0.62, a0: 0,   a1: 95 },
      axe:    { s: 0.75, ox: 0.5,  oy: 0.92, holdDx: 30, holdHy: 0.32, a0: -16, a1: 100 },
      sickle: { s: 0.8,  ox: 0.15, oy: 0.5,  holdDx: 10, holdHy: 0.5,  a0: 0,   a1: 95 },
    };
    const kind = (e.def.swipe && e.def.swipe.weapon) || 'sickle';
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
    // 点云锚点固定为底中(0.5,1)，实体图原点在轴心(ox,oy)，dx/dy 是两者换算
    const dx = dir * (0.5 - A.ox) * A.W * A.s, dy = (1 - A.oy) * A.H * A.s;
    e._wpnDir = dir;
    e.spr.setVisible(false);   // 影躯散作粒子——化形期间没有"身体"，但仍可被击(alpha 保持 1)
    Forge.FX.morph({
      src: { cloud: this._enemyCloud(e), x: e.x, y: e.y, scale: e.def.scale, flip: dir },
      dst: { cloud: A.cloud, x: ix + dx, y: iy + dy, scale: A.s, flip: dir },
      dur: S.tele * 0.8, turb: 30, rise: 14, n: 420, mix: Forge.ENEMY_MIX,
      onDone: () => {
        if (this.ended || e.dead || e.state !== 'tele') return;   // 已被打断/击杀：粒子散场即可
        e._wpn = this.add.image(ix, iy, A.key)
          .setOrigin(dir < 0 ? 1 - A.ox : A.ox, A.oy)   // flipX 绕帧心镜像，轴心须同步换边
          .setDepth(Forge.C.DEPTH.FX).setFlipX(dir < 0)
          .setScale(A.s).setAlpha(0.95).setAngle(dir * A.a0);
      },
    });
  },

  _swingWeapon(e) {
    const wp = e._wpn; e._wpn = null;
    const A = this._bossWpn(e), d0 = e._wpnDir || 1;
    if (!wp) return this._reformBoss(e, A, d0, null);   // 化形被打断的边缘残留：直接重聚躯体
    this.tweens.add({
      targets: wp, angle: d0 * A.a1, duration: 130, ease: 'Cubic.easeIn',
      onComplete: () => {
        // 刃口动能残留迸溅，随后武器整体重组回 Boss 躯体（与玩家锤/矛的收尾同构）
        Forge.FX.burst({
          cloud: A.cloud, x: wp.x + d0 * (0.5 - A.ox) * A.W * A.s, y: wp.y + (1 - A.oy) * A.H * A.s,
          scale: A.s, flip: d0, n: 90, dur: 380, dirX: d0, mix: Forge.ENEMY_MIX,
        });
        this._reformBoss(e, A, d0, wp);
      },
    });
  },

  // 武器 → 躯体重组：挥砍末速做 drift 惯性（follow-through），落点即 Boss 当前位置
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

  // 化形被锤打断 / Boss 被击杀时的武器善后：已成形的武器温和消散，不奖励性迸发
  _dropWeapon(e) {
    const wp = e._wpn; e._wpn = null;
    if (!wp) return;
    const A = this._bossWpn(e), d0 = e._wpnDir || 1;
    Forge.FX.dissolve({
      cloud: A.cloud, x: wp.x + d0 * (0.5 - A.ox) * A.W * A.s, y: wp.y + (1 - A.oy) * A.H * A.s,
      scale: A.s, flip: d0, n: 150, dur: 340, mix: Forge.ENEMY_MIX,
    });
    wp.destroy();
  },

  // ── 掷弹通用装配：粒子凝成的小箭矢（实体箭 + follow 粒子尾），敌我共用只差染色 ──
  // 敌方 furies 与玩家女妖形都走这里，"化形夺技后招式长一样"靠同一份实现保证
  _dartAssets() {
    if (!this._dartA) {
      const key = Forge.Cloud.weapon(this, 'spear');
      this._dartA = { key, cloud: Forge.Cloud.fromTexture(this, key, 140), W: 272, H: 150, ORY: 0.47 };
    }
    return this._dartA;
  },

  _makeDart(x, y, dir, mix) {
    const A = this._dartAssets(), s = 0.28;
    const img = this.add.image(x, y, A.key).setOrigin(0.5, A.ORY)
      .setDepth(Forge.C.DEPTH.FX).setScale(s).setFlipX(dir < 0).setAlpha(0.95);
    const fx = Forge.FX.follow({ x, y, n: Forge.FXN.proj, rad: 9, life: 260, mix });
    return {
      setPos(px, py) { img.setPosition(px, py); fx.setPos(px, py); },
      // 命中/出界：箭矢当场碎裂回粒子（武器由粒子凝成，也散回粒子）
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

  // ── furies 远程弹丸：飞向玩家所在方向的直线弹，命中/出界即碎裂消散 ──
  _spawnProjectile(x, y, dir, speed, dmg) {
    const dart = this._makeDart(x, y, dir, Forge.ENEMY_MIX);
    this.projectiles.push({ x, y, dir, speed, dmg, dart });
  },

  _updateProjectiles(dms) {
    const dt = dms / 1000, C = Forge.C, P = this.P;
    for (const pr of this.projectiles) {
      pr.x += pr.dir * pr.speed * dt;
      pr.dart.setPos(pr.x, pr.y);
      if (!this.ended && P.invuln <= 0 && (P.state === 'free' || P.state === 'hammer') &&
          Math.abs(pr.x - P.x) < 30 && Math.abs(pr.y - this._pY()) < 60) {
        this._playerHit(pr.dmg, pr.x);
        pr.dead = true;
      } else if (pr.x < C.X_MIN - 30 || pr.x > C.X_MAX + 30) pr.dead = true;
    }
    this.projectiles = this.projectiles.filter((pr) => {
      if (pr.dead) pr.dart.die();
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
      this._dropWeapon(e);        // 化到一半的武器散掉：打断有可见回报
      e.spr.setVisible(true);     // 化形被打断：影躯当场重聚
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
    this._dropWeapon(e);
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
