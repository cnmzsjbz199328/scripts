# PaintedSkin 美术设定圣经

## 核心画风

### `[CHAR]` 人物与立绘

> Chinese-style anime character illustration (guofeng anime), clean refined lineart, soft cel shading with light painterly rendering, delicate expressive face, accurate Ming-dynasty hanfu with right-over-left crossed collar (youren), realistic layered fabric folds, muted elegant palette, even soft front lighting, high detail, no text, no watermark, no logo, no seal stamp.

### `[INK]` 背景与 CG

> Traditional Chinese ink wash painting with light color washes (shuimo with pale mineral color), visible xuan paper texture, expressive brushwork, generous negative space, soft drifting mist, muted palette of ink black, warm grey, pale ochre, indigo and touches of rouge, cinematic 16:9 composition, no people unless specified, no text, no calligraphy, no red seal stamps, no signature, no watermark.

## 色彩走向

- 第一幕「遇」：晨与昼以暖灰为主，胭脂少量点缀；雨夜转冷。
- 第二幕「皮」：书斋夜色以冷靛衬烛光暖黄；沈府以压抑的深赭和铁灰为主。
- 第三幕「心」：坦诚线由冷转暖；妒线落在夜色和火光的赭红；色心线突出火光。
- 绿幕角色衣服避开绿色和青色。女鬼面色青绿，鬼相立绘用纯品红底。
- 所有角色保持传统右衽，画面不允许水平翻转。

## 人物身份卡

| id | 角色 | 身高比 | 身份外观与固定标志 |
|---|---|---:|---|
| `wang` | 王生 | 1.00 | Wang Sheng, a Taiyuan scholar about 25, slender and handsome with a gentle, slightly irresolute face and a charming smile, thin brows, black hair in a topknot under a black square scholar's cap (fangjin), moon-white zhiduo robe with indigo collar trim, cloth belt with a small jade pendant, black cloth shoes. 风流而不英武，善良与软弱并存。 |
| `chen` | 陈氏 | 0.94 | Lady Chen, the scholar's wife about 24, dignified and intelligent, calm eyes with a guarded edge, hair in a neat married woman's bun with a silver hairpin, ochre-red ao jacket over an indigo mamian pleated skirt. 端庄坚韧，眼神里有戒备。 |
| `nv` | 女子（皮相） | 0.92 | A breathtaking young woman about seventeen, oval face, long phoenix eyes with faint unreadable sadness, **a tiny red mole under her left eye**, long black hair in a loose maiden style with one plain silver hairpin, pale lotus-pink and moon-white ruqun with a light silk shawl; carries a small cloth bundle in her first scene. 朱砂痣是贯穿全剧的身份标记。 |
| `gui` | 女鬼（鬼相） | 0.92 | The same woman's true ghost form: exactly the same face shape and the same red mole under her left eye; pale jade-green skin, dark hollow eyes, long black hair loose and wild, a faded water-stained version of the same lotus-pink clothes. Frightening but recognizably the same woman, with sorrow as well as anger. Horror stays indirect; no wounds, gore, or exposed body. |
| `dao` | 道士止水 | 1.02 | A wandering Taoist about 50, lean, sharp but weary eyes, long thin beard, black-grey Taoist robe with yellow trim, hair in a topknot with a lotus crown and wooden pin, white horsetail fly-whisk, peachwood sword on his back, gourd at his waist. Looks detached while carrying an old hurt. |
| `shen` | 沈夫人 | 0.90 | Madam Shen, a wealthy household mistress about 55, once beautiful, now gaunt and sleepless, heavy gold hairpins, dark purple brocade jacket, a rosary in her hand, haunted eyes. Old and childless, frightened and morally complicated, not a caricature. |

## 身份一致性规则

- G3 锁定的 `art/refs/rs_<角色>.webp` 是唯一身份锚。生成角色立绘时必须以对应参考图作输入，复用脸型、发型、衣服、颜色和标志物。
- `gui` 必须同时附带 `rs_gui` 与 `rs_nv`，保留同一脸型及左眼下朱砂痣。
- 绿底使用纯绿 `#00FF00`；`gui` 使用纯品红 `#FF00FF`。不带地面、投影或额外物件。
- 立绘完整显示头顶到鞋底，由 `process-art.mjs` 按包围盒归一化到 640×1100；脚底 y=1080。运行时以 1.0 显示，画布顶贴屏幕顶，下面部分由对话框遮挡。
- 不使用 `flipX`。生成时明确保持参考图中的传统右衽，禁止镜像。
- 背景底部四分之一保持平静、少细节；人物站位高度的左右三分区不放关键焦点物。
- 所有图片禁止文字、书法、印章、题款、签名和水印。恐怖通过影子、留白、雾和物件表现，不出现伤口、破洞、内脏或断首。
