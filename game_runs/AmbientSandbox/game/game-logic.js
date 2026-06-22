// AmbientSandbox — 动态环境沙盒：氛围大观
// 包含 20 种不同类别的参数化矢量氛围元素，并在隔离沙盒中展示、调试与调优。

const GAME_W = 960;
const GAME_H = 576;
const WORLD_W = 1280;
const WORLD_H = 960;

// 20 个氛围元素的定义与其对应的帧数
const AMBIENT_ELEMENTS = [
  // 第一行：自然与建筑
  { id: 'windmill',   name: '1. 风车 (Windmill)',    frames: 6,  fps: 10, loop: true,  col: 0, row: 0 },
  { id: 'tree',       name: '2. 摇曳树 (Tree)',      frames: 6,  fps: 8,  loop: true,  col: 1, row: 0 },
  { id: 'streetlight',name: '3. 路灯 (Streetlight)',  frames: 4,  fps: 6,  loop: true,  col: 2, row: 0 },
  { id: 'campfire',   name: '4. 篝火 (Campfire)',    frames: 6,  fps: 12, loop: true,  col: 3, row: 0 },
  { id: 'flag',       name: '5. 飘扬旗 (Flag)',      frames: 8,  fps: 12, loop: true,  col: 4, row: 0 },

  // 第二行：天气与环境
  { id: 'rain',       name: '6. 下雨 (Rain)',        frames: 4,  fps: 12, loop: true,  col: 0, row: 1 },
  { id: 'snow',       name: '7. 下雪 (Snow)',        frames: 6,  fps: 10, loop: true,  col: 1, row: 1 },
  { id: 'cloud',      name: '8. 流云 (Cloud)',       frames: 8,  fps: 6,  loop: true,  col: 2, row: 1 },
  { id: 'wave',       name: '9. 波浪 (Wave)',        frames: 6,  fps: 8,  loop: true,  col: 3, row: 1 },
  { id: 'star',       name: '10. 星光 (Star)',       frames: 4,  fps: 6,  loop: true,  col: 4, row: 1 },

  // 第三行：动作与光影
  { id: 'leaf',       name: '11. 落叶 (Leaf)',       frames: 6,  fps: 8,  loop: true,  col: 0, row: 2 },
  { id: 'smoke',      name: '12. 烟雾 (Smoke)',      frames: 6,  fps: 8,  loop: true,  col: 1, row: 2 },
  { id: 'bird',       name: '13. 飞鸟 (Bird)',       frames: 4,  fps: 8,  loop: true,  col: 2, row: 2 },
  { id: 'neon',       name: '14. 霓虹灯 (Neon)',     frames: 4,  fps: 4,  loop: true,  col: 3, row: 2 },
  { id: 'ray',        name: '15. 光斑 (Ray)',        frames: 6,  fps: 6,  loop: true,  col: 4, row: 2 },

  // 第四行：水与风
  { id: 'bubble',     name: '16. 气泡 (Bubble)',     frames: 6,  fps: 8,  loop: true,  col: 0, row: 3 },
  { id: 'lighthouse', name: '17. 灯塔 (Lighthouse)', frames: 8,  fps: 10, loop: true,  col: 1, row: 3 },
  { id: 'drip',       name: '18. 水滴 (Drip)',       frames: 8,  fps: 10, loop: true,  col: 2, row: 3 },
  { id: 'waterfall',  name: '19. 瀑布 (Waterfall)',  frames: 6,  fps: 10, loop: true,  col: 3, row: 3 },
  { id: 'wind',       name: '20. 风轨 (Wind)',       frames: 4,  fps: 10, loop: true,  col: 4, row: 3 }
];

class AmbientSandboxScene extends Phaser.Scene {
  constructor() {
    super('AmbientSandboxScene');
    this.visitedCount = 0;
    this.visitedSet = new Set();
    this.globalWindSpeed = 1.0;
    this.globalWindDirection = 1;
    this.isNightMode = false;
  }

  preload() {
    // 1. 加载瓦片贴图
    this.load.image('tile_grass_base', 'assets/tiles/grass_base.png');
    this.load.image('tile_fence_base', 'assets/tiles/fence_base.png');

    // 2. 加载主角精灵
    this.load.json('char_Hero', 'assets/sprites/Hero.json');
    this.load.image('texture_Hero', 'assets/sprites/Hero.webp');

    // 3. 加载 20 种环境氛围的所有帧 SVG
    AMBIENT_ELEMENTS.forEach(el => {
      for (let i = 0; i < el.frames; i++) {
        this.load.svg(`${el.id}_${i}`, `assets/svg/${el.id}_${i}.svg`, { width: 128, height: 128 });
      }
    });
  }

  create() {
    // A. 停止 Phaser 的默认输入捕获，避免它拦截 DOM 控件输入
    this.input.keyboard.target = window;

    // B. 创建主角动画 (从 char_Hero.json 动态构建)
    const charData = this.cache.json.get('char_Hero');
    if (charData && charData.animations) {
      // 动态读取 spritesheet WebP
      const tex = this.textures.get('texture_Hero');
      const w = charData.frameSize.width;
      const h = charData.frameSize.height;
      const cols = charData.dimensions.width / w;
      
      // 添加网格帧
      this.textures.addSpriteSheet('Hero_sheet', tex.getSourceImage(), { frameWidth: w, frameHeight: h });

      Object.entries(charData.animations).forEach(([key, anim]) => {
        const frames = Array.from({ length: anim.frameCount }, (_, i) => ({
          key: 'Hero_sheet',
          frame: anim.row * cols + i
        }));
        this.anims.create({
          key: `hero_${key}`,
          frames: frames,
          frameRate: anim.fps,
          repeat: anim.loop ? -1 : 0
        });
      });
    }

    // C. 铺设地面 (ground 层与 objects 层边界碰撞)
    this.collidables = this.physics.add.staticGroup();
    this.renderSandboxTilemap();

    // D. 放置 20 种氛围元素
    this.ambientSprites = [];
    this.renderAmbientShowcases();

    // E. 放置主角并开启摄像机跟随
    const spawnX = GAME_CONFIG.player?.spawn?.x ?? 640;
    const spawnY = GAME_CONFIG.player?.spawn?.y ?? 480;
    this.player = this.physics.add.sprite(spawnX, spawnY, 'Hero_sheet', 0);
    this.player.setDisplaySize(96, 104);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.collidables);

    // 启用 Y 轴排序组
    this.ysortGroup = this.add.group();
    this.ysortGroup.add(this.player);

    // 摄像机设置
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

    // F. 输入绑定
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D
    });

    // G. 变量激活提示与触发器
    this.visitedCount = 0;
    this.visitedSet = new Set();
    window.GameHUD?.setHearts?.(3, 3);
    window.GameHUD?.setScore?.(0);
    window.GameHUD?.setObjective?.("走近各个节点进行激活 (WASD / 方向键移动) 🔍");

    // H. 创建开发控制面板 DOM Overlay
    this.createDevControlPanel();

    // 通知 HUD 游戏开始
    this.gameStarted = true;
    
    // 用于测试自启动
    window.__gameState = { player: this.player };
  }

  update() {
    if (!this.gameStarted) return;

    // 1. 控制角色移动
    const speed = GAME_CONFIG.player?.speed ?? 200;
    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.keys.A.isDown) {
      vx = -speed;
    } else if (this.cursors.right.isDown || this.keys.D.isDown) {
      vx = speed;
    }

    if (this.cursors.up.isDown || this.keys.W.isDown) {
      vy = -speed;
    } else if (this.cursors.down.isDown || this.keys.S.isDown) {
      vy = speed;
    }

    // 归一化对角线移动
    if (vx !== 0 && vy !== 0) {
      vx *= 0.7071;
      vy *= 0.7071;
    }

    this.player.setVelocity(vx, vy);

    // 2. 动画状态机控制
    if (vx !== 0 || vy !== 0) {
      this.player.play('hero_run', true);
      this.player.setFlipX(vx < 0);
    } else {
      this.player.play('hero_idle', true);
    }

    // 3. Y-sort 精灵深度排序 (避免穿模)
    this.player.setDepth(1000 + this.player.y);
    this.ambientSprites.forEach(spr => {
      spr.sprite.setDepth(1000 + spr.y);
    });

    // 4. 碰撞与激活检测
    this.checkElementInspection();
  }

  // 铺设地面与边界围墙
  renderSandboxTilemap() {
    const TW = TILEMAP_DATA.tileWidth;
    const TH = TILEMAP_DATA.tileHeight;
    const W = TILEMAP_DATA.width;

    // 渲染地面
    TILEMAP_DATA.layers.ground.forEach((id, i) => {
      if (id === 0) return;
      const x = (i % W) * TW + TW / 2;
      const y = Math.floor(i / W) * TH + TH / 2;
      const img = this.add.image(x, y, 'tile_grass_base').setDisplaySize(TW, TH);
      img.setDepth(0);
    });

    // 渲染碰撞围墙 (objects 层)
    TILEMAP_DATA.layers.objects.forEach((id, i) => {
      if (id === 0) return;
      const x = (i % W) * TW + TW / 2;
      const y = Math.floor(i / W) * TH + TH / 2;
      const wall = this.add.image(x, y, 'tile_fence_base').setDisplaySize(TW, TH);
      wall.setDepth(100);
      this.collidables.add(wall);
      this.physics.add.existing(wall, true);
    });
  }

  // 渲染 20 个氛围的展示柜
  renderAmbientShowcases() {
    // 5列 × 4行 均匀摆放
    const colSpacing = 240;
    const rowSpacing = 220;
    const startX = 160;
    const startY = 160;

    AMBIENT_ELEMENTS.forEach(el => {
      const posX = startX + el.col * colSpacing;
      const posY = startY + el.row * rowSpacing;

      // 1. 创建 Phaser 动画序列帧
      const animKey = `anim_${el.id}`;
      if (!this.anims.exists(animKey)) {
        this.anims.create({
          key: animKey,
          frames: Array.from({ length: el.frames }, (_, i) => ({ key: `${el.id}_${i}` })),
          frameRate: el.fps,
          repeat: el.loop ? -1 : 0
        });
      }

      // 2. 绘制展示小地基
      const platform = this.add.graphics();
      platform.fillStyle(0x1e293b, 0.4);
      platform.fillEllipse(posX, posY + 48, 80, 24);
      platform.lineStyle(2, 0x3b82f6, 0.3);
      platform.strokeEllipse(posX, posY + 48, 80, 24);
      platform.setDepth(1);

      // 3. 绘制展示精灵
      const sprite = this.add.sprite(posX, posY, `${el.id}_0`);
      sprite.play(animKey);
      sprite.setDepth(1000 + posY);

      // 4. 展示文本标签
      const label = this.add.text(posX, posY - 64, el.name, {
        fontFamily: 'Segoe UI, monospace',
        fontSize: '13px',
        color: '#94a3b8',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        padding: { x: 6, y: 3 },
        borderRadius: 4
      }).setOrigin(0.5).setDepth(2000);

      this.ambientSprites.push({
        id: el.id,
        name: el.name,
        x: posX,
        y: posY,
        sprite: sprite,
        label: label,
        fps: el.fps
      });
    });
  }

  // 检测玩家走近并激活氛围节点
  checkElementInspection() {
    const threshold = 70; // 距离阈值

    this.ambientSprites.forEach(el => {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, el.x, el.y);
      if (dist < threshold) {
        // 标记为靠近，给文本框加高亮
        el.label.setColor('#38bdf8');
        el.label.setStyle({ stroke: '#0284c7', strokeThickness: 2 });
        
        // 如果之前没有被激活
        if (!this.visitedSet.has(el.id)) {
          this.visitedSet.add(el.id);
          this.visitedCount = this.visitedSet.size;

          // 更新 HUD 状态
          window.GameHUD?.setScore?.(this.visitedCount);
          window.GameHUD?.setObjective?.(`成功激活环境节点: ${el.name} ✨`);

          // 触发溅射粒子效果 (简单图形特效)
          this.createSparkleEffect(el.x, el.y);

          // 检查胜利条件
          if (this.visitedCount >= AMBIENT_ELEMENTS.length) {
            window.GameHUD?.showGameOver?.(true, '太棒了！你完美地校准并体验了全部 20 种动态矢量氛围元素！');
            this.gameStarted = false;
            this.player.setVelocity(0, 0);
            this.player.play('hero_idle');
          }
        }
      } else {
        // 复原标签样式
        el.label.setColor('#94a3b8');
        el.label.setStyle({ strokeThickness: 0 });
      }
    });
  }

  // 闪烁粒子特效
  createSparkleEffect(x, y) {
    for (let i = 0; i < 12; i++) {
      const particle = this.add.circle(x, y, Phaser.Math.Between(2, 5), 0x38bdf8, 0.9);
      particle.setDepth(2000);
      
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.Between(50, 150);
      
      this.physics.add.existing(particle);
      particle.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      
      this.tweens.add({
        targets: particle,
        alpha: 0,
        scale: 0.1,
        duration: 800,
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }

  // ==========================================
  // 核心特性：动态开发调试 GUI（用 HTML DOM 挂在容器上）
  // ==========================================
  createDevControlPanel() {
    // 移除已有的控制面板
    const existing = document.getElementById('dev-control-panel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'dev-control-panel';
    panel.style.cssText = `
      position: absolute;
      bottom: 12px;
      left: 12px;
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 12px 16px;
      width: 280px;
      font-family: 'Segoe UI', monospace;
      font-size: 12px;
      color: #cbd5e1;
      z-index: 100;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
      user-select: none;
      pointer-events: auto;
    `;

    panel.innerHTML = `
      <div style="font-weight: bold; font-size: 13px; color: #38bdf8; margin-bottom: 8px; border-bottom: 1px solid #334155; padding-bottom: 4px;">
        ⚙️ AmbientSVG 开发调校面板
      </div>
      
      <!-- 风速滑块 -->
      <div style="margin-bottom: 8px;">
        <div style="display:flex; justify-content:space-between; margin-bottom: 3px;">
          <span>风速倍率:</span>
          <span id="wind-speed-val" style="color:#f59e0b; font-weight:bold;">1.0x</span>
        </div>
        <input type="range" id="wind-speed-slider" min="0" max="3" step="0.1" value="1" style="width:100%; cursor:pointer;">
      </div>

      <!-- 风向开关 -->
      <div style="margin-bottom: 8px; display:flex; justify-content:space-between; align-items:center;">
        <span>风向侧重:</span>
        <select id="wind-dir-select" style="background:#1e293b; color:#fff; border:1px solid #475569; border-radius:3px; padding:2px 4px; cursor:pointer;">
          <option value="1">吹向右方 (+X)</option>
          <option value="-1">吹向左方 (-X)</option>
        </select>
      </div>

      <!-- 时间切换 -->
      <div style="margin-bottom: 4px; display:flex; justify-content:space-between; align-items:center;">
        <span>时间切换:</span>
        <button id="daynight-btn" style="background:#2563eb; color:#fff; border:none; border-radius:4px; padding:4px 10px; font-weight:bold; cursor:pointer;">
          ☀️ 白昼模式
        </button>
      </div>
    `;

    // 将面板挂载到 game-wrapper 中（确保与 canvas 一起缩放，不会遮挡或越界）
    document.getElementById('game-wrapper').appendChild(panel);

    // 绑定事件处理器
    const speedSlider = document.getElementById('wind-speed-slider');
    const speedVal = document.getElementById('wind-speed-val');
    const dirSelect = document.getElementById('wind-dir-select');
    const dayNightBtn = document.getElementById('daynight-btn');

    // 1. 风速改变时修改所有氛围组件的 frameRate
    speedSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.globalWindSpeed = val;
      speedVal.textContent = val.toFixed(1) + 'x';
      
      this.applyGlobalWindSettings();
    });

    // 2. 风向切换影响部分元素 (如树木、旗帜、落叶)
    dirSelect.addEventListener('change', (e) => {
      this.globalWindDirection = parseInt(e.target.value, 10);
      this.applyGlobalWindSettings();
    });

    // 3. 昼夜模式切换 (给整个画布滤镜叠加着色)
    dayNightBtn.addEventListener('click', () => {
      this.isNightMode = !this.isNightMode;
      if (this.isNightMode) {
        dayNightBtn.textContent = '🌙 黑夜模式';
        dayNightBtn.style.background = '#6366f1';
        // 叠加暗蓝色暗淡调色 (模仿黑夜)
        this.cameras.main.setTint(0x4b5563);
      } else {
        dayNightBtn.textContent = '☀️ 白昼模式';
        dayNightBtn.style.background = '#2563eb';
        // 清除着色
        this.cameras.main.clearTint();
      }
    });
  }

  // 动态修改 Phaser 动画速率与水平翻转状态
  applyGlobalWindSettings() {
    this.ambientSprites.forEach(el => {
      const animKey = `anim_${el.id}`;
      const anim = this.anims.get(animKey);
      if (anim) {
        // 计算新的帧速率：原始速率 * 风速倍率 (如果风速为0，直接暂停动画)
        const targetFps = el.fps * this.globalWindSpeed;
        if (targetFps <= 0) {
          el.sprite.anims.pause();
        } else {
          if (el.sprite.anims.isPaused) el.sprite.anims.resume();
          el.sprite.anims.setFrameRate(targetFps);
        }
      }

      // 如果是和风向强相关的组件 (比如树木、旗帜、落叶、下雨)
      if (['tree', 'flag', 'leaf', 'rain'].includes(el.id)) {
        // 根据风向翻转 X 轴 (让风吹的方向与主角朝向对齐)
        el.sprite.setFlipX(this.globalWindDirection === -1);
      }
    });
  }
}

// 导出配置给游戏入口
const config = {
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: AmbientSandboxScene
};

new Phaser.Game(config);
