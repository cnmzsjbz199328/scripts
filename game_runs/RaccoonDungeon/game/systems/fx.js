/* RaccoonDungeon — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  // -------------------------------------------------------------
  // AUDIO-VISUAL & EFFECTS POLISHING
  // -------------------------------------------------------------
  createSparks(x, y, color = 0xffffff, count = 8) {
    for (let i = 0; i < count; i++) {
      const sp = this.add.circle(x, y, Math.random() * 4 + 2, color);
      sp.setDepth(DEPTH.EFFECTS);
      
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 150 + 50;

      this.physics.add.existing(sp);
      sp.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

      // Fade out
      this.tweens.add({
        targets: sp,
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        duration: Math.random() * 400 + 300,
        onComplete: () => {
          sp.destroy();
        }
      });
    }
  },


  createSwipeEffect(x, y) {
    const swipe = this.add.circle(x, y, 40, 0xfef08a, 0.3);
    swipe.setDepth(DEPTH.EFFECTS);
    this.tweens.add({
      targets: swipe,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 250,
      onComplete: () => {
        swipe.destroy();
      }
    });
  },


  createHealingSparkles() {
    for (let i = 0; i < 15; i++) {
      this.time.delayedCall(i * 80, () => {
        if (!this.player.active) return;
        const hx = this.player.x + (Math.random() - 0.5) * 50;
        const hy = this.player.y + (Math.random() - 0.5) * 60;
        const sparkle = this.add.circle(hx, hy, Math.random() * 3 + 2, 0x4ade80);
        sparkle.setDepth(DEPTH.EFFECTS);

        this.physics.add.existing(sparkle);
        sparkle.body.setVelocity(0, -100);

        this.tweens.add({
          targets: sparkle,
          alpha: 0,
          scaleX: 0.2,
          scaleY: 0.2,
          duration: 600,
          onComplete: () => sparkle.destroy()
        });
      });
    }
  },


  flashScreen(color, alpha) {
    this.flashOverlay.setFillStyle(color);
    this.flashOverlay.setAlpha(alpha);
    this.tweens.add({
      targets: this.flashOverlay,
      alpha: 0,
      duration: 350
    });
  },


  showFloatingText(x, y, message, color = '#ffffff') {
    const txt = this.add.text(x, y, message, {
      font: 'bold 22px monospace',
      fill: color,
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);
    txt.setDepth(DEPTH.EFFECTS + 50);

    this.tweens.add({
      targets: txt,
      y: y - 60,
      alpha: 0,
      duration: 900,
      onComplete: () => {
        txt.destroy();
      }
    });
  }
});
