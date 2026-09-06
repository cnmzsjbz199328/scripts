# 三招决胜 · 连续帧素材专项修复计划（供 Agent 执行）

创建日期：2026-09-06
关联：主计划 `plans/three-moves-character-frame-image-plan.md`（§7 审查门、§12 交付记录、§13.2 提示词、§13.7 瑕疵基线）；交接单 `plans/three-moves-remaining-tasks-handoff.md`（Roxy 待办）

## 播放前提（已由用户确认，决定本轮修复范围）

四招式帧图在前端**一次性播放帧 1→8、不循环、不把帧 0 当站姿，播完切回静态 `base` 基准图**。

因此：
- **必须修**：会破坏单次 1→8 播放观感的硬缺陷 —— 断肢/悬空肢体、额外或变形武器、明显肢体错乱、大面积绿/黑色块残留、逐帧竖直方向的"跳动"。
- **本轮不作退回理由（记录为已知限制）**：帧 0 与帧 8 姿势/尺度不完全一致、动作帧之间的轻微缩放差。这些只在"循环播放 / 用帧 0 当 idle"时才致命，当前播放模式下可接受。若日后改为循环播放，需另起一轮全量重生成（提示词 v3 已为此预留 SIZE/BASELINE LOCK 段）。

范围：`char_runs/ThreeMovesImagePilot/` 下已完成的 **12 名角色**（Rudeus, Eris, ErisGreyrat, Ghislaine, Kishirika, Nanahoshi, Paul, Perugius, Ruijerd, Sylphiette, Zanoba, Cliff）× 4 动作。Roxy 不在本轮（仍阻塞待补原图），但其未来生成必须直接用本计划的 v3 提示词 + 修复后管线。

---

## 0. 已确认缺陷与严重度分级

独立复核（2026-09-06，逐帧目检 Cliff 全 4 动作 + 抽查 Rudeus）发现：

| 编号 | 缺陷 | 证据 | 分级 | 处理路径 |
|---|---|---|---|---|
| D1 | **断肢 / 悬空肢体**：`Cliff/special/frame_6` 脚边有一只五指张开、不连手臂的手掌，带黄绿污染 | 已同步进 `game_runs/.../Cliff_spritesheet.webp` 第 4 行第 7 格 | **必修（硬伤）** | 管线杂散连通域过滤（P2）；过滤不净则重生成该动作（P4） |
| D2 | **逐帧竖直跳动 / 脚底基线漂移**：帧内人物垂直位置随构图浮动，special 行还有腾空帧 | Cliff/Rudeus 全部 4 grid | **必修** | 管线脚底基线底对齐（P2），纯栅格位移、确定性、无需重生成 |
| D3 | **镜头级缩放**：grid 里帧 0 是"小人 + 大留白"，帧 1–8 推近；动作帧之间尺度不一 | Cliff/Rudeus 全部 4 grid | 部分修 | 管线底对齐后成品帧缩放差被压小；剩余轻微缩放差**按已知限制记录**，不重生成（除非 P1 审计判为"大幅畸变级"） |
| D4 | **装备跨行不一致**：Rudeus ability/special 行法杖时有时无 / 形变 | 抽查 Rudeus | **必修（若 P1 审计确认）** | 重生成该动作（P4），v3 提示词加 EQUIPMENT LOCK |
| D5 | **帧 0 ≠ 帧 8，无法循环**：4 行帧 8 都停在动作中段 | Cliff/Rudeus 全部 4 行 | 本轮不修 | 记录为已知限制；约束前端"1→8 一次性、不循环" |
| D6 | **`char.json` 的 `name` 字段仍是 `ThreeMovesImagePilot/Cliff`**（formal 与游戏媒体都没改）| `game_runs/.../Cliff_char.json` | 轻 | P5：formal 目录重跑 `assemble.ts`，或在同步脚本里改名 |
| D7 | **§12.2 / §12.3 留档不实**：Cliff §12.3 写"目检通过…无断肢…脚底基线稳定"与 D1/D2 冲突；§12.2 11 人只有一行汇总、无逐动作绿边记录 | 主计划 §12 | 轻 | P5：按实情重写 §12 记录 |
| D8 | `char_runs/ThreeMovesImagePilot/Rudeus/_review/` 旧失败版截图未清（主计划 §12.1 已标注） | 该目录 3 个 png | 轻 | P5：删除 |

**D1/D2/D4 是全 12 人潜在共性**，不是 Cliff 独有 —— 只抽查了 2 人，必须先做 P1 全量审计定清单。

---

## 1. 执行阶段

### P1 — 全量逐帧审计（先做，产出缺陷清单，不改任何文件）

对 12 名角色 × 4 动作 = 48 张 grid / 432 帧，跑审计脚本 + 人工看接触表。

**1a. 自动审计脚本**（新建 `skills/char-sprite/audit.ts`，只读、输出报告）——对每个 `char_runs/ThreeMoves/<C>/rows/<action>/frame_*.png`：

- **杂散连通域**：抠像后做连通域分析，报告"最大连通域占不透明像素比例"。`< 95%` → 标 `STRAY`（D1 疑似）。
- **脚底基线**：每帧最低不透明行 `y`；报告一行 9 帧的极差。`> 12px` → 标 `BASELINE`（D2）。
- **缩放差**：每帧不透明外接框 `高 / 宽`；报告一行 9 帧 `max(高)/min(高)`。`> 1.45` → 标 `SCALE`（D3，仅供参考，不一定退回）。
- **绿残留**：每帧 `G>90 且 G>R*1.25 且 G>B*1.25` 的不透明像素占比。`> 0.3%` → 标 `GREEN`。
- **空帧 / 尺寸**：非 192×208、或不透明像素 `< 2%` → 标 `BROKEN`。

输出一张表：`角色 | 动作 | 帧 | 标记`，并按"每动作命中标记数"排序。

**1b. 接触表人工目检**：把 48 张 grid 缩略拼成接触表（或直接逐张看 `source/<action>_grid.png`），逐动作判：

- 有无断肢 / 悬空手脚 / 重复肢体 / 肢体融合（D1）
- 有无额外武器、武器跨帧形变或时有时无（D4）
- 有无可辨认的魔法 / 发光 / 粒子 / 法阵（红线）
- 人物是否明显换脸 / 变形 / 换装
- `SCALE` 命中的动作：缩放差是"轻微"还是"帧 0 像被塞进小框、动作帧像贴脸"的畸变级

**1c. 产出**：在本文件末尾追加 `## 附录 A：P1 审计结果`，列出：

- **R 类（必重生成）**：命中 D1（管线过滤预计不净）、D4、魔法元素、畸变级 D3、BROKEN 的动作。
- **N 类（仅走管线修复）**：只命中 D2 / 轻微 D3 / 可过滤的 D1 / 轻微 GREEN 的动作。
- 12 人 × 4 动作每格都要有 R / N 判定，不留空。

> 暂停点：若 R 类 > 15 个动作，先上报 —— 可能提示词 v2 本身对某类角色（法师/持长械）系统性不适用，需要人工调 v3 再批量，而不是硬重生成。

### P2 — 管线修复（`skills/char-sprite/process.ts`）

按 §3 规格改 `process.ts` 的 slot 路径，加两步：**杂散连通域过滤** + **脚底基线底对齐**。改完：

1. 自检：挑 `Cliff/special/attack_grid.png` 跑 `process.ts`，确认 `frame_6` 的悬空手掌被过滤掉、9 帧最低不透明行极差 `< 6px`。
2. 挑 1 个 N 类角色跑完整 `process → assemble`，肉眼比对新旧图集：人物没被裁脚、没左右跑偏、动作没变糊。
3. `git commit`：`fix(char-sprite): slot 切帧加杂散连通域过滤 + 脚底基线底对齐`（含 `audit.ts`）。

### P3 — 全 12 人重跑管线（不重生成）

对 12 名角色（用**现有** `char_runs/ThreeMovesImagePilot/<C>/source/*_grid.png`，不动生成图）：

```
对每个 <C>：
  npx tsx skills/char-sprite/process.ts "ThreeMovesImagePilot/<C>" attack  "char_runs/ThreeMovesImagePilot/<C>/source/attack_grid.png"
  npx tsx skills/char-sprite/process.ts "ThreeMovesImagePilot/<C>" guard   "char_runs/ThreeMovesImagePilot/<C>/source/guard_grid.png"
  npx tsx skills/char-sprite/process.ts "ThreeMovesImagePilot/<C>" ability "char_runs/ThreeMovesImagePilot/<C>/source/ability_grid.png"
  npx tsx skills/char-sprite/process.ts "ThreeMovesImagePilot/<C>" special "char_runs/ThreeMovesImagePilot/<C>/source/special_grid.png"
  npx tsx skills/char-sprite/assemble.ts "ThreeMovesImagePilot/<C>"
```

- 每人跑完按 §4 验收门（放宽版）过一遍；N 类问题应已消除。
- 仍命中 D1（过滤不净）的动作，追加进 P1 的 R 类清单。
- 迁移正式目录 + 同步游戏媒体（§5 命令），**覆盖前记录旧图集 SHA-256**（§10.2 回滚）。

### P4 — 定点重生成（只做 R 类动作）

对 P1 附录 A 的每个 R 类 `<C> × <action>`：

1. 用该角色**原始参考图** + §2 提示词 v3 对应动作，重新生成一张 3×3 grid。
   - 存 `char_runs/ThreeMovesImagePilot/<C>/source/<action>_grid.png`（**覆盖前把旧的改名 `<action>_grid.v2.png` 留档**）。
   - 徒手角色（Cliff / Kishirika / Nanahoshi / Zanoba 等，以参考图为准）用徒手动作标签；持械角色保持同一件武器。
2. `process.ts <action>` → `assemble.ts`。
3. 按 §4 验收门（**严格版**，R 类不吃 §13.7 豁免）逐帧看。
4. 同一动作重生成 3 次仍命中 R 类 → 暂停，上报人工。
5. 全部 R 类过了 → 迁移正式目录 + 同步游戏媒体。

### P5 — 收尾与留档

- **D6**：对 12 名角色在 formal 目录补跑一次 `assemble.ts "ThreeMoves/<C>"`（或在同步步骤里把 `char.json` 的 `"name"` 从 `ThreeMovesImagePilot/<C>` 改成 `ThreeMoves/<C>`），使 formal 与游戏媒体的 `char.json` 一致。以后同步流程固定"formal 目录重跑 assemble，再 cp 到游戏媒体"，不要 pilot 直接 cp。
- **D8**：`rm -r char_runs/ThreeMovesImagePilot/Rudeus/_review/`。
- **D7 / 记录**：
  - 重写主计划 **§12.3**：如实列出 D1/D2 复核结论、本轮修复动作、每动作"是否重生成 / 绿边有无 / 已知限制（帧 0≠帧 8）"。
  - 主计划 **§12.2** 每个角色补一行"绿边：无 / 轻微 / 已修"，并注明"缩放/循环限制见本修复计划"。
  - 主计划 **§13.7** 补一句："帧 0≠帧 8、动作帧间轻微缩放差属当前 1→8 单次播放模式下的已知限制；改循环播放需全量重生成。"
  - 主计划 **§13.8** 把"专项修复"标记为已完成，附本文件路径。
- **提交**：P3 与 P4 的产物分别 commit（`fix(ThreeMoves): 12 名角色连续帧管线修复重跑` / `fix(ThreeMoves): <R类角色> 动作定点重生成`）；`*_char.json` 仍需 `git add -f`。

### P6 — 前推到 Roxy

- 把 §2 提示词 v3 覆盖进交接单 `plans/three-moves-remaining-tasks-handoff.md` 的 §2.3 / §3.5（替换 v2 措辞）。
- 交接单加一句：Roxy 生成必须用修复后的 `process.ts`（P2 之后），验收走本文件 §4。

---

## 2. 提示词 v3（在 §13.2 v2 基础上加锁；R 类重生成 + Roxy 都用）

保留 §13.2 v2 的通用结构、9-CELL SEQUENCE、`<PHYSICAL-ONLY CLAUSE>`、`No shadows...` 收尾行不变，**新增/替换以下三段**：

**① 在 "Keep the exact same character identity..." 那段之后，加 SIZE / BASELINE LOCK：**

```text
SIZE AND BASELINE LOCK — apply to all 9 cells equally:
Frame every cell so the standing character's head-to-heel height fills the SAME
fraction, about 72%, of the cell. Do NOT zoom in, punch in, crop closer, or enlarge
the character in the action cells — the action is shown by limb movement, not by the
camera moving closer.
The character's feet rest on the same horizontal ground line in every cell, about
88% down from the top of the cell. Keep at least one foot planted on that line in
every cell: no airborne poses, no jumping, no leaving the cell edges.
```

**② 把 `<PHYSICAL-ONLY CLAUSE>` 里"The character ... must be the only rendered elements"那句，扩成 ANATOMY / EQUIPMENT LOCK：**

```text
Every hand, arm, foot and leg stays visibly connected to the body in every cell.
Never draw a detached, floating, or free-standing body part. No duplicated arms,
no fused or broken limbs, no extra fingers-only shapes.
Keep identical equipment across all 9 cells: <PERSISTENT_ITEM>.
The character and that equipment are the only rendered elements besides the pure
green background.
```

- 持械角色 `<PERSISTENT_ITEM>`：`the same <staff / longsword / spear / ...> as in the reference, same length and design in every cell`
- 徒手角色 `<PERSISTENT_ITEM>`：`no weapon or held object appears in any cell — the character stays bare-handed`

**③ 收尾前加 CLOSING FRAME（即便不循环，也让 1→8 收得干净）：**

```text
Frame 9 (bottom-right) returns to the same size and calm standing idle stance as
Frame 1 (top-left), arms lowered.
```

**退回判据（R 类严格版）**：出现断肢/悬空肢体、额外或变形武器、任一 cell 明显推近/缩小、腾空、可辨认魔法/发光/粒子、大面积绿或黑色块 → 整张退回，不进切帧。

---

## 3. 管线修复规格（`skills/char-sprite/process.ts`）

**现状**：`renderSlotAsFrame` → `fitCropToCell(slotBuf, w, h, useTrim=false)`：整个 1/9 cell（去 padding）→ `resize(fit:'inside', withoutEnlargement:true)` 到 182×198 → `composite(gravity:'center')` 进 192×208。所以缩放跟的是"cell 里人物占多大"，竖直位置跟的是"人物在 cell 里的高低" —— D2/D3 的根因。

**改动（只影响 slot 路径，不动 `renderGroupAsFrame` / 单行 reference 逻辑）**：

1. **新增 `keepMainSilhouette(buf, w, h)`**：
   - 对 slot 原始 buffer 跑 `findComponents`。
   - 保留：最大连通域；以及 `area ≥ 最大的 8%` **且** 外接框与最大连通域外接框间距 `≤ 12px`（视为肢体因抠像被切开的一部分）的连通域。
   - 其余连通域（含孤立的手/脚/色块）alpha 清零。
   - 若清掉的面积 `> 保留面积的 3%`：`console.warn` 打出 `<char>/<row>/<frame> STRAY-REMOVED <n>px`，并在该行 manifest 里写 `review: "stray-removed"`，供人工复看。

2. **`renderSlotAsFrame` 里**，`slotBuf` 填好后、调 `fitCropToCell` 前：调 `keepMainSilhouette(slotBuf, w, h)`。

3. **`fitCropToCell` 新增 `bottomAlign` 参数**（slot 路径传 `true`，group 路径保持原 `gravity:'center'`）：
   - `useTrim` 对 slot 也置 `true`（拿到人物真实外接框；杂散域已先清掉，`trim()` 安全）。
   - `bottomAlign` 时，最后一步 `composite` 不用 `gravity:'center'`，改用显式偏移：
     - `top = FRAME_HEIGHT - CELL_PADDING - resizedH`（底边距帧底 5px，全帧统一 → 脚底基线锁定）
     - `left = Math.round((FRAME_WIDTH - resizedW) / 2)`（按人物外接框水平居中，消除左右漂移）
   - `resizedW/H` 取 `resize` 后实际尺寸（`sharp(...).metadata()` 或 resize 的返回 info）。

4. **不做**逐帧缩放归一化（会把合理的大幅前冲/下蹲压小）。缩放差留给提示词 v3 的 SIZE LOCK 在生成端控制；本轮残留按 D3 已知限制处理。

**验证**：
- `Cliff/special` 重跑后 `frame_6` 无悬空手掌；`audit.ts` 对 12 人所有行 `BASELINE` 极差 `< 6px`。
- 随机抽 3 人肉眼比对新旧图集：无裁脚、无左右跑偏、动作辨识度不降。

---

## 4. 验收门

### 自动（`audit.ts` + assemble 校验）——所有角色所有动作都要过

- [ ] 每动作 9 帧，每帧 192×208，图集 1728×832，`char.json` rows 序 `attack/guard/ability/special`、各 `frameCount:9`
- [ ] `manifest.json` 四行 `status:"completed"`
- [ ] 每帧最大连通域占不透明像素 **≥ 98%**（P2 过滤后）
- [ ] 每行 9 帧最低不透明行极差 **< 6px**（P2 底对齐后）
- [ ] 每帧绿残留 **< 0.3%** 不透明像素
- [ ] `char.json` `"name"` == `ThreeMoves/<C>`（D6）

### 人工目检（逐动作，结论写进 §12 记录）

- [ ] 身份一致：脸 / 发色 / 服装 / 武器跨 9 帧不换
- [ ] **无断肢、无悬空/游离肢体、无重复或融合肢体**
- [ ] **无额外武器；持械角色武器同一件、同尺寸、每帧都在；徒手角色每帧都徒手**
- [ ] 无可辨认魔法 / 发光 / 粒子 / 法阵
- [ ] 单次播放帧 1→8 观感连贯，人物不"竖直跳动"、不左右漂
- [ ] 绿边：记 `无` / `1~3px 轻微`（可接受）

### 分级

- **R 类动作**：上面每一项都要过，**不吃 §13.7 轻微瑕疵豁免**。
- **N 类动作**：断肢/悬空肢体/额外武器/魔法/大色块 → 仍退回；帧 0≠帧 8、轻微缩放差、1~3px 绿边 → 放行并记录。
- **一律不作退回理由（本轮已知限制，写入 §12 + §13.7）**：帧 0 与帧 8 姿势不接、动作帧之间的轻微缩放差异。

---

## 5. 命令速查

```bash
# P1 审计（全 12 人）
npx tsx skills/char-sprite/audit.ts "ThreeMoves"           # 遍历 char_runs/ThreeMoves/<C>/rows/*，输出标记表

# P3 / P4 单角色重跑（<C> 换角色名，<action> 换动作）
npx tsx skills/char-sprite/process.ts  "ThreeMovesImagePilot/<C>" <action> "char_runs/ThreeMovesImagePilot/<C>/source/<action>_grid.png"
npx tsx skills/char-sprite/assemble.ts "ThreeMovesImagePilot/<C>"

# 迁移正式目录（覆盖前先 sha256sum 旧 output/spritesheet.webp 存档）
cp -r char_runs/ThreeMovesImagePilot/<C>/rows/.            char_runs/ThreeMoves/<C>/rows/
cp    char_runs/ThreeMovesImagePilot/<C>/source/*_grid.png char_runs/ThreeMoves/<C>/source/
cp    char_runs/ThreeMovesImagePilot/<C>/output/*          char_runs/ThreeMoves/<C>/output/
cp    char_runs/ThreeMovesImagePilot/<C>/manifest.json     char_runs/ThreeMoves/<C>/manifest.json
npx tsx skills/char-sprite/assemble.ts "ThreeMoves/<C>"    # D6：在 formal 目录重跑，修正 char.json name

# 同步游戏媒体
cp char_runs/ThreeMoves/<C>/output/spritesheet.webp game_runs/ThreeMoves/assets/media/characters/<C>_spritesheet.webp
cp char_runs/ThreeMoves/<C>/output/char.json        game_runs/ThreeMoves/assets/media/characters/<C>_char.json

# 提交（char.json 被 .gitignore 挡，需 -f）
git add game_runs/ThreeMoves/assets/media/characters/*_spritesheet.webp char_runs/registry.js
git add -f game_runs/ThreeMoves/assets/media/characters/*_char.json
git commit -m "fix(ThreeMoves): ..."
```

registry.js 无需改（12 人条目已带 `spritesheet` / `charJson` 路径，文件名不变）。

---

## 6. 暂停点（命中即停，上报人工）

- P1 审计 R 类 > 15 个动作（疑提示词系统性不适用某类角色）。
- P2 管线改动后，N 类角色重跑出现裁脚 / 人物跑偏 / 动作糊。
- P4 同一动作重生成 3 次仍命中 R 类。
- 任一角色原始参考图在重生成时反复出问题 → 回主计划 §4.1 重审该角色原图，而不是默认原图没问题。
- 发现魔法/发光/粒子（红线）—— 不自行放宽，整张退回并上报。

---

## 7. 完成标准

- [ ] `audit.ts` 对 12 名角色全部动作：连通域 ≥ 98%、基线极差 < 6px、绿残留 < 0.3%、尺寸/帧数齐
- [ ] P1 附录 A 的 R 类动作全部重生成并通过严格验收门
- [ ] 12 名角色 formal 目录与游戏媒体 `char.json` 的 `name` == `ThreeMoves/<C>`
- [ ] 主计划 §12.2 / §12.3 / §13.7 / §13.8 已按实情更新
- [ ] `char_runs/ThreeMovesImagePilot/Rudeus/_review/` 已删
- [ ] 交接单 Roxy 段已换 v3 提示词 + 指向修复后管线
- [ ] P2 / P3 / P4 产物均已提交

---

## 附录 A：P1 审计结果

审计脚本：`npx tsx skills/char-sprite/audit.ts ThreeMoves`。

- 范围：12 人 × 4 动作 × 9 帧 = 48 张 grid / 432 帧；仅纳入四行齐全的正式角色，base-only 的 Roxy、Hitogami、Orsted 不在本轮范围。
- 旧图集自动审计：所有目标帧尺寸均为 192×208；自动连通域只有 `Kishirika/special` 出现 STRAY 候选；基线极差超过 12px 的动作集中在 Paul、Ruijerd、Zanoba 等动作；GREEN / SCALE 以候选标记记录，不单独触发重生成。
- 接触表目检：`Cliff/special/frame_6` 确认存在悬空/断裂手掌风险；`Rudeus/guard` 确认武器跨帧出现/消失且形态不一致。未发现其他动作达到断肢、额外魔法/发光或大面积污染的 R 类门槛。
- R 类总数：2（未超过暂停阈值 15）；N 类：46。P2 后若任一 N 类出现裁脚、左右跑偏、动作糊，转入 R 类复核。

| 角色 | R 类动作 | N 类动作 | 自动候选标记（旧图集） |
|---|---|---|---|
| Cliff | `special` | `attack`, `guard`, `ability` | 四行 GREEN/SCALE；`special` 接触表 R |
| Eris | — | `attack`, `guard`, `ability`, `special` | 四行 GREEN/SCALE |
| ErisGreyrat | — | `attack`, `guard`, `ability`, `special` | 四行 GREEN/SCALE |
| Ghislaine | — | `attack`, `guard`, `ability`, `special` | 四行 GREEN/SCALE |
| Kishirika | — | `attack`, `guard`, `ability`, `special` | `special` 另有 STRAY 候选，P2 过滤后复核 |
| Nanahoshi | — | `attack`, `guard`, `ability`, `special` | 四行 GREEN/SCALE |
| Paul | — | `attack`, `guard`, `ability`, `special` | `ability`/`special` BASELINE；其余轻微 SCALE |
| Perugius | — | `attack`, `guard`, `ability`, `special` | 轻微 GREEN/SCALE |
| Rudeus | `guard` | `attack`, `ability`, `special` | 四行 GREEN/SCALE；`guard` 接触表 R |
| Ruijerd | — | `attack`, `guard`, `ability`, `special` | 三行动作 BASELINE/GREEN/SCALE |
| Sylphiette | — | `attack`, `guard`, `ability`, `special` | 轻微 GREEN/SCALE |
| Zanoba | — | `attack`, `guard`, `ability`, `special` | `attack`/`ability`/`special` BASELINE |

P1 结论：进入 P2；R 类只对 Cliff/special 与 Rudeus/guard 执行提示词 v3 定点重生成，其他动作先走确定性管线修复。
