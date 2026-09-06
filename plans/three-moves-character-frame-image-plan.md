# 三招决胜：连续帧图片角色动作迁移计划

状态：批量执行阶段已完成 11/13 花色角色 × 4 动作并增量同步游戏媒体目录；**Cliff 四动作待生成**（原图已于 2026-09-06 补审通过，此前从 §13 清单漏列）；Roxy 因参考图含魔法阵/水法球/透明底仍阻塞待补干净原图；绿边统一整改已完成。剩余两名角色（Cliff、Roxy）的自包含执行单见 `plans/three-moves-remaining-tasks-handoff.md`

更新日期：2026-09-06

适用范围：`game_runs/ThreeMoves/` 的角色基础图与四类动作素材

本计划取代“独立视频生成 + 分段 + Extend + video-sprite”的角色动作生产路线。它只负责素材生产、处理、审查和交接，不修改游戏玩法代码。

## 1. 已确认的需求与决策

### 1.1 用户目标

当前目标不是继续修复已有视频，而是改用连续帧图片生成一套动作：

```text
可靠的原始角色基准图
    -> 一次生成一张 3×3、9 帧连续动作图
    -> char-sprite 抠绿、切帧、装配
    -> 逐帧审查对齐和边缘
    -> 通过后接入游戏
```

这样做的目的有三点：

1. 用一张连续帧图表达完整动作，减少独立视频之间的人物漂移。
2. 通过固定的 9 帧顺序直接掌握动作时间节点。
3. 将抠绿、切帧和最终透明化集中到统一流水线，避免处理结果反过来污染生成参考。

### 1.2 新的硬性原则

- 生成参考只能使用未抠图、未裁切、未缩放、未经过 `char-sprite` 或 `video-sprite` 的原始角色图。
- 透明 PNG、抠绿 PNG、精灵帧、图集和游戏部署图都属于派生结果，不能作为 AI 角色参考。
- 每个动作使用一张 3×3 网格图，按从左到右、从上到下排列 9 个连续帧。
- 9 个单元格必须使用相同的镜头、画布、角色比例、人物朝向和构图规则。
- 人物脚底、身体主轴和画面中心要保持稳定；动作造成的肢体伸展可以变化，但不能产生镜头级横移或缩放。
- 背景统一为纯绿 `#00FF00`，网格线使用深绿 `#006600`，不使用黑色分隔线，不添加投影。
- 只有生成完成后才执行抠绿和切帧。透明输出不得回灌到后续生成。
- 先做鲁迪的单个动作试验，试验通过后再扩展四个动作，最后再批量处理其他角色。
- **四个动作（attack/guard/ability/special）的帧图只画角色身体与武器/法杖的物理动作，不画任何魔法/能量/粒子/发光视觉效果。** 原因：绿幕抠像无法区分"背景绿"和"效果绿"，AI 也无法在 9 帧间稳定复现特效的形状/颜色/透明度；鲁迪 attack 试验已实测出效果被抠像腐蚀（见 §12 首轮交付记录）。技能特效一律留给前端实现（如粒子系统/Tween/滤镜），与角色帧图解耦，可复用、可调色、不依赖生成结果。

## 2. 对旧方案和旧信息的清理

这里的“清理”首先是清理生产语义和使用边界，不是立即删除文件。现有文件可能仍需用于对比、追溯或回滚，因此默认保留。

### 2.1 旧视频路线降级为归档对照物

以下内容不再作为新动作素材的生产来源，也不再作为质量合格的基准：

- `video_runs/ThreeMoves/source/` 下鲁迪的 Veo/Flow 视频。
- `video_runs/ThreeMoves/other_characters/` 下其他角色的视频。
- `video_runs/ThreeMovesOther/` 下由旧视频拆出的动画结果。
- Flow 中使用 Extend 连接动作片段的实验结果。
- 旧视频的 `manifest.json` 中标记为 completed 的结果。

保留原因：这些文件可用于确认“人物偏移为何不可接受”、比较新旧路线，或在用户明确要求时恢复旧版本。它们不应直接复制到 `game_runs/ThreeMoves/assets/media/` 作为新的最终动作资源。

### 2.2 旧基准图的分类

目前鲁迪相关文件已按以下方式分类：

| 文件 | 分类 | 新方案是否可作生成参考 |
|---|---|---:|
| `char_runs/ThreeMoves/Rudeus/source/Rudeus_base.png` | 原始候选源，1086×1448，RGB，无透明通道 | 可以，先做视觉确认 |
| `char_runs/ThreeMoves/Rudeus/reference/frame_0.png` | `char-sprite` 处理后的 192×208 RGBA 帧 | 不可以 |
| `game_runs/ThreeMoves/assets/media/characters/Rudeus_base.png` | 与上一个文件相同的部署派生图 | 不可以 |
| `char_runs/ThreeMoves/Rudeus/output/` | 精灵图及元数据输出目录 | 不可以 |

旧的 `reference/frame_0.png` 与游戏目录中的 `Rudeus_base.png` 已确认是同一个派生文件。它们可能已经适合游戏显示，但不适合作为 AI 参考；边缘的抗锯齿、绿幕残留或透明化痕迹可能被模型重新生成。

### 2.3 Git 和工作区清理边界

当前工作区存在用户已有修改和未跟踪素材，包括：

- `game_runs/ThreeMoves/index.html`、`game_runs/ThreeMoves/game/styles.css` 的已有修改。
- `game_runs/ThreeMoves/assets/media/` 下已有角色和 Joker 资源。
- `video_runs/ThreeMoves/`、`video_runs/ThreeMovesOther/` 以及其他视频产物。

执行本计划时：

- 不执行 `git reset`、`git checkout`、递归删除或批量覆盖。
- 不删除旧视频、旧 manifest 或旧游戏资源。
- 新试验先使用隔离目录和明确的 `pilot` 命名。
- 只有验收通过后，才将最终产物复制到正式媒体目录。
- 若需要真正删除旧文件，必须另行确认删除范围和可恢复方式。

### 2.4 对旧质量结论的处理

旧视频中曾出现角色位置、人物大小和身份一致性问题；旧的偏移统计只能作为失败案例，不能作为新方案的验收基准。包括曾被标记为偏移候选的其他角色，在新图片帧路线完成前不作最终质量结论。

## 3. 新的目录与命名方案

### 3.1 试验阶段目录

为避免覆盖已有 `ThreeMoves/Rudeus` 记录，第一轮使用隔离目录：

```text
char_runs/
  ThreeMovesImagePilot/
    Rudeus/
      source/
        Rudeus_base.png       # 只读原始参考副本
        attack_grid.png       # Flow 生成的 3×3 动作图
      reference/              # 仅保存流水线产生的透明参考帧
      rows/
        attack/               # 9 个最终帧
      output/
        spritesheet.webp
        char.json
      manifest.json
```

试验不使用 `video_runs`，也不把生成的图片放在 `game_runs/ThreeMoves/assets/media/` 中直接覆盖旧资源。

### 3.2 验收后的正式目录

鲁迪试验通过后，正式素材仍按项目约定归档到：

```text
char_runs/ThreeMoves/Rudeus/
  source/
    Rudeus_base.png
    attack_grid.png
    guard_grid.png
    ability_grid.png
    special_grid.png
  rows/
    attack/frame_0.png ... frame_8.png
    guard/frame_0.png ... frame_8.png
    ability/frame_0.png ... frame_8.png
    special/frame_0.png ... frame_8.png
  output/
    spritesheet.webp
    char.json
  manifest.json
```

最终接入游戏时，才将验收后的图集、元数据和注册信息同步到：

```text
game_runs/ThreeMoves/assets/media/characters/
game_runs/ThreeMoves/assets/media/registry.js
```

## 4. 第一阶段：鲁迪原始基准图审计

### 4.1 文件审计

先确认 `char_runs/ThreeMoves/Rudeus/source/Rudeus_base.png`：

- 是原始未抠图版本，而不是从透明帧反向导出的版本。
- 人物身份特征完整：发型、脸、服装、法杖/武器和主色没有被裁掉。
- 人物完整出现在画面内，头顶、脚部和左右肢体没有贴边。
- 背景和人物边缘没有明显的绿幕污染、黑色描边或透明孔洞。
- 画面比例、朝向和希望用于游戏的显示姿态符合当前基础角色设计。

### 4.2 参考图保全

确认后，将原始源作为只读基准；可以复制到试验目录，但不能使用以下文件替代它：

- `reference/frame_0.png`。
- `rows/*/frame_*.png`。
- `output/spritesheet.webp`。
- 游戏媒体目录中的缩小图。
- 任意旧视频截图或旧视频切帧。

如果视觉检查发现源文件本身已经带有绿幕或边缘污染，则先修复/重新取得原始图，并重新做审计；不直接进入动作生成。

## 5. 第二阶段：建立 char-sprite 试验工程

使用项目已有的 `char-sprite` 流程，不手工切帧：

```powershell
npx tsx skills/char-sprite/prepare.ts "ThreeMovesImagePilot/Rudeus" --anims=attack --fps=8
npx tsx skills/char-sprite/process.ts "ThreeMovesImagePilot/Rudeus" attack "<path-to-attack_grid.png>"
npx tsx skills/char-sprite/assemble.ts "ThreeMovesImagePilot/Rudeus"
```

流水线固定输出：

- 每帧 `192×208` 像素。
- 每个动作 9 帧。
- 默认播放速率 8 fps；动作节奏需要调整时，在 manifest 中按动作调整，不改动源图的网格结构。
- 通过纯绿/深绿识别完成透明化。
- 输出透明 PNG 帧、WebP 图集和 `char.json`。

注意：`process.ts` 的抠绿只在生成结果进入处理阶段后执行。不能为了“先看看效果”把处理后的帧再次上传到 Flow。

## 6. 第三阶段：在 Flow 生成鲁迪的第一张动作图

### 6.1 Flow 操作原则

在 Flow 中：


1. 使用当前项目中的原始参考图，而不是游戏目录中的小尺寸透明图。
2. 选择图片生成/连续帧图片路线，不使用 Veo 视频生成、不使用 Extend。
3. 第一轮只生成 `attack_grid.png`，不同时批量生成四个动作。
4. 每次重试都继续使用同一份原始参考图，不把上一次生成结果作为参考。
5. 下载原始生成图后再交给本地 `char-sprite`，不要在 Flow 中预先抠绿或裁成单帧。

### 6.2 动作网格要求

第一轮 `attack` 采用以下 9 帧逻辑，允许模型在帧间自然过渡，但不允许改变镜头和人物根位置：

| 帧 | 动作职责 |
|---:|---|
| 0 | 稳定待机/动作起始姿势 |
| 1 | 轻微蓄力 |
| 2 | 蓄力加强，身体主轴保持稳定 |
| 3 | 起手 |
| 4 | 攻击接触或主要命中姿态 |
| 5 | 动作峰值/武器或手臂完全展开 |
| 6 | 收势 |
| 7 | 回收至待机 |
| 8 | 稳定待机，作为衔接尾帧 |

最后 1～2 帧必须回到稳定待机，以便动作结束后接回角色基础状态。动作的实际播放时长通过 fps 或游戏播放策略控制，不通过重新生成独立视频来拼接。

### 6.3 提示词模板（v2：纯物理动作，无特效）

首轮 v1 提示词（含 "magical attack" 措辞）已在鲁迪 attack 试验中暴露问题：AI 生成的魔法特效落入纯绿抠像容差范围，被 `char-sprite` 抠像时连带挖空（详见 §12 首轮交付记录的返工结论）。v2 改为只要求物理挥动动作，明确禁止任何魔法/能量/粒子/发光视觉；技能特效改由前端实现。核心约束如下；具体招式描述可在不改变结构的情况下替换：

```text
Using the original unprocessed Rudeus character reference, create one 3x3 sprite sheet
with 9 sequential full-body animation frames for a front-facing physical weapon swing attack.
Read the frames left to right, top to bottom: idle start, anticipation, wind-up,
swing start, mid-swing, full extension / impact pose, follow-through, recovery, return to idle.

Keep the exact same character identity, outfit, hair, proportions, camera angle,
canvas framing, body scale, feet baseline, and lighting across all 9 cells.
The character stays centered in each cell; only the body and weapon pose changes.
Show the complete body with generous margins. Use a pure green background #00FF00.
Use thin solid dark green grid separators #006600 between the 3x3 cells.

This is a pure physical motion only: the staff/weapon and body movement itself,
with no magical or energy effects of any kind.
Do NOT render any magic circle, glowing orb, spell aura, particle effect, light trail,
energy beam, sparkle, or glow of any color around the character or weapon.
The character and weapon must be the only rendered elements besides the green background.

No shadows, no scenery, no camera movement, no zoom, no extra characters,
no text, no cropped limbs, no black grid lines, no transparency artifacts.
```

若生成结果包含背景、摄影机变化、人物重新设计、单元格数量错误、网格线颜色错误、帧间跳变，或画面中出现任何魔法/发光/粒子视觉元素，则整张图退回，不进入切帧阶段。

## 7. 第四阶段：试验结果处理与质量审查

### 7.1 自动检查

处理完成后检查：

- 是否产生完整的 9 个帧文件。
- 每帧是否为 `192×208`。
- `manifest.json` 的动作名、帧数、fps 和输出路径是否一致。
- 图集的行顺序是否为 `attack`，没有混入旧动作。
- 透明区域是否真的透明，而不是白色、黑色或残留绿色。
- 是否存在异常小连通域、孤立背景块或网格线残留。

### 7.2 人工视觉审查

以棋盘背景或深色背景预览 9 帧，重点检查：

- 脸部、头发、服装和法杖是否保持鲁迪身份。
- 人物整体高度是否突然放大或缩小。
- 头顶、肩部、躯干中心和脚底是否有异常跳动。
- 攻击峰值帧是否有肢体断裂、重复手臂或武器变形。
- 帧 0 与帧 8 是否足够接近，可以自然回到待机。
- 绿色边缘、黑边、半透明污染和背景孔洞是否明显。
- 网格线是否被误识别为人物的一部分。

### 7.3 量化对齐门槛

将 9 帧与原始参考图以及彼此进行比较，至少记录：

- 人物主体的 alpha 加权中心 X/Y。
- 主体高度和宽度。
- 脚底最低点位置。
- 头部中心位置。
- 每帧的非透明像素面积。
- 绿色/深绿色残留像素数量。

第一轮采用“明显错误即退回”的质量门槛，而不是为了通过统计而自动拉伸每一帧。允许动作产生合理的手臂、武器和身体姿势变化；不允许人物整体像镜头一样横移、缩放或改变身份。

## 8. 第五阶段：通过后扩展四个动作

鲁迪的第一张 `attack` 网格通过后，再使用同一份原始参考图和同一套构图约束生成：

| 动作行 | 游戏花色映射 | 主要动作方向 |
|---|---|---|
| `attack` | `spade` | 攻击/斩击 |
| `guard` | `heart` | 守护/结界 |
| `ability` | `diamond` | 能力/爆发 |
| `special` | `club` | 特殊/奇袭 |

每个动作独立生成一张 3×3 网格，但四张图必须共用：

- 同一个未处理原始参考图。
- 同一个角色构图和镜头位置。
- 同一个画布比例和网格规则。
- 同一套审查指标。

不允许使用 `attack_grid.png` 生成 `guard_grid.png`，也不允许把任何已经生成或处理的动作帧作为下一个动作的身份参考。

## 9. 第六阶段：推广到其他角色

鲁迪四个动作全部通过后，再按项目 P0 清单逐角色推进。每个角色遵循相同的“单动作试验门”：

1. 确认该角色原始未处理源。
2. 生成一个代表性动作的 3×3 网格。
3. 处理并审查边缘、比例和对齐。
4. 通过后再生成剩余动作。
5. 四动作通过后才进入游戏媒体目录。

如果某个角色出现大幅偏移，不允许用透明结果或旧视频结果补救；应回到原始基准图、构图提示词和单动作重试。

## 10. 部署与回滚

### 10.1 部署条件

只有满足以下条件，才允许替换正式资源：

- 四个动作都有 9 帧。
- 每个动作的 manifest 和图集一致。
- 透明边缘通过审查。
- 人物对齐和身份一致性通过审查。
- 游戏中能正确读取帧尺寸、行名、fps 和循环设置。
- 移动端和桌面端预览没有明显裁切。

### 10.2 回滚原则

- 新试验先保存在 `ThreeMovesImagePilot` 隔离目录。
- 不覆盖旧视频归档。
- 不在试验阶段覆盖 `game_runs/ThreeMoves/assets/media/`。
- 正式替换前保留旧的部署资源清单和校验值。
- 若新动作不合格，游戏继续使用旧静态图或占位回退，不把未验收帧混入正式资源。

## 11. 执行顺序与暂停点

### 本轮只执行

1. 创建并确认本计划文档。
2. 审计鲁迪原始基准图。
3. 在 Flow 中生成一张 `attack_grid.png`。
4. 下载原始网格图到隔离试验目录。
5. 运行 `char-sprite` 的 prepare/process/assemble。
6. 展示并审查 9 帧结果。

### 必须暂停并等待判断

- 原始参考图本身不干净。
- Flow 生成的网格结构不正确。
- 人物身份或大小出现明显变化。
- 抠绿后出现明显边缘污染。
- 9 帧的对齐表现仍然不稳定。

只有鲁迪的第一组 `attack` 试验通过后，才制定四动作批量生成的具体执行批次；本计划不授权直接批量生成或删除旧资产。

## 12. 交付记录

每完成一个角色，记录以下信息：

- 原始参考图路径及校验值。
- Flow 生成图路径及生成日期。
- 使用的动作提示词版本。
- `char-sprite` 实际命令。
- 9 帧审查结论和需要返工的帧号。
- manifest、图集和最终媒体路径。
- 是否已同步到游戏目录。
- 旧素材是否仍作为回退资源保留。

本次计划文档创建时未操作 Flow、未删除旧文件、未覆盖游戏资源；后续执行应严格按上述试验与验收门推进。

### 12.1 鲁迪 / attack（已验收，2026-09-05，含独立复核）

首轮提示词（含 "magical attack" 措辞）已退回重做；以下是使用 §6.3 v2 纯物理提示词重新生成后、经独立文件级复核确认的最终结果，取代交付者当时口头汇报中不准确的两条结论。

- 原始参考图：`char_runs/ThreeMoves/Rudeus/source/Rudeus_base.png`（也是 `char_runs/ThreeMovesImagePilot/Rudeus/source/Rudeus_base.png` 的来源），SHA-256 `c1a70978bc3bcb7162c3d38bfd9cfe1fbe7c736798217bca32263ab7b8ba45aa`，1086×1448 RGB，两份文件哈希一致，确认试验用的是未处理原图。
- Flow 生成图：`char_runs/ThreeMovesImagePilot/Rudeus/source/attack_grid.png`，最终版本写入时间 2026-09-05 15:51（早于此的 15:36 版本含发光魔法球、无法杖，已作废）。
- 提示词版本：§6.3 v2（纯物理挥杖，禁魔法/发光/粒子）。
- `char-sprite` 命令：与 §5 完全一致（prepare --anims=attack --fps=8 → process → assemble）。
- 9 帧审查结论：
  - 复核**推翻**了交付报告"无任何魔法光环/法球"的原始措辞——`_review/` 目录下 15:36 的旧截图确实显示过带发光球、无武器的失败版本；但该版本已被 15:51-15:52 重新生成的最终版本取代，**最终交付的 `rows/attack/frame_0~8.png` 和 `output/spritesheet.webp` 经拼图复核确认全程手持木杖、无魔法特效**，符合 §1.2 硬性原则。`_review/` 目录里的旧截图未清理，容易让后续查阅者误判现状，建议清理或加时间戳标注。
  - 复核**不认可**交付报告"抠绿边缘利落，无绿色描边"的结论——4 倍放大检查显示肩部、大衣描边、腿部、法杖与黑袍交叉处有肉眼可见的绿色边缘残留，不是抗锯齿级别的噪声。用户复看后判定**可接受，留待后续统一整改**，不阻塞后续角色批量推进（见 §13.7）。
  - 脚底基线、身体中心、帧 0/8 循环对齐均通过（原报告 §5 数据表核实无误）。
- 产物路径：`char_runs/ThreeMovesImagePilot/Rudeus/{rows/attack/frame_0~8.png, output/spritesheet.webp, output/char.json, manifest.json}`。
- 是否同步游戏目录：否，仍在隔离目录 `ThreeMovesImagePilot/`；`char_runs/registry.js` 中新增的 `ThreeMovesImagePilot/Rudeus` 条目是 `assemble.ts` 的全局索引副作用，不是游戏正式 registry（`game_runs/ThreeMoves/assets/media/registry.js`），未违反 §3.2/§10.1。
- 旧素材保留情况：`game_runs/ThreeMoves/assets/media/characters/Rudeus_base.png`（静态基准图）未改动，继续作为当前部署版本。

### 12.2 批量生产已交付角色归档（截至 2026-09-06，共 11 位角色完成 4 动作）

所有已完成角色均在隔离目录 `char_runs/ThreeMovesImagePilot/<Character>/` 下完成：
1. 3×3 纯物理动作网格生成（`source/{attack,guard,ability,special}_grid.png`）。
2. `prepare.ts`、`process.ts`（9 帧 slots 抠绿切片）与 `assemble.ts`（WebP 图集 + `char.json`）。
3. 审查通过（人物主体一致、基线稳定、无魔法发光特效破坏、符合轻微绿边可接受基线）。

| 角色 | 原始参考图 SHA-256 | 4 动作产物路径 | 图集体积 | 审查结论 |
|---|---|---|---|---|
| **Rudeus** | `c1a70978bc3...` | `char_runs/ThreeMovesImagePilot/Rudeus/` | 338 KB | 全 4 动作通过，纯物理法杖挥击与姿势 |
| **Eris** | `d85557e2efc...` | `char_runs/ThreeMovesImagePilot/Eris/` | 358 KB | 全 4 动作通过，剑盾动作规范 |
| **ErisGreyrat** | `9587af27786...` | `char_runs/ThreeMovesImagePilot/ErisGreyrat/` | 337 KB | 全 4 动作通过，双剑/单剑挥砍与格挡 |
| **Ghislaine** | `a350012208f...` | `char_runs/ThreeMovesImagePilot/Ghislaine/` | 342 KB | 全 4 动作通过，大剑物理斩击与身法 |
| **Kishirika** | `cbf387e9b38...` | `char_runs/ThreeMovesImagePilot/Kishirika/` | 363 KB | 全 4 动作通过，徒手魔王姿势与体术 |
| **Nanahoshi** | `52a5387c305...` | `char_runs/ThreeMovesImagePilot/Nanahoshi/` | 347 KB | 全 4 动作通过，徒手防身与冲拳姿态 |
| **Paul** | `5b5ca1d67d...` | `char_runs/ThreeMovesImagePilot/Paul/` | 约 350 KB | 全 4 动作通过，双剑/单剑物理挥砍与格挡 |
| **Perugius** | `a6e93dba534...` | `char_runs/ThreeMovesImagePilot/Perugius/` | 约 350 KB | 全 4 动作通过，甲胄法杖物理挥击 |
| **Ruijerd** | `9dc52dc08da...` | `char_runs/ThreeMovesImagePilot/Ruijerd/` | 约 350 KB | 全 4 动作通过，长枪物理突刺与架枪 |
| **Sylphiette** | `bc011e79ad4...` | `char_runs/ThreeMovesImagePilot/Sylphiette/` | 约 350 KB | 全 4 动作通过，短杖物理动作 |
| **Zanoba** | `e24aea1f407...` | `char_runs/ThreeMovesImagePilot/Zanoba/` | 约 350 KB | 全 4 动作通过，徒手怪力体术 |

以上 11 位角色均使用 §13.2 v2 纯物理提示词；每个角色均执行 `prepare → process(reference + 4 rows) → assemble`，每个动作 9 帧，正式目录与游戏媒体目录均已同步。统一绿边整改后重新生成的帧仍通过 192×208、透明通道、9 帧齐全、图集 1728×832 自动校验。

> 复核补记（2026-09-06）：本表逐行"审查结论"只做了整体目测，未逐角色按 §13.7 记录绿边残留有无、也未按 §13.3 步骤 4"角色和动作各占一条"回写 §12（实际以本汇总表代替 44 条明细）。留档粗于计划约定，后续如需追溯单动作返工历史需重新目检。

## 13. 批量执行计划：13 名角色 × 4 动作（2026-09-05 制定，供生成 Agent 执行）

用户已确认鲁迪 attack 试验"基本满意，小瑕疵可接受，后期再调整"，据此授权将流程扩展到全部 13 名花色角色的四个动作。范围经用户确认：**只做 13 名花色角色（roster），不含 Orsted / Hitogami 两张 Joker**（Joker 在 `game_runs/ThreeMoves/game/data.js` 里没有 suit，游戏逻辑不触发四招式，保持现状静态占位图）。

Flow 的 3×3 网格图生成目前是人工在浏览器操作，不是脚本 API；本计划的执行者是**具备图像生成能力的 Agent**，负责生成 + 处理 + 审查的完整闭环。以下所有路径、命令、提示词均可直接复制使用，无需回看本文档之外的对话记录。

### 13.0 前置阻塞项（必须先处理，不能跳过）

1. **Roxy 参考图不合格，暂缓生成**：`char_runs/ThreeMoves/Roxy/source/Roxy_base.png` 是 580×720 RGBA（其余 12 人均为约 1086×1448 RGB 无透明通道），已带透明背景、法杖顶端有实体化发光水法球、脚下带魔法阵——不符合 §1.2"生成参考只能使用未抠图、未裁切、未缩放、未经过 char-sprite/video-sprite 处理"的硬性要求。已确认工作区内没有更干净的替代原图（`reference/frame_0.png` 和游戏媒体图都是更小的派生图，不能用）。
   **处理方式**：跳过 Roxy，先完成其余审计合格角色；Roxy 需要人工重新提供或重新绘制一张纯绿幕、无发光特效、无魔法阵的原始立绘，审计通过（走一遍 §4.1 清单）后再补做四动作。不要尝试用现有污染图"将就"生成，也不要自行脑补裁剪/抠除魔法阵——那属于对参考图的加工，同样违反 §1.2。
2. **提交当前未入库的基础设施修复**：`git status` 显示 `skills/char-sprite/process.ts`（切帧改为固定 slot 而非连通域分组，是本轮跑通 3×3 网格切帧的关键修复）和 `char_runs/registry.js` 仍是未提交的工作区改动。建议人工先确认这两处改动、提交一次基线 commit，再开始批量任务，避免长时间批量作业过程中这份修复被误覆盖或与其他改动冲突。

### 13.1 角色清单与原始参考审计（11 人已完成，Cliff 补审通过待生成，Roxy 阻塞）

> roster 共 **13** 人。下表首版遗漏 Cliff（克里夫，roster rank 5，游戏会发其四门花色牌、四招式全触发）；Cliff 原图已于 2026-09-06 补审通过（纯绿幕、徒手、无特效），四动作待生成。剩余 Cliff + Roxy 两名角色的自包含执行单见 `plans/three-moves-remaining-tasks-handoff.md`。

| 英文目录名 | 中文显示名 | 原始参考路径 | 分辨率/格式 | SHA-256 | 审计状态 |
|---|---|---|---|---|---|
| Rudeus | 鲁迪乌斯 | `char_runs/ThreeMoves/Rudeus/source/Rudeus_base.png` | 1086×1448 RGB | `c1a70978bc3bcb7162c3d38bfd9cfe1fbe7c736798217bca32263ab7b8ba45aa` | 通过（attack 已验收，见 §12.1） |
| Eris | 艾莉娜丽洁 | `char_runs/ThreeMoves/Eris/source/Eris_base.png` | 1086×1448 RGB | `d85557e2efc7673962cd633e90e74bb5065bc52867fa25baccce9809f8ec7a71` | 通过（纯绿幕，无特效） |
| ErisGreyrat | 艾莉丝 | `char_runs/ThreeMoves/ErisGreyrat/source/ErisGreyrat_base.png` | 1086×1448 RGB | `9587af27786566c8482909c09426d056f4b1846871f37ac8351df2434813d13d` | 通过 |
| Ghislaine | 基列奴 | `char_runs/ThreeMoves/Ghislaine/source/Ghislaine_base.png` | 1086×1448 RGB | `a350012208f4b34498a624be0de78f7d3b05867a6a90ef7eac0319f3bd4a660b` | 通过 |
| Kishirika | 奇希莉卡 | `char_runs/ThreeMoves/Kishirika/source/Kishirika_base.png` | 1086×1448 RGB | `cbf387e9b382ea4daecebdf3cb199fcd89b7211dd373f4977cf4550e324b99f7` | 通过 |
| Nanahoshi | 七星静香 | `char_runs/ThreeMoves/Nanahoshi/source/Nanahoshi_base.png` | 1086×1448 RGB | `52a5387c305246680fa740e3b0ecf42a923b7b7b8adbb0d5cfa77cf5ed8c7749` | 通过 |
| Paul | 保罗 | `char_runs/ThreeMoves/Paul/source/Paul_base.png` | 1086×1448 RGB | `5b5ca1d67d0080c3973f5962a68cd68e60ca7ae060cf1745f2a084a82ce63964` | 通过 |
| Perugius | 佩尔基乌斯 | `char_runs/ThreeMoves/Perugius/source/Perugius_base.png` | 1090×1443 RGB | `a6e93dba5340f12b03d9281de1670b47e26849c53e156b354c51d236cea31845` | 通过（分辨率与其他人略有差异，目测仍是干净原图，非派生裁切） |
| Roxy | 洛琪希 | `char_runs/ThreeMoves/Roxy/source/Roxy_base.png` | 580×720 RGBA | `d1905944377c498f3537b3d1c2edf72f947deb3c4b0a4a62d5644e68c5d9069b` | **阻塞**，见 §13.0 第 1 条 |
| Ruijerd | 瑞杰路德 | `char_runs/ThreeMoves/Ruijerd/source/Ruijerd_base.png` | 1086×1448 RGB | `9dc52dc08dab48c86e9421122726a07959a1f0670f94f061f1322b81c6bbbfd2` | 通过 |
| Sylphiette | 希露菲叶特 | `char_runs/ThreeMoves/Sylphiette/source/Sylphiette_base.png` | 1086×1448 RGB | `bc011e79ad469cd0424a6accf317c8eb11722bac3abbf98f71f2e8a2a75c3667` | 通过 |
| Zanoba | 扎诺巴 | `char_runs/ThreeMoves/Zanoba/source/Zanoba_base.png` | 1086×1448 RGB | `e24aea1f4072957ef1f3484208ba358f1730884411bcceee6236d51daea61797` | 通过 |
| Cliff | 克里夫 | `char_runs/ThreeMoves/Cliff/source/Cliff_base.png` | 1086×1448 RGB | `dc34cd11a5ec558998c89b3f9fe770d7096dae270f2da2eecb81f45681e55603` | 通过（纯绿幕 `#00FF00`、全身居中留白、徒手无武器、无特效；2026-09-06 补审，首版清单漏列）——**四动作待生成，见交接单** |

12 人的通过结论（含 2026-09-06 补审的 Cliff）基于缩略图批量目测（纯绿幕、无透明通道、无发光/魔法阵、人物完整未贴边），未逐人做 4 倍放大级别检查；如果某个角色在生成阶段反复出现异常，先回头用 §4.1 清单重新审计该角色的原始参考图，而不是默认参考图无问题。

### 13.2 四个动作的 v2 提示词模板（纯物理，禁魔法/发光/粒子）

沿用 §1.2 硬性原则：**四个动作都只画身体和角色已有装备/武器的物理动作，不画任何魔法/能量/粒子/发光效果**，技能特效交给前端实现。下面把 §6.3 的 attack 模板原样保留，并按同样结构补出 guard/ability/special 三版。使用时把 `<Character>` 换成角色名；如果该角色在参考图里是徒手/无武器，就保持徒手，不要给它加武器。

**通用结构（四版共用，只有中间的动作序列描述和物理动作说明不同）：**

```text
Using the original unprocessed <Character> character reference, create one 3x3 sprite sheet
with 9 sequential full-body animation frames for a front-facing physical <ACTION_LABEL>.
Read the frames left to right, top to bottom: <9-CELL SEQUENCE>.

Keep the exact same character identity, outfit, hair, proportions, camera angle,
canvas framing, body scale, feet baseline, and lighting across all 9 cells.
The character stays centered in each cell; only the body and weapon/equipment pose changes.
Show the complete body with generous margins. Use a pure green background #00FF00.
Use thin solid dark green grid separators #006600 between the 3x3 cells.

<PHYSICAL-ONLY CLAUSE>

No shadows, no scenery, no camera movement, no zoom, no extra characters,
no text, no cropped limbs, no black grid lines, no transparency artifacts.
```

**attack（黑桃 / 攻击·斩击，与 §6.3 一致，已验收）**
- ACTION_LABEL: `weapon swing attack`（若徒手角色改为 `unarmed strike`）
- 9-CELL SEQUENCE: `idle start, anticipation, wind-up, swing start, mid-swing, full extension / impact pose, follow-through, recovery, return to idle`
- PHYSICAL-ONLY CLAUSE:
  ```text
  This is a pure physical motion only: the weapon (or fists) and body movement itself,
  with no magical or energy effects of any kind.
  Do NOT render any magic circle, glowing orb, spell aura, particle effect, light trail,
  energy beam, sparkle, or glow of any color around the character or weapon.
  The character and their existing weapon/equipment must be the only rendered elements
  besides the green background.
  ```

**guard（红桃 / 守护·结界 → 物理化为格挡/防御姿态）**
- ACTION_LABEL: `defensive guard/block stance`
- 9-CELL SEQUENCE: `idle start, alert stance, raise weapon or arms to guard, brace, full block or parry pose at peak tension, hold the block, release tension, lower guard, return to idle`
- PHYSICAL-ONLY CLAUSE:
  ```text
  This is a pure physical defensive motion only: the character bracing and blocking with
  their own body, weapon, shield, or arms exactly as shown in the reference, with no
  magical or energy effects of any kind.
  Do NOT render any magic circle, barrier, glowing shield, spell aura, particle effect,
  light trail, energy beam, sparkle, or glow of any color around the character or their
  equipment.
  The character and their existing equipment must be the only rendered elements besides
  the green background.
  ```

**ability（方块 / 能力·爆发 → 物理化为蓄力全力一击）**
- ACTION_LABEL: `power exertion strike at maximum physical force`
- 9-CELL SEQUENCE: `idle start, crouch and gather stance, build tension, coil back, explosive full-power release at peak, follow-through, decelerate, recover, return to idle`
- PHYSICAL-ONLY CLAUSE:
  ```text
  This is a pure physical exertion motion only: maximum-effort physical strength shown
  through body mechanics and muscle tension alone, with no magical or energy effects of
  any kind.
  Do NOT render any magic circle, glowing aura, spell effect, particle effect, light
  trail, energy beam, shockwave burst, sparkle, or glow of any color around the character
  or their equipment.
  The character and their existing weapon/equipment must be the only rendered elements
  besides the green background.
  ```

**special（梅花 / 特殊·奇袭 → 物理化为快速奇袭身法）**
- ACTION_LABEL: `quick surprise-attack maneuver`
- 9-CELL SEQUENCE: `idle start, shift weight, feint step, dash start, mid-dash repositioning, surprise strike from an unexpected angle at peak, recovery landing, stabilize, return to idle`
- PHYSICAL-ONLY CLAUSE:
  ```text
  This is a pure physical motion only: fast footwork and a surprise strike using the
  character's own body and weapon, with no magical or energy effects of any kind.
  Do NOT render any magic circle, glowing trail, spell aura, particle effect, speed-line
  energy trail, energy beam, sparkle, or glow of any color around the character or their
  equipment.
  The character and their existing weapon/equipment must be the only rendered elements
  besides the green background.
  ```

若生成结果出现背景、镜头变化、人物重设计、单元格数量错误、网格线颜色错误，或任何魔法/发光/粒子视觉元素，按 §6.3 原则整张退回重试，不进入切帧。同一动作连续失败 3 次仍不干净，暂停该动作，上报人工调整提示词或更换参考图，不要自行放宽"禁魔法"红线去将就通过。

### 13.3 每个角色 × 动作的执行流程

对 13.1 表里"通过"的角色按下面的循环跑。截至 2026-09-06 已完成 11 人；**剩 Cliff（可直接开工）与 Roxy（解除 §13.0 阻塞后）**——两者已展开为可直接复制的执行单，见 `plans/three-moves-remaining-tasks-handoff.md`，本节循环是其依据：

```text
对每个角色 <Character>：
  对每个动作 <action> in [attack, guard, ability, special]：
    1. 用该角色原始参考图 + §13.2 对应动作模板，在 Flow 生成 3x3 网格图
       -> 存为 char_runs/ThreeMovesImagePilot/<Character>/source/<action>_grid.png
       （继续用隔离目录，不直接写正式 char_runs/ThreeMoves/<Character>/，直到该角色四动作全过 -> 参照 §3.2 迁移）
    2. npx tsx skills/char-sprite/prepare.ts "ThreeMovesImagePilot/<Character>" --anims=<action> --fps=8
       npx tsx skills/char-sprite/process.ts "ThreeMovesImagePilot/<Character>" <action> "char_runs/ThreeMovesImagePilot/<Character>/source/<action>_grid.png"
       npx tsx skills/char-sprite/assemble.ts "ThreeMovesImagePilot/<Character>"
    3. 自动检查（§7.1）：9 帧齐全、每帧 192x208、manifest 与图集行顺序一致、透明区域基本干净。
       已知可接受瑕疵（不阻塞，见 §13.7）：轻微绿色边缘残留（非大面积、非断肢级别）。
       仍然阻塞退回的情况：帧数不对、尺寸不对、大片绿色/黑色残留、明显断肢或人物变形、镜头位移、任何可辨认的魔法/发光/粒子效果。
    4. 人工或视觉审查（§7.2/§7.3 精简版）：拼图检查身份一致性、脚底基线稳定、帧0与帧8可循环、无武器/肢体错乱。
       把结论按 §12.1 的格式（保留原图路径+哈希、生成图路径+时间、提示词版本、命令、结论、产物路径）追加写入本文件 §12，角色和动作各占一条。
    5. 该角色四个动作全部通过后，才把 char_runs/ThreeMovesImagePilot/<Character>/ 的内容迁移到正式
       char_runs/ThreeMoves/<Character>/{rows/*, output/*, manifest.json}（覆盖前保留旧素材的清单/校验值，§10.2）。
    6. 更新 §13.4 进度表对应单元格状态。
  12 名角色之间可以并行/任意顺序推进，不必等某一名角色四动作全过才开始下一名——
  §8/§9 原本"必须先鲁迪四动作全过、再逐角色单动作试验门"的严格串行顺序，
  经用户对鲁迪 attack 结果"基本满意，可接受"的确认后放宽为：
  每个角色仍必须自己先出一张干净的动作网格图（验证该角色的参考图和提示词组合没问题）作为轻量试验门，
  但不需要再等其他角色或鲁迪剩余动作全部完成才能开始。
```

### 13.4 进度追踪表（执行过程中逐格更新，勿删除历史记录，只改状态）

状态取值：`待生成` / `生成中` / `待审查` / `已通过` / `已同步游戏目录` / `阻塞`。

| 角色 | attack | guard | ability | special |
|---|---|---|---|---|
| Rudeus | 已同步游戏目录（§12.1） | 已同步游戏目录 | 已同步游戏目录 | 已同步游戏目录 |
| Eris | 已同步游戏目录 | 已同步游戏目录 | 已同步游戏目录 | 已同步游戏目录 |
| ErisGreyrat | 已同步游戏目录 | 已同步游戏目录 | 已同步游戏目录 | 已同步游戏目录 |
| Ghislaine | 已同步游戏目录 | 已同步游戏目录 | 已同步游戏目录 | 已同步游戏目录 |
| Kishirika | 已同步游戏目录 | 已同步游戏目录 | 已同步游戏目录 | 已同步游戏目录 |
| Nanahoshi | 已同步游戏目录 | 已同步游戏目录 | 已同步游戏目录 | 已同步游戏目录 |
| Paul | 已同步游戏目录 | 已同步游戏目录 | 已同步游戏目录 | 已同步游戏目录 |
| Perugius | 已同步游戏目录 | 已同步游戏目录 | 已同步游戏目录 | 已同步游戏目录 |
| Roxy | 阻塞（§13.0） | 阻塞 | 阻塞 | 阻塞 |
| Ruijerd | 已同步游戏目录 | 已同步游戏目录 | 已同步游戏目录 | 已同步游戏目录 |
| Sylphiette | 已同步游戏目录 | 已同步游戏目录 | 已同步游戏目录 | 已同步游戏目录 |
| Zanoba | 已同步游戏目录 | 已同步游戏目录 | 已同步游戏目录 | 已同步游戏目录 |
| Cliff | 待生成 | 待生成 | 待生成 | 待生成 |

### 13.5 部署策略：按角色增量同步，不等全部 13 人完成

不采用"13 人全部做完再一次性接入游戏"的大爆炸式部署。改为：某个角色四个动作全部通过 §7 审查后，立即把它同步到 `game_runs/ThreeMoves/assets/media/characters/` 和 `game_runs/ThreeMoves/assets/media/registry.js`（沿用现有的 `characterIdsByDisplayName` 映射，不改动映射关系本身），使其他还在生成中的角色不被阻塞。每次同步前仍遵守 §10.1 的部署条件清单和 §10.2 的回滚原则（保留旧静态图作为回退）。

### 13.6 游戏侧改动边界

本计划仍然只负责素材生产、处理、审查、按 §13.5 的方式接入媒体资源；不涉及 `game_runs/ThreeMoves/game/` 下的玩法代码、结算逻辑或 UI 改动。如果四个动作的帧图需要在前端播放（而不是只换静态基准图），需要额外的前端播放接入工作，这不在本计划范围内，需要另外确认需求和排期。

### 13.7 已知可接受瑕疵基线（不重复阻塞，但要统一整改）

鲁迪 attack 的最终帧存在肉眼可见的绿色边缘残留（见 §12.1），用户已确认"可以接受，后期可以再调整"。批量生产 13 人 × 4 动作期间，这类**轻微**边缘残留不作为单帧退回理由，但每个角色审查时仍要在 §12 记录里注明"是否存在绿边残留"，为后续统一修 `skills/char-sprite/process.ts` 的抠像/去边逻辑积累样本，而不是每个角色各自悄悄将就。若某一帧的绿色残留达到大面积挖空、断肢、或明显可辨认的色块级别（不是 1~3px 描边），仍按 §7.1 标准退回，不适用本条豁免。

### 13.8 当前成果与剩余待办事项清单（2026-09-06 更新）

#### 1. 已完成成果（11 / 13 角色）
- **已交付**：`Rudeus`, `Eris`, `ErisGreyrat`, `Ghislaine`, `Kishirika`, `Nanahoshi`, `Paul`, `Perugius`, `Ruijerd`, `Sylphiette`, `Zanoba`。
- **产物形态**：11 位角色共计 44 个 3×3 连续动作网格图；396 张 `192×208` 透明单帧；11 份完整 `spritesheet.webp` 图集与 `char.json` 元数据装配归档于 `char_runs/ThreeMovesImagePilot/`，并同步到正式 `char_runs/ThreeMoves/`。
- **游戏接入**：11 位角色的 WebP 图集与元数据已增量写入 `game_runs/ThreeMoves/assets/media/characters/`；`game_runs/ThreeMoves/assets/media/registry.js` 已为对应条目增加 `spritesheet` / `charJson` 路径，保留原有 `base` 静态图回退。
- **统一整改**：`skills/char-sprite/process.ts` 增加仅作用于透明邻域的绿色边缘去溢出步骤；44 张网格图的分隔带统一为 `#006600`，并已重跑 11 位角色全部 44 个动作。
- **版本控制（2026-09-06）**：以上产物已提交（`process.ts` 基线修复、11 组游戏媒体 `webp`+`char.json`、两份 registry、本计划文档）。注意 `game_runs/**/*.json` 默认被 `.gitignore` 忽略，11 个 `*_char.json` 是 `git add -f` 强制入库的；后续接前端播放前若加入 Cliff/Roxy，其 `char.json` 同样需 `-f`，或改在 `.gitignore` 增补 `!game_runs/ThreeMoves/assets/media/**/*_char.json` 例外。

#### 2. 剩余待办任务分解（Cliff + Roxy 共 2 角色）

> 完整可复制执行单见 **`plans/three-moves-remaining-tasks-handoff.md`**（含四动作提示词、逐条命令、验收清单、迁移与提交步骤）。以下仅为索引。

- **任务一：Cliff（克里夫）四动作生成（不阻塞，可直接开工）**
  - 原图 `char_runs/ThreeMoves/Cliff/source/Cliff_base.png` 已审计通过（纯绿幕、徒手无武器）。
  - 按 §13.2 v2 提示词（attack/special 的 ACTION_LABEL 用徒手版 `unarmed strike` / `unarmed surprise-attack maneuver`）+ §13.3 循环，隔离目录 `ThreeMovesImagePilot/Cliff/` 生成 → 处理 → 审查 → 四动作全过后迁移正式目录 + 增量同步游戏媒体 + registry.js 加 `spritesheet`/`charJson`。
  - 交付记录按 §12.1 格式追加，更新 §13.4 进度表 Cliff 行。
- **任务二：解除 Roxy 阻塞项（待补原图）**
  - 当前源图为 580×720 带透明底、水法球与脚下魔法阵的派生图；需提供/重绘一张纯绿幕 `#00FF00`、无特效、约 1086×1448 RGB 的原始立绘，走 §4.1 审计。
- **任务三：Roxy 解锁后补跑与同步**
  - 原图审计通过后（覆盖前把旧文件备份为 `Roxy_base.polluted.png`、记录新 SHA-256），按相同 v2 纯物理提示词（持杖法师，attack 用 `staff swing attack`）、`char-sprite` 流水线、逐帧验收和增量同步流程补齐 4 动作。
- **任务四：收尾**
  - 两名角色都进游戏媒体后，顶部状态行改为 13/13，§13.4 全绿，本清单清空；删除 `char_runs/ThreeMovesImagePilot/Rudeus/_review/`（§12.1 已标注的旧失败版截图残留）。
