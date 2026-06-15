---
name: game-gen
description: 从自然语言描述出发，由 Google Nano Banana 模型全程生成概念图、单体素材和动画帧，并行生成 Phaser.js 游戏逻辑，最终组装为可在浏览器中运行的可交互游戏。Gemini 仅在后期承担审阅与优化职责。
---

# Game Gen Skill

## 执行主体声明

| 角色 | 执行者 | 介入时机 |
|------|--------|---------|
| 图像生成 | Google Nano Banana（图像生成模型） | Phase 1–3 |
| 图像理解 / 素材推导 | Google 多模态能力 | Phase 2 |
| 游戏逻辑生成 | Google（并行） | Phase 3 |
| 脚本处理（chroma-key / 帧提取 / 拼图） | 本地 TypeScript 脚本 | Phase 3 |
| 游戏组装 | 本地脚本 `game-assemble.ts` | Phase 4 |
| 审阅 / 优化 | Gemini | Phase 5（后期） |

---

## 风格库

| 名称 | 触发词 | 图像生成关键词 |
|------|--------|--------------|
| **ghibli**（默认） | 吉卜力 / ghibli / 动漫 | Studio Ghibli animation style, soft expressive eyes, gentle watercolor-like shading, warm color palette, clean detailed linework, painterly but not photorealistic |
| **pixel** | 像素 / pixel / 复古 | pixel-ish, chibi, thick dark 1-2px outlines, limited palette, flat cel shading, visible stepped pixel edges |
| **cartoon** | 卡通 / cartoon | Bold outlines, flat bright colors, western cartoon style, exaggerated expressions, rubber-hose limbs |

---

## 全流程架构

```
Phase 1  需求收集 + 全景图生成
              ↓
Phase 2  多模态识图 → 素材清单（用户确认）
              ↓
Phase 3  素材生成（图像）+ 游戏逻辑生成（代码）← 并行
         ├─ 瓦片贴图   → material-texture pipeline
         ├─ 角色精灵   → hatch-pet pipeline
         └─ 动态物体   → object-anim pipeline
              ↓
Phase 4  游戏组装 → 可运行的 Phaser.js index.html
              ↓
Phase 5  Gemini 审阅 + 优化（后期）
```

---

## Phase 1 — 需求收集与全景图生成

### 1.1 收集信息

向用户确认：
- **游戏类型**：横版平台 / 俯视 RPG / 俯视 Action
- **世界观描述**：一句话概括（例："中世纪奇幻村庄，有城墙、篝火和石板路"）
- **视觉风格**：ghibli / pixel / cartoon（未指定默认 ghibli）

### 1.2 生成全景图（Google Nano Banana）

全景图是整个流程的**视觉宪法**——所有后续素材的风格、色调、光照均以此为准。

**全景图生成 Prompt 模板**：
> "A wide establishing shot of [世界观描述] for a 2D [游戏类型] game. {STYLE}. Orthographic [side-view / top-down] perspective. Shows key environmental elements: terrain, structures, interactive objects, and at least one character silhouette in context. Even flat diffuse lighting, no baked shadows, no depth-of-field blur. Muted stylized palette consistent throughout."

**全景图规格要求**：
- 视角与游戏类型对齐（横版→侧视，俯视→正交俯视）
- 必须包含游戏内所有主要视觉元素
- 光照均匀，无烘焙阴影（后期引擎自行叠加光照）

---

## Phase 2 — 多模态识图 → 素材清单

Google 多模态能力分析全景图，自动推导素材清单，输出结构化 JSON：

```json
{
  "game": "GameName",
  "style": "ghibli",
  "gameType": "side-scroller",
  "tiles": [
    { "name": "grass",  "variants": ["base", "dry"],   "gridCoverage": 2 },
    { "name": "stone",  "variants": ["base"],           "gridCoverage": 2 },
    { "name": "water",  "variants": ["base"],           "gridCoverage": 4 }
  ],
  "characters": [
    {
      "name": "Hero",
      "animations": ["idle", "running-left", "jumping", "attacking", "sleeping"]
    }
  ],
  "objects": [
    { "name": "fire",         "fps": 8,  "loop": true,  "frames": 6 },
    { "name": "torch",        "fps": 10, "loop": true,  "frames": 4 },
    { "name": "water_ripple", "fps": 6,  "loop": true,  "frames": 6 }
  ]
}
```

### 硬性门控

**用户确认素材清单后，Phase 3 方可启动。**

初始化游戏项目：
```bash
npx tsx skills/game-gen/prepare.ts <GameName> --style=<style>
```

---

## Phase 3 — 素材生成 + 游戏逻辑生成（并行）

Phase 3 的两条链**同时启动，互不等待**。

---

### 链 A：素材图像生成（Google Nano Banana + 本地脚本）

所有图像生成均须附带 Phase 1 全景图作为风格参考输入。

#### A1 — 静态瓦片（material-texture pipeline）

```bash
npx tsx skills/material-texture/prepare.ts <GameName>
```

每个瓦片附带全景图生成贴图：
> "Using this panorama as style reference, generate [材质描述], seamless tileable texture, flat-lay orthographic, even flat diffuse lighting, no shadows no highlights no AO, base-color/albedo only, matte, {STYLE} hand-painted game texture, 512x512."

```bash
npx tsx skills/material-texture/process.ts <GameName> <material> <image_path> [--suffix=<variant>]
npx tsx skills/material-texture/assemble.ts <GameName>
```

#### A2 — 角色精灵

根据角色类型选择 pipeline：

| 情况 | Pipeline |
|------|----------|
| 简单生物 / 宠物，固定 6 行生命周期动画 | `hatch-pet` |
| 游戏可控角色，动画行由游戏设计决定 | **`char-sprite`**（推荐） |

**使用 char-sprite（推荐）——动画行由 Phase 2 素材清单的 `animations` 字段驱动：**

```bash
npx tsx skills/char-sprite/prepare.ts <CharName> --anims="<anim1,anim2,...>"
```

**角色参考图**（外观锚点，附带全景图）：
> "Using this panorama as style reference, generate a single sprite of [角色描述], front-facing pose, full body, centered. {STYLE}. #00FF00 background. No shadows. Wide margin."

```bash
npx tsx skills/char-sprite/process.ts <CharName> reference <image_path>
```

**逐行动画**（同时附带全景图 + 角色参考图）：
> "Using the panorama and character reference, generate a 3×3 grid of 9 sequential frames showing [动作描述]. {STYLE}. Separate frames with thin solid DARK GREEN lines (#006600). Character centered in each cell, wide margin. #00FF00 background. No shadows."

```bash
npx tsx skills/char-sprite/process.ts <CharName> <row_name> <image_path>
npx tsx skills/char-sprite/assemble.ts <CharName>
```

#### A3 — 动态环境物体（object-anim pipeline）

```bash
npx tsx skills/object-anim/prepare.ts <ObjectName> --fps=<fps> --frames=<n>
```

附带全景图生成动画帧网格：
> "Using this panorama as style reference, generate a {cols}×{rows} grid of {n} sequential animation frames of [物体描述]. {STYLE}. Separate frames with thin solid DARK GREEN lines (#006600). Object centered in each cell, wide margin. #00FF00 background. No glow overflow, no floor texture."

```bash
npx tsx skills/object-anim/process.ts <ObjectName> <image_path>
npx tsx skills/object-anim/assemble.ts <ObjectName>
```

---

### 链 B：游戏逻辑生成（Google，并行）

基于素材清单 JSON，生成完整的 Phaser.js 游戏逻辑文件：

**生成目标**：
```
game_runs/<GameName>/game/
  game-config.json    ← 地图尺寸、出生点、碰撞层定义
  tilemap.json        ← Tiled 兼容格式，引用 tile 名称
  entities.json       ← 角色 / 物体的初始位置和参数
  game-logic.js       ← Phaser.js 场景：加载、初始化、输入、更新循环
```

**game-logic.js 必须包含**：
- 瓦片地图渲染（使用 `game-config.json` 中的碰撞层）
- 角色加载（使用 `pet.json` 中的动画定义）
- 键盘控制（← → 移动，↑ 跳跃，Z 攻击）
- 动态物体循环播放（使用 `object.json` 中的 fps/loop 参数）
- 摄像机跟随玩家

---

## Phase 4 — 游戏组装

所有素材就绪 + 游戏逻辑生成完成后，执行最终组装：

```bash
npx tsx skills/game-gen/assemble.ts <GameName>
```

产物：
```
game_runs/<GameName>/
  index.html      ← 引入 Phaser.js CDN + 内联游戏配置，浏览器直接打开即可运行
  assets/
    tiles/        ← 从 texture_runs/ 复制的贴图
    sprites/      ← 从 pet_runs/ 复制的图集
    objects/      ← 从 object_runs/ 复制的条带
```

验证：直接在浏览器打开 `index.html`，用方向键控制角色。

---

## Phase 5 — Gemini 审阅与优化（后期）

**Gemini 在 Phase 4 完成后才介入。** 审阅内容：

| 检查项 | 方法 |
|--------|------|
| 素材风格一致性 | 对比各素材与全景图色调 / 线条风格 |
| 动画帧连贯性 | 审查各动作行首尾帧是否平滑衔接 |
| 游戏逻辑正确性 | 审查碰撞层、动画状态机、输入响应 |
| 性能 | 检查图集尺寸、帧率、资源加载顺序 |

优化输出：直接修改 `game_runs/<GameName>/` 下的文件，重新验证。

---

## 全局 Prompt 约束

- 所有图像生成必须附带全景图（风格锚点不可省略）
- 角色动画行生成须同时附带全景图 + 角色参考图
- 绿幕颜色：`#00FF00`；网格线颜色：`#006600`
- 禁止烘焙光照、阴影、高光、AO（引擎自行处理）
- 所有素材对象必须在格子内完整居中，不得越界
