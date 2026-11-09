import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback = undefined) => {
  const found = process.argv.find((value) => value.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : fallback;
};
const has = (name) => process.argv.includes(`--${name}`);
const only = arg('only', 'all');
const filterId = arg('id');
const threshold = Number(arg('threshold', 34));
const soft = Math.max(1, Number(arg('soft', 28)));
const scaleOverride = Number(arg('scale', 1));
const xOffset = Number(arg('xOffset', 0));
const W = 1280, H = 720;
const CAST = JSON.parse(await fs.readFile(path.join(root, 'story', 'painted-skin.json'), 'utf8')).cast;
const dirs = {
  bg: { raw: 'assets/bg/raw', out: 'assets/bg', ext: 'png' },
  cg: { raw: 'assets/cg/raw', out: 'assets/cg', ext: 'png' },
  lihui: { raw: 'assets/lihui/raw', out: 'assets/lihui', ext: 'png' },
  avatar: { raw: 'assets/avatar/raw', out: 'assets/avatar', ext: 'png' },
};
const KINDS = Object.keys(dirs);
const AVATAR_SIZE = 256;

const exists = async (file) => fs.access(file).then(() => true, () => false);
const median = (numbers) => {
  numbers.sort((a, b) => a - b);
  return numbers[Math.floor(numbers.length / 2)] ?? 0;
};
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;

function edgeMedian(data, width, height, channels) {
  const samples = [[], [], []];
  const step = Math.max(1, Math.floor(Math.max(width, height) / 800));
  const add = (x, y) => {
    const i = (y * width + x) * channels;
    for (let c = 0; c < 3; c++) samples[c].push(data[i + c]);
  };
  for (let x = 0; x < width; x += step) { add(x, 0); add(x, height - 1); }
  for (let y = step; y < height - 1; y += step) { add(0, y); add(width - 1, y); }
  return samples.map(median);
}

function classifyScreen(color) {
  const [r, g, b] = color;
  if (g > r + 32 && g > b + 32) return 'green';
  if (r > g + 32 && b > g + 32) return 'magenta';
  throw new Error(`Cannot identify a green or magenta screen from border median ${color.join(',')}`);
}

function keyPixels(data, width, height, channels, thresholdPx, softPx) {
  const screen = edgeMedian(data, width, height, channels);
  const screenKind = classifyScreen(screen);
  let matte = 0;
  const screenStats = { green: 0, magenta: 0 };
  for (let p = 0; p < width * height; p++) {
    const i = p * channels;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const dist = Math.hypot(r - screen[0], g - screen[1], b - screen[2]);
    const t = clamp((dist - thresholdPx) / softPx, 0, 1);
    const distanceAlpha = t * t * (3 - 2 * t);
    const screenExcess = screenKind === 'green'
      ? screen[1] - Math.max(screen[0], screen[2])
      : Math.min(screen[0], screen[2]) - screen[1];
    const pixelExcess = screenKind === 'green' ? g - Math.max(r, b) : Math.min(r, b) - g;
    const chromaAlpha = 1 - clamp((pixelExcess - thresholdPx) / Math.max(1, screenExcess - thresholdPx), 0, 1);
    const alpha = Math.round(Math.min(distanceAlpha, chromaAlpha) * 255);
    data[i + 3] = alpha;
    if (alpha < 250) {
      matte++;
      if (screenKind === 'green') screenStats.green++;
      else screenStats.magenta++;
      if (alpha > 0 && alpha < 255) {
        const a = alpha / 255;
        for (let c = 0; c < 3; c++) data[i + c] = clamp(Math.round((data[i + c] - (1 - a) * screen[c]) / a), 0, 255);
      }
      if (screenKind === 'green') data[i + 1] = Math.min(data[i + 1], Math.max(data[i], data[i + 2]));
      // For magenta, un-matting above removes the R/B-heavy screen contribution
      // proportionally and avoids the cyan/green fringe left by a colored key.
    }
  }
  return { screen, screenKind, matte, screenStats };
}

function removeSmallComponents(data, width, height, channels) {
  const total = width * height;
  const seen = new Uint8Array(total);
  const queue = new Int32Array(total);
  const components = [];
  const minArea = Math.max(120, Math.floor(total * 0.00008));
  for (let start = 0; start < total; start++) {
    if (seen[start]) continue;
    seen[start] = 1;
    if (data[start * channels + 3] < 1) continue;
    let head = 0, tail = 0;
    queue[tail++] = start;
    const add = (n) => {
      if (n < 0 || seen[n] || data[n * channels + 3] < 1) return;
      seen[n] = 1;
      queue[tail++] = n;
    };
    while (head < tail) {
      const p = queue[head++], x = p % width, y = (p / width) | 0;
      if (x > 0) add(p - 1);
      if (x + 1 < width) add(p + 1);
      if (y > 0) add(p - width);
      if (y + 1 < height) add(p + width);
      if (x > 0 && y > 0) add(p - width - 1);
      if (x + 1 < width && y > 0) add(p - width + 1);
      if (x > 0 && y + 1 < height) add(p + width - 1);
      if (x + 1 < width && y + 1 < height) add(p + width + 1);
    }
    components.push({ start, size: tail, pixels: queue.slice(0, tail) });
  }
  components.sort((a, b) => b.size - a.size);
  const kept = components.filter((c, i) => i === 0 || c.size >= minArea);
  const keepMap = new Uint8Array(total);
  for (const c of kept) for (const p of c.pixels) keepMap[p] = 1;
  for (let p = 0; p < total; p++) if (!keepMap[p]) data[p * channels + 3] = 0;
  return { count: components.length, kept: kept.length, minArea };
}

function bounds(data, width, height, channels) {
  let minX = width, minY = height, maxX = -1, maxY = -1, visible = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * channels + 3] < 8) continue;
    visible++;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1, visible };
}

function upperAnchor(data, width, channels, box) {
  const yEnd = Math.min(box.maxY, box.minY + Math.round(box.height * 0.35));
  let sum = 0, weight = 0;
  for (let y = box.minY; y <= yEnd; y++) for (let x = box.minX; x <= box.maxX; x++) {
    const a = data[(y * width + x) * channels + 3];
    sum += x * a; weight += a;
  }
  return weight ? sum / weight : (box.minX + box.maxX) / 2;
}

async function processFlat(kind, name) {
  const { raw, out } = dirs[kind];
  const src = path.join(root, raw, `${name}.png`);
  if (!(await exists(src))) return false;
  await fs.mkdir(path.join(root, out), { recursive: true });
  await sharp(src).resize(W, H, { fit: 'cover', position: 'centre' }).webp({ quality: 82 }).toFile(path.join(root, out, `${name}.webp`));
  console.log(`${kind}/${name}: ${W}x${H} webp`);
  return true;
}

async function processPortrait(name) {
  const src = path.join(root, dirs.lihui.raw, `${name}.png`);
  if (!(await exists(src))) return false;
  const [actor] = name.split('_');
  const cast = CAST[actor];
  if (!cast) throw new Error(`Unknown cast character for ${name}`);
  const image = sharp(src).ensureAlpha();
  const { data: original, info } = await image.raw().toBuffer({ resolveWithObject: true });
  if (info.channels !== 4) throw new Error(`${name}: expected four channels after ensureAlpha`);
  const data = Buffer.from(original);
  const keyed = keyPixels(data, info.width, info.height, info.channels, threshold, soft);
  const matteRatio = keyed.matte / (info.width * info.height);
  if (matteRatio < 0.15) throw new Error(`${name}: border matte is only ${(matteRatio * 100).toFixed(1)}%; wrong background or key threshold`);
  const components = removeSmallComponents(data, info.width, info.height, info.channels);
  const box = bounds(data, info.width, info.height, info.channels);
  const opaqueRatio = box.visible / (info.width * info.height);
  if (opaqueRatio < 0.05) throw new Error(`${name}: only ${(opaqueRatio * 100).toFixed(2)}% opaque; refusing empty output`);
  if (box.minX === 0 && box.minY === 0 && box.maxX === info.width - 1 && box.maxY === info.height - 1) {
    throw new Error(`${name}: foreground bounds cover the entire source; screen was not removed`);
  }
  const normalizedHeight = 1040 * Number(cast.height) * scaleOverride;
  const fitScale = Math.min(normalizedHeight / box.height, 620 / box.width);
  const scaledW = Math.round(box.width * fitScale), scaledH = Math.round(box.height * fitScale);
  const anchorX = upperAnchor(data, info.width, info.channels, box);
  const scaledAnchorX = (anchorX - box.minX) * fitScale;
  const left = clamp(Math.round(320 - scaledAnchorX + xOffset), 0, 640 - scaledW);
  const top = Math.round(1080 - scaledH);
  const crop = await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .extract({ left: box.minX, top: box.minY, width: box.width, height: box.height })
    .resize(scaledW, scaledH, { fit: 'fill', kernel: 'lanczos3' }).png().toBuffer();
  const canvas = sharp({ create: { width: 640, height: 1100, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  const outPath = path.join(root, dirs.lihui.out, `${name}.webp`);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await canvas.composite([{ input: crop, left, top }]).webp({ quality: 86, alphaQuality: 100, effort: 5 }).toFile(outPath);
  console.log(`lihui/${name}: ${info.width}x${info.height} -> ${scaledW}x${scaledH} at ${left},${top}; bg=${keyed.screenKind} ${keyed.screen.join(',')}; components ${components.count}->${components.kept}`);
  return true;
}

// 对话头像：<actor>_<state>.png 或 <actor>.png，纯色底抠图后按包围盒等比放进 256×256，
// 水平居中、底边贴齐（胸像下缘被框底裁断是正常的）。
async function processAvatar(name) {
  const src = path.join(root, dirs.avatar.raw, `${name}.png`);
  if (!(await exists(src))) return false;
  const [actor, state] = name.split('_');
  if (!CAST[actor]) throw new Error(`Unknown cast character for avatar ${name}`);
  if (state && !CAST[actor].states?.[state]) throw new Error(`Unknown state for avatar ${name}`);
  const { data: original, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const data = Buffer.from(original);
  const keyed = keyPixels(data, info.width, info.height, info.channels, threshold, soft);
  if (keyed.matte / (info.width * info.height) < 0.10) throw new Error(`${name}: border matte too small; wrong background or key threshold`);
  removeSmallComponents(data, info.width, info.height, info.channels);
  const box = bounds(data, info.width, info.height, info.channels);
  if (box.visible / (info.width * info.height) < 0.05) throw new Error(`${name}: nearly empty after keying; refusing output`);
  const fit = Math.min((AVATAR_SIZE - 16) / box.width, (AVATAR_SIZE - 8) / box.height);
  const w = Math.round(box.width * fit), h = Math.round(box.height * fit);
  const crop = await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .extract({ left: box.minX, top: box.minY, width: box.width, height: box.height })
    .resize(w, h, { fit: 'fill', kernel: 'lanczos3' }).png().toBuffer();
  const outPath = path.join(root, dirs.avatar.out, `${name}.webp`);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await sharp({ create: { width: AVATAR_SIZE, height: AVATAR_SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: crop, left: Math.round((AVATAR_SIZE - w) / 2), top: AVATAR_SIZE - h }])
    .webp({ quality: 88, alphaQuality: 100 }).toFile(outPath);
  console.log(`avatar/${name}: ${info.width}x${info.height} -> ${w}x${h}; bg=${keyed.screenKind}`);
  return true;
}

async function writeManifest() {
  const manifest = Object.fromEntries(KINDS.map((kind) => [kind, {}]));
  for (const kind of KINDS) {
    const dir = path.join(root, dirs[kind].out);
    if (!(await exists(dir))) continue;
    for (const file of (await fs.readdir(dir)).filter((f) => f.endsWith('.webp')).sort()) {
      const id = path.basename(file, '.webp');
      manifest[kind][kind === 'lihui' || kind === 'avatar' ? id.replace('_', ':') : id] = `${dirs[kind].out}/${file}`;
    }
  }
  const text = `window.HuaPi = window.HuaPi || {};\nwindow.HuaPi.ART = ${JSON.stringify(manifest, null, 2)};\n`;
  await fs.writeFile(path.join(root, 'assets', 'manifest.js'), text, 'utf8');
}

async function preview(value) {
  const [bgId, ...characters] = value.split(',').filter(Boolean);
  const bgCandidates = [
    path.join(root, 'assets', 'bg', `${bgId}.webp`),
    path.join(root, 'assets', 'refs', 'raw', `${bgId}.png`),
  ];
  let selectedBg = null;
  for (const p of bgCandidates) if (await exists(p)) { selectedBg = p; break; }
  if (!selectedBg) throw new Error(`Preview background not found: ${bgId}`);
  const layers = [];
  const bg = await sharp(selectedBg).resize(W, H, { fit: 'cover' }).png().toBuffer();
  layers.push({ input: bg, left: 0, top: 0 });
  const positions = [320, 640, 960];
  for (let i = 0; i < characters.length && i < positions.length; i++) {
    const [actor, state] = characters[i].split(':');
    const src = path.join(root, 'assets', 'lihui', `${actor}_${state}.webp`);
    if (!(await exists(src))) throw new Error(`Preview portrait not found: ${actor}:${state}`);
    const portrait = await sharp(src).extract({ left: 0, top: 0, width: 640, height: 720 }).png().toBuffer();
    layers.push({ input: portrait, left: positions[i] - 320, top: 0 });
  }
  const panel = Buffer.from('<svg width="1280" height="720"><rect x="0" y="530" width="1280" height="190" fill="#171314" opacity=".30"/><rect x="36" y="540" width="1208" height="170" rx="8" fill="#f0e6d3" opacity=".90" stroke="#7c6254" stroke-width="2"/><rect x="58" y="518" width="200" height="38" rx="5" fill="#453735"/></svg>');
  layers.push({ input: panel, left: 0, top: 0 });
  const image = await sharp({ create: { width: W, height: H, channels: 4, background: '#17151a' } })
    .composite(layers).png().toBuffer();
  const out = path.join(root, 'playtest', 'review', `harmony_${bgId.includes('night') ? 'night' : 'day'}.png`);
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, image);
  console.log(`preview: ${path.relative(root, out)}`);
}

async function main() {
  const selectedKinds = only === 'all' ? KINDS : only.split(',');
  for (const kind of selectedKinds) {
    if (!dirs[kind]) throw new Error(`Unsupported --only kind: ${kind}`);
    const rawDir = path.join(root, dirs[kind].raw);
    if (!(await exists(rawDir))) continue;
    const files = (await fs.readdir(rawDir)).filter((f) => f.toLowerCase().endsWith('.png')).sort();
    for (const file of files) {
      const name = path.basename(file, '.png');
      if (filterId && name !== filterId) continue;
      if (kind === 'lihui') await processPortrait(name);
      else if (kind === 'avatar') await processAvatar(name);
      else await processFlat(kind, name);
    }
  }
  await writeManifest();
  const previewArg = arg('preview');
  if (previewArg) for (const value of previewArg.split(';')) await preview(value);
}

main().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
