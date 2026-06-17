---
name: game-verify
description: 游戏自动化验证门（共享）。用 Playwright headless 真实加载并操作一个已组装的游戏（game_runs/<Game>/），分三层捕捉运行时 bug——L0 静态资源/语法、L1 启动崩溃/资源404、L2 交互烟雾（点 START、合成键盘输入、确认零运行时错误且画面在推进）。被 game-gen / game-fix / game-enhance 共用，是三条线宣布"完成"前的强制门。
---

# Game Verify Skill（验证门）

## 这是什么 / 为什么存在

`game-gen` 等管线只在浏览器里"看一眼"做人工目视，但绝大多数破坏可玩性的 bug（未定义方法、输入抢占、移动卡死、资源 404）都是**代码存在但一跑就坏**的运行时问题，目视必然漏掉。`game-verify` 把"真的跑起来并操作一遍"变成可复现的自动检查，输出**结构化 JSON 报告**和**截图**。

**铁律**：game-gen / game-fix / game-enhance 任何一条线，未通过 `game-verify` 全绿，都不得对用户宣布"完成"。

---

## 用法

```bash
npx tsx skills/game-verify/verify.ts <GameName> \
  [--layers=0,1,2] [--keys=W,A,S,D,SPACE] [--seconds=4] [--out=report.json]
```

| 参数 | 默认 | 说明 |
|------|------|------|
| `<GameName>` | （必填） | `game_runs/` 下的游戏目录名 |
| `--layers` | `0,1,2` | 要跑哪些层，逗号分隔 |
| `--keys` | `W,A,S,D,SPACE,ENTER,J,Z,X` | L2 依次合成的按键（Phaser KeyCode 名） |
| `--seconds` | `4` | L2 输入总时长（秒） |
| `--out` | 无 | 额外把 JSON 报告写到该路径（相对仓库根） |

退出码：**0 = 全绿，1 = 有失败，2 = 用法/找不到游戏**。

> 首次使用需安装浏览器：`npm i -D playwright && npx playwright install chromium`（已在本仓库装好）。

---

## 三层验证

| 层 | 手段 | 捕捉的 bug |
|----|------|-----------|
| **L0 静态** | node `--check` 语法 + JSON 合法性 + 资源引用存在性（`tileIndex`→贴图、`entities[].sprite`→图集） | 语法错误、坏 JSON、缺贴图/图集、404 前置 |
| **L1 启动** | Playwright headless 加载 `index.html`，监听 `console.error` / `pageerror`(window.onerror) / 资源 404 / 请求失败，确认 `<canvas>` 真正渲染 | 加载即崩、未定义引用、资源 404、Phaser 起不来 |
| **L2 烟雾** | 调 `window.__hudStart()`（或点 `#start-btn`）开始游戏 → 按 `--keys` 合成键盘输入 → 断言交互期间**零新运行时错误** + **画面前后有变化**（未冻结/崩溃） | 输入触发的崩溃、移动卡死、按键抢占、游戏循环冻结 |

报告示例（也是 game-fix 的输入）：

```json
{
  "game": "X",
  "pass": false,
  "layers": {
    "L0": { "pass": true },
    "L1": { "pass": false, "errors": [
      { "type": "pageerror", "msg": "drawEnemyHealthBar is not a function",
        "at": "at MainScene.update (.../game-logic.js:312:10)" }
    ]},
    "L2": { "pass": false, "reason": "交互前后画面无任何变化（疑似冻结/崩溃）" }
  },
  "screenshot": "game_runs/X/verify-screenshot.png"
}
```

每次 L2 都会把交互后截图写到 `game_runs/<Game>/verify-screenshot.png` 供人工核对（用 Read 工具看图）。

---

## 可选的精确移动断言（预留接缝）

L2 默认只能靠"画面是否变化"间接判断游戏是否响应输入。若游戏逻辑在 `create()` 里暴露：

```javascript
window.__gameState = { player: this.player };  // 暴露 player 引用即可
```

则 L2 会**额外断言**移动键后 `player.x/y` 真的变化——能精确抓住"移动卡死但画面仍在动画"的隐蔽 bug。

**不强制**。这是为未来更深验证预留的契约：生成端（game-gen）和修复端（game-fix）可逐步给游戏加上这一行 hook，验证精度随之提升，且对旧游戏完全向后兼容。

---

## 在三条线中的位置

```
game-gen     →  ... → 【game-verify 全绿】 → 宣布完成
game-fix     →  game-verify(复现失败) → 修 → 【game-verify 全绿】 → 完成
game-enhance →  改动 → 【game-verify 全绿，回归门】 → 完成
```

实现注意：因为游戏从 CDN 加载 Phaser 且用相对路径 `fetch` `game/game-logic.js`，`file://` 会被 CORS 挡住，所以 `verify.ts` 内置一个最小静态服务器伺服 `game_runs/`，用 `http://127.0.0.1` 访问。无需手动起服务器。
