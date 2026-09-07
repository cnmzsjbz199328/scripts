# 三招决胜 · 剩余角色动作素材交接单（供 Agent 执行）

创建日期：2026-09-06
关联主计划：`plans/three-moves-character-frame-image-plan.md`（§1.2 硬性原则、§4.1 原图审计清单、§7 审查门、§13.2 提示词模板、§13.3 执行循环、§13.7 绿边基线）

本文件是**自包含执行单**：路径、命令、提示词均可直接复制，无需回看对话记录。范围只有两名 roster 角色：

| 角色 | 状态 | 本单对应章节 |
|---|---|---|
| **Cliff（克里夫）** | 原图已审计通过，四动作待生成，可立即开工 | §2 |
| **Roxy（洛琪希）** | **基准图阻塞已解除**（新图：短魔杖 / 无魔法阵 / 无发光；四动作仍待生成） | §3 |

`Orsted` / `Hitogami` 两张 Joker 已由 `plans/three-moves-joker-playback-and-roxy-base-plan.md` 使用 video-sprite 轨接入结算区播放；它们仍不进入四动作角色管线。

---

## 0. 硬红线（违反即整张退回，不进切帧阶段）

1. **参考图只能用原始图**：未抠图、未裁切、未缩放、未经过 `char-sprite` / `video-sprite` 处理。透明 PNG、抠绿 PNG、精灵帧、图集、游戏媒体缩小图都不能当参考。
2. **四个动作只画物理动作**：角色身体 + 参考图里已有的武器/装备。**禁止**任何魔法阵、发光法球、法术光环、粒子、光轨、能量束、护盾光效、闪光、任意颜色的辉光。技能特效一律留给前端实现。
3. **网格规格**：3×3 九宫格 = 9 帧，从左到右、从上到下。纯绿 `#00FF00` 背景，深绿 `#006600` 细实线分隔，**无黑色分隔线、无投影、无背景、无镜头位移/缩放、无多余角色、无文字、无裁切肢体**。
4. **9 帧构图恒定**：同一镜头、画布、角色比例、朝向、脚底基线、光照。只有身体与武器姿态变化。帧 0 与帧 8 都回到稳定待机，可自然循环。
5. **失败上限**：同一动作连续 3 次仍不干净 → 暂停该动作，上报人工调整提示词或更换参考图。**不允许自行放宽"禁魔法"红线去将就通过。**
6. **可接受瑕疵（不退回，但要在交付记录里注明）**：1~3px 轻微绿色边缘残留。达到大面积挖空 / 断肢 / 明显可辨认色块 → 仍按 §7.1 退回。

---

## 1. 目录与产物流向（三段式，验收通过才逐段前移）

```
char_runs/ThreeMovesImagePilot/<C>/     ← 隔离目录：生成 + 处理 + 审查都在这里
  source/
    <C>_base.png            # 原始参考图只读副本
    attack_grid.png guard_grid.png ability_grid.png special_grid.png
  reference/frame_0.png     # process reference 产物（一致性门，不进图集）
  rows/{attack,guard,ability,special}/frame_0..8.png
  output/spritesheet.webp  output/char.json
  manifest.json

        │  该角色四动作全部通过 §7 审查后
        ▼
char_runs/ThreeMoves/<C>/               ← 正式归档（覆盖前保留旧素材清单/校验值）
  rows/*  output/*  source/*_grid.png  manifest.json

        │  同步
        ▼
game_runs/ThreeMoves/assets/media/characters/<C>_spritesheet.webp
game_runs/ThreeMoves/assets/media/characters/<C>_char.json
game_runs/ThreeMoves/assets/media/registry.js   ← 给该角色条目加 spritesheet / charJson，保留 base
```

`char-sprite` 命令签名（`skills/char-sprite/SKILL.md`）：

```bash
npx tsx skills/char-sprite/prepare.ts  <CharName> [--anims=a,b,c] [--fps=8]
npx tsx skills/char-sprite/process.ts  <CharName> <row_name|reference> <image_path>
npx tsx skills/char-sprite/assemble.ts <CharName>
```

固定输出：每帧 `192×208`，每行 9 帧，四行图集 `1728×832`，透明 WebP + `char.json`。`assemble.ts` 会顺带把条目写进全局 `char_runs/registry.js`（副作用，非游戏 registry，无需干预）。

---

## 2. Cliff（克里夫）—— 可直接开工

### 2.1 原始参考图（已审计通过）

| 项 | 值 |
|---|---|
| 路径 | `char_runs/ThreeMoves/Cliff/source/Cliff_base.png` |
| 规格 | 1086×1448 RGB，无 alpha |
| SHA-256 | `dc34cd11a5ec558998c89b3f9fe770d7096dae270f2da2eecb81f45681e55603` |
| 审计结论 | 纯绿 `#00FF00` 背景、全身正面居中、上下左右留白充足、无绿幕污染/黑边/孔洞、无任何特效 |
| 形象 | 棕发少年，白色立领学院制服（深红色前襟条 + 胸口校徽 + 黑色臂环与袖口），深灰长裤，深棕皮鞋。**徒手，无武器** |
| 游戏映射 | `registry.js` 已存在 `'克里夫' → 'Cliff'` 和 `Cliff: { base: ... }`；roster rank 5 |

> Cliff 徒手，所以 attack / ability / special 用**徒手版**动作标签（见下方各块已填好），不要给他加武器。

### 2.2 初始化 + 参考图一致性门

```bash
# 从仓库根目录执行
mkdir -p char_runs/ThreeMovesImagePilot/Cliff/source
cp char_runs/ThreeMoves/Cliff/source/Cliff_base.png char_runs/ThreeMovesImagePilot/Cliff/source/Cliff_base.png

npx tsx skills/char-sprite/prepare.ts "ThreeMovesImagePilot/Cliff" --anims=attack,guard,ability,special --fps=8
npx tsx skills/char-sprite/process.ts "ThreeMovesImagePilot/Cliff" reference "char_runs/ThreeMovesImagePilot/Cliff/source/Cliff_base.png"
```

### 2.3 四张 3×3 网格提示词（逐个动作各生成一张，整段直接贴给图像生成）

生成时**必须附带原始参考图** `char_runs/ThreeMovesImagePilot/Cliff/source/Cliff_base.png`；每次重试都用同一份原图，不拿上一次生成结果当参考。下载原始生成图，不在生成端预抠绿或裁单帧。

#### attack（黑桃 / 攻击·斩击）→ 存 `char_runs/ThreeMovesImagePilot/Cliff/source/attack_grid.png`

```text
Using the original unprocessed Cliff character reference, create one 3x3 sprite sheet
with 9 sequential full-body animation frames for a front-facing physical unarmed strike.
Read the frames left to right, top to bottom: idle start, anticipation, wind-up,
strike start, mid-strike, full extension / impact pose, follow-through, recovery, return to idle.

Keep the exact same character identity, outfit, hair, proportions, camera angle,
canvas framing, body scale, feet baseline, and lighting across all 9 cells.
The character stays centered in each cell; only the body pose changes.
Show the complete body with generous margins. Use a pure green background #00FF00.
Use thin solid dark green grid separators #006600 between the 3x3 cells.

This is a pure physical motion only: the fists and body movement itself,
with no magical or energy effects of any kind.
Do NOT render any magic circle, glowing orb, spell aura, particle effect, light trail,
energy beam, sparkle, or glow of any color around the character.
The character in his existing uniform must be the only rendered element besides the green background.

No shadows, no scenery, no camera movement, no zoom, no extra characters,
no text, no cropped limbs, no black grid lines, no transparency artifacts.
```

#### guard（红桃 / 守护·结界 → 物理化为格挡姿态）→ 存 `guard_grid.png`

```text
Using the original unprocessed Cliff character reference, create one 3x3 sprite sheet
with 9 sequential full-body animation frames for a front-facing physical defensive guard/block stance.
Read the frames left to right, top to bottom: idle start, alert stance, raise arms to guard,
brace, full block pose at peak tension, hold the block, release tension, lower guard, return to idle.

Keep the exact same character identity, outfit, hair, proportions, camera angle,
canvas framing, body scale, feet baseline, and lighting across all 9 cells.
The character stays centered in each cell; only the body pose changes.
Show the complete body with generous margins. Use a pure green background #00FF00.
Use thin solid dark green grid separators #006600 between the 3x3 cells.

This is a pure physical defensive motion only: the character bracing and blocking with
his own body and forearms, with no magical or energy effects of any kind.
Do NOT render any magic circle, barrier, glowing shield, spell aura, particle effect,
light trail, energy beam, sparkle, or glow of any color around the character.
The character in his existing uniform must be the only rendered element besides the green background.

No shadows, no scenery, no camera movement, no zoom, no extra characters,
no text, no cropped limbs, no black grid lines, no transparency artifacts.
```

#### ability（方块 / 能力·爆发 → 物理化为蓄力全力一击）→ 存 `ability_grid.png`

```text
Using the original unprocessed Cliff character reference, create one 3x3 sprite sheet
with 9 sequential full-body animation frames for a front-facing power exertion strike
at maximum physical force.
Read the frames left to right, top to bottom: idle start, crouch and gather stance,
build tension, coil back, explosive full-power release at peak, follow-through,
decelerate, recover, return to idle.

Keep the exact same character identity, outfit, hair, proportions, camera angle,
canvas framing, body scale, feet baseline, and lighting across all 9 cells.
The character stays centered in each cell; only the body pose changes.
Show the complete body with generous margins. Use a pure green background #00FF00.
Use thin solid dark green grid separators #006600 between the 3x3 cells.

This is a pure physical exertion motion only: maximum-effort physical strength shown
through body mechanics and muscle tension alone, with no magical or energy effects of any kind.
Do NOT render any magic circle, glowing aura, spell effect, particle effect, light trail,
energy beam, shockwave burst, sparkle, or glow of any color around the character.
The character in his existing uniform must be the only rendered element besides the green background.

No shadows, no scenery, no camera movement, no zoom, no extra characters,
no text, no cropped limbs, no black grid lines, no transparency artifacts.
```

#### special（梅花 / 特殊·奇袭 → 物理化为快速奇袭身法）→ 存 `special_grid.png`

```text
Using the original unprocessed Cliff character reference, create one 3x3 sprite sheet
with 9 sequential full-body animation frames for a front-facing quick unarmed
surprise-attack maneuver.
Read the frames left to right, top to bottom: idle start, shift weight, feint step,
dash start, mid-dash repositioning, surprise strike from an unexpected angle at peak,
recovery landing, stabilize, return to idle.

Keep the exact same character identity, outfit, hair, proportions, camera angle,
canvas framing, body scale, feet baseline, and lighting across all 9 cells.
The character stays centered in each cell; only the body pose changes.
Show the complete body with generous margins. Use a pure green background #00FF00.
Use thin solid dark green grid separators #006600 between the 3x3 cells.

This is a pure physical motion only: fast footwork and a surprise strike using the
character's own body, with no magical or energy effects of any kind.
Do NOT render any magic circle, glowing trail, spell aura, particle effect, speed-line
energy trail, energy beam, sparkle, or glow of any color around the character.
The character in his existing uniform must be the only rendered element besides the green background.

No shadows, no scenery, no camera movement, no zoom, no extra characters,
no text, no cropped limbs, no black grid lines, no transparency artifacts.
```

#### v3 统一锁（R 类重生成与 Roxy 必须追加）

```text
SIZE AND BASELINE LOCK — apply to all 9 cells equally:
Frame every cell so the standing character's head-to-heel height fills the SAME
fraction, about 72%, of the cell. Do NOT zoom in, punch in, crop closer, or enlarge
the character in the action cells — the action is shown by limb movement, not by the
camera moving closer.
The character's feet rest on the same horizontal ground line in every cell, about
88% down from the top of the cell. Keep at least one foot planted on that line in
every cell: no airborne poses, no jumping, no leaving the cell edges.

ANATOMY / EQUIPMENT LOCK:
Every hand, arm, foot and leg stays visibly connected to the body in every cell.
Never draw a detached, floating, or free-standing body part. No duplicated arms,
no fused or broken limbs, no extra fingers-only shapes.
Keep identical equipment across all 9 cells: <PERSISTENT_ITEM>.
The character and that equipment are the only rendered elements besides the pure
green background.

Frame 9 (bottom-right) returns to the same size and calm standing idle stance as
Frame 1 (top-left), arms lowered.
```

`<PERSISTENT_ITEM>`：徒手角色填 `no weapon or held object appears in any cell — the character stays bare-handed`；持械角色填 `the same staff / sword / spear as in the reference, same length and design in every cell`。R 类若出现断肢、装备跨帧变化、推近/缩小、腾空、魔法/发光/粒子或大面积绿/黑块，整张退回，不进切帧。

### 2.4 处理（每张网格图各一次，全部指向隔离目录）

```bash
npx tsx skills/char-sprite/process.ts "ThreeMovesImagePilot/Cliff" attack  "char_runs/ThreeMovesImagePilot/Cliff/source/attack_grid.png"
npx tsx skills/char-sprite/process.ts "ThreeMovesImagePilot/Cliff" guard   "char_runs/ThreeMovesImagePilot/Cliff/source/guard_grid.png"
npx tsx skills/char-sprite/process.ts "ThreeMovesImagePilot/Cliff" ability "char_runs/ThreeMovesImagePilot/Cliff/source/ability_grid.png"
npx tsx skills/char-sprite/process.ts "ThreeMovesImagePilot/Cliff" special "char_runs/ThreeMovesImagePilot/Cliff/source/special_grid.png"
npx tsx skills/char-sprite/assemble.ts "ThreeMovesImagePilot/Cliff"
```

### 2.5 验收清单

**自动（§7.1）**
- [ ] `rows/{attack,guard,ability,special}/frame_0..8.png` 各 9 张，共 36 张
- [ ] 每帧 `192×208`
- [ ] `output/spritesheet.webp` = `1728×832`
- [ ] `output/char.json` 的 `rows` = `["attack","guard","ability","special"]`，各 `frameCount:9`、`fps:8`
- [ ] `manifest.json` 四行 `status:"completed"`
- [ ] 透明区域真透明（非白/黑/残绿）；无异常小连通域、孤立背景块、网格线残留

**人工目检（§7.2 / §7.3 精简版，拼九宫格看）**
- [ ] 身份一致：发型、脸、白制服、深红前襟、臂环跨 36 帧不变形、不重复肢体、不长出武器
- [ ] 脚底基线稳定，身体中心不横移，无镜头缩放
- [ ] 攻击峰值帧无断肢/重复手臂/身体错乱
- [ ] 帧 0 ≈ 帧 8，可自然循环
- [ ] **无任何魔法 / 发光 / 粒子 / 法阵**
- [ ] 绿边记录：`无` / `1~3px 轻微（可接受）` / `超标（退回）`

任一"退回"项命中 → 重生成该动作。连续 3 次不干净 → 停下上报。

### 2.6 迁移正式目录（四动作全过后）

```bash
mkdir -p char_runs/ThreeMoves/Cliff/rows char_runs/ThreeMoves/Cliff/output char_runs/ThreeMoves/Cliff/source
cp -r char_runs/ThreeMovesImagePilot/Cliff/rows/.            char_runs/ThreeMoves/Cliff/rows/
cp    char_runs/ThreeMovesImagePilot/Cliff/source/*_grid.png char_runs/ThreeMoves/Cliff/source/
cp    char_runs/ThreeMovesImagePilot/Cliff/output/spritesheet.webp char_runs/ThreeMoves/Cliff/output/
cp    char_runs/ThreeMovesImagePilot/Cliff/output/char.json        char_runs/ThreeMoves/Cliff/output/
cp    char_runs/ThreeMovesImagePilot/Cliff/manifest.json           char_runs/ThreeMoves/Cliff/manifest.json
```

### 2.7 同步游戏媒体 + registry

```bash
cp char_runs/ThreeMoves/Cliff/output/spritesheet.webp game_runs/ThreeMoves/assets/media/characters/Cliff_spritesheet.webp
cp char_runs/ThreeMoves/Cliff/output/char.json        game_runs/ThreeMoves/assets/media/characters/Cliff_char.json
```

编辑 `game_runs/ThreeMoves/assets/media/registry.js`，把：

```js
    Cliff: { base: base + 'characters/Cliff_base.png' },
```

改成（与已接入的 11 人同格式，保留 `base` 回退）：

```js
    Cliff: { base: base + 'characters/Cliff_base.png', spritesheet: base + 'characters/Cliff_spritesheet.webp', charJson: base + 'characters/Cliff_char.json' },
```

提交（`*_char.json` 被 `.gitignore` 的 `game_runs/**/*.json` 忽略，必须 `-f`）：

```bash
git add game_runs/ThreeMoves/assets/media/characters/Cliff_spritesheet.webp game_runs/ThreeMoves/assets/media/registry.js char_runs/registry.js
git add -f game_runs/ThreeMoves/assets/media/characters/Cliff_char.json
git commit -m "$(cat <<'EOF'
feat(ThreeMoves): Cliff 四招式连续帧素材接入

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

### 2.8 回写记录

- 按主计划 **§12.1 格式**（原图路径+SHA-256、生成图路径+日期、提示词版本 §13.2 v2、`char-sprite` 命令、9 帧审查结论含绿边有无、产物路径、是否同步游戏目录）把 Cliff 追加到主计划 **§12**。
- 更新主计划 **§13.4** 进度表 Cliff 行：`待生成 → 已同步游戏目录`。

---

## 3. Roxy（洛琪希）—— 先解阻塞

### 3.1 基准图阻塞已解除；四动作仍待办

| 项 | 值 |
|---|---|
| 路径 | `char_runs/ThreeMoves/Roxy/source/Roxy_base.png` |
| 规格 | **1086×1448 RGB**，无 alpha；纯绿 `#00FF00` 不透明背景 |
| SHA-256 | `ED237919638C99E199D520771FD159BDD9B42718A502BF02108B7030C9787155` |
| 旧图备份 | `char_runs/ThreeMoves/Roxy/source/Roxy_base.polluted.png`，SHA-256 `D1905944377C498F3537B3D1C2EDF72F947DEB3C4B0A4A62D5644E68C5D9069B` |
| 审计结论 | 通过：短木杖、无高身法杖、无水法球/水滴/杖头龙形、无魔法阵、无发光、无投影；正面全身居中 |
| 形象 | 蓝发矮个法师，长双辫；黑色女巫帽（金色帽带）；棕褐色带兜帽斗篷；灰色叠层束腰 + 黑色交叉束带；黑短裙 + 黑打底裤；米白靴；持一根约前臂长的短木杖 |

工作区内没有更干净的替代原图（`reference/frame_0.png`、游戏媒体图都是更小的派生图，不能用）。

### 3.2 两条解法（择一，需用户拍板后再动手）

**解法 A（首选）**：用户 / 美术提供一张 Roxy 官方立绘或新绘制的干净原图——纯绿 `#00FF00` 背景、无水法球、无魔法阵、无发光、无透明底、全身正面居中留白、约 1086×1448、RGB。拿到后直接进 §3.4 审计。

**解法 B（已执行）**：由图像 Agent 以旧污染图为**外观锚点**重绘干净 base；新图已通过 §3.4 审计。该让步仅用于重建 base，**不得**用于四动作生成。

### 3.3 Roxy base 重绘提示词（解法 B 用；附旧污染图作外观锚点）

```text
Redraw this character (Roxy: short blue-haired petite mage with long braided twin-tails,
black witch hat with a gold band, brown hooded cloak, grey layered tunic with black
cross-straps, black skirt over black leggings, cream boots, holding a tall plain
white/silver staff) as a single clean front-facing full-body reference sprite.

REMOVE everything that is not the character herself and her plain staff:
no water orb, no water droplet, no dragon shape at the staff tip, no magic circle at
her feet, no glow, no aura, no particles, no light of any kind.
The staff tip must be plain and unlit.

Full body, standing neutral idle pose, centered with generous margins on all sides.
Pure flat green background #00FF00, fully opaque (no transparency).
No shadow, no scenery, no text, no border, no grid.
Portrait canvas roughly 1086x1448, character identity/outfit/proportions unchanged.
```

生成多张挑一张最干净的；下载为不透明 PNG。

### 3.4 新 base 审计（主计划 §4.1 清单）

- [x] 是原始未抠图版本，不是从透明帧反向导出
- [x] 发型 / 脸 / 帽子 / 斗篷 / 束腰 / 短木杖主色完整，人物完整未贴边（头顶、脚、左右手臂都不贴边）
- [x] 背景纯绿 `#00FF00` 不透明，人物边缘无绿幕污染 / 黑描边 / 半透明孔洞
- [x] **无水法球、无水滴、无杖头龙形、无脚下魔法阵、无任何发光**
- [x] 比例 / 朝向为正面站立待机
- [x] 尺寸 `1086×1448`，RGB 无 alpha

通过后落位（保留旧图作回滚）：

```bash
cp char_runs/ThreeMoves/Roxy/source/Roxy_base.png char_runs/ThreeMoves/Roxy/source/Roxy_base.polluted.png   # 备份旧污染图
cp <新的干净图> char_runs/ThreeMoves/Roxy/source/Roxy_base.png
sha256sum char_runs/ThreeMoves/Roxy/source/Roxy_base.png    # 记录新哈希，回写主计划 §13.1 表 Roxy 行 + §13.0 第 1 条标注"已解除"
```

### 3.5 四动作生成（与 Cliff §2.2–§2.8 完全同流程）

把所有 `Cliff` 换成 `Roxy`。差异只有一处：**Roxy 持法杖**，所以动作标签用持械版：

| 动作 | 首行 `physical <ACTION_LABEL>` | PHYSICAL-ONLY CLAUSE 里的元素表述 |
|---|---|---|
| attack | `physical staff swing attack` | `the staff and body movement itself` / `The character and her existing staff must be the only rendered elements` |
| guard | `physical defensive guard/block stance` | `bracing and blocking with her own body, staff, and arms` |
| ability | `power exertion strike at maximum physical force` | `maximum-effort physical strength through body mechanics and muscle tension alone`（挥杖发力，无法术） |
| special | `quick surprise-attack maneuver` | `fast footwork and a surprise strike using her own body and staff` |

其余（9-CELL SEQUENCE、构图约束、禁魔法清单、`No shadows...` 收尾行）与 §2.3 各块一致，只把主语改成 `she / her`、把 `unarmed strike` 换成 `staff swing attack` 等；并且必须追加上面的 **v3 统一锁**，持械项目填 `the same staff as in the reference, same length and design in every cell`。**禁魔法清单必须保留并强化**——Roxy 是法师，模型极易自动补法术光效，这是她最高风险点。生成后必须使用修复后的 `skills/char-sprite/process.ts`，验收走专项计划 §4 严格门。

命令模板（`prepare` 一次建四行）：

```bash
mkdir -p char_runs/ThreeMovesImagePilot/Roxy/source
cp char_runs/ThreeMoves/Roxy/source/Roxy_base.png char_runs/ThreeMovesImagePilot/Roxy/source/Roxy_base.png
npx tsx skills/char-sprite/prepare.ts "ThreeMovesImagePilot/Roxy" --anims=attack,guard,ability,special --fps=8
npx tsx skills/char-sprite/process.ts "ThreeMovesImagePilot/Roxy" reference "char_runs/ThreeMovesImagePilot/Roxy/source/Roxy_base.png"
# ...四张 *_grid.png 生成到 char_runs/ThreeMovesImagePilot/Roxy/source/ 后：
npx tsx skills/char-sprite/process.ts "ThreeMovesImagePilot/Roxy" attack  "char_runs/ThreeMovesImagePilot/Roxy/source/attack_grid.png"
npx tsx skills/char-sprite/process.ts "ThreeMovesImagePilot/Roxy" guard   "char_runs/ThreeMovesImagePilot/Roxy/source/guard_grid.png"
npx tsx skills/char-sprite/process.ts "ThreeMovesImagePilot/Roxy" ability "char_runs/ThreeMovesImagePilot/Roxy/source/ability_grid.png"
npx tsx skills/char-sprite/process.ts "ThreeMovesImagePilot/Roxy" special "char_runs/ThreeMovesImagePilot/Roxy/source/special_grid.png"
npx tsx skills/char-sprite/assemble.ts "ThreeMovesImagePilot/Roxy"
```

迁移 + 同步 + 提交 + 回写记录：套用 §2.6 / §2.7 / §2.8，`Cliff` → `Roxy`，commit 描述 `feat(ThreeMoves): Roxy 四招式连续帧素材接入`。

---

## 4. 全部完成后的收尾

- [ ] 主计划顶部状态行改为 `13/13 花色角色完成`（Roxy 四动作仍未完成）
- [ ] 主计划 §13.4 进度表 Cliff、Roxy 四格全部 `已同步游戏目录`（Roxy 四动作仍未完成）
- [ ] 主计划 §13.8 "剩余待办"清单清空 / 标记完成（Roxy 四动作仍待办）
- [x] 删除 `char_runs/ThreeMovesImagePilot/Rudeus/_review/`（主计划 §12.1 标注的旧失败版截图残留，会误导后续查阅）
- [ ] 确认 `game_runs/ThreeMoves/assets/media/registry.js` 13 名 roster 全部带 `spritesheet` / `charJson`，两张 Joker 维持仅 `base`

> 提醒：本批 Roxy 只完成干净 base；四动作素材与播放接入仍是**另一项工作**。Joker 结算区播放已由 `three-moves-joker-playback-and-roxy-base-plan.md` 完成。
