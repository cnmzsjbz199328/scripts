/* NeonRacer — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  spawnFloatingText(x, y, textString, color) {
    const text = this.add.text(x, y - 10, textString, {
      font: 'bold 12px monospace',
      fill: color,
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);
    text.setDepth(DEPTH.EFFECTS);
    
    this.tweens.add({
      targets: text,
      y: y - 45,
      alpha: 0,
      duration: 1000,
      onComplete: () => text.destroy()
    });
  },


  // Code-drawn particle burst (no asset dependency) for trails, sparks, pickups.
  spawnBurst(x, y, color, count = 8, spread = 60) {
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


  spawnFloatingItem(x, y, iconStr, color) {
    const itemText = this.add.text(x, y, iconStr, { font: '24px Arial' }).setOrigin(0.5);
    itemText.setDepth(DEPTH.YSORT + y);
    
    this.tweens.add({
      targets: itemText,
      y: y - 50,
      alpha: 0,
      scaleX: 1.6,
      scaleY: 1.6,
      duration: 1200,
      ease: 'Cubic.easeOut',
      onComplete: () => itemText.destroy()
    });
  }
});
