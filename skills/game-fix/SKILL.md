---
name: game-fix
description: 修复一个已生成的游戏（game_runs/<Game>/）中破坏可玩性的运行时 bug——移动卡死、按键无响应/抢占、角色穿模、未定义方法、资源 404、动画不播放等。流程为"复现→定位→对照已知 bug 知识库→局部修复→验证确认"，以 game-verify 作为复现与确认的闭环门。不用于从零生成（那是 game-gen），也不用于加玩法/叙事（那是 game-enhance）。
---

# Game Fix Skill（游戏修复）

## 何时用本 skill

用户报告**某个已存在的游戏**有问题：动不了、打不出招、卡住、穿模、点了没反应、报错、素材不显示……

- 从零做新游戏 → 用 **game-gen**
- 加新玩法 / 叙事 / 特效 / 调平衡 → 用 **game-enhance**
- 修 bug（本 skill）→ 见下

修复期间的生成规范（动画/深度等）以 game-gen 的《图层与深度规范》《Phaser 动画规范》为准——本 skill 是**症状优先的诊断视角**，与之互补。

---

## 修复闭环（必须按序）

### 1. 复现 — 跑验证门拿结构化报告
```bash
npx tsx skills/game-verify/verify.ts <Game> --out=verify.json
```
读 JSON：哪一层失败、`errors[].msg` 与 `errors[].at`（精确到 `game-logic.js:行:列`）、L2 的 `reason`、`notes`。用 Read 工具看 `game_runs/<Game>/verify-screenshot.png`。

> 若报告全绿但用户仍说有问题：用更贴近该游戏的按键复现，例如 `--keys=J,K,SPACE --seconds=6`；必要时人工在浏览器打开确认。

### 2. 定位 — 按报告读代码
按 `at` 指向的位置读 `game_runs/<Game>/game/game-logic.js`（及 `game-config.json` / `tilemap.json` / `entities.json` / `index.html`）。

### 3. 对照下方《已知 bug 知识库》
绝大多数破坏可玩性的 bug 属于少数几个反复出现的根因（下表均提炼自真实修复提交）。先对号入座，再动手。

### 4. 局部修复
用 Edit 做**最小**改动，不顺手重构、不改玩法。每处修复加一行注释说明根因（与现有修复提交风格一致）。

### 5. 确认 — 再跑验证门，必须全绿
```bash
npx tsx skills/game-verify/verify.ts <Game>
```
未全绿不得宣布完成。修一处可能暴露下一处，重复 1–5 直到绿。

---

## 已知 bug 知识库（症状 → 根因 → 修法）

### A. 移动卡死 / 角色被"墙"困住 ⭐ 最高频
**症状**：角色完全动不了，或在某些格子边缘被卡住。
**根因**：静态物理体没有刷新到**显示尺寸**。瓦片美术原图是 256/512px，显示缩到 64px，但 body 仍是原图全尺寸，撑满整格甚至溢出，把玩家挡死。常见错误调用 `body.updateFromImage()`（按纹理尺寸）。
**修法**：对每个静态碰撞精灵在 `setDisplaySize(64,64)` 之后调用 `refreshBody()`：
```javascript
wallImg.setDisplaySize(64, 64);
this.physics.add.existing(wallImg, true);
wallImg.refreshBody(); // 同步静态 body 到 64×64 显示尺寸（美术原图 256/512px）
```
overlap 用的 trap/portal 等同理也要 `refreshBody()`。

### B. 按键无响应 / 招式打不出（JustDown 抢占）⭐ 高频
**症状**：某个动作偶尔或始终触发不了（如 punch/kick）。
**根因**：`Phaser.Input.Keyboard.JustDown(key)` 是**消费性读取**——调用后会重置该键的 `_justDown` 标志。同一帧内对同一个键第二次调用必返回 `false`。多处逻辑都读同一个键就会互相抢占。
**修法**：每个键每帧只读一次，存进局部变量复用：
```javascript
const jJustDown = Phaser.Input.Keyboard.JustDown(this.keyJ);
if (jJustDown) this.keyJLastDown = this.time.now;  // 抓取检测
// ...
if (jJustDown) { /* 出拳 */ }                        // 复用，不再调用 JustDown
```

### C. 角色平移但动画不播放（setFlipX 顺序）
**根因**：Phaser 3.60 中 `setFlipX()` 会触发内部 `updateFrame()`，若在 `play()` **之前**调用会让动画静默失败。
**修法**：先 `play()` 再 `setFlipX()`。向左走 `setFlipX(true)`，向右 `setFlipX(false)`（char-sprite 的 walk-left 行视觉朝右）。

### D. 动画卡在某一帧不切换（守卫条件不全）
**根因**：只判断 `currentAnim?.key`；`anims.stop()` 后部分版本不清空 `currentAnim`。
**修法**：守卫同时查 `isPlaying`：
```javascript
if (!this.player.anims.isPlaying || this.player.anims.currentAnim?.key !== targetKey) {
  this.player.play(targetKey);
}
```

### E. 运行时 `X is not a function`（缺方法）
**症状**：L1/L2 报 `pageerror: this.xxx is not a function`，`at` 指向调用处。
**修法**：在该 scene 类里补上被调用却未定义的方法（如曾缺的 `drawEnemyHealthBar`）。先确认是真的漏写，而非拼写错。

### F. 资源 404（贴图/图集/特效缺失）
**症状**：L0 报缺 `assets/...`，或 L1 `requestfailed`/`404`；画面缺图。
**修法**：补素材——调对应共享管线生成（贴图 material-texture、特效/动态物 object-anim、角色 char-sprite），或修正 `tileIndex` / `entities[].sprite` 里写错的名字使其对上已有文件。

### G. 角色穿模 / 遮挡错乱（y-sort 深度）
**根因**：违反《图层与深度规范》。`decor_top` 须固定 `DEPTH.DECOR_TOP`；所有可移动实体与 `ysort:true` 的 objects 共用 `DEPTH.YSORT + sprite.y` 且每帧在 `update()` 刷新。
**修法**：按 game-gen 的深度常量与 `renderTileLayer` 参考实现校正。

### H. 重力类错配（横版/俯视/游泳）
**症状**：俯视或水下游戏角色被往下拽、无法自由移动。
**修法**：俯视/游泳类世界 `body.setAllowGravity(false)`；无重力的水下移动用阻尼衰减代替自然下落（`setVelocityY(v*0.85)`）。

### I. 移动端缺虚拟按钮（play.html 扫描不到键）
**症状**：手机上某操作没有对应按钮。
**根因**：`play.html` 的 `scanKeys()` 靠正则扫 `KeyCodes.X`；`createCursorKeys()` 的隐式键（`cursors.space` / `cursors.shift`）不经 `addKey()`，扫不到。
**修法**：优先在 game-logic.js 用 `addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)` 显式注册；play.html 已对 space/shift 加了二次扫描兜底，新增隐式键时同步补扫描规则。

---

## 边界

- 只做修复，不加功能、不改玩法、不重写（那些走 game-enhance）。
- 修复完成的判定**唯一标准**是 `game-verify` 全绿 + 截图人工核对无误。
- 共享素材管线（material-texture / char-sprite / object-anim）与 game-gen / game-enhance 共用，缺素材时复用、不自造。
