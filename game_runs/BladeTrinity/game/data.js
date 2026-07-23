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
    // 剑气随「大上段·斜劈而下」的挥砍（BT.QI_SEGS.sword=[[6,12,chop]]）。走两阶段轨迹驱动：
    // 丝带按 BLADE_MARKS 攒、脱手成 chop 竖长月牙。curv 定月牙前凸、trailW 定丝带宽；
    // angleDeg/emitY/spanMul/thickMul 仅老回落法(_qiCfg)用，本派已不吃。
    qi: { angleDeg: 38, spanMul: 3.0, thickMul: 0.95, curv: 0.46, emitY: -54, trailW: 0.4 },
  },
  water: {
    name: '水神流', title: '水神流 · 受け流し', blurb: '后发制人 · 受流反击',
    accent: '#4a9fd8', barColor: 0x4a9fd8,
    hp: 104, speed: 150,
    defense: 'parry',
    tip: '正面进攻最弱。完美格挡卸掉对手并开反击窗口，打的是读招。',
    // 剑气随「横薙ぎ·平扫」的挥砍（BT.QI_SEGS.water=[[10,13,sweep]]）：脱手成 sweep 宽扁立体月牙。
    qi: { angleDeg: 76, spanMul: 4.4, thickMul: 0.5, curv: 0.3, emitY: -42, trailW: 0.4 },
  },
  north: {
    name: '北神流', title: '北神流 · 虚実', blurb: '奇诡骗招 · 变招夺械',
    accent: '#9a6fd0', barColor: 0x9a6fd0,
    hp: 88, speed: 192,
    defense: 'dodge',
    tip: '假动作先出、真刀后到，专骗对手的防御窗口。闪避空放会露大破绽。',
    // 剑气随二段斩（BT.QI_SEGS.north=[[9,11,chop],[12,13,sweep]]）：斜劈 chop + 反手横扫 sweep，两道相继。
    qi: { angleDeg: -32, spanMul: 3.3, thickMul: 0.55, curv: 0.56, emitY: -28, trailW: 0.4 },
  },
};
BT.ROSTER = ['sword', 'water', 'north'];

// ─────────── 攻击帧数据 ───────────
// from/to 是【命中窗口】的毫秒偏移（相对出招起点）。
// 窗口位置对着图集里真实的发力帧：sword 第 8~10 帧落刀、water 第 5~10 帧横薙、
// north 第 12~16 帧才是真突刺（前面是假动作）。
// fps 与图集里记录的 fps 【故意解耦】——图集 fps 保的是视频真实时长（2 秒级），
// 游戏要的是脆，所以这里重新定帧率。
// dmg 相比原版砍约三成：平A 是不耗蓝的白嫖输出，把伤害空间让给蓄力奥义（BT.QI），
// 逼玩家穿插放剑气而不是一路平砍。原值 sword22/water13/north11。
BT.ATTACK = {
  sword: { dur: 780, from: 280, to: 380, dmg: 15, lunge: 150, fps: 28, feint: 0 },
  water: { dur: 830, from: 190, to: 390, dmg: 9,  lunge: 90, fps: 26, feint: 0 },
  // feint：0~250ms 是有动作但【无判定】的假动作段，骗防御用
  north: { dur: 720, from: 400, to: 545, dmg: 8,  lunge: 130, fps: 30, feint: 250 },
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
  // 跳跃：蹲踞蓄力→踏空腾空（收腿）→落地缓冲。21 帧 @26fps ≈ 0.81s，
  // 正好压住物理滞空时长（vy=-600 / g=1500 → 上下各 0.4s = 0.8s）。
  // 三家都有 jump 行；缺行时退回 idle（见 combat.js _playAir 的安全网）。
  jump: { fps: 26, loop: false },
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

// ─────────── 蓄力奥义（按住 L）───────────
// 边蓄边扣蓝：drainRate×蓄力毫秒 = 已扣蓝。蓄满 fullMs 正好扣掉 ultCost。
// 松手出【等比】剑气（蓄六成→六成大小/伤害）。蓝扣光则自动放出当前档。
// minFrac：低于这个蓄力比例视为"轻点"，只起浪弹开、不出剑气（脱身用，仍付了蓝）。
BT.CHARGE = {
  fullMs: 100 / (100 / 420),   // = ultCost/drainRate = 420ms，与 MP.drainRate 咬合
  minFrac: 0.22,               // 出剑气的最低蓄力比例
  // ── 起手·描边一弹（轰飞开场，见 charge.js _chargeWave）──
  // 蓄力起手瞬间：人物外轮廓炸开一层描边（动漫式），同时把对手轰到擂台最远端，
  // 给剑气腾出满场飞行空间。关键：轰飞必须把对手打进 hurt 硬直（waveStun 期间
  // AI 不夺回控制，setVelocity 才留得住——否则下一帧 _controlAI 就把速度清了）。
  // wavePush×waveStun 要 ≥ 一个擂台宽(960)，飞到头由世界边界收住，宁大勿小。
  wavePush: 1250,              // 轰飞横向初速 px/s（×waveStun≈650px，撞墙封顶不出场）
  waveLift: 360,               // 轰飞上挑初速 px/s（重力 1500 → 一记小抛物线）
  waveStun: 520,               // 轰飞硬直+无敌 ms（这段对手不受控，velocity 得以保留）
};

// ─────────── 剑气弹幕 ───────────
// 月牙形气刃，脱离角色飞行；越飞越大越淡（有衰减）。判定走横向扫掠 [上帧,本帧]、
// 同锚点比 y（防命中隧穿/纵向锚点错位两类历史 bug）。可防：水反弹/北穿过/剑减伤推退。
BT.QI = {
  speed: 520,          // 飞行速度 px/s
  life: 1500,          // 存活毫秒（到时消散）
  growth: 1.6,         // 存活期内缩放从 1 长到 growth 倍
  baseR: 46,           // 满蓄时初始半径（屏幕px）；实际按蓄力比例缩
  // 月牙形状/倾角【按流派各异】，见 BT.SCHOOLS[id].qi（angleDeg 倾角 spanMul 长度
  // thickMul 厚度 curv 前凸 emitY 出招高度）——剑气贴合各自的挥砍轨迹，见 charge.js _qiCfg。
  hitH: 78,            // 纵向命中容差（同锚点比 y）
  dmg: { sword: 26, water: 16, north: 14 },   // 满蓄伤害；按蓄力比例缩
  bracePush: 150,      // 剑神硬扛剑气的推退
};

// ─────────── 逐帧刀线标定（轨迹驱动剑气用）───────────
// 帧号 → [剑尖x, 剑尖y, 剑根x, 剑根y]，纹理px·相对精灵中心·前向为+x（朝右口径，朝左由 dir 镜像）。
// 无生成工具——demo.html 手动逐帧校准（拖拽剑尖/剑根手柄）导出（见 [[bladetrinity-blade-angle-missing]]）。
// charge.js 用它做两阶段剑气：①蓄成=刀尖轨迹拖尾丝带随刀生长；②脱手=紧凑月牙水平前飞。
// worldX = sprite.x + dir*x*BT.SCALE, worldY = sprite.y + y*BT.SCALE。
BT.BLADE_MARKS = {
  sword: {
    0:[-52,-46,18,-31], 1:[-62,-30,8,-33], 2:[-64,-12,1,-34], 3:[-64,7,-12,-34],
    4:[-63,16,-12,-33], 5:[-58,19,-12,-33], 6:[-59,15,-8,-36], 7:[-46,-31,22,-34],
    8:[10,-70,37,-8], 9:[70,8,16,40], 10:[81,50,12,46], 11:[87,63,21,49],
    12:[88,64,17,50], 13:[89,62,22,49], 14:[89,61,23,49], 15:[89,55,21,46],
    16:[92,50,19,44], 17:[93,36,24,44], 18:[91,25,21,42], 19:[91,3,25,38], 20:[82,-14,31,30],
  },
  water: {
    4:[76,48,24,34], 5:[85,26,25,36], 6:[83,24,26,42], 7:[43,52,5,43], 8:[-57,37,-17,21],
    9:[-64,24,-13,20], 10:[-65,22,7,22], 11:[86,19,37,13], 12:[86,8,36,11], 13:[88,8,38,11], 14:[88,11,26,13],
  },
  north: {
    9:[-59,31,-21,-8], 10:[-3,-38,25,12], 11:[36,48,-21,29], 12:[-56,17,19,37], 13:[91,32,40,28],
  },
};

// ─────────── 剑气生成段 ───────────
// 每派一列 [起帧, 止帧, 形态]；一段 = 一道剑气。段内刀尖轨迹攒成丝带，推进到止帧脱手成飞行月牙。
// 形态 chop=竖劈(竖长薄片) / sweep=横扫(宽扁+竖向明暗立体感)。北神二段斩=斜劈+反手横扫，两道相继。
// 帧号对着 BLADE_MARKS 已标定帧；改这里等于改剑气的时机/形态（demo.html 里逐派磨定）。
BT.QI_SEGS = {
  sword: [[6, 12, 'chop']],
  water: [[10, 13, 'sweep']],
  north: [[9, 11, 'chop'], [12, 13, 'sweep']],
};

// ─────────── 移形换影（SPACE，借 WyrmsEnd 雾化冲刺）───────────
// 一个方向敏感的瞬移键：按住上(W/↑)时 = 升空（纵向瞬移进空中，躲贴地招、可空中出招），
// 否则 = 缩地（横向瞬移，拉开/贴脸/绕背躲剑气）。两者都【全程无敌 + 留残影】、走冷却、
// 不耗蓝（蓝只喂奥义，两经济不缠绕）。残影先用精灵拖尾（复用 _ghost 思路），要雾感再上点云。
BT.BLINK = {
  dist: 215,        // 缩地水平位移
  riseH: 175,       // 升空高度
  groundCd: 820,    // 缩地冷却
  riseCd: 1050,     // 升空冷却
  iframe: 260,      // 无敌窗口（瞬移是即时的，无敌覆盖落地前后一小段）
  ghosts: 6,        // 残影拖尾数
};

// ─────────── 三连战擂台 ───────────
// 选自己流派 → 依次打另两家（换对手强制打法多样，撑住"≥2 分钟且不单调"）。
BT.ROUND_HEAL = 0.45;   // 每过一场，玩家回这么多比例的血（半回血：survivable 但不能硬吃）
BT.ROUND_HOLD = 1100;   // 一场结束到下一场登台的停顿（对手倒地演出时间）
