---
name: hatch-pet-gemini
description: 完整复刻 OpenAI hatch-pet 的 8x9 精灵图集生成方案，包含自动化处理工具。
---

# Hatch-Pet Gemini Skill

## 目标
生成符合 Hatch-Pet 标准的 1536x1872 像素（8列 x 9行）动画图集，并自动完成抠图、对齐和拼合。

## 自动化工具 (Local Tools)
- **Prepare**: `npx tsx scripts/prepare.ts <pet_name>`
- **Process**: `npx tsx scripts/process.ts <pet_name> <row_name> <image_path> [columns] [rows]`
- **Assemble**: `npx tsx scripts/assemble.ts <pet_name>`

## 技术规格
- **单帧**: 192x208px | **图集**: 1536x1872px (8x9)
- **风格**: Codex Digital Pet Style (Pixel-ish, Chibi, Thick Outlines)
- **背景**: 必须使用纯绿色 `#00FF00` 或纯白色，方便自动化工具抠图。

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

生成后处理（1×1 单帧，工具自动默认）：
```
npx tsx scripts/process.ts MyPet reference path/to/reference.png
```
处理结果保存至 `pet_runs/MyPet/reference/frame_0.png`。

---

### 3. 生成 Base 行 (Row 0)
**必须附带参考图** `pet_runs/MyPet/reference/frame_0.png` 作为图像输入。

**Prompt**:
> "Using this reference, generate a 1x8 horizontal sprite strip of this pet in a base/idle breathing pose, side view, 8 frames. Codex style, #00FF00 background."

```
npx tsx scripts/process.ts MyPet base path/to/base_strip.png
```

---

### 4. 循环生成其它行 (Rows 1-8)
**每次生成必须同时附带参考图和 Base 行图片**，确保外观一致性。

依次生成以下动画行：

| 行名 | 动作描述 |
|------|----------|
| `idle` | 原地轻微摇摆 |
| `swift-to-girl` | 快速冲向女孩 |
| `running-left` | 向左奔跑 |
| `waving` | 挥手 |
| `jumping` | 跳跃起落 |
| `failed` | 失败/沮丧 |
| `review` | 思考/审阅 |
| `sleeping` | 睡眠 |

每次生成后运行：
```
npx tsx scripts/process.ts MyPet <row_name> path/to/strip.png
```

---

### 5. 拼合阶段
所有行处理完成后：
```
npx tsx scripts/assemble.ts MyPet
```
最终产物：
- `pet_runs/MyPet/output/spritesheet.webp` — 1536x1872 透明背景图集
- `pet_runs/MyPet/output/pet.json` — 含动画定义的元数据

---

## 核心 Prompt 约束
- 参考图：单帧，正面，全身居中。
- 动画行：**必须**是 1x8 水平长条。
- **必须**使用 #00FF00 或纯白背景。
- **必须**保持角色在帧中心。
- **禁止**动态模糊或半透明特效。
- **每一行生成时必须携带参考图**，确保外观一致性。
