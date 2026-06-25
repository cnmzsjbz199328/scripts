/* NinjaStealth — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  completeLevel() {
    const levelBriefs = [
      null,
      ['🥷 任务：敌营仓库', '城堡庭院已清理，卷轴在握。', '情报显示：第二份卷轴藏于敌营仓库深处。', '守卫已更换阵型，小心视野锥——行动！'],
      ['🥷 终极任务：将军御所', '两份卷轴已到手。最后一份……', '就在将军寝殿之内。', '警戒级别最高，一旦暴露将引来全军围攻。', '沉住气，为了幕府的和平，这是最后一战！']
    ];

    if (this.currentLevel === 3) {
      this.gameOver(true);
    } else {
      this.currentLevel++;
      sfx.play('win_level');
      const brief = levelBriefs[this.currentLevel - 1];
      if (brief) {
        this.gameStarted = false;
        this.showNarrativeBanner(brief, 3000, () => {
          this.loadLevel(this.currentLevel);
          this.gameStarted = true;
        });
      } else {
        this.loadLevel(this.currentLevel);
      }
    }
  },


  gameOver(win) {
    this.gameStarted = false;
    if (win) this._won = true; else this._lost = true;
    this.player.body.setVelocity(0, 0);

    if (win) {
      sfx.play('win_level');
      window.GameHUD?.showGameOver(true,
        '🥷 任务完成！\n\n黑影（Kage）成功从将军御所取回了全部九份机密卷轴，\n' +
        '穿越城堡庭院、敌营仓库与将军寝殿，如同一道无声的风影。\n\n' +
        '幕府将这些情报秘密送达了天皇御所——\n将军的政权土崩瓦解，动乱的国家重归和平。\n\n' +
        '没有人知道那个夜晚究竟发生了什么，\n只有风，见证了影的归来。'
      );
    } else {
      sfx.play('damage');
      window.GameHUD?.showGameOver(false,
        '⚠️ 任务失败\n\n守卫发现了你的踪迹，鸣钟示警！\n' +
        '在重重包围下，黑影负伤倒地……\n\n' +
        '情报卷轴仍在将军手中。\n幕府的命运，悬于一线。'
      );
    }
  }
});
