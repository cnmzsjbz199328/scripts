/* WyrmsEnd — 背景视差长卷（蓝图 §3）。
 * 层序（后→前）：代码天空渐变(ATMOS) → far 剪影(抠像透明图) → 雾带/漂沙(代码,段色染) → mid 剪影 → 地面带。
 * 天空/雾/沙的颜色一律出自 Forge.ATMOS——AI 图只供剪影形状，气氛由代码统一，色调不再看图的脸色。
 * 真图（agy 生成，assets/bg/segN_{far,mid}.png，均绿底抠像）缺失时用程序化降级剪影，键名一致自动替换。
 * 换景 = 走出来的（蓝图 §3.3，不做原地 crossfade）：far/mid 每段一条**世界锚定条带**
 * （scrollFactor=层视差系数），旧段随推进自然滑出屏外；条带内侧接缝羽化成"剪影渐稀"的
 * 空旷带，两段在缝处都淡到无。段边界映射到视差空间取"镜头中心过界时缝在屏幕中央"：
 * q(x) = (x - W/2)·p + W/2。天空例外——不透明纯色渐变仍走 A/B crossfade（等价颜色 lerp，
 * 天色本就该连续），雾带/漂沙 tint 亦按世界 x 连续 lerp。 */
Object.assign(JourneyScene.prototype, {

  _segAt(x) {
    const S = Forge.SEGMENTS;
    for (let i = 0; i < S.length; i++) if (x < S[i].x1) return i;
    return S.length - 1;
  },

  _bgEnsureTextures() {
    for (let i = 0; i < 5; i++) {
      this._makeSky(i);                                                  // 天空永远走代码，无降级一说
      if (!this.textures.exists(`bg${i}_far`)) this._makeFarFallback(i);
      if (!this.textures.exists(`bg${i}_mid`)) this._makeMidFallback(i);
    }
    if (!this.textures.exists('ground_band')) this._makeGroundBand();
    this._makeHaze();
    this._makeDustDot();
  },

  // 段天空：三停竖直渐变 + 平流云暗带 + 地平辉光。全部 x 不变 → 8px 宽画布拉伸即无缝。
  _makeSky(i) {
    const H = Forge.H, SW = 8, A = Forge.ATMOS[i];
    const cv = this.textures.createCanvas(`sky${i}`, SW, H), ctx = cv.getContext();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, A.sky[0]); g.addColorStop(0.52, A.sky[1]); g.addColorStop(1, A.sky[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, SW, H);
    if (i < 4) {           // 平流云暗带（末段是洞窟，无云，改压顶部黑暗）
      const bands = [[0.10, 0.10, 0.10], [0.26, 0.14, 0.08], [0.44, 0.09, 0.06]];
      for (const [yf, hf, aB] of bands) {
        const by = H * yf, bh = H * hf;
        const bg = ctx.createLinearGradient(0, by, 0, by + bh);
        bg.addColorStop(0, 'rgba(0,0,0,0)'); bg.addColorStop(0.5, `rgba(0,0,0,${aB})`); bg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = bg; ctx.fillRect(0, by, SW, bh);
      }
    } else {
      const top = ctx.createLinearGradient(0, 0, 0, H * 0.42);
      top.addColorStop(0, 'rgba(0,0,0,0.55)'); top.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = top; ctx.fillRect(0, 0, SW, H * 0.42);
    }
    const [gr, gg, gb, ga] = A.glow;
    const gl = ctx.createLinearGradient(0, H * A.glowY, 0, H);
    gl.addColorStop(0, `rgba(${gr},${gg},${gb},0)`); gl.addColorStop(1, `rgba(${gr},${gg},${gb},${ga})`);
    ctx.fillStyle = gl; ctx.fillRect(0, H * A.glowY, SW, H * (1 - A.glowY));
    cv.refresh();
  },

  // 雾带：白色软雾团（运行时 setTint 染段色）。每团三份绘制(x±W)保平铺无缝。
  _makeHaze() {
    const W = Forge.W, H = 240;
    const cv = this.textures.createCanvas('haze_band', W, H), ctx = cv.getContext();
    let seed = 24601;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < 14; k++) {
      const bx = rnd() * W, by = 46 + rnd() * (H - 92);
      const rx = 90 + rnd() * 170, ry = 13 + rnd() * 24, a = 0.05 + rnd() * 0.08;
      for (const ox of [-W, 0, W]) {
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

  // 漂沙母粒：白色软圆点，运行时按段染色
  _makeDustDot() {
    const cv = this.textures.createCanvas('dust_dot', 16, 16), ctx = cv.getContext();
    const rg = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.5, 'rgba(255,255,255,0.35)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, 16, 16);
    cv.refresh();
  },

  _lerpTint(c1, c2, t) {
    const r1 = (c1 >> 16) & 255, g1 = (c1 >> 8) & 255, b1 = c1 & 255;
    const r2 = (c2 >> 16) & 255, g2 = (c2 >> 8) & 255, b2 = c2 & 255;
    return ((r1 + (r2 - r1) * t) << 16 | (g1 + (g2 - g1) * t) << 8 | (b1 + (b2 - b1) * t)) & 0xffffff;
  },

  // 周期地脊线：整数波数正弦叠加 → x=0 与 x=W 处值相同，平铺无缝
  _ridgeY(x, W, base, waves, ph) {
    let y = base;
    for (let i = 0; i < waves.length; i++)
      y += waves[i][1] * Math.sin((x / W) * Math.PI * 2 * waves[i][0] + ph + i * 1.7);
    return y;
  },

  // 远景降级剪影：透明底（天空由 sky 层负责），只画山脊/钟乳石形状
  _makeFarFallback(i) {
    const W = Forge.W, H = Forge.H, cfg = Forge.BG_FALLBACK[i];
    const cv = this.textures.createCanvas(`bg${i}_far`, W, H), ctx = cv.getContext();
    const layer = (color, base, waves, ph) => {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) ctx.lineTo(x, this._ridgeY(x, W, base, waves, ph));
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    };
    layer(cfg.hill, 320, [[2, 30], [5, 14]], i * 2.3);
    layer(cfg.hill2, 392, [[3, 22], [7, 9]], i * 4.1);
    if (i === 4) {   // 龙巢：顶部钟乳石倒脊
      ctx.fillStyle = cfg.hill2;
      ctx.beginPath(); ctx.moveTo(0, 0);
      for (let x = 0; x <= W; x += 8)
        ctx.lineTo(x, 110 - this._ridgeY(x, W, 0, [[4, 42], [9, 18]], 1.2));
      ctx.lineTo(W, 0); ctx.closePath(); ctx.fill();
    }
    cv.refresh();
  },

  // 中景剪影件：确定性伪随机摆放，件宽 < 边距 → 不跨接缝，平铺无缝
  _makeMidFallback(i) {
    const W = Forge.W, H = Forge.H, cfg = Forge.BG_FALLBACK[i];
    const cv = this.textures.createCanvas(`bg${i}_mid`, W, H), ctx = cv.getContext();
    let seed = 4241 + i * 991;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    ctx.fillStyle = cfg.mid;
    const n = 9;
    for (let k = 0; k < n; k++) {
      const bx = 60 + (k / n) * (W - 120) + (rnd() - 0.5) * 50;
      const h = 70 + rnd() * 130, w = 10 + rnd() * 42, lean = (rnd() - 0.5) * 20;
      if (rnd() < 0.55) {          // 锥形尖件（枯树/尖桩/骨刺）
        ctx.beginPath();
        ctx.moveTo(bx - w / 2, H);
        ctx.lineTo(bx + lean, H - h);
        ctx.lineTo(bx + w / 2, H);
        ctx.closePath(); ctx.fill();
      } else {                     // 细高柱件（栅栏/残柱/断墙）
        ctx.fillRect(bx - w * 0.3, H - h * 0.8, w * 0.6, h * 0.8);
        ctx.fillRect(bx - w * 0.5, H - h * 0.8, w, 8);
      }
    }
    cv.refresh();
  },

  // 地面带：周期地脊 + 碎岩尖片（人物脚底沉入其后 → 接地），tileSprite 全宽平铺
  _makeGroundBand() {
    const W = Forge.W, BH = 150, TOP = 16;
    const cv = this.textures.createCanvas('ground_band', W, BH), ctx = cv.getContext();
    let seed = 77813;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    ctx.beginPath(); ctx.moveTo(0, BH);
    for (let x = 0; x <= W; x += 6)
      ctx.lineTo(x, TOP + 9 + this._ridgeY(x, W, 0, [[4, 5], [9, 3], [17, 2]], 0.7));
    ctx.lineTo(W, BH); ctx.closePath();
    const g = ctx.createLinearGradient(0, TOP, 0, BH);
    g.addColorStop(0, '#0e0808'); g.addColorStop(1, '#060303');
    ctx.fillStyle = g; ctx.fill();
    for (let i = 0; i < 22; i++) {
      const bx = 24 + rnd() * (W - 48), w2 = 8 + rnd() * 20, h2 = 8 + rnd() * 26;
      ctx.beginPath();
      ctx.moveTo(bx - w2 / 2, TOP + 16);
      ctx.lineTo(bx + (rnd() - 0.5) * 6, TOP + 16 - h2);
      ctx.lineTo(bx + w2 / 2, TOP + 16);
      ctx.closePath(); ctx.fill();
    }
    cv.refresh();
  },

  // 段边界 x 映射到视差空间（scrollFactor=p 层）：镜头中心过界时接缝恰在屏幕中央
  _qOf(x, p) { return (x - Forge.W / 2) * p + Forge.W / 2; },

  /* 一层的五条世界锚定条带：每段合成专属条带贴图（源图居中裁切/自平铺补宽），
   * 内侧接缝两边各羽化 ~F px → 缝处两段剪影都渐稀到无，读作自然空旷带。
   * 渲染期零 update 代码——视差全由 scrollFactor 承担。 */
  _buildLayerStrips(kind, p, depth) {
    const S = Forge.SEGMENTS, last = S.length - 1;
    for (let s = 0; s <= last; s++) {
      // 首条带左延到 0、末条带右延到层滚动终点，保证 scrollX 全程有景
      const q0 = s === 0 ? 0 : this._qOf(S[s].x0, p);
      const q1 = s === last ? (Forge.WORLD.W - Forge.W) * p + Forge.W : this._qOf(S[s].x1, p);
      const key = `strip_${kind}_${s}`;
      this._makeStripTexture(key, `bg${S[s].bg}_${kind}`, Math.ceil(q1 - q0), s > 0, s < last);
      this.add.image(Math.floor(q0), 0, key).setOrigin(0).setScrollFactor(p, 0).setDepth(depth);
    }
  },

  _makeStripTexture(key, srcKey, w, featherL, featherR) {
    const H = Forge.H, F = Math.min(200, Math.floor(w * 0.24));
    const src = this.textures.get(srcKey).getSourceImage();
    const cv = this.textures.createCanvas(key, w, H), ctx = cv.getContext();
    // 源图比条带宽 → 居中裁切；比条带窄（程序化降级 960px，可平铺）→ 横向平铺补满
    const off = src.width >= w ? Math.floor((src.width - w) / 2) : 0;
    for (let x = -off; x < w; x += src.width) ctx.drawImage(src, x, 0);
    ctx.globalCompositeOperation = 'destination-out';
    const feather = (x0, x1) => {
      const g = ctx.createLinearGradient(x0, 0, x1, 0);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(Math.min(x0, x1), 0, F, H);
    };
    if (featherL) feather(0, F);
    if (featherR) feather(w, w - F);
    ctx.globalCompositeOperation = 'source-over';
    cv.refresh();
  },

  _buildParallax() {
    const D = Forge.C.DEPTH, W = Forge.W, H = Forge.H;
    // 天空层（最底）：8px 宽渐变拉伸满屏，段间 crossfade ≈ 颜色 lerp（两侧均不透明）
    this.skyA = this.add.image(0, 0, 'sky0').setOrigin(0).setDisplaySize(W, H).setScrollFactor(0).setDepth(D.BG - 3);
    this.skyB = this.add.image(0, 0, 'sky1').setOrigin(0).setDisplaySize(W, H).setScrollFactor(0).setDepth(D.BG - 2).setAlpha(0);
    this._buildLayerStrips('far', 0.25, D.BG);
    // 雾带：far 与 mid 之间垫一层可染色薄雾（0.25/0.55 之间取 0.38 视差 + 自漂移=风）
    this.haze = this.add.tileSprite(0, 236, W, 240, 'haze_band').setOrigin(0).setScrollFactor(0).setDepth(D.MID - 3);
    this._buildLayerStrips('mid', 0.55, D.MID);
    this.ground = this.add.tileSprite(0, 406, W, 150, 'ground_band').setOrigin(0).setScrollFactor(0).setDepth(D.GROUND);
    // 漂沙：屏幕空间粒子，逆行风（右行旅途迎面吹），tint/alpha 随段色板走
    this.dustMotes = [];
    for (let k = 0; k < 22; k++) {
      const spr = this.add.image(Math.random() * W, 0, 'dust_dot')
        .setScrollFactor(0).setDepth(D.MID - 2)
        .setScale(0.35 + Math.random() * 0.75).setBlendMode(Phaser.BlendModes.ADD);
      this.dustMotes.push({
        spr, vx: 26 + Math.random() * 46, baseY: 60 + Math.random() * 360,
        amp: 6 + Math.random() * 16, f: 0.0006 + Math.random() * 0.001,
        ph: Math.random() * Math.PI * 2, a0: 0.10 + Math.random() * 0.16,
      });
    }
    this.add.image(W / 2, H / 2, 'vign').setScrollFactor(0).setDepth(D.VIGN);
  },

  /* 前景植被簇（svg-ambient grass）：世界空间撒件 + scrollFactor>1 = 近景视差。
   * 不走 tileSprite/tilePositionX——每簇独立播摆动循环、相位错开，整条前景不同步摆。
   * 零 update 开销：视差由 scrollFactor 承担，摆动由 anims 承担。 */
  _buildForeground() {
    const D = Forge.C.DEPTH, FRAMES = 8;
    for (let s = 0; s < 5; s++)
      for (let v = 0; v < 2; v++) {
        if (!this.textures.exists(`amb_grass_s${s}v${v}_0`)) continue;
        if (!this.anims.exists(`fg_s${s}v${v}`))
          this.anims.create({
            key: `fg_s${s}v${v}`,
            frames: Array.from({ length: FRAMES }, (_, i) => ({ key: `amb_grass_s${s}v${v}_${i}` })),
            frameRate: 7, repeat: -1,
          });
      }
    // 两个前景亚层：与 mid 0.55 / 地面带 1.0 接成单调视差阶梯（1.18 → 1.5），
    // 破掉单平面"贴草玻璃板"感。深度线索四件套同向：近层大/实/低/快，远亚层小/淡/高/慢。
    // segPow/cap 防稀疏连乘爆炸（gapMul × SEG_GAP 平方级衰减曾把后期前景清了场）：
    // 近亚层只吃段稀疏的平方根（撑画面的层不许绝迹），cap 是单步跳距上限，
    // 保证最荒的段也大致每屏有草——荒芜感交给远亚层密度递减 + 段色，不靠清场。
    const LAYERS = [
      { para: 1.18, depth: D.FG,     sMin: 0.55, sMax: 0.95, yMin: 494, yMax: 516, alpha: 0.82, gapMul: 1,   segPow: 1,   cap: 900 },
      { para: 1.5,  depth: D.FG + 1, sMin: 1.1,  sMax: 1.6,  yMin: 526, yMax: 560, alpha: 1,    gapMul: 2.2, segPow: 0.5, cap: 1300 },
    ];
    // 每段丛间距倍率（密度即叙事：麦田茂密 → 战场残存 → 隘口/骨原贫瘠 → 龙巢焦土）
    const SEG_GAP = [1, 1.3, 1.9, 1.6, 2.1];
    let seed = 90719;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (const L of LAYERS) {
      // 屏幕坐标 = x - scrollX*para，scrollX ∈ [0, WORLD_W - W]
      // → x 需覆盖 [0, (WORLD_W - W)*para + W] 才能全程有前景
      const span = (Forge.WORLD.W - Forge.W) * L.para + Forge.W;
      let x = 30 + rnd() * 260;
      while (x < span) {
        // 该处居中于屏时的镜头世界中心 → 决定段色板与该段密度
        const worldCx = Math.max(0, (x - Forge.W * 0.5) / L.para + Forge.W * 0.5);
        const s = Forge.SEGMENTS[this._segAt(worldCx)].bg;
        const gap = L.gapMul * Math.pow(SEG_GAP[s], L.segPow);
        // 丛聚分布而非均匀噪声：1~3 株抱团成丛 + 长短空档 + 15% 秃斑
        // 秃斑本身已是长跳，不再乘段稀疏（乘了会跳出好几屏）
        if (rnd() < 0.15) { x += 420 + rnd() * 520; continue; }
        const n = 1 + Math.floor(rnd() * 3);
        let cx = x;
        for (let k = 0; k < n; k++) {
          const v = rnd() < 0.5 ? 0 : 1;
          if (this.anims.exists(`fg_s${s}v${v}`))
            this.add.sprite(cx, L.yMin + rnd() * (L.yMax - L.yMin), `amb_grass_s${s}v${v}_0`)
              .setOrigin(0.5, 1).setScrollFactor(L.para, 1).setDepth(L.depth)
              .setScale(L.sMin + rnd() * (L.sMax - L.sMin))
              .setFlipX(rnd() < 0.5).setAlpha(L.alpha)
              .play({ key: `fg_s${s}v${v}`, startFrame: Math.floor(rnd() * FRAMES),
                      frameRate: 6 + rnd() * 3 });   // 每株摆速不同，不齐刷刷
          cx += 34 + rnd() * 70;
        }
        x = cx + Math.min(L.cap, (240 + rnd() * 430) * gap);
      }
    }
  },

  _updateParallax() {
    const cam = this.cameras.main.scrollX, tn = this.time.now;
    // far/mid 条带世界锚定，视差由 scrollFactor 承担，此处无事可做。
    // 系数直接乘 scrollX（不取反，蓝图 §9 已知坑）
    this.haze.tilePositionX = cam * 0.38 + tn * 0.006;   // 视差 + 恒定风漂
    this.ground.tilePositionX = cam;

    // 段间过渡带（按镜头中心的世界 x 取段）：只剩天空 crossfade（不透明层，等价颜色 lerp）
    // 与雾带/漂沙的 tint 连续插值——剪影层的换景已由条带滑动天然完成
    const cx = cam + Forge.W * 0.5;
    const s = this._segAt(cx), seg = Forge.SEGMENTS[s];
    const BAND = 500;
    let t = 0;
    if (s < Forge.SEGMENTS.length - 1)
      t = Phaser.Math.Clamp((cx - (seg.x1 - BAND)) / BAND, 0, 1);
    const sm = t * t * (3 - 2 * t);
    const a = seg.bg, b = Math.min(a + 1, Forge.SEGMENTS.length - 1);
    const setSky = (img, key) => {
      if (img.texture.key !== key) { img.setTexture(key); img.setDisplaySize(Forge.W, Forge.H); }
    };
    setSky(this.skyA, `sky${a}`); setSky(this.skyB, `sky${b}`);
    this.skyB.setAlpha(sm);

    // 雾带与漂沙的段色板连续 lerp（不 crossfade，直接染色）
    const AT = Forge.ATMOS, ca = AT[a], cb = AT[b];
    this.haze.setTint(this._lerpTint(ca.haze, cb.haze, sm));
    this.haze.setAlpha(ca.hazeA + (cb.hazeA - ca.hazeA) * sm);
    const dc = this._lerpTint(ca.dust, cb.dust, sm);
    const da = ca.dustA + (cb.dustA - ca.dustA) * sm;
    const dt = this.game.loop.delta / 1000;
    for (const m of this.dustMotes) {
      m.spr.x -= m.vx * dt;
      if (m.spr.x < -24) { m.spr.x = Forge.W + 24; m.baseY = 60 + Math.random() * 360; }
      m.spr.y = m.baseY + Math.sin(tn * m.f + m.ph) * m.amp;
      m.spr.setTint(dc); m.spr.setAlpha(m.a0 * da);
    }
  },
});
