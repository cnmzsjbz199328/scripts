/* NinjaCat — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  handleDoorReached(player, door) {
    this.physics.world.disable(door);
    this.player.setVelocity(0, 0);

    const levelTransitionStories = {
      2: ['🏯 第二关：城堡屋顶', '竹林已被小爪的足迹踏遍！', '金币的香气从高耸的城堡屋顶飘来……', '武士机器人在瓦片上巡逻，小心别踩空！'],
      3: ['☁️ 第三关：云端仙境', '城堡制高点已被征服！', '传说中漂浮在云端的金库就在眼前……', '这是最后的冲刺——收满100枚金币，成为传奇！']
    };

    if (this.currentLevel === 3) {
      this.gameStarted = false;
      if (this.score >= 100) {
        this._won = true;
        window.GameHUD?.showGameOver(true,
          '🏆 猫咪忍者传奇！\n\n' +
          `小爪收集了 ${this.score} 枚金币，\n` +
          '横跨竹林深处、城堡屋顶与云端仙境，\n' +
          '击退了所有入侵的武士机器人。\n\n' +
          '金币的光芒照耀着猫咪村庄——\n所有村民都为这位小小忍者欢呼喝彩！\n\n' +
          '小爪，猫咪村庄的传奇，从此诞生。'
        );
      } else {
        window.GameHUD?.showGameOver(false,
          `到达终点！但只收集了 ${this.score} 枚金币，\n未达到100枚的胜利要求。\n\n` +
          '金币还在等待你……再来一次吧！'
        );
      }
    } else {
      this.showFloatingText(this.player.x, this.player.y - 40, '通关！', '#22c55e');
      this.gameStarted = false;
      this.player.setVelocity(0, 0);

      // Show level transition story
      const nextLevelStory = levelTransitionStories[this.currentLevel + 1];
      if (nextLevelStory) this.showNinjaStory(nextLevelStory, 3000);

      // Delay level transition
      this.time.delayedCall(1200, () => {
        this.currentLevel++;
        this.loadLevel(this.currentLevel);
        this.gameStarted = true;
      });
    }
  },


  showNinjaStory(lines, duration = 2800) {
    const existing = document.getElementById('ninja-cat-story');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'ninja-cat-story';
    banner.style.cssText = `
      position:absolute; left:50%; transform:translateX(-50%); top:10%;
      z-index:100; pointer-events:none; text-align:center;
      background:rgba(0,0,0,0.80); border:1px solid #f59e0b;
      border-radius:10px; padding:12px 24px; font-family:'Segoe UI',sans-serif;
    `;
    banner.innerHTML = lines.map((l, i) =>
      `<div style="color:${i===0?'#f59e0b':'#fef9c3'};font-size:${i===0?'16px':'13px'};
        font-weight:${i===0?'bold':'normal'};margin:2px 0;
        text-shadow:0 0 8px rgba(245,158,11,0.6)">${l}</div>`
    ).join('');
    const gameContainer = document.querySelector('#game-container') || document.body;
    gameContainer.appendChild(banner);

    this.time.delayedCall(duration, () => {
      banner.style.transition = 'opacity 0.5s';
      banner.style.opacity = '0';
      this.time.delayedCall(500, () => banner.remove());
    });
  }
});
