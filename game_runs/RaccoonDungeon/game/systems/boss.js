/* RaccoonDungeon — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  createBossHealthBar() {
    this.bossBarContainer = this.add.container(this.sys.game.config.width / 2, 50).setScrollFactor(0).setDepth(DEPTH.EFFECTS + 90);
    
    // Background bar
    const bg = this.add.rectangle(0, 0, 360, 24, 0x1e293b).setOrigin(0.5);
    // Fill bar
    const bar = this.add.rectangle(-176, 0, 352, 16, 0xef4444).setOrigin(0, 0.5);
    bar.setName('barFill');

    // Title
    const title = this.add.text(0, -26, 'BOSS: 黑雾守护者龙', {
      font: 'bold 16px monospace',
      fill: '#fef08a',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);

    this.bossBarContainer.add([bg, bar, title]);
  },


  updateBossHealthBar(hp, maxHp) {
    if (!this.bossBarContainer) return;
    const bar = this.bossBarContainer.getByName('barFill');
    if (bar) {
      const ratio = Math.max(0, hp / maxHp);
      bar.setSize(352 * ratio, 16);
    }
  },


  destroyBossHealthBar() {
    if (this.bossBarContainer) {
      this.bossBarContainer.destroy();
      this.bossBarContainer = null;
    }
  },


  // -------------------------------------------------------------
  // GAME OVER / WIN MANAGEMENT
  // -------------------------------------------------------------
  handleGameOver(win) {
    this.gameStarted = false;
    if (win) this._won = true; else this._lost = true;
    if (this.player && this.player.body) this.player.body.setVelocity(0);

    if (win) {
      window.GameHUD?.showGameOver(true,
        '🌟 黑雾消散！\n\n' +
        '你击败了黑雾核心守护者——那条被腐蚀的古老巨龙。\n' +
        '随着龙的倒下，黑雾如同被春风吹散，\n' +
        '遗迹的裂缝中，一缕缕温暖的阳光重新渗透进来。\n\n' +
        '小浣熊法师带着秘宝欢快地回到了阳光明媚的森林，\n' +
        '鸟儿歌唱，花朵盛开，一切都恢复了生机。\n\n' +
        '吉卜力遗迹，永远记住了这位茸茸帽法师的名字。'
      );
    } else {
      window.GameHUD?.showGameOver(false,
        '🌑 法师倒下了……\n\n' +
        '黑雾紧紧包裹住了小浣熊，法杖从手中滑落……\n' +
        '遗迹深处，巨龙的低鸣再次响彻石壁。\n\n' +
        '但茸茸帽里，还有最后一颗光之晶核……\n也许，这不是终点。'
      );
    }
  }
});
