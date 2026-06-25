/* game/config.js — 常量 / 配色 / 物理调参（数据，脱离逻辑）
 * 全部挂到 window.Ink 命名空间，由后续 script 按序读取。
 */
window.Ink = window.Ink || {};

window.Ink.Config = {
  GAME_W: 960,
  GAME_H: 540,
  TOTAL_LEVELS: 5,
  MAX_HP: 4,
  FLOOR_Y: 500,

  // 颜色（蓝图纸 + 蓝墨水）
  COLOR: {
    PAPER: 0xeef2f6,
    INK: 0x21384f,
    LINE: 0x40627e,
    WATER: 0x2f6fb0,
    WATER_HI: 0x9fd0f4,
    GOAL: 0x1f3a5f,
    SPIKE: 0xb0413a,
    GRID: 0xc4d2dd,
    STROKE: 0x274b6b,
    STAR: 0xe0a93a,
  },

  // 物理
  PHYS: {
    G: 1500,            // 重力 px/s²
    DROP_R: 9,
    SUBSTEPS: 6,        // 子步进，防穿线
    RESTITUTION: 0.24,  // 反弹（小→会沉降）
    TANGENT_KEEP: 0.985,// 切向保留（≈无摩擦滑行）
    MAX_SPEED: 1400,
    SETTLE_SPEED: 26,   // 视为停下的速度
    MIN_PT_GAP: 9,      // 画线采点最小间距
  },
};
