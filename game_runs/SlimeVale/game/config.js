/* SlimeVale（清泉谷的露露）— 全局命名空间与调参。
 * 横版推进 · 三段跳 · 露水流转：枯萎之冠偷走了山谷的露水，最小的史莱姆一路向东讨还。
 * 核心机制三件套：
 *   1) 三段跳（无平台，跳跃即防御——所有地面 AOE 都能跳过，飞行敌逼你回到地面节奏）
 *   2) 单格形状记忆（初始露珠冲撞；吃技能包换新技能，旧技能随露而逝——变形引擎承载）
 *   3) 露水流转（击杀吸收敌方总血量的一部分；受击则等量露水流向对方，双向都有上限防雪崩）
 * 骨架按 game_runs/SIDESCROLLER.md 蓝图实现。
 * 共享引擎（_engine/pointcloud|morph）按约定读 window.Forge.C.DEPTH/FXN/C.INK，
 * 故本游戏命名空间沿用 Forge（每页只跑一个游戏，不冲突）。 */
window.Forge = {};

Forge.W = 960;
Forge.H = 540;

// ── 世界（横版推进：世界远宽于屏，摄像机是滑动窗口）──
Forge.WORLD = {
  W: 14000,                  // 5 段 × 2800
  H: 540,
  FEET_Y: 452,
};

// ── 摄像机 ──
Forge.CAM = {
  lerp: 0.12,
  aheadFrac: 0.32,           // 玩家钉在画面左 32%，前方多留视野
  leashScreens: 1.5,         // 非锁点敌落后镜头超此屏数 → 清理
  edgePad: 40,
};

Forge.C = {
  FEET_Y: 452,
  INK: 0x2c5a4c,             // 粒子基色：深苔绿（亮背景上仍读得清）
  DEPTH: {
    BG: -100, CLOUD: -96, MID: -90, GROUND: -60, SHADOW: -53, PICK: -52,
    CHAR: -50, RING: -47, FX: -46, BAR: -44, FG: -30, FOG: -28, VIGN: -20,
    TOAST: 90, CINE: 95,
  },
};

// ── 跳跃物理：无平台，纵向全靠三段跳（第 2/3 段略弱，读作"越弹越勉强"）──
Forge.PHYS = { grav: 2400, jumpV: [-760, -700, -650], maxJumps: 3 };

// ── 玩家：横版哲学 = 薄血 + 检查点（死亡回段首），露水流转补给贴在击杀上 ──
Forge.PLAYER = { maxHp: 12, lives: 3, invulnMs: 900, speed: 250, scale: 1 };

// 露水流转：击杀回填 = 敌总血量 × ~40%（各敌的 absorb 已预算好写死，方便微调）；
// 受击流失 = 伤害 × hitRate 反哺攻击者（上限 = 其自身总血量，防"打不死的越打越肥"）。
// 两条防雪崩钳制（playtest 实测校准）：
//   1) Boss 吸露减半（bossHitRate）——血池大 + 战斗长，等量回抽会形成死亡螺旋；
//   2) 只有身体攻击（扑砸/俯冲/冲撞/踏地）转移露水，弹幕与地面轰炸不吸——
//      否则远程 Boss 打成"互喂拉锯"，谁也磨不死谁
Forge.DEW = { hitRate: 1.0, bossHitRate: 0.5 };

// ── 形状技能（单格记忆：J 触发当前技能；吃技能包 = 覆盖旧技能）──
Forge.SKILLS = {
  splash: { name: '露珠冲撞', dmg: 3, cd: 950,  dist: 250, inMs: 90, ms: 180, outMs: 130, hitH: 80 },
  slam:   { name: '果冻重锤', dmg: 4, cd: 1600, inMs: 130, slamMs: 130, outMs: 220,
            radius: 150, knock: 130, airRadius: 175, airDmg: 5, plungeV: 1500 },
  star:   { name: '回旋星刃', dmg: 2, cd: 1500, range: 430, speed: 640, hitH: 70, windup: 200 },
  bubble: { name: '泡泡连珠', dmg: 1, count: 3, gap: 110, cd: 1150, speed: 540, range: 430, hitH: 64 },
};
Forge.SKILL_TOAST = {
  splash: '形状记忆 · 露珠冲撞 —— 化作露珠贯穿突进（空中也能冲）',
  slam:   '形状记忆 · 果冻重锤 —— 地面抡砸震圈；空中按 J 化刺球下砸',
  star:   '形状记忆 · 回旋星刃 —— 掷出会回旋的星星，去程回程都伤',
  bubble: '形状记忆 · 泡泡连珠 —— 快速吐出三连泡泡',
};

// ── 敌人图鉴：枯萎侵蚀的谷中生灵（灰紫调，与鲜亮世界一眼区分）。
// absorb = 击杀后流回玩家的露水（≈总血量 40%，Boss 单独调高作通关奖励）。
// 攻击全部有前摇 + 地面判定：跳跃是万用防御，飞行敌与俯冲是"逼你落地"的反制。──
Forge.ENEMY = {
  // 灰兔蹦蹦：蹦跳逼近，蓄力后大跳砸向玩家脚下（落点 AOE，可跳可走位）
  hopper: { tex: 'm_hopper', hp: 4, dmg: 2, speed: 95, scale: 1, absorb: 2,
            hopAtk: { range: 180, tele: 400, cd: 1600, r: 66, jumpV: -560, ms: 470 } },
  // 刺蜂：低空悬停（单跳可及），锁定俯冲（俯冲锁的是起手瞬间的位置——移动即闪避）
  bee:    { tex: 'm_bee', hp: 3, dmg: 2, speed: 120, scale: 1, absorb: 2,
            fly: { h: 130, bob: 14 },
            dive: { range: 250, tele: 430, ms: 300, rise: 480, cd: 1900, r: 44 } },
  // 蒲公英炮手：生根不动，瞄准你此刻的身位吐种子（射后位移/起跳即空弹）
  puff:   { tex: 'm_puff', hp: 5, dmg: 2, speed: 0, scale: 1, rooted: true, absorb: 2,
            spit: { range: 640, tele: 450, cd: 2100, speed: 380 } },
  // 硬壳蜗牛：慢速坦克，壳光一闪后贴地猛冲（冲刺贴地——跳过它）
  snail:  { tex: 'm_snail', hp: 8, dmg: 3, speed: 42, scale: 1, absorb: 4,
            charge: { range: 230, tele: 520, dist: 300, ms: 400, tired: 650, cd: 2400 } },
  // 小Boss·蘑菇酋长（第二段锁点主）：踏地震圈 + 孢子雨（三列预警落点）+ 召唤灰兔
  shroomking: { tex: 'm_shroom', hp: 22, dmg: 3, speed: 55, scale: 1.45, boss: true, absorb: 9,
            stomp: { r: 150, tele: 660, cd: 2600 },
            rain: { cd: 5200, tele: 720, n: 3, gap: 140, r: 62, dmg: 2 },
            summonMs: 8000, maxAdds: 2, summonType: 'hopper' },
  // 小Boss·刺蜂后（第四段锁点主）：低空俯冲后落地喘息（输出窗口）+ 扇形毒针 + 召唤刺蜂
  beequeen: { tex: 'm_queen', hp: 24, dmg: 3, speed: 120, scale: 1.35, boss: true, absorb: 10,
            fly: { h: 110, bob: 10 },
            dive: { range: 300, tele: 520, ms: 300, rise: 520, cd: 2300, r: 52, ground: 1000 },
            volley: { cd: 4800, n: 3, spread: 0.3, speed: 500, dmg: 2 },
            summonMs: 9000, maxAdds: 2, summonType: 'bee' },
  // 终局·枯萎之冠（第五段锁点 Boss）：生根巨花——藤鞭横扫 + 根刺三连（追玩家）+ 种子扇 + 召唤
  wiltbloom: { tex: 'm_bloom', hp: 36, dmg: 3, speed: 0, scale: 1.6, boss: true, rooted: true, absorb: 12,
            swipe: { r: 190, tele: 680, cd: 2700 },
            roots: { cd: 5000, tele: 700, n: 3, gap: 130, r: 58, dmg: 2 },
            volley: { cd: 4400, n: 3, spread: 0.3, speed: 460, dmg: 2 },
            summonMs: 9500, maxAdds: 2, summonType: 'puff' },
};

// 粒子预算（引擎读 Forge.FXN）
Forge.FXN = { morph: 700, burst: 70, kill: 420, absorb: 150, proj: 22, ring: 90, gather: 56 };

// 敌方特效染色：枯萎灰紫（敌我攻击一眼可辨）
Forge.ENEMY_MIX = { ratio: 0.5, accent: 0x9a7bd0 };

// 玩家粒子渐染色：按段取（旅途越走越亮，与 WyrmsEnd 的堕落渐暗相反）
Forge.C.PALETTE = [
  { ratio: 0.6, accent: 0x54e0a8 },   // 第一段 · 晨露薄荷
  { ratio: 0.6, accent: 0xff9ecb },   // 第二段 · 花语樱粉
  { ratio: 0.6, accent: 0xffb050 },   // 第三段 · 果丘橙蜜
  { ratio: 0.6, accent: 0x4fc9ee },   // 第四段 · 溪谷晴蓝
  { ratio: 0.6, accent: 0xffd166 },   // 第五段 · 云顶暖金
];

// 程序化背景每段配色（清新明快：高明度低灰度，段间只挪色相）
Forge.BG = [
  { sky: ['#8fd8f0', '#c8f0f8', '#f2fff5'], sun: '#fff6c9', hill: '#a5dfb0', hill2: '#8ad096', mid: '#4e9e68', deco: 'grass' },
  { sky: ['#a8d8f5', '#ffe6f2', '#fff8f2'], sun: '#ffeed6', hill: '#aede9e', hill2: '#93d08e', mid: '#d9679f', deco: 'flower' },
  { sky: ['#ffedc2', '#e2f7d8', '#f7fff0'], sun: '#fff2b8', hill: '#9ad88e', hill2: '#82c884', mid: '#c07f2f', deco: 'orchard' },
  { sky: ['#9fe0e8', '#d2f4f4', '#f0fdff'], sun: '#f0fbff', hill: '#8ed3c8', hill2: '#76c4b8', mid: '#2f8896', deco: 'creek' },
  { sky: ['#ffd9b8', '#ffc9d8', '#fff3ea'], sun: '#fff0d0', hill: '#cdb9ea', hill2: '#b8a0e0', mid: '#b06fa0', deco: 'cloudtop' },
];
