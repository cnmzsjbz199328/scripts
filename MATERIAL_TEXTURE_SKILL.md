---
name: game-material-texture
description: 生成无缝平铺的纯反照率（Albedo）游戏材质贴图，支持 512x512/256x256 规格与本地平铺预览。
---

# Game Material Texture Skill

本技能旨在辅助生成符合现代游戏引擎要求的**无缝平铺纯反照率（Seamless Tileable Albedo）贴图**，避免美术资产在引擎落地时“翻车”（如接缝暴露、双重变暗等问题）。

---

## 启动规则

**使用本技能前，必须遵循以下贴图核心规格：**
1. **无缝平铺 (Seamless)**：最关键的要求。生成贴图必须能够进行四周无缝平铺（引擎中使用 `RepeatWrapping`）。
2. **正方形与 2 的幂**：输出文件应为 $512 \times 512$ 或 $256 \times 256$ 像素。
3. **纯反照率（Flat Diffuse/Albedo Only）**：必须是平光渲染，禁止烘焙任何投影、高光、明暗渐变或环境光遮蔽（Ambient Occlusion / AO）。引擎会自行叠加光照与 AO，贴图自带阴影会导致“双重变暗”。
4. **统一美术风格**：低饱和度、暖调色彩（如暖陶土、温润木质、灰石），风格化手绘质感。

---

## 自动化工具 (Local Tools)

- **初始化项目**：`npx tsx scripts/texture-prepare.ts <ProjectName>`
- **处理单张贴图**：`npx tsx scripts/texture-process.ts <ProjectName> <MaterialName> <image_path> [--suffix=<name>] [--size=512|256]`
- **整合并生成预览**：`npx tsx scripts/texture-assemble.ts <ProjectName>`

---

## 材质规格与覆盖格数对齐

为保证游戏世界中不同材质的缩放比例（密度）一致，材质贴图需严格对齐以下“覆盖格数”标准：

| 材质名称 | 游戏内覆盖格数 | 画面主体密度描述 | 用途说明 |
| :--- | :---: | :--- | :--- |
| **brick** | 1 格 | 约 3 层砖（weathered red-brown brick, 3 courses） | 基础墙面，下段砖墙 |
| **wood** | 3 格 | 长木板条，横向连续（long horizontal planks） | 木地板、木质结构 |
| **water** | 4 格 | 大波纹（calm blue-teal water, gentle ripples） | 水体表面 |
| **stone** | 2 格 | 中等粗糙天然石块纹理（rough grey stone） | 石质基座、岩石块 |
| **cobble** | 2 格 | 鹅卵石铺地，中等颗粒（grey cobblestone） | 道路、广场铺设 |
| **grass** | 2 格 | 短草坪，细密均匀（short lawn grass） | 地面植被覆盖 |
| **leaves** | 2 格 | 茂密绿叶，中等密度（dense foliage / hedge leaves） | 树冠、绿篱、灌木 |
| **sand** | 2 格 | 细沙与泥土混合，中等颗粒（fine beige packed sand） | 荒漠、路边沙地 |
| **plaster** *(新)* | 1 格 | 米白抹灰，极细微抹平纹理（off-white plaster） | **新材质**：配合 brick 实现下砖上抹灰墙面 |
| **slate** *(新)* | — | 深灰板岩瓦，横向叠瓦（overlapping slate roof shingles） | **新材质**：用于制作坡屋顶 |

---

## 统一后缀

在每次向 AI 生成贴图时，**必须**在材质描述后接上以下统一的后缀：
```text
, seamless tileable texture, flat-lay top-down orthographic, even flat diffuse lighting, no shadows no highlights no ambient occlusion, base-color/albedo only, matte, muted desaturated palette, stylized hand-painted game texture, 512x512
```

---

## 文生图提示词模板库 (Prompts Library)

请根据需要生成的材质类别，拼接对应的**主体描述**与**统一后缀**：

*   **brick (砖墙)**:
    `weathered red-brown brick wall, about 3 courses, thin light mortar lines, running bond`
*   **wood (木板)**:
    `warm light-brown wooden plank floorboards, long horizontal boards, subtle grain and seams`
*   **stone (石墙/石块)**:
    `rough grey natural stone surface, subtle mottled shading`
*   **cobble (鹅卵石路)**:
    `grey cobblestone paving, irregular rounded stones with mortar gaps`
*   **grass (草地)**:
    `short muted-green lawn grass, fine even speckle`
*   **leaves (树叶)**:
    `dense muted-green foliage / hedge leaves`
*   **sand (沙地)**:
    `fine beige packed sand and dirt, subtle grain`
*   **water (水面)**:
    `calm blue-teal water surface, gentle soft ripples`
*   **plaster (抹灰墙面)**:
    `smooth warm off-white painted plaster / stucco wall, very subtle texture`
*   **slate (石瓦屋顶)**:
    `dark desaturated grey slate roof shingles, overlapping horizontal rows`

---

## 执行工作流 (Step-by-Step)

### 1. 初始化项目
在终端运行准备脚本，初始化存放贴图的目录和清单文件：
```bash
npx tsx scripts/texture-prepare.ts MyGameTextures
```

### 2. 生成贴图变体（AI 绘图）
使用文生图工具，选择上述 Prompt 生成材质。
*   *建议*：为了保证在引擎中铺开时的接缝完全闭合，**请每次单独生成一张 (1x1) 无缝贴图**。
*   *差异命名*：如果为同一种材质生成了不同变体（例如不同颜色的木板、带青苔的鹅卵石），需要加后缀保存。

### 3. 处理并保存贴图
将 AI 生成的原始图片传入 `texture-process.ts` 脚本进行处理（缩放至标准尺寸、注册元数据等）：
```bash
# 处理基本款砖墙 (brick_base.png, 默认缩放到 512x512)
npx tsx scripts/texture-process.ts MyGameTextures brick path/to/albedo.png --suffix=base

# 处理青苔款砖墙 (brick_mossy.png)
npx tsx scripts/texture-process.ts MyGameTextures brick path/to/albedo_mossy.png --suffix=mossy

# 处理小尺寸（256x256）的抹灰墙面 (plaster_base.png)
npx tsx scripts/texture-process.ts MyGameTextures plaster path/to/plaster.png --suffix=base --size=256
```

### 4. 整合并验证平铺效果
运行整合脚本：
```bash
npx tsx scripts/texture-assemble.ts MyGameTextures
```
该脚本将汇总所有处理完的材质贴图，并生成或更新 `texture_runs/MyGameTextures/preview.html` 本地网页。
在浏览器中打开此 `preview.html`，即可交互式地查看所有已导入的贴图，并对其进行平铺测试（例如调整平铺次数为 3x3, 5x5 等），直观验证接缝是否隐形、色彩风格是否和谐。
