/* ShapeshifterGirl — 背景剪影带后期处理（抠图+渲染轨，移植自 WyrmsEnd tools/process-bg.mjs）
 * raw/ 绿底黑剪影 → chroma-key 抠像 + despill → 贴底对齐 → screen 提色（气氛明度阶梯：
 * 代码天空 > far > mid > 地面带/角色）→ 左右 margin / 平铺接缝验收 → assets/bg/ 产出
 * + manifest.js（script 标签加载，守「不 fetch json」铁律）。
 * 用法：node game_runs/ShapeshifterGirl/tools/process-bg.mjs（缺图自动跳过，可反复跑）。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_DIR = path.resolve(__dirname, '..');
const RAW_DIR = path.join(GAME_DIR, 'assets', 'bg', 'raw');
const OUT_DIR = path.join(GAME_DIR, 'assets', 'bg');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// 提色表（PROMPTS.md §3.3 同源）：far 亮而靠天色（空气透视），mid 深而饱和。
// 只改这里重跑即可换气氛，不用重新生图。
const FAR_LIFT = {
  1: [0xa8, 0xc4, 0x96], // L1 暖绿森林：雾感草绿
  2: [0x7d, 0x92, 0xb8], // L2 月光溪谷：月光蓝灰
  3: [0xd9, 0x9a, 0x5e], // L3 黄昏峡谷：霞光琥珀
  4: [0x8a, 0x6a, 0xa8], // L4 暗紫洞穴：紫晶雾
  5: [0x8a, 0x3a, 0x3a], // L5 红黑云顶：余烬红
};
const MID_LIFT = {
  1: [0x3d, 0x6b, 0x3f], // 深林绿
  2: [0x2a, 0x3d, 0x66], // 深夜蓝
  3: [0x8a, 0x4a, 0x28], // 焦赭
  4: [0x46, 0x2a, 0x66], // 深紫
  5: [0x4a, 0x16, 0x1e], // 暗酒红
};

function liftSilhouette(data, tint) {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue; // 透明像素 RGB 保持黑，避免滤波取样出彩边
    for (let c = 0; c < 3; c++) {
      const v = data[i + c];
      data[i + c] = 255 - ((255 - v) * (255 - tint[c])) / 255 | 0; // screen blend
    }
  }
}

async function checkSeam(imagePath, name) {
  const { data, info } = await sharp(imagePath).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let diffSum = 0;
  for (let y = 0; y < height; y++) {
    const l = y * width * channels, r = (y * width + width - 1) * channels;
    let d = 0;
    for (let c = 0; c < channels; c++) d += Math.abs(data[l + c] - data[r + c]);
    diffSum += d / channels;
  }
  const avg = diffSum / height;
  if (avg > 15) console.warn(`  ⚠️ ${name} 接缝差异 ${avg.toFixed(2)}/255 — 平铺可能露缝，建议重跑该条生图。`);
  else console.log(`  ✅ ${name} 接缝验收通过（${avg.toFixed(2)}/255）。`);
}

async function processOne(level, kind) {
  const filename = `l${level}_${kind}.png`;
  const inputPath = path.join(RAW_DIR, filename);
  const outputPath = path.join(OUT_DIR, filename);
  if (!fs.existsSync(inputPath)) { console.warn(`跳过：raw/${filename} 不存在。`); return; }

  console.log(`处理 ${filename} ...`);
  const normalized = await sharp(inputPath).resize(1920, 540, { fit: 'cover' }).png().toBuffer();
  const { data, info } = await sharp(normalized).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;

  // 绿底判定：绿像素占比过低说明不是绿幕剪影图（生错了/是实景图）→ 拒收
  let greenCount = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 1] > 80 && data[i + 1] > data[i] + 30 && data[i + 1] > data[i + 2] + 30) greenCount++;
  }
  if (greenCount / (W * H) < 0.03) {
    console.warn(`  ⚠️ ${filename} 不是绿底剪影图 — 跳过。请按 PROMPTS.md §3.1 重新生成。`);
    return;
  }

  // Chroma key + despill
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (g > 80 && g > r + 30 && g > b + 30) {
      data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 0;
    } else {
      data[i + 1] = Math.min(g, Math.max(r, b));
    }
  }

  // 贴底对齐：整幅内容悬空才下移（l4_far 钟乳石贴顶 + 地面贴底的双锚版式不会触发）
  let bottomMost = -1;
  for (let y = H - 1; y >= 0 && bottomMost < 0; y--) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] > 8) { bottomMost = y; break; }
    }
  }
  let out = data;
  if (bottomMost >= 0 && bottomMost < H - 6) {
    const shift = H - 1 - bottomMost;
    console.log(`  ↓ 内容悬空 ${shift}px，下移贴底。`);
    out = Buffer.alloc(data.length);
    out.set(data.subarray(0, (H - shift) * W * 4), shift * W * 4);
  }

  const lift = (kind === 'far' ? FAR_LIFT : MID_LIFT)[level];
  if (lift) liftSilhouette(out, lift);

  // Margin 验收：左右 10px 必须全透明，否则平铺露缝
  let marginPass = true;
  for (let y = 0; y < H && marginPass; y++) {
    const row = y * W * 4;
    for (let x = 0; x < 10; x++) {
      if (out[row + x * 4 + 3] > 8 || out[row + (W - 1 - x) * 4 + 3] > 8) { marginPass = false; break; }
    }
  }
  console.log(marginPass
    ? `  ✅ Margin 验收通过，左右边缘干净透明。`
    : `  ⚠️ 左/右 150px 边缘有剪影内容 — 平铺会露缝，建议重跑该条生图。`);

  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(outputPath);
  console.log(`  产出 ${path.relative(GAME_DIR, outputPath)} (${W}x${H})`);
  await checkSeam(outputPath, filename);
}

// 产物清单（script 标签加载）：游戏侧只加载清单里存在的图，缺席的关走程序化降级层
function writeManifest() {
  const files = [];
  for (let i = 1; i <= 5; i++) {
    for (const kind of ['far', 'mid']) {
      const f = `l${i}_${kind}.png`;
      if (fs.existsSync(path.join(OUT_DIR, f))) files.push(f);
    }
  }
  const js = `/* process-bg.mjs 自动生成，勿手改：assets/bg/ 现存真图清单 */\nwindow.SSG_BG = ${JSON.stringify(files)};\n`;
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.js'), js);
  console.log(`Manifest 已写出：${files.length} 张 — ${files.join(', ') || '(无)'}`);
}

async function main() {
  console.log('--- ShapeshifterGirl 背景剪影带后期处理 ---');
  for (let i = 1; i <= 5; i++) {
    await processOne(i, 'far');
    await processOne(i, 'mid');
  }
  writeManifest();
  console.log('--- 完成 ---');
}

main().catch(err => { console.error('Fatal:', err); process.exitCode = 1; });
