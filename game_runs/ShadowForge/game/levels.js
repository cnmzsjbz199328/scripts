/* ShadowForge — 波次数据（数据驱动，脱离逻辑）。
 * t：入场延迟 ms；x：出生点。五关线性，每关一行 intro 叙事卡：
 * 林波(亡魂) → 愤怒(恶鬼,可吸收) → 暴力(判官米诺斯) → 欺诈(复仇女神,远程可吸收) → 背叛(冰湖亡魂+终局撒旦)。 */
Forge.WAVES = [
  {
    bg: 'bg_limbo', name: '第一关 · 林波 · 徘徊的亡魂',
    intro: '地狱的门槛只有雾与沉默——尚未审判的灵魂在此徘徊。',
    hint: 'J 化矛突刺 · K 化锤震地 · L 雾化闪避',
    spawns: [
      { t: 400,  type: 'soul', x: 800 },
      { t: 1400, type: 'soul', x: 870 },
      { t: 4200, type: 'soul', x: 110 },
      { t: 6400, type: 'soul', x: 840 },
    ],
  },
  {
    bg: 'bg_wrath', name: '第二关 · 愤怒 · 扑袭的恶鬼',
    intro: '沸腾的泥沼下，永不熄灭的怒火驱使着爪牙扑向一切。',
    hint: '击败恶鬼可吸收其「魄」——按 E 化形为它',
    spawns: [
      { t: 400,  type: 'soul',  x: 820 },
      { t: 1200, type: 'fiend', x: 880 },
      { t: 3800, type: 'fiend', x: 90 },
      { t: 6000, type: 'soul',  x: 120 },
      { t: 8000, type: 'fiend', x: 860 },
    ],
  },
  {
    bg: 'bg_violence', name: '第三关 · 暴力 · 判官米诺斯',
    intro: '嗜血之环的看守者，宽幅的挥臂足以碾碎任何迟疑。',
    hint: '巨物挥臂前有停顿——雾化穿过它，或用锤打断预备',
    spawns: [
      { t: 600,  type: 'minos', x: 780 },
      { t: 2400, type: 'soul',  x: 100 },
    ],
  },
  {
    bg: 'bg_fraud', name: '第四关 · 欺诈 · 复仇女神的低语',
    intro: '壕沟深处，诡计者的声音顺着雾气传来——不必靠近也能伤人。',
    hint: '复仇女神保持距离放投掷弹——欺身而上或化形夺其技',
    spawns: [
      { t: 400,  type: 'soul',   x: 820 },
      { t: 1800, type: 'furies', x: 860 },
      { t: 4600, type: 'soul',   x: 100 },
      { t: 6200, type: 'furies', x: 120 },
      { t: 8600, type: 'fiend',  x: 840 },
    ],
  },
  {
    bg: 'bg_betrayal', name: '第五关 · 背叛 · 冰湖尽头的撒旦',
    intro: '万古的寒潮封住了最深的罪——尽头处，背叛之主亲自看守。',
    hint: '冰湖亡魂死后留降速地带——终局撒旦是纯粹的 1v1，无援兵',
    spawns: [
      { t: 500,  type: 'icesoul', x: 840 },
      { t: 3200, type: 'icesoul', x: 100 },
      { t: 6000, type: 'satan',   x: 780 },
    ],
  },
];
