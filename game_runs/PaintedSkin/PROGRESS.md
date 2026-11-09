# PaintedSkin 进度

当前阶段：P6 完成（C8 / `ps-done`），本地交付完成。

## 阶段清单

- [x] P0：分支、目录骨架、剧本 JSON 入库例外（C0 / `ps-p0`）
- [x] P1A / G1：剧本与严格校验（C1 / `ps-g1-script`）
- [x] P4：占位装配与自动播放运行时（C2 / `ps-p4-engine`）
- [x] P1B / G2：22 张风格 / 角色候选图完成，拼图自检并按计划默认规则选定（C3 / `ps-g2-concept`）
- [x] P2 / G3：6 张人物参考设定、2 张风格锚、王生抠图融合测试通过（C4 / `ps-g3-refs`）
- [x] P3a：13 张背景、10 张事件 CG、1 张封面；处理为运行时 WebP 并完成拼图自检（C5）
- [x] P3b / G4：27 张立绘生成、自动抠图归一化、全量拼图与关键场景自检通过（C6 / `ps-g4-art`）
- [x] P5 / G5：严格构建、L0/L1/L2、八结局走查与自动播放回归通过（C7 / `ps-p5-verified`）
- [x] P6：注册、10 秒预览视频、README 与工具收尾（C8 / `ps-done`）

## 生成素材

P1B 共 22 张风格 / 角色概念 PNG 在 `assets/concept/raw/`（忽略）。P2 的 6 张参考设定和 2 张风格图原图在 `assets/refs/raw/`（忽略），审定 WebP 在 `art/refs/`；`wang_calm.webp` 已生成并通过自适应抠图和昼夜融合目检。P3a 已生成并处理 13 张背景、10 张事件 CG、1 张封面，共 24 张 1280×720 WebP；原图在忽略目录 `assets/bg/raw/` 与 `assets/cg/raw/`。背景和 CG 拼图逐张自检；第一次 `heart_wang` 因伪文字淘汰并重出，`well_bones` 骨弧非常淡，均记录于 `art/SELECTION.md`。

P1A：`painted-skin.json` / `build-story.mjs` 完成；生成 READ、LINT、USAGE 与 storyData.js。严格结构自检零错误，8 结局、728 路线可达，剧本文字 8148 字，选择 7–10 次/路线。截图复核发现补写的 60 段文字曾受命令行代码页影响变成问号，已通过 UTF-8 文件修复并重新生成剧本输出；再次扫描无整段问号文本。素材覆盖按计划延后到 P3。

P4：`game_runs/_engine/story.js` 与 PaintedSkin 页、场景、舞台、面板、特效已提交。`npx tsx skills/game-verify/verify.ts PaintedSkin --keys=SPACE,ENTER --seconds=6` 的 L0/L1/L2 全绿。`__probe / __gameState / __hudStart / __advanceCard / __advance / __choose / ?autostart / navigator.webdriver` 均已接入；缺图时用程序化占位，manifest 为空且无 404。

P3a：`tools/process-art.mjs --only=bg` 与 `--only=cg` 均完成，资源清单列出 13 背景和 11 CG/封面。`tools/make-background-review.mjs`、`tools/make-cg-review.mjs` 生成忽略的审查拼图。自检选择与重出理由见 `art/SELECTION.md`，输入与提示摘要见 `art/PROMPTS.md`。

P3b：27 张 9:16 立绘全部处理为 640×1100 WebP（脚底 y=1080），24 张绿底、3 张鬼相品红底；处理无报错并生成 `manifest.js`。`tools/make-lihui-review.mjs` 与 `tools/make-key-scenes-review.mjs` 生成忽略的全量拼图和 8 个运行时尺度关键场景合成。G4 自检通过；接受的细节备注见 `art/SELECTION.md`，所有输入、动作提示与重出记录见 `art/PROMPTS.md`。

P5 / G5：`node game_runs/PaintedSkin/tools/build-story.mjs --strict` 零错误、零警告，48 节点、728 条完整路线、8/8 结局可达，44/44 素材覆盖。`npx tsx skills/game-verify/verify.ts PaintedSkin --keys=SPACE,ENTER --seconds=6` 的 L0/L1/L2 全绿；L2 的可选坐标移动断言因本作没有 `player` 坐标而跳过，画面变化判定通过。仓库原缺 `tools/walk-endings.mjs`，现已补齐：八结局逐条走通、零控制台错误；`xin=29` 的 C5 显示两项，`xin=30` 显示三项；正常 PACE 无输入 60 秒推进 5 次并抵达首个选择点，非选择最长停顿 16.978 秒。78 张走查截图与 JSON 报告位于忽略目录 `playtest/walk/`。G5 采用计划默认 PACE，不调整；理由和待复核项见 `art/SELECTION.md`。

P6：新增本地试玩与工具说明 `README.md`，注册 `game_runs/games.json`；`tools/record-preview.mjs` 用 Playwright 录制并转码生成 H.264 `preview.mp4`（1280×720、25fps、10 秒）。视频从 a1_dress 切到 h_peek，片尾可见窥窗 CG 与两项选择；抽帧目检通过。脚本可重复生成预览，不保留原始 WebM。

## 阻塞与续跑

无。工作分支为 `feat/painted-skin`；不推送、不合并。用户原有 `.claude/settings.json` 改动不纳入提交。
