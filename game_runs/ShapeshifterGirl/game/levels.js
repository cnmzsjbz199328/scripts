/* game/levels.js — 关卡数据（数据驱动单一真源）
 * ─────────────────────────────────────────────────────────────────────────
 * 声明式定义 5 个关卡的长度、背景纹理、色调调色板、以及空间触发器。
 * 触发器包括：高墙、矮洞、深水区、宽壕沟、上升气流、裂石墙、荆棘丛、敌人生出与锁点波次。
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
      // 高台/矮缝教学
      { at: 800, type: 'hint', text: '前方高台：按 [2] 变猫以跳得更高' },
      { at: 1200, type: 'cleft', x: 1300, w: 200, h: 100, hint: 'cleft' }, // 高台
      { at: 1800, type: 'tunnel', x: 2000, w: 160, h: 42, hint: 'low-tunnel' }, // 矮缝 (高42, 只有猫高36能过，人高72过不去)
      { at: 2800, type: 'wall', x: 3000, w: 80, h: 220 }, // 终点高墙 (高220, 需要猫跳高-680爬过)
    ]
  },
  {
    name: '月光溪谷 (L2)',
    intro: ['第二关 · 月光溪谷', '潺潺溪水阻断了去路。人形在水中会呛水溺亡！\n按 [3] 变身成鱼：鱼形态能在水中自由游动，但上岸会因缺水而无法移动。\n水中会有游荡的巡逻怪，避开它们！'],
    length: 3600,
    paletteIdx: 1,
    bgm: 'bgm_stream',
    triggers: [
      { at: 600, type: 'chasm', x: 700, w: 250 }, // 壕沟
      { at: 1000, type: 'water', x: 1100, w: 600 }, // 深水区 (x: 1100-1700)
      { at: 1400, type: 'enemy', x: 1400, enemyType: 'patrol' }, // 水中巡逻怪
      { at: 2000, type: 'water', x: 2100, w: 800, hasTunnel: true }, // 第二片水域 + 底部通道
      { at: 2300, type: 'enemy', x: 2400, enemyType: 'patrol' },
      { at: 3200, type: 'lock', x: 3200, waves: [
        { spawns: [{ type: 'patrol', dx: 300 }] }
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
      { at: 600, type: 'chasm', x: 750, w: 600 }, // 宽壕沟 (需要鹰滑翔)
      { at: 1500, type: 'updraft', x: 1600, w: 250 }, // 上升气流
      { at: 1550, type: 'chasm', x: 1500, w: 800 }, // 气流下的深渊
      { at: 2000, type: 'enemy', x: 2200, enemyType: 'thrower' }, // 投掷怪
      { at: 2600, type: 'updraft', x: 2700, w: 300 },
      { at: 2650, type: 'chasm', x: 2600, w: 900 },
      { at: 3200, type: 'lock', x: 3200, waves: [
        { spawns: [{ type: 'thrower', dx: 350 }] }
      ]}
    ]
  },
  {
    name: '碎岩洞窟 (L4)',
    intro: ['第四关 · 碎岩洞窟', '黑暗洞窟中遍地是尖锐的荆棘丛与封路的碎石巨岩。\n按 [5] 变身成熊：熊形态厚重结实，能踏过荆棘丛而不受伤害。\n按 [J] 进行重击，可以拍碎阻挡前路的碎石墙！'],
    length: 3600,
    paletteIdx: 3,
    bgm: 'bgm_cave',
    triggers: [
      { at: 600, type: 'rock', x: 800, w: 60, h: 180 }, // 裂石墙 (需要熊J击碎)
      { at: 1200, type: 'thorns', x: 1300, w: 400 }, // 荆棘丛 (熊踩着不掉血，其他扣血)
      { at: 1800, type: 'lock', x: 1800, waves: [
        { spawns: [{ type: 'patrol', dx: 300 }, { type: 'patrol', dx: 450 }] }
      ]},
      { at: 2400, type: 'rock', x: 2600, w: 60, h: 180 },
      { at: 2500, type: 'thorns', x: 2700, w: 500 },
      { at: 3200, type: 'lock', x: 3200, waves: [
        { spawns: [{ type: 'patrol', dx: 300 }, { type: 'thrower', dx: 400 }] }
      ]}
    ]
  },
  {
    name: '魔雾之巅 (L5)',
    intro: ['第五关 · 魔雾之巅', '红黑的云顶城堡是最后的战场。\n这里需要你综合运用所有形态通过连续的混合障碍。\n城堡深处被魔雾包围的魔兽是最后的 Boss：\n利用熊破开它的重装护盾，用猫灵活躲避弹幕并踩它的头，最后用鹰飞空俯冲致命一击！'],
    length: 3600,
    paletteIdx: 4,
    bgm: 'bgm_boss',
    triggers: [
      { at: 500, type: 'rock', x: 650, w: 60, h: 180 },
      { at: 800, type: 'water', x: 900, w: 400 },
      { at: 1400, type: 'chasm', x: 1500, w: 700 },
      { at: 1500, type: 'updraft', x: 1650, w: 200 },
      { at: 1700, type: 'enemy', x: 1800, enemyType: 'thrower' },
      { at: 2200, type: 'thorns', x: 2300, w: 400 },
      // 关底三阶段 Boss 锁点
      { at: 2800, type: 'lock', x: 2800, isBoss: true, waves: [
        { spawns: [{ type: 'boss_shield', dx: 400 }] },   // 阶段1：熊破甲
        { spawns: [{ type: 'boss_bullets', dx: 400 }] },  // 阶段2：猫躲弹幕踩头
        { spawns: [{ type: 'boss_fly', dx: 400 }] }       // 阶段3：鹰空战俯冲
      ]}
    ]
  }
];
