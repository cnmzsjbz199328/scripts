/* MermaidPrincess — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  showOceanNarration(lines, duration = 3000) {
    const existing = document.getElementById('ocean-narration');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'ocean-narration';
    banner.style.cssText = `
      position:absolute; left:50%; transform:translateX(-50%); top:12%;
      z-index:100; pointer-events:none; text-align:center;
      background:rgba(0,20,60,0.85); border:1px solid #67e8f9;
      border-radius:12px; padding:14px 28px; font-family:'Segoe UI',sans-serif;
      box-shadow:0 0 20px rgba(103,232,249,0.3);
    `;
    banner.innerHTML = lines.map((l, i) =>
      `<div style="color:${i===0?'#67e8f9':'#e0f2fe'};font-size:${i===0?'17px':'13px'};
        font-weight:${i===0?'bold':'normal'};margin:3px 0;
        text-shadow:0 0 10px rgba(103,232,249,0.6)">${l}</div>`
    ).join('');
    const gameContainer = document.querySelector('#game-container') || document.body;
    gameContainer.appendChild(banner);

    this.time.delayedCall(duration, () => {
      banner.style.transition = 'opacity 0.5s';
      banner.style.opacity = '0';
      this.time.delayedCall(500, () => banner.remove());
    });
  },


  triggerWinGame() {
    if (this.victoryShown) return;
    this.victoryShown = true;
    this._won = true;
    this.gameStarted = false;
    this.player.setVelocity(0, 0);
    window.GameHUD?.showGameOver(true,
      '🐚 海洋王国重获和平！\n\n' +
      `爱丽儿公主收集了 ${this.score} 颗璀璨珍珠，\n` +
      '穿越了珊瑚礁、水母荧光林与神秘沉船宝窟。\n\n' +
      '珍珠的圣洁光芒汇聚成一道彩虹光柱，\n' +
      '驱散了海洋中所有的怪物与黑暗。\n\n' +
      '阳光再次穿透深海，照耀在粉色珊瑚与摇曳海草之上——\n' +
      '这片海洋，将永远铭记美人鱼公主的勇敢与善良。'
    );
  }
});
