#!/usr/bin/env node
// BladeTrinity 三流派「蓄力变装」图集构建 —— 从三段绿幕变身源片到运行时图集 + 注册表
//
// 用法（仓库根目录执行）：
//   node game_runs/BladeTrinity/tools/build-transform.mjs            # 全部三派
//   node game_runs/BladeTrinity/tools/build-transform.mjs water      # 只重建一派（注册表仍写全三派）
//
// 依赖：ffmpeg / ffprobe（PATH）、npm install（sharp / tsx）
// 源片：video_runs/{sword,water,north}/source/...mp4（gitignored，SHA-256 见下方 SPEC，不符即中止）
// 工作区：video_runs/BladeTrinityTransform/<派>/（抽帧/抠图中间产物，gitignored）
//         └── review/（接触表、首末帧对比、四色底目检图）+ report.json（入库）
// 产物：game_runs/BladeTrinity/assets/sprites/transform/<派>.webp（入库，CI 部署要读）
//       game_runs/BladeTrinity/assets/sprites/transformations.js（window.BT.TRANSFORM_ATLAS）
//
// 抠图走共享的 skills/video-sprite（process.ts --crop --pick / assemble.ts），本脚本只做
// 项目侧的预处理（补边 + 固定窗裁剪 + 镜像）与装配，不改共享抠图逻辑。
//
// ⚠️ 本脚本是这套图集的【唯一权威复现方式】。SPEC 里的帧号、尺度、保持帧互相耦合，
// 改一处须重跑并按 README「蓄力变装」一节重新目检。

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
process.chdir(ROOT);

const FW = 192, FH = 208, BASELINE = 202;     // 与七动作主图集同一格规格（video-sprite 标准）
const KEY_THR = 110;                          // 测量用色距阈值，与 process.ts 默认一致
const GAME = 'game_runs/BladeTrinity';
const OUT_DIR = `${GAME}/assets/sprites/transform`;
const WORK = 'video_runs/BladeTrinityTransform';

// ─────────────────────────────────────────────────────────────
// 每派规格。帧号一律是源片 24fps 原生帧号（t = 帧号/24），由逐帧差分 + 接触表目检定出：
//   original = 原装保持；change = 变装进行；hold = 变装完成后的稳定段；release = 挥剑（不进图集）
// chargeFrames 在 change 段内等距取样（首帧取在变化起点前一点，p=0 读得出"原装"）；
// holdFrame 取 hold 段里紧挨 change 末尾的一帧，满蓄切过去不跳。
//
// scale：新旧源片首帧都是同一张定妆参考图（同姿势同构图），所以
//   新尺度 = 主图集尺度 × 旧片首帧 bbox 高 / 新片首帧 bbox 高
// 旧片 references/BladeTrinity/clips/<派>_stance.mp4（预裁 712:716:284:2）首帧 vs 新片首帧，
// 宽比与高比一致（1.23 左右），证明是同一取景只差缩放：
//   sword 447/362 × 0.2959 = 0.3654   water 446/362 × 0.2556 = 0.3149   north 446/362 × 0.2796 = 0.3445
// 这样变装帧与该派现有 idle 的人物同高（用人物本体，不含剑的 bbox 比例同样成立）。
// ─────────────────────────────────────────────────────────────
const SPEC = {
  sword: {
    src: 'video_runs/sword/source/flow_accepted_2026-11-02/swordswoman_transformation_accepted.mp4',
    sha256: 'E2D12D32D2F0AE58A2E49D11A7D722952222A5E9B7C4A86C9C452A26F42E9178',
    status: 'user_accepted',
    look: '红发间长出一对犬耳（服饰不变）；源片后段挥剑并收回耳朵，不进图集',
    // 源片角色朝右（与旧七动作源片同样没守 facing LEFT），装配时镜像回【朝左】规格
    mirror: true,
    scale: 0.3654,
    segments: { original: [0, 7], change: [8, 30], hold: [31, 70], release: [71, 104], recover: [105, 143] },
    change: [8, 30], nCharge: 18, hold: 32,
  },
  water: {
    src: 'video_runs/water/source/flow_transform_2026-11-02/water_god_transformation_accepted_v7.mp4',
    sha256: 'F890E5DCCC3DB5552FA20E8366A7434A1D01684AE7256D65D3369282908A5578',
    status: 'user_accepted',
    look: '深蓝外袍自肩至下摆换成海蓝/青绿分层甲裙 + 银边浪纹，腰间两条短飘带',
    mirror: false,
    scale: 0.3149,
    segments: { original: [0, 4], change: [5, 53], hold: [54, 59], release: [60, 104], finish: [105, 143] },
    change: [5, 53], nCharge: 20, hold: 57,
  },
  north: {
    src: 'video_runs/north/source/flow_transform_2026-11-02/north_god_transformation_candidate_v6.mp4',
    sha256: '6FBB898984784DD76D098FD9E28DFB0D1F015B4739015401DF5DDE2BE6065BC1',
    status: 'candidate_v6（未经用户最终验收）',
    look: '彩条斗篷换成午夜蓝/炭灰战袍 + 银白毛领 + 银扣，红裤与凉鞋保留',
    mirror: false,
    scale: 0.3445,
    segments: { original: [0, 7], change: [8, 42], hold: [43, 61], release: [62, 104], finish: [105, 143] },
    change: [10, 42], nCharge: 20, hold: 45,
  },
};

const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'pipe', encoding: 'utf8', shell: process.platform === 'win32' && cmd === 'npx', ...opts });
const pad3 = (i) => String(i).padStart(3, '0');
const linspace = (a, b, n) => Array.from({ length: n }, (_, i) => Math.round(a + (b - a) * i / (n - 1)));

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
}

function probe(file) {
  const j = JSON.parse(sh('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_frames',
    '-show_entries', 'stream=width,height,r_frame_rate,nb_read_frames,duration', '-of', 'json', file]));
  const s = j.streams[0];
  const [n, d] = s.r_frame_rate.split('/').map(Number);
  return { width: s.width, height: s.height, fps: n / d, frames: +s.nb_read_frames, duration: +s.duration };
}

// 首帧测量：边框中位数底色、前景 bbox、alpha 质心 x（与 process.ts anchor 模式同口径）
async function measure(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, bs = [[], [], []];
  const push = (x, y) => { const p = (y * W + x) * 3; for (let c = 0; c < 3; c++) bs[c].push(data[p + c]); };
  for (let x = 0; x < W; x += 3) { push(x, 1); push(x, H - 2); }
  for (let y = 0; y < H; y += 3) { push(1, y); push(W - 2, y); }
  const bg = bs.map((a) => a.sort((p, q) => p - q)[a.length >> 1]);
  let x0 = W, x1 = -1, y0 = H, y1 = -1, n = 0, sx = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = (y * W + x) * 3;
    if (Math.hypot(data[p] - bg[0], data[p + 1] - bg[1], data[p + 2] - bg[2]) > KEY_THR) {
      n++; sx += x; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  return { bg, bbox: { x0, x1, y0, y1 }, cx: sx / n };
}

// 和 rebuild.sh 第 4 步同一条去绿溢色规则（绿通道显著压过红蓝 → 压回、亮度补回红蓝）
function despill(data) {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 8) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2], m = Math.max(r, b);
    if (g > m * 1.12) {
      const e = g - m; data[i + 1] = m;
      data[i] = Math.min(255, r + e * 0.5); data[i + 2] = Math.min(255, b + e * 0.5);
    }
  }
}

function alphaStats(data, w, h) {
  let x0 = w, x1 = -1, y0 = h, y1 = -1, n = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] > 8) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return n ? { x0, x1, y0, y1, w: x1 - x0 + 1, h: y1 - y0 + 1, area: n } : null;
}

const svgLabel = (w, h, text) => Buffer.from(
  `<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#000"/>` +
  `<text x="4" y="${h - 5}" font-size="13" fill="#fff" font-family="monospace">${text}</text></svg>`);

// 一行格子铺到指定底色上（带标签），审查用
async function strip(cells, labels, bg, scale = 1) {
  const cw = Math.round(FW * scale), chh = Math.round(FH * scale), lh = 18;
  const comps = [];
  for (let i = 0; i < cells.length; i++) {
    comps.push({ input: await sharp(cells[i]).resize(cw, chh).png().toBuffer(), left: i * cw, top: lh });
    comps.push({ input: svgLabel(cw, lh, labels[i]), left: i * cw, top: 0 });
  }
  return sharp({ create: { width: cw * cells.length, height: chh + lh, channels: 4, background: bg } })
    .composite(comps).png().toBuffer();
}

async function build(id) {
  const S = SPEC[id], dir = `${WORK}/${id}`, work = `${dir}/work`, review = `${dir}/review`;
  console.log(`\n=== ${id} ===`);
  if (!fs.existsSync(S.src)) throw new Error(`源片不存在：${S.src}（gitignored，需本机归档）`);
  const hash = sha256(S.src);
  if (hash !== S.sha256) throw new Error(`${id} 源片 SHA-256 不符：${hash}`);
  const info = probe(S.src);
  console.log(`  source ok  ${info.width}x${info.height} ${info.fps}fps ${info.frames}f ${info.duration}s`);

  // ① 原生帧率全段抽帧（审查/测量用）
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(`${work}/raw`, { recursive: true });
  fs.mkdirSync(review, { recursive: true });
  sh('ffmpeg', ['-v', 'error', '-i', S.src, '-start_number', '0', `${work}/raw/f_%03d.png`, '-y']);

  // ② 固定裁剪窗：尺寸 = 格尺寸 / scale；首帧 alpha 质心对格中心；脚底（首帧 bbox 底 +1）→ 基线 202。
  //    整段同一个窗、同一个缩放 —— 零逐帧适配，角色不会呼吸式忽大忽小，窗内真实位移保留。
  const m0 = await measure(`${work}/raw/f_000.png`);
  const W = Math.round(FW / S.scale), H = Math.round(FH / S.scale);
  const left = Math.round(m0.cx - W / 2), top = Math.round(m0.bbox.y1 + 1 - BASELINE / S.scale);
  // 窗口超出画面的部分用本片底色补齐（水神按人物同高定标后窗口顶端高出画面 72px）
  const pl = Math.max(0, -left), pt = Math.max(0, -top);
  const pr = Math.max(0, left + W - info.width), pb = Math.max(0, top + H - info.height);
  const color = '0x' + m0.bg.map((v) => v.toString(16).padStart(2, '0')).join('');
  const vf = [`pad=${info.width + pl + pr}:${info.height + pt + pb}:${pl}:${pt}:color=${color}`,
    `crop=${W}:${H}:${left + pl}:${top + pt}`];
  if (S.mirror) vf.push('hflip');      // 整窗水平翻转：窗以质心为中心，翻转后质心仍在格中心
  const win = `${work}/window.mkv`;
  sh('ffmpeg', ['-v', 'error', '-i', S.src, '-vf', vf.join(','), '-c:v', 'ffv1', '-an', win, '-y']);
  console.log(`  window ${W}x${H} @(${left},${top}) pad[l${pl} t${pt} r${pr} b${pb}] bg=${m0.bg} mirror=${!!S.mirror}`);

  // ③ 共享管线抠图：--crop 覆盖整幅预裁窗（不看 bbox）、--pick 原生帧号（末帧 = 保持帧）
  const charge = linspace(S.change[0], S.change[1], S.nCharge);
  const picks = [...charge, S.hold];
  const proj = `BladeTrinityTransform/${id}`;
  for (const d of ['animations', 'output']) fs.rmSync(`${dir}/${d}`, { recursive: true, force: true });
  fs.rmSync(`${dir}/manifest.json`, { force: true });
  sh('npx', ['tsx', 'skills/video-sprite/prepare.ts', proj]);
  const log = sh('npx', ['tsx', 'skills/video-sprite/process.ts', proj, 'charge', win,
    '--extract-fps=24', `--pick=${picks.join(',')}`, `--crop=0,0,${W},${H}`, '--no-loop', '--fps=24']);
  if (!/done/.test(log)) throw new Error(`process.ts 未完成：\n${log}`);
  sh('npx', ['tsx', 'skills/video-sprite/assemble.ts', proj]);

  // ④ 从无损帧装配运行时图集（不读 assemble 的有损 webp 再压一遍）+ 去绿溢色
  const cells = [], stats = [];
  for (let i = 0; i < picks.length; i++) {
    const { data, info: ci } = await sharp(`${dir}/animations/charge/frame_${i}.png`).ensureAlpha().raw()
      .toBuffer({ resolveWithObject: true });
    if (ci.width !== FW || ci.height !== FH) throw new Error(`格尺寸异常 ${ci.width}x${ci.height}`);
    despill(data);
    const st = alphaStats(data, FW, FH);
    if (!st) throw new Error(`${id} 第 ${i} 格整格透明`);
    // 剑与手脚不能贴格边：贴边 = 被裁切
    st.touchesEdge = st.x0 <= 0 || st.y0 <= 0 || st.x1 >= FW - 1;
    stats.push({ cell: i, src: picks[i], ...st });
    cells.push(await sharp(Buffer.from(data), { raw: { width: FW, height: FH, channels: 4 } }).png().toBuffer());
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const atlasFile = `${OUT_DIR}/${id}.webp`;
  await sharp({ create: { width: FW * cells.length, height: FH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(cells.map((input, i) => ({ input, left: i * FW, top: 0 })))
    .webp({ quality: 92, alphaQuality: 100 }).toFile(atlasFile);

  // ⑤ 审查：接触表（全段每 4 帧，裁到角色窗）、四色底逐格、首末帧 vs 现有 idle 对比
  const labels = picks.map((p, i) => (i === picks.length - 1 ? `HOLD f${p}` : `c${i} f${p}`));
  const bgs = { magenta: '#ff00ff', black: '#000000', white: '#ffffff', warm: '#c9905a' };
  const rows = [];
  for (const [name, bg] of Object.entries(bgs)) rows.push({ name, buf: await strip(cells, labels, bg, 0.75) });
  const rmeta = await sharp(rows[0].buf).metadata();
  await sharp({ create: { width: rmeta.width, height: rmeta.height * rows.length, channels: 4, background: '#222' } })
    .composite(rows.map((r, i) => ({ input: r.buf, left: 0, top: i * rmeta.height }))).png()
    .toFile(`${review}/cells_4bg.png`);

  // 全段接触表（源片原生帧号每 4 帧一格，窗内视图），标出 change/hold/release
  const sheetIdx = []; for (let i = 0; i < info.frames; i += 4) sheetIdx.push(i);
  const tw = 150, th = Math.round(tw * H / W), cols = 12, lh = 18;
  const comps = [];
  for (let k = 0; k < sheetIdx.length; k++) {
    const f = sheetIdx[k];
    let img = sharp(`${work}/raw/f_${pad3(f)}.png`)
      .extend({ top: pt, bottom: pb, left: pl, right: pr, background: { r: m0.bg[0], g: m0.bg[1], b: m0.bg[2] } })
      .extract({ left: left + pl, top: top + pt, width: W, height: H });
    const buf = await sharp(await img.png().toBuffer()).flop(!!S.mirror).resize(tw, th).png().toBuffer();
    const seg = Object.entries(S.segments).find(([, [a, b]]) => f >= a && f <= b);
    const x = (k % cols) * tw, y = Math.floor(k / cols) * (th + lh);
    comps.push({ input: buf, left: x, top: y + lh });
    comps.push({ input: svgLabel(tw, lh, `f${f} ${seg ? seg[0] : ''}`), left: x, top: y });
  }
  await sharp({ create: { width: cols * tw, height: Math.ceil(sheetIdx.length / cols) * (th + lh), channels: 3, background: '#222' } })
    .composite(comps).png().toFile(`${review}/source_contact_sheet.png`);

  // 首末帧 + 现有主图集 idle/guard 首帧并排（同格同尺度），看人物高度与脚底
  const main = `${GAME}/assets/sprites/${id}.webp`;
  const cellOf = async (row, col) => sharp(main).extract({ left: col * FW, top: row * FH, width: FW, height: FH }).png().toBuffer();
  const cmp = [await cellOf(1, 0), await cellOf(3, 0), cells[0], cells[Math.floor(cells.length / 2)], cells[cells.length - 1]];
  const cmpLabels = ['idle#0 (main)', 'guard#0 (main)', `charge c0 f${picks[0]}`, `charge mid f${picks[Math.floor(cells.length / 2)]}`, `HOLD f${S.hold}`];
  const cmpBuf = await strip(cmp, cmpLabels, '#ff00ff', 1);
  // 基线参考线：y=202（脚底）
  const cm = await sharp(cmpBuf).metadata();
  const line = Buffer.from(`<svg width="${cm.width}" height="${cm.height}"><line x1="0" y1="${18 + BASELINE}" x2="${cm.width}" y2="${18 + BASELINE}" stroke="#00ffff" stroke-width="1"/></svg>`);
  await sharp(cmpBuf).composite([{ input: line, left: 0, top: 0 }]).png().toFile(`${review}/first_last_vs_idle.png`);

  const mainStats = [];
  for (const [row, name] of [[1, 'idle'], [3, 'guard']]) {
    const { data } = await sharp(await cellOf(row, 0)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    mainStats.push({ anim: name, ...alphaStats(data, FW, FH) });
  }

  const report = {
    id, status: S.status, look: S.look,
    source: { file: S.src, sha256: hash, ...info },
    segments: S.segments,
    window: { width: W, height: H, left, top, pad: { left: pl, top: pt, right: pr, bottom: pb }, bg: m0.bg, mirror: !!S.mirror },
    firstFrame: { bbox: m0.bbox, centroidX: +m0.cx.toFixed(1) },
    scale: S.scale, effectiveScale: +Math.min(FW / W, FH / H).toFixed(4),
    picks: { charge, hold: S.hold },
    atlas: { file: atlasFile, bytes: fs.statSync(atlasFile).size, sha256: sha256(atlasFile), width: FW * cells.length, height: FH },
    cells: stats,
    mainAtlasCells: mainStats,
    checks: {
      anyCellTouchesEdge: stats.some((s) => s.touchesEdge),
      footMaxY: Math.max(...stats.map((s) => s.y1)),
      heightRange: [Math.min(...stats.map((s) => s.h)), Math.max(...stats.map((s) => s.h))],
    },
  };
  fs.writeFileSync(`${dir}/report.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(`  atlas ${report.atlas.width}x${FH} ${(report.atlas.bytes / 1024).toFixed(0)}KB  cells ${cells.length}` +
    `  footMaxY=${report.checks.footMaxY}  h=${report.checks.heightRange.join('..')}  edge=${report.checks.anyCellTouchesEdge}`);
  return report;
}

function writeRegistry() {
  const reg = {};
  for (const id of Object.keys(SPEC)) {
    const rp = `${WORK}/${id}/report.json`;
    if (!fs.existsSync(rp)) throw new Error(`${id} 还没构建过（缺 ${rp}）`);
    const r = JSON.parse(fs.readFileSync(rp, 'utf8'));
    const n = r.picks.charge.length;
    reg[id] = {
      texture: `assets/sprites/transform/${id}.webp`,
      frameSize: { width: FW, height: FH },
      cols: n + 1, rows: 1,
      chargeFrames: Array.from({ length: n }, (_, i) => i),   // 按蓄力进度选帧，不注册成自动播放动画
      holdFrame: n,                                           // 满蓄（p=1）固定这一格
      baselineY: BASELINE,
      facing: 'left',                                          // 与主图集同规格：素材朝左，朝右才 flipX
      srcFacing: r.window.mirror ? 'right' : 'left',
      srcFrames: r.picks.charge, srcHoldFrame: r.picks.hold,  // 源片原生帧号（制作追溯用）
      srcSegments: r.segments,
      sourceStatus: r.status,
      previewFps: 24,                                          // 只给预览页按源片原速回放用
      sha256: r.atlas.sha256,
    };
  }
  const file = `${GAME}/assets/sprites/transformations.js`;
  fs.writeFileSync(file,
    '// BladeTrinity 蓄力变装图集元数据 —— 由 tools/build-transform.mjs 生成，勿手改\n' +
    '// 架构铁律：元数据走 <script> + window 命名空间，不 fetch json（见 CLAUDE.md）\n' +
    '// 每派一行：chargeFrames 随蓄力进度 clamp(p,0,1) 选帧，p=1 固定 holdFrame（见 game/systems/transformation.js）\n' +
    'window.BT = window.BT || {};\n' +
    'window.BT.TRANSFORM_ATLAS = ' + JSON.stringify(reg, null, 2) + ';\n');
  console.log(`\n  ok ${file}`);
}

const only = process.argv.slice(2).filter((a) => SPEC[a]);
for (const id of only.length ? only : Object.keys(SPEC)) await build(id);
writeRegistry();
console.log('完成。目检：video_runs/BladeTrinityTransform/<派>/review/ —— 见 README「蓄力变装」验收一节。');
