# BladeTrinity Visual Assets & Sprite Pipeline Guide

This guide documents the directories, source materials, processed sprite sheets, and exact CLI commands for the three sword fighting schools (**Sword God / 剑神流**, **Water God / 水神流**, **North God / 北神流**) to ensure full reproducibility and ease of future integration.

---

## 1. Material & Deliverable Locations

All materials are organized to distinguish between source files, raw video clips, and final deliverables. Binary assets are git-ignored, while documentation and configurations are version-controlled.

```
Learning/scripts/
├── references/BladeTrinity/               <-- Local Raw Workspace (Git-Ignored)
│   ├── ref/                                <-- Source References
│   │   ├── Weixin Image_*.jpg              <-- Original WeChat reference files
│   │   ├── group.jpg                       <-- Unified group photo with separators
│   │   ├── ref_sword.png                   <-- Sliced costume (Sword)
│   │   ├── ref_water.png                   <-- Sliced costume (Water)
│   │   └── ref_north.png                   <-- Sliced costume (North)
│   └── clips/                              <-- AI-Generated raw input videos (12 files)
│       ├── sword_*.mp4
│       ├── water_*.mp4
│       └── north_*.mp4
│
├── video_runs/                            <-- Frame Extraction Temp Workspace
│   ├── sword/manifest.json                <-- Tracked manifest (Scale/fps config)
│   ├── water/manifest.json                <-- Tracked manifest (Scale/fps config)
│   └── north/manifest.json                <-- Tracked manifest (Scale/fps config)
│
└── game_runs/BladeTrinity/                <-- Game Deliverables (Local & Ignored)
    ├── PROMPTS.md                         <-- Tracked design prompts (Tracked)
    ├── README.md                          <-- Tracked guides and commands (Tracked)
    ├── group.jpg                          <-- Reference copy (Ignored)
    ├── ref_*.png                          <-- Sliced reference copies (Ignored)
    │
    ├── [sword|water|north].webp           <-- Flat deliverables (Ignored)
    ├── [sword|water|north].json           <-- Flat metadata (Ignored)
    └── assets/sprites/                    <-- Structured deliverables (Ignored)
        ├── [sword|water|north].webp        
        └── [sword|water|north].json
```

---

## 2. Git Version Control Status

To keep the repository clean and light, the following files are **tracked** or **ignored** according to [scripts/.gitignore](file:///C:/Users/tj169/Flinders/work/Learning/scripts/.gitignore):

* **Tracked Files (Version Controlled)**:
  * `game_runs/BladeTrinity/PROMPTS.md` (Design specifications)
  * `game_runs/BladeTrinity/README.md` (This document)
  * `video_runs/[sword|water|north]/manifest.json` (Scale parameters, frame count metadata, and configuration definitions)
* **Ignored Files (Local Only)**:
  * All raw videos (`references/BladeTrinity/clips/*.mp4`)
  * All reference images (`references/BladeTrinity/ref/*`, `game_runs/BladeTrinity/*.jpg`, `game_runs/BladeTrinity/*.png`)
  * Final spritesheet images and metadata (`game_runs/BladeTrinity/*.webp`, `game_runs/BladeTrinity/*.json`, `game_runs/BladeTrinity/assets/`)
  * Temporary animation frames (`video_runs/[sword|water|north]/animations/`)

---

## 3. Reprocessing & Reproducing Sprites

If you need to regenerate the spritesheets from the raw MP4 clips, execute the following commands in the workspace root:

### Step 1: Initialize the Runs
```bash
npx tsx skills/video-sprite/prepare.ts sword
npx tsx skills/video-sprite/prepare.ts water
npx tsx skills/video-sprite/prepare.ts north
```

### Step 2: Run processing
All character frames are aligned in **Anchor Mode (`--anchor`)** to prevent shifting and jittering. All clips share a unified scale of **`0.1422`** to ensure height and baseline matching.

#### A. Sword God (剑神流)
```bash
# Idle (Looping breathing, 0s-2s)
npx tsx skills/video-sprite/process.ts sword idle references/BladeTrinity/clips/sword_stance.mp4 --anchor --start=0.0 --end=2.0 --frames=16 --fps=8 --scale=0.1422

# Walk (Looping step, 2s-4s)
npx tsx skills/video-sprite/process.ts sword walk references/BladeTrinity/clips/sword_stance.mp4 --anchor --start=2.0 --end=4.0 --frames=16 --fps=8 --scale=0.1422

# Attack (Brutal slash, 0s-4s)
npx tsx skills/video-sprite/process.ts sword attack references/BladeTrinity/clips/sword_attack.mp4 --anchor --frames=20 --fps=5 --scale=0.1422 --no-loop

# Guard (Braced block, 0s-4s)
npx tsx skills/video-sprite/process.ts sword guard references/BladeTrinity/clips/sword_guard.mp4 --anchor --frames=20 --fps=5 --scale=0.1422 --no-loop

# Hurt (Staggered reaction, first 1s of hit)
npx tsx skills/video-sprite/process.ts sword hurt references/BladeTrinity/clips/sword_hit.mp4 --anchor --start=0.0 --end=1.0 --frames=8 --fps=8 --scale=0.1422 --no-loop

# Down (Knockdown fall, 0s-4s of hit)
npx tsx skills/video-sprite/process.ts sword down references/BladeTrinity/clips/sword_hit.mp4 --anchor --frames=20 --fps=5 --scale=0.1422 --no-loop
```

#### B. Water God (水神流)
```bash
# Idle (Looping breathing, 0s-2s)
npx tsx skills/video-sprite/process.ts water idle references/BladeTrinity/clips/water_stance.mp4 --anchor --start=0.0 --end=2.0 --frames=16 --fps=8 --scale=0.1422

# Walk (Looping glide, 2s-4s)
npx tsx skills/video-sprite/process.ts water walk references/BladeTrinity/clips/water_stance.mp4 --anchor --start=2.0 --end=4.0 --frames=16 --fps=8 --scale=0.1422

# Attack (Horizontal swing, 0s-4s)
npx tsx skills/video-sprite/process.ts water attack references/BladeTrinity/clips/water_attack.mp4 --anchor --frames=20 --fps=5 --scale=0.1422 --no-loop

# Guard (Yielding deflection parry, 0s-4s)
npx tsx skills/video-sprite/process.ts water guard references/BladeTrinity/clips/water_guard.mp4 --anchor --frames=20 --fps=5 --scale=0.1422 --no-loop

# Hurt (Staggered reaction, first 1s of hit)
npx tsx skills/video-sprite/process.ts water hurt references/BladeTrinity/clips/water_hit.mp4 --anchor --start=0.0 --end=1.0 --frames=8 --fps=8 --scale=0.1422 --no-loop

# Down (Knockdown fall, 0s-4s of hit)
npx tsx skills/video-sprite/process.ts water down references/BladeTrinity/clips/water_hit.mp4 --anchor --frames=20 --fps=5 --scale=0.1422 --no-loop
```

#### C. North God (北神流)
```bash
# Idle (Looping sway, 0s-2s)
npx tsx skills/video-sprite/process.ts north idle references/BladeTrinity/clips/north_stance.mp4 --anchor --start=0.0 --end=2.0 --frames=16 --fps=8 --scale=0.1422

# Walk (Looping irregular crawl, 2s-4s)
npx tsx skills/video-sprite/process.ts north walk references/BladeTrinity/clips/north_stance.mp4 --anchor --start=2.0 --end=4.0 --frames=16 --fps=8 --scale=0.1422

# Attack (Feint-to-stab, 0s-4s)
npx tsx skills/video-sprite/process.ts north attack references/BladeTrinity/clips/north_attack.mp4 --anchor --frames=20 --fps=5 --scale=0.1422 --no-loop

# Guard (Spin deflection, 0s-4s)
npx tsx skills/video-sprite/process.ts north guard references/BladeTrinity/clips/north_guard.mp4 --anchor --frames=20 --fps=5 --scale=0.1422 --no-loop

# Hurt (Staggered reaction, first 1s of hit)
npx tsx skills/video-sprite/process.ts north hurt references/BladeTrinity/clips/north_hit.mp4 --anchor --start=0.0 --end=1.0 --frames=8 --fps=8 --scale=0.1422 --no-loop

# Down (Knockdown fall, 0s-4s of hit)
npx tsx skills/video-sprite/process.ts north down references/BladeTrinity/clips/north_hit.mp4 --anchor --frames=20 --fps=5 --scale=0.1422 --no-loop
```

### Step 3: Assemble Spritesheets
```bash
npx tsx skills/video-sprite/assemble.ts sword
npx tsx skills/video-sprite/assemble.ts water
npx tsx skills/video-sprite/assemble.ts north
```
*Note: Copies of the final outputs are located inside `game_runs/BladeTrinity/` for convenience.*
