const DEPTH = {
  BACKGROUND: 0,
  DECOR_FLOOR: 100,
  YSORT: 1000,
  DECOR_TOP: 9000,
  EFFECTS: 9500
};

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

    // 2. Load characters
    this.load.spritesheet('player_stickman', 'assets/sprites/PlayerStickman.webp', {
      frameWidth: 96,
      frameHeight: 96
    });
    this.load.spritesheet('enemy_stickman', 'assets/sprites/EnemyStickman.webp', {
      frameWidth: 96,
      frameHeight: 96
    });

    // 3. Load objects
    this.load.spritesheet('street_barrel', 'assets/objects/street_barrel.webp', {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.spritesheet('health_pack', 'assets/objects/health_pack.webp', {
      frameWidth: 64,
      frameHeight: 64
    });
  }

  create() {
    this.DEPTH = DEPTH;
    const mapW = TILEMAP_DATA.width;
    const mapH = TILEMAP_DATA.height;
    this.tileW = TILEMAP_DATA.tileWidth;
    this.tileH = TILEMAP_DATA.tileHeight;

    // Groups
    this.ysortGroup = this.add.group();
    this.barrels = this.physics.add.group();
    this.healthPacks = this.physics.add.group();
    this.enemies = this.physics.add.group();

    // Set up Physics world bounds (floor top at 576px)
    this.physics.world.setBounds(0, 0, mapW * this.tileW, 576);
    this.cameras.main.setBounds(0, 0, mapW * this.tileW, mapH * this.tileH);

    // Render Tile layers
    GAME_CONFIG.layers.forEach(layerConfig => {
      this.renderTileLayer(layerConfig.name, layerConfig);
    });

    // Setup Animations
    this.setupAnimations();

    // Create Player
    this.player = this.physics.add.sprite(120, 480, 'player_stickman');
    this.player.setOrigin(0.5, 1);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(32, 70);
    this.player.body.setOffset(32, 26);
    this.player.setDepth(DEPTH.YSORT + this.player.y);
    this.ysortGroup.add(this.player);

    // Colliders / Overlaps
    this.physics.add.overlap(this.player, this.healthPacks, this.collectHealth, null, this);

    // Inputs (A/D/W/S + J/K)
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyJ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J); // Punch
    this.keyK = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K); // Kick

    // Camera follow player
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Load static entities (barrels) from entities.json
    ENTITIES_DATA.forEach(ent => {
      if (ent.sprite === 'street_barrel') {
        const barrel = this.barrels.create(ent.x, ent.y, 'street_barrel');
        barrel.setOrigin(0.5, 1);
        barrel.setImmovable(true);
        barrel.body.allowGravity = false;
        barrel.body.setSize(40, 48);
        barrel.body.setOffset(12, 16);
        barrel.play('barrel_flicker');
        barrel.setDepth(DEPTH.YSORT + barrel.y);
        this.ysortGroup.add(barrel);
      }
    });

    // Stats
    this.hearts = 3.0; // Health Hearts (Float: 3.0 max)
    this.score = 0; // K.O. Count
    this.enemiesDefeated = 0;
    this.bossDefeated = false;
    this.isAttacking = false;
    this.isHit = false;
    this.gameStarted = false;
    this.victoryShown = false;
    this.defeatShown = false;

    // AI Spawning params
    this.maxWaveEnemies = 3;
    this.enemiesSpawned = 0;
    this.bossSpawned = false;

    // GameHUD Integration
    window.GameHUD?.onStart(() => {
      this.gameStarted = true;
      window.GameHUD?.setHearts(Math.ceil(this.hearts), 3);
      window.GameHUD?.setScore(this.score);
      window.GameHUD?.setObjective("击败暗影战士！ A/D: 移动 | W: 跳跃 | S: 防守 | J: 出拳 | K: 回旋踢");
    });

    if (!window.GameHUD) {
      this.gameStarted = true;
    }
  }

  setupAnimations() {
    // Player animations
    this.anims.create({
      key: 'player_idle',
      frames: this.anims.generateFrameNumbers('player_stickman', { start: 0, end: 4 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'player_walk',
      frames: this.anims.generateFrameNumbers('player_stickman', { start: 5, end: 9 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: 'player_punch',
      frames: this.anims.generateFrameNumbers('player_stickman', { start: 10, end: 14 }),
      frameRate: 15,
      repeat: 0
    });
    this.anims.create({
      key: 'player_kick',
      frames: this.anims.generateFrameNumbers('player_stickman', { start: 15, end: 19 }),
      frameRate: 12,
      repeat: 0
    });
    this.anims.create({
      key: 'player_block',
      frames: [{ key: 'player_stickman', frame: 20 }],
      frameRate: 1
    });
    this.anims.create({
      key: 'player_hit',
      frames: [{ key: 'player_stickman', frame: 21 }],
      frameRate: 1
    });
    this.anims.create({
      key: 'player_fall',
      frames: this.anims.generateFrameNumbers('player_stickman', { start: 22, end: 24 }),
      frameRate: 8,
      repeat: 0
    });

    // Enemy animations
    this.anims.create({
      key: 'enemy_idle',
      frames: this.anims.generateFrameNumbers('enemy_stickman', { start: 0, end: 4 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'enemy_walk',
      frames: this.anims.generateFrameNumbers('enemy_stickman', { start: 5, end: 9 }),
      frameRate: 10,
      repeat: -1
    });
    this.anims.create({
      key: 'enemy_punch',
      frames: this.anims.generateFrameNumbers('enemy_stickman', { start: 10, end: 14 }),
      frameRate: 12,
      repeat: 0
    });
    this.anims.create({
      key: 'enemy_kick',
      frames: this.anims.generateFrameNumbers('enemy_stickman', { start: 15, end: 19 }),
      frameRate: 10,
      repeat: 0
    });
    this.anims.create({
      key: 'enemy_hit',
      frames: [{ key: 'enemy_stickman', frame: 21 }],
      frameRate: 1
    });
    this.anims.create({
      key: 'enemy_fall',
      frames: this.anims.generateFrameNumbers('enemy_stickman', { start: 22, end: 24 }),
      frameRate: 8,
      repeat: 0
    });

    // Object animations
    this.anims.create({
      key: 'barrel_flicker',
      frames: this.anims.generateFrameNumbers('street_barrel', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: -1
    });
    this.anims.create({
      key: 'pack_pulse',
      frames: this.anims.generateFrameNumbers('health_pack', { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1
    });
  }

  renderTileLayer(layerName, layerConfig) {
    const data = TILEMAP_DATA.layers[layerName];
    if (!data) return;

    const width = TILEMAP_DATA.width;
    const height = TILEMAP_DATA.height;

    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const id = data[r * width + c];
        if (id === 0) continue;

        const tileName = TILEMAP_DATA.tileIndex[id];
        if (!tileName) continue;

        const x = c * this.tileW + this.tileW / 2;
        const y = r * this.tileH + this.tileH / 2;

        const tileSprite = this.add.sprite(x, y, `tile_${tileName}`);
        tileSprite.setDisplaySize(this.tileW, this.tileH);

        let baseDepth = DEPTH.BACKGROUND;
        if (layerName === 'decor_floor') baseDepth = DEPTH.DECOR_FLOOR;
        else if (layerName === 'objects') baseDepth = DEPTH.YSORT;
        else if (layerName === 'decor_top') baseDepth = DEPTH.DECOR_TOP;

        if (layerConfig.ysort) {
          tileSprite.setDepth(baseDepth + y);
          this.ysortGroup.add(tileSprite);
        } else {
          tileSprite.setDepth(baseDepth);
        }

      }
    }
  }

  update() {
    if (!this.gameStarted) return;

    if (this.hearts <= 0) {
      this.triggerGameOver(false, "小红战败！暗影兵团彻底吞噬了几何次元……");
      return;
    }

    if (this.bossDefeated) {
      this.triggerGameOver(true, "K.O！小红击败了暗影首领，粉碎了阴影核心，拯救了几何次元！🏆");
      return;
    }

    // AI Wave Spawning
    this.handleAISpawning();

    // Player Actions
    this.handlePlayerActions();

    // AI Enemy Behavior
    this.handleAIBehavior();

    // Update Depth Sorting
    this.player.setDepth(DEPTH.YSORT + this.player.y);
    this.enemies.getChildren().forEach(e => {
      e.setDepth(DEPTH.YSORT + e.y);
      this.updateEnemyHealthBar(e);
    });
  }

  handlePlayerActions() {
    if (this.isHit || this.hearts <= 0) return;

    let vx = 0;
    const speed = GAME_CONFIG.player.speed;

    const isBlocking = (this.keyS.isDown || this.cursors.down.isDown) && this.player.body.onFloor();

    // Handle Attack Inputs (Only if not already attacking or blocking)
    if (!this.isAttacking && !isBlocking) {
      if (Phaser.Input.Keyboard.JustDown(this.keyJ)) {
        // PUNCH
        this.isAttacking = true;
        this.player.setVelocityX(0);
        this.player.play('player_punch', true);
        this.time.delayedCall(200, () => this.registerHit(75, 15, false));
        this.player.once('animationcomplete', () => { this.isAttacking = false; });
        return;
      }
      if (Phaser.Input.Keyboard.JustDown(this.keyK)) {
        // KICK
        this.isAttacking = true;
        this.player.setVelocityX(0);
        this.player.play('player_kick', true);
        this.time.delayedCall(250, () => this.registerHit(90, 25, true));
        this.player.once('animationcomplete', () => { this.isAttacking = false; });
        return;
      }
    }

    // Handle standard Movement
    if (!this.isAttacking) {
      if (isBlocking) {
        this.player.play('player_block', true);
        this.player.setVelocityX(0);
      } else {
        if (this.keyA.isDown || this.cursors.left.isDown) {
          vx = -speed;
          this.player.setFlipX(true);
          if (this.player.body.onFloor()) {
            this.player.play('player_walk', true);
          }
        } else if (this.keyD.isDown || this.cursors.right.isDown) {
          vx = speed;
          this.player.setFlipX(false);
          if (this.player.body.onFloor()) {
            this.player.play('player_walk', true);
          }
        } else {
          if (this.player.body.onFloor()) {
            this.player.play('player_idle', true);
          }
        }

        // Jump Input
        if ((Phaser.Input.Keyboard.JustDown(this.keyW) || Phaser.Input.Keyboard.JustDown(this.cursors.up)) && this.player.body.onFloor()) {
          this.player.setVelocityY(-450);
        }

        this.player.setVelocityX(vx);
      }
    }
  }

  registerHit(range, damage, hasKnockback) {
    const isFacingLeft = this.player.flipX;

    // Check hit on Barrels
    this.barrels.getChildren().forEach(b => {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, b.x, b.y);
      if (dist <= range + 15) {
        const isCorrectDirection = isFacingLeft ? (b.x < this.player.x) : (b.x > this.player.x);
        if (isCorrectDirection) {
          this.breakBarrel(b);
        }
      }
    });

    // Check hit on Enemies
    this.enemies.getChildren().forEach(e => {
      if (e.isDead) return;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y - 32, e.x, e.y - 32);
      if (dist <= range) {
        const isCorrectDirection = isFacingLeft ? (e.x < this.player.x) : (e.x > this.player.x);
        if (isCorrectDirection) {
          this.damageEnemy(e, damage, hasKnockback);
        }
      }
    });
  }

  damageEnemy(enemy, damage, hasKnockback) {
    enemy.health -= damage;
    this.cameras.main.shake(100, 0.008);
    this.spawnFloatingText(enemy.x, enemy.y - 64, `-${damage} HP 💥`, '#fbbf24');

    // Trigger hit visual effect
    enemy.setTint(0xff3333);
    this.time.delayedCall(200, () => enemy.clearTint());

    if (enemy.health <= 0) {
      this.killEnemy(enemy);
    } else {
      enemy.play('enemy_hit', true);
      enemy.isHitState = true;
      
      // Knockback
      const knockDir = this.player.flipX ? -1 : 1;
      const kbVel = hasKnockback ? 300 : 120;
      enemy.setVelocity(knockDir * kbVel, -100);

      this.time.delayedCall(400, () => {
        enemy.isHitState = false;
        enemy.setVelocityX(0);
      });
    }
  }

  killEnemy(enemy) {
    enemy.isDead = true;
    enemy.body.enable = false;
    enemy.healthBarGraphics.clear();
    enemy.play('enemy_fall', true);
    
    this.score++;
    this.enemiesDefeated++;
    window.GameHUD?.setScore(this.score);

    this.spawnFloatingText(enemy.x, enemy.y - 64, 'K.O. 💀', '#ef4444');

    if (enemy.isBoss) {
      this.bossDefeated = true;
    }

    this.time.delayedCall(1500, () => {
      this.tweens.add({
        targets: enemy,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          enemy.healthBarGraphics.destroy();
          enemy.destroy();
        }
      });
    });
  }

  breakBarrel(barrel) {
    barrel.body.enable = false;
    this.cameras.main.shake(120, 0.01);
    this.spawnFloatingText(barrel.x, barrel.y - 32, 'CRASH! 📦', '#f97316');

    // Shatter effect
    this.tweens.add({
      targets: barrel,
      scaleY: 0,
      scaleX: 1.5,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        // 50% chance to drop health pack
        if (Phaser.Math.Between(1, 2) === 1) {
          const pack = this.healthPacks.create(barrel.x, barrel.y - 20, 'health_pack');
          pack.setOrigin(0.5, 1);
          pack.body.allowGravity = true;
          pack.body.setCollideWorldBounds(true);
          pack.play('pack_pulse');
          
          this.tweens.add({
            targets: pack,
            scaleX: 1.25,
            scaleY: 1.25,
            duration: 400,
            yoyo: true,
            repeat: -1
          });
        }
        barrel.destroy();
      }
    });
  }

  collectHealth(player, pack) {
    pack.destroy();
    this.hearts = Math.min(3.0, this.hearts + 1.0);
    window.GameHUD?.setHearts(Math.ceil(this.hearts), 3);
    this.spawnFloatingText(player.x, player.y - 64, '+1 护盾 💚', '#10b981');
  }

  handleAISpawning() {
    if (this.enemies.countActive() === 0) {
      if (this.enemiesSpawned < this.maxWaveEnemies) {
        // Spawn Wave shadows
        this.enemiesSpawned++;
        this.spawnEnemy(false);
      } else if (!this.bossSpawned) {
        // All waves cleared, spawn boss!
        this.bossSpawned = true;
        this.spawnEnemy(true);
        window.GameHUD?.setObjective("警告：暗影首领降临！全力击败它！");
      }
    }
  }

  spawnEnemy(isBoss) {
    const spawnX = isBoss
      ? (this.player.x < 640 ? Phaser.Math.Between(950, 1150) : Phaser.Math.Between(80, 280))
      : Phaser.Math.Between(850, 1100);
    const enemy = this.enemies.create(spawnX, 480, 'enemy_stickman');
    enemy.setOrigin(0.5, 1);
    enemy.setCollideWorldBounds(true);
    enemy.body.setSize(32, 70);
    enemy.body.setOffset(32, 26);
    enemy.play('enemy_idle');

    // Attributes
    enemy.health = isBoss ? 150 : 50;
    enemy.maxHealth = enemy.health;
    enemy.isBoss = isBoss;
    enemy.isDead = false;
    enemy.isHitState = false;
    enemy.isAttacking = false;
    enemy.nextAttackTime = 0;

    // Scale boss
    if (isBoss) {
      enemy.setDisplaySize(130, 130);
      enemy.body.setSize(44, 95);
      enemy.body.setOffset(26, 15);
      enemy.setTint(0x7c3aed); // Purple tint for boss
    } else {
      enemy.setDisplaySize(96, 96);
    }

    // Health bar graphics
    enemy.healthBarGraphics = this.add.graphics();
    enemy.healthBarGraphics.setDepth(DEPTH.EFFECTS);
    this.updateEnemyHealthBar(enemy);
  }

  updateEnemyHealthBar(enemy) {
    if (enemy.isDead) return;
    
    enemy.healthBarGraphics.clear();
    
    const barW = enemy.isBoss ? 80 : 50;
    const barH = 6;
    const barX = enemy.x - barW / 2;
    const barY = enemy.y - (enemy.isBoss ? 135 : 100);

    // Draw background (Black)
    enemy.healthBarGraphics.fillStyle(0x000000, 0.7);
    enemy.healthBarGraphics.fillRect(barX, barY, barW, barH);

    // Draw health (Red/Yellow)
    const hpPct = Math.max(0, enemy.health / enemy.maxHealth);
    const fillW = barW * hpPct;
    const color = enemy.isBoss ? 0xa78bfa : 0xef4444; // purple for boss, red for normal
    enemy.healthBarGraphics.fillStyle(color, 1.0);
    enemy.healthBarGraphics.fillRect(barX, barY, fillW, barH);
  }

  handleAIBehavior() {
    this.enemies.getChildren().forEach(e => {
      if (e.isDead || e.isHitState) return;

      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
      const isPlayerFacingLeft = this.player.x < e.x;

      // Flip enemy to face player
      e.setFlipX(isPlayerFacingLeft);

      if (e.isAttacking) return;

      const attackRange = e.isBoss ? 85 : 65;

      if (dist <= attackRange) {
        // Try attacking
        e.setVelocityX(0);
        const time = this.time.now;
        if (time > e.nextAttackTime) {
          e.isAttacking = true;
          const isKick = Phaser.Math.Between(0, 1) === 1;
          e.play(isKick ? 'enemy_kick' : 'enemy_punch', true);

          // Trigger hit register at mid animation
          this.time.delayedCall(isKick ? 250 : 200, () => {
            if (e.isDead) return;
            const currentDist = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
            if (currentDist <= attackRange) {
              this.damagePlayer(isKick ? 20 : 10);
            }
          });

          e.once('animationcomplete', () => {
            e.isAttacking = false;
            e.nextAttackTime = this.time.now + Phaser.Math.Between(1000, 2000);
          });
        } else {
          e.play('enemy_idle', true);
        }
      } else {
        // Move towards player
        const speed = e.isBoss ? 110 : 80;
        const dir = this.player.x < e.x ? -1 : 1;
        e.setVelocityX(dir * speed);
        e.play('enemy_walk', true);
      }
    });
  }

  damagePlayer(damage) {
    if (this.isHit || this.victoryShown || this.defeatShown || this.hearts <= 0) return;

    const isBlocking = (this.keyS.isDown || this.cursors.down.isDown) && this.player.body.onFloor();
    if (isBlocking) {
      // Reduced damage by 80%
      this.hearts = Math.max(0, this.hearts - 0.15);
      window.GameHUD?.setHearts(Math.ceil(this.hearts), 3);
      this.spawnFloatingText(this.player.x, this.player.y - 75, '防御 🛡️', '#38bdf8');
      
      // Block particle sparks
      this.spawnFloatingItem(this.player.x + (this.player.flipX ? -15 : 15), this.player.y - 30, '✨', '#38bdf8');
    } else {
      // Full damage
      this.hearts = Math.max(0, this.hearts - 0.5);
      window.GameHUD?.setHearts(Math.ceil(this.hearts), 3);
      this.cameras.main.shake(150, 0.015);
      this.spawnFloatingText(this.player.x, this.player.y - 75, '-0.5 生命 🩸', '#ef4444');

      this.isHit = true;
      this.player.play('player_hit', true);
      this.player.setVelocityX(this.player.flipX ? 100 : -100);
      
      this.player.setTint(0xff3333);
      this.time.delayedCall(200, () => this.player.clearTint());

      this.time.delayedCall(400, () => {
        this.isHit = false;
        this.player.setVelocityX(0);
      });
    }
  }

  spawnFloatingText(x, y, textString, color) {
    const text = this.add.text(x, y, textString, {
      font: 'bold 13px Courier',
      fill: color,
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);
    text.setDepth(DEPTH.EFFECTS);
    
    this.tweens.add({
      targets: text,
      y: y - 50,
      alpha: 0,
      duration: 1000,
      onComplete: () => text.destroy()
    });
  }

  spawnFloatingItem(x, y, iconStr, color) {
    const itemText = this.add.text(x, y, iconStr, { font: '24px Arial' }).setOrigin(0.5);
    itemText.setDepth(DEPTH.EFFECTS);
    
    this.tweens.add({
      targets: itemText,
      y: y - 40,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => itemText.destroy()
    });
  }

  triggerGameOver(isWin, endingText) {
    if (isWin) {
      this.victoryShown = true;
    } else {
      this.defeatShown = true;
    }

    this.physics.pause();
    this.player.setVelocity(0, 0);
    this.player.anims.stop();

    if (!isWin) {
      this.player.play('player_fall', true);
    }

    window.GameHUD?.showGameOver(isWin, endingText);
    this.gameStarted = false;
  }
}

const config = {
  type: Phaser.AUTO,
  width: 960,
  height: 576,
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1000 },
      debug: false
    }
  },
  scene: MainScene
};

new Phaser.Game(config);
