/* WyrmsEnd — 背景视差长卷（蓝图 §3）：tileSprite 屏幕空间平铺 + tilePositionX 驱动。
 * 真图（agy 生成，assets/bg/segN_{far,mid}.png）缺失时用程序化降级层——
 * 周期函数构造地平线（整数波数 → 天然无缝平铺），真图到位后键名一致自动替换。
 * 段间过渡带：farB/midB 双层 crossfade + 夜幕遮罩压暗（"走出来的换景"，不做原地渐变）。 */
Object.assign(JourneyScene.prototype, {

  _segAt(x) {
    const S = Forge.SEGMENTS;
    for (let i = 0; i < S.length; i++) if (x < S[i].x1) return i;
    return S.length - 1;
  },

  _bgEnsureTextures() {
    for (let i = 0; i < 5; i++) {
      if (!this.textures.exists(`bg${i}_far`)) this._makeFarFallback(i);
      if (!this.textures.exists(`bg${i}_mid`)) this._makeMidFallback(i);
    }
    if (!this.textures.exists('ground_band')) this._makeGroundBand();
  },

  // 周期地脊线：整数波数正弦叠加 → x=0 与 x=W 处值相同，平铺无缝
  _ridgeY(x, W, base, waves, ph) {
    let y = base;
    for (let i = 0; i < waves.length; i++)
      y += waves[i][1] * Math.sin((x / W) * Math.PI * 2 * waves[i][0] + ph + i * 1.7);
    return y;
  },

  _makeFarFallback(i) {
    const W = Forge.W, H = Forge.H, cfg = Forge.BG_FALLBACK[i];
    const cv = this.textures.createCanvas(`bg${i}_far`, W, H), ctx = cv.getContext();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, cfg.sky[0]); g.addColorStop(0.55, cfg.sky[1]); g.addColorStop(1, cfg.sky[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // 两层远山剪影（周期构造）
    const layer = (color, base, waves, ph) => {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 8) ctx.lineTo(x, this._ridgeY(x, W, base, waves, ph));
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    };
    layer(cfg.hill, 320, [[2, 30], [5, 14]], i * 2.3);
    layer(cfg.hill2, 392, [[3, 22], [7, 9]], i * 4.1);
    if (i === 4) {   // 龙巢：顶部钟乳石倒脊 + 底部熔金辉光
      ctx.fillStyle = cfg.hill2;
      ctx.beginPath(); ctx.moveTo(0, 0);
      for (let x = 0; x <= W; x += 8)
        ctx.lineTo(x, 110 - this._ridgeY(x, W, 0, [[4, 42], [9, 18]], 1.2));
      ctx.lineTo(W, 0); ctx.closePath(); ctx.fill();
      const gg = ctx.createLinearGradient(0, H * 0.6, 0, H);
      gg.addColorStop(0, 'rgba(216,160,58,0)'); gg.addColorStop(1, 'rgba(216,160,58,0.22)');
      ctx.fillStyle = gg; ctx.fillRect(0, H * 0.6, W, H * 0.4);
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

  _buildParallax() {
    const D = Forge.C.DEPTH, W = Forge.W, H = Forge.H;
    this.farA = this.add.tileSprite(0, 0, W, H, 'bg0_far').setOrigin(0).setScrollFactor(0).setDepth(D.BG);
    this.farB = this.add.tileSprite(0, 0, W, H, 'bg1_far').setOrigin(0).setScrollFactor(0).setDepth(D.BG + 1).setAlpha(0);
    this.midA = this.add.tileSprite(0, 0, W, H, 'bg0_mid').setOrigin(0).setScrollFactor(0).setDepth(D.MID);
    this.midB = this.add.tileSprite(0, 0, W, H, 'bg1_mid').setOrigin(0).setScrollFactor(0).setDepth(D.MID + 1).setAlpha(0);
    this.ground = this.add.tileSprite(0, 406, W, 150, 'ground_band').setOrigin(0).setScrollFactor(0).setDepth(D.GROUND);
    this.add.image(W / 2, H / 2, 'vign').setScrollFactor(0).setDepth(D.VIGN);
    // 过渡带夜幕遮罩：压暗 + 低对比掩盖两侧背景各自淡出/淡入
    this.fogRect = this.add.rectangle(W / 2, H / 2, W, H, 0x030304, 1)
      .setAlpha(0).setScrollFactor(0).setDepth(D.FOG);
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
    const LAYERS = [
      { para: 1.18, depth: D.FG,     sMin: 0.55, sMax: 0.95, yMin: 494, yMax: 516, alpha: 0.82, gapMul: 1 },
      { para: 1.5,  depth: D.FG + 1, sMin: 1.1,  sMax: 1.6,  yMin: 526, yMax: 560, alpha: 1,    gapMul: 2.2 },
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
        const gap = L.gapMul * SEG_GAP[s];
        // 丛聚分布而非均匀噪声：1~3 株抱团成丛 + 长短空档 + 15% 秃斑
        if (rnd() < 0.15) { x += (420 + rnd() * 520) * gap; continue; }
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
        x = cx + (240 + rnd() * 430) * gap;
      }
    }
  },

  _updateParallax() {
    const cam = this.cameras.main.scrollX;
    // 系数直接乘 scrollX（不取反，蓝图 §9 已知坑）
    this.farA.tilePositionX = cam * 0.25; this.farB.tilePositionX = cam * 0.25;
    this.midA.tilePositionX = cam * 0.55; this.midB.tilePositionX = cam * 0.55;
    this.ground.tilePositionX = cam;

    // 段间过渡带 crossfade（按镜头中心的世界 x 取段）
    const cx = cam + Forge.W * 0.5;
    const s = this._segAt(cx), seg = Forge.SEGMENTS[s];
    const BAND = 500;
    let t = 0;
    if (s < Forge.SEGMENTS.length - 1)
      t = Phaser.Math.Clamp((cx - (seg.x1 - BAND)) / BAND, 0, 1);
    const sm = t * t * (3 - 2 * t);
    const a = seg.bg, b = Math.min(a + 1, Forge.SEGMENTS.length - 1);
    const setTex = (ts, key) => { if (ts.texture.key !== key) ts.setTexture(key); };
    setTex(this.farA, `bg${a}_far`); setTex(this.farB, `bg${b}_far`);
    setTex(this.midA, `bg${a}_mid`); setTex(this.midB, `bg${b}_mid`);
    this.farB.setAlpha(sm); this.midB.setAlpha(sm);
    this.fogRect.setAlpha(Math.sin(Math.PI * sm) * 0.22);
  },
});
