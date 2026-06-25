/* NeonTowerDefense — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  handlePlayerMovement() {
    let vx = 0;
    let vy = 0;
    const speed = this.isOverclocked ? 340 : 220;

    if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -speed;
    else if (this.cursors.right.isDown || this.wasd.right.isDown) vx = speed;

    if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -speed;
    else if (this.cursors.down.isDown || this.wasd.down.isDown) vy = speed;

    this.player.setVelocity(vx, vy);

    if (vx !== 0 || vy !== 0) {
      if (this.player.anims.currentAnim?.key !== 'player_walk' || !this.player.anims.isPlaying) {
        this.player.play('player_walk');
      }
      // Flip left/right (Walk frame faces right)
      if (vx < 0) this.player.setFlipX(true);
      else if (vx > 0) this.player.setFlipX(false);
    } else {
      if (this.player.anims.currentAnim?.key !== 'player_idle' && this.player.anims.currentAnim?.key !== 'player_build' && this.player.anims.currentAnim?.key !== 'player_shoot') {
        this.player.play('player_idle');
      }
    }
  },


  handleBuildingControls() {
    // Grid alignment
    const col = Math.floor(this.player.x / this.tileW);
    const row = Math.floor(this.player.y / this.tileH);

    // Press J: Build Laser Turret (Cost: 50)
    if (Phaser.Input.Keyboard.JustDown(this.keyJ)) {
      this.attemptBuild('laser_turret', 50, col, row);
    }

    // Press K: Build Plasma Turret (Cost: 80)
    if (Phaser.Input.Keyboard.JustDown(this.keyK)) {
      this.attemptBuild('plasma_turret', 80, col, row);
    }

    // Press X: Dismantle the nearest turret for a 50% crystal refund
    if (Phaser.Input.Keyboard.JustDown(this.keyX)) {
      this.attemptSellTurret();
    }
  },


  attemptSellTurret() {
    let closest = null;
    let minDist = 80;
    this.turrets.getChildren().forEach(t => {
      const d = Phaser.Math.Distance.Between(t.x, t.y, this.player.x, this.player.y);
      if (d < minDist) { minDist = d; closest = t; }
    });

    if (!closest) {
      this.spawnFloatingText(this.player.x, this.player.y - 40, '附近没有可拆除的防御塔', '#cbd5e1');
      return;
    }

    const refund = Math.floor((closest.investedCost || 50) * 0.5);
    this.score += refund;
    window.GameHUD?.setScore(this.score);
    this.spawnBurst(closest.x, closest.y, 0x38bdf8, 14, 60);
    this.spawnFloatingText(closest.x, closest.y - 40, `拆除回收 +${refund} 💎`, '#38bdf8');
    this.ysortGroup.remove(closest);
    closest.destroy();
  },


  attemptBuild(type, cost, col, row) {
    if (col < 0 || col >= this.gridW || row < 0 || row >= this.gridH) return;

    const mapConfig = this.levelMaps[this.currentLevel];
    const cellType = mapConfig.grid[row][col];

    if (cellType !== 1) {
      this.spawnFloatingText(this.player.x, this.player.y - 40, '此处无法建造 🚫', '#ef4444');
      return;
    }

    if (this.score < cost) {
      this.spawnFloatingText(this.player.x, this.player.y - 40, '能量水晶不足 🔋', '#fbbf24');
      return;
    }

    let spotOccupied = false;
    this.turrets.getChildren().forEach(t => {
      if (t.gridX === col && t.gridY === row) {
        spotOccupied = true;
      }
    });

    if (spotOccupied) {
      this.spawnFloatingText(this.player.x, this.player.y - 40, '已有防御建筑 🚫', '#ef4444');
      return;
    }

    this.score -= cost;
    window.GameHUD?.setScore(this.score);

    this.player.play('player_build', true);
    this.cameras.main.shake(100, 0.005);

    const px = col * this.tileW + this.tileW / 2;
    const py = row * this.tileH + this.tileH / 2;

    const turret = this.turrets.create(px, py, type);
    turret.setOrigin(0.5, 0.75);
    turret.gridX = col;
    turret.gridY = row;
    turret.type = type;
    turret.tier = 1;
    turret.range = type === 'laser_turret' ? 220 : 180;
    turret.damage = type === 'laser_turret' ? 7 : 12;
    turret.fireRate = type === 'laser_turret' ? 300 : 850;
    turret.lastFired = 0;
    turret.investedCost = cost; // tracked for dismantle refund
    turret.setDepth(DEPTH.YSORT + py);
    this.ysortGroup.add(turret);

    // Play base anim
    turret.play(type === 'laser_turret' ? 'anim_laser' : 'anim_plasma');

    this.spawnFloatingText(px, py - 32, `-${cost} 💎 建造成功`, '#00ff66');
  },


  handleUpgradeInteract() {
    // Press E to upgrade closest turret
    if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
      let closestTurret = null;
      let minDist = 80; // interactive distance

      this.turrets.getChildren().forEach(t => {
        const dx = t.x - this.player.x;
        const dy = t.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          closestTurret = t;
        }
      });

      if (closestTurret) {
        this.attemptUpgrade(closestTurret);
      } else {
        this.spawnFloatingText(this.player.x, this.player.y - 40, '附近没有可升级的防御塔', '#cbd5e1');
      }
    }
  },


  attemptUpgrade(t) {
    if (t.tier >= 2) {
      this.spawnFloatingText(t.x, t.y - 40, '已达到最大等级 🛡️', '#38bdf8');
      return;
    }

    // Costs: Laser T2 = 80, Plasma T2 = 120
    const cost = t.type === 'laser_turret' ? 80 : 120;
    if (this.score < cost) {
      this.spawnFloatingText(this.player.x, this.player.y - 40, `升级需要 ${cost} 💎 能量不足!`, '#fbbf24');
      return;
    }

    this.score -= cost;
    window.GameHUD?.setScore(this.score);

    t.tier = 2;
    t.investedCost = (t.investedCost || (t.type === 'laser_turret' ? 50 : 80)) + cost;

    // Upgrade Stats
    if (t.type === 'laser_turret') {
      t.range = 300;
      t.damage = 16;
      t.fireRate = 200; // faster laser overloading
      t.setTint(0x00e5ff); // Cyan tint for upgraded laser

      // Play laser upgrade burst (Effect 1)
      const burst = this.add.sprite(t.x, t.y - 10, 'upgrade_burst_laser');
      burst.setDepth(DEPTH.EFFECTS);
      burst.play('anim_upgrade_laser');
      burst.once('animationcomplete', () => burst.destroy());
      
      this.spawnFloatingText(t.x, t.y - 48, 'LASER OVERLOAD! ⚡💎', '#00e5ff');
    } else {
      t.range = 240;
      t.damage = 28;
      t.fireRate = 550; // faster plasma storm
      t.setTint(0xa78bfa); // Violet tint for upgraded plasma

      // Play plasma upgrade burst (Effect 2)
      const burst = this.add.sprite(t.x, t.y - 10, 'upgrade_burst_plasma');
      burst.setDepth(DEPTH.EFFECTS);
      burst.play('anim_upgrade_plasma');
      burst.once('animationcomplete', () => burst.destroy());

      this.spawnFloatingText(t.x, t.y - 48, 'PLASMA STORM! 🌀💎', '#a78bfa');
    }

    // Play Range Indicator Ring (Effect 3)
    const rangeRing = this.add.sprite(t.x, t.y - 12, 'range_ring');
    rangeRing.setDepth(DEPTH.EFFECTS);
    // scale to match custom range
    rangeRing.setDisplaySize(t.range * 2, t.range * 2);
    rangeRing.play('anim_range_ring');
    this.tweens.add({
      targets: rangeRing,
      alpha: 0,
      delay: 1000,
      duration: 500,
      onComplete: () => rangeRing.destroy()
    });

    this.cameras.main.shake(150, 0.008);
  },


  handlePowerups() {
    // 1. Press SPACE: Activate Overclock speed boost (Cost: 50) (Effect 4)
    if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
      const cost = 50;
      if (this.score < cost) {
        this.spawnFloatingText(this.player.x, this.player.y - 40, `超频需要 ${cost} 💎 能量不足!`, '#fbbf24');
        return;
      }

      if (this.isOverclocked) {
        this.spawnFloatingText(this.player.x, this.player.y - 40, '系统已处于超频状态! ⚡', '#fbbf24');
        return;
      }

      this.score -= cost;
      window.GameHUD?.setScore(this.score);

      this.isOverclocked = true;
      this.overclockUntil = this.time.now + 6000; // 6s duration

      this.spawnFloatingText(this.player.x, this.player.y - 64, 'SYSTEM OVERCLOCK! ⚡🔥', '#fbbf24');
      this.cameras.main.shake(200, 0.012);

      // Create Gear VFX sprites floating over all turrets
      this.gearSprites = [];
      this.turrets.getChildren().forEach(t => {
        const gear = this.add.sprite(t.x, t.y - 42, 'firerate_gear');
        gear.setDepth(DEPTH.EFFECTS);
        gear.setDisplaySize(32, 32);
        gear.play('anim_gear');
        this.gearSprites.push(gear);
      });
    }

    // Handle Overclock timer cleanup
    if (this.isOverclocked && this.time.now > this.overclockUntil) {
      this.isOverclocked = false;
      this.spawnFloatingText(this.player.x, this.player.y - 64, '超频状态结束', '#cbd5e1');
      if (this.gearSprites) {
        this.gearSprites.forEach(g => g.destroy());
        this.gearSprites = [];
      }
    }

    // 2. Press Z: Chain Lightning Arc Attack (Cost: 15) (Effect 7)
    if (Phaser.Input.Keyboard.JustDown(this.keyZ)) {
      const cost = 15;
      if (this.score < cost) {
        this.spawnFloatingText(this.player.x, this.player.y - 40, `闪电需要 ${cost} 💎 能量不足!`, '#fbbf24');
        return;
      }

      // Find closest virus to player
      let target = null;
      let minDist = 300;

      this.enemies.getChildren().forEach(e => {
        if (e.isDead) return;
        const dx = e.x - this.player.x;
        const dy = e.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          target = e;
        }
      });

      if (target) {
        this.score -= cost;
        window.GameHUD?.setScore(this.score);
        this.player.play('player_shoot', true);
        this.triggerChainLightning(target);
      } else {
        this.spawnFloatingText(this.player.x, this.player.y - 40, '范围无敌方程序 🚫', '#cbd5e1');
      }
    }
  },


  triggerChainLightning(firstTarget) {
    this.spawnFloatingText(this.player.x, this.player.y - 64, 'CHAIN LIGHTNING! ⚡', '#f59e0b');
    
    // Jump list
    const targets = [firstTarget];
    let current = firstTarget;

    // Search for 2 more jumps
    for (let j = 0; j < 2; j++) {
      let nextTarget = null;
      let minDist = 200;

      this.enemies.getChildren().forEach(e => {
        if (e.isDead || targets.includes(e)) return;
        const dx = e.x - current.x;
        const dy = e.y - current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          nextTarget = e;
        }
      });

      if (nextTarget) {
        targets.push(nextTarget);
        current = nextTarget;
      } else {
        break;
      }
    }

    // Render lightning bolt overlays connecting jumps
    let startPoint = { x: this.player.x, y: this.player.y - 16 };
    targets.forEach((t, idx) => {
      const bolt = this.add.sprite(startPoint.x, startPoint.y, 'chain_lightning');
      bolt.setDepth(DEPTH.EFFECTS);
      bolt.setOrigin(0, 0.5);
      
      // Calculate angle and scale to reach target
      const dx = t.x - startPoint.x;
      const dy = (t.y - 16) - startPoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      bolt.setRotation(angle);
      bolt.setDisplaySize(dist, 16);
      bolt.play('anim_lightning');

      // Lightning damage
      t.health -= 20; // deals 20 chain lightning damage
      this.spawnSparks(t.x, t.y - 15, 0xfbbf24);

      if (t.health <= 0) {
        this.time.delayedCall(150 * idx, () => this.killEnemy(t));
      } else {
        t.play('virus_hit', true);
      }

      // Chain delay destroy
      this.time.delayedCall(300, () => {
        bolt.destroy();
      });

      startPoint = { x: t.x, y: t.y - 16 };
    });

    this.cameras.main.shake(150, 0.015);
  }
});
