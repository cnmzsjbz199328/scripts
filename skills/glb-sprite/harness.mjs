// glb-sprite 浏览器侧 harness：three.js 剪影舞台。
// 由 render.mjs 用 esbuild 打包后注入 playwright 页面，通过 window.__silhouette 驱动。
// 约定：正交相机侧视 + MeshBasicMaterial 纯色覆盖 + mixer.setTime 定格采样。
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function boot(hooks = {}) {
  const state = {};

  function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  async function init(cfg) {
    const canvas = document.createElement('canvas');
    canvas.width = cfg.width;
    canvas.height = cfg.height;
    document.body.appendChild(canvas);

    // preserveDrawingBuffer 必开，否则 toDataURL 导出为空
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: true });
    renderer.setSize(cfg.width, cfg.height, false);
    renderer.setPixelRatio(1);

    const scene = new THREE.Scene();
    if (cfg.bg === 'transparent') renderer.setClearColor(0x000000, 0);
    else scene.background = new THREE.Color(cfg.bg);

    // 沙箱环境不能走 loader.load（fetch 会被拦截炸 DataCloneError），一律 parse 喂二进制
    const gltf = await new Promise((res, rej) =>
      new GLTFLoader().parse(base64ToArrayBuffer(cfg.glbB64), '', res, rej));
    const model = gltf.scene;
    model.rotation.y = THREE.MathUtils.degToRad(cfg.rotY || 0);

    const silhouette = new THREE.MeshBasicMaterial({ color: new THREE.Color(cfg.color) });
    model.traverse((o) => {
      if (o.isMesh) {
        o.material = silhouette;
        o.frustumCulled = false; // 骨骼动画会把网格甩出默认包围盒
      }
    });
    scene.add(model);

    const mixer = new THREE.AnimationMixer(model);
    const clips = {};
    for (const c of gltf.animations) clips[c.name] = c;

    // 取景：显式给 orthoH/camY，或按静止姿态包围盒自动 fit
    model.updateMatrixWorld(true);
    let { orthoH, camY } = cfg;
    if (orthoH == null || camY == null) {
      const box = new THREE.Box3().setFromObject(model);
      if (orthoH == null) orthoH = (box.max.y - box.min.y) * (cfg.fitMargin ?? 1.3);
      if (camY == null) camY = (box.max.y + box.min.y) / 2;
    }
    const aspect = cfg.width / cfg.height;
    // 必须正交相机——透视的近大远小会让轮廓随视角畸变
    const camera = new THREE.OrthographicCamera(
      -orthoH * aspect / 2, orthoH * aspect / 2, orthoH / 2, -orthoH / 2, 0.1, 100);
    camera.position.set(cfg.camX ?? 5, camY, cfg.camZ ?? 0);
    camera.lookAt(0, camY, 0);

    Object.assign(state, { THREE, renderer, scene, camera, model, gltf, mixer, clips, canvas, cfg });
    await hooks.onModelLoaded?.(state);

    const bones = [];
    model.traverse((o) => { if (o.isBone) bones.push(o.name); });
    return {
      clips: gltf.animations.map((c) => ({ name: c.name, duration: +c.duration.toFixed(3) })),
      bones,
      framing: { orthoH: +orthoH.toFixed(3), camY: +camY.toFixed(3) },
    };
  }

  function renderAt(action, clip, t) {
    action.reset();
    action.play();
    state.mixer.setTime(t);
    state.model.updateMatrixWorld(true); // 挂件要读骨骼世界坐标，必须先刷新
    hooks.onFrame?.(state, {
      t, clip: clip.name, duration: clip.duration,
      phase: (t % clip.duration) / clip.duration,
    });
    state.renderer.render(state.scene, state.camera);
  }

  async function sample({ clip: clipName, frames, endpoint, from, to }) {
    const clip = state.clips[clipName];
    if (!clip) throw new Error(`clip "${clipName}" not found; available: ${Object.keys(state.clips).join(', ')}`);
    const t0 = from ?? 0;
    const span = (to ?? clip.duration) - t0;
    state.mixer.stopAllAction();
    const action = state.mixer.clipAction(clip);
    const out = [];
    for (let i = 0; i < frames; i++) {
      // 循环动作不含终点（末帧接回首帧）；--endpoint 用于非循环动作含住收尾姿态
      const t = endpoint ? t0 + (span * i) / Math.max(1, frames - 1) : t0 + (span * i) / frames;
      renderAt(action, clip, t);
      out.push(state.canvas.toDataURL('image/png'));
    }
    return out;
  }

  window.__silhouette = { init, sample };
}
