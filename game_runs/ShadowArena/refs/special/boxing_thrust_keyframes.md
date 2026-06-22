# 双掌推/聚气爆发（Two-Handed Palm-Thrust）动作极限定格帧设计方案

本方案为您设计了木偶模型在**左侧正侧面视角（Left-Side Profile View）**下的特殊招式（双手聚气到双掌爆发前推）三个极限定格帧。重点强调了**蓄力阶段的后撤深蹲重心**与**爆发阶段的前推大弓步**之间的超大位移反差。

---

## 1. 动作定格帧展示

````carousel
![[预备/Gather] Weight loaded deep on bent rear leg, torso coiled and leaned back, both arms drawn to rear hip.](file:///C:/Users/tj169/.gemini/antigravity-cli/brain/f952f960-224f-4f89-b3f0-f2efbd83da63/gather_windup_1782122020010.jpg)
<!-- slide -->
![[爆发/Burst] Both arms extended forward at chest height, deep forward lunge, rear leg fully straight.](file:///C:/Users/tj169/.gemini/antigravity-cli/brain/f952f960-224f-4f89-b3f0-f2efbd83da63/thrust_burst_1782122038223.jpg)
<!-- slide -->
![[过头/Overshoot] Arms past full extension, torso over-leaned forward, front knee absorbing lunge.](file:///C:/Users/tj169/.gemini/antigravity-cli/brain/f952f960-224f-4f89-b3f0-f2efbd83da63/thrust_overshoot_1782122061149.jpg)
````

---

## 2. 核心力学结构与 SVG 动画要点

双手推/气功波出招在正侧面动画中，具有以下独特的力学特征，也是 SVG 变换中最需关注的参数：

1. **双臂同步（平行透视）**:
   * 在正侧面视角中，双臂会产生**部分重合**。为了做出“双手齐推”而非“单臂前刺”的效果，里侧手臂（Right Arm）和外侧手臂（Left Arm）在高度和长度上应高度重合，但里侧手臂可适当**降低亮度/饱和度**或使用微小的 `translateY` 偏移（如 2-4 像素），以通过重叠和微弱视差体现空间厚度。
2. **极端的重心位移（前后幅差）**:
   * **Gather（深蓄）**：重心完全落在后腿，臀部（Hips）后移，躯干向后倾斜，前腿近乎伸直且不承重。`character-root` 处于相对靠后的位置（例如 X = 350px）。
   * **Burst（前冲）**：通过前腿的大弓步（Lunge）完成前冲，前膝盖深度弯曲，后腿完全拉直蹬地。`character-root` 产生极大的向前位移（例如 X = 460px，位移量达 110px 以上）。
   * 在 SVG 动画中，这是通过对全局 `<g id="character-root">` 的 `translateX` 驱动来实现的，这样可以避免逐个计算四肢的世界坐标。

---

## 3. 三个极限帧的骨骼变换参数（SVG/CSS Transform）建议

在 SVG 骨骼树中，建议将对应的关节参数配置如下：

| 骨骼节点 | 预备阶段 (Gather) | 爆发阶段 (Burst) | 过头阶段 (Overshoot) |
| :--- | :--- | :--- | :--- |
| **`character-root`** | `translate(350px, 460px)` (重心极度压后且降低) | `translate(460px, 450px)` (向前冲刺，呈弓步姿态) | `translate(475px, 452px)` (惯性再次前移，前倾至极限) |
| **`hips`** | `rotate(10deg)` (胯部随重心后移) | `rotate(-30deg)` (胯部全力前推) | `rotate(-35deg)` (惯性超旋) |
| **`torso`** | `rotate(15deg)` (上身明显往后仰) | `rotate(-15deg)` (上身向前探出，压低) | `rotate(-25deg)` (惯性过度前倾) |
| **`双臂大臂`** *(两侧)* | `rotate(80deg)` (手肘向后肋骨收拢) | `rotate(-80deg)` (大臂向前平举) | `rotate(-85deg)` (双肩耸起送出) |
| **`双臂小臂`** *(两侧)* | `rotate(100deg)` (手臂夹紧，双手在腰际) | `rotate(0deg)` (双臂瞬间打直) | `rotate(-2deg)` (手肘轻微超伸锁定) |
| **`后大腿`** *(Right Leg)* | `rotate(-45deg)` (后大腿深度弯曲) | `rotate(60deg)` (向后完全伸展) | `rotate(65deg)` (后腿成一条直线) |
| **`后小腿`** *(Right Leg)* | `rotate(-90deg)` (后膝关节深蹲折叠) | `rotate(0deg)` (膝盖蹬直) | `rotate(0deg)` (脚尖虚点地/蹬实) |
| **`前大腿`** *(Left Leg)* | `rotate(20deg)` (前腿放松前伸，无压力) | `rotate(-50deg)` (前大腿大跨步屈膝) | `rotate(-55deg)` (前大腿深度承重) |
| **`前小腿`** *(Left Leg)* | `rotate(-10deg)` (轻微屈膝) | `rotate(-45deg)` (膝关节深度弯曲) | `rotate(-50deg)` (膝盖略微越过脚尖) |

---

## 4. 动画节奏曲线 (CSS Keyframes)

双掌前推的物理动感在于**“长蓄力、短冲刺、长定格后收招”**。其回收（Settle Back）速度相比直拳较慢，因为弓步前冲的惯性重量较大。

```css
@keyframes palm-thrust {
  /* 0% - 45%: 深蓄力 (Gather) - 慢慢后拉，把弓拉满 */
  0% {
    transform: translate(400px, 450px);
  }
  45% {
    transform: translate(350px, 460px);
    /* 出掌爆发：极强的爆发力曲线 */
    animation-timing-function: cubic-bezier(0.15, 1.8, 0.3, 1); 
  }

  /* 45% - 50%: 爆发前推 (Burst) - 仅需 5% 帧率的时间，以雷霆万钧之势冲刺 */
  50% {
    transform: translate(460px, 450px);
    animation-timing-function: cubic-bezier(0.2, 0.8, 0.4, 1);
  }

  /* 50% - 57%: 过头缓冲 (Overshoot) - 身体前压到极限，承受向前惯性 */
  57% {
    transform: translate(475px, 452px);
    animation-timing-function: cubic-bezier(0.42, 0, 0.58, 1);
  }

  /* 57% - 90%: 缓慢回收并起立还原 */
  90%, 100% {
    transform: translate(400px, 450px);
  }
}
```

> [!TIP]
> 1. **双掌掌心翻转**：在 **Gather** 阶段，可以将双手掌心（手部 SVG 组）设为朝向斜上方或后方；在 **Burst** 瞬间，通过 `rotate(-90deg)` 或修改 Path，让双手掌心垂直于出拳方向（向前推墙状），可以显著提高推掌的物理可信度。
> 2. **气流/特效引导**：由于这是 Special 招式，在 **Burst** 命中（50%）到 **Overshoot** 期间，可在手掌前方添加淡出消失的水平气流线段（SVG `<line>`）或同心圆弧，增强爆发的视觉张力。
