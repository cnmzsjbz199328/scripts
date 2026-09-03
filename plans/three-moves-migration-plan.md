# 三招决胜 Demo 移植计划

状态：已执行

执行人：负责游戏移植的 agent

## 1. 目标

把 `C:\Users\tj169\Downloads\three-moves-card-demo-source.zip` 中的“三招决胜” demo 移植为本项目可独立运行、可验证、可纳入 showreel 的游戏。

本计划只负责玩法、界面、运行结构和自动化验证。人物形象、动作视频及其他最终媒体资源由另一份计划负责。

## 2. 输入与已知情况

- 源 demo 根目录：`mushoku-three-moves-demo/`。
- 核心代码位于 `app/page.tsx` 和 `app/globals.css`。
- 源 demo 是 Next/Vite + React + shadcn starter。
- D1、Drizzle、ChatGPT auth 和示例 API 与本游戏无关，不应迁入。
- 当前人物区域是“动态资源槽”，没有真正的人物图像或视频。
- 当前项目是静态 `game_runs/<Game>/` 游戏仓库，采用顺序 `<script>` 加载和 `window.*` 命名空间。

## 3. 执行前必须阅读

执行 agent 开始修改前，必须阅读：

- 根目录 `CLAUDE.md`。
- `README.md`。
- `game_runs/MIGRATION.md`。
- `skills/game-verify/SKILL.md`。
- `skills/game-playtest/SKILL.md`。

如果发现规范与本计划冲突，以用户要求为最高优先级，其次以根目录规范和 `game_runs/MIGRATION.md` 为准。

## 4. 工作边界

### 必须完成

- 新建 `game_runs/ThreeMoves/`。
- 将 React 页面转换为静态 HTML/CSS/JavaScript。
- 保留源 demo 的卡牌规则和主要交互。
- 提供项目约定的自动化测试契约。
- 注册到 `game_runs/games.json`。
- 运行验证和自动化试玩。
- 生成游戏级 `preview.mp4`；它只是玩法预览，不等同于角色动作视频。

### 不要做

- 不要把整个 zip 原样解压到项目根目录。
- 不要把 Next、Vite、React、shadcn、D1、Drizzle 或 `node_modules` 搬入 `game_runs/ThreeMoves/`。
- 不要修改人物/视频生产流水线。
- 不要修改其他游戏或共享引擎，除非确认是所有游戏都需要的通用修复并完成回归。
- 不要部署到 Cloudflare 或其他外部服务，除非另有明确指示。
- 不要删除或覆盖现有的 `video_runs/Wren/` 等无关工作区内容。

## 5. 目标结构

目标结构暂定如下：

```text
game_runs/ThreeMoves/
  index.html
  preview.mp4
  manifest.json
  game/
    config.js
    data.js
    state.js
    render.js
    main.js
    systems/
      deck.js
      duel.js
      effects.js
    scenes/
      BootScene.js
      DuelScene.js
  assets/
    placeholder/
    media/                 # 预留给人物/视频 agent
```

实现方式：

- 使用项目的静态 HTML + 顺序 `<script>` 方式，不保留 React 运行时。
- 使用 `window.ThreeMoves` 作为唯一游戏命名空间。
- 遵循项目的 Phaser 场景生命周期；卡牌和响应式 HUD 可以使用 DOM overlay + CSS，以保留原 demo 的卡牌布局体验。
- 跨游戏通用能力优先复用 `game_runs/_engine/`，不要复制一份共享代码到本游戏目录。
- 在媒体未就绪时使用 CSS/首字母占位图，保证游戏完整可玩。

## 6. 玩法行为必须保持一致

### 卡牌数据

- 13 个角色，每个角色对应 4 种花色。
- 花色：`spade`、`heart`、`diamond`、`club`。
- 追加两个 Joker：龙神、人神。
- 普通牌点数为 2 到 A；龙神为 15；人神按源代码规则复制并加 1，上限 15。

### 结算规则

- 克制关系：`spade → club → diamond → heart → spade`。
- 普通克制加 3 分。
- 同角色触发反制时为完美反制，加 5 分。
- 连续使用同一角色加 2 分。
- 人神复制对手牌面与类型并加 1。
- 龙神不受普通花色克制。
- 结算后移除双方已出的牌。
- 输方扣 1 点生命。
- 任一方生命归零，或手牌耗尽时结束对局。
- 保留胜利、失败、平局三种结果。

不要借移植机会重新设计数值、牌组数量或胜负规则；如发现源 demo 的行为与文字说明不一致，以源代码实际行为为基线，并在交接报告中注明。

## 7. 推荐实施步骤

### 阶段 A：建立基线

- 临时读取 zip 内容，不污染项目根目录。
- 记录源 demo 的启动、重新开始、出牌、结算、胜负和响应式行为。
- 检查当前 git 状态，保留所有已有用户修改。

### 阶段 B：建立静态游戏骨架

- 创建 `game_runs/ThreeMoves/` 和目标目录结构。
- 创建 `index.html`，完成基础舞台、DOM overlay 和脚本加载顺序。
- 创建 `config.js`、`data.js` 和 `main.js`。
- 建立 `window.ThreeMoves` 命名空间。

### 阶段 C：迁移玩法状态机

- 将牌组生成和洗牌拆到 `systems/deck.js`。
- 将花色克制、分数、连携、Joker 和胜负判断拆到 `systems/duel.js`。
- 将回合、生命值、手牌、对手意图、战斗记录和结算延迟集中到 `state.js`。
- 为测试模式提供确定性牌组；普通模式仍然可以随机洗牌。

### 阶段 D：迁移界面与反馈

- 还原顶部栏、双方信息、生命值、牌堆、中央对决区、手牌和侧栏。
- 保留原 demo 的暗色卡牌视觉、花色颜色和 Joker 风格。
- 保留翻牌、得分、胜负提示、战斗记录和重新开始反馈。
- 保留移动端断点和 `prefers-reduced-motion` 降级。
- 先接入占位媒体，不等待人物或视频素材。

### 阶段 E：接入项目测试契约

必须实现：

```javascript
window.__probe()
window.__gameState.player
window.__hudStart()
window.__advanceCard()
```

同时支持：

- `?autostart` 自动开始。
- `navigator.webdriver` 下跳过开始界面。
- `__probe()` 至少返回 `started`、`round`、`hp`、`maxHp`、`score`、`phase`、`won`、`lost`、`mode` 等稳定字段。
- `__advanceCard()` 能推进当前回合，不能依赖人工点击。

### 阶段 F：登记与验证

- 在 `game_runs/games.json` 添加 `ThreeMoves` 条目。
- 用静态 HTTP 服务验证资源加载，不使用 `file://` 作为最终测试方式。
- 运行：

```bash
npx tsx skills/game-verify/verify.ts ThreeMoves
npx tsx skills/game-playtest/play.ts ThreeMoves
```

- 生成游戏级 10 秒 `preview.mp4`。
- 检查 showreel 入口和游戏独立入口均可打开。

## 8. 验收清单

- [x] 页面不依赖 Next/Vite/React 才能运行。
- [x] 开始、重新开始和自动开始均正常。
- [x] 玩家可以连续完成完整对局。
- [x] 普通克制、完美反制、连携、人神、龙神均可验证。
- [x] 胜利、失败、平局均可触发。
- [x] 5 回合内不出现卡死或永久“结算中”。
- [x] `__probe()` 和 `__advanceCard()` 稳定可用。
- [x] `game-verify` 通过。
- [x] `game-playtest` 能结束且无控制台错误。
- [x] 桌面端、窄屏端和减少动效模式可用。
- [x] `game_runs/games.json` 已登记。
- [x] `preview.mp4` 已生成。
- [x] 没有修改本计划之外的无关文件。

## 9. 交接要求

执行完成后，agent 必须报告：

- 实际创建和修改的文件。
- 与源 demo 有意不同的行为。
- 占位媒体的接入位置和预期媒体接口。
- 执行过的命令及结果。
- 未完成项和阻塞原因。

人物与视频 agent 后续只需要按照媒体接口替换资源，不应重新修改卡牌规则。
