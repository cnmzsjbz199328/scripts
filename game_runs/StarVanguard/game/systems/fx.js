/* StarVanguard — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  // ── Particle Sparks Effect & Explosion helpers ──
  createSparks(x, y, color = 0xffffff, count = 15) {
    const graphics = this.add.graphics();
    graphics.setDepth(DEPTH.EFFECTS);
    
    const particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: x,
        y: y,
        vx: Phaser.Math.Between(-250, 250),
        vy: Phaser.Math.Between(-250, 250),
        alpha: 1.0,
        size: Phaser.Math.Between(2, 4)
      });
    }

    const timer = this.time.addEvent({
      delay: 16,
      repeat: 24,
      callback: () => {
        graphics.clear();
        particles.forEach(p => {
          p.x += p.vx * 0.016;
          p.y += p.vy * 0.016;
          p.alpha -= 0.04;
          graphics.fillStyle(color, Math.max(0, p.alpha));
          graphics.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
        });
      },
      onComplete: () => {
        graphics.destroy();
      }
    });
  },


  explodeEntity(entity, size = 'small') {
    const color = (entity.texture.key === 'asteroid_large' || entity.texture.key === 'asteroid_small') 
      ? 0x94a3b8  // Grey debris
      : 0xef4444; // Red/orange flame
    
    // Spawn debris sparks
    this.createSparks(entity.x, entity.y, color, size === 'large' ? 30 : 15);
    
    // Drop energy crystal (40% drop rate, only from enemies/asteroids, not bullets/boss core)
    const canDrop = entity.texture.key !== 'player_ship' && entity.texture.key !== 'boss_core';
    if (canDrop && Math.random() < 0.40) {
      const crystal = this.crystals.create(entity.x, entity.y, 'crystal');
      crystal.setDepth(DEPTH.CRYSTALS);
      crystal.setVelocityY(100);
      crystal.setAngularVelocity(Phaser.Math.Between(100, 200));
    }
  }
});
