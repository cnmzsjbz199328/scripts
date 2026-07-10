# WyrmsEnd（龙尽之途）— 背景图生成清单（分工：用户跑 agy，游戏侧自动接入）

> 共 **10 张**：5 段 ×（远景 far + 中景 mid）。
> **全部保存到 `assets/bg/raw/` 目录**（下面命令已写好绝对路径，整条复制即可运行）。
> 生成完成后告诉 Claude，或自己跑 `node game_runs/WyrmsEnd/tools/process-bg.mjs`——
> 它会把中景抠像（绿底→透明）、做左右接缝验收，产出最终文件到 `assets/bg/`。
> **没有图游戏也能跑**（程序化降级背景），图到位后自动替换，所以不阻塞开发。

## 命名与规格

| 文件（raw/） | 内容 | 尺寸 | 备注 |
|---|---|---|---|
| `seg1_far.png` … `seg5_far.png` | 各段远景（天空/地平线） | 1920×540 | 直接用，须横向无缝 |
| `seg1_mid.png` … `seg5_mid.png` | 各段中景剪影件 | 1920×540 | 纯绿底 #00FF00，供抠像 |

## 生成命令（逐条复制到终端运行）

> 若某张左右接缝明显（process-bg 会报告），重跑该条即可，提示词里的
> seamless 要求已包含；也可在句尾追加 "the leftmost and rightmost 100px must be identical"。

### 远景（far）

```bash
agy --dangerously-skip-permissions --add-dir "C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd" --print "Generate an image using your nano banana image tool and save the PNG to C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd/assets/bg/raw/seg1_far.png . Subject: warm amber dusk sky over rolling farmland hills, tiny village rooftops and one windmill silhouette on the far horizon, drifting seed particles in the air. Palette: warm amber, rose, deep umber silhouettes. Style: high-contrast silhouette art style, layered flat silhouette shapes, soft volumetric fog, muted gradient sky, moody cinematic LIMBO INSIDE aesthetic, minimal palette. CRITICAL: seamless horizontal tiling, left and right edges match perfectly, no unique landmark at the edges. Wide side-scrolling game background, distant scenery only, no ground-level foreground objects. Size 1920x540. No text, no letters, no watermark, no logo."
```

```bash
agy --dangerously-skip-permissions --add-dir "C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd" --print "Generate an image using your nano banana image tool and save the PNG to C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd/assets/bg/raw/seg2_far.png . Subject: overcast ash-grey sky, a distant line of burned forest and broken siege towers, thin smoke columns rising. Palette: desaturated grey-brown, cold ash tones, near-black silhouettes. Style: high-contrast silhouette art style, layered flat silhouette shapes, soft volumetric fog, muted gradient sky, moody cinematic LIMBO INSIDE aesthetic, minimal palette. CRITICAL: seamless horizontal tiling, left and right edges match perfectly, no unique landmark at the edges. Wide side-scrolling game background, distant scenery only, no ground-level foreground objects. Size 1920x540. No text, no letters, no watermark, no logo."
```

```bash
agy --dangerously-skip-permissions --add-dir "C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd" --print "Generate an image using your nano banana image tool and save the PNG to C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd/assets/bg/raw/seg3_far.png . Subject: cold blue-violet twilight, jagged mountain range in layered silhouettes, a long fortress wall snaking along a distant ridge. Palette: steel blue, indigo, near-black silhouettes. Style: high-contrast silhouette art style, layered flat silhouette shapes, soft volumetric fog, muted gradient sky, moody cinematic LIMBO INSIDE aesthetic, minimal palette. CRITICAL: seamless horizontal tiling, left and right edges match perfectly, no unique landmark at the edges. Wide side-scrolling game background, distant scenery only, no ground-level foreground objects. Size 1920x540. No text, no letters, no watermark, no logo."
```

```bash
agy --dangerously-skip-permissions --add-dir "C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd" --print "Generate an image using your nano banana image tool and save the PNG to C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd/assets/bg/raw/seg4_far.png . Subject: dark smoldering sky with ember glow along the horizon, bone-spire rock formations, a distant volcanic ridge cracked with faint orange light. Palette: near-black silhouettes over deep red and ember orange. Style: high-contrast silhouette art style, layered flat silhouette shapes, soft volumetric fog, muted gradient sky, moody cinematic LIMBO INSIDE aesthetic, minimal palette. CRITICAL: seamless horizontal tiling, left and right edges match perfectly, no unique landmark at the edges. Wide side-scrolling game background, distant scenery only, no ground-level foreground objects. Size 1920x540. No text, no letters, no watermark, no logo."
```

```bash
agy --dangerously-skip-permissions --add-dir "C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd" --print "Generate an image using your nano banana image tool and save the PNG to C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd/assets/bg/raw/seg5_far.png . Subject: cavernous darkness inside a colossal dragon lair, warm hoard-gold glow rising from below, arches of a gigantic dragon skeleton and hanging stalactites in silhouette. Palette: black silhouettes over molten gold and crimson. Style: high-contrast silhouette art style, layered flat silhouette shapes, soft volumetric fog, muted gradient glow, moody cinematic LIMBO INSIDE aesthetic, minimal palette. CRITICAL: seamless horizontal tiling, left and right edges match perfectly, no unique landmark at the edges. Wide side-scrolling game background, distant scenery only, no ground-level foreground objects. Size 1920x540. No text, no letters, no watermark, no logo."
```

### 中景（mid，纯绿底供抠像）

```bash
agy --dangerously-skip-permissions --add-dir "C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd" --print "Generate an image using your nano banana image tool and save the PNG to C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd/assets/bg/raw/seg1_mid.png . Subject: flat solid black silhouette shapes of wheat stalks, wooden fences, a small farmhouse and one leafless tree, all standing on a thin black ground strip along the bottom edge. Middle-ground layer for a side-scrolling game: varied heights and spacing, generous gaps of plain background between shapes. Background: solid pure green #00FF00 filling everything that is not silhouette, flat with no gradient, for chroma keying. CRITICAL: seamless horizontal tiling, left and right edges match perfectly. Size 1920x540. No text, no letters, no watermark, no logo."
```

```bash
agy --dangerously-skip-permissions --add-dir "C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd" --print "Generate an image using your nano banana image tool and save the PNG to C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd/assets/bg/raw/seg2_mid.png . Subject: flat solid black silhouette shapes of charred dead trees, broken pikes with torn banners and a wrecked cart, all standing on a thin black ground strip along the bottom edge. Middle-ground layer for a side-scrolling game: varied heights and spacing, generous gaps of plain background between shapes. Background: solid pure green #00FF00 filling everything that is not silhouette, flat with no gradient, for chroma keying. CRITICAL: seamless horizontal tiling, left and right edges match perfectly. Size 1920x540. No text, no letters, no watermark, no logo."
```

```bash
agy --dangerously-skip-permissions --add-dir "C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd" --print "Generate an image using your nano banana image tool and save the PNG to C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd/assets/bg/raw/seg3_mid.png . Subject: flat solid black silhouette shapes of fortress battlements, hanging chains and broken stone arches, all standing on a thin black ground strip along the bottom edge. Middle-ground layer for a side-scrolling game: varied heights and spacing, generous gaps of plain background between shapes. Background: solid pure green #00FF00 filling everything that is not silhouette, flat with no gradient, for chroma keying. CRITICAL: seamless horizontal tiling, left and right edges match perfectly. Size 1920x540. No text, no letters, no watermark, no logo."
```

```bash
agy --dangerously-skip-permissions --add-dir "C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd" --print "Generate an image using your nano banana image tool and save the PNG to C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/WyrmsEnd/assets/bg/raw/seg4_mid.png . Subject: flat solid black silhouette shapes of giant curved rib bones, obsidian shards and twisted thorn spires, all standing on a thin black ground strip along the bottom edge. Middle-ground layer for a side-scrolling game: varied heights and spacing, generous gaps of plain background between shapes. Background: solid pure green #00FF00 filling everything that is not silhouette, flat with no gradient, for chroma keying. CRITICAL: seamless horizontal tiling, left and right edges match perfectly. Size 1920x540. No text, no letters, no watermark, no logo."
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
