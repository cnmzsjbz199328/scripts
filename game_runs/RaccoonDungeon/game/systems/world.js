/* RaccoonDungeon — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  // -------------------------------------------------------------
  // MAP GENERATION & LAYER RENDERING
  // -------------------------------------------------------------
  generateLevel(levelNum) {
    this.portalActive = false;
    this.bossDefeated = false;
    this.enemiesKilled = 0;

    // Reset groups
    this.enemiesGroup.clear(true, true);
    this.projectilesGroup.clear(true, true);
    this.trapsGroup.clear(true, true);
    this.chestsGroup.clear(true, true);
    this.portalGroup.clear(true, true);
    this.ysortGroup.clear();
    this.obstaclesGroup.clear(true, true);

    // Destroy previous tile map structures
    if (this.mapGroup) this.mapGroup.destroy(true);
    this.mapGroup = this.add.group();

    const cols = 40;
    const rows = 30;

    // Local 2D array representing tiles
    const groundGrid = Array(rows).fill(null).map(() => Array(cols).fill(0));
    const obstacleGrid = Array(rows).fill(null).map(() => Array(cols).fill(0));

    if (levelNum === 5) {
      // Floor 5: Circular Boss Arena
      const cx = 20;
      const cy = 15;
      const arenaRadius = 11;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const dist = Math.sqrt((c - cx) ** 2 + (r - cy) ** 2);
          if (dist <= arenaRadius) {
            // Arena Floor
            groundGrid[r][c] = 3; // stone_base
            // Some mossy grass tiles on borders
            if (dist > arenaRadius - 1.5) {
              groundGrid[r][c] = 2; // grass_mossy
            }
          } else if (dist <= arenaRadius + 1.2) {
            // Arena Walls
            obstacleGrid[r][c] = 4; // stone_wall
          } else {
            // Abyss/Grass background outside
            groundGrid[r][c] = 1; // grass_base
          }
        }
      }

      // Spawn Player at bottom of arena
      const px = cx * 64 + 32;
      const py = (cy + 7) * 64 + 32;
      this.createPlayer(px, py);

      // Spawn Boss Dragon in the center
      const boss = this.spawnEnemy('BossDragon', cx * 64 + 32, cy * 64 + 32);
      this.bossDragon = boss;
      this.totalEnemiesInLevel = 1;

      // Spawn Boss health bar HUD container
      this.createBossHealthBar();
    } else {
      // Floor 1-4: Procedural Connected Rooms Dungeon
      // Fill the grid with outer boundary walls
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          obstacleGrid[r][c] = 4; // default stone_wall everywhere
          groundGrid[r][c] = 1; // grass_base underneath
        }
      }

      // Procedural Room Divider Grid
      const roomCols = 4;
      const roomRows = 3;
      const rooms = [];

      for (let ry = 0; ry < roomRows; ry++) {
        for (let rx = 0; rx < roomCols; rx++) {
          // 75% chance to build a room in this sector
          if (Math.random() < 0.75 || (rx === 0 && ry === 0) || (rx === 3 && ry === 2)) {
            const w = Math.floor(Math.random() * 4) + 5; // 5 to 8 width
            const h = Math.floor(Math.random() * 4) + 5; // 5 to 8 height
            const startX = rx * 10 + Math.floor(Math.random() * (10 - w - 2)) + 1;
            const startY = ry * 10 + Math.floor(Math.random() * (10 - h - 2)) + 1;

            rooms.push({ x: startX, y: startY, w: w, h: h, cx: Math.floor(startX + w / 2), cy: Math.floor(startY + h / 2) });

            // Carve floor room
            for (let y = startY; y < startY + h; y++) {
              for (let x = startX; x < startX + w; x++) {
                obstacleGrid[y][x] = 0; // clear walls
                // Randomize floor style for Ghibli look
                const rand = Math.random();
                if (rand < 0.6) groundGrid[y][x] = 3; // stone_base walkway
                else if (rand < 0.85) groundGrid[y][x] = 1; // grass_base
                else groundGrid[y][x] = 2; // grass_mossy
              }
            }
          }
        }
      }

      // Connect rooms with corridors
      for (let i = 0; i < rooms.length - 1; i++) {
        const r1 = rooms[i];
        const r2 = rooms[i + 1];

        // Horizontal corridor
        const xStart = Math.min(r1.cx, r2.cx);
        const xEnd = Math.max(r1.cx, r2.cx);
        const yStart = Math.min(r1.cy, r2.cy);
        const yEnd = Math.max(r1.cy, r2.cy);

        for (let x = xStart; x <= xEnd; x++) {
          const cy1 = r1.cy;
          obstacleGrid[cy1][x] = 0;
          obstacleGrid[cy1 + 1][x] = 0;
          groundGrid[cy1][x] = 3;
          groundGrid[cy1 + 1][x] = 3;
        }

        // Vertical corridor
        for (let y = yStart; y <= yEnd; y++) {
          const cx2 = r2.cx;
          obstacleGrid[y][cx2] = 0;
          obstacleGrid[y][cx2 + 1] = 0;
          groundGrid[y][cx2] = 3;
          groundGrid[y][cx2 + 1] = 3;
        }
      }

      // Spawn Player in first room
      const firstRoom = rooms[0];
      this.createPlayer(firstRoom.cx * 64 + 32, firstRoom.cy * 64 + 32);

      // Spawn Portal in last room
      const lastRoom = rooms[rooms.length - 1];
      this.spawnPortal(lastRoom.cx * 64 + 32, lastRoom.cy * 64 + 32);

      // Populate rooms with monsters, traps, and chests
      this.totalEnemiesInLevel = 0;
      for (let i = 1; i < rooms.length; i++) {
        const room = rooms[i];

        // 1. Spawn Enemies (Slimes, Gargoyles)
        const enemyCount = Math.floor(Math.random() * 2) + 1 + Math.floor(levelNum / 2);
        for (let e = 0; e < enemyCount; e++) {
          const ex = (room.x + 1 + Math.floor(Math.random() * (room.w - 2))) * 64 + 32;
          const ey = (room.y + 1 + Math.floor(Math.random() * (room.h - 2))) * 64 + 32;
          const type = Math.random() < 0.6 ? 'Slime' : 'Gargoyle';
          this.spawnEnemy(type, ex, ey);
          this.totalEnemiesInLevel++;
        }

        // 2. Spawn Traps (Spikes)
        if (Math.random() < 0.8) {
          const tx = (room.x + 1 + Math.floor(Math.random() * (room.w - 2))) * 64 + 32;
          const ty = (room.y + 1 + Math.floor(Math.random() * (room.h - 2))) * 64 + 32;
          this.spawnTrap(tx, ty);
        }

        // 3. Spawn Chests (Golden chests with Ghibli shine)
        if (Math.random() < 0.5) {
          const cx = (room.x + 1 + Math.floor(Math.random() * (room.w - 2))) * 64 + 32;
          const cy = (room.y + 1 + Math.floor(Math.random() * (room.h - 2))) * 64 + 32;
          this.spawnChest(cx, cy);
        }
      }
    }

    // Render floor grid tiles into the screen
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const gx = c * 64 + 32;
        const gy = r * 64 + 32;
        
        // Ground Layer
        const gTile = groundGrid[r][c];
        if (gTile > 0) {
          const tileImg = this.add.image(gx, gy, `tile_${gTile}`).setDisplaySize(64, 64);
          tileImg.setDepth(DEPTH.GROUND);
          this.mapGroup.add(tileImg);
        }

        // Objects Layer (Collidable walls)
        const oTile = obstacleGrid[r][c];
        if (oTile > 0) {
          const wallImg = this.physics.add.staticSprite(gx, gy, `tile_${oTile}`);
          wallImg.setDisplaySize(64, 64);
          wallImg.refreshBody(); // sync static body to 64x64 display (tile art is 256px)
          wallImg.setDepth(DEPTH.YSORT + gy);
          this.obstaclesGroup.add(wallImg);
          this.ysortGroup.add(wallImg);
        }
      }
    }
  },


  createPlayer(x, y) {
    if (this.player) {
      this.player.setPosition(x, y);
      return;
    }

    // Spawn new Raccoon Mage
    this.player = this.physics.add.sprite(x, y, 'raccoon_sheet');
    this.player.setDisplaySize(96, 104);
    this.player.setCollideWorldBounds(true);
    // Circular body for clean top-down physics
    this.player.body.setSize(45, 30);
    this.player.body.setOffset(73, 140);
    this.player.play('walk_down');
  },


  // -------------------------------------------------------------
  // ANIMATION BUILDER
  // -------------------------------------------------------------
  createAnimations() {
    // Raccoon Mage Animations (9 frames per row)
    const racKeys = ['walk_down', 'walk_up', 'walk_left', 'attack_melee', 'attack_magic', 'heal', 'hurt', 'death'];
    racKeys.forEach((key, idx) => {
      this.anims.create({
        key: key,
        frames: this.anims.generateFrameNumbers('raccoon_sheet', { start: idx * 9, end: idx * 9 + 8 }),
        frameRate: key.includes('attack') ? 14 : 8,
        repeat: (key === 'hurt' || key === 'death' || key === 'heal' || key.includes('attack')) ? 0 : -1
      });
    });

    // Slime Animations
    const slimeKeys = ['slime_walk_down', 'slime_walk_left', 'slime_hurt', 'slime_death'];
    slimeKeys.forEach((key, idx) => {
      this.anims.create({
        key: key,
        frames: this.anims.generateFrameNumbers('slime_sheet', { start: idx * 9, end: idx * 9 + 8 }),
        frameRate: 8,
        repeat: (key.includes('hurt') || key.includes('death')) ? 0 : -1
      });
    });

    // Gargoyle Animations
    const gargKeys = ['garg_walk_down', 'garg_walk_left', 'garg_hurt', 'garg_death'];
    gargKeys.forEach((key, idx) => {
      this.anims.create({
        key: key,
        frames: this.anims.generateFrameNumbers('gargoyle_sheet', { start: idx * 9, end: idx * 9 + 8 }),
        frameRate: 8,
        repeat: (key.includes('hurt') || key.includes('death')) ? 0 : -1
      });
    });

    // Dragon Boss Animations
    const dragonKeys = ['dragon_walk_down', 'dragon_walk_left', 'dragon_attack', 'dragon_hurt', 'dragon_death'];
    dragonKeys.forEach((key, idx) => {
      this.anims.create({
        key: key,
        frames: this.anims.generateFrameNumbers('dragon_sheet', { start: idx * 9, end: idx * 9 + 8 }),
        frameRate: 8,
        repeat: (key === 'dragon_hurt' || key === 'dragon_death' || key === 'dragon_attack') ? 0 : -1
      });
    });

    // Chest Animations
    this.anims.create({
      key: 'chest_open',
      frames: this.anims.generateFrameNumbers('chest_sheet', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: 0
    });
  },


  // -------------------------------------------------------------
  // ENTITY SPAWNERS
  // -------------------------------------------------------------
  spawnEnemy(type, x, y) {
    const enemy = this.physics.add.sprite(x, y, type === 'Slime' ? 'slime_sheet' : type === 'Gargoyle' ? 'gargoyle_sheet' : 'dragon_sheet');
    enemy.setData('type', type);
    enemy.setData('state', 'idle');
    enemy.setData('hurtTimer', 0);
    enemy.setCollideWorldBounds(true);
    this.enemiesGroup.add(enemy);
    this.ysortGroup.add(enemy);

    if (type === 'Slime') {
      enemy.setDisplaySize(80, 85);
      enemy.body.setSize(40, 30);
      enemy.body.setOffset(76, 140);
      enemy.setData('hp', 2);
      enemy.setData('maxHp', 2);
      enemy.setData('speed', 90);
      enemy.setData('damage', 1);
      enemy.play('slime_walk_down');
    } else if (type === 'Gargoyle') {
      enemy.setDisplaySize(86, 92);
      enemy.body.setSize(45, 30);
      enemy.body.setOffset(73, 140);
      enemy.setData('hp', 3);
      enemy.setData('maxHp', 3);
      enemy.setData('speed', 110);
      enemy.setData('damage', 1);
      enemy.setData('shootCooldown', 1500); // shots interval
      enemy.setData('lastShotTime', 0);
      enemy.play('garg_walk_down');
    } else if (type === 'BossDragon') {
      enemy.setDisplaySize(192, 208); // Big dragon Boss!
      enemy.body.setSize(90, 70);
      enemy.body.setOffset(51, 115);
      enemy.setData('hp', 20); // 20 hearts of Boss HP
      enemy.setData('maxHp', 20);
      enemy.setData('speed', 130);
      enemy.setData('damage', 1);
      enemy.setData('attackCooldown', 2200);
      enemy.setData('lastAttackTime', 0);
      enemy.play('dragon_walk_down');
    }

    return enemy;
  },


  spawnTrap(x, y) {
    // Render static trap
    const trap = this.trapsGroup.create(x, y, 'tile_5');
    trap.setDisplaySize(64, 64);
    trap.refreshBody(); // sync overlap body to 64x64 (tile art is 256px)
    trap.setDepth(DEPTH.DECOR_FLOOR);
    trap.setData('lastDamageTime', 0);
  },


  spawnChest(x, y) {
    const chest = this.chestsGroup.create(x, y, 'chest_sheet', 0);
    chest.setDisplaySize(64, 64);
    chest.setData('opened', false);
    chest.setDepth(DEPTH.YSORT + y);
    chest.body.setSize(48, 40);
    chest.body.setOffset(40, 44);
    this.ysortGroup.add(chest);
  },


  spawnPortal(x, y) {
    const portal = this.portalGroup.create(x, y, 'tile_6');
    portal.setDisplaySize(64, 64);
    portal.refreshBody(); // sync overlap body to 64x64 (tile art is 256px)
    portal.setDepth(DEPTH.DECOR_FLOOR);
    portal.setAlpha(0.3); // faded/inactive initially
  },


  activatePortal() {
    this.portalActive = true;
    this.portalGroup.getChildren().forEach(portal => {
      portal.setAlpha(1.0);
      // portal spinning visual spark loop
      this.tweens.add({
        targets: portal,
        angle: 360,
        duration: 3000,
        repeat: -1
      });
      // spawn sparkles around portal
      this.time.addEvent({
        delay: 500,
        callback: () => {
          if (this.portalActive) this.createSparks(portal.x, portal.y, 0x22d3ee, 8);
        },
        repeat: -1
      });
    });

    window.GameHUD?.setObjective("地牢传送门已激活！前往下一层地牢。");
    this.showFloorBanner("传送阵已激活！");
  },


  openChest(chest) {
    chest.setData('opened', true);
    chest.play('chest_open');

    // spawn particles / item glow
    this.time.delayedCall(400, () => {
      // Golden shine particles
      this.createSparks(chest.x, chest.y, 0xfbbf24, 15);
      
      // Heal or boost score
      if (this.playerHp < this.maxHp) {
        this.playerHp = Math.min(this.maxHp, this.playerHp + 1);
        window.GameHUD?.setHearts(this.playerHp, this.maxHp);
        this.showFloatingText(chest.x, chest.y - 30, "+1 HP", "#4ade80");
        this.createHealingSparkles();
      } else {
        this.showFloatingText(chest.x, chest.y - 30, "获得古代秘宝！", "#fbbf24");
      }
    });
  },


  showDungeonNarration(lines, duration = 2500) {
    const existing = document.getElementById('dungeon-narration');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'dungeon-narration';
    banner.style.cssText = `
      position:absolute; left:50%; transform:translateX(-50%); top:20%;
      z-index:100; pointer-events:none; text-align:center;
      background:rgba(10,20,10,0.82); border:1px solid #4ade80;
      border-radius:12px; padding:16px 32px; font-family:'Courier New',serif;
    `;
    banner.innerHTML = lines.map((l, i) =>
      `<div style="color:${i===0?'#4ade80':'#d1fae5'};font-size:${i===0?'17px':'13px'};
        font-weight:${i===0?'bold':'normal'};margin:3px 0;
        text-shadow:0 0 8px rgba(74,222,128,0.6)">${l}</div>`
    ).join('');
    const gameContainer = document.querySelector('#game-container') || document.body;
    gameContainer.appendChild(banner);

    this.time.delayedCall(duration, () => {
      banner.style.transition = 'opacity 0.5s';
      banner.style.opacity = '0';
      this.time.delayedCall(500, () => banner.remove());
    });
  },


  advanceToNextLevel() {
    this.currentLevel++;
    if (this.currentLevel > 5) {
      // Won game
      this.handleGameOver(true);
      return;
    }

    // Advance Level
    this.player.scaleX = 1;
    this.player.scaleY = 1;
    this.player.angle = 0;
    this.player.alpha = 1;
    this.isTransitioning = false;

    // HUD Update
    window.GameHUD?.setScore(this.currentLevel);

    // Regenerate
    this.generateLevel(this.currentLevel);

    // Floor story narration
    const floorStory = {
      2: ['🌿 第二层：藤蔓走廊', '黑雾在此处愈发浓厚，藤蔓如手臂般向你伸来。', '守卫的嚎叫声从深处传来……'],
      3: ['🔥 第三层：炽热前哨', '地面开始发烫，岩浆在裂缝中流淌。', '黑雾已化为炽热的怒焰——小心！'],
      4: ['🌋 第四层：熔岩地核', '这里是遗迹最深处，黑雾的源头就在前方。', '你已能感受到Boss巨龙的气息……'],
      5: ['💀 第五层：核心神殿', '黑雾核心就在这里——一条被黑雾腐蚀的巨龙在等待你。', '它就是导致一切灾难的根源。', '消灭它，让阳光重新照耀这片森林！']
    };

    const story = floorStory[this.currentLevel];
    if (story) {
      this.showDungeonNarration(story, this.currentLevel === 5 ? 4000 : 2800);
    }

    // Floor Display Text Banner
    this.showFloorBanner(`第 ${this.currentLevel} 层：${this.getFloorName(this.currentLevel)}`);
    window.GameHUD?.setObjective(this.currentLevel === 5 ? "消灭黑雾核心守护者龙以获得胜利！" : "消灭本层所有怪物以开启传送门！");
  },


  showFloorBanner(title) {
    const bannerBg = this.add.rectangle(
      this.sys.game.config.width / 2, 
      120, 
      this.sys.game.config.width, 
      80, 
      0x0f172a, 
      0.85
    ).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.EFFECTS + 80);

    const bannerText = this.add.text(
      this.sys.game.config.width / 2, 
      120, 
      title, 
      { font: 'bold 26px monospace', fill: '#fef08a' }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.EFFECTS + 81);

    this.tweens.add({
      targets: [bannerBg, bannerText],
      alpha: { from: 1, to: 0 },
      delay: 2000,
      duration: 800,
      onComplete: () => {
        bannerBg.destroy();
        bannerText.destroy();
      }
    });
  },


  // -------------------------------------------------------------
  // FLOOR META INFO & BOSS HEALTH BAR UI
  // -------------------------------------------------------------
  getFloorName(level) {
    const names = ["青苔遗迹", "藤蔓走廊", "炽热前哨", "熔岩地核", "核心神殿"];
    return names[level - 1] || "遗迹深处";
  }
});
