# BladeTrinity 蓄力轰飞挪到松手执行计划

日期：2026-11-05。供其他 agent 执行；本轮只制定计划，不修改游戏。
基线：`00d8239`（分支 `feat/bladetrinity-transform`）。出问题可整体回到这个提交。

## 0. 用户意图与已锁定决策

用户试玩后的反馈：按住 L 变身时"触发了实际的攻击效果，对手在空中缓慢漂移"。变身应该只是变身。

根因：`_chargeWave` 在起蓄当帧把对手打飞（击退、硬直、无敌、震屏、残影）。这段 430ms 的击退被 0.35× 子弹时间拉到约 1170ms，对手整段变身都悬在空中。物理本身没算错，是"瞬发轰飞"和"全场慢放"的设计冲突。

用户 2026-11-05 选定方案（"按推荐的来"）：

1. **轰飞从起蓄挪到松手瞬间，按原速结算。** 变身期间对手完全不受影响；松手时斩击与气浪一起爆发。轰飞的内容和力度不变。
2. **轻点 L 仍然轰飞**，保留脱身用途（松手就结算，轻点也是松手）。
3. **作废的蓄力不轰飞**：受击打断、掉线/失焦取消、KO 换场。
4. **接受代价：贴身蓄力可能被打断。** 这修订了 2026-11-03 的"变身过程中对手不会或来不及攻击"，README §8.4 要改。

计划制定时补充的两条（解决上面带来的问题，用户可否决）：

5. **轰飞的无敌缩到 340ms，硬直保持 520ms。** 不缩就有回归，见 1.3。
6. **玩家蓄力时 AI 不起蓄。** 否则 AI 经常跟着变身、先松手，把玩家的蓄力打断，观感很乱。玩家在 AI 蓄力时起蓄不受限，那是玩家自己的选择。

本轮不做（发现问题只记录，不要顺手改）：
- 改 `wavePush`、`waveLift`、`waveStun`、`fullMs`、`minFrac`、扣蓝、回蓝、子弹时间倍率、AI 蓄力时长、剑气数值。
- 动上一轮的决定：蓄力不挂描边、飞行中剑气走真实 delta、`_outlinePulse` 留给 AI 套路预告。
- `_chargeWave` 无视防御和无敌（防御、缩地都拦不住）是既有规则，不改，留给用户试玩后判断（4.3）。
- 北神二段斩只有一道结算伤害：原型里两道相隔约 66ms，第二道落在 `BT.INVULN` 300ms 内。未在原版单独验证，不在本计划范围。
- `_outlinePulse` 的白环 `setTint(0xffffff)` 不生效。
- `transform-preview.html`。

## 1. 现状事实（动手前核对，行号以 `00d8239` 为准）

### 1.1 调用链

- 起蓄：`charge.js:35 _startCharge` → `:48 this._chargeWave(f)`。这一行要移走。
- 松手：`charge.js:80 _releaseCharge`，`:83` 先 `_endCharge`，`:85` 轻点分支，之后是出剑分支。
- 不经过 `_releaseCharge` 的收蓄：`_tickCharge` 被打断（`:55`）、`_cancelCharge`（`:74`）、`BladeTrinityScene.update` 换场时的 `_endCharge`。这些路径天然不轰飞，不用加判断。
- `_chargeWave`（`charge.js:258`）：震屏、`_knockback`、`_setState(opp, 'hurt', waveStun)`、`opp.invuln = now + waveStun`（`:271`）、`_ghost(opp)`。
- AI 起蓄入口只有两处：`loop.js:129-130`（`_aiUltPlan` 返回 `'now'`）和 `routine.js:461`（`_rt_zoneOut`）。

### 1.2 时序

`_releaseCharge` 在 `update` 里运行，同帧 POST_UPDATE 判据就把倍率切回 1，所以轰飞的物理从下一帧起就是原速，不需要任何特殊处理。对方也在蓄力时，轰飞让它进 `hurt`，下一帧 `_tickCharge` 按 interrupt 收蓄，慢放随之结束。

### 1.3 为什么必须缩短无敌（已实测）

轰飞原来发生在松手前，无敌在剑气出手前就过期了。挪到松手后，520ms 无敌正好盖住各派的出气时刻：

| 流派 | 止帧 / fps | 出气时刻（松手后） |
|---|---|---|
| 北神 | 11 / 30 | 367ms（第一道） |
| 剑神 | 12 / 28 | 429ms |
| 水神 | 13 / 26 | 500ms |

对手被逼到墙角时，气一出手就撞上无敌，`_applyQiDamage` 返回 false，这道气消失，蓝白扣。

页面内原型实测（不改游戏文件，脚本的做法：实例上把 `_chargeWave` 换成空函数、`_releaseCharge` 里先结算轰飞并改 `invuln`；三派满蓄，AI 关，数值含无头让分 ×3）：

| 无敌 | 对手贴墙、相距 125px（剑/水/北） | 对手贴墙、相距 265px | 场中、相距 400px |
|---|---|---|---|
| 520ms | **0 / 0 / 0** | **0 / 0** / 21 | 78 / 48 / 21 |
| 340ms | 78 / 48 / 21 | 78 / 48 / 21 | 78 / 48 / 21 |

同一原型还证实：
- 满蓄 1133ms 真实时间内，对手位移 0、滞空 0 帧。
- 松手后场中滞空约 450ms 真实时间（改前慢放约 1170ms）；贴墙时不上挑。

## 2. 设计

### 2.1 `charge.js`

- `_startCharge`：删 `this._chargeWave(f)`。
- `_releaseCharge`：`_endCharge` 之后、轻点分支之前调用，两条分支都要轰飞：

```js
this._endCharge(f, frac < BT.CHARGE.minFrac ? 'cancel' : 'release');
// 轰飞在松手结算（用户 2026-11-05 定）：变身期间对手不受影响，这里倍率已切回原速。
// 轻点也算松手，保留脱身用途。受击打断、掉线取消不走这里，不轰飞。
this._chargeWave(f);
```

- `_chargeWave`：`opp.invuln = this.time.now + c.waveInvuln;`，注释写明为什么短于硬直。

### 2.2 `data.js`（`BT.CHARGE`）

```js
waveStun: 520,    // 轰飞硬直 ms（这段对手不受控，velocity 得以保留）
// 轰飞无敌 ms，必须短于最早的剑气出手（北神 367ms，剑神 429ms，水神 500ms）。
// 否则对手贴墙时气一出手就被无敌吃掉（实测 520 时相距 125px 三派都 0 伤害）。
waveInvuln: 340,
```

### 2.3 AI（`loop.js`、`routine.js`）

- `_aiUltPlan` 开头：`if (this._opp(f).charging) return null;`，放在掷骰之前。
- `_rt_zoneOut` 的起蓄：`if (!opp.charging) this._startAICharge(f, time);`，`_aiEnd(f)` 照常执行。

### 2.4 必须同步的注释

这些注释描述的是旧时序，留着会误导下一个人：
- `charge.js`：`:3`、`:6`（文件头"风险不在蓄力被打断"已不成立，要重写）、`:48`、`:84`、`:169`、`:254-257`。
- `data.js`：`:405`、`:715`、`:719-726`。
- `fight.js:168`。
- `routine.js:461`。

## 3. 执行步骤

每步提交前跑完该步的检查。

1. **轰飞挪到松手。** 按 2.1、2.2、2.4 改。跑 `npx tsx skills/game-verify/verify.ts BladeTrinity`。
   提交：`feat(BladeTrinity): 蓄力轰飞挪到松手瞬间，变身期间对手不受影响`

2. **AI 让位。** 按 2.3 改。
   提交：`feat(BladeTrinity): 玩家蓄力时 AI 不起蓄`

3. **更新 `tools/transform-check.mjs`。**
   - `SETUP` 给 `s._chargeWave` 加计数（`T.waves`）。注意 T6 里有 `s._chargeWave = function(){}` 和 `delete s._chargeWave`，`delete` 会摘掉实例上的计数；T6 不看这个计数，保持现状即可。
   - 加 `--gsuite=sword,water,north,ai,both,life` 过滤，写法照 `--tsuite`，报告合并的判断里同时认 `flags.gsuite`。
   - 改旧断言：G·双方（`:552` 起，规则变了，见 4.1 W8）、T4 的起浪部分（`:740-762`，改成从松手时刻算硬直和无敌）、README 引用的 T4 说明。
   - 新增 `btWaveSuite`，挂到 `--tsuite=wave`，用例见 4.1。
   - 其余用例失败时先查是不是依赖了"起蓄时对手被轰走"。确认是测试依赖旧时序才改测试；像真 bug 就停下报告。
   提交：`chore(BladeTrinity): transform-check 覆盖松手轰飞`

4. **文档。** README：
   - §5 第 133 行改成"松手轰飞近敌"。
   - §8.4 第 615 行"对手来不及攻击"那段改写，说明 2026-11-05 已修订。
   - §8.4 第 653 行副作用按新时序改写。
   - 第 672、674 行的 T4、T6 说明同步。
   - 第 718 行"放气后马上再蓄，气撞上对手的起浪无敌"这条代价已不成立（蓄力时对手不再无敌），删掉。
   - §8.4 末新增"2026-11-05 用户定：轰飞挪到松手"：做法、4 条决策、无敌缩短的原因与实测表、下面第 6 节的代价。
   提交：`doc(BladeTrinity): 松手轰飞的决策、代价与验收`

## 4. 验收

### 4.1 `btWaveSuite`（默认开慢放，手动步进，AI 关；三派各一遍）

| # | 用例 | 判据 |
|---|---|---|
| W1 | 满蓄全程 | 对手每帧 x、y 不变（±0.5）、`blocked.down` 为真、不进 hurt、`invuln` 不变、HP 不变；`T.waves` 为 0；相机没有震动 |
| W2 | 松手当帧 | `T.waves` 为 1；对手 hurt，`stateUntil - now = waveStun`，`invuln - now = waveInvuln`；下一帧倍率回 1；场中滞空 ≤ 500ms 真实时间 |
| W3 | 轻点 | `T.waves` 为 1、不出剑气、玩家回 idle |
| W4 | 作废路径 | 受击打断、失焦取消、蓄力中对手 KO 进 interlude：`T.waves` 都不增加 |
| W5 | 蓝耗尽自动放 | `T.waves` 为 1 |
| W6 | **墙角回归** | 对手贴墙，玩家分别距 125px、265px 满蓄：对手 HP 必须下降 |
| W7 | AI 让位 | `Math.random` 固定为 0、`ultReady=0`、蓝满、`dist=500`：玩家未蓄时 `_aiUltPlan` 返回 `'now'`，玩家蓄力中返回 `null`。用完还原 `Math.random` |

G·双方（W8，`?bt=0`）改成新规则：
- 一方蓄力时另一方能起蓄，双方都显示本派变装。
- 先松手的一方把对方打进 hurt，对方按 interrupt 收蓄。
- 收尾后双方都回主图集、无残留。

G① 短按补一条：起蓄当帧对手不受影响。

### 4.2 自动验收（总共控制在十分钟左右）

用户明确不要冗长的验证，**不要跑全量套件、A/B、录屏**。

```bash
node game_runs/BladeTrinity/tools/transform-check.mjs --parts=T --tsuite=wave,sword,ai
node game_runs/BladeTrinity/tools/transform-check.mjs --parts=G --gsuite=sword,both
npx tsx skills/game-verify/verify.ts BladeTrinity
npx tsx skills/game-playtest/play.ts BladeTrinity --seconds=90
```

- playtest 只跑一局，判据是无 JS 报错、不卡死、`usage` 里 `charge` 和 `aiCharge` 都大于 0。单局胜负是负载噪声（同一提交胜率 3/4 → 0/8 都出现过），如实报告即可，不要据此调数值。
- `video_runs/BladeTrinityTransform/check/report.json` **是入库文件**，部分跑会把它改成混合结果。跑完 `git restore` 还原，不要提交。

### 4.3 人眼验收（留给用户，执行者不得代判）

交付时把这份清单和试法原样给用户。打开 `index.html`，`?bt=0` 是关慢放的对照：
1. 贴近对手按住 L：对手不再飞起。对手能走过来打断，这个风险能否接受？
2. 松手瞬间：斩击和气浪一起爆发，有没有冲击感？
3. 贴墙满蓄：气能打到人吗？
4. AI 变身时，你能走近打断它吗？这个新窗口是否合适？
5. AI 松手时的轰飞防御和缩地都拦不住，现在有了预告却躲不掉，是否要改？

## 5. 坑位清单

- 无头下 Clock 事件和补间不跟 `game.step`：判定用手动步进数帧，不要等 `delayedCall`。手动步进要比较补间画面时，用 `s.tweens.getDelta = () => dt`。
- `page.goto` 偶发超时是本机加载问题，放宽超时并重试一次，不算游戏回归。
- 用 `timeout` 截断检查脚本可能留下无头浏览器进程，尽量让脚本自己跑完。
- 新用例的距离要用世界边界算（`BT.GAME_W - BT.EDGE_X` = 910.6），对手不要摆到边界外。
- `_chargeWave` 只把 `opp` 打进硬直，不改蓄力者状态，放在 `_endCharge` 之后不影响 `f.state = 'attack'`。
- 不要把轰飞挂到 `delayedCall` 或动画事件上，松手那一帧直接结算。
- 只读游戏时钟的规则不变；新增代码不要读 `performance.now()` / `Date.now()`。

## 6. 预期的平衡变化（写进 README，不要靠改数值"修"它们）

- 贴身按住 L 不再能解围，只有松手才能解围；轻点仍可脱身。
- 对手起身后躲剑气的时间比原来少一段蓄力时长（满蓄约少 420ms），因为硬直改从松手算起。玩家的气更容易命中，AI 的气也一样。
- 双方同蓄成为常规情形：先松手的一方赢。

## 7. 版本控制

- 在 `feat/bladetrinity-transform` 上继续，按第 3 节分步提交，格式 `feat|fix|style|doc|chore(BladeTrinity): 中文描述`。
- `.claude/settings.json` 是本机权限配置，不要随游戏提交。
- 任何一步回归都可以单独 `git revert`，或整体回到 `00d8239`。
- 不推送、不开 PR，除非用户另行要求。
