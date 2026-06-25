/* PixelFarm — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  showVictoryScreen() {
    if (this.victoryShown) return;
    this.victoryShown = true;

    this.physics.pause();
    this.player.setVelocity(0, 0);
    this.player.anims.stop();

    // GameHUD Integration
    window.GameHUD?.showGameOver(true,
      '🌻 家族传承 — 圆满！\n\n' +
      '黄金种子在篝火的温暖下，悄然绽放成璀璨的金黄色花朵。\n\n' +
      '那一刻，仿佛能听见祖父的声音从远方传来：\n"孩子……你做到了。这片土地，又活了。"\n\n' +
      '山谷中的篝火燃得更旺了，鸟儿归巢，星光初现。\n' +
      '农场，回来了。'
    );
    this.gameStarted = false;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x0f172a, 0.9);
    overlay.fillRect(0, 0, 800, 600);
    overlay.setScrollFactor(0);
    overlay.setDepth(DEPTH.EFFECTS);

    const title = this.add.text(400, 200, 'LEGACY RESTORED! 🏆', {
      font: 'bold 36px monospace',
      fill: '#fbbf24',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.EFFECTS + 1);

    const subtitle = this.add.text(400, 285, "You grew the Golden Flower and saved Grandfather's Farm!", {
      font: '16px monospace',
      fill: '#f8fafc'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.EFFECTS + 1);

    const statsText = `Tomatoes Shipped: ${this.tomatoesShipped}\nTotal Days Elapsed: ${this.dayCount}\nGold Earned: $${this.gold}`;
    const stats = this.add.text(400, 360, statsText, {
      font: '14px monospace',
      fill: '#94a3b8',
      align: 'center',
      lineSpacing: 8
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.EFFECTS + 1);

    const restartText = this.add.text(400, 460, 'Press R to Restart Game', {
      font: 'bold 16px monospace',
      fill: '#60a5fa'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.EFFECTS + 1);

    this.tweens.add({
      targets: title,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
  }
});
