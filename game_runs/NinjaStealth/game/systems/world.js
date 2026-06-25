/* NinjaStealth — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  createCharAnimations(charName, metaKey, sheetKey) {
    const meta = this.cache.json.get(metaKey);
    if (!meta || !meta.animations) return;

    Object.keys(meta.animations).forEach(key => {
      const animData = meta.animations[key];
      const frames = this.anims.generateFrameNumbers(sheetKey, {
        start: animData.row * 9,
        end: animData.row * 9 + animData.frameCount - 1
      });
      const phaserKey = `${charName}_${key.replace('-', '_')}`;
      this.anims.create({
        key: phaserKey,
        frames: frames,
        frameRate: animData.fps,
        repeat: animData.loop ? -1 : 0
      });
    });
  },


  loadLevel(levelNum) {
    console.log(`Loading level: ${levelNum}...`);
    this.currentLevel = levelNum;
    this.levelScrolls = 0;

    // Reset items and enemies from previous level
    this.scrolls.clear(true, true);
    this.smokeBombPickups.clear(true, true);
    this.guards.clear(true, true);
    this.collidables.clear(true, true);
    this.ysortGroup.clear();
    this.ysortGroup.add(this.player);

    if (this.exitPortal) {
      this.exitPortal.destroy();
      this.exitPortal = null;
    }

    // Get active level datasets
    const levelMapData = window.TILEMAP_DATA.levels[levelNum - 1];
    const levelEntitiesData = window.ENTITIES_DATA.levels[levelNum - 1];

    if (!levelMapData || !levelEntitiesData) {
      console.error(`Missing level dataset for level: ${levelNum}`);
      return;
    }

    this.currentLevelLayers = levelMapData.layers;

    // Set player position to spawn point
    this.player.setPosition(levelEntitiesData.playerSpawn.x, levelEntitiesData.playerSpawn.y);

    // Render Tile layers
    this.renderTileLayer('ground', DEPTH.GROUND, levelMapData.layers.ground);
    this.renderTileLayer('decor_floor', DEPTH.DECOR_FLOOR, levelMapData.layers.decor_floor);
    
    // Objects layer has collisions and Y-sort
    this.ysortObjects = this.renderTileLayer('objects', DEPTH.YSORT, levelMapData.layers.objects, true);
    
    this.renderTileLayer('decor_top', DEPTH.DECOR_TOP, levelMapData.layers.decor_top);

    // Exit portal drawing (spinning magical circle at exit position)
    this.exitPos = levelEntitiesData.exit;
    this.exitPortal = this.add.graphics().setDepth(DEPTH.GROUND + 10);
    this.exitPulseAngle = 0;

    // Spawn Scrolls
    levelEntitiesData.scrolls.forEach(s => {
      const scroll = this.scrolls.create(s.x, s.y, 'scroll');
      scroll.body.setSize(48, 48);
      scroll.body.setOffset(40, 40);
      scroll.play('scroll_float');
      scroll.setDepth(DEPTH.YSORT + s.y);
      this.ysortGroup.add(scroll);
    });

    // Spawn Smoke bomb items
    levelEntitiesData.smokeBombs.forEach(b => {
      const bomb = this.smokeBombPickups.create(b.x, b.y, 'smoke_bomb');
      bomb.body.setSize(48, 48);
      bomb.body.setOffset(40, 40);
      bomb.play('smoke_bomb_float');
      bomb.setDepth(DEPTH.YSORT + b.y);
      this.ysortGroup.add(bomb);
    });

    // Spawn Guards
    levelEntitiesData.guards.forEach(g => {
      const guard = this.guards.create(g.spawn.x, g.spawn.y, 'guard_sheet');
      guard.id = g.id;
      guard.body.setSize(48, 48);
      guard.body.setOffset(72, 110);
      guard.patrolPath = g.patrol;
      guard.patrolIndex = 0;
      guard.facingAngle = 0; // angle in radians
      guard.state = 'patrol'; // states: patrol, alert, combat
      guard.alertTimer = 0;
      guard.detectionProgress = 0; // goes from 0 to 100
      guard.setDepth(DEPTH.YSORT + guard.y);
      guard.play('SamuraiGuard_idle');
      
      // Floating alert indicator symbol (! / ?)
      guard.alertIcon = this.add.text(guard.x, guard.y - 80, '', {
        fontSize: '24px',
        fontStyle: 'bold',
        fill: '#ff0000',
        stroke: '#000000',
        strokeThickness: 3
      }).setOrigin(0.5).setDepth(DEPTH.EFFECTS);

      this.ysortGroup.add(guard);
    });

    // Update HUD
    window.GameHUD?.setObjective(levelEntitiesData.objective);
    this.updateHUDText();
  },


  renderTileLayer(layerName, baseDepth, data, isObjectsLayer = false) {
    if (!data) return [];
    const sprites = [];
    const W = window.TILEMAP_DATA.width;
    const TW = window.TILEMAP_DATA.tileWidth;
    const TH = window.TILEMAP_DATA.tileHeight;

    data.forEach((id, i) => {
      if (id === 0) return;
      const x = (i % W) * TW + TW / 2;
      const y = Math.floor(i / W) * TH + TH / 2;
      const sp = this.add.image(x, y, `tile_${id}`).setDisplaySize(TW, TH);
      
      sp.setDepth(isObjectsLayer ? DEPTH.YSORT + y : baseDepth);

      const tileName = window.TILEMAP_DATA.tileIndex[id];
      // Generate static physical colliders for solid obstacles
      if (isObjectsLayer && tileName) {
        const blocksCollisions = tileName.includes('wall') || tileName.includes('crate') || tileName.includes('barrel') || tileName.includes('bush') || tileName.includes('lantern');
        if (blocksCollisions) {
          this.physics.add.existing(sp, true);
          this.collidables.add(sp);
        }
      }
      if (isObjectsLayer) sprites.push(sp);
    });
    return sprites;
  },


  updateHUDText() {
    const levelName = window.ENTITIES_DATA.levels[this.currentLevel - 1].name;
    window.GameHUD?.setObjective(`${levelName} | 卷轴: ${this.levelScrolls}/3 | 烟雾弹: ${this.smokeBombs}`);
  },


  collectScroll(player, scroll) {
    scroll.destroy();
    this.levelScrolls++;
    this.score++;
    sfx.play('scroll');
    window.GameHUD?.setScore(this.score);
    this.updateHUDText();

    const scrollTexts = {
      1: ['📜 情报卷轴 获取！', '卷轴一：将军的兵力部署图。', '看，伏兵就藏在这里……'],
      2: ['📜 情报卷轴 获取！', '卷轴二：密道入口坐标。', '这将成为撤离时的生命线。'],
      3: ['📜 情报卷轴 获取！', '卷轴三：将军的真实身份文书。', '这将是推翻其统治的关键证据！']
    };
    const text = scrollTexts[this.levelScrolls];
    if (text) {
      this.showPickupToast(text, 1800);
    }

    // Spawn sparkle effects
    this.spawnSparkles(scroll.x, scroll.y);

    if (this.levelScrolls === 3) {
      window.GameHUD?.setObjective(`所有卷轴已集齐！快前往石门出口撤离！`);
      sfx.play('win_level');
    }
  },


  collectSmokeBomb(player, bomb) {
    bomb.destroy();
    this.smokeBombs += 2; // pick up 2 smoke bombs
    sfx.play('scroll');
    this.updateHUDText();
    this.spawnSparkles(bomb.x, bomb.y, 0x55ff55);
  },


  drawExitPortal() {
    if (!this.exitPortal) return;
    this.exitPortal.clear();

    const color = this.levelScrolls === 3 ? 0x06b6d4 : 0x475569; // cyan when open, grey when locked
    const cx = this.exitPos.x;
    const cy = this.exitPos.y;

    this.exitPulseAngle += 0.04;
    const pulseRadius = 48 + Math.sin(this.exitPulseAngle) * 8;

    // Draw portal base ring
    this.exitPortal.lineStyle(4, color, 0.8);
    this.exitPortal.strokeCircle(cx, cy, pulseRadius);

    // Inner rotating rays if open
    if (this.levelScrolls === 3) {
      this.exitPortal.fillStyle(color, 0.15);
      this.exitPortal.fillCircle(cx, cy, pulseRadius);

      const rays = 4;
      this.exitPortal.lineStyle(2, 0xffffff, 0.5);
      for (let i = 0; i < rays; i++) {
        const angle = this.exitPulseAngle + (i * Math.PI / 2);
        const x1 = cx - Math.cos(angle) * pulseRadius;
        const y1 = cy - Math.sin(angle) * pulseRadius;
        const x2 = cx + Math.cos(angle) * pulseRadius;
        const y2 = cy + Math.sin(angle) * pulseRadius;
        this.exitPortal.line(x1, y1, x2, y2);
      }
    } else {
      // Locked lock shape
      this.exitPortal.lineStyle(3, 0xffffff, 0.6);
      this.exitPortal.strokeRect(cx - 10, cy - 6, 20, 16);
      // strokeArc doesn't exist in Phaser 3 Graphics; use arc() + strokePath()
      this.exitPortal.beginPath();
      this.exitPortal.arc(cx, cy - 6, 8, Math.PI, 0, false);
      this.exitPortal.strokePath();
    }
  }
});
