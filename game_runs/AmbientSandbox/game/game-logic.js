// AmbientSandbox — 动态环境沙盒：氛围大观 (环境校准解密版)
// 包含 20 种不同类别的参数化矢量氛围元素，并在隔离沙盒中进行观测、校准与自动演示。

const GAME_W = 960;
const GAME_H = 576;
const WORLD_W = 1280;
const WORLD_H = 960;

// 20 个氛围元素的定义与其对应的帧数、位置信息
const AMBIENT_ELEMENTS = [
  // 第一行：自然与建筑
  { id: 'windmill',   name: '风车 (Windmill)',    frames: 6,  fps: 10, loop: true,  col: 0, row: 0 },
  { id: 'tree',       name: '摇曳树 (Tree)',      frames: 6,  fps: 8,  loop: true,  col: 1, row: 0 },
  { id: 'streetlight',name: '路灯 (Streetlight)',  frames: 4,  fps: 6,  loop: true,  col: 2, row: 0 },
  { id: 'campfire',   name: '篝火 (Campfire)',    frames: 6,  fps: 12, loop: true,  col: 3, row: 0 },
  { id: 'flag',       name: '飘扬旗 (Flag)',      frames: 8,  fps: 12, loop: true,  col: 4, row: 0 },

  // 第二行：天气与环境
  { id: 'rain',       name: '下雨 (Rain)',        frames: 4,  fps: 12, loop: true,  col: 0, row: 1 },
  { id: 'snow',       name: '下雪 (Snow)',        frames: 6,  fps: 10, loop: true,  col: 1, row: 1 },
  { id: 'cloud',      name: '流云 (Cloud)',       frames: 8,  fps: 6,  loop: true,  col: 2, row: 1 },
  { id: 'wave',       name: '波浪 (Wave)',        frames: 6,  fps: 8,  loop: true,  col: 3, row: 1 },
  { id: 'star',       name: '星光 (Star)',       frames: 4,  fps: 6,  loop: true,  col: 4, row: 1 },

  // 第三行：动作与光影
  { id: 'leaf',       name: '落叶 (Leaf)',       frames: 6,  fps: 8,  loop: true,  col: 0, row: 2 },
  { id: 'smoke',      name: '烟雾 (Smoke)',      frames: 6,  fps: 8,  loop: true,  col: 1, row: 2 },
  { id: 'bird',       name: '飞鸟 (Bird)',       frames: 4,  fps: 8,  loop: true,  col: 2, row: 2 },
  { id: 'neon',       name: '霓虹灯 (Neon)',     frames: 4,  fps: 4,  loop: true,  col: 3, row: 2 },
  { id: 'ray',        name: '光斑 (Ray)',        frames: 6,  fps: 6,  loop: true,  col: 4, row: 2 },

  // 第四行：水与风
  { id: 'bubble',     name: '气泡 (Bubble)',     frames: 6,  fps: 8,  loop: true,  col: 0, row: 3 },
  { id: 'lighthouse', name: '灯塔 (Lighthouse)', frames: 8,  fps: 10, loop: true,  col: 1, row: 3 },
  { id: 'drip',       name: '水滴 (Drip)',       frames: 8,  fps: 10, loop: true,  col: 2, row: 3 },
  { id: 'waterfall',  name: '瀑布 (Waterfall)',  frames: 6,  fps: 10, loop: true,  col: 3, row: 3 },
  { id: 'wind',       name: '风轨 (Wind)',       frames: 4,  fps: 10, loop: true,  col: 4, row: 3 }
];

// 每个组件校准所需的特定参数
const CALIBRATIONS = {
  windmill:    { speed: 1.0, dir: 1,  night: false, desc: '风速 1.0x' },
  tree:        { speed: 2.0, dir: 1,  night: false, desc: '大风 2.0x' },
  streetlight: { speed: 1.0, dir: 1,  night: true,  desc: '夜间模式' },
  campfire:    { speed: 0.5, dir: 1,  night: true,  desc: '微风夜' },
  flag:        { speed: 1.5, dir: -1, night: false, desc: '左侧风 1.5x' },
  rain:        { speed: 1.8, dir: 1,  night: true,  desc: '大雨夜' },
  snow:        { speed: 1.0, dir: 1,  night: true,  desc: '下雪夜' },
  cloud:       { speed: 0.5, dir: 1,  night: false, desc: '微风 0.5x' },
  wave:        { speed: 0.5, dir: 1,  night: false, desc: '缓流 0.5x' },
  star:        { speed: 0.2, dir: 1,  night: true,  desc: '晴朗星空' },
  leaf:        { speed: 1.2, dir: 1,  night: false, desc: '落叶风 1.2x' },
  smoke:       { speed: 0.8, dir: 1,  night: false, desc: '轻烟 0.8x' },
  bird:        { speed: 1.0, dir: 1,  night: false, desc: '风速 1.0x' },
  neon:        { speed: 0.0, dir: 1,  night: true,  desc: '霓虹夜 0.0x' },
  ray:         { speed: 0.6, dir: 1,  night: false, desc: '日光 0.6x' },
  bubble:      { speed: 0.5, dir: 1,  night: false, desc: '静水流 0.5x' },
  lighthouse:  { speed: 1.0, dir: 1,  night: true,  desc: '灯塔夜' },
  drip:        { speed: 0.2, dir: 1,  night: false, desc: '静水滴 0.2x' },
  waterfall:   { speed: 1.0, dir: 1,  night: false, desc: '瀑流 1.0x' },
  wind:        { speed: 2.5, dir: 1,  night: false, desc: '强风轨 2.5x' }
};

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

    // 2. 加载主角精灵 (逐帧 SVG 代替 AI 精灵图，实现完美步态)
    const heroAnims = { idle: 5, run: 6, jump: 3 };
    Object.entries(heroAnims).forEach(([act, n]) => {
      for (let i = 0; i < n; i++) {
        this.load.svg(`hero_${act}_${i}`, `assets/svg/hero_${act}_${i}.svg`, { width: 178, height: 190 });
      }
    });

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

    // B. 创建主角动画 (逐帧 SVG 代替 AI 精灵图)
    const heroAnims = { idle: 5, run: 6, jump: 3 };
    Object.entries(heroAnims).forEach(([act, n]) => {
      this.anims.create({
        key: `hero_${act}`,
        frames: Array.from({ length: n }, (_, i) => ({ key: `hero_${act}_${i}` })),
        frameRate: 10,
        repeat: act === 'jump' ? 0 : -1
      });
    });

    // C. 铺设地面 (ground 层与 objects 层边界碰撞)
    this.collidables = this.physics.add.staticGroup();
    this.renderSandboxTilemap();

    // D. 放置 20 种氛围元素
    this.ambientSprites = [];
    this.renderAmbientShowcases();

    // E. 创建黑夜模式的半透明遮罩层 (放在所有 YSORT 角色和建筑之上)
    this.nightOverlay = this.add.rectangle(0, 0, WORLD_W, WORLD_H, 0x0b0f19, 0.45);
    this.nightOverlay.setOrigin(0, 0).setDepth(8000);
    this.nightOverlay.setVisible(false);

    // F. 放置主角并开启摄像机跟随
    const spawnX = GAME_CONFIG.player?.spawn?.x ?? 640;
    const spawnY = GAME_CONFIG.player?.spawn?.y ?? 480;
    this.player = this.physics.add.sprite(spawnX, spawnY, 'hero_idle_0');
    this.player.setDisplaySize(96, 102);
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.collidables);

    // 启用 Y 轴排序组
    this.ysortGroup = this.add.group();
    this.ysortGroup.add(this.player);

    // 摄像机设置
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

    // G. 输入绑定
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D
    });
    this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyZ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);

    // H. 变量激活提示与触发器
    this.visitedCount = 0;
    this.visitedSet = new Set();
    window.GameHUD?.setHearts?.(3, 3);
    window.GameHUD?.setScore?.(0);
    window.GameHUD?.setObjective?.("靠近未校准的节点，按 E 键进行环境校准与观测 🔍");

    // I. 创建开发控制面板 DOM Overlay
    this.createDevControlPanel();

    // 绑定白盒探针接口
    this.setupProbeInterface();

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

    // 4. 交互输入检测
    const isInteractJustDown = Phaser.Input.Keyboard.JustDown(this.keyE) || Phaser.Input.Keyboard.JustDown(this.keyZ);
    this.checkElementInteraction(isInteractJustDown);
  }

  // 铺设地面与边界围墙
  renderSandboxTilemap() {
    const TW = TILEMAP_DATA.tileWidth;
    const TH = TILEMAP_DATA.tileHeight;
    const W = TILEMAP_DATA.width;

    TILEMAP_DATA.layers.ground.forEach((id, i) => {
      if (id === 0) return;
      const x = (i % W) * TW + TW / 2;
      const y = Math.floor(i / W) * TH + TH / 2;
      const img = this.add.image(x, y, 'tile_grass_base').setDisplaySize(TW, TH);
      img.setDepth(0);
    });

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
    const colSpacing = 240;
    const rowSpacing = 220;
    const startX = 160;
    const startY = 160;

    AMBIENT_ELEMENTS.forEach(el => {
      const posX = startX + el.col * colSpacing;
      const posY = startY + el.row * rowSpacing;

      const animKey = `anim_${el.id}`;
      if (!this.anims.exists(animKey)) {
        this.anims.create({
          key: animKey,
          frames: Array.from({ length: el.frames }, (_, i) => ({ key: `${el.id}_${i}` })),
          frameRate: el.fps,
          repeat: el.loop ? -1 : 0
        });
      }

      // 绘制展示底座
      const platform = this.add.graphics();
      platform.fillStyle(0x1e293b, 0.4);
      platform.fillEllipse(posX, posY + 48, 80, 24);
      platform.lineStyle(2, 0x3b82f6, 0.3);
      platform.strokeEllipse(posX, posY + 48, 80, 24);
      platform.setDepth(1);

      // 绘制展示精灵
      const sprite = this.add.sprite(posX, posY, `${el.id}_0`);
      sprite.play(animKey);
      sprite.setDepth(1000 + posY);

      // 展示文本标签
      const cal = CALIBRATIONS[el.id];
      const initialText = `${el.name}\n[E] 观测 (${cal.desc})`;
      const label = this.add.text(posX, posY - 68, initialText, {
        fontFamily: 'Segoe UI, monospace',
        fontSize: '12px',
        color: '#94a3b8',
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        align: 'center',
        padding: { x: 8, y: 4 },
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

  // 检测玩家与氛围节点的交互
  checkElementInteraction(isInteractJustDown) {
    const threshold = 85;

    this.ambientSprites.forEach(el => {
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, el.x, el.y);
      const isVisited = this.visitedSet.has(el.id);
      
      if (dist < threshold) {
        if (!isVisited) {
          el.label.setColor('#f59e0b');
          el.label.setStyle({ stroke: '#b45309', strokeThickness: 2 });

          // 按下交互键，或者处于自动测试状态自动调校
          if (isInteractJustDown) {
            this.calibrateEnvironment(el);
          }
        } else {
          el.label.setColor('#4ade80');
          el.label.setStyle({ stroke: '#15803d', strokeThickness: 1 });
        }
      } else {
        if (!isVisited) {
          el.label.setColor('#94a3b8');
          el.label.setStyle({ strokeThickness: 0 });
        } else {
          el.label.setColor('#4ade80');
          el.label.setStyle({ strokeThickness: 0 });
        }
      }
    });
  }

  // 核心特性：校准环境参数，标记当前节点为已激活
  calibrateEnvironment(el) {
    const cal = CALIBRATIONS[el.id];
    if (!cal) return;

    // 1. 设置变量
    this.globalWindSpeed = cal.speed;
    this.globalWindDirection = cal.dir;
    this.isNightMode = cal.night;

    // 2. 更新 DOM 控件显示状态
    const speedSlider = document.getElementById('wind-speed-slider');
    const speedVal = document.getElementById('wind-speed-val');
    const dirSelect = document.getElementById('wind-dir-select');
    const dayNightBtn = document.getElementById('daynight-btn');

    if (speedSlider) speedSlider.value = cal.speed;
    if (speedVal) speedVal.textContent = cal.speed.toFixed(1) + 'x';
    if (dirSelect) dirSelect.value = cal.dir.toString();
    if (dayNightBtn) {
      if (cal.night) {
        dayNightBtn.textContent = '🌙 黑夜模式';
        dayNightBtn.style.background = '#6366f1';
        this.nightOverlay.setVisible(true);
      } else {
        dayNightBtn.textContent = '☀️ 白昼模式';
        dayNightBtn.style.background = '#2563eb';
        this.nightOverlay.setVisible(false);
      }
    }

    // 3. 立即应用到场景动画
    this.applyGlobalWindSettings();

    // 4. 标记激活
    this.visitedSet.add(el.id);
    this.visitedCount = this.visitedSet.size;

    // 5. 更新文本为“已校准”
    el.label.setText(`${el.name}\n[ 已校准 ✓ ]`);
    el.label.setColor('#4ade80');
    el.label.setStyle({ stroke: '#15803d', strokeThickness: 1 });

    // 6. 播放粒子特效
    this.createSparkleEffect(el.x, el.y);

    // 7. 更新 HUD
    window.GameHUD?.setScore?.(this.visitedCount);
    window.GameHUD?.setObjective?.(`校准环境成功: ${el.name} (已同步气象参数)`);

    // 8. 检查通关条件
    if (this.visitedCount >= AMBIENT_ELEMENTS.length) {
      window.GameHUD?.showGameOver?.(true, '🎉 完美校准！你成功以正确的气象环境观测并记录了全部 20 种动态矢量氛围元素！');
      this.gameStarted = false;
      this.player.setVelocity(0, 0);
      this.player.play('hero_idle');
    }
  }

  // 粒子特效
  createSparkleEffect(x, y) {
    for (let i = 0; i < 16; i++) {
      const particle = this.add.circle(x, y, Phaser.Math.Between(2, 6), 0x38bdf8, 0.9);
      particle.setDepth(2000);
      
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.Between(80, 200);
      
      this.physics.add.existing(particle);
      particle.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      
      this.tweens.add({
        targets: particle,
        alpha: 0,
        scale: 0.1,
        duration: 900,
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }

  // 控制面板 DOM Overlay
  createDevControlPanel() {
    const existing = document.getElementById('dev-control-panel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'dev-control-panel';
    panel.style.cssText = `
      position: absolute;
      bottom: 12px;
      left: 12px;
      background: rgba(15, 23, 42, 0.92);
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
      
      <div style="margin-bottom: 8px;">
        <div style="display:flex; justify-content:space-between; margin-bottom: 3px;">
          <span>风速倍率:</span>
          <span id="wind-speed-val" style="color:#f59e0b; font-weight:bold;">1.0x</span>
        </div>
        <input type="range" id="wind-speed-slider" min="0" max="3" step="0.1" value="1" style="width:100%; cursor:pointer;">
      </div>

      <div style="margin-bottom: 8px; display:flex; justify-content:space-between; align-items:center;">
        <span>风向侧重:</span>
        <select id="wind-dir-select" style="background:#1e293b; color:#fff; border:1px solid #475569; border-radius:3px; padding:2px 4px; cursor:pointer;">
          <option value="1">吹向右方 (+X)</option>
          <option value="-1">吹向左方 (-X)</option>
        </select>
      </div>

      <div style="margin-bottom: 4px; display:flex; justify-content:space-between; align-items:center;">
        <span>时间切换:</span>
        <button id="daynight-btn" style="background:#2563eb; color:#fff; border:none; border-radius:4px; padding:4px 10px; font-weight:bold; cursor:pointer;">
          ☀️ 白昼模式
        </button>
      </div>
    `;

    document.getElementById('game-wrapper').appendChild(panel);

    const speedSlider = document.getElementById('wind-speed-slider');
    const speedVal = document.getElementById('wind-speed-val');
    const dirSelect = document.getElementById('wind-dir-select');
    const dayNightBtn = document.getElementById('daynight-btn');

    speedSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.globalWindSpeed = val;
      speedVal.textContent = val.toFixed(1) + 'x';
      this.applyGlobalWindSettings();
    });

    dirSelect.addEventListener('change', (e) => {
      this.globalWindDirection = parseInt(e.target.value, 10);
      this.applyGlobalWindSettings();
    });

    dayNightBtn.addEventListener('click', () => {
      this.isNightMode = !this.isNightMode;
      if (this.isNightMode) {
        dayNightBtn.textContent = '🌙 黑夜模式';
        dayNightBtn.style.background = '#6366f1';
        this.nightOverlay.setVisible(true);
      } else {
        dayNightBtn.textContent = '☀️ 白昼模式';
        dayNightBtn.style.background = '#2563eb';
        this.nightOverlay.setVisible(false);
      }
    });
  }

  // 动态修改 Phaser 动画速率与水平翻转状态
  applyGlobalWindSettings() {
    this.ambientSprites.forEach(el => {
      const animKey = `anim_${el.id}`;
      const anim = this.anims.get(animKey);
      if (anim) {
        // 使用 timeScale 属性动态调整播放速率
        el.sprite.anims.timeScale = this.globalWindSpeed;
        if (this.globalWindSpeed <= 0) {
          el.sprite.anims.pause();
        } else {
          if (el.sprite.anims.isPaused) el.sprite.anims.resume();
        }
      }

      if (['tree', 'flag', 'leaf', 'rain'].includes(el.id)) {
        el.sprite.setFlipX(this.globalWindDirection === -1);
      }
    });
  }

  // 白盒自动试玩探针接口
  setupProbeInterface() {
    window.__probe = () => {
      let closestEl = null;
      let minDist = 999999;
      
      this.ambientSprites.forEach(el => {
        if (!this.visitedSet.has(el.id)) {
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, el.x, el.y);
          if (dist < minDist) {
            minDist = dist;
            closestEl = el;
          }
        }
      });

      let moveX = 0;
      let moveY = 0;
      let interact = false;

      if (closestEl) {
        const dx = closestEl.x - this.player.x;
        const dy = closestEl.y - this.player.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist > 5) {
          moveX = dx / dist;
          moveY = dy / dist;
        }

        if (dist < 65) {
          interact = true;
        }
      }

      return {
        x: this.player.x,
        y: this.player.y,
        vx: this.player.body.velocity.x,
        vy: this.player.body.velocity.y,
        onGround: true,
        hp: 3,
        maxHp: 3,
        score: this.visitedCount,
        goalScore: AMBIENT_ELEMENTS.length,
        act: 1,
        deaths: 0,
        deathBudget: 3,
        won: this.visitedCount >= AMBIENT_ELEMENTS.length,
        lost: false,
        cardActive: false,
        started: true,
        nextGoalX: closestEl ? closestEl.x : this.player.x,
        worldW: WORLD_W,
        cellX: WORLD_W,
        dangerNow: false,
        dangerAhead: false,
        moveX: moveX,
        moveY: moveY,
        interact: interact
      };
    };
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
