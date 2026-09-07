# ThreeMoves 前端帧播放接入基线

日期：2026-09-06（Australia/Adelaide）

## P1 门禁

### verify

命令：`npx tsx skills/game-verify/verify.ts ThreeMoves`

- exit code：0
- `pass`：`true`
- L0：通过（`game/game-logic.js` 不存在，逻辑内联于 `index.html`）
- L1：通过
- L2：通过（`window.__gameState` 玩家坐标响应输入）
- 截图：`game_runs\\ThreeMoves\\verify-screenshot.png`

### playtest

命令：`npx tsx skills/game-playtest/play.ts ThreeMoves`

共 4 次基线跑（首跑 1 次 + 同命令复跑 3 次）：

| run | result | durationSec | reachedAct | finalScore | hpRemaining | cardsAdvanced | stuck | runtimeErrors |
|---:|---|---:|---:|---:|---:|---:|---|---|
| 1 | win | 9.2 | 5 | 50 | 3 | 5 | false | [] |
| 2 | win | 9.2 | 5 | 50 | 3 | 5 | false | [] |
| 3 | win | 9.1 | 5 | 50 | 3 | 5 | false | [] |
| 4 | win | 9.1 | 5 | 50 | 3 | 5 | false | [] |

分布：`won 4 / lost 0 / tie 0`。总计 `cardsAdvanced=20`，`deaths=0`，`spottedCount=0`，无卡死、无运行时错误。

playtest 产物：`game_runs\\ThreeMoves\\playtest\\playthrough.webm`、`game_runs\\ThreeMoves\\playtest\\final.png`

## 收尾门对比

### verify

最终命令同上，exit code `0`，L0/L1/L2 均 `pass=true`；`__probe` 契约未新增字段。

### playtest

最终门首跑：`win / 9.2s / Act 5 / 50 / HP 3 / 5 cards / stuck=false / runtimeErrors=[]`。
随后复跑 3 次：`win / 9.0s`、`win / 9.2s`、`win / 9.2s`，其余指标均与首跑一致。

分布对比：P1 `won 4 / lost 0 / tie 0`；收尾 `won 4 / lost 0 / tie 0`（共 4 次）。

最后一轮安全加固（spritesheet `onerror` / reset stopAll）后的单独门禁复跑仍为：`win / 9.1s / Act 5 / 50 / HP 3 / 5 cards / stuck=false / runtimeErrors=[]`；verify 仍为 L0/L1/L2 全通过。

## 帧播放目检记录

- 普通牌：diamond→ability(2)、heart→guard(1)、spade→attack(0)、club→special(3)，双方结算槽同时挂载并在一次 1→8 播放后清理。
- Joker（龙神/人神）与 Roxy：无 spritesheet 时无 `.sprite-anim` 层，保留静态图且无 console/page error。
- 中途 resolving 重绘：重挂载未完成视觉层，最终清理；无 state 字段、`RESULT_DELAY=1450` 未改。
- CSS/截图：结算区无布局抖动，角色层未盖住 `score-badge` / `card-copy`。
- `ANIM_ENABLED=false`：不挂载动画层，回落静态观感。
- 人工浏览器窗口：当前环境未提供可用 Chrome/IAB 标签，以上目检由本地 Playwright 页面截图与 DOM 时间采样完成。
- `preview.mp4`：本机未安装 `ffmpeg`，未能从收尾 `playthrough.webm` 重编码更新根目录预览。

## Joker + Roxy 收尾门（2026-09-06）

- `verify.ts ThreeMoves`: exit code `0`, `pass=true`, L0/L1/L2 全通过。
- `playtest.ts ThreeMoves`: `win / 9.1s / Act 5 / score 50 / HP 3 / 5 cards / stuck=false / runtimeErrors=[]`。
- `__probe()` keys（排序）：`act, cardActive, cellX, dangerAhead, dangerNow, deathBudget, deaths, enemyHandCount, goalScore, handCount, hp, locked, lost, maxHp, mode, nextGoalX, onGround, outcome, phase, round, roundScore, score, started, tie, vx, won, worldW, x, y`；与既有契约一致。
- Playwright 定向检查：双 Joker 同播两层均为 `900% 100%`，动画结束后层数为 `0`；四花色行分别为 `0% / 33.3333% / 66.6667% / 100%`；Roxy 仍无动画层；`ANIM_ENABLED=false` 无动画层；score badge/card copy 各保留 2 个；无 console/page error。
- Roxy base：`1086×1448 rgb24`，SHA-256 `ED237919638C99E199D520771FD159BDD9B42718A502BF02108B7030C9787155`；source 与游戏媒体副本一致；旧图备份 SHA-256 `D1905944377C498F3537B3D1C2EDF72F947DEB3C4B0A4A62D5644E68C5D9069B`。

> 2026-09-07 更正：上行记录的是 greenscreen fix 前的运行时副本。source base 继续保持 `1086×1448 rgb24`；运行时卡面副本现为 `192×208 rgba`，SHA-256 `210FEE887C6417B1214B5B8425F35EDF4AA6BF9FCB8D8BE14DE31E1327EAFAFE`，与 `char_runs/ThreeMoves/Roxy/reference/frame_0.png` 一致。

## Roxy greenscreen fix 收尾门（2026-09-07）

- `npx tsx skills/char-sprite/process.ts "ThreeMoves/Roxy" reference ...` 成功；产物 `192×208 rgba`，四角 alpha=0，opaque bbox `x=52..140, y=5..202`，不透明近绿比例 `0.00%`。
- 真实卡面截图 `scratch/roxy_card_verify.png` 目检通过：无亮绿方块、绿边、黑边或半透明毛刺；短木杖可见；无魔法阵、水法球、发光；比例与站位与兄弟角色一致。
- 修复后 `verify.ts ThreeMoves`：`pass=true`，L0/L1/L2 全通过；`play.ts ThreeMoves`：`win / 9.1s / Act 5 / score 50 / HP 3 / 5 cards / stuck=false / runtimeErrors=[]`。
