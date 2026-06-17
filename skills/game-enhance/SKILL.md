---
name: game-enhance
description: 提升一个已生成的游戏（game_runs/<Game>/）——增加叙事（开场/过场/结局/对白）、新玩法机制、视觉特效(VFX)、或调平衡。按 recipe 分派；任何改动以 GDD 为唯一事实源、需新素材时复用共享管线、完成后必须过 game-verify 回归门。不用于从零生成（game-gen）或修 bug（game-fix）。
---

# Game Enhance Skill（游戏提升）

## 何时用本 skill

用户想让一个**已能运行的游戏**变得更好玩 / 更有故事 / 更好看 / 更平衡。

- 从零做新游戏 → **game-gen**
- 修破坏可玩性的 bug → **game-fix**
- 锦上添花（本 skill）→ 见下

---

## 公共契约（所有 recipe 必须遵守）

1. **GDD 是唯一事实源**：任何玩法/叙事改动，**先**更新 `game_runs/<Game>/gdd.json`（`story`、`winCondition`、`zones`、`hud` 等），**再**改代码。让 GDD 与实现始终一致，后续 assemble / 验证才有依据。
2. **新素材走共享管线**：需要新贴图→ material-texture；新角色/动作→ char-sprite；新特效/动态物→ object-anim。**不自造素材**。
3. **回归门强制**：提升正是 bug 的高发注入源。每次改完**必须**：
   ```bash
   npx tsx skills/game-verify/verify.ts <Game>
   ```
   未全绿不得宣布完成（参见 game-verify）。
4. **改 UI 文案/结构后重跑组装**（若涉及开始/结束界面字段）：`npx tsx skills/game-gen/assemble.ts <Game>`，它从 `gdd.json` 重注入开始界面与结局。游戏内逻辑改动则直接编辑 `game/game-logic.js`。

> 本 skill 暂不做物理子拆分。下列 recipe 各自**自包含**（输入 / 改哪些文件 / 需要的素材 / 验证关注点），将来某个 recipe 膨胀，可原样抽成独立 skill，契约不变。

---

## Recipe: 叙事（narrative）

**目标**：开场故事、关卡过场、对白、丰富的胜负结局。

**改哪些文件**：`gdd.json`（`story.setting/protagonist/conflict/resolution`）+ `game/game-logic.js`。

**做法**（提炼自现有叙事提交）：
- **关卡过场**：在 logic 顶部用数据表声明每关故事，进关时弹 DOM 覆盖横幅：
  ```javascript
  const levelTransitionStories = {
    2: ['🏯 第二关：城堡屋顶', '竹林已被踏遍！', '金币的香气从屋顶飘来……'],
    3: ['☁️ 第三关：云端仙境', '...', '收满100枚，成为传奇！']
  };
  // 升关时
  const next = levelTransitionStories[this.currentLevel + 1];
  if (next) this.showStory(next, 3000);
  ```
- **故事横幅**：`showStory(lines, duration)` 创建一个 `position:absolute` 的 DOM `<div>` 叠在 canvas 上，定时移除（复用游戏现有同类方法的样式）。先 `document.getElementById(id)?.remove()` 防重复。
- **结局**：用 `gdd.story.resolution` 写多行 `window.GameHUD?.showGameOver(true/false, '...\n...')`，可内插 `this.score` 等状态。
- **开始界面**：改 `gdd.title/tagline/story.setting` 后跑 `assemble.ts` 重注入。

**验证关注点**：横幅不挡死操作、过场后游戏恢复、结局触发后停止逻辑（`this.gameStarted = false`）。verify 的 L2 应仍全绿。

---

## Recipe: 玩法（mechanics）

**目标**：新增机制（新敌人行为、道具、关卡元素、技能等）。

**改哪些文件**：`gdd.json`（`coreLoop`、`winCondition`、`zones`、`hud`）+ `game/game-logic.js`（+ 必要时 `entities.json` / `game-config.json` / `tilemap.json`）。

**做法**：
- 先把新机制写进 GDD（玩家能读懂的 `winCondition.description` + 代码可用的 `winCondition.trigger`）。
- 实现时遵守 game-gen 的《图层与深度规范》《Phaser 动画规范》，避免引入 game-fix 知识库里的经典 bug（尤其 **静态体 `refreshBody()`**、**`JustDown` 消费性读取**、**`setFlipX` 在 play 之后**）。
- 新增需碰撞的实体务必 `setDisplaySize()` 后 `refreshBody()`。

**验证关注点**：新机制可触发、不破坏既有移动/攻击、胜负条件仍可达。verify L2 用贴合新机制的 `--keys` 跑。

---

## Recipe: 视觉特效（VFX）

**目标**：升级/爆炸/拾取/技能等特效。

**改哪些文件**：用 **object-anim** 生成特效序列帧 → 落到 `assets/objects/` → 在 `game/game-logic.js` 播放（深度固定 `DEPTH.EFFECTS`，不参与 y-sort）。

**做法**：参考 `scratch/build_neon_td_effects.ts` 这类已有特效生成脚本的组织方式；特效精灵不加碰撞、用完销毁。

**验证关注点**：特效素材无 404（L0/L1）、播放不报错、不遮挡 HUD。

---

## Recipe: 平衡（balance）

**目标**：难度曲线、波次进度、数值调参。

**改哪些文件**：通常只改 `game/game-logic.js` 的数值/节奏；若改变胜利目标，同步 `gdd.winCondition` 与 `gdd.hud.*.goal`。

**做法**：小步调参，纯数值，不动结构。

**验证关注点**：游戏仍可在合理时间内推进、胜负仍可达。verify 全绿即可。

---

## 边界

- 不修破坏可玩性的运行时 bug（那是 game-fix）——但提升过程中若**自己引入**了 bug，由 verify 回归门拦截，就地修掉再继续。
- 不从零生成（game-gen）。
- 完成判定唯一标准：`gdd.json` 与实现一致 + `game-verify` 全绿 + 截图人工核对。
