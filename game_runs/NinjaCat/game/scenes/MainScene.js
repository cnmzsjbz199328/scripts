/* NinjaCat — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
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
    this.jumpsRemaining = 0; // refreshed to 2 when grounded; enables mid-air double jump
    
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

    // ── game-playtest 探针：暴露 bot 决策所需状态（横版模式：不设 moveX）──
    window.__probe = () => {
      const pl = this.player;
      if (!pl || !pl.body) return null;
      const onGround = pl.body.blocked.down;
      const door = this.doorSprite;
      const fwd = door ? Math.sign(door.x - pl.x) || 1 : 1;   // 通往终点的方向（通常向右）
      const coins = this.coinsGroup.getChildren().filter(c => c.active);
      // 只考虑「朝终点方向、且双跳够得到高度」的金币，避免在头顶够不到的币上来回卡死
      let best = null, bd = 1e9;
      for (const c of coins) {
        if ((c.x - pl.x) * fwd < -40) continue;          // 不往回捡
        if (c.y < pl.y - 230) continue;                   // 超出双跳高度，放弃
        const d = Math.hypot(c.x - pl.x, (c.y - pl.y) * 0.6); if (d < bd) { bd = d; best = c; }
      }
      const goalX = best ? best.x : (door ? door.x : pl.x + 200);
      const tgtY = best ? best.y : (door ? door.y : pl.y);
      const dir = goalX > pl.x ? 1 : -1;
      const enemies = this.enemiesGroup.getChildren().filter(o => o.active);
      const spikes = this.spikeBallsGroup.getChildren().filter(o => o.active);
      const near = (arr, rx, ry) => arr.some(o => Math.abs(o.x - pl.x) < rx && Math.abs(o.y - pl.y) < ry);
      const ahead = (arr, rx, ry) => arr.some(o => (o.x - pl.x) * dir > -10 && Math.abs(o.x - pl.x) < rx && Math.abs(o.y - pl.y) < ry);
      const dangerNow = near(enemies, 52, 70) || near(spikes, 52, 60);
      const dangerAhead = ahead(enemies, 120, 80) || ahead(spikes, 95, 95);
      // 目标在上方 / 前方有敌或刺 → 起跳（平台跳跃 & 踩头击破）
      const needJump = onGround && ((tgtY < pl.y - 45) || dangerAhead);
      return {
        x: pl.x, y: pl.y, vx: pl.body.velocity.x, onGround,
        hp: this.hearts, maxHp: 3, score: this.score, goalScore: 100,
        act: this.currentLevel, deaths: 0, deathBudget: 3,
        won: !!this._won, lost: !!this._lost,
        cardActive: false, started: this.gameStarted,
        nextGoalX: goalX, worldW: 9999, cellX: door ? door.x : 4690,
        dangerNow, dangerAhead, needJump,
      };
    };
  }


  update(time, delta) {
    if (!this.gameStarted) return;

    const config = window.GAME_CONFIG;

    // Refresh double-jump charges while standing on solid ground
    if (this.player.body.blocked.down) this.jumpsRemaining = 2;

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

      // Jump (ground jump + one mid-air double jump). Edge-detect each key
      // with JustDown so a held key triggers exactly one jump per press.
      const jumpUp = Phaser.Input.Keyboard.JustDown(this.cursors.up);
      const jumpW = Phaser.Input.Keyboard.JustDown(this.wasd.up);
      const jumpSpace = Phaser.Input.Keyboard.JustDown(this.cursors.space);
      if ((jumpUp || jumpW || jumpSpace) && this.jumpsRemaining > 0) {
        const isGroundJump = this.player.body.blocked.down;
        this.player.setVelocityY(config.player.jumpForce * (isGroundJump ? 1 : 0.82));
        this.jumpsRemaining--;
        if (isGroundJump) {
          this.spawnBurst(this.player.x, this.player.y + 30, 0xffffff, 8, 55);
        } else {
          this.spawnBurst(this.player.x, this.player.y, 0x67e8f9, 12, 70);
        }
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
      this._lost = true;
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
}
