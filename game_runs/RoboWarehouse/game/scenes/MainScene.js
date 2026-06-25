/* RoboWarehouse — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
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
    
    // Reset key (R) and Undo key (Z)
    this.resetKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.undoKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.history = []; // snapshot stack for undo

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


  update() {
    if (!this.gameStarted || this.isTransitioning) return;

    // Check Reset Key
    if (Phaser.Input.Keyboard.JustDown(this.resetKey)) {
      this.loadLevel(this.currentLevel);
      return;
    }

    // Check Undo Key — revert to the state captured before the last manual move
    if (Phaser.Input.Keyboard.JustDown(this.undoKey)) {
      if (this.history.length > 0) this.restoreState(this.history.pop());
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
}
