---
name: game-gen
description: 全游戏资产生成协调技能。从场景概念描述出发，生成场景参考图作为风格锚点，再分阶段生成静态瓦片、角色精灵和动态环境物体的完整资产集。
---

# Game Gen Skill

## 硬性门控规则

**在以下两个条件同时满足前，禁止进入任何子流水线：**
1. 场景参考图已生成
2. 用户已确认资产清单 JSON

---

## 风格库

| 名称 | 触发词 | 提示词关键词 |
|------|--------|-------------|
| **ghibli**（默认） | 吉卜力 / ghibli / 动漫 | Studio Ghibli animation style, soft expressive eyes, gentle watercolor-like shading, warm color palette, clean detailed linework, painterly but not photorealistic |
| **pixel** | 像素 / pixel / 复古 | Codex Digital Pet Style, pixel-ish, chibi, thick dark 1-2px outlines, limited palette, flat cel shading, visible stepped pixel edges |
| **cartoon** | 卡通 / cartoon | Bold outlines, flat bright colors, western cartoon style, exaggerated expressions, rubber-hose limbs |

---

## 自动化工具 (Local Tools)

### 游戏项目
- **初始化游戏项目**: `npx tsx game-prepare.ts <GameName> [--style=ghibli]`

### 静态瓦片（调用 texture pipeline）
- `npx tsx texture-prepare.ts <GameName>`
- `npx tsx texture-process.ts <GameName> <MaterialName> <image_path>`
- `npx tsx texture-assemble.ts <GameName>`

### 角色/精灵（调用 pet pipeline）
- `npx tsx prepare.ts <CharName>`
- `npx tsx process.ts <CharName> reference <image_path>`
- `npx tsx process.ts <CharName> <row_name> <image_path>`
- `npx tsx assemble.ts <CharName>`

### 动态环境物体（调用 object pipeline）
- `npx tsx object-prepare.ts <ObjectName> [--fps=8] [--no-loop] [--frames=6] [--size=128]`
- `npx tsx object-process.ts <ObjectName> <image_path>`
- `npx tsx object-assemble.ts <ObjectName>`

---

## 五阶段工作流

---

### Phase 1 — 概念 Spec（必须经用户确认后才继续）

**步骤 1.1 — 收集信息**

询问用户：
1. 游戏的世界观和风格（例：中世纪奇幻村庄、未来都市、森林神殿）
2. 视觉风格（ghibli / pixel / cartoon），未指定默认 `ghibli`
3. 大致需要哪些类型的素材

**步骤 1.2 — 输出资产清单**

根据用户描述，生成一份资产清单 JSON，展示给用户确认：

```json
{
  "game": "GameName",
  "style": "ghibli",
  "tiles": [
    { "name": "grass",  "variants": ["base", "dry"] },
    { "name": "stone",  "variants": ["base"] },
    { "name": "water",  "variants": ["base"] }
  ],
  "characters": [
    {
      "name": "Hero",
      "animations": ["hatching", "jumping", "running-left", "attacking", "swift-to-people", "sleeping"]
    }
  ],
  "objects": [
    { "name": "fire",   "fps": 8,  "loop": true,  "frames": 6 },
    { "name": "torch",  "fps": 10, "loop": true,  "frames": 4 },
    { "name": "water_ripple", "fps": 6, "loop": true, "frames": 6 }
  ]
}
```

**等待用户明确确认资产清单后，才进入 Phase 2。**

**步骤 1.3 — 初始化项目**

```bash
npx tsx game-prepare.ts <GameName> --style=<style>
```

---

### Phase 2 — 场景参考图（风格锚点）

生成一张**全场景正交概念图**，作为所有后续资产的视觉风格参考。

**Scene Reference Prompt**:
> "An orthographic top-down / side-view game scene concept art for [世界观描述]. {STYLE}. Shows the key environmental elements: [地形/建筑/背景]. Even flat diffuse lighting, no baked shadows, no depth-of-field. Muted stylized palette. Wide establishing shot."

将此图保存至：`game_runs/<GameName>/scene/reference.png`

**此图将随每次子流水线调用一起附带，作为统一的风格参考。**

---

### Phase 3 — 静态瓦片

对资产清单中每个 `tile`，按以下流程执行：

**步骤 3.1 — 初始化贴图项目（仅首次）**
```bash
npx tsx texture-prepare.ts <GameName>
```

**步骤 3.2 — 逐材质生成**

对每个 tile 及其 variants，附带场景参考图生成贴图：

> "Using this scene reference for style, generate a [材质描述], seamless tileable texture, flat-lay orthographic, even flat diffuse lighting, no shadows no highlights no ambient occlusion, base-color/albedo only, matte, {STYLE} stylized hand-painted game texture, 512x512."

```bash
npx tsx texture-process.ts <GameName> <material_name> <image_path> [--suffix=<variant>]
```

**步骤 3.3 — 组装预览**
```bash
npx tsx texture-assemble.ts <GameName>
```

---

### Phase 4 — 角色/精灵

对资产清单中每个 `character`，走完整的 pet pipeline：

**步骤 4.1 — 初始化**
```bash
npx tsx prepare.ts <CharName>
```

**步骤 4.2 — 生成参考图（外观锚点）**

附带场景参考图生成角色正面单帧：
> "Using this scene reference for overall style, generate a single sprite of [角色描述], front-facing pose, full body, centered. {STYLE}. #00FF00 background. No shadows. Wide margin."

```bash
npx tsx process.ts <CharName> reference <image_path>
```

**步骤 4.3 — 逐行生成动画**

参见 `HATCH_PET_SKILL.md` 中的动画行提示词，每次生成**必须同时附带场景参考图和角色参考图**。

```bash
npx tsx process.ts <CharName> <row_name> <image_path>
```

**步骤 4.4 — 拼合图集**
```bash
npx tsx assemble.ts <CharName>
```

---

### Phase 5 — 动态环境物体

对资产清单中每个 `object`，按以下流程执行：

**步骤 5.1 — 初始化**
```bash
npx tsx object-prepare.ts <ObjectName> --fps=<fps> [--no-loop] --frames=<n>
```

**步骤 5.2 — 生成动画帧网格**

附带场景参考图，生成 N 帧动画网格图：

**通用动态物体 Prompt**:
> "Using this scene reference for style, generate a {gridCols}×{gridRows} grid of {frameCount} sequential animation frames of [物体描述] (e.g. 'a small campfire flickering'). {STYLE}. Each frame must be self-contained, showing one phase of the loop cycle. Separate frames with thin solid DARK GREEN grid lines (#006600). IMPORTANT: Object must be centered in each cell with wide green margin. #00FF00 background. No shadows, no glow overflow, no floor texture."

**对象类型参考：**

| 物体类型 | 帧数 | 网格 | FPS | 动作描述 |
|---------|------|------|-----|---------|
| `fire` | 6 | 2×3 | 8 | 小火苗从低到高波动循环 |
| `torch` | 4 | 2×2 | 10 | 火炬火焰摇曳循环 |
| `water_ripple` | 6 | 2×3 | 6 | 平静水面涟漪循环扩散 |
| `coin` | 6 | 2×3 | 12 | 金币旋转一圈 |
| `explosion` | 8 | 2×4 | 12 | 爆炸扩散消散（不循环，使用 --no-loop） |

```bash
npx tsx object-process.ts <ObjectName> <image_path>
npx tsx object-assemble.ts <ObjectName>
```

**产物**: `object_runs/<ObjectName>/output/object.webp` + `object.json`

---

## 核心 Prompt 约束（所有阶段通用）

- **风格统一**：所有生成提示词必须引用同一个 `{STYLE}` 关键词
- **场景参考图锚点**：Phase 3/4/5 的每次生成，都应附带 Phase 2 的场景参考图作为图像输入
- **绿幕标准**：角色和动态物体使用 `#00FF00` 背景，禁止白色背景
- **网格线颜色**：动画帧分隔线必须使用 `#006600` 深绿色，禁止使用黑色或其他颜色
- **光照**：所有素材（瓦片/角色/物体）禁止烘焙阴影、高光、AO
- **角色帧内必须完整**：任何帧内角色/物体不得超出格子边界

---

## 资产依赖关系

```
场景参考图（Phase 2）
       │
       ├──── 瓦片生成（Phase 3）← 附带场景参考图
       │
       ├──── 角色参考图（Phase 4.2）← 附带场景参考图
       │            │
       │            └── 动画行（Phase 4.3）← 附带场景参考图 + 角色参考图
       │
       └──── 动态物体帧（Phase 5）← 附带场景参考图
```
