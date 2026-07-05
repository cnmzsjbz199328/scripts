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

// ── 三招式（变形即攻击）：化矛突刺 / 化锤震地 / 雾化闪避 ──
Forge.SPEAR  = { dmg: 3, cd: 1150, inMs: 140, dashMs: 210, outMs: 230, range: 280, hitW: 62 };
Forge.HAMMER = { dmg: 4, cd: 2000, inMs: 160, slamMs: 120, outMs: 270, radius: 155, knock: 130 };
Forge.MIST   = { cd: 950, ms: 400, dist: 200 };

// ── 吸收变形：击败恶鬼得「魄」，E 化形 ──
Forge.FIEND_FORM = {
  ms: 8000, speed: 330, morphMs: 340,
  lunge: { dmg: 2, cd: 550, dist: 160, ms: 130 },
};

// ── 敌人图鉴 ──
Forge.ENEMY = {
  soul:  { tex: 'soul_walk_0',  anim: 'soul_walk',  hp: 3,  speed: 64,  dmg: 1, scale: 1.0, touchR: 40, glb: true },
  fiend: { tex: 'fiend_0',      anim: 'fiend_move', hp: 4,  speed: 135, dmg: 1, scale: 0.85, touchR: 42, absorb: true,
           lunge: { tele: 450, dist: 190, speed: 620, ms: 260, cd: 1800 } },
  minos: { tex: 'minos_idle_0', anim: 'minos_idle', hp: 26, speed: 44,  dmg: 2, scale: 1.55, touchR: 58, boss: true, glb: true,
           swipe: { tele: 650, r: 175, cd: 2800 }, summonMs: 9000, maxAdds: 2 },
};

// 受击/击杀粒子预算
Forge.FXN = { morph: 760, burst: 70, kill: 420, absorb: 150 };

// 玩家粒子渐染色（按波次）：ratio=混入 accent 色的比例，null=纯墨色
Forge.C.PALETTE = [
  { ratio: 0,    accent: null      },   // 第一波 · 林波
  { ratio: 0.35, accent: 0xc0501a },   // 第二波 · 愤怒（暗橙余烬）
  { ratio: 0.55, accent: 0x3a6ea8 },   // 第三波 · 暴力（冷钢蓝）
];
