/* BladeTrinity — 背景三层剪影与分层后期处理 (process-bg.mjs)
 *
 * 1. far.png: 全彩不透明远景（不走绿幕），直接 resize 到 1920x1080 / 1920x540 并输出
 * 2. mid.png: 绿幕中景，chroma-key 抠图 + despill → 产出 alpha 透明图
 * 3. fore.png: 绿幕前景，chroma-key 抠图 + despill → 产出 alpha 透明图
 *
 * 带有“纯绿空图”判定：若抠完后非透明像素极少，会发出警告（提示 agy 静默产纯绿空图）。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_DIR = path.resolve(__dirname, '..');
const RAW_DIR = path.join(GAME_DIR, 'assets', 'bg', 'raw');
const OUT_DIR = path.join(GAME_DIR, 'assets', 'bg');

if (!fs.existsSync(RAW_DIR)) fs.mkdirSync(RAW_DIR, { recursive: true });
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// 产出走 WebP：三张 PNG 合计 4.5MB，而 game_runs/ 的图必须入库供 Cloudflare CI 部署
// （见 CLAUDE.md / .gitignore:33）。far 不透明用有损即可；mid/fore 带 alpha，
// alphaQuality 拉满避免边缘产生半透明脏边（抠图刚做完 despill，不能在这里毁掉）。
const WEBP_OPAQUE = { quality: 82 };
const WEBP_ALPHA = { quality: 86, alphaQuality: 100 };

// 一场一景：每套背景一个前缀（'' = 第 1 场室内道场，'outdoor_' = 第 2 场雪山露天）。
// 新增一套只要往这里加前缀，raw/<前缀>{far,mid,fore}.png 放好即可。
const SETS = ['', 'outdoor_'];

async function processFar(pre) {
  const inputPath = path.join(RAW_DIR, `${pre}far.png`);
  const outputPath = path.join(OUT_DIR, `${pre}far.webp`);

  if (!fs.existsSync(inputPath)) {
    console.warn(`⚠️ 缺图: raw/${pre}far.png 不存在。`);
    return;
  }

  console.log(`处理远景 raw/${pre}far.png (全彩不透明)...`);
  await sharp(inputPath)
    .resize(1920, 1080, { fit: 'cover' })
    .webp(WEBP_OPAQUE)
    .toFile(outputPath);

  console.log(`  ✅ 远景已产出: ${path.relative(GAME_DIR, outputPath)} (1920x1080)`);
}

async function processChromaKey(pre, kind) {
  const filename = `${pre}${kind}.png`;
  const inputPath = path.join(RAW_DIR, filename);
  const outputPath = path.join(OUT_DIR, `${pre}${kind}.webp`);

  if (!fs.existsSync(inputPath)) {
    console.warn(`⚠️ 缺图: raw/${filename} 不存在。`);
    return;
  }

  console.log(`处理${kind === 'mid' ? '中景' : '前景'} raw/${filename} (绿幕抠图)...`);

  const normalized = await sharp(inputPath).resize(1920, 1080, { fit: 'cover' }).png().toBuffer();
  const { data, info } = await sharp(normalized).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;

  // 1. 检查绿像素比例
  let greenCount = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (g > 80 && g > r + 30 && g > b + 30) {
      greenCount++;
    }
  }

  const greenRatio = greenCount / (W * H);
  if (greenRatio < 0.03) {
    console.warn(`  ⚠️ ${filename} 不是绿幕图 (绿像素占比仅 ${(greenRatio * 100).toFixed(1)}%) — 跳过抠图。`);
    return;
  }

  // 2. Chroma keying + despill
  let nonTransparentPixels = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (g > 80 && g > r + 30 && g > b + 30) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0; // Alpha 设为 0
    } else {
      data[i + 1] = Math.min(g, Math.max(r, b)); // despill 滤除绿边溢色
      data[i + 3] = 255;
      nonTransparentPixels++;
    }
  }

  // 🚨 坑点防护：检查是否静默产出纯绿空图
  const contentRatio = nonTransparentPixels / (W * H);
  if (contentRatio < 0.005) {
    console.warn(`  🚨 警告: ${filename} 抠图后几乎为空图 (有效像素占比仅 ${(contentRatio * 100).toFixed(2)}%)！生图模型可能产出了纯绿空图，请重新生图！`);
  } else {
    console.log(`  ✅ 抠图完成: 有效主体像素占比 ${(contentRatio * 100).toFixed(1)}%`);
  }

  await sharp(data, { raw: { width: W, height: H, channels: 4 } }).webp(WEBP_ALPHA).toFile(outputPath);
  console.log(`  ✅ 产出 ${path.relative(GAME_DIR, outputPath)} (${W}x${H})`);
}

function writeManifest() {
  const files = [];
  for (const pre of SETS) {
    for (const kind of ['far', 'mid', 'fore']) {
      const f = `${pre}${kind}.webp`;
      if (fs.existsSync(path.join(OUT_DIR, f))) files.push(f);
    }
  }
  const js = `/* process-bg.mjs 自动生成，勿手改 */\nwindow.BLADE_BG = ${JSON.stringify(files)};\n`;
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.js'), js);
  console.log(`Manifest 已更新: ${files.length} 张 — ${files.join(', ') || '(无)'}`);
}

async function main() {
  console.log('--- BladeTrinity 背景分层处理 ---');
  for (const pre of SETS) {
    console.log(`
[套件 ${pre || 'dojo'}]`);
    await processFar(pre);
    await processChromaKey(pre, 'mid');
    await processChromaKey(pre, 'fore');
  }
  writeManifest();
  console.log('--- 处理完成 ---');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exitCode = 1;
});
