/* PokeMood — 调参与静态数据
 * 加载顺序：_engine/* → config → regions → reactions → systems/* → scenes/* → main
 */
window.PM = window.PM || {};

PM.Config = {
  // ── 画布 / 贴图 ──────────────────────────────────────────────
  WIDTH: 900,
  HEIGHT: 720,
  FRAME_W: 580,          // 所有动画段共用的单元格（见 MATERIALS.md 的固定裁剪窗）
  FRAME_H: 720,
  ATLAS_COLS: 7,         // assemble 按 4096 纹理上限算出来的列数
  CHAR_X: 450,           // 角色中心 x（origin 0.5, 0）
  CHAR_Y: 0,

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
