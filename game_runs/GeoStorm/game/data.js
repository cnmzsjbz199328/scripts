/* GeoStorm — 数值常量/阶段表从 game-logic.js 顶部平移。 */
const GAME_W = 960;
const GAME_H = 540;
const PLAYER_SPEED = 230;
const WIN_SCORE = 15;
const SHARDS_ON_FIELD = 4;
const DEATH_BUDGET = 5;

const INK = 0x14233a;
const GLOW = 0x18c2b0;
const SHARD_C = 0xffb020;

// 三阶段（按已收集光碎片推进）
const PHASES = [
  { name: '初醒微光', upTo: 5,  beat: 820, spd: 115, fog: 0x0a1422, fogA: 0.0,
    intro: ['第一阶 · 初醒微光',
      '我是宇宙诞生时画下的第一个光点。\n虚空正从四边吞噬线条——用方向键 / WASD 在弹幕缝隙间走位，\n拾起散落的光碎片，把几何宇宙一点点画回来。'] },
  { name: '虚空渐起', upTo: 10, beat: 640, spd: 150, fog: 0x0a1020, fogA: 0.14,
    intro: ['第二阶 · 虚空渐起',
      '虚空察觉了微光的复苏，弹幕更密、更快。\n飞旋的三角、平移的方块从四面涌来。\n躲到几何掩体之后，能挡下崩坏的弹幕。'] },
  { name: '终焉风暴', upTo: 15, beat: 500, spd: 185, fog: 0x140a18, fogA: 0.2,
    intro: ['第三阶 · 终焉风暴',
      '最后五枚光碎片，虚空倾尽全力。\n这是终焉的风暴——\n点亮它们，让崩解的线条逆向重连，把宇宙重新画亮！'] },
];
