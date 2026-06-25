/* MermaidPrincess — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
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


  setupBubbleTrail() {
    // We use a small circular drawing or frame of a sprite as bubble
    // Since we don't have a bubble asset, we can generate a texture dynamically!
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.arc(8, 8, 6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fill();
    }
    this.textures.addCanvas('bubble', canvas);

    this.bubbleEmitter = this.add.particles(0, 0, 'bubble', {
      lifespan: 1500,
      speedX: { min: -15, max: 15 },
      speedY: { min: -60, max: -20 },
      scale: { start: 0.8, end: 0.2 },
      alpha: { start: 0.8, end: 0 },
      blendMode: 'ADD',
      frequency: 120
    });
    this.bubbleEmitter.setDepth(DEPTH.DECOR_FLOOR);
    this.bubbleEmitter.startFollow(this.player, -10, 30);
  },


  loadLevel(levelNum) {
    console.log(`Loading Mermaid Princess Level ${levelNum}...`);

    this.levelCompleted = false;

    // Clean previous level assets
    this.groundGroup.clear(true, true);
    this.pearlsGroup.clear(true, true);
    this.enemiesGroup.clear(true, true);
    this.hazardsGroup.clear(true, true);
    
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
      tileSprite.refreshBody(); // sync static body to 64x64 display (tile art is 512px) — was updateFromImage(), which left the body at full texture size and trapped the player
      tileSprite.setDepth(DEPTH.GROUND);
    });

    // Spawn Pearls (coins)
    levelEntities.coins.forEach(c => {
      const pearl = this.pearlsGroup.create(c.x, c.y, 'pearl');
      pearl.body.setAllowGravity(false);
      pearl.body.setSize(36, 36);
      pearl.body.setOffset(46, 46);
      pearl.play('pearl_anim');
      pearl.setDepth(DEPTH.YSORT + pearl.y);
    });

    // Spawn Enemies (patrolling OctopusMonster or Shark)
    levelEntities.enemies.forEach((e, idx) => {
      // Alternate between Octopus and Shark
      const isShark = idx % 2 === 1;
      const key = isShark ? 'shark' : 'octopusmonster';
      const sheet = isShark ? 'shark_sheet' : 'octopus_sheet';
      
      const enemy = this.enemiesGroup.create(e.x, e.y, sheet);
      enemy.setCollideWorldBounds(true);
      enemy.body.setSize(60, 80);
      enemy.body.setOffset(66, 64);
      enemy.patrolLeft = e.patrolLeft;
      enemy.patrolRight = e.patrolRight;
      enemy.body.setVelocityX(isShark ? 90 : 60); // Shark is faster
      enemy.charKey = key;

      enemy.play(`${key}_walk-left`);
      enemy.setFlipX(false);
      
      this.ysortGroup.add(enemy);
    });

    // Spawn Hazards (Jellyfish or Pufferfish)
    this.hazardsList = [];
    levelEntities.spikeBalls.forEach((sb, idx) => {
      // Level 1: Jellyfish only. Level 2 & 3: Alternate Jellyfish and Pufferfish
      const isPuffer = levelNum > 1 && idx % 2 === 1;
      const key = isPuffer ? 'pufferfish_spiny' : 'jellyfish_electric';
      
      const hazard = this.hazardsGroup.create(sb.x, sb.y, key);
      hazard.body.setAllowGravity(false);
      hazard.body.setImmovable(true);
      hazard.body.setSize(50, 50);
      hazard.body.setOffset(39, 39);
      hazard.play(`${key}_anim`);
      
      hazard.baseY = sb.y;
      hazard.rangeY = sb.rangeY;
      hazard.speed = sb.speed;
      
      this.hazardsList.push(hazard);
      hazard.setDepth(DEPTH.YSORT + hazard.y);
    });

    // Spawn Door (Shell Portal)
    const d = levelEntities.door;
    this.doorSprite = this.physics.add.sprite(d.x, d.y, 'shell_portal');
    this.doorSprite.body.setAllowGravity(false);
    this.doorSprite.body.setImmovable(true);
    this.doorSprite.body.setSize(70, 70);
    this.doorSprite.body.setOffset(29, 29);
    this.doorSprite.play('shell_portal_anim');
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
