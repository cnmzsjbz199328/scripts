/* PokeMood — 水魔法特效（唯一真源）
 *
 * 素材只画到「举着水球」为止（water_threat / cast_windup 的末帧就停在举球态，
 * angry_charge 停在蓄力态），**释放整段是代码画的**：三条源视频的喷射方向全不对，
 * 与其迁就素材，不如把释放交给渲染层，方向可控（DESIGN §4.5 ②）。
 *
 * 这个文件被两处引用，改任何一个数都是同时改两边：
 *   ① game/scenes/StageScene.js  —— 惩罚（PM.PUNISH）时 PM.WaterFx.cast()
 *   ② preview.html「水魔法测试台」—— 带滑杆的调参台，动作 + 特效合起来看
 * 所以所有可调的数都收在 PM.WaterFx.P 里，不许散落在函数体内 —— 测试台是照着
 * P 的结构自动生成滑杆的，写死在函数里的数调不到。
 *
 * ── 三拍（为什么这么排）────────────────────────────────────────
 *   ① 蓄 CHARGE_MS：水滴从四周**向杖头收束**、亮环收缩。
 *      没有这一拍时，画面是「她举着球 → 突然全屏水花」，前后没有因果，
 *      看着像特效放早了。收束是预告，观众知道下一拍要炸。
 *   ② 泼 BURST：从水球朝**镜头**喷（不是 360° 均匀炸开）。
 *      旧版 angle 0~360 的问题是没有方向——只是她身上冒了团雾。
 *      朝镜头的透视靠三件事卖：锥形角度、粒子边飞边**放大**（越近越大）、
 *      几团大水舌直接冲脸。
 *   ③ 挂 SPLAT：水珠**留在屏幕上**（镜头湿了），慢慢往下淌、拖一条水痕。
 *      这一层才真正说明「泼到你脸上了」。旧版这层用的是 ADD 的白色光点，
 *      发光的圆点读作萤火/散景，不是水；水珠必须是 NORMAL 混合 +
 *      「边缘亮、中间透」的折射感 + 一个高光点。
 */
window.PM = window.PM || {};

PM.WaterFx = {

  /* 杖头水球的位置。坐标是**单元格坐标**（580×720，中线 290），与 CHAR_SCALE 无关 ——
   * 换算到画布见 anchor()。存单元格坐标而不是画布坐标，正是为了**改角色缩放不用重标**：
   * 缩放变了，球心跟着同一套变换走，自动还在球上。
   *
   * 这三组数经过两条独立路径互相印证（2026-07-29）：
   *   ① 脚本：逐帧扫高亮青蓝像素（min(G,B)-R>55 且够亮）在上半身取重心 → (120,252)/(107,222)/(152,162)
   *   ② 人眼：preview.html 调参台上逐段点球心 → 折算回单元格坐标后 (119,247)/(105,223)/(157,162)
   * 两条路差 1~5px，取人眼那一组。
   *
   * ⚠️ 中间一版曾是 (71,317)/(53,286)/(119,208)，看着"人眼标的"，其实是错的：
   * 当时调参台漏了 `setScale(CHAR_SCALE)`，把她画成原尺寸，点出来的坐标被 1/0.78 放大了。
   * 而且十字也走 anchor()（乘了 0.78），**两个错误在调参台里互相抵消**，目检完全看不出来。
   * 教训：标定台和游戏的角色尺度必须逐字一致，否则标的是空气；
   * 两条独立路径给出的数差得离谱时，先怀疑量具，别急着写"素材有偏差"的解释。
   *
   * 再往前一版是写死的 (CHAR_X-120, 300)，水从她袖子里喷出来 —— 那是真 bug。
   * 重新生成/替换素材后要重标：调参台「特效」组 → 帧滑杆停到球出现那帧 → ①定球心。
   */
  ORB: {
    water_threat: { x: 119, y: 247, r: 46 },   // 末帧球心（0.78 缩放、画布 900 宽时落在 279, 346）
    cast_windup:  { x: 105, y: 223, r: 32 },   // 这段的球小一圈
    angry_charge: { x: 157, y: 162, r: 40 },   // 蓄力态，位置更高
  },

  /* 水球出现的时机（ms，从动画第 0 帧起算）。也是量出来的：
   * water_threat 前 4 帧手还没抬起来（无青蓝高亮），第 5 帧球才出现 → 417ms；
   * 第 10~11 帧球定住 → 900ms。蓄力就压在球长大的这段里，释放压在球定住那一刻。 */
  CUE: {
    water_threat: { charge: 400, burst: 900 },
    cast_windup:  { charge: 620, burst: 940 },
    angry_charge: { charge: 500, burst: 880 },
  },

  /* 全部可调参数。测试台按这张表生成滑杆，键名即标签。 */
  P: {
    CHARGE_MS:    460,   // 蓄力时长（收束水滴 + 亮环收缩）
    CHARGE_DROPS: 20,    // 向杖头收束的水滴数
    ORB_SWELL:    1.35,  // 蓄力末尾杖头辉光胀到多大

    /* 'camera' = 正对镜头四面铺开（定案）；'cone' = 斜着泼，用下面两个角度参数。
     * camera 模式下 JET_AIM / JET_SPREAD / JET_ACCEL 全都不参与。 */
    JET_MODE:     'camera',

    JET_MS:       260,   // 喷射持续
    JET_RATE:     14,    // 每次发射间隔 ms（越小越密）
    JET_QTY:      3,     // 每次发几颗
    JET_SPREAD:   58,    // 【cone 专用】锥角半宽（度）
    JET_AIM:      62,    // 【cone 专用】主方向（度，0=正右，正数向下）
    JET_SPEED_MIN: 420,
    JET_SPEED_MAX: 1100,
    JET_ACCEL:    1400,   // 顺锥心方向的额外加速度（让水滴尽快飞离她身上）
    JET_SCALE_END: 1.0,  // 末端放多大（"越飞越近"的透视全靠它）
    JET_LIFE:     420,

    TONGUE_N:     6,     // 直冲镜头的大水舌数量
    TONGUE_MS:    380,
    TONGUE_SCALE: 3.0,   // 水舌糊到镜头上时的大小

    SHEET_A:      0.60,  // 扫过全屏的那片水（0 = 关掉）
    SHEET_MS:     320,
    SHEET_SCALE:  7.5,

    SPLAT_N:      26,    // 镜头水珠数量（多而小 > 少而大：大的一律读成泡泡）
    SPLAT_MIN:    0.16,  // 水珠大小区间
    SPLAT_MAX:    0.62,
    SPLAT_HOLD:   260,   // 挂住多久才开始往下淌
    SPLAT_SLIDE:  1500,  // 下淌 + 淡出时长
    SPLAT_FALL:   90,    // 下淌距离上限
    SPLAT_TRAIL:  5,     // 前几颗大水珠拖水痕

    RING_MS:      520,   // 冲击水环扩散时长
    RING_SCALE:   4.2,

    FLASH_A:      0.10,  // 全屏泛蓝（旧版 0.38 的纯白闪太冲，像爆炸不像水）
    FLASH_MS:     260,
    WET_A:        0.13,  // 「镜头湿了」的整体蓝调
    WET_MS:       1500,
    SHAKE_MS:     280,
    SHAKE_AMT:    0.007,
    PUNCH:        0.012, // 相机推近一下（0=关）

    TINT_CORE:    0xe8f7ff,  // 水花高光
    TINT_BODY:    0x8fd2ff,  // 水体
    TINT_DEEP:    0x4a9fe0,  // 水的暗部
  },

  /* 单元格坐标 → 世界坐标。角色 origin(0.5, 0) 贴在 (CHAR_X, CHAR_Y)，按 CHAR_SCALE 缩放，
   * 所以是【缩放 + 平移】。半径也要跟着缩 —— 水球是画在她手上的，她小一号水球还原大
   * 就成了抱着个比脑袋还大的球。测试台里画布尺寸不同，走同一条换算，不会跑偏。 */
  anchor(anim, C) {
    const o = this.ORB[anim] || this.ORB.water_threat;
    const s = C.CHAR_SCALE ?? 1;
    return {
      x: C.CHAR_X + (o.x - C.FRAME_W / 2) * s,
      y: C.CHAR_Y + o.y * s,
      r: o.r * s,
    };
  },

  cue(anim) { return this.CUE[anim] || this.CUE.water_threat; },

  /* ── 贴图（全部代码画，不占素材）──────────────────────────── */
  textures(scene) {
    const P = this.P;
    if (!scene.textures.exists('pm-drop')) {
      // 软边光点：水花的高光核。硬边圆放大后是一坨白球，像棉花不像水
      const s = 64, cv = scene.textures.createCanvas('pm-drop', s, s), ctx = cv.getContext();
      const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, s, s); cv.refresh();
    }

    /* 水珠（贴在镜头上的那种）。整套特效里最关键的一张贴图，也是返工过一次的那张。
     *
     * 第一版画成「一圈均匀的亮轮廓 + 中间半透」，出来的东西**是肥皂泡不是水**（截图确认）：
     * 一圈闭合的高对比亮边 + 正圆 = 泡泡的读法，越大越像。水珠的读法是另外三件事：
     *   ① 中间**偏暗**（折射把背后压暗、压蓝），不是发亮；
     *   ② 亮的只有**一段弧**，在光源的反侧（这里光源定左上 → 亮弧在右下），不闭合；
     *   ③ 一个很小很硬的高光点在左上。
     * 再配合用的时候压扁 + 随机旋转（水珠很少是正圆），就不会再读成泡泡。 */
    if (!scene.textures.exists('pm-bead')) {
      const s = 96, c = s / 2;
      const cv = scene.textures.createCanvas('pm-bead', s, s), ctx = cv.getContext();

      // ① 折射：中间压暗压蓝
      const g = ctx.createRadialGradient(c, c, 0, c, c, c);
      g.addColorStop(0.00, 'rgba(16,44,70,0.34)');
      g.addColorStop(0.62, 'rgba(24,60,92,0.26)');
      g.addColorStop(0.88, 'rgba(90,160,205,0.30)');
      g.addColorStop(1.00, 'rgba(120,190,230,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);

      // ② 亮弧：把亮边的圆心往右下推，只有右下那段落在水珠边缘上 → 天然不闭合
      ctx.save();
      ctx.beginPath(); ctx.arc(c, c, c * 0.99, 0, Math.PI * 2); ctx.clip();
      const rimX = c + s * 0.10, rimY = c + s * 0.13;
      const rim = ctx.createRadialGradient(rimX, rimY, s * 0.30, rimX, rimY, s * 0.52);
      rim.addColorStop(0.00, 'rgba(226,246,255,0)');
      rim.addColorStop(0.72, 'rgba(226,246,255,0.52)');
      rim.addColorStop(1.00, 'rgba(226,246,255,0.05)');
      ctx.fillStyle = rim; ctx.fillRect(0, 0, s, s);
      ctx.restore();

      // ③ 高光点：小而硬，左上
      const h = ctx.createRadialGradient(c - s * 0.19, c - s * 0.21, 0, c - s * 0.19, c - s * 0.21, s * 0.11);
      h.addColorStop(0, 'rgba(255,255,255,0.95)');
      h.addColorStop(0.6, 'rgba(255,255,255,0.35)');
      h.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = h; ctx.fillRect(0, 0, s, s);
      cv.refresh();
    }

    /* 空中的水团，**正对镜头**看到的那一面。和 pm-tear 是两回事：
     * 拖成水滴形是"从你眼前横着飞过去"的读法（长轴＝运动方向）；
     * 冲着你脸来的水团是**正面**看，看不到拖尾，只看到一团越来越大的水 ——
     * 所以这张是圆的、不需要旋转，靠"边飞边胀"卖距离。
     * 比 pm-bead（贴镜头上的）亮得多：空中的水是被光照着的，镜头上的水只有折射。 */
    if (!scene.textures.exists('pm-blob')) {
      const s = 96, c = s / 2;
      const cv = scene.textures.createCanvas('pm-blob', s, s), ctx = cv.getContext();
      const g = ctx.createRadialGradient(c - s * 0.08, c - s * 0.10, s * 0.05, c, c, c * 0.98);
      g.addColorStop(0.00, 'rgba(244,253,255,0.95)');
      g.addColorStop(0.34, 'rgba(178,228,255,0.80)');
      g.addColorStop(0.72, 'rgba(110,186,238,0.62)');
      g.addColorStop(0.92, 'rgba(226,246,255,0.72)');   // 亮边（整圈，正面看确实是整圈）
      g.addColorStop(1.00, 'rgba(226,246,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
      const h = ctx.createRadialGradient(c - s * 0.20, c - s * 0.22, 0, c - s * 0.20, c - s * 0.22, s * 0.14);
      h.addColorStop(0, 'rgba(255,255,255,0.98)');
      h.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = h; ctx.fillRect(0, 0, s, s);
      cv.refresh();
    }

    /* 不规则水渍：主水珠 + 一圈卫星小珠（溅上去的水从来不是一颗正圆）。
     * 每一颗都按 pm-bead 的三件事画：暗折射芯 + 右下亮弧 + 左上高光。 */
    if (!scene.textures.exists('pm-smear')) {
      const s = 128, cv = scene.textures.createCanvas('pm-smear', s, s), ctx = cv.getContext();
      const blob = (x, y, r, a) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0.00, `rgba(16,44,70,${a * 0.34})`);
        g.addColorStop(0.66, `rgba(28,66,98,${a * 0.24})`);
        g.addColorStop(0.90, `rgba(96,166,210,${a * 0.30})`);
        g.addColorStop(1.00, 'rgba(120,190,230,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        // 右下亮弧
        ctx.save();
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
        const rx = x + r * 0.22, ry = y + r * 0.28;
        const rim = ctx.createRadialGradient(rx, ry, r * 0.58, rx, ry, r * 1.02);
        rim.addColorStop(0.0, 'rgba(226,246,255,0)');
        rim.addColorStop(0.75, `rgba(226,246,255,${a * 0.5})`);
        rim.addColorStop(1.0, 'rgba(226,246,255,0.04)');
        ctx.fillStyle = rim; ctx.fillRect(x - r, y - r, r * 2, r * 2);
        ctx.restore();
        // 左上高光
        const h = ctx.createRadialGradient(x - r * 0.36, y - r * 0.4, 0, x - r * 0.36, y - r * 0.4, r * 0.22);
        h.addColorStop(0, `rgba(255,255,255,${a * 0.9})`);
        h.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = h; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      };
      blob(62, 58, 33, 1);
      blob(44, 44, 15, 0.9); blob(90, 52, 12, 0.85);
      blob(52, 90, 11, 0.8); blob(86, 86, 9, 0.75);
      blob(28, 72, 6, 0.7);  blob(102, 76, 5, 0.7); blob(70, 22, 6, 0.7);
      cv.refresh();
    }

    /* 空中的水滴（喷射用）。和贴在镜头上的水珠不是一回事：
     * 空中的水是**被照亮**的，偏亮偏实，而且拖成水滴形（圆头在前、尖尾在后）——
     * rotate 与飞行角一致，0° 朝右，所以圆头画在右边。
     * 用软光斑当空中水滴的话（旧版就是），一团糊的亮斑读作蒸汽/雾。 */
    if (!scene.textures.exists('pm-tear')) {
      const w = 96, h = 48, cy = h / 2;
      const cv = scene.textures.createCanvas('pm-tear', w, h), ctx = cv.getContext();
      ctx.beginPath();
      ctx.moveTo(2, cy);                                   // 尖尾
      ctx.quadraticCurveTo(w * 0.45, cy - h * 0.42, w - 18, cy - h * 0.40);
      ctx.arc(w - 18, cy, h * 0.40, -Math.PI / 2, Math.PI / 2);   // 圆头
      ctx.quadraticCurveTo(w * 0.45, cy + h * 0.42, 2, cy);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0.00, 'rgba(240,252,255,0.95)');
      g.addColorStop(0.42, 'rgba(176,226,255,0.90)');
      g.addColorStop(1.00, 'rgba(74,140,200,0.85)');
      ctx.fillStyle = g; ctx.fill();
      // 头部高光
      const sp = ctx.createRadialGradient(w - 22, cy - 5, 0, w - 22, cy - 5, 10);
      sp.addColorStop(0, 'rgba(255,255,255,0.95)');
      sp.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sp; ctx.fill();
      cv.refresh();
    }

    /* 扫过全屏的那片水。**不能**拿 pm-smear 放大 20 倍来充数 ——
     * 软光斑放大之后没有任何结构，读作一层蓝雾/滤镜，不是水。
     * 水面/水幕的读法是**条纹**：一道道被拉长的高光，越快越长。
     * 所以这张贴图画的是十几条横向水条，放大后条纹还在，方向感也还在。 */
    if (!scene.textures.exists('pm-sheet')) {
      const w = 256, h = 160;
      const cv = scene.textures.createCanvas('pm-sheet', w, h), ctx = cv.getContext();
      const rnd = (a, b) => a + Math.random() * (b - a);
      /* 条纹要**够狠**：淡条纹放大到全屏之后就是一层雾，和"水"没关系。
       * 亮芯接近不透明、条纹之间留黑（不填满），放大后才还看得出是一道道水。 */
      for (let i = 0; i < 26; i++) {
        const y = rnd(6, h - 6), len = rnd(w * 0.35, w * 0.95), th = rnd(2.5, 11);
        const x = rnd(-20, w - len + 20);
        const g = ctx.createLinearGradient(x, 0, x + len, 0);
        const a = rnd(0.45, 0.98);
        g.addColorStop(0, 'rgba(190,230,255,0)');
        g.addColorStop(0.35, `rgba(206,240,255,${a})`);
        g.addColorStop(0.7, `rgba(150,210,250,${a * 0.8})`);
        g.addColorStop(1, 'rgba(150,210,250,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(x + len / 2, y, len / 2, th / 2, 0, 0, Math.PI * 2); ctx.fill();
      }
      // 上下边缘揉开，免得放大后看得见贴图的直边
      const fade = ctx.createLinearGradient(0, 0, 0, h);
      fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(0.18, 'rgba(0,0,0,0)');
      fade.addColorStop(0.82, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = fade; ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
      cv.refresh();
    }

    // 细环：蓄力收缩环 + 释放冲击环共用（ADD）
    if (!scene.textures.exists('pm-ring')) {
      const s = 128, c = s / 2;
      const cv = scene.textures.createCanvas('pm-ring', s, s), ctx = cv.getContext();
      const g = ctx.createRadialGradient(c, c, 0, c, c, c);
      g.addColorStop(0.00, 'rgba(255,255,255,0)');
      g.addColorStop(0.72, 'rgba(150,215,255,0)');
      g.addColorStop(0.88, 'rgba(214,242,255,0.85)');
      g.addColorStop(0.97, 'rgba(160,220,255,0.30)');
      g.addColorStop(1.00, 'rgba(160,220,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, s, s); cv.refresh();
    }

    // 水痕：水珠往下淌拖的那条竖痕（上窄下宽，顶端接着水珠）
    if (!scene.textures.exists('pm-trail')) {
      const w = 24, h = 128;
      const cv = scene.textures.createCanvas('pm-trail', w, h), ctx = cv.getContext();
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(198,234,255,0.55)');
      g.addColorStop(1, 'rgba(198,234,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(w / 2 - 5, h); ctx.lineTo(w / 2 + 5, h);
      ctx.lineTo(w / 2 + 1.5, 0); ctx.lineTo(w / 2 - 1.5, 0);
      ctx.closePath(); ctx.fill();
      cv.refresh();
    }
  },

  /* ── 编排：蓄 → 泼 ────────────────────────────────────────────
   * @param opts.anim     用哪段素材的球心/节奏（默认 water_threat）
   * @param opts.reduced  prefers-reduced-motion：去掉抖屏/推镜、粒子减半
   * @param opts.depth    特效基准 depth（角色是 5、暗角 19）
   * @param opts.onBurst  释放那一刻的回调（放音效用）
   * @param opts.timeScale 慢放系数（只有 preview.html 的调参台会传）
   * @return handle.cancel() —— 表演被抢占时**必须**调，否则人已经归位了水才泼出来
   */
  cast(scene, opts = {}) {
    const anim = opts.anim || 'water_threat';
    const cue = this.cue(anim);
    const handle = { events: [], done: false };
    handle.cancel = () => {
      handle.done = true;
      for (const e of handle.events) if (e) e.remove(false);
      handle.events.length = 0;
    };
    handle.events.push(scene.time.delayedCall(cue.charge, () => {
      if (!handle.done) this.charge(scene, opts);
    }));
    handle.events.push(scene.time.delayedCall(cue.burst, () => {
      if (handle.done) return;
      if (opts.onBurst) opts.onBurst();
      this.burst(scene, opts);
    }));
    return handle;
  },

  /* ① 蓄：水滴向杖头收束 + 亮环收缩 + 辉光胀大。 */
  charge(scene, opts = {}) {
    const C = PM.Config, P = this.P;
    this.textures(scene);
    const a = this.anchor(opts.anim || 'water_threat', C);
    const depth = opts.depth ?? 40;
    const n = opts.reduced ? Math.round(P.CHARGE_DROPS / 2) : P.CHARGE_DROPS;

    /* 收束的是**拉长的水滴**不是光点：素材里杖头本来就有一团亮，
     * 再往上叠几个小亮点等于没加（第一版就是这样，截图上根本看不出蓄了力）。
     * 拉长 + 尖尾朝外 + 从画面更远处飞进来，才看得出"水正在被吸过去"。 */
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = a.r * Phaser.Math.FloatBetween(4.5, 9);
      const d = scene.add.image(a.x + Math.cos(ang) * dist, a.y + Math.sin(ang) * dist, 'pm-tear')
        .setDepth(depth).setTint(P.TINT_CORE).setBlendMode(Phaser.BlendModes.ADD)
        .setRotation(ang + Math.PI)                       // 圆头朝球心（贴图 0° 圆头朝右）
        .setScale(Phaser.Math.FloatBetween(0.22, 0.42), Phaser.Math.FloatBetween(0.14, 0.24))
        .setAlpha(0);
      scene.tweens.add({
        targets: d, alpha: { from: 0, to: 1 },
        x: a.x, y: a.y, scaleX: 0.08, scaleY: 0.05,
        ease: 'Quad.easeIn',
        delay: i * (P.CHARGE_MS / n) * 0.5,
        duration: P.CHARGE_MS * Phaser.Math.FloatBetween(0.55, 1),
        onComplete: () => d.destroy(),
      });
    }

    // 收缩环：从大缩到球面，落点即释放点
    const ring = scene.add.image(a.x, a.y, 'pm-ring')
      .setDepth(depth).setTint(P.TINT_CORE).setBlendMode(Phaser.BlendModes.ADD)
      .setScale(a.r * 7 / 64).setAlpha(0);
    scene.tweens.add({
      targets: ring, alpha: { from: 0, to: 0.85 }, scale: a.r * 1.1 / 64,
      duration: P.CHARGE_MS, ease: 'Quad.easeIn',
      onComplete: () => ring.destroy(),
    });

    // 杖头辉光：跟着涨，给"要炸了"的压力
    const glow = scene.add.image(a.x, a.y, 'pm-drop')
      .setDepth(depth - 1).setTint(P.TINT_BODY).setBlendMode(Phaser.BlendModes.ADD)
      .setScale(a.r * 1.4 / 32).setAlpha(0);
    scene.tweens.add({
      targets: glow, alpha: 0.55, scale: a.r * 1.4 / 32 * P.ORB_SWELL,
      duration: P.CHARGE_MS, ease: 'Sine.easeIn',
      onComplete: () => scene.tweens.add({
        targets: glow, alpha: 0, duration: 160, onComplete: () => glow.destroy(),
      }),
    });
  },

  /* ② + ③ 泼：喷射 + 大水舌冲脸 + 镜头水珠 + 全屏反应。
   *
   * ── 两种喷法，默认 camera ─────────────────────────────────
   * `camera`（正对镜头，**定案用这个**）：水从球心朝**四面八方**铺开、边飞边胀。
   *   二维画面里"冲着你来"的透视就长这样 —— 从一个点向外放射地涨大，
   *   和你贴着镜头看烟花/被泼一脸是同一个几何。所以这个模式下：
   *     · 角度 0~360，不挑方向（挑了方向就是"往那边泼"，不是"往你脸上泼"）；
   *     · 水团用 pm-blob（正面看的圆水团），**不拖尾** —— 正对着你飞的水看不到拖尾，
   *       拖尾是横穿视野才有的；
   *     · scale 用 easeIn 加速涨大 = 越来越近；
   *     · 重力压很小 —— 明显往下掉会读成"往斜下方飞"，把正面感破坏掉。
   * `cone`（斜着泼）：保留旧的锥形，靠 JET_AIM / JET_SPREAD 指方向。调参台可切换对比。
   */
  burst(scene, opts = {}) {
    const C = PM.Config, P = this.P;
    this.textures(scene);
    const a = this.anchor(opts.anim || 'water_threat', C);
    const depth = opts.depth ?? 40;
    const reduced = !!opts.reduced;
    const W = C.WIDTH, H = C.HEIGHT;
    const headOn = P.JET_MODE !== 'cone';

    /* 冲击环：球面炸开的第一帧，给喷射一个"起点在这儿"的锚 */
    const ring = scene.add.image(a.x, a.y, 'pm-ring')
      .setDepth(depth).setTint(P.TINT_CORE).setBlendMode(Phaser.BlendModes.ADD)
      .setScale(a.r * 0.8 / 64).setAlpha(0.9);
    scene.tweens.add({
      targets: ring, scale: a.r * P.RING_SCALE / 64, alpha: 0,
      duration: P.RING_MS, ease: 'Cubic.easeOut', onComplete: () => ring.destroy(),
    });

    /* 锥形喷射。两层叠着发：
     *   水体层 pm-bead（NORMAL）—— 是"水"；
     *   高光层 pm-drop（ADD，量少）—— 是"溅起来的那点光"。
     * 只有 ADD 层时整团发光像蒸汽；只有水体层时又太闷，两层一起才成立。 */
    const cone = headOn ? { min: 0, max: 360 }
                        : { min: P.JET_AIM - P.JET_SPREAD, max: P.JET_AIM + P.JET_SPREAD };
    const qty = reduced ? Math.max(1, Math.round(P.JET_QTY / 2)) : P.JET_QTY;

    const body = headOn ? scene.add.particles(a.x, a.y, 'pm-blob', {
      speed: { min: P.JET_SPEED_MIN * 0.5, max: P.JET_SPEED_MAX * 0.7 },
      angle: cone,
      // easeIn：越接近寿命末尾涨得越快 = 越来越近。线性涨大读作"雾在扩散"
      scale: { start: 0.10, end: P.JET_SCALE_END * 2.2, ease: 'Cubic.easeIn' },
      alpha: { start: 1, end: 0, ease: 'Quad.easeIn' },
      lifespan: { min: P.JET_LIFE * 0.55, max: P.JET_LIFE },
      quantity: qty, frequency: P.JET_RATE,
      gravityY: 60,                       // 正面感优先，几乎不让它掉
      tint: [P.TINT_BODY, P.TINT_CORE],
      blendMode: Phaser.BlendModes.NORMAL,
    }).setDepth(depth) : scene.add.particles(a.x, a.y, 'pm-tear', {
      speed: { min: P.JET_SPEED_MIN, max: P.JET_SPEED_MAX },
      angle: cone,
      rotate: cone,                       // 水滴圆头朝飞行方向（贴图 0° 朝右，锥角即旋转角）
      scaleX: { start: 0.45, end: P.JET_SCALE_END * 1.5 },    // 沿飞行方向拉长 = 速度感
      scaleY: { start: 0.45, end: P.JET_SCALE_END * 0.9 },
      alpha: { start: 1, end: 0.15 },
      lifespan: { min: P.JET_LIFE * 0.6, max: P.JET_LIFE },
      quantity: qty, frequency: P.JET_RATE,
      gravityY: 320,                      // 水会掉，直线飞出去的是激光不是水
      /* 朝锥心方向再加一份加速度：水滴要**尽快离开她身上**。
       * 没有它时，水滴慢悠悠飘在她胸口，读作"她把自己浇了"而不是"泼向镜头"。 */
      accelerationX: Math.cos(P.JET_AIM * Math.PI / 180) * P.JET_ACCEL,
      accelerationY: Math.sin(P.JET_AIM * Math.PI / 180) * P.JET_ACCEL,
      tint: [P.TINT_BODY, P.TINT_CORE, P.TINT_DEEP],
      blendMode: Phaser.BlendModes.NORMAL,
    }).setDepth(depth);

    const spark = scene.add.particles(a.x, a.y, 'pm-drop', {
      speed: { min: P.JET_SPEED_MIN * 1.2, max: P.JET_SPEED_MAX * 1.3 },
      angle: cone,
      gravityY: headOn ? 40 : 200,
      scale: { start: 0.10, end: 0.42 },
      alpha: { start: 0.85, end: 0 },
      lifespan: { min: 240, max: 460 },
      quantity: Math.max(1, qty - 1), frequency: P.JET_RATE * 1.6,
      tint: P.TINT_CORE,
      blendMode: Phaser.BlendModes.ADD,
    }).setDepth(depth + 1);

    for (const em of [body, spark]) {
      // 慢放（测试台）：粒子不吃 time.timeScale，要单独给，否则慢放时只有它按原速跑
      if (opts.timeScale) em.timeScale = opts.timeScale;
      scene.time.delayedCall(P.JET_MS, () => em.stop());
      scene.time.delayedCall(P.JET_MS + P.JET_LIFE + 200, () => em.destroy());
    }

    /* 大水舌：直接朝镜头糊过来的几团。粒子做不出这个 ——
     * 它需要的是"边飞边胀到糊住镜头然后化开"，用 tween 精确控制。
     * 这才是"冲着你来"的主力，粒子只是陪衬。 */
    const tn = reduced ? 2 : P.TONGUE_N;
    for (let i = 0; i < tn; i++) {
      /* 落点**冲出画面**（不是停在画面里淡掉）：停在画面里淡掉读作"雾散了"，
       * 冲出去才读作"从你脸上刮过去了"。camera 模式下方向铺满 360° ——
       * 从球心向四面散开地掠过镜头，正是"贴脸炸开"的几何。 */
      const ang = headOn
        ? Phaser.Math.FloatBetween(0, Math.PI * 2)
        : (P.JET_AIM + Phaser.Math.Between(-P.JET_SPREAD, P.JET_SPREAD)) * Math.PI / 180;
      const far = Math.max(W, H) * 1.15;
      const tx = a.x + Math.cos(ang) * far;
      const ty = a.y + Math.sin(ang) * far;
      const t = scene.add.image(a.x, a.y, 'pm-sheet')
        .setDepth(depth + 2).setTint(i % 3 === 0 ? P.TINT_CORE : P.TINT_BODY).setAlpha(0)
        .setScale(0.3, 0.22).setRotation(ang);   // 条纹顺着飞行方向 = 速度感
      const sc = P.TONGUE_SCALE * Phaser.Math.FloatBetween(0.7, 1.25);
      scene.tweens.add({
        targets: t, x: tx, y: ty,
        scaleX: sc * 1.5, scaleY: sc * 0.8,
        alpha: { from: 0.9, to: 0.9 },          // 过境时【不】淡，出画前才撒手
        ease: 'Quad.easeIn',
        delay: i * 26,
        duration: P.TONGUE_MS * Phaser.Math.FloatBetween(0.8, 1.3),
        onComplete: () => t.destroy(),
      });
      scene.tweens.add({
        targets: t, alpha: 0, delay: i * 26 + P.TONGUE_MS * 0.62,
        duration: P.TONGUE_MS * 0.5,
      });
    }

    /* 泼中的那一下：一整片水从杖头方向扫过整个画面。
     * 这是"被泼到"和"她那边冒了点水花"的分水岭 —— 水舌是几团，这是一片，
     * 观众要先被整片糊一下，后面挂在镜头上的水珠才有来处。
     * 只在这一下里存在（SHEET_MS 很短），久了就成蓝滤镜了。 */
    const sheet = scene.add.image(a.x, a.y, 'pm-sheet')
      .setDepth(depth + 2).setTint(P.TINT_BODY).setAlpha(0)
      .setScale(0.5, 0.35)
      // camera 模式：这片水是**糊到镜头上**的，不是从旁边扫过去的 ——
      // 所以它不跑向某个方向，而是原地从球心涨开、把画面吃掉。
      .setRotation(headOn ? Phaser.Math.FloatBetween(-0.35, 0.35) : P.JET_AIM * Math.PI / 180);
    scene.tweens.add({
      targets: sheet,
      x: headOn ? a.x + (W / 2 - a.x) * 0.55 : W * 0.52,
      y: headOn ? a.y + (H / 2 - a.y) * 0.55 : H * 0.55,
      scaleX: P.SHEET_SCALE * 1.6, scaleY: P.SHEET_SCALE * (headOn ? 1.15 : 0.62),
      alpha: { from: 0, to: P.SHEET_A },
      duration: P.SHEET_MS * 0.4, ease: 'Quad.easeOut',
      onComplete: () => scene.tweens.add({
        targets: sheet, alpha: 0, scaleX: P.SHEET_SCALE * 2.4, scaleY: P.SHEET_SCALE * 0.95,
        duration: P.SHEET_MS * 0.6, onComplete: () => sheet.destroy(),
      }),
    });

    /* ③ 镜头水珠：溅上 → 挂住 → 往下淌。
     * 挂住那 SPLAT_HOLD 毫秒是有意的：水珠先"钉"在玻璃上不动，
     * 攒够重量才开始滑 —— 一溅上就往下走的话像雨刷刮过，不像被泼。 */
    const sn = reduced ? Math.round(P.SPLAT_N / 2) : P.SPLAT_N;
    scene.time.delayedCall(reduced ? 0 : 110, () => {
      for (let i = 0; i < sn; i++) {
        const big = i < P.SPLAT_TRAIL;
        /* 落点**以球心为中心向外铺**（不是全屏均匀撒）：正对镜头泼过来的水，
         * 溅在镜头上的密度当然是中心密、边缘疏。均匀撒会读作"下雨了"。
         * 指数 0.65 让它偏中心但仍能铺到边角；夹回画面内，免得整片糊在角上。 */
        let x, y;
        if (headOn) {
          const ang = Phaser.Math.FloatBetween(0, Math.PI * 2);
          const d0 = Math.pow(Math.random(), 0.65) * Math.max(W, H) * 0.78;
          x = Phaser.Math.Clamp(a.x + Math.cos(ang) * d0, 40, W - 40);
          y = Phaser.Math.Clamp(a.y + Math.sin(ang) * d0, 40, H - 90);
        } else {
          x = Phaser.Math.Between(40, W - 40);
          y = Phaser.Math.Between(40, H - 90);
        }
        const sc = big
          ? Phaser.Math.FloatBetween(P.SPLAT_MAX * 0.75, P.SPLAT_MAX)
          : Phaser.Math.FloatBetween(P.SPLAT_MIN, P.SPLAT_MAX * 0.7);
        /* 压扁 + 随机转向：正圆是泡泡，椭圆才是水珠（贴图那条注释的第三件事）。
         * 大水珠压得更扁 —— 挂不住自重的那种。 */
        const squash = Phaser.Math.FloatBetween(big ? 0.62 : 0.75, 0.95);
        const key = i % 3 === 0 ? 'pm-smear' : 'pm-bead';
        const d = scene.add.image(x, y, key)
          .setDepth(depth + 3).setAlpha(0).setScale(sc * 0.55, sc * 0.55 * squash)
          .setRotation(Phaser.Math.FloatBetween(-0.5, 0.5));

        const trail = big ? scene.add.image(x, y, 'pm-trail')
          .setDepth(depth + 2).setAlpha(0).setOrigin(0.5, 1)
          .setScale(sc * 1.1, 0.05) : null;

        scene.tweens.add({
          targets: d, alpha: Phaser.Math.FloatBetween(0.7, 1),
          scaleX: sc, scaleY: sc * squash,
          duration: 110, delay: i * 12, ease: 'Back.easeOut',
          onComplete: () => {
            const fall = big ? P.SPLAT_FALL : Phaser.Math.Between(10, P.SPLAT_FALL * 0.5);
            const ms = Phaser.Math.Between(P.SPLAT_SLIDE * 0.6, P.SPLAT_SLIDE);
            scene.tweens.add({
              targets: d, y: d.y + fall, alpha: 0, scaleY: sc * 0.8,
              delay: P.SPLAT_HOLD, duration: ms, ease: 'Sine.easeIn',
              onComplete: () => d.destroy(),
            });
            if (trail) {
              // 水痕跟着水珠长出来，尾巴钉在起点
              trail.y = d.y;
              scene.tweens.add({
                targets: trail, alpha: { from: 0, to: 0.5 },
                scaleY: fall / 128, delay: P.SPLAT_HOLD,
                duration: ms * 0.55, ease: 'Sine.easeIn',
                onComplete: () => scene.tweens.add({
                  targets: trail, alpha: 0, duration: ms * 0.45,
                  onComplete: () => trail.destroy(),
                }),
              });
              scene.tweens.add({
                targets: trail, y: d.y + fall, delay: P.SPLAT_HOLD,
                duration: ms, ease: 'Sine.easeIn',
              });
            }
          },
        });
      }
    });

    /* 全屏反应：一次泛蓝闪 + 一层慢慢退的"镜头湿了"。
     * 闪必须偏蓝且比旧版弱 —— 0.38 的白闪读作爆炸，水不该那么亮。 */
    const flash = scene.add.rectangle(W / 2, H / 2, W, H, 0x8fd2ff, P.FLASH_A)
      .setDepth(depth + 4).setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({ targets: flash, alpha: 0, duration: P.FLASH_MS, onComplete: () => flash.destroy() });

    const wet = scene.add.rectangle(W / 2, H / 2, W, H, 0x4a9fe0, 0)
      .setDepth(depth + 3);
    scene.tweens.add({
      targets: wet, alpha: { from: P.WET_A, to: 0 },
      duration: P.WET_MS, ease: 'Sine.easeOut', onComplete: () => wet.destroy(),
    });

    if (!reduced && scene.cameras && scene.cameras.main) {
      scene.cameras.main.shake(P.SHAKE_MS, P.SHAKE_AMT);
      if (P.PUNCH > 0) {
        const cam = scene.cameras.main;
        scene.tweens.add({
          targets: cam, zoom: 1 + P.PUNCH, duration: 90, yoyo: true, ease: 'Quad.easeOut',
          onComplete: () => { cam.zoom = 1; },
        });
      }
    }
  },
};
