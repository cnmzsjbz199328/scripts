# 画皮 PaintedSkin · 美术补充包接力任务书（Handoff Guide）

> **状态（2026-11-10）：已执行完毕，仅作存档。** 下列 15 张均已出图。出图记录见 `art/PROMPTS.md`，审查结论与待重出项（`rosary`、`chen_resolve`、`chen_remorse`）见 `art/SELECTION.md` 末节。

> **目标读者**：接手本补充包出图任务的下一位 Agent。  
> **前序状态**：已完成 12 张 Q 版头像 + 1 张动作 CG（`road_meet`），并已入库。目前剩余 **5 张 Q 版头像 + 10 张动作 CG（含 1 张重出）** 待完成。  
> **分支**：`feat/painted-skin`  
> **基准文件**：`plans/painted-skin-art2-plan.md`、`game_runs/PaintedSkin/art/ART_BIBLE.md`

---

## 0. 禁令与边界（严格遵守）

1. **不要做**：
   - **不改代码、不改剧本**。
   - **不动 `.claude/settings.json`**。
   - **不提交 git**。
   - **不自己抠图**：抠图处理（`process-art.mjs`）、剧本接入（`build-story.mjs`）、走查验证均由 Claude 完成。出图完成后直接向用户汇报「补充包出图完成」即可。
2. **硬性画面红线**：
   - **无任何文字、书法、印章、落款、水印**（尤其是符纸、书页必须完全留白无字）。
   - **恐怖间接呈现**：禁止画伤口、断肢、血腥、破洞或内脏。
   - **人物严禁镜像**：所有汉服保持传统**右衽**（右压左）。
   - **朱砂痣**：阿绢（nv / gui）的朱砂痣固定点在**她自己的左眼下方**（即画面中观者视角的右侧）。
   - **CG 避让**：**画面底部 26% 会被游戏对话框遮挡**。所有面部、手部、关键道具（银簪、拂尘、念珠、镜中青影等）必须落在**画面上方 70%** 以内，底部四分之一保持平缓低细节。

---

## 1. 交付文件路径规范

| 类别 | 存放路径（已 gitignore） | 命名格式 | 规格 |
|---|---|---|---|
| Q 版头像 | `game_runs/PaintedSkin/assets/avatar/raw/` | `<角色>_<表情>.png` | 1:1 正方形（1024×1024），胸部截断，头顶距上沿 ~6% |
| 动作 CG | `game_runs/PaintedSkin/assets/cg/raw/` | `<cg_id>.png` | 16:9（1280×720 或 1376×768 等同比例） |

- **头像背景**：普通角色用纯绿幕 `#00FF00`；鬼相用纯品红幕 `#FF00FF`。无渐变、无阴影、无边框、图内不画头像框。
- **角色参考图**：画任何角色时必须附带 `game_runs/PaintedSkin/art/refs/rs_<角色>.webp`（或对应 raw PNG）。画 `gui` 鬼相时必须**同时附带 `rs_gui` 与 `rs_nv`**。

---

## 2. 当前进度核对清单

### 已完成入库（共 13 张，无需重复生成）：
- 头像（12 张）：`chen_calm`、`chen_cold`、`chen_worry`、`chen_fear`、`wang_calm`、`wang_fear`、`wang_weak`、`nv_smile`、`nv_pitiful`、`nv_love`、`gui_sorrow`、`gui_rage`。
- CG（1 张）：`road_meet`。

### 待出清单（共 15 张，本任务书目标）：
- **头像 5 张**：`chen_resolve`、`chen_remorse`、`dao_stern`、`dao_angry`、`shen_terror`。
- **CG 10 张**：
  - P1 主干（3 张）：`mirror`、`needle`、`whisk`。
  - P2 分支（6 张）：`jacket`、`lamp_walk`、`skin_touch`、`new_grave`、`rosary`、`give_heart`。
  - 重出（1 张）：`aftermath`。

---

## 3. 待出任务详情与完整提示词

### 第一部分：Q 版对白头像（5 张）

#### 1. `chen_resolve`（陈氏·坚毅）
- **目标路径**：`game_runs/PaintedSkin/assets/avatar/raw/chen_resolve.png`
- **参考图**：`game_runs/PaintedSkin/art/refs/rs_chen.webp`
- **背景**：纯绿 `#00FF00`
- **提示词**：
```text
Using the attached character reference sheet as the exact identity reference, draw a light semi-chibi (Q-version) head-and-shoulders avatar of Lady Chen, a dignified young married woman. Soft simplified features with a slightly larger head and eyes than realistic proportions, but not super-deformed; restrained, sincere expression suited to a melancholic Chinese ghost story: firm and determined, chin slightly raised. Preserve the neat married woman's bun with a silver hairpin, ochre-red jacket. Facing the viewer with a slight three-quarter turn toward the viewer's right, unmirrored, traditional right-over-left collar. Square 1:1 framing, head and shoulders only, cut at mid-chest by the bottom edge, top of the head including headwear about 6 percent below the top edge, face centered. Clean lineart, soft cel shading with light watercolor texture, muted guofeng palette matching the reference. Background: perfectly flat uniform solid pure RGB green #00FF00, no gradient, no shadow, no border, no frame, no other objects. No text, no calligraphy, no seals, no watermark.
```

#### 2. `chen_remorse`（陈氏·悔恨流泪）
- **目标路径**：`game_runs/PaintedSkin/assets/avatar/raw/chen_remorse.png`
- **参考图**：`game_runs/PaintedSkin/art/refs/rs_chen.webp`
- **背景**：纯绿 `#00FF00`
- **提示词**：
```text
Using the attached character reference sheet as the exact identity reference, draw a light semi-chibi (Q-version) head-and-shoulders avatar of Lady Chen, a dignified young married woman. Soft simplified features with a slightly larger head and eyes than realistic proportions, but not super-deformed; restrained, sincere expression suited to a melancholic Chinese ghost story: grief and remorse, tears on the lashes, eyes lowered. Preserve the neat married woman's bun with a silver hairpin, ochre-red jacket. Facing the viewer with a slight three-quarter turn toward the viewer's right, unmirrored, traditional right-over-left collar. Square 1:1 framing, head and shoulders only, cut at mid-chest by the bottom edge, top of the head including headwear about 6 percent below the top edge, face centered. Clean lineart, soft cel shading with light watercolor texture, muted guofeng palette matching the reference. Background: perfectly flat uniform solid pure RGB green #00FF00, no gradient, no shadow, no border, no frame, no other objects. No text, no calligraphy, no seals, no watermark.
```

#### 3. `dao_stern`（止水·严厉警觉）
- **目标路径**：`game_runs/PaintedSkin/assets/avatar/raw/dao_stern.png`
- **参考图**：`game_runs/PaintedSkin/art/refs/rs_dao.webp`
- **背景**：纯绿 `#00FF00`
- **提示词**：
```text
Using the attached character reference sheet as the exact identity reference, draw a light semi-chibi (Q-version) head-and-shoulders avatar of a lean wandering Taoist about fifty. Soft simplified features with a slightly larger head and eyes than realistic proportions, but not super-deformed; restrained, sincere expression suited to a melancholic Chinese ghost story: stern, sharp but weary eyes. Preserve the lotus crown with wooden pin, long thin beard, black-grey robe with yellow trim. Facing the viewer with a slight three-quarter turn toward the viewer's right, unmirrored, traditional right-over-left collar. Square 1:1 framing, head and shoulders only, cut at mid-chest by the bottom edge, top of the head including headwear about 6 percent below the top edge, face centered. Clean lineart, soft cel shading with light watercolor texture, muted guofeng palette matching the reference. Background: perfectly flat uniform solid pure RGB green #00FF00, no gradient, no shadow, no border, no frame, no other objects. No text, no calligraphy, no seals, no watermark.
```

#### 4. `dao_angry`（止水·震怒）
- **目标路径**：`game_runs/PaintedSkin/assets/avatar/raw/dao_angry.png`
- **参考图**：`game_runs/PaintedSkin/art/refs/rs_dao.webp`
- **背景**：纯绿 `#00FF00`
- **提示词**：
```text
Using the attached character reference sheet as the exact identity reference, draw a light semi-chibi (Q-version) head-and-shoulders avatar of a lean wandering Taoist about fifty. Soft simplified features with a slightly larger head and eyes than realistic proportions, but not super-deformed; restrained, sincere expression suited to a melancholic Chinese ghost story: angry, deep frown. Preserve the lotus crown with wooden pin, long thin beard, black-grey robe with yellow trim. Facing the viewer with a slight three-quarter turn toward the viewer's right, unmirrored, traditional right-over-left collar. Square 1:1 framing, head and shoulders only, cut at mid-chest by the bottom edge, top of the head including headwear about 6 percent below the top edge, face centered. Clean lineart, soft cel shading with light watercolor texture, muted guofeng palette matching the reference. Background: perfectly flat uniform solid pure RGB green #00FF00, no gradient, no shadow, no border, no frame, no other objects. No text, no calligraphy, no seals, no watermark.
```

#### 5. `shen_terror`（沈夫人·惊恐）
- **目标路径**：`game_runs/PaintedSkin/assets/avatar/raw/shen_terror.png`
- **参考图**：`game_runs/PaintedSkin/art/refs/rs_shen.webp`
- **背景**：纯绿 `#00FF00`
- **提示词**：
```text
Using the attached character reference sheet as the exact identity reference, draw a light semi-chibi (Q-version) head-and-shoulders avatar of Madam Shen, a gaunt wealthy mistress about fifty-five. Soft simplified features with a slightly larger head and eyes than realistic proportions, but not super-deformed; restrained, sincere expression suited to a melancholic Chinese ghost story: terrified, eyes wide, clutching the rosary. Preserve heavy gold hairpins, dark purple brocade jacket, a rosary in her hand at the bottom edge. Facing the viewer with a slight three-quarter turn toward the viewer's right, unmirrored, traditional right-over-left collar. Square 1:1 framing, head and shoulders only, cut at mid-chest by the bottom edge, top of the head including headwear about 6 percent below the top edge, face centered. Clean lineart, soft cel shading with light watercolor texture, muted guofeng palette matching the reference. Background: perfectly flat uniform solid pure RGB green #00FF00, no gradient, no shadow, no border, no frame, no other objects. No text, no calligraphy, no seals, no watermark.
```

---

### 第二部分：动作 CG（10 张）

#### 6. `mirror`（镜中青影）
- **目标路径**：`game_runs/PaintedSkin/assets/cg/raw/mirror.png`
- **参考图**：`art/refs/style_day.webp`、`assets/bg/study_in.webp`、`art/refs/rs_nv.webp`、`art/refs/rs_gui.webp`
- **提示词**：
```text
Traditional Chinese ink wash painting with light color washes (shuimo with pale mineral color), visible xuan paper texture, expressive brushwork, generous negative space, soft drifting mist, muted palette of ink black, warm grey, pale ochre, indigo and touches of rouge, cinematic 16:9 composition. A sunlit scholar's study in the morning. The young woman sits before a small round mirror, raising a hand to place a flower in her hair. In the mirror, faint and easy to miss, her reflection is a pale jade-green silhouette instead of her pink-clad self, and a thin crack runs across the glass; her other fingertip quietly presses on the crack. Subtle and eerie, not frightening. Keep every face, hand and key object within the upper 70 percent of the frame; the bottom quarter must stay calm and low-detail because a dialogue box covers it. Characters must match the attached reference sheets exactly, unmirrored, traditional right-over-left collars. Horror stays indirect: no wounds, no gore. No text, no calligraphy, no seals, no signature, no watermark.
```

#### 7. `needle`（灯下停针）
- **目标路径**：`game_runs/PaintedSkin/assets/cg/raw/needle.png`
- **参考图**：`art/refs/style_night.webp`、`assets/bg/home_night.webp`、`art/refs/rs_chen.webp`
- **提示词**：
```text
Traditional Chinese ink wash painting with light color washes (shuimo with pale mineral color), visible xuan paper texture, expressive brushwork, generous negative space, soft drifting mist, muted palette of ink black, warm grey, pale ochre, indigo and touches of rouge, cinematic 16:9 composition. Night in the main hall by a single oil lamp. Lady Chen sits with unfinished embroidery on her lap; the needle has stopped mid-pull, thread taut, her fingers motionless while her eyes stay lowered. At the frame's edge, the moon-white sleeve of her husband who has just come home. Warm lamplight against cool indigo night. Keep every face, hand and key object within the upper 70 percent of the frame; the bottom quarter must stay calm and low-detail because a dialogue box covers it. Characters must match the attached reference sheets exactly, unmirrored, traditional right-over-left collars. Horror stays indirect: no wounds, no gore. No text, no calligraphy, no seals, no signature, no watermark.
```

#### 8. `whisk`（赠拂尘）
- **目标路径**：`game_runs/PaintedSkin/assets/cg/raw/whisk.png`
- **参考图**：`art/refs/style_day.webp`、`assets/bg/market.webp`、`art/refs/rs_dao.webp`、`art/refs/rs_wang.webp`
- **提示词**：
```text
Traditional Chinese ink wash painting with light color washes (shuimo with pale mineral color), visible xuan paper texture, expressive brushwork, generous negative space, soft drifting mist, muted palette of ink black, warm grey, pale ochre, indigo and touches of rouge, cinematic 16:9 composition. A busy daytime market street. The lean Taoist holds out his white horsetail fly-whisk toward the young scholar; the long white strands hang still like calm water while the crowd blurs around them. The scholar's hand is just reaching for it. Keep every face, hand and key object within the upper 70 percent of the frame; the bottom quarter must stay calm and low-detail because a dialogue box covers it. Characters must match the attached reference sheets exactly, unmirrored, traditional right-over-left collars. Horror stays indirect: no wounds, no gore. No text, no calligraphy, no seals, no signature, no watermark.
```

#### 9. `jacket`（拢衣）
- **目标路径**：`game_runs/PaintedSkin/assets/cg/raw/jacket.png`
- **参考图**：`art/refs/style_day.webp`、`assets/bg/study_in.webp`、`art/refs/rs_chen.webp`、`art/refs/rs_nv.webp`
- **提示词**：
```text
Traditional Chinese ink wash painting with light color washes (shuimo with pale mineral color), visible xuan paper texture, expressive brushwork, generous negative space, soft drifting mist, muted palette of ink black, warm grey, pale ochre, indigo and touches of rouge, cinematic 16:9 composition. In the study, Lady Chen gently straightens the collar of a padded jacket she has just placed on the young woman's shoulders. The young woman keeps her eyes lowered, the jacket folded over her arm; Chen's other hand presses on her own sleeve. Two women, cautious and kind. Keep every face, hand and key object within the upper 70 percent of the frame; the bottom quarter must stay calm and low-detail because a dialogue box covers it. Characters must match the attached reference sheets exactly, unmirrored, traditional right-over-left collars. Horror stays indirect: no wounds, no gore. No text, no calligraphy, no seals, no signature, no watermark.
```

#### 10. `lamp_walk`（提灯）
- **目标路径**：`game_runs/PaintedSkin/assets/cg/raw/lamp_walk.png`
- **参考图**：`art/refs/style_night.webp`、`assets/bg/home_night.webp`、`art/refs/rs_chen.webp`
- **提示词**：
```text
Traditional Chinese ink wash painting with light color washes (shuimo with pale mineral color), visible xuan paper texture, expressive brushwork, generous negative space, soft drifting mist, muted palette of ink black, warm grey, pale ochre, indigo and touches of rouge, cinematic 16:9 composition. A rainy night corridor. Lady Chen walks alone holding a lantern high; her long shadow stretches across the wall ahead of her. Her face is set and unreadable. Keep every face, hand and key object within the upper 70 percent of the frame; the bottom quarter must stay calm and low-detail because a dialogue box covers it. Characters must match the attached reference sheets exactly, unmirrored, traditional right-over-left collars. Horror stays indirect: no wounds, no gore. No text, no calligraphy, no seals, no signature, no watermark.
```

#### 11. `skin_touch`（触绢）
- **目标路径**：`game_runs/PaintedSkin/assets/cg/raw/skin_touch.png`
- **参考图**：`art/refs/style_night.webp`、`assets/bg/study_night.webp`、`art/refs/rs_wang.webp`、`art/refs/rs_chen.webp`
- **提示词**：
```text
Traditional Chinese ink wash painting with light color washes (shuimo with pale mineral color), visible xuan paper texture, expressive brushwork, generous negative space, soft drifting mist, muted palette of ink black, warm grey, pale ochre, indigo and touches of rouge, cinematic 16:9 composition. Night in the study. A life-size scroll painting of a woman lies unrolled on the desk. The scholar's fingertips have just touched the silk and are recoiling, his face pale, because it feels like warm skin. Lady Chen stands beside the desk holding a lamp, watching him. Keep every face, hand and key object within the upper 70 percent of the frame; the bottom quarter must stay calm and low-detail because a dialogue box covers it. Characters must match the attached reference sheets exactly, unmirrored, traditional right-over-left collars. Horror stays indirect: no wounds, no gore. No text, no calligraphy, no seals, no signature, no watermark.
```

#### 12. `new_grave`（新坟）
- **目标路径**：`game_runs/PaintedSkin/assets/cg/raw/new_grave.png`
- **参考图**：`art/refs/style_day.webp`、`assets/bg/grave_dawn.webp`、`art/refs/rs_nv.webp`、`art/refs/rs_dao.webp`
- **提示词**：
```text
Traditional Chinese ink wash painting with light color washes (shuimo with pale mineral color), visible xuan paper texture, expressive brushwork, generous negative space, soft drifting mist, muted palette of ink black, warm grey, pale ochre, indigo and touches of rouge, cinematic 16:9 composition. A sunny hillside at dawn with a fresh burial mound. The young woman stands beside it in pale lotus-pink; the water stains on her sleeves are fading away like mist. Far behind, the Taoist watches, one hand resting on his fly-whisk. Peaceful, open sky. Keep every face, hand and key object within the upper 70 percent of the frame; the bottom quarter must stay calm and low-detail because a dialogue box covers it. Characters must match the attached reference sheets exactly, unmirrored, traditional right-over-left collars. Horror stays indirect: no wounds, no gore. No text, no calligraphy, no seals, no signature, no watermark.
```

#### 13. `rosary`（断念珠）
- **目标路径**：`game_runs/PaintedSkin/assets/cg/raw/rosary.png`
- **参考图**：`art/refs/style_night.webp`、`assets/bg/shen_well.webp`
- **提示词**：
```text
Traditional Chinese ink wash painting with light color washes (shuimo with pale mineral color), visible xuan paper texture, expressive brushwork, generous negative space, soft drifting mist, muted palette of ink black, warm grey, pale ochre, indigo and touches of rouge, cinematic 16:9 composition. Object only, no people: on wet mud beside an old stone well at night, a broken string of prayer beads lies scattered; one bead rolls toward the well's rim. A dropped corner of dark purple brocade at the frame's edge. Cold moonlight, utterly still. Keep every face, hand and key object within the upper 70 percent of the frame; the bottom quarter must stay calm and low-detail because a dialogue box covers it. Characters must match the attached reference sheets exactly, unmirrored, traditional right-over-left collars. Horror stays indirect: no wounds, no gore. No text, no calligraphy, no seals, no signature, no watermark.
```

#### 14. `give_heart`（相予）
- **目标路径**：`game_runs/PaintedSkin/assets/cg/raw/give_heart.png`
- **参考图**：`art/refs/style_night.webp`、`assets/bg/study_night.webp`、`art/refs/rs_wang.webp`、`art/refs/rs_gui.webp`、`art/refs/rs_nv.webp`
- **提示词**：
```text
Traditional Chinese ink wash painting with light color washes (shuimo with pale mineral color), visible xuan paper texture, expressive brushwork, generous negative space, soft drifting mist, muted palette of ink black, warm grey, pale ochre, indigo and touches of rouge, cinematic 16:9 composition. Night in the study. The scholar stands with one hand pressed over his own heart, calm and willing. Facing him, the ghost woman in her true form looks at him with sorrow and gratitude. Between them, a faint warm thread of light. No wounds, no blood. Keep every face, hand and key object within the upper 70 percent of the frame; the bottom quarter must stay calm and low-detail because a dialogue box covers it. Characters must match the attached reference sheets exactly, unmirrored, traditional right-over-left collars. Horror stays indirect: no wounds, no gore. No text, no calligraphy, no seals, no signature, no watermark.
```

#### 15. `aftermath`（银簪与月色·重出）
- **目标路径**：`game_runs/PaintedSkin/assets/cg/raw/aftermath.png`
- **参考图**：`art/refs/style_night.webp`、`assets/bg/courtyard_night.webp`、`art/refs/rs_wang.webp`、`art/refs/rs_chen.webp`
- **特别要求**：**银簪必须移入画面上方 70%**（在王生微张的手边或胸口处），沾着泥痕清晰可见，绝不能被底部 26% 盖住。
- **提示词**：
```text
Traditional Chinese ink wash painting with light color washes (shuimo with pale mineral color), visible xuan paper texture, expressive brushwork, generous negative space, soft drifting mist, muted palette of ink black, warm grey, pale ochre, indigo and touches of rouge, cinematic 16:9 composition. Night in a stone-paved courtyard under cold moonlight. The dying scholar rests his head gently on his wife's lap; only Lady Chen's ochre-red sleeve and tender hand caressing his pale cheek are visible at the upper side. The scholar's eyes are half-closed in peace, his moon-white robe bearing a flat dark crimson stain without visible gore. Crucially, a plain silver hairpin smudged with dried well mud lies clearly visible beside his slightly open hand near his chest in the upper half of the image. Keep every face, hand and key object within the upper 70 percent of the frame; the bottom quarter must stay calm and low-detail because a dialogue box covers it. Characters must match the attached reference sheets exactly, unmirrored, traditional right-over-left collars. Horror stays indirect: no wounds, no gore. No text, no calligraphy, no seals, no signature, no watermark.
```

---

## 4. 完成出图后的记录要求

每张图生成后，请向以下两个文件追加记录：
1. `game_runs/PaintedSkin/art/PROMPTS.md`：记录最终使用的提示词、附加参考图、重出次数与状态。
2. `game_runs/PaintedSkin/art/SELECTION.md`：记录取舍与自检理由（避让检验、构图与身份标记复核）。

全部 15 张出完并入库后，直接告诉用户：「**补充包出图完成**」。
