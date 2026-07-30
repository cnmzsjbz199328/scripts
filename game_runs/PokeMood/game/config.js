/* PokeMood — 调参与静态数据
 * 加载顺序：_engine/* → config → regions → reactions → systems/* → scenes/* → main
 */
window.PM = window.PM || {};

/* 画布宽度随屏幕比例伸缩。
 * 角色单元格固定 580×720，画布高度也固定 720，只有左右留白是可变的：
 * 宽屏（PC）给满 900 让气泡舒展；竖屏手机收到 660，Scale.FIT 之后上下黑边才不会
 * 吃掉半个屏幕。CHAR_X 恒等于 WIDTH/2，所有区域坐标都是相对它算的，收窄不影响命中。 */
function pmCanvasWidth() {
  const MIN = 660, MAX = 900, H = 720;
  const vw = (typeof window !== 'undefined' && window.innerWidth)  || MAX;
  const vh = (typeof window !== 'undefined' && window.innerHeight) || H;
  // 想让画布刚好铺满屏宽时需要的画布宽度（= 屏幕比例 × 画布高）
  return Math.round(Math.min(MAX, Math.max(MIN, (vw / vh) * H)));
}
const PM_W = pmCanvasWidth();

/* 角色缩放。素材单元格 580×720 = 画布满高，1.0 时她比书架/壁炉整整大一号，
 * 像贴在背景前的立绘而不是站在屋里的人。缩放【锚在靴底】而不是顶边：
 * FOOT_Y 是三层背景共用的定标靶子，脚不动 = 背景一个数都不用重量。
 * 所有挂在她身上的东西（柔光/阴影/法阵/气泡/可触区/水球锚点）一律按 DRAW_*
 * 换算，改这一个数就整体跟着走，别在别处再写死像素。 */
/* 0.78 是比着 tower 的书架挑的：她的帽顶刚好齐书架顶，站在屋里的比例才成立。
 * 再小（0.70）房间是对了，但她不再是主角、可触区也开始不好戳；
 * 再大（0.90+）就退回"比家具大一号的立绘"。 */
const PM_CHAR_SCALE = 0.78;
const PM_FOOT_Y = 715;          // 靴底在画布上的 y（背景定标靶子，缩放时保持不动）

/* 纯触屏设备（手机/平板）—— 用「指针精度」判，不用屏幕宽度：
 * 要区分的是有没有键盘，不是屏幕多大。窄窗口的桌面浏览器仍然算 fine。
 * 刻意**不**给 webdriver 开后门：无头跑移动端模拟时要能测到真实行为，
 * 而且现有两道门都不断言这行提示，藏掉它不影响验证。 */
PM.isTouchOnly = function () {
  if (typeof window === 'undefined') return false;
  return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
};

PM.Config = {
  // ── 画布 / 贴图 ──────────────────────────────────────────────
  WIDTH: PM_W,
  HEIGHT: 720,
  FRAME_W: 580,          // 所有动画段共用的单元格（见 MATERIALS.md 的固定裁剪窗）
  FRAME_H: 720,
  ATLAS_COLS: 7,         // assemble 按 4096 纹理上限算出来的列数
  CHAR_SCALE: PM_CHAR_SCALE,
  DRAW_W: 580 * PM_CHAR_SCALE,   // 角色在画布上的实际占位（单元格 × 缩放）
  DRAW_H: 720 * PM_CHAR_SCALE,
  CHAR_X: PM_W / 2,      // 角色中心 x（origin 0.5, 0）
  CHAR_Y: PM_FOOT_Y - 720 * PM_CHAR_SCALE,   // 顶边由靴底反推，缩放不移动脚下

  // ── 背景三层（魔女工房·塔内）────────────────────────────────
  // 架构照搬 BladeTrinity：三层各自贴顶居中、超出画布的部分自然裁掉，
  // 地面线【不写进提示词去赌】，而是在装配侧吸收 —— 每层量出关键线，
  // 单独定标 scale = 目标屏幕 y ÷ 源图实测 y。重新生图后必须重跑
  // tools/measure-bg.mjs 并回填下面这几个数（源图统一 1440×1152）。
  //
  // 实测（2026-07-28，tools/measure-bg.mjs）与取值理由：
  //   far   墙脚/近处地板交界 y≈989 → 715/989 = 0.723
  //         （最强水平边量到的 653 是平台后沿，照它定标角色会站到半空）
  //   mid   已重生图两轮，地板远沿 y≈772（中央 60% 实测）→ 0.660 落在画布 509，
  //         脚下留出 210px 深的地板；站位线 715 反推回源图 1083，落在地板中前部、
  //         在书架脚之前，透视上她比家具更靠近镜头，正确。
  //         ⚠️ 这层【别按站位线定标】：地板深了以后能站的是一整段不是一条线，
  //           定标要盯【远沿】，站位线用 FOOT_Y 反推回去验证合不合理即可。
  //         ⚠️ 这层的 scale 还被【前景两侧画框】卡着，不能只看构图挑：
  //           前景左右列的内缘在画布 180 / 698，中景家具必须落在这条缝里才看得见。
  //           家具在源图的 x 位置决定了 canvas_x = 450 - 720s + srcX·s ——
  //           家具越靠源图边缘，放大越把它推出画面。v2 那版家具贴在最外 25%，
  //           无论放大缩小都躲不开前景，坩埚整个不见；v3 要求家具画在 8~35% /
  //           65~95%，0.660 下书架内缘 315、壁炉内缘 608，正好都在缝里。
  //         生图提示词的两条硬要求（都是踩过的坑）：家具底座必须压在地板上、
  //         之间不许留绿；家具不许贴边，要画在画面内侧。
  //   fore  底部石板条顶边 y≈1046 → 目标 690（靴底上方 25px）= 0.660
  //         首版 0.669 只露 20px，那条石板暗且窄，肉眼根本没注意到有前景压边
  //         只吃 15px，够压住底边、不吃掉靴子 —— 腿是可触区，遮了就是
  //         「看得见摸得着但被挡住」的错位（BT 是小人可以盖 10px，这里角色占满整幅）
  //
  // ⚠️ fore 的 scaleX 是必需的，不是调味。两侧列内缘在源图的 27.7%(x=399) /
  //    70.5%(x=1015)，等比铺开（0.669）后右列内缘落在 CHAR_X+197，而角色斗篷右缘
  //    在 CHAR_X+245 —— 帷幔和烛台会盖住一截。内缘相对画布中心的位移是
  //    (1015-720)×scaleX，要它 ≥245 就得 scaleX ≥ 0.83，取 0.84（内缘 CHAR_X±248/-270）。
  //    纵向仍按地面线定标，不受影响。横向拉伸比 0.84/0.669 = 1.26，前景本来就是
  //    soft focus 的画框，看不出来。
  //    注意这几个数都是【相对 CHAR_X】算的，所以画布宽度自适应（660~900）不影响结论；
  //    七个可触区最右也只到 CHAR_X+96，交互无论如何不会被遮。
  BG: {
    SRC_W: 1440, SRC_H: 1152,
    FOOT_Y: PM_FOOT_Y,           // 靴底在画布上的 y，三层定标共用的靶子
    DEPTH: { far: -100, mid: -60, fore: 18 },   // 层序固定，逐场景只变 scale
    PAR:   { far: 5,    mid: 13,  fore: 30 },   // 指针视差系数，同上
  },

  /* ── 场景表（多背景）────────────────────────────────────────
   * 每个场景 = assets/bg/<dir>/{far,mid,fore}.webp + 一组定标 + 一组气氛覆盖。
   * 贴图 key 是 `bg_<dir>_<层>`，由 BootScene 按本表拼，别在别处硬编码。
   *
   * scale 三个数**全部是量出来的不是挑出来的**：跑
   *   node tools/process-bg.mjs --scene=<dir> && node tools/measure-bg.mjs --scene=<dir>
   * 脚本会直接给出 `→ scale x.xxx` 和两条落位检查（mid 家具在不在前景缝里、
   * fore 要多大 scaleX 才不盖斗篷）。取值理由逐场景记在下面各自的注释里。
   * 重新生图后必须重量并回填 —— 换了图不重量，角色就会站进墙里或浮在半空。
   *
   * atmos 是对 ATMOS 基表的**浅覆盖**（只写与基表不同的键）。基表本身就是 tower 的值，
   * 所以 tower 的 atmos 是空的。气氛是纯代码，换场景的"味道"主要靠这里，
   * 比重画一张图便宜得多：光柱颜色/宽窄、雾带浓淡、暗角、光尘色温、柔光底色。 */
  SCENES: [
    {
      id: 'tower', dir: 'tower', name: '魔女工房', sub: '塔内',
      // far 候选 #2 y=989 是墙脚/近处地板交界（#1 的 653 是平台后沿，照它定标会站到半空）
      // mid 盯【远沿】772 定标 0.660（不是站位线）；fore 底部石板条顶边 1046 → 0.660
      // fore 的 scaleX 0.84 是硬需求：0.669 时右内缘落在 CHAR_X+197，会盖住斗篷右缘(+245)
      scale: { far: 0.723, mid: 0.660, fore: 0.660 }, foreScaleX: 0.84,
      atmos: {},
    },
    {
      id: 'terrace', dir: 'terrace', name: '月夜露台', sub: '塔顶',
      // fore 底部石板条顶边 1021 → 690；mid 地板远沿 781 → 515；far 是纯天空+远山，
      // 0.723 下地平线落在栏杆之后，看着对。fore 两侧柱子本来就画得靠外
      // （内缘 288/1145），等比铺开就已经在斗篷之外，不需要 scaleX。
      scale: { far: 0.723, mid: 0.660, fore: 0.676 }, foreScaleX: null,
      // 夜景：光源是月亮不是玫瑰窗 —— 光柱收窄压淡（月光不是丁达尔光锥），
      // 冷蓝白；暗角加重把画面压成夜；光尘走清冷的银蓝
      atmos: {
        SHAFT_W: 220, SHAFT_H: 660, SHAFT_COLOR: 0xbcd4ff, SHAFT_ALPHA: 0.14,
        HALO_TINT: 0x2b3f6e, DUST_BACK_TINT: 0xd6e6ff, DUST_FRONT_TINT: 0xaec8ff,
        MIST_ALPHA: 0.22, VIGNETTE: 0.62,
      },
    },
    {
      id: 'library', dir: 'library', name: '魔法图书馆', sub: '穹顶',
      // far 最强边 1014 是地板/书墙交界 → 0.705；mid 远沿 662 → 509；fore 底条 977 → 690。
      // fore 右内缘 1080 等比落在画布 704，刚好在斗篷(695)外，不用 scaleX。
      scale: { far: 0.705, mid: 0.769, fore: 0.706 }, foreScaleX: null,
      // 室内暖烛光：光源是吊灯，光柱最宽最柔；暗角略轻（书墙本来就暗，再压就糊）
      atmos: {
        SHAFT_W: 340, SHAFT_H: 600, SHAFT_COLOR: 0xffd9a0, SHAFT_ALPHA: 0.18,
        HALO_TINT: 0x5a4326, DUST_BACK_TINT: 0xffe2b0, DUST_FRONT_TINT: 0xffcf8a,
        MIST_ALPHA: 0.24, VIGNETTE: 0.50,
      },
    },
    {
      id: 'greenhouse', dir: 'greenhouse', name: '花园温室', sub: '日光',
      // mid 远沿 811 → 552（不硬凑 509：0.628 会让 mid 底边只到 723，
      // 靴底 715 差 8px 就露馅，地板必须在脚下还有富余）；fore 底条 1015 → 690。
      // fore 的 scaleX 0.80 是算出来的：两侧内缘 409/1072 等比铺开落在画布 226/689，
      // 左边那根会啃进斗篷范围(±245 → 205/695) 21px。0.80 下变成 201/732，两边都让开。
      scale: { far: 0.720, mid: 0.680, fore: 0.680 }, foreScaleX: 0.80,
      // 唯一的亮调场景：光柱强而宽（正午天窗），暗角必须收到最轻，
      // 否则一圈黑边把"明亮"两个字全抵消掉；雾带也压淡（亮地板上一条灰带很脏）
      atmos: {
        SHAFT_W: 380, SHAFT_H: 680, SHAFT_COLOR: 0xfff3c8, SHAFT_ALPHA: 0.26,
        SHAFT_BREATH: 0.05,
        HALO_TINT: 0x6f8a4a, DUST_BACK_TINT: 0xfff6cf, DUST_FRONT_TINT: 0xd8f0a8,
        MIST_ALPHA: 0.16, VIGNETTE: 0.34,
      },
    },
    {
      id: 'aurora', dir: 'aurora', name: '雪原极光', sub: '户外',
      // mid 远沿 816 → 555；fore 底条 1065 → 690。
      // scaleX 0.84 这次不是为了躲斗篷（等比就够），而是为了**别把中景吃掉**：
      // 这张 mid 的右侧那丛雪松内缘在源图 1100，0.68 下落在画布 708，
      // 而 fore 右柱等比只到 659 —— 树整丛藏在前景后面。把前景横向推到 0.84（内缘 720）
      // 才露得出来。这条是 measure 里 mid/fore 两组内缘要放一起看的原因。
      scale: { far: 0.715, mid: 0.680, fore: 0.648 }, foreScaleX: 0.84,
      // 户外雪夜：极光是漫射的，光柱几乎关掉（留一点点当"天光"），
      // 光尘改成飘雪的意思（前景那批大而慢，靠 DUST 的 tint + 现有向上飘也读得通）；
      // 雪地反光强，暗角中等，雾带最淡
      atmos: {
        SHAFT_W: 420, SHAFT_H: 520, SHAFT_COLOR: 0x9dffd8, SHAFT_ALPHA: 0.10,
        SHAFT_BREATH: 0.09, SHAFT_MS: 7000,
        HALO_TINT: 0x2f5a6e, DUST_BACK_TINT: 0xd8fff0, DUST_FRONT_TINT: 0xffffff,
        MIST_ALPHA: 0.14, VIGNETTE: 0.52,
      },
    },
    {
      id: 'classroom', dir: 'classroom', name: '魔法教室', sub: '讲堂',
      // far 候选 #2 y=788 是讲台地板交界 → 0.907 太大（高度够但构图只剩黑板），
      // 取 0.720 让黑板和课桌都在画面里。
      // mid 地板远沿 809 → 550（0.630~0.686 区间里取靠上的，图底 783 才盖得过靴底 715）；
      // 家具内缘 521/952 落在画布 314/607，稳稳在前景缝(149~752)里。
      // fore 底条 1035 → 690（**不是** measure 打印的 0.691：那一列换算的靶子是 FOOT_Y 715，
      // 对 far/mid 才对；fore 要的是"压住底边但别吃掉靴子"，靶子固定 690）。
      // 两侧内缘 268/1172 等比就落在 149/752，离斗篷很远，不用 scaleX。
      scale: { far: 0.720, mid: 0.680, fore: 0.667 }, foreScaleX: null,

      // 室内中性光（悬浮球灯）：不给强色偏，让她自己的配色说话；暗角标准
      atmos: {
        SHAFT_W: 300, SHAFT_H: 580, SHAFT_COLOR: 0xd8e8ff, SHAFT_ALPHA: 0.16,
        HALO_TINT: 0x3a4a66, DUST_BACK_TINT: 0xdfeaff, DUST_FRONT_TINT: 0xffe9c0,
        MIST_ALPHA: 0.24, VIGNETTE: 0.55,
      },
    },
  ],
  DEFAULT_SCENE: 'tower',

  // 场景切换（iOS 开 App 式展开）。reduced-motion 下整段跳过直接换。
  SCENE_ZOOM_MS: 460,
  SCENE_FADE_MS: 200,

  // ── 气氛层（全部代码绘制，唯一真源就是这张表）──────────────
  // 不用视频、不建共享素材目录：改气氛只改这里，不重生图。
  ATMOS: {
    SHAFT_X: PM_W / 2, SHAFT_Y: 0,  // 光柱从玫瑰窗（far 上的）往下打；跟着画布中心走，别写死 450
    SHAFT_W: 300, SHAFT_H: 620,
    SHAFT_COLOR: 0x8fe6dc, SHAFT_ALPHA: 0.20, SHAFT_BREATH: 0.07, SHAFT_MS: 5200,
    DUST_BACK: 26, DUST_FRONT: 12,   // 光尘粒子数（后景慢而多，前景快而少）
    // 下面三个色本来写死在 StageScene 里。多场景之后它们是"换味道"最便宜的旋钮
    // （雪原要银白、温室要暖金），必须能逐场景覆盖，所以提到表里来。
    HALO_TINT: 0x33507a,             // 角色背后柔光的底色（会被情绪色覆盖，这里是初值）
    DUST_BACK_TINT: 0xbfe9e0, DUST_FRONT_TINT: 0xffe6b8,
    // 地面雾带：只负责洗淡素材自带的法阵（它在 y≈645~735），别贪高贪浓 ——
    // 首版 604/132/0.42 把整条石板地都压成黑的，地板白铺了
    MIST_Y: 626, MIST_H: 104,
    MIST_ALPHA: 0.26,
    SHADOW_W: 250, SHADOW_H: 46, SHADOW_A: 0.5,   // 脚下接地阴影
    VIGNETTE: 0.55,
    PARALLAX_MAX: 1,             // 指针视差强度总系数（0 = 关掉）
  },

  // ── 触碰手势判定（宽松取向：主打轻松反馈，不做精准判定）──────
  TAP_MS: 260,           // 按下→抬起短于此且几乎没动 = tap
  TAP_SLOP: 16,
  HOLD_MS: 400,          // 按住不动超过此 = hold
  RUB_DIST: 60,          // 累计位移超过此 = rub
  REGION_PAD: 0.03,      // 区域矩形各边外扩（归一化）——宁可判宽不判窄
  SNAP_DIST: 190,        // 没命中任何区域时，落到这个距离内最近的区域（戳哪儿都有反应）

  /* ── 反应等级：连击阶梯（DESIGN §优先级）────────────────────
   * 等级**只由连戳次数决定**：第 1 下 tier1、第 2 下 tier2、第 3 下起 tier3。
   * 连击是全角色共享的一条阶梯（戳头再戳手也照样往上叠），不是七条互不相干的。
   *
   * 曾经等级是按 region heat 阈值算的，那是"呈现不出优先级"的根因：
   * heat 每秒衰减 14，而一句配音 2.8~9.8 秒 —— 玩家等她说完再戳，热度早清零了，
   * 头/手臂这些低 heat 区域在正常节奏下**永远停在 tier1**。
   * 所以连击窗口不是从"上次按下"起算，而是从**上一段表演结束**起算（见
   * StageScene._endPerform → PM.Mood.holdCombo），听完整句再戳依然算连击。 */
  COMBO_WINDOW_MS: 1600, // 表演结束后多久内再戳算连击（超时回落 tier1）
  COMBO_PUNISH_AT: 5,    // 连击到这个数强制进生气线，再戳一下就是惩罚（泼水+哭）——
                         // tier3 封顶后每一下都是同级、素材又只有一个变体，
                         // 不给出口的话就是同一段反应背靠背重演

  ABORT_MAX_MS: 380,     // 让位收尾：残余帧最多用这么久飙完（超了就提速，保证"快速做完"）
  ABORT_MIN_MS: 90,      // 残余不足这么点就别演收尾了，直接切
  PERFORM_TAIL_MS: 180,  // 一段表演结束后的余韵（也当动画事件丢失时的兜底冗余）

  // ── 热度 / 情绪 ──────────────────────────────────────────────
  // heat 已**不再决定等级**（见上），只留作 G 键调试图里的"哪块被戳热了"可视化
  HEAT_MAX: 100,
  HEAT_DECAY: 14,        // 每秒衰减
  GESTURE_MUL: { tap: 1.0, rub: 0.6, hold: 0.35 },
  PATIENCE_MAX: 100,
  PATIENCE_T2: -6,
  PATIENCE_T3: -12,      // 连击阶梯下 tier3 来得比旧热度模型频繁得多，单次代价要降
  PATIENCE_REGEN: 7,     // 每秒回复（仅在连击断掉、且不在哭的时候）——
                         // 没有这条，耐心只减不加，每局必然十来下就哭完，阶梯就没得玩了
  PATIENCE_SOOTHE: 4,    // 用"讨好手势"摸对区域
  PATIENCE_ANGRY_AT: 50, // 低于此，tier3 走生气线而不是害羞线
  HAPPY_STREAK: 3,       // 连续讨好几次进 HAPPY
  CRY_PATIENCE_AFTER: 40,// 哭完回到的耐心值（不回满 —— 惹哭是有代价的）
  MOOD_HOLD_MS: 2600,    // 情绪态最短维持时间
  BUBBLE_MS: 2600,       // 气泡最短挂留（有配音时按音频时长自动延长，见 StageScene._holdBubble）

  // ── 每区域的脾气（初稿，凭手感调）────────────────────────────
  REGION_TUNE: {
    head:  { heat: 12, prefer: 'rub'  },
    chest: { heat: 34, prefer: null   },
    belly: { heat: 22, prefer: 'hold' },
    armL:  { heat: 10, prefer: 'hold' },
    armR:  { heat: 14, prefer: 'hold' },
    legL:  { heat: 26, prefer: null   },
    legR:  { heat: 26, prefer: null   },
  },

  // ── 情绪 → 配色（法阵覆盖层 + 气泡描边都用它）────────────────
  // 见 DESIGN §4.5：素材里各段法阵/宝珠颜色本来就不一致，索性认领为情绪指示器
  MOOD_COLOR: {
    NEUTRAL: 0x5fe0c8,
    HAPPY:   0x9ae86a,
    SHY:     0xff8fb8,
    TICKLED: 0xffd76a,
    ANGRY:   0xff5555,
    SAD:     0x7fa8ff,
    CRY:     0x5c7dff,
  },
  MOOD_LABEL: {
    NEUTRAL: '平静', HAPPY: '开心', SHY: '害羞',
    TICKLED: '被逗笑', ANGRY: '生气', SAD: '委屈', CRY: '哭了',
  },

  // ── 动画表（帧数/帧率/播放模式）──────────────────────────────
  // playMode: once（播完回 idle）/ loop / pingpong（正放+倒放）
  // idle 固定 pingpong：杖头小法阵首尾帧差异大，单向循环每圈都会跳（DESIGN §1.45）
  ANIMS: {
    idle:          { frames: 22, fps: 10, mode: 'pingpong' },

    head_pat:      { frames: 16, fps: 12, mode: 'once' },
    head_pat_b:    { frames: 16, fps: 12, mode: 'once' },
    wand_shake:    { frames: 16, fps: 12, mode: 'once' },
    teacher_boast: { frames: 16, fps: 12, mode: 'once' },
    wand_warn:     { frames: 16, fps: 12, mode: 'once' },
    wand_warn_b:   { frames: 16, fps: 12, mode: 'once' },
    wand_warn_c:   { frames: 16, fps: 12, mode: 'once' },
    belly:         { frames: 16, fps: 12, mode: 'once' },
    leg_lift:      { frames: 16, fps: 12, mode: 'once' },
    boot_show:     { frames: 18, fps: 12, mode: 'once' },
    coin_deny:     { frames: 16, fps: 12, mode: 'once' },
    leg_kick:      { frames: 26, fps: 12, mode: 'once' },
    feet_tap:      { frames: 24, fps: 12, mode: 'once' },

    shy:           { frames: 16, fps: 12, mode: 'once' },
    laugh:         { frames: 16, fps: 12, mode: 'once' },
    happy_tilt:    { frames: 14, fps: 12, mode: 'once' },
    sad:           { frames: 18, fps: 12, mode: 'once' },
    angry_charge:  { frames: 14, fps: 12, mode: 'once' },
    water_threat:  { frames: 12, fps: 12, mode: 'once' },
    cast_windup:   { frames: 12, fps: 12, mode: 'once' },
    cry:           { frames: 20, fps: 10, mode: 'once' },
  },

  // 分两批加载：核心批加载完就能玩，其余在后台补。
  // 22 张图集合计约 29MB，一次性等完再进游戏体验太差。
  CORE_ANIMS: ['idle', 'head_pat', 'belly', 'wand_shake', 'wand_warn',
               'leg_lift', 'feet_tap', 'shy', 'angry_charge', 'cry'],

  MOOD_ANIM: {
    NEUTRAL: 'idle', HAPPY: 'happy_tilt', SHY: 'shy',
    TICKLED: 'laugh', ANGRY: 'angry_charge', SAD: 'sad', CRY: 'cry',
  },
};
