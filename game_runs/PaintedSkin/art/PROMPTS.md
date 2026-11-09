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

## P3a：量产背景、CG 与封面

全批图像按计划 B.4–B.6 的 `[INK]` 水墨模板和选定的 a 风格锚生成。背景统一要求匹配 `style_day` / `style_night` 的笔触、纸纹和配色；主体在上中部，底部四分之一低细节，左右人物站位区不放焦点，无人物，16:9。所有输出都要求无文字、书法、印章、签名和水印。下表列出最终入库版本、参考输入、提示主体和自检结果；未列出的探索候选未复制到 `raw/`。

### 背景（13）

| 输出 | 输入 | 最终场景提示与自检 |
|---|---|---|
| `home_hall` | `style_day` | 白日书生家正厅，方桌茶具、两把椅、山水屏风、通往内院的门；暖而整齐。无文字，中心清楚。 |
| `home_night` | `style_night` + `home_hall` 母版 | 构图与家具位置不变，只改为夜色、桌上一盏油灯、深影，门边挂白拂尘；与日景配对通过。 |
| `road_dawn` | `style_day` | 深秋太原郊外驿道、薄雾、稀疏柳树、低石桥、淡玫瑰金天光和湿地；最终重出把树移出人物站位区，层次清楚。 |
| `study_in` | `style_day` | 书桌文房、半卷竹帘、纸窗、靠墙榻、妆镜、兰花和柔和日光；物件靠边，中央叙事区留白。 |
| `study_night` | `style_night` + `study_in` 母版 | 只改烛火、靛蓝夜影、窗纸月光与窗外雨痕，保留家具位置；检查床榻左下略密但不遮人物。 |
| `market` | `style_day` | 午间县城集市，摊棚、灯笼、空白幡、远处行人以松散墨痕暗示；重出后移除侧边大树，侧栏保留空处。 |
| `temple` | `style_day` | 城郊破旧道观、旧柱、暗处褪色神像、空白匾、香雾和破阶；重出后清理侧边树影、匾额无字。 |
| `bedroom_night` | `style_night` | 夜间内室、垂纱架子床、低油灯、窗格冷月光；可后加空白符纸。无人物、无字。 |
| `bedroom_dawn` | `style_day` + `bedroom_night` 母版 | 保持房间布局，只将光线改成温和晨光、熄灭油灯、帘子打开；昼夜连续性通过。 |
| `shen_inner` | `style_day` | 沈府内室、深木、锦帘、香火佛龛、望向荒园的窗；重出后把佛龛和窗集中，左右站位区留空。 |
| `shen_well` | `style_night` | 荒园旧井、裂盖青苔、枯树、冷月和低雾；无骨骸或尸身，恐惧只由井景暗示。 |
| `grave_dawn` | `style_day` | 山坡新坟、空白木牌、野花与谷雾；木牌无字，气氛宁静。 |
| `courtyard_night` | `style_night` | 书斋与正屋之间的石板院、白墙、落地仍亮的纸灯、远处门上白拂尘、冷月；重出后清空两侧焦点，保留中央路径和远处亮窗。 |

### 事件 CG（10）与封面（1）

CG 统一按计划 B.5 的 `[INK]` 事件插图模板生成，16:9；任何人物严格参照对应 `rs_*.webp`。惊悚只用暗示，不画伤口、器官或血腥。符纸若出现必须完全空白。

| 输出 | 输入 | 最终提示主体与自检 |
|---|---|---|
| `window_peek` | `style_night`, `study_night`, `rs_gui`, `rs_nv` | 从纸窗破口外看入烛夜书斋：鬼相从背后三分之四身俯身榻前，榻上摊着画有女子脸的皮，手持彩笔；无伤口，破纸边缘不形成身体伤口。通过。 |
| `portrait` | `style_night`, `study_night`, `rs_nv` | 空书斋中左侧灯笼只露袖手，榻上是闭眼女子的逼真绢像；无其他人物。通过。 |
| `burning` | `style_night`, `rs_nv` | 铜盆中绢画卷曲燃烧，女子画像部分焦黑，赭红袖手收回；焦痕只在画面，不是人体伤口。通过。 |
| `study_fire` | `style_night`, `study_in` | 院中远望书斋夜火从窗涌出，火星、烟与火中长发影子；无人形实体。通过。 |
| `shield_shadow` | `style_night`, `courtyard_night` | 落地纸灯照白墙，呈蹲下女子、护在前方的男子和扑来的长发影三道剪影；只画影子。通过。 |
| `aftermath` | `style_night`, `courtyard_night`, `rs_wang`（另附 `rs_chen` 辅助保持袖色） | 月夜石径上王生枕在妻膝，只露赭红袖和抚颊的手；白袍胸前大块暗绛黑平面印迹，手边银簪沾井泥；无可见伤口。印迹按计划保留。通过。 |
| `heart_wang` | `style_night`, `courtyard_night`, `rs_wang`, `rs_chen` | 王生与陈氏并肩安卧、两人闭眼，陈氏手覆其手；柔和红金心光由她向他流动，周围环绕空白符纸，边缘仅露止水无纹黑袖和手引导光。首版符纸、袖口出现伪文字，弃用并重出 1 次；第二版完全无字符且无伤无武器，通过。 |
| `heart_chen` | `style_night`, `bedroom_night`, `rs_chen` | 陈氏着衣安卧架子床，空白符纸环绕，淡玉绿与玫瑰色心光如墨入水般落入胸前；无血、伤或武器。通过。 |
| `well_bones` | `style_night`, `shen_well` | 井口俯视，井底泥水中半埋莲粉色腐绢，只以极淡弧线暗示一段骨；无头骨、尸体、面孔或血腥。通过，骨弧刻意非常淡。 |
| `fade` | `style_day`, `study_in` | 晨光下的榻，绢上女子画像只余将散的淡墨痕，旁有银簪；无人物。通过。 |
| `cover` | `style_day`, `rs_nv` | 悬挂绢轴上的女子未完成像保留左眼下朱砂痣，半边脸仍为空白绢；桌有彩笔、砚、一烛与薄雾。无题字、签名或印章，通过。 |

背景中 `road_dawn`、`market`、`temple`、`shen_inner`、`courtyard_night` 因侧边构图干扰重出后入选；其他背景/CG 采用本轮被选中的首版。原始 PNG 全部留在忽略目录 `assets/**/raw/`；游戏只引用处理后的 1280×720 WebP。
