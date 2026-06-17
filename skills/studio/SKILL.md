---
name: studio
description: 双 CLI 协作协议——定义 Claude（主管）与 agy（执行者）的角色边界、调用约定、交接门和版本控制规范。本 skill 是元协议层，不直接生成内容，被 game-gen / game-enhance / game-fix / game-verify 引用。
---

# Studio Skill（团队协作协议）

## 这是什么

本 skill 是整个创作流水线的**团队宪法**：定义谁做什么、怎么交接、如何保证质量。它不执行任何生成任务，而是让 game-gen / game-enhance / game-fix / game-verify 四条线都能在同一套协议下运行，像一个专业团队一样工作。

---

## 角色定义

| 角色 | 执行主体 | 职责 |
|------|---------|------|
| **主管（Supervisor）** | Claude | 任务拆解 · GDD 策划 · 交接审查 · bug 修复 · 叙事增强 · 验证解读 · 版本控制 |
| **执行者（Executor）** | agy（Google CLI）| 图像生成 · 游戏逻辑生成 · Phase 5 质量审阅 |
| **本地管线** | TypeScript 脚本 | 素材处理（抠图 / 拼图 / 注册）· 游戏组装 · 自动化验证 |

> **原则**：agy 负责从零生成（图像、逻辑）；Claude 负责判断、审查、修复和精炼。两者之间的所有交接都有明确的门控检查点。

---

## agy 调用约定

### 基本语法

```bash
agy --print "/<skill-name> [参数]"
```

`--print` 使 agy 以非交互模式运行，将输出写入标准输出，Claude 读取并审查。

### 常用调用场景

| 场景 | 命令 |
|------|------|
| 生成新游戏（0→1）| `agy --print "/game-gen [游戏描述]"` |
| Phase 5 质量审阅 | `agy --print "/game-gen review [GameName]"` |
| 重绘指定素材 | `agy --print "/game-gen redraw [GameName] [asset]"` |

### 解析输出

agy 输出为自然语言 + 可能的代码块。Claude 负责：
1. 读取 agy 的输出，判断执行是否成功
2. 提取生成的文件路径 / 关键决策
3. 若 agy 报告失败或输出不符合预期，**Claude 接管**该步骤直接实现

---

## 流水线角色映射

以 game-gen 为例，明确每个 Phase 的执行者：

```
Phase 0  GDD 策划             ← Claude（游戏策划师角色）
              │
              ▼
Phase 1  全景图生成            ← agy（Google Nano Banana）
              │
              ▼
Phase 2  多模态识图 → 素材清单  ← agy（Google 多模态）
              │   Claude 确认素材清单（门控）
              ▼
Phase 3A 素材图像生成           ← agy + 本地脚本
Phase 3B 游戏逻辑生成           ← agy（与 3A 并行）
              │
              ▼
Phase 4  游戏组装              ← 本地脚本（assemble.ts）
              │
              ▼
Phase 4.5 验证门               ← 本地脚本（verify.ts） + Claude 解读报告
              │   未全绿 → Claude 修复（game-fix）
              ▼
Phase 5  质量审阅              ← agy（Gemini 审阅）
              │   Claude 提交版本控制
              ▼
         git commit（按项目）  ← Claude
```

---

## 任务分派原则

### 什么任务交给 agy

- **0→1 图像生成**：全景图、素材贴图、角色精灵帧、游戏逻辑框架（game-gen Phase 1-3）
- **增强中的新素材生成**：game-enhance 的 VFX recipe 需要新序列帧时，由 agy 经共享管线（object-anim / material-texture / char-sprite）生成，Claude 负责代码集成
- **多模态理解**：从全景图推导素材清单（game-gen Phase 2）
- **批量审阅**：Phase 5 风格一致性、动画连贯性检查

### 什么任务由 Claude 直接实现

- **代码层增强**：game-enhance 中不涉及新素材的 recipe——叙事（narrative）、玩法（mechanics）、平衡（balance）对已有 `game-logic.js` 做定向修改
  - 原因：agy 的 `/game-gen` 是 0→1 生成器，无法对已有文件做精确局部编辑；强行让 agy 重写整个文件会丢失手工修复和已有增强
- **Bug 修复**：`game-fix` 流程——读报告、定位根因、最小改动——这是诊断性工作，需要上下文理解
- **验证报告解读**：verify.ts 输出结构化 JSON，Claude 判断根因并决定修复策略
- **版本控制**：所有 `git commit` 由 Claude 执行，保证提交信息语义准确

### game-enhance 的 recipe 分派速查

| Recipe | 需要新素材？ | agy 负责 | Claude 负责 |
|--------|-----------|---------|------------|
| 叙事（narrative）| 否 | — | 全部（修改 game-logic.js） |
| 玩法（mechanics）| 否 | — | 全部（修改 game-logic.js + 配置） |
| 视觉特效（VFX）| **是** | 序列帧生成（object-anim 管线）| 代码集成 + 深度/销毁逻辑 |
| 平衡（balance）| 否 | — | 全部（数值调参） |

---

## 交接门控（Handoff Gates）

每次角色切换前必须通过对应检查点：

| 交接点 | 发出方 → 接收方 | 门控条件 |
|--------|--------------|---------|
| Phase 2 结束 | agy → Claude | 素材清单完整、用户确认 |
| Phase 3 结束 | agy → 本地脚本 | 所有素材文件落盘、路径正确 |
| Phase 4 结束 | 本地脚本 → Claude | `index.html` 生成、游戏可在浏览器打开 |
| Phase 4.5 验证 | 本地脚本 → Claude | verify.ts 退出码 0（全绿）方可继续 |
| 增强/修复完成 | Claude → git | game-verify 全绿 + 截图人工核对 |

---

## 版本控制规范

每个完整工作项对应**一次独立提交**，不攒批提交：

```
game-gen:    feat(<GameName>): [游戏标题] — [一句话描述玩法]
game-enhance: enhance(<GameName>): [增强类型] — [具体内容]
game-fix:    fix(<GameName>): [修复的 bug 类型]
chore:       chore(<scope>): [基础设施/脚本/注册表变更]
```

提交范围与实际改动一一对应，便于回滚单项：

```bash
# ✅ 正确：每款游戏独立提交
git commit -m "enhance(PokePixel): 开场叙事面板 + 训练师台词"
git commit -m "enhance(NinjaStealth): 任务简报过场 + 滚轴发现文本"

# ❌ 错误：把多款游戏混进一次提交
git commit -m "enhance: 更新了几个游戏的故事内容"
```

---

## 冲突处理

| 情况 | 处理方式 |
|------|---------|
| agy 执行失败 / 超时 | Claude 接管该步骤直接实现，记录原因 |
| agy 输出与 GDD 不一致 | Claude 以 GDD 为准，发起重绘或手工修正 |
| verify 报红但根因不在 agy 输出 | Claude 用 game-fix 流程处理，不重新触发 agy |
| 需要对话历史作为上下文 | Claude 提炼关键决策写入 `gdd.json`，作为 agy 下次调用的输入 |

---

## 与其他 skill 的关系

```
studio（本 skill）
  └─ 协议层，被以下 skill 引用

game-gen     使用 studio 的角色映射（Phase 0-5 谁执行）
game-enhance 按 recipe 分派：VFX → agy 生成素材；叙事/玩法/平衡 → Claude 直接实现
game-fix     使用 studio 的版本控制规范 + 交接门控
game-verify  是 studio 门控检查点的技术实现

素材管线（material-texture / char-sprite / object-anim / hatch-pet）
  └─ 由 agy 触发（Phase 3A），本地脚本处理，Claude 审查结果
```
