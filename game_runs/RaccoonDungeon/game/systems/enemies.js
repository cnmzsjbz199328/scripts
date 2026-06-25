/* RaccoonDungeon — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  damageEnemy(enemy, amount) {
    if (!enemy.active || enemy.getData('hp') <= 0) return;

    const currentHp = enemy.getData('hp') - amount;
    enemy.setData('hp', currentHp);

    // Floating text
    this.showFloatingText(enemy.x, enemy.y - 40, `-${amount}`, "#fbbf24");
    this.createSparks(enemy.x, enemy.y, 0xff0000, 6);

    // Play hurt animation
    const type = enemy.getData('type');
    let hurtAnim = 'slime_hurt';
    if (type === 'Gargoyle') hurtAnim = 'garg_hurt';
    else if (type === 'BossDragon') hurtAnim = 'dragon_hurt';

    enemy.play(hurtAnim);
    enemy.setData('hurtTimer', 300); // 300ms stun

    // Update Boss health bar
    if (type === 'BossDragon') {
      this.updateBossHealthBar(currentHp, enemy.getData('maxHp'));
    }

    if (currentHp <= 0) {
      this.killEnemy(enemy);
    }
  },


  killEnemy(enemy) {
    enemy.body.setVelocity(0);
    enemy.body.enable = false;

    const type = enemy.getData('type');
    let deathAnim = 'slime_death';
    if (type === 'Gargoyle') deathAnim = 'garg_death';
    else if (type === 'BossDragon') deathAnim = 'dragon_death';

    // Death particle burst (boss gets a bigger one)
    const burstCount = type === 'BossDragon' ? 24 : 12;
    this.createSparks(enemy.x, enemy.y, 0xfbbf24, burstCount);

    enemy.play(deathAnim);

    enemy.once('animationcomplete', () => {
      enemy.destroy();
      this.enemiesKilled++;

      // Check level completion
      if (type === 'BossDragon') {
        this.bossDefeated = true;
        this.destroyBossHealthBar();
        this.handleGameOver(true);
      } else {
        const remaining = this.totalEnemiesInLevel - this.enemiesKilled;
        if (remaining <= 0) {
          this.activatePortal();
        } else {
          this.showFloatingText(this.player.x, this.player.y - 60, `剩余怪物: ${remaining}`, "#a5f3fc");
        }
      }
    });
  },


  // -------------------------------------------------------------
  // ENEMIES AI & BEHAVIOR
  // -------------------------------------------------------------
  updateEnemies() {
    const time = this.time.now;
    this.enemiesGroup.getChildren().forEach(enemy => {
      if (!enemy.active || enemy.getData('hp') <= 0) return;

      // Hurt stun guard
      let hurtTimer = enemy.getData('hurtTimer') || 0;
      if (hurtTimer > 0) {
        enemy.setData('hurtTimer', hurtTimer - this.game.loop.delta);
        enemy.body.setVelocity(0);
        return;
      }

      const type = enemy.getData('type');
      const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);

      if (type === 'Slime') {
        // Slimes bounce towards player if within 450px
        if (dist < 450) {
          const speed = enemy.getData('speed');
          const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
          
          enemy.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
          
          // Animate walk and flipX depending on x direction
          const vx = enemy.body.velocity.x;
          const vy = enemy.body.velocity.y;
          let animKey = 'slime_walk_down';
          if (Math.abs(vx) > Math.abs(vy)) {
            animKey = 'slime_walk_left';
          }
          if (!enemy.anims.isPlaying || enemy.anims.currentAnim?.key !== animKey) {
            enemy.play(animKey);
          }
          enemy.setFlipX(vx > 0);
          
          // Deal damage on overlap
          if (dist <= 48) {
            this.handleEnemyMeleeContact(enemy);
          }
        } else {
          enemy.body.setVelocity(0);
          enemy.play('slime_walk_down', true);
        }
      } else if (type === 'Gargoyle') {
        // Gargoyles stay back and shoot bullets, or fly towards player
        if (dist < 500) {
          const speed = enemy.getData('speed');
          const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);

          if (dist > 250) {
            // Move closer
            enemy.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
          } else if (dist < 150) {
            // Retract/back away slightly
            enemy.body.setVelocity(-Math.cos(angle) * speed * 0.7, -Math.sin(angle) * speed * 0.7);
          } else {
            enemy.body.setVelocity(0);
          }

          // Animate walk and flipX depending on x direction
          const vx = enemy.body.velocity.x;
          const vy = enemy.body.velocity.y;
          if (Math.abs(vx) > 10 || Math.abs(vy) > 10) {
            let animKey = 'garg_walk_down';
            if (Math.abs(vx) > Math.abs(vy)) {
              animKey = 'garg_walk_left';
            }
            if (!enemy.anims.isPlaying || enemy.anims.currentAnim?.key !== animKey) {
              enemy.play(animKey);
            }
            enemy.setFlipX(vx > 0);
          } else {
            enemy.anims.stop();
            enemy.setFrame(this.player.x > enemy.x ? 18 : 0); // face left or front idle
            enemy.setFlipX(this.player.x > enemy.x);
          }

          // Ranged attack
          const lastShot = enemy.getData('lastShotTime') || 0;
          const cd = enemy.getData('shootCooldown');
          if (time - lastShot > cd) {
            enemy.setData('lastShotTime', time);
            this.gargoyleShoot(enemy, angle);
          }

          // Damage contact
          if (dist <= 48) {
            this.handleEnemyMeleeContact(enemy);
          }
        } else {
          enemy.body.setVelocity(0);
          enemy.play('garg_walk_down', true);
        }
      } else if (type === 'BossDragon') {
        // Boss Dragon behaviors
        const speed = enemy.getData('speed');
        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);

        // Move towards player slowly
        enemy.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

        // Animate walk and flipX depending on x direction
        const vx = enemy.body.velocity.x;
        const vy = enemy.body.velocity.y;
        
        // Dragon attack anim lock
        if (enemy.anims.currentAnim?.key !== 'dragon_attack' || !enemy.anims.isPlaying) {
          if (Math.abs(vx) > 10 || Math.abs(vy) > 10) {
            let animKey = 'dragon_walk_down';
            if (Math.abs(vx) > Math.abs(vy)) {
              animKey = 'dragon_walk_left';
            }
            if (!enemy.anims.isPlaying || enemy.anims.currentAnim?.key !== animKey) {
              enemy.play(animKey);
            }
            enemy.setFlipX(vx > 0);
          }
        }

        // Fire breath attack
        const lastAtt = enemy.getData('lastAttackTime') || 0;
        const cd = enemy.getData('attackCooldown');
        if (time - lastAtt > cd) {
          enemy.setData('lastAttackTime', time);
          this.dragonBreathAttack(enemy);
        }

        // Deal contact damage
        if (dist <= 85) {
          this.handleEnemyMeleeContact(enemy);
        }
      }
    });
  },


  handleEnemyMeleeContact(enemy) {
    this.damagePlayer(1);
  },


  gargoyleShoot(enemy, angle) {
    // Shoot small stone bullet
    const bx = enemy.x;
    const by = enemy.y - 10;
    
    const bullet = this.physics.add.sprite(bx, by, 'gargoyle_sheet', 17); // simple bullet frame
    bullet.setDisplaySize(20, 20);
    bullet.setTint(0x94a3b8); // grey stone tint
    bullet.body.setVelocity(Math.cos(angle) * 300, Math.sin(angle) * 300);
    bullet.setDepth(DEPTH.EFFECTS);

    this.physics.add.overlap(this.player, bullet, (player, b) => {
      b.destroy();
      this.damagePlayer(1);
    });

    this.time.delayedCall(2500, () => {
      if (bullet.active) bullet.destroy();
    });
  },


  dragonBreathAttack(enemy) {
    enemy.body.setVelocity(0);
    enemy.play('dragon_attack');

    this.time.delayedCall(400, () => {
      const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      const breathRange = 220;
      let breathHit = false; // cap breath to 1 damage event per cast

      // Visual warning cone
      this.cameras.main.shake(300, 0.008);

      // Spawn fire sparks inside cone
      for (let i = 0; i < 20; i++) {
        this.time.delayedCall(i * 30, () => {
          if (!enemy.active) return;

          const spread = (Math.random() - 0.5) * 0.45;
          const a = angle + spread;
          const dist = Math.random() * breathRange + 30;
          const fx = enemy.x + Math.cos(a) * dist;
          const fy = enemy.y + Math.sin(a) * dist;

          // Spark particle
          this.createSparks(fx, fy, 0xf97316, 2);

          // Check hit — only deal damage once per breath cast
          if (!breathHit) {
            const pd = Phaser.Math.Distance.Between(fx, fy, this.player.x, this.player.y);
            if (pd <= 45) {
              breathHit = true;
              this.damagePlayer(1);
            }
          }
        });
      }
    });
  },


  applyKnockback(enemy, direction, speed) {
    let kx = 0;
    let ky = 0;
    if (direction === 'left') kx = -speed;
    else if (direction === 'right') kx = speed;
    else if (direction === 'up') ky = -speed;
    else if (direction === 'down') ky = speed;

    enemy.body.setVelocity(kx, ky);
  }
});
