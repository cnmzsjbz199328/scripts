const DEPTH = {
  GROUND: 0,
  DECOR_FLOOR: 100,
  YSORT: 1000,
  DECOR_TOP: 9000,
  EFFECTS: 9500
};

// Level definitions
const LEVELS = [
  {
    title: "关卡 1/5：单色方块练习",
    spawn: { x: 3, y: 5 },
    grid: [
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
      [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
      [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
      [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
      [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
      [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
      [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
      [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
      [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
      [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]
    ],
    targets: [
      { x: 9, y: 5, color: 'red' }
    ],
    boxes: [
      { x: 6, y: 5, color: 'red' }
    ],
    gears: [
      { x: 0, y: 0 }, { x: 12, y: 0 }, { x: 0, y: 10 }, { x: 12, y: 10 }
    ]
  },
  {
    title: "关卡 2/5：双色挑战与货架障碍",
    spawn: { x: 2, y: 5 },
    grid: [
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
      [2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2],
      [2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2],
      [2, 1, 1, 1, 1, 2, 1, 1, 2, 2, 2, 1, 2],
      [2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 2],
      [2, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 2],
      [2, 1, 1, 1, 1, 2, 1, 1, 2, 2, 2, 1, 2],
      [2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2],
      [2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2],
      [2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2],
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]
    ],
    targets: [
      { x: 2, y: 2, color: 'red' },
      { x: 10, y: 2, color: 'green' }
    ],
    boxes: [
      { x: 3, y: 4, color: 'red' },
      { x: 7, y: 4, color: 'green' }
    ],
    gears: [
      { x: 5, y: 1 }, { x: 5, y: 9 }
    ]
  },
  {
    title: "关卡 3/5：传送带车间",
    spawn: { x: 1, y: 1 },
    grid: [
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
      [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
      [2, 1, 1, 2, 2, 2, 2, 2, 2, 2, 1, 1, 2],
      [2, 1, 1, 9, 9, 9, 9, 9, 9, 7, 1, 1, 2], // 9: right, 7: down
      [2, 1, 1, 6, 1, 1, 1, 1, 1, 7, 1, 1, 2], // 6: up
      [2, 1, 1, 6, 8, 8, 8, 8, 8, 8, 1, 1, 2], // 8: left
      [2, 1, 1, 2, 2, 2, 2, 2, 2, 2, 1, 1, 2],
      [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
      [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
      [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]
    ],
    targets: [
      { x: 10, y: 1, color: 'red' },
      { x: 10, y: 8, color: 'blue' }
    ],
    boxes: [
      { x: 6, y: 4, color: 'red' },
      { x: 1, y: 8, color: 'blue' }
    ],
    gears: [
      { x: 3, y: 2 }, { x: 9, y: 2 }, { x: 3, y: 6 }, { x: 9, y: 6 }
    ]
  },
  {
    title: "关卡 4/5：多色皮带分拣线",
    spawn: { x: 1, y: 1 },
    grid: [
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
      [2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2],
      [2, 1, 9, 7, 2, 1, 9, 7, 2, 1, 1, 1, 2],
      [2, 1, 6, 8, 2, 1, 6, 8, 2, 1, 1, 1, 2],
      [2, 1, 1, 1, 2, 1, 1, 1, 2, 2, 1, 2, 2],
      [2, 1, 9, 9, 9, 9, 9, 9, 9, 9, 7, 1, 2],
      [2, 1, 1, 1, 2, 1, 1, 1, 2, 2, 7, 1, 2],
      [2, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2],
      [2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2],
      [2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2],
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]
    ],
    targets: [
      { x: 5, y: 1, color: 'red' },
      { x: 11, y: 1, color: 'green' },
      { x: 11, y: 8, color: 'blue' }
    ],
    boxes: [
      { x: 2, y: 2, color: 'red' },
      { x: 6, y: 2, color: 'green' },
      { x: 10, y: 7, color: 'blue' }
    ],
    gears: [
      { x: 4, y: 1 }, { x: 8, y: 1 }, { x: 4, y: 9 }, { x: 8, y: 9 }
    ]
  },
  {
    title: "关卡 5/5：反重力核心机制",
    spawn: { x: 1, y: 1 },
    grid: [
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
      [2, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2],
      [2, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2],
      [2, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2],
      [2, 1, 1, 1, 2, 2, 2, 2, 2, 2, 1, 1, 2],
      [2, 1, 10, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2], // 10 is gravity switch
      [2, 1, 11, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2], // 11 is indicator down
      [2, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2],
      [2, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2],
      [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]
    ],
    targets: [
      { x: 6, y: 2, color: 'red' },
      { x: 8, y: 2, color: 'green' },
      { x: 10, y: 2, color: 'blue' }
    ],
    boxes: [
      { x: 2, y: 2, color: 'red' },
      { x: 3, y: 2, color: 'green' },
      { x: 2, y: 8, color: 'blue' }
    ],
    gears: [
      { x: 4, y: 5 }, { x: 5, y: 4 }, { x: 9, y: 4 }
    ]
  }
];

class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
  }

  preload() {
    // 1. Load tiles dynamically from tileIndex
    for (const key in TILEMAP_DATA.tileIndex) {
      const name = TILEMAP_DATA.tileIndex[key];
      this.load.image(`tile_${name}`, `assets/tiles/${name}.png`);
    }

    // 2. Load Botty Spritesheet
    this.load.spritesheet('botty_sheet', 'assets/sprites/Botty.webp', {
      frameWidth: 192,
      frameHeight: 208
    });

    // 3. Load Boxes and Gears
    this.load.spritesheet('box_red_sheet', 'assets/objects/box_red.webp', {
      frameWidth: 128,
      frameHeight: 128
    });
    this.load.spritesheet('box_green_sheet', 'assets/objects/box_green.webp', {
      frameWidth: 128,
      frameHeight: 128
    });
    this.load.spritesheet('box_blue_sheet', 'assets/objects/box_blue.webp', {
      frameWidth: 128,
      frameHeight: 128
    });
    this.load.spritesheet('gear_sheet', 'assets/objects/gear.webp', {
      frameWidth: 128,
      frameHeight: 128
    });
  }

  create() {
    this.DEPTH = DEPTH;
    this.tileW = 64;
    this.tileH = 64;

    this.currentLevel = 1;
    this.gravityDirection = 'down'; // 'down' or 'up'
    this.gameStarted = false;
    this.isTransitioning = false;

    // Groups
    this.ysortGroup = this.add.group();
    this.staticGearsGroup = this.add.group();
    
    // Arrays for active elements
    this.mapTiles = [];
    this.activeBoxes = [];
    this.activeTargets = [];

    // Keyboard Controls
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };
    
    // Reset key (R)
    this.resetKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    // Create Animations
    this.createAnims();

    // Spawn Player
    this.player = this.add.sprite(0, 0, 'botty_sheet');
    this.player.setDisplaySize(96, 104);
    this.player.setOrigin(0.5, 0.75); // Centered on wheel
    this.ysortGroup.add(this.player);

    // Load first level
    this.loadLevel(1);

    // Register with HUD
    if (window.GameHUD) {
      window.GameHUD.onStart(() => {
        this.gameStarted = true;
      });
    } else {
      this.gameStarted = true;
    }
  }

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
  }

  loadLevel(levelNum) {
    this.isTransitioning = true;
    this.currentLevel = levelNum;
    this.gravityDirection = 'down';

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
  }

  update() {
    if (!this.gameStarted || this.isTransitioning) return;

    // Check Reset Key
    if (Phaser.Input.Keyboard.JustDown(this.resetKey)) {
      this.loadLevel(this.currentLevel);
      return;
    }

    // Grid Input Check
    let dx = 0;
    let dy = 0;

    if (Phaser.Input.Keyboard.JustDown(this.cursors.left) || Phaser.Input.Keyboard.JustDown(this.wasd.A)) {
      dx = -1;
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right) || Phaser.Input.Keyboard.JustDown(this.wasd.D)) {
      dx = 1;
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.wasd.W)) {
      dy = -1;
    } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.wasd.S)) {
      dy = 1;
    }

    if (dx !== 0 || dy !== 0) {
      this.handlePlayerMove(dx, dy);
    }
  }

  handlePlayerMove(dx, dy) {
    const nextX = this.player.gridX + dx;
    const nextY = this.player.gridY + dy;

    // 1. Boundary / Solid wall check
    if (this.isWall(nextX, nextY)) return;

    // 2. Check box
    const box = this.getBoxAt(nextX, nextY);
    if (box) {
      const beyondX = nextX + dx;
      const beyondY = nextY + dy;

      // Check if space beyond box is free
      if (!this.isWall(beyondX, beyondY) && !this.getBoxAt(beyondX, beyondY)) {
        // Push Box
        box.gridX = beyondX;
        box.gridY = beyondY;
        
        this.isTransitioning = true;

        // Animate Botty
        this.playWalkAnim(dx, dy);

        // Tween Box
        this.tweens.add({
          targets: box.sprite,
          x: beyondX * 64 + 32,
          y: beyondY * 64 + 32,
          duration: 180,
          onUpdate: () => {
            box.sprite.setDepth(DEPTH.YSORT + box.sprite.y);
          }
        });

        // Tween Player
        this.player.gridX = nextX;
        this.player.gridY = nextY;
        this.tweens.add({
          targets: this.player,
          x: nextX * 64 + 32,
          y: nextY * 64 + 32,
          duration: 180,
          onUpdate: () => {
            this.player.setDepth(DEPTH.YSORT + this.player.y);
          },
          onComplete: () => {
            this.player.anims.stop();
            this.checkConveyors();
          }
        });
      }
    } else {
      // Empty floor movement
      this.player.gridX = nextX;
      this.player.gridY = nextY;
      
      this.isTransitioning = true;
      
      this.playWalkAnim(dx, dy);

      this.tweens.add({
        targets: this.player,
        x: nextX * 64 + 32,
        y: nextY * 64 + 32,
        duration: 180,
        onUpdate: () => {
          this.player.setDepth(DEPTH.YSORT + this.player.y);
        },
        onComplete: () => {
          this.player.anims.stop();
          this.checkConveyors();
        }
      });
    }
  }

  playWalkAnim(dx, dy) {
    if (dy === 1) {
      if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== 'botty_walk_down') {
        this.player.play('botty_walk_down');
      }
    } else if (dy === -1) {
      if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== 'botty_walk_up') {
        this.player.play('botty_walk_up');
      }
    } else if (dx === 1) {
      if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== 'botty_walk_left') {
        this.player.play('botty_walk_left');
      }
      this.player.setFlipX(false); // Facing right
    } else if (dx === -1) {
      if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== 'botty_walk_left') {
        this.player.play('botty_walk_left');
      }
      this.player.setFlipX(true); // Mirror to face left
    }
  }

  isWall(gx, gy) {
    if (gx < 0 || gx >= 13 || gy < 0 || gy >= 11) return true;
    return this.levelGrid[gy][gx] === 2;
  }

  getBoxAt(gx, gy) {
    return this.activeBoxes.find(b => b.gridX === gx && b.gridY === gy);
  }

  // Conveyor Belt sliding phase
  checkConveyors() {
    let movedAny = false;
    const moveTimeline = [];

    // 1. Move boxes on conveyors
    this.activeBoxes.forEach(box => {
      const tileVal = this.levelGrid[box.gridY][box.gridX];
      let dx = 0, dy = 0;
      if (tileVal === 6) dy = -1; // up
      if (tileVal === 7) dy = 1;  // down
      if (tileVal === 8) dx = -1; // left
      if (tileVal === 9) dx = 1;  // right

      if (dx !== 0 || dy !== 0) {
        const tx = box.gridX + dx;
        const ty = box.gridY + dy;
        // Make sure destination is free
        if (!this.isWall(tx, ty) && !this.getBoxAt(tx, ty) && !(this.player.gridX === tx && this.player.gridY === ty)) {
          box.gridX = tx;
          box.gridY = ty;
          movedAny = true;
          moveTimeline.push({
            target: box.sprite,
            x: tx * 64 + 32,
            y: ty * 64 + 32
          });
        }
      }
    });

    // 2. Move player on conveyor
    const pTile = this.levelGrid[this.player.gridY][this.player.gridX];
    let pdx = 0, pdy = 0;
    if (pTile === 6) pdy = -1;
    if (pTile === 7) pdy = 1;
    if (pTile === 8) pdx = -1;
    if (pTile === 9) pdx = 1;

    if (pdx !== 0 || pdy !== 0) {
      const ptx = this.player.gridX + pdx;
      const pty = this.player.gridY + pdy;
      if (!this.isWall(ptx, pty) && !this.getBoxAt(ptx, pty)) {
        this.player.gridX = ptx;
        this.player.gridY = pty;
        movedAny = true;
        moveTimeline.push({
          target: this.player,
          x: ptx * 64 + 32,
          y: pty * 64 + 32
        });
      }
    }

    if (movedAny) {
      // Tween all moves simultaneously
      let tweenCount = 0;
      moveTimeline.forEach(m => {
        this.tweens.add({
          targets: m.target,
          x: m.x,
          y: m.y,
          duration: 200,
          onUpdate: () => {
            m.target.setDepth(DEPTH.YSORT + m.target.y);
          },
          onComplete: () => {
            tweenCount++;
            if (tweenCount === moveTimeline.length) {
              // Re-check in case they landed on another conveyor belt
              this.checkConveyors();
            }
          }
        });
      });
    } else {
      // Finished conveyor checks, now check switch triggers and gravity
      this.handleTriggers();
    }
  }

  // Handle Switch triggers and gravity flips
  handleTriggers() {
    let standingOnSwitch = false;

    // Check if player stands on switch
    const playerTile = this.levelGrid[this.player.gridY][this.player.gridX];
    if (playerTile === 10) standingOnSwitch = true;

    // Check if any box stands on switch
    this.activeBoxes.forEach(box => {
      if (this.levelGrid[box.gridY][box.gridX] === 10) standingOnSwitch = true;
    });

    // Gravity Inversion triggers on standing on gravity switch (10)
    // If gravity was triggered, flip it!
    if (standingOnSwitch) {
      const oldGravity = this.gravityDirection;
      this.gravityDirection = (oldGravity === 'down') ? 'up' : 'down';
      
      // Update Gravity indicator tiles visually
      this.mapTiles.forEach(tile => {
        if (tile.getData('isGravityIndicator')) {
          const key = this.gravityDirection === 'down' ? 'tile_gravity_indicator_down_base' : 'tile_gravity_indicator_up_base';
          tile.setTexture(key);
        }
      });

      // Play a quick camera flash to show flip
      this.cameras.main.flash(150, 160, 100, 240, 0.4);

      // Perform gravity slide
      this.applyGravity();
    } else {
      // No gravity flip, proceed to standard gravity check (level 5)
      this.applyGravity();
    }
  }

  // Gravity sliding check (Level 5 special)
  applyGravity() {
    if (this.currentLevel !== 5) {
      this.checkWinCondition();
      return;
    }

    const dy = (this.gravityDirection === 'down') ? 1 : -1;
    let movedAny = false;
    const gravityMoves = [];

    // Sort boxes so that those further down/up slide first to prevent blocking
    const sortedBoxes = [...this.activeBoxes];
    if (this.gravityDirection === 'down') {
      sortedBoxes.sort((a, b) => b.gridY - a.gridY);
    } else {
      sortedBoxes.sort((a, b) => a.gridY - b.gridY);
    }

    sortedBoxes.forEach(box => {
      let targetY = box.gridY;
      
      while (true) {
        const nextY = targetY + dy;
        
        // Blocked by wall?
        if (this.isWall(box.gridX, nextY)) break;
        
        // Blocked by another box?
        const otherBox = this.activeBoxes.find(b => b.gridX === box.gridX && b.gridY === nextY);
        if (otherBox) break;
        
        // Blocked by player?
        if (this.player.gridX === box.gridX && this.player.gridY === nextY) break;

        targetY = nextY;
      }

      if (targetY !== box.gridY) {
        const stepCount = Math.abs(targetY - box.gridY);
        box.gridY = targetY;
        movedAny = true;
        gravityMoves.push({
          target: box.sprite,
          y: targetY * 64 + 32,
          steps: stepCount
        });
      }
    });

    if (movedAny) {
      this.isTransitioning = true;
      let completedCount = 0;
      gravityMoves.forEach(m => {
        this.tweens.add({
          targets: m.target,
          y: m.y,
          duration: m.steps * 100,
          ease: 'Cubic.easeIn',
          onUpdate: () => {
            m.target.setDepth(DEPTH.YSORT + m.target.y);
          },
          onComplete: () => {
            completedCount++;
            if (completedCount === gravityMoves.length) {
              // Wait a little frame, then check conveyors again (e.g. if box landed on conveyor!)
              this.time.delayedCall(50, () => {
                this.checkConveyors();
              });
            }
          }
        });
      });
    } else {
      this.checkWinCondition();
    }
  }

  checkWinCondition() {
    // Check if all targets are satisfied
    let levelComplete = true;

    this.activeTargets.forEach(tgt => {
      const tgtColor = tgt.getData('color');
      const tx = tgt.getData('gridX');
      const ty = tgt.getData('gridY');

      const box = this.getBoxAt(tx, ty);
      if (!box || box.color !== tgtColor) {
        levelComplete = false;
      }
    });

    if (levelComplete) {
      this.isTransitioning = true;
      this.cameras.main.flash(250, 255, 255, 255);
      
      // Play target success effects
      this.activeTargets.forEach(tgt => {
        this.tweens.add({
          targets: tgt,
          scale: 1.3,
          yoyo: true,
          duration: 150
        });
      });

      const bottyComments = {
        1: '✅ 小博特：单色方块归位！简单？等等后面的……',
        2: '✅ 小博特：双色分流成功！传送带，我的朋友！',
        3: '✅ 小博特：三色方块全归位！我的弹簧臂快断了……',
        4: '✅ 小博特：重力翻转也难不倒我！最后一关——来吧！',
      };

      this.time.delayedCall(500, () => {
        const comment = bottyComments[this.currentLevel];
        if (comment && this.currentLevel < 5) {
          const txt = this.add.text(
            this.cameras.main.width / 2, this.cameras.main.height / 2 - 30,
            comment, {
              font: 'bold 14px monospace', fill: '#fbbf24',
              stroke: '#000', strokeThickness: 3, align: 'center'
            }
          ).setOrigin(0.5).setScrollFactor(0).setDepth(9999);
          this.time.delayedCall(2000, () => txt.destroy());
        }

        if (this.currentLevel < 5) {
          this.loadLevel(this.currentLevel + 1);
        } else {
          // Win Game
          this.gameStarted = false;
          window.GameHUD?.showGameOver(true,
            '🎉 仓库全面重启！\n\n' +
            '小博特（Botty）用弹簧手臂逐一归位了所有能量方块，\n' +
            '穿越传送带迷宫、克服重力翻转，解开了全部5个谜题。\n\n' +
            '齿轮咔哒一声旋转，彩虹蒸汽从烟囱欢快地喷涌而出——\n' +
            '卡通蒸汽工厂，重新开工了！\n\n' +
            '小博特的大圆眼睛弯成了两道弧线：\n"谢谢你，伙伴！"'
          );
        }
      });
    } else {
      // Finished all updates, release input lock
      this.isTransitioning = false;
    }
  }
}

const config = {
  type: Phaser.AUTO,
  width: 832,
  height: 704,
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: MainScene
};

new Phaser.Game(config);
