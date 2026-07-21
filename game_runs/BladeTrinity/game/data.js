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
    hp: 96, speed: 172,
    defense: 'brace',
    tip: '伤害最高、收招最久。硬扛减伤最多，但每次挡下都被推退。',
  },
  water: {
    name: '水神流', title: '水神流 · 受け流し', blurb: '后发制人 · 受流反击',
    accent: '#4a9fd8', barColor: 0x4a9fd8,
    hp: 104, speed: 150,
    defense: 'parry',
    tip: '正面进攻最弱。完美格挡卸掉对手并开反击窗口，打的是读招。',
  },
  north: {
    name: '北神流', title: '北神流 · 虚実', blurb: '奇诡骗招 · 变招夺械',
    accent: '#9a6fd0', barColor: 0x9a6fd0,
    hp: 88, speed: 192,
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

// reach 不再手写，由【逐帧刀长表】算出。手写值曾定在 86~94，而实测挥砍帧
// 刀尖能到 148~160 —— 表现为"要贴脸才打得到"。
//
// ⚠️ 取【命中窗口内刀长的中位数】。三种口径都试过：
//   峰值   —— 只在挥到最开的一两帧成立，站这么远其余帧全空（bot 五局输三局）
//   最小值 —— 把窗口刚开、刀还没伸出的帧也算进来，射程被拉回手写值那么近
//   中位数 —— 窗口内约一半的帧够得着；判定只要有一帧命中就latch，可靠性足够
// 真正的命中判定走 loop.js 的 _bladeReach()，按当前播放帧取实际刀长，
// 所以贴身和极限距离都能打中特定帧，这里只是 AI/probe 的站位参考。
// 这是 AI 交战距离 / probe inRange 的标称值；真正的命中判定走
// loop.js 的 _bladeReach()，按当前播放帧取实际刀长。
for (const id of BT.ROSTER) {
  const a = BT.ATTACK[id], tbl = BT.REACH[id];
  const f0 = Math.max(0, Math.floor(a.from / 1000 * a.fps));
  const f1 = Math.min(tbl.length - 1, Math.ceil(a.to / 1000 * a.fps));
  const win = tbl.slice(f0, f1 + 1).sort((x, y) => x - y);
  const mid = win[Math.floor(win.length / 2)];      // 中位数
  BT.SCHOOLS[id].reach = Math.round(mid * BT.SCALE + BT.BODY_HALF_W);
}

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

// ─────────── 对手 AI 强度 ───────────
// 按 game-playtest 的朴素 bot（逼近→到射程就砍）标定：目标是 bot 稳定通关但要挨打，
// 剩余血量落在三到六成。人类玩家比 bot 会走位，实际体感会更容易些。
// decision 间隔必须【短于】受击硬直+无敌（380+300=680ms），否则被连打时 AI 轮不到出手。
BT.AI = {
  decisionMin: 260, decisionMax: 560,
  guardBias: 0.18,        // 空闲时交防御的概率
  guardOnAttack: 0.34,    // 对手正在出招时交防御的概率
  damageScale: 0.55,      // AI 伤害折扣——纯难度旋钮，不影响流派间的相对强弱
};

BT.HURT_DUR = 380;     // 受击硬直
BT.INVULN = 300;       // 受击后无敌
BT.KO_HOLD = 950;      // 倒地到结算的停顿

// ─────────── 蓝条（奥义资源）───────────
// 一管蓝 = 3 发完整剑气；随时间自动回复（用户定：不靠打中/防御回蓝）。
// ⚠️ 回复速率是核心手感旋钮：refill 太快 → 奥义随便放，平A 没人用；太慢 → 一场
// 打不出几发，多样性回落。regen 按"满管约 13 秒"起标，让一场里能穿插 3~5 发。
BT.MP = {
  max: 300,          // 3 发 × ultCost
  ultCost: 100,      // 一发完整剑气的蓝耗（蓄力按比例扣，见 charge.js）
  regen: 23,         // 每秒回蓝
  drainRate: 100 / 420,   // 蓄力每毫秒扣蓝：满蓄 420ms 正好一发（占位，charge.js 用）
};

// ─────────── 三连战擂台 ───────────
// 选自己流派 → 依次打另两家（换对手强制打法多样，撑住"≥2 分钟且不单调"）。
BT.ROUND_HEAL = 0.45;   // 每过一场，玩家回这么多比例的血（半回血：survivable 但不能硬吃）
BT.ROUND_HOLD = 1100;   // 一场结束到下一场登台的停顿（对手倒地演出时间）
