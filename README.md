# Learning / scripts — AI 素材生成 + 网页小游戏工作区

从早期的单一 hatch-pet 精灵图集流水线，演化为一组 AI 素材生成流水线 + 20 余个 Phaser 网页小游戏的工作区。核心循环：

**生成素材（`skills/`）→ 装配进游戏（`game_runs/`）→ 自动验证/试玩 → 部署 showreel（Cloudflare Pages）**

## 快速开始

```bash
npm install                                        # sharp / tsx / playwright / three
npx tsx skills/game-verify/verify.ts <Game>        # 验证某个游戏基本可玩
npx tsx skills/game-playtest/play.ts <Game>        # bot 自动通关 + 录屏
```

本地打开游戏：起个静态服务器（如 `python -m http.server`）访问 `game_runs/<Game>/index.html`，或直接打开 `game_runs/index.html` 进 showreel。

## 目录结构

| 目录 | 内容 |
|------|------|
| `skills/<name>/` | 各条流水线的脚本 + `SKILL.md`（**用法的唯一权威文档**） |
| `game_runs/` | Phaser 游戏，每目录一个；`_engine/` 共享引擎层；`MIGRATION.md` 架构样板 |
| `char_runs/` `pet_runs/` `object_runs/` `texture_runs/` `video_runs/` | 各流水线生成产物（大多 gitignored） |
| `assets_fbx/` | GLB/FBX 角色素材库（不入库；`inbox/` 待接入、`archive/` 已接入） |
| `references/` | 设计参考图与外部技能拷贝 |
| `scratch/` | 生成器工作区（源码入库，渲染产物不入） |

## 流水线一览（详见各自 SKILL.md）

- **游戏**：`game-gen`（生成）· `game-verify`（截图断言）· `game-playtest`（bot 通关 + 平衡体检）· `game-fix` / `game-enhance`
- **角色动画**：`glb-sprite`（3D 骨骼 → 剪影序列帧）· `svg-sprite`（参数化骨骼逐帧 SVG）· `char-sprite` · `hatch-pet`（9×6 图集）
- **环境/其他**：`svg-ambient`（背景动画元素工厂）· `object-anim` · `material-texture` · `video-sprite` · `studio`

npm scripts（`pet:*` `texture:*` `video:*` `object:*` `char:*` `game:*`）是常用流水线的快捷入口，见 `package.json`。

## 给 AI 协作者

架构约定、验证门、素材选型规则见根目录 `CLAUDE.md`；游戏架构细节见 `game_runs/MIGRATION.md`。
