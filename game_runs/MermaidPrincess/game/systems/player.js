/* MermaidPrincess — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  collectPearl(player, pearl) {
    this.spawnBurst(pearl.x, pearl.y, 0xa5f3fc, 10, 50);
    pearl.destroy();
    this.score += 1;
    window.GameHUD?.setScore(this.score);
    this.showFloatingText(pearl.x, pearl.y - 20, '+1 珍珠 🐚', '#a5f3fc');

    // Win condition check on pick
    if (this.score >= 100 && this.currentLevel === 3 && this.levelCompleted) {
      this.triggerWinGame();
    }
  },


  handleEnemyCollision(player, enemy) {
    // Check if player lands on top of the enemy (stomping)
    const isSquishing = player.body.velocity.y > 0 && player.y < enemy.y - 15;

    if (isSquishing) {
      player.setVelocityY(-300); // Bounce upwards
      const name = enemy.charKey === 'shark' ? '鲨鱼' : '章鱼怪';
      this.spawnBurst(enemy.x, enemy.y, 0xfbc531, 14, 75);
      enemy.destroy();
      this.score += 5;
      window.GameHUD?.setScore(this.score);
      this.showFloatingText(enemy.x, enemy.y - 20, `击败${name} +5 珍珠`, '#fbc531');

      if (this.score >= 100 && this.currentLevel === 3 && this.levelCompleted) {
        this.triggerWinGame();
      }
    } else {
      this.damagePlayer();
    }
  },


  handleHazardCollision(player, hazard) {
    this.damagePlayer();
  },


  damagePlayer() {
    if (this.isInvincible) return;

    this.hearts--;
    window.GameHUD?.setHearts(this.hearts, 3);
    this.showFloatingText(this.player.x, this.player.y - 40, '-1 生命 💔', '#ff5555');

    if (this.hearts <= 0) {
      this.gameStarted = false;
      this._lost = true;
      this.player.setVelocity(0, 0);
      this.player.setTint(0xff5555);
      window.GameHUD?.showGameOver(false, '爱丽儿公主精疲力竭，在深海中陷入了沉睡……');
    } else {
      this.isInvincible = true;
      // knock back
      this.player.setVelocity(-180 * (this.player.flipX ? -1 : 1), -200);
      
      // Flash transparency
      this.tweens.add({
        targets: this.player,
        alpha: 0.3,
        duration: 150,
        yoyo: true,
        repeat: 5,
        onComplete: () => {
          this.player.alpha = 1.0;
          this.isInvincible = false;
        }
      });
    }
  },


  handleDoorReached(player, door) {
    this.physics.world.disable(door);
    this.player.setVelocity(0, 0);
    this.levelCompleted = true;

    if (this.currentLevel === 3) {
      this.gameStarted = false;
      if (this.score >= 100) {
        this.triggerWinGame();
      } else {
        window.GameHUD?.showGameOver(false, `你到达了终点！但你只收集了 ${this.score} 颗珍珠，还不够100颗，请重新挑战！`);
      }
    } else {
      this.showFloatingText(this.player.x, this.player.y - 40, '通关！🌊', '#50fa7b');
      this.gameStarted = false;
      this.player.setVelocity(0, 0);
      
      // Delay level transition with story narration
      const levelStories = {
        2: ['🌊 第二关：水母荧光林', '珊瑚礁已在身后闪闪发光……', '前方是神秘的水母森林，荧光生物在黑暗中漂浮。', '小心电水母！它们的触手会让爱丽儿陷入麻痹！'],
        3: ['🚢 第三关：沉船宝窟', '水母林已被珍珠的光芒净化！', '最后的秘密就在那艘古老的沉船之中……', '传说百年前，海洋之王将至宝藏于船舱深处。', '收集满100颗珍珠，打开宝窟之门！']
      };

      this.time.delayedCall(1200, () => {
        this.currentLevel++;
        const story = levelStories[this.currentLevel];
        if (story) this.showOceanNarration(story, 3200);
        this.loadLevel(this.currentLevel);
        this.gameStarted = true;
      });
    }
  }
});
