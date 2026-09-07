# 三招决胜 · 连续帧素材前端播放接入计划（供 Agent 执行）

创建日期：2026-09-06
关联：
- 素材侧主计划 `plans/three-moves-character-frame-image-plan.md`（§13.6 划定"前端播放需另立计划"、§13.7 已知限制）
- 专项修复 `plans/three-moves-frame-remediation-plan.md`（12 人 × 4 动作素材已验收）
- Roxy 待办 `plans/three-moves-remaining-tasks-handoff.md`（不阻塞本计划）

本计划只做 **`game_runs/ThreeMoves/game/` 内的前端播放接入**，不碰素材管线、不碰结算/规则逻辑。

---

## 0. 现状（Agent 动手前必读）

- **ThreeMoves 是 DOM/CSS 游戏**，不是 Phaser 场景图。`game/scenes/*.js` 是空壳；`game/render.js` 在每次 `state.onChange` 时整块重绘 DOM；`#game-canvas` 只画背景粒子（`systems/effects.js`）。
- **素材已就位但没人播**：
  - `char_runs/ThreeMoves/<C>/output/{spritesheet.webp,char.json}` 已按专项修复验收（12 人；图集 1728×832 = 9 列 × 4 行，单格 192×208）。
  - 已同步到 `game_runs/ThreeMoves/assets/media/characters/<C>_spritesheet.webp` / `<C>_char.json`，formal↔游戏媒体 sha256 一致。
  - `assets/media/registry.js` 的 `characters.<C>` 条目已带 `spritesheet` / `charJson` 路径。
  - 但唯一消费者 `registry.js` 的 `hydrateSlots()` 只加载 `mediaItem.base` 静态图，状态文字硬编码"静态基准"。`render.js` 里 **没有任何** 帧 / 动画 / 招式代码。
- **牌面卡结构**：`render.js` 的 `cardFace()` 产出 `.card-face > .media-slot`，`hydrateSlots()`（MutationObserver 驱动）往每个 `.media-slot` 注入 `<img class="media-art" src=base>`。
- **对局流**（`state.js`）：`phase: 'ready'` →（`playCard`：设 `state.result`，`phase='resolving'`，`emit` 一次，挂 `setTimeout(finishResolution, RESULT_DELAY=1450ms)`）→ `finishResolution`：`emit` 一次，回 `'ready'` 或进 `won/lost/tie`。
  - **resolving 窗口 = 1450ms，中间无额外 render**（除非玩家在结算中敲 A/D，见 §3.7 边界）。
  - `render.js` 第 107–108 行把 `result.playerCard` / `result.enemyCard` 渲进 `#player-played` / `#enemy-played` 两个大槽。
- **花色 → 动画行映射**（`data.js` `suits` 与 `char.json` `rows` 天然 1:1）：

  | 花色 | suitMeta | char.json row | 行号 |
  |---|---|---|---|
  | `spade` ♠ | 攻击·斩击 | `attack` | 0 |
  | `heart` ♥ | 守护·结界 | `guard` | 1 |
  | `diamond` ♦ | 能力·爆发 | `ability` | 2 |
  | `club` ♣ | 特殊·奇袭 | `special` | 3 |

- **Joker**（`dragon` / `human`）与 **Roxy** 无 `suit` / 无 `spritesheet` → 永远走静态图，不参与本功能。
- **`char.json` 的 `animations.*.loop` 全为 `true`**，与素材计划前提"1→8 一次性、不循环、播完回 base"矛盾。见 §2 决策 C。
- **对外契约**（playtest / verify 依赖，不可破坏）：`window.__probe()`、`window.__gameState`、`window.__hudStart()`、`window.__advanceCard()`、`?autostart` 与 `navigator.webdriver` 直接进第 1 关。动画层必须是**纯视觉叠加、非阻塞**，不改任何 state 字段、不改 `RESULT_DELAY` 节奏。

---

## 1. 范围与非目标

**做**：
- 出牌结算瞬间，在结算区把双方所打出的牌对应角色的 **该花色动作帧 1→8 播放一次**，播完落回静态 `base`，全程在 `RESULT_DELAY` 窗口内。
- 无 `spritesheet` 的牌（Joker / Roxy）静默回落到现状静态图。
- 过素材计划的两道验证门 + 人工目检。

**不做**：
- 不改 `game/systems/duel.js`、`state.js` 的结算/规则/HP/得分逻辑。
- 不改素材管线、不重生成任何帧、不动 `char_runs/`。
- 不做手牌区小卡的帧动画（`.media-slot` 在手牌里仅约 80×110px，动画噪点大、收益低）——除非 §2 决策 A 选了"全都动"。
- Joker 结算区帧播放与 Roxy 干净 base 已由 `plans/three-moves-joker-playback-and-roxy-base-plan.md` 处理；Roxy 四动作仍待办。
- 不加存档 / 设置开关 UI（"即开即玩"铁律）；`ANIM_*` 只做 `config.js` 常量。

---

## 2. 待确认决策（默认值已给，Agent 按默认执行，除非用户改）

| 编号 | 决策 | 取值 | 备选 / 影响 |
|---|---|---|---|
| **A** | 动画播在哪些槽 | **【已确认 2026-09-06】只播结算区 `#player-played` + `#enemy-played` 两个大槽**。手牌卡 / 敌方牌堆 / 意图面板全程静止，无 idle 动画。 | 备选（未采用）：手牌选中卡也播 / 敌方意图面板也播。 |
| **B** | 帧率 | **12 fps**（9 帧 ≈ 750ms，留 ~700ms 停在 base 再进下一招） | 8 fps（读 `char.json` 原值，≈1125ms，几乎顶满 1450ms 窗口，观感偏拖）。做成 `config.js` 常量可调。 |
| **C** | `loop:true` 元数据 | **【已确认 2026-09-06】播放器强制单发**：登台播帧 1→8 一次，播完停在静态 `base` 直到本招撤台；忽略 `char.json.loop`，元数据本轮不动。 | 备选（未采用）：改 `skills/char-sprite/assemble.ts` 默认 `loop:false` + 重跑 assemble 同步 12 人。 |
| **D** | webdriver / `mode==='test'` 下 | **跳过逐帧步进**，直接显示 base（动画对 bot 无信息量，且免污染截图 / 计时） | 备选：正常播 + 在 `__probe()` 加 `lastAnimSuit` 字段供专项断言。 |
| **E** | 预加载 | **开局 + 每次 `finishResolution` 后，`new Image()` 预取当前手牌 + 敌方意图牌的 `spritesheet.webp`** | 不预加载：首次翻牌可能闪一下白。每张 ~300KB，最多 ~6 张。 |

> 用户意图（2026-09-06）："不出牌时角色一律静止，只有牌出现在牌桌上才播放一次。" → 锁定 A、C 为上表取值。B / D / E 不影响该行为，按上表默认执行。

---

## 3. 设计

### 3.1 触发时机与生命周期

1. `render.js` 渲染完 `#player-played` / `#enemy-played` 的 `innerHTML` 后，若满足：
   - `state.phase === 'resolving'` 且 `state.result` 存在；
   - 本轮 `resultKey`（`round + ':' + outcome + ':' + playerCard.id`，复用现有 `this.lastResultKey` 去重机制）尚未触发过动画；
   - 非 webdriver / 非 test（决策 D 默认）；
   则对双方各调一次 `NS.SpriteAnim.playOnce(slotEl, media, suit, done)`。
2. `playOnce` 在目标 `.media-slot` 内注入一层 `<div class="sprite-anim">` 叠在 `.media-art` 之上（`z-index` 高于 2），用 `requestAnimationFrame` 按帧率把 `background-position` 步进 9 帧。
3. 播到第 9 帧：移除 `.sprite-anim` 层（露出底下静态 `.media-art` base），调 `done()`。
4. `finishResolution` 触发的下一次 `render()` 会整块重绘 `#*-played`，任何残留动画层自然被 `innerHTML` 清掉；`playOnce` 内部对已 detach 的节点要静默中止（`rAF` 里检查 `el.isConnected`）。

### 3.2 帧定位数学（DOM 背景精灵）

- 图集 `1728×832`，9 列 × 4 行，格 `192×208`。
- `.sprite-anim` 样式：`position:absolute; inset:0; z-index:4; background-image:url(<spritesheet>); background-repeat:no-repeat; background-size:900% 400%; image-rendering:auto;`
- 第 `i` 帧（i=0..8）、第 `row` 行（0..3）：
  - `background-position-x = (i / 8) * 100%`
  - `background-position-y = (row / 3) * 100%`
  （百分比背景定位＝(容器−图)比例，故 0%＝该帧贴左/上，100%＝末帧贴右/下，中间帧精确落在 `i/8`、`row/3`。）
- 槽宽高比（`.media-slot` inset 后 ≈ 5:7）与单格 192:208 ≈ 0.92:1 略有差异 → `background-size` 用百分比即按槽拉伸，轻微形变可接受；若目检觉得胖，改用 `contain` 思路（固定 `background-size` 为 `900% auto` 并居中）——留作 P3 微调。

### 3.3 新模块 `game/systems/sprite-anim.js`

命名空间 `NS.SpriteAnim`，导出：

```
NS.SpriteAnim = {
  ROW_BY_SUIT: { spade:0, heart:1, diamond:2, club:3 },
  preload(mediaList),           // new Image() 预取 spritesheet，内部缓存去重
  playOnce(slotEl, media, suit, done),  // media 无 spritesheet → 直接 done()，不注入层
  stopAll(),                    // 清所有活动 rAF 与注入层（restart / 场景切换时调）
};
```

- 帧率取 `NS.Config.ANIM_FPS`（决策 B），不读 `char.json.loop`（决策 C）。
- `char.json` 仅用来兜底校验 `frameSize` / `rows` 顺序；实际按 §3.1 常量映射，`char.json` 拉取失败也能播（用常量）。
- 所有 `rAF` 回调首行 `if (!slotEl.isConnected) return cleanup();`。
- 无 `requestAnimationFrame`（老环境）→ 直接显示末帧再 `done()`。

### 3.4 `game/render.js` 接入点（最小改动）

- `Renderer` 增字段 `this.lastAnimKey = ''`。
- `render()` 尾部、算出 `resultKey` 之后、`Effects.burst` 附近：

  ```
  if (resultKey && resultKey !== this.lastAnimKey && state.phase === 'resolving'
      && NS.SpriteAnim && !isBotMode()) {
    var pm = NS.Media.getCardMedia ? NS.Media.getCardMedia(result.playerCard) : null;
    var em = NS.Media.getCardMedia ? NS.Media.getCardMedia(result.enemyCard) : null;
    NS.SpriteAnim.playOnce(playerSlotEl, pm, result.playerCard.suit);
    NS.SpriteAnim.playOnce(enemySlotEl, em, result.enemyCard.suit);
    this.lastAnimKey = resultKey;
  }
  ```
  `playerSlotEl` = `#player-played .media-slot`（`cardFace` 渲染后存在）；`isBotMode()` = `navigator.webdriver || state.mode === 'test'`（决策 D）。
- `onRestart` 流程里调一次 `NS.SpriteAnim.stopAll()`（`main.js` 的 `app.restart` → `app.start`，可在 `state.start` 后由 `render` 自然清；保险起见显式调）。
- 预加载（决策 E）：`main.js` 的 `state.onChange` 或 `render()` 末尾，`phase==='ready'` 时 `NS.SpriteAnim.preload([...playerHand, enemyIntent].map(NS.Media.getCardMedia))`（内部去重，便宜）。

### 3.5 `game/config.js`

```
ANIM_FPS: 12,          // 决策 B
ANIM_ENABLED: true,    // 关闭开关（仅常量，无 UI）
```

### 3.6 `index.html` 脚本顺序

在 `registry.js` 之后、`render.js` 之前插入：
```
<script src="assets/media/registry.js"></script>
<script src="game/systems/sprite-anim.js"></script>   <!-- 新增 -->
<script src="game/render.js"></script>
```
（`sprite-anim.js` 依赖 `NS.Config` 与 `NS.Media`，被 `render.js` 调用。）

### 3.7 回落与边界

- `media` 为 `null` / 无 `.spritesheet`（Joker、Roxy）→ `playOnce` 立即 `done()`，`.media-slot` 保持 `hydrateSlots` 注入的静态图，无报错、无空层。
- `spritesheet.webp` 加载失败（404 / 网络）→ `Image.onerror`：跳过动画层，静态图兜底。
- **玩家在 resolving 中途按 A/D**：`state.nudge` → `select` → `emit` → `render()` 重绘 `#*-played`，动画层被 innerHTML 清掉。此时 `resultKey === this.lastAnimKey`，不会重播 → 动画被"打断"停在 base。可接受（少见）；若要更稳，`render()` 在 `phase==='resolving' && resultKey===lastAnimKey && 动画未完成` 时重新 `mount`——列为 P3 可选加固。
- `verify.ts` 分层截图可能抓到动画中间帧 → 仍是完整角色，不影响断言。

### 3.8 对外契约核对（改完逐条确认）

- [ ] `window.__probe()` 返回结构、字段不变（除非决策 D 选备选才加 `lastAnimSuit`）。
- [ ] `__hudStart()` / `__advanceCard()` / `?autostart` / webdriver 直进第 1 关行为不变。
- [ ] 动画不写任何 `state.*` 字段；`RESULT_DELAY` 未改。
- [ ] 关闭 `ANIM_ENABLED` 时游戏与当前版本逐帧等价。

---

## 4. 文件改动清单

| 文件 | 改动 |
|---|---|
| `game_runs/ThreeMoves/game/systems/sprite-anim.js` | **新增**，§3.3 模块（约 100–140 行） |
| `game_runs/ThreeMoves/game/render.js` | +`lastAnimKey`；`render()` 尾部触发块（§3.4，约 12 行） |
| `game_runs/ThreeMoves/game/config.js` | +`ANIM_FPS` / `ANIM_ENABLED`（2 行） |
| `game_runs/ThreeMoves/game/styles.css` | +`.sprite-anim` 规则（§3.2，约 4 行） |
| `game_runs/ThreeMoves/index.html` | +1 行 `<script src="game/systems/sprite-anim.js">` |
| `game_runs/ThreeMoves/preview.mp4` | P4 重录（游戏根 10s 预览入库） |
| `game_runs/ThreeMoves/verify-report.json` / `playtest-report.json` | 跑门时自动刷新 |

若决策 C 选"改元数据"：追加 `skills/char-sprite/assemble.ts` 一行默认值 + 12 人 `char.json` 重跑同步 + `git add -f`。
`registry.js` 无需改（`spritesheet`/`charJson` 路径已在）。

---

## 5. 执行阶段

### P1 — 预备（不写功能码）
1. 通读 §0 全部文件，确认花色→行、`RESULT_DELAY`、`resultKey` 去重机制与本计划一致。
2. 快速自测：浏览器打开 `game_runs/ThreeMoves/index.html?autostart`，出一张牌，确认 `#player-played .media-slot` 里确有 `<img class="media-art">` 且 resolving 持续约 1.45s。
3. 记录当前 `verify.ts` / `playtest.ts` 通过基线（先跑一遍留档）。

### P2 — 实现（按决策默认值）
1. 写 `game/systems/sprite-anim.js`（§3.3）。
2. 改 `config.js` / `styles.css` / `index.html`（§3.5 / §3.2 / §3.6）。
3. 改 `render.js` 触发块 + 预加载（§3.4）。
4. 本地目检：一整局 5 招，逐招确认：
   - ♠/♥/♦/♣ 四花色各自播到对应行、1→8 一次、播完落回 base；
   - Joker（龙神/人神）两张牌在结算区各播 9 帧一次并回落 base；洛琪希牌仍是静态图、无空层、无报错；
   - 结算区无布局抖动 / 无溢出 / z-index 正确（动画压住 base，不压 `.score-badge` / `.card-copy`）；
   - `ANIM_ENABLED=false` 时与旧版逐帧等价。

### P3 — 微调
- `background-size` 形变（§3.2）、帧率手感（决策 B）、中途打断加固（§3.7）按目检结果调。
- 决策 D 备选（暴露 probe 字段）如被选，此处加。

### P4 — 验证门 + 收尾（按素材计划 CLAUDE.md「验证门」章节，按序）
1. `npx tsx skills/game-verify/verify.ts ThreeMoves` — 通过（分层断言、截图）。
2. `npx tsx skills/game-playtest/play.ts ThreeMoves` — bot 自动通关、无卡死、白盒平衡体检不回退（动画非阻塞，胜率 / 轮次应与 P1 基线一致；负载噪声按需交替多跑几次）。
3. 重录 `game_runs/ThreeMoves/preview.mp4`。
4. `git commit`：`feat(ThreeMoves): 出牌结算区角色四招式连续帧播放接入`
   （改到 `char.json` 才需 `git add -f`；本计划默认不改，无需 `-f`。）
5. 回写：本文件 §8 勾项；素材主计划 §13.6 从"不在本计划范围"更新为"前端播放已由 `plans/three-moves-frame-frontend-playback-plan.md` 接入"。

---

## 6. 验收门

### 自动
- [ ] `verify.ts ThreeMoves` 通过，无新增报错 / 断言失败。
- [ ] `playtest.ts ThreeMoves` bot 通关，`won/lost/tie` 分布与 P1 基线无系统性偏移；无超时 / 卡死。
- [ ] `window.__probe()` 输出结构与 P1 基线逐字段一致（决策 D 默认下）。

### 人工目检（一整局，结论写进提交信息或本文件）
- [ ] ♠ 攻击 / ♥ 守护 / ♦ 能力 / ♣ 特殊 四花色各自播到正确动作行。
- [ ] 每次结算：帧 1→8 播放一次、不循环、播完落回 base；在 1450ms 窗口内收干净。
- [ ] 双方槽同时播、互不串行、互不错位。
- [ ] Joker（龙神 / 人神）各播 9 帧一次并回落静态 base；洛琪希仍静态，无空动画层、无 console 报错。
- [ ] 结算区无布局抖动、无内容溢出卡面、`.score-badge` / `.card-copy` 未被盖。
- [ ] `ANIM_ENABLED=false` 视觉回到当前 master 版本。
- [ ] 弱网 / 首次翻牌无明显白闪（决策 E 预加载生效）。

---

## 7. 暂停点（命中即停，上报）

- `playtest.ts` 胜率或通关轮次相对 P1 基线系统性变化 → 说明动画意外影响了节奏 / 输入，排查非阻塞性。
- `verify.ts` 因动画层截图 / DOM 结构变化而断言失败，且非本计划预期 → 停。
- 决策 A 想扩到手牌 / 决策 C 想改元数据 → 回 §2 记录并确认后再做，不擅自扩范围。
- 动画在某花色 / 某角色稳定错行或错帧，排查 §3.1 映射与 `char.json` `rows` 顺序仍不符 → 停，回素材侧核对该角色 `char.json`。

---

## 8. 完成标准

- [ ] `sprite-anim.js` 落地，四花色结算区帧播放按 §6 目检全过。
- [ ] Joker / Roxy 静态回落无回归。
- [ ] `verify.ts` + `playtest.ts` 双门通过，`__probe()` 契约不破。
- [ ] `preview.mp4` 重录、`ANIM_ENABLED` 开关可整体回退。
- [ ] 素材主计划 §13.6 已更新指向本计划。
- [ ] 本计划产物已提交。

---

## 附：性能与预算

- 单角色图集 ~260–490 KB WebP；一局最多涉及 手牌 5 + 敌方意图 1 = 6 张，预加载峰值 ~2 MB，可接受。
- 播放是 CSS `background-position` 步进，无 canvas、无逐帧解码，开销可忽略。
- 结算区两个 `.sprite-anim` 层，`RESULT_DELAY` 结束即销毁，无常驻。
- 与 `systems/effects.js` 的 canvas 粒子层各管各的（一个 DOM、一个 canvas），无冲突。
