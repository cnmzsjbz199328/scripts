/* RaccoonDungeon — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  // -------------------------------------------------------------
  // CONTROLS & PLAYER ACTIONS
  // -------------------------------------------------------------
  handlePlayerMovement() {
    // While dashing, the roll fully controls velocity — skip normal movement.
    if (this.isDashing) return;

    // Guard against attacking anim locks
    const activeAnim = this.player.anims.currentAnim?.key;
    if (activeAnim === 'attack_melee' || activeAnim === 'attack_magic' || activeAnim === 'heal' || activeAnim === 'hurt') {
      if (this.player.anims.isPlaying) {
        this.player.body.setVelocity(0);
        return;
      }
    }

    let vx = 0;
    let vy = 0;
    const speed = GAME_CONFIG.player.speed;

    if (this.cursors.left.isDown || this.keyA.isDown) {
      vx = -speed;
      this.facingDirection = 'left';
    } else if (this.cursors.right.isDown || this.keyD.isDown) {
      vx = speed;
      this.facingDirection = 'right';
    }

    if (this.cursors.up.isDown || this.keyW.isDown) {
      vy = -speed;
      this.facingDirection = 'up';
    } else if (this.cursors.down.isDown || this.keyS.isDown) {
      vy = speed;
      this.facingDirection = 'down';
    }

    // Normalize diagonal velocity
    if (vx !== 0 && vy !== 0) {
      vx *= 0.7071;
      vy *= 0.7071;
    }

    this.player.body.setVelocity(vx, vy);

    // Play walk animation
    if (vx !== 0 || vy !== 0) {
      let animKey = 'walk_down';
      if (this.facingDirection === 'up') animKey = 'walk_up';
      else if (this.facingDirection === 'left') animKey = 'walk_left';
      else if (this.facingDirection === 'right') animKey = 'walk_left'; // uses flipX

      if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== animKey) {
        this.player.play(animKey);
      }
      this.player.setFlipX(this.facingDirection === 'right');
    } else {
      // Idle frame locks
      this.player.body.setVelocity(0);
      let idleFrame = 0; // walk_down idle
      if (this.facingDirection === 'up') idleFrame = 9; // walk_up idle
      else if (this.facingDirection === 'left') idleFrame = 18; // walk_left idle
      else if (this.facingDirection === 'right') idleFrame = 18;
      
      this.player.anims.stop();
      this.player.setFrame(idleFrame);
      this.player.setFlipX(this.facingDirection === 'right');
    }
  },


  handlePlayerSkills() {
    // 1. Interact Key (E) - Open chests / portals
    if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
      this.handleInteractAction();
    }

    // Block combat inputs if transitioning
    if (this.isTransitioning) return;

    // Dodge Roll (Shift)
    if (Phaser.Input.Keyboard.JustDown(this.keyShift) && this.dashCooldown <= 0 && !this.isDashing) {
      this.performDash();
    }

    // 2. Melee Attack (J)
    if (Phaser.Input.Keyboard.JustDown(this.keyJ)) {
      this.performMeleeAttack();
    }

    // 3. Magic Fireball Attack (K)
    if (Phaser.Input.Keyboard.JustDown(this.keyK) && this.magicCooldown <= 0) {
      this.performMagicAttack();
    }

    // 4. Healing prayer Spell (L)
    if (Phaser.Input.Keyboard.JustDown(this.keyL) && this.healingCooldown <= 0) {
      this.performHealingSpell();
    }
  },


  // -------------------------------------------------------------
  // COMBAT IMPLEMENTATIONS
  // -------------------------------------------------------------
  performMeleeAttack() {
    this.player.body.setVelocity(0);
    this.player.play('attack_melee');
    this.player.setFlipX(this.facingDirection === 'right');

    // Wait for the swing impact frame (approx frame 4)
    this.time.delayedCall(200, () => {
      // Create hitbox in front of player
      let range = 80;
      let hx = this.player.x;
      let hy = this.player.y;

      if (this.facingDirection === 'left') hx -= range;
      else if (this.facingDirection === 'right') hx += range;
      else if (this.facingDirection === 'up') hy -= range;
      else if (this.facingDirection === 'down') hy += range;

      // Draw swipe visual spark
      this.createSwipeEffect(hx, hy);

      // Check hits on enemies group
      this.enemiesGroup.getChildren().forEach(enemy => {
        if (!enemy.active || enemy.getData('hp') <= 0) return;
        const dist = Phaser.Math.Distance.Between(hx, hy, enemy.x, enemy.y);
        if (dist <= 75) {
          this.damageEnemy(enemy, 1); // Melee deals 1 damage
          // Knockback
          this.applyKnockback(enemy, this.facingDirection, 180);
        }
      });

      // Check interact with chests near front
      this.chestsGroup.getChildren().forEach(chest => {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, chest.x, chest.y);
        if (dist <= 96 && !chest.getData('opened')) {
          this.openChest(chest);
        }
      });
    });
  },


  performMagicAttack() {
    this.player.body.setVelocity(0);
    this.player.play('attack_magic');
    this.player.setFlipX(this.facingDirection === 'right');
    this.magicCooldown = 500; // 0.5s cooldown

    this.time.delayedCall(150, () => {
      // Spawn fireball projectile
      let px = this.player.x;
      let py = this.player.y - 10;
      let dx = 0;
      let dy = 0;
      let angle = 0;

      if (this.facingDirection === 'left') { px -= 40; dx = -450; angle = 180; }
      else if (this.facingDirection === 'right') { px += 40; dx = 450; angle = 0; }
      else if (this.facingDirection === 'up') { py -= 40; dy = -450; angle = -90; }
      else if (this.facingDirection === 'down') { py += 40; dy = 450; angle = 90; }

      // Fireball visual representation (custom small circle)
      const fb = this.physics.add.sprite(px, py, 'raccoon_sheet', 39); // using magic projectile frame or custom colored circle
      fb.setDisplaySize(40, 40);
      fb.setTint(0xff7700); // orange fireball
      fb.setAngle(angle);
      fb.body.setGravityY(0);
      fb.body.setVelocity(dx, dy);
      fb.setDepth(DEPTH.EFFECTS);
      fb.setData('damage', 2); // Fireball deals 2 damage

      this.projectilesGroup.add(fb);

      // Light trail particle emission simulator
      this.time.addEvent({
        delay: 50,
        callback: () => {
          if (fb.active) this.createSparks(fb.x, fb.y, 0xffaa00, 3);
        },
        repeat: 12
      });

      // Destroy if it flies off-screen
      this.time.delayedCall(2000, () => {
        if (fb.active) fb.destroy();
      });
    });
  },


  performHealingSpell() {
    this.player.body.setVelocity(0);
    this.player.play('heal');
    this.player.setFlipX(this.facingDirection === 'right');
    this.healingCooldown = 8000; // 8s cooldown

    this.time.delayedCall(200, () => {
      if (this.playerHp < this.maxHp) {
        this.playerHp = Math.min(this.maxHp, this.playerHp + 1);
        window.GameHUD?.setHearts(this.playerHp, this.maxHp);
        
        // Healing green sparkles float up
        this.createHealingSparkles();
        this.showFloatingText(this.player.x, this.player.y - 50, "+1 HP", "#4ade80");
        this.flashScreen(0x22c55e, 0.2); // Green flash
      } else {
        this.showFloatingText(this.player.x, this.player.y - 50, "HP已满！", "#ffffff");
      }
    });
  },


  performDash() {
    this.isDashing = true;
    this.dashCooldown = 900;
    const ds = 520;
    let dx = 0, dy = 0;
    if (this.facingDirection === 'left') dx = -ds;
    else if (this.facingDirection === 'right') dx = ds;
    else if (this.facingDirection === 'up') dy = -ds;
    else dy = ds;

    this.player.body.setVelocity(dx, dy);
    this.player.setAlpha(0.6);
    this.showFloatingText(this.player.x, this.player.y - 50, '闪避翻滚！', '#67e8f9');

    // Cyan afterimage trail along the roll
    this.time.addEvent({
      delay: 40,
      repeat: 5,
      callback: () => { if (this.player.active) this.createSparks(this.player.x, this.player.y, 0x67e8f9, 3); }
    });

    this.time.delayedCall(250, () => {
      this.isDashing = false;
      if (this.player.active) this.player.setAlpha(1);
    });
  },


  // -------------------------------------------------------------
  // COLLISION HANDLERS & COMBAT ACTIONS
  // -------------------------------------------------------------
  damagePlayer(amount) {
    if (this.playerHp <= 0 || this.isTransitioning) return;
    if (this.isDashing) return; // i-frames during dodge roll
    const now = this.time.now;
    if (now - (this._lastDamageTime || 0) < 700) return; // 0.7s iFrame
    this._lastDamageTime = now;

    this.playerHp = Math.max(0, this.playerHp - amount);
    window.GameHUD?.setHearts(this.playerHp, this.maxHp);

    // Hurt effects
    this.player.play('hurt');
    this.cameras.main.shake(150, 0.015);
    this.flashScreen(0xef4444, 0.35); // red flash
    this.showFloatingText(this.player.x, this.player.y - 50, `-${amount} HP`, "#ef4444");

    // Apply brief recoil
    let rx = 0, ry = 0;
    if (this.facingDirection === 'left') rx = 80;
    else if (this.facingDirection === 'right') rx = -80;
    else if (this.facingDirection === 'up') ry = 80;
    else if (this.facingDirection === 'down') ry = -80;
    this.player.body.setVelocity(rx, ry);

    if (this.playerHp <= 0) {
      this.handleGameOver(false);
    }
  },


  handleInteractAction() {
    // Check closest chest
    this.chestsGroup.getChildren().forEach(chest => {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, chest.x, chest.y);
      if (dist <= 96 && !chest.getData('opened')) {
        this.openChest(chest);
      }
    });

    // Check closest portal
    if (this.portalActive) {
      this.portalGroup.getChildren().forEach(portal => {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, portal.x, portal.y);
        if (dist <= 80) {
          this.handlePlayerPortalOverlap(this.player, portal);
        }
      });
    }
  }
});
