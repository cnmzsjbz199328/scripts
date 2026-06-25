/* NinjaCat — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  createCharAnimations(charName, metaKey, sheetKey) {
    const meta = this.cache.json.get(metaKey);
    if (!meta) return;

    meta.rows.forEach((rowName, rIdx) => {
      const animKey = `${charName.toLowerCase()}_${rowName}`;
      const startFrame = rIdx * 9;
      const endFrame = startFrame + 8;
      this.anims.create({
        key: animKey,
        frames: this.anims.generateFrameNumbers(sheetKey, { start: startFrame, end: endFrame }),
        frameRate: meta.animations[rowName].fps || 8,
        repeat: meta.animations[rowName].loop ? -1 : 0
      });
    });
  },


  loadLevel(levelNum) {
    console.log(`Loading Level ${levelNum}...`);

    // Clean previous level assets
    this.groundGroup.clear(true, true);
    this.coinsGroup.clear(true, true);
    this.enemiesGroup.clear(true, true);
    this.spikeBallsGroup.clear(true, true);
    
    if (this.doorSprite) {
      this.doorSprite.destroy();
    }
    
    // Clear out Y-sort group except player
    this.ysortGroup.clear();
    this.ysortGroup.add(this.player);

    // Load data
    const levelTilemap = window.TILEMAP_DATA.levels.find(l => l.level === levelNum);
    const levelEntities = window.ENTITIES_DATA.levels.find(l => l.level === levelNum);
    const config = window.GAME_CONFIG;

    if (!levelTilemap || !levelEntities) {
      console.error(`Missing map data for level ${levelNum}`);
      return;
    }

    // Spawn player
    this.player.setPosition(levelEntities.playerSpawn.x, levelEntities.playerSpawn.y);
    this.player.setVelocity(0, 0);

    // Render Tiles
    const mapWidth = levelTilemap.width;
    const mapHeight = levelTilemap.height;
    const tileW = window.TILEMAP_DATA.tileWidth;
    const tileH = window.TILEMAP_DATA.tileHeight;
    const groundData = levelTilemap.layers.ground;

    groundData.forEach((tileId, idx) => {
      if (tileId === 0) return;
      const x = (idx % mapWidth) * tileW + tileW / 2;
      const y = Math.floor(idx / mapWidth) * tileH + tileH / 2;

      const tileSprite = this.groundGroup.create(x, y, `tile_${tileId}`);
      tileSprite.setDisplaySize(tileW, tileH);
      tileSprite.refreshBody(); // sync static body to display size (was updateFromImage(), which doesn't exist on static bodies and threw, crashing the scene)
      tileSprite.setDepth(DEPTH.GROUND);
    });

    // Spawn Coins
    levelEntities.coins.forEach(c => {
      const coin = this.coinsGroup.create(c.x, c.y, 'coin');
      coin.body.setAllowGravity(false);
      coin.body.setSize(32, 32);
      coin.body.setOffset(48, 48);
      coin.play('coin_anim');
      coin.setDepth(DEPTH.YSORT + coin.y);
    });

    // Spawn Enemies
    levelEntities.enemies.forEach(e => {
      const enemy = this.enemiesGroup.create(e.x, e.y, 'samuraibot_sheet');
      enemy.setCollideWorldBounds(true);
      enemy.body.setSize(44, 76);
      enemy.body.setOffset(74, 94);
      enemy.patrolLeft = e.patrolLeft;
      enemy.patrolRight = e.patrolRight;
      enemy.body.setVelocityX(80); // Patrol speed
      
      enemy.play('samuraibot_walk-left');
      enemy.setFlipX(false);
      
      this.ysortGroup.add(enemy);
    });

    // Spawn Spike Balls
    this.spikeBallsList = [];
    levelEntities.spikeBalls.forEach(sb => {
      const spike = this.spikeBallsGroup.create(sb.x, sb.y, 'spike_ball');
      spike.body.setAllowGravity(false);
      spike.body.setImmovable(true);
      spike.body.setSize(48, 48);
      spike.body.setOffset(40, 40);
      spike.play('spike_ball_anim');
      
      spike.baseY = sb.y;
      spike.rangeY = sb.rangeY;
      spike.speed = sb.speed;
      
      this.spikeBallsList.push(spike);
      spike.setDepth(DEPTH.YSORT + spike.y);
    });

    // Spawn Door
    const d = levelEntities.door;
    this.doorSprite = this.physics.add.sprite(d.x, d.y, 'exit_door');
    this.doorSprite.body.setAllowGravity(false);
    this.doorSprite.body.setImmovable(true);
    this.doorSprite.body.setSize(64, 96);
    this.doorSprite.body.setOffset(32, 16);
    this.doorSprite.play('exit_door_anim');
    this.doorSprite.setDepth(DEPTH.YSORT + this.doorSprite.y);

    this.physics.add.overlap(this.player, this.doorSprite, this.handleDoorReached, null, this);

    // Setup camera bounds
    const totalW = mapWidth * tileW;
    const totalH = mapHeight * tileH;
    this.physics.world.setBounds(0, 0, totalW, totalH);
    this.cameras.main.setBounds(0, 0, totalW, totalH);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Update HUD
    window.GameHUD?.setHearts(this.hearts, 3);
    window.GameHUD?.setScore(this.score);
    window.GameHUD?.setObjective(`关卡 ${levelNum}: ${this.levelObjectives[levelNum]}`);
  }
});
