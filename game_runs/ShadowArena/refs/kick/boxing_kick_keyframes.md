# 拳击/搏击高扫踢（High Roundhouse Kick）动作极限定格帧设计方案

本方案为您设计了木偶模型在**左侧正侧面视角（Left-Side Profile View）**下的高扫踢（高鞭腿）三个极限定格帧。设计中特别注意了**全身居中留空（防止踢高剪裁）**以及**支撑脚扭转/重心承重**的力学结构呈现。

---

## 1. 动作定格帧展示

````carousel
![[预备/Chamber] Supporting leg pivots, lead knee lifted high, shin tucked back close to thigh, hips coiled.](file:///C:/Users/tj169/.gemini/antigravity-cli/brain/f952f960-224f-4f89-b3f0-f2efbd83da63/kick_chamber_1782121000790.jpg)
<!-- slide -->
![[命中/Contact] Kicking leg straight at high target, hips fully rotated open, support leg heel pivoted, torso leaned back.](file:///C:/Users/tj169/.gemini/antigravity-cli/brain/f952f960-224f-4f89-b3f0-f2efbd83da63/kick_contact_1782121071011.jpg)
<!-- slide -->
![[过头/Overshoot] Kicking leg swung past target, hips over-rotated, torso counter-balancing momentum.](file:///C:/Users/tj169/.gemini/antigravity-cli/brain/f952f960-224f-4f89-b3f0-f2efbd83da63/kick_overshoot_1782121089951.jpg)
````

---

## 2. 核心难点解析：支撑腿与重心动力学

扫踢（鞭腿）的力学特征在于**“以支撑腿为轴旋转”**。在正侧面视角中，支撑脚和支撑腿的变化是控制整体动作协调性的核心要素：

1. **预备阶段 (Chamber)**:
   * **支撑脚**：已开始向后转动（脚跟转向目标方向约 90°）。
   * **膝关节**：微屈以积蓄弹跳力和扭转力。
   * **提膝**：前大腿几乎贴近胸部，小腿（胫骨）紧紧折叠在后，使得小腿在大腿下方，为出腿瞬间提供如同弹簧释放的初速度。
2. **命中阶段 (Contact - 极高延伸)**:
   * **支撑脚脚跟（关键参考）**：**必须完全指向击打方向**（即脚尖指向身体后方，完成了近 180° 的旋转）。脚跟微微抬起，承重集中在前脚掌。
   * **支撑腿膝盖**：完全伸直锁定，作为旋转和高度支撑的强力支点。
   * **躯干倾斜**：上身（Torso）为了平衡高踢腿的质量，必须**向后斜倾斜 35° ~ 45°**。如果上身直立，重心会崩溃，且踢腿高度受限。
   * **臀部/胯部 (Hips)**：完全翻转（Open Hip），大腿内侧和腹股沟面在侧视图中完全打开。
3. **过头阶段 (Overshoot)**:
   * **旋转惯性**：由于腰胯惯性，胯部会微弱超旋，踢击腿在越过目标线后，膝关节开始微弯（主动回收的起点）。
   * **重心恢复**：上身倾斜度开始回踩，准备回收落步。

---

## 3. 三个极限帧的骨骼变换参数（SVG/CSS Transform）建议

在 SVG 层级架构中，踢击腿（原本的 Lead Leg）和支撑腿（原本的 Rear Leg）的关节旋转变化参数如下：

| 骨骼节点 | 预备阶段 (Chamber) | 命中阶段 (Contact) | 过头阶段 (Overshoot) |
| :--- | :--- | :--- | :--- |
| **`character-root`** | `translate(400px, 450px)` | `translate(420px, 445px)` (重心微幅前移) | `translate(415px, 448px)` (惯性略带抖动) |
| **`hips`** | `rotate(20deg)` (胯部侧旋锁定) | `rotate(-80deg)` (胯部强烈翻转，横向展平) | `rotate(-90deg)` (惯性转动极限) |
| **`torso`** | `rotate(10deg)` (稍微含胸低头) | `rotate(40deg)` (上身向右后方大幅度倾斜) | `rotate(45deg)` (惯性维持倾斜) |
| **`支撑腿大腿`** | `rotate(15deg)` (微屈) | `rotate(-10deg)` (与地面呈较大夹角伸直) | `rotate(-12deg)` (微调) |
| **`支撑腿小腿`** | `rotate(10deg)` | `rotate(0deg)` (蹬直锁定) | `rotate(5deg)` |
| **`支撑脚/脚掌`** | `rotate(90deg)` (开始转脚) | `rotate(180deg)` (脚跟完全指前，脚尖朝后) | `rotate(185deg)` |
| **`踢击大腿`** | `rotate(-110deg)` (膝盖紧贴胸腔) | `rotate(-90deg)` (平举，与上身呈直角以上) | `rotate(-95deg)` |
| **`踢击小腿`** | `rotate(130deg)` (紧密折叠折收) | `rotate(0deg)` (小腿水平踢直) | `rotate(15deg)` (开始微屈回收) |

---

## 4. CSS Keyframes 缓动优化建议

扫踢是一次爆发力运动。由于腿部质量大于拳头，**Chamber 到 Contact 的过程比直拳稍慢，但 Contact 瞬间的惯性要大得多**。

```css
@keyframes roundhouse-kick {
  /* 0% - 40%: 蓄力提膝 (Chamber) - 支撑脚开始拧转，膝盖折叠到位 */
  0% {
    transform: translate(400px, 450px);
  }
  40% {
    /* 预备极限：对应第一帧 [Chamber] */
    transform: translate(400px, 450px);
    animation-timing-function: cubic-bezier(0.3, 1.6, 0.4, 1); /* 强烈弹射爆发出腿 */
  }

  /* 40% - 48%: 鞭打命中 (Contact) - 弹射小腿，仅用 8% 的时间完成直腿 */
  48% {
    /* 命中：对应第二帧 [Contact] */
    transform: translate(420px, 445px);
    animation-timing-function: cubic-bezier(0.1, 0.9, 0.2, 1);
  }

  /* 48% - 55%: 惯性越过 (Overshoot) */
  55% {
    /* 过头极限：对应第三帧 [Overshoot] */
    transform: translate(415px, 448px);
    animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1); /* 平滑回收 */
  }

  /* 55% - 90%: 大腿和小腿双重折叠回收并落步还原 */
  90%, 100% {
    transform: translate(400px, 450px);
  }
}
```

> [!TIP]
> 1. **支撑脚扭转的 SVG 实现**：在正侧面图中，通过使用 `<ellipse>` 绘制脚掌，并在 `Contact` 瞬间使用 `transform: scaleX(-1)` 或 `rotate(180deg)`，可以让前脚掌和后跟的视觉方向发生真实翻转。
> 2. **画幅保护**：在 SVG 容器中，必须让人物初始位置偏下偏中（如 `cy=450` 处在 600 高度的下半部分），这样踢击腿在向上伸展至最高点（如 `y` 坐标在 150-200 左右）时，依然能保证留有充足的顶部和右侧安全区。
