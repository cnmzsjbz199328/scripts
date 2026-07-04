#!/usr/bin/env node
// glb-sprite 主入口：3D 骨骼动画（GLB/FBX）→ 剪影 PNG 序列帧。
//
//   node skills/glb-sprite/render.mjs --inspect --model X.fbx     # 新模型体检报告
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

const usage = `glb-sprite render.mjs — 3D 骨骼动画（GLB/FBX）→ 剪影序列帧

  --model <path>    GLB/FBX 模型（默认自带 Soldier.glb）
  --inspect         新模型体检：骨骼/蒙皮部件/可用动作/比例/渲染验证，输出报告 + 验证帧
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

if (args.help || (!args.list && !args.clip && !args.inspect)) {
  console.log(usage);
  process.exit(args.help ? 0 : 1);
}

const modelPath = path.resolve(args.model || DEFAULT_MODEL);
if (!fs.existsSync(modelPath)) { console.error(`模型不存在: ${modelPath}`); process.exit(1); }

const cfg = {
  glbB64: fs.readFileSync(modelPath).toString('base64'),
  ext: path.extname(modelPath).slice(1).toLowerCase(), // fbx 走 FBXLoader，其余走 GLTFLoader
  width: +(args.w || 360),
  height: +(args.h || 480),
  color: args.color || '#0a0d12',
  bg: args.bg || 'transparent',
  rotY: +(args.rotY || 0),
  camX: args.camX != null ? +args.camX : null, // 缺省由 harness 按模型高度自适应
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
console.log(`clips: ${info.clips.map((c) => `${c.name}(${c.duration}s, ${c.trackCount}tr)`).join('  ')}`);
console.log(`framing: orthoH=${info.framing.orthoH} camY=${info.framing.camY}`);

if (args.list) {
  console.log(`bones (${info.bones.length}, 去重后):\n  ${info.bones.join('\n  ')}`);
  await browser.close();
  process.exit(0);
}

// ---------- 体检模式：骨骼/动作/比例/渲染验证 ----------
if (args.inspect) {
  const REF_HEIGHT = 1.78; // 已验证参照（Xbot≈1.78 / Soldier≈1.74，游戏内世界单位=米）
  const usable = info.clips.filter((c) => c.trackCount > 0); // Take 001 之类 0-track 空占位属正常，过滤
  const isMixamo = info.bones.length > 0
    && info.bones.every((n) => n.toLowerCase().includes('mixamorig'));

  // 比例：整数倍偏差（2x/0.5x/10x…）几乎都是导出单位约定不同，不是模型建错
  const ratio = info.height / REF_HEIGHT;
  let best = 1, bestDiff = Infinity;
  for (const f of [100, 10, 2, 1, 0.5, 0.1, 0.01]) {
    const d = Math.abs(ratio / f - 1);
    if (d < bestDiff) { bestDiff = d; best = f; }
  }

  const lines = [];
  lines.push(`模型: ${path.basename(modelPath)} (${cfg.ext})`);
  lines.push(`骨骼: ${info.bones.length} 根唯一骨骼 ${isMixamo ? '✅ 标准 mixamorig 命名，挂件代码零改动'
    : info.bones.length ? '⚠ 非 mixamorig 命名，hooks 里的骨骼名要跟着改（--list 查全名）' : '❌ 无骨骼——静态网格，做不了骨骼动画'}`);
  lines.push(`蒙皮: ${info.skinnedMeshNames.length}/${info.meshCount} 个网格有蒙皮${
    info.skinnedMeshNames.length ? `: ${info.skinnedMeshNames.join(', ')}` : ' ❌'}`);
  lines.push(usable.length
    ? `动作: ✅ ${usable.map((c) => `"${c.name}"(${c.duration}s, ${c.trackCount} tracks)`).join(' / ')}${
      info.clips.length > usable.length ? `（已忽略 ${info.clips.length - usable.length} 个 0-track 空占位）` : ''}`
    : '动作: ⚠ 没有可用 clip——需要走 Mixamo 自动绑骨/配动作，或只做静态摆拍');
  lines.push(Math.abs(ratio - 1) > 0.15
    ? `比例: ⚠ 包围盒高 ${info.height}，偏离参照(${REF_HEIGHT}) ${ratio.toFixed(2)} 倍 → 多半是单位约定不同，多角色同台时按 ×${1 / best} 换算对齐身高（剪影渲染本身自动取景，不受影响）`
    : `比例: ✅ 包围盒高 ${info.height}，与参照(${REF_HEIGHT})同一量级`);

  // 渲染验证：挑第一个可用动作的中段渲一帧，像素覆盖率做无人值守兜底
  if (usable.length) {
    const [url] = await page.evaluate(
      (o) => window.__silhouette.sample(o),
      { clip: usable[0].name, frames: 1, endpoint: false, from: usable[0].duration * 0.3, to: null },
    );
    const buf = Buffer.from(url.split(',')[1], 'base64');
    const framePath = path.join(
      path.resolve(args.out || path.dirname(modelPath)),
      `${path.basename(modelPath, path.extname(modelPath)).toLowerCase()}_inspect.png`);
    fs.mkdirSync(path.dirname(framePath), { recursive: true });
    fs.writeFileSync(framePath, buf);
    const { data, info: im } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let covered = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 8) covered++;
    const cov = covered / (im.width * im.height);
    // 正常站位人形剪影占画面 3%~35%；太低=没渲出来/相机没对准，太高=比例爆炸/相机在模型内部
    const ok = cov > 0.03 && cov < 0.35;
    lines.push(`渲染: ${ok ? '✅' : '⚠'} "${usable[0].name}" 中段一帧，剪影覆盖率 ${(cov * 100).toFixed(1)}%${
      ok ? '（在人形合理区间）' : '（超出 3%~35% 合理区间，目检验证帧！）'} → ${framePath}`);
  }

  console.log('\n===== 体检报告 =====\n' + lines.join('\n'));
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
