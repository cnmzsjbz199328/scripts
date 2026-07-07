# ShadowForge 循环背景视频生成提示词

用途：为五章竞技场生成首尾帧一致、可无缝循环的动态背景视频。

## 核心技法

1. **首尾帧锁定**：用 `scene/panorama_*.png` 同一张图同时作为首帧和末帧
   （Kling 首尾帧 / Vidu / PixVerse / Runway keyframes），首尾一致由模型保证，
   提示词只描述中间的环境动态。
2. **镜头锁死**：no pan / no zoom / no parallax，否则末帧对不回首帧。
3. **只用往复式运动**：雾的呼吸、光的脉动、芦苇摇曳；禁单向平移（雾横飘、
   雪横吹会在循环点跳变）。粒子只允许"升起→淡出"这类自带生灭周期的。
4. **底部 20% 前景地面带完全静止**：那是战斗平台，角色点云站在上面。
5. **人物剪影显式声明 frozen/still**：半人马、溺魂、冰下亡魂——视频模型
   最易把小人形剪影动出畸变，宁可不动。
6. **亮度只增不减**：人物是黑色剪影，全靠人物身后那条亮雾/亮天带衬出动作。
   所有"光脉动"一律写成 brighter then returns，禁止 dimmer than the first
   frame；负面提示里封死 darkening/vignette/heavy shadows。

## 通用尾缀（拼在每条提示词后）

```
Static locked camera, no camera movement, no zoom, no pan. The bottom
foreground ground silhouette stays perfectly still. Keep the background
bright and luminous at all times — the scene must never become darker
than the first frame, because pitch-black silhouette characters fight
in front of it and need a pale luminous backdrop to stay readable.
Seamless loop: the final frame must exactly match the first frame, all
motion is gentle, cyclic and oscillating. 5 seconds, 2D game background,
subtle ambient motion only, nothing enters or leaves the frame.
```

## 通用负面提示

```
camera motion, zoom, pan, parallax, new objects appearing, characters
moving across frame, style change, color shift, brightness flicker,
overall darkening, dimming, heavy shadows, vignette, low-key lighting,
dark clouds covering the light, text, watermark, morphing silhouettes,
foreground movement
```

## 各章提示词

### Limbo（panorama_limbo.png · 灰白矢量剪影）

```
Flat vector silhouette art, pale grayscale dead forest with ruined
aqueduct bridges on a bright foggy plateau. The luminous mist filling
the valley slowly breathes — expanding and contracting like slow
exhalation, always staying bright silvery-grey. The pale glow behind
the horizon gently swells brighter then returns, never dimmer than the
base frame. Thin bare branch tips tremble almost imperceptibly. All
tree, ruin and rock silhouettes remain rigid and unchanged.
```

### Violence（panorama_violence.png · 血河暗红矢量剪影）

```
Flat vector silhouette art, glowing crimson dusk over the river
Phlegethon, the sky stays warmly lit throughout. The blood-red river
surface shimmers with faint slow glints. Heat haze rises subtly above
the water and fades. The red sky glow near the horizon swells brighter
then settles back, never darker than the base frame. Gnarled dead tree
silhouettes sway a few pixels in the wind and return. The three distant
centaur archer silhouettes on the ridge stay perfectly frozen.
```

### Wrath（panorama_wrath.png · 青绿沼泽矢量剪影）

```
Flat vector silhouette art, misty teal-green marsh of the Styx under a
bright hazy glow. Cattails and reeds sway gently side to side in a slow
rhythm. Faint concentric ripples spread on the pale swamp water and
dissolve. The luminous halo around the distant watchtower slowly swells
brighter then returns, the sky glow never dims below the base frame.
Low bright mist over the water thickens and thins in place. The drowning
souls' raised arms remain still, only trembling faintly.
```

### Fraud（panorama_fraud.png · 手绘石拱深渊）

⚠️ 原图整体偏暗，中景雾带亮度勉强。建议生成前先把原图整体提亮（或生成后
在引擎里给该章背景加提亮滤镜/在角色身后叠一条半透明亮雾带），提示词救不了
底图本身太暗的问题。

```
Painterly fantasy chasm with layers of broken stone arch bridges,
Malebolge, filled with bright silvery fog. The luminous grey fog deep
in the ravine slowly churns and breathes in place, staying bright. The
moonlit glow in the sky above swells brighter then eases back, never
darker than the base frame. Thin wisps of pale vapor rise between the
arches and dissolve before reaching the top. All rock and bridge
structures stay absolutely rigid.
```

### Betrayal（panorama_betrayal.png · 手绘冰湖）

```
Painterly frozen lake Cocytus surrounded by pale ice cliffs under a
bright cold moon, the whole scene lit in luminous icy blue-white. Fine
ice crystals sparkle intermittently across the cracked ice surface. Low
freezing bright mist drifts in place, swelling and thinning. The
moonlight through the clouds swells brighter then returns, never dimmer
than the base frame. Sparse snowflakes fall gently and fade before
landing. The damned souls frozen beneath the ice remain completely
motionless.
```

## 兜底：模型不支持首尾帧时

生成 6–8 秒，用 ffmpeg 把尾部 1 秒交叉淡入头部剪成循环：

```
ffmpeg -i in.mp4 -filter_complex "[0]split[a][b];[a]trim=0:5,setpts=PTS-STARTPTS[main];[b]trim=5:6,setpts=PTS-STARTPTS[tail];[main][tail]xfade=transition=fade:duration=1:offset=4" loop.mp4
```
