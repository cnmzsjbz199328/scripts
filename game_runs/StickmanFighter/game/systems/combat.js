/* StickmanFighter — combat 系统（增补 MainScene 原型）
 * 由 game-logic.js 单体机械拆分而来；方法体逐字保留，PvP 已移除。 */
Object.assign(MainScene.prototype, {
  executeNormalPunch(char, isP1) {
    const inAir = !char.body.onFloor();
    if (isP1) {
      this.isAttacking = true;
      if (!inAir) char.setVelocityX(0);
      char.play('player_punch', true);
      this.time.delayedCall(200, () => {
        this.registerPlayerHit(
          char,
          inAir ? 65 : 75,
          inAir ? 15 : 12,
          inAir,
          isP1,
          inAir ? 'air_punch' : 'punch'
        );
      });
      char.once('animationcomplete', () => { this.isAttacking = false; });
    } else {
      this.p2IsAttacking = true;
      if (!inAir) char.setVelocityX(0);
      char.play('enemy_punch', true);
      this.time.delayedCall(200, () => {
        this.registerPlayerHit(
          char,
          inAir ? 65 : 75,
          inAir ? 15 : 12,
          inAir,
          isP1,
          inAir ? 'air_punch' : 'punch'
        );
      });
      char.once('animationcomplete', () => { this.p2IsAttacking = false; });
    }
  },

  executeNormalKick(char, isP1) {
    const inAir = !char.body.onFloor();
    if (isP1) {
      this.isAttacking = true;
      if (!inAir) char.setVelocityX(0);
      char.play('player_kick', true);
      this.time.delayedCall(250, () => {
        this.registerPlayerHit(
          char,
          inAir ? 80 : 90,
          inAir ? 18 : 20,
          true,
          isP1,
          inAir ? 'air_kick' : 'kick'
        );
      });
      char.once('animationcomplete', () => { this.isAttacking = false; });
    } else {
      this.p2IsAttacking = true;
      if (!inAir) char.setVelocityX(0);
      char.play('enemy_kick', true);
      this.time.delayedCall(250, () => {
        this.registerPlayerHit(
          char,
          inAir ? 80 : 90,
          inAir ? 18 : 20,
          true,
          isP1,
          inAir ? 'air_kick' : 'kick'
        );
      });
      char.once('animationcomplete', () => { this.p2IsAttacking = false; });
    }
  },

  executeHeavyThrustCombo(char, isP1) {
    const dir = char.flipX ? -1 : 1;
    this.spawnFloatingText(char.x, char.y - 80, 'THRUST COMBO! 👊💥', isP1 ? '#f59e0b' : '#38bdf8');
    
    if (isP1) {
      this.isAttacking = true;
      char.play('player_punch', true);
      char.setVelocityX(dir * 350); // slide forward
      this.time.delayedCall(150, () => this.registerPlayerHit(char, 95, 35, true, isP1, 'heavy_combo'));
      char.once('animationcomplete', () => {
        this.isAttacking = false;
        char.setVelocityX(0);
      });
    } else {
      this.p2IsAttacking = true;
      char.play('enemy_punch', true);
      char.setVelocityX(dir * 350); // slide forward
      this.time.delayedCall(150, () => this.registerPlayerHit(char, 95, 35, true, isP1, 'heavy_combo'));
      char.once('animationcomplete', () => {
        this.p2IsAttacking = false;
        char.setVelocityX(0);
      });
    }
  },

  executeUppercutCombo(char, isP1) {
    const dir = char.flipX ? -1 : 1;
    this.spawnFloatingText(char.x, char.y - 80, 'UPPERCUT! 🚀💥', isP1 ? '#a855f7' : '#38bdf8');

    if (isP1) {
      this.isAttacking = true;
      char.play('player_kick', true);
      char.setVelocityX(dir * 120);
      this.time.delayedCall(200, () => this.registerPlayerHit(char, 90, 25, true, isP1, 'launch_combo'));
      char.once('animationcomplete', () => {
        this.isAttacking = false;
        char.setVelocityX(0);
      });
    } else {
      this.p2IsAttacking = true;
      char.play('enemy_kick', true);
      char.setVelocityX(dir * 120);
      this.time.delayedCall(200, () => this.registerPlayerHit(char, 90, 25, true, isP1, 'launch_combo'));
      char.once('animationcomplete', () => {
        this.p2IsAttacking = false;
        char.setVelocityX(0);
      });
    }
  },

  registerPlayerHit(char, range, damage, hasKnockback, isP1, hitType) {
    const isFacingLeft = char.flipX;

    // Check hit on Barrels
    this.barrels.getChildren().forEach(b => {
      if (!b.active || b.isPrimed) return;
      const dist = Phaser.Math.Distance.Between(char.x, char.y, b.x, b.y);
      if (dist <= range + 15) {
        const isCorrectDirection = isFacingLeft ? (b.x < char.x) : (b.x > char.x);
        if (isCorrectDirection) {
          this.hitBarrel(b, char, damage);
        }
      }
    });

    if (this.isPvP) {
      // PvP target is the opponent player
      const opponent = isP1 ? this.p2 : this.player;
      if (opponent && opponent.active) {
        let charY = char.y - 32;
        if (hitType === 'air_punch') charY += 20;
        const dist = Phaser.Math.Distance.Between(char.x, charY, opponent.x, opponent.y - 32);
        if (dist <= range) {
          const isCorrectDirection = isFacingLeft ? (opponent.x < char.x) : (opponent.x > char.x);
          if (isCorrectDirection) {
            this.damageOpponentPlayer(opponent, damage, hasKnockback, isP1, hitType);
          }
        }
      }
    } else {
      // Story mode target is AI Enemies
      if (isP1) {
        this.enemies.getChildren().forEach(e => {
          if (e.isDead) return;
          let charY = char.y - 32;
          if (hitType === 'air_punch') charY += 20;
          const dist = Phaser.Math.Distance.Between(char.x, charY, e.x, e.y - 32);
          if (dist <= range) {
            const isCorrectDirection = isFacingLeft ? (e.x < char.x) : (e.x > char.x);
            if (isCorrectDirection) {
              this.damageAIEnemy(e, damage, hasKnockback, hitType);
            }
          }
        });
      }
    }
  },

  damageAIEnemy(enemy, damage, hasKnockback, hitType) {
    // Check if AI is blocking
    if (enemy.aiState === 'block') {
      damage = Math.round(damage * 0.2); // 80% reduction
      this.spawnFloatingText(enemy.x, enemy.y - 75, '格挡 🛡️', '#38bdf8');
    }

    // P1 gets energy on hitting AI
    this.gainEnergy(true, 5);

    // Apply hit stop
    this.applyHitStop();

    enemy.health -= damage;
    this.cameras.main.shake(100, 0.008);
    this.spawnFloatingText(enemy.x, enemy.y - 64, `-${damage} HP 💥`, '#fbbf24');

    // Impact Sparks
    const hitX = (this.player.x + enemy.x) / 2;
    const hitY = enemy.y - 32;
    this.spawnSparks(hitX, hitY, 0xff3333);

    // Trigger hit visual effect
    enemy.setTint(0xff3333);
    this.time.delayedCall(200, () => {
      if (enemy.active && !enemy.isDead) enemy.clearTint();
    });

    if (enemy.health <= 0) {
      this.killEnemy(enemy);
    } else {
      enemy.play('enemy_hit', true);
      enemy.isHitState = true;
      
      // Knockback/Launch physics
      const knockDir = this.player.flipX ? -1 : 1;
      let kbVel = hasKnockback ? 300 : 120;
      let kbVelY = -100;

      if (hitType === 'launch_combo') {
        kbVel = 150;
        kbVelY = -350; // Launch
      } else if (hitType === 'heavy_combo') {
        kbVel = 450; // Super thrust
      } else if (hitType === 'air_punch') {
        kbVel = 200;
        kbVelY = 50; // Downward
      } else if (hitType === 'air_kick') {
        kbVel = 250;
        kbVelY = 80; // Downward smash
      }

      enemy.setVelocity(knockDir * kbVel, kbVelY);
      this.spawnDust(enemy.x, enemy.y);

      this.time.delayedCall(400, () => {
        if (enemy.active && !enemy.isDead) {
          enemy.isHitState = false;
          enemy.setVelocityX(0);
        }
      });
    }
  },

  gainEnergy(isP1, amount) {
    if (isP1) {
      this.playerEnergy = Math.min(100, this.playerEnergy + amount);
      this.updateHUDValues();
      if (this.playerEnergy >= 100 && !this.playerFlashingUlt) {
        this.triggerUltFlashing(true);
      }
    } else {
      this.p2Energy = Math.min(100, this.p2Energy + amount);
      this.updateHUDValues();
      if (this.p2Energy >= 100 && !this.p2FlashingUlt) {
        this.triggerUltFlashing(false);
      }
    }
  },

  triggerUltFlashing(isP1) {
    const char = isP1 ? this.player : this.p2;
    if (!char) return;

    if (isP1) this.playerFlashingUlt = true;
    else this.p2FlashingUlt = true;

    // Golden flashing color interpolation
    const tween = this.tweens.addCounter({
      from: 0,
      to: 100,
      duration: 400,
      yoyo: true,
      repeat: -1,
      onUpdate: (tw) => {
        if (!char.active) {
          tween.remove();
          return;
        }
        const pct = tw.getValue();
        const startColor = isP1 ? 0xffffff : 0x00ffff;
        const colorVal = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.ValueToColor(startColor),
          Phaser.Display.Color.ValueToColor(0xffd700), // Gold
          100,
          pct
        );
        char.setTint(Phaser.Display.Color.GetColor(colorVal.r, colorVal.g, colorVal.b));
      }
    });

    if (isP1) this.playerFlashTween = tween;
    else this.p2FlashTween = tween;
  },

  fireUltimate(isP1) {
    // Reset status
    if (isP1) {
      this.playerEnergy = 0;
      this.playerFlashingUlt = false;
      if (this.playerFlashTween) {
        this.playerFlashTween.remove();
        this.player.clearTint();
      }
    } else {
      this.p2Energy = 0;
      this.p2FlashingUlt = false;
      if (this.p2FlashTween) {
        this.p2FlashTween.remove();
        this.p2.setTint(0x00ffff);
      }
    }
    this.updateHUDValues();

    const char = isP1 ? this.player : this.p2;
    const dir = char.flipX ? -1 : 1;

    // Spawn floating announcement
    this.spawnFloatingText(char.x, char.y - 95, 'NEON KI BLAST! 🌀⚡', isP1 ? '#f59e0b' : '#06b6d4');

    // Create glowing projectile texture dynamically
    if (!this.textures.exists('hadouken')) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x00ffff, 1.0);
      g.fillCircle(12, 12, 12);
      g.fillStyle(0xffffff, 0.85);
      g.fillCircle(12, 12, 6);
      g.generateTexture('hadouken', 24, 24);
    }

    const proj = this.physics.add.sprite(char.x + dir * 45, char.y - 35, 'hadouken');
    proj.setDepth(DEPTH.EFFECTS);
    proj.body.allowGravity = false;
    proj.setVelocityX(dir * 650);
    proj.setTint(isP1 ? 0xffbb00 : 0x00ffff);

    // Pulse size tween
    this.tweens.add({
      targets: proj,
      scaleX: 1.6,
      scaleY: 1.6,
      duration: 150,
      yoyo: true,
      repeat: -1
    });

    // Add overlap trigger (pierces enemies)
    const targets = this.isPvP ? (isP1 ? this.p2 : this.player) : this.enemies;
    
    this.physics.add.overlap(proj, targets, (p, target) => {
      if (this.isPvP) {
        const targetIsP1 = target === this.player;
        if (targetIsP1 ? this.isHit : this.p2IsHit) return;

        // Damage PvP Player
        if (targetIsP1) {
          this.hearts = Math.max(0, this.hearts - 1.5); // 50 HP = 1.5 hearts
          this.isHit = true;
          this.player.play('player_hit', true);
        } else {
          this.p2Hearts = Math.max(0, this.p2Hearts - 1.5);
          this.p2IsHit = true;
          this.p2.play('enemy_hit', true);
        }
        this.updateHUDHearts();

        this.cameras.main.shake(200, 0.02);
        this.spawnFloatingText(target.x, target.y - 75, '-50 HP ⚡', '#f43f5e');
        this.spawnSparks(target.x, target.y - 32, 0xffd700);

        target.setTint(0xff3333);
        this.time.delayedCall(200, () => {
          if (target.active) {
            if (targetIsP1) target.clearTint();
            else target.setTint(0x00ffff);
          }
        });

        // Massive launch knockback
        const kbDir = p.body.velocity.x > 0 ? 1 : -1;
        target.setVelocity(kbDir * 450, -220);

        this.time.delayedCall(400, () => {
          if (target.active) {
            if (targetIsP1) this.isHit = false;
            else this.p2IsHit = false;
            target.setVelocityX(0);
          }
        });
      } else {
        // Damage AI
        if (target.isDead) return;
        this.damageAIEnemy(target, 50, true, 'hadouken');
      }
    }, null, this);

    // Destroy out of bounds
    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        if (proj.active && (proj.x < 0 || proj.x > this.physics.world.bounds.width)) {
          proj.destroy();
        }
      }
    });
  }

  // --- Visuals & VFX Sparks/Dust ---,

  executeGrab(grabber, isP1) {
    // Find target
    let target = null;
    if (isP1) {
      if (this.isPvP) {
        if (this.p2 && this.p2.active && this.p2Hearts > 0) {
          const dist = Phaser.Math.Distance.Between(grabber.x, grabber.y, this.p2.x, this.p2.y);
          if (dist <= 55) target = this.p2;
        }
      } else {
        let minDist = 56;
        this.enemies.getChildren().forEach(e => {
          if (e.isDead) return;
          const dist = Phaser.Math.Distance.Between(grabber.x, grabber.y, e.x, e.y);
          if (dist < minDist) {
            minDist = dist;
            target = e;
          }
        });
      }
    } else {
      // P2 grab P1
      if (this.player && this.player.active && this.hearts > 0) {
        const dist = Phaser.Math.Distance.Between(grabber.x, grabber.y, this.player.x, this.player.y);
        if (dist <= 55) target = this.player;
      }
    }

    if (!target) return;

    // Wakeup invulnerability: grab cannot hit a target in their wakeup window
    if (target === this.player && this.time.now < this.playerWakeupUntil) {
      this.spawnFloatingText(grabber.x, grabber.y - 80, 'INVULNERABLE! 🛡️', '#38bdf8');
      return;
    }
    if (target === this.p2 && this.time.now < this.p2WakeupUntil) {
      this.spawnFloatingText(grabber.x, grabber.y - 80, 'INVULNERABLE! 🛡️', '#38bdf8');
      return;
    }

    // Check if target is attacking (attack startup check)
    const targetIsAttacking = (target === this.player) 
      ? this.isAttacking 
      : ((target === this.p2) ? this.p2IsAttacking : (target.isAttacking || (target.anims.currentAnim && (target.anims.currentAnim.key.includes('punch') || target.anims.currentAnim.key.includes('kick')))));

    if (targetIsAttacking) {
      // Grab failed! Stun grabber for 800ms
      this.spawnFloatingText(grabber.x, grabber.y - 80, 'THROW FAILED! ❌', '#9ca3af');
      if (isP1) {
        this.playerStunnedUntil = this.time.now + 800;
        grabber.setVelocityX(0);
        grabber.play('player_hit', true);
        this.time.delayedCall(800, () => {
          if (grabber.active) grabber.play('player_idle', true);
        });
      } else {
        this.p2StunnedUntil = this.time.now + 800;
        grabber.setVelocityX(0);
        grabber.play('enemy_hit', true);
        this.time.delayedCall(800, () => {
          if (grabber.active) grabber.play('enemy_idle', true);
        });
      }
    } else {
      // Grab success! Play kick anim on attacker, throw target with 30 damage
      this.spawnFloatingText(target.x, target.y - 80, 'THROW! 💢', '#f97316');
      grabber.play(isP1 ? 'player_kick' : 'enemy_kick', true);
      if (isP1) {
        this.isAttacking = true;
        grabber.once('animationcomplete', () => { this.isAttacking = false; });
      } else {
        this.p2IsAttacking = true;
        grabber.once('animationcomplete', () => { this.p2IsAttacking = false; });
      }

      const dir = grabber.flipX ? -1 : 1;
      target.setVelocity(dir * 350, -300);
      this.spawnDust(target.x, target.y);

      // Apply 30 damage & 600ms wakeup invulnerability
      if (target === this.player) {
        this.hearts = Math.max(0, this.hearts - 0.3); // 30 damage
        this.isHit = true;
        this.player.play('player_hit', true);
        this.updateHUDHearts();
        this.cameras.main.shake(150, 0.015);
        this.spawnFloatingText(this.player.x, this.player.y - 75, '-30 HP 🩸', '#ef4444');
        
        this.playerWakeupUntil = this.time.now + 400 + 600;
        this.time.delayedCall(400, () => {
          if (this.player.active) {
            this.isHit = false;
            this.player.setVelocityX(0);
            this.triggerWakeupFlashing(this.player, 600);
          }
        });
      } else if (target === this.p2) {
        this.p2Hearts = Math.max(0, this.p2Hearts - 0.3); // 30 damage
        this.p2IsHit = true;
        this.p2.play('enemy_hit', true);
        this.updateHUDHearts();
        this.cameras.main.shake(150, 0.015);
        this.spawnFloatingText(this.p2.x, this.p2.y - 75, '-30 HP 🩸', '#ef4444');
        
        this.p2WakeupUntil = this.time.now + 400 + 600;
        this.time.delayedCall(400, () => {
          if (this.p2 && this.p2.active) {
            this.p2IsHit = false;
            this.p2.setVelocityX(0);
            this.triggerWakeupFlashing(this.p2, 600);
          }
        });
      } else {
        // Target is AI
        this.damageAIEnemy(target, 30, true, 'throw');
      }
    }
  },

  triggerWakeupFlashing(char, duration) {
    const isP1 = (char === this.player);

    // Cancel any existing flash loop and cleanup timer for this character
    if (isP1) {
      if (this.playerWakeupEvent) { this.playerWakeupEvent.destroy(); this.playerWakeupEvent = null; }
      if (this.playerWakeupCleanup) { this.playerWakeupCleanup.remove(); this.playerWakeupCleanup = null; }
    } else {
      if (this.p2WakeupEvent) { this.p2WakeupEvent.destroy(); this.p2WakeupEvent = null; }
      if (this.p2WakeupCleanup) { this.p2WakeupCleanup.remove(); this.p2WakeupCleanup = null; }
    }

    let isLowAlpha = false;
    const event = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        if (!char || !char.active) return;
        isLowAlpha = !isLowAlpha;
        char.setAlpha(isLowAlpha ? 0.4 : 1.0);
        char.setTint(0xffffff);
      }
    });

    if (isP1) this.playerWakeupEvent = event;
    else this.p2WakeupEvent = event;

    // Store the cleanup handle so it can be cancelled on re-hit or round reset
    const cleanup = this.time.delayedCall(duration, () => {
      event.destroy();
      if (char && char.active) {
        char.setAlpha(1.0);
        if (isP1) {
          char.clearTint();
          this.playerWakeupCleanup = null;
        } else {
          char.setTint(0x00ffff);
          this.p2WakeupCleanup = null;
        }
      }
    });

    if (isP1) this.playerWakeupCleanup = cleanup;
    else this.p2WakeupCleanup = cleanup;
  }
});
