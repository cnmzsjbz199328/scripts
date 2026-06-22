---
name: svg-ambient
description: 用参数化工厂生成背景/环境动画元素（飘旗、火盆、流云、雨雪、霓虹、灯塔扫射、瀑布…）的逐帧 SVG。代码是唯一真源，渲染出的 SVG 作为构建产物按需拷进各游戏，不建共享运行期素材夹。环境轨，与角色轨 svg-sprite 平行。零图像额度、跨游戏复用、可栅格化体检。
---

# SVG Ambient Skill

为游戏背景做**环境动画元素**（天气 / 光效 / 植被 / 水体 / 招牌 / 旗帜…）。
每个元素是一个 `factory(opts)`，吐出逐帧完整 SVG。**代码（ambient.mjs）是唯一真源**；
各游戏自己的生成脚本 import 本库，只把用到的元素渲染进自己的 `assets/svg/`。

与角色轨 [svg-sprite](../svg-sprite/SKILL.md) 完全同构：那边 `rig.mjs` 是库、每个游戏
生成角色帧；这边 `ambient.mjs` 是库、每个游戏生成环境帧。**角色轨 ⇄ 环境轨**。

## 为什么是 skill 而不是共享素材库

本仓库每个游戏是自包含包（index.html + game/ + assets/），verify/playtest/发布都按
"单独服务这一个目录"跑。所以**不能**建 `assets/ambient/` 共享夹让各游戏 `../../` 去引——
一移植就 404、自包含破产。正解是**共享生成素材的代码，复制渲染出的产物**：

- 共享库里躺的是死素材（红旗就是红的，换灰旗只能复制改）；
- skill 里 `flag({palette:{cloth:'#9aa0a8'}})` 一个工厂红战旗 / 灰破幡通吃，真源唯一。

副本不是债：真源在 skill，副本随时可重新生成、可丢弃。

## 文件

| 文件 | 作用 |
|------|------|
| `ambient.mjs` | **库 / 唯一真源**。20+ 元素工厂 + `make/list/meta` API |
| `catalog.json` | 机读索引（name/frames/fps/layer/motionType/可调 palette/params）。由 check.mjs 生成 |
| `check.mjs` | 验收门：栅格化体检 + 重建 catalog.json/samples/preview.png |
| `preview.png` | 自动生成的 contact sheet —— 可浏览的素材展厅 |
| `samples/` | 默认调色的预渲染参考帧（只读，速查用） |

## API

```js
import { make, list, meta } from '<相对路径>/skills/svg-ambient/ambient.mjs';

make('flag', {
  frames: 8,                       // 帧数（循环类按相位重采样；particle 类同理）
  speed: 1,                        // 相位/位移倍率
  scale: 1,                        // 绕中心(64,64)整体缩放，留动作边距
  density: 1,                      // 仅 particle 类（rain/snow/leaf…）：粒子密度倍率
  palette: { cloth:'#9aa0a8', emblem:'none' },  // 覆盖默认配色；'none' 隐藏可选件
}) // → string[]  每帧一个完整 128² SVG 文档

list()        // → ['windmill','tree','streetlight',...]
meta('flag')  // → { frames, fps, layer, motionType, anchor, palette, params }
```

`layer`（投放层级建议）：`sky` / `weather` / `mid` / `ground` / `structure` / `foreground`。
`motionType`：`loop`（无缝循环）/ `particle`（粒子场）/ `flicker`（明灭）/ `sweep`（往复扫射）/ `sequence`（一次性时序，如 drip 滴落→涟漪，**不要**当循环播）。

完整元素清单见 [catalog.json](catalog.json)，外观见 [preview.png](preview.png)。

## 工作流（各游戏按需引用）

```js
// game_runs/<Game>/ 的生成脚本，例如 scratch/gen_<game>_ambient.mjs
import { make } from '../skills/svg-ambient/ambient.mjs';
import fs from 'fs';
const OUT = 'game_runs/<Game>/assets/svg';
for (const [name, opts] of [
  ['flag', { palette:{ cloth:'#7f1d1d' } }],
  ['campfire', {}],
  ['cloud', { speed: 0.5, palette:{ cloud:'#1e293b' } }],
]) make(name, opts).forEach((svg, i) => fs.writeFileSync(`${OUT}/amb_${name}_${i}.svg`, svg));
```

游戏的 Phaser 侧把 `amb_<name>_<i>.svg` 栅格化为纹理、按 motionType 投放（定点循环 /
粒子场 / 扫射 / 视差漂移）。游戏仍自包含、可单独发布。

## 三条硬约束（栅格化体检的前提）

踩坑得来，写死在库里，`check.mjs` 守门：

1. **辉光用多层半透叠，绝不用 `<filter>`/feGaussianBlur**。滤镜跨设备渲染不一致、
   离屏栅格化常崩成空白。库内 `glowStroke/glowRect`（霓虹）、`fadeCone`（光锥）、
   `radGlow`（径向）都是纯图元叠加。
2. **文字一律转 polyline，绝不用 `<text>`**。字体不可控、栅格化字形漂移。霓虹招牌用
   内置 `NEON_FONT` 矢量字形描点（`make('neon',{word:'OPEN'})`）。
3. **不用 `<linearGradient>`/`<radialGradient>`**。同样跨设备/栅格化不稳，用上面的叠层替代。

## 验收门

改完 `ambient.mjs` 必须跑：

```bash
node skills/svg-ambient/check.mjs
```

它逐帧离屏栅格化(128²)统计非透明像素，任一帧 < 24px 即判渲染崩溃（filter/text/gradient
崩坏的典型症状就是整帧空白），退出码非 0。通过后会刷新 catalog.json / samples/ / preview.png。

## 何时用本 skill / 何时别用

| 场景 | 选择 |
|------|------|
| 天气、光效、旗帜、火、水、招牌等**可参数化的循环/粒子背景元素** | **本 skill** |
| 角色 / 物件序列帧（剪影、几何、线条） | [svg-sprite](../svg-sprite/SKILL.md) |
| 写实质感的静态全景背景 | AI（game-gen scene） |
| 无缝平铺纹理 | [material-texture](../material-texture/SKILL.md) |
