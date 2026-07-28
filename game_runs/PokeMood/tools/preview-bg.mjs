/* PokeMood — 背景装配预检 (preview-bg.mjs)
 *
 * measure-bg 只给候选数字，"这条线对不对"必须人眼看装配后的样子。
 * 本脚本按 game/config.js 里【当前真实的】SCENES 取值把三层合成成画布尺寸的样子，
 * 再画上三条参考线，导出一张对照图：
 *
 *   红线  FOOT_Y(715)      — 靴底该落的地方。地板必须在这条线【下面】还有一截，
 *                            线压在墙上/悬在半空 = scale 错了。
 *   青线  前景缝 180/698   — 中景家具必须落在这两条线之间才不被前景挡住。
 *   黄框  斗篷范围 ±245    — 前景两侧内缘不许进这个框（进了就盖住她）。
 *
 * 用法: node tools/preview-bg.mjs [--scene=tower] [--out=_bgcheck]
 *
 * 取值直接从 config.js 读（在假 window 里 eval），不重抄一份 —— 这样"图换了、
 * 数忘了回填"会在这张图上当场露馅，而不是等跑起来才发现她站进墙里。
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME = path.resolve(__dirname, '..');
const BG_ROOT = path.join(GAME, 'assets', 'bg');

/* config.js 是浏览器脚本：`window.PM = window.PM || {}` 之后就直接写裸的 `PM.xxx`。
 * 所以假 window 必须【是】全局对象本身（ctx.window = ctx），不能只当成一个参数传进去 ——
 * 否则 `window.PM = ...` 建的是属性，而下一行的裸 `PM` 找不到，报 PM is not defined。 */
function loadConfig() {
  const src = fs.readFileSync(path.join(GAME, 'game', 'config.js'), 'utf8');
  const ctx = { innerWidth: 900, innerHeight: 720, matchMedia: () => ({ matches: false }) };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return ctx.PM.Config;
}

const C = loadConfig();
const W = C.WIDTH, H = C.HEIGHT;
const OUT = path.join(GAME, (process.argv.find(a => a.startsWith('--out=')) || '--out=_bgcheck').slice(6));
const want = (process.argv.find(a => a.startsWith('--scene=')) || '').slice(8);

// 一层：origin(0.5,0) 贴顶居中 + 各自 scale/scaleX，超出画布的部分裁掉
async function layerBuffer(file, scale, scaleX) {
  if (!fs.existsSync(file)) return null;
  const w = Math.round(C.BG.SRC_W * (scaleX ?? scale));
  const h = Math.round(C.BG.SRC_H * scale);
  const img = sharp(file).resize(w, h, { fit: 'fill' });
  /* 贴顶居中后左右/下方都会超出画布。sharp 的 composite 不吃负的 left，
   * 所以超出的部分在【源图上】就裁掉：从 srcX 起取 cw 宽、从顶取 ch 高，
   * 再贴到画布的 dstX。（这一步等价于 Phaser 里"超出画布自然裁掉"。） */
  const left = Math.round(W / 2 - w / 2);
  const srcX = Math.max(0, -left), dstX = Math.max(0, left);
  const cw = Math.min(w - srcX, W - dstX), ch = Math.min(h, H);
  if (cw <= 0 || ch <= 0) return null;
  const cut = await img.extract({ left: srcX, top: 0, width: cw, height: ch }).png().toBuffer();
  return { input: cut, left: dstX, top: 0 };
}

function guides() {
  const F = C.BG.FOOT_Y;
  return Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
       <line x1="0" y1="${F}" x2="${W}" y2="${F}" stroke="#ff3355" stroke-width="2"/>
       <text x="6" y="${F - 6}" fill="#ff3355" font-size="13" font-family="monospace">FOOT_Y ${F}</text>
       <line x1="180" y1="0" x2="180" y2="${H}" stroke="#3fe0d0" stroke-width="1.5" stroke-dasharray="6 6"/>
       <line x1="698" y1="0" x2="698" y2="${H}" stroke="#3fe0d0" stroke-width="1.5" stroke-dasharray="6 6"/>
       <rect x="${W / 2 - 245}" y="60" width="490" height="${F - 60}" fill="none"
             stroke="#ffd455" stroke-width="1.5" stroke-dasharray="3 7"/>
     </svg>`);
}

async function one(scene) {
  const dir = path.join(BG_ROOT, scene.dir);
  const parts = [];
  for (const l of ['far', 'mid', 'fore']) {
    const b = await layerBuffer(path.join(dir, `${l}.webp`), scene.scale[l],
                                l === 'fore' ? scene.foreScaleX : null);
    if (b) parts.push(b);
    else console.warn(`  ⚠️ ${scene.id}/${l} 缺图`);
  }
  const out = path.join(OUT, `${scene.id}.png`);
  await sharp({ create: { width: W, height: H, channels: 4,
                          background: { r: 13, g: 17, b: 25, alpha: 1 } } })
    .composite([...parts, { input: guides(), left: 0, top: 0 }])
    .png().toFile(out);
  console.log(`  ✅ ${path.relative(GAME, out)}   scale far ${scene.scale.far} / mid ${scene.scale.mid} / fore ${scene.scale.fore} (scaleX ${scene.foreScaleX})`);
}

fs.mkdirSync(OUT, { recursive: true });
console.log(`--- 背景装配预检 (${W}×${H}) ---`);
for (const s of C.SCENES) {
  if (want && s.id !== want) continue;
  await one(s);
}
console.log('红线=靴底 / 青虚线=前景缝 / 黄框=斗篷范围。地板要在红线下还有一截。');
