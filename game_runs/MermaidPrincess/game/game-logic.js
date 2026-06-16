/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Depth constants according to the specification
const DEPTH = {
  GROUND:      0,
  DECOR_FLOOR: 100,
  YSORT:       1000,   // objects + entities share this pool: DEPTH.YSORT + y
  DECOR_TOP:   9000,
  EFFECTS:     9500,
};

class MainScene extends Phaser.Scene {
  constructor() {
    super('MainScene');
  }

  preload() {
    console.log('Preloading assets for Mermaid Princess...');
    
    // Load tile textures from TILEMAP_DATA
    const tileIndex = window.TILEMAP_DATA.tileIndex;
    Object.keys(tileIndex).forEach(id => {
      const name = tileIndex[id];
      this.load.image(`tile_${id}`, `assets/tiles/${name}.png`);
    });

    // Load character metadata and sheets
    this.load.json('mermaid_meta', 'assets/sprites/MermaidPrincess.json');
    this.load.spritesheet('mermaid_sheet', 'assets/sprites/MermaidPrincess.webp', {
      frameWidth: 192,
      frameHeight: 208
    });

    this.load.json('octopus_meta', 'assets/sprites/OctopusMonster.json');
    this.load.spritesheet('octopus_sheet', 'assets/sprites/OctopusMonster.webp', {
      frameWidth: 192,
      frameHeight: 208
    });

    this.load.json('shark_meta', 'assets/sprites/Shark.json');
    this.load.spritesheet('shark_sheet', 'assets/sprites/Shark.webp', {
      frameWidth: 192,
      frameHeight: 208
    });

    // Load animated objects
    this.load.spritesheet('pearl', 'assets/objects/pearl.webp', {
      frameWidth: 128,
      frameHeight: 128
    });
    this.load.spritesheet('jellyfish_electric', 'assets/objects/jellyfish_electric.webp', {
      frameWidth: 128,
      frameHeight: 128
    });
    this.load.spritesheet('pufferfish_spiny', 'assets/objects/pufferfish_spiny.webp', {
      frameWidth: 128,
      frameHeight: 128
    });
    this.load.spritesheet('shell_portal', 'assets/objects/shell_portal.webp', {
      frameWidth: 128,
      frameHeight: 128
    });
  }

  create() {
    console.log('Creating Mermaid Princess scene...');
    
    // Setup character animations from metadata
    this.createCharAnimations('MermaidPrincess', 'mermaid_meta', 'mermaid_sheet');
    this.createCharAnimations('OctopusMonster', 'octopus_meta', 'octopus_sheet');
    this.createCharAnimations('Shark', 'shark_meta', 'shark_sheet');

    // Create object animations
    this.anims.create({
      key: 'pearl_anim',
      frames: this.anims.generateFrameNumbers('pearl', { start: 0, end: 5 }),
      frameRate: 12,
      repeat: -1
    });
    this.anims.create({
      key: 'jellyfish_electric_anim',
      frames: this.anims.generateFrameNumbers('jellyfish_electric', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: 'pufferfish_spiny_anim',
      frames: this.anims.generateFrameNumbers('pufferfish_spiny', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'shell_portal_anim',
      frames: this.anims.generateFrameNumbers('shell_portal', { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1
    });

    // Game stats
    this.score = 0; // pearl count
    this.hearts = 3;
    this.currentLevel = 1;
    this.isInvincible = false;
    this.levelCompleted = false;
    
    // Game state check
    this.gameStarted = false;
    if (window.GameHUD) {
      window.GameHUD.onStart(() => {
        this.gameStarted = true;
        this.player.body.setAllowGravity(true);
      });
    } else {
      this.gameStarted = true;
      this.player.body.setAllowGravity(true);
    }

    // Keyboard inputs
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // Physics groups
    this.groundGroup = this.physics.add.staticGroup();
    this.pearlsGroup = this.physics.add.group();
    this.enemiesGroup = this.physics.add.group();
    this.hazardsGroup = this.physics.add.group();
    
    // Y-sort group for depth sorting
    this.ysortGroup = this.add.group();

    // Create player sprite
    this.player = this.physics.add.sprite(100, 450, 'mermaid_sheet');
    this.player.body.setAllowGravity(false);
    this.player.setCollideWorldBounds(true);
    
    // Adjust bounding box size for mermaid princess
    this.player.body.setSize(50, 80);
    this.player.body.setOffset(71, 74);
    this.ysortGroup.add(this.player);

    // Colliders
    this.physics.add.collider(this.player, this.groundGroup);
    this.physics.add.collider(this.enemiesGroup, this.groundGroup);

    // Overlaps
    this.physics.add.overlap(this.player, this.pearlsGroup, this.collectPearl, null, this);
    this.physics.add.collider(this.player, this.enemiesGroup, this.handleEnemyCollision, null, this);
    this.physics.add.overlap(this.player, this.hazardsGroup, this.handleHazardCollision, null, this);

    // Level description maps
    this.levelObjectives = {
      1: "深海珊瑚礁：在唯美的珊瑚群中游动，收集珍珠，踩踏消灭章鱼怪和鲨鱼！游到海螺螺门进入下一关。",
      2: "发光水母林：在幽暗梦幻的水母林穿梭！小心躲避闪电水母和带刺河豚的伤害！",
      3: "沉船宝窟：在堆满金币沉船废墟中冒险！怪物的防线更加严密，收集满100颗珍珠并找到黄金贝壳螺门！"
    };

    // Bubble trail particles behind the player
    this.setupBubbleTrail();

    // Load first level
    this.loadLevel(this.currentLevel);
  }

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
  }

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
  }

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
      tileSprite.body.updateFromImage(); // Update bounding boxes
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

  update(time, delta) {
    if (!this.gameStarted) return;

    const config = window.GAME_CONFIG;

    // ─── PLAYER SWIMMING MOVEMENT ───
    if (!this.isInvincible || this.player.body.velocity.y !== 0) {
      let movedX = false;
      let movedY = false;

      if (this.cursors.left.isDown || this.wasd.left.isDown) {
        this.player.setVelocityX(-config.player.speed);
        movedX = true;
        
        if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== 'mermaidprincess_walk-left') {
          this.player.play('mermaidprincess_walk-left');
        }
        this.player.setFlipX(true);
      } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
        this.player.setVelocityX(config.player.speed);
        movedX = true;
        
        if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== 'mermaidprincess_walk-left') {
          this.player.play('mermaidprincess_walk-left');
        }
        this.player.setFlipX(false);
      } else {
        // Smooth deceleration in water
        this.player.setVelocityX(this.player.body.velocity.x * 0.85);
      }

      // Swimming up and down (more fluid swimming movement)
      if (this.cursors.up.isDown || this.wasd.up.isDown || this.cursors.space.isDown) {
        this.player.setVelocityY(config.player.jumpForce);
        movedY = true;
        
        if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== 'mermaidprincess_jump') {
          this.player.play('mermaidprincess_jump');
        }
      } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
        this.player.setVelocityY(-config.player.jumpForce * 0.7); // sink down
        movedY = true;
        
        if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== 'mermaidprincess_walk-left') {
          this.player.play('mermaidprincess_walk-left');
        }
      }

      // If floating in place (no move inputs, on ground or in mid water)
      if (!movedX && !movedY) {
        if (this.player.body.blocked.down) {
          if (this.player.anims.currentAnim?.key !== 'mermaidprincess_idle') {
            this.player.play('mermaidprincess_idle');
          }
        } else {
          // Slowly drift floating idle
          if (this.player.anims.currentAnim?.key !== 'mermaidprincess_idle') {
            this.player.play('mermaidprincess_idle');
          }
        }
      }
    }

    // ─── ENEMY PATROL ───
    this.enemiesGroup.getChildren().forEach(enemy => {
      const charKey = enemy.charKey;
      if (enemy.x >= enemy.patrolRight) {
        enemy.setVelocityX(enemy.charKey === 'shark' ? -90 : -60);
        if (enemy.anims.currentAnim?.key !== `${charKey}_walk-left`) {
          enemy.play(`${charKey}_walk-left`);
        }
        enemy.setFlipX(false); // face left
      } else if (enemy.x <= enemy.patrolLeft) {
        enemy.setVelocityX(enemy.charKey === 'shark' ? 90 : 60);
        if (enemy.anims.currentAnim?.key !== `${charKey}_walk-left`) {
          enemy.play(`${charKey}_walk-left`);
        }
        enemy.setFlipX(true); // face right (flipX mirror)
      }
    });

    // ─── HAZARDS BOBBING ───
    this.hazardsList.forEach(hazard => {
      hazard.y = hazard.baseY + Math.sin(time * 0.0015 * hazard.speed) * hazard.rangeY;
    });

    // ─── ABYSS CHECK ───
    if (this.player.y > 640 + 80) {
      this.gameStarted = false;
      this.player.setVelocity(0, 0);
      window.GameHUD?.showGameOver(false, '爱丽儿公主失足沉入了无底的黑暗深渊……');
    }

    // ─── Y-SORT DEPTHS ───
    this.player.setDepth(DEPTH.YSORT + Math.round(this.player.y));
    this.ysortGroup.getChildren().forEach(s => {
      s.setDepth(DEPTH.YSORT + Math.round(s.y));
    });
  }

  collectPearl(player, pearl) {
    pearl.destroy();
    this.score += 1;
    window.GameHUD?.setScore(this.score);
    this.showFloatingText(pearl.x, pearl.y - 20, '+1 珍珠 🐚', '#a5f3fc');

    // Win condition check on pick
    if (this.score >= 100 && this.currentLevel === 3 && this.levelCompleted) {
      this.triggerWinGame();
    }
  }

  handleEnemyCollision(player, enemy) {
    // Check if player lands on top of the enemy (stomping)
    const isSquishing = player.body.velocity.y > 0 && player.y < enemy.y - 15;

    if (isSquishing) {
      player.setVelocityY(-300); // Bounce upwards
      const name = enemy.charKey === 'shark' ? '鲨鱼' : '章鱼怪';
      enemy.destroy();
      this.score += 5;
      window.GameHUD?.setScore(this.score);
      this.showFloatingText(enemy.x, enemy.y - 20, `击败${name} +5 珍珠`, '#fbc531');

      if (this.score >= 100 && this.currentLevel === 3 && this.levelCompleted) {
        this.triggerWinGame();
      }
    } else {
      this.damagePlayer();
    }
  }

  handleHazardCollision(player, hazard) {
    this.damagePlayer();
  }

  damagePlayer() {
    if (this.isInvincible) return;

    this.hearts--;
    window.GameHUD?.setHearts(this.hearts, 3);
    this.showFloatingText(this.player.x, this.player.y - 40, '-1 生命 💔', '#ff5555');

    if (this.hearts <= 0) {
      this.gameStarted = false;
      this.player.setVelocity(0, 0);
      this.player.setTint(0xff5555);
      window.GameHUD?.showGameOver(false, '爱丽儿公主精疲力竭，在深海中陷入了沉睡……');
    } else {
      this.isInvincible = true;
      // knock back
      this.player.setVelocity(-180 * (this.player.flipX ? -1 : 1), -200);
      
      // Flash transparency
      this.tweens.add({
        targets: this.player,
        alpha: 0.3,
        duration: 150,
        yoyo: true,
        repeat: 5,
        onComplete: () => {
          this.player.alpha = 1.0;
          this.isInvincible = false;
        }
      });
    }
  }

  handleDoorReached(player, door) {
    this.physics.world.disable(door);
    this.player.setVelocity(0, 0);
    this.levelCompleted = true;

    if (this.currentLevel === 3) {
      this.gameStarted = false;
      if (this.score >= 100) {
        this.triggerWinGame();
      } else {
        window.GameHUD?.showGameOver(false, `你到达了终点！但你只收集了 ${this.score} 颗珍珠，还不够100颗，请重新挑战！`);
      }
    } else {
      this.showFloatingText(this.player.x, this.player.y - 40, '通关！🌊', '#50fa7b');
      this.gameStarted = false;
      this.player.setVelocity(0, 0);
      
      // Delay level transition
      this.time.delayedCall(1200, () => {
        this.currentLevel++;
        this.loadLevel(this.currentLevel);
        this.gameStarted = true;
      });
    }
  }

  triggerWinGame() {
    if (this.victoryShown) return;
    this.victoryShown = true;
    this.gameStarted = false;
    this.player.setVelocity(0, 0);
    window.GameHUD?.showGameOver(true, `梦幻般的大胜利！爱丽儿公主成功收集了 ${this.score} 颗璀璨珍珠，用珍珠的圣洁光芒净化了海洋，让海底世界重回和平与唯美浪漫！`);
  }

  showFloatingText(x, y, text, color) {
    const txt = this.add.text(x, y, text, {
      fontFamily: 'Segoe UI, Microsoft YaHei, Arial, sans-serif',
      fontSize: '20px',
      fontWeight: 'bold',
      fill: color,
      stroke: '#1b1c25',
      strokeThickness: 5
    });
    txt.setOrigin(0.5);
    txt.setDepth(DEPTH.EFFECTS);

    this.tweens.add({
      targets: txt,
      y: y - 60,
      alpha: 0,
      duration: 1200,
      onComplete: () => txt.destroy()
    });
  }
}

const phaserConfig = {
  type: Phaser.AUTO,
  width: 960,
  height: 640,
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: window.GAME_CONFIG.gravity },
      debug: false
    }
  },
  scene: MainScene
};

// Start the game instance
const game = new Phaser.Game(phaserConfig);
