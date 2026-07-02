/* ShadowAbyss（影渊：神曲）— 全局常量与调参。
 * 经典 <script> 全局，须先于 storyData.js / scene / systems 加载。 */
const GAME_W = 960;
const GAME_H = 540;

// ── 叙事节奏 ──
const TYPE_MS = 18;        // 打字机逐字间隔（一次吐 2 字）
const AUTO_MS = 70;        // 无头/自动模式推进间隔
const PANEL_H = 172;       // 底部叙事面板高度
const XFADE_MS = 700;      // 场景背景交叉淡入时长
const WALKIN_MS = 900;     // 换场景时人物走入时长

const DEPTH = {
  BG: -100, BG_TOP: -99, SHADOW: -53, CHAR: -50, VIGN: -40,
  FG: -30, FG_FOG: -28,           // 前景三明治：背景 < 人物 < 地面带 < 近地雾
  BANNER: 40, PANEL: 60, TEXT: 61, CHOICE: 70,
  HUD: 80, TOAST: 90, CARD: 100, ENDING: 120,
};

// ── 前景接地层（消除人物悬空感）──
const FEET_Y = 374;         // 人物脚底基线：沉到地脊谷底(362)之下，保证任意 x 处脚踝都被前景带咬住 12~28px
const FG_BAND_Y = 302;      // 地面带贴图顶（不规则地脊边缘落在 ~342-358）
const FG_DRIFT = 16;        // 换场景时前景带反向视差漂移量
const BG_OVERSCAN = 26;     // 背景超采尺寸，容纳视差漂移不露边

// ── 四章色板：占位背景渐变 + UI 强调色（图未到位时游戏照常可玩） ──
const CHAPTER_PAL = {
  1: { top: 0x0a1014, mid: 0x060b0e, bot: 0x03060a, glow: 0x2a4a44, accent: '#7fa8a0', name: '黑暗森林' },
  2: { top: 0x170c0a, mid: 0x0e0606, bot: 0x070304, glow: 0x5a2412, accent: '#e07a4a', name: '地狱' },
  3: { top: 0x13232d, mid: 0x0c1620, bot: 0x081016, glow: 0x2a5a62, accent: '#7fc0c8', name: '炼狱' },
  4: { top: 0xf2e6c8, mid: 0xd8be8a, bot: 0x8a7440, glow: 0xfff2d0, accent: '#b8860b', name: '天堂' },
};

// ── 场景 → 背景图 & 所属章。9 个地狱圈复用现有全景；其余 23 张见 story/art-prompts.md，
//    放进 scene/ 即生效；缺图时按章色板生成渐变占位。 ──
const SCENE_META = {
  selva_oscura:        { ch: 1, art: 'scene/selva_oscura.png' },
  virgil_meet:         { ch: 1, art: 'scene/virgil_meet.png' },
  hell_gate:           { ch: 2, art: 'scene/hell_gate.png' },
  acheron:             { ch: 2, art: 'scene/acheron.png' },
  limbo:               { ch: 2, art: 'scene/panorama_limbo.png' },
  circle_lust:         { ch: 2, art: 'scene/panorama_lust.png' },
  circle_gluttony:     { ch: 2, art: 'scene/panorama_gluttony.png' },
  circle_avarice_hell: { ch: 2, art: 'scene/panorama_greed.png' },
  circle_wrath:        { ch: 2, art: 'scene/panorama_wrath.png' },
  dis_gate:            { ch: 2, art: 'scene/dis_gate.png' },
  circle_heresy:       { ch: 2, art: 'scene/panorama_heresy.png' },
  circle_violence:     { ch: 2, art: 'scene/panorama_violence.png' },
  geryon:              { ch: 2, art: 'scene/geryon.png' },
  circle_fraud:        { ch: 2, art: 'scene/panorama_fraud.png' },
  circle_treachery:    { ch: 2, art: 'scene/panorama_betrayal.png' },
  lucifer:             { ch: 2, art: 'scene/lucifer.png' },
  hell_exit:           { ch: 2, art: 'scene/hell_exit.png' },
  purg_shore:          { ch: 3, art: 'scene/purg_shore.png' },
  terrace_pride:       { ch: 3, art: 'scene/terrace_pride.png' },
  terrace_envy:        { ch: 3, art: 'scene/terrace_envy.png' },
  terrace_wrath:       { ch: 3, art: 'scene/terrace_wrath.png' },
  terrace_sloth:       { ch: 3, art: 'scene/terrace_sloth.png' },
  terrace_avarice:     { ch: 3, art: 'scene/terrace_avarice.png' },
  terrace_gluttony:    { ch: 3, art: 'scene/terrace_gluttony.png' },
  terrace_lust:        { ch: 3, art: 'scene/terrace_lust.png' },
  eden:                { ch: 3, art: 'scene/eden.png' },
  lethe:               { ch: 3, art: 'scene/lethe.png' },
  heaven_threshold:    { ch: 4, art: 'scene/heaven_threshold.png' },
  beatrice:            { ch: 4, art: 'scene/beatrice.png' },
  spheres:             { ch: 4, art: 'scene/spheres.png' },
  starry_heaven:       { ch: 4, art: 'scene/starry_heaven.png' },
  empyrean:            { ch: 4, art: 'scene/empyrean.png' },
};

// 章节卡编号（chapterTitle 全文出现在这些节点上）
const CHAPTER_NUMERALS = { '第一章：黑暗森林': 'Ⅰ', '第二章：地狱': 'Ⅱ', '第三章：炼狱': 'Ⅲ', '第四章：天堂': 'Ⅳ' };
