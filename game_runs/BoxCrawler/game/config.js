/* game/config.js — 常量 / 配色 / 调参（数据，脱离逻辑）
 * 全部挂到 window.BC 命名空间，由后续 script 按序读取。
 */
window.BC = window.BC || {};

window.BC.Config = {
  GAME_W: 960,
  GAME_H: 540,
  TOTAL_LEVELS: 5,
  MAX_HP: 4,

  // 爬行
  CRAWL_SPEED: 165,        // 沿轨道弧长推进速度 px/s
  AUTO_SPEED_MULT: 1.7,    // bot / 自动试玩加速（保证 90s 内跑完五关）
  CORNER_WINDOW: 30,       // 顶点 ±此弧长内视为「过拐角」→ 播 cornerCrawl + 减速
  CORNER_MIN_DEG: 35,      // 顶点转角大于此值才算拐角
  CORNER_SLOW: 0.5,        // 拐角窗口内速度系数
  TURN_LOCK_MS: 460,       // 反向调头时移动暂停时长（≈ turnAround 动画长度）

  CELL_PICK_R: 28,         // 收集电池的弧长判定半径
  HAZARD_GAP: 42,          // 与尖刺 / 巡逻者保持的安全弧长
  RESPAWN_INVULN_MS: 950,  // 受击重生后的无敌时间

  // 精灵（图集单帧 216×232，脚/手触壁基线在底部附近）
  SPRITE: { FW: 216, FH: 232, ORIGIN_Y: 0.93, SCALE: 0.46 },

  // 深色木箱内壁 + 亮色导轨
  COLOR: {
    BG:         0x120e0a,
    CRATE_FILL: 0x241b12,
    PLANK_A:    0x2c2015,
    PLANK_B:    0x342718,
    PLANK_LINE: 0x1a130c,
    RIVET:      0x6b5032,
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
