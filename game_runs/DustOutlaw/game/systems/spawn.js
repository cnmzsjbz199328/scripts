/* DustOutlaw — §4B 原型分割；方法体逐字保留。 */
Object.assign(DustOutlawScene.prototype, {

  _spawnEnemy() {
    if (!this.gameStarted || this.gameOver) return;
    if (this.enemies.countActive(true) >= MAX_ALIVE || this.score >= WIN_SCORE) return;
    const edge = Phaser.Math.Between(0, 3);
    let x, y;
    if (edge === 0) { x = Phaser.Math.Between(40, MAP_W - 40); y = 40; }
    else if (edge === 1) { x = MAP_W - 40; y = Phaser.Math.Between(40, MAP_H - 40); }
    else if (edge === 2) { x = Phaser.Math.Between(40, MAP_W - 40); y = MAP_H - 40; }
    else { x = 40; y = Phaser.Math.Between(40, MAP_H - 40); }
    const e = this.enemies.create(x, y, 'bandit');
    e.setDepth(18); e.body.setCircle(12, 3, 3);
    e.setData('nextFire', this.time.now + Phaser.Math.Between(800, 2000));
  },
});
