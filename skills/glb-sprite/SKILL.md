---
name: glb-sprite
description: 用绑好骨骼的 3D 模型（GLB）+ 真实动作数据渲染剪影序列帧。正交侧视相机 + 纯黑无光照材质，在动作时间轴上等距采样导出 PNG。动作数据真实精确、网格从不切割、天然无缝。作为 svg-sprite（参数化骨骼）/ char-sprite（AI 图集）/ video-sprite（绿幕视频）的第四条平行轨道，适合"写实人形运动的剪影"。
---

# GLB Sprite Skill

用**3D 骨骼动画驱动剪影**：找一个绑好骨骼、带 `AnimationClip` 的免费人形模型，
正交相机 + `MeshBasicMaterial` 无光照渲染，在动作时间轴上 `mixer.setTime(t)` 等距取点，
直接导出剪影 PNG 序列帧。

核心优势（相对"描摹静态图再切割"）：**动作数据（骨骼旋转）是真实精确的，剪影只是渲染副产品**。
角色网格从不被切割，自然不存在接缝；要哪个姿态、哪一帧、几帧，改参数就行，不用重新描图。

交互式 PoC 见 [example.html](example.html)（Soldier.glb 内嵌单文件版，浏览器直接打开）。

---

## 四轨决策矩阵

| 材质特征 | 选择 | 理由 |
|----------|------|------|
| **写实人形运动的剪影**（步行/奔跑/待机等有机步态） | **GLB（本 skill）** | 真实动作数据，摆动幅度大也无缝；svg-sprite 手摆关节角逼近不了有机步态 |
| 几何/线条/火柴人、需要逐关节精确控制的招式 | [svg-sprite](../svg-sprite/SKILL.md) | 参数化角度可读可调，攻击命中窗口逐帧对齐 |
| 写实纹理与光影的插画角色 | [char-sprite](../char-sprite/SKILL.md)（AI） | 剪影表达不了质感时才升级 |
| 手头已有绿幕角色视频 | [video-sprite](../video-sprite/SKILL.md) | 现成素材直接抠 |

> 界线经验：**循环类动作（walk/run/idle）GLB 最强**——步态真实感是手摆角度的死穴。
> **攻击招式 svg-sprite 更顺**——GLB 受限于模型自带的 clip 库，而 svg 的关键帧序列
> （预备→发力→过头→收招）+ 命中窗口帧号完全自主。两轨可混用：同一角色 walk 用 GLB、punch 用 SVG，
> 只要剪影颜色和取景框一致，风格无缝。

---

## 前置依赖

`npm install` 后即有：`three`（0.185.x）、`playwright`、`esbuild`、`sharp`。
自带默认模型 [models/Soldier.glb](models/Soldier.glb)（Mixamo 骨架，clips：`Idle(2.0s) / Run(0.7s) / TPose / Walk(1.0s)`，侧视朝左）。

---

## 工作流

```bash
# 1. 查看模型的 clip 名 + 骨骼命名（换模型后第一件事，每个模型都不一样）
node skills/glb-sprite/render.mjs --list [--model path/to/Model.glb]

# 2. 采样渲染 → 逐帧 PNG（透明背景）+ 接触表目检
node skills/glb-sprite/render.mjs --clip Walk --frames 6 \
  --out game_runs/<Game>/assets/3d --prefix hero_walk --sheet

# 3. 目检 <prefix>_sheet.png：步态连贯、无裁切、朝向正确
# 4. Phaser load.image 逐帧 → anims.create（见下方集成）
# 5. assemble + game-verify（L0/L1/L2）
```

常用参数（全表 `--help`）：

| 参数 | 说明 | 默认 |
|------|------|------|
| `--frames <n>` | 采样帧数——要 5 帧还是 30 帧只改这个数 | 6 |
| `--w / --h` | 画布尺寸 | 360×480 |
| `--color` | 剪影颜色 | `#0a0d12` |
| `--bg` | `transparent`（游戏资产）或十六进制色（目检） | transparent |
| `--rotY <deg>` | 模型 Y 旋转——朝向不对（拍成正/背面）时调 | 0 |
| `--orthoH / --camY` | 手动取景；缺省按包围盒自动 fit（`--fit-margin` 调留边） | 自动 |
| `--endpoint` | 采样含终点帧（**非循环**动作用；循环默认不含，末帧接回首帧） | 关 |
| `--from / --to` | 只采样时间轴片段（秒）——从长 clip 里截一段动作 | 整段 |
| `--hooks <file>` | 挂件脚本（斗篷/提灯/武器），见下节 | 无 |

**所有帧共用同一相机取景**（同 svg-sprite 的"共用 viewBox"原则）——保证 Phaser 里对齐不抖。
**不要对输出 PNG 做逐帧 trim**，会破坏对齐。

---

## 五条核心原则（都是踩坑得来的）

1. **必须正交相机**：透视有近大远小畸变，剪影轮廓会随视角抖动。侧视/俯仰/3⁄4 角度
   全由 `camera.position` 决定（本 skill 固定 +X 侧视，`--rotY` 转模型来换角度）。

2. **`MeshBasicMaterial` 覆盖 + `frustumCulled = false`**：无光照材质颜色即最终颜色，
   比打光后期扣色可靠得多；骨骼动画会把网格甩出默认包围盒，不关 culling 会整块消失。

3. **`preserveDrawingBuffer: true` 必开**，否则 `canvas.toDataURL()` 导出全空。
   render.mjs 已内置空帧哨兵（首帧 alpha 全 0 时报警）。

4. **沙箱环境加载用 `loader.parse()` 不用 `loader.load()`**：`load` 走原生 fetch，
   Claude 网页等沙箱会拦截 fetch 并 postMessage `Request` 对象 → `DataCloneError` 炸掉加载。
   parse 直接喂 ArrayBuffer 完全绕开。（本 skill 的 harness 一律 parse。）

5. **循环动作采样不含终点**：`t = dur*i/N`，末帧自然接回首帧；非循环动作
   （攻击/死亡）加 `--endpoint` 用 `dur*i/(N-1)` 含住收尾姿态。

---

## 挂件（斗篷/兜帽/提灯/武器）：--hooks 扩展点

**不要给挂件蒙皮**。挂件是独立于角色网格的物体，每帧从骨骼读世界坐标手动摆过去。
写一个 hooks 文件传给 `--hooks`：

```js
// scratch/hooks_lantern.mjs
let lantern, hand, v;

export function onModelLoaded(state) {           // state: {THREE, scene, camera, model, gltf, clips, mixer, cfg}
  const { THREE, scene, model } = state;
  hand = model.getObjectByName('mixamorigRightHand');
  v = new THREE.Vector3();
  lantern = new THREE.Mesh(
    new THREE.ShapeGeometry(myFlatShape),        // 扁平 Shape 即可，剪影不需要厚度
    new THREE.MeshBasicMaterial({ color: 0x0a0d12, side: THREE.DoubleSide }),
  );
  lantern.rotation.y = Math.PI / 2;              // 平面法线对准相机轴（+X）
  scene.add(lantern);
}

export function onFrame(state, { t, clip, duration, phase }) {  // phase: 0~1 循环相位
  hand.getWorldPosition(v);                      // 骨骼世界矩阵已刷新，直接读
  lantern.position.copy(v);
  lantern.rotation.x = Math.sin(phase * Math.PI * 2) * 0.15;   // 步态同步摆动
}
```

**关键坑**：想继承骨骼朝向时**不能** `accessory.quaternion.copy(boneWorldQuat)` 再叠自定义旋转——
`copy()` 整体覆盖，会把挂件的基准朝向（如正对镜头的 90°）一起冲掉，挂件"消失"
（实为侧面对镜头细成一条线）。要么只继承位置、自己 author 全部旋转（上例做法），
要么四元数相乘 `boneQuat.clone().multiply(localOffsetQuat)`。

Mixamo 骨骼挂点速查：髋 `mixamorigHips` · 肩背 `mixamorigSpine2` · 脖 `mixamorigNeck` ·
头 `mixamorigHead` · 手 `mixamorigLeftHand/RightHand` · 脚 `mixamorigLeftFoot/RightFoot`。
（提灯直接挂手骨，"灯不贴手"问题自动消失。）

---

## Phaser 集成

与 svg-sprite 同构，只是 `load.svg` 换 `load.image`（PNG 自带尺寸，无需传 w/h）：

```js
// preload
ACT = { walk: { n: 6, fps: 10, loop: true }, run: { n: 6, fps: 12, loop: true } };
for (const [act, a] of Object.entries(ACT))
  for (let i = 0; i < a.n; i++)
    this.load.image(`hero_${act}_${i}`, `assets/3d/hero_${act}_${i}.png`);

// create
for (const [act, a] of Object.entries(ACT))
  this.anims.create({
    key: `hero_${act}`,
    frames: Array.from({ length: a.n }, (_, i) => ({ key: `hero_${act}_${i}` })),
    frameRate: a.fps, repeat: a.loop ? -1 : 0,
  });
```

要点同 svg-sprite：物理体固定大小 `setOffset` 对齐躯干；左右朝向 `setFlipX`
（Soldier 默认朝左）；L2 verify 贴边出生 + `setCollideWorldBounds(true)`。
360×480 对游戏偏大时用 `setScale` 或渲染时直接减小 `--w/--h`（正交下等比缩放无损构图）。

---

## 换模型时要检查什么

1. **格式**：要 `.glb/.gltf`（`.fbx` 可转）。市场上很多"角色资产"是引擎专属格式，打不开。
2. **是否带骨骼动画**：没有 `AnimationClip` 就得走 Mixamo 自动绑骨，或只做静态摆拍。
3. **骨骼命名**：非 Mixamo 来源不一定是 `mixamorigXXX`，`--list` 打出来，hooks 里的骨骼名跟着改。
4. **Clip 名字**：同上，`--list` 看 Idle/Walk/Run 的实际叫法。
5. **朝向**：默认朝向不一定侧对相机，拍出正/背面就调 `--rotY`（90 的倍数先试）。
6. **授权**：Fab Standard License 允许任意兼容工具；小心 legacy UE Marketplace License 的老资产。

模型来源：three.js 官方示例 `Soldier.glb`（已内置）· Mixamo 导出（免费，需 Adobe 账号）· Fab / Sketchfab。

---

## 单文件 HTML 交付（可选，浏览器预览用）

要做 example.html 那样的可交互单文件（沙箱可跑），模型 base64 内嵌 + esbuild 打包：

```bash
npx esbuild app.js --bundle --format=esm --outfile=bundle.js --minify
# 再把 window.__GLB_B64__="<base64>" 与 bundle 注入 HTML（参考 example.html 结构）
```

游戏资产管线**不需要**这步——render.mjs 全程本地无头渲染。
