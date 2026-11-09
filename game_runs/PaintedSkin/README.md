# 画皮 · PaintedSkin

《画皮》是一部自动播放的分支叙事游戏：对白和场景会自行推进，点击、空格或回车只会加快当前内容；只有剧情选择需要玩家决定。全篇有三条分支线和八个结局。

## 本地运行

在仓库根目录启动静态文件服务器：

```powershell
npx http-server -p 5500
```

浏览器打开：

```text
http://127.0.0.1:5500/game_runs/PaintedSkin/index.html
```

## URL 参数

- `?pace=1.3`：把自动播放速度调为默认值的 1.3 倍。有效倍率限制为 0.1–5；默认 `PACE` 按计划保留。
- `?node=f_portrait&vars=xin:0,dao:1&flags=hid_fear,letter_kept`：从指定节点开始，设置调试变量和旗标。
- `?fast`：测试用快速节奏。
- `?autostart`：跳过开始画面，供自动化走查使用。
- `?bot=0,1,0`：按顺序选择当前可见选项的零起始索引，供测试工具使用。

参数可以组合，例如：

```text
http://127.0.0.1:5500/game_runs/PaintedSkin/index.html?pace=1.3
```

## 校验与工具

```powershell
node game_runs/PaintedSkin/tools/build-story.mjs --strict
npx tsx skills/game-verify/verify.ts PaintedSkin --keys=SPACE,ENTER --seconds=6
node game_runs/PaintedSkin/tools/walk-endings.mjs
node game_runs/PaintedSkin/tools/record-preview.mjs
```

`walk-endings.mjs` 从 `story/LINT.md` 读取八条最短路线，检查结局、C5 心值选项条件和 60 秒无输入自动播放，并把本地截图及报告写入忽略目录 `playtest/walk/`。共享的 `skills/game-playtest/play.ts` 面向移动与战斗游戏，不适用于本作的叙事流程，因此由此工具替代。

`record-preview.mjs` 用 Playwright 录制、再用 FFmpeg 转码 10 秒预览到 `preview.mp4`。

## 目录

- `game/`：按序加载的运行时、剧情数据、场景和系统。
- `story/`：源剧本、阅读稿、路线与素材校验报告。
- `assets/bg/`、`assets/cg/`、`assets/lihui/`：运行时 WebP 与素材清单。
- `art/`：美术设定、提示摘要、自检选择和参考图。
- `tools/`：严格校验、素材处理、审查拼图、结局走查和预览录制脚本。
- `PROGRESS.md`：阶段与验证记录。
