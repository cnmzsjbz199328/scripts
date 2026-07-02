// ShadowAbyss Dante 挂件：披风(Spine2) + 兜帽(Head) + 提灯(RightHand)。
// 再生成（在仓库根目录，OUT=game_runs/ShadowAbyss/assets/3d）：
//   node skills/glb-sprite/render.mjs --clip Idle --frames 8 --rotY 180 --color "#0a0c12" --hooks scratch/glb_dante_hooks.mjs --out $OUT --prefix dante_idle --w 192 --h 208
//   node skills/glb-sprite/render.mjs --clip Walk --frames 8 ...同上... --prefix dante_walk
//   node skills/glb-sprite/render.mjs --clip Run --from 0 --to 0.35 --endpoint --frames 6 ...同上... --prefix dante_jump
// 剪影同色扁平 Shape，只继承骨骼位置、自 author 旋转（勿 quaternion.copy，见 glb-sprite SKILL.md）。
// 坐标约定：模型 rotY 180 后面朝 -Z（屏幕右）；shape 局部 +X = 屏幕右（前方），-X = 身后。
const COLOR = 0x0a0c12;
let cape, hood, lantern, spine2, head, hand, v;

export function onModelLoaded(state) {
  const { THREE, scene, model } = state;
  spine2 = model.getObjectByName('mixamorigSpine2');
  head = model.getObjectByName('mixamorigHead');
  hand = model.getObjectByName('mixamorigRightHand');
  v = new THREE.Vector3();
  const mat = new THREE.MeshBasicMaterial({ color: COLOR, side: THREE.DoubleSide });
  const flat = (shape) => {
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat);
    m.rotation.y = Math.PI / 2; // 平面法线对准 +X 相机轴
    scene.add(m);
    return m;
  };

  // 披风：挂点在肩背，长及膝后、向身后下方流动，下摆随步态摆动
  const capeShape = new THREE.Shape();
  capeShape.moveTo(0.10, 0.14);
  capeShape.quadraticCurveTo(-0.14, 0.16, -0.20, 0.02);
  capeShape.quadraticCurveTo(-0.26, -0.36, -0.42, -0.88);   // 外缘：垂坠中带后飘
  capeShape.quadraticCurveTo(-0.28, -1.00, -0.10, -0.96);   // 下摆
  capeShape.quadraticCurveTo(-0.02, -0.60, 0.06, -0.36);    // 内缘贴背
  capeShape.lineTo(0.10, -0.04);
  capeShape.closePath();
  cape = flat(capeShape);

  // 兜帽：包住头的圆 + 向后拖的尖
  const hoodShape = new THREE.Shape();
  hoodShape.absarc(0, 0, 0.145, -Math.PI * 0.42, Math.PI * 1.05, false);
  hoodShape.quadraticCurveTo(-0.24, -0.02, -0.20, -0.16);
  hoodShape.quadraticCurveTo(-0.08, -0.20, 0.04, -0.14);
  hoodShape.closePath();
  hood = flat(hoodShape);

  // 提灯：梯形灯身 + 顶部提柄
  const lamp = new THREE.Shape();
  lamp.moveTo(-0.06, 0); lamp.lineTo(0.06, 0);
  lamp.lineTo(0.08, -0.17); lamp.lineTo(-0.08, -0.17); lamp.closePath();
  lamp.moveTo(-0.02, 0.07); lamp.lineTo(0.02, 0.07);
  lamp.lineTo(0.02, 0); lamp.lineTo(-0.02, 0); lamp.closePath();
  lantern = flat(lamp);
}

export function onFrame(state, { phase }) {
  const sway = Math.sin(phase * Math.PI * 2 * 2); // 步态两拍

  spine2.getWorldPosition(v);
  cape.position.set(v.x, v.y + 0.10, v.z + 0.05);
  cape.rotation.x = -(0.05 + sway * 0.09); // 绕相机轴摆下摆（面朝右时向身后飘为负）

  head.getWorldPosition(v);
  hood.position.set(v.x, v.y + 0.03, v.z + 0.01);

  hand.getWorldPosition(v);
  lantern.position.set(v.x, v.y - 0.14, v.z - 0.14); // 向前下方提出，避免没入躯干剪影
  lantern.rotation.x = sway * 0.12;
}
