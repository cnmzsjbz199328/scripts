# PaintedSkin 进度

当前阶段：P1A / G1 完成，进入 P4 占位装配。

## 阶段清单

- [x] P0：分支、目录骨架、剧本 JSON 入库例外（C0 / `ps-p0`）
- [x] P1A / G1：剧本与严格校验（C1 / `ps-g1-script`）
- [ ] P4：占位装配与自动播放运行时（C2 / `ps-p4-engine`）
- [ ] P1B / G2：概念图自检挑选（C3 / `ps-g2-concept`）
- [ ] P2 / G3：参考设定与风格锁定（C4 / `ps-g3-refs`）
- [ ] P3a：背景、CG、封面（C5）
- [ ] P3b / G4：立绘与抠图装配（C6 / `ps-g4-art`）
- [ ] P5 / G5：验证、八结局走查与自动播放回归（C7 / `ps-p5-verified`）
- [ ] P6：注册、预览视频、收尾（C8 / `ps-done`）

## 生成素材

尚未生成。出图原图保存在 `assets/**/raw/`，处理后的素材进入对应 assets 目录。

P1A：`painted-skin.json` / `build-story.mjs` 完成；生成 READ、LINT、USAGE 与 storyData.js。严格结构自检零错误，8 结局、728 路线可达，剧本文字 8148 字，选择 7–10 次/路线。素材覆盖按计划延后到 P3。

## 阻塞与续跑

无。工作分支为 `feat/painted-skin`；不推送、不合并。用户原有 `.claude/settings.json` 改动不纳入提交。
