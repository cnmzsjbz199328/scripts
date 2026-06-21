---
name: game-playtest
description: 自动试玩 + 录屏 + 白盒平衡指标（共享）。用 Playwright headless 驱动一个读取 window.__probe() 的启发式 bot 去"实际尝试通关"，全程录像(.webm/.mp4)，输出结构化指标 JSON。既产出演示录像，又客观暴露"设计不合理导致通关难度极大/死锁"这类问题。是 game-verify 之上的可玩性体检。
---

# Game Playtest Skill（自动试玩 + 录屏 + 白盒体检）

`game-verify` 只回答"游戏能不能跑、按键有没有响应";它**不回答"这游戏到底通不通得了、是不是
地狱难度、会不会卡死"**。`game-playtest` 补上这一层:驱动一个 bot 真正去玩,录下全程,并量化结果。

- **演示**:产出一段真实通关录像(`playthrough.webm` → 可转 `.mp4`)。
- **白盒自测**:bot 走正常策略仍通不了 / 卡死 / 掉血过多 → **客观暴露设计与平衡缺陷**。
  （ShadowNinja 首跑即抓出"被擦到就退回检查点 → 反复回弹卡死在 56%"的死锁,修复后 bot 99% 通关。）

> 边界:bot 测的是**可解性 / 死锁 / 难度墙 / 进度推进**等客观项,**测不了"手感/好不好玩"**——那仍需人眼。

---

## 用法

```bash
npx tsx skills/game-playtest/play.ts <GameName> [--seconds=90] [--tick=70] [--out=report.json]
```

产物写入 `game_runs/<Game>/playtest/`:`playthrough.webm`、`final.png`,及 stdout 的指标 JSON。
退出码:**0 = bot 通关,1 = 未通关(失败/超时/卡死),2 = 用法/找不到游戏**。

转可分享格式(需 ffmpeg):
```bash
cd game_runs/<Game>/playtest
ffmpeg -y -i playthrough.webm -vf "scale=720:-2" -c:v libx264 -pix_fmt yuv420p -crf 24 -movflags +faststart playthrough.mp4
# 注意:全长 gif 体积巨大(43s≈23MB),优先 mp4;要 gif 就截高光片段
```

---

## 前置契约:游戏需暴露探针

bot 不靠像素识别,而靠游戏在 `create()` 里暴露的状态接口决策。**这是把游戏做成"可自测"的关键投资**,
与结构升级同向(顺手就加上)。最小契约:

```js
// 每帧可调,返回当前可玩状态快照
window.__probe = () => ({
  x, y, vx, onGround, hp, maxHp, score, goalScore, act, deaths, deathBudget,
  won, lost, cardActive, started,
  nextGoalX,                 // 下一目标 x（最近未拾道具 / 终点）——bot 朝它走
  dangerNow, dangerAhead,    // 此刻 / 前方一步是否危险——bot 据此规避（如蹲伏/跳/停）
});
window.__advanceCard = () => {...};  // 若有剧情卡/过场,给 bot 一个推进入口
```

无探针时 bot 退化为"一路向右",仅能做最浅的冒烟。探针越准,白盒结论越可信。

---

## bot 决策(默认启发式)

```
每 tick:
  probe()
  cardActive          → __advanceCard()，松开所有键
  won / lost          → 记录结果，结束
  危险(dangerNow/Ahead)→ 触发规避键（默认蹲伏 ↓；可按游戏改为跳/停）
  否则                → 朝 nextGoalX 方向移动
  x 在 ~3.5s 内无前进  → 判 stuck（死锁/难度墙），结束
```

针对不同游戏,规避动作与目标导航可在 `play.ts` 的决策段微调(射击=瞄准开火、平台=跳跃)。

---

## 指标 JSON(white-box 体检表)

| 字段 | 含义 / 怎么读 |
|------|--------------|
| `result` | `win` / `lose` / `stuck` / `timeout` / `error` —— 非 win 即有可玩性疑点 |
| `progressPct` | 最远推进 / 终点。卡死时看它卡在几 % |
| `stuck` + `notes` | 是否疑似死锁/难度墙,及卡住坐标 |
| `spottedCount` / `deaths` | 受击 / 死亡次数 —— 偏高=平衡过严 |
| `hpRemaining` | 通关余血 —— 长期 0 说明太险,满血说明太松 |
| `durationSec` / `cardsAdvanced` | 通关时长 / 经过的叙事节点数 |
| `runtimeErrors` | 试玩期间的运行时报错 |

**健康范围参考(单局短游戏)**:`win` 且 `progressPct=100`,`deaths` 0–2,`hpRemaining` 不为 0 也不满血,
`spottedCount` 个位数。偏离即调平衡,重跑,直到落入区间——这就是用数据驱动的难度调优闭环。

---

## 在流水线中的位置

```
game-gen / game-enhance → game-verify(全绿,能跑) → game-playtest(bot 通关 + 指标健康) → 宣布完成 + 附录像
```

`game-verify` 是"能跑"门,`game-playtest` 是"能玩/平衡"门 + 演示产出。两者配合,才敢说一款游戏
"做完了"而不只是"跑起来了"。常见指标坑:bot 侧 `prevHp` 初值若非首帧真实值会虚高 `spottedCount`(首帧只记录不计数)。
