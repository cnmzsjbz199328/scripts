// glb-sprite 浏览器侧 harness：three.js 剪影舞台。
// 由 render.mjs 用 esbuild 打包后注入 playwright 页面，通过 window.__silhouette 驱动。
// 约定：正交相机侧视 + MeshBasicMaterial 纯色覆盖 + mixer.setTime 定格采样。
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

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

    // 优先通过 fetch 加载大模型（避免 base64 内存暴涨导致 Chromium OOM 崩溃）
    let arrayBuffer;
    try {
      const url = cfg.modelUrl || 'http://local/model';
      console.log("[harness] fetching model from", url, "...");
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      arrayBuffer = await resp.arrayBuffer();
      console.log("[harness] model fetched successfully, size:", arrayBuffer.byteLength, "bytes");
    } catch (e) {
      if (cfg.glbB64) {
        console.log("[harness] fetch failed, falling back to glbB64...");
        arrayBuffer = base64ToArrayBuffer(cfg.glbB64);
      } else {
        throw new Error(`Failed to load model: ${e.message}`);
      }
    }

    // 沙箱环境不能走 loader.load（fetch 会被拦截炸 DataCloneError），一律 parse 喂二进制。
    // FBXLoader.parse 是同步的（直接返回根 Object3D，动作挂在 obj.animations）；
    // GLTFLoader.parse 是回调式的——两个接口不一致，照抄回调写法等 FBX 会拿到 undefined。
    let model, animations, gltf = null;
    if (cfg.ext === 'fbx') {
      console.log("[harness] parsing FBX model...");
      model = new FBXLoader().parse(arrayBuffer, '');
      console.log("[harness] FBX model parsed successfully!");
      animations = model.animations || [];
    } else {
      console.log("[harness] parsing GLTF model...");
      gltf = await new Promise((res, rej) =>
        new GLTFLoader().parse(arrayBuffer, '', res, rej));
      console.log("[harness] GLTF model parsed successfully!");
      model = gltf.scene;
      animations = gltf.animations || [];
    }
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
    for (const c of animations) clips[c.name] = c;

    // 取景：显式给 orthoH/camY，或按静止姿态包围盒自动 fit
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const height = box.max.y - box.min.y;
    let { orthoH, camY } = cfg;
    if (orthoH == null) orthoH = height * (cfg.fitMargin ?? 1.3);
    if (camY == null) camY = (box.max.y + box.min.y) / 2;
    const aspect = cfg.width / cfg.height;
    // 相机距离/远平面随模型尺寸走——FBX 常按厘米建模（高 ~180 单位），
    // 固定 camX=5/far=100 会把相机埋进模型里、剪裁掉大半网格
    const dist = cfg.camX != null ? cfg.camX : Math.max(5, height * 3);
    // 必须正交相机——透视的近大远小会让轮廓随视角畸变
    const camera = new THREE.OrthographicCamera(
      -orthoH * aspect / 2, orthoH * aspect / 2, orthoH / 2, -orthoH / 2,
      0.1, Math.max(100, dist * 20));
    camera.position.set(dist, camY, cfg.camZ ?? 0);
    camera.lookAt(0, camY, 0);

    Object.assign(state, { THREE, renderer, scene, camera, model, gltf, animations, mixer, clips, canvas, cfg });
    await hooks.onModelLoaded?.(state);

    // 骨骼名必须 Set 去重：多部件角色（衣服/身体/头发各自 SkinnedMesh）遍历时
    // 同名骨骼会被重复计数（Remy 实测 114 → 去重后 67 才是真实骨架）
    const boneSet = new Set();
    let meshCount = 0;
    const skinnedMeshNames = [];
    model.traverse((o) => {
      if (o.isBone) boneSet.add(o.name);
      if (o.isMesh) meshCount++;
      if (o.isSkinnedMesh) skinnedMeshNames.push(o.name);
    });
    return {
      clips: animations.map((c) => ({
        name: c.name, duration: +c.duration.toFixed(3), trackCount: c.tracks.length,
      })),
      bones: Array.from(boneSet),
      meshCount,
      skinnedMeshNames,
      height: +height.toFixed(3),
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

  async function sample({ clip: clipName, frames, endpoint, from, to, inPlace }) {
    const clip = state.clips[clipName];
    if (!clip) throw new Error(`clip "${clipName}" not found; available: ${Object.keys(state.clips).join(', ')}`);
    if (inPlace) {
      // Mixamo 非 In Place 导出的位移动作：根骨骼位置轨道的水平分量钉在首帧，
      // 消掉世界位移（角色不再走出画面），保留 Y 分量的步态起伏
      let rootBone = null;
      state.model.traverse((o) => {
        if (!rootBone && o.isBone && !(o.parent && o.parent.isBone)) rootBone = o;
      });
      for (const tr of clip.tracks) {
        if (rootBone && tr.name === `${rootBone.name}.position`) {
          const v = tr.values;
          for (let i = 3; i < v.length; i += 3) { v[i] = v[0]; v[i + 2] = v[2]; }
        }
      }
    }
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
