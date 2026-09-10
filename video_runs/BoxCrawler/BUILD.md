# BoxCrawler — 构建记录

火柴人在箱体内部爬行的三组基础动作，抠自单条 8s 绿幕参考视频
`source/Stick_figure_crawling_and_climbing_202609092315.mp4`（1280×720 / 24fps / 192 帧）。

## 素材内容（源视频时间轴）

| 段 | 源帧 | 时间码 (s) | 说明 |
|----|------|-----------|------|
| crawl（正常爬行） | ~12–36 | 0.50–1.46 | 四肢着地沿底边爬，面朝右，原地循环 |
| turnAround（调头） | ~58–84 | 2.40–3.50 | 爬到右墙角站起 → 转体 180° → 落回四肢面朝左；apex ≈ 源帧 69（00:02:21） |
| cornerTurnCCW（逆时针拐角） | generated | 5 帧 / 16fps（跳过前 3 张回撤姿态） | 向右爬到右墙角 → 扶墙 → 逆时针转 90° 贴右墙 |
| （未接入）climb | ~126–184 | 5.25–7.67 | 贴左墙手脚交替上爬，可循环 |

## 复现步骤

`animations/` 与 `output/` 不入库，用下面命令从 `source/` 重放：

### 1. 剥掉箱体黑色描边

箱框和火柴人同为纯黑，绿幕抠图会把整圈框留下、且火柴人手脚贴着框会把
`--anchor` 包围盒带偏。箱体全程不动，直接裁到描边内缘以内：

```bash
ffmpeg -y -i "source/Stick_figure_crawling_and_climbing_202609092315.mp4" \
  -vf "crop=490:512:396:100" -an -c:v libx264 -crf 8 -pix_fmt yuv420p -preset medium \
  source/box_stripped.mp4
```

代价：贴地/贴墙那一帧的指尖脚尖被切 2–4px（做精灵无影响，角色本就坐在游戏自己的地面/墙面碰撞体上）。

### 2. 分段抠帧（三段共用 scale/size，保证图集里角色同大小）

绿幕是哑光绿且带暗角漂移（边缘 rgb(30,180,37)→中心 rgb(34,209,39)），
且调头段有运动模糊 → 用 `--bg=auto --threshold=120 --soft=44` 才能既吃干净绿边又不啃黑色本体。

```bash
CMN="--extract-fps=24 --anchor --size=216x232 --scale=0.8835 --bg=auto --threshold=120 --soft=44"

npx tsx skills/video-sprite/process.ts BoxCrawler crawl       source/box_stripped.mp4 --start=0.50 --end=1.46 --frames=8  --fps=10           $CMN
npx tsx skills/video-sprite/process.ts BoxCrawler turnAround  source/box_stripped.mp4 --start=2.40 --end=3.50 --frames=14 --fps=14 --no-loop $CMN
# cornerTurnCCW：使用 source/turn_ccw_generated_raw.png，经 tools/prepare_turn_frames.mjs 生成
```

### 3. 拼图集

```bash
npx tsx skills/video-sprite/assemble.ts BoxCrawler
# → output/spritesheet.webp (3024×696, 3 行 × 14 列, 单帧 216×232) + output/sprite.json
```

## 备注

- 地面上左右调头直接用这组 turnAround（源视频本身有自然调头，非 flipX）。
  反方向的调头 = 把 turnAround `setFlipX` 播放即可。
- 想补墙面攀爬：`process.ts BoxCrawler climb source/box_stripped.mp4 --start=5.25 --end=7.60 --frames=8 --fps=10 $CMN`

### 拐角动作更新

`cornerTurnCCW` 使用 `source/turn_ccw_generated_raw.png` 生成 8 帧逆时针 90°扶墙过角动作；第 4 帧起做水平镜像。运行时只播放第 4–8 帧，跳过前 3 张仍在水平回撤的姿态，再切换到墙面爬行，避免路径旋转与动作帧重复叠加。
