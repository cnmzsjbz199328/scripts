# 剧本校验报告

生成时间：2026-11-09T06:42:54.109Z

- 模式：strict
- 节点：48
- 穷举状态：3359
- 可达完整路线：728
- 结局：8/8
- 全图剧本文字：8148 字符
- 最长路线：11.8 分钟
- 错误：0
- 警告：1

## 结局可达性与路线统计

| 结局 | 路线数 | 最少/最多选择 | 最短路线段落 | 字符 | 默认节奏时长 | 最短选项序列（1 起） |
|---|---:|---:|---:|---:|---:|---|
| E1 · 公道 | 80 | 9/10 | 95 | 3371 | 9.9 分钟 | a1_letter:1 → a1_road:1 → a1_dress:1 → a1_rain:1 → a1_home:1 → a1_market:1 → h_peek:1 → h_dao:1 → h_well:1 |
| E2 · 未度 | 240 | 9/10 | 95 | 3369 | 9.9 分钟 | a1_letter:1 → a1_road:1 → a1_dress:1 → a1_rain:1 → a1_home:1 → a1_market:1 → h_peek:1 → h_dao:2 → h_well:1 |
| E3 · 血债 | 320 | 9/10 | 95 | 3349 | 9.8 分钟 | a1_letter:1 → a1_road:1 → a1_dress:1 → a1_rain:1 → a1_home:1 → a1_market:1 → h_peek:1 → h_dao:1 → h_well:2 |
| E4 · 同心 | 32 | 8/8 | 102 | 3712 | 10.8 分钟 | a1_letter:1 → a1_road:1 → a1_dress:1 → a1_rain:1 → a1_home:2 → a1_market:1 → f_portrait:1 → f_well:1 |
| E5 · 黄泉 | 32 | 8/8 | 102 | 3707 | 10.8 分钟 | a1_letter:1 → a1_road:1 → a1_dress:1 → a1_rain:1 → a1_home:2 → a1_market:1 → f_portrait:1 → f_well:2 |
| E6 · 自卫 | 8 | 8/8 | 59 | 2049 | 6.0 分钟 | a1_letter:1 → a1_road:1 → a1_dress:2 → a1_rain:2 → a1_home:3 → a1_market:1 → l_peek:1 → l_flee:1 |
| E7 · 焚屋 | 8 | 8/8 | 64 | 2234 | 6.6 分钟 | a1_letter:1 → a1_road:1 → a1_dress:2 → a1_rain:2 → a1_home:3 → a1_market:1 → l_peek:1 → l_flee:2 |
| E8 · 替身 | 8 | 7/7 | 57 | 1986 | 5.8 分钟 | a1_letter:1 → a1_road:1 → a1_dress:2 → a1_rain:2 → a1_home:3 → a1_market:1 → l_peek:2 |

## 素材覆盖

尚未生成 manifest.js；P1A / G1 阶段按计划将缺图视为警告。P5 的 `--strict` 将校验所有被引用素材。

## 自检与错误

- ✅ 结构、出口、条件、可达性和选择密度均通过。

## 警告

- ⚠️ asset manifest not generated yet; asset coverage deferred until P3.

