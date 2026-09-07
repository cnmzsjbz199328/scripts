# 三招决胜 · 洛琪希基准图去绿幕、修卡面回归 计划（供 Agent 执行）

创建日期：2026-09-07
作者：验收 agent（只制定计划，不实施）
关联：
- 上游提交 `c27d4b2 feat(ThreeMoves): Joker 视频帧结算区播放 + 洛琪希无魔法阵基准图`（**本计划修它引入的一处回归**）
- 计划 `plans/three-moves-joker-playback-and-roxy-base-plan.md`（§3.3 步骤有误，见下）
- 交接单 `plans/three-moves-remaining-tasks-handoff.md`（§3 Roxy）
- 素材主计划 `plans/three-moves-character-frame-image-plan.md`（§13.1 Roxy 行）
- char-sprite 管线 `skills/char-sprite/SKILL.md` + `process.ts`

---

## 0. 问题（动手前必读）

`c27d4b2` 把洛琪希的**纯绿幕原图**（`char_runs/ThreeMoves/Roxy/source/Roxy_base.png`，**1086×1448、`rgb24`、不透明 `#00FF00` 背景**）**原样拷进了运行时卡面素材** `game_runs/ThreeMoves/assets/media/characters/Roxy_base.png`。

该目录里其余 **12 名角色 + 2 张 Joker 的 `*_base.png` 全是 `192×208 RGBA` 透明抠像帧**。`game/styles.css` 的 `.media-art` 只有 `object-fit: contain`、**无抠色 / 无混合模式**。结果：

> **游戏里洛琪希的手牌小卡 + 出牌结算大卡都渲染成一整块亮绿 `#00FF00` 方块**，人物缩在中间；其余角色是干净透明剪影。

`verify.ts` / `playtest.ts` 测不出（bot 路径跳过卡面细节、截图不看单卡）。`c27d4b2` 里 §6 的人工目检勾选是自评的——执行 agent 在 `scratch/three-moves-playback-baseline.md` 里写明"当前环境无可用 Chrome，目检由 DOM 采样完成"，所以没发现绿方块。

### 0.1 根因

计划 `three-moves-joker-playback-and-roxy-base-plan.md` §3.3 把**两个不同用途的文件混为一谈**：

| 文件 | 用途 | 正确格式 | 现状 |
|---|---|---|---|
| `char_runs/ThreeMoves/Roxy/source/Roxy_base.png` | 未来四动作的**生成参考**（char-sprite §1.2 要求未抠图、未裁切的纯绿幕原图） | 1086×1448 纯绿 `#00FF00` `rgb24` | ✅ **正确，不要动** |
| `game_runs/ThreeMoves/assets/media/characters/Roxy_base.png` | **运行时卡面素材**（玩家可见） | `192×208 RGBA` 透明抠像帧，与其余 12 人一致 | ❌ 错成了纯绿原图 → 绿方块 |

§3.3 直接 `cp source → game media`，跳过了 char-sprite 的 **chroma-key + 连通域 + 裁切 + 居中到 192×208** 这步。本计划只补这一步。

### 0.2 关键事实（已核实，Agent 可直接采信）

- 新绿幕原图背景**干净**：外框 4px 每个像素都精确 `(0,255,0)`，全图 71.7% 在 `#00FF00` 的 chroma 距离 110 内 → chroma-key 无污染风险（不是 [[ai-greenscreen-not-pure-green]] 那种哑光漂移绿）。
- 洛琪希身上**无绿色元素**（蓝发、黑帽、棕斗篷、灰束腰、米白靴、黑打底裤）→ chroma-key 不会误吃人物。
- `char_runs/ThreeMoves/` 是**同步进 `game_runs/ThreeMoves/assets/media/` 的真源**（Rudeus `output/spritesheet.webp` 与游戏媒体副本 sha256 完全一致）。`char_runs/ThreeMovesImagePilot/` 是四动作生成的工作区，**本计划用不到**。
- `skills/char-sprite/process.ts` 的 `reference` 分支正是"绿幕单图 → 192×208 透明单帧"：`applyChromaKey`（chroma 距离阈值 110）→ `removeGreenEdgeSpill` → 取最大连通域 → `sharp.trim()` → `resize(182×198, fit:inside)` → **水平居中、垂直居中**贴到 192×208 全透明画布（`reference` 分支 `bottomAlign=false`）。
- 现有 `char_runs/ThreeMoves/Rudeus/reference/frame_0.png` 与游戏媒体 `Rudeus_base.png` 视觉等价（逐像素 diff 均值 0.107，仅个位数边缘像素差异，属重编码级别）→ **`reference/frame_0.png` 直接拷进游戏媒体目录就是对的做法**。
- `char_runs/ThreeMoves/Roxy/manifest.json` 已存在（`reference.status: completed`，但那是 2026-09-03 对旧 580×720 污染图跑的，**过时**，需用新绿幕原图重跑覆盖）。
- 工具就位：`npx tsx` 可用，`sharp@0.33.5` 已装，`python` + `PIL 11.3.0` + `numpy 2.3.3` 可用（附录 B 兜底用）。

---

## 1. 范围与非目标

**做**：
- 用 `char-sprite/process.ts` 的 `reference` 分支，把**已在位的**新绿幕原图 `char_runs/ThreeMoves/Roxy/source/Roxy_base.png` 处理成 `192×208 RGBA` 透明单帧。
- 用该透明帧替换 `game_runs/ThreeMoves/assets/media/characters/Roxy_base.png`。
- 浏览器实截卡面确认绿方块消失、与其余角色一致。
- 过 `verify.ts` / `playtest.ts` 双门（应无变化）。
- 回写 `scratch/three-moves-playback-baseline.md` 与 `plans/three-moves-joker-playback-and-roxy-base-plan.md` §8 的错误记录。
- 单独提交 `fix(ThreeMoves): …`。

**不做**：
- **不动** `char_runs/ThreeMoves/Roxy/source/Roxy_base.png`（纯绿原图是四动作生成参考，格式本就正确）。
- **不动** `registry.js` 的 `Roxy` 条目——保持 `{ base: base + 'characters/Roxy_base.png' }`，**不加 `spritesheet`**（她四动作没做，播放器必须继续对她回落静态）。
- 不做洛琪希四动作帧、不做她的结算区播放接入（留交接单 §3.5）。
- 不重生成任何角色素材、不动 Joker、不改 `sprite-anim.js` / `render.js` / `config.js` / `styles.css` / `index.html` / 任何 `.js` 玩法码。
- 不改 `char_runs/ThreeMovesImagePilot/`。
- 不重绘、不叫 agy / Nano Banana（原图内容已符合"短魔杖 / 无魔法阵 / 无发光"，本计划纯素材处理）。

---

## 2. 前置校验（P1，不产出，任一不符 → 命中对应暂停点）

```bash
cd "c:/Users/tj169/Flinders/work/Learning/scripts"

# 1) 确认回归确实还在：游戏媒体 Roxy_base.png 是 1086x1448 rgb24（不透明绿）
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,pix_fmt -of csv=p=0 \
  game_runs/ThreeMoves/assets/media/characters/Roxy_base.png
#   期望输出：1086,1448,rgb24   → 若已是 192,208,rgba 说明有人先修了 → 停，转 §3 P3 只做校验

# 2) 确认新绿幕原图在位且干净
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,pix_fmt -of csv=p=0 \
  char_runs/ThreeMoves/Roxy/source/Roxy_base.png
#   期望：1086,1448,rgb24（或近似分辨率、rgb 无 alpha）
python - <<'PY'
from PIL import Image; import numpy as np
a=np.asarray(Image.open('char_runs/ThreeMoves/Roxy/source/Roxy_base.png').convert('RGB'))
h,w,_=a.shape; m=np.zeros((h,w),bool); m[:4]=m[-4:]=True; m[:,:4]=m[:,-4:]=True
b=a[m]; print('border mean rgb', tuple(round(float(v),1) for v in b.mean(0)),
      '| R', int(b[:,0].min()), int(b[:,0].max()), '| G', int(b[:,1].min()), int(b[:,1].max()), '| B', int(b[:,2].min()), int(b[:,2].max()))
PY
#   期望：border mean 约 (0,255,0)，R/B 最大值 < ~20，G 最小值 > ~230 → 干净绿幕
#   若边框明显偏灰绿 / 有大范围非纯绿 → 命中暂停点 A

# 3) 基线留档（收尾要逐字段对比）
npx tsx skills/game-verify/verify.ts ThreeMoves 2>&1 | tail -30
npx tsx skills/game-playtest/play.ts ThreeMoves 2>&1 | tail -30
#   期望：verify pass=true / L0,L1,L2 全过；playtest win / ~9.1s / Act5 / score50 / HP3 / 5 cards / stuck=false / runtimeErrors=[]
```

同时读一遍 `skills/char-sprite/process.ts`（约 345 行）确认 `reference` 分支语义与 §0.2 描述一致（若上游改过该文件，按等价语义走，不照抄本文行号）。

---

## 3. 执行

### P2 — 生成透明抠像帧

```bash
cd "c:/Users/tj169/Flinders/work/Learning/scripts"

npx tsx skills/char-sprite/process.ts "ThreeMoves/Roxy" reference \
  "char_runs/ThreeMoves/Roxy/source/Roxy_base.png"
```

- 产物：`char_runs/ThreeMoves/Roxy/reference/frame_0.png`（覆盖旧的 2026-09-03 版）。
- 附带改写 `char_runs/ThreeMoves/Roxy/manifest.json` 的 `reference` 时间戳——正常，`char_runs/**` gitignored，不入库、不管。
- **不要**跑 `prepare.ts` / `assemble.ts` / 任何 `rows` 处理。

产物校验（任一不符 → 暂停点 B）：

```bash
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,pix_fmt -of csv=p=0 \
  char_runs/ThreeMoves/Roxy/reference/frame_0.png
#   必须精确：192,208,rgba

python - <<'PY'
from PIL import Image; import numpy as np
im=Image.open('char_runs/ThreeMoves/Roxy/reference/frame_0.png').convert('RGBA')
a=np.asarray(im); al=a[:,:,3]
ys,xs=np.where(al>16)
print('size', im.size)
print('opaque bbox x', int(xs.min()), int(xs.max()), '| y', int(ys.min()), int(ys.max()))
print('opaque pixel %', round(float((al>16).mean())*100,1))
# 角落必须透明
for name,(y,x) in {'TL':(2,2),'TR':(2,189),'BL':(205,2),'BR':(205,189)}.items():
    print(name, 'alpha', int(al[y,x]))
# 残留绿边检测：不透明像素里 chroma 距 #00FF00 很近的比例应极低
r,g,b=a[:,:,0].astype(float),a[:,:,1].astype(float),a[:,:,2].astype(float)
d=np.sqrt(r*r+(g-255)**2+b*b); op=al>16
print('opaque px within chroma 160 of green:', round(float((op&(d<160)).sum())/max(1,op.sum())*100,2),'%')
PY
#   期望：四角 alpha=0；opaque bbox 高度接近整帧（人物顶到底，垂直居中留白对称）；
#        残留绿比例 < ~0.5%（>2% 说明抠色留了绿边 → 暂停点 B）
```

目检 `char_runs/ThreeMoves/Roxy/reference/frame_0.png`（用能看图的工具真的打开看）：
- 透明底，无绿幕残留 / 无黑描边 / 无半透明孔洞；
- 洛琪希完整——帽尖、双脚、左右手、双辫都没被裁掉、没贴帧边；
- 手里那根**短木杖**还在（约前臂长，无宝石无发光）；
- 无脚下魔法阵、无水法球、无光效（原图本就没有，确认抠图没凭空加东西）。

### P3 — 替换游戏媒体素材

```bash
cd "c:/Users/tj169/Flinders/work/Learning/scripts"

cp char_runs/ThreeMoves/Roxy/reference/frame_0.png \
   game_runs/ThreeMoves/assets/media/characters/Roxy_base.png

# 复核：现在应与其余角色同规格
for c in Roxy Rudeus Eris Orsted; do
  printf "%-12s " "$c"
  ffprobe -v error -select_streams v:0 -show_entries stream=width,height,pix_fmt -of csv=p=0 \
    game_runs/ThreeMoves/assets/media/characters/${c}_base.png 2>/dev/null || \
    ffprobe -v error -select_streams v:0 -show_entries stream=width,height,pix_fmt -of csv=p=0 \
    game_runs/ThreeMoves/assets/media/jokers/${c}_base.png
done
#   四行都应是 192,208,rgba

sha256sum char_runs/ThreeMoves/Roxy/reference/frame_0.png \
          game_runs/ThreeMoves/assets/media/characters/Roxy_base.png
#   两行哈希一致（记下来，回写 baseline.md）
```

`registry.js` 的 `Roxy` 条目**看一眼确认没被动过**：仍是
```js
Roxy: { base: base + 'characters/Roxy_base.png' },
```
（无 `spritesheet` / `sheetCols` / `sheetRows`。）

### P4 — 验证

#### (a) 浏览器实截卡面（**必须真的看图，不许 DOM 采样代替**）

把下面脚本存成 `scratch/roxy_card_verify.mjs` 跑（它把临时页写进游戏目录以便相对路径生效，截完删掉）：

```js
import { chromium } from 'playwright';
import fs from 'fs'; import path from 'path';
const gameDir = 'c:/Users/tj169/Flinders/work/Learning/scripts/game_runs/ThreeMoves';
const tmp = path.join(gameDir, '__roxy_card_verify.html');
const cards = [
  ['Roxy (fixed)', 'assets/media/characters/Roxy_base.png', 'suit-spade'],
  ['Rudeus (ref)', 'assets/media/characters/Rudeus_base.png', 'suit-spade'],
  ['Eris (ref)',   'assets/media/characters/Eris_base.png',   'suit-heart'],
  ['Orsted (ref)', 'assets/media/jokers/Orsted_base.png',     'joker-dragon'],
];
fs.writeFileSync(tmp, `<!doctype html><link rel="stylesheet" href="game/styles.css">
<style>body{background:#161425;margin:0;padding:36px;display:flex;gap:34px}
.card-face{position:relative;width:190px;height:266px;border-radius:10px;background:#2a2740;border:1px solid #ffffff22}
.cap{color:#fff;font:12px system-ui;text-align:center;margin-top:6px}</style>` +
cards.map(([c,src,suit])=>`<div><div class="card-face ${suit}"><div class="media-slot">
<img class="media-art" src="${src}"></div></div><div class="cap">${c}</div></div>`).join(''));
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1000,height:520} });
await p.goto('file://' + tmp.replace(/\\/g,'/'));
await p.waitForTimeout(900);
await p.screenshot({ path: 'c:/Users/tj169/Flinders/work/Learning/scripts/scratch/roxy_card_verify.png' });
await b.close(); fs.unlinkSync(tmp);
console.log('scratch/roxy_card_verify.png');
```

```bash
node scratch/roxy_card_verify.mjs
```

打开 `scratch/roxy_card_verify.png` 逐项确认：
- [ ] "Roxy (fixed)" 卡**没有**亮绿方块——背景是卡槽自身的深色径向渐变，和 Rudeus / Eris / Orsted 一致；
- [ ] 洛琪希是透明剪影，**比例、站位、脚踩底线**与其余三张一致（不明显偏大 / 偏小 / 悬空）；
- [ ] 人物边缘无绿色描边、无黑边、无半透明毛刺；
- [ ] 短木杖可见，无魔法阵 / 无光效。

（可选，更真：浏览器开 `game_runs/ThreeMoves/index.html?autostart` 打一整局，反复重开直到洛琪希（rank Q）进手牌 / 结算区，确认小卡与大卡都不再是绿方块、无 console 报错、无空动画层。）

#### (b) 双门（按 CLAUDE.md「验证门」，按序）

```bash
npx tsx skills/game-verify/verify.ts ThreeMoves
npx tsx skills/game-playtest/play.ts ThreeMoves
```

- [ ] `verify` `pass=true`，L0/L1/L2 全过，无新增断言失败。
- [ ] `playtest` bot 通关，`win / ~9.1s / Act5 / score 50 / HP3 / 5 cards / stuck=false / runtimeErrors=[]`，与 P1 基线无系统性偏移（可疑则同窗口交替再跑 n≥4）。
- [ ] `__probe()` 结构不变（本计划不碰 `main.js` / `state.js`，应恒等）。

#### (c) 回写

- `scratch/three-moves-playback-baseline.md`：把结尾"Roxy base：`1086×1448 rgb24`…"那条订正为新的 `192×208 RGBA` + 新 sha256，注明"绿方块回归已由 `plans/three-moves-roxy-base-greenscreen-fix-plan.md` 修复；`char_runs` 侧纯绿原图（四动作生成参考）保持不变"。
- `plans/three-moves-joker-playback-and-roxy-base-plan.md` §8：在 Roxy 相关勾项旁补一行事实——"§3.3 误将纯绿原图拷入运行时媒体目录致卡面绿方块，已由 `three-moves-roxy-base-greenscreen-fix-plan.md` 抠像修复"。
- 本文件 §6 勾项补齐 + §7 结论。

#### (d) 提交

```bash
git add game_runs/ThreeMoves/assets/media/characters/Roxy_base.png \
        scratch/three-moves-playback-baseline.md \
        plans/three-moves-joker-playback-and-roxy-base-plan.md \
        plans/three-moves-roxy-base-greenscreen-fix-plan.md
git commit
```

commit 信息：
```
fix(ThreeMoves): 洛琪希基准图去绿幕抠像，修卡面亮绿方块回归

c27d4b2 误把纯绿幕原图拷进运行时卡面素材，游戏内洛琪希手牌 /
结算卡渲染成 #00FF00 方块。改用 char-sprite/process.ts reference
分支抠成 192×208 RGBA 透明帧，与其余 12 角色一致。char_runs 侧
纯绿原图（四动作生成参考）不变；registry.js 的 Roxy 仍无 spritesheet。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
```

`preview.mp4` **不重录**（洛琪希不一定进 10s 预览，且这是修回归不是新玩法）。除非目检发现预览里正好有那块绿——那就重录（需 ffmpeg）。

---

## 4. 文件改动清单

| 文件 | 改动 | 入库 |
|---|---|---|
| `game_runs/ThreeMoves/assets/media/characters/Roxy_base.png` | **替换**：1086×1448 纯绿 → 192×208 RGBA 透明帧 | 是（`!*.png` 白名单）|
| `scratch/three-moves-playback-baseline.md` | 订正 Roxy base 规格 / 哈希 / 回归说明 | 是 |
| `plans/three-moves-joker-playback-and-roxy-base-plan.md` | §8 补回归事实一行 | 是 |
| `plans/three-moves-roxy-base-greenscreen-fix-plan.md` | 本文件（勾 §6 + 写 §7） | 是 |
| `char_runs/ThreeMoves/Roxy/reference/frame_0.png` `+ manifest.json` | `process.ts` 覆盖产出 | 否（`char_runs/**` gitignored）|
| `scratch/roxy_card_verify.mjs` `+ .png` | 验证脚本 / 截图 | 否（`scratch/` 渲染产物不入）|

**不改**：`char_runs/ThreeMoves/Roxy/source/Roxy_base.png`、`registry.js`、`sprite-anim.js`、`render.js`、`config.js`、`styles.css`、`index.html`、任何 `.js`、`char_runs/ThreeMovesImagePilot/**`。
无 `.json` 入库改动 → **无需 `git add -f`**。

---

## 5. 暂停点（命中即停、上报，不擅自扩范围）

- **A**：`char_runs/ThreeMoves/Roxy/source/Roxy_base.png` 边框不是干净 `#00FF00`（哑光 / 偏灰绿 / 大面积非纯绿）→ 停。`process.ts` 阈值写死 110，可能抠不干净或啃人物。上报用户：要么提供更干净的绿幕原图，要么改走附录 B 并手调阈值。
- **B**：`process.ts` 产物不是精确 `192×208 RGBA`，或人物被裁切 / 贴边 / 残留绿比例 >2% / 出现黑描边 → 停。先看是不是 `process.ts` 被上游改动过；再试附录 B 兜底；仍不行上报。
- **C**：`process.ts` 运行报错（缺 `sharp` / `tsx` / 依赖）→ 先 `npm i` 一次；仍失败转**附录 B**（PIL 兜底，产物同规格），并在 commit 信息里注明用了兜底路径。
- **D**：`playtest.ts` 分布相对基线系统性偏移，或 `verify.ts` 新增断言失败 → 停（本计划只换一张静态图，不应影响任何逻辑，异常必有他因）。
- **E**：P1 发现游戏媒体 `Roxy_base.png` 已经是 `192×208 RGBA`（有人先修了）→ 停，只跑 §3 P4 校验确认无绿方块，然后回写 + 收尾，不重复替换。
- **F**：目检发现新透明帧虽无绿方块，但洛琪希明显比其余角色大一圈 / 小一圈 / 悬空 → 停。`reference` 分支是居中不是底对齐，若与兄弟帧观感差太多，上报用户决定是否改用 `bottomAlign` 或调 `CELL_PADDING`。

---

## 6. 验收门

### 自动
- [x] `verify.ts ThreeMoves` `pass=true`，L0/L1/L2 全过，无新增失败。
- [x] `play.ts ThreeMoves` bot 通关，指标对齐 `scratch/three-moves-playback-baseline.md`（`win / 9.1s / Act5 / 50 / HP3 / 5 cards / stuck=false`）。
- [x] `game_runs/ThreeMoves/assets/media/characters/Roxy_base.png` = `192×208 RGBA`；与 `char_runs/ThreeMoves/Roxy/reference/frame_0.png` sha256 一致（`210FEE887C6417B1214B5B8425F35EDF4AA6BF9FCB8D8BE14DE31E1327EAFAFE`）。
- [x] `registry.js` 的 `Roxy` 条目仍只有 `base`（无 `spritesheet`）。

### 人工目检（`scratch/roxy_card_verify.png`，真看图；结论写进 §7）
- [x] 洛琪希卡面无亮绿方块，背景为卡槽深色径向渐变，与 Rudeus / Eris / Orsted 一致。
- [x] 透明剪影，边缘无绿边 / 黑边 / 半透明毛刺。
- [x] 比例、站位、脚踩底线与其余角色一致（不悬空、不过大过小）。
- [x] 短木杖可见；无魔法阵、无水法球、无光效。
- [ ]（可选）`index.html?autostart` 一整局：手牌小卡 + 结算大卡都正常，无 console 报错、无空动画层。

### 契约
- [x] `__probe()` 结构 / 字段不变。
- [x] `sprite-anim.js` / `render.js` / `config.js` / `styles.css` / `index.html` 未改。
- [x] `char_runs/ThreeMoves/Roxy/source/Roxy_base.png` 未改（四动作生成参考保持纯绿原图）。

---

## 7. 回写（完成后）

- [x] §6 全部必选勾项；结论：通过。真实卡面截图确认绿幕方块消失，Roxy 透明剪影的比例、站位、脚线和短木杖均正常。
- [x] `scratch/three-moves-playback-baseline.md` 已订正 Roxy runtime card asset 规格 + 新 sha256：`192×208 rgba` / `210FEE887C6417B1214B5B8425F35EDF4AA6BF9FCB8D8BE14DE31E1327EAFAFE`。
- [x] `plans/three-moves-joker-playback-and-roxy-base-plan.md` §8 已补回归事实。
- [x] 新 `game_runs/ThreeMoves/assets/media/characters/Roxy_base.png` sha256：`210FEE887C6417B1214B5B8425F35EDF4AA6BF9FCB8D8BE14DE31E1327EAFAFE`。
- [x] 是否用了附录 B 兜底：否；`process.ts reference` 正常完成。
- [x] 提交哈希：`e6f4b4e`（`fix(ThreeMoves): remove Roxy greenscreen from card asset`）。

---

## 附录 A — `process.ts reference` 分支做了什么（供 review，勿照抄行号）

`skills/char-sprite/process.ts`，`processRow(..., 'reference', ...)`：
1. `sharp(input).ensureAlpha().raw()` 读像素。
2. `applyChromaKey`：对每像素算 `chromaDist = √(r² + (g−255)² + b²)`，`≤110` 或"暗绿网格线特征"→ `alpha=0`。
3. `removeGreenEdgeSpill`：清抠图边缘残留的浅绿半透明晕（只作用于"12px 邻域内挨着透明像素"的偏绿像素，人物内部绿色不受影响）。
4. `findComponents` 连通域 → `groupIntoFrames(components, 1)` 取最大组（近距碎片并入）。
5. `renderGroupAsFrame` → 按人物外接框裁 → `fitCropToCell(buf, w, h, useTrim=true, bottomAlign=false)`：`sharp.trim()` → `resize(192−10, 208−10, fit:inside, withoutEnlargement)` → **水平/垂直都居中**贴到 `192×208` 全透明画布。
6. 写 `char_runs/<Char>/reference/frame_0.png`，更新 `manifest.reference`。

洛琪希无绿色着装 + 背景纯 `#00FF00` → 步骤 2–3 只吃背景。产物与其余 12 人**同代码路径**，观感天然一致。

## 附录 B — PIL 兜底（仅当 `process.ts` 不可用；产物同规格）

存 `scratch/roxy_key_fallback.py` 跑，产出 `char_runs/ThreeMoves/Roxy/reference/frame_0.png`（192×208 RGBA，居中）。参数对齐附录 A。

```python
from PIL import Image
import numpy as np

SRC = 'char_runs/ThreeMoves/Roxy/source/Roxy_base.png'
DST = 'char_runs/ThreeMoves/Roxy/reference/frame_0.png'
FW, FH, PAD = 192, 208, 5

im = Image.open(SRC).convert('RGBA')
a = np.asarray(im).astype(np.int32)
r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
dist = np.sqrt(r * r + (g - 255) ** 2 + b * b)
bg = dist <= 110                                  # 硬 chroma-key，阈值同 process.ts
alpha = np.where(bg, 0, 255).astype(np.uint8)

# 边缘浅绿晕：偏绿且靠近背景的像素也清掉（粗略等价 removeGreenEdgeSpill）
from scipy.ndimage import binary_dilation          # 若无 scipy，可略过这段
near_bg = binary_dilation(bg, iterations=3)
spill = (~bg) & near_bg & (g > r * 1.1) & (g > b * 1.1) & (dist <= 420)
alpha[spill] = 0

out = a.astype(np.uint8).copy()
out[:, :, 3] = alpha
rgba = Image.fromarray(out, 'RGBA')

ys, xs = np.where(alpha > 16)
crop = rgba.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))

tw, th = FW - 2 * PAD, FH - 2 * PAD
s = min(tw / crop.width, th / crop.height, 1.0)
crop = crop.resize((max(1, round(crop.width * s)), max(1, round(crop.height * s))), Image.LANCZOS)

canvas = Image.new('RGBA', (FW, FH), (0, 0, 0, 0))
canvas.paste(crop, ((FW - crop.width) // 2, (FH - crop.height) // 2), crop)   # 居中，同 reference 分支
canvas.save(DST)
print('wrote', DST, canvas.size)
```

（`scipy` 缺就删掉 spill 那 3 行——纯绿原图边缘晕很轻，硬 key 通常够。产物仍须过 §3 P2 的校验和目检。）
