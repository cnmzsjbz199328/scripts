# 画皮 PaintedSkin · 美术补充包：Q 版对白头像 + 动作 CG

> 交付对象：用户的出图 agent。本包只要求**出图并记录提示词**；抠图处理、剧本挂接、验证与提交由 Claude 完成。
> 日期：2026-11-09　分支：`feat/painted-skin`

## 0. 为什么要补图（用户 2026-11-09 的决定）

1. **人物要做动作时整体画进 CG，CG 期间不站立绘。** 引擎已实现：任何节点显示 CG 时立绘自动退场。原计划 D8 已按此修订。
2. **对白用 Q 版头像与旁白区分。** 引擎已实现：对白时对话框左侧显示 132×132 的头像窗、名牌和「」，旁白不显示。目前头像先用立绘裁出的头部顶替，等本包的 Q 版头像到位后替换。
3. 现有 CG `aftermath` 的关键物件银簪落在画面底部，被对话框挡住，需要重出。

## 1. 开工前必读

- `game_runs/PaintedSkin/art/ART_BIBLE.md`：画风、身份卡、色彩、禁令。**本包所有图都受它约束。**
- 身份锚：`game_runs/PaintedSkin/art/refs/rs_<角色>.webp`（wang / chen / nv / gui / dao / shen）。凡画到某角色，必须附上对应参考图。`gui` 须同时附 `rs_gui` 与 `rs_nv`。
- 风格锚：`art/refs/style_day.webp`、`art/refs/style_night.webp`。
- 场景构图参考：`game_runs/PaintedSkin/assets/bg/<场景>.webp`（每个 CG 条目都写明了用哪张）。

**硬性禁令（与原计划一致）**
- 无文字、书法、印章、题款、签名、水印。
- 恐怖间接呈现：不画伤口、破洞、内脏、断首、血腥。
- 禁止水平翻转；所有人物保持传统右衽（右压左）。
- 朱砂痣在女子（nv / gui）**她自己的左眼下**，即画面中观者的右侧。

## 2. 交付方式

| 类别 | 存放路径（已被 gitignore） | 文件名 |
|---|---|---|
| Q 版头像 | `game_runs/PaintedSkin/assets/avatar/raw/` | `<角色>_<表情>.png`，如 `chen_calm.png` |
| 动作 CG / 重出 CG | `game_runs/PaintedSkin/assets/cg/raw/` | `<cg_id>.png`，如 `road_meet.png`、`aftermath.png` |

- 每张图把最终使用的提示词、附带的参考图、重出次数和原因，追加到 `game_runs/PaintedSkin/art/PROMPTS.md`；取舍理由追加到 `art/SELECTION.md`。
- **不改代码、不改剧本、不提交 git。** 完成后告诉用户「补充包出图完成」，由 Claude 处理、挂接、验证并提交。
- 用户的 `.claude/settings.json` 有未提交改动，不要碰。

## 3. Q 版对白头像（17 张）

### 3.1 规格

- 1:1 正方形，1024×1024。
- **头肩胸像**：下边缘在胸口中部截断；头顶（含帽、冠、发簪）距上边缘约 6%；脸水平居中。
- **轻 Q 版**：五官简化、头和眼睛比立绘略大，但**不是二头身大头娃娃**。表情克制、真诚，适合一个哀伤的志怪故事。临终遗言、殉情遗言也要用这些头像，不能卖萌。
- 朝向：正面或微侧向画面右侧（头像窗在对话框左边，人物朝向正文），不得镜像。
- 背景：纯色、无渐变、无阴影、无边框。普通角色用纯绿 `#00FF00`，`gui` 用纯品红 `#FF00FF`。头像框由代码绘制，图里不要画框。

### 3.2 通用提示词模板

> Using the attached character reference sheet as the exact identity reference, draw a light semi-chibi (Q-version) head-and-shoulders avatar of {CHARACTER}. Soft simplified features with a slightly larger head and eyes than realistic proportions, but not super-deformed; restrained, sincere expression suited to a melancholic Chinese ghost story: {EXPRESSION}. Preserve {MARKERS}. Facing the viewer with a slight three-quarter turn toward the viewer's right, unmirrored, traditional right-over-left collar. Square 1:1 framing, head and shoulders only, cut at mid-chest by the bottom edge, top of the head including headwear about 6 percent below the top edge, face centered. Clean lineart, soft cel shading with light watercolor texture, muted guofeng palette matching the reference. Background: perfectly flat uniform solid pure RGB {SCREEN}, no gradient, no shadow, no border, no frame, no other objects. No text, no calligraphy, no seals, no watermark.

### 3.3 角色固定项

| 角色 | {CHARACTER} | {MARKERS} | {SCREEN} |
|---|---|---|---|
| wang 王生 | Wang Sheng, a gentle young Chinese scholar | the black square scholar's cap (fangjin), moon-white robe with indigo collar trim | green #00FF00 |
| chen 陈氏 | Lady Chen, a dignified young married woman | the neat married woman's bun with a silver hairpin, ochre-red jacket | green #00FF00 |
| nv 女子 | a breathtaking young woman about seventeen | the tiny red mole under her own left eye (viewer's right), one plain silver hairpin, pale lotus-pink and moon-white clothes | green #00FF00 |
| gui 鬼相 | the same young woman in her true ghost form | exactly the same face and the red mole under her own left eye, pale jade-green skin, dark hollow eyes, long loose black hair, faded water-stained lotus-pink clothes | **magenta #FF00FF** |
| dao 止水 | a lean wandering Taoist about fifty | the lotus crown with wooden pin, long thin beard, black-grey robe with yellow trim | green #00FF00 |
| shen 沈夫人 | Madam Shen, a gaunt wealthy mistress about fifty-five | heavy gold hairpins, dark purple brocade jacket, a rosary in her hand at the bottom edge | green #00FF00 |

### 3.4 清单（按剧本实际说话时的表情统计）

| 文件 | {EXPRESSION} | 用在 |
|---|---|---|
| `wang_calm` | a polite gentle smile, open and kind | a1_road、a1_study |
| `wang_fear` | eyes wide and shaken, lips parted, pale | f_confront |
| `wang_weak` | dying peacefully: eyes half-closed, a faint tender smile, very pale, cap slightly askew | f_last 临终遗言 |
| `chen_calm` | calm and steady, a hint of warmth | h_meet、h_shen |
| `chen_cold` | composed and cool, guarded eyes, lips pressed | a1_home |
| `chen_worry` | brows knit with quiet concern | h_wife |
| `chen_fear` | frightened but holding steady, tense jaw | h_flee |
| `chen_resolve` | firm and determined, chin slightly raised | h_help |
| `chen_remorse` | grief and remorse, tears on the lashes, eyes lowered | f_xunqing 殉情遗言 |
| `nv_pitiful` | fragile and timid, gaze lowered | a1_road |
| `nv_smile` | a soft charming smile with a trace of sadness | a1_study |
| `nv_love` | shy, longing, hopeful gaze | a1_rain、l_keep |
| `gui_sorrow` | sorrowful, eyes lowered, quiet | h_truth、l_stay |
| `gui_rage` | fierce anger, hair stirring wildly; frightening but no gore | f_flee |
| `dao_stern` | stern, sharp but weary eyes | a1_market、l_dao、f_well |
| `dao_angry` | angry, deep frown | f_truth |
| `shen_terror` | terrified, eyes wide, clutching the rosary | h_well、f_well |

### 3.5 自检

- 同一角色的几张头像，脸型、发型、配色与参考图一致。
- 朱砂痣位置正确（她的左眼下＝画面右侧）。
- 背景为纯色，边缘没有混入绿/品红。
- 无文字或类文字纹样。

## 4. 动作 CG（10 张新图 + 1 张重出）

### 4.1 规格与构图铁律

- 16:9，1280×720 或更大的同比例。画风使用 ART_BIBLE 的 `[INK]` 段落，附对应风格锚和场景图作构图参考。
- **对话框会盖住画面底部 26%（720 高里的 y≥530）。所有脸、手、关键物件都必须落在画面上方 70% 以内**，底部四分之一保持平静、少细节。`aftermath` 正是因为违反这一条才要重出。
- CG 里画到的人物必须附对应 `rs_` 参考图，身份标志物齐全。
- 引擎在 CG 期间不显示立绘，所以 CG 本身要能交代「谁在做什么」。

### 4.2 通用提示词尾句（每条 CG 提示词末尾都加上）

> Keep every face, hand and key object within the upper 70 percent of the frame; the bottom quarter must stay calm and low-detail because a dialogue box covers it. Characters must match the attached reference sheets exactly, unmirrored, traditional right-over-left collars. Horror stays indirect: no wounds, no gore. No text, no calligraphy, no seals, no signature, no watermark.

### 4.3 清单

**P1：共同主干，每位玩家都会看到（建议先做）**

| cg_id | 节点 | 附图 | 画面（英文提示词主体） |
|---|---|---|---|
| `road_meet` 雾中初遇 | a1_road | style_day、road_dawn、rs_nv、rs_wang | Early autumn mist on a country road outside Taiyuan at dawn. A young woman in pale lotus-pink walks alone, slowed by fatigue, a small cloth bundle held to her chest; she half turns back toward a young scholar a few steps behind her. Her gaze rests for an instant on his chest, quiet and unreadable. Distant grey-tiled village roofs emerge from the mist. |
| `mirror` 镜中青影 | a1_dress | style_day、study_in、rs_nv、rs_gui | A sunlit scholar's study in the morning. The young woman sits before a small round mirror, raising a hand to place a flower in her hair. In the mirror, faint and easy to miss, her reflection is a pale jade-green silhouette instead of her pink-clad self, and a thin crack runs across the glass; her other fingertip quietly presses on the crack. Subtle and eerie, not frightening. |
| `needle` 灯下停针 | a1_home | style_night、home_night、rs_chen | Night in the main hall by a single oil lamp. Lady Chen sits with unfinished embroidery on her lap; the needle has stopped mid-pull, thread taut, her fingers motionless while her eyes stay lowered. At the frame's edge, the moon-white sleeve of her husband who has just come home. Warm lamplight against cool indigo night. |
| `whisk` 赠拂尘 | a1_market | style_day、market、rs_dao、rs_wang | A busy daytime market street. The lean Taoist holds out his white horsetail fly-whisk toward the young scholar; the long white strands hang still like calm water while the crowd blurs around them. The scholar's hand is just reaching for it. |

**P2：分支里的关键动作**

| cg_id | 节点（线） | 附图 | 画面 |
|---|---|---|---|
| `jacket` 拢衣 | h_meet（坦诚线） | style_day、study_in、rs_chen、rs_nv | In the study, Lady Chen gently straightens the collar of a padded jacket she has just placed on the young woman's shoulders. The young woman keeps her eyes lowered, the jacket folded over her arm; Chen's other hand presses on her own sleeve. Two women, cautious and kind. |
| `lamp_walk` 提灯 | f_chen（妒线） | style_night、home_night、rs_chen | A rainy night corridor. Lady Chen walks alone holding a lantern high; her long shadow stretches across the wall ahead of her. Her face is set and unreadable. |
| `skin_touch` 触绢 | f_confront（妒线） | style_night、study_night、rs_wang、rs_chen | Night in the study. A life-size scroll painting of a woman lies unrolled on the desk. The scholar's fingertips have just touched the silk and are recoiling, his face pale, because it feels like warm skin. Lady Chen stands beside the desk holding a lamp, watching him. |
| `new_grave` 新坟 | h_justice（坦诚线·E1） | style_day、grave_dawn、rs_nv、rs_dao | A sunny hillside at dawn with a fresh burial mound. The young woman stands beside it in pale lotus-pink; the water stains on her sleeves are fading away like mist. Far behind, the Taoist watches, one hand resting on his fly-whisk. Peaceful, open sky. |
| `rosary` 断念珠 | h_blood（坦诚线·E3） | style_night、shen_well | Object only, no people: on wet mud beside an old stone well at night, a broken string of prayer beads lies scattered; one bead rolls toward the well's rim. A dropped corner of dark purple brocade at the frame's edge. Cold moonlight, utterly still. |
| `give_heart` 相予 | l_stay（色心线·E8） | style_night、study_night、rs_wang、rs_gui、rs_nv | Night in the study. The scholar stands with one hand pressed over his own heart, calm and willing. Facing him, the ghost woman in her true form looks at him with sorrow and gratitude. Between them, a faint warm thread of light. No wounds, no blood. |

**重出**

| cg_id | 节点 | 附图 | 要求 |
|---|---|---|---|
| `aftermath` 银簪与月色 | f_last | style_night、courtyard_night、rs_wang、rs_chen | 保持原构图意图（王生枕在妻子膝上，只露陈氏赭红袖和抚颊的手，月夜石径）。**银簪必须移到画面上方 70% 以内、清晰可见**，可放在他微张的手边或衣襟上，沾着井泥。原图记录见 `art/PROMPTS.md` 的 aftermath 条目。 |

### 4.4 自检

- 用 1280×720 看整图，挡住底部 26% 后，关键物件（银簪、拂尘、镜中青影、念珠）仍清楚可见。
- 人物身份标志物齐全，无镜像。
- 无文字或类文字纹样（符纸、书页最容易出伪文字）。

## 5. Claude 接手后的步骤（供参考，出图 agent 不用做）

1. `node game_runs/PaintedSkin/tools/process-art.mjs --only=avatar,cg`：抠图、归一化、写入 manifest。
2. 在 `story/painted-skin.json` 的 `cgs` 中登记新 CG，并给对应节点加 `"cg"`；运行 `build-story.mjs --strict`。
3. 截图核对头像与 CG，然后跑 verify、八结局走查，重录预览，提交。
