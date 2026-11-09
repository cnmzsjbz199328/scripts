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

## P3b：人物立绘（27）

基础图按计划 B.7 的 `[CHAR]` 模板生成：输入对应 `art/refs/rs_<角色>.webp`，严格复用身份、脸型、发型、服装、配色和标志物；全身正面或不超过 15° 的轻微侧转，头顶至鞋底完整，9:16；纯色绿幕 `#00FF00`，鬼相用品红 `#FF00FF`，无渐变、地面、投影或其他物件；明确不镜像并保持右衽。所有图无文字、书法、印章、水印和边框。表中“改动”就是拼入模板的姿态/表情句；变体按 B.7 的 edit 模板，只改对应状态，其他保持基础图一致。

| 输出 ID / 原图名 | 输入身份锚 | 姿态 / 变体句 | 背景 | 自检与重出 |
|---|---|---|---|---|
| `wang:calm` / `wang_calm` | `rs_wang`（G3 已完成） | standing at ease, hands lightly clasped, gentle smile | 纯绿 | G3 融合样张复用，身份与玉佩通过。 |
| `wang:weak` / `wang_weak` | `rs_wang` | white inner robe, outer robe draped over shoulders, half-loose hair, pale, hand pressed over heart | 纯绿 | 新基础图通过。 |
| `wang:smitten` / `wang_smitten` | `wang_calm` | cheeks flushed, eyes lingering, faint smile, one hand half raised | 纯绿 | 变体通过。 |
| `wang:worry` / `wang_worry` | `wang_calm` | knitted brows, eyes averted, one hand at collar | 纯绿 | 变体通过。 |
| `wang:fear` / `wang_fear` | `wang_calm` | eyes wide, slight backward lean, both hands raised before chest | 纯绿 | 变体通过，手指自然。 |
| `wang:resolve` / `wang_resolve` | `wang_calm` | jaw set, steady eyes, one small closed fist at side | 纯绿 | 变体通过。 |
| `wang:grief` / `wang_grief` | `wang_calm` | reddened eyes, tears held back, lowered gaze, shoulders slumped | 纯绿 | 变体通过；表现悲恸，不作身体伤害。 |
| `chen:calm` / `chen_calm` | `rs_chen` | upright, hands folded, composed, guarded eyes | 纯绿 | 新基础图通过，赭红袄、靛裙、婚髻、银簪连续。 |
| `chen:cold` / `chen_cold` | `chen_calm` | chin slightly raised, narrowed cold eyes, lips pressed thin | 纯绿 | 变体通过，保持克制。 |
| `chen:worry` / `chen_worry` | `chen_calm` | knitted brows, eyes glancing aside, one hand at collar | 纯绿 | 变体通过。 |
| `chen:fear` / `chen_fear` | `chen_calm` | wide eyes, one hand covering mouth | 纯绿 | 变体通过。 |
| `chen:remorse` / `chen_remorse` | `chen_calm` | head bowed, tears, shoulders drawn inward, both hands clutching sleeves | 纯绿 | 变体通过；无殉情方式或自伤表现。 |
| `chen:resolve` / `chen_resolve` | `chen_calm` | jaw set, steady determined eyes, one hand on chest | 纯绿 | 变体通过。 |
| `nv:pitiful` / `nv_pitiful` | `rs_nv` | head lowered, sorrowful, holding a small cloth bundle close | 纯绿 | 新基础图通过，莲粉月白衣、银簪和左眼下朱砂痣可辨。 |
| `nv:smile` / `nv_smile` | `nv_pitiful` | remove bundle, hands folded at waist, head lifted slightly, gentle restrained smile | 纯绿 | 变体通过，布包已移除。 |
| `nv:dressed` / `nv_dressed` | `rs_nv` + `nv_pitiful`（辅助身份） | elaborate hair ornaments, light makeup, rouge lips, front-facing torso, slight head turn and radiant smile | 纯绿 | 首版仍有布包且转身较大，弃用并重出 1 次；采用版无布包、身体正面、朱砂痣清楚。 |
| `nv:love` / `nv_love` | `nv_dressed` | soft blush, tender downcast eyes, faint affectionate smile, hand touching hairpin | 纯绿 | 变体通过，盛装发饰与身份连续。 |
| `gui:rage` / `gui_rage` | `rs_gui` + `rs_nv` | pale jade-green skin, dark hollow eyes, wild hair, faded lotus-pink clothes, raging grief, teeth glimpsed, hands raised with tense claw-like fingers | 纯品红 | 首版肤色偏灰且有布包，弃用并重出 1 次；采用版无布包、青绿肤色明显、朱砂痣保留，无伤口。 |
| `gui:sorrow` / `gui_sorrow` | `gui_rage` | lower hands, tilt head, close mouth, dark diluted-ink tears from hollow eyes | 纯品红 | 变体通过；泪为墨痕，没有血或伤。 |
| `gui:calm` / `gui_calm` | `gui_rage` | close eyes, fold hands calmly, relax brows, faint closed-mouth smile | 纯品红 | 变体通过，保持同脸同痣；飞发边缘有淡紫色光丝。 |
| `dao:stern` / `dao_stern` | `rs_dao` | standing with white whisk, piercing scrutinizing gaze | 纯绿 | 新基础图通过：莲冠、木簪、拂尘、桃木剑、葫芦齐全。 |
| `dao:calm` / `dao_calm` | `dao_stern` | slight bow, softened sorrowful compassionate gaze | 纯绿 | 变体通过。 |
| `dao:angry` / `dao_angry` | `dao_stern` | intense glare, drawn brows, beard bristling slightly, hand gripping whisk handle | 纯绿 | 变体通过。 |
| `dao:act` / `dao_act` | `rs_dao` | controlled dynamic stance, peachwood sword raised, one completely blank paper talisman in other hand, protective focus | 纯绿 | 新基础图通过；纸符无字。剑举起造成横向包围盒较宽，已在 `f_seal`、`l_fire2` 合成中确认未遮脸或主要心光。 |
| `shen:haughty` / `shen_haughty` | `rs_shen` | upright with rosary, cold proud look | 纯绿 | 新基础图通过：年长憔悴面容、深紫锦衣、金簪和念珠一致。 |
| `shen:terror` / `shen_terror` | `shen_haughty` | pale face, wide eyes, clutch rosary to chest | 纯绿 | 变体通过。 |
| `shen:remorse` / `shen_remorse` | `shen_haughty` | bow low, tears, hands pressed together in remorse | 纯绿 | 变体通过；无自伤或殉情方式。 |

共 27 张原始 9:16 PNG：24 张绿底、3 张鬼相品红底；由 `tools/process-art.mjs --only=lihui` 全部成功抠图，去除绿/品红溢色并归一化至 640×1100、脚底 y=1080。最终原图保留在忽略目录 `assets/lihui/raw/`，WebP 供运行时读取。全量人物拼图由 `tools/make-lihui-review.mjs` 生成；六个计划关键场景及 `f_seal`、`l_fire2` 由 `tools/make-key-scenes-review.mjs` 以 1280×720 合成后缩放审阅，拼图只在忽略的 `playtest/review/`。

## 美术补充包：样张阶段（2026-11-09）

本包依 `plans/painted-skin-art2-plan.md` 规范出图。头像为 1:1 正方形、1024×1024，轻 Q 版头肩胸像，纯绿幕 `#00FF00`（gui 为品红 `#FF00FF`）；动作 CG 为 16:9，脸、手与关键物件控制在画面上方 70% 以内，底部 26% 留白以避开对话框遮挡。

### 头像批次记录（已完成 12 / 17）

| 文件 | 身份锚 / 输入参考 | 完整提示词 | 重出次数及状态 |
|---|---|---|---|
| `chen_calm.png` | `assets/refs/raw/rs_chen.png` | Using the attached character reference sheet as the exact identity reference, draw a light semi-chibi (Q-version) head-and-shoulders avatar of Lady Chen, a dignified young married woman. Soft simplified features with a slightly larger head and eyes than realistic proportions, but not super-deformed; restrained, sincere expression suited to a melancholic Chinese ghost story: calm and steady, a hint of warmth. Preserve the neat married woman's bun with a silver hairpin, ochre-red jacket. Facing the viewer with a slight three-quarter turn toward the viewer's right, unmirrored, traditional right-over-left collar. Square 1:1 framing, head and shoulders only, cut at mid-chest by the bottom edge, top of the head including headwear about 6 percent below the top edge, face centered. Clean lineart, soft cel shading with light watercolor texture, muted guofeng palette matching the reference. Background: perfectly flat uniform solid pure RGB green #00FF00, no gradient, no shadow, no border, no frame, no other objects. No text, no calligraphy, no seals, no watermark. | 首版通过（重出 0 次）。纯绿底，头顶距上沿约 8.3%，五官克制且符合已婚发髻与银簪。 |
| `chen_cold.png` | `assets/refs/raw/rs_chen.png` | Using the attached character reference sheet as the exact identity reference, draw a light semi-chibi (Q-version) head-and-shoulders avatar of Lady Chen, a dignified young married woman. Soft simplified features with a slightly larger head and eyes than realistic proportions, but not super-deformed; restrained, sincere expression suited to a melancholic Chinese ghost story: composed and cool, guarded eyes, lips pressed. Preserve the neat married woman's bun with a silver hairpin, ochre-red jacket. Facing the viewer with a slight three-quarter turn toward the viewer's right, unmirrored, traditional right-over-left collar. Square 1:1 framing, head and shoulders only, cut at mid-chest by the bottom edge, top of the head including headwear about 6 percent below the top edge, face centered. Clean lineart, soft cel shading with light watercolor texture, muted guofeng palette matching the reference. Background: perfectly flat uniform solid pure RGB green #00FF00, no gradient, no shadow, no border, no frame, no other objects. No text, no calligraphy, no seals, no watermark. | 首版通过（重出 0 次）。冷静警惕神情，纯绿底。 |
| `chen_worry.png` | `assets/refs/raw/rs_chen.png` | Using the attached character reference sheet as the exact identity reference, draw a light semi-chibi (Q-version) head-and-shoulders avatar of Lady Chen, a dignified young married woman. Soft simplified features with a slightly larger head and eyes than realistic proportions, but not super-deformed; restrained, sincere expression suited to a melancholic Chinese ghost story: brows knit with quiet concern. Preserve the neat married woman's bun with a silver hairpin, ochre-red jacket. Facing the viewer with a slight three-quarter turn toward the viewer's right, unmirrored, traditional right-over-left collar. Square 1:1 framing, head and shoulders only, cut at mid-chest by the bottom edge, top of the head including headwear about 6 percent below the top edge, face centered. Clean lineart, soft cel shading with light watercolor texture, muted guofeng palette matching the reference. Background: perfectly flat uniform solid pure RGB green #00FF00, no gradient, no shadow, no border, no frame, no other objects. No text, no calligraphy, no seals, no watermark. | 首版通过（重出 0 次）。微蹙双眉，纯绿底。 |
| `chen_fear.png` | `assets/refs/raw/rs_chen.png` | Using the attached character reference sheet as the exact identity reference, draw a light semi-chibi (Q-version) head-and-shoulders avatar of Lady Chen, a dignified young married woman. Soft simplified features with a slightly larger head and eyes than realistic proportions, but not super-deformed; restrained, sincere expression suited to a melancholic Chinese ghost story: frightened but holding steady, tense jaw. Preserve the neat married woman's bun with a silver hairpin, ochre-red jacket. Facing the viewer with a slight three-quarter turn toward the viewer's right, unmirrored, traditional right-over-left collar. Square 1:1 framing, head and shoulders only, cut at mid-chest by the bottom edge, top of the head including headwear about 6 percent below the top edge, face centered. Clean lineart, soft cel shading with light watercolor texture, muted guofeng palette matching the reference. Background: perfectly flat uniform solid pure RGB green #00FF00, no gradient, no shadow, no border, no frame, no other objects. No text, no calligraphy, no seals, no watermark. | 首版通过（重出 0 次）。惊骇但克制自持，纯绿底。 |
| `wang_calm.png` | `assets/refs/raw/rs_wang.png` | Using the attached character reference sheet as the exact identity reference, draw a light semi-chibi (Q-version) head-and-shoulders avatar of Wang Sheng, a gentle young Chinese scholar. Soft simplified features with a slightly larger head and eyes than realistic proportions, but not super-deformed; restrained, sincere expression suited to a melancholic Chinese ghost story: a polite gentle smile, open and kind. Preserve the black square scholar's cap (fangjin), moon-white robe with indigo collar trim. Facing the viewer with a slight three-quarter turn toward the viewer's right, unmirrored, traditional right-over-left collar. Square 1:1 framing, head and shoulders only, cut at mid-chest by the bottom edge, top of the head including headwear about 6 percent below the top edge, face centered. Clean lineart, soft cel shading with light watercolor texture, muted guofeng palette matching the reference. Background: perfectly flat uniform solid pure RGB green #00FF00, no gradient, no shadow, no border, no frame, no other objects. No text, no calligraphy, no seals, no watermark. | 首版通过（重出 0 次）。书生方巾与温和微笑，纯绿底。 |
| `wang_fear.png` | `assets/refs/raw/rs_wang.png` | Using the attached character reference sheet as the exact identity reference, draw a light semi-chibi (Q-version) head-and-shoulders avatar of Wang Sheng, a gentle young Chinese scholar. Soft simplified features with a slightly larger head and eyes than realistic proportions, but not super-deformed; restrained, sincere expression suited to a melancholic Chinese ghost story: eyes wide and shaken, lips parted, pale. Preserve the black square scholar's cap (fangjin), moon-white robe with indigo collar trim. Facing the viewer with a slight three-quarter turn toward the viewer's right, unmirrored, traditional right-over-left collar. Square 1:1 framing, head and shoulders only, cut at mid-chest by the bottom edge, top of the head including headwear about 6 percent below the top edge, face centered. Clean lineart, soft cel shading with light watercolor texture, muted guofeng palette matching the reference. Background: perfectly flat uniform solid pure RGB green #00FF00, no gradient, no shadow, no border, no frame, no other objects. No text, no calligraphy, no seals, no watermark. | 首版通过（重出 0 次）。目瞪口呆仓皇失措，纯绿底。 |
| `wang_weak.png` | `assets/refs/raw/rs_wang.png` | Using the attached character reference sheet as the exact identity reference, draw a light semi-chibi (Q-version) head-and-shoulders avatar of Wang Sheng, a gentle young Chinese scholar. Soft simplified features with a slightly larger head and eyes than realistic proportions, but not super-deformed; restrained, sincere expression suited to a melancholic Chinese ghost story: dying peacefully: eyes half-closed, a faint tender smile, very pale, cap slightly askew. Preserve the black square scholar's cap (fangjin), moon-white robe with indigo collar trim. Facing the viewer with a slight three-quarter turn toward the viewer's right, unmirrored, traditional right-over-left collar. Square 1:1 framing, head and shoulders only, cut at mid-chest by the bottom edge, top of the head including headwear about 6 percent below the top edge, face centered. Clean lineart, soft cel shading with light watercolor texture, muted guofeng palette matching the reference. Background: perfectly flat uniform solid pure RGB green #00FF00, no gradient, no shadow, no border, no frame, no other objects. No text, no calligraphy, no seals, no watermark. | 首版通过（重出 0 次）。临终安详虚弱之相，方巾微斜，纯绿底。 |
| `nv_smile.png` | `assets/refs/raw/rs_nv.png` | Using the attached character reference sheet as the exact identity reference, draw a light semi-chibi (Q-version) head-and-shoulders avatar of a breathtaking young woman about seventeen. Soft simplified features with a slightly larger head and eyes than realistic proportions, but not super-deformed; restrained, sincere expression suited to a melancholic Chinese ghost story: a soft charming smile with a trace of sadness. Preserve the tiny red mole under her own left eye (viewer's right), one plain silver hairpin, pale lotus-pink and moon-white clothes. Facing the viewer with a slight three-quarter turn toward the viewer's right, unmirrored, traditional right-over-left collar. Square 1:1 framing, head and shoulders only, cut at mid-chest by the bottom edge, top of the head including headwear about 6 percent below the top edge, face centered. Clean lineart, soft cel shading with light watercolor texture, muted guofeng palette matching the reference. Background: perfectly flat uniform solid pure RGB green #00FF00, no gradient, no shadow, no border, no frame, no other objects. No text, no calligraphy, no seals, no watermark. | 首版通过（重出 0 次）。纯绿底，头顶距上沿恰为 6.0%，左眼下朱砂痣位置正确（画面右侧），右衽无镜像。 |
| `nv_pitiful.png` | `assets/refs/raw/rs_nv.png` | Using the attached character reference sheet as the exact identity reference, draw a light semi-chibi (Q-version) head-and-shoulders avatar of a breathtaking young woman about seventeen. Soft simplified features with a slightly larger head and eyes than realistic proportions, but not super-deformed; restrained, sincere expression suited to a melancholic Chinese ghost story: fragile and timid, gaze lowered. Preserve the tiny red mole under her own left eye (viewer's right), one plain silver hairpin, pale lotus-pink and moon-white clothes. Facing the viewer with a slight three-quarter turn toward the viewer's right, unmirrored, traditional right-over-left collar. Square 1:1 framing, head and shoulders only, cut at mid-chest by the bottom edge, top of the head including headwear about 6 percent below the top edge, face centered. Clean lineart, soft cel shading with light watercolor texture, muted guofeng palette matching the reference. Background: perfectly flat uniform solid pure RGB green #00FF00, no gradient, no shadow, no border, no frame, no other objects. No text, no calligraphy, no seals, no watermark. | 首版通过（重出 0 次）。低眉垂目楚楚可怜，朱砂痣与银簪齐全，纯绿底。 |
| `nv_love.png` | `assets/refs/raw/rs_nv.png` | Using the attached character reference sheet as the exact identity reference, draw a light semi-chibi (Q-version) head-and-shoulders avatar of a breathtaking young woman about seventeen. Soft simplified features with a slightly larger head and eyes than realistic proportions, but not super-deformed; restrained, sincere expression suited to a melancholic Chinese ghost story: shy, longing, hopeful gaze. Preserve the tiny red mole under her own left eye (viewer's right), one plain silver hairpin, pale lotus-pink and moon-white clothes. Facing the viewer with a slight three-quarter turn toward the viewer's right, unmirrored, traditional right-over-left collar. Square 1:1 framing, head and shoulders only, cut at mid-chest by the bottom edge, top of the head including headwear about 6 percent below the top edge, face centered. Clean lineart, soft cel shading with light watercolor texture, muted guofeng palette matching the reference. Background: perfectly flat uniform solid pure RGB green #00FF00, no gradient, no shadow, no border, no frame, no other objects. No text, no calligraphy, no seals, no watermark. | 首版通过（重出 0 次）。含羞期盼神色，纯绿底。 |
| `gui_sorrow.png` | `assets/refs/raw/rs_gui.png`, `assets/refs/raw/rs_nv.png` | Using the attached character reference sheets as the exact identity reference, draw a light semi-chibi (Q-version) head-and-shoulders avatar of the same young woman in her true ghost form. Soft simplified features with a slightly larger head and eyes than realistic proportions, but not super-deformed; restrained, sincere expression suited to a melancholic Chinese ghost story: sorrowful, eyes lowered, quiet. Preserve exactly the same face and the red mole under her own left eye (viewer's right), pale jade-green skin, dark hollow eyes, long loose black hair, faded water-stained lotus-pink clothes. Facing the viewer with a slight three-quarter turn toward the viewer's right, unmirrored, traditional right-over-left collar. Square 1:1 framing, head and shoulders only, cut at mid-chest by the bottom edge, top of the head about 6 percent below the top edge, face centered. Clean lineart, soft cel shading with light watercolor texture, muted guofeng palette matching the reference. Background: perfectly flat uniform solid pure RGB magenta #FF00FF, no gradient, no shadow, no border, no frame, no other objects. Horror stays indirect: no wounds, no gore. No text, no calligraphy, no seals, no watermark. | 首版通过（重出 0 次）。青绿肤色、空沉眼眶与披发，纯品红底 `#FF00FF`。 |
| `gui_rage.png` | `assets/refs/raw/rs_gui.png`, `assets/refs/raw/rs_nv.png` | Using the attached character reference sheets as the exact identity reference, draw a light semi-chibi (Q-version) head-and-shoulders avatar of the same young woman in her true ghost form. Soft simplified features with a slightly larger head and eyes than realistic proportions, but not super-deformed; restrained, sincere expression suited to a melancholic Chinese ghost story: fierce anger, hair stirring wildly; frightening but no gore. Preserve exactly the same face and the red mole under her own left eye (viewer's right), pale jade-green skin, dark hollow eyes, long loose black hair, faded water-stained lotus-pink clothes. Facing the viewer with a slight three-quarter turn toward the viewer's right, unmirrored, traditional right-over-left collar. Square 1:1 framing, head and shoulders only, cut at mid-chest by the bottom edge, top of the head about 6 percent below the top edge, face centered. Clean lineart, soft cel shading with light watercolor texture, muted guofeng palette matching the reference. Background: perfectly flat uniform solid pure RGB magenta #FF00FF, no gradient, no shadow, no border, no frame, no other objects. Horror stays indirect: no wounds, no gore. No text, no calligraphy, no seals, no watermark. | 首版通过（重出 0 次）。狂怒披发无伤口，纯品红底 `#FF00FF`。 |

### CG 样张（1）

| 文件 | 身份锚 / 输入参考 | 完整提示词 | 重出次数及原因 |
|---|---|---|---|
| `road_meet.png` | `assets/bg/raw/road_dawn.png`, `assets/refs/raw/rs_nv.png`, `assets/refs/raw/rs_wang.png`（受工具单次至多 3 张参考图限制，`road_dawn` 承载昼景水墨风格与场景构图） | Traditional Chinese ink wash painting with light color washes (shuimo with pale mineral color), visible xuan paper texture, expressive brushwork, generous negative space, soft drifting mist, muted palette of ink black, warm grey, pale ochre, indigo and touches of rouge, cinematic 16:9 composition. Early autumn mist on a country road outside Taiyuan at dawn. A young woman in pale lotus-pink walks alone, slowed by fatigue, a small cloth bundle held to her chest; she half turns back toward a young scholar a few steps behind her. Her gaze rests for an instant on his chest, quiet and unreadable. Distant grey-tiled village roofs emerge from the mist. Keep every face, hand and key object within the upper 70 percent of the frame; the bottom quarter must stay calm and low-detail because a dialogue box covers it. Characters must match the attached reference sheets exactly, unmirrored, traditional right-over-left collars. Horror stays indirect: no wounds, no gore. No text, no calligraphy, no seals, no signature, no watermark. | 首版通过（重出 0 次）。画面上方 70% 容纳二人身影与神态交互，底部 26% 为平缓低细节晨雾泥路，无任何文字或印章。 |


## 美术补充包：剩余头像与动作 CG（2026-11-10）

以下记录最终提交给内置 ImageGen 的提示词结构、每项的变量/场景正文和附图。头像提示词采用下列通用正文并逐行替换对应角色、表情、身份标志和背景色；CG 提示词采用下列统一画风与结尾，并插入各项场景正文。保存原图至对应 raw/；头像缩至 1024×1024，CG 保持生成尺寸 1672×941（约 16:9）。

### 头像通用提示词正文

Using the attached character reference sheet as the exact identity reference, draw a light semi-chibi (Q-version) head-and-shoulders avatar of {CHARACTER}. Soft simplified features with a slightly larger head and eyes than realistic proportions, but not super-deformed; restrained, sincere expression suited to a melancholic Chinese ghost story: {EXPRESSION}. Preserve {MARKERS}. Facing the viewer with a slight three-quarter turn toward the viewer's right, unmirrored, traditional right-over-left collar. Square 1:1 framing, head and shoulders only, cut at mid-chest by the bottom edge, top of the head including headwear about 6 percent below the top edge, face centered. Clean lineart, soft cel shading with light watercolor texture, muted guofeng palette matching the reference. Background: perfectly flat uniform solid pure RGB {SCREEN}, no gradient, no shadow, no border, no frame, no other objects. No text, no calligraphy, no seals, no watermark.

#### chen_resolve.png
附图：art/refs/rs_chen.webp。替换项：CHARACTER = Lady Chen, a dignified young married woman; EXPRESSION = firm and determined, chin slightly raised; MARKERS = the neat married woman's bun with a silver hairpin, ochre-red jacket; SCREEN = green #00FF00。额外重出 0 次，首版采用。

#### chen_remorse.png
附图：art/refs/rs_chen.webp。替换项：CHARACTER = Lady Chen, a dignified young married woman; EXPRESSION = grief and remorse, tears on the lashes, eyes lowered; MARKERS = the neat married woman's bun with a silver hairpin, ochre-red jacket; SCREEN = green #00FF00。额外重出 0 次，首版采用。

#### dao_stern.png
附图：art/refs/rs_dao.webp。替换项：CHARACTER = a lean wandering Taoist about fifty; EXPRESSION = stern, sharp but weary eyes; MARKERS = the lotus crown with wooden pin, long thin beard, black-grey robe with yellow trim; SCREEN = green #00FF00。额外重出 0 次，首版采用。

#### dao_angry.png
附图：art/refs/rs_dao.webp。替换项：CHARACTER = a lean wandering Taoist about fifty; EXPRESSION = angry, deep frown; MARKERS = the lotus crown with wooden pin, long thin beard, black-grey robe with yellow trim; SCREEN = green #00FF00。额外重出 0 次，首版采用。

#### shen_terror.png
附图：art/refs/rs_shen.webp。替换项：CHARACTER = Madam Shen, a gaunt wealthy mistress about fifty-five; EXPRESSION = terrified, eyes wide, clutching the rosary; MARKERS = heavy gold hairpins, dark purple brocade jacket, a rosary in her hand at the bottom edge; SCREEN = green #00FF00。额外重出 0 次，首版采用。

### CG 通用提示词前缀与结尾

通用画风前缀：Traditional Chinese ink wash painting with light color washes (shuimo with pale mineral color), visible xuan paper texture, expressive brushwork, generous negative space, soft drifting mist, muted palette of ink black, warm grey, pale ochre, indigo and touches of rouge, cinematic 16:9 composition.

通用结尾：Keep every face, hand and key object within the upper 70 percent of the frame; the bottom quarter must stay calm and low-detail because a dialogue box covers it. Characters must match the attached reference sheets exactly, unmirrored, traditional right-over-left collars. Horror stays indirect: no wounds, no gore. No text, no calligraphy, no seals, no signature, no watermark.

#### mirror.png
附图：art/refs/style_day.webp、assets/bg/study_in.webp、art/refs/rs_nv.webp、art/refs/rs_gui.webp。场景正文：A sunlit scholar's study in the morning. The young woman sits before a small round mirror, raising a hand to place a flower in her hair. In the mirror, faint and easy to miss, her reflection is a pale jade-green silhouette instead of her pink-clad self, and a thin crack runs across the glass; her other fingertip quietly presses on the crack. Subtle and eerie, not frightening. 额外重出 0 次，首版采用。

#### needle.png
附图：art/refs/style_night.webp、assets/bg/home_night.webp、art/refs/rs_chen.webp。场景正文：Night in the main hall by a single oil lamp. Lady Chen sits with unfinished embroidery on her lap; the needle has stopped mid-pull, thread taut, her fingers motionless while her eyes stay lowered. At the frame's edge, the moon-white sleeve of her husband who has just come home. Warm lamplight against cool indigo night. 额外重出 0 次，首版采用。

#### whisk.png
附图：art/refs/style_day.webp、assets/bg/market.webp、art/refs/rs_dao.webp、art/refs/rs_wang.webp。场景正文：A busy daytime market street. The lean Taoist holds out his white horsetail fly-whisk toward the young scholar; the long white strands hang still like calm water while the crowd blurs around them. The scholar's hand is just reaching for it. 额外重出 0 次，首版采用。

#### jacket.png
附图：art/refs/style_day.webp、assets/bg/study_in.webp、art/refs/rs_chen.webp、art/refs/rs_nv.webp。场景正文：In the study, Lady Chen gently straightens the collar of a padded jacket she has just placed on the young woman's shoulders. The young woman keeps her eyes lowered, the jacket folded over her arm; Chen's other hand presses on her own sleeve. Two women, cautious and kind. 额外重出 0 次，首版采用。

#### lamp_walk.png
附图：art/refs/style_night.webp、assets/bg/home_night.webp、art/refs/rs_chen.webp。场景正文：A rainy night corridor. Lady Chen walks alone holding a lantern high; her long shadow stretches across the wall ahead of her. Her face is set and unreadable. 额外重出 0 次，首版采用。

#### skin_touch.png
附图：art/refs/style_night.webp、assets/bg/study_night.webp、art/refs/rs_wang.webp、art/refs/rs_chen.webp。场景正文：Night in the study. A life-size scroll painting of a woman lies unrolled on the desk. The scholar's fingertips have just touched the silk and are recoiling, his face pale, because it feels like warm skin. Lady Chen stands beside the desk holding a lamp, watching him. 额外重出 0 次，首版采用。

#### new_grave.png
附图：art/refs/style_day.webp、assets/bg/grave_dawn.webp、art/refs/rs_nv.webp、art/refs/rs_dao.webp。场景正文：A sunny hillside at dawn with a fresh burial mound. The young woman stands beside it in pale lotus-pink; the water stains on her sleeves are fading away like mist. Far behind, the Taoist watches, one hand resting on his fly-whisk. Peaceful, open sky. 额外重出 0 次，首版采用。

#### rosary.png
附图：art/refs/style_night.webp、assets/bg/shen_well.webp。场景正文：Object only, no people: on wet mud beside an old stone well at night, a broken string of prayer beads lies scattered; one bead rolls toward the well's rim. A dropped corner of dark purple brocade at the frame's edge. Cold moonlight, utterly still. 本项实际结尾明确无人物、脸或手；额外重出 0 次，首版采用。

#### give_heart.png
附图：art/refs/style_night.webp、assets/bg/study_night.webp、art/refs/rs_wang.webp、art/refs/rs_gui.webp、art/refs/rs_nv.webp。场景正文：Night in the study. The scholar stands with one hand pressed over his own heart, calm and willing. Facing him, the ghost woman in her true form looks at him with sorrow and gratitude. Between them, a faint warm thread of light. No wounds, no blood. 额外重出 0 次，首版采用。

#### aftermath.png
附图：art/refs/style_night.webp、assets/bg/courtyard_night.webp、art/refs/rs_wang.webp、art/refs/rs_chen.webp。任务书要求重出旧版 1 次；本轮生成后无额外重试，采用新图。场景正文：Night in a stone-paved courtyard under cold moonlight. The dying scholar rests his head gently on his wife's lap; only Lady Chen's ochre-red sleeve and tender hand caressing his pale cheek are visible at the upper side. The scholar's eyes are half-closed in peace, his moon-white robe bearing a flat dark crimson stain without visible gore. Crucially, a plain silver hairpin smudged with dried well mud lies clearly visible beside his slightly open hand near his chest in the upper half of the image. 追加避让要求：Keep every face, hand and key object within the upper 70 percent of the frame; the bottom quarter must stay calm and low-detail because a dialogue box covers it. Place the muddy silver hairpin above the lower quarter, clearly discernible beside his hand at chest level. Characters must match the attached reference sheets exactly, unmirrored, traditional right-over-left collars. Horror stays indirect: no wounds, no gore. No text, no calligraphy, no seals, no signature, no watermark.


### ImageGen 包装字段（与上述逐项正文组合后提交）

头像各项的共同包装字段：Use case: illustration-story. Asset type: project-bound Q-version dialogue avatar, 1024x1024 square. Input image: Image 1 is the exact character identity reference sheet for the named character; preserve the listed face, markers and traditional right-over-left collar. Do not mirror. Primary request: 使用对应头像通用提示词正文，代入该条目的角色、表情与标志。Scene/backdrop: 使用该条目指定的纯绿幕。Constraints: no border, frame, or other objects. No text, calligraphy, seals, or watermark.

CG 各项的共同包装字段：Use case: historical-scene. Asset type: project-bound 16:9 narrative game CG, keep 16:9 aspect ratio. Input images: 按对应附图清单顺序附加风格锚、场景锚和身份锚，并说明各图的参考用途。Primary request: 使用对应 CG 通用画风前缀与该条目的场景正文。Composition: 使用 CG 通用结尾中的上方 70% 避让要求和底部低细节要求。Constraints: 使用 CG 通用结尾中的身份一致、非镜像、无伤口/血腥和无文字要求；rosary 项另外明确 no people, faces, or hands。aftermath 另加银簪必须在画面上方、手边胸口处且沾井泥的避让要求。
