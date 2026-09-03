# 三招决胜人物形象与视频准备计划

状态：待执行

执行人：负责人物与视频素材的 agent

## 1. 目标

为“三招决胜”准备统一、可替换、可验证的人物图像和动态视频素材，并以项目现有的角色与视频流水线产出最终资源。

本计划独立于游戏玩法移植。素材 agent 不负责重新设计卡牌规则、战斗状态或游戏界面。

## 2. 执行前必须阅读

执行 agent 开始生产素材前，必须阅读：

- 根目录 `CLAUDE.md`。
- `README.md`。
- `skills/char-sprite/SKILL.md`。
- `skills/video-sprite/SKILL.md`。
- 如需参考角色动画规范，再阅读 `references/openai-hatch-pet/references/qa-rubric.md` 中适用的质量要求。

必须遵循流水线脚本和 manifest 规范，不手工切动画帧替代流水线。

## 3. 工作边界

### 必须完成

- 建立角色清单、命名规则和媒体映射。
- 准备普通角色、Joker、玩家和对手的基础形象。
- 准备优先级明确的动态素材。
- 通过 `char-sprite` 或 `video-sprite` 流水线处理和验证。
- 产出可以被 `game_runs/ThreeMoves/` 使用的最终资源和媒体注册表。
- 为缺失或加载失败的资源保留静态/占位回退方案。

### 不要做

- 不要修改 `game_runs/ThreeMoves/game/` 中的玩法代码。
- 不要修改 `game_runs/games.json`、根目录 `package.json` 或共享引擎。
- 不要为了凑数量制作 52 套完全不同的普通卡牌素材。
- 不要把未经验证的大尺寸源视频直接放入游戏页面。
- 不要使用来源不明、授权不清晰的外部角色素材。

## 4. 角色资产清单

### 普通角色

| ID | 显示名 | 优先级 |
|---|---|---|
| `Kishirika` | 奇希莉卡 | P0 |
| `Nanahoshi` | 七星静香 | P0 |
| `Eris` | 艾莉娜丽洁 | P0 |
| `Cliff` | 克里夫 | P0 |
| `Zanoba` | 扎诺巴 | P0 |
| `Paul` | 保罗 | P0 |
| `Ghislaine` | 基列奴 | P0 |
| `Ruijerd` | 瑞杰路德 | P0 |
| `Perugius` | 佩尔基乌斯 | P0 |
| `Sylphiette` | 希露菲叶特 | P0 |
| `Roxy` | 洛琪希 | P0 |
| `ErisGreyrat` | 艾莉丝 | P0 |
| `Rudeus` | 鲁迪乌斯 | P0 |

### 特殊角色与头像

| ID | 显示名 | 用途 | 优先级 |
|---|---|---|---|
| `Orsted` | 龙神奥尔斯帝德 | Dragon Joker | P0 |
| `Hitogami` | 人神 | Human Joker | P0 |
| `Adventurer` | 冒险者 | 玩家头像/身份 | P0 |
| `MistWanderer` | 迷雾旅人 | 对手头像/身份 | P0 |

角色 ID 只使用稳定的 ASCII 名称；中文显示名放入注册表，不要把显示名直接作为文件路径依赖。

## 5. 总体资产策略

普通牌采用：

```text
13 套基础角色素材
+ 4 种花色效果
+ 卡牌文字与点数
= 52 张可组合的普通卡
```

花色和动作的第一版优先使用程序化效果，不要求每个角色都制作四套独立视频：

- `spade`：攻击/斩击。
- `heart`：守护/结界。
- `diamond`：能力/爆发。
- `club`：特殊/奇袭。

这样可以先完成完整可玩的资源覆盖，再把精力投入重点角色的独立动作。

## 6. 分阶段产出

### P0：基础可用资源

- 13 个普通角色的统一基础形象。
- 龙神和人神的专属形象。
- 玩家和对手头像。
- 每个普通角色至少一个待机/登场循环。
- 基础花色特效：斩击、结界、爆发、奇袭。
- 卡牌缺失时的静态图和 CSS 首字母占位回退。

### P1：对局反馈资源

- 出牌揭示动画。
- 攻击、守护、能力、特殊四类动作。
- Joker 专属登场和结算动作。
- 胜利、失败、平局的短反馈动画。

### P2：重点角色精修

- 根据实际试玩反馈选择重点角色。
- 为重点角色制作更高质量的独立动作视频。
- 统一动作节奏、镜头距离和光照方向。

## 7. 视觉规范

生产前先形成一页简短的视觉规范，至少固定：

- 半身或全身构图标准。
- 角色在卡牌媒体槽中的安全区域。
- 面部可辨识尺寸。
- 背景透明或统一背景处理方式。
- 光照方向、轮廓光和阴影强度。
- 普通牌、龙神、人神的色彩区分。
- 4 种花色的叠加色和特效形状。
- 角色服装、发型、武器等身份特征。

卡牌媒体槽是竖向空间，基础形象建议采用约 3:4 的构图；具体精灵帧尺寸和切片方式以 `char-sprite` / `video-sprite` 的 SKILL.md 为准，不手工发明另一套规格。

## 8. 目录与命名

工作产物按现有仓库约定放置：

```text
char_runs/ThreeMoves/
  <Character>/
    source/
    output/
    manifest.json

video_runs/ThreeMoves/
  <ClipName>/
    source/
    manifest.json
    test.html
    animations/
    output/
```

最终可部署资源放置到：

```text
game_runs/ThreeMoves/assets/media/
  characters/
  jokers/
  avatars/
  effects/
  registry.js
```

推荐命名：

```text
<CharacterId>_base.webp
<CharacterId>_idle.webp
<CharacterId>_attack.webp
<CharacterId>_guard.webp
<CharacterId>_ability.webp
<CharacterId>_special.webp
<JokerId>_reveal.webp
<Suit>_effect.webp
```

素材生成目录中的中间帧可以按 `.gitignore` 规则保留为本地产物；最终游戏需要的图片、精灵图和注册表必须复制到 `game_runs/ThreeMoves/assets/media/`。

## 9. 处理流程

### 静态或 AI 角色图

1. 根据视觉规范生成或整理基础角色图。
2. 检查角色一致性、透明边缘和构图安全区。
3. 需要逐帧动画时，进入 `char-sprite` 流水线。
4. 运行流水线校验和预览，不手工裁帧。
5. 将验收后的成品复制到游戏媒体目录。

### 动态视频

1. 将原始视频保存在 `video_runs/ThreeMoves/<ClipName>/source/`。
2. 为每段视频填写 manifest：动作名、帧率、循环方式、裁切和缩放参数。
3. 使用 `video-sprite` 的 prepare/process/assemble 流程。
4. 使用生成的 `test.html` 检查透明处理、循环和主体位置。
5. 将最终可部署资源和映射注册到 `game_runs/ThreeMoves/assets/media/`。

## 10. 媒体注册接口

最终注册表应能被游戏以统一方式读取，建议提供：

```javascript
window.ThreeMovesMedia = {
  characters: {},
  jokers: {},
  avatars: {},
  effects: {},
  getCharacterMedia(characterId) {},
  getJokerMedia(jokerId) {},
  getSuitEffect(suit) {},
};
```

如果某资源不存在，注册接口必须返回 `null`，由游戏回退到占位图，而不是返回不存在的路径。

## 11. 资产验收标准

- [ ] 每个 P0 角色都有稳定 ID、显示名和来源记录。
- [ ] 普通角色的比例、光照和画面风格一致。
- [ ] 角色在卡牌尺寸下仍能辨认。
- [ ] 透明边缘没有明显绿边、黑边或残留背景。
- [ ] 动画连续帧中没有明显脸部、服装、武器漂移。
- [ ] 循环动画首尾衔接自然。
- [ ] 花色效果不会遮挡角色主体和卡牌文字。
- [ ] Joker 与普通角色有清晰的视觉区分。
- [ ] 移动端裁切和缩放后仍可用。
- [ ] 视频或动画加载失败时可以回退到静态图/占位图。
- [ ] 所有 manifest、测试页和最终文件路径一致。
- [ ] 没有未确认授权的外部素材。

## 12. 与移植 agent 的交接

素材 agent 完成后必须报告：

- 已完成的角色和动作清单。
- 最终资源目录和注册表路径。
- 每项资源的回退方案。
- 使用过的流水线命令及验证结果。
- 尚缺少的角色、视频或需要返工的素材。
- 任何需要游戏 agent 调整的媒体接口字段。

素材 agent 不应修改玩法代码。游戏 agent 只需加载 `ThreeMovesMedia`，即可逐步替换原有占位媒体。
