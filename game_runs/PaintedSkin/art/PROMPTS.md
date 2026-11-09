# PaintedSkin 出图提示词与重出记录

所有成图通过内置 ImageGen 生成。原始 PNG 留在被忽略的 `assets/**/raw/`；本页记录复用模板、身份锚和需要保留的差异。最终画面均禁止文字、书法、印章、落款、水印。概念图只用于挑选；量产立绘必须附带对应 `rs_<角色>` 作为参考图。

## P1B：风格测试

基础提示：`[INK] Style test. <scene description>. Ink density: <a|b|c>. 16:9.`

| 文件 | 场景 | 风格附句 |
|---|---|---|
| `st_road_a.png` | 山西乡路、薄雾、石桥、疏柳、淡金色天光 | light airy color washes dominate, lots of untouched paper, delicate thin ink lines |
| `st_road_b.png` | 同上 | rich saturated color washes layered over bold confident ink strokes |
| `st_road_c.png` | 同上 | mostly monochrome ink in many tones, only sparse small accents of color |
| `st_night_a.png` | 书斋、窗纸月光、书桌、烛火、帘影 | light airy color washes dominate, lots of untouched paper, delicate thin ink lines |
| `st_night_b.png` | 同上 | rich saturated color washes layered over bold confident ink strokes |
| `st_night_c.png` | 同上 | mostly monochrome ink in many tones, only sparse small accents of color |

选用 `a`。具体判定与 `study_night` 左下床榻的轻微拥挤观察项见本目录 `SELECTION.md` 的 G2 部分。

## P1B：人物概念图

模板：`[CHAR] Character concept: single full-body figure standing, front view, relaxed neutral pose, plain light grey background (#d9d9d9), no ground shadow. Character: <角色卡>. Variation: <版本差异>. No text, no calligraphy, no seals, no watermark.`

| 角色 | a | b | c |
|---|---|---|---|
| 王生 | classic black fangjin and moon-white robe | younger look, net cap, pale grey-blue daopao | ivory robe with dark indigo sleeveless overcoat, more dashing |
| 陈氏 | ochre-red ao and indigo mamian skirt | muted plum ao with dark skirt, sterner | brown-red ao with white collar, warmer and gentler |
| 女子 | lotus-pink ruqun, maiden hairstyle, small cloth bundle | moon-white with faint plum embroidery | pale apricot with translucent shawl |
| 女鬼 | use the chosen 女子 identity; hollow-eyed and sorrowful, more human | same identity, wild loose hair, more spectral | — |
| 止水 | gaunt ascetic, sharp and weary | rough wanderer, patched robe, wilder beard | composed and noble, cleaner robe |
| 沈夫人 | proud and severe, dark purple brocade, gold hairpins, prayer beads | frail and haunted, same dark palette and beads | — |

女鬼候选以 `nv_a.png` 为图像参考，保留同一脸型、左眼下朱砂痣、发簪和莲粉月白衣色。首次女子描述因安全检查未通过；改为完全着装、普通站姿的中性服装设定后生成，不含性化描写。最终选择和每版评分见 `SELECTION.md`。

## P2：参考设定图

模板：`Using the attached character image as the exact design reference (same face, hairstyle, costume, colors, accessories), create a character reference sheet on a plain light grey background: full-body front view, full-body three-quarter view, full-body back view, and a row of head close-ups showing <表情>. Consistent proportions across all views. [CHAR] 16:9. No labels, no text.`

| 文件 | 身份锚 | 头部表情及补充要求 |
|---|---|---|
| `rs_wang.png` | `wang_a.png` | neutral, smitten, frightened, resolute, grieving；按角色卡补一枚小玉佩；方巾、月白袍和靛色领缘一致 |
| `rs_chen.png` | `chen_a.png` | calm, cold jealous stare, frightened, remorseful weeping, resolute；赭红袄、靛裙、已婚发髻与银簪一致 |
| `rs_nv.png` | `nv_a.png` | demure sorrow, gentle smile, dressed-up radiant, tender blush；所有脸部保留左眼下朱砂痣 |
| `rs_gui.png` | `gui_a.png` + `rs_nv.png` | rage, deep sorrow, peaceful；脸型、五官轮廓和朱砂痣以 `rs_nv` 为准，衣色与发型延续鬼相概念 |
| `rs_dao.png` | `dao_a.png` | stern, angry, compassionate；白拂尘、桃木剑、葫芦、莲冠和木簪齐全 |
| `rs_shen.png` | `shen_a.png` | haughty, terrified, remorseful weeping；深紫锦衣、金簪、念珠和年长憔悴面容一致 |

所有参考图按横幅排成头部表情行和三视图行，浅灰底无标记；输出 PNG 归档在 `assets/refs/raw/`，审定 WebP 在 `art/refs/`。

## G3 融合样张：`wang_calm`

输入参考：`assets/refs/raw/rs_wang.png`。

> Using the attached character reference sheet as the exact identity and design reference, draw one full-body standing portrait of Wang Sheng, a slender young Chinese scholar. Preserve the same gentle face, black hair, square black scholar's cap, moon-white robe with indigo collar trim, cloth belt and small jade pendant. Pose: standing at ease, hands lightly clasped, gentle smile. Facing directly toward the viewer, unmirrored, retain the correct traditional right-lapel garment overlap shown in the reference. The entire body from top of cap to both shoes is visible and fills about 90 percent of image height, centered with a small clear margin above and below. Background must be a perfectly flat, uniform solid pure RGB green #00FF00 with no gradient, no texture, no floor, no cast shadow, no other objects. Crisp clean outline, delicate Chinese ink-and-watercolor game illustration. Portrait 9:16. No text, no calligraphy, no seals, no watermark, no border.

结果：底色边框检测为 green（中位数 RGB `4,249,3`）；处理后检查 `style_day` 与 `style_night` 合成图，首轮出现绿边，调整色度估算和去溢色后复检通过。抠图算法和合成图由 `tools/process-art.mjs` 生成。

## 后续量产

P3 每张背景、CG、封面和立绘生成后，将输入参考、完整提示词、输出 ID、重出次数及自检结论按本页追加；变体须注明基础图 ID。角色身份锚以 `art/refs/rs_<角色>.webp` 为准，不允许水平翻转。
