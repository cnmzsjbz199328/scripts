/* NeonRacer — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  collectBattery(player, battery) {
    this.spawnBurst(battery.x, battery.y, 0x10b981, 10, 50);
    battery.destroy();
    
    // Increase speed/score
    this.score += 20;
    window.GameHUD?.setScore(this.score);
    this.spawnFloatingText(battery.x, battery.y, '+20 速度 ⚡', '#10b981');
    
    // Spawn sparkle effect
    this.spawnFloatingItem(battery.x, battery.y, '✨', '#10b981');
  },


  hitRoadblock(player, roadblock) {
    roadblock.destroy();
    
    this.hearts--;
    window.GameHUD?.setHearts(this.hearts, 3);
    this.cameras.main.shake(150, 0.015);
    this.spawnFloatingText(roadblock.x, roadblock.y, '-1 护盾 💥', '#ef4444');
    
    // Flashing visual red tint feedback
    this.player.setTint(0xff3333);
    this.time.delayedCall(300, () => {
      this.player.clearTint();
    });

    if (this.hearts <= 0) {
      this.triggerGameOver(false, '护盾完全破损！赛车在巨大的冲击下熄火损毁。');
    }
  }
});
