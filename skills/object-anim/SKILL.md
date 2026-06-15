---
name: object-anim
description: 将绿幕网格图处理为动态环境物体的循环精灵条带（火焰、流水、火把、粒子等），输出透明背景 WebP + 元数据 JSON。
---

# Object Anim Skill

将 AI 生成的绿幕网格图（N 帧动画）转换为可直接用于游戏引擎的水平精灵条带。适用于所有无需解剖一致性的循环环境动效。

---

## 自动化工具

- **初始化**: `npx tsx skills/object-anim/prepare.ts <ObjectName> [--fps=8] [--no-loop] [--frames=6] [--size=128]`
- **处理**: `npx tsx skills/object-anim/process.ts <ObjectName> <image_path>`
- **组装**: `npx tsx skills/object-anim/assemble.ts <ObjectName>`

---

## 技术规格

| 参数 | 默认值 | 说明 |
|------|--------|------|
| 帧尺寸 | 128×128 px | 正方形单帧 |
| 帧数 | 6 | 可调，决定输入网格布局 |
| 网格布局 | 2×3（6帧）/ 2×2（4帧）/ 2×4（8帧） | 由 frameCount 自动推导 |
| 输出格式 | 水平条带 WebP，透明背景 | `frameCount × 128` 宽 |
| 背景 | 纯绿色 `#00FF00` | 标准绿幕 |
| 网格分隔线 | 深绿色 `#006600` 细实线 | 禁止使用黑色 |

---

## 常用物体参数参考

| 物体 | frames | fps | loop | 网格 |
|------|--------|-----|------|------|
| fire（篝火） | 6 | 8 | 是 | 2×3 |
| torch（火把） | 4 | 10 | 是 | 2×2 |
| water_ripple（水波） | 6 | 6 | 是 | 2×3 |
| coin（金币旋转） | 6 | 12 | 是 | 2×3 |
| explosion（爆炸） | 8 | 12 | 否 | 2×4 |

---

## 图像生成提示词模板

> "Generate a {gridCols}×{gridRows} grid of {frameCount} sequential animation frames of [物体描述]. Separate frames with thin solid DARK GREEN grid lines (#006600). Object must be centered in each cell with wide green margin. #00FF00 background. No shadows, no glow overflow, no floor texture."

---

## 工作流

```
1. npx tsx skills/object-anim/prepare.ts fire --fps=8 --frames=6
2. [生成绿幕网格图，附带游戏场景参考图作为风格输入]
3. npx tsx skills/object-anim/process.ts fire path/to/grid.png
4. npx tsx skills/object-anim/assemble.ts fire
```

产物：`object_runs/fire/output/object.webp` + `object.json`
