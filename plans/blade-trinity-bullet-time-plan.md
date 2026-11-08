# BladeTrinity 蓄力变装·子弹时间执行计划

日期：2026-11-03。供其他 agent 执行；本轮只制定计划，不修改游戏。
基线：`ca87b42`（分支 `feat/bladetrinity-transform`，蓄力变装已接入、transform-check 121/121）。出问题可整体回到这个提交。

## 0. 用户意图与已锁定决策

用户原意：变身（蓄力变装）在战斗里本来很快，为了便于观赏要放慢，像子弹时间那样；变身的时长不计入战斗时长，变身过程中其他角色不会攻击、或者来不及攻击。

逐条锁定（用户 2026-11-03 确认"按建议来"）：

1. **全场慢放，不做时停。** 所有对象一起变慢，包括变身者自己的变装进度。战斗时间里蓄力仍是原来的 420ms，规则与平衡不变；起蓄前已在飞的剑气照样能打断蓄力（蓄力仍有代价）。时停会让变身者零风险蓄力，已否决。
2. **慢放倍率 0.35。** 满蓄 420ms 战斗时间在画面上约 1.2s，三派 18–20 格每格约 60ms。倍率做成配置，用户再凭眼调。
3. **玩家和 AI 变身都慢放；双方同时蓄力时，两人都收蓄才恢复。** 轻点（不足 minFrac）也会进入慢放，但松手当帧就恢复。
4. **松手立即恢复 1×（硬切，不渐出）。** 慢放 → 出剑的速度反差本身就是打击感。进入时用约 90ms（真实时间）短渐入，避免突兀。
5. **只在变装真的在播时慢放**（`f.tf` 存在）。变装图集没载到、退回 guard 占位时不慢放。

本轮不做：暗角/去饱和/音调等慢放附加特效（机制先行，特效另议）；改 fullMs、minFrac、扣蓝、回蓝、起浪轰飞、waveStun、AI 蓄力时长、剑气数值；改 transform-preview.html。

## 1. 现状事实（动手前核对，行号以 ca87b42 为准）

- 变装进度 = 蓄力比例：`charge.js _tickCharge` 调 `BT.Transform.setProgress(this, f, (time - f.chargeFrom) / BT.CHARGE.fullMs)`。`BT.CHARGE.fullMs = 420`（`data.js:717`，与 `BT.MP.drainRate` 咬合）。18–20 格挤在 420ms 内，每格约 22ms，比源片 24fps 还快一倍，所以看不清。
- 游戏没有回合倒计时。"战斗时长"指驱动一切的游戏内时间：状态到期（`stateUntil`）、冷却、无敌、AI 决策、回蓝、剑气飞行、蓄力扣蓝。
- "对手来不及攻击"在规则上已经成立：起蓄 `_chargeWave` 把近敌轰到场边，给 `waveStun 520ms` 硬直加无敌，长于满蓄 420ms。本计划只解决画面节奏。
- 时间来源：
  - `BladeTrinityScene.js:216` `update(time, delta)`，`time` 下传给各系统；`delta` 用于回蓝（`:261`）、`_tickQi`（`:272`）、前景物理（`:282`）。
  - 各系统约 40 处直接读 `this.time.now`（combat/charge/defense/crit/arte/foregroundPhysics…），POST_UPDATE 钩子（`BladeTrinityScene.js:96-97`）和 `__probe`（`:134`）也读它。
  - 已核：Phaser 3.60 内部不读 `scene.time.now`。`Clock.update` 每帧在 UPDATE 事件里执行 `this.now = time`（早于 `scene.update`），`Clock.boot` 也赋值一次。
- 现有"画面静止"：抜刀 `freezeUntil`（`arte.js:215` 设，`BladeTrinityScene.js:243-258` 每帧比时刻自愈、暂停物理）。它的注释写明不能用 delayedCall 恢复（无头下滞后约 6 倍），本计划沿用同一原则。
- Arcade 物理默认 `fixedStep`（`main.js:9` 未改）。`world.timeScale = 1/s` 是把步进间隔拉长到每约 48ms 一步，飞行中的人会一跳一跳，不采用。
- `this.anims`（AnimationManager）是**整个 game 共享**的，scene restart 不会重置 `globalTimeScale`。
- 自动试玩：`skills/game-playtest/play.ts:293` 起蓄时 `chargeTimeRemaining = 460`（真实毫秒），`:267` 每 tick 减 `tickMs`。慢放后它只会蓄到约 0.38，不改就会悄悄改变 bot 行为。`:92-93` 已有 BladeTrinity 专用的 `?tier=` 透传。
- `tools/transform-check.mjs:223-229` 的对局用例用 `game.step(t, 1/60s)` 手动步进，游戏时间确定、与机器负载无关。新检查沿用这个方式。

## 2. 设计

### 2.1 战斗时钟（可变速）

新增 `game/systems/bullettime.js`（与其他 systems 同样以原型混入 `BladeTrinityScene`），在 `index.html` 里放在 `transformation.js` 之后、`charge.js` 之前。只服务本游戏，不进 `_engine`；以后有第二个游戏要用再上移。

- `_installFightClock()`，在 `create()` 开头调用：对 `this.time`（Clock 实例）`Object.defineProperty('now', { get, set, configurable: true })`。
  - setter 接收 Phaser 写入的真实时间：第一次写入时让游戏时间等于真实时间；之后 `d = max(0, v - real)`，`game += d * scale`，`fightDelta = d * scale`，`real = v`。
  - getter 返回游戏时间。
  - 安装前先读出当前 `now` 作初值。restart 时重复安装要幂等（Clock 实例跨 restart 保留），游戏时间保持单调。
  - 好处：约 40 处 `this.time.now`、POST_UPDATE 钩子、探针、delayedCall 回调里读到的全是游戏时间，不用逐处改。
- `update(time, delta)` 第一行（在 select 等任何 early return 之前）：先 `this._tickBulletTime(delta)`（delta 是真实毫秒），再把形参换成游戏时间：`time = this.time.now; delta = <本帧 fightDelta>`。之后所有下游（含 `freezeUntil` 比较、`_prevTime`、回蓝、剑气、前景物理）一律是游戏时间。
- 约定写进 README：游戏逻辑只能读 `this.time.now` 或 `update` 的 `time`，不得读 `performance.now()` / `Date.now()`。

### 2.2 子弹时间状态（每帧推导，不做 enter/exit 调用）

`_tickBulletTime(realDelta)` 每帧从现状推导，不在 `_startCharge` / `_endCharge` 里埋开关。这样任何收蓄路径（释放/取消/受击/换场/重开/KO）都不可能把慢放卡住，与 `freezeUntil` 同一套路。

- `want = cfg.enabled && this.phase === 'fight' && this.fighters.some(f => f.charging && f.tf)`
- `want` 为真：`scale` 在 `rampInMs`（真实毫秒）内线性降到 `cfg.scale`。为假：当帧硬切回 1。
- `scale` 变化时同步到各子系统：
  - `this.anims.globalTimeScale = s`：对手受击/倒地动画变慢。⚠️ 这是 game 级全局量。
  - `this.tweens.timeScale = s`：描边一弹、招式名、服饰回落等补间变慢，属预期。
  - `this.time.timeScale = s`：delayedCall 一类 Clock 事件变慢。
  - 物理：`world._frameTime = s / world.fps`，步进频率不变、每步积分时间按比例缩短，画面平滑。恢复用公开的 `world.setFPS(world.fps)`。`_frameTime` 不是 number 时（Phaser 版本变了）退回 `world.timeScale = 1 / s`，并在控制台警告一次。版本钉在 3.60.0（CDN 与 `_engine/vendor` 一致），升级时要复查。
- 不变速的部分：相机 shake/flash、GameAudio、DOM HUD、键盘/手柄输入层，都是真实时间。
- 复位：`create()` 里与 `this.events.once('shutdown', …)` 里都把上述四处复位到 1（`anims` 是全局的，重开后不复位就会永久慢放）。
- 与 `freezeUntil` 的关系：两者都在游戏时间里比较，互不干扰；冻结期间游戏时钟按当前 scale 照走。

### 2.3 配置

`data.js` 紧挨 `BT.CHARGE` 之后，写清与 fullMs 的换算：

```js
// ─────────── 子弹时间（蓄力变装慢放，用户定 2026-11-03）───────────
// 只拉长画面，不改战斗：所有计时走游戏时钟（bullettime.js），慢放期间游戏时钟按 scale 走。
// 满蓄 fullMs(420) / scale ≈ 1.2s 画面；松手当帧回 1×。
BT.BULLET_TIME = {
  enabled: true,
  scale: 0.35,
  rampInMs: 90,     // 真实毫秒
};
```

URL 覆盖，解析位置同 `?tier=`（`BladeTrinityScene.js:76`）：`?bt=0` 关闭；`?bt=0.5` 这类 0–1 之间的数作为 scale，供用户凭眼调。非法值忽略。

### 2.4 探针与自动试玩

- `__probe()` 新增可选字段 `timeScale`（当前 scale）。select 分支也补上 `timeScale: 1`。其余字段不动。
- `skills/game-playtest/play.ts`：`chargeTimeRemaining -= tickMs * (P.timeScale ?? 1)`。其他游戏不报这个字段，行为不变。`:92-93` 增加 `--bt=` 透传，与 `--tier` 组合成同一个查询串。同步更新 `skills/game-playtest/SKILL.md` 的探针契约（新增可选字段及其含义）。
- bot 的其他真实时间窗口（防御按住 240ms、缩地间隔 900ms）不缩放。慢放只在蓄力期间出现，影响可忽略，在 SKILL.md 注明即可。

### 2.5 已知并接受的副作用（写进 README）

- 玩家满蓄要真实按住约 1.2s，慢动作里更容易掐准松手时机。
- AI 蓄力期间，没被起浪轰到的玩家有约 3 倍真实时间做决定，但移动速度按战斗时间不变，能走的距离一样。

## 3. 实施步骤（每步单独提交，便于回退）

1. **只引入战斗时钟，scale 恒为 1，行为不变。** 完成 2.1；`_tickBulletTime` 先只做复位与 `want` 计算，不改 scale。跑 `transform-check.mjs`（应仍 121/121）+ 两道验证门。
   提交：`feat(BladeTrinity): 引入可变速战斗时钟（默认 1×，行为不变）`
2. **子弹时间。** 完成 2.2、2.3，对局里手动确认三派满蓄约 1.2s。
   提交：`feat(BladeTrinity): 蓄力变装子弹时间（全场慢放 0.35×，松手回 1×）`
3. **探针、bot、检查脚本。** 完成 2.4 与第 4 节的 T 段。
   提交：`feat(BladeTrinity): 子弹时间探针字段 + playtest 蓄力按游戏时间计 + transform-check T 段`
4. **文档。** README 新增 §8.4「子弹时间」：意图、锁定决策、配置/URL、实现要点、2.5 副作用、验收结果。
   提交：`doc(BladeTrinity): 子弹时间说明与验收`

## 4. 验收

### 4.1 transform-check.mjs 新增 T 段（手动步进，1/60s 一帧）

已有的 G 段 93 例**用 `?bt=0` 原样跑**，证明关掉慢放时行为与基线一致。新增 T 段在默认开启下跑，三派各一遍，玩家与 AI 路径都要覆盖：

| # | 用例 | 判据 |
|---|---|---|
| T1 | 玩家满蓄按住到保持帧 | 真实步数 ≈ (420 − 渐入补偿)/0.35，约 1.10–1.25s；同期游戏时间 420±1 帧 |
| T2 | 蓄力中各子系统 | `anims.globalTimeScale`、`tweens.timeScale`、`time.timeScale` = scale；`world._frameTime` = scale/fps |
| T3 | 松手释放 | 下一帧四处全回 1，`_frameTime` = 1/fps；剑气按原规则生成；剑气每真实秒位移与 `?bt=0` 相同 |
| T4 | 战斗时间不变 | 对手 waveStun 按游戏时间 = 520±1 帧；满蓄扣蓝 = 100（±1 帧量）；同蓄力比例下剑气数量/伤害与 `?bt=0` 相同 |
| T5 | 轻点取消、受击打断 | 当帧回 1；起蓄前已在飞的剑气仍能打断蓄力（慢放不给免疫） |
| T6 | AI 蓄力；双方同时蓄力 | AI 起蓄即慢放；双方同蓄时一方先收仍保持慢放，两方都收才回 1 |
| T7 | 蓄力中 KO / interlude / over / 重开 | 全部回 1；重开后新一局首帧 `anims.globalTimeScale === 1` |
| T8 | 变装图集 404（沿用 G 段的缺图手段） | 不慢放 |
| T9 | 慢放结束后再抜刀 | `freezeUntil` 按时解冻，物理恢复（游戏时间与真实时间已有偏差的情况下） |
| T10 | `?bt=0` 与 `?bt=0.5` | 前者全程 1×；后者满蓄约 0.84s |
| T11 | 30 轮蓄放循环 | 无报错，显示对象/补间/监听器回到基线 |

T 段写入同一份 `video_runs/BladeTrinityTransform/check/report.json`（入库），截图仍在 `check/`（png 已 gitignore）。

### 4.2 验证门

1. `npx tsx skills/game-verify/verify.ts BladeTrinity`
2. `npx tsx skills/game-playtest/play.ts BladeTrinity`：能通关、不卡死；`usage` 里玩家与 AI 的蓄力次数不为 0。
3. 平衡 A/B（判回归用）：本机负载噪声极大（同一提交胜率 3/4 → 0/8 都出现过），开/关子弹时间要在同一时段**交替**跑，每组 n ≥ 10，报告原始胜率与时长，不只给结论。预期无显著差异。

### 4.3 人眼验收（留给用户，执行者不得代判）

执行者交付三派满蓄的录屏（playwright 录制，放 scratchpad，不入库）和 `?bt=` 调参方法。"1.2s 合不合适、渐入是否突兀、硬切回速是否有冲击感"由用户看完拍板；调参只改 `BT.BULLET_TIME.scale`。

## 5. 坑位清单

- `anims.globalTimeScale` 是全局量，漏复位 = 重开后整场慢放。
- 不要用 delayedCall / tween onComplete 来结束慢放（无头下 Clock 事件严重滞后），一律每帧推导。
- 无头下不要用墙钟测时长，用手动步进数帧。
- `this.time.now` 的 setter 必须容忍 `boot` 时的首次写入，以及 restart 后的重复安装。
- 慢放判据必须排在 `update` 的 phase 分支之前（与 `freezeUntil` 解冻同理），否则 KO 进入 over 后慢放永不复位。
- 新代码只读游戏时钟；以后谁加 `performance.now()` 进玩法逻辑，慢放就会错位。
- 不改 `transformation.js` 的映射公式：它的时间来自 charge.js，换成游戏时钟后自然变慢。

## 6. 版本控制

- 在 `feat/bladetrinity-transform` 上继续，按第 3 节分步提交，格式 `feat|fix|doc(BladeTrinity): 中文描述`。
- `.claude/settings.json` 是本机权限配置，不要随游戏提交。
- 每步提交前跑完该步的检查；任何一步回归都可以单独 `git revert`，或整体回到 `ca87b42`。
- 不推送、不开 PR，除非用户另行要求。
