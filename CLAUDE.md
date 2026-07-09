# CLAUDE.md

AI 素材生成 + 网页小游戏工作区。核心循环：用 `skills/` 下的流水线生成素材 → 装配进 `game_runs/` 下的 Phaser 游戏 → 自动验证/试玩 → 部署到 Cloudflare Pages 的 showreel。总览见根目录 README.md。

## 目录地图

- `skills/<name>/SKILL.md` — 每条流水线的**唯一权威文档**（用法、参数、坑）。动手前先读对应 SKILL.md，不要凭记忆调用。
- `game_runs/` — 20+ 个 Phaser 游戏，每个一个目录。`games.json` 是 showreel 注册表，`index.html`/`play.html` 是入口。
- `game_runs/_engine/` — 共享引擎层（hud/audio/morph/pointcloud）。**跨游戏复用的代码只能放这里**，改一次全部游戏受益；禁止把引擎代码复制进单个游戏目录。
- `game_runs/MIGRATION.md` — 游戏架构黄金样板（多场景 + 数据驱动 + 命名空间），InkMechanics 是参照实现。新游戏和重构都按它来。
- `char_runs/ pet_runs/ object_runs/ texture_runs/ video_runs/` — 各流水线的生成产物（大部分 gitignored，见 .gitignore 内注释）。
- `assets_fbx/` — GLB/FBX 角色素材库，不入库（`inbox/` 待接入、`archive/` 已接入归档）。
- `references/` — 设计参考图。`scratch/` — 生成器工作区（源码入库、渲染产物不入）。

## 游戏架构铁律（详见 game_runs/MIGRATION.md）

- 加载方式：**按序 `<script>` 标签 + `window.<NS>` 命名空间，不用 ES module、关卡数据放 `levels.js` 不 fetch json**。脚本顺序：`_engine/*` → `config` → `levels` → systems → `scenes/*` → `main`——顺序错了就是 `undefined`。
- 对外契约不可破坏（playtest bot / verify 依赖）：`window.__probe()`、`window.__gameState.player`、`window.__hudStart()`、`window.__advanceCard()`、`?autostart` 与 `navigator.webdriver` 直接跳过菜单进第 1 关。
- 设计原则「即开即玩」：不做存档、关卡选择菜单、星级、多选项暂停菜单。START → 五关线性 → 通关。预算投手感不投导航。

## 验证门（改玩法后必过，按序）

1. `npx tsx skills/game-verify/verify.ts <Game>` — 截图 + 分层断言基本可玩（`--layers/--keys/--seconds` 见其 SKILL.md）。
2. `npx tsx skills/game-playtest/play.ts <Game>` — bot 自动通关 + 录屏 + 白盒平衡体检，验"通不通得了/会不会卡死"。

## 素材流水线选型（按素材特征匹配，无优先级）

- 角色/敌人动画有**四条平行轨道**，完整决策矩阵见 skills/glb-sprite/SKILL.md：写实有机步态（walk/run/idle 循环）→ `glb-sprite`（新模型先 `--inspect` 体检）；几何/线条/火柴人、需逐关节精控命中窗口的攻击招式 → `svg-sprite`；需要纹理光影的插画角色 → `char-sprite`（AI）；已有绿幕视频 → `video-sprite`。同一角色可混轨（如 walk 用 GLB、攻击用 SVG），保持剪影颜色与取景框一致即可。
- 背景/环境动画元素：`svg-ambient`（代码是唯一真源，产物拷进各游戏，不建共享素材目录）。
- AI 生成图做动画帧必须走 `char-sprite` 管线切割（chroma-key + 连通域 + 校验），不手工切割。

## Git 约定

- 产物入库规则以 `.gitignore` 内的注释为准。关键几条：游戏根目录的 10s `preview.mp4` **入库**，完整试玩录屏 `playtest/`、`_rec/` 不入库；`game_runs/` 的 png/webp 入库（Cloudflare CI 部署需要）。
- 提交信息格式沿用现状：`feat|fix|style|doc|chore(<Game>): 中文描述`。
