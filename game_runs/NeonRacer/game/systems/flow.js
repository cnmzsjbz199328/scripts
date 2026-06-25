/* NeonRacer — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  triggerGameOver(isWin, endingText) {
    if (this.victoryShown || this.defeatShown) return;
    if (isWin) this._won = true; else this._lost = true;
    if (isWin) {
      this.victoryShown = true;
    } else {
      this.defeatShown = true;
    }

    this.physics.pause();
    this.player.setVelocity(0, 0);
    this.player.anims.stop();

    if (!isWin) {
      this.player.play('crash');
    }

    // Call GameHUDGameOver Integration
    window.GameHUD?.showGameOver(isWin, endingText);
    this.gameStarted = false;
  }
});
