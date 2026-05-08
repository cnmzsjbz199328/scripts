# Hatch-Pet Scripts

A sprite-sheet generation pipeline that replicates the [OpenAI hatch-pet](https://github.com/openai/skills/tree/main/skills/.curated/hatch-pet) format.
Produces a **1728 × 1248 px atlas** (9 columns × 6 rows, 192 × 208 px per frame) with transparent background, ready for web animation.

---

## Prerequisites

- Node.js 18+
- `npm install` (installs `sharp`, `tsx`, TypeScript)

---

## Directory layout

```
scripts/
├── prepare.ts          # Initialise a pet run
├── process.ts          # Chroma-key + slice one animation row
├── assemble.ts         # Stitch rows into the final atlas
├── HATCH_PET_SKILL.md  # AI generation guide (prompts & style library)
├── package.json
└── pet_runs/           # Runtime output (gitignored)
    ├── preview.html    # Browser animation viewer
    ├── registry.js     # Auto-generated pet registry
    └── <PetName>/
        ├── manifest.json
        ├── reference/  # Locked appearance reference frames
        ├── rows/       # Per-animation extracted frames
        └── output/
            ├── spritesheet.webp
            └── pet.json
```

---

## Workflow

### 1 — Initialise

```bash
npx tsx scripts/prepare.ts <PetName>
```

Creates `pet_runs/<PetName>/` with the required directory tree and `manifest.json`.

### 2 — Generate a reference image (AI step)

Ask your AI model to generate a **single-frame, front-facing, full-body** sprite using the prompt from `HATCH_PET_SKILL.md`. Save the result locally, then process it:

```bash
npx tsx scripts/process.ts <PetName> reference path/to/reference.png
```

This locks the visual appearance used for all subsequent rows.

### 3 — Generate each animation row (AI step)

For each animation (see table below), generate a **3 × 3 grid image** (9 frames) using the prompts in `HATCH_PET_SKILL.md`, attaching the reference image as visual input. Then process it:

```bash
npx tsx scripts/process.ts <PetName> <row_name> path/to/grid.png
```

### 4 — Assemble the atlas

```bash
npx tsx scripts/assemble.ts <PetName>
```

Outputs `pet_runs/<PetName>/output/spritesheet.webp` and `pet.json`, and updates `pet_runs/registry.js`.

### 5 — Preview

Open `pet_runs/preview.html` in a browser. Select the pet from the dropdown to play all animations.

---

## Animation rows

| Row | Name | Description | Loop | FPS |
|-----|------|-------------|------|-----|
| 0 | `hatching` | Hatches from an egg | no | 8 |
| 1 | `jumping` | Jump and land | no | 8 |
| 2 | `running-left` | Run cycle to the left | yes | 8 |
| 3 | `attacking` | Wind-up → strike → recovery | no | 12 |
| 4 | `swift-to-people` | Transform into a human | no | 8 |
| 5 | `sleeping` | Curl up and sleep | yes | 8 |

---

## Visual styles

Specify a style when using the AI skill. Default is **ghibli**.

| Style | Trigger words | Character |
|-------|--------------|-----------|
| `ghibli` *(default)* | ghibli / 吉卜力 / 动漫 | Soft watercolor, expressive eyes, warm palette |
| `pixel` | pixel / 像素 / 复古 | Thick outlines, limited palette, flat cel shading |
| `cartoon` | cartoon / 卡通 | Bold outlines, flat bright colours, exaggerated expressions |

---

## Image requirements for AI generation

- **Background**: solid `#00FF00`
- **Grid separators**: thin solid dark-green lines `#006600`
- **Layout**: 3 × 3 grid (9 equal cells), character centred in each cell with a wide margin — never touching grid lines
- **Forbidden**: shadows, motion blur, speed lines, translucency, floor textures

---

## Atlas specification

| Property | Value |
|----------|-------|
| Frame size | 192 × 208 px |
| Columns | 9 |
| Rows | 6 |
| Atlas size | 1728 × 1248 px |
| Format | WebP, quality 90, transparent |
