# 画皮 PaintedSkin · 美术补充包重出任务书（4 张重出 + 3 张 Q 版对比稿）

> **状态（2026-11-10）：已执行完毕。** 7 张均已出图并通过 Claude 复审，见 `art/SELECTION.md`「Claude 复审重出」。Q 版对比稿待用户二选一。

> 交付对象：用户的出图 agent。日期：2026-11-10。分支：`feat/painted-skin`。
> 背景：Claude 审查补充包时发现 3 张不合格，追查后又牵出 1 张已在游戏里的背景。审查结论见 `game_runs/PaintedSkin/art/SELECTION.md` 末节。

## 0. 规则（同上一轮）

- **只出图并记录提示词。不改代码、不改剧本、不碰 `.claude/settings.json`、不提交 git、不抠图。**
- **旧图先挪走再出新图**：把旧原图移到同目录的 `_v1/` 子文件夹（例如 `assets/cg/raw/_v1/rosary.png`），新图用原文件名保存。**不要在 `raw/` 里留 `rosary_old.png`、`chen_resolve.v1.png` 这类同级文件**，处理脚本会把它们当成新素材，头像还会直接报错。第 5–7 项的 Q 版对比稿同理，一律放进 `assets/avatar/raw/_q/` 子文件夹。
- 硬性禁令不变：无文字、书法、印章、签名、水印；不镜像；人物右衽；恐怖间接。
- 每张图的最终提示词、附图、重出次数追加到 `art/PROMPTS.md`，取舍理由追加到 `art/SELECTION.md`，新开一节「美术补充包：重出」。
- 全部完成后告诉用户「重出完成」。

**按顺序做**：先做 1，因为 2 要用 1 的成品作参考。3–4 与 5–7 互不依赖。

---

## 1. `shen_well` 背景：去掉西式建筑

- **问题**：现有背景左上雾中是一栋西式两层洋楼（烟囱、上下推拉窗），后方围墙是西式石柱加球形柱头。原提示词写的是 "the back garden of the **mansion**"，模型据此画成了西式宅邸。这张背景在 h_well、h_blood、f_well 三个节点都会出现。
- **旧图**：`game_runs/PaintedSkin/assets/bg/raw/shen_well.png`，移到 `assets/bg/raw/_v1/`
- **新图**：`game_runs/PaintedSkin/assets/bg/raw/shen_well.png`，16:9
- **构图必须保留**：井居中偏下、井后枯树、月亮在右上、低雾，后方是一道院墙。`well_bones` CG 和人物站位都按这个构图做过，不要换构图。

**首选：编辑模式。** 附图：① 旧 `shen_well`（`assets/bg/shen_well.webp` 或刚挪进 `_v1/` 的 png），② `art/refs/style_night.webp`

```text
Edit the attached background (Image 1). Keep the composition, brushwork, paper texture, palette and mist exactly as they are, and keep the stone well, the withered tree and the moon exactly in place. Change only the architecture: replace the Western-style two-storey house in the upper left with the dim, mist-softened silhouette of traditional Chinese courtyard buildings — grey-tiled roofs with gently upturned eaves, wooden lattice windows, one faintly lamplit paper window; replace the stone wall and its ball-topped pillars with a traditional Chinese whitewashed garden wall capped with dark grey roof tiles, with no pillars and no finials. Traditional Chinese architecture only: no Western buildings, no chimneys, no sash windows, no stone balustrades. Image 2 is the style reference; match it. Empty of people. No text, no calligraphy, no seals, no signature, no watermark.
```

**备选：编辑模式改不干净时整张重画。** 附图：`art/refs/style_night.webp`；可加旧 `shen_well` 作构图参考，但须在提示词里说明只参考构图。

```text
Traditional Chinese ink wash painting with light color washes (shuimo with pale mineral color), visible xuan paper texture, expressive brushwork, generous negative space, soft drifting mist, muted palette of ink black, warm grey, pale ochre, indigo and touches of rouge, cinematic 16:9 composition, no people unless specified, no text, no calligraphy, no red seal stamps, no signature, no watermark. Match the brushwork, paper texture and palette of the attached style reference exactly. Scene: the overgrown back garden of a wealthy Ming-dynasty Chinese household compound at night: an old stone well with a cracked lid and moss at the center, a withered tree behind it, a whitewashed garden wall capped with dark grey roof tiles, beyond it the dim silhouette of traditional courtyard buildings with upturned eaves, cold moonlight from the upper right, mist low on the ground, dread. Traditional Chinese architecture only: no Western buildings, no chimneys, no sash windows, no stone pillars or finials. Composition: focal interest in the upper middle; bottom quarter calm and low-detail (a dialogue panel covers it); left and right thirds free of focal objects at standing-figure height (character portraits stand there). Empty of people. 16:9.
```

**自检**：放大左上与后墙，确认房子、窗户、墙头都是中式；和旧图并排比较，井、树、月的位置不变。

---

## 2. `rosary` CG：同样去掉西式建筑

- **问题**：这张 CG 参考了旧 `shen_well`，把洋楼和球形柱头围墙一并画了进来。念珠、井沿那颗珠子和紫锦衣角都合格，要保留。
- **旧图**：`game_runs/PaintedSkin/assets/cg/raw/rosary.png`，移到 `assets/cg/raw/_v1/`
- **新图**：`game_runs/PaintedSkin/assets/cg/raw/rosary.png`，16:9

**首选：编辑模式。** 附图：① 旧 `rosary`（`_v1/` 里那张），② 第 1 项产出的**新** `shen_well`

```text
Edit the attached image (Image 1). Keep the composition, brushwork, palette and mist exactly as they are, and keep the stone well, the scattered prayer beads, the single bead on the well's rim, the dark purple brocade corner, the tree and the moon exactly in place. Change only the background architecture so it matches Image 2: replace the Western-style house in the upper left with the dim silhouette of traditional Chinese courtyard buildings with grey-tiled upturned eaves and lattice windows, and replace the wall with ball-topped pillars on the right with a traditional Chinese whitewashed garden wall capped with dark grey roof tiles, no pillars, no finials. Traditional Chinese architecture only: no Western buildings, no chimneys, no sash windows. No people, no faces, no hands. No text, no calligraphy, no seals, no signature, no watermark.
```

**备选：整张重画。** 附图：`art/refs/style_night.webp`、第 1 项产出的新 `shen_well`。提示词沿用 `art/PROMPTS.md` 里 rosary 原条目的全文，在场景正文后加一句：

```text
The background shows only traditional Chinese architecture matching the attached garden: a whitewashed wall with dark grey roof tiles and dim courtyard rooftops with upturned eaves; no Western buildings, no chimneys, no sash windows, no stone pillars or finials.
```

**自检**：同第 1 项；念珠、井沿珠和紫锦衣角仍在画面上方 70% 以内。

---

## 3–4. `chen_resolve`、`chen_remorse` 头像：统一回第一批画风

- **问题**：这 2 张是上一轮换用内置 ImageGen 后生成的，画风偏写实：发色偏棕、脸型写实、袄面有锦纹、人像在画面里更大。同一角色在对话中会和另外 4 张陈氏头像（`chen_calm`、`chen_cold`、`chen_worry`、`chen_fear`）前后跳变。
- **生图工具**：**优先用第一批 12 张头像所用的 Gemini 图像模型**，上次的配额应该已经恢复。只有它不可用时才用别的工具，并且必须附画风锚。
- **旧图**：`game_runs/PaintedSkin/assets/avatar/raw/chen_resolve.png`、`chen_remorse.png`，移到 `assets/avatar/raw/_v1/`
- **新图**：原路径原文件名，1:1，1024×1024，纯绿 `#00FF00`
- **附图（两张都要）**：① `art/refs/rs_chen.webp`（身份），② `assets/avatar/raw/chen_calm.png`（**画风锚**）

**`chen_resolve`**

```text
Image 1 is the character identity reference sheet for Lady Chen. Image 2 is an existing avatar of the same character from this exact avatar set — match Image 2's art style exactly: the same light semi-chibi proportions, rounded soft face, line weight, soft cel shading, near-black hair, plain ochre-red jacket without brocade pattern, and the same framing, with the head and shoulders filling the square to the same size and position as in Image 2. Draw a new avatar that differs from Image 2 only in expression: firm and determined, chin slightly raised. Preserve the neat married woman's bun with a silver hairpin. Facing the viewer with a slight three-quarter turn toward the viewer's right, unmirrored, traditional right-over-left collar. Square 1:1 framing, head and shoulders only, cut at mid-chest by the bottom edge, top of the head including the hairpin about 6 to 8 percent below the top edge, face centered. Restrained, sincere expression suited to a melancholic Chinese ghost story, not cute. Background: perfectly flat uniform solid pure RGB green #00FF00, no gradient, no shadow, no border, no frame, no other objects. No text, no calligraphy, no seals, no watermark.
```

**`chen_remorse`**：提示词同上，只把表情一句换成：

```text
Draw a new avatar that differs from Image 2 only in expression: grief and remorse, tears on the lashes, eyes lowered.
```

**自检**：把新图和 `chen_calm`、`chen_cold`、`chen_worry`、`chen_fear` 排成一行看，发色、脸型、袄子颜色和花纹、头在画面里的大小要一眼看去是同一套。另查纯绿底、右衽、无字。

---

## 5–7. 止水、沈夫人的 Q 版对比稿（不替换现有图）

- **目的**：现有 `dao_stern`、`dao_angry`、`shen_terror` 角色内部一致，但比王生、阿绢、陈氏的头像写实得多。这里各出一张轻 Q 版，供用户以后对比两种方案，**现有三张保持原样、不挪动**。
- **新图存放**：`game_runs/PaintedSkin/assets/avatar/raw/_q/`，文件名同原名（`dao_stern.png`、`dao_angry.png`、`shen_terror.png`）。1:1，1024×1024，纯绿 `#00FF00`。放在 `_q/` 里不会被游戏读到；用户选定后，由 Claude 负责换上。
- **生图工具**：同第 3–4 项，优先用第一批的 Gemini 图像模型。
- **附图**：这两个角色没有现成的 Q 版，所以借同一套里另一个角色的头像当**画风锚**，只学画风、不学长相：
  - 止水：① `art/refs/rs_dao.webp`（身份），② `assets/avatar/raw/wang_calm.png`（画风锚）
  - 沈夫人：① `art/refs/rs_shen.webp`（身份），② `assets/avatar/raw/chen_calm.png`（画风锚）
- **易错点**：Q 版容易把人画年轻。止水约五十岁，沈夫人约五十五岁，年纪要看得出来，靠胡须、少量柔和的皱纹、鬓发花白来表现，不要画成大头娃娃。沈夫人的袄子是**立领加盘扣**（见 rs_shen），不要改成交领。

**止水通用正文**（`{EXPRESSION}` 按下表替换）

```text
Image 1 is the character identity reference sheet for a lean wandering Taoist about fifty. Image 2 is an avatar of a different character from the same avatar set; use Image 2 only as the art style reference, not for identity. Match Image 2's art style exactly: the same light semi-chibi proportions, soft simplified features, line weight, soft cel shading and muted guofeng palette, and the same framing, with the head and shoulders filling the square to the same size and position as in Image 2. Draw the Taoist from Image 1 in this style, keeping him recognizably about fifty: a long thin beard, a few soft lines on the face, lean cheeks. Expression: {EXPRESSION}. Preserve the lotus crown with wooden pin and the black-grey robe with yellow trim. Facing the viewer with a slight three-quarter turn toward the viewer's right, unmirrored, traditional right-over-left collar. Square 1:1 framing, head and shoulders only, cut at mid-chest by the bottom edge, top of the lotus crown about 6 to 8 percent below the top edge, face centered. Restrained, sincere expression suited to a melancholic Chinese ghost story, not cute. Background: perfectly flat uniform solid pure RGB green #00FF00, no gradient, no shadow, no border, no frame, no other objects. No text, no calligraphy, no seals, no watermark.
```

| 文件 | `{EXPRESSION}` |
|---|---|
| `_q/dao_stern.png` | stern, sharp but weary eyes |
| `_q/dao_angry.png` | angry, deep frown |

**沈夫人 `_q/shen_terror.png`**

```text
Image 1 is the character identity reference sheet for Madam Shen, a gaunt wealthy mistress about fifty-five. Image 2 is an avatar of a different character from the same avatar set; use Image 2 only as the art style reference, not for identity. Match Image 2's art style exactly: the same light semi-chibi proportions, soft simplified features, line weight, soft cel shading and muted guofeng palette, and the same framing, with the head and shoulders filling the square to the same size and position as in Image 2. Draw Madam Shen from Image 1 in this style, keeping her recognizably about fifty-five: grey-streaked hair, hollow cheeks, a few soft lines around the eyes. Expression: terrified, eyes wide, clutching the rosary. Preserve the heavy gold hairpins, the dark purple brocade jacket with its high standing collar and frog buttons exactly as in Image 1, and a rosary in her hand at the bottom edge. Facing the viewer with a slight three-quarter turn toward the viewer's right, unmirrored. Square 1:1 framing, head and shoulders only, cut at mid-chest by the bottom edge, top of the hair ornaments about 6 to 8 percent below the top edge, face centered. Restrained, sincere expression suited to a melancholic Chinese ghost story, not cute. Background: perfectly flat uniform solid pure RGB green #00FF00, no gradient, no shadow, no border, no frame, no other objects. No text, no calligraphy, no seals, no watermark.
```

**自检**：把三张 Q 版和 `wang_calm`、`chen_calm`、`nv_smile` 排成一行，确认画风是同一套；再和对应的现有写实版并排，确认还是同一个人（冠/胡须/金饰/紫锦立领），年纪也没变。在 PROMPTS/SELECTION 里注明这三张是「Q 版对比稿，未替换」。

---

## 完成回报

7 张都出完后告诉用户「重出完成」，并列出：4 张替换图的路径，3 张对比稿在 `assets/avatar/raw/_q/`。Claude 接手后会把替换图抠图接入，并为对比稿出一张写实版与 Q 版的并排对比图，交给用户选。
