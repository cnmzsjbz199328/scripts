/* NeonTowerDefense — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  handleEnemyMovement() {
    this.enemies.getChildren().forEach(e => {
      if (e.isDead) return;

      const wp = e.waypoints[e.waypointIdx];
      if (!wp) {
        this.damageCore(e);
        return;
      }

      const dx = wp.x - e.x;
      const dy = wp.y - e.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 4) {
        e.waypointIdx++;
      } else {
        const speed = e.isSlowed ? e.speed * 0.45 : e.speed;
        const vx = (dx / dist) * speed;
        const vy = (dy / dist) * speed;
        e.setVelocity(vx, vy);

        if (vx < 0) e.setFlipX(true);
        else if (vx > 0) e.setFlipX(false);
      }

      this.drawEnemyHealthBar(e);

      // Handle slows timing
      if (e.isSlowed && this.time.now > e.slowUntil) {
        e.isSlowed = false;
        if (e.isFast) e.setTint(0x00ff66);
        else if (e.isBoss) e.clearTint();
        else e.setTint(0xff3333);
      }
    });
  },


  drawEnemyHealthBar(e) {
    if (!e.healthBar) return;
    const bar = e.healthBar;
    bar.clear();
    const bw = 36;
    const bh = 4;
    const bx = e.x - bw / 2;
    const by = e.y - 28;
    const pct = Math.max(0, e.health / e.maxHealth);
    bar.fillStyle(0x000000, 0.6);
    bar.fillRect(bx, by, bw, bh);
    const color = pct > 0.5 ? 0x00ff66 : pct > 0.25 ? 0xffaa00 : 0xff3333;
    bar.fillStyle(color, 1);
    bar.fillRect(bx, by, bw * pct, bh);
    bar.setDepth(DEPTH.EFFECTS);
  },


  damageCore(enemy) {
    const damage = enemy.isBoss ? 2.0 : 0.5;
    this.hearts = Math.max(0, this.hearts - damage);
    window.GameHUD?.setHearts(Math.round(this.hearts * 2) / 2, 3);

    // Play Hexagon Shield flash pulse (Effect 6)
    const shield = this.add.sprite(this.coreStation.x, this.coreStation.y - 12, 'core_shield');
    shield.setDepth(DEPTH.EFFECTS);
    shield.setScale(1.35);
    shield.play('anim_shield');
    shield.once('animationcomplete', () => shield.destroy());

    // FX Screen shake
    this.cameras.main.shake(200, 0.02);
    this.cameras.main.flash(100, 255, 0, 0);

    enemy.healthBar.destroy();
    enemy.destroy();

    this.spawnFloatingText(this.coreStation.x, this.coreStation.y - 48, `数据库核心受损!`, '#ef4444');
  },


  killEnemy(enemy) {
    if (enemy.isDead) return;
    enemy.isDead = true;
    enemy.setVelocity(0, 0);

    enemy.healthBar.destroy();

    // Drop energy crystal
    const crystal = this.crystals.create(enemy.x, enemy.y - 10, 'energy_crystal');
    crystal.play('anim_crystal');
    crystal.setDisplaySize(32, 32);
    crystal.setDepth(DEPTH.YSORT + crystal.y);
    this.ysortGroup.add(crystal);

    // Pulse crystal
    this.tweens.add({
      targets: crystal,
      y: crystal.y - 8,
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    crystal.expiryTime = this.time.now + 8000;

    // Explosion particle burst (color-coded by enemy type)
    const burstColor = enemy.isBoss ? 0xec4899 : (enemy.isFast ? 0x00ff66 : 0xff3333);
    this.spawnBurst(enemy.x, enemy.y - 10, burstColor, enemy.isBoss ? 26 : 11, enemy.isBoss ? 120 : 55);

    // Explosion animation
    enemy.play(enemy.isBoss ? 'boss_die' : 'virus_die');
    enemy.once('animationcomplete', () => {
      enemy.destroy();
    });

    if (enemy.isBoss) {
      this.bossDefeated = true;
      this.spawnFloatingText(enemy.x, enemy.y - 64, '木马清除成功！系统安全！', '#00ff66');
    }
  },


  collectCrystal(player, crystal) {
    if (!crystal.active) return;
    const cx = crystal.x;
    const cy = crystal.y;
    crystal.destroy();
    
    // Play Gold Diamond collect burst (Effect 5)
    const burst = this.add.sprite(cx, cy, 'crystal_burst');
    burst.setDepth(DEPTH.EFFECTS);
    burst.setScale(1.2);
    burst.play('anim_crystal_burst');
    burst.once('animationcomplete', () => burst.destroy());

    const gain = 10;
    this.score += gain;
    window.GameHUD?.setScore(this.score);

    this.spawnFloatingText(player.x, player.y - 48, `+10 💎`, '#fbbf24');
  }
});
