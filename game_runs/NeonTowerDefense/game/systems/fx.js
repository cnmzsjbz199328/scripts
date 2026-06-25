/* NeonTowerDefense — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  // Code-drawn particle burst (no asset dependency) for kills and dismantles.
  spawnBurst(x, y, color, count = 10, spread = 55) {
    for (let i = 0; i < count; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.FloatBetween(spread * 0.3, spread);
      const p = this.add.circle(x, y, Phaser.Math.Between(2, 5), color, 0.9);
      p.setDepth(DEPTH.EFFECTS);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(300, 500),
        ease: 'Quad.easeOut',
        onComplete: () => p.destroy()
      });
    }
  },


  spawnSparks(x, y, color) {
    const graphics = this.add.graphics({ x: x, y: y });
    graphics.setDepth(DEPTH.EFFECTS);
    graphics.lineStyle(2.5, color, 1.0);

    graphics.beginPath();
    graphics.moveTo(-10, 0);
    graphics.lineTo(10, 0);
    graphics.moveTo(0, -10);
    graphics.lineTo(0, 10);
    graphics.strokePath();

    this.tweens.add({
      targets: graphics,
      scaleX: 2.0,
      scaleY: 2.0,
      alpha: 0,
      duration: 220,
      onComplete: () => graphics.destroy()
    });
  },


  spawnFloatingText(x, y, textString, color) {
    const text = this.add.text(x, y, textString, {
      font: 'bold 14px Courier',
      fill: color,
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);
    text.setDepth(DEPTH.EFFECTS);

    this.tweens.add({
      targets: text,
      y: y - 35,
      alpha: 0,
      duration: 1200,
      onComplete: () => text.destroy()
    });
  }
});
