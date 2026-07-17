/* game/scenes/LevelScene.js — 关卡主控场景
 * ─────────────────────────────────────────────────────────────────────────
 * 管理关卡生命周期（加载、关卡段切换、卡片叙事、相机棘轮及锁点）。
 * 实现了 Boss 战的三阶段映射，并且在没有图片资源时，回退到优雅的色彩块渲染。
 */
window.SSG = window.SSG || {};

class LevelScene extends Phaser.Scene {
  constructor() {
    super('LevelScene');
  }

  init(data) {
    this.levelIdx = data.idx || 0;
    this.hp = window.SSG.Config.MAX_HP;
    this.won = false;
    this.lost = false;
    this.started = true;
    
    // 叙事卡状态
    this.cardActive = false;
    this.cardGfx = null;
    this._pendingCardCb = null;

    // 锁点状态
    this.lockedActive = false;
    this.lockX = 0;
    this.activeLockTrigger = null;

    this.isDead = false;
    this.isInvincible = false;
    this.invincibleTimeLeft = 0;
  }

  preload() {
    // 1. 创建程序化画布占位贴图，保证在无 AI 图片资源加载时零报错崩溃
    const canvas = this.textures.createCanvas('particle_placeholder', 8, 8);
    const ctx = canvas.getContext();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 8, 8);
    canvas.refresh();

    const enemyCanvas = this.textures.createCanvas('enemy_placeholder', 40, 48);
    const enemyCtx = enemyCanvas.getContext();
    enemyCtx.fillStyle = '#ffffff';
    enemyCtx.fillRect(0, 0, 40, 48);
    enemyCanvas.refresh();

    const bulletCanvas = this.textures.createCanvas('bullet_placeholder', 12, 12);
    const bulletCtx = bulletCanvas.getContext();
    bulletCtx.fillStyle = '#ffffff';
    bulletCtx.fillRect(0, 0, 12, 12);
    bulletCanvas.refresh();

    // 2. 加载 AI 绿幕切割生成的精灵图集（如果加载失败，Phaser 会回退到默认纹理而不会崩溃）
    this.load.spritesheet('girl_sheet', 'assets/sprites/girl.webp', { frameWidth: 192, frameHeight: 208 });
    this.load.spritesheet('cat_sheet', 'assets/sprites/cat.webp', { frameWidth: 192, frameHeight: 208 });
    this.load.spritesheet('fish_sheet', 'assets/sprites/fish.webp', { frameWidth: 192, frameHeight: 208 });
    this.load.spritesheet('eagle_sheet', 'assets/sprites/eagle.webp', { frameWidth: 192, frameHeight: 208 });
    this.load.spritesheet('bear_sheet', 'assets/sprites/bear.webp', { frameWidth: 192, frameHeight: 208 });
    this.load.spritesheet('morph_sheet', 'assets/sprites/morph.webp', { frameWidth: 192, frameHeight: 208 });
    this.load.image('panorama', 'scene/panorama.png');
  }

  create() {
    const feetY = window.SSG.Config.WORLD.FEET_Y;
    const activeLevel = window.SSG.LEVELS[this.levelIdx];

    // 1. 设置活动场景控制器
    window.SSG.Game.active = this;

    // 2. 初始化各系统
    window.SSG.Render.init(this);
    window.SSG.Form.init(this);
    window.SSG.Movement.init(this);
    window.SSG.Gates.init(this);
    window.SSG.Combat.init(this);

    // 3. 注册动画
    this.registerAnimations();

    // 4. 构建当前关卡的实体地面物理块（跳过深渊和水域，实现自然下坠坠亡与落水）
    this.buildLevelPlatforms(activeLevel);

    // 5. 产生玩家角色精灵
    // 主角默认以 192x208 尺寸生出，使用 girl_sheet 纹理
    this.player = this.physics.add.sprite(100, feetY - 40, 'girl_sheet', 0).setOrigin(0.5, 0.5);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.platforms);

    // 6. 配置镜头与棘轮
    this.physics.world.setBounds(0, 0, activeLevel.length, 540);
    this.cameras.main.setBounds(0, 0, activeLevel.length, 540);
    this.cameras.main.startFollow(this.player, true, 0.12, 0);
    this.cameras.main.setFollowOffset(-window.SSG.Config.GAME_W * 0.18, 0);
    this.cameras.main.scrollX = 0;
    this.camMinX = 0;

    // 7. HUD 数据刷新
    this.updateHUDHearts();
    window.GameHUD.setObjective(activeLevel.name);
    window.GameHUD.setScore('0%');

    // 8. 播放关卡 BGM 音效
    if (window.AudioEngine) {
      window.AudioEngine.playBGM(activeLevel.bgm);
    }

    // 9. 显示当前关卡叙事卡
    this._showCard(activeLevel.intro[0], activeLevel.intro[1], null, '开始冒险');
  }

  update(time, delta) {
    // 运行各子系统 Update
    window.SSG.Form.update(this, time, delta);
    window.SSG.Movement.handleInput(this, time, delta);
    window.SSG.Gates.update(this, time, delta);
    window.SSG.Combat.update(this, time, delta);
    
    // 渲染绘图
    window.SSG.Render.draw(this);
    window.SSG.Render.drawParallaxBackground(this);

    // 更新全局 Probe 位置
    window.__gameState.player.x = this.player.x;
    window.__gameState.player.y = this.player.y;
    window.__gameState.player.vx = this.player.body.velocity.x;
    window.__gameState.player.vy = this.player.body.velocity.y;

    const activeLevel = window.SSG.LEVELS[this.levelIdx];
    
    // 刷新 HUD 进度百分比
    const pct = Math.min(100, Math.round(this.player.x / activeLevel.length * 100));
    window.GameHUD.setScore(`${pct}%`);

    // 10. 相机棘轮与玩家横向阻隔（锁点和剧情卡状态下除外）
    if (!this.lockedActive && !this.cardActive && !this.isDead) {
      this.camMinX = Math.max(this.camMinX, this.cameras.main.scrollX);
      this.cameras.main.scrollX = Math.max(this.cameras.main.scrollX, this.camMinX);
      
      const minX = this.cameras.main.scrollX + 40;
      const maxX = this.cameras.main.scrollX + window.SSG.Config.GAME_W - 40;
      
      if (this.player.x < minX) this.player.x = minX;
      if (this.player.x > maxX) this.player.x = maxX;
    }

    // 11. 锁点战波次结算检测
    if (this.lockedActive) {
      this.checkLockWaveProgress();
    }

    // 12. 胜利通关检测：玩家移动到关卡终点
    if (this.player.x >= activeLevel.length - 120 && !this.won && !this.lockedActive) {
      this.nextLevel();
    }
  }

  registerAnimations() {
    const registerAnim = (key, sheetKey, startRow, frameCount = 9, fps = 8, loop = true) => {
      if (!this.anims.exists(key)) {
        this.anims.create({
          key: key,
          frames: this.anims.generateFrameNumbers(sheetKey, { start: startRow * 9, end: startRow * 9 + frameCount - 1 }),
          frameRate: fps,
          repeat: loop ? -1 : 0
        });
      }
    };

    // 少女动画 (girl_sheet)
    registerAnim('idle', 'girl_sheet', 0, 9, 6, true);
    registerAnim('run', 'girl_sheet', 1, 9, 10, true);
    registerAnim('jump', 'girl_sheet', 2, 9, 10, false);
    registerAnim('hurt', 'girl_sheet', 3, 9, 10, false);

    // 灵猫动画 (cat_sheet)
    registerAnim('cat_idle', 'cat_sheet', 0, 9, 6, true);
    registerAnim('cat_run', 'cat_sheet', 1, 9, 12, true);
    registerAnim('cat_jump', 'cat_sheet', 2, 9, 10, false);

    // 游鱼动画 (fish_sheet)
    registerAnim('swim', 'fish_sheet', 0, 9, 8, true);
    registerAnim('fish_idle', 'fish_sheet', 1, 9, 6, true);

    // 飞鹰动画 (eagle_sheet)
    registerAnim('fly', 'eagle_sheet', 0, 9, 10, true);
    registerAnim('glide', 'eagle_sheet', 1, 9, 6, true);

    // 暴熊动画 (bear_sheet)
    registerAnim('bear_idle', 'bear_sheet', 0, 9, 5, true);
    registerAnim('bear_walk', 'bear_sheet', 1, 9, 8, true);
    registerAnim('attack', 'bear_sheet', 2, 9, 12, false);

    // 变身形态动画集 (morph_sheet)
    registerAnim('morph-cat', 'morph_sheet', 0, 9, 18, false);
    registerAnim('morph-fish', 'morph_sheet', 1, 9, 18, false);
    registerAnim('morph-eagle', 'morph_sheet', 2, 9, 18, false);
    registerAnim('morph-bear', 'morph_sheet', 3, 9, 18, false);
  }

  buildLevelPlatforms(activeLevel) {
    const feetY = window.SSG.Config.WORLD.FEET_Y;
    this.platforms = this.physics.add.staticGroup();

    // 根据 chasm (坑) 和 water (水深) 动态分割生成地面物理实体
    const gaps = activeLevel.triggers
      .filter(t => t.type === 'chasm' || t.type === 'water')
      .sort((a, b) => a.x - b.x);

    let curX = 0;
    for (const gap of gaps) {
      if (gap.x > curX) {
        const w = gap.x - curX;
        const plat = this.add.zone(curX + w / 2, feetY + 50, w, 100);
        this.physics.add.existing(plat, true);
        this.platforms.add(plat);
      }
      curX = gap.x + gap.w;
    }

    if (curX < activeLevel.length) {
      const w = activeLevel.length - curX;
      const plat = this.add.zone(curX + w / 2, feetY + 50, w, 100);
      this.physics.add.existing(plat, true);
      this.platforms.add(plat);
    }
  }

  startLockPoint(trigger) {
    this.lockedActive = true;
    this.lockX = trigger.x;
    this.activeLockTrigger = trigger;
    this.currentWaveIdx = 0;

    // 相机锁死在当前屏幕
    this.cameras.main.stopFollow();
    this.cameras.main.setScroll(trigger.x, 0);

    // 限制玩家横向移动范围在锁死的一屏 (960px) 内
    this.player.body.setBoundsRectangle(new Phaser.Geom.Rectangle(trigger.x, 0, 960, 540));

    // 产生第一波小怪
    this.spawnLockWave();
  }

  spawnLockWave() {
    const trigger = this.activeLockTrigger;
    if (!trigger) return;

    const wave = trigger.waves[this.currentWaveIdx];
    if (!wave) {
      // 关卡锁点清理，解锁
      this.unlockPoint();
      return;
    }

    sceneToast(this, `遭遇战！波次 ${this.currentWaveIdx + 1}/${trigger.waves.length}`);

    // 根据配置生出敌人
    wave.spawns.forEach(spawn => {
      const sx = this.lockX + spawn.dx;
      window.SSG.Combat.spawnEnemy(this, spawn.type, sx, window.SSG.Config.WORLD.FEET_Y);
    });
  }

  checkLockWaveProgress() {
    // 检测当前屏幕内所有敌人是否被消灭
    if (this.enemies.countActive() === 0 && this.bullets.countActive() === 0) {
      // 增加波次
      this.currentWaveIdx++;
      const trigger = this.activeLockTrigger;
      
      if (this.currentWaveIdx < trigger.waves.length) {
        this.spawnLockWave();
      } else {
        // 解锁
        this.unlockPoint();
      }
    }
  }

  unlockPoint() {
    this.lockedActive = false;
    this.activeLockTrigger = null;
    
    // 恢复玩家边缘自适应移动，恢复相机跟随
    this.player.body.setBoundsRectangle(null);
    this.cameras.main.startFollow(this.player, true, 0.12, 0);
    this.cameras.main.setFollowOffset(-window.SSG.Config.GAME_W * 0.18, 0);

    sceneToast(this, '区域已清除，前行！');
  }

  advanceBossPhase() {
    // 关底 Boss 战有 3 个阶段，分别对应 Bear (破盾), Cat (躲避踩头), Eagle (飞空俯冲)
    this.bossHits++;
    
    if (this.bossHits >= 3) {
      this.bossHits = 0;
      this.bossPhase++;
      
      const trigger = this.activeLockTrigger;
      if (trigger && this.bossPhase < trigger.waves.length) {
        // 清理前阶段残余，并在延迟后进入下一阶段
        this.enemies.clear(true, true);
        this.bullets.clear(true, true);
        
        this.time.delayedCall(1000, () => {
          this.currentWaveIdx = this.bossPhase;
          this.spawnLockWave();
        });
      } else {
        // Boss 彻底死亡！解锁并通关
        this.enemies.clear(true, true);
        this.bullets.clear(true, true);
        this.unlockPoint();
      }
    }
  }

  nextLevel() {
    const G = window.SSG.Game;
    this.won = true;
    
    if (this.levelIdx + 1 >= window.SSG.Config.TOTAL_LEVELS) {
      // 彻底通关！
      this.handleGameOver(true);
    } else {
      // 过渡到下一关
      this.player.setVelocity(0, 0);
      const nextIdx = this.levelIdx + 1;
      const nextL = window.SSG.LEVELS[nextIdx];
      
      this._showCard('关卡通过！', `弟弟的线索指引着前方的【${nextL.name}】。\n\n${nextL.intro[1]}`, () => {
        G.startLevel(nextIdx);
      }, '进入下一关');
    }
  }

  triggerInvincible() {
    this.isInvincible = true;
    this.invincibleTimeLeft = 1000; // 无敌闪烁 1s
  }

  updateHUDHearts() {
    window.GameHUD.setHearts(this.hp, window.SSG.Config.MAX_HP);
  }

  showToast(text) {
    window.GameHUD.setObjective(text);
  }

  handleGameOver(isWin) {
    this.isDead = true;
    this.player.setVelocity(0, 0);
    
    if (isWin) {
      window.GameHUD.showGameOver(true, '恭喜你！突破魔雾，救回了弟弟，姐弟两人安全地踏上了回家的旅途！');
      if (window.AudioEngine) window.AudioEngine.play('win');
    } else {
      window.GameHUD.showGameOver(false, '生命值耗尽，小满没能救出弟弟... 按下重新开始以再次尝试！');
      if (window.AudioEngine) window.AudioEngine.play('die');
    }
  }

  _showCard(title, body, cb, btnLabel) {
    const C = window.SSG.Config;
    this.cardActive = true;
    this._pendingCardCb = cb;

    const cont = this.add.container(0, 0).setDepth(200);
    // 磨砂暗底
    const dim = this.add.rectangle(0, 0, C.GAME_W, C.GAME_H, 0x060913, 0.85).setOrigin(0, 0);
    // 卡片边框
    const panel = this.add.rectangle(C.GAME_W / 2, C.GAME_H / 2, 600, 280, 0x0f172a, 0.98).setStrokeStyle(2, 0xff4f4f, 0.9);
    // 标题文本
    const t = this.add.text(C.GAME_W / 2, C.GAME_H / 2 - 96, title, { fontFamily: 'Segoe UI, system-ui, sans-serif', fontSize: '26px', color: '#ff4f4f', fontStyle: 'bold' }).setOrigin(0.5);
    // 正文文本
    const b = this.add.text(C.GAME_W / 2, C.GAME_H / 2 - 12, body, { fontFamily: 'Segoe UI, system-ui, sans-serif', fontSize: '15px', color: '#94a3b8', align: 'center', lineSpacing: 7, wordWrap: { width: 540 } }).setOrigin(0.5);
    // 按钮提示
    const hint = this.add.text(C.GAME_W / 2, C.GAME_H / 2 + 110, `空格 / 回车 / 点击 [${btnLabel || '继续'}]`, { fontFamily: 'Segoe UI, system-ui, sans-serif', fontSize: '13px', color: '#64748b' }).setOrigin(0.5);
    
    cont.add([dim, panel, t, b, hint]);
    this.cardGfx = cont;

    // 键盘监听
    this.input.keyboard.once('keydown-SPACE', () => this._advanceCard());
    this.input.keyboard.once('keydown-ENTER', () => this._advanceCard());
    
    // 如果是自动验证，延迟自动点击
    if (window.SSG.Game.auto) {
      this.time.delayedCall(600, () => this._advanceCard());
    }
  }

  _advanceCard() {
    if (!this.cardActive) return;
    this.cardActive = false;
    
    if (this.cardGfx) {
      this.cardGfx.destroy();
      this.cardGfx = null;
    }

    const cb = this._pendingCardCb;
    this._pendingCardCb = null;

    if (window.AudioEngine) window.AudioEngine.play('ui');
    if (cb) cb();
  }

  probe() {
    const activeLevel = window.SSG.LEVELS[this.levelIdx];
    return {
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      hp: this.hp,
      maxHp: window.SSG.Config.MAX_HP,
      score: this.levelIdx + 1,
      goalScore: window.SSG.Config.TOTAL_LEVELS,
      won: this.won,
      lost: this.lost,
      started: this.started,
      mode: this.cardActive ? 'narrative' : (this.lockedActive ? 'lock' : 'run'),
      // 本作特有契约字段
      form: this.currentForm,
      morphing: this.isMorphing,
      nextGate: this.nextGate,
      progress: Math.min(100, Math.round(this.player.x / activeLevel.length * 100)),
      segment: this.levelIdx,
      locked: this.lockedActive,
      cardActive: this.cardActive
    };
  }
}

// 辅助 Toast 提示函数
function sceneToast(scene, text) {
  scene.showToast(text);
}

window.SSG.LevelScene = LevelScene;
