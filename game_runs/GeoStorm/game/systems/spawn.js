/* GeoStorm — §4B 原型分割；方法体逐字保留。 */
Object.assign(GeoStormScene.prototype, {

  _spawnShard() {
    // 避开掩体与边缘
    let x, y, tries = 0;
    do { x = Phaser.Math.Between(70, GAME_W - 70); y = Phaser.Math.Between(70, GAME_H - 70); tries++; }
    while (tries < 12 && this.blocks.getChildren().some(b => Math.abs(b.x - x) < 50 && Math.abs(b.y - y) < 50));
    const s = this.shards.create(x, y, 'shard'); s.setDepth(12);
    this.tweens.add({ targets: s, scale: 1.25, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  },


  _spawnWave() {
    if (!this.gameStarted || this.gameOver || this.cardActive) return;
    const n = 1 + this.phase + Math.floor((this.score % 5) / 3);
    const tex = ['s_tri', 's_sq', 's_dia'];
    for (let i = 0; i < n; i++) {
      const edge = Phaser.Math.Between(0, 3);
      let x, y;
      if (edge === 0) { x = Phaser.Math.Between(0, GAME_W); y = -20; }
      else if (edge === 1) { x = GAME_W + 20; y = Phaser.Math.Between(0, GAME_H); }
      else if (edge === 2) { x = Phaser.Math.Between(0, GAME_W); y = GAME_H + 20; }
      else { x = -20; y = Phaser.Math.Between(0, GAME_H); }
      const s = this.shots.create(x, y, Phaser.Utils.Array.GetRandom(tex));
      s.setDepth(14); s.body.setCircle(8, (s.width - 16) / 2, (s.height - 16) / 2);
      let ang;
      if (Phaser.Math.Between(0, 1) === 0) ang = Phaser.Math.Angle.Between(x, y, this.player.x, this.player.y);
      else ang = Phaser.Math.Angle.Between(x, y, GAME_W - x, GAME_H - y);
      const spd = this.spd + this.score * 3 + Phaser.Math.Between(-20, 35);
      this.physics.velocityFromRotation(ang, spd, s.body.velocity);
      s.setAngularVelocity(Phaser.Math.Between(-180, 180));
    }
  },
});
