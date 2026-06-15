---
name: game-gen
description: 从自然语言描述出发，由游戏策划师（Phase 0）生成 GDD，Google Nano Banana 模型全程生成概念图、单体素材和动画帧，并行生成含 UI/HUD 的 Phaser.js 游戏逻辑，最终组装为可在浏览器中运行的可交互游戏。
---

# Game Gen Skill

## 执行主体声明

| 角色 | 执行者 | 介入时机 |
|------|--------|---------|
| 游戏策划（GDD 生成） | Claude（游戏策划师角色） | Phase 0 |
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
Phase 0  游戏策划师 → GDD（游戏设计文档）
              ↓
Phase 1  全景图生成（基于 GDD 世界观）
              ↓
Phase 2  多模态识图 → 素材清单（用户确认）
              ↓
Phase 3  素材生成（图像）+ 游戏逻辑生成（代码）← 并行
         ├─ 瓦片贴图   → material-texture pipeline
         ├─ 角色精灵   → char-sprite pipeline
         └─ 动态物体   → object-anim pipeline
              ↓
Phase 4  游戏组装 → 含 UI/HUD 的 Phaser.js index.html
              ↓
Phase 5  Gemini 审阅 + 优化（后期）
```

---

## Phase 0 — 游戏策划（Game Designer）

Phase 0 由 Claude 扮演游戏策划师角色，将用户的一句简述扩展为完整的游戏设计文档（GDD）。**GDD 是整个管线的叙事锚点**，驱动后续所有阶段。

### 0.1 听取用户简述

用户只需提供一句话，例如：
> "一个农场游戏，主角是一只小兔子，需要种植庄稼并击退入侵的害虫"

如用户未指定视觉风格，默认使用 **ghibli**。

### 0.2 生成 GDD

Claude 基于用户描述，填写如下 JSON 结构，输出完整 GDD：

```json
{
  "title": "游戏中文标题",
  "tagline": "一句话游戏标语（在开始界面显示）",
  "style": "ghibli",
  "story": {
    "setting": "世界背景（2-3句，描述地点、时代、氛围）",
    "protagonist": "主角描述（名字、外貌特征、性格、动机）",
    "conflict": "核心冲突（谁/什么威胁了主角的世界）",
    "resolution": "胜利后发生什么（故事的美好结局）"
  },
  "gameType": "side-scroller | top-down-rpg | top-down-action",
  "coreLoop": "玩家每分钟在做什么（1-2句，描述核心玩法循环）",
  "winCondition": {
    "description": "胜利条件（玩家能读懂的自然语言）",
    "trigger": "代码可用的触发条件，如 score >= 100 || bossDefeated === true"
  },
  "loseCondition": {
    "description": "失败条件（玩家能读懂的自然语言）",
    "trigger": "如 playerHp <= 0"
  },
  "uiElements": ["hearts", "score", "objective"],
  "hud": {
    "hearts": { "max": 3 },
    "score": { "label": "得分", "goal": 100 },
    "objective": { "initial": "收集100金币！" }
  },
  "zones": [
    { "name": "区域名", "description": "区域功能描述", "theme": "视觉主题" }
  ]
}
```

**`uiElements` 可选值**：`hearts`（血量心形）、`score`（得分计数）、`objective`（目标提示）、`dayCounter`（日期计数器）。根据游戏类型按需选取，通常 2-3 个即可。

### 0.3 初始化游戏项目

```bash
npx tsx skills/game-gen/design.ts <GameName> --style=<style>
```

脚本创建：
```
game_runs/<GameName>/
  manifest.json   ← 项目元数据（含 GDD 引用）
  gdd.json        ← 游戏设计文档（待填入）
  scene/          ← 全景图存放目录
```

将 GDD 内容写入 `game_runs/<GameName>/gdd.json`。

### 0.4 GDD 驱动后续阶段

| 阶段 | 使用 GDD 字段 |
|------|-------------|
| Phase 1 全景图 | `story.setting`、`gameType`、`style` |
| Phase 2 素材清单 | `story.protagonist`、`zones`、`story.conflict` |
| Phase 3B 游戏逻辑 | `winCondition`、`loseCondition`、`coreLoop`、`zones` |
| Phase 4 UI/HUD | `title`、`tagline`、`story`、`uiElements`、`hud` |

---

## Phase 1 — 全景图生成

### 1.1 从 GDD 提取信息

Phase 0 完成后，Phase 1 直接使用 GDD 中的字段，无需再次询问用户：
- **游戏类型**：`gdd.gameType`
- **世界观描述**：`gdd.story.setting`
- **视觉风格**：`gdd.style`

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

> 注：项目目录已在 Phase 0 由 `design.ts` 创建，此处无需再次初始化。直接进入 Phase 3 即可。

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

**生成目标同时需读取 GDD**（`game_runs/<GameName>/gdd.json`），将胜负条件、核心循环、区域主题融入逻辑中。

**game-logic.js 必须包含**：
- 瓦片地图渲染（使用 `game-config.json` 中的碰撞层）
- 角色加载（使用 `pet.json` 中的动画定义）
- 键盘控制（← → / WASD 移动，Z 工具，X 睡眠，E 交互）
- 动态物体循环播放（使用 `object.json` 中的 fps/loop 参数）
- 摄像机跟随玩家
- **胜利/失败检测**（基于 GDD `winCondition.trigger` / `loseCondition.trigger`）
- **HUD 通信**（通过 `window.GameHUD` API 更新界面，见下）

**window.GameHUD API（game-logic.js 与 HUD 通信的唯一接口）**：

```javascript
// 在 create() 中等待游戏开始信号
this.gameStarted = false;
if (window.GameHUD) {
  window.GameHUD.onStart(() => { this.gameStarted = true; });
}

// 在 update() 开头守卫：游戏未开始时不处理输入
if (!this.gameStarted) return;

// 血量变化时（受伤、回血）
window.GameHUD?.setHearts(currentHp, maxHp);

// 得分变化时（拾取物品、击败敌人）
window.GameHUD?.setScore(score);

// 目标状态变化时
window.GameHUD?.setObjective('找到宝箱！');

// 游戏结束时（胜利或失败）
window.GameHUD?.showGameOver(true,  '你击败了Boss！魔法森林重获和平。');  // win
window.GameHUD?.showGameOver(false, '勇者倒下了……');                       // lose
```

**调用规则**：
- 所有 `window.GameHUD.*` 调用必须用可选链（`?.`）保护，避免无 GDD 时报错
- 仅在状态真正变化时调用（不在 `update()` 每帧调用），避免 DOM 抖动
- `showGameOver()` 调用后立即停止游戏逻辑（`this.gameStarted = false`）

**game-logic.js Phaser 动画规范（必须遵守，违反会导致运行时 bug）**：

1. **左右翻转方向**：`char-sprite` 生成的 `walk-left` 行在视觉上朝右，因此：
   - 向左走：`setFlipX(true)`（镜像，变为朝左）
   - 向右走：`setFlipX(false)`（原始帧，本就朝右）

2. **`setFlipX` 必须在 `play()` 之后调用**：在 Phaser 3.60 中，`setFlipX()` 会触发内部 `updateFrame()` 刷新，若在 `play()` 之前调用会导致动画静默失败（角色平移但不播放动画）。正确顺序：
   ```javascript
   // ✅ 正确：先 play，再 setFlipX
   if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== 'walk_left') {
     this.player.play('walk_left');
   }
   this.player.setFlipX(true);

   // ❌ 错误：setFlipX 在 play 之前
   this.player.setFlipX(true);
   this.player.play('walk_left');
   ```

3. **动画守卫条件须同时检查 `isPlaying`**：仅检查 `currentAnim?.key` 不够，因为 `anims.stop()` 后 `currentAnim` 引用在部分 Phaser 版本中不会清空。应使用：
   ```javascript
   if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== targetKey) {
     this.player.play(targetKey);
   }
   ```

---

## Phase 4 — 游戏组装（含 UI/HUD）

所有素材就绪 + 游戏逻辑生成完成后，执行最终组装：

```bash
npx tsx skills/game-gen/assemble.ts <GameName>
```

`assemble.ts` 自动读取 `gdd.json`，将以下 UI 层注入 `index.html`：

| UI 层 | 内容 | 数据来源 |
|-------|------|---------|
| **开始界面** | 游戏标题、tagline、故事背景摘要、START 按钮、操控说明 | `gdd.title`、`gdd.tagline`、`gdd.story.setting` |
| **HUD 覆盖层** | 血量心形、得分、目标提示（按 `uiElements` 字段选择性渲染） | `gdd.hud`、`gdd.uiElements` |
| **游戏结束界面** | 胜利/失败标题、结局消息、RESTART 按钮 | `gdd.story.resolution` |

**UI 架构**：所有 UI 层为纯 DOM 元素，叠加在 Phaser canvas 之上（CSS `position: absolute`）。`window.GameHUD` 对象暴露 API，由 `game-logic.js` 调用以更新 HUD 状态。

产物：
```
game_runs/<GameName>/
  index.html      ← 含完整 UI/HUD 的可运行游戏页面
  assets/
    tiles/        ← 从 texture_runs/ 复制的贴图
    sprites/      ← 从 char_runs/ / pet_runs/ 复制的图集
    objects/      ← 从 object_runs/ 复制的条带
```

验证：直接在浏览器打开 `index.html`，先看到开始界面，点击 START 后进入游戏。

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
