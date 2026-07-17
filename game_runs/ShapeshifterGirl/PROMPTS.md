# ShapeshifterGirl（百变少女冒险记）— 素材生产清单与提示词

> 分工：生图由用户/生图工具执行，本清单给出**每一张图的确切提示词**；
> 生成完成后按 §4 的命令走 `char-sprite` 管线切割接入（**禁止手工切割**）。
> 设计上下文见同目录 `DESIGN.md`。**没有图游戏也能跑**（程序化剪影占位），图到位自动替换，不阻塞开发。

---

## 避坑与生成校验铁律 (Critical Generation & Inspection Rules)

为了确保生图质量并避免切割失败或脏边，生成任何角色与动画图片后，**必须先进行人工/程序化视觉检查，确认达标后再运行切割脚本**。

### 1. 核心排查与限制条件
* 🚫 **严禁出现背景元素**：背景必须是绝对纯净的单色绿幕 `#00FF00`。**绝对不能包含树木、草地、石头、水花或天空等任何背景细节**。如果生成结果中出现了这些元素，必须重新生成或在 Prompt 中加强限制，否则去绿幕算法会将背景连同人物边缘抠坏。
* 🚫 **严禁包含文字或水印**：生成的图片中**绝对不能出现文字、拼音、英文字母、标签、数字或手写签名**（例如 AI 有时会自动在 `cat_run` 图片边缘添加 "cat" 等小文字）。必须确保所有单元格都是干净的角色主体。
* ⚠️ **变身渐变图（morph_*.png）必须保证连贯过渡**：
  - 变身连续帧不是简单的「人」加「动物」，必须是 **1-9 帧由人形逐渐变为动物形态的流畅形变过程**。
  - 第一帧必须完全对齐人形参考，第九帧完全对齐动物参考，中间帧（第2-8帧）应当呈现过渡性形体变化，且青绿项链印记要贯穿始终。

### 2. 切割前质检清单 (Pre-processing Inspection Checklist)
在执行 `process.ts` 之前，请逐图检查并勾选：
- [ ] **Chroma Key 绿幕度**：背景是否为纯色绿 `#00FF00`？（是否有杂色绿或背景物）
- [ ] **网格分割线**：网格线是否是细而连贯的深绿色 `#006600`，且各帧人物被清晰地限制在各自的单元格内？
- [ ] **画面洁净度**：边缘及底部是否有任何多余的 AI 生成文字、水印或标签？
- [ ] **方向一致性**：动作方向是否统一朝向**左侧**？

---

## 0. 风格锚点（所有提示词共用）

**`{STYLE}` 统一替换为：**

> clean 2D storybook illustration, soft cel shading, warm pastel palette with bold readable silhouette, children's adventure anime look, thick clean outlines, flat lighting

**第一张图：全景风格图 `scene/panorama.png`**（之后所有角色图都附带它作风格参照）：

> A wide panorama of a whimsical adventure world for a side-scrolling game: sunlit forest path on the left, moonlit stream in the middle, windy golden canyon cliffs, dark purple crystal cave, and an ominous red-black cloud castle far right. {STYLE}. No characters, no text, no watermark. Size 1920x540.

**主角外观锚（所有角色描述共用）：**

> a cheerful 10-year-old adventurer girl named Xiaoman, short dark-brown twin buns, big amber eyes, coral-red hooded travel cape, mustard-yellow tunic, teal shorts, small leather satchel, glowing turquoise crescent pendant on her chest

**变身形态一致性规则**：每个动物形态必须保留三件「同一人」信号——①胸前发光的青绿月牙项链 ②珊瑚红配色出现在耳朵/鳍/翅尖 ③琥珀色眼睛。提示词里已写入，重生成时不要删。

---

## 1. 角色参考图（5 张，每形态 1 张）

模板（附带 panorama）：

> "Using this panorama as style reference, generate a single sprite of [角色描述], front-facing pose, full body, centered. {STYLE}. #00FF00 background. No shadows. Wide margin."

| 文件 | [角色描述] |
|---|---|
| `girl_ref.png` | 主角外观锚（见 §0 原文） |
| `cat_ref.png` | a nimble small cat transformed from the girl Xiaoman: dark-brown fur with coral-red inner ears and tail tip, big amber eyes, glowing turquoise crescent pendant on a thin collar |
| `fish_ref.png` | a sleek friendly fish transformed from the girl Xiaoman: mustard-yellow body with coral-red fins, big amber eyes, glowing turquoise crescent mark on its chest |
| `eagle_ref.png` | a graceful young eagle transformed from the girl Xiaoman: dark-brown feathers with coral-red wingtips, big amber eyes, glowing turquoise crescent pendant on its chest |
| `bear_ref.png` | a sturdy round young bear transformed from the girl Xiaoman: dark-brown fur with coral-red inner ears, big amber eyes, glowing turquoise crescent pendant on its chest |

## 2. 动画网格图（18 张 = 14 动作 + 4 变身渐变，每张 = 一行动画 = 3×3 九帧）

模板（同时附带 panorama + 对应形态参考图）：

> "Using the panorama and character reference, generate a 3×3 grid of 9 sequential frames showing [动作描述]. Side view facing LEFT. {STYLE}. Separate frames with thin solid DARK GREEN lines (#006600). Character centered in each cell, wide margin. #00FF00 background. No shadows. The panorama is a STYLE reference ONLY and must NOT appear in the image — all 9 cells contain ONLY the character on pure #00FF00, absolutely no trees, sky or ground. Each of the 9 frames must show a CLEARLY DIFFERENT phase of the motion cycle. The character occupies the SAME height in every cell."

> 横版游戏所有行**统一左侧视角**，向右由引擎 `setFlipX` 翻转（省一半生成成本）。
> 网格线必须深绿 #006600 细实线，**禁止黑色**。
>
> ⚠️ 模板末尾三句是 2026-07 审查后新增的硬约束，重生成时**不得删减**，分别针对三类已发生的翻车：
> ① panorama 被当成实景背景画进格子（girl_jump/girl_hurt 全军覆没的死因）；
> ② 9 帧几乎完全相同、无动画信息（fish_swim/cat_idle 的死因）；
> ③ 格间角色尺寸剧烈抖动（eagle_fly 第 5 帧、bear_idle 第 6 帧缩成迷你版的死因）。

### 少女（Girl，4 行）

| 文件 | 行名 | [动作描述] | fps/loop |
|---|---|---|---|
| `girl_idle.png` | idle | the girl standing relaxed, gentle breathing cycle, cape swaying slightly, pendant softly pulsing | 6 / loop |
| `girl_run.png` | run | the girl running energetically, full run cycle, cape trailing behind, satchel bouncing | 10 / loop |
| `girl_jump.png` | jump | the girl jumping: crouch anticipation, leap upward, airborne arc with cape spread, landing recovery | 10 / once |
| `girl_hurt.png` | hurt | the girl flinching backward when hit, eyes squeezed shut, then recovering to stance | 10 / once |

### 猫形态（CatForm，3 行）

| 文件 | 行名 | [动作描述] | fps/loop |
|---|---|---|---|
| `cat_idle.png` | idle | the cat sitting alert, tail swishing cycle, ears twitching | 6 / loop |
| `cat_run.png` | run | the cat sprinting, full feline gallop cycle with body stretch and gather | 12 / loop |
| `cat_jump.png` | jump | the cat leaping high: deep crouch, explosive upward spring, mid-air stretch, soft four-paw landing | 10 / once |

### 鱼形态（FishForm，2 行）

| 文件 | 行名 | [动作描述] | fps/loop |
|---|---|---|---|
| `fish_swim.png` | swim | the fish swimming forward, smooth S-curve tail propulsion cycle with fin ripples | 8 / loop |
| `fish_idle.png` | idle | the fish hovering in place, gentle fin treading cycle, small bubbles rising | 6 / loop |

### 鹰形态（EagleForm，2 行）

| 文件 | 行名 | [动作描述] | fps/loop |
|---|---|---|---|
| `eagle_fly.png` | fly | the eagle flapping in level flight, full wingbeat cycle from full upstroke to full downstroke | 10 / loop |
| `eagle_glide.png` | glide | the eagle gliding with wings locked wide open, subtle feather-tip flutter and slight banking | 6 / loop |

### 熊形态（BearForm，3 行）

| 文件 | 行名 | [动作描述] | fps/loop |
|---|---|---|---|
| `bear_idle.png` | idle | the bear standing on four legs, heavy breathing cycle, occasionally sniffing | 5 / loop |
| `bear_walk.png` | walk | the bear walking with weighty four-legged gait cycle, shoulders rolling | 8 / loop |
| `bear_attack.png` | attack | the bear rearing up then slamming one heavy paw down and forward, impact pose, return to stance | 12 / once |

### 变身渐变（SSMorph，4 行）——核心素材，优先级最高

> 设计决策：变身是 0.5s 读条动作（DESIGN.md §2.2）。**只生成「人→动物」方向**；
> 动物→人由引擎逆放，动物 A→B 由「逆放 人→A + 顺放 人→B」拼接，20 种组合只花这 4 张。
> 这是 AI 最难画稳的网格类型——**首末帧必须锚死参考图**，中间帧用青绿光效包裹掩盖瑕疵。

模板（同时附带 panorama + 少女参考图 + 目标动物参考图，共 3 张参照）：

> "Using the panorama, the girl reference and the [动物] reference, generate a 3×3 grid of 9 sequential frames showing the girl smoothly metamorphosing into the [动物]. Frame 1 must EXACTLY match the girl reference; frame 9 must EXACTLY match the [动物] reference; frames 2–8 show a gradual believable in-between transformation, body wrapped in swirling turquoise light streaming from her crescent pendant, the pendant visible in every frame. Side view facing LEFT. {STYLE}. Separate frames with thin solid DARK GREEN lines (#006600). Character centered in each cell, wide margin. #00FF00 background. No shadows. The transformation must progress STRICTLY MONOTONICALLY — each frame is more animal than the previous one, NEVER reverting toward human. All 9 frames face the SAME direction (LEFT) and the character occupies the SAME height in every cell. The swirling light intensity rises smoothly to a peak at frame 5 then fades smoothly to zero at frame 9."

> ⚠️ 末尾三句为 2026-07 审查新增硬约束，针对已发生的翻车：morph_cat 帧 4-9 全是重复成品猫（过渡塌缩）、morph_eagle 帧 3 全鹰→帧 4 退回人头鹰身且行内左右翻面、morph_fish 光效强弱无序导致播放闪烁。

| 文件 | 行名 | 附带参考 | fps/loop |
|---|---|---|---|
| `morph_cat.png` | morph-cat | girl_ref + cat_ref | 18 / once |
| `morph_fish.png` | morph-fish | girl_ref + fish_ref | 18 / once |
| `morph_eagle.png` | morph-eagle | girl_ref + eagle_ref | 18 / once |
| `morph_bear.png` | morph-bear | girl_ref + bear_ref | 18 / once |

> fps/loop 落地位置：`char_runs/<Name>/manifest.json`（prepare 后手动改）。
> 图未到位前，游戏内 transform 态用**等时长**白光渐变占位（时序即最终版，图到只换视觉）。

## 3. 背景剪影带（10 张，WyrmsEnd v2 抠像轨）

天空/雾/光晕全部由代码绘制（气氛唯一真源在 `config.js`），AI 图只出**剪影形状**。模板：

> "Flat solid black silhouette shapes of [场景内容]. [Far-background: silhouette band fills roughly the lower half, tallest shapes at most 60% of canvas height | Middle-ground: varied heights and spacing, generous gaps of plain background], everything anchored to the bottom edge, no floating pieces. Margins: no shapes within 150px of the left and right edges (edges must be solid pure green #00FF00). Background: solid pure green #00FF00, flat, no gradient, for chroma keying. CRITICAL: seamless horizontal tiling, left and right edges match perfectly. Size 1920x540. No text, no watermark."

| 文件（`assets/bg/raw/`） | [场景内容] |
|---|---|
| `l1_far.png` / `l1_mid.png` | sunlit forest: rolling treeline with one giant hollow tree / mushrooms, ferns, mossy stumps, hanging vines |
| `l2_far.png` / `l2_mid.png` | moonlit stream valley: low riverbank hills with a stone bridge arch / reeds, lily pads on poles, leaning willow trees |
| `l3_far.png` / `l3_mid.png` | windy canyon: layered mesa cliffs with rock arches / hoodoo rock spires, dead twisted junipers, rope-bridge posts |
| `l4_far.png` / `l4_mid.png` | crystal cave interior: cave floor mounds with giant crystal clusters, stalactite fringe hanging from top edge (at most 25% height) / broken pillars, crystal shards, mine-cart rails |
| `l5_far.png` / `l5_mid.png` | ominous cloud castle: jagged castle towers and broken battlements on a cloud bank / torn banners on poles, spiked fences, floating rock chunks on thin stems |

> 接缝不齐重跑该条即可；左右 150px 纯绿 Margin 约束保证平铺，重跑时不要删。
> 环境动效（草、萤火、水波纹）不生图，走 `svg-ambient`（代码是唯一真源）。

## 4. 切割与接入命令（图齐一个形态就可跑一个）

```bash
# 1. 初始化 6 个角色集（5 形态 + 1 变身集，行名与 §2 一致）
npx tsx skills/char-sprite/prepare.ts SSGirl  --anims="idle,run,jump,hurt" --fps=8
npx tsx skills/char-sprite/prepare.ts SSCat   --anims="idle,run,jump"      --fps=8
npx tsx skills/char-sprite/prepare.ts SSFish  --anims="swim,idle"          --fps=8
npx tsx skills/char-sprite/prepare.ts SSEagle --anims="fly,glide"          --fps=8
npx tsx skills/char-sprite/prepare.ts SSBear  --anims="idle,walk,attack"   --fps=8
npx tsx skills/char-sprite/prepare.ts SSMorph --anims="morph-cat,morph-fish,morph-eagle,morph-bear" --fps=18

# 2. 逐张处理（参考图 + 每行网格图），以 SSGirl 为例
npx tsx skills/char-sprite/process.ts SSGirl reference <path>/girl_ref.png
npx tsx skills/char-sprite/process.ts SSGirl idle      <path>/girl_idle.png
npx tsx skills/char-sprite/process.ts SSGirl run       <path>/girl_run.png
npx tsx skills/char-sprite/process.ts SSGirl jump      <path>/girl_jump.png
npx tsx skills/char-sprite/process.ts SSGirl hurt      <path>/girl_hurt.png

# 3. 按 §2 表调整 char_runs/<Name>/manifest.json 的 fps/loop，然后组装
npx tsx skills/char-sprite/assemble.ts SSGirl   # 其余 5 个（SSCat/SSFish/SSEagle/SSBear/SSMorph）同理

# 4. 产物拷入游戏（char_runs 不入库，游戏目录内的 webp 入库）
cp char_runs/SSGirl/output/spritesheet.webp game_runs/ShapeshifterGirl/assets/sprites/girl.webp
cp char_runs/SSGirl/output/char.json        game_runs/ShapeshifterGirl/assets/sprites/girl.json
```

## 5. 重生成工单与后期处理台账（2026-07 全量审查产出）

### 5.1 两个前置决策点（决定工单范围，生图前必须先定）

**决策 A：眼罩去留。** girl_ref 首次生成时 AI 自行给主角加了"白色独眼罩+脸部绑带"（DESIGN/PROMPTS 均无此设定），之后所有图链式参照它，导致**全部 23 张图每一帧都带眼罩**（鱼是贴片、鹰的眼罩飘在头侧、熊成了护目镜带）。脚本擦不掉，只能生图层面二选一：
- **A1 接受眼罩为角色设定**（成本低，现存素材全保留）：则重生的每张图提示词**必须加**
  `wearing the same white square eye patch with a thin white head strap as the reference, consistent in every frame`，否则新旧图闪变；
- **A2 消除眼罩**（成本 = 全套链式重生）：从 girl_ref 起重生全部 ref 和全部动作/变身行，每张提示词**必须加**
  `both big amber eyes fully visible, NO eye patch, NO bandage, NO strap on face`。

**决策 B：熊形态。** 现存熊是**双足直立、穿少女斗篷+上衣的拟人熊**；§2 规格是四足动物熊（idle 四足嗅探 / walk 四足步态 / attack 立起拍地）。二选一：
- **B1 认账拟人熊**（成本低）：改 §2 熊行的 [动作描述] 为双足版本，DESIGN 的拍地攻击判定改为前拳横击（现 bear_attack 即此形态，已在游戏内工作）；
- **B2 回归四足**：重生 bear_ref + bear 三行 + morph_bear，共 5 张。

### 5.2 重生成清单（脚本救不了、必须重新生图）

按优先级排序。生成后一律先过「避坑铁律」目检，再走 §4 切割：

| 优先级 | 文件 | 死因 | 重生成要点（在 §2 模板基础上追加） |
|---|---|---|---|
| 🔥 P0 | `girl_jump.png` | 每格完整森林实景背景，脏图**正在游戏里显示** | 模板已含防实景硬约束；跳跃弧线四阶段（蓄力/起跳/滞空/落地）分布在 9 帧 |
| 🔥 P0 | `girl_hurt.png` | 同上全实景 + 末 3 帧转成正面 | 追加 `side view facing LEFT in ALL 9 frames, never front-facing` |
| P1 | `fish_idle.png` | `assets/raw/` 里是 600×600 占位图；已切的 rows/idle 是旧版绿鱼（配色/无项链，与 swim 不是同一条鱼） | 按 §2 原模板重生；接入后把 LevelScene 的 fish_idle 从借用 swim 行恢复为 `row=1` |
| P1 | `fish_swim.png` | 9 帧几乎完全相同，无摆尾相位，游戏里等于静态图 | 追加 `exaggerated S-curve tail swing, tail position clearly different in every frame` |
| P1 | `cat_idle.png` | 正面坐姿（非左侧视）+ 帧间几乎无差异 | 追加 `side view facing LEFT`；尾巴摆动相位逐帧明确不同 |
| P2 | `morph_cat.png` | 过渡塌缩：帧 3 猫身人脸、帧 4-9 是 6 张重复成品猫；帧 1 朝右与猫帧朝左行内翻面；帧 3-4 出现 cat_ref 没有的橙色围脖 | 模板已含单调性/同向/同高硬约束；追加 `no extra fur ruff or collar not present in the cat reference` |
| P2 | `morph_eagle.png` | 帧序回退（帧 3 全鹰→帧 4 人头鹰身）、朝向左右横跳、尺寸抖动全场最重、帧 1 正面 | 模板已含硬约束，无额外追加；生成后逐帧检查单调性，不合格重跑（预算按 2×） |
| 视决策 | 5 张 `*_ref.png` | 全带眼罩（决策 A2 时重生）；bear_ref 额外穿衣（决策 B2 时重生） | 决策 A/B 对应的提示词句必须加入 |
| 视决策 | 其余全部动作/变身行 | 仅决策 A2（消除眼罩）时进入工单 | 同上链式重生，参照新 ref |

### 5.3 重生成图片的交付注意事项

1. **切割前逐图过「避坑铁律」目检**（本文件开头）：纯绿幕、无文字水印、深绿网格线、朝左、变身连贯。凡有一项不过就重跑生图，不要指望切割脚本兜底。
2. **朝向兜底**：若新图质量好但原生朝右，不必重跑生图——切割后在 `char_runs/<Name>/rows/<行>/` 对该行 9 个单帧 PNG 逐个水平镜像再 assemble（参见 5.4 台账；**不能整图镜像 raw，会把行内帧序反掉**）。
3. **frameCount 联动**：删过帧的行如被重生成（恢复 9 帧），需把 [LevelScene.js](game/scenes/LevelScene.js) `registerAnim` 对应行的 frameCount 从 8 改回 9（现改动清单见 5.4）。
4. **验证门**：任何素材接入后按序跑 `npx tsx skills/game-verify/verify.ts ShapeshifterGirl` → `npx tsx skills/game-playtest/play.ts ShapeshifterGirl`，全绿才算落地。

### 5.4 已做脚本后期处理的行（重跑 process.ts 前必读）

> 2026-07 审查后在 `char_runs/*/rows/` 单帧层做过镜像与删帧，**raw 源图未同步**。
> 对下列行重跑 `process.ts` 会冲掉修复，必须重新执行同样的后期处理再 assemble。

- **镜像为朝左**（源图原生朝右）：SSGirl idle/run、SSCat jump、SSEagle fly/glide、SSBear idle/walk/attack、SSMorph morph-bear。
- **删帧左移（行剩 8 帧，游戏侧 `registerAnim` frameCount=8 已同步）**：
  - SSEagle fly 原第 5 帧（尺寸骤小）、glide 原第 1 帧（正面离群帧）
  - SSBear idle 原第 6 帧（尺寸骤小）
  - SSMorph morph-fish 原第 7 帧（项链丢失+画风漂移）
- **fish_idle 动画临时指向 swim 行**（LevelScene.js）：rows/idle 现存素材是旧版绿鱼、与 swim 行不是同一条鱼，待按 §2 重新生成后恢复 `row=1`。
- cat_jump 末帧的地面投影已被绿幕算法抠掉，无需处理；morph_bear 帧 5 纯漩涡属规格允许的光效掩盖，保留。

## 6. 验收清单（每张图切割后）

- [ ] 每行 9 帧完整、无跨格粘连（process 校验通过）
- [ ] 帧间角色尺寸一致（警惕单帧突然缩成迷你版：eagle_fly 帧 5、bear_idle 帧 6 前科）
- [ ] 帧间有明确动作差异，不是同一姿势复制 9 份（fish_swim、cat_idle 前科）
- [ ] 透明背景无绿边残留
- [ ] 5 个形态**剪影颜色与取景框一致**（多形态同角色的硬要求）
- [ ] 三件「同一人」信号齐全：青绿月牙项链 / 珊瑚红点缀 / 琥珀色眼睛
- [ ] **变身渐变行：首帧=人形参考、末帧=动物参考、9 帧项链不丢**（最易漂移，逐帧检查；不合格重跑，预算按普通行 2×）
- [ ] 所有行朝向左；背景带左右边缘 150px 纯绿、可无缝平铺
