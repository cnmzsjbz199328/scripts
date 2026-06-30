/* ShadowAbyss — 关卡数据（神曲九圈，竖切先做前两圈）。
 * 单一连续世界：两圈首尾相接、x 单调递增（与黄金样板 ShadowLeap 的多幕同世界一致，
 * 便于摄像机连续推进与自动试玩 bot 的单调 x 卡死检测）。各圈坐标为相对本圈 startX 的局部值，
 * world.js 加 startX 绝对化。ground 段之间空隙即沟壑（坠落扣心、回最近立足点）。 */
const FLOOR_Y = 472;

const CIRCLES = [
  {
    id: 'limbo', name: '第一圈 · 林勃', sin: '无罪的幽魂',
    startX: 0, span: 3120,
    // 教学圈：两道 130px 沟壑，无风
    ground: [[0, 900], [1030, 1780], [1910, 3120]],
    pits: [[900, 1030], [1780, 1910]],
    gusts: [],
    soul: null,
    riftX: 3010,            // 通往第二圈的下行裂口（视觉 + 圈分界）
    fog: 0x0c0f18, fogA: 0.30, lightR: 150,
    ambient: { tree: 'amb_tree_limbo', fog: 'amb_fog_limbo', wind: null, treeTint: 0xffffff },
    parallax: { sky: ['#0e1320', '#070a12'], cliff: '#0a0e18', panorama: 'panorama_limbo' },
    card: {
      title: '第一圈 · 林勃',
      body: '幽暗森林的尽头，维吉尔在雾中等你。\n这里没有刑罚，只有走不出的灰。跟上引路的微光。\n\n← → / A D 行走    ·    ↑ / W / 空格 跳（长按跳更高）    ·    继续 SPACE',
    },
  },
  {
    id: 'lust', name: '第二圈 · 欲色', sin: '情欲之风',
    startX: 3120, span: 3400,
    ground: [[0, 740], [870, 1580], [1710, 2380], [2510, 3400]],
    pits: [[740, 870], [1580, 1710], [2380, 2510]],
    // 情欲之风：阵风只覆盖实心地面段，每个沟壑前后留 ≥120px 无风缓冲——
    // 「顶风走」与「卡风停跳沟」是两个独立挑战，绝不让玩家/ bot 在风里被迫跳沟。
    gusts: [
      { x0: 990, x1: 1460, force: 140 },
      { x0: 1830, x1: 2260, force: 170 },
      { x0: 2630, x1: 3120, force: 200 },
    ],
    // 抉择点：被风卷向深渊的亡魂向你伸手（圣殿春秋的道德抉择基因）
    soul: {
      x: 2040, y: 430,
      title: '风中的手',
      body: '一个被狂风扯着的魂魄向你伸出手——是停下来拉住她，\n还是借这阵风的势头冲过去？\n\n[1] 伸手拉住（风会为你平息，安全） · [2] 借风冲过（更快，更险）',
    },
    riftX: 3300,            // 竖切终点：抵达即过第二圈、通关
    fog: 0x0a0810, fogA: 0.42, lightR: 130,
    ambient: { tree: 'amb_tree_lust', fog: 'amb_fog_lust', wind: 'amb_wind_lust', treeTint: 0xffffff },
    parallax: { sky: ['#150a14', '#0a050c'], cliff: '#120a14', panorama: 'panorama_lust' },
    card: {
      title: '第二圈 · 欲色',
      body: '一阵永不停歇的风，把恋慕者的魂魄吹得无处停留。\n风会把你推偏——在风停的间隙里迈步、起跳。\n\n继续 SPACE',
    },
  },
];

const WORLD_W = CIRCLES[CIRCLES.length - 1].startX + CIRCLES[CIRCLES.length - 1].span;
const FINAL_RIFT_X = CIRCLES[CIRCLES.length - 1].startX + CIRCLES[CIRCLES.length - 1].riftX;

// 通关结局文案（受抉择影响，见 flow.js）
const ENDINGS = {
  pull: '你停下来，握住了那只手。风为之一静。\n维吉尔说：怜悯，是走下去的人唯一带得走的东西。\n下行的裂口在脚下亮起——更深的黑暗，改日再下。',
  rush: '你借着风势冲了过去，没有回头。\n那只手没入了灰里。维吉尔沉默地走在前面。\n下行的裂口在脚下亮起——更深的黑暗，改日再下。',
  none: '你穿过了欲色之风，抵达通往深处的裂口。\n维吉尔回头看你一眼，率先迈入黑暗。',
};
