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

// MIGRATION.md 要求的空全局（部分工具链会读）
window.GAME_CONFIG = {};
window.TILEMAP_DATA = {};
window.ENTITIES_DATA = [];
