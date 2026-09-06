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
