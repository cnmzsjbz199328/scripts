/* NeonRacer — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  spawnWave(spawnY) {
    // Road lanes: x coordinates centered around road columns 4-10
    const lanes = [288, 352, 416, 480, 544, 608, 672];
    Phaser.Utils.Array.Shuffle(lanes);

    // Spawn 1-2 roadblock obstacles
    const roadblockCount = Phaser.Math.Between(1, 2);
    for (let i = 0; i < roadblockCount; i++) {
      const laneX = lanes.pop();
      const roadblock = this.roadblocks.create(laneX, spawnY + Phaser.Math.Between(-40, 40), 'roadblock_sheet');
      roadblock.setDisplaySize(54, 54);
      roadblock.body.setSize(40, 40);
      roadblock.play('roadblock_flash');
      roadblock.setDepth(DEPTH.YSORT + roadblock.y);
      this.ysortGroup.add(roadblock);
    }

    // Spawn 1-2 batteries
    const batteryCount = Phaser.Math.Between(1, 2);
    for (let i = 0; i < batteryCount; i++) {
      const laneX = lanes.pop();
      const battery = this.batteries.create(laneX, spawnY + Phaser.Math.Between(-50, 50), 'battery_sheet');
      battery.setDisplaySize(44, 44);
      battery.body.setSize(32, 32);
      battery.play('battery_sparkle');
      battery.setDepth(DEPTH.YSORT + battery.y);
      this.ysortGroup.add(battery);

      // Pulsating scale tween to represent neon pulsating glow
      this.tweens.add({
        targets: battery,
        scaleX: battery.scaleX * 1.3,
        scaleY: battery.scaleY * 1.3,
        duration: 450,
        yoyo: true,
        repeat: -1
      });
    }

    // Spawn floating neon signs/hologram billboards in the side gutters
    if (Phaser.Math.Between(1, 10) <= 6) {
      const isLeft = Phaser.Math.Between(0, 1) === 0;
      const x = isLeft ? Phaser.Math.Between(40, 160) : Phaser.Math.Between(800, 920);
      const isBillboard = Phaser.Math.Between(1, 2) === 1;

      if (isBillboard) {
        const billboard = this.decors.create(x, spawnY, 'billboard');
        billboard.setDisplaySize(110, 55);
        billboard.play('billboard_blink');
        billboard.setDepth(DEPTH.DECOR_FLOOR + billboard.y);
      } else {
        const signs = ['NEON', 'SPEED', '2099', 'TOKYO', 'PHANTOM', '⚡', '🤖', '🍒', '🔋', 'BOOST'];
        const word = Phaser.Utils.Array.GetRandom(signs);
        const colors = ['#f43f5e', '#06b6d4', '#eab308', '#a855f7', '#10b981'];
        const color = Phaser.Utils.Array.GetRandom(colors);
        const txt = this.add.text(x, spawnY, word, {
          font: 'bold 20px Courier',
          fill: color,
          stroke: '#ffffff',
          strokeThickness: 2
        }).setOrigin(0.5);
        // Give text a subtle glow shadow
        txt.setShadow(0, 0, color, 12, true, true);
        txt.setDepth(DEPTH.DECOR_FLOOR + txt.y);
        this.decors.add(txt);
      }
    }
  },


  cleanupOffscreenObjects() {
    // Destroy obstacles/batteries/decors that the player has completely passed
    const limitY = this.player.y + 400;
    this.batteries.getChildren().forEach(b => {
      if (b.y > limitY) b.destroy();
    });
    this.roadblocks.getChildren().forEach(r => {
      if (r.y > limitY) r.destroy();
    });
    this.decors.getChildren().forEach(d => {
      if (d.y > limitY) d.destroy();
    });
  }
});
