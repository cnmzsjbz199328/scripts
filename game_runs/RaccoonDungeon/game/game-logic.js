const DEPTH = {
  GROUND: 0,
  DECOR_FLOOR: 100,
  YSORT: 1000,
  DECOR_TOP: 9000,
  EFFECTS: 9500
};

class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
  }

  init() {
    // Game state
    this.currentLevel = 1;
    this.playerHp = 5;
    this.maxHp = 5;
    this.enemiesKilled = 0;
    this.totalEnemiesInLevel = 0;
    this.portalActive = false;
    this.bossDefeated = false;
    this.healingCooldown = 0;
    this.magicCooldown = 0;
    this.isTransitioning = false;
    
    // Player status
    this.facingDirection = 'down'; // 'down', 'up', 'left', 'right'
  }

  preload() {
    // 1. Load tiles dynamically from tileIndex
    for (const key in TILEMAP_DATA.tileIndex) {
      const name = TILEMAP_DATA.tileIndex[key];
      this.load.image(`tile_${key}`, `assets/tiles/${name}.png`);
    }

    // 2. Load characters spritesheets
    this.load.spritesheet('raccoon_sheet', 'assets/sprites/RaccoonMage.webp', {
      frameWidth: 192,
      frameHeight: 208
    });
    this.load.spritesheet('slime_sheet', 'assets/sprites/Slime.webp', {
      frameWidth: 192,
      frameHeight: 208
    });
    this.load.spritesheet('gargoyle_sheet', 'assets/sprites/Gargoyle.webp', {
      frameWidth: 192,
      frameHeight: 208
    });
    this.load.spritesheet('dragon_sheet', 'assets/sprites/BossDragon.webp', {
      frameWidth: 192,
      frameHeight: 208
    });

    // 3. Load chest spritesheet
    this.load.spritesheet('chest_sheet', 'assets/objects/chest.webp', {
      frameWidth: 128,
      frameHeight: 128
    });
  }

  create() {
    this.DEPTH = DEPTH;
    this.mapW = GAME_CONFIG.map.width;
    this.mapH = GAME_CONFIG.map.height;
    this.tileW = GAME_CONFIG.map.tileWidth;
    this.tileH = GAME_CONFIG.map.tileHeight;

    // Build Physics Groups
    this.ysortGroup = this.add.group();
    this.obstaclesGroup = this.physics.add.staticGroup();
    this.enemiesGroup = this.physics.add.group();
    this.projectilesGroup = this.physics.add.group();
    this.trapsGroup = this.physics.add.staticGroup();
    this.chestsGroup = this.physics.add.staticGroup();
    this.portalGroup = this.physics.add.staticGroup();

    // Create Animations
    this.createAnimations();

    // Initialize Game state UI hooks
    this.gameStarted = false;
    if (window.GameHUD) {
      window.GameHUD.onStart(() => {
        this.gameStarted = true;
        // Set initial HUD
        window.GameHUD.setHearts(this.playerHp, this.maxHp);
        window.GameHUD.setScore(this.currentLevel);
        window.GameHUD.setObjective("消灭本层所有怪物以开启传送门！");
      });
    } else {
      this.gameStarted = true;
    }

    // Generate Level Map
    this.generateLevel(this.currentLevel);

    // Create inputs
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    this.keyJ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J); // Melee
    this.keyK = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K); // Magic Fireball
    this.keyL = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L); // Healing
    this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E); // Interact

    // Camera
    this.cameras.main.setBounds(0, 0, this.mapW, this.mapH);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.0);

    // Colliders
    this.physics.add.collider(this.player, this.obstaclesGroup);
    this.physics.add.collider(this.enemiesGroup, this.obstaclesGroup);
    this.physics.add.collider(this.enemiesGroup, this.enemiesGroup);
    
    // Projectiles overlaps
    this.physics.add.overlap(this.projectilesGroup, this.enemiesGroup, this.handleProjectileEnemyOverlap, null, this);
    this.physics.add.overlap(this.projectilesGroup, this.obstaclesGroup, this.handleProjectileObstacleOverlap, null, this);

    // Traps overlap
    this.physics.add.overlap(this.player, this.trapsGroup, this.handlePlayerTrapOverlap, null, this);
    
    // Portal overlap
    this.physics.add.overlap(this.player, this.portalGroup, this.handlePlayerPortalOverlap, null, this);

    // Screen Flash Overlay (Red for damage, green for healing)
    this.flashOverlay = this.add.rectangle(0, 0, this.sys.game.config.width, this.sys.game.config.height, 0xff0000)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(DEPTH.EFFECTS + 100)
      .setAlpha(0);

    // Floor Display Text Banner
    this.showFloorBanner(`第 ${this.currentLevel} 层：${this.getFloorName(this.currentLevel)}`);
  }

  update(time, delta) {
    if (!this.gameStarted || this.playerHp <= 0 || this.isTransitioning) {
      if (this.player && this.player.body) this.player.body.setVelocity(0);
      return;
    }

    // 1. Handle Cooldowns
    if (this.healingCooldown > 0) this.healingCooldown -= delta;
    if (this.magicCooldown > 0) this.magicCooldown -= delta;

    // 2. Handle Player Input and Movement
    this.handlePlayerMovement();

    // 3. Handle Player Skills
    this.handlePlayerSkills();

    // 4. Update Depth Sorting (Y-Sort)
    this.player.setDepth(DEPTH.YSORT + this.player.y);
    this.ysortGroup.getChildren().forEach(sprite => {
      sprite.setDepth(DEPTH.YSORT + sprite.y);
    });

    // 5. Update Enemies AI
    this.updateEnemies();
  }

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
  }

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
  }

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
  }

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
  }

  spawnTrap(x, y) {
    // Render static trap
    const trap = this.trapsGroup.create(x, y, 'tile_5');
    trap.setDisplaySize(64, 64);
    trap.refreshBody(); // sync overlap body to 64x64 (tile art is 256px)
    trap.setDepth(DEPTH.DECOR_FLOOR);
    trap.setData('lastDamageTime', 0);
  }

  spawnChest(x, y) {
    const chest = this.chestsGroup.create(x, y, 'chest_sheet', 0);
    chest.setDisplaySize(64, 64);
    chest.setData('opened', false);
    chest.setDepth(DEPTH.YSORT + y);
    chest.body.setSize(48, 40);
    chest.body.setOffset(40, 44);
    this.ysortGroup.add(chest);
  }

  spawnPortal(x, y) {
    const portal = this.portalGroup.create(x, y, 'tile_6');
    portal.setDisplaySize(64, 64);
    portal.refreshBody(); // sync overlap body to 64x64 (tile art is 256px)
    portal.setDepth(DEPTH.DECOR_FLOOR);
    portal.setAlpha(0.3); // faded/inactive initially
  }

  // -------------------------------------------------------------
  // CONTROLS & PLAYER ACTIONS
  // -------------------------------------------------------------
  handlePlayerMovement() {
    // Guard against attacking anim locks
    const activeAnim = this.player.anims.currentAnim?.key;
    if (activeAnim === 'attack_melee' || activeAnim === 'attack_magic' || activeAnim === 'heal' || activeAnim === 'hurt') {
      if (this.player.anims.isPlaying) {
        this.player.body.setVelocity(0);
        return;
      }
    }

    let vx = 0;
    let vy = 0;
    const speed = GAME_CONFIG.player.speed;

    if (this.cursors.left.isDown || this.keyA.isDown) {
      vx = -speed;
      this.facingDirection = 'left';
    } else if (this.cursors.right.isDown || this.keyD.isDown) {
      vx = speed;
      this.facingDirection = 'right';
    }

    if (this.cursors.up.isDown || this.keyW.isDown) {
      vy = -speed;
      this.facingDirection = 'up';
    } else if (this.cursors.down.isDown || this.keyS.isDown) {
      vy = speed;
      this.facingDirection = 'down';
    }

    // Normalize diagonal velocity
    if (vx !== 0 && vy !== 0) {
      vx *= 0.7071;
      vy *= 0.7071;
    }

    this.player.body.setVelocity(vx, vy);

    // Play walk animation
    if (vx !== 0 || vy !== 0) {
      let animKey = 'walk_down';
      if (this.facingDirection === 'up') animKey = 'walk_up';
      else if (this.facingDirection === 'left') animKey = 'walk_left';
      else if (this.facingDirection === 'right') animKey = 'walk_left'; // uses flipX

      if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== animKey) {
        this.player.play(animKey);
      }
      this.player.setFlipX(this.facingDirection === 'right');
    } else {
      // Idle frame locks
      this.player.body.setVelocity(0);
      let idleFrame = 0; // walk_down idle
      if (this.facingDirection === 'up') idleFrame = 9; // walk_up idle
      else if (this.facingDirection === 'left') idleFrame = 18; // walk_left idle
      else if (this.facingDirection === 'right') idleFrame = 18;
      
      this.player.anims.stop();
      this.player.setFrame(idleFrame);
      this.player.setFlipX(this.facingDirection === 'right');
    }
  }

  handlePlayerSkills() {
    // 1. Interact Key (E) - Open chests / portals
    if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
      this.handleInteractAction();
    }

    // Block combat inputs if transitioning
    if (this.isTransitioning) return;

    // 2. Melee Attack (J)
    if (Phaser.Input.Keyboard.JustDown(this.keyJ)) {
      this.performMeleeAttack();
    }

    // 3. Magic Fireball Attack (K)
    if (Phaser.Input.Keyboard.JustDown(this.keyK) && this.magicCooldown <= 0) {
      this.performMagicAttack();
    }

    // 4. Healing prayer Spell (L)
    if (Phaser.Input.Keyboard.JustDown(this.keyL) && this.healingCooldown <= 0) {
      this.performHealingSpell();
    }
  }

  // -------------------------------------------------------------
  // COMBAT IMPLEMENTATIONS
  // -------------------------------------------------------------
  performMeleeAttack() {
    this.player.body.setVelocity(0);
    this.player.play('attack_melee');
    this.player.setFlipX(this.facingDirection === 'right');

    // Wait for the swing impact frame (approx frame 4)
    this.time.delayedCall(200, () => {
      // Create hitbox in front of player
      let range = 80;
      let hx = this.player.x;
      let hy = this.player.y;

      if (this.facingDirection === 'left') hx -= range;
      else if (this.facingDirection === 'right') hx += range;
      else if (this.facingDirection === 'up') hy -= range;
      else if (this.facingDirection === 'down') hy += range;

      // Draw swipe visual spark
      this.createSwipeEffect(hx, hy);

      // Check hits on enemies group
      this.enemiesGroup.getChildren().forEach(enemy => {
        if (!enemy.active || enemy.getData('hp') <= 0) return;
        const dist = Phaser.Math.Distance.Between(hx, hy, enemy.x, enemy.y);
        if (dist <= 75) {
          this.damageEnemy(enemy, 1); // Melee deals 1 damage
          // Knockback
          this.applyKnockback(enemy, this.facingDirection, 180);
        }
      });

      // Check interact with chests near front
      this.chestsGroup.getChildren().forEach(chest => {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, chest.x, chest.y);
        if (dist <= 96 && !chest.getData('opened')) {
          this.openChest(chest);
        }
      });
    });
  }

  performMagicAttack() {
    this.player.body.setVelocity(0);
    this.player.play('attack_magic');
    this.player.setFlipX(this.facingDirection === 'right');
    this.magicCooldown = 500; // 0.5s cooldown

    this.time.delayedCall(150, () => {
      // Spawn fireball projectile
      let px = this.player.x;
      let py = this.player.y - 10;
      let dx = 0;
      let dy = 0;
      let angle = 0;

      if (this.facingDirection === 'left') { px -= 40; dx = -450; angle = 180; }
      else if (this.facingDirection === 'right') { px += 40; dx = 450; angle = 0; }
      else if (this.facingDirection === 'up') { py -= 40; dy = -450; angle = -90; }
      else if (this.facingDirection === 'down') { py += 40; dy = 450; angle = 90; }

      // Fireball visual representation (custom small circle)
      const fb = this.physics.add.sprite(px, py, 'raccoon_sheet', 39); // using magic projectile frame or custom colored circle
      fb.setDisplaySize(40, 40);
      fb.setTint(0xff7700); // orange fireball
      fb.setAngle(angle);
      fb.body.setGravityY(0);
      fb.body.setVelocity(dx, dy);
      fb.setDepth(DEPTH.EFFECTS);
      fb.setData('damage', 2); // Fireball deals 2 damage

      this.projectilesGroup.add(fb);

      // Light trail particle emission simulator
      this.time.addEvent({
        delay: 50,
        callback: () => {
          if (fb.active) this.createSparks(fb.x, fb.y, 0xffaa00, 3);
        },
        repeat: 12
      });

      // Destroy if it flies off-screen
      this.time.delayedCall(2000, () => {
        if (fb.active) fb.destroy();
      });
    });
  }

  performHealingSpell() {
    this.player.body.setVelocity(0);
    this.player.play('heal');
    this.player.setFlipX(this.facingDirection === 'right');
    this.healingCooldown = 8000; // 8s cooldown

    this.time.delayedCall(200, () => {
      if (this.playerHp < this.maxHp) {
        this.playerHp = Math.min(this.maxHp, this.playerHp + 1);
        window.GameHUD?.setHearts(this.playerHp, this.maxHp);
        
        // Healing green sparkles float up
        this.createHealingSparkles();
        this.showFloatingText(this.player.x, this.player.y - 50, "+1 HP", "#4ade80");
        this.flashScreen(0x22c55e, 0.2); // Green flash
      } else {
        this.showFloatingText(this.player.x, this.player.y - 50, "HP已满！", "#ffffff");
      }
    });
  }

  // -------------------------------------------------------------
  // COLLISION HANDLERS & COMBAT ACTIONS
  // -------------------------------------------------------------
  damagePlayer(amount) {
    if (this.playerHp <= 0 || this.isTransitioning) return;
    const now = this.time.now;
    if (now - (this._lastDamageTime || 0) < 700) return; // 0.7s iFrame
    this._lastDamageTime = now;

    this.playerHp = Math.max(0, this.playerHp - amount);
    window.GameHUD?.setHearts(this.playerHp, this.maxHp);

    // Hurt effects
    this.player.play('hurt');
    this.cameras.main.shake(150, 0.015);
    this.flashScreen(0xef4444, 0.35); // red flash
    this.showFloatingText(this.player.x, this.player.y - 50, `-${amount} HP`, "#ef4444");

    // Apply brief recoil
    let rx = 0, ry = 0;
    if (this.facingDirection === 'left') rx = 80;
    else if (this.facingDirection === 'right') rx = -80;
    else if (this.facingDirection === 'up') ry = 80;
    else if (this.facingDirection === 'down') ry = -80;
    this.player.body.setVelocity(rx, ry);

    if (this.playerHp <= 0) {
      this.handleGameOver(false);
    }
  }

  damageEnemy(enemy, amount) {
    if (!enemy.active || enemy.getData('hp') <= 0) return;

    const currentHp = enemy.getData('hp') - amount;
    enemy.setData('hp', currentHp);

    // Floating text
    this.showFloatingText(enemy.x, enemy.y - 40, `-${amount}`, "#fbbf24");
    this.createSparks(enemy.x, enemy.y, 0xff0000, 6);

    // Play hurt animation
    const type = enemy.getData('type');
    let hurtAnim = 'slime_hurt';
    if (type === 'Gargoyle') hurtAnim = 'garg_hurt';
    else if (type === 'BossDragon') hurtAnim = 'dragon_hurt';

    enemy.play(hurtAnim);
    enemy.setData('hurtTimer', 300); // 300ms stun

    // Update Boss health bar
    if (type === 'BossDragon') {
      this.updateBossHealthBar(currentHp, enemy.getData('maxHp'));
    }

    if (currentHp <= 0) {
      this.killEnemy(enemy);
    }
  }

  killEnemy(enemy) {
    enemy.body.setVelocity(0);
    enemy.body.enable = false;

    const type = enemy.getData('type');
    let deathAnim = 'slime_death';
    if (type === 'Gargoyle') deathAnim = 'garg_death';
    else if (type === 'BossDragon') deathAnim = 'dragon_death';

    enemy.play(deathAnim);

    enemy.once('animationcomplete', () => {
      enemy.destroy();
      this.enemiesKilled++;

      // Check level completion
      if (type === 'BossDragon') {
        this.bossDefeated = true;
        this.destroyBossHealthBar();
        this.handleGameOver(true);
      } else {
        const remaining = this.totalEnemiesInLevel - this.enemiesKilled;
        if (remaining <= 0) {
          this.activatePortal();
        } else {
          this.showFloatingText(this.player.x, this.player.y - 60, `剩余怪物: ${remaining}`, "#a5f3fc");
        }
      }
    });
  }

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
  }

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
  }

  // -------------------------------------------------------------
  // COLLISION ACTIONS
  // -------------------------------------------------------------
  handleProjectileEnemyOverlap(projectile, enemy) {
    if (!enemy.active || enemy.getData('hp') <= 0) return;
    
    // Deal damage
    const dmg = projectile.getData('damage');
    this.damageEnemy(enemy, dmg);

    // Apply knockback
    const dir = projectile.body.velocity.x > 0 ? 'right' : projectile.body.velocity.x < 0 ? 'left' : projectile.body.velocity.y > 0 ? 'down' : 'up';
    this.applyKnockback(enemy, dir, 250);

    // Spark blast
    this.createSparks(projectile.x, projectile.y, 0xff7700, 12);

    // Destroy fireball
    projectile.destroy();
  }

  handleProjectileObstacleOverlap(projectile, obstacle) {
    this.createSparks(projectile.x, projectile.y, 0xffaa00, 8);
    projectile.destroy();
  }

  handlePlayerTrapOverlap(player, trap) {
    const time = this.time.now;
    const lastDmg = trap.getData('lastDamageTime') || 0;
    if (time - lastDmg > 1500) { // 1.5s damage interval
      trap.setData('lastDamageTime', time);
      
      // Flash trap visual warning
      this.tweens.add({
        targets: trap,
        tint: 0xff0000,
        duration: 100,
        yoyo: true,
        repeat: 2
      });

      this.damagePlayer(1); // Trap deals 1 damage
    }
  }

  handlePlayerPortalOverlap(player, portal) {
    if (!this.portalActive || this.isTransitioning) return;
    
    this.isTransitioning = true;
    player.body.setVelocity(0);
    
    // Zoom/fade transition animation
    this.tweens.add({
      targets: player,
      angle: 720,
      scaleX: 0.1,
      scaleY: 0.1,
      alpha: 0,
      duration: 800,
      onComplete: () => {
        this.advanceToNextLevel();
      }
    });
  }

  handleInteractAction() {
    // Check closest chest
    this.chestsGroup.getChildren().forEach(chest => {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, chest.x, chest.y);
      if (dist <= 96 && !chest.getData('opened')) {
        this.openChest(chest);
      }
    });

    // Check closest portal
    if (this.portalActive) {
      this.portalGroup.getChildren().forEach(portal => {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, portal.x, portal.y);
        if (dist <= 80) {
          this.handlePlayerPortalOverlap(this.player, portal);
        }
      });
    }
  }

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
  }

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
  }

  // -------------------------------------------------------------
  // ENEMIES AI & BEHAVIOR
  // -------------------------------------------------------------
  updateEnemies() {
    const time = this.time.now;
    this.enemiesGroup.getChildren().forEach(enemy => {
      if (!enemy.active || enemy.getData('hp') <= 0) return;

      // Hurt stun guard
      let hurtTimer = enemy.getData('hurtTimer') || 0;
      if (hurtTimer > 0) {
        enemy.setData('hurtTimer', hurtTimer - this.game.loop.delta);
        enemy.body.setVelocity(0);
        return;
      }

      const type = enemy.getData('type');
      const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);

      if (type === 'Slime') {
        // Slimes bounce towards player if within 450px
        if (dist < 450) {
          const speed = enemy.getData('speed');
          const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
          
          enemy.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
          
          // Animate walk and flipX depending on x direction
          const vx = enemy.body.velocity.x;
          const vy = enemy.body.velocity.y;
          let animKey = 'slime_walk_down';
          if (Math.abs(vx) > Math.abs(vy)) {
            animKey = 'slime_walk_left';
          }
          if (!enemy.anims.isPlaying || enemy.anims.currentAnim?.key !== animKey) {
            enemy.play(animKey);
          }
          enemy.setFlipX(vx > 0);
          
          // Deal damage on overlap
          if (dist <= 48) {
            this.handleEnemyMeleeContact(enemy);
          }
        } else {
          enemy.body.setVelocity(0);
          enemy.play('slime_walk_down', true);
        }
      } else if (type === 'Gargoyle') {
        // Gargoyles stay back and shoot bullets, or fly towards player
        if (dist < 500) {
          const speed = enemy.getData('speed');
          const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);

          if (dist > 250) {
            // Move closer
            enemy.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
          } else if (dist < 150) {
            // Retract/back away slightly
            enemy.body.setVelocity(-Math.cos(angle) * speed * 0.7, -Math.sin(angle) * speed * 0.7);
          } else {
            enemy.body.setVelocity(0);
          }

          // Animate walk and flipX depending on x direction
          const vx = enemy.body.velocity.x;
          const vy = enemy.body.velocity.y;
          if (Math.abs(vx) > 10 || Math.abs(vy) > 10) {
            let animKey = 'garg_walk_down';
            if (Math.abs(vx) > Math.abs(vy)) {
              animKey = 'garg_walk_left';
            }
            if (!enemy.anims.isPlaying || enemy.anims.currentAnim?.key !== animKey) {
              enemy.play(animKey);
            }
            enemy.setFlipX(vx > 0);
          } else {
            enemy.anims.stop();
            enemy.setFrame(this.player.x > enemy.x ? 18 : 0); // face left or front idle
            enemy.setFlipX(this.player.x > enemy.x);
          }

          // Ranged attack
          const lastShot = enemy.getData('lastShotTime') || 0;
          const cd = enemy.getData('shootCooldown');
          if (time - lastShot > cd) {
            enemy.setData('lastShotTime', time);
            this.gargoyleShoot(enemy, angle);
          }

          // Damage contact
          if (dist <= 48) {
            this.handleEnemyMeleeContact(enemy);
          }
        } else {
          enemy.body.setVelocity(0);
          enemy.play('garg_walk_down', true);
        }
      } else if (type === 'BossDragon') {
        // Boss Dragon behaviors
        const speed = enemy.getData('speed');
        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);

        // Move towards player slowly
        enemy.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

        // Animate walk and flipX depending on x direction
        const vx = enemy.body.velocity.x;
        const vy = enemy.body.velocity.y;
        
        // Dragon attack anim lock
        if (enemy.anims.currentAnim?.key !== 'dragon_attack' || !enemy.anims.isPlaying) {
          if (Math.abs(vx) > 10 || Math.abs(vy) > 10) {
            let animKey = 'dragon_walk_down';
            if (Math.abs(vx) > Math.abs(vy)) {
              animKey = 'dragon_walk_left';
            }
            if (!enemy.anims.isPlaying || enemy.anims.currentAnim?.key !== animKey) {
              enemy.play(animKey);
            }
            enemy.setFlipX(vx > 0);
          }
        }

        // Fire breath attack
        const lastAtt = enemy.getData('lastAttackTime') || 0;
        const cd = enemy.getData('attackCooldown');
        if (time - lastAtt > cd) {
          enemy.setData('lastAttackTime', time);
          this.dragonBreathAttack(enemy);
        }

        // Deal contact damage
        if (dist <= 85) {
          this.handleEnemyMeleeContact(enemy);
        }
      }
    });
  }

  handleEnemyMeleeContact(enemy) {
    this.damagePlayer(1);
  }

  gargoyleShoot(enemy, angle) {
    // Shoot small stone bullet
    const bx = enemy.x;
    const by = enemy.y - 10;
    
    const bullet = this.physics.add.sprite(bx, by, 'gargoyle_sheet', 17); // simple bullet frame
    bullet.setDisplaySize(20, 20);
    bullet.setTint(0x94a3b8); // grey stone tint
    bullet.body.setVelocity(Math.cos(angle) * 300, Math.sin(angle) * 300);
    bullet.setDepth(DEPTH.EFFECTS);

    this.physics.add.overlap(this.player, bullet, (player, b) => {
      b.destroy();
      this.damagePlayer(1);
    });

    this.time.delayedCall(2500, () => {
      if (bullet.active) bullet.destroy();
    });
  }

  dragonBreathAttack(enemy) {
    enemy.body.setVelocity(0);
    enemy.play('dragon_attack');

    this.time.delayedCall(400, () => {
      const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      const breathRange = 220;
      let breathHit = false; // cap breath to 1 damage event per cast

      // Visual warning cone
      this.cameras.main.shake(300, 0.008);

      // Spawn fire sparks inside cone
      for (let i = 0; i < 20; i++) {
        this.time.delayedCall(i * 30, () => {
          if (!enemy.active) return;

          const spread = (Math.random() - 0.5) * 0.45;
          const a = angle + spread;
          const dist = Math.random() * breathRange + 30;
          const fx = enemy.x + Math.cos(a) * dist;
          const fy = enemy.y + Math.sin(a) * dist;

          // Spark particle
          this.createSparks(fx, fy, 0xf97316, 2);

          // Check hit — only deal damage once per breath cast
          if (!breathHit) {
            const pd = Phaser.Math.Distance.Between(fx, fy, this.player.x, this.player.y);
            if (pd <= 45) {
              breathHit = true;
              this.damagePlayer(1);
            }
          }
        });
      }
    });
  }

  // -------------------------------------------------------------
  // AUDIO-VISUAL & EFFECTS POLISHING
  // -------------------------------------------------------------
  createSparks(x, y, color = 0xffffff, count = 8) {
    for (let i = 0; i < count; i++) {
      const sp = this.add.circle(x, y, Math.random() * 4 + 2, color);
      sp.setDepth(DEPTH.EFFECTS);
      
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 150 + 50;

      this.physics.add.existing(sp);
      sp.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

      // Fade out
      this.tweens.add({
        targets: sp,
        alpha: 0,
        scaleX: 0.1,
        scaleY: 0.1,
        duration: Math.random() * 400 + 300,
        onComplete: () => {
          sp.destroy();
        }
      });
    }
  }

  createSwipeEffect(x, y) {
    const swipe = this.add.circle(x, y, 40, 0xfef08a, 0.3);
    swipe.setDepth(DEPTH.EFFECTS);
    this.tweens.add({
      targets: swipe,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 250,
      onComplete: () => {
        swipe.destroy();
      }
    });
  }

  createHealingSparkles() {
    for (let i = 0; i < 15; i++) {
      this.time.delayedCall(i * 80, () => {
        if (!this.player.active) return;
        const hx = this.player.x + (Math.random() - 0.5) * 50;
        const hy = this.player.y + (Math.random() - 0.5) * 60;
        const sparkle = this.add.circle(hx, hy, Math.random() * 3 + 2, 0x4ade80);
        sparkle.setDepth(DEPTH.EFFECTS);

        this.physics.add.existing(sparkle);
        sparkle.body.setVelocity(0, -100);

        this.tweens.add({
          targets: sparkle,
          alpha: 0,
          scaleX: 0.2,
          scaleY: 0.2,
          duration: 600,
          onComplete: () => sparkle.destroy()
        });
      });
    }
  }

  applyKnockback(enemy, direction, speed) {
    let kx = 0;
    let ky = 0;
    if (direction === 'left') kx = -speed;
    else if (direction === 'right') kx = speed;
    else if (direction === 'up') ky = -speed;
    else if (direction === 'down') ky = speed;

    enemy.body.setVelocity(kx, ky);
  }

  flashScreen(color, alpha) {
    this.flashOverlay.setFillStyle(color);
    this.flashOverlay.setAlpha(alpha);
    this.tweens.add({
      targets: this.flashOverlay,
      alpha: 0,
      duration: 350
    });
  }

  showFloatingText(x, y, message, color = '#ffffff') {
    const txt = this.add.text(x, y, message, {
      font: 'bold 22px monospace',
      fill: color,
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);
    txt.setDepth(DEPTH.EFFECTS + 50);

    this.tweens.add({
      targets: txt,
      y: y - 60,
      alpha: 0,
      duration: 900,
      onComplete: () => {
        txt.destroy();
      }
    });
  }

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
  }

  // -------------------------------------------------------------
  // FLOOR META INFO & BOSS HEALTH BAR UI
  // -------------------------------------------------------------
  getFloorName(level) {
    const names = ["青苔遗迹", "藤蔓走廊", "炽热前哨", "熔岩地核", "核心神殿"];
    return names[level - 1] || "遗迹深处";
  }

  createBossHealthBar() {
    this.bossBarContainer = this.add.container(this.sys.game.config.width / 2, 50).setScrollFactor(0).setDepth(DEPTH.EFFECTS + 90);
    
    // Background bar
    const bg = this.add.rectangle(0, 0, 360, 24, 0x1e293b).setOrigin(0.5);
    // Fill bar
    const bar = this.add.rectangle(-176, 0, 352, 16, 0xef4444).setOrigin(0, 0.5);
    bar.setName('barFill');

    // Title
    const title = this.add.text(0, -26, 'BOSS: 黑雾守护者龙', {
      font: 'bold 16px monospace',
      fill: '#fef08a',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);

    this.bossBarContainer.add([bg, bar, title]);
  }

  updateBossHealthBar(hp, maxHp) {
    if (!this.bossBarContainer) return;
    const bar = this.bossBarContainer.getByName('barFill');
    if (bar) {
      const ratio = Math.max(0, hp / maxHp);
      bar.setSize(352 * ratio, 16);
    }
  }

  destroyBossHealthBar() {
    if (this.bossBarContainer) {
      this.bossBarContainer.destroy();
      this.bossBarContainer = null;
    }
  }

  // -------------------------------------------------------------
  // GAME OVER / WIN MANAGEMENT
  // -------------------------------------------------------------
  handleGameOver(win) {
    this.gameStarted = false;
    if (this.player && this.player.body) this.player.body.setVelocity(0);

    if (win) {
      window.GameHUD?.showGameOver(true,
        '🌟 黑雾消散！\n\n' +
        '你击败了黑雾核心守护者——那条被腐蚀的古老巨龙。\n' +
        '随着龙的倒下，黑雾如同被春风吹散，\n' +
        '遗迹的裂缝中，一缕缕温暖的阳光重新渗透进来。\n\n' +
        '小浣熊法师带着秘宝欢快地回到了阳光明媚的森林，\n' +
        '鸟儿歌唱，花朵盛开，一切都恢复了生机。\n\n' +
        '吉卜力遗迹，永远记住了这位茸茸帽法师的名字。'
      );
    } else {
      window.GameHUD?.showGameOver(false,
        '🌑 法师倒下了……\n\n' +
        '黑雾紧紧包裹住了小浣熊，法杖从手中滑落……\n' +
        '遗迹深处，巨龙的低鸣再次响彻石壁。\n\n' +
        '但茸茸帽里，还有最后一颗光之晶核……\n也许，这不是终点。'
      );
    }
  }
}

// Phaser 3 configuration setup
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: MainScene
};

// Start the game!
new Phaser.Game(config);
