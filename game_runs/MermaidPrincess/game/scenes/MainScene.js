/* MermaidPrincess — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
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
    this.canDash = true; // swim dash, refreshed after cooldown
    
    // Game state check
    this.gameStarted = false;
    if (window.GameHUD) {
      window.GameHUD.onStart(() => {
        this.gameStarted = true;
        this.player.body.setAllowGravity(false); // free swimming — no gravity underwater
      });
    } else {
      this.gameStarted = true;
      this.player.body.setAllowGravity(false);
    }

    // Keyboard inputs
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = {
      up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.dashKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

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

    // ── game-playtest 探针（自由游泳→俯视模式：朝最近珍珠游、避敌/避险，集满或无珍珠则奔门）──
    window.__probe = () => {
      const pl = this.player;
      if (!pl || !pl.body) return null;
      const pearls = this.pearlsGroup.getChildren().filter(c => c.active);
      const door = this.doorSprite;
      let tx, ty;
      if (pearls.length) {
        let best = null, bd = 1e9;
        for (const c of pearls) { const d = Math.hypot(c.x - pl.x, c.y - pl.y); if (d < bd) { bd = d; best = c; } }
        tx = best.x; ty = best.y;
      } else if (door) { tx = door.x; ty = door.y; }
      // 先算避险斥力（敌人/浮动尖刺），半径大、权重高——存活优先于追珍珠
      let rx = 0, ry = 0;
      const repel = arr => arr.forEach(o => { if (!o.active) return; const dx = pl.x - o.x, dy = pl.y - o.y, d = Math.hypot(dx, dy) || 1; if (d < 140) { const w = (140 - d) / 140 * 3.0; rx += (dx / d) * w; ry += (dy / d) * w; } });
      repel(this.enemiesGroup.getChildren()); repel(this.hazardsGroup.getChildren());
      const threatened = Math.hypot(rx, ry) > 0.4;
      let mx = rx, my = ry;
      // 没有迫近威胁时才去追最近珍珠/门
      if (!threatened && tx !== undefined) { const dx = tx - pl.x, dy = ty - pl.y, d = Math.hypot(dx, dy) || 1; mx += dx / d; my += dy / d; }
      const L = Math.hypot(mx, my); if (L > 0.05) { mx /= L; my /= L; } else { mx = my = 0; }
      const danger = this.enemiesGroup.getChildren().some(o => o.active && Math.hypot(pl.x - o.x, pl.y - o.y) < 60)
        || this.hazardsGroup.getChildren().some(o => o.active && Math.hypot(pl.x - o.x, pl.y - o.y) < 60);
      return {
        x: pl.x, y: pl.y, vx: pl.body.velocity.x, onGround: true,
        hp: this.hearts, maxHp: 3, score: this.score, goalScore: 100,
        act: this.currentLevel, deaths: 0, deathBudget: 3,
        won: !!this._won, lost: !!this._lost,
        cardActive: false, started: this.gameStarted,
        nextGoalX: tx !== undefined ? tx : pl.x, worldW: 3200, cellX: door ? door.x : 3100,
        moveX: mx, moveY: my, attack: false,
        dangerNow: danger, dangerAhead: danger,
      };
    };
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
      } else {
        // Smooth vertical deceleration in water (no gravity to settle the mermaid)
        this.player.setVelocityY(this.player.body.velocity.y * 0.85);
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

    // ─── SWIM DASH ─── burst toward current facing, brief i-frames, cooldown
    if (Phaser.Input.Keyboard.JustDown(this.dashKey) && this.canDash) {
      this.canDash = false;
      const dir = this.player.flipX ? -1 : 1;
      this.player.setVelocityX(dir * config.player.speed * 3);
      this.spawnBurst(this.player.x - dir * 30, this.player.y, 0x67e8f9, 14, 80);
      this.showFloatingText(this.player.x, this.player.y - 50, '冲刺！💨', '#a5f3fc');
      this.isInvincible = true;
      this.time.delayedCall(350, () => { if (this.hearts > 0) this.isInvincible = false; });
      this.time.delayedCall(1200, () => { this.canDash = true; });
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
      this._lost = true;
      this.player.setVelocity(0, 0);
      window.GameHUD?.showGameOver(false, '爱丽儿公主失足沉入了无底的黑暗深渊……');
    }

    // ─── Y-SORT DEPTHS ───
    this.player.setDepth(DEPTH.YSORT + Math.round(this.player.y));
    this.ysortGroup.getChildren().forEach(s => {
      s.setDepth(DEPTH.YSORT + Math.round(s.y));
    });
  }
}
