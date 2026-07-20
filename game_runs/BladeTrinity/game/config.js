/* BladeTrinity — 全局命名空间与画布常量。必须先于 data.js 加载。 */
window.BT = window.BT || {};

BT.GAME_W = 960;
BT.GAME_H = 540;
BT.FLOOR_Y = 476;
BT.GRAVITY = 1500;

// 图集格规格（video-sprite 标准，见 assets/sprites/atlases.js）
BT.FRAME_W = 192;
BT.FRAME_H = 208;
// 图集的统一 scale 取了六行最小值（为让最伸展的挥刀/倒地姿势完整入格），
// 角色因此只占格高约 60%，这里放大回格斗游戏该有的体量
BT.SCALE = 1.9;

// 命中框半宽（纹理 26px × SCALE）。刀尖碰到对手躯干边缘即算命中，
// 所以攻击距离 = 当前帧刀长 + 这个半宽。
BT.BODY_HALF_W = 26 * BT.SCALE;

// ─────────── 背景三层贴图定位 ───────────
// 三张源图（1920×1080）的地面线【互不相同】，提示词里要求的统一 88% 一个都没遵守：
//   far  地板线      y=703 (65.1%)
//   mid  柱础底      y=894 (82.8%)
//   fore 中央木板顶边 y=769 (71.2%)
// 所以不能用同一个缩放对齐三层，每层单独定标：scale = 目标屏幕 y ÷ 源图 y。
//   far  703 × 0.677 = 475.9 → 地板线正好压在 FLOOR_Y
//   mid  894 × 0.532 = 475.6 → 柱础坐在 FLOOR_Y
//   fore 769 × 0.606 = 466.0 → 木板顶边在 FLOOR_Y 上方 10px：盖住脚踝以下与倒地
//        接触点（配合 BT.DOWN_DROP 的下沉），但只吃 10px，不影响看步法
// 三层都是 origin(0.5,0)、贴画布顶、水平居中，超出 960×540 的部分自然裁掉。
//
// ⚠️ mid 的 0.532 小于 far 的 0.677，中景柱子比远景天花板梁小约 21%——透视上是反的。
// 取舍：统一到 0.677 得把 mid 上移 129px，会削掉顶部灯笼一半，那是更显眼的瑕疵。
// 柱子和天花板梁是不同物体，没有可比的参照，实际观感吃得下。
BT.BG = [
  { key: 'far', scale: 0.677, depth: -100 },
  { key: 'mid', scale: 0.532, depth: -50 },
  { key: 'fore', scale: 0.606, depth: 20 },   // depth > 角色的 10，压在脚上
];

// MIGRATION.md 要求的空全局（部分工具链会读）
window.GAME_CONFIG = {};
window.TILEMAP_DATA = {};
window.ENTITIES_DATA = [];
