/* game/config.js — 常量 / 配色 / 调参（数据，脱离逻辑）
 * 全部挂到 window.BC 命名空间，由后续 script 按序读取。
 */
window.BC = window.BC || {};

window.BC.Config = {
  GAME_W: 960,
  GAME_H: 540,
  TOTAL_LEVELS: 4,
  MAX_HP: 4,

  // 爬行
  CRAWL_SPEED: 165,        // 沿轨道弧长推进速度 px/s
  AUTO_SPEED_MULT: 1.7,    // bot / 自动试玩加速（保证 90s 内跑完四关）
  CORNER_WINDOW: 30,       // 顶点 ±此弧长内视为「过拐角」→ 播 cornerTurnCCW + 减速
  CORNER_MIN_DEG: 35,      // 顶点转角大于此值才算拐角
  CORNER_SLOW: 0.5,        // 拐角窗口内速度系数
  CORNER_TURN_RETRACT_S: 18, // 转向撑墙动作的视觉锚点沿入墙方向退让
  CORNER_HANDOFF_S: 44,    // 拐角动画结束后，普通爬行帧从出墙方向前移一点对齐
  TURN_LOCK_MS: 460,       // 反向调头时移动暂停时长（≈ turnAround 动画长度）

  CELL_PICK_R: 28,         // 收集电池的弧长判定半径
  HAZARD_GAP: 42,          // 与尖刺 / 巡逻者保持的安全弧长
  RESPAWN_INVULN_MS: 950,  // 受击重生后的无敌时间

  // 精灵（图集单帧 216×232，脚/手触壁基线在底部附近）
  // The assembled atlas uses 14 columns (the longest row is turnAround).
  // Keep row starts here so a shorter, purpose-built corner animation does
  // not shift the Phaser frame indices silently.
  SPRITE: {
    // Corner/crawl frames were packed with their contact baseline at y=224.
    // Align the Phaser origin to that baseline so rotation cannot push the
    // hands/feet through the rail for a frame.
    FW: 216, FH: 232, ORIGIN_Y: 224 / 232, SCALE: 0.46,
    ATLAS_COLS: 14, CRAWL_START: 14, CORNER_TURN_START: 28,
    CORNER_TURN_SKIP: 3, CORNER_TURN_COUNT: 5,
  },

  // 深色木箱内壁 + 亮色导轨
  COLOR: {
    BG:         0x241a12,
    CRATE_FILL: 0x4a3827,
    PLANK_A:    0x56422f,
    PLANK_B:    0x624b34,
    PLANK_LINE: 0x2e2419,
    RIVET:      0x9a7446,
    RAIL:       0x8fd3ff,
    RAIL_GLOW:  0x2f6f8f,
    CELL:       0xffd469,
    CELL_CORE:  0xfff2cf,
    STRIP:      0xd8463a,
    STRIP_DIM:  0x7a2f2a,
    EXIT:       0x7cffb2,
    EXIT_DIM:   0x33604a,
    RIVAL:      0xc77dff,
    RIVAL_GLOW: 0x6a3f8f,
    TEXT:       0xf3e9d8,
  },
};
