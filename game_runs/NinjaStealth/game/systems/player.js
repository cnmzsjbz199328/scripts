/* NinjaStealth — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  handlePlayerMovement() {
    let vx = 0;
    let vy = 0;
    const speed = window.GAME_CONFIG.player.speed * (this.isSneaking ? 0.5 : 1);

    if (this.cursors.left.isDown || this.keys.A.isDown) {
      vx = -speed;
    } else if (this.cursors.right.isDown || this.keys.D.isDown) {
      vx = speed;
    }

    if (this.cursors.up.isDown || this.keys.W.isDown) {
      vy = -speed;
    } else if (this.cursors.down.isDown || this.keys.S.isDown) {
      vy = speed;
    }

    // Normalize diagonal speed
    if (vx !== 0 && vy !== 0) {
      vx *= 0.7071;
      vy *= 0.7071;
    }

    this.player.body.setVelocity(vx, vy);

    // Choose animation
    if (vx === 0 && vy === 0) {
      this.player.play('NinjaKage_idle', true);
    } else {
      if (Math.abs(vx) >= Math.abs(vy)) {
        this.player.play('NinjaKage_walk_left', true);
        // Flip logic: assets drawn facing LEFT. SetFlipX(true) mirrors it to face RIGHT
        if (vx < 0) {
          this.player.setFlipX(false); // face left
        } else {
          this.player.setFlipX(true); // face right
        }
      } else {
        if (vy < 0) {
          this.player.play('NinjaKage_walk_up', true);
        } else {
          this.player.play('NinjaKage_walk_down', true);
        }
        this.player.setFlipX(false);
      }
    }
  },


  executeAssassination() {
    let targetGuard = null;
    let closestDist = 65; // within 65 pixels for assassination

    this.guards.getChildren().forEach(g => {
      if (g.state === 'dead') return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, g.x, g.y);
      if (d < closestDist && this.canAssassinate(g)) {
        closestDist = d;
        targetGuard = g;
      }
    });

    if (targetGuard) {
      this.isPlayerAttacking = true;
      this.player.body.setVelocity(0, 0);
      sfx.play('slash');
      this.spawnSlash(targetGuard.x, targetGuard.y);

      // Face the guard
      if (targetGuard.x < this.player.x) {
        this.player.setFlipX(false); // face left
      } else {
        this.player.setFlipX(true); // face right
      }

      this.player.play('NinjaKage_attack', true);
      
      // Disable guard movement and prep death
      const guardToKill = targetGuard;
      guardToKill.state = 'dead';
      guardToKill.body.setVelocity(0, 0);
      guardToKill.alertIcon.setText('');

      this.time.delayedCall(250, () => {
        // Guard dissolves in smoke!
        sfx.play('smoke_explode');
        this.spawnSmokePuff(guardToKill.x, guardToKill.y);
        
        // Randomly drops a smoke bomb pickup (25% chance)
        if (Math.random() < 0.25) {
          const pickup = this.smokeBombPickups.create(guardToKill.x, guardToKill.y, 'smoke_bomb');
          pickup.body.setSize(48, 48);
          pickup.body.setOffset(40, 40);
          pickup.play('smoke_bomb_float');
          pickup.setDepth(DEPTH.YSORT + guardToKill.y);
          this.ysortGroup.add(pickup);
        }

        guardToKill.destroy();
      });

      this.time.delayedCall(500, () => {
        this.isPlayerAttacking = false;
      });
    } else {
      // Normal swing (whiff)
      this.isPlayerAttacking = true;
      this.player.body.setVelocity(0, 0);
      sfx.play('slash');
      this.player.play('NinjaKage_attack', true);
      this.time.delayedCall(400, () => {
        this.isPlayerAttacking = false;
      });
    }
  },


  canAssassinate(guard) {
    // Stunned guards in smoke can be assassinated from any angle
    if (this.isGuardInSmoke(guard)) return true;

    // Calculate angle from guard to player
    const angleToPlayer = Math.atan2(this.player.y - guard.y, this.player.x - guard.x);
    let diff = angleToPlayer - guard.facingAngle;
    
    // Normalize to -PI to PI
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));

    // If angle difference is greater than 100 degrees, player is behind the guard
    return Math.abs(diff) > (100 * Math.PI / 180);
  },


  throwSmokeBomb() {
    if (this.smokeBombs <= 0) return;
    this.smokeBombs--;
    this.updateHUDText();
    sfx.play('smoke_throw');

    // Spawn a flying smoke bomb visual
    const bombVisual = this.add.sprite(this.player.x, this.player.y, 'smoke_bomb').setScale(0.8).setDepth(DEPTH.EFFECTS);
    
    // Animate bomb landing
    const targetX = this.player.x + (this.player.flipX ? 64 : -64);
    const targetY = this.player.y;

    this.tweens.add({
      targets: bombVisual,
      x: targetX,
      y: targetY,
      angle: 360,
      duration: 300,
      onComplete: () => {
        bombVisual.destroy();
        sfx.play('smoke_explode');
        this.spawnSmokeCloud(targetX, targetY);
      }
    });
  },


  isPlayerInSmoke() {
    let inSmoke = false;
    this.smokeClouds.getChildren().forEach(c => {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, c.x, c.y);
      if (dist < 100) {
        inSmoke = true;
      }
    });
    return inSmoke;
  },


  damagePlayer(guard) {
    this.isInvincible = true;
    this.invincibilityTimer = 2000; // 2 seconds invincibility
    this.playerHp--;
    sfx.play('damage');
    window.GameHUD?.setHearts(this.playerHp, 3);
    this.cameras.main.shake(250, 0.015);

    // Knockback
    const angle = Math.atan2(this.player.y - guard.y, this.player.x - guard.x);
    this.player.body.setVelocity(Math.cos(angle) * 350, Math.sin(angle) * 350);
    this.isPlayerAttacking = true;

    this.time.delayedCall(300, () => {
      this.isPlayerAttacking = false;
    });

    if (this.playerHp <= 0) {
      this.gameOver(false);
    }
  }
});
