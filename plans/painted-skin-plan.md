# 画皮 PaintedSkin — 分支叙事游戏执行计划（v2）

> **读者**：执行本计划的 agent（具备图像生成能力）。你没有参与前期讨论，本文档是全部上下文。
> **用户**在每个「门（Gate）」做决定；到门必须停下、按要求呈现材料、等用户回复，**不得越门推进**。
> **例外**：用户要求「一次性完成」时，按 §4.1 自主模式执行——门改为自检门，不停下，但每道门都要提交并打标签，供用户事后复核或回滚。
> 仓库约定先读：根目录 `CLAUDE.md`、`game_runs/MIGRATION.md`。冲突时以本文档的「锁定决策」为准。
> v2 变更（2026-11-09）：剧情由「忠实原著」改为「借用设定、人物不脸谱化」的原创改编，第 6 节、附录 A/B 整体重写。

---

## 0. 一页摘要

- **题材**：借用蒲松龄《聊斋志异·画皮》的设定，写一个原创的分支叙事故事（视觉小说形态）：水墨淡彩背景 + 国风动漫大幅立绘叠加 + 底部对话框 + 选项。
- **核心理念**：**没有天生的好人坏人、好鬼坏鬼**。每个人物的动机都真实；结局由人物之间的选择、隐瞒、信任和误会共同促成。
- **核心体验**：单线剧情**自动播放、无需点击**；玩家只在**真正的抉择**处操作。主视角是王生，部分章节切到陈氏视角（插章）。共 8 个结局，每局 6–10 个选择。
- **图像流水线**：概念图系列（多方案）→ 用户挑选 → 定稿参考设定图 → 以参考图为输入量产背景、CG、立绘及其变体 → 抠图归一化 → 装配。
- **产出**：`game_runs/PaintedSkin/`（游戏）+ `game_runs/_engine/story.js`（新的共享剧情运行时）。
- **五道门**：G1 剧本审读 → G2 概念挑选 → G3 参考锁定 → G4 量产审图 → G5 试玩调节奏。

---

## 1. 锁定决策（用户已拍板，不得擅改）

| # | 决策 | 含义 |
|---|---|---|
| D1 | 借用《画皮》设定的原创改编 | 保留相遇、书斋、画皮、道士、拂尘、心等元素；**不沿用原著价值观**（如「妻子还债」「天道好还」） |
| D2 | 人物不脸谱化，动机真实 | 每个关键抉择的选项文字都要带出动机（§6.3）；反派也有来由 |
| D3 | 删除原著「疯乞辱妻、吞唾救夫」线 | 与当下价值观不符，玩家无法代入。疯乞人物整体删除 |
| D4 | 形态 = 对话 + 选择 + 大幅立绘叠加 | 不做地图行走，不做像素图块 |
| D5 | 美术 = 国风动漫立绘 + 水墨淡彩背景 | 风格融合由 G3 的融合测试把关 |
| D6 | 恐怖间接呈现 | 剖心只表现人物动作 + 胸口衣物深色血迹，不画伤口、破洞、内脏、断首。**陈氏殉情只以留白呈现**：不出现凶器、伤口和动作过程，只写她最后的话与旁人的反应。王生在「黄泉」中**不是自尽**（见规则 R5） |
| D7 | 单线自动播放 | **没有选项的地方绝不要求点击**；点击只用来「加速」；节奏先按 §7.2 默认值，用户试玩后再调 |
| D8 | 立绘 vs CG 分工 | **主动作出反应的人物 → 立绘**；被动人物（不知情者、昏迷者、尸身、背景人物）→ 可画进 CG。**2026-11-09 用户修订**：人物需要做出动作时整体画进 CG，CG 期间不站立绘；对白改由框内 Q 版头像标示说话人，与旁白区分。补图清单见 `plans/painted-skin-art2-plan.md` |
| D9 | 绿幕 | 立绘纯色底出图，本地抠图。女鬼鬼相面色青绿，改用品红底（§9.3） |
| D10 | 影视改编的边界 | 借鉴「人物立体化」的思路，但**不使用**现代影视改编里新增的人物与情节（如狐妖小唯、庞勇等） |
| D11 | 神曲（ShadowAbyss）不动 | 其「无选项也要点击」问题另记于 `plans/shadow-abyss-auto-advance-issue.md`，后续单独立项 |

## 2. 非目标（本期不做）

- 存档、读档、章节选择、回看菜单（backlog）、设置菜单、多选项暂停菜单（MIGRATION.md §0.5 原则）。
- 地图探索、像素行走帧、配音、BGM 制作（音效见 §7.9，可选）。
- 跨局的成就或结局收集（没有存档，只在单局内显示）。

---

## 3. 目录与入库规则

```
game_runs/
  _engine/story.js                 ★新增：自动播放剧情运行时（纯逻辑，不依赖 Phaser）
  PaintedSkin/
    index.html                     START 遮罩 + 按序 <script>
    README.md                      本游戏说明（工具用法、URL 参数）
    story/
      painted-skin.json            剧本唯一真源（需 .gitignore 例外，见 P0）
      READ.md                      build-story 生成：按路线展开的可读版（G1 审读用）
      LINT.md                      build-story 生成：校验 + 路线枚举 + 时长报告
    art/
      ART_BIBLE.md                 从附录 A 落地：风格前缀/色板/角色卡
      PROMPTS.md                   附录 B 落地：每张图的最终提示词与输入参考图（含重出记录）
      SELECTION.md                 每道门的挑选/否决记录
      USAGE.md                     build-story 生成：剧本实际用到的立绘/背景/CG 清单
      refs/*.webp                  锁定的参考设定图与风格参考（入库备份，压缩版）
    assets/
      concept/raw/*.png            概念图、风格测试（不入库）
      refs/raw/*.png               参考设定图原图（不入库；出图时作输入）
      bg/raw/*.png  → bg/*.webp    背景
      cg/raw/*.png  → cg/*.webp    CG + 封面
      lihui/raw/*.png → lihui/*.webp  立绘（纯色底原图 → 透明成品）
      manifest.js                  process-art 生成（script 标签加载，禁止 fetch json）
    game/
      config.js                    window.HuaPi.Config（含 PACE、布局常量）
      storyData.js                 build-story 生成，勿手改
      systems/stage.js panel.js fx.js view.js
      scenes/BootScene.js StoryScene.js
      main.js                      Phaser 装配 + 对外契约
    tools/
      build-story.mjs              校验 + 路线枚举 + 生成 storyData.js/READ.md/LINT.md/USAGE.md
      process-art.mjs              抠图/归一化/manifest/审查拼图
      walk-endings.mjs             无头逐结局走查 + 截图
    playtest/                      走查截图、审查拼图（已被 .gitignore 忽略）
    preview.mp4                    10s 预览（入库）
```

入库规则（来自根 `.gitignore`）：
- `game_runs/**/*.json` 被忽略 → **剧本 json 必须加例外**（P0）。生成的 `.js`、`.md` 正常入库。
- `game_runs/**/assets/**/raw/` 被忽略 → 所有 AI 原图（含概念图）放 `raw/`，不入库；处理后的 webp 入库。
- `game_runs/**/playtest/` 被忽略 → 截图和审查拼图放这里。
- 参考设定图要长期保留（以后补图靠它们保持一致）→ 另存压缩 webp 到 `art/refs/` 入库。

命名空间 `window.HuaPi`。脚本顺序：
`_engine/hud.js` → `_engine/story.js` → `game/config.js` → `game/storyData.js` → `assets/manifest.js` → `game/systems/*.js` → `game/scenes/*.js` → `game/main.js`。

---

## 4. 阶段与门总览

| 阶段 | 内容 | 依赖 | 结束门 |
|---|---|---|---|
| P0 | 立项：分支、目录、gitignore 例外、提交计划 | — | — |
| P1A | 剧本 + build-story 校验工具 | P0 | **G1** 用户审读剧本 |
| P1B | 风格测试 + 角色概念图 | P0（与 P1A 并行） | **G2** 用户挑选 |
| P2 | 参考设定图 + 风格锁定 + 融合测试 | G2 | **G3** 用户锁定 |
| P3 | 量产：背景、CG、封面、立绘及变体；抠图归一化 | G1 + G3 | **G4** 用户审图 |
| P4 | 引擎与装配（先用占位图；G1 后即可与 P1B–P3 并行） | G1 | — |
| P5 | 验证门 | P3 + P4 | **G5** 用户试玩、定节奏 |
| P6 | 收尾：showreel 注册、preview、提交 | G5 | — |

**到门时的呈现要求**：列出产物路径；图像类给出拼图或对比图路径；写明你的推荐及理由；把用户的决定写入 `art/SELECTION.md`（或剧本修订记录）后再继续。

### 4.1 一次性自主模式

用户要求「一次性完成全部工作」时，按此模式执行。

**执行顺序**（单个 agent 串行）：
P0 → P1A（G1）→ P4 占位装配 → P1B（G2）→ P2（G3）→ P3（G4）→ P5 → P6。
先做 P4，是为了在出图之前就证明剧本能跑通。

**自检门规则：**

| 门 | 自主决策规则 | 记录位置 |
|---|---|---|
| G1 剧本 | `build-story --strict` 零错误（素材缺失此时只算警告）；逐条自查 §1 锁定决策、§6.1 世界规则、§6.4 写作规范、「妒」线知情表；§6.7 未定项一律取默认值 | `story/LINT.md` + `art/SELECTION.md` 的「G1 自检」节 |
| G2 概念 | 风格默认选 **a 档**（淡彩为主、留白多，最贴合用户定的「水墨淡彩」），除非 a 档反复出现印章/文字，或在 G3 融合测试中明显违和。每个角色按四项打分取最高：①符合角色卡 ②运行时尺度下可辨识 ③配色避开绿/青（gui 除外）④与其他角色的剪影和配色有区分度 | `SELECTION.md` 写打分表和理由；**所有候选原图保留在 raw/**，用户事后可以改选 |
| G3 参考 | 三视图一致、标志物齐全（朱砂痣、拂尘、木剑、念珠）、无文字 → 锁定。融合测试违和时先在代码侧调 | `SELECTION.md` |
| G4 量产 | §9.5 自检全过即通过；不过就重出，同一张最多重出 3 次。仍不过则选最好的一版，登记到 `SELECTION.md` 的「待用户复核」清单，继续往下 | `SELECTION.md` |
| G5 节奏 | 使用 §7.2 默认 PACE，不调整 | README 写明 `?pace=` 的用法 |

**版本控制节点**（在分支 `feat/painted-skin` 上提交，并打**本地**轻量标签；不推送、不合并）：

| 节点 | 时机 | 提交信息 | 标签 |
|---|---|---|---|
| C0 | P0 完成 | `chore(PaintedSkin): 立项目录、计划文档与剧本 json 入库例外` | `ps-p0` |
| C1 | G1 自检通过 | `feat(PaintedSkin): 剧本 v2 + build-story 校验（八结局可达）` | `ps-g1-script` |
| C2 | P4 占位装配完成，且 verify.ts 通过 | `feat(_engine): story.js 自动播放剧情运行时`，再提交 `feat(PaintedSkin): 舞台/对话/选项/特效装配（占位图）` | `ps-p4-engine` |
| C3 | G2 挑选完成 | `doc(PaintedSkin): 风格与概念图挑选记录` | `ps-g2-concept` |
| C4 | G3 锁定 | `feat(PaintedSkin): 参考设定图与风格锁定` | `ps-g3-refs` |
| C5 | 背景、CG、封面接入 | `feat(PaintedSkin): 背景/CG/封面接入` | — |
| C6 | 立绘接入，G4 通过 | `feat(PaintedSkin): 立绘接入` | `ps-g4-art` |
| C7 | P5 验证全部通过 | `chore(PaintedSkin): 八结局走查与验证通过` | `ps-p5-verified` |
| C8 | P6 收尾 | `feat(PaintedSkin): 画皮——自动播放分支叙事，三线八结局` | `ps-done` |

途中修 bug 单独提交 `fix(PaintedSkin): ...`，不要混进上面的节点提交。

**断点续跑**：维护 `game_runs/PaintedSkin/PROGRESS.md`（入库），每完成一步就打勾，并记下当前阶段、已出图清单和阻塞项。每次开始工作前先读它：已完成的步骤、已存在且通过自检的图片都不重做。

**不提问**：自主模式下不向用户提问。本该问用户的事项一律写进最终报告的「待用户复核」。只有硬阻塞（如出图工具不可用、仓库状态异常）才停下；停下前先完成所有不依赖它的步骤（剧本、引擎、占位图装配、验证），并把阻塞写进 PROGRESS.md。

---

## 5. P0 立项

1. 从 `master` 切分支 `feat/painted-skin`。
2. 建 §3 的目录骨架。
3. `.gitignore` 在 `game_runs/**/*.json` 与 `!game_runs/games.json` 之后加一行：`!game_runs/PaintedSkin/story/*.json`
4. 提交：`chore(PaintedSkin): 立项目录、计划文档与剧本 json 入库例外`，连同本计划、`plans/painted-skin-agent-prompt.md` 与 `plans/shadow-abyss-auto-advance-issue.md`。
5. **提交纪律**：始终 `git add <明确路径>`，**禁止 `git add -A` / `git add .`**。工作区里 `.claude/settings.json` 有用户自己的未提交改动，不得混入。

---

## 6. P1A 剧本

### 6.1 世界规则（所有分支必须遵守，写作时不得违背）

| # | 规则 | 用在哪里 |
|---|---|---|
| R1 | 冤魂不得投生，除非：冤屈得雪且遗骨入土（再经超度），或者「觅代」——取一颗活人的心 | 她的处境与夙愿 |
| R2 | **心须甘愿相予**：强取的心会让鬼成为厉鬼、永不超生；只有甘愿给出的心才能续命或助人转生 | 她为何不取王生的心；献心、化心、替身 |
| R3 | 画皮是她**凭记忆画下的、生前的自己**。皮相每天都在褪色，每夜子时须揭下补画；补画前她要去井边守着自己的遗骨。皮被毁，就失去了「记得自己是人」的凭据，怨气失控。**与活人亲近（肌肤相亲）会加速皮相褪色**，因为阳气会灼蚀画皮。**皮与她相连**：皮被焚时，她无论身在何处都如遭火灼 | 窥窗、陈氏烧画、误杀；色心线皮相褪得更快 |
| R4 | 道士的戒与能力边界：他**不主动改变任何人的生死**（二十年前插手过一桩，救了一人，却害了一村）。他的道术只能「渡」与「护」：把别人**甘愿给出**的东西（性命、心、魂）渡给另一个人，或护住尸身与一缕魂魄。他不能凭空起死回生，也不能夺一人去救一人。他出手只有两种情形：有人甘愿付出、真诚相求（超度、护尸、渡命），或被激怒（诛灭、降服） | 道士的全部行为；也回答了「他凭什么有这种能力」 |
| R5 | 借来的心随主而去：陈氏的心在王生体内，若第七日（头七）陈氏未能复生，这颗心便随她停止 | 「黄泉」的成因——**不是自尽** |
| R6 | 亲手杀过人的魂魄染了血，化不成心，也得不到超度 | 「血债」「黄泉」 |
| R7 | 沈夫人内宅供着佛龛，她本人念珠不离手，鬼近不得身。所以她报不了仇，需要活人帮忙：把沈夫人带到井边，或让她当众认罪 | 她为什么需要王生和陈氏；陈氏为何以女眷身份进内宅 |

### 6.2 人物与动机

| 角色 | 表面 | 真实动机与来由 |
|---|---|---|
| 王生 | 心软、风流倜傥的书生 | 善良是真的，心动也是真的；考验在于分寸和信任。成婚数年无子，母亲来信催他纳妾；他知道妻子善妒，一直为此担忧 |
| 陈氏 | 端庄、明理、周济穷人 | 她的嫉妒其实是恐惧：无子是「七出」之一，她最怕丈夫纳妾。她和当年害死女鬼的正室，处在同一个位置 |
| 女鬼何梦盈（自称「阿绢」） | 抱襆独行的逃妾 | 生前被贪财的父母卖进沈府做妾，沈夫人因自己无子而妒恨，将她折磨后推入后院井中。她在路上寻找替身，选中王生，是因为看出他心软；王生守住分寸，她才改了主意，从「取他的心」变成「求他帮忙」 |
| 道士（道号止水） | 清静无为的游方道士 | 守着不插手因果的戒（R4），道号「止水」即此意。他最后肯出手，就是破了自己的戒 |
| 沈夫人（正室） | 年老的大户主母 | 当年因无子而害死了被买来生子的妾。如今年老、依旧无子、夜夜被那口井折磨。她是陈氏如果走错一步会变成的样子 |
| 婢女、沈府仆人等 | 被动人物 | 只出现在 CG 或旁白里 |

**镜像主题**：陈氏和女鬼是同一个妻妾制度的两端——陈氏怕的，是女鬼当年的身份；女鬼恨的，是陈氏如今的身份。在「妒」线里，她们都差点变成对方最恨的那个人。
**总主题**：人人都有一张皮。王生的善良下藏着欲望，陈氏的端庄下压着妒意，道士的超然底下是悲悯，她的美貌下面是苦。

### 6.3 剧本格式 v2

基于神曲（`game_runs/ShadowAbyss/story/divine-comedy.json`）的格式扩展，**支持多个变量与带条件的选项**：

```jsonc
{
  "meta": {
    "title": "画皮", "source": "借用蒲松龄《聊斋志异·画皮》设定的原创改编", "version": "2.0.0",
    "vars": {
      "xin": { "label": "心", "init": 0, "min": 0, "max": 100, "show": "haze" },  // 王生的心意，>=30 即动了色心；只在王生视角显示为胭脂晕
      "dao": { "label": "道", "init": 0, "min": -1, "max": 3, "show": false }     // 道士被触动的程度
    }
  },
  "cast": {                     // height = 全身高相对王生的比例（立绘归一化用）
    "nv": { "name": "女子", "rename": [ { "flag": "alias_known", "name": "阿绢" }, { "flag": "name_known", "name": "何梦盈" } ], "height": 0.92,
            "states": { "pitiful": "楚楚", "smile": "浅笑", "dressed": "梳妆后", "love": "含情" } }
  },
  "scenes": { "road_dawn": { "name": "晨雾官道", "tint": "#fff4ea" } },
  "cgs": { "portrait": { "name": "榻上美人图" } },
  "achievements": { "...": { "title": "...", "description": "..." } },
  "startNodeId": "a1_letter",
  "nodes": {
    "a1_home": {
      "card": "第一幕 · 遇",                 // 幕卡或插章卡：同一标题只出现一次
      "pov": "wang",                        // 视角人物；省略则沿用上一个节点
      "scene": "home_night", "cg": null,
      "onEnter": { "add": { "xin": 0 }, "set": {}, "addFlag": "x", "unlockAchievement": "ach_x" },
      "segments": [
        { "text": "……", "speaker": "chen", "stage": { "L": "wang:worry", "R": "chen:cold" } },
        { "text": "……", "fx": "heartbeat" }
      ],
      "choices": [
        { "text": "「告诉她。她会明白的。」", "next": "a1_market", "changes": { "set": { "xin": 0 }, "addFlag": "told" } },
        { "text": "「先不说……她的性子，你是知道的。」", "next": "a1_market", "changes": { "addFlag": "hid_fear" } },
        { "text": "「不说。这是我和她之间的事。」", "if": "xin >= 30", "next": "a1_market", "changes": { "addFlag": "hid_lust" } }
      ]
    }
  }
}
```

规则：
- **出口四选一**：`next`（单线，自动进入）、`choices`（必须 ≥2 个**可见**选项）、`routes`（条件路由）、`isEnding`。**禁止单选项**；需要生效的效果写进 `onEnter`。
- **条件语法**：`<变量> <op> <数>`（op 为 `>= <= > < ==`）、`hasFlag 'x'`、`!hasFlag 'x'`、`default`。routes 按数组顺序取第一个命中的；「且」靠顺序链表达。
- **效果**：`add`（增减）、`set`（赋值），再按各变量的 min/max 钳制；另有 `addFlag`、`unlockAchievement`。
- `choices[].if`：条件不满足时不显示该选项。build-story 必须证明**任何可达状态下**，可见选项都不少于 2 个。
- `stage` 是差量：键 `L/C/R`，值 `"角色:状态"` 或 `null`（离场）；`"clear": true` 清空全部。
- 选项文字以「」开头，表示视角人物说出口的话，选中后作为台词回显一次（可用 `"echo": false` 关闭）。
- `fx`：`inksplash`、`shake`、`flash`、`heartbeat`、`candle_out`、`fire`。
- **动机写进选项**：关键抉择的选项文字必须让玩家明白「为什么这么选」，例如上面三个选项分别对应信任、担忧和私心。

### 6.4 写作规范

- 叙述用第二人称「你」，指当前的视角人物。插章开头用插章卡注明「此刻，你是陈氏」。
- 语体为白话（2026-11-10 用户定，取代原先的「半文半白、借用原著台词」）。原著只作情节与设定来源，不直接引用文言台词；不用须、宜、勿、耳、甫、相予、得雪这类文言虚词和句式。可以保留妾、郎君、公子、子时、超度这类时代名词。改写记录见 `plans/painted-skin-baihua-plan.md`。
- 每段 `text` ≤ 60 字（硬上限 80）；选项 ≤ 18 字。全剧 8000–11000 字；最长路线按默认节奏 ≤ 20 分钟。
- **情感高点只说情、不说事**（用户定的原则）。临终、诀别、献心这类时刻，人物只表达爱、愧疚或不舍，不解释剧情。需要传达的事实交给物件（如银簪）、动作，或由旁人（道士）事后揭示。
- 亲密关系只作暗示（如「这一夜，你没有回家」），不写性内容。
- 恐怖与死亡遵守 D6：杀人只写动作、声音和后果；渡命、化心用「光」来表现，不写开胸；陈氏殉情只写她最后的话和旁人的反应，不写方式。
- 每个结局的「评语」用白话写一两句，不加「异史氏曰」前缀，**观点不必遵从原著**，要贴合本作「无脸谱」的主题。

### 6.5 剧情骨架（节点表）

> 这是**结构的锁定稿**，正文由你按 6.4 扩写。节点 id、出口、条件、旗标请照此实现；如需改动，在 G1 向用户说明。
> 立绘写法 `角色:状态`；角色 id 见附录 A.3。选项写法：代码样式里是选项原文，带「」的是说出口的话，不带的是动作。

**第一幕 · 遇（王生视角，三条线共用）**

| 节点 | 背景/CG | 立绘 | 剧情要点 | 出口 |
|---|---|---|---|---|
| a1_letter | home_hall | L wang:calm R chen:calm | 幕卡。清晨，母亲来信：「陈氏无出，宜早纳妾。」陈氏瞥见信，脸色冷了下来；转身却把蒸饼包给门口讨饭的妇人。确立：她心软，也善妒。王生知道她的性子 | **C1** `当着她的面把信烧了`(flag `letter_burned`) ／ `把信收进袖中`(flag `letter_kept`) → 都到 a1_road |
| a1_road | road_dawn | L wang:calm R nv:pitiful | 晨雾中遇见抱襆独行的女子，原著问答（「父母贪赂，鬻妾朱门……」）。旁白暗示：她的目光在他胸口停了一瞬 | **C2** `「先到我书斋避一避，我再替你寻个去处。」` ／ `「我送你去城中尼庵安身。」`(xin −10；她说尼庵会把逃妾送回去，含泪求他)→ 都到 a1_study |
| a1_study | study_in | L wang:calm R nv:smile | 「君何无家口？」「斋耳。」「如怜妾而活之，须秘密，勿泄。」他答应了。他问她的名字，她迟了一瞬，说：「叫我阿绢吧。」(flag `alias_known`) | next→a1_dress |
| a1_dress | study_in | R nv:dressed | 次日清晨推门，她正对镜梳妆，回眸一笑，美得不似人间。（反讽：这份美就是那张刚画好的皮） | **C3** `移开目光，问她可还缺什么` ／ `怔怔地看着她`(xin +20)→ 都到 a1_rain |
| a1_rain | study_night | C nv:dressed→love | 数日后雨夜，他来送灯油。她轻声说：「雨大，郎君今夜可留下？」 | **C4** `「我该回去了，内人还在等。」`(xin −10) ／ `留下`(xin +20)→ 都到 a1_home |
| a1_home | home_night | L wang:worry R chen:cold | 陈氏闻到他袖上的脂粉香（`letter_kept`：她还从他袖中摸出了那封信）：「书斋里，有什么？」 | **C5** `「告诉她。她会明白的。」`(set xin=0，flag `told`) ／ `「先不说……她的性子，你是知道的。」`(flag `hid_fear`) ／ `「不说。这是我和她之间的事。」`(**if** `xin >= 30`，flag `hid_lust`)→ 都到 a1_market |
| a1_market | market | L wang:calm R dao:stern | 道士顾生而愕：「君身邪气萦绕……此物亦良苦，甫能觅代者，予亦不忍伤其生。我不插手因果。」赠拂尘：「挂在家门，可保家宅。」 | **C6** `「请道长指点。」`(dao +1) ／ `「江湖术士，危言耸听。」`(dao −1，flag `dao_scorned`)；之后 routes：`hasFlag 'told'`→h_wife；`hasFlag 'hid_fear'`→f_secret；default→l_keep |

**坦诚线（told；「妒」线中对质或放回原处的路线也汇入这里）**

| 节点 | 背景/CG | 立绘 | 剧情要点 | 出口 |
|---|---|---|---|---|
| h_wife | home_hall | L wang:calm R chen:worry→calm | 幕卡「第二幕 · 皮」。陈氏想了一夜，妒意闪过（「又是一个逃妾……」），但她说：「明日我同你去看她。」 | next→h_meet |
| h_meet | study_in | L chen:calm R nv:pitiful | 两个女人第一次见面。陈氏看见她手腕上的旧伤痕（她连伤痕都照记忆画了上去），心软了，送她一件夹袄 | next→h_peek |
| h_peek | **cg window_peek** | L wang:fear | 子夜，王生替妻子送夹袄来，从窗缝看见一个青面鬼把人皮铺在榻上执笔补画。成就「画皮」 | **C7** `转身逃回家` → h_flee ／ `站在窗外，开口唤她` → h_truth |
| h_flee | bedroom_night | L wang:fear R chen:fear→resolve | 陈氏稳住他：「她若要害你，早就害了。我同你去问个明白。」(flag `fled`) | next→h_truth |
| h_truth | study_night | L wang:fear R gui:sorrow | 她以鬼相开口，说出真名「何梦盈」（flag `name_known`）、身世和沈府后院的井；也坦白自己起初是想取他的心的，是他守住了分寸，她才没有下手。夙愿：讨回公道，入土为安 | next→h_help |
| h_help | home_hall | L wang:resolve R chen:resolve | 夫妻分工：陈氏以女眷身份去沈府探内宅，王生去求道士 | next→h_dao |
| h_dao | temple | R dao:stern | 道士拒绝，讲起二十年前的旧事（R4）。（`dao_scorned`：他冷冷提起市集上那句「江湖术士」） | **C8** `「她的冤，总得有人管。」长跪不起`(dao +1) ／ `「那我们自己来。」拂袖而去` → 都到 h_shen |
| h_shen | shen_inner | L chen:calm R shen:haughty→terror | 插章卡「此刻，你是陈氏」。陈氏拜访沈夫人，提起后院那口井，沈夫人顿时变色。陈氏在这个年老、无子、被恐惧啃噬的女人身上，看见了自己 | next→h_well |
| h_well | shen_well | L wang:resolve R gui:rage→sorrow；C shen:terror | 回到王生视角。夜里，井中寻得遗骨（**cg well_bones**），沈夫人跪地。她转头问王生：「你说，我该怎么做？」 | **C9** `「让她去公堂认罪，还你名分，入土为安。」`(flag `justice`)→h_justice ／ `「……这是她欠你的。」`(flag `blood`)→h_blood |
| h_justice | grave_dawn | R gui:calm→nv:smile | 沈夫人当堂认罪，遗骨入土 | routes：`dao >= 2`→**E1**；default→**E2** |
| h_blood | shen_well | R gui:rage | 她亲手了结了沈夫人（只写声音、fx inksplash）。魂魄染血（R6），道士被迫出手 | next→**E3** |

**隐瞒线·担忧（hid_fear）→「妒」**

> 下表最右列标注了**此时谁知道什么**，写作时不得越界。

| 节点 | 背景/CG | 立绘 | 剧情要点 | 出口 | 知情 |
|---|---|---|---|---|---|
| f_secret | study_in | L wang:calm R nv:smile | 幕卡「第二幕 · 皮」。王生瞒着妻子暗中帮她。她午睡时梦呓，喊出「沈府」「井」。王生没有问她，也没告诉妻子，决定自己去沈府打听，想给她一个惊喜 | next→f_chen | 王生：她是逃妾（不知是鬼），只知道「沈府」和「井」。陈氏：只是起疑。女鬼：**不知道他要去沈府** |
| f_chen | home_night | C chen:cold | 插章卡「此刻，你是陈氏」。他又一夜未归（其实正在沈府打听）。脂粉香、晚归、搪塞——（`letter_kept`：还有那封催纳妾的信）。她提灯去了书斋 | next→f_portrait | 陈氏：确信书斋里有个女人，但**从没见过她** |
| f_portrait | **cg portrait** | L chen:cold→fear | 书斋空无一人，榻上铺着一幅与真人等大的美人图，绢上的人栩栩如生。她心想：人走了，他竟还画了她的像日夜对着 | **C10** `烧了它` → f_burn ／ `卷起来，等他回来对质` → f_confront ／ `放回原处，装作不知` → f_replace | 陈氏：以为是**一幅画**，不知是人皮、不知她是鬼 |
| f_confront | study_night | L chen:resolve R wang:fear | 王生回来，摸到那卷「画」柔软如肌肤，认出了那张脸，毛骨悚然。他向妻子坦白一切（flag `told`）。两人一起等她回来 | next→h_truth | 夫妻：知道有异，尚不知是鬼 |
| f_replace | home_hall | L chen:cold R wang:worry | 陈氏什么也没说。次日女子对王生说「昨夜有人来过」，王生明白妻子已经知道了，向她坦白（flag `told`） | next→h_meet | 同上 |
| f_burn | **cg burning** | L chen:cold | 她把画投进火盆，冒出一股古怪的焦味，像烧着了头发 | next→f_flee | 陈氏：以为烧的是画 |
| f_flee | courtyard_night | L chen:fear R gui:rage | 仍是陈氏视角。同一时刻，沈府井边的她浑身如遭火灼（R3），立刻往回赶。陈氏刚出书斋，就看见一个没有皮相的女人从夜色里扑来。她往挂着拂尘的正房跑，在门前几步被追上。「你烧了我的脸……你和她一样！」——她在陈氏身上看见了当年的沈夫人。陈氏看见那颗朱砂痣，认出了画上的脸 | next→f_shield | 陈氏：明白那幅「画」是一张脸，但不知道她是谁、为何在此。女鬼：只知道是这个正室毁了她的皮，不知道王生去了沈府 |
| f_shield | **cg shield_shadow** | — | 王生从沈府回来，走的是同一条路，只慢她一步。他扑上去，挡在妻子身前。fx inksplash。成就「误」 | next→f_last | 王生：只看见一个怪物扑向妻子 |
| f_last | **cg aftermath** | L chen:remorse R gui:rage→sorrow | 王生倒在妻子膝上。他看见了她左眼下的朱砂痣，认出了她，只看了她一眼，没有怨。然后他抚着妻子的鬓发：**「你还是像我们初见时那样美……以后，一定要好好活下去。」**（此句由用户定稿，保留原意）他死了。袖中滑出一支沾着井泥的银簪，是她生前戴的那支。她认出了它，怨气骤然断了 | next→f_truth | 女鬼：从银簪明白他去井边替她找过遗骨。陈氏：只知道丈夫为她而死 |
| f_truth | courtyard_night | L chen:remorse R dao:angry→calm；C gui:sorrow | 幕卡「第三幕 · 心」。道士赶到（画皮被焚时怨气冲天，他察觉到了）。他解开的是**两个女人之间的误会**：对陈氏，她不是勾引你丈夫的妖物，是被正室害死的妾，他是去替她找遗骨；对她，陈氏烧的是一幅以为是情敌的画像，不知道那是一张脸。道士没有提任何救人的办法 | next→f_xunqing | 所有人都知道了误会的真相 |
| f_xunqing | courtyard_night | L chen:remorse R dao:calm；C gui:sorrow | 仍是陈氏视角。她明白了：是她的妒害死了他，而他到死都护着她。她轻轻理好他的鬓发：「你说我还像初见时那样美……可那时候，我眼里也只有你。」道士转身去看女鬼的那一刻，她殉情了（留白：fx candle_out，不写方式）。道士回身时，她尚有一口气。他跪下问：「你可愿把这口气给他？」她只答两个字：「……给他。」（R2 甘愿；道士没有替她做决定） | next→f_seal | 陈氏：知道全部真相 |
| f_seal | **cg heart_wang** | R dao:act | 道士渡命：她的心火渡入王生胸中。随后他以符护住她的尸身与一缕魂魄，只说一句：「七日。我只能护她七日。」不解释原因。女鬼一直站在暗处，一言不发 | next→f_wake | 玩家与王生：都不知道为什么是七日。**幕后（结局才揭示）**：女鬼私下跪求道士护住陈氏的尸身，许诺冤屈得雪之后以魂相换，成全二人：「他们两个，本该好好过日子的。」道士被打动（R4） |
| f_wake | bedroom_night | L wang:weak R dao:calm | 王生视角。他带着妻子渡来的性命醒来，得知她为他殉情，不愿独活。他打算先在七日之内帮她了却夙愿，然后随妻子而去。（他死前已在沈府找到了那口井，银簪就是从井边拾回的） | next→f_well | 王生：知道妻子殉情和七日之限，不知道女鬼的约定 |
| f_well | shen_well | L wang:grief R gui:sorrow；C shen:terror | 井中遗骨（**cg well_bones**），沈夫人跪地。她问王生：「你说，我该怎么做？」道士在一旁只说了一句：「手上沾了血的魂，就什么也给不了别人了。」（R6 的暗示：公平提醒玩家，但不点破约定） | **C11** `「让她去公堂认罪……然后，你去吧。」`(flag `justice`)→**E4** ／ `「……这是她欠你的。」`(flag `blood`)→**E5** | |

**隐瞒线·色心（hid_lust）**

| 节点 | 背景/CG | 立绘 | 剧情要点 | 出口 |
|---|---|---|---|---|
| l_keep | study_night | C nv:love | 幕卡「第二幕 · 皮」。他打算把她收作外室，金屋藏娇。她也喜欢上了这个风流倜傥的书生，甚至忘了自己为什么而来（「我好像……忘了一件很要紧的事」）。她的皮相褪得越来越快 | next→l_peek |
| l_peek | **cg window_peek** | L wang:fear | 子夜，他想给她一个惊喜，悄悄来到书斋，从窗缝里看见了画皮 | **C12** `逃` → l_flee ／ `留下来` → l_stay |
| l_stay | study_night | R gui:sorrow→nv:love | 她羞愧地承认：皮快撑不住了，没有一颗心，她就要散了；可她不会取他的心（R2） | next→**E8** |
| l_flee | home_night | C wang:fear | 幕卡「第三幕 · 心」。他逃回家，看着熟睡的妻子，心如乱麻 | **C13** `回去放一把火，烧了书斋` → l_fire ／ `去找那个道士` → l_dao |
| l_fire | **cg study_fire** | R gui:rage | 火起时她还在里面，被逼到绝路，自卫中杀了他 | next→**E6** |
| l_dao | temple | R dao:stern | 道士拒绝：「是你招来的，也是你欠她的。」（`dao_scorned`：多一句冷语）他回去自己放了火 | next→l_fire2 |
| l_fire2 | **cg study_fire** | R gui:rage→dao:act | 她在火中杀了他。道士循着怨气赶到，降服了她 | next→**E7** |

### 6.6 结局表

| id | 标题 | 类型 | 触发 | 结语要点 |
|---|---|---|---|---|
| E1 | 公道 | true | 坦诚线 · 讨公道 · dao ≥ 2 | 道士破戒为她超度；她以生前的模样（nv:smile）道别，去投生。夫妻照常过日子，陈氏又一次把蒸饼包给了门口的妇人 |
| E2 | 未度 | normal | 坦诚线 · 讨公道 · dao < 2 | 公道讨回了，却无人超度；皮上的颜色一天天褪去，某个清晨，她散成了纸上的墨痕（**cg fade**） |
| E3 | 血债 | bad | 坦诚线 · 血债 | 她报了仇，再也不能投生；道士将她降服。王生一家平安，却成了帮凶 |
| E4 | 同心 | true | 妒线 · 讨公道 | 第七日夜，道士才说出那个约定（闪回：那夜她跪在道士面前）。她的魂魄干净，放弃转生，化作一颗心，经道士之手进入陈氏体内（**cg heart_chen**）。清晨陈氏醒来，左眼下多了一颗朱砂痣。王生对她说：「好好活下去。这回，我们一起。」——呼应他临终的遗愿 |
| E5 | 黄泉 | bad | 妒线 · 血债 | 染血的魂魄化不成心（R6）。第七日，道士才说出那个约定，已经来不及了。王生守在妻子身边，胸中那条借来的命随主而去（R5，**不是自尽**） |
| E6 | 自卫 | bad | 色心线 · 直接放火 | 他死在自己点起的火里；她在废墟中游荡，忘了来时的路 |
| E7 | 焚屋 | bad | 色心线 · 求道士被拒后放火 | 他死了，她被降服；道士在灰烬前站了很久 |
| E8 | 替身 | normal | 色心线 · 留下 | 他把心甘愿给了她（R2）。她去投生了；陈氏只看见丈夫安详地睡去，再没醒来 |

结局节点字段：`"isEnding": true, "ending": { "id": "E4", "title": "同心", "type": "true", "closing": "...", "commentary": "仿异史氏曰：...", "achievement": "ach_e4" }`。

**规划阶段已预跑骨架路线枚举**：8 个结局全部可达；每局 6–10 个选择；色心选项只在 C3 选「怔怔地看」且 C4 选「留下」时出现（`xin >= 30`）；E1 需要 C6 和 C8 都选真诚的选项。改动数值后必须由 build-story 重新验证。

### 6.7 待用户在 G1 确认的剧情点（规划时的默认值）

1. ~~陈氏献心是固定剧情还是玩家选择~~ **已定（用户）**：固定剧情，改为**陈氏殉情**。道士只在她尚存一口气、亲口同意后渡命（R2、R4），不承担「杀一救一」的道德困境。
8. **女鬼私下的约定何时让玩家知道**：默认藏到结局，由道士揭示；f_well 只给一句暗示。另一种做法是当场演给玩家看（玩家知道、王生不知道），但那样 C11 几乎没人会选「血债」。
2. ~~名字~~ **已定**：女鬼原名何梦盈（用户定），初见时自称「阿绢」，只在说出身世时报出真名；色心线里王生到死都只知道「阿绢」。那户人家姓沈（沈府、沈夫人，避开「梦」与「孟」同音）；道士道号止水。
3. **「黄泉」的成因**：默认是借来的心随主而去（R5），不呈现自尽。
4. **色心线始终不揭示她的身世**：默认不揭示。玩家要到坦诚线才知道她是谁，这本身就是重玩的理由。
5. **世界规则 R1–R7 是自创的**，尤其是 R2「心须甘愿相予」，请用户确认。
6. **R7（佛龛与念珠护身）**：用来回答「她为什么不自己去报仇」。默认采用。
7. **R3 补充（亲近会加速皮相褪色）**：用来回答「色心线里她的皮为什么撑不住」。默认采用。

### 6.8 build-story 工具（`tools/build-story.mjs`）

用法：`node game_runs/PaintedSkin/tools/build-story.mjs [--strict]`。按以下顺序执行，**有错误就不生成** storyData.js：

1. **结构**：每个节点恰好一种出口；所有 next/route 目标都存在；routes 最后一项是 default；没有不可达节点；没有无出口的环。
2. **文本**：段落超过 60 字警告、超过 80 字报错；选项超过 18 字警告。
3. **引用**：speaker 与 stage 里的角色、状态都在 `cast` 中；scene、cg id 都在表里；fx 在枚举内；变量名都已声明。
4. **路线枚举**：带状态（全部变量与旗标）做深度优先，穷举所有路线。断言：
   - 8 个结局全部可达；
   - **任何可达状态下，选择节点的可见选项都不少于 2 个**；
   - 按结局统计路线数、选择次数最少和最多、字数、默认节奏下的时长；
   - 输出每个结局的「最短选择序列」，供 walk-endings 使用。
5. **素材用量**：汇总实际用到的「角色:状态」、背景、CG → `art/USAGE.md`；与 `assets/manifest.js` 比对缺图（默认警告，`--strict` 报错）。
6. **生成**：`game/storyData.js`（`window.HuaPi.STORY = {...}`）；`story/READ.md`（按线展开的可读剧本，标出每个选项的去向，「妒」线附知情表）；`story/LINT.md`。

提交：`feat(PaintedSkin): 剧本 v2 + build-story 校验`。

### 6.9 ▶ 门 G1：剧本审读

呈现：`story/READ.md`、`story/LINT.md`（结局可达表、时长、选择密度）、`art/USAGE.md`，以及 §6.7 的确认项。
等用户确认或给出修改意见。**剧本定稿之前不进入 P3**，因为立绘清单由剧本决定。

---

## 7. P4 引擎与装配（G1 之后即可开始，与出图并行，先用占位图）

### 7.1 `_engine/story.js`：共享运行时

- 导出 `window.StoryRuntime`（类），**纯逻辑、不依赖 Phaser**；时间调度由调用方注入：`opts.schedule(fn, ms) → cancel()`（游戏里用 Phaser 的 `scene.time`）。
- 构造：`new StoryRuntime(storyData, view, { paceMul, fast, schedule, onEvent })`。
- 状态：`{ nodeId, pov, vars:{}, flags:Set, achs:Set, path:[], lineIdx, typing, choicesOpen, ended, endingId }`。
- 进入节点的流程：幕卡或插章卡（同一标题只出一次）→ 切换视角、背景、CG → 执行 `onEnter` → 段落依次播放 → 出口：
  - `next`：自动进入；
  - `routes`：立即求值后进入；
  - `choices`：按 `if` 过滤后调用 `view.showChoices`，**无限期等待**；
  - `isEnding`：调用 `view.showEnding`。
- 给 view 的接口（由游戏实现）：`setPov(id) / setScene(id) / setCG(id|null) / setStage(diff) / typeLine(seg, onTyped) / completeTyping() / showChoices(list, onPick) / showCard(title, subtitle, done) / showEnding(node) / fx(name) / onVars(delta, vars) / onAch(id)`。
- 对外方法：`advance()`（打字中 → 立即打完；已打完 → 立即下一句）、`choose(i)`（i 是**可见**选项的序号）、`probe()`、`jump(nodeId, { vars, flags })`（调试用）。
- 设计上要能兼容神曲日后的迁移：神曲的 `val` 映射为单一变量，`changes.val` 映射为 `add`。本期不碰神曲。

### 7.2 自动播放节奏（D7，默认值写进 `config.js` 的 `PACE`）

| 参数 | 默认 | 含义 |
|---|---|---|
| `typeCps` | 30 | 打字速度：每秒 30 字 |
| `charMs` | 150 | 阅读时长：每字 150ms（约每分钟 400 字） |
| `tailMs` | 900 | 每句额外停留 |
| `minMs` | 1800 | 每句最短停留 |
| `cardMs` | 2500 | 幕卡、插章卡停留 |
| `choiceDelay` | 0 | 最后一句**打完字**就出现选项 |

- 每句停留 = `max(minMs, 字数 × charMs + tailMs) × paceMul`，从这句开始显示时计时。
- 点击、Space、Enter 只用来加速；数字键 1–3 选择选项。
- URL 参数：`?pace=1.3`（用户调节倍率）、`?fast`（测试用，倍率 0.02）。
- 幕卡、条件路由、`next` 全部自动，**全程不出现「继续」按钮**。

### 7.3 舞台（立绘）

- 画布 1280×720（Phaser `Scale.FIT`）。三个站位中心：L = 0.25W，C = 0.5W，R = 0.75W。
- 立绘成品统一画布 640×1100，脚底在 y=1080（§9.4）。显示缩放 1.0，画布顶贴屏幕顶，露出头到大腿中部，下半身被对话框遮住。
- 说话人高亮：说话的站位原亮度；其他站位乘色 `0x8a8a8a`、缩放 0.98。旁白时视角人物正常，其余变暗。
- 过渡：同一角色换状态 → 交叉淡化 180ms；入场或离场 → 淡入淡出加横移 24px，250ms。**nv ↔ gui**（皮相与鬼相互换）用专门的「墨化」过渡：600ms，配合 fx inksplash 的弱化版。
- 场景乘色：`scenes[id].tint` 作用于所有立绘。
- **禁止 flipX**：汉服右衽，镜像会变成左衽（寿衣或胡服的穿法，文化错误）。
- tween 注意：播完的 tween 引用必须在 `onComplete` 里放掉，删除前先检查它是否还挂着（已知会崩溃的坑）。

### 7.4 对话框

- 区域 y 540–720；宣纸质感半透明底（不透明度 0.88）+ 墨线描边；名牌在框左上外侧。名牌按 `cast.rename` 依次切换（取最后一个已满足的旗标）：初见为「女子」，她自称后为「阿绢」，说出身世后为「何梦盈」。
- 正文 26px，行高 1.5，每句最多 2 行，折行宽度 1120。
- ~~「余音」~~（2026-11-09 删除）：原设计在框上方重复显示前两句。实测叙述占 88%，几乎每行都是「旁白：」前缀；浅底上白字难读、压在立绘上，选择时与选项、正文三层文字同屏，很累。节奏每字 150ms 已足够读完，漏看风险低，故整层删除，对话框外不再出现重复文字。

### 7.5 选项

- 背景罩一层黑色（不透明度 0.35），按钮居中竖排，宽 600、高 64，代码绘制笔刷质感底；悬停时墨晕扩散。
- 选中后：选中项闪一下，其余 250ms 淡出；若是「」台词则回显（§6.3）。
- 选择是全游戏唯一的必需操作，要投入手感预算。

### 7.6 「心」的呈现（只在王生视角）

- 不显示数字。屏幕四周一圈胭脂色晕（`#c96f7a`），不透明度 = 0.04 + xin/100 × 0.30；xin 变化时晕染随之呼吸一下，不飘数字。
- 窥窗（h_peek / l_peek）时胭脂晕随墨溅碎散；C5 选择坦白时晕染淡出（「说出口，心里那点念头就散了」）。
- 切到陈氏视角时隐藏。

### 7.7 CG 与特效

- 图层从下到上：背景 → CG（交叉淡化 400ms）→ 立绘 → 对话框 → 选项 → 特效 → 心晕/提示。
- 特效：
  - `inksplash`：代码生成的红黑墨团，扩散后淡出；
  - `shake`：相机震动 200ms；
  - `flash`；
  - `heartbeat`：暗角脉动 3 次；
  - `candle_out`：600ms 压到近黑再回来；
  - `fire`：底部升腾的暖色光晕 + 飘散火星，代码粒子。
- 遵守 `prefers-reduced-motion`：关闭 shake、减弱 flash。

### 7.8 幕卡与结局

- 卡片：全屏水墨，标题 + 副标题，停留 `cardMs` 后自动消失。
- 结局：墨色淡出 → 标题、类型、结语、评语（白话，无前缀）、本局解锁的成就 →「R / 点击 重新读」。不记录跨局数据。

### 7.9 音效（可选）

如果 `_engine/audio.js` 便于接入，只加四个程序化音效：落笔（选择）、心跳、墨溅、火；M 键静音。接不了就跳过，不阻塞。

### 7.10 占位与降级（保证出图前就能跑）

- 缺背景 → 按场景色板画竖向渐变，左下角小字写场景名。
- 缺立绘 → 灰色圆角剪影（360×1000），标签写「王生·惊惧」。
- 缺 CG → 显示当前背景 + 居中说明文字。
- 只加载 `manifest.js` 中列出的文件，不能出现 404（verify 门见 404 即判失败）。

### 7.11 对外契约（CLAUDE.md 要求，不可省）

- `window.__probe()` → `{ started, nodeId, pov, vars, flags, achievements, lineIdx, typing, choicesOpen, choiceCount, ended, endingId, won, pathLen, bg, cg, stage:{L,C,R} }`，其中 `won` = 结局类型为 normal 或 true。
- `window.__gameState` = 运行时状态；`window.__hudStart()`；`window.__advanceCard()` 与 `window.__advance()` 都映射到 `advance()`；`window.__choose(i)`。
- `?autostart` 或 `navigator.webdriver` → 跳过 START 直接开始，并自动启用 `fast`。
- 调试参数：`?node=f_portrait&vars=xin:0,dao:1&flags=hid_fear,letter_kept`（直接跳到节点）；`?bot=0,1,0`（按序选择可见选项，供走查脚本使用）。

提交：`feat(_engine): story.js 自动播放剧情运行时`、`feat(PaintedSkin): 舞台/对话/选项/特效装配（占位图）`。

---

## 8. P1B 概念图（与 P1A 并行）

全部原图存 `assets/concept/raw/`。提示词模板与角色描述见附录 A、B。

1. **风格测试 6 张**：两个场景（`road_dawn` 白天、`study_night` 夜晚）× 三档水墨浓度：
   - a = 淡彩为主、留白多；
   - b = 浓墨重彩；
   - c = 以墨为主、只点少量颜色。

   文件名 `st_road_a/b/c.png`、`st_night_a/b/c.png`。
2. **角色概念图 16 张**：
   - 王生、陈氏、女子（皮相）、道士各 3 版；
   - 鬼相、沈夫人各 2 版；
   - 鬼相的概念图以女子概念图的轮廓为基础构思，等 G2 选定女子之后再出也可以。
3. 生成两张拼图：`playtest/review/concept_chars.png`（按角色分行）和 `playtest/review/style_tests.png`。

### ▶ 门 G2：概念挑选

呈现两张拼图，附你的推荐。用户为每个角色选一版（可以要求组合修改），并选一档风格。记入 `art/SELECTION.md`。若有组合修改，先改出图，再请用户确认一次。

---

## 9. P2 定稿参考 → P3 量产

### 9.1 P2：参考设定图与风格锁定

- **风格参考**：把选中的两张风格测试图复制为 `assets/refs/raw/style_day.png`、`style_night.png`（webp 备份到 `art/refs/`）。**之后每张背景和 CG 都以它们作为输入参考。**
- **参考设定图 6 张**（`rs_<角色>`），以选中的概念图作输入：
  - 正面、四分之三侧面、背面全身；
  - 一排头部特写（表情见附录 B.3）；
  - 浅灰底，无文字。

  `rs_gui` 必须同时以 `rs_nv` 作输入：脸型轮廓相同，左眼下有同一颗朱砂痣。
- **融合测试**：
  1. 出一张 `lh_wang_calm`（按 §9.3 模板）；
  2. 用 process-art 抠图；
  3. 合成到两张风格参考上，生成 `playtest/review/harmony_day.png`、`harmony_night.png`。

  如果违和，**先在代码侧调**（立绘乘色、纸纹叠层、背景饱和度），调不好再回头改出图提示词。

### ▶ 门 G3：参考锁定

呈现 6 张参考设定图的拼图 + 两张融合测试图。锁定后，参考图就是各角色的「身份锚」，之后任何出图都不得偏离。

### 9.2 P3a：背景、CG、封面

- 背景 13 张、CG 10 张、封面 1 张，清单与提示词见附录 B.4–B.6。
- 变体背景（`home_night`、`study_night`、`bedroom_dawn`）**必须以母版背景作输入、只改指定部分**。
- 原图存 `assets/bg/raw/<场景>.png`、`assets/cg/raw/<id>.png`。

### 9.3 P3b：立绘

- 立绘清单以 `art/USAGE.md`（G1 定稿后）为准；附录 B.7 是按骨架预估的 27 张。
- 顺序：每个角色先出**基础立绘**（以参考设定图作输入），再以基础立绘作输入、只改表情或手势，出变体。服装或形态不同的（如 `nv:dressed`、`wang:weak`、`dao:act`）算新的基础立绘，仍以参考设定图作输入。
- **底色**：所有角色用纯绿 `#00FF00`；**鬼相 gui 用纯品红 `#FF00FF`**（面色青绿，绿幕会把脸抠穿）。
- 原图存 `assets/lihui/raw/<角色>_<状态>.png`。

### 9.4 process-art 工具（`tools/process-art.mjs`）

从 `game_runs/PokeMood/tools/process-bg.mjs` 移植（sharp），用法：
`node game_runs/PaintedSkin/tools/process-art.mjs [--only=bg|cg|lihui] [--id=wang_calm] [--threshold=N] [--soft=N] [--preview=<bg>,<角色:状态>,...]`

- **bg / cg**：等比铺满裁切到 1280×720 → webp（质量 82）。
- **lihui**：
  1. **底色自动检测**：取边框像素的中位数作为抠图色，同时适用于绿底和品红底。AI 出的「纯色底」常是哑光色，每张还略有漂移，不要写死色值。
  2. 色距阈值 + 软边 + 去溢色：边缘带里把底色所在的通道压回去。绿底时 g ≤ max(r, b)；品红底时 r 和 b 压到不超过 g 加上原有差值，具体按检测到的色相推广。
  3. 去小孤岛：保留最大连通块和面积超过阈值的块（例如手持的拂尘、木剑）。
  4. **空图拦截**：不透明像素占比 < 5% → 报错。出图 agent 偶尔会静默产出纯色空图。
  5. 包围盒等于整张画面 → 报错，提示底色没抠掉。
  6. **归一化**：按包围盒（头顶到脚底）缩放到 `1040 × cast.height`。水平锚点取上 35% 行（头和肩）的 alpha 质心，避免道具把人物推偏。输出画布 640×1100，脚底 y=1080 → webp（质量 86，alphaQuality 100）。
  7. 个别图允许在 `art/PROMPTS.md` 的覆盖表里写 `scaleOverride` / `xOffset`。
- **manifest.js**：`window.HuaPi.ART = { bg:{...}, cg:{...}, lihui:{ "wang:calm": "assets/lihui/wang_calm.webp", ... } }`。
- **审查拼图**（输出到 `playtest/review/`，不入库）：
  - 每个角色一张：全部状态并排，按运行时尺度，分别铺在中灰底和夜景背景上；
  - `--preview` 生成指定组合的场景合成图。

  **审查图必须与运行时同尺度**。

### 9.5 每张图出图后的自检（交给门之前）

- [ ] 没有任何文字、书法、红色印章、落款、水印（水墨风提示词特别容易冒出印章和题字）。
- [ ] 立绘：纯色底（gui 为品红）；头顶到脚底完整；无地面阴影；绿底角色的服饰无绿色或青色；右衽；与参考设定图一致——脸、发型、配色、标志物（nv 与 gui 左眼下的朱砂痣）。
- [ ] 背景：没有人物；底部 1/4 平静；左右三分区在人物高度上没有焦点物。
- [ ] CG：恐怖间接（D6）；没有伤口、内脏、断首；画中人物与参考设定图一致。
- [ ] process-art 无报错。

### ▶ 门 G4：量产审图

呈现：
- 每个角色的立绘拼图、背景拼图、CG 拼图；
- 关键场景合成图：a1_dress、a1_home、f_portrait、f_flee、f_last、h_well。

用户点名重出的图记入 `SELECTION.md`，重出后再呈现一次。
提交：`feat(PaintedSkin): 背景/CG/立绘接入`（只提交 webp、manifest.js、art/*.md、art/refs/*.webp）。

---

## 10. P5 验证

按序执行，全部通过才能进 G5：

1. `node game_runs/PaintedSkin/tools/build-story.mjs --strict`：零错误、8 个结局全部可达、任何可达状态下可见选项都不少于 2 个、素材覆盖 100%。
2. `npx tsx skills/game-verify/verify.ts PaintedSkin --keys=SPACE,ENTER --seconds=6`：L0/L1/L2 全绿（L2 靠自动播放让画面持续变化）。参数含义见 `skills/game-verify/SKILL.md`。
3. `node game_runs/PaintedSkin/tools/walk-endings.mjs`（自己起本地 http 服务；file:// 会被 CORS 拦）：
   - 对每个结局，用 build-story 给出的最短选择序列以 `?fast&bot=<序列>` 走完，断言 `endingId` 正确、全程零控制台错误；在每个选择点和结局处截图到 `playtest/walk/`。
   - **色心选项可见性**：断言 C5 只在 `xin >= 30` 时出现第三个选项。
   - **自动播放回归（本作相对神曲的核心改进）**：用正常节奏（不带 fast）、**不发送任何输入**跑 60 秒，断言 `lineIdx` 或节点在持续推进，且 `choicesOpen` 为假时从不停住等输入。
   - **驱动方式**：在页面内用一个 `page.evaluate` 循环驱动 `__advance` / `__choose`，**不要靠真实时间等待计时器，也不要从 node 端逐次往返发命令**。无头 Phaser 的计时器会严重滞后（实测 delayedCall 慢约 6 倍），node 端每次往返约 300ms，曾因此把好代码误判成坏的。
4. `skills/game-playtest/play.ts` 针对移动和战斗类游戏，不适用于叙事游戏，由 walk-endings 代替，在 README 中注明。

### ▶ 门 G5：试玩定节奏

告诉用户本地启动方式（例如在仓库根目录 `npx http-server -p 5500`，然后打开 `http://127.0.0.1:5500/game_runs/PaintedSkin/index.html`），以及 `?pace=`、`?node=` 的用法。用户试玩后给出倍率，写进 `config.js` 的 `PACE` 默认值。

---

## 11. P6 收尾

1. `game_runs/games.json` 追加：
   `{ "id": "PaintedSkin", "title": "画皮", "tagline": "人人都有一张皮。", "gameType": "branching-narrative", "genre": "ADVENTURE", "accent": "#c96f7a", "previewBg": "#0d0b0c", "icon": "🖌️", "thumbnail": "PaintedSkin/assets/cg/cover.webp", "previewVideo": "PaintedSkin/preview.mp4", "path": "PaintedSkin/index.html", "createdAt": "<ISO 时间>" }`
2. `preview.mp4`：10 秒，建议截 a1_dress（梳妆回眸）→ 窥窗 CG → 选项出现这一段。可用 Playwright 的 recordVideo 录制。入库。
3. `README.md`：工具用法、URL 参数、目录说明、「play.ts 不适用」的说明。
4. 提交：`feat(PaintedSkin): 画皮——自动播放分支叙事，三线八结局`。不推送、不合并，交给用户决定。

---

## 附录 A — 美术设定（落地为 `art/ART_BIBLE.md`）

### A.1 风格前缀（每条提示词都要拼上）

**立绘与人物前缀 `[CHAR]`：**
> Chinese-style anime character illustration (guofeng anime), clean refined lineart, soft cel shading with light painterly rendering, delicate expressive face, accurate Ming-dynasty hanfu with right-over-left crossed collar (youren), realistic layered fabric folds, muted elegant palette, even soft front lighting, high detail, no text, no watermark, no logo, no seal stamp.

**背景与 CG 前缀 `[INK]`：**
> Traditional Chinese ink wash painting with light color washes (shuimo with pale mineral color), visible xuan paper texture, expressive brushwork, generous negative space, soft drifting mist, muted palette of ink black, warm grey, pale ochre, indigo and touches of rouge, cinematic 16:9 composition, no people unless specified, no text, no calligraphy, no red seal stamps, no signature, no watermark.

### A.2 色彩走向

- 第一幕「遇」：晨与昼，暖灰加胭脂点缀，雨夜转冷。
- 第二幕「皮」：书斋夜色的冷靛加烛光暖黄；沈府是压抑的深赭与铁灰。
- 第三幕「心」：坦诚线走向黎明的冷转暖；妒线是夜与火的赭红；色心线是火光。
- **绿底角色的服饰避开绿色和青色**。鬼相面色青绿，所以用品红底。

### A.3 角色卡（id / 角色 / 身高比 / 英文描述 / 设计要点）

| id | 角色 | 身高比 | 英文描述（拼在 `[CHAR]` 后） | 设计要点 |
|---|---|---|---|---|
| wang | 王生 | 1.00 | Wang Sheng, a Taiyuan scholar about 25, slender and handsome with a gentle, slightly irresolute face and a charming smile, thin brows, black hair in a topknot under a black square scholar's cap (fangjin), moon-white zhiduo robe with indigo collar trim, cloth belt with a small jade pendant, black cloth shoes | 风流倜傥，但不英武；善良与软弱同在 |
| chen | 陈氏 | 0.94 | Lady Chen, the scholar's wife about 24, dignified and intelligent, calm eyes with a guarded edge, hair in a neat married woman's bun with a silver hairpin, ochre-red ao jacket over an indigo mamian pleated skirt | 端庄、坚韧；眼神里有戒备 |
| nv | 女子（皮相） | 0.92 | a breathtaking young woman about seventeen, oval face, long phoenix eyes with a faint unreadable sadness, **a tiny red mole under her left eye**, long black hair in a loose maiden style with one plain silver hairpin, pale lotus-pink and moon-white ruqun with a light silk shawl; in her first scene she carries a small cloth bundle | 美得无可挑剔，带一丝说不清的哀；朱砂痣是贯穿全剧的标记 |
| gui | 女鬼（鬼相） | 0.92 | the same woman's true ghost form: the same face shape and the same red mole under her left eye, but skin pale jade-green, eyes dark and hollow, sharp jagged teeth glimpsed when she speaks, long black hair loose and wild, a ragged faded version of the same lotus-pink clothes, faint water stains (she drowned) | 可怖，但看得出是同一个人；要能表达悲伤，不只是凶相 |
| dao | 道士 | 1.02 | a wandering Taoist about 50, lean, sharp but weary eyes, long thin beard, black-grey Taoist robe with yellow trim, hair in a topknot with a lotus crown and wooden pin, white horsetail fly-whisk, peach-wood sword on his back, gourd at his waist | 超然之下藏着旧伤 |
| shen | 沈夫人 | 0.90 | Madam Shen, a wealthy household mistress about 55, once beautiful, now gaunt and sleepless, heavy gold hairpins, dark purple brocade jacket, a rosary in her hand, haunted eyes | 不是纯粹的恶人：年老、无子、被恐惧啃噬 |

---

## 附录 B — 出图清单与提示词

> 模板中的 `[CHAR]`、`[INK]` 取自 A.1，`<描述>` 取自 A.3。尺寸：背景、CG、设定图为 16:9；立绘为 9:16 竖幅。
> 「输入」= 生成时附带的参考图。最终使用的提示词与重出记录写入 `art/PROMPTS.md`。

### B.1 风格测试（P1B，6 张）

模板：`[INK] Style test. <场景描述> Ink density: <档位>. 16:9.`
- 档位 a：`light airy color washes dominate, lots of untouched paper, delicate thin ink lines`
- 档位 b：`rich saturated color washes layered over bold confident ink strokes`
- 档位 c：`mostly monochrome ink in many tones, only sparse small accents of color`
- 场景：`road_dawn` 与 `study_night`，描述见 B.4。

### B.2 角色概念图（P1B，16 张）

模板：`[CHAR] Character concept: single full-body figure standing, front view, relaxed neutral pose, plain light grey background (#d9d9d9), no ground shadow. Character: <描述>. Variation: <差异方向>.`

| 角色 | 版本 1 | 版本 2 | 版本 3 |
|---|---|---|---|
| wang | classic fangjin and moon-white robe | younger look, net cap (wangjin), pale grey-blue daopao | ivory robe with a dark indigo sleeveless overcoat, more dashing |
| chen | ochre-red ao and indigo mamian skirt | muted plum ao with dark skirt, sterner | brown-red with a white collar, warmer and gentler |
| nv | lotus-pink ruqun, innocent | moon-white with faint plum-blossom embroidery, more alluring | pale apricot with a translucent shawl, most fragile-looking |
| gui | hollow-eyed and sorrowful, more human | wild and frightening, more spectral | — |
| dao | gaunt ascetic, sharp | rough wanderer, patched robe, wilder beard | composed and noble, cleaner robe |
| shen | proud and severe | frail and haunted | — |

### B.3 参考设定图（P2，6 张，输入 = 选中的概念图；`rs_gui` 另加 `rs_nv`）

模板：`Using the attached character image as the exact design reference (same face, hairstyle, costume, colors, accessories), create a character reference sheet on a plain light grey background: full-body front view, full-body three-quarter view, full-body back view, and a row of head close-ups showing <表情>. Consistent proportions across all views. [CHAR] 16:9. No labels, no text.`

| 角色 | 头部特写表情 |
|---|---|
| wang | neutral, smitten, frightened, resolute, grieving |
| chen | calm, cold jealous stare, frightened, remorseful weeping, resolute |
| nv | demure sorrow, gentle smile, dressed-up radiant, tender blush |
| gui | rage, deep sorrow, peaceful |
| dao | stern, angry, compassionate |
| shen | haughty, terrified, weeping remorse |

### B.4 背景（P3a，13 张，输入 = style_day 或 style_night；变体图另加母版）

模板：`[INK] Match the brushwork, paper texture and palette of the attached style reference exactly. Scene: <描述>. Composition: focal interest in the upper middle; bottom quarter calm and low-detail (a dialogue panel covers it); left and right thirds free of focal objects at standing-figure height (character portraits stand there). Empty of people. 16:9.`
变体模板：`Edit the attached background. Keep the composition and every object exactly in place. Change only: <修改>.`

| id | 风格参考 | 描述 / 修改 |
|---|---|---|
| home_hall | day | main hall of the scholar's home, daytime: square table with a tea set, two armchairs, a folding screen painted with a landscape, a doorway to the inner courtyard, orderly and warm |
| home_night | night | **以 home_hall 为母版的变体**：night, a single oil lamp on the table, deep shadows, a white horsetail fly-whisk now hanging by the door, tense stillness |
| road_dawn | day | a country post road outside Taiyuan at dawn in late autumn, thin mist, sparse willows along a dirt road receding to pale distant mountains, a low stone bridge, faint rose-gold sunrise, wet ground |
| study_in | day | interior of a modest scholar's study, daytime: long desk with brushes, inkstone and books, half-rolled bamboo blinds, a paper-paned lattice window, a wooden couch-bed against the wall, a small dressing mirror on a stand, a potted orchid, soft daylight |
| study_night | night | **以 study_in 为母版的变体**：night, a single candle, deep indigo shadows, moonlight through the window paper, rain streaks outside, quiet unease |
| market | day | a bustling county-town market street at midday: stalls with awnings, hanging lanterns, blank banners, passersby suggested only by distant loose ink washes, dust in the air |
| temple | day | a small shabby Taoist shrine at the edge of town: weathered pillars, a dim hall with a faded statue in shadow, a blank plaque, incense haze, broken steps, solitary |
| bedroom_night | night | the couple's inner bedroom at night: canopy bed with lowered gauze curtains, an oil lamp burning low, cold blue moonlight through the lattice, paper talismans may be added later |
| bedroom_dawn | day | **以 bedroom_night 为母版的变体**：dawn, pale first light turning warm through the window, the lamp burnt out, curtains drawn open, fragile hope |
| shen_inner | day | the inner quarters of a wealthy but gloomy mansion: heavy dark wood, brocade curtains, a Buddhist altar with burning incense, a window looking onto an overgrown back garden, oppressive silence |
| shen_well | night | the overgrown back garden of the mansion at night: an old stone well with a cracked lid and moss, a withered tree, cold moonlight, mist low on the ground, dread |
| grave_dawn | day | a quiet hillside at dawn: a fresh simple grave mound with a small wooden marker (blank), wildflowers, mist in the valley below, peaceful light |
| courtyard_night | night | the courtyard of the scholar's compound at night, between the study (left, its lattice window faintly lit) and the main house (right): a stone-flagged path, a whitewashed wall, a dropped paper lantern still glowing on the ground, and at the far end the main house door with a white horsetail fly-whisk hanging on it; cold moonlight |

### B.5 CG（P3a，10 张）

模板：`[INK] Event illustration in the ink-wash style of the attached style reference. <描述>. Any human figure must match the attached character reference exactly, drawn in clean anime style blended into the ink environment. Horror only by implication: no wounds, no organs, no gore. 16:9.`

| id | 输入 | 描述 |
|---|---|---|
| window_peek | style_night, study_night, rs_gui, rs_nv | view from outside through a torn hole in a paper lattice window into the candle-lit study at night; inside, seen from behind in three-quarter profile, the ghost (jade-green skin, wild hair) bent over the couch-bed; spread flat on it like a silk painting is a human skin bearing the beautiful woman's face; the ghost holds a fine colored brush, small paint dishes beside it; dread and stillness |
| portrait | style_night, study_night, rs_nv | the empty study at night lit by a single lantern held into frame from the left (only a woman's sleeve and hand visible); on the couch-bed lies what looks like a life-size painting on silk of the beautiful woman, astonishingly lifelike, eyes closed; nobody in the room; unsettling |
| burning | style_night, rs_nv | close view of a bronze brazier; the silk "painting" of the woman curling and blackening in the flames, her painted face half consumed; thin strange smoke rising; a woman's hand (ochre-red sleeve) drawing back from it |
| study_fire | style_night, study_in | the study burning at night seen from the courtyard: flames pouring from the lattice windows, sparks into the dark sky, smoke, the shadow of a long-haired figure inside the fire |
| shield_shadow | style_night, courtyard_night | on the whitewashed courtyard wall, lit from below by a fallen lantern, three large shadows: a woman crouching, a man throwing himself in front of her with arms spread, and a wild-haired figure lunging with a clawed hand raised; only shadows, no figures in frame; abstract dark ink spatter at the edge |
| aftermath | style_night, courtyard_night, rs_wang | on the stone path of the moonlit courtyard, Wang Sheng lies with his head in a woman's lap (only her ochre-red sleeves and one hand on his cheek visible); eyes half closed, face pale, a faint tender expression; the chest of his white robe marked with a large dark crimson-black stain; beside his hand on the flagstones, a plain silver hairpin smeared with well mud; no wound visible |
| heart_wang | style_night, courtyard_night, rs_wang, rs_chen | in the moonlit courtyard, Wang Sheng and Lady Chen lie side by side on the stone path, both with eyes closed, her hand resting in his; a soft warm red-gold light like a small glowing heart flows from her chest into his; paper talismans float in a circle around them; the Taoist's hand and black sleeve at the frame edge guiding the light; solemn and tender; no blood, no wound, no weapon |
| heart_chen | style_night, bedroom_night, rs_chen | Lady Chen lies peacefully on the canopy bed, surrounded by paper talismans; a pale jade-green and rose light shaped like a heart, trailing like ink in water, descends into her chest; hope after grief; no blood |
| well_bones | style_night, shen_well | looking down into the old well by moonlight; at the bottom, half sunk in mud, a bundle of rotten lotus-pink silk; only a faint pale curve of bone hinted; sorrowful, not gruesome |
| fade | style_day, study_in | the couch-bed in the morning light; on it lies a sheet of silk where a woman's painted image has faded to faint ink traces, almost gone; a single silver hairpin beside it; quiet melancholy |

### B.6 封面（1 张）

`cover`（输入 style_day、rs_nv）：`[INK] A hanging silk scroll with an unfinished painted portrait of a beautiful young woman (the woman of the reference, with the red mole under her left eye), half of her face still blank paper; a fine colored brush resting on an inkstone; a single candle; mist; elegant and uncanny. 16:9.` 存 `assets/cg/raw/cover.png`。

### B.7 立绘（P3b，预估 27 张，最终以 USAGE.md 为准）

**基础立绘模板**（输入 = rs_<角色>）：
`Using the attached reference sheet as the exact design reference (same face, hair, costume, colors, accessories), draw one full-body standing portrait (tachie) of this character. Pose and expression: <姿态>. Facing the viewer, front or slight three-quarter turn of at most 15 degrees. The entire body is visible from the top of the head to the feet; the figure fills about 90% of the image height, centered, with a small margin above the head and below the feet. Background: completely flat solid pure <green #00FF00 | magenta #FF00FF>, no gradient, no floor, no shadow, no other objects. Crisp clean edges. [CHAR] Portrait 9:16.`

**变体模板**（输入 = 该角色的基础立绘）：
`Edit the attached image. Keep the character, costume, colors, body proportions, pose, framing, camera and the flat background exactly the same. Change only: <修改>. No other changes.`

| 文件（`assets/lihui/raw/`） | 类型 | 姿态 / 修改 |
|---|---|---|
| wang_calm | 基础 | standing at ease, hands lightly clasped, gentle smile |
| wang_smitten | 变体 | cheeks flushed, eyes lingering, faint smile, one hand half raised |
| wang_worry | 变体 | brows knit, eyes averted, one hand at his collar |
| wang_fear | 变体 | eyes wide, leaning back, both hands raised before his chest |
| wang_resolve | 变体 | jaw set, eyes steady, one fist closed at his side |
| wang_grief | 变体 | eyes red, tears held back, shoulders slumped |
| wang_weak | 基础（rs_wang） | only a white inner robe with an outer robe draped over his shoulders, hair half loose, pale, one hand pressed over his heart |
| chen_calm | 基础 | upright, hands folded, composed |
| chen_cold | 变体 | chin raised, cold narrowed eyes, lips pressed thin (jealous) |
| chen_worry | 变体 | brows knit, one hand at her collar |
| chen_fear | 变体 | eyes wide, hand over her mouth |
| chen_remorse | 变体 | weeping, head bowed, hands clutching her sleeves |
| chen_resolve | 变体 | jaw set, eyes steady and determined, hand on her chest |
| nv_pitiful | 基础 | head lowered, sorrowful, hugging a small cloth bundle, plain hair |
| nv_smile | 变体 | remove the bundle; hands folded at her waist; gentle smile |
| nv_dressed | 基础（rs_nv） | freshly dressed up: hair elaborately arranged with ornaments, light makeup, rouge lips, turning to glance back over her shoulder with a radiant smile |
| nv_love | 变体（nv_dressed） | soft blush, tender downcast eyes, a hand touching her hairpin |
| gui_rage | 基础（品红底） | hair flying, eyes blazing, jagged teeth bared, clawed hands raised |
| gui_sorrow | 变体 | hands lowered, head tilted, tears like ink running from hollow eyes, mouth closed |
| gui_calm | 变体 | peaceful, eyes softly closed, faint smile, hands folded |
| dao_stern | 基础 | standing, fly-whisk in hand, piercing scrutinizing gaze |
| dao_calm | 变体 | sorrowful compassionate look, slight bow of the head |
| dao_angry | 变体 | glaring, beard bristling, hand gripping the whisk handle |
| dao_act | 基础（rs_dao） | dynamic stance, peach-wood sword raised, talismans in the other hand, robe flaring |
| shen_haughty | 基础 | upright, rosary in hand, cold proud look |
| shen_terror | 变体 | face drained of color, eyes wide, rosary clutched to her chest |
| shen_remorse | 变体 | weeping, head bowed low, hands pressed together |

**数量合计**：风格测试 6 + 概念 16 + 设定图 6 + 背景 13 + CG 10 + 封面 1 + 立绘 27 = **79 张**（不含重出）。

---

## 附录 C — 已知的坑（本仓库实际踩过）

1. **AI 绿幕不是纯绿**：常是哑光色，每张略有漂移 → 底色取边框中位数，别写死。抠完包围盒等于整张画面 = 没抠掉。
2. **出图 agent 会静默产出纯色空图** → process-art 拦截不透明像素占比 < 5% 的图。
3. **提示词钉不住尺度和地面线** → 立绘大小与脚底对齐一律在装配时实测归一化。
4. **预览必须与运行时同尺度**，否则审图结论不可信。
5. **水墨风会自动加印章和题字** → 提示词显式禁止，并在自检时逐张检查。
6. **无头浏览器计时严重滞后**；从 node 端逐次往返发命令约 300ms → 走查在页面内循环驱动，不靠等待真实时间。
7. **file:// 加载会被 CORS 拦截** → 一律起本地 http 服务测试。
8. **播完的 tween 再 remove 会崩溃** → 在 `onComplete` 里放掉引用，删除前先检查是否还挂着。
9. **不要镜像立绘**（右衽会变左衽）。
10. **提交别混入 `.claude/settings.json`**（用户自己的改动）。

---

## 附录 D — 原著原文（仅作设定与台词来源；本作不沿用其情节走向与价值观）

（通行本，引用台词前请与权威版本核对，如《聊斋志异》会校会注会评本。）

太原王生，早行，遇一女郎，抱襆独奔，甚艰于步。急走趁之，乃二八姝丽。心相爱乐。问：「何夙夜踽踽独行？」女曰：「行道之人，不能解愁忧，何劳相问。」生曰：「卿何愁忧？或可效力，不辞也。」女黯然曰：「父母贪赂，鬻妾朱门。嫡妒甚，朝詈而夕楚辱之，所弗堪也，将远遁耳。」问：「何之？」曰：「在亡之人，乌有定所。」生言：「敝庐不远，即烦枉顾。」女喜，从之。生代携襆物，导与同归。女顾室无人，问：「君何无家口？」答云：「斋耳。」女曰：「此所良佳。如怜妾而活之，须秘密，勿泄。」生诺之。乃与寝合。使匿密室，过数日而人不知也。生微告妻。妻陈，疑为大家媵妾，劝遣之。生不听。

偶适市，遇一道士，顾生而愕。问：「何所遇？」答言：「无之。」道士曰：「君身邪气萦绕，何言无？」生又力白。道士乃去，曰：「惑哉！世固有死将临而不悟者！」生以其言异，颇疑女；转思明明丽人，何至为妖，意道士借魇禳以猎食者。无何，至斋门，门内杜，不得入。心疑所作，乃逾垝垣。则室门亦闭。蹑迹而窗窥之，见一狞鬼，面翠色，齿巉巉如锯。铺人皮于榻上，执彩笔而绘之；已而掷笔，举皮，如振衣状，披于身，遂化为女子。睹此状，大惧，兽伏而出。急追道士，不知所往。遍迹之，遇于野，长跪乞救。道士曰：「请遣除之。此物亦良苦，甫能觅代者，予亦不忍伤其生。」乃以蝇拂授生，令挂寝门。临别，约会于青帝庙。

生归，不敢入斋，乃寝内室，悬拂焉。一更许，闻门外戢戢有声。自不敢窥也，使妻窥之。但见女子来，望拂子不敢进；立而切齿，良久乃去。少时复来，骂曰：「道士吓我。终不然宁入口而吐之耶！」取拂碎之，坏寝门而入。径登生床，裂生腹，掬生心而去。妻号。婢入烛之，生已死，腔血狼藉。陈骇涕不敢声。

明日，使弟二郎奔告道士。道士怒曰：「我固怜之，鬼子乃敢尔！」即从生弟来。女子已失所在。既而仰首四望，曰：「幸遁未远。」问：「南院谁家？」二郎曰：「小生所舍也。」道士曰：「现在君所。」二郎愕然，以为未有。道士问曰：「曾否有不识者一人来？」答曰：「仆早赴青帝庙，良不知。当归问之。」去少顷而返，曰：「果有之。晨间一妪来，欲佣为仆家操作，室人止之，尚在也。」道士曰：「即是物矣。」遂与俱往。仗木剑，立庭心，呼曰：「孽魅！偿我拂子来！」妪在室，惶遽无色，出门欲遁。道士逐击之。妪仆，人皮划然而脱，化为厉鬼，卧嗥如猪。道士以木剑枭其首；身变作浓烟，匝地作堆。道士出一葫芦，拔其塞，置烟中，飗飗然如口吸气，瞬息烟尽。道士塞口入囊。共视人皮，眉目手足，无不备具。道士卷之，如卷画轴声，亦囊之，乃别欲去。

陈氏拜迎于门，哭求回生之法。道士谢不能。陈益悲，伏地不起。道士沉思曰：「我术浅，诚不能起死。我指一人，或能之，往求必合有效。」问：「何人？」曰：「市上有疯者，时卧粪土中。试叩而哀之。倘狂辱夫人，夫人勿怒也。」二郎亦习知之。乃别道士，与嫂俱往。见乞人颠歌道上，鼻涕三尺，秽不可近。陈膝行而前。乞人笑曰：「佳人爱我乎？」陈告之故。又大笑曰：「人尽夫也，活之何为？」陈固哀之。乃曰：「异哉！人死而乞活于我。我阎摩耶？」怒以杖击陈。陈忍痛受之。市人渐集如堵。乞人咯痰唾盈把，举向陈吻曰：「食之！」陈红涨于面，有难色；既思道士之嘱，遂强啖焉。觉入喉中，硬如团絮，格格而下，停结胸间。乞人大笑曰：「佳人爱我哉！」遂起，行已不顾。尾之，入于庙中。追而求之，不知所在；前后冥搜，殊无端兆，惭恨而归。

既悼夫亡之惨，又悔食唾之羞，俯仰哀啼，但愿即死。方欲展血敛尸，家人伫望，无敢近者。陈抱尸收肠，且理且哭。哭极声嘶，顿欲呕。觉鬲中结物，突奔而出，不及回首，已落腔中。惊而视之，乃人心也。在腔中突突犹跃，热气腾蒸如烟然。大异之。急以两手合腔，极力抱挤。少懈，则气氤氲自缝中出。乃裂缯帛急束之。以手抚尸，渐温。覆以衾裯。中夜启视，有鼻息矣。天明，竟活。为言：「恍惚若梦，但觉腹隐痛耳。」视破处，痂结如钱，寻愈。

异史氏曰：「愚哉世人！明明妖也，而以为美。迷哉愚人！明明忠也，而以为妄。然爱人之色而渔之，妻亦将食人之唾而甘之矣。天道好还，但愚而迷者不悟耳。可哀也夫！」
