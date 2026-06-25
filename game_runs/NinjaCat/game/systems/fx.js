/* NinjaCat — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  // Code-drawn particle burst (no asset dependency). Spawns short-lived
  // circles that fly outward and fade — used for jumps, coins and squishes.
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


  showFloatingText(x, y, text, color) {
    const txt = this.add.text(x, y, text, {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '18px',
      fontWeight: 'bold',
      fill: color,
      stroke: '#000000',
      strokeThickness: 4
    });
    txt.setOrigin(0.5);
    txt.setDepth(DEPTH.EFFECTS);

    this.tweens.add({
      targets: txt,
      y: y - 50,
      alpha: 0,
      duration: 1000,
      onComplete: () => txt.destroy()
    });
  }
});
