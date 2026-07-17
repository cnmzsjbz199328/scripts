/* game/render.js — 程序化与特效绘制系统
 * ─────────────────────────────────────────────────────────────────────────
 * 包含：视差多图层背景绘制（天空渐变、远山、近景地脊）、水流、气流与荆棘丛渲染。
 * 包含：变身硬直青绿光晕、变身闪爆、二段跳气环与击碎裂石的碎屑粒子系统。
 * 在 AI 图像资源未加载时，自动降级绘制精致的程序化色彩剪影，保障视觉震撼。
 */
window.SSG = window.SSG || {};

window.SSG.Render = {
  // 画纸/背景初始化
  init(scene) {
    scene.gfx = scene.add.graphics();
    scene.bgGfx = scene.add.graphics().setDepth(-50);
    
    // 初始化粒子管理器（Phaser 3 内置）
    scene.particles = scene.add.particles(0, 0, 'particle_placeholder', {
      active: false // 只作模板，不自动发射
    });
  },

  draw(scene) {
    const g = scene.gfx;
    g.clear();

    const activeLevel = window.SSG.LEVELS[scene.levelIdx];
    if (!activeLevel) return;

    const feetY = window.SSG.Config.WORLD.FEET_Y;
    const camLeft = scene.cameras.main.scrollX;
    const camWidth = window.SSG.Config.GAME_W;

    // 绘制地图中的地形障碍与机关（只画可见区域附近的）
    for (const t of activeLevel.triggers) {
      if (t.x + (t.w || 100) < camLeft || t.x > camLeft + camWidth + 100) {
        continue; // 离屏剪裁，不渲染
      }

      if (t.type === 'water') {
        // 绘制深水区：半透明蓝色，上面带波动波纹
        g.fillStyle(0x0284c7, 0.45);
        g.fillRect(t.x, feetY - 20, t.w, 150);

        g.lineStyle(2, 0x38bdf8, 0.85);
        g.beginPath();
        for (let x = t.x; x <= t.x + t.w; x += 15) {
          const waveY = feetY - 20 + Math.sin((x + scene.time.now * 0.05) * 0.05) * 4;
          if (x === t.x) g.moveTo(x, waveY);
          else g.lineTo(x, waveY);
        }
        g.strokePath();
      } 
      
      else if (t.type === 'thorns') {
        // 绘制荆棘丛：尖锐的红绿色三角丛
        g.fillStyle(0x451a03, 0.8);
        g.lineStyle(2, 0xef4444, 0.8);
        for (let x = t.x; x < t.x + t.w; x += 25) {
          g.beginPath();
          g.moveTo(x, feetY);
          g.lineTo(x + 12.5, feetY - 30);
          g.lineTo(x + 25, feetY);
          g.closePath();
          g.fillPath();
          g.strokePath();
        }
      } 
      
      else if (t.type === 'rock' && !t.destroyed) {
        // 绘制裂石墙：深灰色网状多边形岩石
        g.fillStyle(0x475569, 0.95);
        g.lineStyle(2, 0x1e293b, 1);
        g.fillRect(t.x, feetY - t.h, t.w, t.h);

        // 绘制内部裂纹
        g.lineStyle(1.5, 0x94a3b8, 0.7);
        g.beginPath();
        g.moveTo(t.x, feetY - t.h); g.lineTo(t.x + t.w, feetY);
        g.moveTo(t.x + t.w, feetY - t.h); g.lineTo(t.x, feetY);
        g.moveTo(t.x, feetY - t.h / 2); g.lineTo(t.x + t.w, feetY - t.h / 2);
        g.strokePath();
      } 
      
      else if (t.type === 'tunnel') {
        // 绘制低矮天花板/矮缝墙
        g.fillStyle(0x334155, 0.9);
        g.fillRect(t.x, 0, t.w, feetY - t.h);
        g.lineStyle(2, 0x0f172a, 1);
        g.strokeRect(t.x, 0, t.w, feetY - t.h);
      } 
      
      else if (t.type === 'wall') {
        // 绘制不可破高墙
        g.fillStyle(0x1e293b, 1);
        g.fillRect(t.x, feetY - t.h, t.w, t.h);
        g.lineStyle(2, 0x0f172a, 1);
        g.strokeRect(t.x, feetY - t.h, t.w, t.h);
      }
      
      else if (t.type === 'updraft') {
        // 绘制上升气流：垂直向上游动的风线
        g.lineStyle(1, 0x00ffcc, 0.15);
        for (let i = 0; i < 5; i++) {
          const fx = t.x + (t.w * 0.2) * i + (Math.sin(scene.time.now * 0.002 + i) * 10);
          const fy = feetY - ((scene.time.now * 0.1 + i * 80) % 250);
          g.beginPath();
          g.moveTo(fx, fy);
          g.lineTo(fx, fy + 40);
          g.strokePath();
        }
      }
    }

    // 绘制基准地表硬地面
    g.fillStyle(0x0f172a, 1);
    g.fillRect(camLeft - 50, feetY, camWidth + 100, 100);
    g.lineStyle(3, 0xff4f4f, 0.85); // 红色地表分界线
    g.beginPath();
    g.moveTo(camLeft - 50, feetY);
    g.lineTo(camLeft + camWidth + 50, feetY);
    g.strokePath();
  },

  drawParallaxBackground(scene) {
    const bg = scene.bgGfx;
    bg.clear();

    const C = window.SSG.Config;
    const scrollX = scene.cameras.main.scrollX;
    const activeLevel = window.SSG.LEVELS[scene.levelIdx];
    const palette = C.PALETTES[activeLevel.paletteIdx];

    // 1. 绘制天空渐变背景 (不随镜头移动，ScrollFactor = 0)
    // 根据 Palette 画程序化渐变色
    const skyColor = palette.sky;
    const primaryColor = palette.primary;
    bg.fillGradientStyle(skyColor, skyColor, primaryColor, primaryColor, 1);
    bg.fillRect(scrollX, 0, C.GAME_W, C.GAME_H);

    // 2. 绘制远景层 (ScrollFactor = 0.25)
    // 程序化画远山重峦叠嶂
    const farScrollX = scrollX * 0.25;
    bg.fillStyle(palette.primary, 0.3);
    bg.beginPath();
    bg.moveTo(scrollX, C.WORLD.FEET_Y);
    for (let x = 0; x <= C.GAME_W; x += 30) {
      const worldX = scrollX + x + farScrollX;
      const height = 150 + Math.sin(worldX * 0.003) * 60 + Math.cos(worldX * 0.007) * 20;
      bg.lineTo(scrollX + x, C.WORLD.FEET_Y - height);
    }
    bg.lineTo(scrollX + C.GAME_W, C.WORLD.FEET_Y);
    bg.closePath();
    bg.fillPath();

    // 远景全景图混合显示
    if (scene.textures.exists('panorama')) {
      // 视差叠加
      bg.fillStyle(0xffffff, 0.15);
      bg.fillRect(scrollX, 0, C.GAME_W, C.GAME_H);
    }

    // 3. 绘制中景层 (ScrollFactor = 0.55)
    // 程序化画近处矮丘陵
    const midScrollX = scrollX * 0.55;
    bg.fillStyle(palette.primary, 0.5);
    bg.beginPath();
    bg.moveTo(scrollX, C.WORLD.FEET_Y);
    for (let x = 0; x <= C.GAME_W; x += 20) {
      const worldX = scrollX + x + midScrollX;
      const height = 80 + Math.sin(worldX * 0.008) * 30 + Math.cos(worldX * 0.015) * 10;
      bg.lineTo(scrollX + x, C.WORLD.FEET_Y - height);
    }
    bg.lineTo(scrollX + C.GAME_W, C.WORLD.FEET_Y);
    bg.closePath();
    bg.fillPath();

    // 4. 绘制前景暗角 Vignette
    bg.fillStyle(0x000000, 0.2);
    bg.fillRect(scrollX, 0, C.GAME_W, C.GAME_H);
  },

  // 变身读条青绿粒子特效
  playMorphFX(scene, player, duration) {
    const emitter = scene.add.particles(0, 0, 'particle_placeholder', {
      x: () => player.x,
      y: () => player.y - player.body.height / 2,
      speed: { min: 50, max: 120 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.8, end: 0.1 },
      alpha: { start: 0.8, end: 0 },
      tint: 0x00ffcc, // 青绿色
      lifespan: 600,
      frequency: 25,
      maxParticles: Math.floor(duration / 25)
    }).setDepth(15);

    scene.time.delayedCall(duration, () => {
      emitter.destroy();
    });
  },

  // 变身完成闪爆特效
  playMorphCompleteFX(scene, player, color) {
    const emitter = scene.add.particles(player.x, player.y - player.body.height / 2, 'particle_placeholder', {
      speed: { min: 100, max: 280 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.2, end: 0.1 },
      alpha: { start: 1.0, end: 0 },
      tint: color,
      lifespan: 400,
      maxParticles: 30
    }).setDepth(15);

    scene.time.delayedCall(500, () => {
      emitter.destroy();
    });
  },

  // 二段跳气环特效
  playDoubleJumpFX(scene, player) {
    const circleGfx = scene.add.graphics();
    circleGfx.lineStyle(2, 0xffffff, 0.8);
    circleGfx.strokeCircle(player.x, player.y + player.body.height / 2, 24);
    
    // Tween 气环扩散消失
    scene.tweens.add({
      targets: circleGfx,
      scaleX: 1.8,
      scaleY: 1.8,
      alpha: 0,
      x: player.x * -0.8, // 抵消缩放偏移
      y: (player.y + player.body.height / 2) * -0.8,
      duration: 300,
      onComplete: () => {
        circleGfx.destroy();
      }
    });
  },

  // 上升气流飘动气流线
  playWindLinesFX(scene, player) {
    if (Math.random() > 0.3) return;
    const line = scene.add.graphics();
    line.lineStyle(1.5, 0x00ffcc, 0.6);
    const rx = player.x + Phaser.Math.Between(-30, 30);
    const ry = player.y + 40;
    line.beginPath();
    line.moveTo(rx, ry);
    line.lineTo(rx, ry - 50);
    line.strokePath();

    scene.tweens.add({
      targets: line,
      y: -100,
      alpha: 0,
      duration: 400,
      onComplete: () => {
        line.destroy();
      }
    });
  },

  // 碎岩岩屑爆开特效
  playRockDebrisFX(scene, x, y) {
    const emitter = scene.add.particles(x, y, 'particle_placeholder', {
      speed: { min: 80, max: 200 },
      gravityY: 600,
      angle: { min: -130, max: -50 },
      scale: { start: 1.5, end: 0.2 },
      alpha: { start: 1.0, end: 0.1 },
      tint: 0x475569, // 灰色石块
      lifespan: 600,
      maxParticles: 40
    }).setDepth(15);

    scene.time.delayedCall(800, () => {
      emitter.destroy();
    });
  }
};
