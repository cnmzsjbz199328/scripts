/* ShadowNinja — 关卡常量/几何/数值(引用 TILEMAP_DATA,须在 config.js 之后);由 game-logic.js 顶部平移。 */
/* ShadowNinja — 影忍：将军府之夜（短篇完整游戏版）
 * 剪影潜行 (silhouette stealth side-scroller)，三幕结构 + 叙事过场 + 检查点。
 *
 * demo → 短篇完整游戏的结构升级：
 *  · 开场卡 →【一幕·外院回廊】教学 →【二幕·中庭望楼】探照灯 →【三幕·内牢深处】高潮 → 结局卡
 *  · 检查点：被照中退回本幕起点（满血），不从头来；死亡预算耗尽才真正失败
 *  · 每幕彩色雾气叠层区分氛围（暖灯笼 / 冷探照 / 红火盆）
 *  · 剧情卡为画布内浮层，自包含
 *  · 玩法纵深：计时铁闸(逼迫卡节奏，绝不夹人) + 屋脊平台(纵向掩体) + 救人后警报逃脱高潮(师弟跟随)
 *  · 暴露 window.__probe()/__advanceCard() 供 autoplay 白盒自测（坐标/血量/幕/目标/危险/铁闸）
 *
 * 角色：逐帧 SVG（svg-sprite rig，姿态可控的剪影忍者，优雅低姿潜行）。地面 tilemap solid + 程序化近黑瓦片。
 */

const GAME_W = 960;
const GAME_H = 540;
const TILE = 64;
const WORLD_W = (TILEMAP_DATA.width || 75) * TILE;   // 4800
const WORLD_H = (TILEMAP_DATA.height || 9) * TILE;    // 576
const FLOOR_TOP = WORLD_H - 2 * TILE;                 // 448
// 出生点须高于地面，让角色体自由下落、干净落在瓦片顶面；
// 若出生时已嵌入地面，堆叠瓦片会把体卡到行间缝隙、横向被瓦片侧面挡死。
const SPAWN_Y = FLOOR_TOP - 60;

const PLAYER_SPEED = 200;
const CROUCH_SPEED = 95;
const JUMP_V = 480;
// 站立 / 匍匐两套碰撞体（共享同一脚底，切换不抬高/下沉精灵，避免抖动）
const BODY_STAND = { w: 46, h: 110, ox: 66, oy: 62 };  // 站立：体高，够得着门钥
const BODY_PRONE = { w: 46, h: 30,  ox: 66, oy: 142 }; // 匍匐：体极矮、贴地，够不着高处门钥
// 门钥悬挂高度：匍匐时够不着，须站起 / 跳起
const KEY_STAND_Y = 398;  // 站立可取
const KEY_JUMP_Y  = 330;  // 须跳起才取
const WARM = 0xffd27a;
const DEATH_BUDGET = 5;   // 死亡预算（耗尽才真正失败），检查点让每幕重来更友好

// 忍者 SVG 帧（须与 scratch/gen_ninja_svg.mjs 的 VB / 帧数一致）
const NJ_VB = { w: 178, h: 190 };
const NJ_FRAMES = { idle: 5, run: 6, crouch: 5, jump: 3, hurt: 3 };
const NJ_SCALE = 0.62;

// 环境帧（svg-ambient skill 生成，须与 scratch/gen_shadowninja_ambient.mjs 一致）
const AMB_FRAMES = { cloud: 8, campfire: 6, flag: 8 };
// 火盆（暖光点）与破幡（灰旗）沿世界横向的投放点
const BRAZIERS = [520, 1560, 3200, 3700];
const BANNERS = [340, 1340, 2700, 3980];

// ── 三幕定义（沿同一横向世界推进）────────────────────────────
// startX：本幕检查点（被照中退回此处）；fog：本幕氛围色叠层
const ACTS = [
  { name: '外院回廊', startX: 60,   fog: 0x1a0f05, fogA: 0.0,
    intro: ['第一幕 · 外院回廊',
      '纸灯笼在回廊间投下摇曳的暖光，一名武士提灯定线巡逻。\n月隐于云——按住 S / ↓ 匍匐贴地，灯笼的光锥便照不穿你伏低的身形。\n但门钥悬在高处：待武士转身、光锥扫开，起身一把取下，随即重新伏低。'] },
  { name: '中庭望楼', startX: 1500, fog: 0x06121e, fogA: 0.18,
    intro: ['第二幕 · 中庭望楼',
      '望楼上的探照灯笼开始来回扫射，光柱与立柱的阴影交错。\n守卫更密了。看准光柱扫过的节奏，匍匐穿行；取高处门钥时须起身、甚至纵身跳起，动作要快。\n它们是打开最深处那道铁锁的唯一指望。'] },
  { name: '内牢深处', startX: 3150, fog: 0x1e0606, fogA: 0.22,
    intro: ['第三幕 · 内牢深处',
      '火盆的幽光映着铁栅，这里守备最密。\n师弟就关在尽头的牢笼里。\n集齐门钥，避开最后的光网，潜抵牢前——把他带回家。'] },
];

const GOAL_SCORE = 5;

// 巡逻守卫（灯笼光锥，蹲伏可避）
const GUARDS = [
  { x: 900,  range: 210 },                        // 一幕：单个，教学
  { x: 2050, range: 230 }, { x: 2850, range: 200 }, // 二幕
  { x: 3650, range: 200 }, { x: 4250, range: 170 }, // 三幕
];
// 望楼探照灯（扫射光柱，蹲伏可避）：二幕起
const LIGHTS = [1900, 2950, 3850];
// 门钥（5 把必拾，均在牢笼之前）。均悬于高处——匍匐够不着，须趁安全间隙起身/跳起。
// 刻意置于守卫光锥 / 探照光柱覆盖处：起身即暴露，必须卡准光照扫开的节奏。
const KEYS = [
  { x: 860,  y: KEY_STAND_Y },              // 一幕：武士灯笼旁，待其转身、起身速取（教学）
  { x: 1900, y: KEY_STAND_Y },              // 二幕：探照光柱下，趁扫开间隙起身
  { x: 2850, y: KEY_JUMP_Y, jump: true },   // 二幕：高悬铁闸前，须跳起够取
  { x: 3650, y: KEY_STAND_Y },              // 三幕：守卫巡线上起身取
  { x: 3850, y: KEY_JUMP_Y, jump: true },   // 三幕高潮：光网下纵身跃取
];
// 计时铁闸（周期开合，逼迫卡节奏等待——令"一路狂奔"行不通）。
// 开窗均 >=1.4s，保证停在门前的玩家/ bot 总能在一个开窗内稳过，绝不软锁。
const GATES = [
  { x: 1250, period: 2900, open: 1050, phase: 0 },
  { x: 2350, period: 3000, open: 1050, phase: 1400 },
  { x: 2900, period: 2800, open: 1000, phase: 700 },
  { x: 3550, period: 3000, open: 1050, phase: 1900 },
  { x: 4450, period: 2800, open: 1150, phase: 300 },  // 逃脱段
];
// 屋脊平台（剪影屋顶，可跳上作掩体；附 1 把可选奖励钥匙）
const PLATFORMS = [
  { x: 1700, y: FLOOR_TOP - 96,  w: 240 },
  { x: 3050, y: FLOOR_TOP - 116, w: 220 },
];
const CELL_X = 4150;            // 牢笼：集齐钥匙后到此救出师弟
const EXIT_X = WORLD_W - 60;    // 府门：救人后冲到此处逃离（高潮）

