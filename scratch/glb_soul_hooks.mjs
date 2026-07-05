// ShadowAbyss 风中亡魂挂件：兜帽(Head) + 两条被风撕开的裹布飘带(Spine2/Hips)。
// 整体风中摇摆由 Phaser 侧 tween（x±18 / angle±8）负责，这里只做布料本身的扑动。
// 再生成（在仓库根目录，OUT=game_runs/ShadowAbyss/assets/3d）：
//   node skills/glb-sprite/render.mjs --clip Idle --frames 6 --rotY 0 --color "#141a26" --hooks scratch/glb_soul_hooks.mjs --out $OUT --prefix soul_flutter --w 192 --h 208 --sheet
// 坐标约定同 glb_dante_hooks.mjs：rotY 0 即面朝屏幕右；shape 局部 +X = 屏幕右（前方）。
const COLOR = 0x141a26;
let hood, tailHi, tailLo, spine2, hips, head, v;

export function onModelLoaded(state) {
  const { THREE, scene, model } = state;
  spine2 = model.getObjectByName('mixamorigSpine2');
  hips = model.getObjectByName('mixamorigHips');
  head = model.getObjectByName('mixamorigHead');
  v = new THREE.Vector3();
  const mat = new THREE.MeshBasicMaterial({ color: COLOR, side: THREE.DoubleSide });
  const flat = (shape) => {
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat);
    m.rotation.y = Math.PI / 2; // 平面法线对准 +X 相机轴
    scene.add(m);
    return m;
  };

  // 裹布碎片：贴背垂坠、末梢后甩收尖、下摆撕出缺口（横向支出去会读成"鱼鳍"，必须垂坠）
  const tatter = (scale, backBias) => {
    const s = new THREE.Shape();
    s.moveTo(0.10 * scale, 0.14 * scale);
    s.quadraticCurveTo(-0.14 * scale, 0.16 * scale, -0.20 * scale, 0.02 * scale);
    s.quadraticCurveTo((-0.26 - backBias) * scale, -0.36 * scale, (-0.46 - backBias) * scale, -0.88 * scale);
    s.lineTo((-0.30 - backBias) * scale, -0.76 * scale);   // 撕口
    s.lineTo((-0.22 - backBias) * scale, -0.98 * scale);   // 内尖
    s.lineTo(-0.08 * scale, -0.90 * scale);
    s.quadraticCurveTo(-0.02 * scale, -0.58 * scale, 0.06 * scale, -0.36 * scale);
    s.lineTo(0.10 * scale, -0.04 * scale);
    s.closePath();
    return s;
  };
  tailHi = flat(tatter(1.0, 0.06));  // 肩背长布
  tailLo = flat(tatter(0.72, 0.24)); // 腰胯短布，更后甩

  // 兜帽：包头圆 + 向后拖尖（同但丁语汇，让亡魂读作"披裹布的人形"）
  const hoodShape = new THREE.Shape();
  hoodShape.absarc(0, 0, 0.15, -Math.PI * 0.42, Math.PI * 1.05, false);
  hoodShape.quadraticCurveTo(-0.26, -0.02, -0.22, -0.17);
  hoodShape.quadraticCurveTo(-0.08, -0.21, 0.04, -0.15);
  hoodShape.closePath();
  hood = flat(hoodShape);
}

export function onFrame(state, { phase }) {
  const w1 = Math.sin(phase * Math.PI * 2 * 3);          // 高频扑动
  const w2 = Math.sin(phase * Math.PI * 2 * 2 + 1.3);    // 低频错相

  spine2.getWorldPosition(v);
  tailHi.position.set(v.x, v.y + 0.10, v.z + 0.05);
  tailHi.rotation.x = -(0.08 + w1 * 0.18);

  hips.getWorldPosition(v);
  tailLo.position.set(v.x, v.y + 0.04, v.z + 0.08);
  tailLo.rotation.x = -(0.16 + w2 * 0.26);

  head.getWorldPosition(v);
  hood.position.set(v.x, v.y + 0.03, v.z + 0.01);
}
