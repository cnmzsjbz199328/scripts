#!/usr/bin/env bash
# PokeMood — 场景背景三层批量生成 (agy / Nano Banana)
#
# 用法: bash tools/gen-bg.sh [场景slug ...]   （不给参数 = 全部）
# 产物: assets/bg/<slug>/raw/{far,mid,fore}.png  → 再跑 tools/process-bg.mjs --scene=<slug>
#
# 提示词里的硬约束全部来自 DESIGN §4.6 的实测教训，改之前先读那一节：
#   far  — 不透明整图，上方中央要有一个亮光源（光柱 ATMOS 从那儿往下打）
#   mid  — 绿幕；家具底座必须压在地板上不许留绿；家具只能画在 x 8~35% / 65~95%
#          （前景两列内缘之间的缝在画布 180~698，家具贴边就永远看不见）
#   fore — 绿幕；中央 28~72% 必须全绿（会盖住角色）；只做两侧画框 + 底部窄条
#
# 地面线【不写进提示词】——生图模型不响应数值构图约束，一律在装配侧按实测定标。

set -u
GAME_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BG_DIR="$GAME_DIR/assets/bg"

COMMON="Painterly semi-realistic fantasy game background illustration, rich detail, cinematic lighting, no text, no letters, no watermark, no logo, no people, no characters, no creatures. Image size 1440x1152 pixels (5:4 aspect)."
GREEN="The ENTIRE background and every empty area must be pure flat chroma-key green RGB(0,255,0), completely uniform, no gradient, no green tint spilling onto the subjects."

# ── 每个场景一行：slug|far 描述|mid 描述|fore 描述 ─────────────────────
read -r -d '' SCENES <<'EOF'
terrace|A moonlit open stone terrace at the top of a wizard tower at night. Deep blue night sky filling the upper two thirds, a huge full moon high in the upper center as the dominant light source, drifting thin clouds, distant mountain silhouettes and tiny town lights far below. Lower third is a pale stone terrace floor receding toward a low stone balustrade.|Waist-high carved stone balustrade posts, a bronze telescope on a tripod, a low stone bench with a folded star chart, potted night-blooming flowers. Bottom 30 percent is one continuous pale stone terrace floor in perspective, its far edge at about 70 percent of the image height.|Two tall dark stone corner pillars with climbing ivy, one along the far left edge and one along the far right edge, plus a narrow band of dark stone paving across the very bottom of the image.
library|The interior of a vast circular magic library at night. Towering bookshelves curving away into the distance, a domed ceiling with a glowing magical chandelier high in the upper center as the dominant light source, floating open books and drifting motes far away. Lower third is a dark polished wooden floor with an inlaid brass compass pattern.|Tall oak bookshelves crammed with leather tomes, a rolling library ladder, a reading lectern with an open glowing grimoire, stacked book piles. Bottom 30 percent is one continuous polished dark wooden floor in perspective, its far edge at about 70 percent of the image height.|Two massive dark carved wooden bookcase ends, one along the far left edge and one along the far right edge, plus a narrow band of dark floorboards across the very bottom of the image.
greenhouse|The interior of a bright botanical glass greenhouse in daytime. Arched wrought-iron and glass vaulted ceiling filling the upper two thirds, brilliant warm sunlight pouring through a large glass skylight high in the upper center as the dominant light source, lush green foliage and hanging vines beyond the glass. Lower third is a light terracotta tiled floor.|Wooden planting benches with clay pots and blooming flowers, a tall trellis wrapped in flowering vine, a copper watering can, a small citrus tree in a barrel. Bottom 30 percent is one continuous light terracotta tiled floor in perspective, its far edge at about 70 percent of the image height.|Two lush hanging fern and flowering vine clusters draping down, one along the far left edge and one along the far right edge, plus a narrow band of terracotta tile across the very bottom of the image.
aurora|A vast open snowfield at night under a brilliant green and violet aurora borealis. Aurora ribbons fill the upper two thirds of the sky with the brightest glowing curtain high in the upper center as the dominant light source, scattered stars, distant snow-capped mountain range on the horizon. Lower third is a smooth wind-swept snow plain with soft blue shadows.|A cluster of snow-laden pine saplings, a small cairn of ice-rimed stones, a half-buried rune stone glowing faintly blue, drifted snow banks. Bottom 30 percent is one continuous smooth snow plain in perspective, its far edge at about 70 percent of the image height.|Two tall snow-laden pine trunks with heavy drooping boughs, one along the far left edge and one along the far right edge, plus a narrow band of crusted snow and small icicles across the very bottom of the image.
classroom|The interior of a magic academy lecture hall. A huge dark slate blackboard covered in glowing chalk runes and arcane diagrams across the upper middle, tall arched windows to either side, a glowing floating orb lamp high in the upper center as the dominant light source, banked rows of empty student desks receding into the distance. Lower third is a worn wooden floor.|A tall wooden teaching lectern, a rolled star map on a stand, a globe of the heavens on a brass axis, a cabinet of labelled potion jars. Bottom 30 percent is one continuous worn wooden classroom floor in perspective, its far edge at about 70 percent of the image height.|Two dark wooden column pilasters with brass sconces, one along the far left edge and one along the far right edge, plus a narrow band of worn floorboards across the very bottom of the image.
EOF

gen() {  # gen <slug> <layer> <prompt>
  local slug="$1" layer="$2" prompt="$3"
  local out="$BG_DIR/$slug/raw/$layer.png"
  if [ -f "$out" ]; then echo "  跳过（已存在）: $slug/$layer"; return; fi
  echo "  生成 $slug/$layer ..."
  agy --dangerously-skip-permissions --add-dir "$GAME_DIR" --print \
    "Generate an image using your nano banana image tool and save the PNG to $out . $prompt" \
    >/dev/null 2>&1
  if [ -f "$out" ]; then echo "  ✅ $slug/$layer"; else echo "  ❌ $slug/$layer 没产出"; fi
}

WANT="${*:-}"
while IFS='|' read -r slug far mid fore; do
  [ -z "$slug" ] && continue
  if [ -n "$WANT" ] && ! echo " $WANT " | grep -q " $slug "; then continue; fi
  echo "── $slug ──────────────────────────────"
  mkdir -p "$BG_DIR/$slug/raw"

  gen "$slug" far \
    "$far $COMMON The whole image is fully opaque with no transparent or green areas."

  # mid：两条硬要求都是踩过的坑（家具悬空 / 家具贴边），见 DESIGN §4.6 ①b
  gen "$slug" mid \
    "$mid Every object's base must sit firmly ON the floor with absolutely no gap and no green showing between the object and the floor. All the objects must be placed only in the left 8 to 35 percent and the right 65 to 95 percent of the image width; keep the central 35 to 65 percent above the floor completely empty. Do not let any object touch the outer left or right edge of the image. Everything above the floor's far edge is empty. $GREEN $COMMON"

  # fore：中央必须空，否则会盖住角色（depth > 角色）
  gen "$slug" fore \
    "$fore These are soft-focus foreground framing elements seen very close to the camera. The entire central region from 28 percent to 72 percent of the image width must be completely empty pure green, nothing at all there. The bottom band must be no taller than 12 percent of the image height. $GREEN $COMMON"
done <<< "$SCENES"

echo "全部完成。下一步: node tools/process-bg.mjs --scene=<slug>"
