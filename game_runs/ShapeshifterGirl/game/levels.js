/* game/levels.js — 关卡数据（数据驱动单一真源）
 * ─────────────────────────────────────────────────────────────────────────
 * 声明式定义 5 个关卡的长度、色调、空间触发器与收集链（加关卡不写代码）。
 * 触发器类型：hint / cleft(高台) / tunnel(矮缝) / wall(高墙) / water(深水) /
 *   chasm(壕沟) / updraft(上升气流) / rock(裂石墙) / thorns(荆棘) / enemy / lock。
 * 收集链：level.gems = [{x,y}...]，用下方 gemArc/gemLine 生成——撒在跳跃弧/滑翔航线/高台之上
 *   引导视线，只做正反馈不阻挡（Collect 系统，bot 无视，零通关风险）。
 * 节拍设计铁律：
 *  - 每关「教学 → 变奏 → 考试」三段式，空跑段 ≤450px；
 *  - 危险区（water/chasm/thorns）之间必须留 ≥150px 安全地面（lastSafeX 复归点依赖它）；
 *  - 相邻需变身节拍间距 ≥250px（auto 的 30~160px 前瞻变身窗口不互相打架）；
 *  - chasm 宽 ≤300 猫可跳，>300 需鹰（gates/auto 同源判定）；宽渊配 updraft 助滑翔；
 *  - 锁点竞技场(960px)必须放在所有需变身机关之后，不圈住任何 gate（否则锁区逼战斗形态死锁）。
 * 五关差异化：L1 温和猫教学(3600) / L2 水域为主(3800) / L3 滑翔长关(4200) /
 *   L4 战斗黑暗(3600) / L5 全形态密集混合考试+Boss(4100)。
 */
window.SSG = window.SSG || {};

// 收集链生成器：gemLine 平直一排；gemArc 沿跳跃/滑翔弧线（中点最高，lift 为拱高）
const gemLine = (x0, x1, n, y) =>
  Array.from({ length: n }, (_, k) => ({ x: Math.round(x0 + (x1 - x0) * (n === 1 ? 0 : k / (n - 1))), y }));
const gemArc = (x0, x1, n, baseY, lift) =>
  Array.from({ length: n }, (_, k) => {
    const t = n === 1 ? 0.5 : k / (n - 1);
    return { x: Math.round(x0 + (x1 - x0) * t), y: Math.round(baseY - Math.sin(t * Math.PI) * lift) };
  });

window.SSG.LEVELS = [
  {
    name: '林间小径 (L1)',
    intro: ['第一关 · 林间小径', '小径幽静，前路被山石与矮洞封锁。\n按 [2] 变身成猫：猫形态移动迅捷、跳跃更高（可二段跳），且体型娇小能钻过矮缝。\n终点处有一堵高墙，只有猫形态能跃过它。'],
    length: 3600,
    paletteIdx: 0,
    bgm: 'bgm_forest',
    triggers: [
      // ── 教学段：高台 → 矮缝 ──
      { at: 500, type: 'hint', text: '前方高台：按 [2] 变猫，跳得更高还能二段跳' },
      { at: 700, type: 'cleft', x: 700, w: 200, h: 100 },
      { at: 1100, type: 'cleft', x: 1100, w: 180, h: 140 },        // 变奏：更高，需二段跳
      { at: 1400, type: 'hint', text: '矮缝只有猫的小身板能钻过去' },
      { at: 1550, type: 'tunnel', x: 1550, w: 160, h: 42 },
      // ── 变奏段：小沟 + 台缝连击 ──
      { at: 1900, type: 'chasm', x: 1900, w: 220 },                // 猫跳可过
      { at: 2350, type: 'cleft', x: 2350, w: 160, h: 120 },
      { at: 2650, type: 'tunnel', x: 2650, w: 180, h: 42 },
      { at: 2980, type: 'chasm', x: 2980, w: 250 },
      // ── 考试段：终点高墙 ──
      { at: 3150, type: 'hint', text: '终点高墙：猫二段跳翻越！' },
      { at: 3330, type: 'wall', x: 3330, w: 80, h: 220 },
    ],
    gems: [
      ...gemArc(700, 900, 4, 360, 70),      // 跃上首个高台的弧线
      ...gemLine(1180, 1360, 3, 400),
      ...gemArc(1900, 2120, 5, 350, 80),    // 跨小沟的跳跃弧
      ...gemLine(2380, 2560, 3, 400),
      ...gemArc(2980, 3230, 5, 340, 90),    // 跨第二道沟
    ],
  },
  {
    name: '月光溪谷 (L2)',
    intro: ['第二关 · 月光溪谷', '潺潺溪水阻断了去路。人形在水中会呛水溺亡！\n按 [3] 变身成鱼：鱼形态能在水中自由游动，但上岸会因缺水而无法移动。\n落水别慌——有几秒扑腾时间够你按 [3] 变鱼。'],
    length: 3800,
    paletteIdx: 1,
    bgm: 'bgm_stream',
    triggers: [
      // ── 教学段：猫复习 → 首片水域 ──
      { at: 400, type: 'hint', text: '溪谷水深：按 [3] 变鱼渡水，落水有几秒扑腾时间再变身' },
      { at: 600, type: 'tunnel', x: 600, w: 160, h: 42 },
      { at: 950, type: 'water', x: 950, w: 450 },
      // 组合：出水即遇巡逻怪（上岸站稳再应对）
      { at: 1500, type: 'enemy', x: 1500, enemyType: 'patrol' },
      // ── 变奏段：陆水交替强制切换 ──
      { at: 1750, type: 'chasm', x: 1750, w: 240 },                // 猫跳沟
      { at: 2200, type: 'water', x: 2200, w: 650, hasTunnel: true }, // 水下通道
      { at: 2950, type: 'enemy', x: 2950, enemyType: 'patrol' },
      { at: 3050, type: 'cleft', x: 3050, w: 160, h: 100 },
      // ── 考试段：滩头遭遇战（锁点放在所有机关之后）──
      { at: 3400, type: 'lock', x: 3400, waves: [
        { spawns: [{ type: 'patrol', dx: 300 }] },
        { spawns: [{ type: 'patrol', dx: 260 }, { type: 'patrol', dx: 420 }] },
      ]},
    ],
    gems: [
      ...gemLine(1000, 1350, 4, 420),       // 贴水面引导鱼的泳线
      ...gemArc(1750, 1990, 4, 350, 70),    // 跨沟跳跃弧
      ...gemLine(2280, 2780, 5, 420),       // 长水域泳线
      ...gemArc(2900, 3100, 4, 350, 80),    // 跃上高台
    ],
  },
  {
    name: '风啸断崖 (L3)',
    intro: ['第三关 · 风啸断崖', '狂风肆虐的断崖深渊极其宽广，普通跳跃必坠入谷底。\n按 [4] 变身成鹰：在空中跳起后，按住 [W / Space] 即可滑翔（极低重力与水平漂移），\n乘着峡谷中的上升气流可以飞向高空。'],
    length: 4200,
    paletteIdx: 2,
    bgm: 'bgm_canyon',
    triggers: [
      // ── 教学段：中渊滑翔 → 气流跨渊 ──
      { at: 400, type: 'hint', text: '按 [4] 变鹰：跳起后按住 [W] 滑翔，乘上升气流可飞高' },
      { at: 550, type: 'chasm', x: 550, w: 380 },
      { at: 1150, type: 'chasm', x: 1150, w: 550 },
      { at: 1350, type: 'updraft', x: 1350, w: 220 },
      // ── 变奏段：滑翔中撞散飞行怪 + 猫缝复习 ──
      { at: 1950, type: 'enemy', x: 1950, enemyType: 'thrower' },  // 组合：鹰俯冲克制
      { at: 2150, type: 'tunnel', x: 2150, w: 160, h: 42 },
      // ── 考试段：双气流接力跨大渊 → 再一道宽渊 → 崖顶遭遇战 ──
      { at: 2500, type: 'chasm', x: 2500, w: 650 },
      { at: 2620, type: 'updraft', x: 2620, w: 180 },
      { at: 2950, type: 'updraft', x: 2950, w: 160 },
      { at: 3350, type: 'chasm', x: 3350, w: 420 },
      { at: 3480, type: 'updraft', x: 3480, w: 180 },
      { at: 3800, type: 'lock', x: 3800, waves: [
        { spawns: [{ type: 'thrower', dx: 350 }] },
        { spawns: [{ type: 'patrol', dx: 280 }, { type: 'thrower', dx: 430 }] },
      ]},
    ],
    gems: [
      ...gemArc(560, 920, 5, 320, 90),      // 滑翔航线，高拱暗示"从上方飞过"
      ...gemArc(1160, 1680, 6, 300, 120),   // 跨大渊 + 乘气流爬升
      ...gemArc(2510, 3120, 6, 300, 110),   // 双气流接力航线
      ...gemArc(3360, 3760, 5, 310, 100),   // 末道宽渊
    ],
  },
  {
    name: '碎岩洞窟 (L4)',
    intro: ['第四关 · 碎岩洞窟', '黑暗洞窟中遍地是尖锐的荆棘丛与封路的碎石巨岩，只有项链的微光照亮四周。\n按 [5] 变身成熊：熊形态厚重结实，能踏过荆棘丛而不受伤害。\n按 [J] 进行重击，可以拍碎阻挡前路的碎石墙！'],
    length: 3600,
    paletteIdx: 3,
    bgm: 'bgm_cave',
    triggers: [
      // ── 教学段：碎岩 → 荆棘 ──
      { at: 350, type: 'hint', text: '黑暗洞窟：熊 [5] 能踏荆棘、按 [J] 拍碎巨岩' },
      { at: 550, type: 'rock', x: 550, w: 60, h: 180 },
      { at: 850, type: 'thorns', x: 850, w: 300 },
      // ── 变奏段：巡逻怪 + 岩荆连打 + 黑暗矮缝 ──
      { at: 1350, type: 'enemy', x: 1350, enemyType: 'patrol' },
      { at: 1550, type: 'rock', x: 1550, w: 60, h: 180 },
      { at: 1800, type: 'thorns', x: 1800, w: 300 },
      { at: 2150, type: 'hint', text: '黑暗中的矮缝：变猫 [2] 才能钻过去' },
      { at: 2250, type: 'tunnel', x: 2250, w: 160, h: 42 },
      { at: 2550, type: 'rock', x: 2550, w: 60, h: 180 },
      { at: 2780, type: 'thorns', x: 2780, w: 200 },
      // ── 考试段：关底遭遇战收尾（锁点竞技场放在所有机关之后）──
      { at: 3150, type: 'lock', x: 3150, waves: [
        { spawns: [{ type: 'patrol', dx: 250 }, { type: 'patrol', dx: 400 }] },
        { spawns: [{ type: 'patrol', dx: 250 }, { type: 'thrower', dx: 400 }] },
      ]},
    ],
    gems: [
      ...gemLine(1050, 1250, 3, 400),       // 岩荆之间的空跑段（暗中给点亮）
      ...gemArc(1850, 2050, 3, 360, 60),
      ...gemLine(2380, 2500, 2, 400),
    ],
  },
  {
    name: '魔雾之巅 (L5)',
    intro: ['第五关 · 魔雾之巅', '红黑的云顶城堡是最后的战场。\n这里五种形态轮番上阵、机关一个接一个——读懂每道障碍，提前找变身窗口。\n城堡深处的魔兽是最后的 Boss：熊破甲 → 猫躲弹幕踩头 → 鹰飞空俯冲致命一击！'],
    length: 4100,
    paletteIdx: 4,
    bgm: 'bgm_boss',
    triggers: [
      // ── 混合考试段：五形态轮番上阵（每道 ~400-500px，读障碍→抢变身窗口；
      //    间距放宽、单沟不连打，避免漏跳千刀万剐——真混合但可通关）──
      { at: 350, type: 'hint', text: '最后的试炼：五形态轮番上阵，读障碍抢变身窗口！' },
      { at: 450, type: 'rock', x: 450, w: 60, h: 180 },            // 熊
      { at: 850, type: 'water', x: 850, w: 280 },                  // 鱼
      { at: 1450, type: 'chasm', x: 1450, w: 240 },                // 猫（窄沟，好跳）
      { at: 1950, type: 'updraft', x: 1950, w: 200 },              // 鹰
      { at: 2450, type: 'thorns', x: 2450, w: 200 },               // 熊
      { at: 2900, type: 'tunnel', x: 2900, w: 160, h: 42 },        // 猫
      { at: 3300, type: 'water', x: 3300, w: 280 },                // 鱼
      { at: 3700, type: 'rock', x: 3700, w: 60, h: 180 },          // Boss 前热身：熊破甲（破完是通往 Boss 的缓冲平地）
      // ── 关底三阶段 Boss 锁点 ──
      { at: 3900, type: 'lock', x: 3900, isBoss: true, waves: [
        { spawns: [{ type: 'boss_shield', dx: 400 }] },   // 阶段1：熊破甲
        { spawns: [{ type: 'boss_bullets', dx: 400 }] },  // 阶段2：猫躲弹幕踩头
        { spawns: [{ type: 'boss_fly', dx: 400 }] },      // 阶段3：鹰空战俯冲
      ]},
    ],
    gems: [
      ...gemArc(1450, 1690, 4, 340, 70),    // 跨沟
      ...gemArc(1750, 2000, 4, 320, 110),   // 乘气流爬升
      ...gemLine(2650, 2850, 2, 400),
      ...gemLine(3350, 3560, 3, 420),       // 水域泳线
    ],
  },
];
