# 游戏架构迁移模板（demo → 多关卡成熟态）

> 样板间已建成：**InkMechanics** 是第一个按此架构重构的游戏，可作为其余 21 个的参照。
> 目标：把「单文件巨型 Scene + 配置内联 + HUD 各抄一遍」拆成「共享引擎层 + 数据驱动 + 多场景」，
> 让模型每轮迭代不再被基本功能分散注意力，把注意力让给细节体验。

---

## 0. 现状的病根（为什么要迁移）

- 每个游戏 = **1 个 `game/game-logic.js` + 1 个 Phaser Scene**，最大的 2515 行 / 85KB。
- `entities.json / tilemap.json / game-config.json` **从没被任何游戏加载**（全局无 `fetch`）——数据驱动只剩空壳。
- `GameHUD` 在 **22 个 index.html 里各复制一遍**，改体验要改 22 处。

---

## 0.5 设计原则：即开即玩，不做选择负担

这些是**嵌在 showreel iframe、一坐通关 10–30min 的网页街机**，不是付费产品。
成熟度＝**当下手感与清晰度**，不是菜单和存档。据此**默认不做**以下「伪成熟」系统：

- ❌ **存档（localStorage）**：一坐通关无需持久化。
- ❌ **关卡选择菜单 + 解锁门禁**：无存档则星级/解锁无意义，落到一屏锁卡是纯摩擦。
  START → 直接进第 1 关 → 五关线性 → 通关。
- ❌ **星级收藏 / 累计**：要有意义需「存档 + 可重玩入口」，两者都没有 → 双重失效。
- ❌ **多选项暂停菜单**：用浏览器/Phaser 默认的失焦自动暂停（无 UI）即可；重试用 R 键。

✅ **保留**：单关即时反馈（折进过关卡，一行字，不存档）、廉价 juice、音效（单键 M 静音）、
`prefers-reduced-motion`、每关叙事卡。**精装修预算 100% 投在手感，不投在导航面。**

## 1. 目标目录结构

```
game_runs/
  _engine/                  ★共享层（所有游戏共用同一份，改一次全受益）
    hud.js                  GameHUD 契约（原内联在每个 index.html）
    audio.js                WebAudio 程序化音效（零素材）
  <Game>/
    index.html              瘦身：#game-container + DOM 遮罩 + 按序 <script>
    game/
      config.js             常量/配色/调参 → window.<NS>.Config
      levels.js             关卡数据 → window.<NS>.LEVELS（脱离逻辑）
      physics.js / systems/ 玩法系统（战斗/AI/物理…），接收显式状态、返回事件
      render.js             绘制
      scenes/
        BootScene.js        画底 + START → 直接开第1关（无菜单/无存档）
        LevelScene.js       玩法本体（原巨型 Scene，瘦身后 <250 行/关）
      main.js               控制器 + Phaser 装配 + __probe/__gameState 契约
```

`<NS>` = 每个游戏一个命名空间全局（InkMechanics 用 `window.Ink`），避免多游戏脚本互相污染。

---

## 2. 加载方式（已踩过的坑）

- **用按序 `<script>` 标签 + 命名空间，不用 ES module。** 零基础设施，`file://`（verify 截图）和 Cloudflare 都能跑。
- **顺序必须是依赖序**：`_engine/*` → `config` → `levels` → `systems/physics/render` → `scenes/*` → `main`。
  `levels.js` 读 `Config`，`scenes` 读全部，`main` 引用各 Scene 类——顺序错了就是 `undefined`。
- 关卡数据放 `levels.js`（JS 对象），**不强行 `fetch(json)`**（避免 file:// 的 CORS）。
  可选：让 `_build.js` 反向把 `levels.js` 导出成规范 `levels.json`，给那些死掉的脚手架 json 一个真实 schema。

---

## 3. 必须保住的契约（回归安全网）

迁移**不能改动**这些对外接口，否则 playtest bot / verify 截图会挂：

- `window.__probe()` 返回字段集合（`x,y,score,goalScore,won,lost,started,mode,hp,maxHp,phase…`）保持不变。
- `window.__gameState.player` 指向角色/主体对象。
- `window.__advanceCard()`、`window.__hudStart()`。
- `?autostart` 与 `navigator.webdriver`（bot）→ **跳过菜单直接进第 1 关**，保证「截到玩法」「bot 能自动通关」。

> 把 `__probe` 等做成「委派到当前活动 Scene」（见 InkMechanics `main.js` 的 `Ink.Game.probe()`），
> 菜单态返回合法 stub，关卡态取 Scene 状态。

---

## 4. 把巨型 Scene 拆成系统时的高频坑

- **提取系统函数时，状态字段名要对齐。** InkMechanics 实测：physics 读 `state.t` 但 Scene 字段叫 `_t` →
  `undefined` → 旋转杠杆角度 `NaN` → 水滴 NaN → 永不入井也不失败（软锁）。前 4 关无杠杆没暴露，第 5 关才炸。
  **教训：抽取后务必跑 bot 全关回归，NaN 主体在 `__probe` 里会显示成 `x:null`。**
- 系统函数让它**接收显式 state、返回事件**（如 `step()→'clear'|{fail}`），由 Scene 决定后果，
  系统本身不碰 HUD/场景 → 可单测、可复用。

---

## 5. 「精装修」清单（只投手感，不投导航面）

InkMechanics 已落地，可直接抄：

- [x] **打击感 juice**（入井顿帧 + 多层水花 + 轻微震屏 + 运动尾迹）
- [x] **音效**（`_engine/audio.js` WebAudio 合成，零素材；M 键静音，无菜单）
- [x] **单关即时反馈**（折进过关卡：「墨量精简 ✓ / 一次成功 ✓」一行字，不存档不累星）
- [x] **可访问性**（`prefers-reduced-motion` 关震屏/尾迹）
- [x] **失焦自动暂停**（Phaser 默认 `disableVisibilityChange:false`，无 UI）

> 故意不做（见 §0.5）：存档、选关菜单、星级收藏、多选项暂停菜单。

---

## 6. 迁移一个游戏的标准流程

1. 跑现有 bot + verify，**存基线**（通关证据 + 截图）。
2. 抽 `GameHUD` → 引 `../_engine/hud.js`（删 index.html 内联块）。
3. 平移拆分 `config/levels/systems/render`，**每搬一块跑一次 bot**。
4. Scene 化：Boot + Menu + Level；`__probe` 委派到 main 控制器。
5. 回归：bot 全关通过 + 人类路径（菜单/选关/暂停）零报错。
6. 按需勾选第 5 节精装修清单。

> 回归脚本范式：Playwright `file://` 打开 → `__hudStart()` → 轮询 `__probe()` 直到 `won/lost`；
> 人类路径用 `addInitScript` 把 `navigator.webdriver` 改 false 走菜单流程。
