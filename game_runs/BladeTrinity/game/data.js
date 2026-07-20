/* BladeTrinity — 三流派数值表 / 帧数据 / 防御参数。
 *
 * 设计核心：三流派互为克制，而克制关系【由帧数据本身产生】，不靠额外的属性相克表。
 *
 *   水神流 克 剑神流 —— 剑神预备 280ms 大到好读，正在水神 260ms 的完美格挡窗口内
 *   剑神流 克 北神流 —— 北神闪避空放留 480ms 硬直，剑神启动快到能钓完再打
 *   北神流 克 水神流 —— 北神假动作 250ms 骗出格挡，真判定 400ms 才到，窗口已闭
 *
 * 改任何一个数字前先想清楚它压在哪条边上。
 */

// ─────────── 流派 ───────────
BT.SCHOOLS = {
  sword: {
    name: '剑神流', title: '剑神流 · 光の太刀', blurb: '先手极速 · 一击必杀',
    accent: '#e2483b', barColor: 0xe2483b,
    hp: 96, speed: 172, reach: 94,
    defense: 'brace',
    tip: '伤害最高、收招最久。硬扛减伤最多，但每次挡下都被推退。',
  },
  water: {
    name: '水神流', title: '水神流 · 受け流し', blurb: '后发制人 · 受流反击',
    accent: '#4a9fd8', barColor: 0x4a9fd8,
    hp: 104, speed: 150, reach: 90,
    defense: 'parry',
    tip: '正面进攻最弱。完美格挡卸掉对手并开反击窗口，打的是读招。',
  },
  north: {
    name: '北神流', title: '北神流 · 虚実', blurb: '奇诡骗招 · 变招夺械',
    accent: '#9a6fd0', barColor: 0x9a6fd0,
    hp: 88, speed: 192, reach: 86,
    defense: 'dodge',
    tip: '假动作先出、真刀后到，专骗对手的防御窗口。闪避空放会露大破绽。',
  },
};
BT.ROSTER = ['sword', 'water', 'north'];

// ─────────── 攻击帧数据 ───────────
// from/to 是【命中窗口】的毫秒偏移（相对出招起点）。
// 窗口位置对着图集里真实的发力帧：sword 第 8~10 帧落刀、water 第 5~10 帧横薙、
// north 第 12~16 帧才是真突刺（前面是假动作）。
// fps 与图集里记录的 fps 【故意解耦】——图集 fps 保的是视频真实时长（2 秒级），
// 游戏要的是脆，所以这里重新定帧率。
BT.ATTACK = {
  sword: { dur: 780, from: 280, to: 380, dmg: 22, lunge: 150, fps: 28, feint: 0 },
  water: { dur: 830, from: 190, to: 390, dmg: 13, lunge: 90, fps: 26, feint: 0 },
  // feint：0~250ms 是有动作但【无判定】的假动作段，骗防御用
  north: { dur: 720, from: 400, to: 545, dmg: 11, lunge: 130, fps: 30, feint: 250 },
};

// ─────────── 防御参数（三流派各一套）───────────
BT.DEFENSE = {
  // 剑神流 · 力受け —— 硬扛。减伤最多，代价是被推退，逼到边界破防
  brace: {
    reduce: 0.20, pushback: 46, breakStun: 620, edgeMargin: 70,
  },
  // 水神流 · 受け流し —— 卸力。完美窗口内挡下→对手硬直+自己开反击窗口
  parry: {
    perfect: 260, lateReduce: 0.60, attackerStun: 520,
    riposteWindow: 420, riposteBonus: 1.8,
  },
  // 北神流 · 逸らし —— 闪避。真无敌，但空放露大破绽
  dodge: {
    iframes: 200, sidestep: 62, whiffStun: 480, cooldown: 700,
  },
};

// ─────────── 动画播放参数 ───────────
// 图集是 6 行 × 21 列（192×208/格），行号见 assets/sprites/atlases.js。
// 循环行/一次性行的帧率在这里统一定，attack 的帧率由 BT.ATTACK 覆盖。
BT.ANIM = {
  idle: { fps: 14, loop: true },
  walk: { fps: 18, loop: true },
  attack: { fps: 28, loop: false },
  guard: { fps: 22, loop: false },
  hurt: { fps: 40, loop: false },
  down: { fps: 20, loop: false },
};

BT.HURT_DUR = 380;     // 受击硬直
BT.INVULN = 300;       // 受击后无敌
BT.KO_HOLD = 950;      // 倒地到结算的停顿
