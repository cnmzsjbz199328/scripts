---
name: char-sprite
description: 将绿幕网格图处理为游戏角色精灵图集，动画行由用户自定义，每行固定 9 帧（3×3 网格），输出透明背景 WebP + 元数据 JSON。适用于任意游戏类型的可控角色。
---

# Char Sprite Skill

将 AI 生成的绿幕网格图（每行 9 帧）转换为可直接用于游戏引擎的角色精灵图集。动画行名称由用户在 prepare 阶段自定义，不受固定预设限制。

与 `hatch-pet` 的区别：`hatch-pet` 面向固定 6 行宠物生命周期；本 skill 面向任意游戏角色，动画行完全由游戏设计决定。

---

## 自动化工具

```bash
npx tsx skills/char-sprite/prepare.ts <CharName> [--anims=anim1,anim2,...] [--fps=8]
npx tsx skills/char-sprite/process.ts  <CharName> <row_name|reference> <image_path>
npx tsx skills/char-sprite/assemble.ts <CharName>
```

---

## 技术规格

| 参数 | 值 | 说明 |
|------|-----|------|
| 帧尺寸 | 192×208 px | 与 hatch-pet 一致，便于引擎统一处理 |
| 每行帧数 | **固定 9 帧** | 输入必须是 3×3 网格图 |
| 动画行数 | 任意 | prepare 时通过 `--anims` 指定 |
| 输出格式 | 水平图集 WebP，透明背景 | `9 × 192` 宽 × `行数 × 208` 高 |
| 背景 | 纯绿色 `#00FF00` | 标准绿幕 |
| 网格分隔线 | 深绿色 `#006600` 细实线 | 禁止使用黑色 |

---

## 各游戏类型动画行参考

| 游戏类型 | 推荐动画行 |
|----------|-----------|
| 俯视 RPG（农场/冒险） | `walk-down, walk-up, walk-left, tool-use, sleeping` |
| 横版平台 | `idle, run, jump, attack, hurt, death` |
| 俯视 Action | `idle, walk, dash, attack, block, death` |
| 格斗 | `idle, walk-forward, walk-back, attack-light, attack-heavy, block, knockback, victory` |

fps / loop 在生成的 `manifest.json` 中可逐行调整（默认 fps=8, loop=true）。

### 引擎翻转优化：省略对称方向行

对于左右对称的动作（walk / run / dash），只需生成 `walk-left`，在 Phaser.js 中用 `setFlipX(true)` 动态呈现向右行走，可节省一行 AI 生成成本和图集体积。

```js
// game-logic.js 示例
if (cursors.left.isDown)  { player.setFlipX(false); player.play('walk-left', true); }
if (cursors.right.isDown) { player.setFlipX(true);  player.play('walk-left', true); }
```

**适合翻转复用的行**：`walk-left/right`、`run-left/right`、`dash-left/right`、`attack-left/right`

**不适合翻转复用的行**：`walk-down/up`（俯视方向不对称）、`tool-use`（动作有方向性）、格斗游戏的 `walk-forward/back`（左右含义不同）

---

## 图像生成提示词模板

**角色参考图**（外观锚点，附带全景图）：
> "Using this panorama as style reference, generate a single sprite of [角色描述], front-facing pose, full body, centered. {STYLE}. #00FF00 background. No shadows. Wide margin."

**逐行动画**（同时附带全景图 + 角色参考图）：
> "Using the panorama and character reference, generate a 3×3 grid of 9 sequential frames showing [动作描述]. {STYLE}. Separate frames with thin solid DARK GREEN lines (#006600). Character centered in each cell, wide margin. #00FF00 background. No shadows."

---

## 完整工作流示例（俯视 RPG 农夫）

```bash
# 1. 初始化（walk-right 由引擎翻转 walk-left 实现，无需单独生成）
npx tsx skills/char-sprite/prepare.ts Farmer \
  --anims="walk-down,walk-up,walk-left,tool-use,sleeping" \
  --fps=8

# 2. 处理参考图
npx tsx skills/char-sprite/process.ts Farmer reference path/to/farmer_ref.png

# 3. 逐行处理（每行对应一张 3×3 网格图）
npx tsx skills/char-sprite/process.ts Farmer walk-down  path/to/walk_down.png
npx tsx skills/char-sprite/process.ts Farmer walk-up    path/to/walk_up.png
npx tsx skills/char-sprite/process.ts Farmer walk-left  path/to/walk_left.png
npx tsx skills/char-sprite/process.ts Farmer tool-use   path/to/tool_use.png
npx tsx skills/char-sprite/process.ts Farmer sleeping   path/to/sleeping.png

# 4. 组装图集
npx tsx skills/char-sprite/assemble.ts Farmer
```

产物：
```
char_runs/Farmer/
  output/
    spritesheet.webp   ← 9×192 宽 × 5×208 高
    char.json          ← 包含各动画行的 row/frameCount/fps/loop
```

---

## manifest.json 示例（自定义 fps / loop）

prepare 后可手动编辑 `char_runs/<CharName>/manifest.json` 调整每行参数：

```json
{
  "rows": {
    "walk-down":  { "fps": 8,  "loop": true,  "status": "pending" },
    "walk-up":    { "fps": 8,  "loop": true,  "status": "pending" },
    "tool-use":   { "fps": 10, "loop": false, "status": "pending" },
    "sleeping":   { "fps": 4,  "loop": true,  "status": "pending" }
  }
}
```
