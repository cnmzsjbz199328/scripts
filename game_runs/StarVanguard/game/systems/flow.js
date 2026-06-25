/* StarVanguard — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  // ── Boss defeat & Level transition logic ──
  triggerBossDefeat() {
    this.boss.active = false;
    this.bossHealthBar.clear();
    this.bossShieldGraphics.clear();
    this.laserGraphics.clear();
    this.stopLaserHum();

    // Spawn crystals explosion
    for (let i = 0; i < 15; i++) {
      const c = this.crystals.create(this.boss.x + Phaser.Math.Between(-80, 80), this.boss.y + Phaser.Math.Between(-40, 40), 'crystal');
      c.setDepth(DEPTH.CRYSTALS);
      c.setVelocity(Phaser.Math.Between(-150, 150), Phaser.Math.Between(-100, 200));
    }

    // Chain explosions
    let explCount = 0;
    const explEvent = this.time.addEvent({
      delay: 200,
      repeat: 8,
      callback: () => {
        explCount++;
        sounds.playExplosion(true);
        this.cameras.main.shake(200, 0.02);
        
        // Spawn particles at center
        const bx = this.boss.x + Phaser.Math.Between(-100, 100);
        const by = this.boss.y + Phaser.Math.Between(-50, 50);
        this.createSparks(bx, by, 0xf97316, 25);
        this.createSparks(bx, by, 0xfde047, 25);
        
        if (explCount >= 8) {
          // Final destroy
          this.explodeEntity(this.boss, 'large');
          this.boss.destroy();
          this.triggerGameOver(true);
        }
      }
    });
  },


  triggerLevelClear() {
    this.levelComplete = true;
    this.levelTransitionTimer = 2200; // 2.2 seconds wait

    // clear all active bullets, enemies, asteroids
    this.asteroids.getChildren().forEach(ast => {
      this.createSparks(ast.x, ast.y, 0x94a3b8, 10);
      ast.destroy();
    });
    this.enemies.getChildren().forEach(enemy => {
      this.createSparks(enemy.x, enemy.y, 0xef4444, 10);
      enemy.destroy();
    });
    this.playerBullets.clear(true, true);
    this.enemyBullets.clear(true, true);

    // Display "LEVEL CLEAR" text banner
    this.levelText = this.add.text(400, 280, 'LEVEL CLEAR', {
      fontFamily: 'monospace',
      fontSize: '48px',
      fontWeight: 'bold',
      fill: '#4ade80'
    }).setOrigin(0.5).setDepth(DEPTH.HUD_OVERLAY);

    sounds.playLevelUp();
    this.cameras.main.flash(300, 74, 222, 128); // Green flash
  },


  showCinematicBanner(lines, duration = 3000) {
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;
    const bg = this.add.rectangle(cx, cy, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.78)
      .setScrollFactor(0).setDepth(DEPTH.HUD_OVERLAY + 50);
    const textObjs = lines.map((line, i) => {
      const y = cy - (lines.length * 16) + i * 32;
      const isTitle = i === 0;
      return this.add.text(cx, y, line, {
        font: `${isTitle ? 'bold ' : ''}${isTitle ? '22px' : '14px'} monospace`,
        fill: isTitle ? '#f59e0b' : '#e2e8f0',
        stroke: '#000000',
        strokeThickness: 3,
        align: 'center'
      }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.HUD_OVERLAY + 51);
    });
    this.time.delayedCall(duration, () => {
      bg.destroy();
      textObjs.forEach(t => t.destroy());
    });
  },


  transitionToNextLevel() {
    if (this.levelText) this.levelText.destroy();
    this.levelComplete = false;
    this.levelScore = 0;
    this.currentLevel++;

    if (this.currentLevel === 2) {
      window.GameHUD?.setObjective("第二关：击溃敌舰先锋编队！ (击落15架敌机)");
      this.nextSpawnTime = this.time.now + 1000;
      this.showCinematicBanner([
        '⚠ 第二关：帝国舰队先锋编队',
        '穿出陨石带，前方是帝国巡逻编队。',
        '15架战机已进入交战范围——',
        '全力开炮，击溃先锋！'
      ], 3000);
    } else if (this.currentLevel === 3) {
      window.GameHUD?.setObjective("终极关卡：决战星际堡垒要塞！");
      this.nextSpawnTime = this.time.now + 1000;
      this.showCinematicBanner([
        '🔴 终极关卡：星际堡垒',
        '帝国最强防御工事正前方出现。',
        '双联炮塔、能量护盾、核心死亡射线……',
        '这是最后的战役。先锋号，全力冲刺！'
      ], 3500);
    }
  },


  triggerGameOver(win) {
    if (this.gameOverTriggered) return;
    this.gameOverTriggered = true;
    if (win) this._won = true; else this._lost = true;
    this.physics.pause();
    this.stopLaserHum();

    if (win) {
      // Victory screen
      window.GameHUD?.showGameOver(true,
        '🌟 银河系得救了！\n\n' +
        '先锋号战机单枪匹马，穿越陨石风暴、击溃舰队先锋，\n' +
        '摧毁了帝国最强大的防御壁垒——星际堡垒。\n\n' +
        '核心爆炸的冲击波在宇宙中蔓延，\n如同第二颗太阳照亮了整个星系。\n\n' +
        '自由星系广播响彻银河：先锋号归来！'
      );
    } else {
      // Defeat screen
      this.explodeEntity(this.player, 'large');
      this.player.destroy();
      sounds.playExplosion(true);

      this.time.delayedCall(1200, () => {
        window.GameHUD?.showGameOver(false,
          '💀 先锋号坠毁\n\n' +
          '帝国防线坚不可摧，战机在炮火中化为灰烬……\n' +
          '星际堡垒启动超时空炮，星系的命运悬于一线。\n\n' +
          '但先锋号的牺牲绝不会被遗忘。\n也许，下一次会有所不同。'
        );
      });
    }
  }
});
