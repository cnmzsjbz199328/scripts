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
