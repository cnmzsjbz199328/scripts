# 三招决胜 · Joker 视频帧接入 + 洛琪希干净基准图 计划（供 Agent 执行）

创建日期：2026-09-06
作者：验收 agent（本人只制定计划，不实施）
关联：
- 前端播放主计划 `plans/three-moves-frame-frontend-playback-plan.md`（本计划是它的 §2 决策扩展 + §7 暂停点"想扩到 Joker"的正式落地）
- 素材交接单 `plans/three-moves-remaining-tasks-handoff.md`（§3 洛琪希阻塞、§0"不做 Joker"—— 本计划**推翻** §0 那条，改为用 video-sprite 轨接入）
- 素材主计划 `plans/three-moves-character-frame-image-plan.md`（§4.1 原图审计清单、§7 审查门、§13.1 原图表）
- 已验收提交 `2beb9d3 feat(ThreeMoves): 出牌结算区角色四招式连续帧播放接入`（本计划在其之上增量）

用户决策（2026-09-06）：
1. **Joker（龙神奥尔斯帝德 / 人神）**：直接复用已生成的 video-sprite 素材，接入结算区帧播放。
2. **洛琪希**：重绘一张干净基准图 —— **无脚下魔法阵、无杖头法球、无任何发光**，且**只持一根短魔杖**（不是原来的高身法杖），以降低后期生成四动作帧时模型自动补法术光效的风险。本计划**只做基准图**，四动作帧与她的播放接入留作后续（仍走交接单 §3.5 流程）。

两部分互相独立，可并行；合并提交或分两次提交均可。

---

## 0. 现状与依据（动手前必读）

### 0.1 Joker 素材已就位（gitignored，需拷入游戏媒体目录）

| 项 | 值 |
|---|---|
| 源文件 | `video_runs/ThreeMovesOther/output/Orsted_joker.webp`、`Hitogami_joker.webp` |
| 规格 | 各 **1728×208**，9 列 × 1 行，单格 192×208，`yuva420p`（**带 alpha，透明**） |
| 元数据 | `video_runs/ThreeMovesOther/output/sprite.json` → `Orsted_joker` / `Hitogami_joker`：`cols:9, rows:1, frameCount:9, fps:8, loop:false, status:completed` |
| 绿幕源视频（已入库） | `video_runs/ThreeMoves/other_characters/{Orsted,Hitogami}/source/*_joker_flow.mp4` |
| 观感 | 龙神：白发白袍，青绿灵气渐强 → 鞭形光轨 → 收招；人神：无脸白假人，绿色法阵漩涡（**中段身上有淡绿溢色，见 §7 暂停点 D**） |
| gitignore | `video_runs/**/output/` 被忽略（第 69 行）→ 必须拷进 `game_runs/ThreeMoves/assets/media/`（`game_runs/**/*.webp` 是 `!` 白名单，入库） |

### 0.2 播放器现状（`game/systems/sprite-anim.js`，2beb9d3 版）

- 写死 **9 列 × 4 行合表**：`setFrame` 用 `frame/8*100%` 与 `row/3*100%`；CSS `.sprite-anim { background-size: 900% 400%; }`。
- `playOnce(slotEl, media, suit, done)`：
  - `!media || !media.spritesheet` → 立即 `finish(done)`，不注入层（**这就是当前 Joker/洛琪希回落静态的原因** —— 它们的 `registry.js` 条目没有 `spritesheet`）。
  - `row = ROW_BY_SUIT[suit]`；`suit` 为 `undefined`（Joker 无花色）→ `row === undefined` → `finish(done)`。
- `FRAME_COUNT = 9`；帧率取 `NS.Config.ANIM_FPS`（=12，决策 B）；不读任何 per-media fps / loop（决策 C）。
- `render.js` 触发块对**每张**出牌牌都调 `playOnce(slot, getCardMedia(card), card.suit, markDone)`，包括 Joker；`preload` 对手牌 + 敌方意图牌 `map(getCardMedia)` 预取。

### 0.3 洛琪希现状

| 项 | 值 |
|---|---|
| 游戏内底图 | `game_runs/ThreeMoves/assets/media/characters/Roxy_base.png`（580×720 RGBA，已抠透明底的派生图）|
| 污染 | 杖头实体化水法球 + 龙形光效；**脚下青色魔法阵**。违反素材红线（派生图 + 魔法元素）|
| 阻塞登记 | 交接单 §3.1；char-sprite 管线未完成（`char_runs/ThreeMoves/Roxy/output/` 空，manifest `status:pending`）|
| 牌面 | 洛琪希是 rank Q 的**正常花色牌**（deck 里有黑/红/方/梅四张），只是 `registry.js` 的 `Roxy` 条目没有 `spritesheet` → 播放器回落静态 |
| 视频轨备选 | `video_runs/ThreeMovesOther/output/Roxy_{attack,guard,ability,special}.webp` 存在且干净（无魔法阵），但仍持**高身法杖 + 杖头法球** → 与用户要的"短魔杖"设计不符，本计划**不用**它，改重绘 |

---

## 1. 范围与非目标

**做**：
- A. 把 `Orsted_joker.webp` / `Hitogami_joker.webp` 拷入游戏媒体目录，`registry.js` 两个 Joker 条目补 `spritesheet` + 图集规格字段。
- A. `sprite-anim.js` 通用化：支持"单行图集"（cols×1），Joker 无花色时固定播第 0 行。
- A. 打出 / 对方亮 龙神 / 人神时，结算槽播其 9 帧 joker 条一次，播完落回静态 base，行为与现有四花色播放一致（非阻塞、`RESULT_DELAY` 不变、bot/test 模式跳过）。
- B. 重绘洛琪希干净基准图（短魔杖、无魔法阵、无发光），过素材主计划 §4.1 审计，替换游戏内 `Roxy_base.png`。
- 过 verify / playtest 双门 + 人工目检（§6）。

**不做**：
- 不改 `state.js` / `duel.js` / `main.js` / 结算规则 / HP / 得分 / `__probe()`。
- 不改 `RESULT_DELAY`、决策 B/D/E 的取值。
- 不做洛琪希的四动作帧、不做她的播放接入（`registry.js` 的 `Roxy` 条目**保持只有 `base`**）。留作后续，走交接单 §3.5。
- 不做手牌小卡 / 敌方意图面板动画（决策 A 不变）。
- 不重生成 12 名角色的任何素材；不动 `char_runs/`。
- 不加设置开关 UI。

---

## 2. Part A —— Joker 视频帧接入结算区播放

### 2.1 同步素材（拷进游戏媒体目录）

```bash
cd "c:/Users/tj169/Flinders/work/Learning/scripts"
cp video_runs/ThreeMovesOther/output/Orsted_joker.webp   game_runs/ThreeMoves/assets/media/jokers/Orsted_joker.webp
cp video_runs/ThreeMovesOther/output/Hitogami_joker.webp game_runs/ThreeMoves/assets/media/jokers/Hitogami_joker.webp

# 校验：必须 1728x208、带 alpha（yuva420p / rgba）
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,pix_fmt -of csv=p=0 game_runs/ThreeMoves/assets/media/jokers/Orsted_joker.webp
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,pix_fmt -of csv=p=0 game_runs/ThreeMoves/assets/media/jokers/Hitogami_joker.webp
```

**不拷** `sprite.json` 与合表 `spritesheet.webp`（那是 video-sprite 全量合表，非本用途）。图集规格直接写进 `registry.js`（§2.2），播放器不 fetch json（与现状一致）。

### 2.2 `game_runs/ThreeMoves/assets/media/registry.js`

把：
```js
  var jokers = {
    Orsted: { base: base + 'jokers/Orsted_base.png' },
    Hitogami: { base: base + 'jokers/Hitogami_base.png' }
  };
```
改成：
```js
  var jokers = {
    Orsted: { base: base + 'jokers/Orsted_base.png', spritesheet: base + 'jokers/Orsted_joker.webp', sheetCols: 9, sheetRows: 1 },
    Hitogami: { base: base + 'jokers/Hitogami_base.png', spritesheet: base + 'jokers/Hitogami_joker.webp', sheetCols: 9, sheetRows: 1 }
  };
```
`getCardMedia()` 里 `card.joker === 'dragon' → jokers.Orsted` / `'human' → jokers.Hitogami` 的分支已存在，不动。`hydrateSlots` / `mediaForLabel` 对 Joker 的静态图注入已存在，不动。**`Roxy` 条目不动。**

### 2.3 `game_runs/ThreeMoves/game/systems/sprite-anim.js` —— 通用化单行图集

最小改动，四处。改完后 9×4 路径的算术与现在**逐位相同**（cols=9→`frame/8`，rows=4→`row/3`，`background-size` 内联 `900% 400%` = CSS 默认值）。

**(a) `setFrame` 增 `cols` / `rows` 形参**（第 30–33 行）：
```js
  function setFrame(layer, frame, row, cols, rows) {
    layer.style.backgroundPositionX = (cols > 1 ? (frame / (cols - 1)) * 100 : 0) + '%';
    layer.style.backgroundPositionY = (rows > 1 ? (row / (rows - 1)) * 100 : 0) + '%';
  }
```

**(b) `playOnce` 里解析 cols/rows + 行号**（替换第 46–50 行的 `var row = api.ROW_BY_SUIT[suit]; if (row === undefined) {...}`）：
```js
    var cols = Number(media.sheetCols) > 0 ? Number(media.sheetCols) : 9;
    var rows = Number(media.sheetRows) > 0 ? Number(media.sheetRows) : 4;
    var row;
    if (rows === 1) {
      row = 0;                          // 单行图集（Joker）：无花色，固定第 0 行
    } else {
      row = api.ROW_BY_SUIT[suit];
      if (row === undefined) { finish(done); return; }
    }
```

**(c) 注入层后内联 `background-size`**（在第 61 行 `layer.style.backgroundImage = ...` 之后加一行）：
```js
    layer.style.backgroundSize = (cols * 100) + '% ' + (rows * 100) + '%';
```

**(d) 三处 `setFrame` 调用补传 `cols, rows`**：
- 第 62 行 `setFrame(layer, 0, row);` → `setFrame(layer, 0, row, cols, rows);`
- 第 79 行 `setFrame(layer, 8, row);` → `setFrame(layer, cols - 1, row, cols, rows);`（无 rAF 兜底，落末帧）
- 第 97 行 `setFrame(layer, frame, row);` → `setFrame(layer, frame, row, cols, rows);`

`FRAME_COUNT` 保持 9（所有图集都是 9 帧）。`ROW_BY_SUIT` 不动。`ensureSheet` / `preload` / `stopAll` 不动（都按 `media.spritesheet` 工作，Joker 现在有了）。

### 2.4 `render.js` / `config.js` / `styles.css` / `index.html`

**无需改动**，逐条确认：
- `render.js` 触发块已对 Joker 牌调 `playOnce(slot, getCardMedia(card), card.suit=undefined, markDone)`；补了 `spritesheet` + §2.3(b) 的 `rows===1→row0` 分支后即可播。`markDone` / `animDoneCount>=2` 对"一边 Joker 一边普通牌""两边都 Joker""一边洛琪希静态回落"都成立（每边都会调一次 `done`）。
- `preload`：`render.js` 的 `state.playerHand.map(getCardMedia).concat(enemyIntent)` 已含 Joker → 自动预取其 webp（决策 E 覆盖 Joker）。
- `config.js`：`ANIM_FPS` / `ANIM_ENABLED` 复用，Joker 同受 `ANIM_ENABLED=false` 关闭。
- `styles.css`：`.sprite-anim` 的 `background-size: 900% 400%` 作为无 JS 兜底保留；运行时被 §2.3(c) 内联覆盖。**不改**。
- `index.html`：脚本顺序不变。

---

## 3. Part B —— 洛琪希干净基准图重绘

机制沿用交接单 §3.2 **解法 B（受控让步：以旧污染图当外观锚点重绘 base）**，但**设计规格按用户新要求改动**：短魔杖 + 彻底无魔法元素。此让步**仅用于重建 base**，不得用于四动作生成。

### 3.1 生成（agy / Nano Banana）

参考 [[agy-invocation]]：`--print` 必须最后、提示词紧跟；`--add-dir` 绝对路径；用 `dangerouslyDisableSandbox: true` + `run_in_background: true`。若 `.claude/settings*.json` 无 `Bash(agy --dangerously-skip-permissions:*)` allow 规则 → **停下把提示词交用户跑**（见 §7 暂停点 C），不要自己加规则。

附旧污染图 `char_runs/ThreeMoves/Roxy/source/Roxy_base.png` 当外观锚点。产物先落 `scratch/three-moves-roxy-base/roxy_base_clean.png`。

```
agy --dangerously-skip-permissions --add-dir "c:/Users/tj169/Flinders/work/Learning/scripts" --print "Generate an image using your nano banana image tool and save the PNG to c:/Users/tj169/Flinders/work/Learning/scripts/scratch/three-moves-roxy-base/roxy_base_clean.png . Redraw the referenced character (Roxy: short blue-haired petite mage with long braided twin-tails, black witch hat with a gold band, brown hooded cloak, grey layered tunic with black cross-straps, black skirt over black leggings, cream boots) as a single clean front-facing full-body reference sprite. She holds ONLY a short simple plain wooden wand about forearm length, no ornament, no gem, no glow; she does NOT hold a tall staff. REMOVE everything that is not the character herself and that short wand: no tall staff, no water orb, no water droplet, no dragon shape, no magic circle at her feet, no glow, no aura, no particles, no light of any kind, no cast shadow. Full body, standing neutral idle pose, both feet flat on the same ground line, centered with generous margins on all four sides so head, feet and both arms are clear of the edges. Pure flat opaque green background hex 00FF00, no transparency. No scenery, no text, no letters, no watermark, no logo, no border, no grid. Portrait canvas about 1086x1448, RGB. Keep her identity, outfit and proportions consistent with the reference; only the prop (tall staff becomes a short wand) and the removed effects change."
```

生成多张挑最干净的；下载为**不透明 RGB PNG**。

### 3.2 审计（素材主计划 §4.1 清单，本计划加严）

对挑出的图逐条勾，任一不过 → 重生成（同一锚点，不拿上次结果当参考）：
- [ ] 原始未抠图版本，纯绿 `#00FF00` **不透明**背景；人物边缘无绿幕污染 / 黑描边 / 半透明孔洞
- [ ] 发型 / 脸 / 黑帽（金帽带）/ 斗篷 / 束腰 / 米白靴 完整；头顶、脚、左右手臂都不贴边
- [ ] **手持一根短木杖（约前臂长、无装饰、无宝石）；画面里没有高身法杖**
- [ ] **无水法球、无水滴、无杖头龙形、无脚下魔法阵、无任何发光 / 光环 / 粒子、无投影**
- [ ] 正面站立待机，双脚踩同一水平地线，比例 / 朝向与其余 12 名角色一致
- [ ] 尺寸约 1086×1448，RGB 无 alpha

连续 3 次仍带法杖 / 魔法元素 → **停**，上报用户改走解法 A（官方立绘）。

### 3.3 落位与同步

```bash
cd "c:/Users/tj169/Flinders/work/Learning/scripts"
# 备份旧污染图（可回滚）
cp char_runs/ThreeMoves/Roxy/source/Roxy_base.png char_runs/ThreeMoves/Roxy/source/Roxy_base.polluted.png
# 换上新干净图（char_runs 下 gitignored，仅本地留档）
cp scratch/three-moves-roxy-base/roxy_base_clean.png char_runs/ThreeMoves/Roxy/source/Roxy_base.png
# 同步到游戏媒体目录（这份入库，是玩家可见的修复）
cp char_runs/ThreeMoves/Roxy/source/Roxy_base.png game_runs/ThreeMoves/assets/media/characters/Roxy_base.png
# 记录新哈希（两份须一致）
sha256sum char_runs/ThreeMoves/Roxy/source/Roxy_base.png game_runs/ThreeMoves/assets/media/characters/Roxy_base.png
```

- `registry.js` 的 `Roxy` 条目**保持 `{ base: base + 'characters/Roxy_base.png' }`**，不加 `spritesheet` —— 她的四动作没做，播放器必须继续对她回落静态。
- 新图尺寸若非 580×720（预期会是 ~1086×1448），确认卡槽内 `object-fit: contain` 显示正常、不溢出（`.media-art` 已是 `object-fit: contain`，一般无需处理）。

### 3.4 本计划对洛琪希**不做**的部分（交后续）

- 四动作 3×3 网格生成、`char-sprite` process/assemble、`Roxy_spritesheet.webp` / `Roxy_char.json`、`registry.js` 加 `spritesheet`、她的结算区播放接入 —— 全部留给交接单 §3.5 的后续执行（届时可选：AI 图轨重生成，或改用 `video_runs/ThreeMovesOther/output/Roxy_*.webp` 视频轨，但需先把杖头法球 key 掉且与短杖设计对齐）。

---

## 4. 文件改动清单

| 文件 | 改动 | 入库 |
|---|---|---|
| `game_runs/ThreeMoves/assets/media/jokers/Orsted_joker.webp` | **新增**（拷自 video_runs） | 是（`!*.webp` 白名单）|
| `game_runs/ThreeMoves/assets/media/jokers/Hitogami_joker.webp` | **新增** | 是 |
| `game_runs/ThreeMoves/assets/media/characters/Roxy_base.png` | **替换**为干净重绘图 | 是（`!*.png` 白名单）|
| `game_runs/ThreeMoves/assets/media/registry.js` | `jokers.Orsted` / `jokers.Hitogami` += `spritesheet` / `sheetCols` / `sheetRows`；`Roxy` 不动 | 是 |
| `game_runs/ThreeMoves/game/systems/sprite-anim.js` | §2.3 (a)(b)(c)(d) 四处，约 10 行 | 是 |
| `char_runs/ThreeMoves/Roxy/source/Roxy_base.png` `+ .polluted.png` | 本地替换 / 备份 | 否（`char_runs/**` gitignored）|
| `scratch/three-moves-roxy-base/` | agy 产物工作区 | 否 |
| `game_runs/ThreeMoves/preview.mp4` | 若 Joker 动画明显改变 10s 预览观感则重录，否则不动 | 是 |
| `plans/three-moves-joker-playback-and-roxy-base-plan.md` | 本文件 | 是 |

**不改**：`render.js`、`config.js`、`styles.css`、`index.html`、`state.js`、`data.js`、`main.js`、`duel.js`。
无 `.json` 改动 → **无需 `git add -f`**。

---

## 5. 执行阶段

### P1 —— 预备
1. 通读 §0 全部引用文件，确认 `sprite-anim.js` 当前行号与 §2.3 一致（若 2beb9d3 之后有别的提交动过它，按等价语义落点，不照抄行号）。
2. 记录动手前基线：`npx tsx skills/game-verify/verify.ts ThreeMoves` 与 `npx tsx skills/game-playtest/play.ts ThreeMoves` 各跑一遍留档，`__probe()` keys 存一份（对比锚点：`scratch/three-moves-playback-baseline.md`）。

### P2 —— Part A 实现
1. §2.1 拷素材 + ffprobe 校验（1728×208 + alpha）。
2. §2.2 改 `registry.js`。
3. §2.3 改 `sprite-anim.js`（四处）。
4. 本地普通模式目检（`index.html?autostart`，手动出牌 / 反复重开直到抽到 Joker）：
   - 龙神 / 人神各自在结算槽播 9 帧一次、不循环、播完落回静态 base、`RESULT_DELAY` 窗口内收干净；
   - 单行图集不纵向重复 / 不压扁（`background-size: 900% 100%` 生效）；
   - 双方同时出 Joker → 两槽同时播；
   - 四花色角色播放**回归无变化**（cols/rows 通用化没碰坏 9×4 路径）；
   - 无 console 报错，无布局抖动，`.score-badge` / `.card-copy` 未被盖。

### P3 —— Part B 实现
1. §3.1 生成（agy 或交用户）。
2. §3.2 审计，不过则重生成 / 上报。
3. §3.3 落位 + 同步 + 记哈希。
4. 本地目检：卡面洛琪希无魔法阵、持短杖、脚踏槽底线、风格与其余角色一致；`registry.js` 未给她加 `spritesheet`（播放仍静态回落，无空层、无报错）。

### P4 —— 验证门 + 收尾（按 CLAUDE.md「验证门」章节，按序）
1. `npx tsx skills/game-verify/verify.ts ThreeMoves` —— 通过，无新增断言失败。
2. `npx tsx skills/game-playtest/play.ts ThreeMoves` —— bot 通关、无卡死；`won/lost/tie` 分布与 `scratch/three-moves-playback-baseline.md` 无系统性偏移（噪声可疑时同窗口交替 n≥6）。动画在 bot/test 模式本就跳过，分布应与基线一致。
3. `__probe()` keys 与基线逐字段一致（`main.js` 未改 → 应恒等）。
4. 需要则重录 `preview.mp4`。
5. `git add` §4 清单（全走普通 `add`，无 `-f`）：
   ```
   git add game_runs/ThreeMoves/assets/media/jokers/Orsted_joker.webp \
           game_runs/ThreeMoves/assets/media/jokers/Hitogami_joker.webp \
           game_runs/ThreeMoves/assets/media/characters/Roxy_base.png \
           game_runs/ThreeMoves/assets/media/registry.js \
           game_runs/ThreeMoves/game/systems/sprite-anim.js \
           plans/three-moves-joker-playback-and-roxy-base-plan.md
   ```
   `git commit`：`feat(ThreeMoves): Joker 视频帧结算区播放 + 洛琪希无魔法阵基准图`
   （若拆两次：`feat(ThreeMoves): Joker 四招Joker帧结算区连续播放接入` / `fix(ThreeMoves): 洛琪希基准图重绘去魔法阵改短魔杖`）
   提交信息结尾：
   ```
   Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
   ```
6. 回写 §8。

---

## 6. 验收门

### 自动
- [x] `verify.ts ThreeMoves` 通过，无新增报错 / 断言失败。
- [x] `playtest.ts ThreeMoves` bot 通关，`won/lost/tie` 分布对齐 `scratch/three-moves-playback-baseline.md`（本次 `win / 9.1s / Act5 / score 50 / HP3 / 5 cards / stuck=false`）；无超时 / 卡死。
- [x] `__probe()` 输出结构与基线逐字段一致（无新增字段）。

### 人工目检（普通模式 `index.html?autostart`，一整局；结论写进提交信息或本文件 §8）
- [x] **龙神（dragon）** 出牌结算：结算槽播其 9 帧 joker 条一次、不循环、播完落回静态 `Orsted_base.png`，1450ms 内收干净。
- [x] **人神（human）** 出牌结算：同上，落回 `Hitogami_base.png`。
- [x] 单行图集渲染正确：角色完整、纵向不重复不压扁、9 帧从左到右步进一次。
- [x] 双方同一轮都出 Joker → 两槽同时播、不串行、不错位。
- [x] 四花色角色（♠♥♦♣）播放**无回归**：仍各自播对应行、1→8 一次、落回 base。
- [x] **洛琪希（Q）** 仍是静态图（本计划不做其动画）：无空动画层、无 console 报错。
- [x] **洛琪希新 base**：卡面（手牌小卡 + 结算大卡）无脚下魔法阵、无杖头法球、持短魔杖、脚踩卡槽底线、明暗 / 比例与其余角色一致。
- [x] 结算区无布局抖动、无溢出卡面，`.score-badge` / `.card-copy` 未被动画层盖住。
- [x] `ANIM_ENABLED=false` 重开：Joker 也不播，视觉回到接入前（含洛琪希新 base 的静态版）。
- [x] 预加载路径覆盖 Joker WebP；Playwright 定向检查无首次加载 console/page error。

### §3.8 契约复核（前端播放主计划）
- [x] `window.__probe()` 返回结构 / 字段不变。
- [x] `__hudStart()` / `__advanceCard()` / `?autostart` / webdriver 直进第 1 关行为不变。
- [x] 动画不写任何 `state.*`；`RESULT_DELAY` 未改。
- [x] `ANIM_ENABLED=false` 时与"仅 2beb9d3 + 洛琪希新 base"逐帧等价。

---

## 7. 暂停点（命中即停，上报，不擅自扩范围 / 不放宽红线）

- **A**：`Orsted_joker.webp` / `Hitogami_joker.webp` ffprobe 不是 1728×208 或无 alpha → 停，回 `video_runs/ThreeMovesOther` 侧核对，可能需要重跑 video-sprite。
- **B**：单行图集在某帧稳定错位 / 压扁 / 拉伸，且 §2.3 的 `cols/rows` 数学已按本文档落点 → 停，核对该 webp 实际列数与 `sprite.json` 是否一致（是否真 9 列）。
- **C**：`agy` 无 allow 规则 / 无写权限 → 停，把 §3.1 提示词与目标路径交用户手动跑，拿到 PNG 再继续。
- **D**：人神（Hitogami）帧上的**绿色溢色**在浏览器实际观感里明显发脏 / 抢眼 → 停，先走 `skills/video-sprite`（`--bg=auto` / 收紧 key，见其 SKILL.md）对 `Hitogami_joker` 重新抠像再拷入，不带病上线。
- **E**：洛琪希重绘连续 3 次仍带高身法杖 / 魔法阵 / 发光 → 停，上报用户改走交接单 §3.2 解法 A（提供官方立绘）。
- **F**：`playtest.ts` 分布相对基线系统性偏移 → 动画意外泄漏进 bot 路径或影响节奏，停，排查 `isBotMode` 门。
- **G**：`verify.ts` 因新增 DOM / 截图变化断言失败且非预期 → 停。

---

## 8. 回写（完成后）

- [x] 勾掉本文件 §6 全部目检项；结论记录如下：Joker 双槽同播、单行 `900% 100%`、四行回归、Roxy 静态回落、动画关闭均通过，Playwright 无错误。
- [x] `plans/three-moves-remaining-tasks-handoff.md` 已将 Roxy 标为基准图阻塞解除并保留四动作待办；Joker 已改为由本计划接入结算区播放。
- [x] `plans/three-moves-frame-frontend-playback-plan.md` 已补充 Joker 播放与 Roxy base 已处理、Roxy 动作仍待办。
- [x] 素材主计划 §13.1 Roxy 行已更新新哈希与「污染已解除」。
- [x] `scratch/three-moves-playback-baseline.md` 已追加本次 verify / playtest / probe keys 作为下一次回归锚点。
- [x] Roxy greenscreen 回归已完成：运行时 `Roxy_base.png` 已由纯绿原图替换为 `192×208 rgba` 透明参考帧，真实卡面截图无绿方块；`verify` / `playtest` 均与基线一致。

---

## 附：单行图集帧定位数学（供 review）

图集 `1728×208`，9 列 × 1 行，格 `192×208`。层样式 `position:absolute; inset:0; background-repeat:no-repeat`。
- `background-size: 900% 100%` → 图渲染为 9×容器宽、1×容器高。
- 第 `i` 帧（i=0..8）：`background-position-x = i/8 * 100%`（可定位范围 = 9W−W = 8W，`i/8` 命中第 i 格左缘）；`background-position-y = 0%`。
- 与现有 9×4 路径同构：把 `rows=4` 代回 §2.3(a) 得 `row/3*100%`、`cols=9` 得 `frame/8*100%`，与 2beb9d3 版逐字符相同 → 通用化对四花色零回归。
