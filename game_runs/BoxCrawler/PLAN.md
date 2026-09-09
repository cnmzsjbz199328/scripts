# BoxCrawler — 实现计划（交接给执行 agent）

> 火柴人在箱体内部沿内壁爬行，只有 ←/→（兼容 A/D）。到达内壁上的舱口过关，五关线性。
> 素材已生成：`video_runs/BoxCrawler/output/{spritesheet.webp,sprite.json}`（3 动作，单帧 216×232）。
> 架构照 `game_runs/MIGRATION.md`，参照实现 = `game_runs/InkMechanics/`。命名空间 `window.BC`。
> 建完可删本文件。**提交由用户决定，不要自动 commit**（建议信息：`feat(BoxCrawler): 箱内爬行小游戏（video-sprite 三动作 + 五关轨道）`）。

---

## 1. 核心玩法

- 角色永远吸附在一条**轨道**上（= 箱体内壁的折线，见 §4 关卡数据）。状态只有一个标量 `s` = 沿轨道从顶点 0 起的弧长。
- `→`/`D` 增大 `s`，`←`/`A` 减小 `s`，速度 `CRAWL_SPEED`（px/s）。开放轨道两端夹紧到 `[0, pathLen]`。
- 给定 `s` → 由 `BC.Path.sample(s)` 求世界 `{x, y, angle, seg}`。精灵按 `angle` 旋转（脚朝内壁法线），按前进方向 `setFlipX`。
- **拐角**：`s` 进入某顶点 ±`CORNER_WINDOW` 且该顶点转角 > `CORNER_MIN_DEG` → 播 `cornerCrawl`（一次性），窗口内移速降到 `CRAWL_SPEED * 0.5`，播完继续。
- **调头**：输入方向符号翻转（且当前在移动）→ 播 `turnAround`（一次性），期间移动暂停 ~`TURN_LOCK_MS`，播完以新方向续爬。
- **过关目标**：爬到 `sExit`。若 `needCells > 0`，须先集齐全部 `cells`（沿轨道散布的电池），舱口才点亮。
- **危险**（L3+）：`strips` 定时伸缩的尖刺段（`s` 区间 + 周期/相位）；`rival`（L4+）另一个在同轨道上往返的爬行者。命中 → 扣 1 HP（HP=4），角色重生到本关起点；HP 0 → `lost`。
- 手感：即开即玩。无存档、无选关、无星级、无暂停菜单。START → 第 1 关 → … → 第 5 关 → 通关。R 重试当前关，M 静音。

**为什么这样切**：`crawl`=直壁移动，`cornerCrawl`=过内壁拐角，`turnAround`=原地反向。正好三组。
轨道是"轨"不是物理体——不引入任何 Arcade/Matter 物理，`s` 一维推进 + 折线采样即可，确定性强、bot 好驱动。

---

## 2. 目录结构（NS = `window.BC`）

```
game_runs/BoxCrawler/
  index.html                 # 抄 InkMechanics/index.html：Phaser CDN + #game-container + 三个 DOM 遮罩
                             #  + 按序 <script> + 末尾 fit 脚本。GAME_CONFIG/TILEMAP_DATA/ENTITIES_DATA 给
                             #  占位空对象（verify L0 会查引用存在性）。GAME_HUD_GLYPHS 可设 {full:'▮',empty:'▯'}。
  assets/spritesheet.webp    # 从 video_runs/BoxCrawler/output/ 复制（webp 入库，Cloudflare CI 要）
  assets/sprite.json         # 同上（仅作说明用，帧号在 config.js 里写死）
  game/config.js             # BC.Config
  game/levels.js             # BC.LEVELS[5]
  game/path.js               # BC.Path —— 纯函数：折线采样 / 长度 / 拐角查询
  game/systems/crawler.js    # BC.Crawler —— advance(state,input,dt) 推进 s + 决定动作态，返回事件
  game/systems/hazards.js    # BC.Hazards —— strip 伸出判定 / rival 位置 / 命中测试（纯函数，吃显式 t）
  game/render.js             # BC.Render —— drawCrate / drawRail / drawCells / drawStrips / drawExit
  game/scenes/BootScene.js   # 画背景 + GameHUD.onStart(()=>BC.Game.startLevel(0))
  game/scenes/LevelScene.js  # 状态机 + 输入 + 关流程 + juice + _auto 自驱 + probe()
  game/main.js               # BC.Game（probe 委派 / startLevel）+ __probe/__gameState/__advanceCard + Phaser 装配
```

`index.html` 脚本顺序（依赖序，错了就是 `undefined`）：
```
../_engine/audio.js → ../_engine/hud.js
game/config.js → game/levels.js → game/path.js → game/systems/crawler.js → game/systems/hazards.js
→ game/render.js → game/scenes/BootScene.js → game/scenes/LevelScene.js → game/main.js
```

---

## 3. 素材接入

复制：`video_runs/BoxCrawler/output/spritesheet.webp` 和 `sprite.json` → `game_runs/BoxCrawler/assets/`。

`LevelScene.preload()`：
```js
this.load.spritesheet('crawler', 'assets/spritesheet.webp', { frameWidth: 216, frameHeight: 232 });
```
`create()` 建 3 个动画（图集 16 列，帧号 = row*16 + col）：
```js
this.anims.create({ key: 'crawl',       frames: this.anims.generateFrameNumbers('crawler', { start: 16, end: 23 }), frameRate: 10, repeat: -1 });
this.anims.create({ key: 'turnAround',  frames: this.anims.generateFrameNumbers('crawler', { start: 0,  end: 13 }), frameRate: 14, repeat: 0 });
this.anims.create({ key: 'cornerCrawl', frames: this.anims.generateFrameNumbers('crawler', { start: 32, end: 47 }), frameRate: 13, repeat: 0 });
```
精灵 `setOrigin(0.5, ~0.93)`（脚底基线在 232 高里约 y=225，即 0.97；取 0.93~0.97 目测微调），显示 `setScale(~0.5)`（≈116px 高，按箱体尺寸调）。
默认朝右；`←` 方向 `setFlipX(true)`。`turnAround` 自带 180° 转身，播它时**不要**改 flipX，播完再按新方向定 flip。

---

## 4. 关卡数据（`game/levels.js` → `window.BC.LEVELS`）

舞台 960×540。箱体内区建议留边距，如内壁矩形 `x∈[120,840] y∈[70,470]`。轨道 `path` = 折线顶点数组（世界坐标），**开放轨道**（不闭合），角色从 `startS` 出生。

字段：
```
name, path:[[x,y],...], startS, sExit(数值; 不填=pathLen),
needCells:int, cells:[s0,s1,...],
strips:[{ s0, s1, period, duty, phase }],      // duty=伸出占空比(0~1)，t%period < duty*period 时伸出
rival:{ s0, s1, speed, phase } | null,          // 在[s0,s1]往返
intro:[标题, 正文]
```
`s` 值可用 `BC.Path.length(path)` 辅助，或直接给"第 k 段中点"这类，建生成时打印每段起止 `s` 方便填。

五关（数值示意，agent 按目测手感微调；**先保证 bot 能过**）：

| # | 轨道 | 目标 | 危险 | 教学点 |
|---|------|------|------|--------|
| 1 底盘直行 | 地面一条直线（1 段，无拐角） | 直接到 `sExit` | 无 | 纯 crawl + 松手停 |
| 2 绕两角 | 地面→右墙→天花板（3 段 2 拐角） | 到天花板上的舱口 | 无 | cornerCrawl；中途放 1 颗需回头的 cell → turnAround |
| 3 集电池 | 四壁大半圈（4~5 段） | needCells=3 | 无 | 折返取 cell，熟悉调头节奏 |
| 4 定时刺 | 同 3 | needCells=2 | 1 条 strip（period≈4s, duty≈0.55），卡在必经段 | 等刺收回再过（bot：strip 伸出就停，收回就走） |
| 5 综合·终 | 四壁 + 一道内置搁板（path 带一段伸进箱内的支线） | needCells=4 | 2 条异相 strip + 1 个 rival | 全部串起来 |

> 若嫌 rival 让 bot 卡：L5 的 rival 用大 `s0..s1` 慢速、且和玩家必经窗口错开相位；或先只做 strip，rival 留 TODO。

---

## 5. 对外契约（回归安全网，**照抄不可漏**）

`game/main.js`（抄 InkMechanics/game/main.js 结构）：
```js
window.BC = window.BC || {};
window.BC.Game = {
  auto: false, active: null, _phaser: null,
  startLevel(idx){ const sm=this._phaser.scene; sm.stop('BootScene'); sm.start('LevelScene',{idx}); },
  probe(){ return (this.active && this.active.probe) ? this.active.probe()
    : { x:0,y:0, worldW:1, nextGoalX:0, progress:0, segment:0, locked:false,
        dangerNow:false, dangerAhead:false, hp:4, maxHp:4, score:0, goalScore:5,
        phase:-1, act:-1, deaths:0, deathBudget:4, won:false, lost:false,
        cardActive:false, started:true, mode:'boot' }; },
};
window.__gameState = { player: { x:0, y:0, vx:0, vy:0 } };   // LevelScene.create 里改指向真 crawler 对象
window.__probe = () => window.BC.Game.probe();
window.__advanceCard = () => { if (window.BC.Game.active) window.BC.Game.active._advanceCard(); };
// Phaser 装配：scene:[BC.BootScene, BC.LevelScene]，backgroundColor 深色，width/height 取 Config
```

`LevelScene`：
- `create()` 里：`window.BC.Game.active = this; window.__scene = this; window.__gameState = { player: this.player };`
  （`this.player` = 有实时 `.x/.y` 的 crawler 对象；verify L2 会断言按键后 `player.x/y` 变化）
- `BootScene.create()`：`BC.Game.auto = !!navigator.webdriver;` START 经 `GameHUD.onStart(()=>BC.Game.startLevel(0))`。
- `?autostart`（hud.js 已处理）与 `navigator.webdriver` → 不显示菜单，直接进第 1 关。
- `probe()` 返回：
  ```
  x: <sAlongPath>,            // ★ 关键：随朝出口爬行单调增大，让通用 bot「朝 nextGoalX 移动」直接生效
  y: 0, worldW: pathLen, cellX: this.player.x,
  nextGoalX: <最近未收 cell 的 s；都收齐则 sExit>,
  progress: s/pathLen, segment: segIdx,
  locked: <turnAround 或 cornerCrawl 播放中>,   // bot 不把动画锁帧计入 stuck
  dangerNow: <当前 s 处 strip 伸出 或 贴到 rival>,
  dangerAhead: <前方一步 same>,
  hp, maxHp:4, score, goalScore:5, phase:level, act:level,
  deaths: 4-hp, deathBudget:4,
  won: gameOver && score>=5, lost: gameOver && score<5,
  cardActive, started:true, mode:'crawl'
  ```
- `_advanceCard()`：叙事/结算卡推进（抄 InkMechanics：SPACE/ENTER/click，`_auto` 时 `delayedCall(500,...)` 自动过）。

---

## 6. `_auto` 自驱（保 `won` 契约，`game-playtest` 靠它拿到通关录像）

参照 InkMechanics「bot：顺序自动推进」。当 `BC.Game.auto`，`LevelScene.update` 内自己驱动，不依赖外部按键：
1. 目标 `s*` = 最近未收 `cell` 的 `s`（就近，允许回头）；都收齐 → `sExit`。
2. 朝 `s*` 方向推进 `s`（复用真实 `BC.Crawler.advance`，只是 input 由 AI 给）。
3. 下一步若落进**伸出的 strip**：停，等它收回（关卡定时确定，`BC.Hazards` 可查下次收回时刻）。
4. 与 `rival` 的 `|Δs| < 安全距`：停，等它走开（或后退到上一个 cell 处）。
5. 到 `sExit` 且 cell 齐 → `_clearLevel()`；`score>=5` → `_win()`，否则 `delayedCall` 进下一关。
外部 `play.ts` 仍然录屏、读 `probe()` 指标；`_auto` 只是保证一定能走完。

---

## 7. 渲染 / HUD / juice（只投手感）

- `BC.Render`：深色木箱内壁（木纹 + 铆钉用 graphics 画）；轨道 = 一条亮色粗导轨 + 轻微辉光；cell = 脉动圆点；strip = 沿区间的三角尖刺（伸缩用 tween/相位）；exit = 舱口，集齐 cell 后变亮 + 呼吸光。
- HUD 用 `_engine/hud.js`：`setHearts(hp,4)`、`setScore('n/5')`、`setObjective(每关一句话)`。
- juice：拐角「咔」+ 极轻震屏；拾取 cell 叮 + 粒子；受击红闪 + 震屏 + 顿帧；通关小庆祝。全部走 `_engine/audio.js`（`window.GameAudio?.play(...)`），M 键静音。
- `prefers-reduced-motion` → 关震屏/尾迹/顿帧（抄 InkMechanics `this.reducedMotion`）。

---

## 8. 执行步骤（每步可验证，别跳）

1. **骨架**：建目录、复制素材、写 `index.html` + `config.js` + 各 NS 空模块 + `main.js`（Phaser 装配 + 契约 stub）+ `BootScene`（画底 + START）。
   → `npx tsx skills/game-verify/verify.ts BoxCrawler --layers=0,1` 全绿（能加载、canvas 渲染、无 404/报错）。
2. **轨道 + 渲染**：`path.js` 折线采样 + `render.js` 画箱 + 画 L1 导轨；轨上放一个**静止**精灵（正确旋转/缩放/基线）。人工目测截图。
3. **爬行**：`crawler.js` + 输入（←/→ **和** A/D）。移动时播 `crawl`、松手停在某帧；精灵沿轨旋转 + flipX。
   → `verify.ts BoxCrawler --keys=LEFT,RIGHT,A,D,SPACE`：L2 全绿（画面推进 + `__gameState.player.x/y` 变化）。
4. **拐角 + 调头**：顶点处触发 `cornerCrawl`，反向触发 `turnAround`（期间锁移动）。逐个目测：拐角不穿模、调头不瞬移、播完朝向对。
5. **单关闭环**：exit + `_clearLevel` + 叙事/结算卡 + HUD + `_auto` 自驱（仅 L1）。
   → 用只含 L1 的构建跑 `npx tsx skills/game-playtest/play.ts BoxCrawler`，`result:"win"`。
6. **补关卡**：`levels.js` 填 L2–L5（cells/needCells/strips/rival）+ `hazards.js`。`_auto` 扩展为「就近取 cell → 等刺 → 躲 rival」。逐关 `_auto` 跑通。
7. **契约收尾**：`probe()` 补齐全部字段；`main.js` 委派；`__gameState.player`、`__scene`。
8. **精装修**：juice + 音效 + reduced-motion。
9. **过门（按序，必须全绿）**：
   - `npx tsx skills/game-verify/verify.ts BoxCrawler` → L0/L1/L2 全绿，`verify-screenshot.png` 目检。
   - `npx tsx skills/game-playtest/play.ts BoxCrawler` → `result:"win"`、`progressPct:100`、`deaths` 0–2、`runtimeErrors:[]`、`hpRemaining` 不为 0 也不满血最佳。偏离就调 §4 数值重跑。
   - 压制录像 + 出 10s 预览：
     ```
     cd game_runs/BoxCrawler/playtest
     ffmpeg -y -i playthrough.webm -vf "scale=1280:-2" -c:v libx264 -pix_fmt yuv420p -crf 21 -preset slow -movflags +faststart playthrough.mp4
     # 10s preview.mp4（入库）：从 playthrough 截最有代表性的一段
     ffmpeg -y -ss <t> -t 10 -i playthrough.webm -vf "scale=1280:-2" -c:v libx264 -pix_fmt yuv420p -crf 23 ../preview.mp4
     ```
10. **注册 showreel**：往 `game_runs/games.json` 追加一条（`id:"BoxCrawler"`、`gameType`/`genre` 自拟如 `"arcade"`/`"PRECISION"`、`accent`、`previewBg` 深色、`icon:"📦"`、`previewVideo:"BoxCrawler/preview.mp4"`、`path:"BoxCrawler/index.html"`、`createdAt:"2026-09-09T00:00:00.000Z"`）。

---

## 9. 待定选择（默认已选，执行中如有更优可换，换了在交付说明里注明）

- **轨道拓扑**：L1–L4 纯箱体内壁一圈；L5 加一道伸进箱内的搁板支线。（备选：全程纯内壁，更省事）
- **开放 vs 闭合轨道**：开放（两端夹紧）——让 turnAround 有意义。
- **2 键下的避险动作**：定时刺=「停下等」；rival=「后退到安全凹处」。不加第三个键。
- **bonus `climb` 动画**：v1 不切进图集，墙面段用 `crawl` 旋转即可；确需竖直攀爬手感再按 `video_runs/BoxCrawler/BUILD.md` 补 `climb` 行。
- **精灵基线/缩放**：`setOrigin(0.5,0.95)` + `setScale(0.5)` 起调，按箱体目测定。
