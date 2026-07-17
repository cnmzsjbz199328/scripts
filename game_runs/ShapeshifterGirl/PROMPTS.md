# ShapeshifterGirl（百变少女冒险记）— 素材生产清单与提示词

> 分工：生图由用户/生图工具执行，本清单给出**每一张图的确切提示词**；
> 生成完成后按 §4 的命令走 `char-sprite` 管线切割接入（**禁止手工切割**）。
> 设计上下文见同目录 `DESIGN.md`。**没有图游戏也能跑**（程序化剪影占位），图到位自动替换，不阻塞开发。

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

> "Using the panorama and character reference, generate a 3×3 grid of 9 sequential frames showing [动作描述]. Side view facing LEFT. {STYLE}. Separate frames with thin solid DARK GREEN lines (#006600). Character centered in each cell, wide margin. #00FF00 background. No shadows."

> 横版游戏所有行**统一左侧视角**，向右由引擎 `setFlipX` 翻转（省一半生成成本）。
> 网格线必须深绿 #006600 细实线，**禁止黑色**。

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

> "Using the panorama, the girl reference and the [动物] reference, generate a 3×3 grid of 9 sequential frames showing the girl smoothly metamorphosing into the [动物]. Frame 1 must EXACTLY match the girl reference; frame 9 must EXACTLY match the [动物] reference; frames 2–8 show a gradual believable in-between transformation, body wrapped in swirling turquoise light streaming from her crescent pendant, the pendant visible in every frame. Side view facing LEFT. {STYLE}. Separate frames with thin solid DARK GREEN lines (#006600). Character centered in each cell, wide margin. #00FF00 background. No shadows."

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

## 5. 验收清单（每张图切割后）

- [ ] 每行 9 帧完整、无跨格粘连（process 校验通过）
- [ ] 透明背景无绿边残留
- [ ] 5 个形态**剪影颜色与取景框一致**（多形态同角色的硬要求）
- [ ] 三件「同一人」信号齐全：青绿月牙项链 / 珊瑚红点缀 / 琥珀色眼睛
- [ ] **变身渐变行：首帧=人形参考、末帧=动物参考、9 帧项链不丢**（最易漂移，逐帧检查；不合格重跑，预算按普通行 2×）
- [ ] 所有行朝向左；背景带左右边缘 150px 纯绿、可无缝平铺
