/* NinjaStealth — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  isGuardInSmoke(guard) {
    let inSmoke = false;
    this.smokeClouds.getChildren().forEach(c => {
      const dist = Phaser.Math.Distance.Between(guard.x, guard.y, c.x, c.y);
      if (dist < 100) {
        inSmoke = true;
      }
    });
    return inSmoke;
  },


  updateGuard(guard, delta) {
    if (guard.state === 'dead') return;

    // Check if guard is stunned by smoke
    const stunned = this.isGuardInSmoke(guard);
    if (stunned) {
      guard.body.setVelocity(0, 0);
      guard.play('SamuraiGuard_idle', true);
      guard.alertIcon.setText('░').setFill('#a5f3fc'); // confused symbols
      guard.detectionProgress = 0;
      return;
    }

    const distToPlayer = Phaser.Math.Distance.Between(guard.x, guard.y, this.player.x, this.player.y);

    // GUARD BEHAVIOR FINITE STATE MACHINE (FSM)
    if (guard.state === 'combat') {
      // Alarm red Alert
      guard.alertIcon.setText('🚨').setFill('#ff0000');
      
      // Move rapidly towards player
      const dx = this.player.x - guard.x;
      const dy = this.player.y - guard.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 5) {
        const vx = (dx / dist) * (window.GAME_CONFIG.player.speed * 1.15);
        const vy = (dy / dist) * (window.GAME_CONFIG.player.speed * 1.15);
        guard.body.setVelocity(vx, vy);
        guard.facingAngle = Math.atan2(vy, vx);
        this.playGuardWalkAnim(guard, vx, vy);
      }

      // Check collision for damage
      if (dist < 50 && !this.isInvincible && !this.isPlayerAttacking) {
        this.damagePlayer(guard);
      }

      // Lose sight if player gets too far or enters smoke
      if (dist > 350 || this.isPlayerInSmoke()) {
        guard.state = 'alert';
        guard.alertTimer = 4000; // Look around for 4 seconds
        guard.body.setVelocity(0, 0);
      }
    } else if (guard.state === 'alert') {
      // Stunned / searching area
      guard.alertIcon.setText('❓').setFill('#fbbf24');
      guard.body.setVelocity(0, 0);
      guard.play('SamuraiGuard_idle', true);

      // Rotate vision back and forth slowly
      guard.facingAngle = guard.facingAngle + 0.02 * Math.sin(this.time.now * 0.005);
      
      // Check if player is detected again
      if (this.checkPlayerDetection(guard)) {
        guard.state = 'combat';
        sfx.play('alert');
      }

      guard.alertTimer -= delta;
      if (guard.alertTimer <= 0) {
        guard.state = 'patrol';
        guard.alertIcon.setText('');
      }
    } else {
      // Normal Patrol state
      guard.alertIcon.setText('');

      // Patrol movement
      const pathNodes = guard.patrolPath;
      if (pathNodes && pathNodes.length > 0) {
        const target = pathNodes[guard.patrolIndex];
        const dx = target.x - guard.x;
        const dy = target.y - guard.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 8) {
          // Move to next node
          guard.patrolIndex = (guard.patrolIndex + 1) % pathNodes.length;
        } else {
          const patrolSpeed = window.GAME_CONFIG.player.speed * 0.55;
          const vx = (dx / dist) * patrolSpeed;
          const vy = (dy / dist) * patrolSpeed;
          guard.body.setVelocity(vx, vy);
          guard.facingAngle = Math.atan2(vy, vx);
          this.playGuardWalkAnim(guard, vx, vy);
        }
      } else {
        guard.body.setVelocity(0, 0);
        guard.play('SamuraiGuard_idle', true);
      }

      // Detection check
      if (this.checkPlayerDetection(guard)) {
        // Spots player! Sneaking slows the build-up, buying reaction time.
        guard.detectionProgress += this.isSneaking ? 2 : 4;
        if (guard.detectionProgress >= 100) {
          guard.state = 'combat';
          sfx.play('alert');
          this.cameras.main.flash(200, 200, 0, 0); // brief red screen flash
        }
        guard.alertIcon.setText('!').setFill('#fbbf24');
      } else {
        guard.detectionProgress = Math.max(0, guard.detectionProgress - 2);
        if (guard.detectionProgress > 0) {
          guard.alertIcon.setText('?').setFill('#a5f3fc');
        } else {
          guard.alertIcon.setText('');
        }
      }
    }

    // Draw vision cone
    this.drawVisionCone(guard);
  },


  playGuardWalkAnim(guard, vx, vy) {
    const angle = guard.facingAngle * 180 / Math.PI;
    if (angle > -135 && angle < -45) {
      guard.play('SamuraiGuard_walk_up', true);
      guard.setFlipX(false);
    } else if (angle > 45 && angle < 135) {
      guard.play('SamuraiGuard_walk_down', true);
      guard.setFlipX(false);
    } else {
      guard.play('SamuraiGuard_walk_left', true);
      if (vx > 0) {
        guard.setFlipX(true); // face right
      } else {
        guard.setFlipX(false); // face left
      }
    }
  },


  checkPlayerDetection(guard) {
    // If player is dead, invincible, or in smoke, cannot be detected
    if (this.playerHp <= 0 || this.isPlayerInSmoke()) return false;

    const dist = Phaser.Math.Distance.Between(guard.x, guard.y, this.player.x, this.player.y);
    const maxSight = this.isSneaking ? 130 : 240; // crouching shrinks guards' effective sight

    if (dist > maxSight) return false;

    // Check angle relative to facing direction
    const angleToPlayer = Math.atan2(this.player.y - guard.y, this.player.x - guard.x);
    let diff = angleToPlayer - guard.facingAngle;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));

    // 65-degree field of view (±32.5 degrees)
    const fov = 65 * Math.PI / 180;
    if (Math.abs(diff) < fov / 2) {
      // Check line-of-sight raycasting to ensure walls block vision
      if (!this.isLineOfSightBlocked(guard.x, guard.y, this.player.x, this.player.y)) {
        return true;
      }
    }
    return false;
  },


  isLineOfSightBlocked(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(distance / 16); // check every 16px

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const px = x1 + dx * t;
      const py = y1 + dy * t;
      const tx = Math.floor(px / 64);
      const ty = Math.floor(py / 64);

      if (tx >= 0 && tx < window.TILEMAP_DATA.width && ty >= 0 && ty < window.TILEMAP_DATA.height) {
        const idx = ty * window.TILEMAP_DATA.width + tx;
        const tileId = this.currentLevelLayers.objects[idx];
        if (tileId && tileId !== 0) {
          const tileName = window.TILEMAP_DATA.tileIndex[tileId];
          // Blocks vision: walls, crates, barrels, bushes
          if (tileName && (tileName.includes('wall') || tileName.includes('crate') || tileName.includes('barrel') || tileName.includes('bush'))) {
            return true;
          }
        }
      }
    }
    return false;
  },


  drawVisionCone(guard) {
    if (guard.state === 'dead' || this.isGuardInSmoke(guard)) return;

    const color = guard.state === 'combat' ? 0xff3333 : 0xffd700;
    const opacity = guard.state === 'combat' ? 0.3 : 0.15;
    const maxSight = 240;
    const fov = 65 * Math.PI / 180; // 65-degree cone

    const startAngle = guard.facingAngle - fov / 2;
    const endAngle = guard.facingAngle + fov / 2;

    this.visionGraphics.lineStyle(2, color, opacity * 1.5);
    this.visionGraphics.fillStyle(color, opacity);

    this.visionGraphics.beginPath();
    this.visionGraphics.moveTo(guard.x, guard.y);

    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      const angle = startAngle + (endAngle - startAngle) * (i / steps);
      const targetX = guard.x + Math.cos(angle) * maxSight;
      const targetY = guard.y + Math.sin(angle) * maxSight;

      // raycast to trim the vision cone when it hits walls!
      let actualX = targetX;
      let actualY = targetY;
      const raySteps = 24;

      for (let j = 1; j <= raySteps; j++) {
        const t = j / raySteps;
        const rx = guard.x + (targetX - guard.x) * t;
        const ry = guard.y + (targetY - guard.y) * t;
        const tx = Math.floor(rx / 64);
        const ty = Math.floor(ry / 64);

        if (tx >= 0 && tx < window.TILEMAP_DATA.width && ty >= 0 && ty < window.TILEMAP_DATA.height) {
          const idx = ty * window.TILEMAP_DATA.width + tx;
          const tileId = this.currentLevelLayers.objects[idx];
          if (tileId && tileId !== 0) {
            const name = window.TILEMAP_DATA.tileIndex[tileId];
            if (name && (name.includes('wall') || name.includes('crate') || name.includes('barrel') || name.includes('bush'))) {
              actualX = rx;
              actualY = ry;
              break;
            }
          }
        }
      }

      this.visionGraphics.lineTo(actualX, actualY);
    }
    
    this.visionGraphics.closePath();
    this.visionGraphics.fillPath();
    this.visionGraphics.strokePath();
  }
});
