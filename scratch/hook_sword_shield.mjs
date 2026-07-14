// 2D 剪影握剑+持盾：剑/盾永远正面朝 +X 相机（不侧转成线）。
//   剑挂右手，在屏幕平面内跟「右前臂→右手」臂向旋转（横扫/下劈都跟臂）。
//   盾沿左前臂绑持：椭圆长轴对齐左臂向、盾心悬在左手稍外——待机垂在腿侧不盖躯干。
//   隐藏斗篷去掉侧视假斜线。
// 相机在 +X 看向 -X：屏幕竖直=世界 Y，屏幕水平=世界 Z。
const GRIP_ALONG = 10;     // 剑柄沿臂向推进掌心距离
const ANG_OFFSET = 0;      // 臂向→剑向角度补偿
const ANG_SIGN = 1;        // 屏幕水平符号，扫反了改 -1
const BLADE_TIP = 78;      // 剑尖长度（上版 96 举过肩时冲出头顶太多）
const SHIELD_R = 20;       // 盾半径（上版 26 待机盖住躯干）
const SHIELD_ALONG = 14;    // 盾心沿左臂向越过手心的距离
const SHIELD_OUT = -14;    // 盾心沿世界 Z 的水平外推（负=角色身前；+Z 实测是背侧）

let sword, shield, rhand, rfore, lhand, lfore;
let v1, v2, v3, v4, qFace, qSpin, qShield, xAxis;

export function onModelLoaded(state) {
  const { THREE, scene, model, cfg } = state;
  const cloak = model.getObjectByName('arissaCloak_Geo');
  if (cloak) cloak.visible = false;
  rhand = model.getObjectByName('mixamorigRightHand');
  rfore = model.getObjectByName('mixamorigRightForeArm');
  lhand = model.getObjectByName('mixamorigLeftHand');
  lfore = model.getObjectByName('mixamorigLeftForeArm');

  const mat = () => new THREE.MeshBasicMaterial({ color: new THREE.Color(cfg.color), side: THREE.DoubleSide });

  // 剑：长轴 +Y，护手 y≈0，柄伸到 -18
  const s = new THREE.Shape();
  s.moveTo(-2.6, -18); s.lineTo(2.6, -18);
  s.lineTo(2.6, 0); s.lineTo(15, 4); s.lineTo(15, 8); s.lineTo(2.2, 8);
  s.lineTo(1.8, BLADE_TIP - 14); s.lineTo(0, BLADE_TIP); s.lineTo(-1.8, BLADE_TIP - 14);
  s.lineTo(-2.2, 8); s.lineTo(-15, 8); s.lineTo(-15, 4); s.lineTo(-2.6, 0);
  s.closePath();
  sword = new THREE.Mesh(new THREE.ShapeGeometry(s), mat());
  sword.frustumCulled = false;
  scene.add(sword);

  // 盾：竖椭圆（长轴沿局部 +Y，随左臂向旋转）
  const sh = new THREE.Shape();
  sh.absellipse(0, 0, SHIELD_R, SHIELD_R * 1.3, 0, Math.PI * 2);
  shield = new THREE.Mesh(new THREE.ShapeGeometry(sh, 24), mat());
  shield.frustumCulled = false;
  scene.add(shield);

  v1 = new THREE.Vector3(); v2 = new THREE.Vector3();
  v3 = new THREE.Vector3(); v4 = new THREE.Vector3();
  qFace = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  qSpin = new THREE.Quaternion();
  qShield = new THREE.Quaternion();
  xAxis = new THREE.Vector3(1, 0, 0);
}

// 屏幕平面内「肘→手」臂向角（相对 +Y）与单位向量
function armDir(hand, fore, hv, fv) {
  hand.getWorldPosition(hv);
  fore.getWorldPosition(fv);
  const dz = (hv.z - fv.z) * ANG_SIGN, dy = hv.y - fv.y;
  const len = Math.hypot(dy, dz) || 1;
  return { ang: Math.atan2(dz, dy), uy: dy / len, uz: dz / len };
}

export function onFrame({ THREE }) {
  if (!sword) return;
  // 剑：跟右臂向
  const r = armDir(rhand, rfore, v1, v2);
  qSpin.setFromAxisAngle(xAxis, r.ang + ANG_OFFSET);
  sword.quaternion.copy(qSpin).multiply(qFace);
  sword.position.set(v1.x, v1.y + r.uy * GRIP_ALONG, v1.z + r.uz * GRIP_ALONG);
  // 盾：长轴对齐左臂向，盾心悬在左手外侧
  const l = armDir(lhand, lfore, v3, v4);
  qShield.setFromAxisAngle(xAxis, l.ang);
  shield.quaternion.copy(qShield).multiply(qFace);
  shield.position.set(v3.x, v3.y + l.uy * SHIELD_ALONG, v3.z + l.uz * SHIELD_ALONG + SHIELD_OUT);
}
