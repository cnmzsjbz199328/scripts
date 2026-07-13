# WyrmsEnd（龙尽之途）— 背景图生成清单（分工：用户跑 agy，游戏侧自动接入）

> 共 **10 张**：5 段 ×（远景 far + 中景 mid）。
> **全部保存到 `assets/bg/raw/` 目录**（下面命令已写好绝对路径，整条复制即可运行）。
> 生成完成后告诉 Claude，或自己跑 `node game_runs/WyrmsEnd/tools/process-bg.mjs`——
> 它会把中景抠像（绿底→透明）、做左右接缝验收，产出最终文件到 `assets/bg/`。
> **没有图游戏也能跑**（程序化降级背景），图到位后自动替换，所以不阻塞开发。

## 命名与规格

| 文件（raw/） | 内容 | 尺寸 | 备注 |
|---|---|---|---|
| `seg1_far.png` … `seg5_far.png` | 各段远景剪影带（山脊/地平线结构） | 1920×540 | 纯绿底 #00FF00，供抠像；天空由代码绘制 |
| `seg1_mid.png` … `seg5_mid.png` | 各段中景剪影件 | 1920×540 | 纯绿底 #00FF00，供抠像 |

## 生成命令（逐条复制到终端运行）

> **v2 架构：远景与中景一样走绿底抠像**。天空/雾/漂沙全部由游戏代码绘制
> （`Forge.ATMOS` 是气氛唯一真源），AI 图只供剪影形状——色调统一由代码保证，
> 图与图之间不再需要"碰运气对色"。首版整幅实景 far 图已废弃（process-bg 会
> 识别旧版并跳过）。
>
> 若某张左右接缝明显（process-bg 会报告），重跑该条即可；Margins 约束要求左右
> 150px 纯绿，本身就保证了平铺无缝，**重跑时不要删掉它**。

### 远景（far，v2：纯绿底剪影供抠像，天空由代码绘制）

```bash
agy --dangerously-skip-permissions --add-dir "C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd" --print "Generate an image using your nano banana image tool and save the PNG to C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd/assets/bg/raw/seg1_far.png . Subject: flat solid black silhouette shapes of a rolling farmland hill line, with tiny village rooftops, one windmill and a few slender trees standing on the ridge. Far-background layer for a side-scrolling game: two overlapping ridge lines with gently varied heights, the silhouette band fills roughly the lower half of the canvas, tallest shapes reach at most 60% of canvas height, everything anchored to the bottom edge with no floating pieces. Margins: no shapes within 150px of the left and right edges (left and right edges must be solid pure green #00FF00). Background: solid pure green #00FF00 filling everything that is not silhouette, flat with no gradient, for chroma keying. CRITICAL: seamless horizontal tiling, left and right edges match perfectly. Size 1920x540. No text, no letters, no watermark, no logo."
```

```bash
agy --dangerously-skip-permissions --add-dir "C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd" --print "Generate an image using your nano banana image tool and save the PNG to C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd/assets/bg/raw/seg2_far.png . Subject: flat solid black silhouette shapes of a burned forest treeline of bare charred trunks, two ruined siege towers and a few tilted broken pikes among them. Far-background layer for a side-scrolling game: one ragged treeline with varied trunk heights, the silhouette band fills roughly the lower half of the canvas, tallest shapes reach at most 60% of canvas height, everything anchored to the bottom edge with no floating pieces. Margins: no shapes within 150px of the left and right edges (left and right edges must be solid pure green #00FF00). Background: solid pure green #00FF00 filling everything that is not silhouette, flat with no gradient, for chroma keying. CRITICAL: seamless horizontal tiling, left and right edges match perfectly. Size 1920x540. No text, no letters, no watermark, no logo."
```

```bash
agy --dangerously-skip-permissions --add-dir "C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd" --print "Generate an image using your nano banana image tool and save the PNG to C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd/assets/bg/raw/seg3_far.png . Subject: flat solid black silhouette shapes of a jagged mountain range, with a long fortress wall and square watchtowers snaking along one ridge. Far-background layer for a side-scrolling game: two overlapping ridge lines with sharply varied peak heights, the silhouette band fills roughly the lower half of the canvas, tallest peaks reach at most 60% of canvas height, everything anchored to the bottom edge with no floating pieces. Margins: no shapes within 150px of the left and right edges (left and right edges must be solid pure green #00FF00). Background: solid pure green #00FF00 filling everything that is not silhouette, flat with no gradient, for chroma keying. CRITICAL: seamless horizontal tiling, left and right edges match perfectly. Size 1920x540. No text, no letters, no watermark, no logo."
```

```bash
agy --dangerously-skip-permissions --add-dir "C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd" --print "Generate an image using your nano banana image tool and save the PNG to C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd/assets/bg/raw/seg4_far.png . Subject: flat solid black silhouette shapes of giant curved rib bones and sharp bone spires rising from a cracked volcanic ridge line. Far-background layer for a side-scrolling game: one low ridge line with scattered tall bone arches of varied heights, the silhouette band fills roughly the lower half of the canvas, tallest shapes reach at most 60% of canvas height, everything anchored to the bottom edge with no floating pieces. Margins: no shapes within 150px of the left and right edges (left and right edges must be solid pure green #00FF00). Background: solid pure green #00FF00 filling everything that is not silhouette, flat with no gradient, for chroma keying. CRITICAL: seamless horizontal tiling, left and right edges match perfectly. Size 1920x540. No text, no letters, no watermark, no logo."
```

```bash
agy --dangerously-skip-permissions --add-dir "C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd" --print "Generate an image using your nano banana image tool and save the PNG to C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd/assets/bg/raw/seg5_far.png . Subject: flat solid black silhouette shapes of the inside of a colossal dragon lair: gigantic dragon skeleton rib arches and broken columns rising from the cave floor at the bottom, and a fringe of stalactites hanging down from the cave ceiling at the top. Far-background layer for a side-scrolling game: floor shapes anchored to the bottom edge filling roughly the lower half of the canvas, stalactites anchored to the top edge reaching down at most 25% of canvas height, generous open gap of plain background between ceiling and floor shapes, no floating pieces. Margins: no shapes within 150px of the left and right edges (left and right edges must be solid pure green #00FF00). Background: solid pure green #00FF00 filling everything that is not silhouette, flat with no gradient, for chroma keying. CRITICAL: seamless horizontal tiling, left and right edges match perfectly. Size 1920x540. No text, no letters, no watermark, no logo."
```

### 中景（mid，纯绿底供抠像）

```bash
agy --dangerously-skip-permissions --add-dir "C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd" --print "Generate an image using your nano banana image tool and save the PNG to C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd/assets/bg/raw/seg1_mid.png . Subject: flat solid black silhouette shapes of wheat stalks, wooden fences, a small farmhouse and one leafless tree, all standing on a thin black ground strip along the bottom edge. Middle-ground layer for a side-scrolling game: varied heights and spacing, generous gaps of plain background between shapes. Background: solid pure green #00FF00 filling everything that is not silhouette, flat with no gradient, for chroma keying. CRITICAL: seamless horizontal tiling, left and right edges match perfectly. Size 1920x540. No text, no letters, no watermark, no logo."
```

```bash
agy --dangerously-skip-permissions --add-dir "C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd" --print "Generate an image using your nano banana image tool and save the PNG to C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd/assets/bg/raw/seg2_mid.png . Subject: flat solid black silhouette shapes of charred dead trees, broken pikes with torn banners and a wrecked cart, all standing on a thin black ground strip along the bottom edge. Middle-ground layer for a side-scrolling game: varied heights and spacing, generous gaps of plain background between shapes. Background: solid pure green #00FF00 filling everything that is not silhouette, flat with no gradient, for chroma keying. CRITICAL: seamless horizontal tiling, left and right edges match perfectly. Size 1920x540. No text, no letters, no watermark, no logo."
```

```bash
agy --dangerously-skip-permissions --add-dir "C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd" --print "Generate an image using your nano banana image tool and save the PNG to C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd/assets/bg/raw/seg3_mid.png . Subject: flat dark steel-blue silhouettes (#1f2638) of scattered, isolated ruins of a mountain pass: a single broken stone arch, a solitary weathered column, and a lonely hanging chain hanging from an iron post. Middle-ground layer for a side-scrolling game: extremely sparse layout with only 3 isolated shapes spaced very far apart, massive open empty gaps of plain background between shapes accounting for 70% of the canvas width, standing on a very thin flat ground line at the bottom. Margins: no shapes within 120px of the left and right edges (left and right edges must be solid pure green #00FF00). Background: solid pure green #00FF00 filling everything that is not silhouette, flat with no gradient, for chroma keying. Style: high-contrast layered flat silhouette shapes, soft volumetric fog, moody cinematic LIMBO INSIDE aesthetic, minimal palette. Size 1920x540. No text, no letters, no watermark, no logo."
```

```bash
agy --dangerously-skip-permissions --add-dir "C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd" --print "Generate an image using your nano banana image tool and save the PNG to C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd/assets/bg/raw/seg4_mid.png . Subject: flat dark rust-brown silhouettes (#3a2018) of sparse, isolated remnants of a desolate battlefield: a single giant curved rib bone rising from the ground, a solitary sharp obsidian shard, and one thin twisted thorn spike. Middle-ground layer for a side-scrolling game: extremely sparse layout with only 3 isolated shapes spaced very far apart, massive open empty gaps of plain background between shapes accounting for 70% of the canvas width, standing on a very thin flat ground line at the bottom. Margins: no shapes within 120px of the left and right edges (left and right edges must be solid pure green #00FF00). Background: solid pure green #00FF00 filling everything that is not silhouette, flat with no gradient, for chroma keying. Style: high-contrast layered flat silhouette shapes, soft volumetric fog, moody cinematic LIMBO INSIDE aesthetic, minimal palette. Size 1920x540. No text, no letters, no watermark, no logo."
```

```bash
agy --dangerously-skip-permissions --add-dir "C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd" --print "Generate an image using your nano banana image tool and save the PNG to C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd/assets/bg/raw/seg5_mid.png . Subject: flat solid black silhouette shapes of mounds of treasure and coins, broken columns and swords embedded in the ground, all standing on a thin black ground strip along the bottom edge. Middle-ground layer for a side-scrolling game: varied heights and spacing, generous gaps of plain background between shapes. Background: solid pure green #00FF00 filling everything that is not silhouette, flat with no gradient, for chroma keying. CRITICAL: seamless horizontal tiling, left and right edges match perfectly. Size 1920x540. No text, no letters, no watermark, no logo."
```

## 段落对照（生成时无需关心，供回查）

| 段 | 名 | 基调 |
|---|---|---|
| 1 | 麦田村郊 | 人间黄昏，出发 |
| 2 | 焦土战场 | 战争灰烬 |
| 3 | 山隘要塞 | 冷蓝隘口 |
| 4 | 龙域骨原 | 暗红余烬 |
| 5 | 龙巢宝窟 | 金红终局 |
