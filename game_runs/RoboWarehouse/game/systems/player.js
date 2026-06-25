/* RoboWarehouse — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  handlePlayerMove(dx, dy) {
    const nextX = this.player.gridX + dx;
    const nextY = this.player.gridY + dy;

    // 1. Boundary / Solid wall check
    if (this.isWall(nextX, nextY)) return;

    // 2. Check box
    const box = this.getBoxAt(nextX, nextY);
    if (box) {
      const beyondX = nextX + dx;
      const beyondY = nextY + dy;

      // Check if space beyond box is free
      if (!this.isWall(beyondX, beyondY) && !this.getBoxAt(beyondX, beyondY)) {
        // Capture pre-move state for undo, then push Box
        this.history.push(this.snapshotState());
        box.gridX = beyondX;
        box.gridY = beyondY;
        this.spawnBurst(beyondX * 64 + 32, beyondY * 64 + 32, 0xd1d5db, 7, 38);

        this.isTransitioning = true;

        // Animate Botty
        this.playWalkAnim(dx, dy);

        // Tween Box
        this.tweens.add({
          targets: box.sprite,
          x: beyondX * 64 + 32,
          y: beyondY * 64 + 32,
          duration: 180,
          onUpdate: () => {
            box.sprite.setDepth(DEPTH.YSORT + box.sprite.y);
          }
        });

        // Tween Player
        this.player.gridX = nextX;
        this.player.gridY = nextY;
        this.tweens.add({
          targets: this.player,
          x: nextX * 64 + 32,
          y: nextY * 64 + 32,
          duration: 180,
          onUpdate: () => {
            this.player.setDepth(DEPTH.YSORT + this.player.y);
          },
          onComplete: () => {
            this.player.anims.stop();
            this.checkConveyors();
          }
        });
      }
    } else {
      // Empty floor movement
      this.history.push(this.snapshotState());
      this.player.gridX = nextX;
      this.player.gridY = nextY;

      this.isTransitioning = true;
      
      this.playWalkAnim(dx, dy);

      this.tweens.add({
        targets: this.player,
        x: nextX * 64 + 32,
        y: nextY * 64 + 32,
        duration: 180,
        onUpdate: () => {
          this.player.setDepth(DEPTH.YSORT + this.player.y);
        },
        onComplete: () => {
          this.player.anims.stop();
          this.checkConveyors();
        }
      });
    }
  },


  playWalkAnim(dx, dy) {
    if (dy === 1) {
      if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== 'botty_walk_down') {
        this.player.play('botty_walk_down');
      }
    } else if (dy === -1) {
      if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== 'botty_walk_up') {
        this.player.play('botty_walk_up');
      }
    } else if (dx === 1) {
      if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== 'botty_walk_left') {
        this.player.play('botty_walk_left');
      }
      this.player.setFlipX(false); // Facing right
    } else if (dx === -1) {
      if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== 'botty_walk_left') {
        this.player.play('botty_walk_left');
      }
      this.player.setFlipX(true); // Mirror to face left
    }
  }
});
