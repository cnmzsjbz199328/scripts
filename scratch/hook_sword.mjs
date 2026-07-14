// 2D 剪影握剑：剑永远正面朝 +X 相机（不会侧转成线），但在屏幕平面(世界 Y-Z)内
// 按「前臂→手腕」的臂向旋转，横扫时剑跟着扫。隐藏斗篷去掉侧视假斜线。
//
// 相机在 +X 看向 -X：屏幕竖直=世界 Y，屏幕水平=世界 Z。
// 调参区：改这几个数微调握持。
const GRIP_ALONG = 8;   // 沿臂向把剑柄从手腕推进掌心的距离
const ANG_OFFSET = 0;   // 臂向→剑向的角度补偿（弧度），第一版先 0，看完再调
const ANG_SIGN = 1;     // 屏幕水平方向符号，若剑扫反了改 -1

let sword, hand, fore;
let v1, v2, qFace, qSpin, xAxis;

export function onModelLoaded(state) {
  const { THREE, scene, model, cfg } = state;
  const cloak = model.getObjectByName('arissaCloak_Geo');
  if (cloak) cloak.visible = false;
  hand = model.getObjectByName('mixamorigRightHand');
  fore = model.getObjectByName('mixamorigRightForeArm');

  // 剑身局部：长轴沿 +Y（刀尖朝上），护手在 y≈0，剑柄伸到 -18（握把在原点下方，落在掌心）
  const s = new THREE.Shape();
  s.moveTo(-2.6, -18); s.lineTo(2.6, -18);       // 柄底
  s.lineTo(2.6, 0); s.lineTo(15, 4); s.lineTo(15, 8); s.lineTo(2.2, 8);  // 护手右
  s.lineTo(1.8, 82); s.lineTo(0, 96); s.lineTo(-1.8, 82);                // 刀身收尖
  s.lineTo(-2.2, 8); s.lineTo(-15, 8); s.lineTo(-15, 4); s.lineTo(-2.6, 0);  // 护手左
  s.closePath();

  sword = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ color: new THREE.Color(cfg.color), side: THREE.DoubleSide }));
  sword.frustumCulled = false;
  scene.add(sword);

  v1 = new THREE.Vector3(); v2 = new THREE.Vector3();
  qFace = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2); // 剪影面转向 +X
  qSpin = new THREE.Quaternion();
  xAxis = new THREE.Vector3(1, 0, 0);
}

export function onFrame({ THREE }) {
  if (!hand || !fore || !sword) return;
  hand.getWorldPosition(v1);
  fore.getWorldPosition(v2);
  // 屏幕平面内臂向：dz 水平, dy 竖直；剑长轴默认 +Y，需从 +Y 转到臂向
  const dz = (v1.z - v2.z) * ANG_SIGN, dy = v1.y - v2.y;
  const armAng = Math.atan2(dz, dy) + ANG_OFFSET;   // 相对 +Y 的偏角
  qSpin.setFromAxisAngle(xAxis, armAng);
  sword.quaternion.copy(qSpin).multiply(qFace);
  // 剑柄推进掌心：沿臂向单位矢量 (0, dy, dz) 归一后前移
  const len = Math.hypot(dy, dz) || 1;
  sword.position.set(v1.x, v1.y + dy / len * GRIP_ALONG, v1.z + dz / len * GRIP_ALONG);
}
