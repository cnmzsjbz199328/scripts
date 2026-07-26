/* BladeTrinity — 前景物理系统 (Foreground Physics Field)
 *
 * 功能描述:
 * 1. 在游戏前景层（depth: 999）放置 10 片固定散落在地面台阶上的真实树叶床。
 * 2. 当角色出招、挥砍或发射剑气时，产生高压空气冲击与物理冲量，掀起附近落叶。
 * 3. 树叶在空中展现极其轻盈的飘舞浮力、正弦摇曳 (Fluttering) 与 3D 轴向翻转。
 * 4. 树叶受空气冲击后，不可逆地沿 9 帧渐变（Frame 0 完整 -> Frame 8 完全消散）遭受边缘风化磨损，无多余火花干扰。
 * 5. 当左右两股相反剑气相撞时，触发水波/声波式的干涉碰撞 (Wave Interference Clash)，产生垂直向上的爆裂气旋。
 */

Object.assign(BladeTrinityScene.prototype, {

  // ⚠️ 风化序列【不是 0..8 连号】。object-anim 切出来的 27 张里，maple_3 / oak_3 是
  //    空帧（192×192 全透明，文件仅 344~374 字节，肉眼即"叶子凭空消失一档又回来"）。
  //    ginkgo_8 也是空的——那一档本就是"吹散殆尽"，直接当销毁处理。
  //    所以每种叶子走自己的有效帧表，序列末尾 = 销毁，不再按数字自增。
  _leafFrames(species) {
    return {
      maple: [0, 1, 2, 4, 5, 6, 7, 8],
      oak: [0, 1, 2, 4, 5, 6, 7, 8],
      ginkgo: [0, 1, 2, 3, 4, 5, 6, 7],
    }[species] || [0];
  },

  _initForegroundPhysics() {
    this.fgLeaves = [];
    this.fgShockwaves = [];
    this.fgCollisionEffects = [];

    this.fgConfig = {
      // 重力压得很小 + 下落钳在 fallCap：树叶的真实运动就是"很快到达很低的
      // 终末速度然后匀速飘落"，不是自由落体。gravity 调大反而会压过气流
      // （实测 0.16 时稳态 vy 仍为正，叶子一片都起不来）。
      gravity: 0.05,
      fallCap: 2.2,
      airDrag: 0.985,
      // 气流参数（相对速度模型，见 _gustLeaves）。gustVy 就是叶子上升速度的
      // 硬上限：叶速追上风速后受力归零，所以"最高能飘多高"由这两个数直接决定，
      // 不会再被连续帧累加放大。ceilY = 上升软天花板（角色腰线附近）。
      gustVx: 4.0,
      gustVy: 5.5,
      gustK: 0.30,
      ceilY: 380,
      // 落叶床铺在【画布最底】的前景暗木带上（FLOOR_Y 476 ~ GAME_H 540 那一条），
      // 不是台阶脊线。铺在脊线上会跟角色脚底同高，读作"站在叶子里"；铺到底部
      // 才是"镜头前最近的一层"，和背景图自带的花瓣同一带。
      groundY: BT.GAME_H - 28,
      auraForce: 5,
      leafCount: 14,
      respawnMs: 2600
    };

    const total = this.fgConfig.leafCount;
    const padding = 60;
    const segment = (BT.GAME_W - padding * 2) / Math.max(1, total - 1);

    for (let i = 0; i < total; i++) {
      const gx = padding + i * segment + (Math.random() - 0.5) * 40;
      this.fgLeaves.push(this._spawnLeaf(i, gx));
    }
  },

  _spawnLeaf(index, gx) {
    const speciesList = ['maple', 'oak', 'ginkgo'];
    const species = speciesList[Math.floor(Math.random() * speciesList.length)];
    const groundOffset = (Math.random() - 0.5) * 26;
    const gy = this.fgConfig.groundY + groundOffset;

    // 层级 999 压在最前景木板（depth 20）与所有特效之上
    const sprite = this.add.image(gx, gy, `skill_${species}_${this._leafFrames(species)[0]}`)
      .setDepth(999)
      .setScale(0.18);

    return {
      index, species, sprite,
      x: gx, y: gy,
      vx: 0, vy: 0,
      angle: (Math.random() - 0.5) * Math.PI * 0.8,
      vRot: 0, flipAngle: 0, vFlip: 0,
      onGround: true,
      groundOffset,
      mass: 0.8 + Math.random() * 0.4,
      flutterPhase: Math.random() * 100,
      stageIdx: 0,
      erodeUntil: 0,
      isDestroyed: false,
      respawnAt: 0
    };
  },

  // 按场景调落叶密度（fight.js _showStage 调用）。落叶是室外景的元素，
  // 室内道场只留几片被风卷进来的；隐藏的叶子照样跑物理，只是不渲染，
  // 换场切回来立刻就在（比销毁重建省事，也不会打断正在飞的那几片）。
  _setLeafDensity(frac) {
    if (!this.fgLeaves) return;
    const keep = Math.max(1, Math.round(this.fgLeaves.length * Phaser.Math.Clamp(frac, 0, 1)));
    this.fgLeaves.forEach((leaf, i) => {
      leaf.hidden = i >= keep;
      if (leaf.hidden) leaf.sprite.setVisible(false);
      else if (!leaf.isDestroyed) leaf.sprite.setVisible(true);
    });
  },

  // 触发物理剑气推力冲击场
  _emitForegroundShockwave(x, y, vx, vy, power, color) {
    if (!this.fgShockwaves) this.fgShockwaves = [];
    const dir = vx >= 0 ? 1 : -1;
    this.fgShockwaves.push({
      x, y, vx, vy,
      radius: 65,
      arcAngle: Math.PI * 0.75,
      direction: dir,
      color: color || (dir > 0 ? '#38bdf8' : '#f43f5e'),
      life: 1.0,
      maxLife: 60,
      age: 0,
      power: power || this.fgConfig.auraForce,
      moveAngle: Math.atan2(vy, vx),
      graphics: this.add.graphics().setDepth(998)
    });
  },

  _updateForegroundPhysics(time, delta) {
    if (!this.fgLeaves) return;

    // 帧归一系数：全套落叶物理按 60fps 为基准，掉帧时钳到 2.5 帧以内，
    // 免得一次长 delta 把叶子瞬移一大段（见 game_runs 里 tween 隧穿那类坑）。
    const dtf = Math.min(2.5, Math.max(0.2, delta / 16.667));

    // 1. 更新与碰撞检测剑气波形
    this._updateForegroundShockwaves(dtf);

    // 2. 飞行剑气/飞刀的贴地气流（qiList 里的弹丸每帧刮一次）
    this._applyQiWind(dtf);

    // 3. 更新树叶物理粒子
    this.fgLeaves.forEach(leaf => {
      if (leaf.isDestroyed) {
        if (leaf.respawnAt && time >= leaf.respawnAt) {
          leaf.sprite.destroy();
          const fresh = this._spawnLeaf(leaf.index, 60 + Math.random() * (BT.GAME_W - 120));
          fresh.hidden = leaf.hidden;                       // 复活也要守当前场景的密度
          if (fresh.hidden) fresh.sprite.setVisible(false);
          this.fgLeaves[this.fgLeaves.indexOf(leaf)] = fresh;
        }
        return;
      }

      if (!leaf.onGround) {
        const C = this.fgConfig;
        leaf.vy += C.gravity * leaf.mass * dtf;
        leaf.flutterPhase += 0.035 * dtf;
        leaf.vx += Math.sin(leaf.flutterPhase) * 0.22 * dtf;

        leaf.vx *= Math.pow(C.airDrag, dtf);
        leaf.vy *= Math.pow(C.airDrag, dtf);

        // 两侧都钳：只钳下落不钳上升，正是叶子被吹出画布顶的直接原因
        leaf.vy = Phaser.Math.Clamp(leaf.vy, -C.gustVy, C.fallCap);
        leaf.vx = Phaser.Math.Clamp(leaf.vx, -C.gustVx * 1.3, C.gustVx * 1.3);
        // 上升硬天花板：贴到 ceilY 就把上冲吃掉，交给重力接管
        if (leaf.y < C.ceilY && leaf.vy < 0) leaf.vy *= 0.72;

        leaf.x += leaf.vx * dtf;
        leaf.y += leaf.vy * dtf;

        leaf.angle += (leaf.vRot + Math.sin(leaf.flutterPhase) * 0.015) * dtf;
        leaf.flipAngle += leaf.vFlip * dtf;

        leaf.vRot *= Math.pow(0.96, dtf);
        leaf.vFlip *= Math.pow(0.95, dtf);

        // 边界限制
        const margin = 25;
        if (leaf.x < margin) {
          leaf.x = margin;
          leaf.vx = Math.abs(leaf.vx) * 0.4;
        }
        if (leaf.x > BT.GAME_W - margin) {
          leaf.x = BT.GAME_W - margin;
          leaf.vx = -Math.abs(leaf.vx) * 0.4;
        }

        // 着地平铺判断
        const targetGroundY = this.fgConfig.groundY + leaf.groundOffset;
        if (leaf.y >= targetGroundY) {
          leaf.y = targetGroundY;
          leaf.onGround = true;
          leaf.vy = 0;
          leaf.vx = 0;
          leaf.vRot = 0;
          leaf.vFlip = 0;
          leaf.flipAngle = 0;
        }
      } else {
        leaf.vx = 0;
        leaf.vy = 0;
      }

      // 同步 Phaser Sprite 渲染
      const sp = leaf.sprite;
      sp.setPosition(leaf.x, leaf.y);
      sp.setRotation(leaf.angle);
      const flipScale = leaf.onGround ? 1.0 : Math.cos(leaf.flipAngle);
      sp.setScale((0.18 + leaf.mass * 0.02), (0.18 + leaf.mass * 0.02) * Math.max(0.15, Math.abs(flipScale)));
    });
  },

  // 掠过式气流：给定气源 (x,y) 与飞行方向，卷起【下方】落叶。
  //
  // ⚠️ 纵向跨度是这套系统能不能被看见的关键。实测：剑气弹丸在 y≈216~318 飞、
  //    近战冲击波起于 y≈220，而落叶床在 y≈512 —— 中间隔着 200~300px。
  //    原先用"以气源为心的圆环半径"判定（最大 outer≈210），够不着落叶床，
  //    于是整场打下来叶子一片不动。改成"头顶掠过 → 下方卷风"，纵向 reach 覆盖
  //    到画布底，强度随高度平方衰减（远处只是轻轻抖一下，近处才真被掀起来）。
  //
  // ⚠️⚠️ 这里【不能】用 _applyLeafImpulse。冲量是"挨一下加一次速度"，而气流是
  //    每帧都在刮：剑气横向窗口 ±150px，一片叶子会在掠过的几十帧里连续吃力，
  //    vy 一路累加 —— 等于给叶子挂了推进器，实测能冲到 vy=12.2px/帧、飞出画布顶
  //    （y=-14）。且不带 delta 时帧率越高吹得越猛。
  //    改用【相对速度模型】：力 ∝ (风速 − 叶速)，叶速追上风速后受力归零，
  //    速度天然自限在 gustVx/gustVy，连续帧只会让它更快贴近风速，不会超上去。
  _gustLeaves(x, y, dir, strength, windW, windH, dtf) {
    if (!this.fgLeaves) return;
    const C = this.fgConfig;
    for (const leaf of this.fgLeaves) {
      if (leaf.isDestroyed) continue;
      const dx = leaf.x - x;
      const dy = leaf.y - y;
      if (Math.abs(dx) > windW || dy < -80 || dy > windH) continue;

      // 纵向【线性】衰减，不要平方：气源与叶床固定隔着 ~260px，平方项会把
      // 那个距离上的强度压到 0.05 量级，叶子连离地阈值都过不去（实测一片不动）。
      const fh = 1 - Math.abs(dx) / windW;
      const fv = 1 - Math.max(0, dy) / windH;
      const fall = fh * fv * strength;
      if (fall <= 0.04) continue;

      // 目标风速；越接近上升软天花板，上卷分量越弱（到 ceilY 归零）
      const headroom = Phaser.Math.Clamp((leaf.y - C.ceilY) / 120, 0, 1);
      const windVx = dir * C.gustVx * fall;
      const windVy = -C.gustVy * fall * headroom;

      const k = Math.min(1, C.gustK * dtf / leaf.mass);
      leaf.vx += (windVx - leaf.vx) * k;
      leaf.vy += (windVy - leaf.vy) * k;

      if (fall > 0.06) leaf.onGround = false;
      if (leaf.vRot === 0) leaf.vRot = (Math.random() - 0.5) * 0.05;
      if (leaf.vFlip === 0) leaf.vFlip = (Math.random() - 0.5) * 0.05;
      this._erodeLeaf(leaf, fall);
    }
  },

  // 飞行剑气/飞刀每帧刮一次贴地气流。原来只有近战 _swordArc 发一次冲击波，
  // 飞行中的剑气一路飞过去叶子纹丝不动 —— 这条补上"剑气过境，落叶随之翻卷"。
  _applyQiWind(dtf) {
    const list = this.qiList;
    if (!list || !list.length) return;
    for (const q of list) {
      const strength = q.knife ? 0.7 : (0.55 + (q.frac || 1) * 0.6);
      this._gustLeaves(q.x, q.y, q.dir, strength, 150, 460, dtf);
    }
  },

  // 一次性冲量（只给波形干涉那种"爆一下"的场景用；持续气流走 _gustLeaves）
  _applyLeafImpulse(leaf, fx, fy, torque) {
    if (leaf.isDestroyed) return;
    const C = this.fgConfig;

    leaf.vx += fx / leaf.mass;
    leaf.vy += fy / leaf.mass;
    // 冲量同样受上升上限约束，否则干涉气旋会把叶子一发顶出画面
    const riseCap = C.gustVy;
    if (leaf.vy < -riseCap) leaf.vy = -riseCap;
    leaf.vRot = (Math.random() - 0.5) * 0.04 + (torque || 0) * 0.2;
    leaf.vFlip = (Math.random() - 0.5) * 0.05;

    const forceMag = Math.hypot(fx, fy);
    if (forceMag > 0.2) leaf.onGround = false;
    this._erodeLeaf(leaf, forceMag);
  },

  // 渐进式风化：走本树种的有效帧表，序列末尾 = 吹散销毁并排队复活。
  // 冷却是必需的——气流每帧都刮，没冷却时一发剑气就能把整床叶子从完好直接
  // 烧到消散，"渐进"完全看不见（一局三场也会把落叶床刮空）。
  _erodeLeaf(leaf, forceMag) {
    if (forceMag <= 0.6 || this.time.now < leaf.erodeUntil || Math.random() >= 0.08) return;
    leaf.erodeUntil = this.time.now + 520;
    const frames = this._leafFrames(leaf.species);
    leaf.stageIdx++;
    if (leaf.stageIdx < frames.length) {
      leaf.sprite.setTexture(`skill_${leaf.species}_${frames[leaf.stageIdx]}`);
    } else {
      leaf.isDestroyed = true;
      leaf.sprite.setVisible(false);
      leaf.respawnAt = this.time.now + this.fgConfig.respawnMs;
    }
  },

  _updateForegroundShockwaves(dtf) {
    if (!this.fgShockwaves) return;
    dtf = dtf || 1;

    for (let i = this.fgShockwaves.length - 1; i >= 0; i--) {
      const sw = this.fgShockwaves[i];
      sw.x += sw.vx * dtf;
      sw.y += sw.vy * dtf;
      sw.age += dtf;
      sw.life = 1.0 - (sw.age / sw.maxLife);
      sw.radius += 1.1 * dtf;

      // 施加对树叶的推力。半径圆环只用来【画】月牙，够不到画布底的落叶床，
      // 所以受力统一走 _gustLeaves 的掠过式风场（见那里的纵向跨度注释）。
      this._gustLeaves(sw.x, sw.y, sw.direction, sw.power * sw.life * 0.14, 170, 460, dtf);

      // 绘制物理剑气月牙弧线
      const g = sw.graphics;
      g.clear();
      if (sw.life > 0) {
        g.setAlpha(sw.life);
        g.lineStyle(3, 0xffffff, sw.life);
        g.fillStyle(Phaser.Display.Color.HexStringToColor(sw.color).color, sw.life * 0.7);
        g.beginPath();
        g.arc(sw.x, sw.y, sw.radius, sw.moveAngle - sw.arcAngle / 2, sw.moveAngle + sw.arcAngle / 2, false);
        g.strokePath();
      }

      if (sw.life <= 0 || sw.x < -100 || sw.x > BT.GAME_W + 100) {
        g.destroy();
        this.fgShockwaves.splice(i, 1);
      }
    }

    // 双剑波形碰撞干涉
    for (let i = 0; i < this.fgShockwaves.length; i++) {
      for (let j = i + 1; j < this.fgShockwaves.length; j++) {
        const w1 = this.fgShockwaves[i];
        const w2 = this.fgShockwaves[j];
        if (w1.direction !== w2.direction) {
          const dx = w2.x - w1.x;
          const dy = w2.y - w1.y;
          const dist = Math.hypot(dx, dy);

          if (dist < (w1.radius + w2.radius) * 0.7) {
            const clashX = (w1.x + w2.x) / 2;
            const clashY = (w1.y + w2.y) / 2;

            // 干涉上升气旋
            this.fgLeaves.forEach(p => {
              if (p.isDestroyed) return;
              const pdx = p.x - clashX;
              const pdy = p.y - clashY;
              const pdist = Math.hypot(pdx, pdy);
              // 半径要够到画布底的落叶床（撞点在胸高 y≈250，叶床 y≈512）
              if (pdist < 380) {
                const power = (1 - pdist / 380) * this.fgConfig.auraForce * 1.8;
                const pushX = (pdx / (pdist || 1)) * power * 0.6;
                const pushY = -Math.abs(power * 1.8) - (Math.random() * 3);
                this._applyLeafImpulse(p, pushX, pushY, (Math.random() - 0.5) * 0.1);
              }
            });

            w1.life *= 0.3;
            w2.life *= 0.3;
          }
        }
      }
    }
  }

});
