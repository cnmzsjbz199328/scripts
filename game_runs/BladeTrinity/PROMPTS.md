# BladeTrinity 素材生产提示词（视频轨）

三剑流格斗游戏。灵感取自《无职转生》三大剑术流派：**水神流**（后发制人 · 受流反击）、
**剑神流**（先手极速 · 一击必杀）、**北神流**（奇诡骗招 · 变招夺械）。

素材管线：AI 绿幕视频 → `skills/video-sprite`（`--anchor` 锚点对齐抽帧）→ 图集装配。
**不走图生图网格**（人设漂移/尺寸横跳不可控，ShapeshifterGirl 前车之鉴）。

---

## 0. 避坑铁律（收视频第一眼先过这几条，任一不过直接重生成）

- 🚫 **底色必须纯绿 `#00FF00`**。白底/灰底/米白一票否决——chroma-key 抠不掉，整段报废。
- 🚫 **背景零元素**。不能有地面、地板纹理、影子、尘土、光斑、飘落物。抠图算法会把它们连同角色边缘一起抠坏。
- 🚫 **禁运动模糊**。AI 视频默认爱加 motion blur，快速挥剑时尤其严重，抠出来是一团半透明糊边。负面提示里必须封死。
- 🚫 **禁镜头运动**。no pan / no zoom / no dolly。镜头一动，锚点对齐的基线假设就崩了。
- ✅ **角色朝左**（side view facing LEFT），全仓库统一朝向。
- ✅ **全身在框内，四周留宽边**。角色任何部位（含剑尖）不得触碰画面边缘，否则抽帧后被裁。
- ✅ **脚踩同一水平基线**，不横向移动出框。

---

## 0.5 首帧用**补边版**，不是原图

原始 `ref_*.png` 左右留边只有 15–88px，下留边 8–21px。角色一挥剑/后撤/倒地立刻出框被裁，
倒地时身体横过来宽度需求 ≈ 身高，原图必爆。

已生成补边版（1152×1152，角色占高 62%，脚底基线 86%，四周留边 300px+）：

```
ref_sword_pad.png / ref_water_pad.png / ref_north_pad.png
```

**全部 12 段视频的首帧一律用 `_pad` 版。**

> 注：`_pad` 版三张角色被归一化到同高，**跨角色的相对身高在这里丢失了**。
> 装配图集时相对身高从 `group.jpg` 的原始比例反推，不要从 `_pad` 图取。

---

## 1. 通用锁定块（`{锁定}`）

**拼在每一条提示词的最前面。** 治两个最常见的失败：人设中途漂移、角色转出侧视平面。

```
Using the attached image as the exact character design reference AND as the
first frame, animate this character. Keep the design absolutely identical in
every single frame — same face, same hair color and length, same costume,
same weapon, same colors, same body proportions. The character's design,
outfit and art style must never drift, morph or change at any point in the
clip.

This is sprite animation for a 2D SIDE-SCROLLING side-view action fighting
game. The camera is a flat orthographic side view. The character acts
entirely within a single flat vertical plane parallel to the screen: it must
never rotate toward or away from the camera, never turn to a three-quarter
or front-facing angle, never move closer or further in depth. It stays in
strict left-facing profile for the whole clip. Poses must read clearly as a
pure silhouette, because this footage will be chroma-keyed and cut into
sprite sheet frames.
```

---

## 1.5 通用风格 token（`{STYLE}`）

拼进每一条提示词：

```
2D game character animation, painterly anime style, crisp clean edges,
flat even lighting with no cast shadows, high contrast readable silhouette,
side view facing LEFT, full body head to feet visible, character centered
with generous margin on all sides, feet planted on the same invisible
horizontal baseline.
```

## 2. 通用尾缀（拼在每条提示词末尾）

```
Pure solid green #00FF00 background filling every pixel that is not the
character — absolutely no ground, no floor, no shadow, no dust, no sparks,
no background objects of any kind. Static locked camera: no pan, no zoom,
no dolly, no rotation. The character stays centered and does not travel out
of frame. Sharp crisp frames with zero motion blur. 4 seconds, 24fps.
```

## 3. 通用负面提示

```
motion blur, blurry, ghosting, trails, camera motion, zoom, pan, shadow,
cast shadow, ground, floor, grass, dirt, background scenery, sky, particles,
dust, sparks, glow effects, white background, grey background, gradient
background, text, watermark, logo, letterboxing, cropped limbs, sword tip
leaving frame, extra limbs, morphing anatomy, style change, multiple
characters, three-quarter view, front view, turning toward camera, rotating
in depth, perspective change, costume change, hair color change, design drift
```

---

## 3.5 每条提示词的拼装顺序

```
{锁定}  +  <该段的动作描述>  +  {STYLE}  +  {尾缀}
                                          （负面提示填到负面框）
```

---

## 4. 三流派人设定妆图（**先跑这一步**）

每个流派先出 **1 张绿幕静帧定妆图**，作为该流派全部 4 段视频的**首帧输入**（image-to-video）。
这是防人设漂移的唯一可靠手段，不要跳过。

**这三张全部走图生图**，参考图（用户提供，`references/BladeTrinity/ref/`）：

| 流派 | 参考图 | 角色 |
|------|--------|------|
| 剑神流 | `Weixin Image_20260719214918_268_17.jpg` | 红发少女 · 白道着 · 木刀 |
| 北神流 | `Weixin Image_20260719215220_270_17.jpg` | 白发男子 · 条纹斗篷 · 双刀 |
| 水神流 | `Weixin Image_20260719215110_269_17.jpg` | 蓝发少女 · 银板甲 · 长剑 |

### ⚠️ 定妆图必须直接摆成「构え」，不是正面站姿

因为它要当**全部 4 段视频的首帧**。姿势不对，视频一开场角色就得先扭一下，
抽出来的首帧和 idle 循环对不上。

### ⚠️ 三人出在**同一张合影图**里（定稿方案）

分三次单独生成，风格必飘：笔触粗细、线条硬度、明暗对比、相对身高，四项没有一项能靠提示词对齐。
**一张三人合影一次性解决全部四项。**

流程：

```
三人合影绿幕图（一张）
  └─ tools/split-ref.mjs 抠像 + 连通域分离 + 按最高者统一缩放
       ├─ ref_sword.png   （单人绿幕，构え姿势）
       ├─ ref_water.png
       └─ ref_north.png   ← 各自作为 4 段视频的 image-to-video 首帧
```

切图归我，你只要保证合影图**可切**：

| 硬要求 | 为什么 |
|--------|--------|
| 三人**绝不重叠**，彼此之间留宽阔纯绿间隙 | 连通域会把重叠的两人判成一个，切不开 |
| **武器不得侵入邻居的区域**（举起的木刀、横展的双刀、背后插的刀） | 同上，剑尖碰到邻居就粘连 |
| 三人**站在同一条水平基线**上 | 切出来的三张脚底才对齐 |
| 相对身高按角色设定自然呈现，**不要拉成同高** | 合影的最大价值就在这里 |
| **不要画分隔线/边框/地台** | 纯绿间隙即可，任何线条都会污染连通域 |

站位从左到右：**剑神流 / 水神流 / 北神流**。北神流双刀横展最宽放在一端，
水神流垂剑最窄放中间当缓冲，能把武器碰撞概率压到最低。

画布 **2304 × 1152**（横构图，容纳三人 + 间隙）。

---

### 4.0 三人合影（**只跑这一张**）

三张参考图一起喂进去。

```
Three separate anime swordfighter characters standing side by side in a
single row, evenly spaced far apart with wide empty gaps between them, all
in one unified art style. Use the three attached reference images as the
exact character designs, keeping each design identical.

LEFT character — from reference image 1: a teenage girl with long straight
vivid red hair past the waist and one antenna strand, a black-and-white
checkered headband, a white judo-style gi jacket with a torn right shoulder,
black high-neck undershirt with black sleeve cuffs, white belt, loose white
trousers, bare feet. She is the shortest of the three. Pose: high overhead
stance — both hands grip a plain wooden bokken raised high above her head,
blade pointing up and slightly back, elbows up, chest thrust forward, front
foot advanced, fierce confident eyes.

MIDDLE character — from reference image 3: a teenage girl with long straight
pale blue hair past the waist and straight bangs, calm blue eyes, polished
silver plate armor over a dark navy underlayer with pauldrons, vambraces,
breastplate and faulds, a wide brown leather belt, and a long deep blue
skirt with pale vertical trim reaching the ankles. She is of middle height.
Pose: low grounded stance — a straight cross-guarded longsword held in one
hand angled low and downward across the body with the tip near the ground,
the other hand open and forward, knees sunk into a deep bend, shoulders
relaxed, calm half-lidded eyes. Her silhouette is the narrowest of the three.

RIGHT character — from reference image 2: a tall lean adult man with upswept
white pompadour hair with a red streak and a scar on the right side of his
face, wearing a poncho-style cape in bold horizontal chevron stripes of red,
yellow, blue and black with a white fringed hem, brown leather harness
straps across the chest, several sheathed swords on his back, cuffed red
trousers, brown strapped sandals. He is clearly the tallest of the three.
Pose: unorthodox off-balance stance — dual-wielding two slim curved katana,
the lead blade loose and low, the rear blade held back at an odd angle, head
tilted crookedly, hips twisted, weight on the back foot, one shoulder
dropped, knees bent wide.

CRITICAL COMPOSITION RULES: all three characters face LEFT in side view.
All three stand on the same invisible horizontal baseline. Their heights
differ naturally as described — do NOT scale them to match. The three
figures must NEVER touch or overlap each other; leave a wide expanse of
plain background between each pair. No weapon, hair strand, cape fringe or
limb of one character may reach into the space of another. No dividing
lines, no frames, no boxes, no platform, no pedestal.

{STYLE — 但删掉 "character centered"，改为 three characters spread across the row}
Single static image, not a video. Canvas 2304x1152.
{通用尾缀}
```

> **收图验收（合影专用）**：
> - [ ] 底色纯 `#00FF00`，三人之间是**大片纯绿**，没有任何连接物
> - [ ] 三人**互不接触**——重点检查剑神流举起的木刀尖、北神流背后的刀尖和斗篷流苏
> - [ ] 三人朝左、站同一基线
> - [ ] 身高有明显差异（北神 > 水神 > 剑神），没被拉平
> - [ ] 三人人设与各自参考图一致（发色 / 服装 / 武器逐项比对）
> - [ ] 无分隔线、无地台、无阴影、无文字水印
> - [ ] 最外侧两人与画布左右边缘留边，武器不触边

---

## 4bis. 单人定妆图提示词（**备用**——合影切图失败时才用）

以下三条是 §4.0 合影方案的退路。只在合影反复出现「两人粘连切不开」或「某个角色人设崩坏」时，
拿来单独补那一个角色。单独重出的角色**必须比对合影里另外两人的笔触和身高**再接受。

### 4.1 剑神流（`ref_sword.png`）· 白 / 赤

```
Using the attached image as the exact character design reference, redraw
this character full body in a battle stance. Keep her design identical:
long straight vivid red hair flowing past the waist, a single antenna
strand, black-and-white checkered headband, white judo-style gi jacket with
a torn right shoulder, black high-neck undershirt with black sleeve cuffs,
white belt tied at the waist, loose white trousers, bare feet.

Pose: sword-god-style high overhead stance. She grips the plain wooden
bokken sword in both hands and raises it high above her head, blade pointing
up and slightly back, elbows up, ready to bring it down. Chest thrust
forward, front foot advanced, fierce confident eyes. Silhouette dominated by
straight aggressive diagonals.

The character occupies about 80% of the canvas height.
{STYLE}
Single static image, not a video. Canvas 768x1152.
{通用尾缀}
```

### 4.2 北神流（`ref_north.png`）· 三色条纹

```
Using the attached image as the exact character design reference, redraw
this character full body in a battle stance. Keep his design identical:
tall lean adult man, upswept white pompadour hair with a red streak, a scar
on the right side of his face, a poncho-style cape in bold horizontal
chevron stripes of red, yellow, blue and black with white fringed hem, brown
leather harness straps across the chest, several sheathed swords carried on
his back, cuffed red trousers, brown strapped sandals.

Pose: north-god-style unorthodox off-balance stance. He dual-wields two
slim curved katana, the lead blade held loose and low, the rear blade held
back and angled oddly. Head tilted at a crooked angle, hips twisted, weight
on the back foot, one shoulder dropped, knees bent wide. Silhouette
deliberately asymmetric and unreadable.

The character occupies about 90% of the canvas height.
{STYLE}
Single static image, not a video. Canvas 768x1152.
{通用尾缀}
```

### 4.3 水神流（`ref_water.png`）· 银 / 蓝

```
Using the attached image as the exact character design reference, redraw
this character full body in a battle stance. Keep her design identical:
long straight pale blue hair past the waist with straight bangs, calm blue
eyes, polished silver plate armor over a dark navy underlayer — pauldrons,
vambraces, breastplate, faulds — a wide brown leather belt, and a long deep
blue skirt with pale vertical trim reaching the ankles.

Pose: water-god-style low grounded stance. She holds a straight
cross-guarded longsword in one hand, angled low and downward across the
body, blade tip near the ground, the other hand open and forward. Knees
sunk into a deep bend, shoulders relaxed, weight low and settled, calm
half-lidded eyes. Silhouette dominated by soft curves and a low center of
gravity.

The character occupies about 84% of the canvas height.
{STYLE}
Single static image, not a video. Canvas 768x1152.
{通用尾缀}
```

---

> **收图验收**：底色纯 `#00FF00`、朝左、全身在框内、**剑尖/木刀尖不触边**、
> 人设与参考图一致（发色/服装/武器三项逐一比对）、姿势是构え不是立正。
> 北神流那张额外确认**背后的刀没有戳出画面**。

---

## 5. 每流派 4 段动作视频

以对应的定妆图作首帧。每段 4 秒 @24fps。**动作分相位写死在提示词里**，方便我用
`--start/--end` 精切分段。

| 段 | 文件名 | 抽出的动画行 | 循环性 |
|----|--------|-------------|--------|
| A | `<style>_stance.mp4` | `idle`（呼吸循环）+ `walk`（前进步） | loop |
| B | `<style>_attack.mp4` | `attack` | once |
| C | `<style>_guard.mp4` | `guard`（架起+受击震动+回位） | once |
| D | `<style>_hurt.mp4` | `hurt`（踉跄）+ `down`（倒地） | once |

---

### 5.A 构え + 步伐（每流派通用骨架）

> ⚠️ 循环动作必须首尾相位闭合。提示词里明写「末帧姿态精确回到首帧」。

**水神流**
```
The character breathes slowly in the low water stance for the first 2
seconds — chest rising and falling, the blade tip drifting in a tiny slow
figure-eight, weight shifting almost imperceptibly between the feet, like a
still pond. Then for the last 2 seconds the character slides forward with
two smooth gliding steps, feet skimming low without lifting high, upper body
staying perfectly level with no bobbing, blade held unchanged. The final
pose returns exactly to the opening stance so the motion can loop.
{STYLE}
{通用尾缀}
```

**剑神流**
```
The character holds the high overhead stance for the first 2 seconds — the
raised wooden bokken trembling with barely contained tension, shoulders
rising and falling with deep breaths, long red hair stirring, bare front
foot tapping the baseline impatiently. Then for the last 2 seconds the
character advances with two hard driving steps, knee lifting high and
stamping down, the raised bokken staying locked overhead throughout. The final pose returns exactly to the opening stance so
the motion can loop.
{STYLE}
{通用尾缀}
```

**北神流**
```
The character sways idly in the crooked off-balance stance for the first 2
seconds — head lolling slightly side to side, the lead katana swinging
lazily like a pendulum, the rear katana rotating idly in the fingers, the
striped fringed poncho stirring. Then for the last 2 seconds the character creeps
forward with two light irregular steps, one long one short, body weaving
side to side unpredictably. The final pose returns exactly to the opening
stance so the motion can loop.
{STYLE}
{通用尾缀}
```

---

### 5.B 攻击

> 三流派的攻击必须**在剪影上就能区分**——这是格斗游戏读招的基础。
> 相位比例写死：预备 / 发力 / 命中 / 收招。

**水神流 · 流水返し（弧线横薙）**
```
A single continuous sword attack in four clear phases. Phase 1 (0.0-1.0s,
windup): the character sinks even lower, drawing the longsword back along
the right hip in a smooth unhurried arc. Phase 2 (1.0-1.8s, strike): the body
uncoils in one flowing rotation and the blade sweeps in a wide horizontal
crescent arc from right to left at waist height, the whole motion circular
and liquid. Phase 3 (1.8-2.4s, extension): the blade reaches full extension
to the left, arms fully stretched, body turned side-on. Phase 4 (2.4-4.0s,
recovery): the character flows smoothly back down into the low opening
stance. Each phase is clearly distinguishable, no motion blur, every frame a
crisp readable pose.
{STYLE}
{通用尾缀}
```

**剑神流 · 光の太刀（垂直落斩）**
```
A single explosive sword attack in four clear phases. Phase 1 (0.0-1.2s,
windup): the character coils, pulling the overhead bokken back and further
up, body arching backward, whole frame tensing, an unmistakable telegraph.
Phase 2 (1.2-1.6s, strike): the blade falls in one brutally straight
vertical chop from directly overhead down to the baseline, the entire body
snapping forward behind it. Phase 3 (1.6-2.2s, impact): the blade is
stopped at the bottom of the arc, arms fully extended down, the character
frozen in a deep forward lunge. Phase 4 (2.2-4.0s, recovery): the character
slowly and heavily hauls the blade back up to the overhead stance, clearly
sluggish and vulnerable. Each phase is clearly distinguishable, no motion
blur, every frame a crisp readable pose.
{STYLE}
{通用尾缀}
```

**北神流 · 虚実（假动作后突刺）**
```
A single deceptive sword attack in four clear phases. Phase 1 (0.0-1.0s,
feint): the character makes a sharp obvious fake swing with the lead katana
from high right, a bluff that stops abruptly halfway. Phase 2 (1.0-1.6s,
switch): the body twists unexpectedly the opposite way, the rear katana
whipping around from behind the back. Phase 3 (1.6-2.2s, thrust): a low
sudden stab forward with the rear katana at hip height, front leg lunging
deep and low, the lead katana flung out wide behind for counterbalance. Phase 4
(2.2-4.0s, recovery): the character snaps back into the crooked off-balance
stance, dagger sliding back into hiding. Each phase is clearly
distinguishable, no motion blur, every frame a crisp readable pose.
{STYLE}
{通用尾缀}
```

---

### 5.C 格挡

> 格挡视频要包含「架起 → 被击中的震动 → 回位」三拍，这样我能切出 `guard` 起手和
> `guard_hit` 受冲击两小段，反击窗口才有画面。
> ⚠️ 攻击方不入画——只拍防御者，冲击靠身体反应表达。

**水神流 · 受け流し（卸力）**
```
A defensive parry in three clear beats, the attacker never appears in frame.
Beat 1 (0.0-1.2s): the character raises the longsword to a shallow diagonal
angle in front of the body, blade tilted like a slope, knees bending deeper,
posture soft and yielding. Beat 2 (1.2-2.2s): an unseen blow lands on the
blade — instead of resisting, the whole body rotates smoothly with the
impact, the blade turning to deflect the force sliding off to the side, feet
pivoting, absorbing rather than blocking. Beat 3 (2.2-4.0s): the character
flows back to the low ready stance, blade returning to guard. No motion
blur, every frame a crisp readable pose.
{STYLE}
{通用尾缀}
```

**剑神流 · 力受け（硬挡）**
```
A defensive block in three clear beats, the attacker never appears in frame.
Beat 1 (0.0-1.2s): the character brings the bokken down from overhead to a
flat horizontal bar held across the chest with both hands, bare feet
planting wide and braced. Beat 2 (1.2-2.2s): an unseen blow slams into the
wooden blade — the character is driven backward, both feet skidding back a
short distance along the baseline, arms buckling, torso jolting hard, teeth
gritted, pure stubborn resistance. Beat 3 (2.2-4.0s): the character shoves
the bokken back outward and hauls it up into the overhead stance. No motion blur, every
frame a crisp readable pose.
{STYLE}
{通用尾缀}
```

**北神流 · 逸らし（闪避格挡）**
```
A defensive deflection in three clear beats, the attacker never appears in
frame. Beat 1 (0.0-1.2s): the character crosses both katana into an X in front of
the chest while simultaneously leaning the torso far back and to the side,
half evading before the blow even lands. Beat 2 (1.2-2.2s): an unseen blow
glances off the crossed blades — the character spins with it, pivoting
almost all the way around on one foot, the striped fringed poncho flaring
out, turning the impact into rotation. Beat 3 (2.2-4.0s):
the spin resolves back into the crooked off-balance stance, blades uncrossing.
No motion blur, every frame a crisp readable pose.
{STYLE}
{通用尾缀}
```

---

### 5.D 受击 + 倒地（一段出两行）

> 前 1.5s 是 `hurt`（可重复播放的踉跄），后 2.5s 是 `down`（倒地不起，末帧静止）。
> ⚠️ 倒地末帧必须**完全静止且角色仍在框内**——倒下的身体是横向的，容易撞到画面左边缘，
> 提示词里明写「倒地后身体仍完整可见、四周留边」。

三流派通用（把 `<STANCE>` 换成各自的站架描述）：

```
A hit reaction followed by a knockdown, in two clear stages, the attacker
never appears in frame. Stage 1 (0.0-1.5s, stagger): an unseen blow strikes
the chest — the head snaps back, the torso jolts and folds forward, the
character stumbles one step backward, weapon arm flailing wide, but stays on
its feet, then begins to sag. Stage 2 (1.5-4.0s, knockdown): the knees
buckle and give way, the character collapses down and backward, landing on
its back, weapon slipping from the hand and coming to rest beside the body.
The character settles completely motionless by 3.0s and holds that final
still pose until the end. The fallen body remains entirely inside the frame
with clear margin on every side — do not let the head, feet or weapon touch
any edge. No motion blur, every frame a crisp readable pose.
{STYLE}
{通用尾缀}
```

---

## 6. 生成量清单

| 流派 | 定妆图 | 视频 |
|------|--------|------|
| 水神流 | `ref_water.png` | `water_stance` / `water_attack` / `water_guard` / `water_hurt` |
| 剑神流 | `ref_sword.png` | `sword_stance` / `sword_attack` / `sword_guard` / `sword_hurt` |
| 北神流 | `ref_north.png` | `north_stance` / `north_attack` / `north_guard` / `north_hurt` |

**合计 3 张图 + 12 段视频**，抽出 3 个流派 × 6 行（idle / walk / attack / guard / hurt / down）。

产物放 `references/BladeTrinity/clips/`（gitignored），交给我跑 `video-sprite`。

---

## 7. 交付时请一并告诉我

- 每段视频里各相位的**实际起止时间**（看一遍记 `秒:帧` 即可）——AI 不会严格按提示词的时间表走，
  我要靠这个精切分段。尤其 `stance` 段的 idle/walk 分界、`hurt` 段的踉跄/倒地分界。
- 哪几段有明显瑕疵（叠化鬼影、某几帧畸变）——我用 `--pick` 绕开坏帧。

---

## 8. 帧密度约定

视频轨帧免费，不要沿用图生图的 9 帧惯性：

- 循环动作（idle / walk）：保留原生 24fps 整周期，零抽稀。
- once 动作（attack / guard / hurt / down）：帧数 × fps 保持时长不变。
- **唯一硬约束**：纹理宽度 ≤ 21 列（192 × 21 = 4032 < 4096，老 GPU 上限）。

---

## 9. 三层背景素材生产提示词

### 关键约束（三张图必须严格遵守）
- **画布比例**：16:9（1920x1080）。
- **地面线位置**：固定在画面高度的 88%（FLOOR_Y 476 / GAME_H 540）。
- **透视限制**：纵深只能出现在战斗线之后和之前，战斗线本身是一条水平带——严禁画向后退去的、角色站在中间的透视地板（会与“角色永远在同一条 z 线、永不缩放”打架）。

---

### 9.1 远景 `bg_far.png` — 全彩不透明，不走绿幕
背景无主体需抠图，整张图保留，避免绿幕边缘残留绿边。

```
Subject: interior of an ancient Japanese kendo dojo at dusk, viewed straight-on in flat side elevation. Deep receding coffered wooden ceiling beams and a row of shoji paper screens along the back wall, warm sunset light pouring through them from behind. Distant mountain ridges faintly visible through one open screen. Style: painted 2D game background, dusk palette of deep violet #3a2550, dusty rose #7a3f52, burnt orange #c9714a, amber #e8a15c. Soft atmospheric haze increasing with distance. Composition: strictly symmetrical, horizontal. The dojo floor line must sit at exactly 88 percent of the image height, running perfectly level edge to edge. Everything below that line is dark flat floor. Keep the middle 60 percent of the image visually quiet and low-contrast. Size 1920x1080 16:9. No characters, no people, no text, no letters, no watermark, no logo, no UI, no foreground objects.
```

---

### 9.2 中景 `bg_mid.png` — 绿幕，站在战斗线之后

```
Subject: midground dojo elements isolated on a pure chroma green background: two heavy dark wooden pillars, one at the far left edge and one at the far right edge, each standing on a stone base, with a hanging paper lantern glowing warm amber near the top of each. A low dark wooden weapon rack against the wall on the left holding wooden bokken. Style: painted 2D game asset, dusk lighting, silhouetted and darker than the background, deep plum and near-black wood tones with warm amber rim light on the lantern side. Composition: the pillar bases must rest on a level line at exactly 88 percent of the image height. The entire middle 60 percent of the image must be EMPTY pure green from top to bottom. Background must be solid pure chroma green #00FF00 with no gradient, no shadow cast onto the green, no glow bleeding onto the green. Size 1920x1080 16:9. No characters, no people, no text, no letters, no watermark, no logo.
```

---

### 9.3 前景 `bg_fore.png` — 绿幕，接地三明治的上层
压住脚和头发解决悬浮，中央保持低矮不遮挡步法。

```
Subject: a foreground strip of dojo floor seen very close to the camera, isolated on pure chroma green. A polished dark wooden floorboard edge runs horizontally across the entire bottom of the image, its top edge slightly uneven and organic, with a thin warm amber highlight catching the last sunset light along the top edge. Scattered fallen cherry blossom petals and a few loose wooden splinters resting on it. At the extreme left and right edges only, the foreground rises higher into a blurred out-of-focus dark stone step corner. Style: painted 2D game asset, very dark near-silhouette values, slightly soft focus to read as close to camera, dusk palette. Composition: CRITICAL - across the middle 70 percent of the image the foreground strip must be SHORT, its top edge no higher than 84 percent of the image height, leaving everything above it pure green. Only the outermost 15 percent on each side may rise higher. Background must be solid pure chroma green #00FF00, no gradient, no shadow on the green, no glow bleeding onto the green. Size 1920x1080 16:9. No characters, no people, no text, no letters, no watermark, no logo.
```


---

### 9.4 ⚠️ 实际产出与提示词的偏差（2026-07 首次生成实测）

**上面三段提示词里的「地面线固定在 88%」，三张图一张都没遵守。** 模型对
"exactly 88 percent of the image height" 这类数值构图约束基本不响应，实测：

| 层 | 关键线 | 实测（源图 1920×1080） | 提示词要求 |
|---|---|---|---|
| far | 地板线 | y=703（65.1%） | 88% |
| mid | 柱础底 | y=894（82.8%） | 88% |
| fore | 中央木板顶边 | y=769（71.2%） | ≤84% |
| fore | 两侧石阶顶 | y=471（43.6%） | 仅最外 15% 可高 |

**结论：不要指望提示词把地面线钉准，改在装配侧吸收。** 每层单独定标
`scale = 目标屏幕 y ÷ 源图实测 y`，三层都 origin(0.5,0) 贴顶居中，
超出画布的部分自然裁掉。落地参数见 `game/config.js` 的 `BT.BG`。

重新生图后**必须重新量这四条线并更新 `BT.BG` 的 scale**，否则角色会浮在
地板线上方或陷进去——量法见 `tools/process-bg.mjs` 旁的分析脚本思路：
逐列求首个不透明行取中位（fore/mid），或找最强水平边（far）。

其余可复用的经验：
- 抠图质量本身没问题（残留绿 0%，无"静默产纯绿空图"）——绿幕那步提示词是有效的。
- 「中央必须留空」对 mid **要求过严**：mid 在角色之后（depth -50），左侧刀架
  越界到中央反而更好看，不构成遮挡。真正需要守住中央的只有 fore。

---

## 10. 第二套背景：室外雪山演武场（一场一景）

擂台共两场，每场一套三层背景（`BT.BG_SETS` / `BT.BG_ORDER`）：

| 场次 | 套件 | 内容 | 资源前缀 |
|---|---|---|---|
| 第 1 场 | `dojo` | 室内道场（§9 原设计，保留） | `far/mid/fore` |
| 第 2 场 | `outdoor` | 雪山之巅露天演武场 | `outdoor_far/mid/fore` |

室外那套的前景是**枫树 + 银杏**，与 `foregroundPhysics.js` 的三种落叶
（maple / oak / ginkgo）同色系——落叶物理层就是照着这张前景配的。

### 10.1 `outdoor_far.png` — 全彩不透明，不走绿幕

```
Subject: an outdoor mountain-top sword training ground at autumn dusk, viewed straight-on in flat side elevation. Far background: a range of snow-capped mountain peaks under a deep sunset sky, layered ridges receding into haze, high thin clouds lit orange and violet, a few distant dark pine silhouettes on the lower slopes. The lower part of the image is a wide flat stone terrace ground running perfectly level from edge to edge. Style: painted 2D game background, autumn dusk palette - cold snow blue-white and slate blue on the peaks, warm sunset sky of amber, burnt orange, dusty rose and deep violet. Soft atmospheric haze increasing with distance. Composition: strictly symmetrical and horizontal. No vanishing-point floor perspective, no receding tiled ground - the battle line is a flat horizontal band. Keep the middle 60 percent of the image visually quiet and low-contrast. Size 1920x1080 16:9. No characters, no people, no text, no letters, no watermark, no logo, no UI.
```

### 10.2 `outdoor_mid.png` — 绿幕，站在战斗线之后

```
Subject: midground elements of an OUTDOOR Japanese sword training ground, isolated on a pure chroma green background. On the far left edge: a covered wooden veranda corner of a traditional dojo building with dark tiled roof eaves and a stone foundation. On the far right edge: a matching wooden gate post and a tall stone lantern glowing warm amber, plus a weathered vertical banner on a pole. A low dark wooden fence section rests on the ground line. Style: painted 2D game asset, autumn dusk lighting, silhouetted and darker than the sky behind, deep plum and near-black wood tones with warm amber rim light. Composition: all elements rest on one level horizontal ground line in the lower part of the image. The middle 55 percent of the image should be mostly empty pure green. Background must be solid pure chroma green #00FF00 with no gradient, no shadow cast onto the green, no glow bleeding onto the green. Size 1920x1080 16:9. No characters, no people, no text, no letters, no watermark, no logo.
```

### 10.3 `outdoor_fore.png` — 绿幕，接地三明治的上层

```
Subject: a close-to-camera foreground layer for an autumn outdoor sword arena, isolated on pure chroma green. Along the entire bottom of the image runs a horizontal strip of ground thickly carpeted with fallen autumn leaves - red maple leaves, orange oak leaves and golden yellow ginkgo leaves - its top edge slightly uneven and organic, with a thin warm amber highlight along the top edge. At the extreme left edge only: a massive dark maple tree trunk rising out of frame with low-hanging branches of red maple leaves reaching inward and downward. At the extreme right edge only: a matching ginkgo tree trunk with golden fan-shaped leaf clusters hanging inward. Style: painted 2D game asset, very dark near-silhouette values, slightly soft focus to read as close to camera, autumn dusk palette of crimson, burnt orange and gold against near-black wood. Composition: CRITICAL - across the middle 70 percent of the image the foreground must be SHORT, only the low leaf carpet strip along the bottom, with everything above it pure green. Only the outermost 15 percent on each side may rise higher with the tree trunks and hanging branches. Background must be solid pure chroma green #00FF00, no gradient, no shadow on the green, no glow bleeding onto the green. Size 1920x1080 16:9. No characters, no people, no text, no letters, no watermark, no logo.
```

### 10.4 装配定标（`tools/measure-bg.mjs` 实测，2026-07）

`node tools/measure-bg.mjs outdoor_` 逐层量地面线，回填 `BT.BG_SETS.outdoor` 的 scale：

| 层 | 关键线（源图 1920×1080） | scale | 落到屏幕 |
|---|---|---|---|
| outdoor_far | 石台面中部 y≈891 | 0.534 | 475.8 ≈ FLOOR_Y |
| outdoor_fore | 落叶带中央顶边 y≈860 | 0.542 | 466.1 = FLOOR_Y−10 |
| outdoor_mid | 檐廊石阶/栅栏底 y≈887 | 0.537 | 476.3 ≈ FLOOR_Y |

> far 的"最强水平边"量到 y=856，那是石台**后沿**——照它定标角色会贴着远景山脚站。
> 战斗线要落在台面中部，所以 far 单独取 891。量法脚本给的是候选，不是答案。
>
> mid 的"中央 60% 顶边"量到 990，那是右侧栅栏越界的一小段——中景中央本就该留空，
> 这一栏对 mid 无意义，取全幅中位 887。
>
> 三层 0.534 / 0.537 / 0.542 几乎同比例，这套图彼此协调（室内那套 mid 比 far 小 21%）。

> **outdoor_mid 由用户用 ChatGPT 生成**（agy 当时配额耗尽），未走 §10.2 的 agy 命令。
> 入库前体检：比例 1.777≈16:9（cover 到 1920×1080 几乎不裁）、绿像素 79.7% 且纯绿占 99.4%、
> 中央 55% 非绿仅 3.6%。三项都过才迁进 raw/。

### 10.5 ⚠️ 前景树干必须横向推出画面（`scaleX`）

两棵树在源图里各占最外 12%，等比铺开后覆盖屏幕 x∈[−40,85] 与 [875,1000]，
而角色能走到 x≈50 —— **被逼到墙角时整个人躲进树干后面**（fore depth 20 > 角色 10）。
所以 outdoor_fore 纵向按地面线定标 0.542、横向单独拉到 `scaleX: 0.62`，
树干推出画面只留枝叶当画框。这是 `BT.BG` 里唯一需要 scaleX 的层。

### 10.6 后续：树叶动态化

树枝目前是静态图。若要让枝叶随风摆动，走 `skills/video-sprite` 绿幕视频抽帧：
生成"纯绿幕背景下一根枫树枝随风轻摆、循环"的视频 → `--anchor` 抽帧 → 作为
独立的 depth 21 图层叠在 outdoor_fore 之上（树干仍用静态图，只有枝叶动）。
先按静态验收观感，再决定是否值得为它多一条管线。
