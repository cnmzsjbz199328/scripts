/* 七个可触区域。坐标归一化到 580×720 的单元格（= assets/base.png 的坐标系，
 * 也是每一帧动画的坐标系 —— 全部素材共用同一个裁剪窗，见 MATERIALS.md）。
 *
 * 数值来自 tools/region-calibrator.html 的人工标定，不要手改；
 * 要调就重开标定器拖框再导出，免得和基准帧对不上。
 *
 * 左右一律按**画面方位**：armL = 画面左侧那条手臂（＝角色自己的右手，持杖那只）。
 */
window.PM = window.PM || {};

PM.REGIONS = {
  head:  { x: 0.426, y: 0.142, w: 0.198, h: 0.158, label: '头' },
  chest: { x: 0.469, y: 0.305, w: 0.171, h: 0.133, label: '胸' },
  belly: { x: 0.413, y: 0.503, w: 0.215, h: 0.099, label: '肚子' },
  armL:  { x: 0.367, y: 0.296, w: 0.102, h: 0.183, label: '左臂(持杖)' },
  armR:  { x: 0.481, y: 0.439, w: 0.184, h: 0.058, label: '右臂' },
  legL:  { x: 0.417, y: 0.626, w: 0.099, h: 0.360, label: '左腿' },
  legR:  { x: 0.530, y: 0.620, w: 0.098, h: 0.357, label: '右腿' },
};

PM.REGION_ORDER = ['head', 'chest', 'belly', 'armL', 'armR', 'legL', 'legR'];
