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
    /* 表演状态机（见本文件 _request / _startPerform 一节）。
     * perform = 当前正在演的那一段（含等级）；pending = 同级排队槽（只留一格）。 */
    this.perform = null;
    this.pending = null;
    this._voiceGen = 0;         // 语音世代号：一切异步回调都要拿它对表
    this.showRegions = false;
    this._lastMood = 'NEUTRAL';
    // R 重来会重跑 create()，这两个必须清 —— 在切换动画中途按 R，
    // _switching 留着 true 就再也点不动任何东西（_uiHit 一律吞）
    this._switching = false;
    this._thumbs = [];

    /* 当前场景的气氛表 = 基表 + 该场景的浅覆盖。所有 _build*/ /* 都读 this.atmos，
     * **不要**再直接读 PM.Config.ATMOS —— 那是基表，读了它换场景就不生效，
     * 而且症状很隐蔽：光柱/雾带跟着换、光尘和暗角不换，看着像"某几个场景没做完"。 */
    this.atmos = PM.Scenes.atmos(PM.Scenes.current());

    this._buildBackdrop();
    this._buildCircle();
    this._buildCharacter();
    this._buildBubble();
    this._buildDebug();
    this._buildScenePicker();
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

    this._applySceneLayers(PM.Scenes.current());
    this._buildShaft();
    this._buildHalo();
    this._buildShadow();
    this._buildMist();
    this._buildDust();
    this._buildVignette();
  }

  /* 换掉三层背景图（保留光柱/雾带/光尘等气氛层，它们只需要改色改参数）。
   * 单独一个方法是为了 switchScene 能复用：切场景 = 拆旧三层 + 建新三层 + 重设气氛。 */
  _applySceneLayers(scene) {
    if (this.bgLayers) for (const L of this.bgLayers) L.img.destroy();
    this.bgLayers = [];
    for (const L of PM.Scenes.layers(scene)) {
      if (!this.textures.exists(L.key)) continue;   // 缺图不 404 也不崩，只是少一层
      if (L.split) this._addSplitLayer(L);
      else this._addLayer(L, 0, null, L.depth);
    }
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

  /* 一整套"离屏"的场景三层（缩略图 / 展开动画用）。
   * 和 _addLayer 用同一套 scale/scaleX，所以缩略图里看到的构图 = 切过去之后看到的构图；
   * 各自 new Image 而不是复用真身，是因为真身还挂在画面上、且带着视差偏移。 */
  _makeSceneImages(scene) {
    const C = PM.Config;
    const out = [];
    for (const L of PM.Scenes.layers(scene)) {
      if (!this.textures.exists(L.key)) continue;
      const img = this.add.image(C.WIDTH / 2, 0, L.key).setOrigin(0.5, 0);
      img.setScale(L.scaleX ?? L.scale, L.scale);
      out.push(img);
    }
    return out;
  }

  /* 拆层：同一张贴图裁成「地板」和「家具」两个 Image，家具下沉 bodyDy 坐到地板上。
   * 见 config.js 里 bg_mid 的注释 —— AI 把家具画得离它自己那条地板 35px，
   * 抠透明后远景从缝里透出来就成了悬空。setCrop 是原位渲染，
   * 两张不做位移时叠回去和原图逐像素一致，所以这层拆分对其他定标零影响。 */
  _addSplitLayer(L) {
    const B = PM.Config.BG;
    const { y: splitY, dy } = L.split;
    // 地板：splitY 往下整条，画在家具后一档，接缝由家具压住
    this._addLayer(L, 0, { x: 0, y: splitY, w: B.SRC_W, h: B.SRC_H - splitY }, L.depth - 1);
    // 家具：splitY 往上整条，整体下沉
    this._addLayer(L, dy, { x: 0, y: 0, w: B.SRC_W, h: splitY }, L.depth);
  }

  /* 玫瑰窗光柱：far 图上那扇窗是画死的，光柱做成会呼吸的活物才有"塔里有空气"的感觉。
   * 用梯形渐变贴图而不是 Graphics 多边形 —— 多边形没有软边，会看成一块实心色片。 */
  _buildShaft() {
    const A = this.atmos;
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
    const C = PM.Config, A = this.atmos;
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
    // 位置和大小都跟着角色缩放走（原值是 scale=1 时的手调值，430/620/700 都是单元格尺度）
    this.halo = this.add.image(C.CHAR_X, C.CHAR_Y + 430 * C.CHAR_SCALE, 'pm-halo')
      .setDisplaySize(620 * C.CHAR_SCALE, 700 * C.CHAR_SCALE)
      .setTint(A.HALO_TINT)
      .setAlpha(0.42)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(-20);
  }

  /* 接地阴影：背景换成有地板的实景之后，光有法阵还是"浮着"——
   * 一团压在靴底的软阴影是把角色钉在地面上最便宜的一招（depth 4，在角色之后、mid 之前）。
   * 复用 pm-halo 那张径向渐变，染黑即可，不必再建一张贴图。 */
  _buildShadow() {
    const C = PM.Config, A = this.atmos;
    this.shadow = this.add.image(C.CHAR_X, C.BG.FOOT_Y - 4, 'pm-halo')
      .setDisplaySize(A.SHADOW_W * C.CHAR_SCALE, A.SHADOW_H * C.CHAR_SCALE)
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
    const C = PM.Config, A = this.atmos;
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
    const C = PM.Config, A = this.atmos;
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
      { tint: A.DUST_BACK_TINT, r: [1.4, 3.6], vy: [-9, -3], a: [0.15, 0.45] });
    this.dustFront = make(A.DUST_FRONT, 15,
      { tint: A.DUST_FRONT_TINT, r: [2.2, 5.0], vy: [-22, -10], a: [0.10, 0.26] });
  }

  // 暗角：三层图各自的边缘亮度不一致，压一圈暗角能把它们缝成一个空间
  _buildVignette() {
    const C = PM.Config, A = this.atmos;
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
    // 存引用：暗角是逐场景的（温室 0.34 / 月夜 0.62），切场景要重设
    this.vignette = this.add.image(C.WIDTH / 2, C.HEIGHT / 2, 'pm-vig')
      .setDisplaySize(C.WIDTH * 1.06, C.HEIGHT * 1.06)
      .setAlpha(A.VIGNETTE)
      .setDepth(19);
  }

  /* ── 场景切换 ──────────────────────────────────────────────
   *
   * 交互取向（用户拍板）：**不做拖拽**。角色身上「按住」和「拖动」已经是 hold / rub
   * 两个核心手势（PM.Touch.classify），再让拖角色去换场景，等于用一个一分钟按一次的
   * 动作去污染每分钟都要用的动作。改成右上角一个按钮 → 缩略图覆盖层 → 点选。
   * 覆盖层也不常驻：底部常驻一条 dock 会盖住 legL/legR 两个可触区
   * （角色单元格 580×720 占满画布全高），就是「看得见摸得着但点不到」那个老毛病。 */

  // 右上角入口。放右上是因为七个可触区最右只到 CHAR_X+96，这里离得最远，最不容易误触。
  _buildScenePicker() {
    const C = PM.Config;
    const R = 21, x = C.WIDTH - R - 16, y = R + 16;
    this._pickerBtnRect = new Phaser.Geom.Circle(x, y, R + 10);   // 判定比画的圈大一点

    // depth 38 在覆盖层(36)【之上】：它是个开关，打开时也得亮着能再点一次关掉，
    // 被自己开出来的半透明幕布盖住会看着像失效了
    const g = this.add.graphics().setDepth(38);
    g.fillStyle(0x0d1119, 0.55).fillCircle(x, y, R);
    g.lineStyle(1.5, 0x8fa7c9, 0.7).strokeCircle(x, y, R);
    // 图标：两张叠起来的"画框"，一眼是"换个景"而不是"设置"
    g.lineStyle(1.6, 0xcfe0f5, 0.9);
    g.strokeRect(x - 9, y - 7, 13, 11);
    g.strokeRect(x - 4, y - 3, 13, 11);
    this._pickerBtn = g;

    this.uiOpen = false;
    this.overlay = null;
  }

  togglePicker() { this.uiOpen ? this.closePicker() : this.openPicker(); }

  openPicker() {
    if (this.uiOpen || this._switching) return;
    const C = PM.Config;
    this.uiOpen = true;

    const c = this.add.container(0, 0).setDepth(36);
    const dim = this.add.rectangle(0, 0, C.WIDTH, C.HEIGHT, 0x070a10, 0.86).setOrigin(0, 0);
    c.add(dim);
    c.add(this.add.text(C.WIDTH / 2, 26, '换个地方', {
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif', fontSize: '19px', color: '#e6eefb',
    }).setOrigin(0.5, 0));

    /* 2 列 × 3 行。**不能用 3 行以上或底部横条**：画布高固定 720，
     * 竖着排满就必然压到腿部可触区上方，关掉覆盖层的手势也会离腿太近。
     *
     * 尺寸是倒着算出来的，别凭好看改大：三行 + 每行下面一行标签 + 底部那句提示，
     * 全部要塞进 720。tw=236 时第三行的标签正好压在提示上（实测），
     * 收到 215 之后底部还剩 50px 空。窄画布（660）下两列 215 也放得下。 */
    const cols = 2, gap = 18, tw = 215, th = Math.round(tw * C.HEIGHT / C.WIDTH);
    const rowStep = th + 26;
    const x0 = Math.round((C.WIDTH - (cols * tw + (cols - 1) * gap)) / 2), y0 = 56;

    this._thumbs = [];
    this._thumbMasks = [];
    PM.Scenes.list().forEach((s, i) => {
      const cx = x0 + (i % cols) * (tw + gap), cy = y0 + Math.floor(i / cols) * rowStep;
      this._thumbs.push(this._makeThumb(c, s, cx, cy, tw, th));
    });

    c.add(this.add.text(C.WIDTH / 2, C.HEIGHT - 26, '点画面其他地方关闭', {
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif', fontSize: '13px', color: '#7f92ad',
    }).setOrigin(0.5, 1));

    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: PM.Config.SCENE_FADE_MS });
    this.overlay = c;
  }

  closePicker() {
    if (!this.uiOpen) return;
    this.uiOpen = false;
    const c = this.overlay;
    this.overlay = null;
    this._thumbs = [];
    const masks = this._thumbMasks || [];
    this._thumbMasks = [];
    if (!c) { for (const m of masks) m.destroy(); return; }
    this.tweens.add({
      targets: c, alpha: 0, duration: PM.Config.SCENE_FADE_MS,
      // 遮罩要等淡出结束再拆：提前拆了，最后这 200ms 里缩略图会溢出到隔壁格
      onComplete: () => { c.destroy(); for (const m of masks) m.destroy(); },
    });
  }

  /* 一格缩略图 = 该场景的真三层，按 tw/W 整体缩小，外加一个矩形遮罩把溢出裁掉。
   * 用真图层而不是另存一张缩略图片：这样"缩略图里长什么样 = 切过去长什么样"是**结构保证**的，
   * 不会出现改了 scale 忘了重导缩略图那种漂移。代价是每格三张 Image，六格十八张，
   * 只在覆盖层打开时存在，关掉就销毁。 */
  _makeThumb(parent, scene, x, y, tw, th) {
    const C = PM.Config;
    const k = tw / C.WIDTH;
    const ready = PM.Scenes.layers(scene).some(L => this.textures.exists(L.key));

    const box = this.add.container(x, y);
    box.add(this.add.rectangle(0, 0, tw, th, 0x0d1119, 1).setOrigin(0, 0));

    if (ready) {
      const inner = this.add.container(0, 0).setScale(k);
      for (const img of this._makeSceneImages(scene)) inner.add(img);
      // 遮罩用 Graphics 的几何遮罩（世界坐标）。少了它，1440 宽的源图缩到 0.26
      // 还有 ~370px，会糊到隔壁格子上去
      const mg = this.make.graphics({ x: 0, y: 0 }, false);
      mg.fillStyle(0xffffff).fillRect(x, y, tw, th);
      inner.setMask(mg.createGeometryMask());
      box.add(inner);
      /* 遮罩用的 Graphics 是 make.graphics(..., false) 建的 —— 不在显示列表上，
       * 所以覆盖层 destroy() 带不走它。必须自己记账，否则每开一次选择器泄漏 6 个。 */
      this._thumbMasks.push(mg);
    } else {
      box.add(this.add.text(tw / 2, th / 2, '载入中…', {
        fontFamily: 'Segoe UI, sans-serif', fontSize: '13px', color: '#6d7f99',
      }).setOrigin(0.5));
    }

    const isCur = scene.id === PM.Scenes.currentId;
    const frame = this.add.graphics();
    frame.lineStyle(isCur ? 2.5 : 1.2, isCur ? 0x5fe0c8 : 0x64748b, isCur ? 1 : 0.65)
      .strokeRect(0, 0, tw, th);
    box.add(frame);
    box.add(this.add.text(4, th + 4, scene.name + (isCur ? ' ·当前' : ''), {
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif', fontSize: '13px',
      color: isCur ? '#5fe0c8' : '#cbd6e6',
    }).setOrigin(0, 0));

    parent.add(box);
    return { scene, rect: new Phaser.Geom.Rectangle(x, y, tw, th), ready, box };
  }

  /* iOS 开 App 式展开：新场景从缩略图那一格长到满屏，长完才真正换层。
   *
   * 用 Container + 几何遮罩，不用 RenderTexture 快照 —— 快照是按缩略图分辨率拍的，
   * 放大到满屏必糊；容器缩放是每帧按当前 scale 采样原图，从头到尾都是清的。
   * 遮罩必须跟着一起 tween，否则展开过程中 1440 宽的源图会直接铺满整屏，
   * "从那一格里长出来"的感觉当场没了。 */
  switchScene(id, fromRect) {
    const C = PM.Config;
    const scene = PM.Scenes.byId(id);
    if (!scene || this._switching) return false;
    if (scene.id === PM.Scenes.currentId) { this.closePicker(); return false; }
    if (!PM.Scenes.layers(scene).some(L => this.textures.exists(L.key))) return false;

    this._switching = true;
    this.closePicker();

    const commit = () => {
      PM.Scenes.setCurrent(scene.id);
      this.atmos = PM.Scenes.atmos(scene);
      this._applySceneLayers(scene);
      this._applyAtmos();
      this._switching = false;
      if (window.GameAudio) window.GameAudio.play('ui');
    };

    // reduced-motion：整段动画跳过。这里是全屏尺度的缩放，对前庭敏感的人最难受
    const full = new Phaser.Geom.Rectangle(0, 0, C.WIDTH, C.HEIGHT);
    const from = fromRect || full;
    if (this._reducedMotion()) { commit(); return true; }

    const inner = this.add.container(0, 0);
    for (const img of this._makeSceneImages(scene)) inner.add(img);
    const wrap = this.add.container(from.x, from.y).setDepth(50);
    wrap.add(inner);
    inner.setScale(from.width / C.WIDTH);

    const mg = this.make.graphics({ x: 0, y: 0 }, false);
    const drawMask = (r) => { mg.clear(); mg.fillStyle(0xffffff).fillRect(r.x, r.y, r.width, r.height); };
    drawMask(from);
    wrap.setMask(mg.createGeometryMask());

    this.tweens.addCounter({
      from: 0, to: 1, duration: C.SCENE_ZOOM_MS, ease: 'Cubic.easeInOut',
      onUpdate: (t) => {
        const p = t.getValue();
        const x = Phaser.Math.Linear(from.x, full.x, p);
        const y = Phaser.Math.Linear(from.y, full.y, p);
        const w = Phaser.Math.Linear(from.width, full.width, p);
        const h = Phaser.Math.Linear(from.height, full.height, p);
        wrap.setPosition(x, y);
        inner.setScale(w / C.WIDTH);
        drawMask(new Phaser.Geom.Rectangle(x, y, w, h));
      },
      onComplete: () => {
        // 先把真身换好再拆临时层：反过来的话中间会闪一帧旧背景
        commit();
        wrap.destroy();
        mg.destroy();
      },
    });
    return true;
  }

  /* 把当前 this.atmos 重新灌进已经建好的气氛对象。
   * 光柱的呼吸 tween 必须先 kill 再重建 —— 它是 repeat:-1 且 alpha 目标写死在旧值上，
   * 不杀掉的话新场景的 SHAFT_ALPHA 会被老 tween 每个循环拉回旧值，
   * 表现为"光柱亮度自己在两个场景之间来回跳"。 */
  _applyAtmos() {
    const C = PM.Config, A = this.atmos;
    if (this.shaft) {
      this.tweens.killTweensOf(this.shaft);
      this.shaft.setDisplaySize(A.SHAFT_W, A.SHAFT_H).setTint(A.SHAFT_COLOR).setAlpha(A.SHAFT_ALPHA);
      this.tweens.add({
        targets: this.shaft, alpha: A.SHAFT_ALPHA + A.SHAFT_BREATH,
        duration: A.SHAFT_MS, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
    if (this.mist) this.mist.setY(A.MIST_Y).setDisplaySize(C.WIDTH, A.MIST_H).setAlpha(A.MIST_ALPHA);
    if (this.shadow) this.shadow.setDisplaySize(A.SHADOW_W * C.CHAR_SCALE, A.SHADOW_H * C.CHAR_SCALE).setAlpha(A.SHADOW_A);
    if (this.vignette) this.vignette.setAlpha(A.VIGNETTE);
    if (this.dustBack) for (const d of this.dustBack) d.img.setTint(A.DUST_BACK_TINT);
    if (this.dustFront) for (const d of this.dustFront) d.img.setTint(A.DUST_FRONT_TINT);
    // 柔光/雾带的颜色由情绪接管，这里只重设"底色"，随后立刻交回情绪那套
    if (this.halo) this.halo.setTint(A.HALO_TINT);
    this._tintAtmos(this.circleColor);
  }

  /* 指针视差：没有相机可跟，就让鼠标当"观众的头"。三层 + 光柱按 par 系数反向偏移，
   * 静止角色也能拿到空间感。幅度必须小 —— 大了会露出层的边缘裁切。 */
  _updateParallax(delta) {
    const C = PM.Config, A = this.atmos;
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
    // 法阵画在她脚下，尺度跟着角色走（688/168/44 都是 scale=1 时量的）
    const S = C.CHAR_SCALE;
    const cx = C.CHAR_X, cy = C.CHAR_Y + 688 * S;
    const rx = (168 + this.circlePulse * 26) * S, ry = (44 + this.circlePulse * 8) * S;
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
      .setScale(C.CHAR_SCALE)
      .setDepth(5);
    /* 刻意**不**挂 animationcomplete：表演的长度是 max(动画, 配音)，
     * 由 update() 按绝对时间戳推进（见 _startPerform 的注释）。
     * 挂了反而会在她还在说话时提前结束表演。 */
  }

  _buildBubble() {
    const C = PM.Config;
    /* 换行宽度不能写死：气泡贴在角色侧面，可用的横向空间只有 CHAR_X-118-8（留白），
     * 窄画布上写死 250 会让气泡压到角色身上。再减 26 是左右内边距。
     * advancedWordWrap 必须开 —— 默认的 wordWrap 只按空格断词，中文台词整句是"一个词"，
     * 根本不换行，宽度会一路涨到把气泡挤翻到左边（就是斗篷旁那条长台词露的馅）。 */
    // 118 是"身体右缘"的经验值，随角色缩放收窄；气泡竖向贴头顶，也跟着 CHAR_Y 走
    this._bubbleGap = Math.round(118 * C.CHAR_SCALE);
    this._bubbleWrap = Math.min(250, Math.round(C.CHAR_X - this._bubbleGap - 8 - 26));
    this.bubble = this.add.container(C.CHAR_X + this._bubbleGap + 32,
                                     C.CHAR_Y + 130 * C.CHAR_SCALE).setDepth(20).setAlpha(0);
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
      'B 换背景 · G 显示触碰区 · M 静音 · R 重来', {
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

    /* UI 优先：场景按钮和覆盖层吃掉的那一下，**不能**再走触碰判定。
     * 这里刻意不用 GameObject 的 setInteractive —— 触碰判定挂在场景级 pointerup 上，
     * 两套事件源的先后顺序在不同 Phaser 版本里不一样，靠"谁先触发"来互斥迟早出鬼。
     * 改成在同一个 pointerdown 里显式分流：命中 UI 就把这一下标记掉，pointerup 直接丢弃。 */
    this.input.on('pointerdown', p => {
      if (this._uiHit(p)) { this._down = null; this._uiSwallow = true; return; }
      this._uiSwallow = false;
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
      if (this._uiSwallow) { this._uiSwallow = false; this._uiRelease(p); return; }
      if (!this._down) return;
      const up = { t: this.time.now, x: p.x, y: p.y };
      const gesture = PM.Touch.classify(this._down, up, this._travel);
      // rub 用抬起点判区域最自然（手停在哪就是摸哪）
      const { fx, fy } = PM.Touch.toFrame(up.x, up.y);
      const region = PM.Touch.hitRegion(fx, fy, this._isBody);
      this._down = null;
      if (region) this.poke(region, gesture);
    });

    // B = background。用键盘也能开，桌面上比去够右上角快
    this.input.keyboard.on('keydown-B', () => this.togglePicker());

    this.input.keyboard.on('keydown-G', () => {
      this.showRegions = !this.showRegions;
      this.debugG.setVisible(this.showRegions);
      this._drawDebug();
    });
    this.input.keyboard.on('keydown-M', () => {
      // 静音要立刻掐掉正在说的那句，并把表演长度收回来（别为一条听不见的语音继续锁着）
      if (window.GameAudio && window.GameAudio.toggle()) { this._stopVoice(); this._trimPerform(); }
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

  /* 这一下是不是打在 UI 上（按钮 / 已打开的覆盖层 / 切换动画进行中）。
   * 覆盖层一旦打开就整屏吃掉 —— 覆盖层底下就是她，不整屏吃的话
   * "点缩略图之间的空隙"会穿透过去戳到人，一边选场景一边被她抗议，很怪。 */
  _uiHit(p) {
    if (this._switching) return true;
    if (this.uiOpen) return true;
    return !!(this._pickerBtnRect && Phaser.Geom.Circle.Contains(this._pickerBtnRect, p.x, p.y));
  }

  // UI 上抬起手：按钮 → 开关；覆盖层内 → 选中那格切场景，空白处 → 关闭
  _uiRelease(p) {
    if (this._switching) return;
    if (this._pickerBtnRect && Phaser.Geom.Circle.Contains(this._pickerBtnRect, p.x, p.y)) {
      this.togglePicker();
      return;
    }
    if (!this.uiOpen) return;
    for (const t of this._thumbs || []) {
      if (!Phaser.Geom.Rectangle.Contains(t.rect, p.x, p.y)) continue;
      if (!t.ready) return;                       // 还没加载完的那格：点了不给反应，别把人扔进空场景
      this.switchScene(t.scene.id, t.rect);
      return;
    }
    this.closePicker();
  }

  /* ── 玩法 ──────────────────────────────────────────────── */

  poke(region, gesture = 'tap') {
    const now = this.time.now;
    const ev = PM.Mood.poke(this.state, region, gesture, now);

    if (ev.punish) {
      /* 惩罚是整局的高潮，等级排在 tier3 之上，**抢占一切**。
       * （曾经写成"锁期间直接 return"，导致惩罚判定在锁里被丢掉，
       *   玩家永远看不到泼水、直接跳去哭 —— poke-bot 第 3 项就是抓这个的。）*/
      this._request({
        tier: 4, hard: true, anim: PM.PUNISH.anim,
        line: PM.PUNISH.line, voice: PM.PUNISH.voice,
        onStart: () => this._punishFx(),
      });
    } else {
      let act = null;
      const pick = PM.React.pick(region, ev.tier, PM.loaded);
      if (pick) {
        act = { tier: ev.tier, hard: ev.tier >= 3, anim: pick.anim, line: pick.line, voice: pick.voice };
      }
      /* 情绪本身也要有画面：进 HAPPY 时整段换成正反馈那条。
       * 台词/配音必须跟着一起换 —— 否则画面在笑、气泡和语音还是刚才那句。 */
      if (ev.moodChanged && ev.mood === 'HAPPY' && PM.loaded.has(PM.HAPPY_REACT.anim)) {
        act = { tier: ev.tier, hard: false, anim: PM.HAPPY_REACT.anim,
                line: PM.HAPPY_REACT.line, voice: PM.HAPPY_REACT.voice };
      }
      if (act) this._request(act);
      else this._nudge();     // 该等级没有可播素材，至少给点触感
    }

    this._setMoodVisual(this.state.mood);
    this._feedback(ev);
    this._syncHud();
    return ev;
  }

  /* ── 表演调度：优先级 + 排队 ─────────────────────────────
   *
   * 一次反应 = 一段"表演"：动画 + 台词 + 配音，带一个等级 tier（惩罚是 4）。
   * 三条规则，全部在这里落地：
   *   ① 高等级抢占低等级 —— 低的先**快速收尾归位**（残余帧提速播完）、配音**立刻停**；
   *   ② 同等级排队 —— 只留一格，后来的覆盖先来的（要的是"最新那次的反应"，不是补播历史）；
   *   ③ 低等级在表演途中一律忽略，只给 _nudge 微反馈。
   * hard（tier3 / 哭 / 惩罚）额外锁死①：除惩罚外谁都抢不走。 */
  _request(act) {
    const p = this.perform;
    if (!p) { this._startPerform(act); return; }

    const isPunish = act.tier >= 4;

    // 正在收尾让位 → 争的是"下一个上场的是谁"，高的赢；
    // 同级进排队槽，低级照样忽略（否则会在高等级演完后补播一个已经过期的低级反应）
    if (p.phase === 'abort') {
      if (isPunish || act.tier > p.next.tier) p.next = act;
      else if (act.tier === p.next.tier) this._enqueue(act);
      else this._nudge();
      return;
    }

    /* 话尾（动作已演完、只剩配音还在响）不享有等级保护。
     * 表演**长度**照旧以更长的音频为准（自然收尾），但"谁能打断"只按动作那条线算：
     * 最长一句 9.8 秒而动作才 1.3 秒，若整段都受保护，玩家戳一下要干等 8 秒才有下一个反应 ——
     * 她人已经站回 idle 了，看着就是"闲着还不理人"。打断是干净的：_beginAbort 立刻停配音。
     * 惩罚（tier4）和情绪待机段除外：前者是整局高潮不许腰斩，后者本来就是等级 0。 */
    const tail = p.phase === 'play' && p.animDone && !p.rest && p.tier <= 3;
    const pTier = tail ? 0 : p.tier;
    const pHard = tail ? false : p.hard;

    if (isPunish || (!pHard && act.tier > pTier)) { this._beginAbort(act); return; }
    if (act.tier >= pTier) { this._enqueue(act); return; }
    this._nudge();
  }

  _enqueue(act) {
    if (!this.pending || act.tier >= this.pending.tier) this.pending = act;
  }

  /* 起一段表演。时长 = max(动画, 配音) + 余韵，**全部记成绝对时间戳、由 update() 推进**。
   * 不用 delayedCall / animationcomplete：前者在无头环境下滞后可达数倍（会把"收尾"
   * 拖成"卡死"），后者只知道动画完了、不知道她还在说话。 */
  _startPerform(act) {
    const C = PM.Config;
    const now = this.time.now;
    this.char.anims.timeScale = 1;
    const animMs = this.playAnim(act.anim);

    this.perform = {
      tier: act.tier,
      hard: !!act.hard,
      rest: !!act.rest,             // 情绪待机段：不是对触碰的回应，谁都能抢占
      phase: 'play',
      animUntil: now + animMs,
      animDone: animMs <= 0,        // loop 动画（idle）没有"演完"这回事
      until: now + animMs + C.PERFORM_TAIL_MS,
      next: null,
      abortUntil: 0,
    };

    if (act.line) this.say(act.line, act.voice);   // 配音时长到手后会回来延长 until
    if (act.onStart) act.onStart();
  }

  /* 让位：先停嘴、再把没演完的动作**快速做完**，然后才轮到高等级那段上场。
   * 这一步是"优先级看得见"的关键 —— 直接硬切会让上一段停在半路的怪姿势上。 */
  _beginAbort(next) {
    const C = PM.Config;
    const now = this.time.now;
    const p = this.perform;

    this._stopVoice();          // ① 语音立刻停，绝不允许两句叠着说
    this._fadeBubble(140);      // ② 气泡跟着快速淡掉

    const rem = p.animDone ? 0 : Math.max(0, p.animUntil - now);
    if (rem <= C.ABORT_MIN_MS) { this.perform = null; this._startPerform(next); return; }

    // ③ 残余帧提速播完：cut 封顶 ABORT_MAX_MS，所以再长的动作也在 0.38s 内归位
    const cut = Math.min(rem, C.ABORT_MAX_MS);
    this.char.anims.timeScale = rem / cut;
    p.phase = 'abort';
    p.abortUntil = now + cut;
    p.next = next;
  }

  /* 一段表演落幕：续连击窗口 → 有排队的就接着演 → 否则回到情绪/待机姿态。 */
  _endPerform() {
    const C = PM.Config;
    this.perform = null;
    this.char.anims.timeScale = 1;

    // 连击窗口从"演完"起算，玩家听完整句再戳依然算连击（config.COMBO_WINDOW_MS 注释）
    PM.Mood.holdCombo(this.state, this.time.now + C.COMBO_WINDOW_MS);

    const q = this.pending;
    this.pending = null;
    if (q) { this._startPerform(q); return; }
    this._restAnim();
  }

  /* 没有表演时该摆什么姿势：情绪维持期内接着播情绪动画，否则 idle。
   * 这条很关键 —— 惩罚播的是 water_threat（举水球），mood 却已经是 CRY；
   * 没有这一步，`cry` 这段素材永远不会出现在游戏里，人被惹哭了却看不到哭。
   * 情绪动画本身也是一段表演，播完回到这里，于是在维持期内自然循环。
   *
   * 但它的等级是 0（`rest`），不是 tier3 —— 它是"她现在的样子"，不是对某次触碰的回应，
   * 不该拿反应的优先级去压玩家的下一次触碰。曾经写成 tier3：一次重反应之后的整个
   * MOOD_HOLD_MS（2.6 秒）里，玩家戳第 1/2 下都因"低于正在演的等级"被吞成 _nudge，
   * 而 combo 还在闷声上涨 —— 体感是"她生完气有两下没反应，然后突然又炸了"。
   * 等级 0 意味着任何真触碰都能抢占它（收尾封顶 380ms），反应演完再回到这里续上情绪。 */
  _restAnim() {
    const s = this.state;
    const now = this.time.now;
    if (s.mood !== 'NEUTRAL' && now < s.moodUntil - 300) {
      const m = PM.Config.MOOD_ANIM[s.mood];
      if (m && m !== 'idle' && PM.loaded.has(m)) {
        this._startPerform({ tier: 0, hard: false, rest: true, anim: m });
        return;
      }
      return;   // 没有对应素材就停在当前末帧
    }
    this.char.play('idle', true);
  }

  _punishFx() {
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

  /* 只管放动画，不管锁 —— 锁的账在 _startPerform 那边记。
   * @return once 动画的时长(ms)；loop/pingpong 返回 0（"没有演完这回事"）。 */
  playAnim(key) {
    if (!PM.loaded.has(key)) key = 'idle';
    const cfg = PM.Config.ANIMS[key];
    this.char.play(key, true);
    return cfg.mode === 'once' ? (cfg.frames / cfg.fps) * 1000 : 0;
  }

  /* ── 表现 ──────────────────────────────────────────────── */

  /* 台词配音。一次只允许一条在响：新台词一定先掐掉上一条，
   * 否则连点时几条语音叠着放，气泡写的是 A、耳朵听见的是 A+B+C。
   * 元素按 URL 缓存复用 —— 每次 new Audio() 首播要等一次网络/解码，
   * 语音会晚于气泡半拍；复用的元素 currentTime=0 就是瞬时重播。 */
  /* 配音状态机。一次只允许一条在响，且**每一条异步回调都要拿世代号对表**。
   *
   * HTMLAudio 这层的坑全在"异步回调比它的主人活得久"上，这里逐条堵掉：
   *   ① play() 返回 promise。停掉后它才 resolve 的话，元素会**在被停之后开始响** ——
   *      于是抢占时旧语音诈尸，和新语音叠着说。resolve 里回头查一次"我还是当前那条吗"。
   *   ② 元素按 URL 缓存复用，所以"旧世代"和"新世代"可能是**同一个元素**（连点同一区域）。
   *      判据必须是 `_currentVoice !== a`（这元素还是不是当前那条），
   *      不能只看世代号 —— 否则旧世代的清理会把刚重播的自己按停。
   *   ③ loadedmetadata / ended 是长期监听，必须在换人时摘掉（_voiceOff），
   *      不然缓存元素上会越挂越多，旧句子的时长/结束事件会去改新句子的气泡和表演长度。
   *   ④ 静音时直接不播：表演长度就只按动画算，不能让一条听不见的语音把她锁在原地。 */
  _playVoice(url) {
    this._stopVoice();                                        // 换人第一件事：把上一条彻底摘干净
    if (window.GameAudio && window.GameAudio.muted) return;    // ④ M 键静音必须也管配音
    try {
      let a = (this._voiceCache ||= new Map()).get(url);
      if (!a) { a = new Audio(url); a.preload = 'auto'; this._voiceCache.set(url, a); }
      const gen = this._voiceGen;
      this._currentVoice = a;
      a.currentTime = 0;

      const mine = () => this._voiceGen === gen && this._currentVoice === a;

      /* 配音 2.8～9.8 秒不等：气泡默认只挂 2.6 秒（字没了人还在说），
       * 表演也默认只按动画算（人归位了嘴还在动）。两个都得按真实时长延。
       * 首播时元数据可能还没到，等一次 loadedmetadata 再补。 */
      const onMeta = () => {
        if (!mine()) return;
        const sec = a.duration;
        if (!isFinite(sec) || sec <= 0) return;
        this._holdBubble(sec);
        if (this.perform && this.perform.phase === 'play') {
          this.perform.until = Math.max(
            this.perform.until, this.time.now + sec * 1000 + PM.Config.PERFORM_TAIL_MS);
        }
      };
      // 说完了就别再占着表演：把 until 收回到"动画演完"和"现在"里较晚的那个
      const onEnded = () => {
        if (!mine()) return;
        this._currentVoice = null;
        this._trimPerform();
      };

      a.addEventListener('loadedmetadata', onMeta);
      a.addEventListener('ended', onEnded);
      this._voiceOff = () => {
        a.removeEventListener('loadedmetadata', onMeta);
        a.removeEventListener('ended', onEnded);
      };

      const p = a.play();
      if (p && p.then) {
        // ① 已经不是当前那条了才按停；是的话说明它被同一个 URL 重新启用了，别动
        p.then(() => { if (this._currentVoice !== a) { try { a.pause(); a.currentTime = 0; } catch (e) {} } })
         .catch(() => {});   // 被下一次 pause() 打断的 AbortError，忽略即可
      }

      if (a.readyState >= 1) onMeta();
    } catch (e) {}
  }

  /* 撤掉挂着的淡出 tween。**必须查 parent** —— 已经播完的 tween 在 Phaser 3.60 里
   * parent 已置空，再调 remove() 会抛 "Cannot read properties of null"，
   * 而这句在抢占路径（_beginAbort → _fadeBubble）上，一炸就是整局游戏死掉：
   * 说完一句、等气泡自然淡完、再戳一下 —— 正常游玩必然踩到。 */
  _killBubbleHide() {
    const t = this._bubbleHide;
    this._bubbleHide = null;
    if (t && t.parent) t.remove();
  }

  /* 把气泡的淡出重排到 sec 秒之后（不短于默认 2.6 秒） */
  _holdBubble(sec) {
    if (!isFinite(sec) || sec <= 0) return;
    const delay = Math.max(PM.Config.BUBBLE_MS, sec * 1000 + 260);
    this._killBubbleHide();
    this._bubbleHide = this.tweens.add({
      targets: this.bubble, alpha: 0, delay, duration: 320,
      onComplete: () => { this._bubbleHide = null; },   // 播完就撒手，别留下已失效的引用
    });
  }

  _fadeBubble(ms) {
    this._killBubbleHide();
    this.tweens.killTweensOf(this.bubble);
    this.tweens.add({ targets: this.bubble, alpha: 0, duration: ms });
  }

  /* 语音提前结束（说完 / 静音 / 抢占）后，把表演长度收回到动画那条线上，
   * 免得她已经不说话了却还占着通道，后面排队的迟迟上不了场。 */
  _trimPerform() {
    const p = this.perform;
    if (!p || p.phase !== 'play') return;
    const tail = PM.Config.PERFORM_TAIL_MS;
    p.until = Math.min(p.until, Math.max(p.animUntil + tail, this.time.now + tail));
  }

  _stopVoice() {
    this._voiceGen++;                       // 世代 +1：所有在飞的回调就此作废
    this._voiceHeld = false;
    if (this._voiceOff) { this._voiceOff(); this._voiceOff = null; }
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
    const gap = this._bubbleGap;
    let bx = C2.CHAR_X + gap, flipped = false;
    if (bx + w > C2.WIDTH - 8) { bx = Math.max(8, C2.CHAR_X - gap - w); flipped = true; }

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
      onComplete: () => { this._bubbleHide = null; },
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
    const left = C.CHAR_X - C.DRAW_W / 2;
    for (const id of PM.REGION_ORDER) {
      const r = PM.REGIONS[id];
      const hot = this.state.heat[id] / C.HEAT_MAX;
      g.lineStyle(2, 0x6ea8ff, 0.85);
      g.fillStyle(0xff5555, 0.10 + hot * 0.45);
      const x = left + r.x * C.DRAW_W, y = C.CHAR_Y + r.y * C.DRAW_H;
      g.fillRect(x, y, r.w * C.DRAW_W, r.h * C.DRAW_H);
      g.strokeRect(x, y, r.w * C.DRAW_W, r.h * C.DRAW_H);
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
    /* 表演期间连击不过期 —— 窗口是"演完之后还有多久"，不是"按下之后还有多久"。
     * 必须每帧续，不能只在 _endPerform 续一次：一句配音 2.8~9.8 秒，
     * step() 早在 COMBO_WINDOW_MS 处就把 combo 清零了，演完再续已经晚了
     * （holdCombo 的 combo>0 守卫不成立）。见 mood.holdCombo 的注释。
     *
     * 情绪待机段（rest）不算 —— 窗口衡量的是"离她上一次**回应**过去多久"，
     * 待机段一挂就是整个 MOOD_HOLD_MS，把它算进去等于白送连击。 */
    if (this.perform && !this.perform.rest) {
      PM.Mood.holdCombo(this.state, time + PM.Config.COMBO_WINDOW_MS);
    }

    const ev = PM.Mood.step(this.state, delta, time);
    if (ev?.moodChanged) {
      this._setMoodVisual(this.state.mood);
      this._syncHud();
      if (!this.perform) this.char.play('idle', true);
    }

    /* 表演状态机的唯一时钟。绝对时间戳 + 每帧比对，没有任何 delayedCall：
     * 无头/掉帧环境下计时器滞后可达数倍，而这里滞后就等于"她卡住不动了"。 */
    const p = this.perform;
    if (p) {
      if (p.phase === 'abort') {
        if (time >= p.abortUntil) {          // 收尾归位完毕 → 高等级那段上场
          const nxt = p.next;
          this.perform = null;
          this.char.anims.timeScale = 1;
          this._startPerform(nxt);
        }
      } else {
        // 动作演完但话还没说完：先回 idle 待机，别僵在末帧上干说
        if (!p.animDone && time >= p.animUntil) {
          p.animDone = true;
          this.char.play('idle', true);
        }
        if (time >= p.until) this._endPerform();
      }
    }

    const speed = this.state.mood === 'ANGRY' || this.state.mood === 'CRY' ? 1.9 : 1;
    this.circleAngle += 0.0006 * delta * speed;
    this.circlePulse = Math.max(0, this.circlePulse - delta / 900);
    this._drawCircle();
    this._updateParallax(delta);
    this._updateDust(delta);
    if (this.showRegions) this._drawDebug();
  }
};
