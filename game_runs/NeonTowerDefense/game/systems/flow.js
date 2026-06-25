/* NeonTowerDefense — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  checkWinLose() {
    if (this.hearts <= 0) {
      this.triggerGameOver(false, "核心被攻破，数据库系统彻底崩溃！💻💾");
      return;
    }

    if (this.waveActive && this.enemiesSpawned >= this.totalEnemiesInWave && this.enemies.countActive() === 0) {
      this.waveActive = false;

      if (this.currentWave < this.maxWaves) {
        const nextWave = this.currentWave + 1;
        const waveWarnings = {
          2: `⚠ 波次 ${nextWave} 来袭：病毒已进化！快速病毒单元检测到接近中……`,
          3: this.currentLevel === 3
            ? `🔴 终极威胁：超级木马首领即将登场！全力防守！`
            : `⚠ 波次 ${nextWave} 来袭：木马程序全面渗透——加强防线！`
        };
        this.currentWave++;
        const warning = waveWarnings[this.currentWave] || `波次清理完毕！新波次将在 4 秒内抵达！`;
        window.GameHUD?.setObjective(warning);
        this.spawnFloatingText(640, 400, `安全检测：波次 ${this.currentWave - 1} 清理完成`, '#00ff66');
        this.time.delayedCall(4000, () => {
          this.startWave();
        });
      } else {
        this.handleLevelCleared();
      }
    }
  },


  showCyberBanner(lines, duration = 3000) {
    const existing = document.getElementById('cyber-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'cyber-banner';
    banner.style.cssText = `
      position:absolute; left:50%; transform:translateX(-50%); top:15%;
      z-index:100; pointer-events:none; text-align:center;
      background:rgba(0,10,30,0.88); border:1px solid #00ffff;
      border-radius:8px; padding:14px 28px; font-family:'Courier New',monospace;
      box-shadow:0 0 18px rgba(0,255,255,0.3);
    `;
    banner.innerHTML = lines.map((l, i) =>
      `<div style="color:${i===0?'#00ffff':'#a5f3fc'};font-size:${i===0?'16px':'12px'};
        font-weight:${i===0?'bold':'normal'};margin:2px 0;
        text-shadow:0 0 8px rgba(0,255,255,0.8)">${l}</div>`
    ).join('');
    const gameContainer = document.querySelector('#game-container') || document.body;
    gameContainer.appendChild(banner);

    this.time.delayedCall(duration, () => {
      banner.style.transition = 'opacity 0.5s';
      banner.style.opacity = '0';
      this.time.delayedCall(500, () => banner.remove());
    });
  },


  handleLevelCleared() {
    if (this.currentLevel < this.maxLevel) {
      const nextZone = this.currentLevel === 1 ? '内存缓冲区' : '数据库神殿';
      this.showCyberBanner([
        `✅ 防区净化成功！`,
        `进入下一防区：【${nextZone}】`,
        `病毒已溯源——根除核心木马，才能彻底安全！`
      ], 3000);
      this.currentLevel++;
      this.spawnFloatingText(640, 400, `网关净化成功！解锁下一防区`, '#00ff66');
      this.loadLevel(this.currentLevel);
      this.startLevelWaves();
    } else {
      if (this.bossDefeated) {
        this.gameCleared = true;
        this.triggerGameOver(true,
          '🏆 赛博核心已净化！\n\n' +
          '安全防御机甲以光速清除了所有病毒波次，\n' +
          '超级木马首领也在最终决战中被彻底摧毁。\n\n' +
          '整个数字世界重新回到了稳定运行状态，\n赛博网络的守护者赢得了终极战线的胜利！\n\n' +
          '>> 系统状态：安全 | 威胁等级：零 | 防护：完整 <<'
        );
      }
    }
  },


  triggerGameOver(isWin, endingText) {
    this.gameStarted = false;
    this.player.setVelocity(0, 0);

    if (this.waveTimer) { this.waveTimer.destroy(); this.waveTimer = null; }

    window.GameHUD?.showGameOver(isWin, endingText);
  }
});
