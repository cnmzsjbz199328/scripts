/* ShadowLeap — 关卡/数值常量从 game-logic.js 顶部平移；顶层引用 TILEMAP_DATA(须后于 config.js)。 */
const GAME_W = 960;
const GAME_H = 540;
const TILE = 64;
const WORLD_W = (TILEMAP_DATA.width || 75) * TILE;   // 4800
const WORLD_H = (TILEMAP_DATA.height || 9) * TILE;    // 576
const FLOOR_TOP = WORLD_H - 2 * TILE;                 // 448
const SPAWN_Y = WORLD_H - 3 * TILE;                   // 384（高于地面，落下落顶面）

const PLAYER_SPEED = 230;
const JUMP_V = 580;   // 普通跳（不漂浮）；沟壑收窄到 128px 后余量充足
const DEATH_BUDGET = 5;

// 把原 256/192px 过宽沟壑收窄为干净的 128px（在 create 里补地砖实现），
// 原宽度落地余量仅 ~32px、对人/ bot 都过苛。
const GAP_FILL_COLS = [21, 24, 45];     // 补这些列的地砖 → 沟壑收窄
const PITS = [[1408, 1536], [2944, 3072]];  // 收窄后的沟壑 [起,止] px（各 128 宽）
// 捕兽夹（地面，跳跃可越）。须与沟壑保持落地间距：跳夹的落点不能落进沟壑。
const TRAPS = [780, 1080, 2050, 2650, 3450, 4150];

// ── 三幕 ──
const ACTS = [
  { name: '枯枝浅滩', startX: 120,  fog: 0x0c0f16, fogA: 0.0,
    intro: ['第一幕 · 枯枝浅滩',
      '妹妹被迷雾夺走，唯一的线索是森林深处那团不灭的光。\n男孩不会说话，只会奔跑与跳跃。\n← → / A D 跑，↑ / W / 空格 跳——越过枯枝间的第一道沟壑，拾起微光。'] },
  { name: '捕兽夹林道', startX: 1700, fog: 0x0a0d14, fogA: 0.16,
    intro: ['第二幕 · 捕兽夹林道',
      '浓雾压顶，林道里密布张口的捕兽夹，头顶还有坠石砸落。\n看准节奏起跳，越过陷阱与沟壑。\n微光忽明忽灭，别让迷雾先吞了它们。'] },
  { name: '齿轮废墟', startX: 3150, fog: 0x100a14, fogA: 0.2,
    intro: ['第三幕 · 齿轮废墟',
      '巨大的齿轮废墟在雾光中沉默，断桥与悬崖交错。\n尽头便是那团光。\n聚齐微光，跃过最后的断崖——把妹妹找回来。'] },
];

const GOAL_SCORE = 7;
// 微光：全部落在地面奔跑高度(y405)、避开沟壑与捕兽夹 x，奔跑即可拾，共 12 → 目标 7
const MOTES = [
  { x: 360, y: 405 }, { x: 640, y: 405 }, { x: 1000, y: 405 }, { x: 1240, y: 405 },
  { x: 1650, y: 405 }, { x: 1950, y: 405 }, { x: 2250, y: 405 }, { x: 2500, y: 405 },
  { x: 2820, y: 405 }, { x: 3250, y: 405 }, { x: 3700, y: 405 }, { x: 4050, y: 405 },
];
const GOAL_X = WORLD_W - 120;

const DEPTH = { GROUND: 0, YSORT: 1000, EFFECTS: 9500 };
