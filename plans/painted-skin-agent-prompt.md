你是本仓库（c:\Users\tj169\Flinders\work\Learning\scripts）的执行 agent，具备图像生成能力。请按「一次性自主模式」从头到尾完成《画皮》PaintedSkin 的全部工作：剧本、出图、抠图装配、游戏引擎、验证、收尾。

## 一、开工前必读（按顺序读完再动手）

1. `CLAUDE.md`：仓库约定（按序 script 加载、对外契约、提交信息格式）。
2. `game_runs/MIGRATION.md`：游戏架构样板与「即开即玩」原则。
3. `plans/painted-skin-plan.md`：**全文**。这是唯一的执行依据，包括剧情骨架、世界规则、美术清单与提示词、工具规格、验证门。
4. `skills/game-verify/SKILL.md`：验证工具用法。
5. 若 `game_runs/PaintedSkin/PROGRESS.md` 已存在，说明之前跑过一部分：从它记录的位置继续，已完成的步骤和已通过自检的图片都不要重做。

## 二、工作模式

- 按计划 **§4.1 一次性自主模式** 执行：五道门（G1–G5）改为自检门，**不停下等用户、不向用户提问**。按 §4.1 的规则自行决策，并把决策和理由写进 `game_runs/PaintedSkin/art/SELECTION.md`。
- 执行顺序：P0 → P1A（G1）→ P4 占位装配 → P1B（G2）→ P2（G3）→ P3（G4）→ P5 → P6。
- 只有硬阻塞（出图工具不可用、仓库状态异常）才停下。停下前先完成所有不依赖它的步骤，并把阻塞写进 PROGRESS.md。

## 三、版本控制（关键节点必须提交）

- 先从 `master` 切分支 `feat/painted-skin`，全程在该分支工作。**不推送、不合并到 master。**
- 按计划 §4.1 的节点表，在 C0–C8 每个节点提交，并打对应的本地标签（`ps-p0`、`ps-g1-script`、`ps-p4-engine`、`ps-g2-concept`、`ps-g3-refs`、`ps-g4-art`、`ps-p5-verified`、`ps-done`）。
- 途中修 bug 单独提交 `fix(PaintedSkin): ...`。提交信息格式：`feat|fix|style|doc|chore(<范围>): 中文描述`。
- **始终 `git add <明确路径>`，禁止 `git add -A` / `git add .`**。工作区里 `.claude/settings.json` 有用户自己的未提交改动，绝不能混进你的提交。
- 不要提交 raw 原图、playtest 截图和审查拼图（.gitignore 已忽略），只提交处理后的 webp、代码、生成的 .js/.md 和 `art/refs/*.webp`。
- 每次提交后更新 PROGRESS.md 并一同提交。

## 四、绝对不能违反的约束（详见计划 §1、§6、附录 C）

1. **没有选项的地方绝不要求点击**：单线剧情自动播放，点击只用来加速；剧本禁止单选项，选择节点在任何可达状态下都必须至少有 2 个可见选项。
2. **人物不脸谱化，动机真实**：关键选项的文字要带出动机。**情感高点只说情、不说事**，事实交给物件（银簪）、动作或道士事后揭示。f_last 王生的临终台词由用户定稿，保持原意。
3. **「妒」线严格遵守知情表**：每个节点里谁知道什么，不得越界（例如陈氏烧画时以为烧的只是一幅画）。
4. **恐怖间接呈现**：不画伤口、破洞、内脏、断首；陈氏殉情只以留白呈现，不写方式；王生在「黄泉」中不是自尽（R5）。
5. **世界规则 R1–R7 必须贯穿所有分支**，尤其是 R2「心须甘愿相予」和 R4「道士只渡与护，不夺一救一」。
6. **立绘**：绿底 `#00FF00`；鬼相 gui 用品红底 `#FF00FF`；**禁止 flipX**（右衽）；大小在装配时实测归一化，不依赖提示词。
7. **所有出图**：无文字、无书法、无印章、无水印；人物必须与锁定的参考设定图一致（朱砂痣等标志物）。
8. **不修改 `game_runs/ShadowAbyss/` 的任何文件**。
9. 架构：命名空间 `window.HuaPi`，按序 script 加载，不 fetch json；保留对外契约 `__probe / __gameState / __hudStart / __advanceCard / __advance / __choose / ?autostart / navigator.webdriver`。
10. 名字：女鬼原名何梦盈，自称「阿绢」；仇家为沈府、沈夫人；道士道号止水。

## 五、完成标准（全部满足才算完成）

- `node game_runs/PaintedSkin/tools/build-story.mjs --strict` 零错误：8 个结局全部可达、素材覆盖 100%。
- `npx tsx skills/game-verify/verify.ts PaintedSkin --keys=SPACE,ENTER --seconds=6`：L0/L1/L2 全绿。
- `node game_runs/PaintedSkin/tools/walk-endings.mjs`：8 个结局逐一走通、零控制台错误；「60 秒不输入也持续推进」的自动播放回归通过。
- `games.json` 已注册，`preview.mp4` 已生成，标签 `ps-done` 已打。

## 六、最终报告（完成后用中文输出）

1. 每个阶段的完成情况，以及 `git log --oneline master..feat/painted-skin` 和标签列表。
2. 每道自检门的自主决策摘要（选了哪版风格、哪版角色、为什么），注明完整记录在 `art/SELECTION.md`。
3. **待用户复核清单**：自检未完全通过而勉强采用的图、取了默认值的待定项（计划 §6.7）、任何偏离计划的地方及原因。
4. 本地试玩方法：启动命令、URL，以及 `?pace=`、`?node=` 的用法。
5. 如果有阻塞或未完成项，说明原因和需要用户做什么。
