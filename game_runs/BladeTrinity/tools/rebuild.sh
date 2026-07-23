#!/bin/bash
# BladeTrinity 图集重建 —— 从 12 段绿幕源视频到三张成品 spritesheet
#
# 用法（仓库根目录执行）：
#   bash game_runs/BladeTrinity/tools/rebuild.sh
#
# 依赖：ffmpeg（PATH 中可用）、npm install（sharp / tsx）
# 源片：references/BladeTrinity/clips/*.mp4（12 段，gitignored）
# 产物：game_runs/BladeTrinity/assets/sprites/{sword,water,north}.{webp,json}

set -e
cd "$(dirname "$0")/../../.."          # -> 仓库根
ROOT=$(pwd)
VS=skills/video-sprite
SRC=references/BladeTrinity/clips
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# ─────────────────────────────────────────────────────────────
# 步骤 1：预裁去黑边
#
# 源视频 1280x720，但首帧参考图是 1152x1152 正方形，模型左右各补了
# 279px 黑色 pillarbox。chroma-key 只抠绿不抠黑，黑边会被当成前景，
# 撑爆 bbox 把角色压成极小 —— 必须在抽帧前裁掉。
# 往内多裁 4px：x=279 那一列是 rgb(30,52,26) 的暗绿接缝，
# 离纯绿距离 205 > 阈值 110，会被判成前景形成竖线。
# ─────────────────────────────────────────────────────────────
echo "[1/4] 预裁去黑边 ..."
mkdir -p "$TMP/clips"
for f in $SRC/*.mp4; do
  n=$(basename "$f" .mp4)
  ffmpeg -v error -i "$f" -vf "crop=712:716:284:2" \
         -c:v libx264 -crf 14 -preset fast -an "$TMP/clips/$n.mp4" -y
done

# ─────────────────────────────────────────────────────────────
# 步骤 2-3：两遍抽帧
#
# 分段边界（帧号 @24fps）不是照抄提示词的设计时间，而是逐帧算
# 抠图 bbox 的宽高比 / 质心 / 顶端 y 定出来的：
#   - 倒地时刻 = w/h 升到高位后完全恒定的那一帧
#   - stance 开头几帧是从定妆姿势过渡，必须跳过
#     （north 前 16 帧在转身，含正面/背面，绝不能进 idle）
#
# scale 取六行探测值的【最小值】而非走路值：攻击帧 bbox 可达
# 651x548，按走路 scale 缩放会变成 290x244，远超 192x208 格子，
# 刀和身体都会被切。代价是角色在格内偏小，但行内绝对一致。
# ─────────────────────────────────────────────────────────────
proc() { # CH anim clip f0 f1 nf loop [scale]
  local CH=$1 anim=$2 clip=$3 f0=$4 f1=$5 nf=$6 loop=$7 sc=$8
  local s=$(node -e "console.log(($f0/24).toFixed(3))")
  local e=$(node -e "console.log(($f1/24).toFixed(3))")
  local fps=$(node -e "console.log(Math.max(1,Math.round($nf/(($f1-$f0)/24))))")
  local extra=""
  [ "$loop" = "once" ] && extra="--no-loop"
  [ -n "$sc" ] && extra="$extra --scale=$sc"
  npx tsx $VS/process.ts "$CH" "$anim" "$TMP/clips/$clip.mp4" \
    --fps=$fps --frames=$nf --anchor --extract-fps=24 --start=$s --end=$e $extra 2>&1
}

run_char() {
  local CH=$1; shift
  local SPECS=("$@") MIN=""

  echo "[2/4] $CH 探测各行 scale ..."
  rm -rf "video_runs/$CH"; npx tsx $VS/prepare.ts "$CH" >/dev/null
  for spec in "${SPECS[@]}"; do
    IFS='|' read -r anim clip f0 f1 nf loop <<< "$spec"
    local sc=$(proc "$CH" "$anim" "$clip" "$f0" "$f1" "$nf" "$loop" \
               | sed -n 's/.*scale=\([0-9.]*\).*/\1/p' | head -1)
    [ -z "$MIN" ] || [ "$(node -e "console.log($sc<$MIN?1:0)")" = "1" ] && MIN=$sc
  done
  echo "      $CH 统一 scale=$MIN"

  echo "[3/4] $CH 统一 scale 重跑 ..."
  rm -rf "video_runs/$CH"; npx tsx $VS/prepare.ts "$CH" >/dev/null
  for spec in "${SPECS[@]}"; do
    IFS='|' read -r anim clip f0 f1 nf loop <<< "$spec"
    proc "$CH" "$anim" "$clip" "$f0" "$f1" "$nf" "$loop" "$MIN" >/dev/null
  done
  npx tsx $VS/assemble.ts "$CH" | tail -1
}

run_char sword \
  "walk|sword_stance|52|95|21|loop" "idle|sword_stance|8|51|21|loop" \
  "attack|sword_attack|12|64|21|once" "guard|sword_guard|8|64|21|once" \
  "hurt|sword_hit|0|44|18|once"      "down|sword_hit|44|74|16|once" \
  "jump|sword_jump|48|114|21|once"

run_char water \
  "walk|water_stance|56|95|21|loop" "idle|water_stance|12|55|21|loop" \
  "attack|water_attack|8|72|21|once" "guard|water_guard|4|76|21|once" \
  "hurt|water_hit|0|44|18|once"      "down|water_hit|44|74|16|once" \
  "jump|water_jump|63|114|21|once"

run_char north \
  "walk|north_stance|56|95|21|loop" "idle|north_stance|16|55|21|loop" \
  "attack|north_attack|8|72|21|once" "guard|north_guard|4|76|21|once" \
  "hurt|north_hit|0|46|18|once"      "down|north_hit|46|78|16|once" \
  "jump|north_jump|24|72|21|once"

# ─────────────────────────────────────────────────────────────
# 步骤 4：去绿溢色 + 安装
#
# 挥击瞬间刀身被生成成半透明动态模糊，绿幕透光，抠出来是一片绿色
# 三角（源素材违反了提示词的 zero motion blur，不是抠图参数问题）。
# 把前景里绿通道显著压过红蓝的像素绿压回去、亮度补回，
# 刀变成淡色刀光残影 —— 在格斗游戏里反而像挥砍特效。
# ─────────────────────────────────────────────────────────────
echo "[4/4] 去绿溢色 + 安装成品 ..."
mkdir -p game_runs/BladeTrinity/assets/sprites
node -e "
const sharp=require('sharp'),fs=require('fs');
const D='game_runs/BladeTrinity/assets/sprites/';
const FW=192, FH=208;
// 素材规格是【全部朝左】。sword 的 12 段源视频里角色朝右（模型没遵守提示词的
// facing LEFT 约束），这里在装配时镜像回规格，而不是在游戏代码里为它开特例。
// ⚠️ 必须【逐格】翻转：整张 flop 会把帧顺序也倒过来。
const MIRROR={sword:true, water:false, north:false};
(async()=>{
 const meta={};
 for(const n of ['sword','water','north']){
  const src='video_runs/'+n+'/output/spritesheet.webp';
  const {data,info}=await sharp(src).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const {width:W,height:H,channels:C}=info;
  for(let i=0;i<W*H;i++){
    const p=i*C; if(data[p+3]<8) continue;
    const r=data[p],g=data[p+1],b=data[p+2],m=Math.max(r,b);
    if(g>m*1.12){const e=g-m; data[p+1]=m;
      data[p]=Math.min(255,r+e*0.5); data[p+2]=Math.min(255,b+e*0.5);}
  }
  let img=sharp(Buffer.from(data),{raw:{width:W,height:H,channels:C}});
  if(MIRROR[n]){
    const base=await img.png().toBuffer();
    const cells=[];
    for(let r=0;r<H/FH;r++) for(let c=0;c<W/FW;c++){
      cells.push({ input: await sharp(base)
        .extract({left:c*FW,top:r*FH,width:FW,height:FH}).flop().png().toBuffer(),
        left:c*FW, top:r*FH });
    }
    img=sharp({create:{width:W,height:H,channels:4,
      background:{r:0,g:0,b:0,alpha:0}}}).composite(cells);
    console.log('  mirror '+n+'（源视频朝右，镜像回朝左规格）');
  }
  await img.webp({quality:92}).toFile(D+n+'.webp');
  const j=JSON.parse(fs.readFileSync('video_runs/'+n+'/output/sprite.json','utf8'));
  meta[n]={frameSize:j.frameSize,dimensions:j.dimensions,animations:j.animations};
  console.log('  ok '+n);
 }
 // ⚠️ 本步只写 ATLAS（frameSize/dimensions/animations）。
 // BT.REACH（逐帧刀长）与 BT.DOWN_DROP（倒地补偿）是【手工量图集】得到、无生成工具
 // （见 atlases.js 内注释）——全量重跑本脚本会把它们覆盖掉。跑完须把 atlases.js 末尾的
 // REACH / DOWN_DROP 两段手动补回，否则 _bladeReach 读到 undefined，近战判定失效。
 // （新增 jump 行不影响 REACH：REACH 只按 attack 帧索引，跳跃不参与命中判定。）
 //
 // 元数据走 window 命名空间而非 json：game_runs/**/*.json 全局 gitignored，
 // 且架构铁律要求 <script> 标签加载、不 fetch json（见 CLAUDE.md）
 fs.writeFileSync(D+'atlases.js',
   '// BladeTrinity 精灵图集元数据 —— 由 tools/rebuild.sh 生成，勿手改\n'+
   '// 架构铁律：元数据走 <script> + window 命名空间，不 fetch json（见 CLAUDE.md）\n'+
   'window.BT = window.BT || {};\n'+
   'window.BT.ATLAS = '+JSON.stringify(meta,null,2)+';\n');
 console.log('  ok atlases.js');
})();
"
echo "完成。目检：见 README「验收」一节。"
