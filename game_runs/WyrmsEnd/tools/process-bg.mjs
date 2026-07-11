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

function wrapBlend(data, width, height, channels, blendWidth = 80) {
  const B = blendWidth;
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * channels;

    // Find the original edge values for this row
    const leftEdgeIdx = rowOffset + 0;
    const rightEdgeIdx = rowOffset + (width - 1) * channels;

    // seamVal is the average of the left edge and right edge
    const seamVal = [];
    for (let c = 0; c < channels; c++) {
      seamVal[c] = (data[leftEdgeIdx + c] + data[rightEdgeIdx + c]) / 2;
    }

    // Blend left edge (x from 0 to B - 1)
    // O(d) = seamVal * (1 - t) + original(d) * t
    for (let d = 0; d < B; d++) {
      const idx = rowOffset + d * channels;
      const t = d / (B - 1);
      const w = t * t * (3 - 2 * t); // smoothstep transition
      for (let c = 0; c < channels; c++) {
        data[idx + c] = Math.round(seamVal[c] * (1 - w) + data[idx + c] * w);
      }
    }

    // Blend right edge (x from W - B to W - 1, let d = x - (W - B))
    // O(W - B + d) = original(W - B + d) * (1 - t) + seamVal * t
    for (let d = 0; d < B; d++) {
      const idx = rowOffset + (width - B + d) * channels;
      const t = d / (B - 1);
      const w = t * t * (3 - 2 * t); // smoothstep transition
      for (let c = 0; c < channels; c++) {
        data[idx + c] = Math.round(data[idx + c] * (1 - w) + seamVal[c] * w);
      }
    }
  }
}

// 中景剪影提色：中景件若为纯黑会与角色剪影（≈RGB 10,12,18）同色，角色走进去即隐身。
// 用 screen 混合把不透明像素从黑提到每段专属深色调（亮度 ~50-60），角色保持全场最黑。
// 黑 → 提升色，亮部（烟雾/灰调细节）几乎不动，单调不破坏原图层次。seg1 远景够亮不需要。
const MID_LIFT = {
  1: null,
  2: [0x40, 0x3c, 0x37],   // 焦土：暖灰
  3: null,                 // 山隘：提色后与远景雪山阴影同亮度（58 vs 60）层次穿帮——颜色烘进重生成的原图，不后期提
  4: [0x52, 0x2a, 0x22],   // 骨原：铁锈红
  5: [0x4a, 0x34, 0x19],   // 龙巢：暗金
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

async function processFar(segmentIndex) {
  const filename = `seg${segmentIndex}_far.png`;
  const inputPath = path.join(RAW_DIR, filename);
  const outputPath = path.join(OUT_DIR, filename);

  if (!fs.existsSync(inputPath)) {
    console.warn(`Skip processing: ${filename} not found in raw directory.`);
    return;
  }

  console.log(`Processing far background: ${filename}...`);
  try {
    // Normalize size first, then apply wrap blend
    const resized = await sharp(inputPath).resize(1920, 540, { fit: 'cover' }).png().toBuffer();
    const { data, info } = await sharp(resized).raw().toBuffer({ resolveWithObject: true });

    wrapBlend(data, info.width, info.height, info.channels, 100);

    await sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: info.channels,
      }
    })
    .png()
    .toFile(outputPath);

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

  console.log(`Processing midground chroma key: ${filename}...`);
  try {
    // Normalize size first (same reason as far layer), then key out the green screen
    const normalized = await sharp(inputPath).resize(1920, 540, { fit: 'cover' }).png().toBuffer();
    const { data, info } = await sharp(normalized).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    // Perform chroma keying on green background (#00FF00)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Chroma key logic: check if pixel is predominantly green
      if (g > 80 && g > r + 30 && g > b + 30) {
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 0; // Set Alpha to 0 (fully transparent) and clear RGB to black to prevent green bleeding during wrap-blend
      } else {
        // Despill: clamp green on anti-aliased edge pixels so silhouettes get no green halo
        data[i + 1] = Math.min(g, Math.max(r, b));
      }
    }

    // Bottom-align: AI sometimes paints the silhouette band (with its own ground
    // strip) in the upper part of the frame. Middle-ground layers must sit on the
    // bottom edge, so find the lowest opaque row and shift the whole content down.
    const { width: W, height: H } = info;
    let bottomMost = -1;
    for (let y = H - 1; y >= 0 && bottomMost < 0; y--) {
      for (let x = 0; x < W; x += 4) {
        if (data[(y * W + x) * 4 + 3] > 8) { bottomMost = y; break; }
      }
    }
    let out = data;
    if (bottomMost >= 0 && bottomMost < H - 6) {
      const shift = H - 1 - bottomMost;
      console.log(`  ↓ Content floats ${shift}px above bottom edge — shifting down to ground it.`);
      out = Buffer.alloc(data.length);           // transparent black
      out.set(data.subarray(0, (H - shift) * W * 4), shift * W * 4);
    }

    // Lift silhouette tone so the (near-black) player never melts into midground pieces
    if (MID_LIFT[segmentIndex]) liftSilhouette(out, MID_LIFT[segmentIndex]);

    // Apply wrap blend to ensure seamless horizontal tiling on midground layer edges
    wrapBlend(out, W, H, 4, 100);

    // Save the processed image
    await sharp(out, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4,
      }
    })
    .png()
    .toFile(outputPath);

    console.log(`Saved transparent midground to ${outputPath}`);
    await checkSeam(outputPath, filename);
  } catch (err) {
    console.error(`Error processing ${filename}:`, err.message);
  }
}

async function main() {
  console.log('--- WyrmsEnd Background Post-Processing Started ---');
  for (let i = 1; i <= 5; i++) {
    await processFar(i);
    await processMid(i);
  }
  console.log('--- WyrmsEnd Background Post-Processing Completed ---');
}

main().catch(err => {
  console.error('Fatal error in background post-processing:', err);
});
