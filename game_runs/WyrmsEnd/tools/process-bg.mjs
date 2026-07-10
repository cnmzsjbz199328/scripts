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
  // Normalize to exactly 1920x540 — tileSprite shows a 1:1 window, odd sizes would miscrop
  await sharp(inputPath).resize(1920, 540, { fit: 'cover' }).png().toFile(outputPath);
  await checkSeam(outputPath, filename);
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
        data[i + 3] = 0; // Set Alpha to 0 (fully transparent)
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
