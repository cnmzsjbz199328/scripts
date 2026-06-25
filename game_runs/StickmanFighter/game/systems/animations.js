/* StickmanFighter — animations 系统（增补 MainScene 原型）
 * 由 game-logic.js 单体机械拆分而来；方法体逐字保留，PvP 已移除。 */
Object.assign(MainScene.prototype, {
  setupAnimations() {
    // Player animations
    this.anims.create({
      key: 'player_idle',
      frames: this.anims.generateFrameNumbers('player_stickman', { start: 0, end: 4 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'player_walk',
      frames: this.anims.generateFrameNumbers('player_stickman', { start: 5, end: 9 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: 'player_punch',
      frames: this.anims.generateFrameNumbers('player_stickman', { start: 10, end: 14 }),
      frameRate: 15,
      repeat: 0
    });
    this.anims.create({
      key: 'player_kick',
      frames: this.anims.generateFrameNumbers('player_stickman', { start: 15, end: 19 }),
      frameRate: 12,
      repeat: 0
    });
    this.anims.create({
      key: 'player_block',
      frames: [{ key: 'player_stickman', frame: 20 }],
      frameRate: 1
    });
    this.anims.create({
      key: 'player_hit',
      frames: [{ key: 'player_stickman', frame: 21 }],
      frameRate: 1
    });
    this.anims.create({
      key: 'player_fall',
      frames: this.anims.generateFrameNumbers('player_stickman', { start: 22, end: 24 }),
      frameRate: 8,
      repeat: 0
    });

    // Enemy animations
    this.anims.create({
      key: 'enemy_idle',
      frames: this.anims.generateFrameNumbers('enemy_stickman', { start: 0, end: 4 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'enemy_walk',
      frames: this.anims.generateFrameNumbers('enemy_stickman', { start: 5, end: 9 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: 'enemy_punch',
      frames: this.anims.generateFrameNumbers('enemy_stickman', { start: 10, end: 14 }),
      frameRate: 12,
      repeat: 0
    });
    this.anims.create({
      key: 'enemy_kick',
      frames: this.anims.generateFrameNumbers('enemy_stickman', { start: 15, end: 19 }),
      frameRate: 10,
      repeat: 0
    });
    this.anims.create({
      key: 'enemy_block',
      frames: [{ key: 'enemy_stickman', frame: 20 }],
      frameRate: 1
    });
    this.anims.create({
      key: 'enemy_hit',
      frames: [{ key: 'enemy_stickman', frame: 21 }],
      frameRate: 1
    });
    this.anims.create({
      key: 'enemy_fall',
      frames: this.anims.generateFrameNumbers('enemy_stickman', { start: 22, end: 24 }),
      frameRate: 8,
      repeat: 0
    });

    // Object animations
    this.anims.create({
      key: 'barrel_flicker',
      frames: this.anims.generateFrameNumbers('street_barrel', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'pack_pulse',
      frames: this.anims.generateFrameNumbers('health_pack', { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1
    });
  }
});
