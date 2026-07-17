/* game/config.js — 常量 / 物理调参 / 形态配置（数据，脱离逻辑）
 * 全部挂到 window.SSG 命名空间，由后续 script 按序读取。
 */
window.SSG = window.SSG || {};

window.SSG.Config = {
  GAME_W: 960,
  GAME_H: 540,
  TOTAL_LEVELS: 5,
  MAX_HP: 4,

  WORLD: {
    W: 18000,            // 世界总宽 = 各段之和
    H: 540,              // 高度一屏
    FEET_Y: 452,         // 地面基线
  },

  // 变身形态物理参数与配置
  FORMS: {
    GIRL: {
      name: 'girl',
      speed: 240,
      jump: -480,
      width: 48,
      height: 72,
      doubleJump: false,
      color: 0xff4f4f, // 珊瑚红
    },
    CAT: {
      name: 'cat',
      speed: 360,
      jump: -680,
      width: 36,
      height: 36,
      doubleJump: true,
      color: 0xffaa00, // 橘黄色
    },
    FISH: {
      name: 'fish',
      speed: 280, // 水中全向移动速度
      width: 40,
      height: 24,
      doubleJump: false,
      color: 0xffd700, // 芥末黄
    },
    EAGLE: {
      name: 'eagle',
      speed: 260,
      jump: -450,
      glideGravity: 120, // 滑翔时的低重力
      width: 48,
      height: 32,
      doubleJump: false,
      color: 0x8b4513, // 褐色
    },
    BEAR: {
      name: 'bear',
      speed: 140,
      jump: -320,
      width: 72,
      height: 80,
      doubleJump: false,
      color: 0x5a3d28, // 深棕
    }
  },

  // 变身硬直时序 (ms)
  MORPH: {
    TRANSFORM_TIME: 500,     // 人 <-> 兽 变身硬直 0.5s
    TRANSFORM_BEAST_TIME: 1000, // 兽 <-> 兽 变身硬直 1.0s
  },

  // 视觉调色板配置 (关卡对应调色板色调)
  PALETTES: [
    { name: 'WarmForest', primary: 0x4caf50, accent: 0xff5722, sky: 0xc8e6c9 }, // L1
    { name: 'MoonlitStream', primary: 0x2196f3, accent: 0xe040fb, sky: 0xb3e5fc }, // L2
    { name: 'SunsetCanyon', primary: 0xff9800, accent: 0x9c27b0, sky: 0xffe0b2 }, // L3
    { name: 'CrystalCave', primary: 0x9c27b0, accent: 0x00e676, sky: 0xe1bee7 }, // L4
    { name: 'OminousCloud', primary: 0xd32f2f, accent: 0xffeb3b, sky: 0xffcdd2 }, // L5
  ],
};
