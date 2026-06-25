/* StickmanFighter — world 系统（增补 MainScene 原型）
 * 由 game-logic.js 单体机械拆分而来；方法体逐字保留，PvP 已移除。 */
Object.assign(MainScene.prototype, {
  renderTileLayer(layerName, layerConfig) {
    const data = TILEMAP_DATA.layers[layerName];
    if (!data) return;

    const width = TILEMAP_DATA.width;
    const height = TILEMAP_DATA.height;

    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const id = data[r * width + c];
        if (id === 0) continue;

        const tileName = TILEMAP_DATA.tileIndex[id];
        if (!tileName) continue;

        const x = c * this.tileW + this.tileW / 2;
        const y = r * this.tileH + this.tileH / 2;

        const tileSprite = this.add.sprite(x, y, `tile_${tileName}`);
        tileSprite.setDisplaySize(this.tileW, this.tileH);

        let baseDepth = DEPTH.BACKGROUND;
        if (layerName === 'decor_floor') baseDepth = DEPTH.DECOR_FLOOR;
        else if (layerName === 'objects') baseDepth = DEPTH.YSORT;
        else if (layerName === 'decor_top') baseDepth = DEPTH.DECOR_TOP;

        if (layerConfig.ysort) {
          tileSprite.setDepth(baseDepth + y);
          this.ysortGroup.add(tileSprite);
        } else {
          tileSprite.setDepth(baseDepth);
        }
      }
    }
  },

  hitBarrel(barrel, source, damage) {
    if (barrel.isPrimed) return;
    barrel.isPrimed = true;

    this.spawnFloatingText(barrel.x, barrel.y - 48, 'DANGER! ⚠️', '#ef4444');

    // Rapidly flash red/white for 1 second
    let isRed = false;
    const flashTimer = this.time.addEvent({
      delay: 80,
      loop: true,
      callback: () => {
        if (!barrel.active) {
          flashTimer.destroy();
          return;
        }
        barrel.setTint(isRed ? 0xffffff : 0xff3333);
        isRed = !isRed;
      }
    });

    this.time.delayedCall(1000, () => {
      flashTimer.destroy();
      if (barrel.active) {
        this.explodeBarrel(barrel);
      }
    });
  },

  explodeBarrel(barrel) {
    const x = barrel.x;
    const y = barrel.y - 16;
    barrel.destroy();

    // Screen Shake
    this.cameras.main.shake(200, 0.025);

    // Boom Text
    this.spawnFloatingText(x, y - 40, 'BOOM! 💥', '#f97316');

    // Visual Explosion blast circle
    const blastCircle = this.add.graphics({ x: x, y: y });
    blastCircle.setDepth(DEPTH.EFFECTS);
    blastCircle.fillStyle(0xffaa00, 0.65);
    blastCircle.fillCircle(0, 0, 100);
    blastCircle.lineStyle(4, 0xff0000, 1.0);
    blastCircle.strokeCircle(0, 0, 100);

    this.tweens.add({
      targets: blastCircle,
      scaleX: 1.6,
      scaleY: 1.6,
      alpha: 0,
      duration: 350,
      onComplete: () => blastCircle.destroy()
    });

    // Check AoE Explosion damage (radius: 120 pixels)
    const blastRadius = 120;

    // Check Player 1
    if (this.player && this.player.active) {
      const dist = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y - 32);
      if (dist <= blastRadius) {
        this.hearts = Math.max(0, this.hearts - 1.0); // 1.0 heart damage
        this.updateHUDHearts();
        this.isHit = true;
        this.player.play('player_hit', true);
        const dir = this.player.x < x ? -1 : 1;
        this.player.setVelocity(dir * 420, -220);
        this.time.delayedCall(400, () => { this.isHit = false; });
        this.spawnFloatingText(this.player.x, this.player.y - 75, '-1.0 生命 🩸', '#ef4444');
      }
    }

    // Check Player 2
    if (this.isPvP && this.p2 && this.p2.active) {
      const dist = Phaser.Math.Distance.Between(x, y, this.p2.x, this.p2.y - 32);
      if (dist <= blastRadius) {
        this.p2Hearts = Math.max(0, this.p2Hearts - 1.0);
        this.updateHUDHearts();
        this.p2IsHit = true;
        this.p2.play('enemy_hit', true);
        const dir = this.p2.x < x ? -1 : 1;
        this.p2.setVelocity(dir * 420, -220);
        this.time.delayedCall(400, () => { this.p2IsHit = false; });
        this.spawnFloatingText(this.p2.x, this.p2.y - 75, '-1.0 生命 🩸', '#ef4444');
      }
    }

    // Check AI Enemies
    if (!this.isPvP) {
      this.enemies.getChildren().forEach(e => {
        if (e.isDead) return;
        const dist = Phaser.Math.Distance.Between(x, y, e.x, e.y - 32);
        if (dist <= blastRadius) {
          e.health -= 40;
          this.spawnFloatingText(e.x, e.y - 64, '-40 HP 💥', '#fbbf24');
          if (e.health <= 0) {
            this.killEnemy(e);
          } else {
            e.play('enemy_hit', true);
            e.isHitState = true;
            const dir = e.x < x ? -1 : 1;
            e.setVelocity(dir * 380, -200);
            this.time.delayedCall(400, () => { e.isHitState = false; });
          }
        }
      });
    }

    // 50% chance to drop health pack
    if (Phaser.Math.Between(1, 2) === 1) {
      const pack = this.healthPacks.create(x, y + 16, 'health_pack');
      pack.setOrigin(0.5, 1);
      pack.body.allowGravity = true;
      pack.body.setCollideWorldBounds(true);
      pack.play('pack_pulse');
      
      this.tweens.add({
        targets: pack,
        scaleX: 1.25,
        scaleY: 1.25,
        duration: 400,
        yoyo: true,
        repeat: -1
      });
    }
  },

  collectHealth(player, pack) {
    pack.destroy();
    this.hearts = Math.min(3.0, this.hearts + 1.0);
    this.updateHUDHearts();
    this.spawnFloatingText(player.x, player.y - 64, '+1 护盾 💚', '#10b981');
  },

  checkElectricShock(char, isP1, isAI = false) {
    if (!char || !char.active) return;
    if (isAI && char.isDead) return;

    const time = this.time.now;
    if (char.electricCooldown && time < char.electricCooldown) return;

    // Electric boundaries (margins 64px and 1216px)
    if (char.x < 72 || char.x > 1208) {
      char.electricCooldown = time + 2000; // 2s cooldown to prevent lock stuns

      const isLeft = char.x < 72;
      const pushDir = isLeft ? 1 : -1;

      this.spawnFloatingText(char.x, char.y - 75, '⚡ SHOCKED ⚡', '#06b6d4');

      // Stun duration set
      if (isAI) {
        char.isHitState = true;
        this.time.delayedCall(1000, () => {
          if (char.active && !char.isDead) char.isHitState = false;
        });
      } else {
        if (isP1) {
          this.playerStunnedUntil = time + 1000;
        } else {
          this.p2StunnedUntil = time + 1000;
        }
      }

      // Damage and Hit animation
      if (isAI) {
        char.health -= 15;
        this.spawnFloatingText(char.x, char.y - 60, '-15 HP ⚡', '#fbbf24');
        if (char.health <= 0) {
          this.killEnemy(char);
          return;
        } else {
          char.play('enemy_hit', true);
        }
      } else {
        if (isP1) {
          this.hearts = Math.max(0, this.hearts - 0.34); // ~10 damage
          this.isHit = true;
          char.play('player_hit', true);
          this.time.delayedCall(400, () => { this.isHit = false; });
        } else {
          this.p2Hearts = Math.max(0, this.p2Hearts - 0.34);
          this.p2IsHit = true;
          char.play('enemy_hit', true);
          this.time.delayedCall(400, () => { this.p2IsHit = false; });
        }
        this.updateHUDHearts();
      }

      // Physics Shock knockback
      char.setVelocity(pushDir * 320, -180);
      this.cameras.main.shake(100, 0.01);

      // Flickering cyan/yellow stun effect
      let isYellow = false;
      const stunFlash = this.time.addEvent({
        delay: 80,
        loop: true,
        callback: () => {
          if (!char.active) { stunFlash.destroy(); return; }
          char.setTint(isYellow ? 0x00ffff : 0xffff00);
          isYellow = !isYellow;
        }
      });

      this.time.delayedCall(600, () => {
        stunFlash.destroy();
        if (char.active) {
          if (isAI && char.isDead) return;
          if (!isAI && !isP1) char.setTint(0x00ffff); // blue for P2
          else char.clearTint();
        }
      });
    }
  },

  renderElectricWalls() {
    this.electricGraphics.clear();
    const time = this.time.now;

    const drawLine = (x) => {
      this.electricGraphics.lineStyle(3, 0x00ffff, 0.65 + Math.sin(time / 45) * 0.25);
      this.electricGraphics.beginPath();
      this.electricGraphics.moveTo(x, 0);

      const segments = 24;
      const segH = 576 / segments;
      for (let i = 1; i <= segments; i++) {
        const py = i * segH;
        const px = x + (Math.sin(time / 20 + i) * 6); // wave wiggle
        this.electricGraphics.lineTo(px, py);
      }
      this.electricGraphics.strokePath();

      // Spark graphics along boundary
      if (Phaser.Math.Between(1, 12) === 1) {
        const sparkY = Phaser.Math.Between(20, 550);
        const sparkG = this.add.graphics({ x: x, y: sparkY });
        sparkG.setDepth(DEPTH.EFFECTS);
        sparkG.lineStyle(2, 0xffffff, 1.0);
        sparkG.strokeCircle(0, 0, 5);
        this.tweens.add({
          targets: sparkG,
          scaleX: 2.2,
          scaleY: 2.2,
          alpha: 0,
          duration: 160,
          onComplete: () => sparkG.destroy()
        });
      }
    };

    drawLine(64);
    drawLine(1216);
  }

  // --- Wave Spawning & AI enemy logic ---
});
