/* NinjaStealth — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  // Small non-blocking toast for item pickups — does not dim the screen or pause gameplay
  showPickupToast(lines, duration = 1800) {
    const existing = document.getElementById('ninja-pickup-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'ninja-pickup-toast';
    toast.style.cssText = `
      position:absolute; bottom:80px; left:50%; transform:translateX(-50%);
      z-index:100; padding:10px 24px; pointer-events:none;
      background:rgba(0,0,0,0.72); border:1px solid #f59e0b;
      border-radius:6px; font-family:'Courier New',monospace; text-align:center;
    `;
    toast.innerHTML = lines.map((l, i) =>
      `<div style="color:${i===0?'#f59e0b':'#e2e8f0'};font-size:${i===0?'15px':'12px'};
        font-weight:${i===0?'bold':'normal'};margin:2px 0;
        text-shadow:0 0 8px rgba(245,158,11,0.6);letter-spacing:1px">${l}</div>`
    ).join('');
    const gameContainer = document.querySelector('#game-container') || document.body;
    gameContainer.appendChild(toast);

    this.time.delayedCall(duration, () => {
      toast.style.transition = 'opacity 0.4s';
      toast.style.opacity = '0';
      this.time.delayedCall(400, () => toast.remove());
    });
  },


  showNarrativeBanner(lines, duration = 3000, callback = null) {
    const existing = document.getElementById('ninja-narration');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'ninja-narration';
    banner.style.cssText = `
      position:absolute; inset:0; z-index:100; display:flex; flex-direction:column;
      align-items:center; justify-content:center; pointer-events:none;
      background:rgba(0,0,0,0.80); font-family:'Courier New',monospace;
    `;
    banner.innerHTML = lines.map((l, i) =>
      `<div style="color:${i===0?'#f59e0b':'#e2e8f0'};font-size:${i===0?'19px':'14px'};
        font-weight:${i===0?'bold':'normal'};text-align:center;margin:3px 40px;
        text-shadow:0 0 10px rgba(245,158,11,0.7);letter-spacing:1px">${l}</div>`
    ).join('');
    const gameContainer = document.querySelector('#game-container') || document.body;
    gameContainer.appendChild(banner);

    this.time.delayedCall(duration, () => {
      banner.style.transition = 'opacity 0.5s';
      banner.style.opacity = '0';
      this.time.delayedCall(500, () => { banner.remove(); if (callback) callback(); });
    });
  },


  spawnSparkles(x, y, color = 0xfbbf24) {
    for (let i = 0; i < 8; i++) {
      const p = this.add.circle(x, y, 4, color).setDepth(DEPTH.EFFECTS);
      this.physics.add.existing(p);
      p.body.setVelocity(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-100, 100));
      this.tweens.add({
        targets: p,
        alpha: 0,
        scale: 0.1,
        duration: 500,
        onComplete: () => p.destroy()
      });
    }
  },


  spawnSmokeCloud(x, y) {
    const cloud = this.smokeClouds.create(x, y, 'smoke_cloud');
    cloud.body.setCircle(70);
    cloud.body.setOffset(-6, -6);
    cloud.play('smoke_puff');
    cloud.setDepth(DEPTH.EFFECTS);

    // Shake camera slightly on explosion
    this.cameras.main.shake(150, 0.005);

    // Destroy smoke cloud after 5 seconds
    this.time.delayedCall(5000, () => {
      this.tweens.add({
        targets: cloud,
        alpha: 0,
        duration: 500,
        onComplete: () => cloud.destroy()
      });
    });
  },


  // White crescent slash arc for assassinations (code-drawn, no asset).
  spawnSlash(x, y) {
    const g = this.add.graphics({ x, y }).setDepth(DEPTH.EFFECTS);
    g.lineStyle(5, 0xffffff, 0.95);
    g.beginPath();
    g.arc(0, 0, 40, -Math.PI * 0.25, Math.PI * 0.55, false);
    g.strokePath();
    g.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
    this.tweens.add({
      targets: g,
      alpha: 0,
      scaleX: 1.8,
      scaleY: 1.8,
      duration: 280,
      ease: 'Quad.easeOut',
      onComplete: () => g.destroy()
    });
  },


  spawnSmokePuff(x, y) {
    const puff = this.add.sprite(x, y, 'smoke_cloud').setDepth(DEPTH.EFFECTS);
    puff.play('smoke_puff');
    puff.on('animationcomplete', () => {
      puff.destroy();
    });
  }
});
