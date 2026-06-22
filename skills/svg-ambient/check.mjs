/* svg-ambient 验收门：栅格化体检 + catalog.json + samples/ + preview.png
 *
 *   node skills/svg-ambient/check.mjs
 *
 * 做四件事:
 *   1. 从 ambient.mjs 的 meta 生成机读索引 catalog.json
 *   2. 把每个元素的默认调色帧写进 samples/<name>_<i>.svg（只读参考）
 *   3. 逐帧离屏栅格化(128²)，统计非透明像素 —— 任一帧像素数过低即判定渲染崩溃
 *      （<filter>/<text>/gradient 跨设备崩坏的典型症状就是整帧空白）。退出码非 0。
 *   4. 每元素取一代表帧拼成 preview.png —— 可浏览的"素材展厅"，取代 AmbientSandbox。
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { list, meta, make } from './ambient.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const SAMPLES = path.join(DIR, 'samples');
const MIN_PIXELS = 24; // 低于此判定空白/崩溃

const names = list();

// 1) catalog.json
const catalog = {
  generator: 'skills/svg-ambient/ambient.mjs',
  note: '机读索引。frames/fps/layer/motionType 为默认值；palette/params 列可调键。',
  viewBox: '0 0 128 128',
  elements: names.map((n) => {
    const m = meta(n);
    return {
      name: n, frames: m.frames, fps: m.fps, layer: m.layer, motionType: m.motionType,
      anchor: m.anchor, scalable: m.scalable,
      palette: Object.keys(m.palette), params: m.params ? Object.keys(m.params) : [],
    };
  }),
};
fs.writeFileSync(path.join(DIR, 'catalog.json'), JSON.stringify(catalog, null, 2));
console.log(`catalog.json: ${names.length} elements`);

// 2) samples/（默认调色全部帧）
fs.rmSync(SAMPLES, { recursive: true, force: true });
fs.mkdirSync(SAMPLES, { recursive: true });
const allFrames = {};
for (const n of names) {
  const frames = make(n);
  allFrames[n] = frames;
  frames.forEach((svg, i) => fs.writeFileSync(path.join(SAMPLES, `${n}_${i}.svg`), svg));
}

// 3) 栅格化体检
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 160, height: 160 } });
const failures = [];
for (const n of names) {
  for (let i = 0; i < allFrames[n].length; i++) {
    const svg = allFrames[n][i];
    const px = await page.evaluate(async (svgStr) => {
      const url = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
      const c = document.createElement('canvas'); c.width = 128; c.height = 128;
      const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, 128, 128);
      const d = ctx.getImageData(0, 0, 128, 128).data;
      let count = 0;
      for (let p = 3; p < d.length; p += 4) if (d[p] > 10) count++;
      return count;
    }, svg).catch((e) => { return -1; });
    if (px < MIN_PIXELS) failures.push(`${n}_${i} (${px === -1 ? 'render error' : px + 'px'})`);
  }
}

// 4) preview.png contact sheet（每元素代表帧）
const cells = names.map((n) => {
  const frames = allFrames[n];
  const svg = frames[Math.floor(frames.length / 2)];
  return `<div style="display:inline-block;text-align:center;margin:4px">
    <div style="font:11px sans-serif;color:#9fb;margin-bottom:2px">${n}</div>
    <div style="background:#10151e;width:96px;height:96px;outline:1px solid #355;display:flex;align-items:center;justify-content:center">
      <div style="width:96px;height:96px">${svg.replace('width="128" height="128"', 'width="96" height="96"')}</div></div></div>`;
}).join('');
const cols = 5, rowH = 130, w = cols * 116 + 20, h = Math.ceil(names.length / cols) * rowH + 50;
await page.setViewportSize({ width: w, height: h });
await page.setContent(`<body style="margin:0;background:#0a0e16;padding:10px">
  <div style="font:bold 14px sans-serif;color:#cde;margin:6px 0 10px">svg-ambient · ${names.length} elements (single source of truth: ambient.mjs)</div>${cells}</body>`);
await page.screenshot({ path: path.join(DIR, 'preview.png') });
await browser.close();

// 报告
console.log(`samples/: ${names.reduce((s, n) => s + allFrames[n].length, 0)} frames`);
console.log(`preview.png: ${w}x${h}`);
if (failures.length) {
  console.error(`\n❌ 栅格化体检失败 (${failures.length} 帧像素 < ${MIN_PIXELS}):`);
  failures.forEach((f) => console.error('   ' + f));
  process.exit(1);
}
console.log(`\n✅ 栅格化体检通过：${names.length} 元素全部帧非空。`);
