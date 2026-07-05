# ShadowAbyss · 神曲场景图提示词

剧本(story/divine-comedy.json)共 32 个主场景。其中 **9 个地狱圈直接复用现有全景**(见文末),
**需要新出图 23 张 + 1 张可选封面**。

## 出图规范(每张都适用)

- **尺寸**:1376×768(与现有 panorama_* 一致;16:9 生成后裁切也可)
- **保存路径与文件名**:`game_runs/ShadowAbyss/scene/<场景id>.png`(下方每条标题即文件名)
- **构图约束**:画面底部约 1/4 保持简洁的深色地面剪影(叙事面板会盖在那里);
  主体光源与视觉焦点放在中上部;左下角会站人物剪影,别放重要细节
- **禁止**:可辨识的文字/字母、人脸五官细节、水印、UI 元素

**基础风格前缀**(每条提示词前面都拼上这段):

> high-contrast silhouette art, pure solid-black foreground shapes with no interior detail,
> layered depth with soft volumetric fog, single dramatic backlight, muted desaturated
> gradient background, moody cinematic LIMBO/INSIDE aesthetic, minimal near-two-tone palette,
> wide panoramic 16:9 composition, simple dark ground band across the bottom quarter,
> no text, no watermark, no faces

四章的色温走向:第一章近乎全黑的蓝绿 → 第二章灰烬与余烬红 → 第三章黎明前的青金 → 第四章亮到过曝的金白(剪影反衬在光上)。

---

## 第一章 · 黑暗森林

### 1. `selva_oscura.png` — 黑暗森林
Endless tangled forest of gnarled black trees, branches woven into a suffocating net that blocks all sky; a single faint cold blue-grey glimmer deep between distant trunks as the only light; rotting leaves and root shapes on the ground band; oppressive, lost, dreamlike. Palette: near-black desaturated blue-green (#0a0f12 to #04070a), one dim cyan accent.

### 2. `virgil_meet.png` — 森林的边缘
The dark forest thinning toward the right side of frame; beyond the last trees, the silhouette of a sunlit hill far in the distance, its summit rimmed with pale gold; a soft column of warm light breaking into the gloom where forest ends; mist drifting between trunks. Palette: black-green forest against a faint amber-grey opening.

## 第二章 · 地狱(大门与渡口等 8 张新图)

### 3. `hell_gate.png` — 地狱之门
A colossal ancient stone gate towering out of frame, cyclopean architrave with a band of faintly ember-glowing abstract glyph marks (unreadable, no real letters); a slow river of tiny bent human silhouettes streaming through the opening into darkness; ash falling like snow. Palette: ash grey and charcoal with dull ember-red glow from within the gate.

### 4. `acheron.png` — 阿刻戎河岸(卡戎渡口)
A wide pitch-black river under a low blood-red sky; a long narrow ferry boat mid-river, a gaunt hooded ferryman silhouette standing with a pole; dense crowd of soul silhouettes waiting on the near shore, arms reaching; scattered fire sparks drifting over the water. Palette: black water, deep blood-red horizon glow.

### 5. `dis_gate.png` — 狄斯城门
Iron city walls of a hellish fortress stretching across the frame, seams and mortar lines glowing furnace-red like cooling lava; massive shut gates; on the battlements three winged fury silhouettes with serpent-hair; black marsh water in the foreground reflecting the red. Palette: rust red, iron black, furnace glow.

### 6. `geryon.png` — 深渊之缘(革律翁)
The broken edge of a great cliff over a bottomless void; hovering just below the rim, a huge serpentine winged beast silhouette with a long coiling scorpion tail, wings spread wide; the abyss below fading into spiraling layers of darkness; small rope-like waterfall dropping off the edge. Palette: dim violet-brown dusk over black void.

### 7. `lucifer.png` — 地心(冰封的路西法)
A vast glacial cavern at the center of the earth; frozen black lake floor; rising from the ice at center, a gigantic dark titan buried to the waist, three great bat wings spread against a faint cold glow; tiny frozen soul shapes trapped inside the ice sheet; utter stillness. Palette: glacial blue-black, pale ice highlights.

### 8. `hell_exit.png` — 地球的另一面(重见星辰)
Inside a narrow natural rock chimney, walls of black stone framing the view upward and outward to an opening filled with deep indigo night sky and brilliant dense stars; the first stars after the abyss; faint cool light spilling down the rocks. Palette: black rock, deep indigo sky, sharp white star points.

## 第三章 · 炼狱(11 张新图)

### 9. `purg_shore.png` — 炼狱海岸
A calm pre-dawn ocean horizon; rising from the sea, an immense solitary conical mountain whose summit vanishes into glowing sky; gentle silver waves lapping a dark reed shore; far out on the water a single spark of white light like an approaching angel-boat. Palette: teal to rose dawn gradient, dark sea, silver highlights.

### 10. `terrace_pride.png` — 傲慢者之台
A narrow rock terrace winding along the flank of the great mountain; bent human silhouettes crushed under enormous stone slabs carried on their backs, circling the ledge; faint carved relief shapes hinted on the inner cliff wall; first true morning light raking across. Palette: cold slate grey warmed by low amber sun.

### 11. `terrace_envy.png` — 嫉妒者之台
A bare stone terrace the color of livid bruise; soul silhouettes in rough haircloth seated in a row against the cliff, shoulder leaning on shoulder like blind beggars, heads bowed; low flat light, long thin shadows. Palette: livid blue-grey, faint violet.

### 12. `terrace_wrath.png` — 愤怒者之台
A terrace swallowed by dense acrid black-brown smoke; walking figures half-dissolved into the murk, only fragments of silhouette visible; one narrow shaft of clean golden light cutting diagonally through the smoke like a path. Palette: umber smoke, single gold shaft.

### 13. `terrace_sloth.png` — 怠惰者之台
Night on the mountain terrace; a stream of soul silhouettes running in an endless urgent loop around the ledge, bodies leaning forward with motion, almost blurring together; cold moonlight and deep dusk sky. Palette: dusk violet and slate blue, pale moon rim-light.

### 14. `terrace_avarice.png` — 贪婪者之台
A terrace where soul silhouettes lie face-down on the bare ground, bound hand and foot, packed along the path so walkers must step carefully between them; a low haze of golden dust hanging near the ground. Palette: earthy ochre and umber, dull gold haze.

### 15. `terrace_gluttony.png` — 贪食者之台
Two strange luminous trees on the terrace, boughs heavy with glowing fruit growing downward out of reach; a thin cascade of bright water falling from the high rock; emaciated soul silhouettes with hollow outlines reaching toward the unreachable branches. Palette: deep green shadow with gold-green light.

### 16. `terrace_lust.png` — 淫欲者之台(火墙)
The final terrace: a continuous wall of roaring flame covering the whole ledge, licking out over the drop; only a narrow dark rim of safe path along the outer edge above the void; walking figures visible inside the fire as darker shapes; sparks rising into violet dusk. Palette: saffron and vermilion flame against violet-blue evening.

### 17. `eden.png` — 地上乐园
An ancient luminous forest on the mountain summit, tall graceful trees with soft god-rays pouring through the canopy; a flowered meadow and a crystal-clear stream crossing the foreground; on the far bank a graceful female silhouette gathering flowers; drifting petals in the light. Palette: warm gold-green, cream light, dark elegant tree silhouettes.

### 18. `lethe.png` — 忘川之畔
A close bend of the crystal stream inside the paradise forest, water faintly self-luminous, surface like liquid silver glass; mossy dark banks and flower silhouettes; light rippling reflections cast up onto overhanging leaves; intimate and hushed. Palette: silver-green, soft white water glow.

### 19. `heaven_threshold.png` — 乐园之巅(维吉尔的告别)
The very summit clearing above a boundless sea of sunlit clouds; overwhelming morning light flooding from above; an elder robed poet silhouette turned away, edges dissolving into the brightness as if becoming light; a laurel branch shape drifting. Palette: bittersweet warm white and gold, thin violet shadow.

## 第四章 · 天堂(4 张新图)

### 20. `beatrice.png` — 凯旋的车驾
Amid a storm of falling flower petals and radiant mist, a triumphal two-wheeled chariot drawn by a great griffin (eagle-lion silhouette); standing upon it a veiled female figure crowned with olive, so backlit she reads as an elegant dark silhouette inside a blaze of white-gold glory. Palette: white-gold radiance, crimson petal accents, dark silhouette core.

### 21. `spheres.png` — 诸天球
Ascending through translucent concentric celestial spheres, vast glassy rings nested to infinity, each carrying a glowing planetary orb of different warmth; faint orbital arcs and slow star trails; two tiny rising human silhouettes dwarfed at lower left of the immensity. Palette: pearl white, sapphire, soft gold.

### 22. `starry_heaven.png` — 恒星天(俯望群星)
Looking down from the sphere of fixed stars: far below, a tiny dim earth almost lost in darkness; all around, wheeling constellations and slow triumphal processions of lights like silent fireworks; overwhelming depth of star field. Palette: deep sapphire and black, diamond-white lights, faint gold nebulae.

### 23. `empyrean.png` — 至高天(白玫瑰)
The celestial white rose: an infinite amphitheater of luminous petals rising in rings, each petal a seat holding a small glowing soul; a river of pure light circling the golden center too bright to look at, center near-overexposed; at the bottom threshold one tiny dark human silhouette gazing up. Palette: pure white and gold, the faintest warm shadow tones.

## 可选

### 24. `cover.png` — 封面(开始画面用,可不做)
A single vertical-feeling panoramic composition of the whole journey: at bottom a black tangled forest, spiraling down-then-up through a funnel of hellish ember rings, a lone conical mountain in dawn light, and above it all an opening rose of radiant white-gold light with wheeling stars; one tiny traveler silhouette with a faint hand-flame at the forest's edge, beginning the path. Palette: black → ember → teal dawn → white gold, bottom-to-top.

---

## 直接复用的 9 张(不用出)

| 场景 id | 现有文件 |
|---|---|
| limbo 灵薄狱 | scene/panorama_limbo.png |
| circle_lust 淫欲者之圈 | scene/panorama_lust.png |
| circle_gluttony 暴食者之圈 | scene/panorama_gluttony.png |
| circle_avarice_hell 守财与挥霍者之圈 | scene/panorama_greed.png |
| circle_wrath 愤怒者之沼 | scene/panorama_wrath.png |
| circle_heresy 异端者之墓 | scene/panorama_heresy.png |
| circle_violence 暴力者之圈 | scene/panorama_violence.png |
| circle_fraud 恶囊十沟 | scene/panorama_fraud.png |
| circle_treachery 背叛者之湖 | scene/panorama_betrayal.png |

> 图没到位之前,游戏会用各章色调的渐变底作为占位背景,随时可玩;
> 每张图放进 `scene/` 后刷新即可生效,不需要改代码。
