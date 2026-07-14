// 2D 剪影握剑+持盾：剑/盾永远正面朝 +X 相机（不侧转成线）。
//   剑挂右手，在屏幕平面内跟「前臂→手腕」臂向旋转（横扫）。
//   盾挂左手，正面朝镜头、固定微倾（盾牌姿态稳定，不跟腕转）。
//   隐藏斗篷去掉侧视假斜线。
// 相机在 +X 看向 -X：屏幕竖直=世界 Y，屏幕水平=世界 Z。
const GRIP_ALONG = 8;   // 剑柄沿臂向推进掌心距离
const ANG_OFFSET = 0;   // 臂向→剑向角度补偿
const ANG_SIGN = 1;     // 屏幕水平符号，扫反了改 -1
const SHIELD_R = 26;    // 盾半径
const SHIELD_TILT = 0.25; // 盾牌微倾（弧度）

let sword, shield, hand, fore, lhand;
let v1, v2, v3, qFace, qSpin, qShield, xAxis;

export function onModelLoaded(state) {
  const { THREE, scene, model, cfg } = state;
  const cloak = model.getObjectByName('arissaCloak_Geo');
  if (cloak) cloak.visible = false;
  hand = model.getObjectByName('mixamorigRightHand');
  fore = model.getObjectByName('mixamorigRightForeArm');
  lhand = model.getObjectByName('mixamorigLeftHand');

  const mat = () => new THREE.MeshBasicMaterial({ color: new THREE.Color(cfg.color), side: THREE.DoubleSide });

  // 剑：长轴 +Y，护手 y≈0，柄伸到 -18
  const s = new THREE.Shape();
  s.moveTo(-2.6, -18); s.lineTo(2.6, -18);
  s.lineTo(2.6, 0); s.lineTo(15, 4); s.lineTo(15, 8); s.lineTo(2.2, 8);
  s.lineTo(1.8, 82); s.lineTo(0, 96); s.lineTo(-1.8, 82);
  s.lineTo(-2.2, 8); s.lineTo(-15, 8); s.lineTo(-15, 4); s.lineTo(-2.6, 0);
  s.closePath();
  sword = new THREE.Mesh(new THREE.ShapeGeometry(s), mat());
  sword.frustumCulled = false;
  scene.add(sword);

  // 盾：圆角矩形近似鸢盾（略高的椭圆），中心在原点
  const sh = new THREE.Shape();
  sh.absellipse(0, 0, SHIELD_R, SHIELD_R * 1.25, 0, Math.PI * 2);
  shield = new THREE.Mesh(new THREE.ShapeGeometry(sh, 24), mat());
  shield.frustumCulled = false;
  scene.add(shield);

  v1 = new THREE.Vector3(); v2 = new THREE.Vector3(); v3 = new THREE.Vector3();
  qFace = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  qSpin = new THREE.Quaternion();
  qShield = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), SHIELD_TILT);
  xAxis = new THREE.Vector3(1, 0, 0);
}

export function onFrame({ THREE }) {
  if (!sword) return;
  // 剑
  hand.getWorldPosition(v1);
  fore.getWorldPosition(v2);
  const dz = (v1.z - v2.z) * ANG_SIGN, dy = v1.y - v2.y;
  const armAng = Math.atan2(dz, dy) + ANG_OFFSET;
  qSpin.setFromAxisAngle(xAxis, armAng);
  sword.quaternion.copy(qSpin).multiply(qFace);
  const len = Math.hypot(dy, dz) || 1;
  sword.position.set(v1.x, v1.y + dy / len * GRIP_ALONG, v1.z + dz / len * GRIP_ALONG);
  // 盾：跟左手位置，正面朝镜头 + 固定微倾
  lhand.getWorldPosition(v3);
  shield.position.copy(v3);
  shield.quaternion.copy(qShield).multiply(qFace);
}
