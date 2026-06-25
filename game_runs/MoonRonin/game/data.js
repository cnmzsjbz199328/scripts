/* MoonRonin — 关卡/视界常量从 game-logic.js 顶部平移；顶层引用 TILEMAP_DATA(须后于 config.js)。 */
const GAME_W = 960;
const GAME_H = 540;
const TILE = 64;
const WORLD_W = (TILEMAP_DATA.width || 80) * TILE;   // 5120
const WORLD_H = (TILEMAP_DATA.height || 9) * TILE;
const PLAYER_SPEED = 230;
const JUMP_V = 640;   // 跳跃留足余量：缺口/升高屋脊都能宽松越过（对人/ bot 都更可靠）
const END_X = WORLD_W - 5 * TILE;   // 4800
const DEATH_BUDGET = 5;
const SPAWN_Y = 320;

// ── 月光视界（月光越多，照亮的世界越大）──
// 暗幕只盖在背景全景上（深度 -50，介于 bg -100 与瓦片 0 之间）：
// 脚下屋脊 / 月光 / 夜枭 / 鹭 永远清晰可读，仅远景庙宇剪影被夜色吞没。
const LIGHT_MIN = 210;       // 下限：零月光时也照亮脚下与前方落点，保证公平
const LIGHT_PER_ORB = 26;    // 每拾一缕月光，光晕半径增长
const LIGHT_BIAS = 70;       // 光晕朝奔跑方向前倾，多看前路

// ── 鹭身周的月辉光环（additive 叠加在前景，月光越多越亮越大）──
const GLOW_MIN_R = 70;       // 零月光时的微弱底光
const GLOW_PER_ORB = 11;     // 每拾一缕，光环半径增长
const GLOW_MIN_A = 0.12;     // 零月光时的底 alpha
const GLOW_PER_ORB_A = 0.05; // 每拾一缕，光环增亮

// 屋脊段（来自 tilemap _segs：[c0,c1,row]）→ x 区间与顶面 y
const SEGS = (TILEMAP_DATA._segs || []).map(([c0, c1, row]) => ({
  x0: c0 * TILE, x1: (c1 + 1) * TILE, topY: row * TILE,
}));
const segAt = (x) => SEGS.find(s => x >= s.x0 - 4 && x <= s.x1 + 4) || null;

// ── 三幕（沿屋脊推进；startX 落在安全屋脊上）──
const ACTS = [
  { name: '外院飞檐', startX: 90,   fog: 0x140d04, fogA: 0.5,
    intro: ['第一幕 · 外院飞檐',
      '截获了将军通敌的密信，鹭必须趁夜踏过层层屋脊带它出府。\n← → / A D 奔跑，W / ↑ / 空格 起跳，越过屋脊间的庭院缺口。\n沿途的月光，要在它熄灭前聚齐。'] },
  { name: '中庭高脊', startX: 2150, fog: 0x06101c, fogA: 0.68,
    intro: ['第二幕 · 中庭高脊',
      '屋脊更高，缺口更宽，夜枭开始在庭院上空盘旋。\n看准起跳的边缘，别在半空被夜枭扑中——\nJ 挥刀，可将扑来的夜枭斩落。'] },
  { name: '府墙尽头', startX: 4190, fog: 0x1a0608, fogA: 0.82,
    intro: ['第三幕 · 府墙尽头',
      '最后一段断续飞檐，尽头便是可纵身跃下的府墙。\n月光将尽，夜枭最密。\n聚齐月光，奔过最后的缺口，跃下府墙，把密信带向黎明！'] },
];

const GOAL_SCORE = 7;
// 月光：每段屋脊面上 1 缕（必经，奔跑即可拾），共 8 → 目标 7（容错 1）
const ORBS = SEGS.map(s => ({ x: (s.x0 + s.x1) / 2, y: s.topY - 30 }));
// 夜枭（盘旋于缺口上空）：逐幕增多
const CROWS = [
  { x: 700,  y: 300, range: 70 },                         // 一幕 1 只
  { x: 2050, y: 250, range: 90 }, { x: 2760, y: 240, range: 80 },  // 二幕
  { x: 4120, y: 300, range: 80 }, { x: 4720, y: 250, range: 90 },  // 三幕
];
