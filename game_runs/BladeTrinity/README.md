# BladeTrinity 素材流水线

三剑流格斗游戏。取材自《无职转生》三大剑术流派：
**剑神流**（先手极速 · 一击必杀）、**水神流**（后发制人 · 受流反击）、**北神流**（奇诡骗招 · 变招夺械）。

素材走 `skills/video-sprite` 视频轨：AI 绿幕视频 → 锚点对齐抽帧 → 图集。
提示词真源见 [PROMPTS.md](PROMPTS.md)。

---

## 1. 目录

```
references/BladeTrinity/          <-- 原始素材（gitignored，见 .gitignore）
├── ref/                          <-- 参考图 + 定妆图 + 补边版首帧
└── clips/                        <-- 12 段 AI 绿幕源视频

video_runs/{sword,water,north}/   <-- 抽帧工作区
├── manifest.json                 <-- 入库：分段/帧数/scale 参数记录
└── source/flow_*_2026-11-02/     <-- 变身源片：mp4/审查图不入库，提示词 txt + 审查 json 入库

video_runs/BladeTrinityTransform/{sword,water,north}/   <-- 蓄力变装抠图工作区（见 §8）
├── manifest.json + report.json   <-- 入库：抽帧号/窗口/尺度/逐格统计/图集哈希
└── work/ animations/ review/     <-- 不入库：可由 build-transform.mjs 从源片重放

game_runs/BladeTrinity/
├── PROMPTS.md                    <-- 提示词真源
├── README.md                     <-- 本文件
├── transform-preview.html        <-- 蓄力变装预览（拖进度 / 左右朝向 / 换背景 / 按住·释放·取消）
├── tools/rebuild.sh              <-- 七动作图集一键重建（唯一权威的复现方式）
├── tools/build-transform.mjs     <-- 蓄力变装图集重建（唯一权威的复现方式）
├── tools/transform-check.mjs     <-- 蓄力变装针对性检查（预览 + 真实对局）
└── assets/sprites/               <-- 入库：成品图集（Cloudflare CI 部署要读）
    ├── {sword,water,north}.webp
    ├── atlases.js                <-- 元数据（window.BT.ATLAS）
    ├── transform/{sword,water,north}.webp   <-- 蓄力变装帧（每派一行）
    └── transformations.js        <-- 元数据（window.BT.TRANSFORM_ATLAS）
```

> 入库规则：`game_runs/` 下的 webp/png **必须入库**（CLAUDE.md 铁律，Cloudflare CI 部署依赖），
> `references/BladeTrinity/` 整个目录与 `video_runs/*/source/` 下的变身源片 mp4 不入库（原始素材）。
>
> 元数据是 **`atlases.js` 而非 sprite.json**，两个原因叠加：
> `game_runs/**/*.json` 被全局 gitignore（只放行 `games.json`），
> 且架构铁律要求 `<script>` 标签加载、不 fetch json。
> 游戏侧读 `window.BT.ATLAS[角色].animations[动作]` 拿 row / frameCount / fps / loop。

---

## 2. 重建

```bash
bash game_runs/BladeTrinity/tools/rebuild.sh
```

脚本是复现的唯一权威来源，参数不要手抄到别处——分段帧号、统一 scale、去黑边裁切框
三者互相耦合，改一个另外两个就得跟着重算。脚本内注释写了每个决定的理由。

四个步骤：预裁去黑边 → 探测各行 scale → 统一 scale 重跑 → 去绿溢色并安装。

---

## 3. 三个坑（改参数前必读）

**① 源视频有黑边，必须预裁。**
源片 1280×720，但首帧参考图是 1152×1152 正方形，模型左右各补了 279px 黑色 pillarbox。
chroma-key 只抠绿不抠黑 → 黑边被当成前景 → 撑爆 bbox → 角色被压成指甲盖大小。
裁切框 `crop=712:716:284:2` 比黑边再往内 4px，因为 x=279 那一列是 `rgb(30,52,26)` 的暗绿接缝，
离纯绿距离 205 > 阈值 110，会被判成前景形成一条竖线。

> ⚠️ 修这个坑**不要去改 `skills/video-sprite/process.ts`**。那是全部游戏共用的抠图层，
> 曾经被写死过 `if (width === 1280 && (x < 280 || x >= 1000)) 抹掉alpha`，
> 等于让任何项目的 1280 宽视频都被静默削掉左右两条。已还原，别再犯。

**② 统一 scale 取六行的最小值，不是走路值。**
攻击帧 bbox 可达 651×548，按走路 scale（0.44）缩放会变成 290×244，
远超 192×208 的格子，刀和身体都会被切。取最小值代价是角色在格内偏小，但行内绝对一致。
游戏里放大显示即可。

**③ 分段边界靠数据定，不是照抄提示词的设计时间。**
AI 不会严格按提示词的时间表走。实际做法是逐帧算抠图 bbox 的宽高比 / 质心 / 顶端 y：
- **倒地时刻** = `w/h` 升到高位后完全恒定的那一帧（如 sword_hit 从 f72 起恒定 3.54）
- **stance 开头几帧**是从定妆姿势过渡，必须跳过；north 前 16 帧在转身（含正面和背面），
  绝不能进 idle 循环

---

## 4. 成品规格

三张图集均 **4032×1456**（7 行 × 21 列，192×208/格）。
21 列是硬上限：192×21 = 4032 < 4096，老 GPU 纹理宽度限制。

| 行 | 动画 | 帧数 | 备注 |
|----|------|------|------|
| 0 | walk | 21 | loop |
| 1 | idle | 21 | loop |
| 2 | attack | 21 | once |
| 3 | guard | 21 | once |
| 4 | hurt | 18 | once，踉跄 |
| 5 | down | 16 | once，倒地，末帧静止 |
| 6 | jump | 21 | once，蹲踞蓄力→收腿腾空→落地缓冲 |

**还缺一行**（机制已先行，暂借他行占位）：
- **快速移动** —— 移形换影目前是瞬移+残影，没有专属冲刺姿态

蓄力不再借 `guard` 行：改用独立的变装图集（§8），guard 只在变装图集没载到时兜底。

fps 按各段实际时长反算（7–13fps 不等），见各自 `sprite.json`。
统一 scale：sword `0.2959` / water `0.2556` / north `0.2796`。

---

## 5. 玩法机制速查

数值真源是 `game/data.js`，这里只给对照表。**三派的差异主战场是防御**：

| | 剑神流 brace | 水神流 parry | 北神流 counter |
|---|---|---|---|
| 键位 | 长按 S | 长按 S | 点按 S（瞬发，有冷却） |
| 挡近战 | **完全免伤**，扣蓝 34 | 完美窗口 260ms 内免伤 + **伤害弹回 75%** + 卸力硬直 + 反击窗口 | 窗口 260ms 内**真无敌** |
| 挡剑气 | **整道吃下**，扣蓝 52 | **整道反射**（不要求完美窗口） | 剑气**穿身而过** |
| 收益兑现 | 挡下不掉血 | 反弹 + ×1.8 反击 | 挡下即**反手甩出旋转飞刀**（BT.KNIFE） |
| 代价 | 蓝空→退化为吃 45% 伤害；每次被推退；台边破防 | 迟了只减伤 40% | 空放留 480ms 大破绽 |
| **会心**（25%） | 立刻转身**三连劈** | 把那道剑气**连弹三道**（近战会心=三段返伤） | 飞刀挂**回旋镖**：穿过→回旋→再穿→再回旋 |

**会心 = 防御成功时 25% 掷骰，三派一律「三次伤害」**（`BT.CRIT` / `game/systems/crit.js`）。
三次而不是一次大的，是为了连段/连弹/回旋的观感，也让每一下都压得住——总量各派都在
27~30，约等于两记平A。会心伤害走 `_critHit` 直接结算，**绕过受击无敌与防御分流**：
三连劈的 190ms 间隔短于 `BT.INVULN`(300ms)，走正常 `_hit` 的话第二三下会被无敌吃掉。
⚠️ 水神连弹必须压单发伤害（`volleyDmgMul`）：原样弹三道满蓄剑气 = 78，对着 96 血的
血条是一发抹掉八成，会心会变成"防住一次就赢"。

其余共通机制：`J` 平A、`长按 L` 蓄力剑气（吃蓝，起手描边一弹并轰飞近敌）、
`SPACE` 移形换影（按住上=升空 / 否则=缩地，无敌+残影+冷却，不耗蓝）、`W` 起跳。
**蓝（MP）同时是奥义燃料和剑神完全防御的燃料**——这是唯一一处两条经济交叉的地方，
剑神玩家每挡一次就少一点剑气，故意逼出取舍。AI 也会蓄力放剑气（`BT.AI.ultChance`），
否则"反弹剑气 / 扛剑气"这些防御分支在实战里一次都触发不到。

### 对手 AI：四层调度 + 套路层（`game/systems/routine.js`）

AI 的强度与观赏性都不来自单个动作，来自**动作之间的衔接**。旧版每个决策 tick 独立掷一次骰
（挡 / 砍 / 走），结构上不可能产生"缩地绕到背后再斩"——缩地和斩是两次互不相关的抽签，
中间还隔着一整个 780ms 出招自锁。现在分四层，从"必须马上做"到"想做什么"：

| 层 | 何时跑 | 干什么 |
|---|---|---|
| ① 收招接续 | 每帧 | 掐掉命中窗口已过的收招段（`tier.cancel`），否则两节动作之间必有空白 |
| ② 套路推进 | 每帧 | 已进入的行为串按脚本走完；**受击即作废** |
| ③ 反应层 | 每帧，**在 `_canAct` 之前** | 读招防御（看招式进行到哪一步，不是掷骰）、探到剑气就起跳躲 |
| ④ 决策层 | 决策间隔到期 | 奥义 / 起套 / 间合摇摆 / 惩罚 / 挡或砍 |

**五条套路**（`BT.AI_RT`，每条都以「预告帧」开场：外轮廓炸一层描边 + 音效）：

| 套路 | 动作链 | 谁会 |
|---|---|---|
| **拉开·蓄力剑气** `zoneOut` | 缩地/后撤创造距离 → 起蓄 → 满场剑气 | 帝 / 神 |
| **压边·连续贴身** `cornerPress` | 预告 → 短缩地贴脸 → 平A → 缩地取消收招 → 第二拍（刀或架防） | 帝 / 神 |
| **跳跃·剑气追** `jumpQi` | 反应层触发：起跳让剑气从脚下穿过，**同时朝对手漂移**，落地砸一刀 | 帝 / 神 |
| **升空·踏落斩** `riseDive` | 预告 → 纵向瞬移（全程无敌）→ 下落中横向贴近 → 进命中带下劈 | 神 |
| **缩地·绕背斩** `crossBlink` | 预告 → 瞬移到对手身后 88px → 留一帧转身 → 背刺（或贴背架防钓你回身） | 神 |

⚠️ **别把两条空中套路都塞给同一档**。上一版给帝级排的是 `['jumpQi','riseDive']`，
于是帝级点亮的唯一新行为就是"会跳"，玩起来的观感是"只会跳来跳去"（用户实测）。
现在的阶梯读法是：**王=读招 → 帝=地面压制（会自己创造距离放剑气、会把你锁角落）→ 神=全开**。

⚠️ 改这一层前必须知道的三件事：

1. **纵向命中上限 96px**（`_resolveMelee`）。升空 175px、跳跃顶点 120px **都超了**，
   空中招只能在下落段打得中——`_rtAirPress` 按起手时长预测落点后才出招，顶点出招是确定性挥空。
2. **缩地后必须留 ≥1 帧再出刀**。`_faceEachOther` 在 `!_canAct` 时跳过，同帧接 `_attack`
   会拿旧朝向往反方向劈（`loop.js` 头部注释记着的历史 bug）。
3. **预告帧不能省**。无预警的瞬移背刺不是难度，是耍赖——玩家读不出因果只会觉得"这游戏乱打"。
4. **收招接续只认平A**（`f.atkCancelable`）。蓄力剑气的挥砍（`_releaseCharge`）也把 state
   置成 `'attack'`，但它**不设 `atkFrom/atkTo`**——沿用上一记平A 的陈旧值，会被
   `_aiCancelWindow` 下一帧判成"收招早结束了"掐掉，`_tickSwingQi` 随即 `_clearSwing`，
   **蓄力扣了蓝一道剑气都不出**（实测神级 7 次起蓄 0 道，玩家看到的就是"只把我轰飞、不放剑气"）。
5. **静态距离闸门会随 AI 变强而自动收紧**。`ultMinDist=210` 本意是"贴脸不放奥义"，
   但套路层让高档 AI 压得更近（神级均距 175px vs 圣级 234px），结果档位越高越放不出剑气。
   闸门要么改成动态，要么给 AI 一条**自己创造条件**的路（这里选后者 = `zoneOut`）。
   反过来，拆掉闸门后 `ultCd` 必须加长，否则变成每 4 秒一次轰飞。

**难度阶梯的方向**（`BT.TIERS`）：升级的是**信息利用与行为质量**（反应延迟 380→130ms、
会哪几套套路、收招能不能取消），**伤害倍率全档 = 1.0**。高难度靠"你被打中的次数变多"，
不靠"每下更疼"。两个实测教训写在 `data.js` 的 `cancel` / `punishCd` 注释里：

- `cancel=120` 时帝级在"玩家出招"的 134 帧里有 **126 帧自己正卡在 attack**，反应再快也挡不了
  （挡下率 1/42，反低于反应更慢的王级 10/19）。
- 惩罚窗口冷却 260ms 会让 AI 陷入**永动连打**，把自己的防御和套路全挤掉。
- 取消收招时要把 `aiNext` 顶到招式本来的结束时刻——省下的时间只能拿去防御/走位/起套，
  否则 cancel 会把出手间隔从 ~1140ms 压到 ~760ms，等于变相加难度。

**阶梯已整档下移一级**（2026-07）：圣←原王、王←原帝、帝←原神（点亮 `cap.arte`），上级不动，
神级是新档 = 帝级 + **秘技的用法**（`arteOdds` / `arteCdMul` / `arteSmart`）。动因是实测阶梯
长成了"上≈圣≈王 + 一道悬崖"：三档在近战交锋上只差一个架防概率（0.054 / 0.108 / 0.18），
而王→帝 一步给五条套路 + 三项特权 + 惩罚窗口 + 完美受流。两条配套的量：

- 圣级原来的 `reactDelay:380` **是个死开关**：近战威胁的观察窗只有 `guardLead=0.35s`，
  380 > 350 ⇒ 那一档对任何近战招都反应不过来，只挡得住剑气。改 260 才兑现得出来。
- `TIER_DEFAULT` 必须跟着下移（→ 圣级）。留在王级时默认流程变成"原帝→原神"，
  playtest 4 局 1 胜 3 负；下移后 4 局全胜，且默认体验与下移前逐字相同。

**秘技（`BT.ARTE`）的出场率有三处结构性阻塞，改频率前先确认它们没被改回去**（诊断脚本按
`scratchpad/arte-rate.mjs` 的套路重写即可，计数口是 `probe().usage.aiArte`）：

1. 转招**不能挂在 `delayedCall(holdMs)` 上**——无头下 Clock 滞后约 6 倍，回调到点时那记平A
   早结束了，重检 `state==='attack'` 必失败。现在是 `_attack` 掷中只上膛（`f.arteArmed`）、
   `arte.js _aiTickArte` 每帧推进。
2. 上膛的那一刀**不许弃招回防**（`routine.js _aiAbortForGuard` 开头那条）。`guardCancel` +
   每帧反应层会在 holdMs 内把它收掉，而倍率最高的正是最高档 ⇒ "越强越不用独占招"。
3. `BT.REALM` 曾把"输入按住时长"和"剑界持续 6000"都叫 `holdMs`，后者静默覆盖前者 ⇒
   **剥夺剑界玩家和 AI 都一次也放不出来**（40s 内 16 次上膛 0 次转招）。持续时长现叫 `liveMs`。
4. 奥义要给秘技**让蓝**（`loop.js _aiUltPlan`）：两者抢同一管蓝，而奥义判在决策层最前面。

修完这四条后的实测（40s/场）：帝级 2~3 次、神级 7 次；修之前**全部为 0**。

### 视觉约定（改特效前先读）

- **外轮廓描边**是"我在防御/架式"的语言：防御=呼吸描边（各派配色），抜刀架式=随档位变厚的红描边。
  蓄剑气**不挂持续描边**，进度由**变装**（§8）表达：服饰随蓄力比例逐格变化；只保留起蓄瞬间的"描边一弹"
  （`_outlinePulse`，一次性）。2026-11-03 用户定，原因见 §8.4 末。
  实现是**八向偏移剪影**（`defense.js _outlineHold`），不是"放大一份压在身后"——后者在白衣
  角色 + 暖背景下肉眼不可见，已踩过。
- **全身纯色闪烁只表示"吃了伤害"**（`combat.js _bodyFlash`，红色）。防御【成功】不要闪身体，
  改用 `_outlinePunch` 把描边猛顶一下：同色的纯色剪影会盖住同色描边，两者糊成一坨，
  描边等于消失——北神反击"看不到特效"就是这么来的。
- 北神反击是**旋转飞刀**（`BT.KNIFE` / `charge.js _drawKnife`），不是第三道剑气：
  剑气是三派通用语言，暗器才立得住「虚実・变招夺械」。弹道复用剑气那一整套。
  飞刀在**腰高**出手（`BT.KNIFE.emitY`），该值同时是命中锚点——弹丸在什么高度飞就拿
  对手同一高度比 y，混用锚点会让它穿过对手却永不命中。
- 角色身外的**光圈/亮点一律不要**，已全部移除（`_flash` 已删）。

---

## 6. 验收

图集**必须逐张目检**，只看脚本报告不算数——上一版就是因为跳过目检，
带着满格黑边和指甲盖大的角色进了库。

```bash
# 铺到洋红底上看（透明区一眼可见，绿色残留也藏不住）
node -e "
const sharp=require('sharp');
(async()=>{for(const n of ['sword','water','north']){
  const b=await sharp('game_runs/BladeTrinity/assets/sprites/'+n+'.webp')
    .flatten({background:{r:255,g:0,b:255}}).toBuffer();
  await sharp(b).resize(1680).png().toFile('/tmp/'+n+'_view.png');
}})();"
```

逐项确认：

- [ ] 格内**没有黑色竖条**（全图近黑不透明像素应在几百量级；废图时期是每格约 1017 个）
- [ ] 角色**占满格子**，不是缩在中间一小块
- [ ] 六行角色**大小一致**，不忽大忽小
- [ ] 攻击/格挡行**没有大块绿色三角**（去溢色后应是淡色刀光）
- [ ] 倒地行**末帧是躺姿且静止**，身体没被格子边缘切掉
- [ ] 剪影面积在各帧间有**真实变化**（举剑过顶 vs 躺地差异应显著；
      若全程恒定在 ±5% 内，说明抠的是黑边不是角色）

### playtest bot 为什么"不按 S 防御"（诊断记录）

bot 一直有防御分支（`play.ts` 的 `oppStartup||oppActive` 那一支），但整局只触发 1~3 次、
`crit` 常年 0。按帧桶计数拆开后，是四件事叠在一起，全部已修：

1. **探针骗 bot**：`canDefend` 没检查落地，而 `_controlPlayer` 里 brace/parry 明确要求
   `onGround`。bot 腾空时被告知"可以防"，按下 S 什么都没发生（实测起手帧里 6~10 帧在空中）。
2. **bot 自己跳进对手的起手窗口**：中性态的随机跳没有避让敌方出招，跳起来就等于关掉防御。
3. **bot 见射程就砍**：平A 一记锁 720~830ms，而对手起手窗口只有 190~380ms —— 敌方出招帧里
   有六成 bot 卡在自己的 `attack` 状态里（实测 `不可防 28/39`）。中性态平A 加了 780ms 间隔后
   降到 0~9/39。这和 AI 侧的自锁是同一个病，只是玩家侧不能加 cancel（那是手感基线）。
4. **无头让分把对局压得太短**：`_hit` 里 webdriver 让分原为 3.0×/0.30×，一局 15 秒结束，
   AI 统共只出招 1~3 次。改为 2.0×/0.45× 后对局 19~33 秒。

修完后漏斗每一级都能转化：AI出招 3~5 → 有机会 6~15 帧 → S分支 1~3 → 真起防 1~3 →
真挡下 1~2 → 会心掷骰 1~2 → 会心 0~1。

⚠️ **`crit×0` 通常不是 bug**：它是"防御成功后的 25% 掷骰"，一局只掷 1~2 次，多数局自然为 0。
覆盖度断言现在会把 `defend<4` 和 `crit=0` 单独标出来 —— 以前 `defend×1` 也报"覆盖 OK"，
把"bot 基本不防"这件事盖了很久。**别拿 playtest 的 defend/crit 次数判断防御手感，要人眼看。**

---

## 7. Joy-Con 2 controls（手柄接入）

Left + right Joy-Con 2 together control one player, alongside the keyboard (both work at the
same time). Bluetooth, packet decoding and stick calibration stay in the
[Joycon](https://github.com/cnmzsjbz199328/Joycon) adapter; this game only consumes its
WebSocket protocol and maps it to actions.
左右两只 Joy-Con 2 合作操控一名玩家，键盘照常可用；蓝牙/解包/摇杆校准都在 Joycon adapter 里，本游戏只消费协议。

### 7.1 Run it locally（本机运行）

**One step (Windows):** double-click `game_runs/BladeTrinity/tools/joycon-play.cmd`, then hold Sync
on each Joy-Con until the LEDs run. 双击启动脚本，再长按两只手柄的 Sync。

The script (`tools/joycon-play.ps1`, Windows PowerShell 5.1+) finds the Joycon checkout
(`-JoyconDir`, else `%JOYCON_DIR%`, else a `Joycon` folder next to this repository), and on first
run clones it at the pinned commit and creates its `.venv`. It then starts the adapter in its own
window (or reuses one already on 127.0.0.1:8765), serves `game_runs/` on
http://127.0.0.1:8000 (or reuses a server already serving the game), and opens the page.
It never modifies the Joycon checkout; it only warns if the 7.6 adapter bug is still present.
Options: `-Source synthetic` (no hardware), `-GamePort`, `-AdapterPort` (non-default ports are
passed to the page as `?joycon=`), `-NoBrowser`. Close the adapter window and the minimized
server window to stop.

Manual steps, equivalent to the script:

```bash
# 1) the adapter — in a checkout of the Joycon repo at ce5abf5 (protocol v2)
python -m venv .venv
.venv\Scripts\pip install -r adapter/requirements.txt          # macOS/Linux: .venv/bin/pip
.venv\Scripts\python -m adapter.src.service --source joycon2     # hold Sync on each Joy-Con until the LEDs run
#    no hardware: --source synthetic --side both
#                 --source replay --file adapter/tests/fixtures/hw_2026-10-24_input.jsonl

# 2) the game — serve game_runs/ over http (file:// cannot load the assets)
cd game_runs && python -m http.server 8000
#    open http://127.0.0.1:8000/BladeTrinity/index.html
```

The page connects to `ws://127.0.0.1:8765` by itself when it is opened from `localhost` /
`127.0.0.1`. URL switches: `?joycon` (connect, any host), `?joycon=ws://host:port` (another
adapter), `?joycon=off` (never). Automation (`navigator.webdriver`) never connects unless the
parameter is given, so verify/playtest see no failed-socket console errors.

### 7.2 Default mapping（默认键位）

| Action 动作 | Keyboard (unchanged) | Joy-Con 2 |
|---|---|---|
| Move / menu direction 移动 / 菜单方向 | A D ← → (menu also W S ↑ ↓) | left stick or D-pad |
| Jump 跳 | W / ↑ (hold = jump again on landing) | **B** (same hold behaviour) |
| Slash 斩 / hold after the slash = school arte 秘技 | J | **Y** |
| Guard 防御 (hold) | S | **ZL** |
| Charge 蓄力, release = 剑气 | hold L | hold **ZR** |
| Blink 缩地 / with up = rise 升空 | SPACE / ↑+SPACE | **A** / up (stick or D-pad) + **A** |
| Confirm 确认 (also closes the START card) | SPACE J ENTER | **A** or **＋** |
| Restart after the gauntlet 重开 | click the ↻ | **＋** (↻ shows「＋ 重开」while a Joy-Con is online) |

Adjustments to the requested default and why:
- Stick/D-pad **up does not jump** on the Joy-Con (B jumps). On the keyboard W is both "up" and
  "jump"; copying that would make every ↑+A rise start with a jump.
- **Restart is ＋ only**, not A: A is blink, and mashing it at the KO would skip the knock-down.
- Movement keeps the **fixed walking speed** (stick digitised: walk at |x| ≥ 0.5, stop below 0.3).
  "Up" for the rise needs y ≥ 0.6 so a walking thumb drifting upward does not turn blinks into rises.
- Menus take one step per flick: one axis at a time, triggers at 0.6, re-arms only after the stick
  returns below 0.3 — never one step per packet.

Status (bottom-left of the canvas, and on the START card) keeps "socket open" and "controller
online" apart: `适配器未连接` → `适配器已连接 左 ○ 右 ○ 等待手柄…` → `左 ● 右 ●`.
HUD key hints switch to Joy-Con buttons while one is online.

### 7.3 How input works（输入层）

- `game_runs/_engine/joycon.js` — shared protocol-v2 client: a classic-`<script>` port of the
  upstream `shared/protocol/input-client.mjs` + `contracts.mjs` at
  **`ce5abf5a4468ebce18dbe570cb899b799a882555`** (only the module wrapper changed; plus the
  URL policy above and one connection per page). `tools/joycon-check.mjs --upstream=<checkout>`
  replays a scripted session through both and requires identical events.
- `game/systems/input.js` — the action layer. Every system reads `this._in.held/pressed/released`
  instead of Phaser keys or `JustDown`.
  - Edges advance **once per frame** at the top of `update()`; an action is held while *any*
    source holds it, so releasing one source never cancels the other and pressing the second
    source never fires the action twice.
  - A Joy-Con tap that starts and ends between two game frames still counts (as a one-frame hold).
  - **Interruptions are not releases.** Controller offline, socket closed, >1 s without frames,
    page hidden, or window blur release held actions with reason `lost`; an in-progress
    **charge or 抜刀 stance is cancelled without firing** (MP already spent is not refunded, as
    when interrupted by a hit). Only a real release fires the 剑气 / strike.
  - **No replay of old input.** After a reconnect, resumed frames, returning to the tab, or a scene
    (re)start, any Joy-Con button or stick still held is ignored until released / re-centred
    once (so a held ＋ that restarts the game does not also confirm the next screen).
  - Scene restarts unsubscribe and resubscribe; the socket is kept (no reconnect churn).

Small keyboard-side effects of the shared layer (intentional): a key pressed while the game
is not reading it (during a charge, stance, hit-freeze or between rounds) no longer fires later;
alt-tab during a keyboard charge cancels it instead of releasing it; SPACE/J/ENTER on the START
card closes the card (previously they started the fight hidden behind it). Two fixes found on the
way: the school cursor could reach a phantom 4th slot (Phaser 3.60 `Math.Wrap` includes `max`),
and the START card no longer claims K guards (it never did).

### 7.4 Local vs online（本机与线上）

- **Local** (`http://localhost` or `127.0.0.1`): supported, auto-connects.
- **Online HTTPS showreel**: not enabled by default — visitors without an adapter get no socket
  attempts or permission prompts. To try it, open the game page **directly** with
  `/BladeTrinity/index.html?joycon`; `play.html` does not forward the parameter into its iframe.
  Headless Chromium 149 blocks `ws://127.0.0.1` from a public HTTPS page with
  `net::ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS` and connects once the
  *local network access* permission is granted — so desktop Chrome should show a permission prompt
  (not yet seen in a headed browser; Firefox/Safari untested). Nothing here disables browser security.
  This build is not deployed yet.

### 7.5 Test results（测试记录，2026-10-24）

Software only — synthetic, mocked and replayed input prove the software path, **not** the
hardware. 以下均为软件验证，不是实机验收。

| Check | Result |
|---|---|
| `npx tsx skills/game-verify/verify.ts BladeTrinity` | pass (L0/L1/L2) |
| `node game_runs/BladeTrinity/tools/joycon-check.mjs --upstream=<Joycon@ce5abf5>` (A: client rules, URL policy, upstream parity; B: game page with a mocked adapter — menus, every action, merge, tap/hold, offline/socket-close/stale/hidden/blur during charge and stance, reconnect with held buttons, ＋ restart ×4) | 106/106 in 3 consecutive runs of the final build (~46 s each) |
| same tool, part C, against the real adapter `--source synthetic --side both` | 6/6 — 872 frames/side in 25 s, presses = releases after close, 10 menu edges vs ~1 700 frames |
| part C against `--source replay` (hardware capture, incl. the recorded Sync disconnect) | 6/6 — all 23 buttons, A released with reason `stale` 1.1 s before the adapter's `disconnected`, no stuck key |
| `npx tsx skills/game-playtest/play.ts BladeTrinity` vs. unmodified HEAD, 20 alternated pairs | HEAD 13 win / 7 stuck, this build 11 win / 9 stuck; 0 losses and 0 runtime errors in both; skill coverage alike — no measurable change (p≈0.75; this bot is load-noisy) |

Hardware (实机): **not run yet** — see 7.7.

### 7.6 Known limitations（已知限制）

- **Upstream adapter exits when a browser tab disconnects** (Joycon `ce5abf5`,
  `adapter/src/websocket/server.py` `_broadcast`): it iterates `self._clients` across an `await`
  while the closing client removes itself → `RuntimeError: Set changed size during iteration`.
  Reproduced on the first disconnect 2/2 with the synthetic source. Reloading or closing the game
  page can therefore kill the adapter (restart it, then hold Sync). One-line fix, checked on a
  scratch copy (survived 30/30 disconnects): `for ws in list(self._clients):`. Not applied here —
  it belongs to the Joycon repo.
- The first frame after a reconnect is treated as carried-over input (held buttons in it are ignored
  until released). Live Joy-Cons stream ~33 Hz, so that is ~30 ms; the trimmed replay fixture only
  keeps packets where something changed, so there the first right-side frame after the reconnect
  was the operator's next A press (1 s later) and it was ignored. Verify on hardware (7.7 step 9).
- If frames simply stop mid-charge, the button counts as held until the client's ~1 s stale
  timeout; a charge whose MP runs dry inside that window auto-releases exactly as a held charge
  would. An adapter `disconnected` status or a closed socket cancels immediately.
- Upstream hardware acceptance is macOS/CoreBluetooth; the Windows BLE path is unverified.
- No analog walking speed, no single sideways Joy-Con, no 2-player — by design for this round.
- A keyboard tap shorter than one frame can still be missed (unchanged); only Joy-Con taps are latched.

### 7.7 Hardware session checklist（实机验收清单，一轮约 10 分钟）

Adapter running with `--source joycon2`, both Joy-Cons paired, game open at
`http://127.0.0.1:8000/BladeTrinity/index.html`. Avoid reloading the page (see 7.6). Note
pass/fail per step.

1. START card shows `左 ● 右 ●`. **＋** closes the card; the highlighted school does not change.
2. Flick the left stick right/left/up/down and hold it: exactly one school / tier step per flick,
   no repeat while held. Same with the D-pad. A half tilt does nothing.
3. **A** starts the fight; the character does not blink at the start.
4. Stick: walks at constant speed, stops on release. **B** jumps; holding B keeps jumping.
5. **Y** tap = one slash per tap. Pick 剑神流, hold **Y** after a slash → stance; release → strike.
6. **ZL** held = guard, released = guard drops. **ZR** held = charge aura, released = 剑气; a quick
   ZR tap only gives the shock-wave.
7. Stick left/right + **A** = blink that way; stick up (and D-pad up) + **A** = rise.
8. While charging with **ZR**, short-press **Sync** on the right Joy-Con: the charge vanishes
   **without** a 剑气, status shows `右 ○`. Hold Sync to reconnect while still holding ZR: nothing
   happens until ZR is released and pressed again. Repeat on the left with **ZL** guard.
9. Right after a reconnect, one press of **Y** or **A** responds on the first press.
10. Charge with ZR, alt-tab away, come back: no 剑气 fired.
11. Finish the gauntlet (win or lose): ↻ with「＋ 重开」appears without touching the mouse;
    **＋** returns to the select screen and does not pick a school by itself.
12. Throughout: keyboard keys still work alongside the Joy-Cons.

---

## 8. 蓄力变装（三派变身，2026-11）

用户定：三派的蓄力剑气用【服饰/形象逐步变化】表达蓄力进度。素材沿用人物管线
（源片抽帧 → 抠绿 → 透明图集 → Phaser 按蓄力状态选帧），MP4 只是制作源，运行时不放视频。
执行计划见 [plans/blade-trinity-transformation-integration-plan.md](../../plans/blade-trinity-transformation-integration-plan.md)。

### 8.1 素材

| 派 | 源片（gitignored，SHA-256 见计划 §3） | 状态 | 变装内容 | 图集 |
|---|---|---|---|---|
| sword | `video_runs/sword/source/flow_accepted_2026-11-02/swordswoman_transformation_accepted.mp4` | 用户验收 | 红发间长出一对犬耳（服饰不变） | 18 格 + 保持帧，3648×208 |
| water | `video_runs/water/source/flow_transform_2026-11-02/water_god_transformation_accepted_v7.mp4` | 用户验收 | 深蓝外袍 → 海蓝/青绿分层甲裙、银边浪纹、腰间短飘带 | 20 格 + 保持帧，4032×208 |
| north | `video_runs/north/source/flow_transform_2026-11-02/north_god_transformation_candidate_v6.mp4` | **候选 v6，未经用户最终验收** | 彩条斗篷 → 午夜蓝/炭灰战袍 + 银白毛领 + 银扣 | 20 格 + 保持帧，4032×208 |

三段源片均 1280×720、24fps、144 帧、6.0s。分段（源片原生帧号，由逐帧差分 + 接触表目检定出，
不是照抄提示词时间）：

| 派 | 原装保持 | 变装进行 | 变装完成·稳定 | 挥剑（不进图集） | 取帧（等距） | 保持帧 |
|---|---|---|---|---|---|---|
| sword | f0–7 | f8–30 | f31–70 | f71–104（f105 起收耳复原） | f8–30 取 18 | f32 |
| water | f0–4 | f5–53 | f54–59 | f60–104（f105 起收势，保持变装） | f5–53 取 20 | f57 |
| north | f0–7 | f8–42 | f43–61 | f62–104（f105 起收势，保持变装） | f10–42 取 20 | f45 |

重建（唯一权威复现方式，约 1 分钟）：

```bash
node game_runs/BladeTrinity/tools/build-transform.mjs          # 三派；也可只给一派：... water
```

做法与理由（脚本内注释更全）：
- **固定裁剪窗 + 固定缩放**，整段同一个窗（共享 `process.ts --crop` 模式）。不逐帧 trim、不用 anchor，
  角色不会呼吸式忽大忽小，窗内真实位移保留。窗以首帧 alpha 质心为中心、首帧脚底 → 基线 202。
- **尺度 = 主图集尺度 × 旧片首帧高 / 新片首帧高**。新旧源片首帧是同一张定妆参考图，宽比高比一致（≈1.23），
  所以 sword 0.3654 / water 0.3149 / north 0.3445 让变装帧与各自现有 idle 同人物高度、同脚底。
- 窗口超出画面的部分用本片底色补齐（水神窗口顶端高出画面 71px，北神 16px）；剑神源片朝右，整窗水平翻转回【朝左】规格。
- 旧片 `crop=712:716:284:2` **不适用**：新片没有黑边 pillarbox，底色是 `rgb(13,246,24)` 一类近纯绿。
- 抠图用共享管线默认参数（阈值 110、小连通域清理），装配时从无损帧做与 `rebuild.sh` 同规则的去绿溢色，
  不读 assemble 的有损 webp 再压一遍。没有改共享抠图逻辑。

审查产物（不入库，重跑即得）：`video_runs/BladeTrinityTransform/<派>/review/` 下
`source_contact_sheet.png`（全段每 4 帧，标分段）、`cells_4bg.png`（逐格铺洋红/黑/白/暖色底）、
`first_last_vs_idle.png`（现有 idle/guard 首帧 vs 变装首/中/保持帧，同格同尺度 + 基线线）。
逐格 bbox、贴边检查、图集哈希在入库的 `report.json` 里。

运行时资源清单（构建脚本输出，`report.json` 的 `atlas` 段同记）：

| 文件 | 尺寸 | 字节 | SHA-256 |
|---|---|---|---|
| `assets/sprites/transform/sword.webp` | 3648×208（19 格） | 123 408 | `99E1DFFB2520B5EAC617F8481A129BDE55B691F58022208DA4C47A2B1AD8126A` |
| `assets/sprites/transform/water.webp` | 4032×208（21 格） | 129 664 | `A17C658DA97C3503D4BC3F86A5E533EE8B5C3CF722E0289409D1E0628BDEB478` |
| `assets/sprites/transform/north.webp` | 4032×208（21 格） | 125 260 | `28AED1FBDADB97982BC7166364D5E2A020C0726181130550A9E2849D74D7E522` |
| `assets/sprites/transformations.js` | 注册表 | 约 3.8 KB | （文本，随换行符变，不记哈希） |

合计约 370 KB；三张图都在 4096 纹理上限内，与七动作主图集分开加载。

### 8.2 运行时

- `assets/sprites/transformations.js` → `window.BT.TRANSFORM_ATLAS[派]`：纹理路径、单格尺寸、列数、
  `chargeFrames`（格号序列）、`holdFrame`、基线、朝向、源帧号映射、源片状态。由构建脚本生成，勿手改。
- `game/systems/transformation.js` → `BT.Transform.{preload, ready, begin, setProgress, end}`：
  - 进度 `p = clamp((time - chargeFrom) / BT.CHARGE.fullMs, 0, 1)`（与 `_releaseCharge` 的 frac 同一公式，
    fullMs 读配置不写死）；`p<1` 取 `chargeFrames[floor(p·n)]`，`p=1` 固定 `holdFrame`。只在格号变化时换帧。
    不注册成自动播放动画 —— 满蓄后一直停在保持帧，不循环、不转头、不自己挥剑。
  - **直接把 fighter 自己的 sprite 换成变装纹理的某一格**，不另建展示 sprite：位置/朝向/深度/可见性/销毁
    天然跟随本体，没有双人重影；碰撞体、速度、HP、命中计算一概不碰。
    代价：所有"复制当前帧"的特效（描边、残影、剑界副本与倒影、幻剑分身、缩地残影）改读
    `sprite.texture.key`，不再写死 `f.id` —— 否则会拿变装格号去主图集取一格错帧。
  - 资源没载到（404/解码失败）时 `begin` 返回 false，`_startCharge` 退回旧的 guard 占位，对局照常。
- 接入点全在 `charge.js` 的既有生命周期：`_startCharge`（begin）→ `_tickCharge`（setProgress，蓄力中不画描边）→
  `_releaseCharge` / `_cancelCharge` / 受击打断 → `_endCharge(f, how)`（end）。场景 over/interlude 分支把仍在蓄力的
  一方收干净（之前招式名会留在倒地的人头上）。
- **服饰回落**：有效释放时本体立刻切回原装播原 attack 行（剑气时序与刀线标定 `BLADE_MARKS/QI_SEGS` 原样），
  同时变装那一格的剪影刷成流派色压在身后外扩淡出（240ms）——读作"变装外壳化成气褪去"。取消（轻点不足 minFrac、
  掉线、失焦）同样回落但更淡更短；受击打断不加（受击有自己的红闪）。源片后段的挥剑没进图集，没有新的刀线/剑气标定。
- 数值与输入语义未动：fullMs 420、minFrac 0.22、边蓄边扣蓝、起浪轰飞、玩家松键/AI 到点松手、受击作废、
  失焦/掉线取消都按原逻辑；没有新增血量门槛、次数限制、额外伤害或无敌。

预览：`transform-preview.html`（本机 `cd game_runs && python -m http.server 8000` 后打开
`/BladeTrinity/transform-preview.html`）。左右两人同一流派（左人朝右 = 镜像，右人朝左 = 素材原向），
可切流派与背景（道场/雪山/黑/白/暖/洋红）、拖 0–100% 进度、按住（按 fullMs 走）、释放、取消、按源片原速走一遍。

### 8.3 验收（2026-11-02）

```bash
node game_runs/BladeTrinity/tools/build-transform.mjs     # 素材：哈希校验 + 图集 + report.json + 审查图
node game_runs/BladeTrinity/tools/transform-check.mjs     # 预览页 P + 真实对局 G，报告 video_runs/BladeTrinityTransform/check/report.json
```

四个阶段分开报告，不互相替代：

| 阶段 | 结论 | 依据 |
|---|---|---|
| 源片齐备 | ✅ 三段 SHA-256 与计划 §3 一致（构建脚本不符即中止） | `report.json` 的 `source` |
| 透明素材完成 | ✅ 剑/手脚不贴格边、脚底 201–202、段内高度剑神 126–133（耳朵长出+身体微沉）/ 水神 110–115 / 北神 125 恒定；每格残留偏绿像素 ≤7；北神朝向保持源片 | `report.json` 的 `cells`/`checks` + `review/` 四色底目检 |
| 预览通过 | ✅ P 段 28/28：三派 × 左右朝向 0–100% 逐档格号 = 映射、单调、终于保持帧；满蓄保持静止不循环；按住/释放/取消；30 轮反复后显示对象、补间、监听器回到基线；无 404；四种背景 + 窄屏截图 | `transform-check.mjs` P 段 |
| 真实触发整合通过 | ✅ G 段 93/93（玩家键盘路径 × 三派、AI 路径 × 三派、双方同蓄、换场/重开、缺图回退、窄屏）+ 两道验证门 | `transform-check.mjs` G 段 + 两道验证门 |

G 段逐派覆盖：短按（frac < minFrac → 按取消收、不出剑气、蓝照扣）、半蓄（逐帧格号 = 映射、蓄力中无描边、
剑气数量与伤害 = 原公式）、从防御直接起蓄（防御描边当刻收掉、松手后防御描边照常重建）、满蓄继续按住 1 秒（停在保持帧、不播动画、不转身、不自动出招、碰撞体与脚底不动）、
蓝耗尽自动放出、受击打断（收蓄当刻已是主图集受击姿势）、失焦取消、600ms 长帧、站右侧朝左。
对局用例【手动步进】游戏循环（`game.step`，1/60s 一帧），时序与机器负载无关；截图在
`video_runs/BladeTrinityTransform/check/`（不入库），报告 `check/report.json`（入库）。

验证门（2026-11-02）：
- `npx tsx skills/game-verify/verify.ts BladeTrinity` —— 通过（L0/L1/L2）。
- `npx tsx skills/game-playtest/play.ts BladeTrinity` —— 与改动前的提交 `286af03` 同窗口交替各 5 局：
  两边都有 2~3 局卡在页面加载（本机当时可用内存约 1.5 GB，headless 拉 CDN 超时，与改动无关）；跑起来的局里
  基线 1 胜 1 卡、本版 1 胜 2 卡，**双方 0 输 0 死亡、0 条游戏 JS 报错**（本版一局有浏览器层 `ERR_INSUFFICIENT_RESOURCES`），
  蓄力每局 2~5 次。样本太小判不出胜率差异（这个 bot 本就噪声大，见 §7.5 与上文诊断记录）；能证明的是没有新报错、没有卡死在蓄力上。
- `node tools/joycon-check.mjs`（手柄掉线 / 切后台 / 失焦中的蓄力取消路径）—— __JOYCON__

人眼仍需看的（自动化证明不了）：变装在 420ms 内走完是否"读得出"（剑神只长犬耳，变化最小）；
释放瞬间的服饰回落是否像"外壳褪去"而不是"闪了一下"；北神 v6 用户是否最终认可。
→ 2026-11-03 用户嫌太快，改为蓄力期间子弹时间，见 §8.4。

### 8.4 子弹时间（蓄力变装慢放，2026-11-03）

用户意图：变装在战斗里太快（420ms 挤 18–20 格，每格约 22ms，比源片 24fps 还快一倍），要放慢便于观赏，
像子弹时间那样；变身的时长不计入战斗时长，变身过程中对手不会、或来不及攻击。
执行计划：[plans/blade-trinity-bullet-time-plan.md](../../plans/blade-trinity-bullet-time-plan.md)。

锁定决策（用户 2026-11-03 确认）：
1. **全场慢放，不做时停。** 所有对象一起变慢，含变身者自己的变装进度。战斗时间里蓄力仍是 420ms，规则与平衡不变；
   起蓄前已在飞的剑气照样能打断蓄力（时停会让蓄力零风险，已否决）。
2. **倍率 0.35**：满蓄 420ms 战斗时间在画面上约 1.2s，每格约 60ms。做成配置，用户凭眼再调。
3. **玩家与 AI 变身都慢放**；双方同时在蓄时两人都收才恢复。轻点（不足 minFrac）也会进入慢放，松手当帧恢复。
4. **松手当帧硬切回 1×**（慢放 → 出剑的速度反差就是打击感）；进入时约 90ms（真实时间）线性渐入。
5. **只在变装真的在播时慢放**（`f.tf` 存在）；变装图集没载到、退回 guard 占位时不慢放。

"对手来不及攻击"在规则上本来就成立：起蓄的起浪把近敌轰到场边并给 `waveStun 520ms` 硬直 + 无敌，长于满蓄 420ms。
子弹时间只解决画面节奏。

配置（`data.js`，紧挨 `BT.CHARGE`）：

```js
BT.BULLET_TIME = { enabled: true, scale: 0.35, rampInMs: 90 /* 真实毫秒 */ };
```

URL 覆盖（凭眼调参用，解析位置同 `?tier=`）：`?bt=0` 关闭；`?bt=0.5` 这类 (0,1] 的数当倍率；非法值（`abc`、`2`、`-1`、空）忽略。
例：`/BladeTrinity/index.html?bt=0.5`、`?tier=di&bt=0.25`。调参定稿只改 `BT.BULLET_TIME.scale`。

实现（`game/systems/bullettime.js`，在 `transformation.js` 之后、`charge.js` 之前加载）：
- **可变速战斗时钟**：`create()` 第一行把 `this.time`（Clock 实例）的 `now` 换成 getter/setter。Phaser 每帧在
  `Clock.update` 里写入真实时间，setter 按当前倍率把真实增量折算成游戏增量累加；getter 返回游戏时间。于是全部约 40 处
  `this.time.now`、POST_UPDATE 钩子、`__probe`、delayedCall 回调读到的都是游戏时间，不用逐处改。`update(time, delta)`
  第一行把形参换成游戏时间（`time = this.time.now`，`delta ×` 本帧倍率），排在一切 early return 之前。
  Clock 实例跨 `scene.restart` 保留，状态挂在它身上，重装幂等、游戏时间单调不回拨。倍率恒 1 时游戏时钟与真实时钟逐帧相等。
- **每帧推导、不埋开关**：挂 POST_UPDATE（shutdown 时摘除），`want = enabled && phase === 'fight' && 任一 fighter (charging && tf)`。
  不在 `_startCharge/_endCharge` 里开关，所以释放 / 取消 / 受击 / 换场 / 重开 / KO 任何收蓄路径都卡不住慢放（与抜刀
  `freezeUntil` 同一套路）。放 POST_UPDATE 而不是 update 开头：它没有按 phase 的 early return，而且看得到本帧的收蓄 ——
  松手那一帧就切回 1×，下一帧的时钟 / 物理 / 动画 / 补间已全是原速。
- **倍率同步五处**：战斗时钟；`tweens.timeScale`（描边一弹、招式名、服饰回落）；`time.timeScale`（delayedCall）；
  Arcade 物理 `world._frameTime = s / fps`（步进频率不变、每步积分时间按比例缩短，画面平滑；`world.timeScale = 1/s`
  会拉长步进间隔、0.35 时约 48ms 一步、飞行中一跳一跳，不用；`_frameTime` 是 3.60.0 内部字段，不是 number 时退回
  `world.timeScale` 并警告一次，升级 Phaser 时复查）；**逐个 sprite 的 `anims.timeScale`**（对手受击/倒地、背景动态层）。
- ⚠️ **与计划不同的一处**：计划写的是 `this.anims.globalTimeScale = s`。核对 `_engine/vendor/phaser-3.60.0.min.js`：
  这个字段只出现在 AnimationManager 构造、`fromJSON`、`toJSON` 里，`AnimationState.update` 只乘 sprite 自己的 `timeScale`
  —— 在 3.60.0 里设了不生效。所以改为慢放期间每帧给显示列表里所有带 `anims` 的对象设 `anims.timeScale`（期间新建的
  sprite 下一帧跟上），`globalTimeScale` 始终不碰（T 段断言它恒为 1）。升级 Phaser 后它若开始生效，别两处都设，否则是 s² 倍。
- 不变速：相机 shake/flash、GameAudio、DOM HUD、键盘/手柄输入层（都是真实时间）。
- 复位：`create()` 与 `shutdown` 都把五处复位到 1。
- `__probe()` 新增 `timeScale`（当前倍率，select 阶段报 1）；`usage` 新增 `aiCharge`（电脑有效放出的蓄力剑气数）。
- **约定：玩法逻辑只能读 `this.time.now` 或 `update` 的 `time/delta`，不得读 `performance.now()` / `Date.now()` / `game.loop.*`**
  —— 那些是真实时间，慢放期间会和战斗时钟错位。结束慢放也不许挂 delayedCall / tween onComplete（无头下 Clock 事件滞后约 6 倍）。

已知并接受的副作用：
- 玩家满蓄要真实按住约 1.2s，慢动作里更容易掐准松手时机。
- AI 蓄力期间，没被起浪轰到的玩家有约 3 倍真实时间做决定，但移动速度按战斗时间不变，能走的距离一样。
- 补间用的是 Phaser TweenManager 自己的墙钟（`Date.now()`）× 倍率；不影响玩法，但手动步进的检查脚本里补间按墙钟收尾。

#### 验收（2026-11-03）

```bash
node game_runs/BladeTrinity/tools/transform-check.mjs              # P + G（?bt=0）+ T，报告 video_runs/BladeTrinityTransform/check/report.json
node game_runs/BladeTrinity/tools/transform-check.mjs --parts=T    # 只跑子弹时间；--tsuite=sword,ai,life,misc 只跑部分套件
npx tsx skills/game-playtest/play.ts BladeTrinity --bt=0           # playtest 关子弹时间（平衡 A/B 用）
```

transform-check **202/202**：P 28 / G 93（一律 `?bt=0` 原样跑，证明关掉慢放时行为与接入前一致）/ T 81。
T 段全部手动步进（`game.step`，1/60s 一帧），真实时长 = 帧数 × 1/60s，与机器负载无关：

| # | 用例 | 结果 |
|---|---|---|
| T1 | 三派玩家满蓄 | 69 帧 = **1150ms 真实时间**，同期游戏时间 420.7ms；渐入首帧 0.88 → 第 6 帧到 0.35 后保持；停在保持帧 |
| T2 | 蓄力中各子系统 | 时钟 / 补间 / Clock 事件 / 物理步长 / 全部 sprite 动画 = 0.35，探针同报，`anims.globalTimeScale` 恒 1；实测匀速刚体每真实秒位移与循环动画换帧次数都 ≈ 原速 × 0.35 |
| T3 | 松手 | 当帧五处全回 1、`_frameTime` = 1/60；frac=1、剑气数量与伤害按原公式；剑气每真实秒 520px（= `BT.QI.speed`，与 `?bt=0` 相同） |
| T4 | 战斗时间不变 | 对手起浪硬直 / 无敌 = 520ms 游戏时间，按游戏时间 520ms（+≤1 慢放帧）后起身；满蓄扣蓝 = 100（±1 帧量，扣除同期回蓝后） |
| T5 | 轻点 / 受击 / 飞来剑气 | 轻点：起蓄帧已渐入、松手当帧回 1；受击打断当帧回 1；起蓄前已在飞的剑气在慢放中照样命中并打断蓄力 |
| T6 | AI 与双方同蓄 | AI 起蓄即慢放、到点松手当帧回 1、计入 `usage.aiCharge`；双方同蓄（harness 关掉起浪构造）一方先收仍保持，两方都收才回 1，两种先后各一遍 |
| T7 | 换场 / 重开 | 慢放中对手 KO 进 interlude、被 KO 进 over、整场重开 → 当帧回 1；重开后首帧五处全 1、游戏时钟单调、判据每帧只跑一次、再蓄照常慢放 |
| T8 | 变装图集 404 | guard 占位蓄力全程 1×、游戏时间 = 真实时间 |
| T9 | 慢放后抜刀 | 游戏时钟已落后真实时钟数百毫秒时，抜刀冻结 120ms 按游戏时间准点解冻、物理恢复 |
| T10 | URL | `?bt=0` 全程 1×、满蓄 450ms；`?bt=0.5` 满蓄 833ms；同比例剑气伤害两者相同；非法值回默认 |
| T11 | 30 轮蓄放 | 显示对象 / 补间 / sprite 与场景监听器回到基线，判据每帧只跑一次 |

验证门：
- `npx tsx skills/game-verify/verify.ts BladeTrinity` —— 通过（L0/L1/L2）。
- `npx tsx skills/game-playtest/play.ts BladeTrinity` —— 1 胜（34.9s）+ 1 局 act2 卡住；无 JS 报错，玩家蓄力与电脑蓄力（aiCharge×5 / ×11）都 > 0。
  act2 卡住在改动前的基线上同样出现（同日同窗口基线 1 胜 1 卡），是这个 bot 的既有噪声。
  另有两局在页面加载阶段超时（headless 浏览器层，未进游戏），不计入。

平衡 A/B（playtest bot，同一时段关 / 开交替各 15 局；页面加载超时的局未进游戏，剔除）：

| 组 | 有效局 | 胜 | 卡住（act2，20s 不掉血） | 胜局平均时长 | 页面加载失败 |
|---|---|---|---|---|---|
| 关（`--bt=0`） | 10 | **10** | 0 | 46.7s | 5 |
| 开（0.35） | 9 | **5** | 4 | 52.3s | 6 |

**与计划"预期无显著差异"不符**：开启后 bot 卡住明显变多（Fisher 精确检验 p≈0.03）。规则层面 T4 已证明战斗时间、
扣蓝、硬直、剑气都按游戏时间不变，所以更可能是 bot 自身的真实时间耦合：卡住判据（约 20s 真实时间不掉血）和
缩地 / 防御 / 出招节奏都按真实时间算，而每局约 10 次电脑蓄力 + 3 次玩家蓄力会多吃掉 8~10s 真实时间
（胜局变长约 6~11s 与此吻合）。这是推断，未单独验证；判断实际手感以人工试玩为准。

人眼验收（留给用户，自动化证明不了）：1.2s 合不合适、90ms 渐入是否突兀、松手硬切回原速有没有冲击感。
调参：浏览器打开 `index.html?bt=0.5`（或 0.25 等）凭眼比，`?bt=0` 是关掉的对照；定稿后只改 `BT.BULLET_TIME.scale`。

**2026-11-03 用户定：去掉蓄力中的持续描边**（原 `charge.js _drawAura`，半径 5→17 + 辉光，`BT.GUARD_AURA.chargeRMax` 一并删除）。
原因：① 蓄力进度已由变装帧表达，描边多余；② 描边是防御的表现语言，水神蓄力的蓝 / 北神蓄力的紫和各自防御描边几乎同色，
会被读成"在防御"；③ 描边压在犬耳、裙摆、毛领这些变装细节所在的轮廓上。不保留缺图时的描边备选。
起蓄瞬间的"描边一弹"（`_outlinePulse`）、松手的服饰回落、防御与居合架式描边照旧。从防御姿势直接起蓄时，
`_startCharge` 当刻收掉防御描边（否则它会冻在起蓄前的位置与帧上）。
