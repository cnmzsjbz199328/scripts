/* game/levels.js — 关卡数据（数据驱动单一真源）
 * ─────────────────────────────────────────────────────────────────────────
 * 声明式定义 5 个关卡的长度、色调、以及空间触发器（加关卡不写代码）。
 * 触发器类型：hint / cleft(高台) / tunnel(矮缝) / wall(高墙) / water(深水) /
 *   chasm(壕沟) / updraft(上升气流) / rock(裂石墙) / thorns(荆棘) / enemy / lock。
 * 节拍设计铁律（2026-07-18 翻新版）：
 *  - 每关「教学 → 变奏 → 考试」三段式，8~10 个节拍，空跑段 ≤450px；
 *  - 危险区（water/chasm/thorns）之间必须留 ≥150px 安全地面（lastSafeX 复归点依赖它）；
 *  - 相邻需变身节拍间距 ≥250px（auto 辅助的 30~160px 前瞻变身窗口不互相打架）；
 *  - chasm 宽 ≤300 猫可跳，>300 需鹰（gates/auto 同源判定）；宽渊配 updraft 助滑翔。
 */
window.SSG = window.SSG || {};

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
    ]
  },
  {
    name: '月光溪谷 (L2)',
    intro: ['第二关 · 月光溪谷', '潺潺溪水阻断了去路。人形在水中会呛水溺亡！\n按 [3] 变身成鱼：鱼形态能在水中自由游动，但上岸会因缺水而无法移动。\n水中会有游荡的巡逻怪，避开它们！'],
    length: 3600,
    paletteIdx: 1,
    bgm: 'bgm_stream',
    triggers: [
      // ── 教学段：猫复习 → 首片水域 ──
      { at: 400, type: 'hint', text: '溪谷水深：按 [3] 变鱼渡水，人形落水会呛水！' },
      { at: 600, type: 'tunnel', x: 600, w: 160, h: 42 },
      { at: 950, type: 'water', x: 950, w: 450 },
      { at: 1200, type: 'enemy', x: 1200, enemyType: 'patrol' },   // 水中游弋，绕行
      // ── 变奏段：陆水交替强制切换 ──
      { at: 1700, type: 'chasm', x: 1700, w: 240 },                // 猫跳沟
      { at: 2150, type: 'water', x: 2150, w: 650, hasTunnel: true }, // 水下通道
      { at: 2450, type: 'enemy', x: 2450, enemyType: 'patrol' },
      { at: 2950, type: 'cleft', x: 2950, w: 180, h: 100 },
      // ── 考试段：滩头遭遇战 ──
      { at: 3200, type: 'lock', x: 3200, waves: [
        { spawns: [{ type: 'patrol', dx: 300 }] },
        { spawns: [{ type: 'patrol', dx: 260 }, { type: 'patrol', dx: 420 }] },
      ]}
    ]
  },
  {
    name: '风啸断崖 (L3)',
    intro: ['第三关 · 风啸断崖', '狂风肆虐的断崖深渊极其宽广，普通跳跃必坠入谷底。\n按 [4] 变身成鹰：在空中跳起后，按住 [W / Space] 即可滑翔（极低重力与水平漂移），\n乘着峡谷中的上升气流可以飞向高空。'],
    length: 3600,
    paletteIdx: 2,
    bgm: 'bgm_canyon',
    triggers: [
      // ── 教学段：中渊滑翔 → 气流跨渊 ──
      { at: 400, type: 'hint', text: '按 [4] 变鹰：跳起后按住 [W] 滑翔，乘上升气流可飞高' },
      { at: 550, type: 'chasm', x: 550, w: 380 },
      { at: 1200, type: 'chasm', x: 1200, w: 550 },
      { at: 1350, type: 'updraft', x: 1350, w: 220 },
      // ── 变奏段：投掷怪 + 猫缝复习 ──
      { at: 1950, type: 'enemy', x: 1950, enemyType: 'thrower' },
      { at: 2150, type: 'tunnel', x: 2150, w: 160, h: 42 },
      // ── 考试段：双气流接力跨大渊 → 崖顶遭遇战 ──
      { at: 2450, type: 'chasm', x: 2450, w: 650 },
      { at: 2570, type: 'updraft', x: 2570, w: 180 },
      { at: 2900, type: 'updraft', x: 2900, w: 160 },
      { at: 3250, type: 'lock', x: 3250, waves: [
        { spawns: [{ type: 'thrower', dx: 350 }] },
        { spawns: [{ type: 'patrol', dx: 280 }, { type: 'thrower', dx: 430 }] },
      ]}
    ]
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
      // ── 变奏段：战斗密度拉满 ──
      { at: 1350, type: 'enemy', x: 1350, enemyType: 'patrol' },
      { at: 1550, type: 'rock', x: 1550, w: 60, h: 180 },
      { at: 1800, type: 'thorns', x: 1800, w: 420 },
      { at: 2450, type: 'lock', x: 2450, waves: [
        { spawns: [{ type: 'patrol', dx: 300 }, { type: 'patrol', dx: 450 }] },
        { spawns: [{ type: 'patrol', dx: 280 }, { type: 'thrower', dx: 420 }] },
      ]},
      // ── 考试段：黑暗中缝隙变奏 + 最后一道岩荆 ──
      { at: 2850, type: 'tunnel', x: 2850, w: 180, h: 42 },
      { at: 3100, type: 'rock', x: 3100, w: 60, h: 180 },
      { at: 3250, type: 'thorns', x: 3250, w: 180 },
    ]
  },
  {
    name: '魔雾之巅 (L5)',
    intro: ['第五关 · 魔雾之巅', '红黑的云顶城堡是最后的战场。\n这里需要你综合运用所有形态通过连续的混合障碍。\n城堡深处被魔雾包围的魔兽是最后的 Boss：\n利用熊破开它的重装护盾，用猫灵活躲避弹幕并踩它的头，最后用鹰飞空俯冲致命一击！'],
    length: 3600,
    paletteIdx: 4,
    bgm: 'bgm_boss',
    triggers: [
      // ── 混合验收段：五形态全用一遍 ──
      { at: 350, type: 'hint', text: '最后的试炼：读懂障碍，提前找变身窗口！' },
      { at: 400, type: 'rock', x: 400, w: 60, h: 180 },
      { at: 700, type: 'water', x: 700, w: 350 },
      { at: 1300, type: 'chasm', x: 1300, w: 500 },
      { at: 1420, type: 'updraft', x: 1420, w: 180 },
      { at: 2000, type: 'tunnel', x: 2000, w: 160, h: 42 },
      { at: 2320, type: 'thorns', x: 2320, w: 280 },
      { at: 2650, type: 'rock', x: 2650, w: 60, h: 180 },   // Boss 前热身：破甲用熊
      // ── 关底三阶段 Boss 锁点 ──
      { at: 2800, type: 'lock', x: 2800, isBoss: true, waves: [
        { spawns: [{ type: 'boss_shield', dx: 400 }] },   // 阶段1：熊破甲
        { spawns: [{ type: 'boss_bullets', dx: 400 }] },  // 阶段2：猫躲弹幕踩头
        { spawns: [{ type: 'boss_fly', dx: 400 }] }       // 阶段3：鹰空战俯冲
      ]}
    ]
  }
];
