/* SlimeVale — 关卡数据：距离驱动（SIDESCROLLER.md §4 schema）。
 *   { at, type, dx }            散兵：玩家前/后方 dx 处生成，可打可绕
 *   { at, pack: 'star' }        技能包：at+PACK_DX 处悬浮（单跳高度），碰到即吃、覆盖旧技能
 *   { at, lock: { waves } }     锁点：镜头收成单屏跑波次；cine:true 的锁点全程录制战斗，
 *                               主怪死后播 10s 另一视角回放（终局同理，回放完才结算）
 * 锁点一律放在 x1-800（离段间过渡雾带足够远，Boss 战不吃白雾）。
 * 死亡检查点 = 段首。 */
Forge.PACK_DX = 380;

Forge.SEGMENTS = [
  {
    name: '第一段 · 晨露草原',
    intro: '清晨的草还挂着露。枯萎的气息从东边飘来，露露鼓了鼓身体，出发了。',
    hint: 'A/D 移动 · W/空格 跳跃（最多三段）· J 露珠冲撞',
    x0: 0, x1: 2800, bg: 0,
    triggers: [
      { at: 550,  type: 'hopper', dx: 520 },
      { at: 1000, type: 'hopper', dx: 540 },
      { at: 1350, type: 'hopper', dx: 520 },
      { at: 1350, type: 'hopper', dx: 640 },
      { at: 2000, lock: { waves: [
        { spawns: [ { t: 400, type: 'hopper', lx: 720 }, { t: 900, type: 'hopper', lx: 840 } ] },
        { spawns: [ { t: 400, type: 'hopper', lx: 760 }, { t: 800, type: 'hopper', lx: 120 }, { t: 1600, type: 'hopper', lx: 860 } ] },
      ] } },
    ],
  },
  {
    name: '第二段 · 花语原野',
    intro: '花田里的伙伴都灰扑扑的。打倒它们，被偷走的露水就会流回你身上。',
    hint: '技能包只有一格记忆——吃下新形状，就会忘掉旧的',
    x0: 2800, x1: 5600, bg: 1,
    triggers: [
      { at: 3250, type: 'hopper', dx: 520 },
      { at: 3500, pack: 'slam' },
      { at: 4000, type: 'hopper', dx: 540 },
      { at: 4000, type: 'hopper', dx: -400 },
      { at: 4200, type: 'snail',  dx: 500 },
      { at: 4800, lock: { cine: true, waves: [
        { spawns: [ { t: 400, type: 'hopper', lx: 760 }, { t: 800, type: 'hopper', lx: 140 } ] },
        { spawns: [ { t: 500, type: 'shroomking', lx: 720 } ] },
      ] } },
    ],
  },
  {
    name: '第三段 · 果丘小径',
    intro: '果树上的刺蜂嗡嗡打转。跳起来——用新的形状，够到天上的敌人。',
    hint: '刺蜂悬得不高，单跳 + 冲撞就能够到；俯冲锁定的是你起手时的位置',
    x0: 5600, x1: 8400, bg: 2,
    triggers: [
      { at: 6050, type: 'bee',    dx: 560 },
      { at: 6300, pack: 'star' },
      { at: 6650, type: 'snail',  dx: 540 },
      { at: 6650, type: 'hopper', dx: -400 },
      { at: 6800, type: 'bee',    dx: 580 },
      { at: 6900, pack: 'bubble' },
      { at: 7600, lock: { waves: [
        { spawns: [ { t: 400, type: 'bee', lx: 780 }, { t: 900, type: 'hopper', lx: 140 } ] },
        { spawns: [ { t: 400, type: 'snail', lx: 760 }, { t: 1400, type: 'bee', lx: 120 }, { t: 2000, type: 'hopper', lx: 840 } ] },
      ] } },
    ],
  },
  {
    name: '第四段 · 溪谷清瀑',
    intro: '瀑布后面嗡嗡作响——蜂后把溪谷的露水，全都藏进了蜂蜡里。',
    hint: '蒲公英炮手瞄的是你此刻的位置，射出后再动就打不中你',
    x0: 8400, x1: 11200, bg: 3,
    triggers: [
      { at: 8850, type: 'puff',   dx: 600 },
      { at: 9200, type: 'hopper', dx: 520 },
      { at: 9200, type: 'puff',   dx: 640 },
      { at: 9500, pack: 'star' },
      { at: 9650, type: 'bee',    dx: 500 },
      { at: 10400, lock: { cine: true, waves: [
        { spawns: [ { t: 400, type: 'puff', lx: 800 }, { t: 900, type: 'bee', lx: 140 } ] },
        { spawns: [ { t: 500, type: 'beequeen', lx: 760 } ] },
      ] } },
    ],
  },
  {
    name: '第五段 · 云顶花冠',
    intro: '山顶那朵巨大的花早就枯了。它偷走的春天，今天要连本带利弹回来。',
    hint: '终局生根不动——藤鞭扫圈跳过去，根刺看预警挪位，种子扇留神高度',
    x0: 11200, x1: 14000, bg: 4,
    triggers: [
      { at: 11650, type: 'hopper', dx: 520 },
      { at: 11650, type: 'bee',    dx: 560 },
      { at: 11950, pack: 'slam' },
      { at: 12300, type: 'puff',   dx: 600 },
      { at: 12300, type: 'hopper', dx: -380 },
      { at: 12550, pack: 'star' },
      { at: 13200, lock: { final: true, cine: true, waves: [
        { spawns: [ { t: 400, type: 'hopper', lx: 780 }, { t: 900, type: 'puff', lx: 860 }, { t: 1300, type: 'hopper', lx: 140 } ] },
        { spawns: [ { t: 600, type: 'wiltbloom', lx: 700 } ] },
      ] } },
    ],
  },
];
