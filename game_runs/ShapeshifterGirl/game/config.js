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

  PHYSICS: {
    GRAVITY_Y: 1200,     // 基准重力（main.js 与各形态的重力抵消都从这里取）
  },

  // 非鱼落水的「扑腾挣扎」宽限：给玩家按 [3] 变鱼的时间（岸上提前变鱼会搁浅，落水秒死不合理）
  WATER_GRACE_MS: 3000,

  SPRITE: {
    FRAME_W: 192,        // char-sprite 图集取景框
    FRAME_H: 208,
  },

  // 变身形态物理参数与配置
  FORMS: {
    GIRL: {
      name: 'girl',
      speed: (typeof navigator !== 'undefined' && navigator.webdriver) ? 400 : 240,
      jump: -480,
      width: 48,
      height: 72,
      doubleJump: false,
      color: 0xff4f4f, // 珊瑚红
    },
    CAT: {
      name: 'cat',
      speed: (typeof navigator !== 'undefined' && navigator.webdriver) ? 560 : 360,
      jump: -680,
      width: 36,
      height: 36,
      doubleJump: true,
      color: 0xffaa00, // 橘黄色
    },
    FISH: {
      name: 'fish',
      speed: (typeof navigator !== 'undefined' && navigator.webdriver) ? 440 : 280, // 水中全向移动速度
      width: 40,
      height: 24,
      doubleJump: false,
      color: 0xffd700, // 芥末黄
    },
    EAGLE: {
      name: 'eagle',
      speed: (typeof navigator !== 'undefined' && navigator.webdriver) ? 440 : 260,
      jump: -450,
      glideGravity: 120, // 滑翔时的低重力
      width: 48,
      height: 32,
      doubleJump: false,
      color: 0x8b4513, // 褐色
    },
    BEAR: {
      name: 'bear',
      speed: (typeof navigator !== 'undefined' && navigator.webdriver) ? 260 : 140,
      jump: -320,
      width: 72,
      height: 80,
      doubleJump: false,
      color: 0x5a3d28, // 深棕
    }
  },

  // 变身硬直时序 (ms)
  MORPH: {
    TRANSFORM_TIME: (typeof navigator !== 'undefined' && navigator.webdriver) ? 200 : 500,     // 人 <-> 兽 变身硬直 0.5s
    TRANSFORM_BEAST_TIME: (typeof navigator !== 'undefined' && navigator.webdriver) ? 400 : 1000, // 兽 <-> 兽 变身硬直 1.0s
  },

  // 视觉调色板配置 (关卡对应调色板色调)
  PALETTES: [
    { name: 'WarmForest', primary: 0x4caf50, accent: 0xff5722, sky: 0xc8e6c9 }, // L1
    { name: 'MoonlitStream', primary: 0x2196f3, accent: 0xe040fb, sky: 0xb3e5fc }, // L2
    { name: 'SunsetCanyon', primary: 0xff9800, accent: 0x9c27b0, sky: 0xffe0b2 }, // L3
    { name: 'CrystalCave', primary: 0x9c27b0, accent: 0x00e676, sky: 0xe1bee7 }, // L4
    { name: 'OminousCloud', primary: 0xd32f2f, accent: 0xffeb3b, sky: 0xffcdd2 }, // L5
  ],

  // 气氛唯一真源（抠图+渲染 v2）：AI 剪影带只供形状（process-bg 提色），
  // 天空渐变/地平辉光/雾带/漂尘/地面带颜色全部出自这里——改气氛只改此表。
  // sky: 三停竖直渐变 [顶,中,地平]；glow: 地平辉光 [r,g,b,a] 自 glowY 起向下渐强；
  // haze/dust: 雾带与漂尘 tint+alpha；ground*: 地面带用色；pit: 深渊坑色；
  // farFb/midFb: 剪影图缺失时程序化降级层用色（与 process-bg 提色表同源）。
  ATMOS: [
    { // L1 暖绿森林——晨光
      sky: ['#7ec8e3', '#c9e8b5', '#f9efc7'], glow: [255, 240, 180, 0.50], glowY: 0.55,
      haze: 0xeaf5d8, hazeA: 0.42, dust: 0xfff2b0, dustA: 0.55,
      groundTop: '#6da85e', groundDeep: '#3f5d33', groundLip: '#8fc177', pit: '#1c2417',
      farFb: '#a8c496', midFb: '#3d6b3f',
    },
    { // L2 月光溪谷——蓝夜（漂尘=萤火）
      sky: ['#0d1b3e', '#274b7a', '#5f8fc0'], glow: [190, 220, 255, 0.45], glowY: 0.50,
      haze: 0xa8c8e8, hazeA: 0.36, dust: 0xaaffcc, dustA: 0.85, firefly: true,
      groundTop: '#3f5f7a', groundDeep: '#22344a', groundLip: '#6d9ab5', pit: '#0a1220',
      farFb: '#7d92b8', midFb: '#2a3d66',
    },
    { // L3 黄昏峡谷——霞光（漂尘=风沙）
      sky: ['#6e4a8c', '#d97a3f', '#f7c76a'], glow: [255, 180, 90, 0.60], glowY: 0.50,
      haze: 0xf0c090, hazeA: 0.40, dust: 0xffd9a0, dustA: 0.60,
      groundTop: '#b5713d', groundDeep: '#6e4023', groundLip: '#d99a5e', pit: '#2a160c',
      farFb: '#d99a5e', midFb: '#8a4a28',
    },
    { // L4 暗紫洞穴——晶光（漂尘=晶尘；黑暗遮罩+项链光晕见 DARKNESS）
      sky: ['#150c26', '#2a1846', '#45286e'], glow: [150, 100, 220, 0.50], glowY: 0.55,
      haze: 0x9a7ac8, hazeA: 0.28, dust: 0xc9a0ff, dustA: 0.75, firefly: true,
      groundTop: '#4a3566', groundDeep: '#291c3d', groundLip: '#7a5fa0', pit: '#0d0716',
      farFb: '#8a6aa8', midFb: '#462a66', dark: true,
    },
    { // L5 红黑云顶——余烬（漂尘=火烬）
      sky: ['#1c0a12', '#48141c', '#8a2a24'], glow: [255, 110, 60, 0.55], glowY: 0.50,
      haze: 0xc86a50, hazeA: 0.38, dust: 0xffb080, dustA: 0.70,
      groundTop: '#5f2a30', groundDeep: '#331419', groundLip: '#8a4a44', pit: '#120608',
      farFb: '#8a3a3a', midFb: '#4a161e',
    },
  ],

  // L4 黑暗视界（公平做法：光圈下限半径慷慨、只压环境不吞角色，见 render.js）
  DARKNESS: {
    alpha: 0.58,        // 暗幕不透明度
    radius: 300,        // 项链光圈半径下限（保证脚下与前方障碍始终可读）
    color: 0x06030e,
  },
};
