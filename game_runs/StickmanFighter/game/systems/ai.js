/* StickmanFighter — ai 系统（增补 MainScene 原型）
 * 由 game-logic.js 单体机械拆分而来；方法体逐字保留，PvP 已移除。 */
Object.assign(MainScene.prototype, {
  handleAISpawning() {
    if (this.enemies.countActive() === 0) {
      if (this.enemiesSpawned < this.maxWaveEnemies) {
        this.enemiesSpawned++;
        this.spawnEnemy(false);
      } else if (!this.bossSpawned) {
        this.bossSpawned = true;
        this.showFightBanner([
          '⚠ 暗影首领降临！',
          '"小红……你的坚持让我刮目相看。"',
          '"但这里是几何次元的终点——你的故事，到此结束！"',
          '全力以赴！击败首领，拯救几何次元！'
        ], 3000);
        this.time.delayedCall(500, () => {
          this.spawnEnemy(true);
          window.GameHUD?.setObjective("警告：暗影首领降临！全力击败它！");
        });
      }
    }
  },

  spawnEnemy(isBoss) {
    const spawnX = isBoss
      ? (this.player.x < 640 ? Phaser.Math.Between(950, 1150) : Phaser.Math.Between(80, 280))
      : Phaser.Math.Between(850, 1100);
    const enemy = this.enemies.create(spawnX, 480, 'enemy_stickman');
    enemy.setOrigin(0.5, 1);
    enemy.setCollideWorldBounds(true);
    enemy.body.setSize(32, 70);
    enemy.body.setOffset(32, 26);
    enemy.play('enemy_idle');

    // Attributes
    enemy.health = isBoss ? 150 : 50;
    enemy.maxHealth = enemy.health;
    enemy.isBoss = isBoss;
    enemy.isDead = false;
    enemy.isHitState = false;
    enemy.isAttacking = false;
    enemy.nextAttackTime = 0;

    // AI behavior variables
    enemy.personalityBias = Math.random();
    enemy.aiState = 'approach';
    enemy.aiBlockUntil = 0;
    enemy.aiRetreatUntil = 0;
    enemy.aiRetreatDir = 0;
    enemy.aiDashAttackUntil = 0;
    enemy.aiDashAttackCooldown = 0;
    enemy.aiLastBlockAttempt = 0;

    // Scale boss
    if (isBoss) {
      enemy.setDisplaySize(130, 130);
      enemy.body.setSize(44, 95);
      enemy.body.setOffset(26, 15);
      enemy.setTint(0x7c3aed); // Purple boss tint
    } else {
      enemy.setDisplaySize(96, 96);
    }

    // Health bar graphics
    enemy.healthBarGraphics = this.add.graphics();
    enemy.healthBarGraphics.setDepth(DEPTH.EFFECTS);
    this.updateEnemyHealthBar(enemy);
  },

  updateEnemyHealthBar(enemy) {
    if (enemy.isDead) return;
    
    enemy.healthBarGraphics.clear();
    
    const barW = enemy.isBoss ? 80 : 50;
    const barH = 6;
    const barX = enemy.x - barW / 2;
    const barY = enemy.y - (enemy.isBoss ? 135 : 100);

    // Draw background (Black)
    enemy.healthBarGraphics.fillStyle(0x000000, 0.7);
    enemy.healthBarGraphics.fillRect(barX, barY, barW, barH);

    // Draw health (Red/Purple)
    const hpPct = Math.max(0, enemy.health / enemy.maxHealth);
    const fillW = barW * hpPct;
    const color = enemy.isBoss ? 0xa78bfa : 0xef4444;
    enemy.healthBarGraphics.fillStyle(color, 1.0);
    enemy.healthBarGraphics.fillRect(barX, barY, fillW, barH);
  },

  handleAIBehavior() {
    this.enemies.getChildren().forEach(e => {
      if (e.isDead || e.isHitState) return;

      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
      const isPlayerFacingLeft = this.player.x < e.x;

      e.setFlipX(isPlayerFacingLeft);

      if (e.isAttacking) return;

      // A. Check Block State
      if (e.aiState === 'block') {
        if (this.time.now < e.aiBlockUntil) {
          e.setVelocityX(0);
          e.play('enemy_block', true);
          return;
        } else {
          e.aiState = 'approach';
        }
      }

      // B. Check Retreat State
      if (e.aiState === 'retreat') {
        if (this.time.now < e.aiRetreatUntil) {
          e.setVelocityX(e.aiRetreatDir * 100);
          e.play('enemy_walk', true);
          return;
        } else {
          e.aiState = 'approach';
        }
      }

      // C. Check Boss Dash Attack State
      if (e.aiState === 'dash_attack') {
        if (this.time.now < e.aiDashAttackUntil) {
          e.setVelocityX(e.aiRetreatDir * 300);
          e.play('enemy_walk', true);
          return;
        } else {
          // Unleash the Dash Attack!
          e.isAttacking = true;
          e.aiState = 'approach';
          e.play('enemy_kick', true);
          this.time.delayedCall(250, () => {
            if (e.isDead) return;
            const currentDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
            if (currentDist <= 95) {
              this.damagePlayerFromAI(30);
            }
          });
          e.once('animationcomplete', () => {
            e.isAttacking = false;
            e.nextAttackTime = this.time.now + this.getAIAttackCooldown(e);
          });
          return;
        }
      }

      // 1. Determine if AI should block (20% default, Cautious personality has 35%)
      const isLowHealth = e.health < e.maxHealth * 0.4;
      const isPlayerAttacking = this.isAttacking;
      let blockChance = 0.2;
      if (e.personalityBias > 0.7) {
        blockChance = 0.35; // Cautious type
      }

      if ((isLowHealth || isPlayerAttacking) && this.time.now > e.aiLastBlockAttempt + 500 && Math.random() < blockChance) {
        e.aiLastBlockAttempt = this.time.now;
        e.aiState = 'block';
        e.aiBlockUntil = this.time.now + Phaser.Math.Between(600, 900);
        e.setVelocityX(0);
        e.play('enemy_block', true);
        return;
      }

      // 2. Boss Special Dash Attack (HP < 50%, dist > 150px)
      if (e.isBoss && e.health < e.maxHealth * 0.5 && dist > 150 && this.time.now > e.aiDashAttackCooldown) {
        if (Math.random() < 0.3) {
          e.aiState = 'dash_attack';
          e.aiDashAttackUntil = this.time.now + 200;
          e.aiRetreatDir = this.player.x < e.x ? -1 : 1; // move towards player
          e.aiDashAttackCooldown = this.time.now + 3000; // 3s cooldown
          e.setVelocityX(e.aiRetreatDir * 300);
          e.play('enemy_walk', true);
          return;
        }
      }

      // 3. Standard Approach / Attack
      const attackRange = e.isBoss ? 85 : 65;

      if (dist <= attackRange) {
        e.setVelocityX(0);
        const time = this.time.now;
        if (time > e.nextAttackTime) {
          e.isAttacking = true;
          const isKick = Phaser.Math.Between(0, 1) === 1;
          e.play(isKick ? 'enemy_kick' : 'enemy_punch', true);

          this.time.delayedCall(isKick ? 250 : 200, () => {
            if (e.isDead) return;
            const currentDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
            if (currentDist <= attackRange) {
              this.damagePlayerFromAI(isKick ? 20 : 10);
            }
          });

          e.once('animationcomplete', () => {
            e.isAttacking = false;
            
            // 50% chance to retreat after attacking
            if (Math.random() < 0.5) {
              e.aiState = 'retreat';
              e.aiRetreatUntil = this.time.now + 500;
              e.aiRetreatDir = this.player.x < e.x ? 1 : -1; // move away from player
              e.setVelocityX(e.aiRetreatDir * 100);
              e.play('enemy_walk', true);
            } else {
              e.nextAttackTime = this.time.now + this.getAIAttackCooldown(e);
            }
          });
        } else {
          e.play('enemy_idle', true);
        }
      } else {
        const speed = e.isBoss ? 110 : 80;
        const dir = this.player.x < e.x ? -1 : 1;
        e.setVelocityX(dir * speed);
        e.play('enemy_walk', true);
      }
    });
  },

  getAIAttackCooldown(enemy) {
    const hpPct = enemy.health / enemy.maxHealth;
    let baseCooldown = 0;
    if (hpPct >= 0.8) {
      baseCooldown = Phaser.Math.Between(1200, 2000);
    } else if (hpPct >= 0.4) {
      baseCooldown = Phaser.Math.Between(800, 1400);
    } else {
      baseCooldown = Phaser.Math.Between(500, 1000);
    }

    if (enemy.personalityBias < 0.4) {
      baseCooldown = Math.round(baseCooldown * 0.7); // 30% reduction (Aggressive style)
    }
    return baseCooldown;
  },

  damagePlayerFromAI(damage) {
    if (this.isHit || this.victoryShown || this.defeatShown || this.hearts <= 0) return;

    // Wakeup invulnerability check
    if (this.time.now < this.playerWakeupUntil) return;

    // Reset dash/dodge states on P1
    this.playerDashUntil = 0;
    this.playerDodgeUntil = 0;

    // Perfect Parry: guarding just before impact negates all damage and bursts energy
    if (this.time.now < (this.playerParryUntil || 0)) {
      this.playerParryUntil = 0;
      this.gainEnergy(true, 40);
      this.applyHitStop();
      this.spawnSparks(this.player.x, this.player.y - 20, 0xfde047);
      this.cameras.main.flash(120, 255, 255, 200);
      this.spawnFloatingText(this.player.x, this.player.y - 80, '完美格挡! ⚡', '#fde047');
      const ring = this.add.graphics({ x: this.player.x, y: this.player.y - 20 }).setDepth(DEPTH.EFFECTS);
      ring.lineStyle(4, 0xfde047, 0.9);
      ring.strokeCircle(0, 0, 16);
      this.tweens.add({
        targets: ring, scaleX: 4, scaleY: 4, alpha: 0, duration: 300,
        ease: 'Quad.easeOut', onComplete: () => ring.destroy()
      });
      return;
    }

    // Dodge invulnerability check (reduces damage by 50% during first 100ms of dodge)
    if (this.time.now < this.playerDodgeInvulUntil) {
      damage = Math.round(damage * 0.5);
    }

    const isBlocking = (this.keyS.isDown || this.cursors.down.isDown) && this.player.body.onFloor();
    if (isBlocking) {
      // 80% reduced damage on block, P1 gains energy
      const blockedDamage = Math.round(damage * 0.2);
      this.hearts = Math.max(0, this.hearts - blockedDamage / 100);
      this.gainEnergy(true, 15);
      
      this.updateHUDHearts();
      this.spawnFloatingText(this.player.x, this.player.y - 75, '防御 🛡️', '#38bdf8');
      this.spawnFloatingItem(this.player.x + (this.player.flipX ? -15 : 15), this.player.y - 30, '✨', '#38bdf8');
    } else {
      // Full damage
      this.hearts = Math.max(0, this.hearts - damage / 100);
      this.updateHUDHearts();
      this.cameras.main.shake(150, 0.015);
      this.spawnFloatingText(this.player.x, this.player.y - 75, `-${damage} HP 🩸`, '#ef4444');

      this.isHit = true;
      this.player.play('player_hit', true);
      this.player.setVelocityX(this.player.flipX ? 100 : -100);
      
      this.player.setTint(0xff3333);
      this.time.delayedCall(200, () => this.player.clearTint());

      this.time.delayedCall(400, () => {
        this.isHit = false;
        this.player.setVelocityX(0);
        this.playerWakeupUntil = this.time.now + 500;
        this.triggerWakeupFlashing(this.player, 500);
      });
    }
  },

  killEnemy(enemy) {
    enemy.isDead = true;
    enemy.body.enable = false;
    enemy.healthBarGraphics.clear();
    enemy.play('enemy_fall', true);
    
    this.score++;
    this.enemiesDefeated++;
    this.updateHUDValues();

    this.spawnFloatingText(enemy.x, enemy.y - 64, 'K.O. 💀', '#ef4444');

    if (enemy.isBoss) {
      this.bossDefeated = true;
    }

    this.time.delayedCall(1500, () => {
      this.tweens.add({
        targets: enemy,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          enemy.healthBarGraphics.destroy();
          enemy.destroy();
        }
      });
    });
  }

  // --- Game Over ---
});
