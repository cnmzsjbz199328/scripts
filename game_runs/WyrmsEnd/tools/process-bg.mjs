import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GAME_DIR = path.resolve(__dirname, '..');
const RAW_DIR = path.join(GAME_DIR, 'assets', 'bg', 'raw');
const OUT_DIR = path.join(GAME_DIR, 'assets', 'bg');

// Ensure output directory exists
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// 中景剪影提色：中景件若为纯黑会与角色剪影（汇入背景深处）同色，容易融为一体。
// 用 screen 混合把不透明像素从黑提到每段专属深色调（亮度 ~50-60），角色保持全场最黑。
// 如果颜色已直接烘进原图（如 seg3 和 seg4），则不需要做提色处理（置为 null）。
const MID_LIFT = {
  1: null,
  2: [0x40, 0x3c, 0x37],   // 焦土：暖灰
  3: null,                 // 山隘：颜色烘进原图，不需要提色
  4: null,                 // 骨原：颜色烘进原图，不需要提色
  5: [0x30, 0x23, 0x13],   // 龙巢：暗金（明度须压到远景下半带的 ~0.6，太亮会贴纸化）
};

// 远景剪影提色（空气透视）：远景比中景离得远，色调向该段雾色/天光靠拢、明度亮于 MID_LIFT，
// 形成 天空 > far > mid > 地面/角色 的明度阶梯。第 5 段例外：宝窟金光从背后打，far 反而最黑。
const FAR_LIFT = {
  1: [0x6a, 0x44, 0x26],   // 麦田：暖赭
  2: [0x55, 0x40, 0x2a],   // 焦土：沙褐
  3: [0x4a, 0x4c, 0x54],   // 山隘：冷石灰
  4: [0x38, 0x2c, 0x24],   // 骨原：烬褐
  5: [0x22, 0x1a, 0x10],   // 龙巢：近黑（逆光剪影，比 mid 暗）
};

function liftSilhouette(data, tint) {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;             // 透明像素 RGB 保持黑，避免滤波取样出彩边
    for (let c = 0; c < 3; c++) {
      const v = data[i + c];
      data[i + c] = 255 - ((255 - v) * (255 - tint[c])) / 255 | 0;   // screen blend
    }
  }
}

async function checkSeam(imagePath, name) {
  try {
    const image = sharp(imagePath);
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info;

    let diffSum = 0;
    let count = 0;

    for (let y = 0; y < height; y++) {
      const leftIdx = y * width * channels;
      const rightIdx = (y * width + (width - 1)) * channels;

      let pixelDiff = 0;
      for (let c = 0; c < channels; c++) {
        pixelDiff += Math.abs(data[leftIdx + c] - data[rightIdx + c]);
      }
      // Average diff across channels
      diffSum += pixelDiff / channels;
      count++;
    }

    const avgDiff = diffSum / count;
    console.log(`[Seam Check] ${name}: Average edge difference is ${avgDiff.toFixed(2)} / 255.`);
    if (avgDiff > 15) {
      console.warn(`  ⚠️ Warning: ${name} might have a visible seam (diff > 15).`);
    } else {
      console.log(`  ✅ ${name} seams look perfectly seamless!`);
    }
  } catch (err) {
    console.error(`Error checking seam for ${name}:`, err.message);
  }
}

// 远景与中景同规格：纯绿底剪影 → 抠像 → 提色。天空/雾/沙由游戏代码绘制（Forge.ATMOS），
// 远景图只供形状——这是风格统一的关键：AI 不再决定气氛，只决定轮廓。
async function processFar(segmentIndex) {
  const filename = `seg${segmentIndex}_far.png`;
  const inputPath = path.join(RAW_DIR, filename);
  const outputPath = path.join(OUT_DIR, filename);

  if (!fs.existsSync(inputPath)) {
    console.warn(`Skip processing: ${filename} not found in raw directory.`);
    return;
  }

  console.log(`Processing far silhouette: ${filename}...`);
  try {
    const normalized = await sharp(inputPath).resize(1920, 540, { fit: 'cover' }).png().toBuffer();
    const { data, info } = await sharp(normalized).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const W = info.width, H = info.height;

    // 新旧版式判定：新版远景是绿底剪影；旧版整幅不透明实景图（无绿）→ 跳过不产出，
    // 游戏侧自动落到程序化降级剪影 + 代码天空。
    let greenCount = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 1] > 80 && data[i + 1] > data[i] + 30 && data[i + 1] > data[i + 2] + 30) greenCount++;
    }
    if (greenCount / (W * H) < 0.03) {
      console.warn(`  ⚠️ ${filename} 不是绿底剪影（旧版实景图）——跳过。请按 PROMPTS.md 新版 far 提示词重新生成。`);
      return;
    }

    // Chroma key + despill（与 mid 同参）
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (g > 80 && g > r + 30 && g > b + 30) {
        data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 0;
      } else {
        data[i + 1] = Math.min(g, Math.max(r, b));
      }
    }

    // Bottom-align：山脊/地平带必须贴到画布底边（钟乳石等跨越全高的内容不会触发位移）
    let bottomMost = -1;
    for (let y = H - 1; y >= 0 && bottomMost < 0; y--) {
      for (let x = 0; x < W; x++) {
        if (data[(y * W + x) * 4 + 3] > 8) { bottomMost = y; break; }
      }
    }
    let out = data;
    if (bottomMost >= 0 && bottomMost < H - 6) {
      const shift = H - 1 - bottomMost;
      console.log(`  ↓ Content floats ${shift}px above bottom edge — shifting down.`);
      out = Buffer.alloc(data.length);
      out.set(data.subarray(0, (H - shift) * W * 4), shift * W * 4);
    }

    if (FAR_LIFT[segmentIndex]) liftSilhouette(out, FAR_LIFT[segmentIndex]);

    // Margin check：左右 10px 必须全透明，否则平铺会露接缝
    let marginPass = true;
    for (let y = 0; y < H && marginPass; y++) {
      const rowOffset = y * W * 4;
      for (let x = 0; x < 10; x++) {
        if (out[rowOffset + x * 4 + 3] > 8 || out[rowOffset + (W - 1 - x) * 4 + 3] > 8) {
          marginPass = false; break;
        }
      }
    }
    if (marginPass) {
      console.log(`  ✅ Margin check passed! Left/right edges of ${filename} are clean and transparent.`);
    } else {
      console.warn(`  ⚠️ Warning: Left or right margins of ${filename} contain non-transparent elements. Tiling seam might be visible.`);
    }

    await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(outputPath);
    console.log(`Saved transparent far silhouette to ${outputPath} (${W}x${H})`);
    await checkSeam(outputPath, filename);
  } catch (err) {
    console.error(`Error processing ${filename}:`, err.message);
  }
}

async function processMid(segmentIndex) {
  const filename = `seg${segmentIndex}_mid.png`;
  const inputPath = path.join(RAW_DIR, filename);
  const outputPath = path.join(OUT_DIR, filename);

  if (!fs.existsSync(inputPath)) {
    console.warn(`Skip processing: ${filename} not found in raw directory.`);
    return;
  }

  console.log(`Processing midground: ${filename}...`);
  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();

    let processedBuffer;
    let finalW, finalH;

    if (metadata.height > 600) {
      // 1920x1080 layout (double row)
      console.log(`  -> Detected 1920x1080 double-row canvas. Splitting and stitching...`);
      // Resize to exactly 1920x1080 first
      const normalized = await sharp(inputPath).resize(1920, 1080, { fit: 'cover' }).png().toBuffer();
      
      // Get raw buffer of normalized 1920x1080 image
      const { data, info } = await sharp(normalized).raw().toBuffer({ resolveWithObject: true });
      const W = info.width; // 1920
      const H = info.height; // 1080
      const C = info.channels;

      // 1. Cut line check at y=540
      let cutLinePass = true;
      const cutLineY = 540;
      const cutLineOffset = cutLineY * W * C;
      for (let x = 0; x < W; x++) {
        const idx = cutLineOffset + x * C;
        // green check: G > 80 && G > R + 30 && G > B + 30
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        if (!(g > 80 && g > r + 30 && g > b + 30)) {
          cutLinePass = false;
          break;
        }
      }
      if (cutLinePass) {
        console.log(`  ✅ Cut line check passed! Row divider at y=540 is clean.`);
      } else {
        console.warn(`  ⚠️ Warning: Non-green pixels found on the horizontal cut line (y=540). Slicing might cut elements.`);
      }

      // 2. Extract Row 1 (y from 0 to 539) and Row 2 (y from 540 to 1079)
      const row1Data = Buffer.alloc(W * 540 * 4);
      const row2Data = Buffer.alloc(W * 540 * 4);

      // Extract raw pixels, apply chroma keying and despill directly
      const processRowData = (srcYStart, destBuffer) => {
        for (let y = 0; y < 540; y++) {
          const srcRowOffset = (srcYStart + y) * W * C;
          const destRowOffset = y * W * 4;

          for (let x = 0; x < W; x++) {
            const srcIdx = srcRowOffset + x * C;
            const destIdx = destRowOffset + x * 4;

            const r = data[srcIdx];
            const g = data[srcIdx + 1];
            const b = data[srcIdx + 2];

            if (g > 80 && g > r + 30 && g > b + 30) {
              destBuffer[destIdx] = 0;
              destBuffer[destIdx + 1] = 0;
              destBuffer[destIdx + 2] = 0;
              destBuffer[destIdx + 3] = 0; // Transparent
            } else {
              destBuffer[destIdx] = r;
              destBuffer[destIdx + 1] = Math.min(g, Math.max(r, b)); // Despill
              destBuffer[destIdx + 2] = b;
              destBuffer[destIdx + 3] = 255; // Opaque
            }
          }
        }
      };

      processRowData(0, row1Data);
      processRowData(540, row2Data);

      // 3. Bottom-align both rows
      const bottomAlign = (rowBuffer) => {
        let bottomMost = -1;
        for (let y = 539; y >= 0 && bottomMost < 0; y--) {
          for (let x = 0; x < W; x++) {
            if (rowBuffer[(y * W + x) * 4 + 3] > 8) {
              bottomMost = y;
              break;
            }
          }
        }
        if (bottomMost >= 0 && bottomMost < 539 - 6) {
          const shift = 539 - bottomMost;
          console.log(`  ↓ Row content floats ${shift}px above bottom edge — shifting down.`);
          const aligned = Buffer.alloc(rowBuffer.length);
          aligned.set(rowBuffer.subarray(0, (540 - shift) * W * 4), shift * W * 4);
          return aligned;
        }
        return rowBuffer;
      };

      const row1Aligned = bottomAlign(row1Data);
      const row2Aligned = bottomAlign(row2Data);

      // 4. Apply MID_LIFT if defined
      if (MID_LIFT[segmentIndex]) {
        liftSilhouette(row1Aligned, MID_LIFT[segmentIndex]);
        liftSilhouette(row2Aligned, MID_LIFT[segmentIndex]);
      }

      // 5. Stitch Row 1 and Row 2 side-by-side horizontally (3840x540)
      finalW = 3840;
      finalH = 540;
      processedBuffer = Buffer.alloc(finalW * finalH * 4);

      for (let y = 0; y < 540; y++) {
        const destRowOffset = y * finalW * 4;
        const r1RowOffset = y * W * 4;
        const r2RowOffset = y * W * 4;

        // Copy Row 1 pixels (width 1920)
        processedBuffer.set(row1Aligned.subarray(r1RowOffset, r1RowOffset + W * 4), destRowOffset);
        // Copy Row 2 pixels (width 1920)
        processedBuffer.set(row2Aligned.subarray(r2RowOffset, r2RowOffset + W * 4), destRowOffset + W * 4);
      }

    } else {
      // 1920x540 layout (single row)
      console.log(`  -> Detected 1920x540 single-row canvas.`);
      const normalized = await sharp(inputPath).resize(1920, 540, { fit: 'cover' }).png().toBuffer();
      const { data, info } = await sharp(normalized).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const W = info.width;
      const H = info.height;

      // Chroma key
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (g > 80 && g > r + 30 && g > b + 30) {
          data[i] = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
          data[i + 3] = 0;
        } else {
          data[i + 1] = Math.min(g, Math.max(r, b));
        }
      }

      // Bottom-align
      let bottomMost = -1;
      for (let y = H - 1; y >= 0 && bottomMost < 0; y--) {
        for (let x = 0; x < W; x++) {
          if (data[(y * W + x) * 4 + 3] > 8) { bottomMost = y; break; }
        }
      }
      let out = data;
      if (bottomMost >= 0 && bottomMost < H - 6) {
        const shift = H - 1 - bottomMost;
        console.log(`  ↓ Content floats ${shift}px above bottom edge — shifting down.`);
        out = Buffer.alloc(data.length);
        out.set(data.subarray(0, (H - shift) * W * 4), shift * W * 4);
      }

      // Lift silhouette
      if (MID_LIFT[segmentIndex]) liftSilhouette(out, MID_LIFT[segmentIndex]);

      processedBuffer = out;
      finalW = W;
      finalH = H;
    }

    // 6. Margin check (Check if left 10px and right 10px of the processed image are fully transparent)
    let marginPass = true;
    const marginPixels = 10; // check left/right edges
    for (let y = 0; y < finalH; y++) {
      const rowOffset = y * finalW * 4;
      for (let x = 0; x < marginPixels; x++) {
        const leftIdx = rowOffset + x * 4;
        const rightIdx = rowOffset + (finalW - 1 - x) * 4;
        if (processedBuffer[leftIdx + 3] > 8 || processedBuffer[rightIdx + 3] > 8) {
          marginPass = false;
          break;
        }
      }
      if (!marginPass) break;
    }

    if (marginPass) {
      console.log(`  ✅ Margin check passed! Left/right edges of ${filename} are clean and transparent.`);
    } else {
      console.warn(`  ⚠️ Warning: Left or right margins of ${filename} contain non-transparent elements. Tiling seam might be visible.`);
    }

    // Save the processed image
    await sharp(processedBuffer, {
      raw: {
        width: finalW,
        height: finalH,
        channels: 4,
      }
    })
    .png()
    .toFile(outputPath);

    console.log(`Saved transparent midground to ${outputPath} (${finalW}x${finalH})`);
    await checkSeam(outputPath, filename);
  } catch (err) {
    console.error(`Error processing ${filename}:`, err.message);
  }
}

// 产物清单（script 标签加载，遵守「不 fetch json」铁律）：JourneyScene 只加载清单里
// 存在的图，缺席的段走程序化降级层——避免 404 噪声污染 verify 门。
function writeManifest() {
  const files = [];
  for (let i = 1; i <= 5; i++) {
    for (const kind of ['far', 'mid']) {
      const f = `seg${i}_${kind}.png`;
      if (fs.existsSync(path.join(OUT_DIR, f))) files.push(f);
    }
  }
  const js = `/* process-bg.mjs 自动生成，勿手改：assets/bg/ 现存真图清单 */\nwindow.WYRM_BG = ${JSON.stringify(files)};\n`;
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.js'), js);
  console.log(`Manifest written: ${files.length} file(s) — ${files.join(', ') || '(none)'}`);
}

async function main() {
  console.log('--- WyrmsEnd Background Post-Processing Started ---');
  for (let i = 1; i <= 5; i++) {
    await processFar(i);
    await processMid(i);
  }
  writeManifest();
  console.log('--- WyrmsEnd Background Post-Processing Completed ---');
}

main().catch(err => {
  console.error('Fatal error in background post-processing:', err);
});
