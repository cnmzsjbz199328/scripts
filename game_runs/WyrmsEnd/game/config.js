/* WyrmsEnd（龙尽之途）— 全局命名空间与调参。
 * 横版推进 · 动势格斗 · 夺形即堕落：屠龙者一路向东，每杀一位段主便夺其形、失其技，
 * 抵达龙巢时镜中已是恶龙。骨架按 game_runs/SIDESCROLLER.md 蓝图实现。
 * 共享引擎（_engine/pointcloud|morph）按约定读 window.Forge.C.DEPTH/FXN/C.INK，
 * 故本游戏命名空间沿用 Forge（每页只跑一个游戏，不冲突）。 */
window.Forge = {};

Forge.W = 960;
Forge.H = 540;

// ── 世界（横版推进的核心差异：世界远宽于屏，摄像机是滑动窗口）──
Forge.WORLD = {
  W: 16000,                  // 5 段 × 3200
  H: 540,
  FEET_Y: 452,               // 地面基线，同竞技场约定
};

// ── 摄像机 ──
Forge.CAM = {
  lerp: 0.12,                // 横向平滑跟随系数
  aheadFrac: 0.32,           // 玩家钉在画面左 32% 处，前方多留视野（魂斗罗惯例）
  leashScreens: 1.5,         // 非锁点敌人落后镜头左缘超此屏数 → 直接清理
  edgePad: 40,               // 玩家 x 钳制到镜头内的边距
};

Forge.C = {
  FEET_Y: 452,
  GLB_PAD: 24,               // glb-sprite 帧底部透明留白补偿
  INK: 0x0a0d12,
  DEPTH: {
    BG: -100, MID: -90, GROUND: -60, SHADOW: -53, CHAR: -50, RING: -47,
    FX: -46, FG: -30, FOG: -28, VIGN: -20, TOAST: 90,
  },
};

// ── 玩家：横版哲学 = 薄血 + 检查点（死亡回段首），区别于竞技场的 HP 消耗战 ──
Forge.PLAYER = { maxHp: 6, lives: 3, invulnMs: 900 };

// 形态链（夺形即堕落，不可逆）：骑士 → 半龙（夺爪失剑）→ 翼裔（夺弹失锤）。
// J/K 指向下方招式表；雾化冲刺(L)全程保留——它是影之天赋，也是堕落的源头。
Forge.FORMS = {
  knight:    { tex: 'knight_idle_0',  idle: 'knight_idle',  walk: 'knight_walk',  scale: 1.05, speed: 240, J: 'sword', K: 'hammer' },
  halfdrake: { tex: 'drake_idle_0',   idle: 'drake_idle',   walk: 'drake_walk',   scale: 0.95, speed: 300, J: 'claw',  K: 'hammer' },
  winged:    { tex: 'slinger_idle_0', idle: 'slinger_idle', walk: 'slinger_walk', scale: 0.95, speed: 270, J: 'claw',  K: 'shard' },
};
Forge.STEAL_TOAST = {
  halfdrake: '夺形 · 龙爪噬手 —— 剑已握不住了（J 爪袭突进）',
  winged:    '夺形 · 翼骨破背 —— 锤太重，翼太轻（K 掷旋刃）',
};

// ── 招式（动势格斗：攻击即位移，招式与推进融为一体）──
Forge.SWORDDASH = { dmg: 3, cd: 1050, inMs: 130, dashMs: 200, outMs: 220, range: 260, hitW: 60 };
Forge.CLAW      = { dmg: 2, cd: 620,  dist: 180, inMs: 90, ms: 150, outMs: 110, ws: 0.6 };
Forge.HAMMER    = { dmg: 4, cd: 1900, inMs: 150, slamMs: 120, outMs: 250, radius: 150, knock: 120 };
Forge.SHARD     = { dmg: 2, cd: 820,  projSpeed: 560, ms: 700, windup: 150 };
Forge.MIST      = { cd: 900, ms: 380, dist: 210 };

// 十字长剑「蓄力猛劈」节拍（终局龙王 _swingWeapon 用，与 ShadowForge 同源）
Forge.SWORD_SLASH = { raiseMs: 165, chargeMs: 150, fallMs: 175, raiseA: -100, fallA: 47, total: 490 };

// ── 敌人图鉴：横版敌人是「移动的障碍」——血薄、成股，威胁在走位时机而非读招 ──
Forge.ENEMY = {
  // 龙眷仆从：缓慢逼近，贴身化匕刺击
  thrall: { tex: 'thrall_walk_0', animWalk: 'thrall_walk', hp: 2, speed: 82, dmg: 1, scale: 1.0, glb: true,
            stab: { reach: 46, tele: 320, ms: 220, cd: 1300, ws: 0.5, weapon: 'dagger' } },
  // 幼龙：快速扑袭
  drake:  { tex: 'drake_idle_0', animWalk: 'drake_walk', animIdle: 'drake_idle', hp: 3, speed: 150, dmg: 1, scale: 0.85, glb: true,
            lunge: { tele: 420, dist: 190, ms: 250, cd: 1600, ws: 0.6 } },
  // 龙裔投手：保距掷旋刃
  slinger: { tex: 'slinger_idle_0', animWalk: 'slinger_walk', animIdle: 'slinger_idle', hp: 2, speed: 80, dmg: 0, scale: 0.9, glb: true,
             ranged: { keep: 230, tele: 400, cd: 1900, projSpeed: 380, dmg: 1 } },
  // 精英·爪龙长（第二段锁点主）：杀之夺爪 → halfdrake
  drakelord: { tex: 'drake_idle_0', animWalk: 'drake_walk', animIdle: 'drake_idle', hp: 10, speed: 125, dmg: 1, scale: 1.2, glb: true,
               elite: true, steal: 'halfdrake',
               lunge: { tele: 480, dist: 230, ms: 260, cd: 1400, ws: 0.75 } },
  // 精英·翼裔巫母（第四段锁点主）：杀之夺翼 → winged
  slingerqueen: { tex: 'slinger_idle_0', animWalk: 'slinger_walk', animIdle: 'slinger_idle', hp: 12, speed: 92, dmg: 0, scale: 1.15, glb: true,
                  elite: true, steal: 'winged',
                  ranged: { keep: 260, tele: 380, cd: 1400, projSpeed: 430, dmg: 1 } },
  // 龙裔守卫（第三段锁点 Boss）：巨斧挥砍 + 召唤仆从
  warden: { tex: 'warden_idle_0', animWalk: 'warden_idle', animIdle: 'warden_idle', hp: 14, speed: 48, dmg: 2, scale: 1.5, glb: true,
            boss: true, superArmor: true,
            swipe: { tele: 640, r: 175, cd: 2700, weapon: 'axe' }, summonMs: 9000, maxAdds: 2, summonType: 'thrall' },
  // 终局 · 龙王（第五段锁点 Boss）：十字长剑地劈 + 天降凝剑
  wyrm:   { tex: 'wyrm_idle_0', animWalk: 'wyrm_walk', animIdle: 'wyrm_idle', hp: 22, speed: 52, dmg: 2, scale: 1.4, glb: true,
            boss: true, superArmor: true,
            swipe: { tele: 680, r: 190, cd: 2500, weapon: 'sword' },
            sky: { cd: 4600, tele: 850, r: 100, dmg: 2 } },
};

// 粒子预算（同 ShadowForge 约定，引擎读 Forge.FXN）
Forge.FXN = { morph: 760, burst: 70, kill: 420, absorb: 150, proj: 24, ring: 90, gather: 56 };

// 敌方攻击特效染色（敌我攻击一眼可辨）
Forge.ENEMY_MIX = { ratio: 0.45, accent: 0x8a2c18 };

// 玩家粒子渐染色：按世界 x 分段取（旅途即堕落，颜色随推进渐染，索引=段）
Forge.C.PALETTE = [
  { ratio: 0.25, accent: 0xc08a3a },   // 第一段 · 麦田暖金 (100% 暖)
  { ratio: 0.4,  accent: 0xa2855b },   // 第二段 · 战场沙金 (75% 暖)
  { ratio: 0.5,  accent: 0x807a70 },   // 第三段 · 隘口石灰 (50% 暖)
  { ratio: 0.65, accent: 0x6a6258 },   // 第四段 · 骨原冷灰 (25% 暖)
  { ratio: 0.8,  accent: 0x4a443f },   // 第五段 · 龙巢炭黑 (0% 暖)
];

// 天空与大气的唯一真源（代码绘制，不再来自 AI 图）：
// sky 三停渐变(顶→中→地平线)、glow 地平辉光[r,g,b,a]+起始高度、haze 雾带染色、dust 漂沙染色。
// 五段沿 PALETTE 同一条 warm→cold 单调渐变；第 5 段辉光=宝窟金光自下而上。
Forge.ATMOS = [
  { sky: ['#3f2817', '#7a4a24', '#b8763c'], glow: [232, 164, 84, 0.42], glowY: 0.55, haze: 0xc08a4a, hazeA: 0.50, dust: 0xd8a860, dustA: 0.85 },  // 麦田黄昏
  { sky: ['#38291c', '#5c4128', '#8a6038'], glow: [190, 130, 70, 0.28], glowY: 0.60, haze: 0x9a7648, hazeA: 0.55, dust: 0xb08a58, dustA: 0.70 },  // 焦土沙尘
  { sky: ['#2b2c33', '#43454e', '#6e7078'], glow: [140, 145, 160, 0.22], glowY: 0.62, haze: 0x787c88, hazeA: 0.45, dust: 0x9aa0ac, dustA: 0.50 },  // 隘口冷雾
  { sky: ['#211d1b', '#332a26', '#4e3c32'], glow: [150, 64, 34, 0.30], glowY: 0.66, haze: 0x5a463a, hazeA: 0.50, dust: 0x8a5a40, dustA: 0.60 },  // 骨原余烬
  { sky: ['#0f0c0a', '#1a1310', '#332213'], glow: [212, 148, 58, 0.38], glowY: 0.62, haze: 0x4a3420, hazeA: 0.55, dust: 0xd8a03a, dustA: 0.75 },  // 龙巢金光
];

// 程序化降级的远景剪影/中景件配色（真图缺失时用；sky 字段已废弃——天空一律走 ATMOS）
Forge.BG_FALLBACK = [
  { sky: ['#4a3220', '#2d1b11', '#170c08'], hill: '#24150c', hill2: '#170c08', mid: '#1e100a' },   // 第1段 (100% 暖)
  { sky: ['#3e2d20', '#261b13', '#150f0b'], hill: '#20160d', hill2: '#150f0b', mid: '#1b120c' },   // 第2段 (75% 暖)
  { sky: ['#332d28', '#201c19', '#12100e'], hill: '#1b1714', hill2: '#12100e', mid: '#161311' },   // 第3段 (50% 暖)
  { sky: ['#282624', '#191817', '#0f0e0d'], hill: '#151413', hill2: '#0f0e0d', mid: '#11100f' },   // 第4段 (25% 暖)
  { sky: ['#1c1a18', '#12100e', '#080706'], hill: '#0e0c0a', hill2: '#080706', mid: '#0a0908' },   // 第5段 (0% 暖)
];
