# 拳击刺拳（Boxing Jab）动作极限定格帧设计方案

本方案为您设计了木偶模型在**左侧正侧面视角（Left-Side Profile View）**下的三个极限定格帧（Anticipation / Contact / Follow-through），以支持您进行 SVG 格斗动作的精确还原与优化。

---

## 1. 动作定格帧展示

````carousel
![[预备/Anticipation] Weight loaded on back foot, lead shoulder pulled back, lead fist chambered near chin.](file:///C:/Users/tj169/.gemini/antigravity-cli/brain/f952f960-224f-4f89-b3f0-f2efbd83da63/jab_anticipation_1782116143979.jpg)
<!-- slide -->
![[命中/Contact] Lead arm straight at target, hips rotated, weight shifted forward, rear heel lifted.](file:///C:/Users/tj169/.gemini/antigravity-cli/brain/f952f960-224f-4f89-b3f0-f2efbd83da63/jab_contact_1782116183582.jpg)
<!-- slide -->
![[过头/Follow-through] Fist just past target line, torso slightly over-rotated, beginning to retract.](file:///C:/Users/tj169/.gemini/antigravity-cli/brain/f952f960-224f-4f89-b3f0-f2efbd83da63/jab_followthrough_1782116203011.jpg)
````

---

## 2. SVG 骨骼骨架层级设计建议

为了使 SVG 动画的过渡更自然、更易于控制，强烈建议使用**层级嵌套结构**（Hierarchical Grouping）。在正侧面（Profile View）视角下，您可以将各个肢体组件放置在嵌套的 `<g>` 标签中，并通过控制各自相对于关节节点的 `transform="rotate(...)"` 来还原上述三帧。

### 骨骼层级推荐结构：
```xml
<svg viewBox="0 0 800 600" width="100%" height="100%">
  <!-- 背景：纯色绿色 #00b140 -->
  <rect width="800" height="600" fill="#00b140" />

  <!-- 角色根节点 (控制全局位移与重心变化) -->
  <g id="character-root" transform="translate(400, 450)">
    
    <!-- 1. 骨盆/臀部 (Hips - 动作的发力核心) -->
    <g id="hips" transform="rotate(0)">
      <ellipse cx="0" cy="0" rx="20" ry="15" fill="#c2a685" />
      
      <!-- 1.1 后腿 (Right Leg - 侧面透视在较里层) -->
      <g id="rear-thigh" transform="translate(-10, 10) rotate(15)">
        <line x1="0" y1="0" x2="-20" y2="60" stroke="#a08565" stroke-width="12" stroke-linecap="round" />
        <g id="rear-shin" transform="translate(-20, 60) rotate(-20)">
          <line x1="0" y1="0" x2="-10" y2="70" stroke="#a08565" stroke-width="10" stroke-linecap="round" />
          <path id="rear-foot" d="M-10,70 L10,80 L-20,80 Z" fill="#7a6245" />
        </g>
      </g>

      <!-- 1.2 前腿 (Left Leg - 侧面透视在较外层) -->
      <g id="lead-thigh" transform="translate(10, 10) rotate(-10)">
        <line x1="0" y1="0" x2="15" y2="60" stroke="#c2a685" stroke-width="14" stroke-linecap="round" />
        <g id="lead-shin" transform="translate(15, 60) rotate(15)">
          <line x1="0" y1="0" x2="5" y2="70" stroke="#c2a685" stroke-width="12" stroke-linecap="round" />
          <path id="lead-foot" d="M5,70 L30,75 L0,75 Z" fill="#8c7356" />
        </g>
      </g>

      <!-- 2. 躯干/胸腔 (Torso/Chest) -->
      <g id="torso" transform="translate(0, -60) rotate(0)">
        <path d="M-20,0 L20,0 L25,-70 L-15,-70 Z" fill="#c2a685" />
        
        <!-- 2.1 头部 (Head) -->
        <g id="head" transform="translate(5, -85) rotate(-5)">
          <circle cx="0" cy="0" r="18" fill="#d4b998" />
          <ellipse cx="5" cy="5" rx="4" ry="6" fill="#a08565" /> <!-- 模拟下巴/面部朝向 -->
        </g>

        <!-- 2.2 后手臂 (Right Arm - 里侧) -->
        <g id="rear-shoulder" transform="translate(-15, -60) rotate(45)">
          <line x1="0" y1="0" x2="-20" y2="35" stroke="#a08565" stroke-width="10" stroke-linecap="round" />
          <g id="rear-forearm" transform="translate(-20, 35) rotate(-60)">
            <line x1="0" y1="0" x2="0" y2="40" stroke="#a08565" stroke-width="8" stroke-linecap="round" />
            <circle cx="0" cy="40" r="7" fill="#7a6245" /> <!-- 后拳 -->
          </g>
        </g>

        <!-- 2.3 前手臂 (Left Arm - 外侧，出拳手) -->
        <g id="lead-shoulder" transform="translate(15, -60) rotate(-45)">
          <line x1="0" y1="0" x2="10" y2="35" stroke="#c2a685" stroke-width="12" stroke-linecap="round" />
          <g id="lead-forearm" transform="translate(10, 35) rotate(90)">
            <line x1="0" y1="0" x2="0" y2="45" stroke="#c2a685" stroke-width="10" stroke-linecap="round" />
            <circle cx="0" cy="45" r="9" fill="#8c7356" /> <!-- 前拳 -->
          </g>
        </g>

      </g> <!-- end torso -->
    </g> <!-- end hips -->
  </g> <!-- end character-root -->
</svg>
```

---

## 3. 三个极限帧的骨骼变换参数（SVG/CSS Transform）对比

您可以使用以下推荐的旋转角和位移，应用到上面的骨骼树上：

| 骨骼节点 | 预备阶段 (Anticipation) | 命中阶段 (Contact) | 过头阶段 (Follow-through) |
| :--- | :--- | :--- | :--- |
| **`character-root`** | `translate(380px, 455px)` (重心后移且降低) | `translate(440px, 445px)` (向前冲刺，重心略升/持平) | `translate(450px, 448px)` (惯性前伸，开始回收) |
| **`hips`** | `rotate(15deg)` (骨盆向后卷曲扣紧) | `rotate(-25deg)` (胯部强烈向前旋转送胯) | `rotate(-30deg)` (胯部惯性转动到极限) |
| **`torso`** | `rotate(10deg)` (上身含胸收肩) | `rotate(-15deg)` (肩膀随着出拳向前递出) | `rotate(-20deg)` (上身惯性前倾过头) |
| **`lead-shoulder`** | `rotate(60deg)` (大臂后撤收缩) | `rotate(-80deg)` (大臂平举指向目标) | `rotate(-85deg)` (肩部极致送出) |
| **`lead-forearm`** | `rotate(100deg)` (小臂贴近下巴防守) | `rotate(0deg)` (手臂完全伸直，锁定) | `rotate(-5deg)` (手肘超伸/反向受力极限) |
| **`rear-thigh`** | `rotate(30deg)` (后腿弯曲蓄力) | `rotate(-10deg)` (后腿蹬地伸展) | `rotate(-5deg)` (后脚跟抬起，后腿拉直) |
| **`lead-thigh`** | `rotate(-25deg)` (前腿放松跨步) | `rotate(40deg)` (前腿支撑，膝盖前推吸收冲击) | `rotate(45deg)` (前腿完全承重受力) |

---

## 4. 关键帧动画过渡曲线建议 (CSS Keyframes)

在格斗动作中，**节奏（Timing / Spacing）**是还原打击感的关键。刺拳的物理特性是**“蓄力慢、出拳极快、命中瞬间定格有冲击力、回收迅速”**。

建议使用以下非对称的 CSS 关键帧和贝塞尔曲线 (Cubic Bezier)：

```css
@keyframes boxing-jab {
  /* 0% - 35%: 蓄力预备 (Anticipation) - 慢速后撤 */
  0% {
    /* 初始站立姿势 */
    transform: translate(400px, 450px);
  }
  35% {
    /* 预备极限：对应第一帧 [Anticipation] */
    transform: translate(380px, 455px);
    animation-timing-function: cubic-bezier(0.25, 1.5, 0.5, 1); /* 出拳爆发快弹 */
  }

  /* 35% - 42%: 出拳命中 (Contact) - 极速爆发，仅用约 7% 的时间 */
  42% {
    /* 击中时刻：对应第二帧 [Contact] */
    transform: translate(440px, 445px);
    animation-timing-function: cubic-bezier(0.1, 0.8, 0.3, 1); /* 过渡到过头缓冲 */
  }

  /* 42% - 47%: 过头与微小反弹 (Follow-through) - 惯性略微越过目标线 */
  47% {
    /* 过头极限：对应第三帧 [Follow-through] */
    transform: translate(450px, 448px);
    animation-timing-function: cubic-bezier(0.42, 0, 0.58, 1); /* 匀速回收 */
  }

  /* 47% - 80%: 快速收招归位 */
  80%, 100% {
    transform: translate(400px, 450px);
  }
}
```

> [!TIP]
> 1. **拉伸与挤压（Squash & Stretch）**：在 **Contact** 瞬间，可以微调大臂和小臂的 `scaleX(1.05)`，模拟由于极速出拳导致的视觉拉伸，这能显著增强打击质感。
> 2. **震动反馈（Hit Stop）**：在击中目标（42% - 45%）时，可以让 `character-root` 发生微小的 X 轴抖动，或者停留 2-3 帧不进行形变，从而模拟拳头撞击物体的阻力与冲击力。
