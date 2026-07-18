# ShapeshifterGirl（百变少女冒险记）— 素材生产清单与提示词

> 分工：生图由用户/生图工具执行，本清单给出**每一张图的确切提示词**；
> 生成完成后按 §4 的命令走 `char-sprite` 管线切割接入（**禁止手工切割**）。
> 设计上下文见同目录 `DESIGN.md`。**没有图游戏也能跑**（程序化剪影占位），图到位自动替换，不阻塞开发。

---

## 避坑与生成校验铁律 (Critical Generation & Inspection Rules)

为了确保生图质量并避免切割失败或脏边，生成任何角色与动画图片后，**必须先进行人工/程序化视觉检查，确认达标后再运行切割脚本**。

### 1. 核心排查与限制条件
* 🚫 **严禁出现背景元素**：背景必须是绝对纯净的单色绿幕 `#00FF00`。**绝对不能包含树木、草地、石头、水花或天空等任何背景细节**。如果生成结果中出现了这些元素，必须重新生成或在 Prompt 中加强限制，否则去绿幕算法会将背景连同人物边缘抠坏。
* 🚫 **严禁绿幕以外的底色**：纯白/米白/灰色底同样无法被 chroma-key 抠除（girl_jump 第二轮重生即因白底整行报废，9 帧不透明白卡直接进了游戏）。收图第一眼先确认底色是 `#00FF00`，白底一票否决。
* 🚫 **每格只能有一个角色主体**：AI 偶发在单元格里画出 2 条缩小副本（fish_swim 二轮帧 2/4/5 前科），切割脚本会把多主体一起截进帧，游戏里出现"分身"。
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

> ✅ **人设定稿（2026-07-18 复审裁决）：兜帽麻花辫版。** 首轮生图跑出的「棕发双丸子头 + 白色眼罩」版（现存 girl_ref / girl_jump / girl_hurt 即此版）**作废**；以现役 girl.webp idle/run 两行的造型为唯一人形基准，锚文案已按定稿改写如下，重生任何含人形的图都用这一段：

> a cheerful 10-year-old adventurer girl named Xiaoman, long black hair in a single braid, coral-red hooded travel cape with the hood worn UP over her head, mustard-yellow tunic with pale ruffled hem, teal shorts, brown boots, small brown leather satchel, glowing turquoise crescent pendant on her chest, both big amber eyes fully visible, NO eye patch, NO bandage, NO strap on her face

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

## 3. 背景剪影带（10 张，抠图+渲染 v2，参照 WyrmsEnd 落地版）

> **架构（2026-07-18 定稿）**：AI 只出**绿幕黑剪影形状** → `tools/process-bg.mjs` 抠像 + screen 提色 →
> 天空/雾/光晕全部代码绘制（气氛唯一真源 = `config.js` 的 ATMOS，阶段 B 新增）。
> 目标观感对齐 ShadowForge 全景那种「层叠剪影 + 空气透视明度阶梯 + 雾」，但气氛由代码统一，
> 图与图之间不需要碰运气对色。**没有图游戏也能跑**（程序化降级），图到位自动替换。
> 明度阶梯：代码天空 > far（亮、靠天色）> mid（深、饱和）> 地面带；全彩角色永远最突出。

### 3.1 生成命令（逐条复制到终端运行，产物直接落到 `assets/bg/raw/`）

#### far 远景带（5 张）

```bash
agy --dangerously-skip-permissions --add-dir "C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/ShapeshifterGirl" --print "Generate an image using your nano banana image tool and save the PNG to C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/ShapeshifterGirl/assets/bg/raw/l1_far.png . Subject: flat solid black silhouette shapes of a whimsical sunlit forest treeline: rolling canopy of round fluffy treetops, one giant hollow tree with a door-shaped opening, a few tall slender pines. Far-background layer for a side-scrolling game: two overlapping ridge lines with gently varied heights, the silhouette band fills roughly the lower half of the canvas, tallest shapes reach at most 60% of canvas height, everything anchored to the bottom edge with no floating pieces. Margins: no shapes within 150px of the left and right edges (left and right edges must be solid pure green #00FF00). Background: solid pure green #00FF00 filling everything that is not silhouette, flat with no gradient, for chroma keying. CRITICAL: seamless horizontal tiling, left and right edges match perfectly. Size 1920x540. No text, no letters, no watermark, no logo."
```

```bash
agy --dangerously-skip-permissions --add-dir "C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/ShapeshifterGirl" --print "Generate an image using your nano banana image tool and save the PNG to C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/ShapeshifterGirl/assets/bg/raw/l2_far.png . Subject: flat solid black silhouette shapes of a moonlit stream valley skyline: low rolling riverbank hills, one arched stone bridge spanning between two hills, a few leaning willow trees with long drooping branches. Far-background layer for a side-scrolling game: two overlapping ridge lines with gently varied heights, the silhouette band fills roughly the lower half of the canvas, tallest shapes reach at most 60% of canvas height, everything anchored to the bottom edge with no floating pieces. Margins: no shapes within 150px of the left and right edges (left and right edges must be solid pure green #00FF00). Background: solid pure green #00FF00 filling everything that is not silhouette, flat with no gradient, for chroma keying. CRITICAL: seamless horizontal tiling, left and right edges match perfectly. Size 1920x540. No text, no letters, no watermark, no logo."
```

```bash
agy --dangerously-skip-permissions --add-dir "C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/ShapeshifterGirl" --print "Generate an image using your nano banana image tool and save the PNG to C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/ShapeshifterGirl/assets/bg/raw/l3_far.png . Subject: flat solid black silhouette shapes of a windy desert canyon skyline: layered flat-topped mesa cliffs, one natural rock arch, scattered tall hoodoo rock spires. Far-background layer for a side-scrolling game: two overlapping mesa ridge lines with sharply varied heights, the silhouette band fills roughly the lower half of the canvas, tallest shapes reach at most 60% of canvas height, everything anchored to the bottom edge with no floating pieces. Margins: no shapes within 150px of the left and right edges (left and right edges must be solid pure green #00FF00). Background: solid pure green #00FF00 filling everything that is not silhouette, flat with no gradient, for chroma keying. CRITICAL: seamless horizontal tiling, left and right edges match perfectly. Size 1920x540. No text, no letters, no watermark, no logo."
```

```bash
agy --dangerously-skip-permissions --add-dir "C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/ShapeshifterGirl" --print "Generate an image using your nano banana image tool and save the PNG to C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/ShapeshifterGirl/assets/bg/raw/l4_far.png . Subject: flat solid black silhouette shapes of the inside of a giant crystal cave: cave floor mounds with clusters of large pointed crystals rising from the bottom, and a fringe of stalactites hanging down from the cave ceiling at the top. Far-background layer for a side-scrolling game: floor shapes anchored to the bottom edge filling roughly the lower half of the canvas, stalactites anchored to the top edge reaching down at most 25% of canvas height, generous open gap of plain background between ceiling and floor shapes, no floating pieces. Margins: no shapes within 150px of the left and right edges (left and right edges must be solid pure green #00FF00). Background: solid pure green #00FF00 filling everything that is not silhouette, flat with no gradient, for chroma keying. CRITICAL: seamless horizontal tiling, left and right edges match perfectly. Size 1920x540. No text, no letters, no watermark, no logo."
```

```bash
agy --dangerously-skip-permissions --add-dir "C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/ShapeshifterGirl" --print "Generate an image using your nano banana image tool and save the PNG to C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/ShapeshifterGirl/assets/bg/raw/l5_far.png . Subject: flat solid black silhouette shapes of an ominous storm-cloud castle skyline: jagged castle towers with spiky rooftops, broken battlement walls, all rising from a rolling cloud bank along the bottom. Far-background layer for a side-scrolling game: two overlapping ridge lines with sharply varied heights, the silhouette band fills roughly the lower half of the canvas, tallest towers reach at most 60% of canvas height, everything anchored to the bottom edge with no floating pieces. Margins: no shapes within 150px of the left and right edges (left and right edges must be solid pure green #00FF00). Background: solid pure green #00FF00 filling everything that is not silhouette, flat with no gradient, for chroma keying. CRITICAL: seamless horizontal tiling, left and right edges match perfectly. Size 1920x540. No text, no letters, no watermark, no logo."
```

#### mid 中景带（5 张）

```bash
agy --dangerously-skip-permissions --add-dir "C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/ShapeshifterGirl" --print "Generate an image using your nano banana image tool and save the PNG to C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/ShapeshifterGirl/assets/bg/raw/l1_mid.png . Subject: flat solid black silhouette shapes of giant spotted mushrooms, curled ferns, mossy tree stumps and one wooden signpost with two blank arrow boards, all standing on a thin black ground strip along the bottom edge. Middle-ground layer for a side-scrolling game: varied heights and spacing, generous gaps of plain background between shapes. Margins: no shapes within 150px of the left and right edges (left and right edges must be solid pure green #00FF00). Background: solid pure green #00FF00 filling everything that is not silhouette, flat with no gradient, for chroma keying. CRITICAL: seamless horizontal tiling, left and right edges match perfectly. Size 1920x540. No text, no letters, no watermark, no logo."
```

```bash
agy --dangerously-skip-permissions --add-dir "C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/ShapeshifterGirl" --print "Generate an image using your nano banana image tool and save the PNG to C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/ShapeshifterGirl/assets/bg/raw/l2_mid.png . Subject: flat solid black silhouette shapes of tall reeds and cattails, lily pads on tall bent stems, wooden dock posts and one leaning willow sapling, all standing on a thin black ground strip along the bottom edge. Middle-ground layer for a side-scrolling game: varied heights and spacing, generous gaps of plain background between shapes. Margins: no shapes within 150px of the left and right edges (left and right edges must be solid pure green #00FF00). Background: solid pure green #00FF00 filling everything that is not silhouette, flat with no gradient, for chroma keying. CRITICAL: seamless horizontal tiling, left and right edges match perfectly. Size 1920x540. No text, no letters, no watermark, no logo."
```

```bash
agy --dangerously-skip-permissions --add-dir "C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/ShapeshifterGirl" --print "Generate an image using your nano banana image tool and save the PNG to C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/ShapeshifterGirl/assets/bg/raw/l3_mid.png . Subject: flat solid black silhouette shapes of hoodoo rock spires, dead twisted juniper trees and rope-bridge posts with slack ropes, all standing on a thin black ground strip along the bottom edge. Middle-ground layer for a side-scrolling game: varied heights and spacing, generous gaps of plain background between shapes. Margins: no shapes within 150px of the left and right edges (left and right edges must be solid pure green #00FF00). Background: solid pure green #00FF00 filling everything that is not silhouette, flat with no gradient, for chroma keying. CRITICAL: seamless horizontal tiling, left and right edges match perfectly. Size 1920x540. No text, no letters, no watermark, no logo."
```

```bash
agy --dangerously-skip-permissions --add-dir "C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/ShapeshifterGirl" --print "Generate an image using your nano banana image tool and save the PNG to C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/ShapeshifterGirl/assets/bg/raw/l4_mid.png . Subject: flat solid black silhouette shapes of broken stone pillars, clusters of sharp crystal shards, one abandoned mine-cart on a short rail track and wooden support beams, all standing on a thin black ground strip along the bottom edge. Middle-ground layer for a side-scrolling game: varied heights and spacing, generous gaps of plain background between shapes. Margins: no shapes within 150px of the left and right edges (left and right edges must be solid pure green #00FF00). Background: solid pure green #00FF00 filling everything that is not silhouette, flat with no gradient, for chroma keying. CRITICAL: seamless horizontal tiling, left and right edges match perfectly. Size 1920x540. No text, no letters, no watermark, no logo."
```

```bash
agy --dangerously-skip-permissions --add-dir "C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/ShapeshifterGirl" --print "Generate an image using your nano banana image tool and save the PNG to C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/ShapeshifterGirl/assets/bg/raw/l5_mid.png . Subject: flat solid black silhouette shapes of torn banners on tilted poles, spiked iron fences, chained boulders and small floating rock chunks connected to the ground by thin stone stems, all standing on a thin black ground strip along the bottom edge. Middle-ground layer for a side-scrolling game: varied heights and spacing, generous gaps of plain background between shapes. Margins: no shapes within 150px of the left and right edges (left and right edges must be solid pure green #00FF00). Background: solid pure green #00FF00 filling everything that is not silhouette, flat with no gradient, for chroma keying. CRITICAL: seamless horizontal tiling, left and right edges match perfectly. Size 1920x540. No text, no letters, no watermark, no logo."
```

### 3.2 收图目检（每张 10 秒，不过关就重跑该条）

- [ ] 底色纯绿 `#00FF00`、剪影纯黑扁平（不要灰度渐变、不要彩色）
- [ ] 剪影贴底（far 的钟乳石例外：贴顶 ≤25% 高）、无悬空碎片
- [ ] 左右 150px 边缘是纯绿（保平铺无缝；处理脚本会复检并报告）
- [ ] 无文字/字母/水印（l1_mid 的路牌必须是空板）
- [ ] far 剪影带高度 ≤60% 画布、mid 各件之间留有大段纯绿空档

### 3.3 处理命令（10 张齐了跑一次即可，缺图自动跳过）

```bash
node game_runs/ShapeshifterGirl/tools/process-bg.mjs
```

脚本做四件事：① chroma-key 抠像+去绿边 ② 剪影贴底对齐 ③ **screen 提色**——黑剪影按下表提到各关气氛色（far 亮靠天色 = 空气透视，mid 深饱和；这就是「渲染」的一半，另一半天空/雾/光在阶段 B 由游戏代码画）④ margin/接缝验收 + 产出 `assets/bg/manifest.js`（script 标签加载，守「不 fetch json」铁律）。

| 关 | FAR_LIFT（远景提色） | MID_LIFT（中景提色） |
|---|---|---|
| L1 暖绿森林 | `#a8c496` 雾感草绿 | `#3d6b3f` 深林绿 |
| L2 月光溪谷 | `#7d92b8` 月光蓝灰 | `#2a3d66` 深夜蓝 |
| L3 黄昏峡谷 | `#d99a5e` 霞光琥珀 | `#8a4a28` 焦赭 |
| L4 暗紫洞穴 | `#8a6aa8` 紫晶雾 | `#462a66` 深紫 |
| L5 红黑云顶 | `#8a3a3a` 余烬红 | `#4a161e` 暗酒红 |

> 提色数值是首版，游戏内接入后可只改 `tools/process-bg.mjs` 表格重跑，不动图。
> 环境动效（草、萤火、水波纹）不生图，走 `svg-ambient`（代码是唯一真源）。
>
> ✅ **阶段 A/B/C 均已落地（2026-07-18）**：10 张剪影带全部生成并处理入位（l3_far 曾生成为纯绿空图，
> 由 agy 补生成一次）；游戏侧 `Config.ATMOS` 为气氛唯一真源，render.js 装配
> 天空→far(0.25)→雾带→mid(0.55)→地面带(世界锚定分段, 深渊留口垫坑影)→漂尘/萤火→暗角，
> L4 有黑暗视界（invertAlpha 光圈遮罩+项链微光）；可交互地形（高台/矮缝/巨石/高墙）
> 用暖土棕/石灰色+描边与剪影背景拉开，防止混层。五关节拍已按「教学→变奏→考试」翻新。
> 双验证门全绿（bot 70.3s 通关，剩 2 心）。剪影带重生成后只需重跑 process-bg，无需改代码。

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

## 5. 重生成工单与后期处理台账（2026-07 首轮审查 + 2026-07-18 复审）

> **2026-07-18 复审结论**（对 commit 74637a7 "P0/P1/P2 完成" 的逐 sheet 核验，含逐帧 alpha/包围盒量化审计）：
> bear 三行全场最佳、girl run 与 cat idle/run 达标、六张 sheet 装配规格统一（192×208、脚底基线恒 202）✅；
> 但 **girl_jump 二轮重生是白底未抠、正在游戏里显示白卡**，girl_hurt 仍有正面帧，且 jump/hurt 用的是作废人设；
> fish 两行仍不是同一条鱼、swim 出现多主体帧；morph_cat/morph_eagle 尺寸单调性依旧崩坏。工单更新见 5.2。

### 5.1 前置决策点（均已裁决）

**决策 A：眼罩去留 —— ✅ 已裁决（2026-07-18）：人形定稿为兜帽麻花辫版，无眼罩。** 原 A1/A2 二选一作废，落地规则：
- 人形唯一基准 = 现役 girl.webp idle/run 行造型，§0 锚文案已按定稿改写，重生任何含人形的图（girl_* 与 morph_* 前段帧）一律参照它；
- girl_ref 现货（丸子头+眼罩）作废，按 5.2 重生（有零成本抽帧方案）；
- 动物形态现货中的"眼罩"（猫/鱼/鹰的白贴片、熊的护目镜带）**认账为形态特征保留**，不进重生工单——四套动物行质量达标，不值得为消除眼罩链式翻新；若未来整体翻新再一并消除。

**决策 B：熊形态 —— ✅ 已裁决：B1 认账拟人熊。** 已落地（bear 三行为双足版并在游戏内工作，复审质量全场最佳），§2 熊行描述如与现货冲突以现货为准。

### 5.2 重生成清单（2026-07-18 复审版；脚本救不了、必须重新生图）

首轮工单执行结果：`cat_idle` ✅ 修复达标并已出场；其余各张复审未过、死因更新如下。生成后一律先过「避坑铁律」目检（含新增的**白底否决**与**单主体**两条），再走 §4 切割：

| 优先级 | 文件 | 死因（2026-07-18 复审） | 重生成要点（在 §2 模板基础上追加） |
|---|---|---|---|
| 🔥 P0 | `girl_ref.png` | 现货是作废的丸子头+眼罩版，后续所有图链式参照必错 | 按 §0 新锚重生；**零成本替代方案**：直接从 `char_runs/SSGirl/rows/idle/` 抽一帧干净帧作新 ref（已是定稿造型、侧视左向，天然对齐 morph 首帧） |
| 🔥 P0 | `girl_jump.png` | 二轮重生**白底未抠**：9 帧全是 182×182 不透明白卡，**正在游戏里显示**；且人设仍是作废丸子头+眼罩版 | 底色必须纯 `#00FF00`（铁律新条）；参照新 girl_ref；跳跃弧线四阶段（蓄力/起跳/滞空/落地）分布 9 帧 |
| 🔥 P0 | `girl_hurt.png` | 人设作废版；f6/f7/f9 仍正面平静站姿；行内眼罩时有时无 | 参照新 girl_ref；保留 `side view facing LEFT in ALL 9 frames, never front-facing`；受击表情（皱眉/闭眼）贯穿全行 |
| P1 | `fish_idle.png` | 二轮接入的仍是绿色 Q 版鱼：与 swim 行橙红鱼完全不同鱼，月牙项链/琥珀眼/珊瑚红三信号全缺 | 附 fish_ref 按 §2 模板重生；接入后把 LevelScene 的 `fish_idle` 恢复 `row=1`（过渡期先指回 swim 行，见 5.5） |
| P1 | `fish_swim.png` | 二轮图帧 2 是迷你双鱼（填充仅 6%）、帧 4/5 每帧两条鱼（多主体），行内体型混乱 | 铁律新条「每格单主体」；保留 `exaggerated S-curve tail swing, tail position clearly different in every frame`；重生前可删帧兜底（见 5.5） |
| P2 | `morph_cat.png` | 依旧尺寸塌缩：帧填充率 5→11→10→7→53→39→38→4→4%（迷你↔巨大横跳）；首帧是短发无斗篷路人，非人形基准 | 参照新 girl_ref + cat_ref；模板同高/单调硬约束**逐帧验收**，不合格重跑（预算 2×） |
| P2 | `morph_eagle.png` | 首两帧是蓝裙短发女孩（完全另一个人）；末两帧骤缩至填充 8%/16% | 同上（预算 2×） |
| P3 | `morph_bear.png` | 首两帧人形迷你（填充 9%/6%），中后段合格 | 视预算重生；不重生则接受变熊首瞬间的缩放跳变 |
| P3 | `eagle_glide.png` | glide 行体型仅约 fly 行六成，空中 fly↔glide 切换瞬间鸟突然缩小 | 视预算重生，追加 `the eagle occupies the SAME size as in the flying animation reference`；或引擎侧对 glide 行补偿 scale |

### 5.3 重生成图片的交付注意事项

1. **切割前逐图过「避坑铁律」目检**（本文件开头）：纯绿幕、无文字水印、深绿网格线、朝左、变身连贯。凡有一项不过就重跑生图，不要指望切割脚本兜底。
2. **朝向兜底**：若新图质量好但原生朝右，不必重跑生图——切割后在 `char_runs/<Name>/rows/<行>/` 对该行 9 个单帧 PNG 逐个水平镜像再 assemble（参见 5.4 台账；**不能整图镜像 raw，会把行内帧序反掉**）。
3. **frameCount 联动**：删过帧的行如被重生成（恢复 9 帧），需把 [LevelScene.js](game/scenes/LevelScene.js) `registerAnim` 对应行的 frameCount 从 8 改回 9（现改动清单见 5.4）。
4. **验证门**：任何素材接入后按序跑 `npx tsx skills/game-verify/verify.ts ShapeshifterGirl` → `npx tsx skills/game-playtest/play.ts ShapeshifterGirl`，全绿才算落地。
5. **人设帧验收**：凡含人形的图（girl_* 全部、morph_* 前段帧）逐帧核对是否为**兜帽麻花辫定稿版**（§0）——上一轮 girl_jump/girl_hurt 返工即因人设漂移未在收图时拦截。
6. **底色验收**：收图先看底色，非纯 `#00FF00` 直接打回（girl_jump 二轮白底前科），不要等切割后才发现。

### 5.4 已做脚本后期处理的行（重跑 process.ts 前必读）

> 2026-07 审查后在 `char_runs/*/rows/` 单帧层做过镜像与删帧，**raw 源图未同步**。
> 对下列行重跑 `process.ts` 会冲掉修复，必须重新执行同样的后期处理再 assemble。

- **镜像为朝左**（源图原生朝右）：SSGirl idle/run、SSCat jump、SSEagle fly/glide、SSBear idle/walk/attack、SSMorph morph-bear。
- **删帧左移（行剩 8 帧，游戏侧 `registerAnim` frameCount=8 已同步）**：
  - SSEagle fly 原第 5 帧（尺寸骤小）、glide 原第 1 帧（正面离群帧）
  - SSBear idle 原第 6 帧（尺寸骤小）
  - SSMorph morph-fish 原第 7 帧（项链丢失+画风漂移）
- ~~fish_idle 动画临时指向 swim 行~~ **已失效（2026-07-18）**：commit 94a87cc 把 `fish_idle` 恢复成了 `row=1`，但接入的仍是绿色 Q 版鱼——需先改回 swim 行过渡（见 5.5），待 fish_idle 重生后再恢复 `row=1`。
- cat_jump 末帧的地面投影已被绿幕算法抠掉，无需处理；morph_bear 帧 5 纯漩涡属规格允许的光效掩盖，保留（morph_fish 帧 5 漩涡同理）。

### 5.5 可脚本兜底的待办（2026-07-18 复审新增；不用重新生图，rows 层处理后 assemble，游戏侧 frameCount 同步）

按 5.4 的删帧左移/单帧镜像套路执行，处理完记入 5.4 台账：

1. **fish_idle 先止血（纯游戏代码改动，可立即做）**：[LevelScene.js](game/scenes/LevelScene.js) 的 `fish_idle` 从 `row=1`（绿鱼）临时改回借用 swim 行——现状玩家变鱼悬停时直接看到"换了一条鱼"。
2. **fish_swim 删帧左移**：删现第 2/4/5 帧（迷你双鱼与多主体帧），剩 6 帧循环仍成立，`registerAnim('swim', …)` frameCount 同步 6。
3. **eagle fly 再删一帧**：现第 5 帧为俯冲离群姿态（与其余悬停扑翼不连贯），删后剩 7 帧，frameCount 同步 7。
4. **cat_jump 第 5/6 帧朝右**：rows 层对这两帧单帧水平镜像后 assemble（行内其余帧朝左）。
5. **girl idle 首帧离群**：第 1 帧缺辫子与项链光、循环回首帧跳变，删帧左移剩 8 帧，frameCount 同步 8。
6. **元数据同步（低优先）**：`assets/sprites/*.json` 的 frameCount/loop 与游戏注册值已漂移（eagle/bear/morph-fish 实际末列为空帧仍写 9）；json 目前无消费方不炸，但重跑 assemble 时顺手对齐，避免未来工具读到空帧。

### 5.6 视频轨迁移（2026-07-18 落地）：全部六张图集完成视频轨/混排替换

> **girl.webp 也已替换（视频轨收官）**：idle 21f@12 / run 20f@24 / jump 21f@24 / hurt 21f@24，21 列，scale 0.2982。
> §5.5-5（girl idle 首帧离群）与 girl_hurt 帧尺寸瑕疵随替换一并清除。
> ⚠️ 遗留裁决项：jump 滞空段与 hurt 中段模型画成了**正面视角**（提示词要求全程侧视未被遵守）——表现力尚可，
> 如判不达标，重生成时在提示词加 "she keeps facing LEFT even in the air / during the flinch, never turns toward the camera"。

> 图生图网格质量不可控（人设漂移/尺寸横跳/多主体）→ 改用 **AI 绿幕视频 → `skills/video-sprite` 锚点对齐抽帧**（`--anchor` 质心X+全段基线+统一scale，`--pick` 绕叠化鬼影帧）。
> 素材源与分段参数在 `video_runs/SS{Cheetah,Fish,Eagle,Bear}Video/`（源 mp4 + manifest 入库，帧可重放再生；各目录 test.html 可预览）。

- **灵猫形态视觉改为猎豹**（决策：家猫训练数据偏置招地板+叠化，猎豹体型差异也更小）；白眼罩猫造型退役，anim key/形态名仍为 `cat`。cat.webp **21 列**（idle 21f@21 / run 14f@24 / jump 21f@21）。
- fish.webp **21 列**（swim 15f@24 / idle 21f@10，同一条鱼）、eagle.webp **20 列**（fly 20f@24 / glide 17f@12，同体型）、morph.webp 四行全换（各 **18f@36 = 0.5s 读条不变**，猎豹行为真渐进形变）。bear.webp **21 列混排**：idle/attack 保留现货（复审全场最佳），walk 换视频轨 21f@17。
- **帧密度原则（勿再沿用图生图 9 帧惯性）**：视频轨帧免费，循环动作保留**原生 24fps 整周期零抽稀**，once 动作帧数×fps 保持时长不变；唯一硬约束是纹理宽度 ≤21 列（192×21=4032 < 4096 老 GPU 上限）。
- [LevelScene.js](game/scenes/LevelScene.js) `registerAnim` 新增 **cols 参数**（行步长 = startRow×cols），frameCount/fps 已同步；`assets/sprites/*.json` 元数据已随装配重写。
- **5.4/5.5 台账中涉及 cat/fish/eagle/morph 的工单全部作废**（fish_idle 止血、fish_swim 删帧、eagle fly 删帧、cat_jump 镜像、morph_cat/morph_eagle 重生、eagle_glide 体型）；§5.2 的 P1/P2 同此。**仍然开放**：girl idle 首帧离群（5.5-5）、girl_hurt 行内第 5/6 帧偏小与末段静态帧（新版已非白卡，降级为打磨项）。
- 变身提示词方法论更新：把 transformation 写成 **(a)(b)(c) 三个各一秒、含具体中间形态的子阶段**才能得到真渐进（只写 smoothly metamorphoses 必得叠化）；负面清单加 no sparkles / no breath clouds / no dust；勿写 "invisible ground line"（招地板）。

## 6. 验收清单（每张图切割后）

- [ ] **底色为纯 `#00FF00` 绿幕**，白/灰底一票否决（girl_jump 二轮前科）
- [ ] **每格只有一个角色主体**（fish_swim 二轮帧 2/4/5 前科）
- [ ] **人形帧为兜帽麻花辫定稿版**（§0），无眼罩无丸子头（girl_jump/girl_hurt、morph_cat/morph_eagle 前科）
- [ ] 每行 9 帧完整、无跨格粘连（process 校验通过）
- [ ] 帧间角色尺寸一致（警惕单帧突然缩成迷你版：eagle_fly 帧 5、bear_idle 帧 6、morph 各行首末帧前科）
- [ ] **行与行之间体型一致**——同形态各动作行的角色占格高度差 ≤10%（eagle fly↔glide 差四成前科）
- [ ] 帧间有明确动作差异，不是同一姿势复制 9 份（fish_swim、cat_idle 前科）
- [ ] 透明背景无绿边残留
- [ ] 5 个形态**剪影颜色与取景框一致**（多形态同角色的硬要求）
- [ ] 三件「同一人」信号齐全：青绿月牙项链 / 珊瑚红点缀 / 琥珀色眼睛（fish_idle 绿鱼三缺前科）
- [ ] **变身渐变行：首帧=人形定稿、末帧=动物参考、9 帧项链不丢、尺寸单调不横跳**（最易漂移，逐帧检查；不合格重跑，预算按普通行 2×）
- [ ] 所有行朝向左、行内无中途翻面（cat_jump 帧 5/6 前科）；背景带左右边缘 150px 纯绿、可无缝平铺
