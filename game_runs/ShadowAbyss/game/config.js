/* ShadowAbyss（影渊：但丁的下降）— 全局常量与调参。
 * 经典 <script> 全局，须先于 levels.js / scene / systems 加载。 */
const GAME_W = 960;
const GAME_H = 540;

// ── 物理与手感 ──
const GRAVITY = 1180;
const PLAYER_SPEED = 220;
const JUMP_V = 560;        // 起跳初速
const JUMP_CUT = 0.42;     // 松开跳键时若仍上升，竖速乘此系数 → 可变跳高（短按矮跳/长按高跳）
const COYOTE_MS = 90;      // 离地后仍可起跳的宽容窗口
const DEATH_BUDGET = 5;    // 生命数（坠落/被风吞没各扣 1 心，归零且无命 → 失败）

// ── 暗黑视界（只盖背景的雾幕 + 跟随但丁提灯的反相光晕，见 [[phaser-moonlight-vision]]） ──
const LIGHT_MIN = 110;     // 光晕半径下限（再暗也看得见脚下）
const LIGHT_BIAS = 26;     // 光晕朝行进方向前探的偏移
const LIGHT_SOFT = 1.7;    // 补偿放射渐变软边，使可视半径≈设定值

// ── 情欲之风（第二圈）：方向随时间正弦摆动，留出"风停间隙"供落脚 ──
const WIND_PERIOD_MS = 2600;   // 一个吹—停—反吹周期
const WIND_GUST_DEFAULT = 190; // 默认阵风加速度（各 gust 可覆盖）

const DEPTH = {
  BG: -100, FOG: -50, FAR: -60,
  RIFT: 4, SOUL: 12, GROUND: 0,
  PLAYER: 20, GLOW: 19, EFFECTS: 30, CARD: 100,
};

// HUD 字形：地狱用暖红的火心
window.GAME_HUD_GLYPHS = { full: '❤', empty: '🖤' };
