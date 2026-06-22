# AmbientSVG: H5 游戏动态环境氛围库 (Ambient Environment Library)

AmbientSVG 是一套面向 H5 游戏和 Web 应用的轻量级、参数化、可交互的矢量氛围资产库。该库包含 **20 种常见环境氛围背景节点**，以满足各种游戏场景下的氛围构建。

---

## 📂 目录结构

*   [svg/](svg/)：包含所有经过优化的逐帧环境 SVG 资产文件。
*   [generator.mjs](generator.mjs)：用于在 Node.js 中以编程参数化方式重新渲染生成这 20 类、共 116 帧 SVG 图像的脚本。

---

## 🎨 20 个氛围场景资产列表

每个组件都使用了标准统一的 `viewBox="0 0 128 128"`，便于导入定位和按比例缩放而绝不裁切。

| 序号 | 氛围组件 (ID) | 帧数 | 默认帧率 (FPS) | 视觉特征与动画原理 |
|---|---|---|---|---|
| 1 | **windmill** (风车) | 6 | 10 | 扇叶围绕轴心进行 `transform: rotate` 循环。 |
| 2 | **tree** (摇曳树木) | 6 | 8 | 树干通过底端 `skewX` 摆动，树冠层级联动偏置。 |
| 3 | **streetlight** (路灯) | 4 | 6 | 黄色放射状光锥与灯芯的不透明度（opacity）做脉冲明灭。 |
| 4 | **campfire** (篝火火焰) | 6 | 12 | 多重叠火光多边形的高度和宽度交错缩放。 |
| 5 | **flag** (飘扬旗) | 8 | 12 | 旗面轮廓通过正弦相位偏移，模拟波浪状风吹效果。 |
| 6 | **rain** (下雨) | 4 | 12 | 细长斜向的雨滴笔刷进行垂直方向的重复位移。 |
| 7 | **snow** (下雪) | 6 | 10 | 雪花圆形粒子向下移动的同时进行左右正弦摇摆。 |
| 8 | **cloud** (流云) | 8 | 6 | 半透明大型层叠云朵沿水平方向的循环视差平移。 |
| 9 | **wave** (水波) | 6 | 8 | 深浅双层水流波浪曲线相向水平横移，创造流动立体感。 |
| 10 | **star** (星光闪烁) | 4 | 6 | 多个十字星芒星进行随机延迟的不透明度呼吸与缩放。 |
| 11 | **leaf** (落叶飘落) | 6 | 8 | 落叶多边形在飘落过程中做翻转旋转与斜向位移。 |
| 12 | **smoke** (烟囱烟雾) | 6 | 8 | 烟圈粒子向上飘动，在此期间不断变大并淡出。 |
| 13 | **bird** (飞鸟翱翔) | 4 | 8 | 极简双翼起伏形态（上折翼 -> 展平 -> 下折翼 -> 展平）循环。 |
| 14 | **neon** (霓虹灯招牌) | 4 | 4 | "LIVE" 文字与其外层发光滤镜边框的分步闪烁组合。 |
| 15 | **ray** (光斑/日冕) | 6 | 6 | 光源中心向外辐射的射线条的呼吸缩放。 |
| 16 | **bubble** (气泡上升) | 6 | 8 | 气泡在中空水流中垂直向上漂移，带有微弱水平摇摆。 |
| 17 | **lighthouse** (灯塔扫射) | 8 | 10 | 双向渐变光束以塔尖为中心，做周期性扇形摆动。 |
| 18 | **drip** (水滴与水波) | 8 | 10 | 水滴下坠伸长，在撞击底面后消失并泛起向外扩散的同心圆涟漪。 |
| 19 | **waterfall** (瀑布流水) | 6 | 10 | 水帘纵向位移流动，并在底端产生随机大小与高度的白色溅水泡。 |
| 20 | **wind** (风之轨迹) | 4 | 10 | 细长气流虚线快速掠过屏幕，模拟空气快速流经的效果。 |

---

## 🛠️ 集成与使用手册 (Phaser 3)

### 1. 资源预加载

在 Phaser 的 `Scene.preload()` 中，循环加载所需氛围组件的所有帧。为防止栅格化失真，需要显式指定宽高参数为 `128`：

```javascript
preload() {
  const element = { id: 'windmill', frames: 6 };
  for (let i = 0; i < element.frames; i++) {
    this.load.svg(
      `${element.id}_${i}`, 
      `assets/svg/${element.id}_${i}.svg`, 
      { width: 128, height: 128 }
    );
  }
}
```

### 2. 动画创建与播放

在 `Scene.create()` 中为组件创建 Phaser 动画序列帧并进行播放：

```javascript
create() {
  const element = { id: 'windmill', frames: 6, fps: 10 };
  
  this.anims.create({
    key: `anim_${element.id}`,
    frames: Array.from({ length: element.frames }, (_, i) => ({ key: `${element.id}_${i}` })),
    frameRate: element.fps,
    repeat: -1
  });

  const windmill = this.add.sprite(200, 200, `${element.id}_0`);
  windmill.play(`anim_${element.id}`);
  
  // 加入 Y-sort 深度排序池，防止角色穿模
  windmill.setDepth(1000 + windmill.y); 
}
```

### 3. CSS 变量与动态调校控制 (Web Components / DOM)

对于支持 inline SVG 或 HTML Overlay 的远景元素，该库的 SVG 支持开发者通过 CSS 变量动态调整动画速率或色彩，例如：

```css
:root {
  --wind-speed: 0.8s;        /* 控制风速 */
  --wind-direction: -1;      /* 控制风向翻转 */
  --lamp-glow: rgba(254, 240, 138, 0.8); /* 调控路灯光晕色 */
}
```

在 JS 中实现环境交互：
```javascript
// 当游戏进入暴风雨天气：
document.documentElement.style.setProperty('--wind-speed', '0.3s');
```
