/* Coalesce — 数值/颜色/关卡几何常量从 game-logic.js 顶部平移；含 inZone 工具(各模块裸引用)。 */
const GAME_W = 960;
const GAME_H = 540;
const WORLD_W = 2880;
const FLOOR_Y = 470;
const WIN_VOL = 18;       // 撞坝所需水量（HUD 目标）
const MAX_HP = 3;

// 颜色（蓝墨 + 米色水彩纸）
const PAPER    = 0xfaf6ea;
const INK      = 0x1f3a5f;
const WATER    = 0x2f6fb0;
const WATER_HI = 0x8fc4f0;
const FOOD     = 0x57a6e0;
const ROCK     = 0x6b7280;   // 岩壁
const ROCK_HI  = 0x8a91a0;
const GRID     = 0xd9cfb8;
const DAM_C    = 0x7a5a3a;   // 堤坝
const WARN     = 0xc0524a;

// 物理
const G        = 1500;
const MOVE_SPD = 235;
const BASE_R   = 16;
const GROW_K   = 1.05;
const MIN_R    = 11;
const MAX_R    = 40;
const BREAK_R  = 24;         // 大于此半径可撞开裂纹堤坝
const SHRINK_RATE = 9;       // 挤水速率（每秒减少的水量）
const COYOTE   = 0.09;       // 离地后仍可起跳的宽限（手感）
const JUMP_BUF = 0.10;       // 落地前预输入缓冲（手感）
const JUMP_CUT = 0.45;       // 松开跳跃键时上升速度衰减 → 可变跳高（短按矮跳）

// 关卡几何（top-left x,y,w,h）。三区：学跳 → 钻缝 → 聚水撞坝。
const PLATFORMS = [
  [0, FLOOR_Y, 560, 80],          // A 地面（0–560）
  // 沟壑 560–660（跳，100 宽）
  [660, FLOOR_Y, 540, 80],        // B 地面（660–1200）
  [1120, 300, 130, 126],          // 窄缝顶盖（底 426，与地面 470 间留 44 高走廊 → 大了须挤小）
  [1200, FLOOR_Y, 520, 80],       // 缝后地面（1200–1720）
  // 沟壑 1720–1820（跳，100 宽）
  [1820, FLOOR_Y, 1060, 80],      // C 地面（1820–2880）
  // 顶部点缀岩台（避开跳跃弧线）
  [380, 300, 120, 24],
  [2380, 330, 150, 24],
];

// 裂纹堤坝（须够大撞开）；撞开即通关
const DAM = { x: 2560, y: 300, w: 70, h: 170 };

// 墨滴（自动吸收 → 变大）。缝后/C 区密集，保证缩小后能重新聚大撞坝。
const DROPS = [
  { x: 250, y: 430 }, { x: 430, y: 430 }, { x: 760, y: 430 }, { x: 1000, y: 430 },
  { x: 1320, y: 430 }, { x: 1440, y: 430 }, { x: 1560, y: 430 }, { x: 1660, y: 430 },
  { x: 1960, y: 430 }, { x: 2120, y: 430 }, { x: 2260, y: 430 }, { x: 2340, y: 430 },
  { x: 2420, y: 430 }, { x: 2480, y: 430 },
];

// 浊墨水洼（损血威胁，地面上）
const HAZARDS = [
  { x: 900, y: FLOOR_Y - 10, w: 46, h: 12 },
  { x: 2200, y: FLOOR_Y - 10, w: 46, h: 12 },
];

const CHECKPOINTS = [80, 740, 1260, 1900];

// 自动试玩：跳跃区间为[起跳→落地]全程，跨越沟壑/水洼时持续按住跳——
// 配合可变跳高（松键即矮跳），bot 必须按住整段才能拿到完整跳弧。
const AUTO_JUMP_ZONES = [[520, 660], [800, 930], [1680, 1820], [2100, 2230]];
const AUTO_SLIT = [1080, 1260];   // 窄缝：挤小钻过
const inZone = (x, zones) => zones.some(([a, b]) => x > a && x < b);

// 三段叙事（按 x 推进触发）
const ACTS = [
  { x: 0,    name: '渗流浅滩', intro: ['第一段 · 渗流浅滩',
      '我从一团墨水里醒来，洞穴向右延展。\nA/D・← → 游走，W/↑/空格 起跳——越小跳得越高。\n吸收沿途的墨滴，先让自己壮大一点。'] },
  { x: 960,  name: '挤身窄缝', intro: ['第二段 · 挤身窄缝',
      '前方岩壁只留一道窄缝，太大的身子过不去。\n按住 S/↓ 把水挤出去、缩小身形，\n钻过缝隙——再到对岸重新聚拢。'] },
  { x: 1820, name: '聚水撞坝', intro: ['第三段 · 聚水撞坝',
      '尽头是一道裂纹堤坝，挡住了出口。\n吞下残余的墨滴，把自己聚得足够大、足够重，\n一头撞开它，逸入洞外的天光。'] },
];
