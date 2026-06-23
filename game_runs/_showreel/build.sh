#!/usr/bin/env bash
# 无损插卡 showreel 构建脚本
# - 新9本(1920)原视频 concat -c copy 直通 -> 比特无损
# - 旧6本(1280)lanczos 放大到 1920 重编一次(crf18)
# - 每段前插一张标题卡:暗化首帧 + 游戏名,末尾 0.6s 溶解到"干净首帧"
#   干净首帧 == 该段视频第一帧 -> 硬切隐形,转场不生硬,视频零损失
set -euo pipefail

ROOT="game_runs"
OUT="$ROOT/_showreel"
PARTS="$OUT/parts"
mkdir -p "$PARTS"

FONT="$OUT/font.ttf"
[ -f "$FONT" ] || cp /c/Windows/Fonts/arialbd.ttf "$FONT"

# 编码参数,与源对齐,保证 concat -c copy 接缝干净
ENC=(-c:v libx264 -profile:v high -level 5.0 -pix_fmt yuv420p -r 25
     -video_track_timescale 12800 -crf 18 -preset slow -an)

new1920=(DustOutlaw ShadowArena NeonRacer StarVanguard StickmanFighter \
         RaccoonDungeon NinjaCat MermaidPrincess NinjaStealth)
old1280=(ShadowNinja MoonRonin GeoStorm DustTown InkLine ShadowLeap)
order=( "${new1920[@]}" "${old1280[@]}" )

# 可选子集测试: LIMIT="DustOutlaw ShadowNinja" bash build.sh
if [ -n "${LIMIT:-}" ]; then order=( $LIMIT ); fi

is_old() { for x in "${old1280[@]}"; do [ "$x" = "$1" ] && return 0; done; return 1; }
pretty() { echo "$1" | sed 's/\([a-z0-9]\)\([A-Z]\)/\1 \2/g'; }

LIST="$OUT/list.txt"
: > "$LIST"
idx=0
for g in "${order[@]}"; do
  idx=$((idx+1)); num=$(printf "%02d" "$idx")
  src="$ROOT/$g/playtest/playthrough.mp4"
  name=$(pretty "$g")
  clean="$PARTS/${num}_clean.png"
  card="$PARTS/${num}_card.mp4"
  echo ">>> [$num] $g ($name)"

  # 干净首帧(旧的同样用 lanczos 放大,保证与放大后视频首帧一致)
  if is_old "$g"; then
    ffmpeg -y -v error -i "$src" -vf "scale=1920:1152:flags=lanczos,setsar=1" -frames:v 1 "$clean"
  else
    ffmpeg -y -v error -i "$src" -frames:v 1 "$clean"
  fi

  # 标题卡: 暗化首帧+编号+游戏名, 起始黑场淡入, 末段溶解到干净首帧
  ffmpeg -y -v error \
    -loop 1 -t 2.0 -i "$clean" \
    -loop 1 -t 1.0 -i "$clean" \
    -filter_complex \
    "[0:v]drawbox=0:0:iw:ih:black@0.5:t=fill,\
drawtext=fontfile=$FONT:text='$num / 15':fontsize=44:fontcolor=white@0.75:x=(w-text_w)/2:y=h/2-150,\
drawtext=fontfile=$FONT:text='$name':fontsize=120:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2,\
fade=t=in:st=0:d=0.4,setsar=1,format=yuv420p[b];\
[1:v]setsar=1,format=yuv420p[c];\
[b][c]xfade=transition=fade:duration=0.6:offset=1.4,fps=25,format=yuv420p[v]" \
    -map "[v]" "${ENC[@]}" "$card"
  echo "file 'parts/${num}_card.mp4'" >> "$LIST"

  # 视频本体
  if is_old "$g"; then
    body="$PARTS/${num}_body.mp4"
    ffmpeg -y -v error -i "$src" \
      -vf "scale=1920:1152:flags=lanczos,setsar=1,format=yuv420p" "${ENC[@]}" "$body"
    echo "file 'parts/${num}_body.mp4'" >> "$LIST"
  else
    echo "file '../$g/playtest/playthrough.mp4'" >> "$LIST"
  fi
done

OUTFILE="${OUTFILE:-$OUT/showreel.mp4}"
echo ">>> concat -c copy -> $OUTFILE"
ffmpeg -y -v error -f concat -safe 0 -i "$LIST" -c copy -movflags +faststart "$OUTFILE"
echo "DONE: $OUTFILE"
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1 "$OUTFILE"
