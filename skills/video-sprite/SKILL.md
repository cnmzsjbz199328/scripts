---
name: video-sprite
description: 将绿幕视频处理为透明背景序列帧并拼合为精灵图集。纯本地流程，无需 AI 生成图片。
---

# Video Sprite Skill

将一段或多段**绿幕背景视频**转换为标准格式的精灵图集（WebP + JSON 元数据）。

---

## 前置依赖

| 依赖 | 说明 |
|------|------|
| Node.js 18+ | 运行脚本 |
| `npm install` | 安装 `sharp`、`tsx` |
| **ffmpeg**（系统级） | 视频抽帧，须在 PATH 中可用 |

验证 ffmpeg 是否就绪：
```bash
ffmpeg -version
```

---

## 视频输入规范

| 要求 | 说明 |
|------|------|
| 背景色 | 纯绿色 `#00FF00`（标准绿幕） |
| 角色位置 | 每帧居中，不触碰画面边缘 |
| 帧率 | 任意，脚本内部统一以 15fps 抽帧再采样 |
| 格式 | ffmpeg 支持的任意格式（mp4、mov、webm 等） |
| 禁止 | 运动模糊、半透明特效、阴影、地板纹理 |

---

## 目录结构

```
video_runs/
└── <ProjectName>/
    ├── manifest.json          # 项目状态记录
    ├── animations/
    │   └── <AnimName>/        # 处理后的帧（192×208px，透明背景）
    │       ├── frame_0.png
    │       └── ...
    └── output/
        ├── spritesheet.webp   # 最终图集
        └── sprite.json        # 动画元数据
```

---

## 工作流（Step-by-Step）

### 1. 初始化项目

```bash
npx tsx video-prepare.ts <ProjectName>
```

创建 `video_runs/<ProjectName>/` 目录树和 `manifest.json`。

---

### 2. 处理每段视频动画

```bash
npx tsx video-process.ts <ProjectName> <AnimName> <video_path> [--fps=8] [--frames=9] [--no-loop] [--lock]
    [--start=1.0 --end=3.6] [--anchor] [--scale=0.325] [--extract-fps=24]
```

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `ProjectName` | 项目名称 | — |
| `AnimName` | 动画名（如 `running`、`idle`） | — |
| `video_path` | 视频文件路径 | — |
| `--fps=N` | 该动画在游戏中播放的帧率 | `8` |
| `--frames=N` | 从视频中采样的帧数 | `9` |
| `--no-loop` | 标记为非循环动画 | 默认循环 |
| `--lock` | **锁定高度/基线/中心**：跨全帧算统一 bbox 整体裁剪，不逐帧 trim | 默认关（逐帧 trim） |
| `--start=S --end=E` | 只处理视频的 `[S,E]` 秒区间（**一条多动作长视频按时间段切分**时用） | 整条视频 |
| `--extract-fps=N` | 抽帧帧率；分段精切时设为视频原生帧率（帧号 ↔ 秒换算：`t = idx/fps`） | `15` |
| `--anchor` | **锚点对齐模式**（AI 生成视频首选，见下） | 关 |
| `--scale=F` | 强制缩放系数，跨段复用保证多动作行同尺寸；不传时自动按本段最大 bbox 适配并打印 | 自动 |

> **`--lock` 何时用**：原地行走 / 原地跳跃等"角色不位移、要求脚底基线和整体高度稳定"的动作。
> 默认逐帧 trim 会把每帧按各自剪影框缩放居中，蹲下/抬手帧因剪影变形被单独放大或上下浮动 → 播放时角色忽大忽小、基线跳动。`--lock` 用同一裁剪框和同一缩放处理所有帧，脚底和高度天然锁死。
> 前提：源视频里角色本就居中、不横移、脚踩同一基线（见「视频输入规范」）。

### `--anchor` 锚点对齐模式（AI 生成视频首选）

针对 AI 视频的现实（角色会漂移、镜头锁定但画面有星点杂物、一条视频含多个动作段），比 trim/lock 多做三件事：

1. **小连通域清理**：抠图后抹掉面积 < 最大连通域 6% 的碎片（背景星点、呼气白团），否则它们会把 bbox 撑大、污染对齐。大型光效（变身漩涡、爪击刀光）不受影响。
2. **锚点对齐**：X 轴用 **alpha 加权质心**对齐格中心（对肢体伸展远比 bbox 中心稳定，横移被逐帧吸收）；Y 轴用**全段统一的源坐标基线**（全段最低点 → y=202，与 char-sprite 图集规格一致）——不逐帧压底边，抬脚/下蹲的真实纵向运动被保留，镜头锁定前提下无纵向抖动。
3. **全局统一缩放**：整段一个缩放系数，彻底消除帧间忽大忽小；超宽帧（光效）在格边裁切而不缩小主体。

**多段共尺寸套路**：先跑主体动作段（如 walk）让它自动算 scale（控制台会打印，也写进 manifest），其余段（idle/attack/morph）全部 `--scale=<同值>` 复用，保证所有行角色同高。

**分段时间来源**：人工看视频记录各动作起止（`秒:帧` 或十进制秒均可，换算成十进制秒传参）。循环动作（walk/run）不要整段全喂——先用 bbox 高度/面积随帧的振荡找出**一个完整步态周期**（极小值到极小值），只切那一个周期，首尾相位才能闭合成 loop。

**脚本内部流程：**
1. 调用 `ffmpeg` 以 15fps 抽取全部原始帧到临时目录
2. 从中均匀采样 `--frames` 帧
3. 对每帧做绿幕抠图（欧氏距离 ≤ 110）
4. 缩放居中到 192×208px：默认逐帧去透明边（trim）；`--lock` 时改用**跨帧统一 bbox** 整体裁剪
5. 保存为 `frame_N.png`，更新 `manifest.json`

**示例：**
```bash
# 处理一段跑步循环视频，取 9 帧，播放帧率 8fps
npx tsx video-process.ts MyHero running ./clips/run.mp4 --fps=8 --frames=9

# 处理一段攻击视频，取 12 帧，不循环
npx tsx video-process.ts MyHero attack ./clips/attack.mp4 --fps=12 --frames=12 --no-loop

# 处理一段待机视频，取 6 帧
npx tsx video-process.ts MyHero idle ./clips/idle.mp4 --fps=6 --frames=6

# 原地行走/跳跃：--lock 锁定脚底基线与整体高度，避免逐帧缩放跳动
npx tsx video-process.ts MyHero walk ./clips/walk.mp4 --fps=8 --frames=8 --lock
npx tsx video-process.ts MyHero jump ./clips/jump.mp4 --fps=10 --frames=6 --no-loop --lock
```

对每个动画重复执行此步骤。

---

### 3. 拼合图集

```bash
npx tsx video-assemble.ts <ProjectName>
```

- 读取 `manifest.json` 中所有 `status: "completed"` 的动画
- 所有行按最大帧数对齐（不足部分留透明）
- 输出 `spritesheet.webp`（质量 90，透明背景）和 `sprite.json`

---

## 输出规格

| 属性 | 值 |
|------|----|
| 单帧尺寸 | 192 × 208 px |
| 图集宽度 | 192 × max(frameCount) px |
| 图集高度 | 208 × 动画数量 px |
| 格式 | WebP，quality 90，透明通道 |

---

## sprite.json 结构示例

```json
{
  "name": "MyHero",
  "type": "video-sprite-v1",
  "dimensions": { "width": 1728, "height": 624 },
  "frameSize": { "width": 192, "height": 208 },
  "animations": {
    "running": { "row": 0, "frameCount": 9, "fps": 8, "loop": true },
    "attack":  { "row": 1, "frameCount": 12, "fps": 12, "loop": false },
    "idle":    { "row": 2, "frameCount": 6, "fps": 6, "loop": true }
  }
}
```

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 抠图后有绿色残边 | 视频压缩引入的 JPEG 色块 | `CHROMA_THRESHOLD` 可在 `video-process.ts` 中调整（默认 110） |
| 角色被裁切 | 原始视频角色超出画面 | 重新录制，确保角色四周有足够绿色边距 |
| ffmpeg 找不到 | 未安装或未加入 PATH | `winget install ffmpeg` / `brew install ffmpeg` |
| 抽取帧数过少 | 视频太短 | 降低 `--frames` 值，或延长视频时长 |
