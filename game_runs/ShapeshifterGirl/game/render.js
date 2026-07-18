/* game/render.js — 背景装配 + 地形绘制 + 特效系统
 * ─────────────────────────────────────────────────────────────────────────
 * 背景走「抠图+渲染」v2（参照 WyrmsEnd）：AI 剪影带（assets/bg，process-bg 已提色）
 * 只供形状，天空渐变/地平辉光/雾带/漂尘/暗角全部代码绘制，颜色唯一真源 = Config.ATMOS。
 * 层序（后→前）：天空(-60) → far剪影(-56, 视差0.25) → 雾带(-53) → mid剪影(-50, 视差0.55)
 *   → 地面带(-46, 世界锚定分段, 深渊/水域留口) → 地形gfx/角色(0) → 漂尘(8) → 暗幕(30) → 暗角(40)。
 * 剪影图缺失时程序化降级剪影补位（键名一致自动替换），删掉 assets 仍可完整通关。
 * L4 黑暗视界：暗幕 + invertAlpha 光圈遮罩（只随项链光圈开洞，半径下限保公平）。
 */
window.SSG = window.SSG || {};

window.SSG.Render = {
  // 动画安全播放：图集缺失（占位渲染模式）时动画不存在，静默跳过而不是抛错
  safePlay(sprite, key, ignoreIfPlaying) {
    if (!sprite || !sprite.anims || !sprite.scene || !sprite.scene.anims.exists(key)) return;
    sprite.play(key, ignoreIfPlaying);
  },

  _hex(str) { return parseInt(str.slice(1), 16); },

  init(scene) {
    scene.gfx = scene.add.graphics(); // 动态地形层（先于 player 创建 → 渲染在角色之后、背景之前）

    // 初始化粒子管理器（Phaser 3 内置）
    if (!scene.textures.exists('particle_placeholder')) {
      const cv = scene.textures.createCanvas('particle_placeholder', 8, 8);
      if (cv) { const ctx = cv.getContext(); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 8, 8); cv.refresh(); }
    }
    scene.particles = scene.add.particles(0, 0, 'particle_placeholder', { active: false });

    this.buildBackground(scene);
  },

  /* ── 背景装配（create 时执行一次，update 只推 tilePosition）─────────────── */
  buildBackground(scene) {
    const C = window.SSG.Config;
    const i = scene.levelIdx !== undefined ? scene.levelIdx : 0;
    const A = C.ATMOS[i];
    const W = C.GAME_W, H = C.GAME_H;
    const lvl = window.SSG.LEVELS[i];
    const inLevel = scene.levelIdx !== undefined && !!lvl;

    // 1. 天空：8px 宽三停渐变 + 地平辉光，拉伸满屏
    this._makeSkyTexture(scene, i, A, H);
    scene.add.image(0, 0, `ssg_sky${i}`).setOrigin(0).setDisplaySize(W, H).setScrollFactor(0).setDepth(-60);

    // 2. far 剪影带（真图缺失 → 程序化降级山脊）
    const farKey = scene.textures.exists(`bg_l${i + 1}_far`) ? `bg_l${i + 1}_far` : this._makeFallbackBand(scene, i, 'far', A);
    scene.bgFar = scene.add.tileSprite(0, 0, W, H, farKey).setOrigin(0).setScrollFactor(0).setDepth(-56);

    // 3. 雾带（白雾团贴图，运行时染段色）
    this._makeHazeTexture(scene, W);
    scene.bgHaze = scene.add.tileSprite(0, H - 340, W, 240, 'ssg_haze').setOrigin(0)
      .setScrollFactor(0).setDepth(-53).setTint(A.haze).setAlpha(A.hazeA);

    // 4. mid 剪影带
    const midKey = scene.textures.exists(`bg_l${i + 1}_mid`) ? `bg_l${i + 1}_mid` : this._makeFallbackBand(scene, i, 'mid', A);
    scene.bgMid = scene.add.tileSprite(0, 0, W, H, midKey).setOrigin(0).setScrollFactor(0).setDepth(-50);

    // 5. 地面带：世界锚定分段（深渊/水域留口），深渊口垫坑影渐变
    this._buildGroundBand(scene, i, A, inLevel ? lvl.triggers : [], inLevel ? lvl.length : W);

    // 6. 漂尘/萤火（屏幕空间，drawParallaxBackground 里驱动）
    this._makeDustTexture(scene);
    scene.bgDust = [];
    for (let k = 0; k < 20; k++) {
      const spr = scene.add.image(Math.random() * W, 0, 'ssg_dust')
        .setScrollFactor(0).setDepth(8)
        .setScale(0.3 + Math.random() * 0.7)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(A.dust);
      scene.bgDust.push({
        spr,
        vx: (A.firefly ? 8 : 24) + Math.random() * (A.firefly ? 14 : 40),
        baseY: 40 + Math.random() * (H - 120),
        amp: 8 + Math.random() * 18,
        f: 0.0006 + Math.random() * 0.0012,
        ph: Math.random() * Math.PI * 2,
        a0: (0.10 + Math.random() * 0.18) * A.dustA,
        firefly: !!A.firefly,
      });
    }

    // 7. 暗角
    this._makeVignette(scene, W, H);
    scene.add.image(W / 2, H / 2, 'ssg_vign').setScrollFactor(0).setDepth(40);

    // 8. L4 黑暗视界：暗幕 + 项链光圈（invertAlpha 遮罩只在光圈处开洞；公平三原则：
    //    半径下限慷慨、角色/地形同在幕下同等可读、光圈中心锁角色不闪跳）
    if (A.dark && inLevel) {
      const D = C.DARKNESS;
      this._makeLightTexture(scene);
      scene.darkRect = scene.add.rectangle(0, 0, W, H, D.color, 1).setOrigin(0)
        .setScrollFactor(0).setDepth(30).setAlpha(D.alpha);
      scene.lightImg = scene.add.image(W / 2, H / 2, 'ssg_light').setScrollFactor(0).setVisible(false);
      scene.lightImg.setDisplaySize(D.radius * 2.6, D.radius * 2.6);
      scene._lightBaseScale = scene.lightImg.scaleX;
      const mask = scene.lightImg.createBitmapMask();
      mask.invertAlpha = true;
      scene.darkRect.setMask(mask);
      // 项链微光（附加混合），跟随角色
      scene.pendantGlow = scene.add.image(W / 2, H / 2, 'ssg_light').setScrollFactor(0)
        .setDepth(7).setAlpha(0.20).setBlendMode(Phaser.BlendModes.ADD)
        .setDisplaySize(380, 380).setTint(0x9a6cff);
    }
  },

  _makeSkyTexture(scene, i, A, H) {
    const key = `ssg_sky${i}`;
    if (scene.textures.exists(key)) return;
    const SW = 8;
    const cv = scene.textures.createCanvas(key, SW, H), ctx = cv.getContext();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, A.sky[0]); g.addColorStop(0.52, A.sky[1]); g.addColorStop(1, A.sky[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, SW, H);
    const [gr, gg, gb, ga] = A.glow;
    const gl = ctx.createLinearGradient(0, H * A.glowY, 0, H);
    gl.addColorStop(0, `rgba(${gr},${gg},${gb},0)`); gl.addColorStop(1, `rgba(${gr},${gg},${gb},${ga})`);
    ctx.fillStyle = gl; ctx.fillRect(0, H * A.glowY, SW, H * (1 - A.glowY));
    cv.refresh();
  },

  // 周期地脊线：整数波数正弦叠加 → x=0 与 x=W 同值，平铺无缝
  _ridgeY(x, W, base, waves, ph) {
    let y = base;
    for (let w = 0; w < waves.length; w++)
      y += waves[w][1] * Math.sin((x / W) * Math.PI * 2 * waves[w][0] + ph + w * 1.7);
    return y;
  },

  // 程序化降级剪影带（透明底，可平铺），颜色与 process-bg 提色表同源
  _makeFallbackBand(scene, i, kind, A) {
    const key = `ssg_fb_${kind}${i}`;
    if (scene.textures.exists(key)) return key;
    const W = 960, H = window.SSG.Config.GAME_H;
    const cv = scene.textures.createCanvas(key, W, H), ctx = cv.getContext();
    if (kind === 'far') {
      ctx.fillStyle = A.farFb;
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) ctx.lineTo(x, this._ridgeY(x, W, 300, [[2, 34], [5, 14]], i * 2.3));
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) ctx.lineTo(x, this._ridgeY(x, W, 380, [[3, 24], [7, 10]], i * 4.1));
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    } else {
      // 中景件：确定性伪随机尖件/柱件
      let seed = 4241 + i * 991;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      ctx.fillStyle = A.midFb;
      for (let k = 0; k < 9; k++) {
        const bx = 60 + (k / 9) * (W - 120) + (rnd() - 0.5) * 50;
        const h = 70 + rnd() * 140, w2 = 12 + rnd() * 44, lean = (rnd() - 0.5) * 22;
        if (rnd() < 0.55) {
          ctx.beginPath(); ctx.moveTo(bx - w2 / 2, H); ctx.lineTo(bx + lean, H - h); ctx.lineTo(bx + w2 / 2, H);
          ctx.closePath(); ctx.fill();
        } else {
          ctx.fillRect(bx - w2 * 0.3, H - h * 0.8, w2 * 0.6, h * 0.8);
          ctx.fillRect(bx - w2 * 0.5, H - h * 0.8, w2, 8);
        }
      }
    }
    cv.refresh();
    return key;
  },

  _makeHazeTexture(scene, W) {
    if (scene.textures.exists('ssg_haze')) return;
    const H = 240;
    const cv = scene.textures.createCanvas('ssg_haze', W, H), ctx = cv.getContext();
    let seed = 24601;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < 14; k++) {
      const bx = rnd() * W, by = 46 + rnd() * (H - 92);
      const rx = 90 + rnd() * 170, ry = 13 + rnd() * 24, a = 0.05 + rnd() * 0.08;
      for (const ox of [-W, 0, W]) { // 三份绘制保平铺无缝
        ctx.save();
        ctx.translate(bx + ox, by); ctx.scale(1, ry / rx);
        const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
        rg.addColorStop(0, `rgba(255,255,255,${a})`); rg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = rg; ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
        ctx.restore();
      }
    }
    cv.refresh();
  },

  _makeDustTexture(scene) {
    if (scene.textures.exists('ssg_dust')) return;
    const cv = scene.textures.createCanvas('ssg_dust', 16, 16), ctx = cv.getContext();
    const rg = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.5, 'rgba(255,255,255,0.35)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, 16, 16);
    cv.refresh();
  },

  _makeVignette(scene, W, H) {
    if (scene.textures.exists('ssg_vign')) return;
    const cv = scene.textures.createCanvas('ssg_vign', W, H), ctx = cv.getContext();
    const rg = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.92);
    rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,0,0.34)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    cv.refresh();
  },

  _makeLightTexture(scene) {
    if (scene.textures.exists('ssg_light')) return;
    const S = 512;
    const cv = scene.textures.createCanvas('ssg_light', S, S), ctx = cv.getContext();
    const rg = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.55, 'rgba(255,255,255,0.85)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, S, S);
    cv.refresh();
  },

  // 地面带贴图：地脊 fringe + 土壤渐变 + 顶脊亮线 + 碎石斑，480px 宽可平铺
  _makeGroundTexture(scene, i, A, bandH, fringe) {
    const key = `ssg_gband${i}`;
    if (scene.textures.exists(key)) return key;
    const W = 480;
    const cv = scene.textures.createCanvas(key, W, bandH), ctx = cv.getContext();
    // 地脊轮廓（整数波数 → 可平铺）
    ctx.beginPath(); ctx.moveTo(0, bandH);
    for (let x = 0; x <= W; x += 6)
      ctx.lineTo(x, this._ridgeY(x, W, fringe * 0.55, [[3, 3.2], [7, 2.2], [13, 1.4]], i * 0.9));
    ctx.lineTo(W, bandH); ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, 0, bandH);
    g.addColorStop(0, A.groundTop); g.addColorStop(1, A.groundDeep);
    ctx.fillStyle = g; ctx.fill();
    // 顶脊亮线
    ctx.strokeStyle = A.groundLip; ctx.lineWidth = 3; ctx.globalAlpha = 0.9;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 6) {
      const y = this._ridgeY(x, W, fringe * 0.55, [[3, 3.2], [7, 2.2], [13, 1.4]], i * 0.9);
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // 碎石/草簇斑点
    ctx.globalAlpha = 0.35; ctx.fillStyle = A.groundDeep;
    let seed = 5309 + i * 733;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < 26; k++) {
      const bx = rnd() * W, by = fringe + 8 + rnd() * (bandH - fringe - 16), r = 2 + rnd() * 5;
      ctx.beginPath(); ctx.ellipse(bx, by, r * 1.4, r, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    cv.refresh();
    return key;
  },

  _buildGroundBand(scene, i, A, triggers, length) {
    const C = window.SSG.Config;
    const feetY = C.WORLD.FEET_Y, H = C.GAME_H;
    const fringe = 12;                       // 地脊高出脚底基线的高度（角色脚底沉入其后 → 接地）
    const bandTop = feetY - fringe;
    const bandH = H - bandTop;
    const key = this._makeGroundTexture(scene, i, A, bandH, fringe);

    // 深渊坑影渐变贴图（每关色）
    const pitKey = `ssg_pit${i}`;
    if (!scene.textures.exists(pitKey)) {
      const cv = scene.textures.createCanvas(pitKey, 16, 100), ctx = cv.getContext();
      const g = ctx.createLinearGradient(0, 0, 0, 100);
      g.addColorStop(0, A.pit + '00'); g.addColorStop(0.35, A.pit + 'cc'); g.addColorStop(1, A.pit + 'ff');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 16, 100);
      cv.refresh();
    }

    const gaps = triggers.filter(t => t.type === 'chasm' || t.type === 'water').sort((a, b) => a.x - b.x);
    let curX = 0;
    const addSeg = (x0, x1) => {
      if (x1 - x0 < 4) return;
      scene.add.tileSprite(x0, bandTop, x1 - x0, bandH, key).setOrigin(0).setDepth(-46);
    };
    for (const gap of gaps) {
      addSeg(curX, gap.x);
      if (gap.type === 'chasm') {
        scene.add.image(gap.x, bandTop, pitKey).setOrigin(0).setDisplaySize(gap.w, bandH).setDepth(-45);
      }
      curX = gap.x + gap.w;
    }
    addSeg(curX, Math.max(length, curX));
  },

  /* ── 每帧背景推进（视差 tilePosition + 漂尘 + 黑暗光圈跟随）────────────── */
  drawParallaxBackground(scene) {
    if (!scene.bgFar) return;
    const cam = scene.cameras.main.scrollX, tn = scene.time.now;
    scene.bgFar.tilePositionX = cam * 0.25;
    scene.bgHaze.tilePositionX = cam * 0.38 + tn * 0.006;
    scene.bgMid.tilePositionX = cam * 0.55;

    const W = window.SSG.Config.GAME_W;
    const dt = scene.game.loop.delta / 1000;
    for (const m of scene.bgDust) {
      m.spr.x -= m.vx * dt;
      if (m.spr.x < -20) { m.spr.x = W + 20; m.baseY = 40 + Math.random() * 400; }
      m.spr.y = m.baseY + Math.sin(tn * m.f + m.ph) * m.amp;
      // 萤火呼吸闪烁；风尘恒定微光
      m.spr.setAlpha(m.firefly ? m.a0 * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(tn * 0.003 + m.ph * 3))) : m.a0);
    }

    if (scene.darkRect && scene.player) {
      const sx = scene.player.x - cam;
      const sy = scene.player.y - scene.cameras.main.scrollY;
      const flick = 1 + Math.sin(tn * 0.004) * 0.03; // 烛光式微呼吸
      scene.lightImg.setPosition(sx, sy).setScale(scene._lightBaseScale * flick);
      scene.pendantGlow.setPosition(sx, sy - 24);
    }
  },

  /* ── 动态地形绘制（每帧，离屏剪裁）────────────────────────────────────── */
  draw(scene) {
    const g = scene.gfx;
    g.clear();

    const activeLevel = window.SSG.LEVELS[scene.levelIdx];
    if (!activeLevel) return;

    const C = window.SSG.Config;
    const A = C.ATMOS[scene.levelIdx] || C.ATMOS[0];
    const feetY = C.WORLD.FEET_Y;
    const H = C.GAME_H;
    const camLeft = scene.cameras.main.scrollX;
    const camWidth = C.GAME_W;
    const lip = this._hex(A.groundLip);
    const deep = this._hex(A.groundDeep);
    const tn = scene.time.now;

    for (const t of activeLevel.triggers) {
      if (t.x + (t.w || 100) < camLeft || t.x > camLeft + camWidth + 100) {
        continue; // 离屏剪裁
      }

      if (t.type === 'water') {
        // 深水区：水体渐变（两段叠色）+ 双谐波水面 + 高光碎片
        g.fillStyle(0x2a6ea8, 0.42);
        g.fillRect(t.x, feetY - 20, t.w, H - feetY + 20);
        g.fillStyle(0x143a5e, 0.45);
        g.fillRect(t.x, feetY + 40, t.w, H - feetY - 40);
        if (t.hasTunnel) { // 水底通道口暗示
          g.fillStyle(0x0a1e33, 0.75);
          g.fillRect(t.x + 20, H - 46, t.w - 40, 40);
        }
        g.lineStyle(2.5, 0x9adcff, 0.9);
        g.beginPath();
        for (let x = t.x; x <= t.x + t.w; x += 12) {
          const waveY = feetY - 20 + Math.sin((x + tn * 0.05) * 0.045) * 3.4 + Math.sin((x - tn * 0.03) * 0.11) * 1.8;
          if (x === t.x) g.moveTo(x, waveY); else g.lineTo(x, waveY);
        }
        g.strokePath();
        g.fillStyle(0xdff4ff, 0.35); // 波光
        for (let k = 0; k < 5; k++) {
          const sx = t.x + ((k * 137 + tn * 0.02) % t.w);
          g.fillRect(sx, feetY - 10 + (k % 3) * 14, 14, 2);
        }
      }

      else if (t.type === 'thorns') {
        // 荆棘丛：底部藤蔓堆 + 双层错落尖刺 + 浆果点
        g.fillStyle(0x2e1a10, 0.9);
        g.fillRect(t.x, feetY - 8, t.w, 12);
        for (let x = t.x; x < t.x + t.w; x += 26) {
          const h1 = 26 + ((x * 7) % 12);
          g.fillStyle(0x3d2417, 1);
          g.beginPath();
          g.moveTo(x, feetY); g.lineTo(x + 13, feetY - h1); g.lineTo(x + 26, feetY);
          g.closePath(); g.fillPath();
          g.fillStyle(0x6e3a8a, 0.9); // 毒紫刺尖
          g.beginPath();
          g.moveTo(x + 7, feetY - h1 * 0.45); g.lineTo(x + 13, feetY - h1 - 6); g.lineTo(x + 19, feetY - h1 * 0.45);
          g.closePath(); g.fillPath();
        }
        g.fillStyle(0xd6455e, 0.95); // 浆果
        for (let x = t.x + 10; x < t.x + t.w; x += 52) g.fillCircle(x, feetY - 12 - (x % 9), 3);
      }

      else if (t.type === 'rock' && !t.destroyed) {
        // 裂石巨岩：圆角巨石 + 顶部苔色 + 裂纹 + 左上高光
        const rx = t.x, rw = t.w, rh = t.h, ry = feetY - rh;
        g.fillStyle(0x5c6472, 1);
        g.fillRoundedRect(rx - 6, ry, rw + 12, rh, 16);
        g.fillStyle(0x434a58, 1);
        g.fillRoundedRect(rx - 6 + (rw + 12) * 0.45, ry + 6, (rw + 12) * 0.55, rh - 6, { tl: 0, tr: 16, bl: 0, br: 0 });
        g.fillStyle(lip, 0.55); // 顶部苔/尘色呼应关卡
        g.fillRoundedRect(rx - 2, ry + 2, rw + 4, 10, 5);
        g.lineStyle(2, 0x2b303c, 0.9); // 裂纹
        g.beginPath();
        g.moveTo(rx + rw * 0.5, ry + 8); g.lineTo(rx + rw * 0.3, ry + rh * 0.4);
        g.lineTo(rx + rw * 0.62, ry + rh * 0.62); g.lineTo(rx + rw * 0.4, feetY - 6);
        g.strokePath();
        g.beginPath();
        g.moveTo(rx + rw * 0.3, ry + rh * 0.4); g.lineTo(rx + rw * 0.05, ry + rh * 0.55);
        g.strokePath();
        g.fillStyle(0xffffff, 0.14); // 左上受光
        g.fillRoundedRect(rx - 2, ry + 4, rw * 0.3, rh * 0.28, 10);
      }

      else if (t.type === 'tunnel') {
        // 矮缝：整块悬顶岩体 + 洞口垂檐（石灰色系，与剪影背景/土台都拉开）
        const ceilBottom = feetY - t.h;
        g.fillStyle(0x3a4150, 1);
        g.fillRect(t.x, 0, t.w, ceilBottom);
        g.fillStyle(0x000000, 0.25);
        g.fillRect(t.x, ceilBottom - 26, t.w, 26);
        g.fillStyle(0x2b303c, 1); // 垂檐尖齿
        for (let x = t.x; x < t.x + t.w; x += 22) {
          g.beginPath();
          g.moveTo(x, ceilBottom); g.lineTo(x + 11, ceilBottom + 10 + ((x * 5) % 7)); g.lineTo(x + 22, ceilBottom);
          g.closePath(); g.fillPath();
        }
        g.lineStyle(2, 0x9aa4b8, 0.6);
        g.lineBetween(t.x, ceilBottom, t.x + t.w, ceilBottom);
      }

      else if (t.type === 'cleft') {
        // 高台：暖土棕块 + 关卡色草皮唇线 + 深描边——可交互件必须从剪影背景里跳出来
        const py = feetY - t.h;
        g.fillStyle(0x8a6544, 1);
        g.fillRoundedRect(t.x, py, t.w, t.h + 6, { tl: 10, tr: 10, bl: 0, br: 0 });
        g.fillStyle(0x000000, 0.20);
        g.fillRect(t.x + t.w - 14, py + 8, 14, t.h - 8);
        g.lineStyle(2.5, 0x4a3520, 0.9);
        g.strokeRoundedRect(t.x, py, t.w, t.h + 6, { tl: 10, tr: 10, bl: 0, br: 0 });
        g.fillStyle(lip, 1);
        g.fillRoundedRect(t.x - 3, py - 4, t.w + 6, 12, 6);
        g.fillStyle(0xffffff, 0.12);
        g.fillRect(t.x + 4, py + 12, t.w * 0.35, 6);
      }

      else if (t.type === 'wall') {
        // 高墙：石砌墙体 + 砖缝 + 顶檐
        const wy = feetY - t.h;
        g.fillStyle(0x3a4150, 1);
        g.fillRoundedRect(t.x, wy, t.w, t.h, { tl: 8, tr: 8, bl: 0, br: 0 });
        g.lineStyle(1.5, 0x252a34, 0.9);
        for (let y = wy + 18; y < feetY; y += 22) g.lineBetween(t.x, y, t.x + t.w, y);
        for (let y = wy + 18, r = 0; y < feetY; y += 22, r++)
          g.lineBetween(t.x + (r % 2 ? t.w * 0.33 : t.w * 0.66), y - 22, t.x + (r % 2 ? t.w * 0.33 : t.w * 0.66), y);
        g.fillStyle(0x4d5566, 1); // 顶檐
        g.fillRoundedRect(t.x - 6, wy - 8, t.w + 12, 14, 6);
        g.fillStyle(0xffffff, 0.08);
        g.fillRect(t.x + 3, wy + 4, t.w * 0.3, t.h * 0.5);
      }

      else if (t.type === 'updraft') {
        // 上升气流：柔光气柱 + 上行风线
        for (let s = 0; s < 3; s++) {
          g.fillStyle(0x9adcff, 0.05 + s * 0.02);
          const inset = s * t.w * 0.16;
          g.fillRect(t.x + inset, feetY - 300 + s * 40, t.w - inset * 2, 300 - s * 40);
        }
        g.lineStyle(1.5, 0xcdf0ff, 0.5);
        for (let k = 0; k < 5; k++) {
          const fx = t.x + (t.w * 0.18) * (k + 0.5) + Math.sin(tn * 0.002 + k) * 10;
          const fy = feetY - ((tn * 0.12 + k * 90) % 280);
          g.beginPath();
          g.moveTo(fx, fy); g.lineTo(fx, fy + 34);
          g.strokePath();
        }
      }
    }
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
