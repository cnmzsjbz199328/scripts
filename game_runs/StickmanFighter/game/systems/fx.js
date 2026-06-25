/* StickmanFighter — fx 系统（增补 MainScene 原型）
 * 由 game-logic.js 单体机械拆分而来；方法体逐字保留，PvP 已移除。 */
Object.assign(MainScene.prototype, {
  applyHitStop() {
    this.physics.pause();
    this.player.anims.pause();
    if (this.p2) this.p2.anims.pause();
    this.enemies.getChildren().forEach(e => e.anims.pause());

    this.time.delayedCall(60, () => {
      // Don't resume if we're in a PvP round-transition freeze
      if (this.isPvP && !this.pvpRoundActive) return;
      this.physics.resume();
      if (this.player.active) this.player.anims.resume();
      if (this.p2 && this.p2.active) this.p2.anims.resume();
      this.enemies.getChildren().forEach(e => {
        if (e.active) e.anims.resume();
      });
    });
  },

  spawnSparks(x, y, color) {
    const graphics = this.add.graphics({ x: x, y: y });
    graphics.setDepth(DEPTH.EFFECTS);
    graphics.lineStyle(3, color, 1.0);

    // Draw Cross
    graphics.beginPath();
    graphics.moveTo(-16, 0);
    graphics.lineTo(16, 0);
    graphics.moveTo(0, -16);
    graphics.lineTo(0, 16);
    graphics.strokePath();

    // Draw X
    graphics.beginPath();
    graphics.moveTo(-11, -11);
    graphics.lineTo(11, 11);
    graphics.moveTo(11, -11);
    graphics.lineTo(-11, 11);
    graphics.strokePath();

    this.tweens.add({
      targets: graphics,
      scaleX: 2.2,
      scaleY: 2.2,
      alpha: 0,
      angle: 45,
      duration: 250,
      onComplete: () => graphics.destroy()
    });
  },

  spawnDust(x, y) {
    const dust = this.add.text(x, y, '💨', { font: '16px Arial' }).setOrigin(0.5, 1);
    dust.setDepth(DEPTH.EFFECTS);

    this.tweens.add({
      targets: dust,
      y: y - 30,
      x: x + Phaser.Math.Between(-20, 20),
      scaleX: 1.7,
      scaleY: 1.7,
      alpha: 0,
      duration: 450,
      ease: 'Cubic.easeOut',
      onComplete: () => dust.destroy()
    });
  },

  spawnFloatingText(x, y, textString, color) {
    const text = this.add.text(x, y, textString, {
      font: 'bold 13px Courier',
      fill: color,
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);
    text.setDepth(DEPTH.EFFECTS);
    
    this.tweens.add({
      targets: text,
      y: y - 50,
      alpha: 0,
      duration: 1000,
      onComplete: () => text.destroy()
    });
  },

  spawnFloatingItem(x, y, iconStr, color) {
    const itemText = this.add.text(x, y, iconStr, { font: '24px Arial' }).setOrigin(0.5);
    itemText.setDepth(DEPTH.EFFECTS);
    
    this.tweens.add({
      targets: itemText,
      y: y - 40,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => itemText.destroy()
    });
  }

  // --- Hazard Mechanics: Barrels & Electric Mesh ---
});
