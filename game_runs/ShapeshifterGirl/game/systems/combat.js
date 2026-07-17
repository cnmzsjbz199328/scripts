/* game/systems/combat.js — 战斗与敌人生存期系统
 * ─────────────────────────────────────────────────────────────────────────
 * 包含：玩家形态技能攻击判定（熊爪击碎石墙与小怪、猫踩头、鹰俯冲）、
 * 敌人生死期离屏销毁、AI 移动，以及关底 Boss 的三阶段形态弱点战。
 */
window.SSG = window.SSG || {};

window.SSG.Combat = {
  init(scene) {
    scene.enemies = scene.physics.add.group();
    scene.bullets = scene.physics.add.group();
    scene.isAttacking = false;
    scene.attackTimeLeft = 0;
    scene.isInvincible = false;
    scene.invincibleTimeLeft = 0;
    scene.bossPhase = 0; // Boss 阶段: 0-未触发, 1-熊破盾, 2-猫踩头, 3-鹰击落
    scene.bossHits = 0;

    // 绑定攻击键 J
    scene.attackKey = scene.input.keyboard.addKey('J');
  },

  update(scene, time, delta) {
    const player = scene.player;
    if (!player || !player.body) return;

    // 1. 无敌帧倒计时
    if (scene.isInvincible) {
      scene.invincibleTimeLeft -= delta;
      if (scene.invincibleTimeLeft <= 0) {
        scene.isInvincible = false;
        player.alpha = 1.0;
      } else {
        // 闪烁效果
        player.alpha = (Math.floor(time / 50) % 2 === 0) ? 0.3 : 1.0;
      }
    }

    // 2. 玩家主动攻击计时（暴熊重击）
    if (scene.isAttacking) {
      scene.attackTimeLeft -= delta;
      if (scene.attackTimeLeft <= 0) {
        scene.isAttacking = false;
      }
    }

    // 检测 J 键触发攻击
    if (Phaser.Input.Keyboard.JustDown(scene.attackKey) && !scene.isMorphing && !scene.cardActive) {
      if (scene.currentForm === 'bear' && !scene.isAttacking) {
        this.performBearAttack(scene);
      }
    }

    // 3. 动态触发并生成视野内的敌人/锁点波次
    this.handleDistanceSpawning(scene);

    // 4. 更新每一个敌人的 AI 和投射物
    this.updateEnemies(scene, delta);

    // 5. 碰撞检测
    this.handleCollisions(scene);
  },

  performBearAttack(scene) {
    scene.isAttacking = true;
    scene.attackTimeLeft = 350; // 熊掌重击前摇硬直 0.35s
    scene.player.setVelocityX(scene.player.flipX ? 150 : -150); // 重击稍微向前突进

    if (scene.player.anims && scene.player.anims.exists('attack')) {
      scene.player.play('attack', true);
    }

    if (window.AudioEngine) window.AudioEngine.play('bear_attack');

    // 判定前方的裂石墙并拍碎它
    const activeLevel = window.SSG.LEVELS[scene.levelIdx];
    const reach = scene.player.flipX ? 70 : -70;
    const checkX = scene.player.x + reach;

    for (const trigger of activeLevel.triggers) {
      if (trigger.type === 'rock' && !trigger.destroyed) {
        if (Math.abs(checkX - trigger.x) < 80) {
          // 摧毁石墙！
          trigger.destroyed = true;
          scene.cameras.main.shake(150, 0.015);
          if (window.AudioEngine) window.AudioEngine.play('rock_destroy');
          if (window.SSG.Render) window.SSG.Render.playRockDebrisFX(scene, trigger.x, window.SSG.Config.WORLD.FEET_Y - 90);
          scene.showToast('巨石已被熊掌击碎！');
        }
      }
    }
  },

  handleDistanceSpawning(scene) {
    const activeLevel = window.SSG.LEVELS[scene.levelIdx];
    if (!activeLevel) return;

    const px = scene.player.x;

    for (const trigger of activeLevel.triggers) {
      // 1. 普通小怪生出
      if (trigger.type === 'enemy' && !trigger.spawned) {
        if (px >= trigger.at - 500) {
          trigger.spawned = true;
          this.spawnEnemy(scene, trigger.enemyType, trigger.x, window.SSG.Config.WORLD.FEET_Y);
        }
      }

      // 2. 锁点触发器
      if (trigger.type === 'lock' && !trigger.triggered) {
        if (px >= trigger.x) {
          trigger.triggered = true;
          scene.startLockPoint(trigger);
        }
      }
    }
  },

  spawnEnemy(scene, type, x, y) {
    const feetY = window.SSG.Config.WORLD.FEET_Y;
    
    // 如果是飞行类小怪，在半空中生出
    let spawnY = y - 40;
    if (type === 'thrower' || type === 'boss_fly') {
      spawnY = feetY - 140;
    }

    const enemy = scene.physics.add.sprite(x, spawnY, 'enemy_placeholder');
    enemy.setData('type', type);
    enemy.setData('hp', type.startsWith('boss') ? 3 : 1); // 普通怪 1 血，Boss 各阶段 3 血
    enemy.setData('state', 'active');
    enemy.setData('timer', 0);
    enemy.setCollideWorldBounds(true);

    // 用高保真色彩区分占位敌人
    if (type === 'patrol') {
      enemy.setTint(0xff3333); // 红色巡逻怪
      enemy.body.setSize(40, 48);
    } else if (type === 'thrower') {
      enemy.setTint(0xff8800); // 橘色投掷怪
      enemy.body.setSize(36, 40);
      enemy.body.setAllowGravity(false); // 飞行悬浮
    } else if (type.startsWith('boss')) {
      enemy.setTint(0xcc00ff); // 紫色 Boss
      enemy.body.setSize(80, 96);
      if (type === 'boss_fly') {
        enemy.body.setAllowGravity(false);
      }
    }

    scene.enemies.add(enemy);
    return enemy;
  },

  updateEnemies(scene, delta) {
    const camLeft = scene.cameras.main.scrollX;
    const feetY = window.SSG.Config.WORLD.FEET_Y;

    scene.enemies.getChildren().forEach(enemy => {
      if (!enemy.active) return;

      // 1. 甩开清理：落后屏幕左边界 1.5 屏以上的怪直接销毁
      if (enemy.x < camLeft - 1440) {
        enemy.destroy();
        return;
      }

      const type = enemy.getData('type');
      let timer = enemy.getData('timer') + delta;
      enemy.setData('timer', timer);

      // 2. 简单的 AI 运动行为
      if (type === 'patrol') {
        // 巡逻小怪：左右往复游走
        const speed = 100;
        const dir = Math.sin(timer * 0.003) > 0 ? 1 : -1;
        enemy.setVelocityX(dir * speed);
        enemy.setFlipX(dir > 0);
      } 
      
      else if (type === 'thrower') {
        // 投掷小怪：在半空中盘旋，每隔 2s 朝玩家扔能量子弹
        const speedY = Math.sin(timer * 0.005) * 50;
        enemy.setVelocityY(speedY);
        enemy.setVelocityX(0);

        if (timer >= 2000) {
          enemy.setData('timer', 0);
          this.shootBullet(scene, enemy.x - 30, enemy.y, -250, 0);
        }
      }
      
      // Boss 三阶段 AI 逻辑
      else if (type === 'boss_shield') {
        // 阶段1：地面重装状态，缓步向玩家逼近，具有全身紫光盾特效
        enemy.setVelocityX(-40);
        if (timer >= 3000) {
          enemy.setData('timer', 0);
          this.shootBullet(scene, enemy.x - 50, enemy.y + 20, -300, 0);
        }
      }
      
      else if (type === 'boss_bullets') {
        // 阶段2：悬浮疯狂抛洒弹幕，每 1.2s 连射
        enemy.setVelocityX(Math.sin(timer * 0.004) * 80);
        enemy.y = feetY - 120 + Math.sin(timer * 0.006) * 30;

        if (timer >= 1200) {
          enemy.setData('timer', 0);
          // 射出三连散射子弹
          this.shootBullet(scene, enemy.x - 50, enemy.y, -300, -100);
          this.shootBullet(scene, enemy.x - 50, enemy.y, -320, 0);
          this.shootBullet(scene, enemy.x - 50, enemy.y, -300, 100);
        }
      }
      
      else if (type === 'boss_fly') {
        // 阶段3：在高空飞速掠过，尝试在上方投掷炸弹
        enemy.setVelocityX(Math.sin(timer * 0.002) * 200);
        enemy.y = feetY - 220;

        if (timer >= 1500) {
          enemy.setData('timer', 0);
          this.shootBullet(scene, enemy.x, enemy.y + 40, 0, 300); // 垂直向下投掷
        }
      }
    });

    // 更新子弹
    scene.bullets.getChildren().forEach(bullet => {
      // 飞出屏幕则销毁
      if (bullet.x < camLeft - 200 || bullet.x > camLeft + 1160 || bullet.y > 600 || bullet.y < -100) {
        bullet.destroy();
      }
    });
  },

  shootBullet(scene, x, y, vx, vy) {
    const bullet = scene.physics.add.sprite(x, y, 'bullet_placeholder');
    bullet.setTint(0xff0000);
    bullet.body.setSize(12, 12);
    bullet.body.setAllowGravity(false);
    bullet.setVelocity(vx, vy);
    scene.bullets.add(bullet);
    if (window.AudioEngine) window.AudioEngine.play('shoot');
  },

  handleCollisions(scene) {
    const player = scene.player;

    // 1. 玩家暴熊攻击重击范围检测 (Bear Attacking -> Enemy)
    if (scene.currentForm === 'bear' && scene.isAttacking) {
      scene.physics.overlap(player, scene.enemies, (p, enemy) => {
        const type = enemy.getData('type');
        
        // 判定重击只对普通怪和 Boss-Shield 阶段有效
        if (type === 'boss_shield') {
          // 破甲
          this.hurtEnemy(scene, enemy, 1);
          scene.player.setVelocityX(-250); // 击退反作用力
          scene.isAttacking = false; // 重置攻击
        } else if (!type.startsWith('boss')) {
          // 普通怪一击必杀
          this.hurtEnemy(scene, enemy, 1);
        }
      });
    }

    // 2. 猫形踩头判定 (Cat Jump -> Enemy)
    if (scene.currentForm === 'cat' && player.body.velocity.y > 0) {
      scene.physics.overlap(player, scene.enemies, (p, enemy) => {
        // 判断玩家底部在怪物头部之上 (踩头)
        if (player.y + 10 < enemy.y) {
          const type = enemy.getData('type');
          if (type === 'boss_bullets' || !type.startsWith('boss')) {
            // 对二阶段 Boss 踩头起效，或者秒杀小怪
            this.hurtEnemy(scene, enemy, 1);
            player.setVelocityY(-450); // 弹起
            scene.catJumpsCount = 0; // 重置跳跃
            if (window.AudioEngine) window.AudioEngine.play('hit_stamp');
          }
        }
      });
    }

    // 3. 鹰形飞翔俯冲攻击 (Eagle Gliding -> Flying Enemy)
    if (scene.currentForm === 'eagle' && scene.isGliding) {
      scene.physics.overlap(player, scene.enemies, (p, enemy) => {
        const type = enemy.getData('type');
        if (type === 'boss_fly' || type === 'thrower') {
          // 对三阶段 Boss 俯冲撞击起效，或秒杀飞行投掷怪
          this.hurtEnemy(scene, enemy, 1);
          player.setVelocityY(-150); // 撞击轻微反弹
          if (window.AudioEngine) window.AudioEngine.play('hit_dive');
        }
      });
    }

    // 4. 敌人及子弹伤害判定 (Enemy/Bullet -> Player)
    if (!scene.isInvincible && !scene.isDead) {
      // 怪物本体碰触
      scene.physics.overlap(player, scene.enemies, (p, enemy) => {
        const type = enemy.getData('type');
        
        // 熊形态免疫普通小怪身体冲撞
        if (scene.currentForm === 'bear' && !type.startsWith('boss')) {
          // 仅击退，不扣血
          enemy.setVelocityX(scene.player.flipX ? 200 : -200);
          return;
        }
        
        this.hurtPlayer(scene, 1);
      });

      // 子弹击中
      scene.physics.overlap(player, scene.bullets, (p, bullet) => {
        bullet.destroy();
        this.hurtPlayer(scene, 1);
      });
    }
  },

  hurtEnemy(scene, enemy, dmg) {
    let hp = enemy.getData('hp') - dmg;
    enemy.setData('hp', hp);
    
    // 闪白受伤表现
    enemy.setAlpha(0.3);
    scene.time.delayedCall(100, () => { if (enemy.active) enemy.setAlpha(1.0); });

    if (hp <= 0) {
      const type = enemy.getData('type');
      enemy.destroy();
      if (window.AudioEngine) window.AudioEngine.play('enemy_die');

      if (type.startsWith('boss')) {
        // 如果摧毁的是 Boss，进入波次推进
        scene.advanceBossPhase();
      }
    } else {
      if (window.AudioEngine) window.AudioEngine.play('enemy_hurt');
    }
  },

  hurtPlayer(scene, dmg) {
    if (scene.isInvincible || scene.isDead) return;

    scene.hp = Math.max(0, scene.hp - 1);
    scene.updateHUDHearts();
    scene.showToast('受到伤害！');
    
    if (window.AudioEngine) window.AudioEngine.play('hurt');
    scene.cameras.main.shake(100, 0.01);

    if (scene.hp <= 0) {
      scene.handleGameOver(false);
    } else {
      // 触发无敌帧
      scene.player.setVelocityX(scene.player.flipX ? -200 : 200);
      scene.player.setVelocityY(-150);
      scene.triggerInvincible();
    }
  }
};
