/* 玩法本体：戳 → 反应 → 情绪升级。
 * 没有关卡、没有失败、没有通关（toy/sandbox，见 DESIGN §0）。
 */
window.PM = window.PM || {};

PM.StageScene = class StageScene extends Phaser.Scene {
  constructor() { super('Stage'); }

  create() {
    const C = PM.Config;
    this.state = PM.Mood.create();
    PM.React.reset();
    this.lockUntil = 0;
    this.lockHard = false;      // tier3/哭：不可打断
    this.showRegions = false;
    this._lastMood = 'NEUTRAL';

    this._buildBackdrop();
    this._buildCircle();
    this._buildCharacter();
    this._buildBubble();
    this._buildDebug();
    this._buildInput();

    this.playAnim('idle');
    this._setMoodVisual('NEUTRAL', true);

    if (window.GameHUD) {
      window.GameHUD.setObjective('戳戳看她会有什么反应');
      window.GameHUD.setScore(0);
    }

    // 供 poke-bot / verify 读写（注意：**不暴露 player 键** —— game-verify 一旦看到
    // __gameState.player 就会断言"按方向键后坐标要变"，本游戏角色不移动，必然误判失败）
    window.__gameState = { scene: this, sprite: this.char };
    window.__scene = this;
  }

  /* ── 画面 ──────────────────────────────────────────────── */

  /* 背景：魔女工房·塔内，三层实拍式静态图 + 全代码气氛层。
   *
   * 层序（depth）：
   *   far -100 → 光柱 -70 → mid -60 → 后景光尘 -30 → 柔光 -20 → 角色 5
   *   → 地面雾带 6 → 法阵近弧 7 → 前景光尘 15 → fore 18 → 暗角 19 → 气泡 20
   *
   * 定标规则与实测值见 config.js 的 PM.Config.BG 注释：三层都 origin(0.5,0)
   * 贴顶居中、各自按地面线定标、超出画布的部分自然裁掉。缺图就跳过该层。 */
  _buildBackdrop() {
    const C = PM.Config;
    // 兜底底色：三层图全缺时也不至于是一片透明（也当 far 的天花板暗部延伸）
    const g = this.add.graphics().setDepth(-200);
    g.fillGradientStyle(0x1b2334, 0x1b2334, 0x0d1119, 0x0d1119, 1);
    g.fillRect(0, 0, C.WIDTH, C.HEIGHT);

    this.bgLayers = [];
    for (const L of C.BG.LAYERS) {
      if (!this.textures.exists(L.key)) continue;    // 缺图不 404 也不崩，只是少一层
      if (L.splitY) this._addSplitLayer(L);
      else this._addLayer(L, 0, null, L.depth);
    }

    this._buildShaft();
    this._buildHalo();
    this._buildShadow();
    this._buildMist();
    this._buildDust();
    this._buildVignette();
  }

  /* 建一张背景层。dy 是【源图像素】单位的纵向位移（好和实测值直接对得上，
   * 不用每次心算乘 scale）；crop 给 setCrop 用，null = 整张。 */
  _addLayer(L, dy, crop, depth) {
    const C = PM.Config;
    const y0 = dy * L.scale;
    const img = this.add.image(C.WIDTH / 2, y0, L.key)
      .setOrigin(0.5, 0)
      .setDepth(depth);
    img.setScale(L.scaleX ?? L.scale, L.scale);
    if (crop) img.setCrop(crop.x, crop.y, crop.w, crop.h);
    this.bgLayers.push({ img, par: L.par, x0: C.WIDTH / 2, y0 });
    return img;
  }

  /* 拆层：同一张贴图裁成「地板」和「家具」两个 Image，家具下沉 bodyDy 坐到地板上。
   * 见 config.js 里 bg_mid 的注释 —— AI 把家具画得离它自己那条地板 35px，
   * 抠透明后远景从缝里透出来就成了悬空。setCrop 是原位渲染，
   * 两张不做位移时叠回去和原图逐像素一致，所以这层拆分对其他定标零影响。 */
  _addSplitLayer(L) {
    const B = PM.Config.BG;
    // 地板：splitY 往下整条，画在家具后一档，接缝由家具压住
    this._addLayer(L, 0, { x: 0, y: L.splitY, w: B.SRC_W, h: B.SRC_H - L.splitY }, L.depth - 1);
    // 家具：splitY 往上整条，整体下沉
    this._addLayer(L, L.bodyDy, { x: 0, y: 0, w: B.SRC_W, h: L.splitY }, L.depth);
  }

  /* 玫瑰窗光柱：far 图上那扇窗是画死的，光柱做成会呼吸的活物才有"塔里有空气"的感觉。
   * 用梯形渐变贴图而不是 Graphics 多边形 —— 多边形没有软边，会看成一块实心色片。 */
  _buildShaft() {
    const A = PM.Config.ATMOS;
    if (!this.textures.exists('pm-shaft')) {
      const w = 256, h = 512;
      const cv = this.textures.createCanvas('pm-shaft', w, h);
      const ctx = cv.getContext();
      const gr = ctx.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(255,255,255,0.95)');
      gr.addColorStop(0.55, 'rgba(255,255,255,0.38)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr;
      // 梯形：上窄下宽，模拟从窗口散开的光锥；左右各留软边靠 blur 做不到，改用两侧渐隐
      ctx.beginPath();
      ctx.moveTo(w * 0.34, 0); ctx.lineTo(w * 0.66, 0);
      ctx.lineTo(w, h); ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();
      // 两侧渐隐：横向再叠一层 destination-in 的渐变，把硬的斜边吃掉
      const side = ctx.createLinearGradient(0, 0, w, 0);
      side.addColorStop(0, 'rgba(0,0,0,0)');
      side.addColorStop(0.5, 'rgba(0,0,0,1)');
      side.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalCompositeOperation = 'destination-in';
      ctx.fillStyle = side;
      ctx.fillRect(0, 0, w, h);
      cv.refresh();
    }
    this.shaft = this.add.image(A.SHAFT_X, A.SHAFT_Y, 'pm-shaft')
      .setOrigin(0.5, 0)
      .setDisplaySize(A.SHAFT_W, A.SHAFT_H)
      .setTint(A.SHAFT_COLOR)
      .setAlpha(A.SHAFT_ALPHA)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(-70);
    this.tweens.add({
      targets: this.shaft,
      alpha: A.SHAFT_ALPHA + A.SHAFT_BREATH,
      duration: A.SHAFT_MS, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  // 角色背后的一团柔光，让她不至于糊进背景。
  // 用径向渐变贴图而不是 ellipse —— 实心椭圆边缘是硬的，在深色背景上会看成一块蓝色圆盘。
  _buildHalo() {
    const C = PM.Config;
    if (!this.textures.exists('pm-halo')) {
      const size = 512;
      const cv = this.textures.createCanvas('pm-halo', size, size);
      const ctx = cv.getContext();
      const gr = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      gr.addColorStop(0, 'rgba(255,255,255,0.85)');
      gr.addColorStop(0.45, 'rgba(255,255,255,0.30)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, size, size);
      cv.refresh();
    }
    this.halo = this.add.image(C.CHAR_X, 430, 'pm-halo')
      .setDisplaySize(620, 700)
      .setTint(0x33507a)
      .setAlpha(0.42)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(-20);
  }

  /* 接地阴影：背景换成有地板的实景之后，光有法阵还是"浮着"——
   * 一团压在靴底的软阴影是把角色钉在地面上最便宜的一招（depth 4，在角色之后、mid 之前）。
   * 复用 pm-halo 那张径向渐变，染黑即可，不必再建一张贴图。 */
  _buildShadow() {
    const C = PM.Config, A = C.ATMOS;
    this.shadow = this.add.image(C.CHAR_X, C.BG.FOOT_Y - 4, 'pm-halo')
      .setDisplaySize(A.SHADOW_W, A.SHADOW_H)
      .setTint(0x000000)
      .setAlpha(A.SHADOW_A)
      .setDepth(4);
  }

  /* 地面雾带（DESIGN §4.5 ① 的补完）：六条视频各自烘死的法阵样式/颜色对不齐，
   * 前景层解决不了 —— 素材法阵(y≈645~735)和靴子占的是同一块，前景盖到能遮住它的
   * 高度就会把靴子和 feet_tap / boot_show / leg_kick 三段动画一起遮掉，
   * 而腿还是可触区，就成了「看得见摸得着但被挡住」的错位。
   * 所以改用半透明雾带把那一块【洗淡】：色差被压成同一个色温，靴子仍然看得清。
   * 雾带跟着情绪染色，和法阵、气泡描边共用一套颜色语言。 */
  _buildMist() {
    const C = PM.Config, A = C.ATMOS;
    if (!this.textures.exists('pm-mist')) {
      const w = 8, h = 128;
      const cv = this.textures.createCanvas('pm-mist', w, h);
      const ctx = cv.getContext();
      const gr = ctx.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(255,255,255,0)');      // 顶边必须软，硬边会看成一条横杠
      gr.addColorStop(0.45, 'rgba(255,255,255,0.85)');
      gr.addColorStop(1, 'rgba(255,255,255,1)');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, w, h);
      cv.refresh();
    }
    this.mist = this.add.image(C.WIDTH / 2, A.MIST_Y, 'pm-mist')
      .setOrigin(0.5, 0)
      .setDisplaySize(C.WIDTH, A.MIST_H)
      .setAlpha(A.MIST_ALPHA)
      .setDepth(6);
  }

  /* 光尘：后景一批慢而多（在光柱里飘），前景一批快而少（贴着镜头）。
   * 不用粒子系统 —— 这点量自己推更好控，也省得为 12 个点建发射器。 */
  _buildDust() {
    const C = PM.Config, A = C.ATMOS;
    if (!this.textures.exists('pm-dot')) {
      const s = 16;
      const cv = this.textures.createCanvas('pm-dot', s, s);
      const ctx = cv.getContext();
      const gr = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, s, s);
      cv.refresh();
    }
    const make = (n, depth, cfg) => {
      const arr = [];
      for (let i = 0; i < n; i++) {
        const img = this.add.image(Phaser.Math.Between(0, C.WIDTH),
                                   Phaser.Math.Between(0, C.HEIGHT), 'pm-dot')
          .setDepth(depth)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setTint(cfg.tint);
        arr.push({
          img,
          r: Phaser.Math.FloatBetween(cfg.r[0], cfg.r[1]),
          vy: Phaser.Math.FloatBetween(cfg.vy[0], cfg.vy[1]),
          sway: Phaser.Math.FloatBetween(6, 22),
          phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
          a: Phaser.Math.FloatBetween(cfg.a[0], cfg.a[1]),
          bx: 0,
        });
        img.setDisplaySize(arr[i].r * 2, arr[i].r * 2).setAlpha(arr[i].a);
        arr[i].bx = img.x;
      }
      return arr;
    };
    this.dustBack = make(A.DUST_BACK, -30,
      { tint: 0xbfe9e0, r: [1.4, 3.6], vy: [-9, -3], a: [0.15, 0.45] });
    this.dustFront = make(A.DUST_FRONT, 15,
      { tint: 0xffe6b8, r: [2.2, 5.0], vy: [-22, -10], a: [0.10, 0.26] });
  }

  // 暗角：三层图各自的边缘亮度不一致，压一圈暗角能把它们缝成一个空间
  _buildVignette() {
    const C = PM.Config, A = C.ATMOS;
    if (!this.textures.exists('pm-vig')) {
      const w = 256, h = 205;
      const cv = this.textures.createCanvas('pm-vig', w, h);
      const ctx = cv.getContext();
      const gr = ctx.createRadialGradient(w / 2, h / 2, h * 0.28, w / 2, h / 2, h * 0.78);
      gr.addColorStop(0, 'rgba(0,0,0,0)');
      gr.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, w, h);
      cv.refresh();
    }
    this.add.image(C.WIDTH / 2, C.HEIGHT / 2, 'pm-vig')
      .setDisplaySize(C.WIDTH * 1.06, C.HEIGHT * 1.06)
      .setAlpha(A.VIGNETTE)
      .setDepth(19);
  }

  /* 指针视差：没有相机可跟，就让鼠标当"观众的头"。三层 + 光柱按 par 系数反向偏移，
   * 静止角色也能拿到空间感。幅度必须小 —— 大了会露出层的边缘裁切。 */
  _updateParallax(delta) {
    const C = PM.Config, A = C.ATMOS;
    if (!this.bgLayers || !A.PARALLAX_MAX) return;
    const p = this.input.activePointer;
    const tx = ((p?.x ?? C.WIDTH / 2) / C.WIDTH - 0.5) * 2;    // -1 .. 1
    const ty = ((p?.y ?? C.HEIGHT / 2) / C.HEIGHT - 0.5) * 2;
    // 平滑跟随，免得鼠标一抖整个场景跟着抖
    const k = Math.min(1, delta / 220);
    this._paX = (this._paX ?? 0) + (tx - (this._paX ?? 0)) * k;
    this._paY = (this._paY ?? 0) + (ty - (this._paY ?? 0)) * k;

    for (const L of this.bgLayers) {
      const m = L.par * A.PARALLAX_MAX;
      L.img.x = L.x0 - this._paX * m;
      L.img.y = L.y0 - this._paY * m * 0.38;   // 纵向压扁：竖幅画布里上下窜很容易露边
    }
    if (this.shaft) this.shaft.x = A.SHAFT_X - this._paX * 8;
  }

  _updateDust(delta) {
    const C = PM.Config;
    const dt = delta / 1000;
    for (const arr of [this.dustBack, this.dustFront]) {
      if (!arr) continue;
      for (const d of arr) {
        d.phase += dt * 0.9;
        d.img.y += d.vy * dt;
        d.img.x = d.bx + Math.sin(d.phase) * d.sway;
        if (d.img.y < -8) {                       // 飘出上边界就从下面回来
          d.img.y = C.HEIGHT + 8;
          d.bx = Phaser.Math.Between(0, C.WIDTH);
        }
      }
    }
  }

  /* 程序化法阵覆盖层（DESIGN §4.5 ①）：
   * 素材里各段自带的法阵样式/颜色本来就不一致（六条视频分六次生成），
   * 与其修，不如在脚下盖一层统一的、跟着情绪变色的法阵，顺手变成情绪指示器。
   * 必须比素材自带的亮，否则底下的会透出来 —— 所以用 ADD 混合 + 高不透明度。 */
  _buildCircle() {
    // 画两遍：远弧在角色【身后】(depth 1)，近弧在角色【身前】(depth 7)。
    //
    // 为什么不能只画一层：DESIGN §4.5 要求覆盖层"亮度压过素材自带的法阵"，
    // 但素材那圈法阵是烘死在角色贴图里的不透明像素 —— 只要覆盖层在角色之后，
    // 重叠处永远是素材赢，写多亮都没用（首版就是 setDepth(1)，等于没盖住）。
    // 而整圈都放到角色之前又不对：地面圆环的近侧本来就该压住脚、远侧该被脚挡住，
    // 全画在前面会有线条横穿靴子和小腿，一眼假。
    // 所以按屏幕 y 切一刀：远弧（上半）在后，近弧（下半，落在脚底之下）在前。
    this.circle = this.add.graphics().setDepth(1)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.circleNear = this.add.graphics().setDepth(7)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.circleAngle = 0;
    this.circleColor = PM.Config.MOOD_COLOR.NEUTRAL;
    this.circlePulse = 0;
  }

  _drawCircle() {
    const C = PM.Config;
    const cx = C.CHAR_X, cy = 688;
    const rx = 168 + this.circlePulse * 26, ry = 44 + this.circlePulse * 8;
    const col = this.circleColor;

    this.circle.clear();
    this.circleNear.clear();

    // 屏幕坐标 y 向下：角度 0..π 是椭圆的近侧（下半），画到前景那张；其余画到背景那张。
    const isNear = (a) => Math.sin(a) > 0;
    const arc = (rMul, width, alpha) => {
      const SEG = 48;
      for (const [g, want] of [[this.circle, false], [this.circleNear, true]]) {
        g.lineStyle(width, col, alpha);
        let started = false;
        for (let i = 0; i <= SEG; i++) {
          const a = (i / SEG) * Math.PI * 2;
          if (isNear(a) !== want) { started = false; continue; }
          const x = cx + Math.cos(a) * rx * rMul, y = cy + Math.sin(a) * ry * rMul;
          if (!started) { g.beginPath(); g.moveTo(x, y); started = true; }
          else g.lineTo(x, y);
          if (i === SEG || isNear((i + 1) / SEG * Math.PI * 2) !== want) g.strokePath();
        }
      }
    };
    arc(1.0, 2.5, 0.9);
    arc(0.78, 1.5, 0.55);
    arc(0.36, 1.5, 0.55);

    // 符文刻度：随情绪旋转，生气时转得快
    for (let i = 0; i < 12; i++) {
      const a = this.circleAngle + (i * Math.PI) / 6;
      const g = isNear(a) ? this.circleNear : this.circle;
      g.lineStyle(2, col, 0.75);
      g.lineBetween(cx + Math.cos(a) * rx * 0.78, cy + Math.sin(a) * ry * 0.78,
                    cx + Math.cos(a) * rx * 0.98, cy + Math.sin(a) * ry * 0.98);
    }
    // 内层反向小三角（整个画在身后：它横跨圆心，切成两半反而更乱）
    this.circle.lineStyle(1.5, col, 0.5);
    for (let i = 0; i < 3; i++) {
      const a = -this.circleAngle * 1.6 + (i * Math.PI * 2) / 3;
      const b = a + (Math.PI * 2) / 3;
      this.circle.lineBetween(cx + Math.cos(a) * rx * 0.55, cy + Math.sin(a) * ry * 0.55,
                              cx + Math.cos(b) * rx * 0.55, cy + Math.sin(b) * ry * 0.55);
    }
  }

  _buildCharacter() {
    const C = PM.Config;
    this.char = this.add.sprite(C.CHAR_X, C.CHAR_Y, 'idle', 0)
      .setOrigin(0.5, 0)
      .setDepth(5);
    this.char.on('animationcomplete', a => {
      if (PM.Config.ANIMS[a.key]?.mode === 'once') this._releaseLock();
    });
  }

  _buildBubble() {
    const C = PM.Config;
    /* 换行宽度不能写死：气泡贴在角色侧面，可用的横向空间只有 CHAR_X-118-8（留白），
     * 窄画布上写死 250 会让气泡压到角色身上。再减 26 是左右内边距。
     * advancedWordWrap 必须开 —— 默认的 wordWrap 只按空格断词，中文台词整句是"一个词"，
     * 根本不换行，宽度会一路涨到把气泡挤翻到左边（就是斗篷旁那条长台词露的馅）。 */
    this._bubbleWrap = Math.min(250, Math.round(C.CHAR_X - 118 - 8 - 26));
    this.bubble = this.add.container(C.CHAR_X + 150, 130).setDepth(20).setAlpha(0);
    this.bubbleBg = this.add.graphics();
    this.bubbleText = this.add.text(0, 0, '', {
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
      fontSize: '17px', color: '#12181f', lineSpacing: 5,
      wordWrap: { width: this._bubbleWrap, useAdvancedWrap: true },
    }).setOrigin(0, 0);
    this.bubble.add([this.bubbleBg, this.bubbleText]);
  }

  _buildDebug() {
    this.debugG = this.add.graphics().setDepth(30).setVisible(false);

    // 触屏设备不画键盘提示：手机上没键盘，这三个键一个也按不了，
    // 印在画面左下角只是白占地方（独立站的实机截图里很扎眼）。
    // 判据用 pointer:coarse 而不是屏幕宽度 —— 关键在有没有键盘，不在屏幕多大；
    // 带触屏的笔记本仍是 fine，照常显示。
    if (PM.isTouchOnly()) { this.hintText = null; return; }

    // 描边不是装饰：底边现在压着前景石板条和暗角，原来那个 #4c5a72 无描边的灰
    // 直接糊进石头里读不出来了（换背景前是纯深色底，怎么写都清楚）。
    this.hintText = this.add.text(14, PM.Config.HEIGHT - 26,
      'G 显示触碰区 · M 静音 · R 重来', {
        fontFamily: 'Consolas, monospace', fontSize: '12px', color: '#93a6c4',
      }).setStroke('#0a0d14', 4).setDepth(30);
  }

  /* 「这一点是不是在角色身上」——查 base.png 的 alpha。
   * 采样一小圈而不是单点，免得被 1px 的透明缝隙误判成"点空了"（判定宁松勿紧）。 */
  _makeBodyTest() {
    const C = PM.Config;
    const tex = this.textures.exists('base') ? 'base' : null;
    if (!tex) return null;                    // 没有基准帧就退回"不设闸门"
    const OFF = [[0, 0], [-9, 0], [9, 0], [0, -9], [0, 9], [-7, -7], [7, 7]];

    return (fx, fy) => {
      const px = fx * C.FRAME_W, py = fy * C.FRAME_H;
      for (const [dx, dy] of OFF) {
        const x = Math.round(px + dx), y = Math.round(py + dy);
        if (x < 0 || y < 0 || x >= C.FRAME_W || y >= C.FRAME_H) continue;
        if (this.textures.getPixelAlpha(x, y, tex) > 24) return true;
      }
      return false;
    };
  }

  _buildInput() {
    this._isBody = this._makeBodyTest();

    this.input.on('pointerdown', p => {
      this._down = { t: this.time.now, x: p.x, y: p.y };
      this._travel = 0;
      this._prev = { x: p.x, y: p.y };
    });
    this.input.on('pointermove', p => {
      if (!this._down) return;
      this._travel += Math.hypot(p.x - this._prev.x, p.y - this._prev.y);
      this._prev = { x: p.x, y: p.y };
    });
    this.input.on('pointerup', p => {
      if (!this._down) return;
      const up = { t: this.time.now, x: p.x, y: p.y };
      const gesture = PM.Touch.classify(this._down, up, this._travel);
      // rub 用抬起点判区域最自然（手停在哪就是摸哪）
      const { fx, fy } = PM.Touch.toFrame(up.x, up.y);
      const region = PM.Touch.hitRegion(fx, fy, this._isBody);
      this._down = null;
      if (region) this.poke(region, gesture);
    });

    this.input.keyboard.on('keydown-G', () => {
      this.showRegions = !this.showRegions;
      this.debugG.setVisible(this.showRegions);
      this._drawDebug();
    });
    this.input.keyboard.on('keydown-M', () => {
      if (window.GameAudio && window.GameAudio.toggle()) this._stopVoice();   // 静音要立刻掐掉正在说的那句
    });
    this.input.keyboard.on('keydown-R', () => this.scene.restart());

    /* Phaser 失焦自动暂停（disableVisibilityChange:false），但 HTMLAudio 不归它管：
     * 不接这一段的话，切走标签页画面冻住、她还在自顾自说话。 */
    this._onVis = () => {
      const a = this._currentVoice;
      if (document.hidden) {
        // 只记"是我暂停的、且还没说完的"那句；已播完的元素再 play() 会从头重放一整条
        this._voiceHeld = !!a && !a.paused && !a.ended;
        if (this._voiceHeld) { try { a.pause(); } catch (e) {} }
      } else if (this._voiceHeld && a) {
        this._voiceHeld = false;
        const p = a.play(); if (p && p.catch) p.catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', this._onVis);
    // R 重来会重跑 create()，监听器必须摘掉，否则每重来一次就多挂一个
    this.events.once('shutdown', () => {
      document.removeEventListener('visibilitychange', this._onVis);
      this._stopVoice();
    });
  }

  /* ── 玩法 ──────────────────────────────────────────────── */

  poke(region, gesture = 'tap') {
    const now = this.time.now;
    // 重反应/哭泣期间不播新反应，但热度照常累加（戳了不是没代价）
    const locked = this.lockHard && now < this.lockUntil;

    const ev = PM.Mood.poke(this.state, region, gesture, now);

    if (ev.punish) {
      // 惩罚是整局的高潮，**允许打断任何锁**。
      // （曾经写成"锁期间直接 return"，导致惩罚判定在锁里被丢掉，
      //   玩家永远看不到泼水、直接跳去哭 —— poke-bot 第 3 项就是抓这个的。）
      this._punish();
    } else if (locked) {
      this._nudge();
      this._syncHud();
      return ev;
    } else {
      const pick = PM.React.pick(region, ev.tier, PM.loaded);
      if (pick) {
        this.playAnim(pick.anim, ev.tier >= 3);
        if (pick.line) this.say(pick.line, pick.voice);
      }
      // 情绪本身也要有画面：升级时优先播情绪动画（若该 tier 没有专属反应）
      // 动画被顶掉了，台词/配音也要跟着换成同一条，否则画面在笑、气泡和语音还是刚才那句
      if (ev.moodChanged && ev.mood === 'HAPPY' && PM.loaded.has(PM.HAPPY_REACT.anim)) {
        this.playAnim(PM.HAPPY_REACT.anim, false);
        this.say(PM.HAPPY_REACT.line, PM.HAPPY_REACT.voice);
      }
    }

    this._setMoodVisual(this.state.mood);
    this._feedback(ev);
    this._syncHud();
    return ev;
  }

  _punish() {
    const p = PM.PUNISH;
    if (PM.loaded.has(p.anim)) this.playAnim(p.anim, true);
    this.say(p.line, p.voice);
    if (window.GameAudio) window.GameAudio.play('morph');
    // 前摇播到一半时把水泼出来（素材只有蓄力，释放由渲染层做）
    this.time.delayedCall(520, () => this._waterBurst());
  }

  _dropTexture() {
    if (this.textures.exists('pm-drop')) return;
    // 软边圆点。硬边圆放大后是一坨白球，看着像棉花不像水
    const size = 64;
    const cv = this.textures.createCanvas('pm-drop', size, size);
    const ctx = cv.getContext();
    const gr = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, size, size);
    cv.refresh();
  }

  /* 朝屏幕泼水（DESIGN §4.5 ②）：素材里的喷射方向三条视频都不对，索性用粒子做，方向可控。
   *
   * "冲着你来"分两层给：
   *   ① 从杖头炸开的小水滴 —— 又小又快、边扩边淡，是"水花"
   *   ② 溅在镜头上的水渍   —— 定在屏幕上不动、慢慢滑落淡出，是"泼到了你脸上"
   * 第二层才是真正卖掉方向感的东西；只有第一层的话，看起来只是她身上冒了团雾。 */
  _waterBurst() {
    const C = PM.Config;
    this._dropTexture();
    const ox = C.CHAR_X - 120, oy = 300;      // 杖头水球的大致位置

    // ① 水花
    const em = this.add.particles(ox, oy, 'pm-drop', {
      speed: { min: 340, max: 900 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.14, end: 0.62 },
      alpha: { start: 0.9, end: 0 },
      lifespan: { min: 380, max: 700 },
      quantity: 5,
      frequency: 16,
      tint: [0xbfe6ff, 0x6fb4f2, 0x8fd0ff],
      blendMode: Phaser.BlendModes.ADD,
    }).setDepth(40);
    this.time.delayedCall(330, () => em.stop());
    this.time.delayedCall(1400, () => em.destroy());

    // ② 镜头水渍
    this.time.delayedCall(160, () => {
      for (let i = 0; i < 16; i++) {
        const d = this.add.image(
          Phaser.Math.Between(60, C.WIDTH - 60),
          Phaser.Math.Between(60, C.HEIGHT - 120), 'pm-drop')
          .setDepth(42)
          .setTint(0xdff1ff)
          .setAlpha(0)
          .setScale(Phaser.Math.FloatBetween(0.5, 1.9))
          .setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: d, alpha: { from: 0, to: Phaser.Math.FloatBetween(0.35, 0.75) },
          duration: 90, delay: i * 14,
          onComplete: () => this.tweens.add({
            targets: d, alpha: 0, y: d.y + Phaser.Math.Between(14, 46),
            duration: Phaser.Math.Between(700, 1500),
            onComplete: () => d.destroy(),
          }),
        });
      }
    });

    const flash = this.add.rectangle(C.WIDTH / 2, C.HEIGHT / 2, C.WIDTH, C.HEIGHT, 0x7fc4ff, 0.38)
      .setDepth(41).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: flash, alpha: 0, duration: 620, onComplete: () => flash.destroy() });

    if (!this._reducedMotion()) this.cameras.main.shake(300, 0.009);
    if (window.GameAudio) window.GameAudio.play('splashBad');
  }

  playAnim(key, hard = false) {
    if (!PM.loaded.has(key)) key = 'idle';
    const cfg = PM.Config.ANIMS[key];
    this.char.play(key, true);

    if (cfg.mode === 'once') {
      // 锁 = 动画时长 + 冗余。带超时兜底：animationcomplete 万一丢了也能自动解锁，
      // 否则角色会永远卡在某个反应里（ShadowForge 踩过的同源坑）
      const dur = (cfg.frames / cfg.fps) * 1000;
      this.lockUntil = this.time.now + dur + PM.Config.LOCK_GRACE_MS;
      this.lockHard = hard;
    } else {
      this.lockUntil = 0;
      this.lockHard = false;
    }
  }

  /* 一段反应播完之后去哪：情绪还在维持期内就**接着播情绪动画**，否则回 idle。
   * 这条很关键 —— 惩罚播的是 water_threat（举水球），mood 却已经是 CRY；
   * 没有这一步，`cry` 这段素材永远不会出现在游戏里，人被惹哭了却看不到哭。
   * 情绪动画是 once，播完再回到这里，于是在维持期内自然循环。 */
  _releaseLock() {
    this.lockUntil = 0;
    this.lockHard = false;

    if (this.state.mood !== 'NEUTRAL' && this.time.now < this.state.moodUntil) {
      const moodAnim = PM.Config.MOOD_ANIM[this.state.mood];
      if (moodAnim && moodAnim !== 'idle' && PM.loaded.has(moodAnim)) {
        this.playAnim(moodAnim, this.state.mood === 'CRY');   // 哭不可打断
        return;
      }
      return;   // 没有对应素材就停在当前末帧
    }
    this.char.play('idle', true);
  }

  /* ── 表现 ──────────────────────────────────────────────── */

  /* 台词配音。一次只允许一条在响：新台词一定先掐掉上一条，
   * 否则连点时几条语音叠着放，气泡写的是 A、耳朵听见的是 A+B+C。
   * 元素按 URL 缓存复用 —— 每次 new Audio() 首播要等一次网络/解码，
   * 语音会晚于气泡半拍；复用的元素 currentTime=0 就是瞬时重播。 */
  _playVoice(url) {
    if (window.GameAudio && window.GameAudio.muted) return;   // M 键静音必须也管配音
    try {
      this._stopVoice();
      let a = (this._voiceCache ||= new Map()).get(url);
      if (!a) { a = new Audio(url); a.preload = 'auto'; this._voiceCache.set(url, a); }
      this._currentVoice = a;
      a.currentTime = 0;
      // play() 的 promise 会被下一次 pause() 打断（AbortError），忽略即可
      const p = a.play();
      if (p && p.catch) p.catch(() => {});

      /* 配音 2.8～9.8 秒不等，气泡默认只挂 2.6 秒 —— 一半的台词会"字没了人还在说"。
       * 拿到时长就把气泡延到说完；首播时元数据可能还没到，等一次 loadedmetadata 再补。
       * 补的时候要确认这条还是当前那条，否则连点后旧语音的时长会把新气泡挂住。 */
      const hold = () => this._holdBubble(a.duration);
      if (a.readyState >= 1 && isFinite(a.duration)) hold();
      else a.addEventListener('loadedmetadata',
        () => { if (this._currentVoice === a) hold(); }, { once: true });
    } catch (e) {}
  }

  /* 把气泡的淡出重排到 sec 秒之后（不短于默认 2.6 秒） */
  _holdBubble(sec) {
    if (!isFinite(sec) || sec <= 0) return;
    const delay = Math.max(PM.Config.BUBBLE_MS, sec * 1000 + 260);
    if (this._bubbleHide) this._bubbleHide.remove();
    this._bubbleHide = this.tweens.add({
      targets: this.bubble, alpha: 0, delay, duration: 320,
    });
  }

  _stopVoice() {
    const a = this._currentVoice;
    if (!a) return;
    this._currentVoice = null;
    try { a.pause(); a.currentTime = 0; } catch (e) {}
  }

  say(text, voice) {
    this.bubbleText.setText(text);
    const w = this.bubbleText.width + 26, h = this.bubbleText.height + 20;
    this.bubbleText.setPosition(13, 10);
    // 窄画布（竖屏手机）右侧放不下就翻到角色左边，别让气泡被裁掉
    const C2 = PM.Config;
    let bx = C2.CHAR_X + 118, flipped = false;
    if (bx + w > C2.WIDTH - 8) { bx = Math.max(8, C2.CHAR_X - 118 - w); flipped = true; }

    this.bubbleBg.clear();
    this.bubbleBg.fillStyle(0xf4f7fb, 0.96).fillRoundedRect(0, 0, w, h, 12);
    this.bubbleBg.lineStyle(2, this.circleColor, 0.9).strokeRoundedRect(0, 0, w, h, 12);
    /* 尾巴要指向说话的人：气泡在角色右边时挂左下角，翻到左边就得整个镜像到右下角，
     * 否则尾巴朝着空气 —— 尺寸先算、位置先定，尾巴才知道自己该画哪边。 */
    this.bubbleBg.fillStyle(0xf4f7fb, 0.96);
    if (flipped) this.bubbleBg.fillTriangle(w - 16, h, w - 40, h, w - 20, h + 13);
    else         this.bubbleBg.fillTriangle(16, h, 40, h, 20, h + 13);

    this.bubble.setPosition(bx, 120);
    this.tweens.killTweensOf(this.bubble);
    this.bubble.setAlpha(0).setScale(0.94);
    this.tweens.add({ targets: this.bubble, alpha: 1, scale: 1, duration: 130 });
    this._bubbleHide = this.tweens.add({
      targets: this.bubble, alpha: 0, delay: PM.Config.BUBBLE_MS, duration: 320,
    });
    // 配音放在气泡之后起：_playVoice 会按音频时长重排淡出，
    // 而上面的 killTweensOf 会把先建的那条一起杀掉
    if (voice) this._playVoice(voice);
  }

  _setMoodVisual(mood, instant = false) {
    const col = PM.Config.MOOD_COLOR[mood] ?? PM.Config.MOOD_COLOR.NEUTRAL;
    if (instant) {
      this.circleColor = col; this._lastMood = mood;
      this._tintAtmos(col);
      return;
    }
    if (mood === this._lastMood) return;
    this._lastMood = mood;

    // 法阵换色走插值，不然情绪一变整圈突然跳色
    const from = Phaser.Display.Color.IntegerToColor(this.circleColor);
    const to = Phaser.Display.Color.IntegerToColor(col);
    this.tweens.addCounter({
      from: 0, to: 100, duration: 320,
      onUpdate: t => {
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(from, to, 100, t.getValue());
        this.circleColor = Phaser.Display.Color.GetColor(c.r, c.g, c.b);
      },
    });
    this._tintAtmos(col);
  }

  /* 情绪配色不止染法阵：柔光和地面雾带一起走，脚下那一块才像"她的情绪把地面染了"，
   * 而不是"地上放了个会变色的道具"。雾带要压暗再上色 —— 雾是普通混合不是 ADD，
   * 直接吃满饱和色会在脚下糊出一条亮带，反而把靴子吃掉。 */
  _tintAtmos(col) {
    if (this.halo) this.halo.setTint(col);
    if (this.mist) {
      const c = Phaser.Display.Color.IntegerToColor(col);
      this.mist.setTint(Phaser.Display.Color.GetColor(
        Math.round(c.r * 0.30 + 10), Math.round(c.g * 0.30 + 12), Math.round(c.b * 0.30 + 20)));
    }
  }

  _feedback(ev) {
    if (window.GameAudio) {
      window.GameAudio.play(
        ev.tier >= 3 ? (ev.mood === 'CRY' ? 'lose' : 'splashBad')
        : ev.tier === 2 ? 'ui'
        : ev.soothed ? 'splashGood' : 'tick'
      );
    }
    this.circlePulse = Math.min(1, this.circlePulse + (ev.tier >= 3 ? 0.9 : 0.35));
    if (ev.tier >= 3 && !this._reducedMotion()) this.cameras.main.shake(160, 0.004);
  }

  // 被锁住时的"没用"微反馈：她躲得更远一点
  _nudge() {
    if (this._reducedMotion()) return;
    this.tweens.killTweensOf(this.char);
    this.char.x = PM.Config.CHAR_X;
    this.tweens.add({ targets: this.char, x: PM.Config.CHAR_X + 9, duration: 70, yoyo: true, repeat: 1 });
  }

  _reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  _drawDebug() {
    const C = PM.Config;
    const g = this.debugG;
    g.clear();
    if (!this.showRegions) return;
    const left = C.CHAR_X - C.FRAME_W / 2;
    for (const id of PM.REGION_ORDER) {
      const r = PM.REGIONS[id];
      const hot = this.state.heat[id] / C.HEAT_MAX;
      g.lineStyle(2, 0x6ea8ff, 0.85);
      g.fillStyle(0xff5555, 0.10 + hot * 0.45);
      const x = left + r.x * C.FRAME_W, y = C.CHAR_Y + r.y * C.FRAME_H;
      g.fillRect(x, y, r.w * C.FRAME_W, r.h * C.FRAME_H);
      g.strokeRect(x, y, r.w * C.FRAME_W, r.h * C.FRAME_H);
    }
  }

  _syncHud() {
    if (!window.GameHUD) return;
    const s = this.state;
    window.GameHUD.setScore(s.reactionsPlayed);
    window.GameHUD.setObjective(
      `${PM.Config.MOOD_LABEL[s.mood]} · 耐心 ${Math.round(s.patience)}`
    );
  }

  update(time, delta) {
    const ev = PM.Mood.step(this.state, delta, time);
    if (ev?.moodChanged) {
      this._setMoodVisual(this.state.mood);
      this._syncHud();
      if (!this.lockHard) this.char.play('idle', true);
    }

    // 锁的超时兜底（动画事件丢失时的最后一道防线）
    if (this.lockUntil && time > this.lockUntil) this._releaseLock();

    const speed = this.state.mood === 'ANGRY' || this.state.mood === 'CRY' ? 1.9 : 1;
    this.circleAngle += 0.0006 * delta * speed;
    this.circlePulse = Math.max(0, this.circlePulse - delta / 900);
    this._drawCircle();
    this._updateParallax(delta);
    this._updateDust(delta);
    if (this.showRegions) this._drawDebug();
  }
};
