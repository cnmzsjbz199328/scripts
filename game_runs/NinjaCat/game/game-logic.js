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
    console.log('Preloading assets...');
    
    // Load tile textures from TILEMAP_DATA
    const tileIndex = window.TILEMAP_DATA.tileIndex;
    Object.keys(tileIndex).forEach(id => {
      const name = tileIndex[id];
      this.load.image(`tile_${id}`, `assets/tiles/${name}.png`);
    });

    // Load character metadata and sheets
    this.load.json('catninja_meta', 'assets/sprites/CatNinja.json');
    this.load.spritesheet('catninja_sheet', 'assets/sprites/CatNinja.webp', {
      frameWidth: 192,
      frameHeight: 208
    });

    this.load.json('samuraibot_meta', 'assets/sprites/SamuraiBot.json');
    this.load.spritesheet('samuraibot_sheet', 'assets/sprites/SamuraiBot.webp', {
      frameWidth: 192,
      frameHeight: 208
    });

    // Load animated objects
    this.load.spritesheet('coin', 'assets/objects/coin.webp', {
      frameWidth: 128,
      frameHeight: 128
    });
    this.load.spritesheet('spike_ball', 'assets/objects/spike_ball.webp', {
      frameWidth: 128,
      frameHeight: 128
    });
    this.load.spritesheet('exit_door', 'assets/objects/exit_door.webp', {
      frameWidth: 128,
      frameHeight: 128
    });
  }

  create() {
    console.log('Creating scene...');
    
    // Setup animations from metadata
    this.createCharAnimations('CatNinja', 'catninja_meta', 'catninja_sheet');
    this.createCharAnimations('SamuraiBot', 'samuraibot_meta', 'samuraibot_sheet');

    // Create object animations
    this.anims.create({
      key: 'coin_anim',
      frames: this.anims.generateFrameNumbers('coin', { start: 0, end: 5 }),
      frameRate: 12,
      repeat: -1
    });
    this.anims.create({
      key: 'spike_ball_anim',
      frames: this.anims.generateFrameNumbers('spike_ball', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: 'exit_door_anim',
      frames: this.anims.generateFrameNumbers('exit_door', { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1
    });

    // Game stats
    this.score = 0;
    this.hearts = 3;
    this.currentLevel = 1;
    this.isInvincible = false;
    
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
    this.coinsGroup = this.physics.add.group();
    this.enemiesGroup = this.physics.add.group();
    this.spikeBallsGroup = this.physics.add.group();
    
    // Y-sort group for depth sorting
    this.ysortGroup = this.add.group();

    // Create player (invisible/gravity disabled initially until start)
    const config = window.GAME_CONFIG;
    this.player = this.physics.add.sprite(100, 100, 'catninja_sheet');
    this.player.body.setAllowGravity(false);
    this.player.setCollideWorldBounds(true);
    
    // Bounding box offset & size (tight bounds for cat ninja sprite)
    this.player.body.setSize(44, 72);
    this.player.body.setOffset(74, 98);
    this.ysortGroup.add(this.player);

    // Colliders
    this.physics.add.collider(this.player, this.groundGroup);
    this.physics.add.collider(this.enemiesGroup, this.groundGroup);

    // Overlaps
    this.physics.add.overlap(this.player, this.coinsGroup, this.collectCoin, null, this);
    this.physics.add.collider(this.player, this.enemiesGroup, this.handleEnemyCollision, null, this);
    this.physics.add.overlap(this.player, this.spikeBallsGroup, this.handleHazardCollision, null, this);

    // Level objective maps
    this.levelObjectives = {
      1: "收集金币，小心刺球和巡逻的机器人！到达终点的石门通关第一关。",
      2: "天守阁屋顶：在高耸的阁楼间跳跃，继续收集金币并寻找传送门！",
      3: "云端仙境：失足即落入深渊！收集满100枚金币并到达终点门获得最终胜利！"
    };

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

  update(time, delta) {
    if (!this.gameStarted) return;

    const config = window.GAME_CONFIG;

    // ─── PLAYER MOVEMENT ───
    if (!this.isInvincible || this.player.body.velocity.y !== 0) { // allow jump/fall controls even when damaged
      if (this.cursors.left.isDown || this.wasd.left.isDown) {
        this.player.setVelocityX(-config.player.speed);

        if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== 'catninja_walk-left') {
          this.player.play('catninja_walk-left');
        }
        this.player.setFlipX(true);

      } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
        this.player.setVelocityX(config.player.speed);

        if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== 'catninja_walk-left') {
          this.player.play('catninja_walk-left');
        }
        this.player.setFlipX(false);
        
      } else {
        this.player.setVelocityX(0);
        if (this.player.body.blocked.down) {
          if (this.player.anims.currentAnim?.key !== 'catninja_idle') {
            this.player.play('catninja_idle');
          }
        }
      }

      // Jump
      if ((this.cursors.up.isDown || this.wasd.up.isDown || this.cursors.space.isDown) && this.player.body.blocked.down) {
        this.player.setVelocityY(config.player.jumpForce);
      }
    }

    // Air/Falling animation
    if (!this.player.body.blocked.down) {
      if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== 'catninja_jump') {
        this.player.play('catninja_jump');
      }
    }

    // ─── ENEMY PATROL ───
    this.enemiesGroup.getChildren().forEach(enemy => {
      if (enemy.x >= enemy.patrolRight) {
        enemy.setVelocityX(-80);
        if (enemy.anims.currentAnim?.key !== 'samuraibot_walk-left') {
          enemy.play('samuraibot_walk-left');
        }
        enemy.setFlipX(true);
      } else if (enemy.x <= enemy.patrolLeft) {
        enemy.setVelocityX(80);
        if (enemy.anims.currentAnim?.key !== 'samuraibot_walk-left') {
          enemy.play('samuraibot_walk-left');
        }
        enemy.setFlipX(false);
      }
    });

    // ─── SPIKE BALL BOBBING ───
    this.spikeBallsList.forEach(spike => {
      spike.y = spike.baseY + Math.sin(time * 0.002 * spike.speed) * spike.rangeY;
    });

    // ─── PITS AND DEATH CHECK ───
    if (this.player.y > 640 + 80) {
      this.gameStarted = false;
      this.player.setVelocity(0, 0);
      window.GameHUD?.showGameOver(false, '小爪失足掉入了无底深渊……');
    }

    // ─── Y-SORT DEPTHS ───
    // Player
    this.player.setDepth(DEPTH.YSORT + Math.round(this.player.y));
    
    // Other Y-sorted components
    this.ysortGroup.getChildren().forEach(s => {
      s.setDepth(DEPTH.YSORT + Math.round(s.y));
    });
  }

  collectCoin(player, coin) {
    coin.destroy();
    this.score += 1;
    window.GameHUD?.setScore(this.score);
    this.showFloatingText(coin.x, coin.y - 20, '+1 金币', '#fbbf24');
  }

  handleEnemyCollision(player, enemy) {
    // Check if player lands on top of the enemy
    const isSquishing = player.body.velocity.y > 0 && player.y < enemy.y - 12;

    if (isSquishing) {
      player.setVelocityY(-400); // Bounce
      enemy.destroy();
      this.score += 5;
      window.GameHUD?.setScore(this.score);
      this.showFloatingText(enemy.x, enemy.y - 20, '+5 击破', '#a855f7');
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
    this.showFloatingText(this.player.x, this.player.y - 40, '-1 生命', '#ef4444');

    if (this.hearts <= 0) {
      this.gameStarted = false;
      this.player.setVelocity(0, 0);
      this.player.setTint(0xff0000);
      window.GameHUD?.showGameOver(false, '生命值归零，猫咪忍者小爪倒下了……');
    } else {
      this.isInvincible = true;
      this.player.setVelocity(-150 * (this.player.flipX ? -1 : 1), -250);
      
      // Flash player transparency
      this.tweens.add({
        targets: this.player,
        alpha: 0.2,
        duration: 150,
        yoyo: true,
        repeat: 4,
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

    const levelTransitionStories = {
      2: ['🏯 第二关：城堡屋顶', '竹林已被小爪的足迹踏遍！', '金币的香气从高耸的城堡屋顶飘来……', '武士机器人在瓦片上巡逻，小心别踩空！'],
      3: ['☁️ 第三关：云端仙境', '城堡制高点已被征服！', '传说中漂浮在云端的金库就在眼前……', '这是最后的冲刺——收满100枚金币，成为传奇！']
    };

    if (this.currentLevel === 3) {
      this.gameStarted = false;
      if (this.score >= 100) {
        window.GameHUD?.showGameOver(true,
          '🏆 猫咪忍者传奇！\n\n' +
          `小爪收集了 ${this.score} 枚金币，\n` +
          '横跨竹林深处、城堡屋顶与云端仙境，\n' +
          '击退了所有入侵的武士机器人。\n\n' +
          '金币的光芒照耀着猫咪村庄——\n所有村民都为这位小小忍者欢呼喝彩！\n\n' +
          '小爪，猫咪村庄的传奇，从此诞生。'
        );
      } else {
        window.GameHUD?.showGameOver(false,
          `到达终点！但只收集了 ${this.score} 枚金币，\n未达到100枚的胜利要求。\n\n` +
          '金币还在等待你……再来一次吧！'
        );
      }
    } else {
      this.showFloatingText(this.player.x, this.player.y - 40, '通关！', '#22c55e');
      this.gameStarted = false;
      this.player.setVelocity(0, 0);

      // Show level transition story
      const nextLevelStory = levelTransitionStories[this.currentLevel + 1];
      if (nextLevelStory) this.showNinjaStory(nextLevelStory, 3000);

      // Delay level transition
      this.time.delayedCall(1200, () => {
        this.currentLevel++;
        this.loadLevel(this.currentLevel);
        this.gameStarted = true;
      });
    }
  }

  showNinjaStory(lines, duration = 2800) {
    const existing = document.getElementById('ninja-cat-story');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'ninja-cat-story';
    banner.style.cssText = `
      position:absolute; left:50%; transform:translateX(-50%); top:10%;
      z-index:100; pointer-events:none; text-align:center;
      background:rgba(0,0,0,0.80); border:1px solid #f59e0b;
      border-radius:10px; padding:12px 24px; font-family:'Segoe UI',sans-serif;
    `;
    banner.innerHTML = lines.map((l, i) =>
      `<div style="color:${i===0?'#f59e0b':'#fef9c3'};font-size:${i===0?'16px':'13px'};
        font-weight:${i===0?'bold':'normal'};margin:2px 0;
        text-shadow:0 0 8px rgba(245,158,11,0.6)">${l}</div>`
    ).join('');
    const gameContainer = document.querySelector('#game-container') || document.body;
    gameContainer.appendChild(banner);

    this.time.delayedCall(duration, () => {
      banner.style.transition = 'opacity 0.5s';
      banner.style.opacity = '0';
      this.time.delayedCall(500, () => banner.remove());
    });
  }

  showFloatingText(x, y, text, color) {
    const txt = this.add.text(x, y, text, {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '18px',
      fontWeight: 'bold',
      fill: color,
      stroke: '#000000',
      strokeThickness: 4
    });
    txt.setOrigin(0.5);
    txt.setDepth(DEPTH.EFFECTS);

    this.tweens.add({
      targets: txt,
      y: y - 50,
      alpha: 0,
      duration: 1000,
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
