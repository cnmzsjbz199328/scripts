/* InkLine — 关卡/数值常量从 game-logic.js 顶部平移；顶层引用 TILEMAP_DATA(须后于 config.js)。 */
const GAME_W = 960;
const GAME_H = 540;
const TILE = 64;
const WORLD_W = (TILEMAP_DATA.width || 75) * TILE;
const WORLD_H = (TILEMAP_DATA.height || 9) * TILE;
const FLOOR_TOP = WORLD_H - 2 * TILE;   // 448
const SPAWN_Y = FLOOR_TOP - 60;         // 388
const PLAYER_SPEED = 230;
const JUMP_V = 560;   // 192px 沟壑留足余量(reach~234)
const DEATH_BUDGET = 5;
const INK = 0x1a1a1a;
const PAPER = 0xfaf6ea;

// 原 192px 沟壑对单跳余量过紧→补地砖收窄为干净 128px（同 ShadowLeap）
const GAP_FILL_COLS = [21, 45];
const PITS = [[1408, 1536], [2944, 3072]];   // 收窄后沟壑(各 128 宽)
const SPIKES = [700, 1000, 1900, 2500, 3500, 4000];  // 地面尖刺(避开沟壑、与沟壑留落地间距)

const ACTS = [
  { name: '草稿浅滩', startX: 60,   wash: 0xfaf6ea, washA: 0.0,
    intro: ['第一幕 · 草稿浅滩',
      '我只是一根线，却想亲手画完属于自己的世界。\n铅笔辅助线指引方向——← → / A D 移动，↑ / W / 空格 跳。\n越过断裂的线条，拾起散落的墨滴。'] },
  { name: '断线峡谷', startX: 1650, wash: 0xede6d4, washA: 0.16,
    intro: ['第二幕 · 断线峡谷',
      '线条在这里崩塌成断桥与尖刺，沟壑横亘。\n看准边缘起跳，别落进画纸的空白里。\n橡皮怪开始在走廊里游荡——别被它擦去轮廓。'] },
  { name: '橡皮回廊', startX: 3150, wash: 0xe2dccb, washA: 0.22,
    intro: ['第三幕 · 橡皮回廊',
      '灰色的橡皮怪在最后的回廊里巡逻，尽头是画纸的留白与笔尖。\n聚齐墨滴，跃过最后的断线——\n把这个世界，亲手画完。'] },
];

const GOAL_SCORE = 8;
// 墨滴：地面奔跑高度(y430，贴合小墨团着地高度)，避开沟壑与尖刺 x，共 12 → 目标 8
const DROPS = [
  { x: 300, y: 430 }, { x: 560, y: 430 }, { x: 860, y: 430 }, { x: 1150, y: 430 },
  { x: 1700, y: 430 }, { x: 2050, y: 430 }, { x: 2300, y: 430 }, { x: 2700, y: 430 },
  { x: 3300, y: 430 }, { x: 3700, y: 430 }, { x: 3900, y: 430 }, { x: 4300, y: 430 },
];
// 橡皮怪（巡逻，跳跃可越）：二幕起
const ERASERS = [{ x: 2200, range: 200, act: 1 }, { x: 3400, range: 200, act: 2 }, { x: 4050, range: 150, act: 2 }];
const GOAL_X = WORLD_W - 120;
