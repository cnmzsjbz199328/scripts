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

PM.Config = {
  // ── 画布 / 贴图 ──────────────────────────────────────────────
  WIDTH: PM_W,
  HEIGHT: 720,
  FRAME_W: 580,          // 所有动画段共用的单元格（见 MATERIALS.md 的固定裁剪窗）
  FRAME_H: 720,
  ATLAS_COLS: 7,         // assemble 按 4096 纹理上限算出来的列数
  CHAR_X: PM_W / 2,      // 角色中心 x（origin 0.5, 0）
  CHAR_Y: 0,

  // ── 背景三层（魔女工房·塔内）────────────────────────────────
  // 架构照搬 BladeTrinity：三层各自贴顶居中、超出画布的部分自然裁掉，
  // 地面线【不写进提示词去赌】，而是在装配侧吸收 —— 每层量出关键线，
  // 单独定标 scale = 目标屏幕 y ÷ 源图实测 y。重新生图后必须重跑
  // tools/measure-bg.mjs 并回填下面这几个数（源图统一 1440×1152）。
  //
  // 实测（2026-07-28，tools/measure-bg.mjs）与取值理由：
  //   far   墙脚/近处地板交界 y≈989 → 715/989 = 0.723
  //         （最强水平边量到的 653 是平台后沿，照它定标角色会站到半空）
  //   mid   石板地带：后沿 y≈937、前沿 y≈1042（源图上只有 105px 厚）。
  //         首版取 0.726 让站位线落在带中，结果地带只剩 680~720 的 40px 露在画布里，
  //         再被地面雾带一压就成了一片黑，她看着像浮在墙前面。改 0.700：
  //         地带铺到 656~729，站位线 715 落在偏前处，身后留得出 59px 地板。
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
    FOOT_Y: 715,                 // 靴底在画布上的 y，三层定标共用的靶子
    LAYERS: [
      { key: 'bg_far',  scale: 0.723, depth: -100, par: 5 },
      { key: 'bg_mid',  scale: 0.700, depth: -60,  par: 13 },
      { key: 'bg_fore', scale: 0.660, scaleX: 0.84, depth: 18, par: 30 },
    ],
  },

  // ── 气氛层（全部代码绘制，唯一真源就是这张表）──────────────
  // 不用视频、不建共享素材目录：改气氛只改这里，不重生图。
  ATMOS: {
    SHAFT_X: PM_W / 2, SHAFT_Y: 0,  // 光柱从玫瑰窗（far 上的）往下打；跟着画布中心走，别写死 450
    SHAFT_W: 300, SHAFT_H: 620,
    SHAFT_COLOR: 0x8fe6dc, SHAFT_ALPHA: 0.20, SHAFT_BREATH: 0.07, SHAFT_MS: 5200,
    DUST_BACK: 26, DUST_FRONT: 12,   // 光尘粒子数（后景慢而多，前景快而少）
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

  // ── 热度 / 情绪 ──────────────────────────────────────────────
  HEAT_MAX: 100,
  HEAT_DECAY: 14,        // 每秒衰减
  TIER2_AT: 35,
  TIER3_AT: 70,
  GESTURE_MUL: { tap: 1.0, rub: 0.6, hold: 0.35 },
  PATIENCE_MAX: 100,
  PATIENCE_T2: -6,
  PATIENCE_T3: -18,
  PATIENCE_SOOTHE: 4,    // 用"讨好手势"摸对区域
  PATIENCE_ANGRY_AT: 50, // 低于此，tier3 走生气线而不是害羞线
  HAPPY_STREAK: 3,       // 连续讨好几次进 HAPPY
  CRY_PATIENCE_AFTER: 40,// 哭完回到的耐心值（不回满 —— 惹哭是有代价的）
  MOOD_HOLD_MS: 2600,    // 情绪态最短维持时间
  LOCK_GRACE_MS: 1200,   // 锁的超时兜底冗余（动画事件丢了也能解锁）

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
