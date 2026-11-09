import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const story = JSON.parse(await fs.readFile(path.join(root, 'story', 'painted-skin.json'), 'utf8'));
const ids = ['a1_dress', 'a1_home', 'f_portrait', 'f_flee', 'f_last', 'h_well', 'f_seal', 'l_fire2'];
// 槽位唯一真源是运行时 game/config.js，不在这里另抄一份。
const sandbox = { window: {} };
vm.runInNewContext(await fs.readFile(path.join(root, 'game', 'config.js'), 'utf8'), sandbox);
const slots = sandbox.window.HuaPi.Config.STAGE_X;
const cellW = 640, imageH = 360, headH = 28, cellH = imageH + headH, gap = 8, cols = 3;
const rows = Math.ceil(ids.length / cols), layers = [];

for (let i = 0; i < ids.length; i++) {
  const id = ids[i], node = story.nodes[id];
  const segment = node.segments.find((item) => item.stage) || node.segments[0];
  const stage = segment.stage || {};
  const scene = story.scenes[node.scene] || {};
  const parts = [{ input: path.join(root, 'assets', 'bg', `${node.scene}.webp`), left: 0, top: 0 }];
  const wash = Buffer.from(`<svg width="1280" height="720"><rect width="100%" height="100%" fill="${scene.tint || '#ffffff'}" fill-opacity=".08"/></svg>`);
  parts.push({ input: wash, left: 0, top: 0 });
  if (node.cg) parts.push({ input: path.join(root, 'assets', 'cg', `${node.cg}.webp`), left: 0, top: 0 });
  // 与运行时一致：CG 期间不站立绘。
  for (const slot of node.cg ? [] : ['L', 'C', 'R']) {
    const value = stage[slot];
    if (!value) continue;
    const [actor, state] = value.split(':');
    const sprite = path.join(root, 'assets', 'lihui', `${actor}_${state}.webp`);
    // 侧槽立绘可越出画布，按运行时一样裁到 0..1280 可见段。
    const x0 = slots[slot] - 320, cropL = Math.max(0, -x0), width = Math.min(640, 1280 - x0) - cropL;
    const image = await sharp(sprite).extract({ left: cropL, top: 0, width, height: 720 }).png().toBuffer();
    parts.push({ input: image, left: x0 + cropL, top: 0 });
  }
  const panel = Buffer.from('<svg width="1280" height="720"><rect x="0" y="530" width="1280" height="190" fill="#171314" opacity=".30"/><rect x="36" y="540" width="1208" height="170" rx="8" fill="#f0e6d3" opacity=".90" stroke="#7c6254" stroke-width="2"/><rect x="58" y="518" width="200" height="38" rx="5" fill="#453735"/></svg>');
  parts.push({ input: panel, left: 0, top: 0 });
  for (const part of parts) {
    const meta = await sharp(part.input).metadata();
    if (part.left + meta.width > 1280 || part.top + meta.height > 720) throw new Error(`${id}: layer ${meta.width}x${meta.height} at ${part.left},${part.top} exceeds 1280x720`);
  }
  const composed = await sharp({ create: { width: 1280, height: 720, channels: 4, background: '#17151a' } }).composite(parts).png().toBuffer();
  const image = await sharp(composed).resize(cellW, imageH).png().toBuffer();
  const x = (i % cols) * (cellW + gap), y = Math.floor(i / cols) * (cellH + gap);
  const label = Buffer.from(`<svg width="${cellW}" height="${headH}"><rect width="100%" height="100%" fill="#292827"/><text x="10" y="20" fill="white" font-family="Arial" font-size="16">${id} · ${node.scene}${node.cg ? ` · ${node.cg}` : ''}</text></svg>`);
  layers.push({ input: image, left: x, top: y + headH }, { input: label, left: x, top: y });
}

const out = path.join(root, 'playtest', 'review', 'key-scenes.png');
await fs.mkdir(path.dirname(out), { recursive: true });
await sharp({ create: { width: cols * cellW + (cols - 1) * gap, height: rows * cellH + (rows - 1) * gap, channels: 3, background: '#c9c4bb' } }).composite(layers).png().toFile(out);
console.log(`Created ${path.relative(root, out)} from ${ids.length} key scenes`);
