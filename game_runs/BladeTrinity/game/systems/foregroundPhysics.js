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

  _initForegroundPhysics() {
    this.fgLeaves = [];
    this.fgShockwaves = [];
    this.fgCollisionEffects = [];

    this.fgConfig = {
      gravity: 0.08,
      airDrag: 0.99,
      groundY: BT.FLOOR_Y - 20,
      auraForce: 5,
      leafCount: 10
    };

    const speciesList = ['maple', 'oak', 'ginkgo'];
    const total = this.fgConfig.leafCount;
    const padding = 80;
    const segment = (BT.GAME_W - padding * 2) / Math.max(1, total - 1);

    for (let i = 0; i < total; i++) {
      const species = speciesList[Math.floor(Math.random() * speciesList.length)];
      const gx = padding + i * segment + (Math.random() - 0.5) * 30;
      const groundOffset = (Math.random() - 0.5) * 16;
      const gy = this.fgConfig.groundY + groundOffset;

      // 使用 Phaser 图像 Sprite，层级 999 压在最前景层
      const leafSprite = this.add.image(gx, gy, `skill_${species}_0`)
        .setDepth(999)
        .setScale(0.18 + Math.random() * 0.05);

      this.fgLeaves.push({
        index: i,
        species,
        sprite: leafSprite,
        x: gx,
        y: gy,
        vx: 0,
        vy: 0,
        angle: (Math.random() - 0.5) * Math.PI * 0.8,
        vRot: 0,
        flipAngle: 0,
        vFlip: 0,
        onGround: true,
        groundOffset,
        mass: 0.8 + Math.random() * 0.4,
        flutterPhase: Math.random() * 100,
        frameStage: 0,
        isDestroyed: false
      });
    }
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

    // 1. 更新与碰撞检测剑气波形
    this._updateForegroundShockwaves();

    // 2. 更新树叶物理粒子
    const dt = delta / 1000;
    this.fgLeaves.forEach(leaf => {
      if (leaf.isDestroyed) return;

      if (!leaf.onGround) {
        leaf.vy += this.fgConfig.gravity * leaf.mass;
        leaf.flutterPhase += 0.035;
        const flutterForce = Math.sin(leaf.flutterPhase) * 0.22;
        leaf.vx += flutterForce;

        leaf.vx *= this.fgConfig.airDrag;
        leaf.vy *= this.fgConfig.airDrag;

        if (leaf.vy > 1.8) leaf.vy = 1.8;

        leaf.x += leaf.vx;
        leaf.y += leaf.vy;

        leaf.angle += leaf.vRot + Math.sin(leaf.flutterPhase) * 0.015;
        leaf.flipAngle += leaf.vFlip;

        leaf.vRot *= 0.96;
        leaf.vFlip *= 0.95;

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

  _applyLeafImpulse(leaf, fx, fy, torque) {
    if (leaf.isDestroyed) return;

    leaf.vx += fx / leaf.mass;
    leaf.vy += fy / leaf.mass;
    leaf.vRot = (Math.random() - 0.5) * 0.04 + (torque || 0) * 0.2;
    leaf.vFlip = (Math.random() - 0.5) * 0.05;

    const forceMag = Math.hypot(fx, fy);
    if (forceMag > 0.2) {
      leaf.onGround = false;
    }

    // 渐进式 9 帧破损
    if (forceMag > 0.6 && Math.random() < 0.7) {
      if (leaf.frameStage < 8) {
        leaf.frameStage++;
        leaf.sprite.setTexture(`skill_${leaf.species}_${leaf.frameStage}`);
      } else {
        leaf.isDestroyed = true;
        leaf.sprite.setVisible(false);
      }
    }
  },

  _updateForegroundShockwaves() {
    if (!this.fgShockwaves) return;

    for (let i = this.fgShockwaves.length - 1; i >= 0; i--) {
      const sw = this.fgShockwaves[i];
      sw.x += sw.vx;
      sw.y += sw.vy;
      sw.age++;
      sw.life = 1.0 - (sw.age / sw.maxLife);
      sw.radius += 1.1;

      // 施加对树叶的推力
      const auraSpeed = Math.hypot(sw.vx, sw.vy);
      const normVx = sw.vx / auraSpeed;
      const normVy = sw.vy / auraSpeed;

      this.fgLeaves.forEach(leaf => {
        if (leaf.isDestroyed) return;
        const dx = leaf.x - sw.x;
        const dy = leaf.y - sw.y;
        const dist = Math.hypot(dx, dy);

        const innerRadius = sw.radius * 0.3;
        const outerRadius = sw.radius * 1.6;

        if (dist > innerRadius && dist < outerRadius) {
          const falloff = (1 - Math.abs(dist - sw.radius) / (outerRadius - innerRadius));
          const forceMag = sw.power * falloff * sw.life * 0.18;

          const fwdFx = normVx * forceMag * 1.1;
          const fwdFy = -Math.abs(forceMag * 1.3);

          this._applyLeafImpulse(leaf, fwdFx, fwdFy, (Math.random() - 0.5) * 0.05);
        }
      });

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
              if (pdist < 240) {
                const power = (1 - pdist / 240) * this.fgConfig.auraForce * 1.8;
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
