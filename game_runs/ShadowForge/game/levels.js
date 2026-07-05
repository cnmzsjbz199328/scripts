/* ShadowForge — 波次数据（数据驱动，脱离逻辑）。
 * t：入场延迟 ms；x：出生点。三波线性：亡魂 → 恶鬼（可吸收）→ 判官米诺斯。 */
Forge.WAVES = [
  {
    bg: 'bg_limbo', name: '第一波 · 徘徊的亡魂',
    hint: 'J 化矛突刺 · K 化锤震地 · L 雾化闪避',
    spawns: [
      { t: 400,  type: 'soul', x: 800 },
      { t: 1400, type: 'soul', x: 870 },
      { t: 4200, type: 'soul', x: 110 },
      { t: 6400, type: 'soul', x: 840 },
    ],
  },
  {
    bg: 'bg_wrath', name: '第二波 · 扑袭的恶鬼',
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
    bg: 'bg_violence', name: '第三波 · 判官米诺斯',
    hint: '巨物挥臂前有停顿——雾化穿过它',
    spawns: [
      { t: 600,  type: 'minos', x: 780 },
      { t: 2400, type: 'soul',  x: 100 },
    ],
  },
];
