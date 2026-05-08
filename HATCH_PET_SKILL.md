---
name: hatch-pet-gemini
description: 完整复刻 OpenAI hatch-pet 的 9x4 精灵图集生成方案，包含自动化处理工具。
---

# Hatch-Pet Gemini Skill

## 目标
生成符合 Hatch-Pet 标准的 1728x832 像素（9列 x 4行）动画图集，并自动完成抠图、对齐和拼合。

## 自动化工具 (Local Tools)
- **Prepare**: `npx tsx scripts/prepare.ts <pet_name>`
- **Process**: `npx tsx scripts/process.ts <pet_name> <row_name> <image_path>`
- **Assemble**: `npx tsx scripts/assemble.ts <pet_name>`

## 技术规格
- **单帧**: 192x208px | **图集**: 1728x832px (9x4)
- **序列帧输入**: 3x3 网格图（9帧，每帧 192x208px，输入图尺寸约 576x624px）
- **风格**: Codex Digital Pet Style (Pixel-ish, Chibi, Thick Outlines)
- **背景**: 必须使用纯绿色 `#00FF00`，工具仅识别绿色背景进行抠图。

## 执行工作流 (Step-by-Step)

### 1. 准备阶段
```
npx tsx scripts/prepare.ts MyPet
```
创建目录结构：`pet_runs/MyPet/{reference,rows,output}/` 及 `manifest.json`。

---

### 2. 生成参考图 ← 外观锚点，必须先完成
生成单帧正面角色图，用于锁定后续所有行的外观、比例和风格。

**Prompt**:
> "Generate a single sprite of a [description] pet, front-facing pose, full body, centered. Codex Digital Pet Style, pixel-ish, chibi, thick outlines. #00FF00 background."

生成后处理：
```
npx tsx scripts/process.ts MyPet reference path/to/reference.png
```
处理结果保存至 `pet_runs/MyPet/reference/frame_0.png`。

---

### 3. 循环生成动画行
**每次生成必须附带参考图** `pet_runs/MyPet/reference/frame_0.png` 作为图像输入，确保外观一致性。

依次生成以下动画行：

| 行名 | 动作描述 |
|------|----------|
| `jumping` | 跳跃起落 |
| `running-left` | 向左奔跑 |
| `swift-to-girl` | 变换成人形 |
| `sleeping` | 逐渐休眠 |

**Prompt 模板**：
> "Using this reference, generate a 3x3 grid of sprite frames showing [description] animation, 9 frames total arranged in 3 columns and 3 rows. Each frame must be fully contained within its own equally-sized cell. Character centered in each cell with consistent scale. No element crosses cell boundaries. Codex style, #00FF00 background."

每次生成后运行：
```
npx tsx scripts/process.ts MyPet <row_name> path/to/grid.png
```

---

### 4. 拼合阶段
所有行处理完成后：
```
npx tsx scripts/assemble.ts MyPet
```
最终产物：
- `pet_runs/MyPet/output/spritesheet.webp` — 1728x832 透明背景图集
- `pet_runs/MyPet/output/pet.json` — 含动画定义的元数据

---

## 核心 Prompt 约束
- 参考图：单帧，正面，全身居中。
- 动画行：**必须**是 3x3 网格（9帧），**禁止**使用水平长条格式。
- **每格内角色必须完整，不得超出格子边界**。
- **必须**使用 `#00FF00` 绿色背景，禁止使用白色背景。
- **禁止**动态模糊、半透明特效、速度线、阴影。
- **每一行生成时必须携带参考图**，确保外观一致性。
