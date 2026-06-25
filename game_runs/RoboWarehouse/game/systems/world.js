/* RoboWarehouse — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  createAnims() {
    // Botty animations
    this.anims.create({
      key: 'botty_walk_down',
      frames: this.anims.generateFrameNumbers('botty_sheet', { start: 0, end: 8 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: 'botty_walk_up',
      frames: this.anims.generateFrameNumbers('botty_sheet', { start: 9, end: 17 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: 'botty_walk_left',
      frames: this.anims.generateFrameNumbers('botty_sheet', { start: 18, end: 26 }),
      frameRate: 10,
      repeat: -1
    });

    // Box Pulse animations
    this.anims.create({
      key: 'box_red_pulse',
      frames: this.anims.generateFrameNumbers('box_red_sheet', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'box_green_pulse',
      frames: this.anims.generateFrameNumbers('box_green_sheet', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'box_blue_pulse',
      frames: this.anims.generateFrameNumbers('box_blue_sheet', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });

    // Gear spinning animation
    this.anims.create({
      key: 'gear_spin',
      frames: this.anims.generateFrameNumbers('gear_sheet', { start: 0, end: 5 }),
      frameRate: 8,
      repeat: -1
    });
  },


  loadLevel(levelNum) {
    this.isTransitioning = true;
    this.currentLevel = levelNum;
    this.gravityDirection = 'down';
    this.history = []; // fresh undo stack per level

    const lvl = LEVELS[levelNum - 1];
    
    // Clear old visual tiles
    this.mapTiles.forEach(t => t.destroy());
    this.mapTiles = [];
    
    // Clear targets
    this.activeTargets.forEach(t => t.destroy());
    this.activeTargets = [];

    // Clear boxes
    this.activeBoxes.forEach(b => {
      b.sprite.destroy();
    });
    this.activeBoxes = [];

    // Clear decorative gears
    this.staticGearsGroup.clear(true, true);

    // Save grid copy
    this.levelGrid = lvl.grid.map(row => [...row]);

    // Render Tiles
    const rows = lvl.grid.length;
    const cols = lvl.grid[0].length;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Ground tile (floor) underneath everything
        const floorImg = this.add.image(c * 64 + 32, r * 64 + 32, 'tile_floor_base');
        floorImg.setDisplaySize(64, 64);
        floorImg.setDepth(DEPTH.GROUND);
        this.mapTiles.push(floorImg);

        const val = lvl.grid[r][c];
        if (val === 2) {
          // Wall
          const wallImg = this.add.image(c * 64 + 32, r * 64 + 32, 'tile_wall_base');
          wallImg.setDisplaySize(64, 64);
          wallImg.setDepth(DEPTH.YSORT + r * 64 + 32);
          this.mapTiles.push(wallImg);
        } else if (val >= 6 && val <= 9) {
          // Conveyor belt
          let beltKey = 'tile_belt_right_base';
          if (val === 6) beltKey = 'tile_belt_up_base';
          if (val === 7) beltKey = 'tile_belt_down_base';
          if (val === 8) beltKey = 'tile_belt_left_base';

          const beltImg = this.add.image(c * 64 + 32, r * 64 + 32, beltKey);
          beltImg.setDisplaySize(64, 64);
          beltImg.setDepth(DEPTH.DECOR_FLOOR);
          this.mapTiles.push(beltImg);
        } else if (val === 10) {
          // Gravity switch
          const switchImg = this.add.image(c * 64 + 32, r * 64 + 32, 'tile_gravity_switch_base');
          switchImg.setDisplaySize(64, 64);
          switchImg.setDepth(DEPTH.DECOR_FLOOR);
          this.mapTiles.push(switchImg);
        } else if (val === 11 || val === 12) {
          // Gravity Indicator
          const key = this.gravityDirection === 'down' ? 'tile_gravity_indicator_down_base' : 'tile_gravity_indicator_up_base';
          const indImg = this.add.image(c * 64 + 32, r * 64 + 32, key);
          indImg.setDisplaySize(64, 64);
          indImg.setDepth(DEPTH.DECOR_FLOOR);
          indImg.setData('isGravityIndicator', true);
          this.mapTiles.push(indImg);
        }
      }
    }

    // Render Targets
    lvl.targets.forEach(tgt => {
      const tgtImg = this.add.image(tgt.x * 64 + 32, tgt.y * 64 + 32, `tile_target_${tgt.color}_base`);
      tgtImg.setDisplaySize(64, 64);
      tgtImg.setDepth(DEPTH.DECOR_FLOOR + 10);
      tgtImg.setData('color', tgt.color);
      tgtImg.setData('gridX', tgt.x);
      tgtImg.setData('gridY', tgt.y);
      this.activeTargets.push(tgtImg);
    });

    // Render Decorative Gears
    if (lvl.gears) {
      lvl.gears.forEach(g => {
        const gearObj = this.add.sprite(g.x * 64 + 32, g.y * 64 + 32, 'gear_sheet');
        gearObj.setDisplaySize(64, 64);
        gearObj.setDepth(DEPTH.YSORT + g.y * 64 + 33);
        gearObj.play('gear_spin');
        this.staticGearsGroup.add(gearObj);
      });
    }

    // Place Player
    this.player.gridX = lvl.spawn.x;
    this.player.gridY = lvl.spawn.y;
    this.player.x = lvl.spawn.x * 64 + 32;
    this.player.y = lvl.spawn.y * 64 + 32;
    this.player.setDepth(DEPTH.YSORT + this.player.y);
    this.player.setFlipX(false);
    this.player.anims.stop();

    // Spawn Boxes
    lvl.boxes.forEach(box => {
      const boxSprite = this.add.sprite(box.x * 64 + 32, box.y * 64 + 32, `box_${box.color}_sheet`);
      boxSprite.setDisplaySize(64, 64);
      boxSprite.setDepth(DEPTH.YSORT + box.y * 64 + 32);
      boxSprite.play(`box_${box.color}_pulse`);

      this.activeBoxes.push({
        gridX: box.x,
        gridY: box.y,
        color: box.color,
        sprite: boxSprite
      });
      this.ysortGroup.add(boxSprite);
    });

    // Refresh HUD
    window.GameHUD?.setScore(this.currentLevel);
    window.GameHUD?.setObjective(lvl.title);

    // Short camera flash
    this.cameras.main.fadeIn(200);

    // End transition lock
    this.time.delayedCall(220, () => {
      this.isTransitioning = false;
    });
  },


  isWall(gx, gy) {
    if (gx < 0 || gx >= 13 || gy < 0 || gy >= 11) return true;
    return this.levelGrid[gy][gx] === 2;
  },


  getBoxAt(gx, gy) {
    return this.activeBoxes.find(b => b.gridX === gx && b.gridY === gy);
  }
});
