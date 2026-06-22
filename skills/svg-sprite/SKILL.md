---
name: svg-sprite
description: 用参数化骨骼 + 逐帧 SVG 序列帧为剪影/几何/线条风格游戏制作角色与物件动画。零图像额度、强可控、不切割。作为 char-sprite（AI 绿幕图集）的平行替代轨道。适用于 LIMBO 剪影、火柴人、线条、几何抽象等扁平风格。
---

# SVG Sprite Skill

为**扁平风格**（剪影 / 几何 / 线条 / 抽象）游戏制作序列帧动画。每帧是一张
独立 SVG，由参数化骨骼按"绝对关节角度"渲染；`load.svg` 栅格化为纹理后用
Phaser anim 播放。**不生成 AI 图、不切割图集**——稳定、零额度、逐帧可控。

在 **MoonRonin**（屋脊浪人）与 **ShadowArena**（剪影格斗，4 角色 ×8 动作 ×136 帧）
两款游戏验证通过（L0/L1/L2 全绿）。

复用库：[rig.mjs](rig.mjs) —— `pt / line / circle / poly / svg / humanoid / mergePose / lerpPose / tween / stagger / ease / writeFrames`。

---

## 何时用 SVG，何时用 AI（决策矩阵）

| 材质特征 | 选择 | 理由 |
|----------|------|------|
| 纯色剪影、几何形、线条、可参数化的姿态 | **SVG（本 skill）** | 矢量精确、零额度、逐帧可控、无切割风险 |
| 写实/有机的复杂运动、需要纹理与光影的插画 | **AI**（[char-sprite](../char-sprite/SKILL.md)） | 多帧有机运动与质感是 AI 的强项 |
| 无缝平铺纹理 | [material-texture](../material-texture/SKILL.md) | 专用管线 |
| 静态背景全景 | AI（game-gen scene） | 一次性、风格统一 |

> 经验：剪影/几何类**优先 SVG**。AI 网格图还要 chroma-key + 连通域切割，
> 既耗额度又有"棍体被裁一截"这类切割风险（见 char-sprite 的网格切割）。SVG 逐帧从源头规避。

---

## 五条核心原则（都是踩坑得来的）

1. **逐帧独立 SVG，绝不切割**：每帧一个 `<id>_<act>_<i>.svg`。需要几帧画几帧，
   想改单帧就改单帧。彻底避开图集切割误差。

2. **绝对关节角度，统一约定 `0=下 / 90=前(+x) / 180=上`**：
   `pt(x,y,len,deg)` 沿该方向伸出骨节。用世界绝对角而非相对父骨骼角——
   摆姿态时数值直接可读（`fUp:90` 就是手臂水平前指），调试快。

3. **viewBox 必须留动作边距**：挥刀、高扫踢、受击后仰会让肢体/武器伸出站立
   包围盒。viewBox 过紧 → 裁切（MoonRonin `preview_slash` 棍体被截的 bug）。
   四周各留 1~2 个肢节长度。**所有帧共用同一 viewBox**，保证 Phaser 里对齐不抖。

4. **招式 = 关键帧序列，不是单帧**：动作要"飘逸"靠的是
   **预备(anticipation) → 发力(strike) → 过头(overshoot/follow-through) → 收招(recover)**。
   单帧定格必然呆板。攻击类 5~6 帧、循环类（idle/walk）4~6 帧。
   稀疏关键帧可用 `tween()` 补间出顺滑过渡帧。

   **治僵硬三件套（光摆对角度还不够，这三项是结构性的）**：
   - **重心位移 `hipDx`**：髋部水平前冲/后撤。出拳/踢腿不是"原地挥手"，是重心从后坐打到前压。`bob` 管上下（含下蹲蓄力）。
   - **关节滞后 `stagger(frames, {fFore:2, fUp:1})`**：动力链有先后——髋先转→躯干→上臂→前臂→拳最后甩到。所有关节同帧到位 = 没有鞭打。在 `tween` 后的密集帧上叠。
   - **favoring 节奏**：`tween(keys, [6,1], {ease: ease.in})` —— 逐段帧数 + 缓动，蓄力慢、命中急。匀速补间本身就是僵硬源。`ease` 库：`in/out/snap/back/smooth`。

5. **飘逸特效在运行时叠加**（非烘进 SVG）：残影拖尾（afterimage，半透蓝 tint 淡出）、
   武器弧光（crescent arc）、前冲步（lunge step）。这些在 game-logic.js 里做，便于和命中窗口对齐。

---

## 选用：AI 木偶参考图校准关节角（治"角度凭猜"）

凭经验摆关节角，容易系统性出错（最典型：**护手摆太低**，动作立刻显假）。这时用
AI 出**绿幕木偶定格帧**当力学参考，由人读图反推 rig 角度——AI 只做参考，**不进游戏资产**。
在 ShadowArena 的 punch/kick/special 三招验证（参考资产存 `game_runs/<Game>/refs/<招>/`）。

**流程**（每招只需 3 张图）：
1. 让 agy 出 **3 张单极限帧**：预备(anticipation) / 命中(contact) / 过头(follow-through)。
   每张一个姿态，**别让 AI 出连续序列**（时序一致性是 AI 的死穴，中间帧让 `tween` 补）。
2. 提示词锁死可比性（缺一不可）：`wooden artist's mannequin, full body, pure left-side
   profile view, orthographic flat lighting, centered, chroma green #00b140`，且三张都带
   `same mannequin, same left-side profile, same camera`。**纯侧视**才能 1:1 读角度（透视会在肢长上撒谎）；
   **木偶**去掉服装噪声；**全身居中留空**防高踢/长武器顶出画框。
3. 人读图 → 翻成 rig 角度（0下/90前/180上），填进 `<ACT>_KEYS` 稀疏关键帧，
   再 `stagger(tween(KEYS, [favoring], {ease}))`。
4. 出接触表目检 + 真游戏连拍验证（见下方工具），通过再提交。

**两条铁律**（三轮都踩到）：
- **AI 必翻面**：3 张孤立帧里总有 1~2 张左右朝向被翻转。读角度前先目检，把翻了的**镜像**回统一朝向。
- **AI 给力学、不给坐标**：参考图的价值是*高度/后倾角/弓步深度/支撑腿承重*这些猜不准的力学；
  精确角度仍须人把关，别直接抄 AI 文档给的数字。

---

## 工作流

```bash
# 1. 写生成器（import rig.mjs），定义角色参数 + 关键帧序列 → 输出逐帧 SVG
node scratch/gen_<game>_svg.mjs
#    产物：game_runs/<Game>/assets/svg/<id>_<act>_<i>.svg + 投射物/舞台.svg

# 2. 出接触表目检：把某招全帧并排栅格化成一张 png，确认动作连贯 + viewBox 不裁切
node scratch/sheet.mjs <act> <char1,char2>   # sharp 合成 scratch/sheet_<act>_<char>.png

# 3. game-logic.js 里 load.svg 逐帧 → anims.create；接入 ACT 时序表与命中窗口
#    改帧数后只需同步 ACT.<act>.n（命中/投射物用 ms 制时不受帧数影响）
# 4. 真游戏连拍验证：进场触发该招、动作期内连拍，确认渲染正常无报错
node scratch/shot_punch.mjs <KeyJ|KeyK|KeyL>   # playwright；见 [[phaser-playtest-input]] 两坑
# 5. assemble + game-verify（L0/L1/L2）
```

生成器骨架：

```js
import fs from 'fs'; import path from 'path';
import { pt, line, circle, svg, humanoid, mergePose, tween, writeFrames } from '../skills/svg-sprite/rig.mjs';

const OUT = 'game_runs/MyGame/assets/svg';
const VB = { x: -52, y: -20, w: 236, h: 188 };          // 留足动作边距
const CHARS = { samurai: { limbW: 11, torsoW: 18, torsoLen: 32, headR: 9 } };

// 基础站姿 + 局部覆盖
const G = { lean: 6, bob: 0, fThigh: 12, fShin: 4, bThigh: -12, bShin: -4, fUp: 58, fFore: 128, bUp: 54, bFore: 124 };
const m = o => mergePose(G, o);

const SEQ = {
  idle:  [m({}), m({ bob: -2, fFore: 133 }), m({ bob: -3 }), m({ bob: -1 })],
  punch: [m({}),                                   // 架势
          m({ lean: -3, fUp: 38, fFore: 60 }),     // 预备：收拳后引
          m({ lean: 20, fUp: 92, fFore: 92 }),     // 发力：伸直爆发
          m({ lean: 23, fUp: 97, fFore: 97 }),     // 过头：略过靶点
          m({ lean: 12, fUp: 72, fFore: 118 })],   // 收招
};

const render = (c) => (p) => svg(VB, humanoid(c, p, {
  extras: (j, p) => ({ front: line(j.fHx, j.fHy, ...pt(j.fHx, j.fHy, 46, p.fFore), 4) }), // 沿前臂的刀
}));

for (const [id, c] of Object.entries(CHARS))
  for (const [act, frames] of Object.entries(SEQ))
    writeFrames(fs, path, OUT, id, act, frames, render(c));
```

---

## Phaser 集成（game-logic.js）

逐帧 `load.svg` 时**显式传 width/height = viewBox 的 w/h**（否则按 100×100 默认栅格化失真）：

```js
// preload —— 每个动作的每一帧各 load 一次
ACT = { idle:{n:4,fps:6,loop:true}, punch:{n:5,fps:14,loop:false,atkFrom:2,atkTo:3}, /*...*/ };
for (const id of Object.keys(CHARS))
  for (const [act, a] of Object.entries(ACT))
    for (let i = 0; i < a.n; i++)
      this.load.svg(`${id}_${act}_${i}`, `assets/svg/${id}_${act}_${i}.svg`, { width: 236, height: 188 });

// create —— 由帧纹理键拼成动画
for (const id of Object.keys(CHARS))
  for (const [act, a] of Object.entries(ACT))
    this.anims.create({
      key: `${id}_${act}`,
      frames: Array.from({ length: a.n }, (_, i) => ({ key: `${id}_${act}_${i}` })),
      frameRate: a.fps, repeat: a.loop ? -1 : 0,
    });
```

要点：
- **命中窗口**用 `atkFrom/atkTo` 帧序号界定（仅在"发力/过头"帧判定伤害），靠 `sprite.anims.currentFrame.index` 读当前帧。
- **物理体**固定大小、用 `setOffset` 对齐躯干，**别**随帧变化（四肢伸缩会让自动体抖动 / 误判）。
- **左右朝向**用 `setFlipX`；攻击距离/朝向判定按 flip 取符号。
- **L2 verify**：贴边出生 + `setCollideWorldBounds(true)` 防左右键位移精确抵消的假阴性；并把可控角色挂到 `window.__gameState.player` 供移动断言。

---

## 已沉淀的可复用部件

| 部件 | 出处 | 复用方式 |
|------|------|----------|
| 人形骨骼 `humanoid()` | ShadowArena 4 角色共用 | 调 `limbW/torsoW/headR` 即变体；`extras` 挂武器/头饰/披风/肚腩 |
| 关键帧序列 idle/walk/punch/kick/block/hurt/special/ko | ShadowArena `SEQ` | 直接抄改角度即得新角色动作 |
| punch/kick/special **参考校角版**关键帧 + jab/kick/thrust 木偶参考图 | ShadowArena `SEQ` + `refs/` | 攻击招的高位护手/后倾/弓步力学已校准，抄改即用 |
| 接触表 `sheet.mjs` / 真游戏连拍 `shot_punch.mjs` | ShadowArena | 传 `<act>` / `<招式键>` 即复用，验任意招式 |
| 投射物 shuriken / qiwave | ShadowArena | `poly` / radialGradient 几何件 |
| 明亮黎明舞台 stage.svg | ShadowArena | 渐变天空 + 远山 + 石台，剪影读得清 |
| 屋脊/瓦片纯 SVG 平铺 | MoonRonin | 瓦片也走 SVG，配 tilemap 无 tileIndex 碰撞 |
