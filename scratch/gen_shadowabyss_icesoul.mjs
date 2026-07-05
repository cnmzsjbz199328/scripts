// ShadowAbyss「冰中魂灵」（科库托斯冰狱,divine-comedy.json dc_cocytus,乌哥利诺与鲁吉埃里）：
// 不是完整站立人形——原著是冻在冰里只露头肩。裁剪 yaku_idle 的头肩区域，
// 合成到一个程序化冰块形状上，8 帧沿用 yaku 原本的呼吸摆动做轻微差异。
// 依赖：先跑 elder/yaku 那批 render.mjs 生成 yaku_idle_{0..7}.png（见 assets_fbx/archive/yaku/NOTES.md）
// 输出：game_runs/ShadowAbyss/assets/3d/icesoul_idle_{0..7}.png
import sharp from 'sharp';
import fs from 'node:fs';

const OUT = 'game_runs/ShadowAbyss/assets/3d';
const ICE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="208" viewBox="0 0 192 208">
  <defs>
    <linearGradient id="ice" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#bfe0e8" stop-opacity="0.85"/>
      <stop offset="1" stop-color="#8fb8c8" stop-opacity="0.92"/>
    </linearGradient>
  </defs>
  <path d="M 20 208 L 18 150 Q 30 118 55 122 Q 70 100 96 104 Q 122 96 140 118 Q 168 112 172 150 L 170 208 Z"
        fill="url(#ice)" stroke="#dff4f8" stroke-width="2" stroke-opacity="0.5"/>
  <path d="M 40 140 L 58 128 M 90 118 L 104 132 M 130 126 L 148 142" stroke="#e8f8fb" stroke-width="1.6" stroke-opacity="0.55" fill="none"/>
</svg>`;

const iceBuf = await sharp(Buffer.from(ICE_SVG)).resize(192, 208).png().toBuffer();
for (let i = 0; i < 8; i++) {
  const src = `${OUT}/yaku_idle_${i}.png`;
  if (!fs.existsSync(src)) { console.error(`缺 ${src}，先渲染 yaku_idle`); process.exit(1); }
  // 头肩裁剪框按 yaku_idle 包围盒目测标定（头顶约 y=25，肩宽约 x=49~132）留够余量
  const head = await sharp(src).extract({ left: 30, top: 12, width: 120, height: 78 }).png().toBuffer();
  const out = await sharp({ create: { width: 192, height: 208, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: iceBuf, left: 0, top: 0 }, { input: head, left: 46, top: 30 }])
    .png().toBuffer();
  fs.writeFileSync(`${OUT}/icesoul_idle_${i}.png`, out);
}
console.log('✓ 8 帧 → ' + OUT + '/icesoul_idle_[0..7].png');
