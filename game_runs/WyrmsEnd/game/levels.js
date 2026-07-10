/* WyrmsEnd — 关卡数据：距离驱动（SIDESCROLLER.md §4 schema）。
 * 时间轴换空间轴：triggers 按 at（世界 x）升序，玩家推进到 at 即消费（一次性）。
 *   { at, type, dx }          散兵：玩家前/后方 dx 处生成，可打可绕（不锁镜头）
 *   { at, lock: { waves } }   锁点：镜头收成单屏，波次清完解锁；波内 spawns 的 lx
 *                             是锁定竞技场内的相对 x（0~960）。段末锁点，最终段=龙王。
 * 死亡检查点 = 段首（checkpoint 字段），横版哲学：高致死 + 检查点，不是消耗战。 */
Forge.SEGMENTS = [
  {
    name: '第一段 · 麦田村郊',
    intro: '你从村口出发时，身后还有人挥手。剑很重，走得很稳。',
    hint: 'A/D 移动 · J 化剑突刺 · K 化锤震地 · L 雾化冲刺（无敌）',
    x0: 0, x1: 3200, bg: 0,
    triggers: [
      { at: 700,  type: 'thrall', dx: 520 },
      { at: 1400, type: 'thrall', dx: 560 },
      { at: 2100, type: 'thrall', dx: 540 },
      { at: 2100, type: 'thrall', dx: -380 },
      { at: 2850, lock: { waves: [
        { spawns: [ { t: 400, type: 'thrall', lx: 780 }, { t: 900, type: 'thrall', lx: 860 }, { t: 1600, type: 'thrall', lx: 120 } ] },
        { spawns: [ { t: 400, type: 'thrall', lx: 800 }, { t: 700, type: 'thrall', lx: 100 }, { t: 1500, type: 'thrall', lx: 860 }, { t: 2200, type: 'thrall', lx: 160 } ] },
      ] } },
    ],
  },
  {
    name: '第二段 · 焦土战场',
    intro: '别人的战争烧完了这里。龙眷在灰烬里学会了扑袭。',
    hint: '幼龙扑袭有前摇——雾化穿过它，或用锤迎击',
    x0: 3200, x1: 6400, bg: 1,
    triggers: [
      { at: 3900, type: 'drake',  dx: 560 },
      { at: 4600, type: 'thrall', dx: 520 },
      { at: 4600, type: 'thrall', dx: -400 },
      { at: 5300, type: 'drake',  dx: 560 },
      { at: 5300, type: 'drake',  dx: -420 },
      { at: 6050, lock: { waves: [
        { spawns: [ { t: 400, type: 'drake', lx: 800 }, { t: 1200, type: 'drake', lx: 120 } ] },
        { spawns: [ { t: 600, type: 'drakelord', lx: 780 } ] },
      ] } },
    ],
  },
  {
    name: '第三段 · 山隘要塞',
    intro: '要塞的人把门焊死了——他们怕的不是龙，是你手上新长的东西。',
    hint: '投手保持距离掷旋刃——爪袭欺身；守卫挥斧前有停顿',
    x0: 6400, x1: 9600, bg: 2,
    triggers: [
      { at: 7100, type: 'thrall',  dx: 540 },
      { at: 7100, type: 'thrall',  dx: -380 },
      { at: 7900, type: 'drake',   dx: 560 },
      { at: 8600, type: 'slinger', dx: 600 },
      { at: 8600, type: 'thrall',  dx: 480 },
      { at: 9250, lock: { waves: [
        { spawns: [ { t: 400, type: 'thrall', lx: 800 }, { t: 800, type: 'drake', lx: 860 }, { t: 1400, type: 'thrall', lx: 120 } ] },
        { spawns: [ { t: 600, type: 'warden', lx: 780 } ] },
      ] } },
    ],
  },
  {
    name: '第四段 · 龙域骨原',
    intro: '骨原上没有风，只有旧龙的肋骨替你数着还剩多少人形。',
    hint: '身后也会有伏兵——雾化是双向的',
    x0: 9600, x1: 12800, bg: 3,
    triggers: [
      { at: 10400, type: 'slinger', dx: 600 },
      { at: 10400, type: 'thrall',  dx: 500 },
      { at: 11200, type: 'drake',   dx: 560 },
      { at: 11200, type: 'drake',   dx: 620 },
      { at: 11800, type: 'slinger', dx: -420 },
      { at: 11800, type: 'drake',   dx: 560 },
      { at: 12450, lock: { waves: [
        { spawns: [ { t: 400, type: 'slinger', lx: 820 }, { t: 900, type: 'drake', lx: 120 }, { t: 1600, type: 'slinger', lx: 140 } ] },
        { spawns: [ { t: 600, type: 'slingerqueen', lx: 800 } ] },
      ] } },
    ],
  },
  {
    name: '第五段 · 龙巢宝窟',
    intro: '金山之上盘着龙王。它看你的眼神，像在看一面迟到的镜子。',
    hint: '终局 1v1——天降凝剑落点有预警列，雾化横移脱离',
    x0: 12800, x1: 16000, bg: 4,
    triggers: [
      { at: 13600, type: 'drake',   dx: 560 },
      { at: 13600, type: 'drake',   dx: -420 },
      { at: 14300, type: 'thrall',  dx: 520 },
      { at: 14300, type: 'slinger', dx: 600 },
      { at: 15200, lock: { final: true, waves: [
        { spawns: [ { t: 400, type: 'drake', lx: 800 }, { t: 900, type: 'slinger', lx: 140 } ] },
        { spawns: [ { t: 800, type: 'wyrm', lx: 760 } ] },
      ] } },
    ],
  },
];
