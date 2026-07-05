/* ShadowForge（影铸）— 全局命名空间与调参。
 * 粒子变形格斗：人形 ⇄ 冷兵器 ⇄ 被吸收的敌形，变形即招式。
 * 经典 <script> 全局命名空间（window.Forge），须先于其余脚本加载。 */
window.Forge = {};

Forge.W = 960;
Forge.H = 540;

// ── 舞台 ──
Forge.C = {
  FEET_Y: 452,               // 人物脚底基线（沉入地脊 → 接地）
  GLB_PAD: 24,               // glb-sprite 帧底部透明留白：落点须加 24*scale 补偿
  X_MIN: 70, X_MAX: 890,     // 竞技场左右边界
  INK: 0x0a0d12,             // 剪影主色（粒子同色）
  DEPTH: {
    BG: -100, SHADOW: -53, CHAR: -50, FX: -46, RING: -47,
    FG: -30, FOG: -28, TOAST: 90,
  },
};

// ── 玩家 ──
Forge.PLAYER = {
  maxHp: 10, speed: 235, scale: 1.05,
  invulnMs: 900,             // 受击无敌帧
};

// ── 四招式（变形即攻击）：化矛突刺 / 化锤震地 / 链镰横扫 / 雾化闪避 ──
Forge.SPEAR  = { dmg: 3, cd: 1150, inMs: 140, dashMs: 210, outMs: 230, range: 280, hitW: 62 };
Forge.HAMMER = { dmg: 4, cd: 2000, inMs: 160, slamMs: 120, outMs: 270, radius: 155, knock: 130 };
Forge.SICKLE = { dmg: 3, cd: 1500, inMs: 150, sweepMs: 180, outMs: 240, range: 150 };   // 中距离横扫，矛=长/镰=中/锤=近
Forge.MIST   = { cd: 950, ms: 400, dist: 200 };

// ── 吸收变形：击败可吸收敌得「魄」，E 化身为它（限时）；每种敌各自的 J 招式见下方 form.throw/lunge ──
Forge.FIEND_FORM = {
  tex: 'fiend_0', anim: 'fiend_move', scale: 0.85, toast: '化形 · 恶鬼之躯 — J 爪袭',
  ms: 8000, speed: 330, morphMs: 720,
  lunge: { dmg: 2, cd: 550, dist: 160, ms: 130 },
};
Forge.FURIES_FORM = {
  tex: 'furies_idle_0', anim: 'furies_move', scale: 0.85, toast: '化形 · 女妖之躯 — J 掷弹', glb: true,
  ms: 8000, speed: 210, morphMs: 720,
  throw: { dmg: 2, cd: 900, projSpeed: 560, ms: 700 },
};
Forge.FORM_BY_TYPE = { fiend: Forge.FIEND_FORM, furies: Forge.FURIES_FORM };

// ── 敌人图鉴 ──
Forge.ENEMY = {
  soul:  { tex: 'soul_walk_0',  anim: 'soul_walk',  hp: 3,  speed: 64,  dmg: 1, scale: 1.0, touchR: 40, glb: true },
  fiend: { tex: 'fiend_0',      anim: 'fiend_move', hp: 4,  speed: 135, dmg: 1, scale: 0.85, touchR: 42, absorb: true,
           lunge: { tele: 450, dist: 190, speed: 620, ms: 260, cd: 1800 } },
  minos: { tex: 'minos_idle_0', anim: 'minos_idle', hp: 26, speed: 44,  dmg: 2, scale: 1.55, touchR: 58, boss: true, glb: true,
           superArmor: true,   // 预备帧只有锤能打断，矛/镰只能干扣血
           swipe: { tele: 650, r: 175, cd: 2800 }, summonMs: 9000, maxAdds: 2 },
  // 复仇女神：保持距离放投掷弹，不近身接触；吸收后 E 化身为它，J 变原地扔弹
  furies: { tex: 'furies_idle_0', anim: 'furies_move', hp: 5, speed: 74, dmg: 0, scale: 0.9, touchR: 36, glb: true, absorb: true,
            ranged: { keep: 230, tele: 420, cd: 2000, projSpeed: 360, dmg: 2 } },
  // 冰湖亡魂：死亡时留一片减速地带（环境后果，不进吸收/化形系统）
  icesoul: { tex: 'icesoul_idle_0', anim: 'icesoul_move', hp: 6, speed: 50, dmg: 1, scale: 1.0, touchR: 40, glb: true,
             leavesSlowZone: { r: 92, dur: 3400, factor: 0.55 } },
  // 终局 Boss：背叛之主，纯 1v1（无召唤），复用 minos 同款"预备帧挥臂"分支（def.swipe）
  satan: { tex: 'satan_0', anim: 'satan_idle', hp: 34, speed: 48, dmg: 3, scale: 1.35, touchR: 62, boss: true, superArmor: true,
           swipe: { tele: 700, r: 190, cd: 2600 } },
};

// 受击/击杀粒子预算
Forge.FXN = { morph: 760, burst: 70, kill: 420, absorb: 150 };

// 玩家粒子渐染色（按波次）：ratio=混入 accent 色的比例，null=纯墨色
Forge.C.PALETTE = [
  { ratio: 0,    accent: null      },   // 第一关 · 林波
  { ratio: 0.35, accent: 0xc0501a },   // 第二关 · 愤怒（暗橙余烬）
  { ratio: 0.55, accent: 0x3a6ea8 },   // 第三关 · 暴力（冷钢蓝）
  { ratio: 0.65, accent: 0x2e8f7a },   // 第四关 · 欺诈（诡谲青绿）
  { ratio: 0.8,  accent: 0xd8c8a0 },   // 第五关 · 背叛（临终微光，趋近满染）
];
