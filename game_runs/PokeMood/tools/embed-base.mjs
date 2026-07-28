// 把 assets/base.png 内嵌成 data URI，供 region-calibrator.html 直接加载。
//
// 为什么要内嵌：标定器是用 file:// 双击打开的离线工具。用相对路径 <img src> 加载本地图片，
// canvas 会被判定为 tainted，getImageData() 直接抛异常 —— 而标定器要靠它做 alpha 命中预览。
// data: URI 属于同源，不污染 canvas。
//
// base.png 换了就重跑：
//   node game_runs/PokeMood/tools/embed-base.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, '..', 'assets', 'base.png');
const out = path.join(here, 'base-image.js');

const b64 = fs.readFileSync(src).toString('base64');
fs.writeFileSync(out,
  '// 自动生成，勿手改。重新生成：node game_runs/PokeMood/tools/embed-base.mjs\n' +
  `window.PM_BASE_IMAGE = "data:image/png;base64,${b64}";\n`);

console.log(`${path.basename(out)}  ${(b64.length / 1024).toFixed(0)}KB  ← ${path.basename(src)}`);
