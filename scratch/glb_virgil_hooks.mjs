// ShadowAbyss 维吉尔挂件：长披风(Spine2，比但丁更长更垂) + 桂冠(Head，诗人冠)。
// 无兜帽无提灯——露头 + 桂冠 + 亮一线的剪影色(#1b2436)与但丁区分。
// 再生成（在仓库根目录，OUT=game_runs/ShadowAbyss/assets/3d）：
//   node skills/glb-sprite/render.mjs --clip Idle --frames 8 --rotY 0 --color "#1b2436" --hooks scratch/glb_virgil_hooks.mjs --out $OUT --prefix virgil_idle --w 192 --h 208 --sheet
//   node skills/glb-sprite/render.mjs --clip Walk --frames 8 ...同上... --prefix virgil_walk
// 坐标约定同 glb_dante_hooks.mjs：rotY 0 即面朝屏幕右；shape 局部 +X = 屏幕右（前方）。
const COLOR = 0x1b2436;
let cape, laurel, spine2, head, v;

export function onModelLoaded(state) {
  const { THREE, scene, model } = state;
  spine2 = model.getObjectByName('mixamorigSpine2');
  head = model.getObjectByName('mixamorigHead');
  v = new THREE.Vector3();
  const mat = new THREE.MeshBasicMaterial({ color: COLOR, side: THREE.DoubleSide });
  const flat = (shape) => {
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat);
    m.rotation.y = Math.PI / 2; // 平面法线对准 +X 相机轴
    scene.add(m);
    return m;
  };

  // 长披风：肩背挂点，垂到小腿后侧（比但丁的及膝披风长一截），前腿留空露步态
  const capeShape = new THREE.Shape();
  capeShape.moveTo(0.12, 0.16);
  capeShape.quadraticCurveTo(-0.14, 0.18, -0.22, 0.02);
  capeShape.quadraticCurveTo(-0.30, -0.50, -0.48, -1.04);  // 外缘：垂坠中带后飘
  capeShape.quadraticCurveTo(-0.30, -1.18, -0.08, -1.12);  // 下摆（小腿高度）
  capeShape.quadraticCurveTo(-0.02, -0.68, 0.07, -0.40);   // 内缘贴背
  capeShape.lineTo(0.12, -0.04);
  capeShape.closePath();
  cape = flat(capeShape);

  // 桂冠：环头的叶尖冠带（剪影里读作头顶轮廓的锯齿凸起）
  const laurelShape = new THREE.Shape();
  laurelShape.moveTo(-0.16, 0.02);
  laurelShape.lineTo(-0.10, 0.13); laurelShape.lineTo(-0.055, 0.045);
  laurelShape.lineTo(-0.005, 0.155); laurelShape.lineTo(0.045, 0.05);
  laurelShape.lineTo(0.10, 0.135); laurelShape.lineTo(0.145, 0.015);
  laurelShape.lineTo(0.10, -0.03);
  laurelShape.quadraticCurveTo(-0.02, -0.065, -0.12, -0.035);
  laurelShape.closePath();
  laurel = flat(laurelShape);
}

export function onFrame(state, { phase }) {
  const sway = Math.sin(phase * Math.PI * 2 * 2); // 步态两拍

  spine2.getWorldPosition(v);
  cape.position.set(v.x, v.y + 0.10, v.z + 0.05);
  cape.rotation.x = -(0.04 + sway * 0.06); // 引路者步频稳，摆幅比但丁克制

  head.getWorldPosition(v);
  laurel.position.set(v.x, v.y + 0.075, v.z);
}
