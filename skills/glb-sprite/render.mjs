#!/usr/bin/env node
// glb-sprite 主入口：3D 骨骼动画 → 剪影 PNG 序列帧。
//
//   node skills/glb-sprite/render.mjs --list [--model X.glb]
//   node skills/glb-sprite/render.mjs --clip Walk --frames 6 --out <dir> --prefix hero_walk [选项]
//
// 流程：esbuild 打包 harness(+hooks) → playwright 无头 Chromium 渲染 → 写 PNG（可选接触表）。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';
import { chromium } from 'playwright';
import sharp from 'sharp';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_MODEL = path.join(HERE, 'models', 'Soldier.glb');

// ---------- CLI ----------
const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) continue;
  const k = argv[i].slice(2);
  const next = argv[i + 1];
  if (next === undefined || next.startsWith('--')) args[k] = true;
  else { args[k] = next; i++; }
}

const usage = `glb-sprite render.mjs — 3D 骨骼动画 → 剪影序列帧

  --model <path>    GLB 模型（默认自带 Soldier.glb）
  --list            打印 clip 名 + 时长 + 骨骼名，不渲染
  --clip <name>     动作 clip 名（--list 查看）
  --frames <n>      采样帧数（默认 6）
  --out <dir>       输出目录
  --prefix <name>   帧文件前缀 → <prefix>_<i>.png（默认 <model>_<clip> 小写）
  --w / --h         画布尺寸（默认 360×480）
  --color <hex>     剪影颜色（默认 #0a0d12）
  --bg <hex|transparent>  背景（默认 transparent，游戏资产用）
  --rotY <deg>      模型 Y 轴旋转（朝向不对时调）
  --camX <n>        相机侧向距离（默认 5，正交下只影响裁剪不影响大小）
  --orthoH <n>      垂直取景高度（世界单位；缺省按包围盒自动 fit）
  --camY <n>        相机/注视高度（缺省取包围盒中心）
  --fit-margin <n>  自动 fit 的留边系数（默认 1.3）
  --endpoint        采样含终点帧（非循环动作用；循环默认不含，末帧接回首帧）
  --from / --to     只采样时间轴 [from,to] 秒的片段
  --hooks <file>    挂件脚本（export onModelLoaded(state) / onFrame(state, info)）
  --sheet           同时输出接触表 <prefix>_sheet.png 供目检`;

if (args.help || (!args.list && !args.clip)) {
  console.log(usage);
  process.exit(args.help ? 0 : 1);
}

const modelPath = path.resolve(args.model || DEFAULT_MODEL);
if (!fs.existsSync(modelPath)) { console.error(`模型不存在: ${modelPath}`); process.exit(1); }

const cfg = {
  glbB64: fs.readFileSync(modelPath).toString('base64'),
  width: +(args.w || 360),
  height: +(args.h || 480),
  color: args.color || '#0a0d12',
  bg: args.bg || 'transparent',
  rotY: +(args.rotY || 0),
  camX: args.camX != null ? +args.camX : 5,
  orthoH: args.orthoH != null ? +args.orthoH : null,
  camY: args.camY != null ? +args.camY : null,
  fitMargin: +(args['fit-margin'] || 1.3),
};

// ---------- bundle harness (+hooks) ----------
const hooksImport = args.hooks
  ? `import * as hooks from ${JSON.stringify(path.resolve(args.hooks).replace(/\\/g, '/'))};`
  : 'const hooks = {};';
const bundle = await esbuild.build({
  stdin: {
    contents: `import { boot } from './harness.mjs';\n${hooksImport}\nboot(hooks);`,
    resolveDir: HERE,
  },
  bundle: true,
  format: 'iife',
  write: false,
});

// ---------- render in headless chromium ----------
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('[page]', e.message));
await page.setContent('<!DOCTYPE html><body></body>');
await page.addScriptTag({ content: bundle.outputFiles[0].text });

const info = await page.evaluate((c) => window.__silhouette.init(c), cfg);
console.log(`clips: ${info.clips.map((c) => `${c.name}(${c.duration}s)`).join('  ')}`);
console.log(`framing: orthoH=${info.framing.orthoH} camY=${info.framing.camY}`);

if (args.list) {
  console.log(`bones (${info.bones.length}):\n  ${info.bones.join('\n  ')}`);
  await browser.close();
  process.exit(0);
}

const frames = +(args.frames || 6);
const dataUrls = await page.evaluate(
  (o) => window.__silhouette.sample(o),
  {
    clip: args.clip,
    frames,
    endpoint: !!args.endpoint,
    from: args.from != null ? +args.from : null,
    to: args.to != null ? +args.to : null,
  },
);
await browser.close();

// ---------- write PNGs ----------
const outDir = path.resolve(args.out || '.');
fs.mkdirSync(outDir, { recursive: true });
const prefix = args.prefix
  || `${path.basename(modelPath, path.extname(modelPath))}_${args.clip}`.toLowerCase();
const bufs = dataUrls.map((u) => Buffer.from(u.split(',')[1], 'base64'));
bufs.forEach((buf, i) => fs.writeFileSync(path.join(outDir, `${prefix}_${i}.png`), buf));

// 空帧哨兵：透明背景下首帧 alpha 全 0 说明 WebGL 没渲出来
if (cfg.bg === 'transparent') {
  const stats = await sharp(bufs[0]).stats();
  const alpha = stats.channels[3];
  if (alpha && alpha.max === 0) console.error('⚠ 首帧 alpha 全空——WebGL 可能未生效，检查 chromium 启动参数');
}
console.log(`✓ ${frames} 帧 → ${outDir}\\${prefix}_[0..${frames - 1}].png`);

// ---------- contact sheet ----------
if (args.sheet) {
  const gap = 8;
  const sheet = await sharp({
    create: {
      width: cfg.width * frames + gap * (frames + 1),
      height: cfg.height + gap * 2,
      channels: 4,
      background: '#e7eaee',
    },
  }).composite(bufs.map((input, i) => ({ input, left: gap + i * (cfg.width + gap), top: gap })))
    .png().toFile(path.join(outDir, `${prefix}_sheet.png`));
  console.log(`✓ 接触表 → ${outDir}\\${prefix}_sheet.png (${sheet.width}×${sheet.height})`);
}
