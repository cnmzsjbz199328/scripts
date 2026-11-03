#!/usr/bin/env node
/**
 * BladeTrinity — 蓄力变装（BT.Transform）针对性检查。无头 Chromium，软件验证。
 *
 *   node game_runs/BladeTrinity/tools/transform-check.mjs              # P + G + T
 *   node game_runs/BladeTrinity/tools/transform-check.mjs --parts=G    # 只跑对局
 *   node game_runs/BladeTrinity/tools/transform-check.mjs --parts=T    # 只跑子弹时间
 *   node game_runs/BladeTrinity/tools/transform-check.mjs --parts=T --tsuite=ai,life   # T 段只跑部分套件
 *   （只跑部分时报告按段名合并：这次跑过的段替换，其余段沿用上次结果）
 *
 * P  预览页 transform-preview.html：三派 × 左右朝向的进度→格号映射、单调、满蓄保持不动、
 *    按住/释放/取消、30 轮反复后显示对象 / 补间 / 监听器不累积、无 404、四种背景截图。
 * G  真实对局 index.html（玩家走 window keydown/keyup 真按键路径；AI 走 _startAICharge 真路径）：
 *    短按 / 半蓄 / 满蓄 / 满蓄继续按住 / 蓝耗尽自动放 / 受击打断 / 失焦取消 / 长帧（暂停恢复）/
 *    换边朝向 / AI 蓄力 / 双方同时蓄力 / 蓄力中无描边（含防御中直接起蓄）/ 剑气数量与伤害按原公式 / 脚底与碰撞体不动；
 *    换场定格 / 重开 / 缺图（路由拦掉 transform/*.webp）退回 guard 占位 / 窄视口。
 *    手柄掉线与切后台的取消路径另由 tools/joycon-check.mjs（B 段）覆盖。
 *    G 段一律带 ?bt=0（关子弹时间）原样跑 —— 证明关掉慢放时行为与接入前一致。
 * T  子弹时间（蓄力期间全场慢放，bullettime.js），默认开启：三派满蓄真实时长 / 游戏时间、五处倍率、
 *    松手当帧回 1×、剑气与扣蓝与 waveStun 按游戏时间不变、物理与动画真的变慢、轻点 / 受击 / 飞来剑气打断、
 *    AI 蓄力与双方同蓄、KO / interlude / over / 重开复位、缺图不慢放、抜刀冻结在时钟偏差下按时解冻、
 *    ?bt=0 / ?bt=0.5 / 非法值、30 轮蓄放无累积。
 *
 * ⚠️ 对局用例【手动步进】：停掉 rAF 主循环，用 game.step(t, 1/60s) 逐帧推进，按键在帧之间派发。
 *    墙钟驱动在无头里不可靠 —— node↔页面一次往返约 300ms、机器忙时单帧 100ms+，"短按/半蓄"会被测成
 *    满蓄，截图要 1 秒以上、拍到的已是释放后的画面。步进下游戏时间完全确定，截图时画面天然定格。
 *    换场/重开/缺图三段仍走真实时钟（它们不依赖毫秒级时序）。
 *    Phaser 走本地 _engine/vendor 副本（CDN 在无头里偶发很慢，页面迟迟进不了场景）。
 *
 * 截图 → video_runs/BladeTrinityTransform/check/（png 不入库），报告 → 同目录 report.json。
 * Exit code 0 = 全部断言通过。
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GAME_RUNS = path.resolve(HERE, '..', '..');
const ROOT = path.resolve(GAME_RUNS, '..');
const OUT = path.join(ROOT, 'video_runs', 'BladeTrinityTransform', 'check');
const flags = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SCHOOLS = ['sword', 'water', 'north'];
const BT_OFF = '?bt=0';     // G 段：关子弹时间原样跑

const results = [];
let section = '';
function check(name, ok, detail) {
  results.push({ section, name, ok: !!ok, detail: ok ? undefined : detail });
  console.log(`${ok ? '  ok ' : '  FAIL'} ${section} · ${name}${!ok && detail !== undefined ? '  → ' + JSON.stringify(detail) : ''}`);
  return !!ok;
}

function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png',
    '.jpg': 'image/jpeg', '.json': 'application/json', '.mp4': 'video/mp4', '.css': 'text/css' };
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const f = path.join(GAME_RUNS, u);
    if (!f.startsWith(GAME_RUNS) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r({ port: server.address().port, close: () => server.close() })));
}

async function launch() {
  let chromium;
  try { ({ chromium } = await import('playwright')); } catch {
    console.error('playwright missing: npm i -D playwright && npx playwright install chromium'); process.exit(2);
  }
  return chromium.launch({ headless: true });
}

// 无头 WebGL 偶发 "Unable to capture screenshot"：重试几次，仍失败只记一条，不打断整轮检查
async function capture(target, file) {
  for (let k = 0; k < 4; k++) {
    try { await target.screenshot({ path: file }); return true; } catch (e) { await sleep(250); }
  }
  check(`截图 ${path.basename(file)}`, false, 'screenshot failed 4×');
  return false;
}

function watch(page, allow = () => false) {
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !allow(m.text())) errors.push('console: ' + m.text()); });
  page.on('response', (r) => { if (r.status() >= 400 && !allow(r.url())) errors.push(`${r.status()} ${r.url()}`); });
  page.on('requestfailed', (r) => { if (!allow(r.url())) errors.push(`failed ${r.url()}`); });
  return errors;
}

// ───────────────────────── P：预览页 ─────────────────────────
async function partP(browser, base) {
  section = 'P';
  const page = await newPage(browser, { viewport: { width: 1000, height: 820 } });
  const errors = watch(page);
  await page.goto(`${base}/BladeTrinity/transform-preview.html`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__tfPreview && window.__tfPreview.ready(), null, { timeout: 20000 });
  await sleep(300);
  const S = () => page.evaluate(() => window.__tfPreview.state());

  for (const id of SCHOOLS) {
    const A = await page.evaluate((i) => BT.TRANSFORM_ATLAS[i], id);
    await page.evaluate((i) => window.__tfPreview.setSchool(i), id);
    const n = A.chargeFrames.length;
    // 进度 → 格号：两侧一致、单调、p=1 固定保持帧
    const seq = await page.evaluate(() => {
      const out = [];
      for (let k = 0; k <= 100; k++) {
        window.__tfPreview.setP(k / 100);
        const s = window.__tfPreview.state();
        out.push(s.fighters.map((f) => [f.tex, f.frame, f.flipX]));
      }
      return out;
    });
    const want = (p) => (p >= 1 ? A.holdFrame : A.chargeFrames[Math.min(n - 1, Math.floor(p * n))]);
    const bad = seq.map((fs2, k) => fs2.every(([tex, fr]) => tex === `tf_${id}` && +fr === want(k / 100)) ? null : [k, fs2]).filter(Boolean);
    check(`${id} 0–100% 每档格号 = clamp 映射（左右两人）`, bad.length === 0, bad.slice(0, 3));
    const frames = seq.map((x) => +x[1][1]);
    check(`${id} 格号随进度单调不减、终于保持帧`, frames.every((v, i) => i === 0 || v >= frames[i - 1]) && frames.at(-1) === A.holdFrame, frames);
    check(`${id} 左人朝右镜像 / 右人朝左原向`, seq.every((x) => x[0][2] === true && x[1][2] === false));
    check(`${id} 覆盖全部变装格`, new Set(frames).size === n + 1, new Set(frames).size);

    // 截图：0 / 50 / 100% × 四种背景
    for (const bg of ['dojo', 'outdoor', 'white', 'black']) {
      await page.evaluate((b) => window.__tfPreview.setBg(b), bg);
      for (const p of [0, 0.5, 1]) {
        await page.evaluate((v) => window.__tfPreview.setP(v), p);
        await sleep(60);
        await capture(page.locator('#stage canvas'), path.join(OUT, `preview_${id}_${bg}_${Math.round(p * 100)}.png`));
      }
    }
    await page.evaluate(() => window.__tfPreview.setBg('dojo'));

    // 按住：按 fullMs 推进，满蓄后停在保持帧、不自动播放
    await page.evaluate(() => window.__tfPreview.hold());
    await sleep(900);
    const h1 = await S(); await sleep(400); const h2 = await S();
    check(`${id} 按住满蓄 → 保持帧且静止不循环`, h1.p === 1 && h2.fighters.every((f) => f.tex === `tf_${id}` && +f.frame === A.holdFrame && !f.playing)
      && JSON.stringify(h1.fighters.map((f) => f.frame)) === JSON.stringify(h2.fighters.map((f) => f.frame)), [h1.fighters, h2.fighters]);
    // 释放：切回主图集挥砍，播完回 idle
    await page.evaluate(() => window.__tfPreview.release());
    await sleep(50);
    const r1 = await S();
    check(`${id} 释放 → 主图集原挥砍`, r1.fighters.every((f) => f.tex === id && f.anim === `${id}_attack` && !f.tf), r1.fighters);
    await page.waitForFunction((i) => window.__tfPreview.state().fighters.every((f) => f.anim === `${i}_idle`), id, { timeout: 5000 }).catch(() => {});
    const r2 = await S();
    check(`${id} 挥砍播完回 idle`, r2.fighters.every((f) => f.anim === `${id}_idle` && f.playing), r2.fighters);
    // 取消：半蓄取消 → 直接回 idle
    await page.evaluate(() => window.__tfPreview.setP(0.6));
    await page.evaluate(() => window.__tfPreview.cancel());
    const c1 = await S();
    check(`${id} 取消 → 回 idle、无变装态`, c1.fighters.every((f) => f.tex === id && f.anim === `${id}_idle` && !f.tf), c1.fighters);
  }

  // 反复 30 轮：显示对象 / 补间 / 监听器不累积
  await sleep(500);
  const base0 = await S();
  for (let k = 0; k < 30; k++) {
    await page.evaluate((kk) => {
      const P = window.__tfPreview; P.setSchool(['sword', 'water', 'north'][kk % 3]); P.setP(0.3 + (kk % 7) / 10);
      if (kk % 2) P.release(); else P.cancel();
    }, k);
    await sleep(30);
  }
  await sleep(2200);
  const after = await S();
  check('30 轮释放/取消后显示对象数回到基线', after.children === base0.children, [base0.children, after.children]);
  check('30 轮后无残留补间', after.tweens === 0, after.tweens);
  check('30 轮后 sprite 监听器不累积', JSON.stringify(after.listeners) === JSON.stringify(base0.listeners), [base0.listeners, after.listeners]);
  check('预览页无报错 / 无 404', errors.length === 0, errors);

  // 窄视口（手机竖屏宽度）
  await page.setViewportSize({ width: 420, height: 860 });
  await page.evaluate(() => { window.__tfPreview.setSchool('water'); window.__tfPreview.setP(1); });
  await sleep(150);
  await capture({ screenshot: (o) => page.screenshot({ ...o, fullPage: true }) }, path.join(OUT, 'preview_narrow_420.png'));
  await page.close();
}

// ───────────────────────── G：真实对局 ─────────────────────────
// 页面侧：起一场指定流派、关 AI（需要时）、p2 不倒、插桩记录剑气与变装进度
const SETUP = (opt) => {
  const s = window.__scene;
  window.__hudStart && window.__hudStart();
  s._startGauntlet(opt.id);
  const T = window.__T = { prog: [], qi: [], release: [], begins: 0, ends: [], starts: [] };
  const who = (f) => (f === s.p1 ? 'p1' : 'p2');
  const sp = BT.Transform.setProgress, en = BT.Transform.end, bg = BT.Transform.begin;
  BT.Transform.setProgress = function (scene, f, p) {
    sp.call(this, scene, f, p);
    if (f.tf) T.prog.push({ who: who(f), t: scene.time.now, from: f.chargeFrom, p, idx: f.tf.idx, tex: f.sprite.texture.key });
  };
  // 收蓄那一刻的现场（受击打断时 hurt 硬直很短，事后快照可能已回 idle）
  BT.Transform.end = function (scene, f, how) {
    if (f.tf) T.ends.push({ who: who(f), how, state: f.state, anim: f.sprite.anims.currentAnim && f.sprite.anims.currentAnim.key, tex: f.sprite.texture.key });
    return en.call(this, scene, f, how);
  };
  BT.Transform.begin = function (scene, f) { const r = bg.call(this, scene, f); T.begins++; T.lastBegin = r; return r; };
  const st = s._startCharge;
  s._startCharge = function (f, time) { T.starts.push({ who: who(f), mp: f.mp }); return st.call(this, f, time); };
  const rel = s._releaseCharge;
  s._releaseCharge = function (f, time) {
    T.release.push({ who: who(f), frac: Phaser.Math.Clamp((time - f.chargeFrom) / BT.CHARGE.fullMs, 0, 1), held: this._in.held('charge'), mp: f.mp });
    return rel.call(this, f, time);
  };
  const seg = s._fireSegQi;
  s._fireSegQi = function (f, marks, sg, frac, nSegs) {
    const n0 = (this.qiList || []).length;
    seg.call(this, f, marks, sg, frac, nSegs);
    const q = this.qiList[this.qiList.length - 1];
    if (this.qiList.length > n0) T.qi.push({ who: who(f), frac, nSegs, dmg: q.dmg, want: Math.max(1, Math.round(BT.QI.dmg[f.id] * frac / nSegs)) });
  };
  const fq = s._fireQi;
  s._fireQi = function (f, frac, dir) { T.qi.push({ who: who(f), frac, legacy: true }); return fq.call(this, f, frac, dir); };
  if (opt.aiOff) s._controlAI = function () {};
  window.__noKo = true;
  const ko = s._ko;
  s._ko = function (loser) { if (window.__noKo && loser === this.p2) { loser.hp = loser.maxHp; return; } return ko.call(this, loser); };

  // 键盘：页面里派发真实的 window keydown/keyup（与真人按键同一路径：Phaser 键盘 → 动作层 this._in）
  // 缺省是蓄力键 L；'S' = 防御键（防御中起蓄的用例要用）
  const KEY_CODES = { L: 76, S: 83 };
  window.__key = (type, k = 'L') => {
    const code = KEY_CODES[k];
    const e = new KeyboardEvent(type, { key: k.toLowerCase(), code: `Key${k}`, bubbles: true, cancelable: true });
    Object.defineProperty(e, 'keyCode', { get: () => code });
    Object.defineProperty(e, 'which', { get: () => code });
    window.dispatchEvent(e);
  };
  // 手动步进：停掉 rAF 主循环，用 game.step(t, 1/60s) 逐帧推进 —— 游戏时间完全确定，与机器快慢无关；
  // 截图时循环停着，画面天然定格。按键在帧之间派发，下一帧被读到（与真机一样）。
  // 步进用的是【真实时间】：s.time.now 已是战斗时钟（bullettime.js），慢放过之后两者不相等
  const g = s.game, M = window.__man = { t: s._fightClock ? s._fightClock.real : s.time.now, dt: 1000 / 60 };
  const manual = opt.manual !== false;       // 生命周期用例（换场/重开）走真实时钟
  if (manual) g.loop.sleep();
  window.__step = (n, dt) => { for (let i = 0; i < (n || 1); i++) { M.t += dt || M.dt; g.step(M.t, dt || M.dt); } };
  window.__until = (pred, max) => { for (let i = 0; i < (max || 600); i++) { if (pred()) return i; window.__step(1); } return pred() ? max : -1; };
  window.__F = (x) => x && ({
    id: x.id, state: x.state, charging: !!x.charging, tf: x.tf && { ...x.tf }, mp: x.mp,
    tex: x.sprite.texture.key, frame: x.sprite.frame.name, flipX: x.sprite.flipX, facingLeft: x.facingLeft,
    anim: x.sprite.anims.currentAnim && x.sprite.anims.currentAnim.key, playing: x.sprite.anims.isPlaying,
    x: x.sprite.x, y: x.sprite.y, bodyBottom: x.sprite.body.bottom, bodyH: x.sprite.body.height,
    aura: x.guardAura ? x.guardAura.map((im) => [im.texture.key, im.frame.name]) : null, ultText: !!x.ultText,
  });
  window.__el = (f) => s.time.now - f.chargeFrom;
  // 子弹时间：五处倍率快照。probe 只在非 select 阶段读（select 阶段调 __probe 会自动确认选人）
  window.__ts = () => {
    const w = s.physics.world, c = s._fightClock;
    return {
      scale: c.scale, tweens: s.tweens.timeScale, clock: s.time.timeScale,
      frame: w ? w._frameTime * w.fps : null,
      anims: [...new Set(s.children.list.filter((o) => o.anims).map((o) => o.anims.timeScale))],
      gts: s.anims.globalTimeScale, probe: s.phase === 'select' ? null : window.__probe().timeScale,
      game: c.game, real: c.real,
    };
  };
  // 子弹时间：步进 k 帧，量一个无重力匀速刚体的位移 + 一个循环动画的换帧次数 ——
  // 证明倍率真的落到了物理积分与 sprite 动画上（不只是属性值对）
  window.__measure = (k) => {
    const id = s.p2.id;
    const d = s.physics.add.image(BT.GAME_W / 2 - 120, 120, '__DEFAULT');
    d.body.setAllowGravity(false); d.setVelocityX(240);
    const sp = s.add.sprite(-400, -400, id).play(`${id}_idle`);
    const x0 = d.x, sc = [];
    let changes = 0, last = sp.anims.currentFrame.index;
    for (let i = 0; i < k; i++) {
      window.__step(1); sc.push(s._fightClock.scale);
      const ix = sp.anims.currentFrame.index;
      if (ix !== last) { changes++; last = ix; }
    }
    const out = { dx: d.x - x0, changes, scaleMin: Math.min(...sc), scaleMax: Math.max(...sc) };
    d.destroy(); sp.destroy();
    return out;
  };
  // 用例之间：松键、等玩家回到可行动、蓝回满（长按类用例临时放大过 maxMp，这里还原）
  window.__reset = () => {
    window.__key('keyup');
    window.__until(() => !s.p1.charging && (s.p1.state === 'idle' || s.p1.state === 'walk'), 600);
    s.p1.maxMp = BT.MP.max; s.p1.mp = s.p1.maxMp; s.p1.invuln = 0;
    window.__step(10);
  };
  if (manual) window.__step(20);
};
const SNAP = () => {
  const s = window.__scene;
  return { phase: s.phase, now: s.time.now, p1: window.__F(s.p1), p2: window.__F(s.p2), qiN: (s.qiList || []).length,
    usage: s._usage && { ...s._usage }, T: window.__T && JSON.parse(JSON.stringify(window.__T)), children: s.children.length };
};

// CDN 上的 Phaser 改走本地 vendor 副本：无头 Chromium 拉 jsDelivr 偶发很慢，页面 load 后迟迟进不了场景
async function newPage(browser, opt = {}) {
  const page = await browser.newPage({ viewport: opt.viewport || { width: 1100, height: 700 } });
  await page.route(/cdn\.jsdelivr\.net\/npm\/phaser@3\.60\.0\/dist\/phaser\.min\.js/,
    (r) => r.fulfill({ path: path.join(GAME_RUNS, '_engine', 'vendor', 'phaser-3.60.0.min.js'), contentType: 'text/javascript' }));
  return page;
}

async function gamePage(browser, base, opt = {}) {
  const page = await newPage(browser, opt);
  if (opt.blockTransform) await page.route(/assets\/sprites\/transform\/.*\.webp/, (r) => r.fulfill({ status: 404, body: '' }));
  const errors = watch(page, (t) => !!opt.blockTransform && /transform\/|404|Failed to load resource/.test(t));
  // query：G 段传 '?bt=0'（关子弹时间），T 段默认不带（开启）。
  // 跑到后段时本机偶发页面 load 超过 30s（整轮约 30 分钟、开过十几页之后），放宽并重试一次，
  // 免得一次加载慢把整轮报告丢掉
  const url = `${base}/BladeTrinity/index.html${opt.query || ''}`;
  try { await page.goto(url, { waitUntil: 'load', timeout: 60000 }); }
  catch (e) { console.log(`  (goto 超时，重试一次：${url})`); await page.goto(url, { waitUntil: 'load', timeout: 90000 }); }
  await page.waitForFunction(() => window.__scene && window.__scene._in && window.__scene.phase === 'select', null, { timeout: 30000, polling: 250 });
  return { page, errors };
}
const elapsed = (page, who, ms) => page.waitForFunction(([w, m]) => {
  const s = window.__scene, f = s[w];
  return f && f.charging && s.time.now - f.chargeFrom >= m;
}, [who, ms], { timeout: 15000 });
const waitFor = (page, fn, arg, timeout = 8000) => page.waitForFunction(fn, arg, { timeout }).then(() => true, () => false);
const shot = (page, name) => capture(page.locator('canvas').first(), path.join(OUT, name));

async function playerSuite(browser, base, id) {
  section = `G·${id}`;
  const { page, errors } = await gamePage(browser, base, { query: BT_OFF });
  await page.evaluate(SETUP, { id, aiOff: true });
  const A = await page.evaluate((i) => BT.TRANSFORM_ATLAS[i], id);
  const C = await page.evaluate(() => ({ fullMs: BT.CHARGE.fullMs, minFrac: BT.CHARGE.minFrac }));
  const nQi = Math.max(1, await page.evaluate((i) => (BT.QI_SEGS && BT.QI_SEGS[i] || []).length, id));
  const n = A.chargeFrames.length;
  const want = (p) => (p >= 1 ? A.holdFrame : A.chargeFrames[Math.min(n - 1, Math.floor(Math.min(1, Math.max(0, p)) * n))]);
  const qiOk = (qs) => qs.every((q) => q.legacy || q.dmg === q.want);
  const ev = (fn, arg) => page.evaluate(fn, arg);

  // ① 短按：按下 → 1 帧后松开（已蓄 1 帧 ≈ 17ms ≪ minFrac×fullMs）→ 只起浪，不出剑气，回 idle
  const tap = await ev(() => {
    const s = window.__scene, T = window.__T, q0 = T.qi.length, u0 = s._usage.charge;
    window.__key('keydown'); window.__step(1);
    const at = { charging: s.p1.charging, tex: s.p1.sprite.texture.key, idx: s.p1.tf && s.p1.tf.idx };
    window.__key('keyup'); window.__step(1);
    const rel = T.release.at(-1), end = T.ends.at(-1), mpStart = T.starts.at(-1).mp, mpAfter = s.p1.mp;
    window.__step(30);
    return { at, rel, end, qiNew: T.qi.length - q0, usage: s._usage.charge - u0, mpStart, mpAfter, p1: window.__F(s.p1) };
  });
  check('短按：起蓄当帧即切到变装第 0 格', tap.at.charging && tap.at.tex === `tf_${id}` && tap.at.idx === A.chargeFrames[0], tap.at);
  check('短按：frac < minFrac、不出剑气、回 idle 主图集', tap.rel && tap.rel.frac < C.minFrac && tap.qiNew === 0
    && tap.p1.tex === id && tap.p1.tf === null && tap.p1.state === 'idle', tap);
  check('短按：按"取消"收（淡回落）', tap.end && tap.end.how === 'cancel', tap.end);
  check('短按：蓝照扣、招式计数不变', tap.mpAfter < tap.mpStart && tap.usage === 0, [tap.mpStart, tap.mpAfter, tap.usage]);
  await ev(() => window.__reset());

  // ② 半蓄 → 释放：逐帧格号 = 映射、蓄力中无描边；释放剑气按原公式
  const half = await ev((fullMs) => {
    const s = window.__scene, T = window.__T, q0 = T.qi.length, p0 = T.prog.length, u0 = s._usage.charge;
    window.__key('keydown');
    window.__until(() => s.p1.charging && window.__el(s.p1) >= fullMs * 0.5, 120);
    return { q0, p0, u0, el: window.__el(s.p1), p1: window.__F(s.p1) };
  }, C.fullMs);
  await shot(page, `game_${id}_half.png`);          // 循环停着：画面就是这一帧
  const halfDone = await ev(([q0, p0, u0]) => {
    const s = window.__scene, T = window.__T;
    window.__key('keyup'); window.__step(1);
    const end = T.ends.at(-1), rel = T.release.at(-1);
    window.__step(90);
    return { end, rel, qi: T.qi.slice(q0).filter((q) => q.who === 'p1'), prog: T.prog.slice(p0).filter((r) => r.who === 'p1'), usage: s._usage.charge - u0, p1: window.__F(s.p1) };
  }, [half.q0, half.p0, half.u0]);
  check('逐帧格号 = clamp((t-chargeFrom)/fullMs) 映射', halfDone.prog.length > 10
    && halfDone.prog.every((r) => r.idx === want((r.t - r.from) / C.fullMs) && Math.abs(r.p - (r.t - r.from) / C.fullMs) < 1e-9),
    halfDone.prog.filter((r) => r.idx !== want((r.t - r.from) / C.fullMs)).slice(0, 3));
  check('逐帧格号单调不减', halfDone.prog.every((r, i, a) => i === 0 || r.idx >= a[i - 1].idx));
  check('半蓄：显示变装中段（非首格、非保持帧）', half.p1.tex === `tf_${id}` && +half.p1.frame === want(half.el / C.fullMs)
    && +half.p1.frame > 0 && +half.p1.frame < A.holdFrame, { el: half.el, frame: half.p1.frame });
  check('半蓄：蓄力中无描边', half.p1.aura === null, half.p1.aura);
  check(`半蓄释放：minFrac ≤ frac < 1、剑气 ${nQi} 道、伤害按原公式`, halfDone.rel.frac >= C.minFrac && halfDone.rel.frac < 1
    && halfDone.qi.length === nQi && qiOk(halfDone.qi) && halfDone.qi.every((q) => q.legacy || Math.abs(q.frac - halfDone.rel.frac) < 1e-9), halfDone);
  check('半蓄释放：按"释放"收、切回主图集、招式计数 +1', halfDone.end.how === 'release' && halfDone.p1.tex === id && halfDone.p1.tf === null && halfDone.usage === 1,
    { end: halfDone.end, p1: halfDone.p1, usage: halfDone.usage });
  await ev(() => window.__reset());

  // ②b 防御中起蓄（_canAct 白名单含 guard）：按住 S 出防御描边 → 按 L 起蓄，防御描边当帧收掉、蓄力中一直没有；
  //    松开 L（S 仍按住）→ 放出剑气、收招后回 guard，防御描边照常重建在主图集当前帧上
  const g2c = await ev((fullMs) => {
    const s = window.__scene, T = window.__T, e0 = T.ends.length;
    window.__key('keydown', 'S');
    window.__until(() => s.p1.state === 'guard' && !!s.p1.guardAura, 30);
    const guard = window.__F(s.p1);
    window.__key('keydown'); window.__step(1);
    const start = window.__F(s.p1);
    window.__until(() => s.p1.charging && window.__el(s.p1) >= fullMs * 0.5, 120);
    const mid = window.__F(s.p1);
    window.__key('keyup');
    window.__until(() => !s.p1.charging && s.p1.state === 'guard' && !!s.p1.guardAura, 180);
    const after = window.__F(s.p1), end = T.ends[e0];
    window.__key('keyup', 'S'); window.__step(2);
    return { guard, start, mid, end, after, back: window.__F(s.p1) };
  }, C.fullMs);
  check('防御中起蓄：起蓄前防御描边在（主图集）', g2c.guard.state === 'guard' && g2c.guard.aura && g2c.guard.aura.every(([k]) => k === id), g2c.guard);
  check('防御中起蓄：起蓄当帧与半蓄时都无描边', g2c.start.charging && g2c.start.aura === null && g2c.mid.charging && g2c.mid.aura === null,
    { start: g2c.start, mid: g2c.mid });
  check('防御中起蓄：松开 L（S 仍按住）后按"释放"收、防御描边重建并贴主图集当前帧', g2c.end && g2c.end.how === 'release'
    && g2c.after.state === 'guard' && g2c.after.aura && g2c.after.aura.every(([k, fr]) => k === id && fr === g2c.after.frame),
    { end: g2c.end, after: g2c.after });
  check('防御中起蓄：松开 S 后防御描边收掉', g2c.back.state !== 'guard' && g2c.back.aura === null, g2c.back);
  await ev(() => window.__reset());

  // ③ 满蓄继续按住（蓝上限临时放大，避开"蓝耗尽自动放出"——那条单独测）→ 保持帧静止、不转身、不自动出招
  const full = await ev((fullMs) => {
    const s = window.__scene, T = window.__T, q0 = T.qi.length, y0 = s.p1.sprite.y, bb0 = s.p1.sprite.body.bottom, bh0 = s.p1.sprite.body.height;
    s.p1.maxMp = 1e5; s.p1.mp = 1e5;
    window.__key('keydown');
    window.__until(() => s.p1.charging && window.__el(s.p1) >= fullMs + 300, 200);
    const f1 = window.__F(s.p1);
    window.__step(60);                       // 再按住 1 秒
    const f2 = window.__F(s.p1);
    return { q0, y0, bb0, bh0, f1, f2, qiDuring: T.qi.length - q0 };
  }, C.fullMs);
  await shot(page, `game_${id}_full.png`);
  const fullDone = await ev((q0) => {
    const s = window.__scene, T = window.__T;
    window.__key('keyup'); window.__step(90);
    return { rel: T.release.at(-1), qi: T.qi.slice(q0), end: T.ends.at(-1) };
  }, full.q0);
  check('满蓄按住：停在保持帧且静止（1 秒内不动、不播动画）', [full.f1, full.f2].every((f) => f.tex === `tf_${id}` && +f.frame === A.holdFrame && !f.playing && f.state === 'charge'),
    [full.f1, full.f2]);
  check('满蓄按住：不转身、不自动出招', full.f1.flipX === full.f2.flipX && full.qiDuring === 0 && full.f2.charging, { f1: full.f1.flipX, f2: full.f2.flipX, qi: full.qiDuring });
  check('蓄力中碰撞体 / 脚底不动', full.f2.bodyBottom === full.bb0 && full.f2.bodyH === full.bh0 && Math.abs(full.f2.y - full.y0) < 0.01, full);
  check('满蓄释放：frac=1、剑气数量与伤害按原公式', fullDone.rel.frac === 1 && fullDone.qi.length === nQi && qiOk(fullDone.qi) && fullDone.end.how === 'release', fullDone);
  await ev(() => window.__reset());

  // ④ 蓝耗尽：按住不放，蓝扣到 0 自动按当前档放出（原规则）
  const dry = await ev(() => {
    const s = window.__scene, T = window.__T, q0 = T.qi.length, r0 = T.release.length;
    s.p1.mp = 60;
    window.__key('keydown'); window.__step(1);
    const mp0 = T.starts.at(-1).mp;
    window.__until(() => T.release.length > r0, 200);
    const rel = T.release[r0];
    window.__step(90);
    window.__key('keyup'); window.__step(2);
    return { mp0, rel, qi: T.qi.slice(q0), p1: window.__F(s.p1) };
  });
  check('蓝耗尽：键仍按住时自动放出（蓝=0、minFrac ≤ frac < 1）', dry.rel && dry.rel.held === true && dry.rel.mp === 0 && dry.rel.frac >= C.minFrac && dry.rel.frac < 1, dry);
  check('蓝耗尽：剑气按原公式、变装已收', dry.qi.length === nQi && qiOk(dry.qi) && dry.p1.tf === null && dry.p1.tex === id, dry);
  await ev(() => window.__reset());

  // ⑤ 受击打断：作废、不出剑气、收蓄当刻已是受击姿势（主图集），描边与招式名收掉
  const hit = await ev((fullMs) => {
    const s = window.__scene, T = window.__T, q0 = T.qi.length, e0 = T.ends.length;
    window.__key('keydown');
    window.__until(() => s.p1.charging && window.__el(s.p1) >= fullMs * 0.4, 120);
    s.p1.invuln = 0; s._hit(s.p2, s.p1, 3, s.p1.facingLeft ? 1 : -1);
    window.__step(2);
    const after = window.__F(s.p1), end = T.ends[e0];
    window.__key('keyup'); window.__step(40);
    return { end, after, qiNew: T.qi.length - q0 };
  }, C.fullMs);
  check('受击：按 interrupt 收、收蓄当刻是主图集受击姿势', hit.end && hit.end.how === 'interrupt' && hit.end.state === 'hurt' && /_hurt$/.test(hit.end.anim || '') && hit.end.tex === id, hit.end);
  check('受击：不出剑气、描边/招式名已清', hit.qiNew === 0 && hit.after.aura === null && !hit.after.ultText && hit.after.tf === null, hit);
  await ev(() => window.__reset());

  // ⑥ 失焦：窗口 blur → 'lost' → 取消，不出剑气
  const blur = await ev((fullMs) => {
    const s = window.__scene, T = window.__T, q0 = T.qi.length, r0 = T.release.length;
    window.__key('keydown');
    window.__until(() => s.p1.charging && window.__el(s.p1) >= fullMs * 0.6, 120);
    window.dispatchEvent(new Event('blur'));
    window.__step(3);
    const out = { end: T.ends.at(-1), relNew: T.release.length - r0, qiNew: T.qi.length - q0, p1: window.__F(s.p1) };
    window.__key('keyup'); window.dispatchEvent(new Event('focus')); window.__step(5);
    return out;
  }, C.fullMs);
  check('失焦：按 cancel 收、不出剑气、回 idle 主图集', blur.end.how === 'cancel' && blur.relNew === 0 && blur.qiNew === 0 && blur.p1.tf === null && blur.p1.tex === id && blur.p1.state === 'idle', blur);
  await ev(() => window.__reset());

  // ⑦ 暂停恢复：满蓄保持中来一个 600ms 的长帧（主循环被挂起再恢复时游戏看到的就是这个）—— 不跳格、不丢状态
  const pause = await ev((fullMs) => {
    const s = window.__scene;
    s.p1.maxMp = 1e5; s.p1.mp = 1e5;
    window.__key('keydown');
    window.__until(() => s.p1.charging && window.__el(s.p1) >= fullMs + 50, 200);
    const before = window.__F(s.p1);
    window.__step(1, 600);
    window.__step(2);
    const after = window.__F(s.p1);
    window.__key('keyup'); window.__step(90);
    return { before, after };
  }, C.fullMs);
  check('暂停恢复：仍在蓄力、仍是保持帧', pause.after.charging && pause.after.tex === `tf_${id}` && +pause.after.frame === A.holdFrame, pause);
  await ev(() => window.__reset());

  // ⑧ 换边：玩家站右侧朝左（素材原向）—— 朝向与显示
  const flip = await ev((fullMs) => {
    const s = window.__scene;
    s.p1.sprite.setPosition(700, s.p1.sprite.y); s.p2.sprite.setPosition(260, s.p2.sprite.y);
    window.__step(10);
    s.p1.maxMp = 1e5; s.p1.mp = 1e5;
    window.__key('keydown');
    window.__until(() => s.p1.charging && window.__el(s.p1) >= fullMs * 0.55, 120);
    return window.__F(s.p1);
  }, C.fullMs);
  await shot(page, `game_${id}_half_faceLeft.png`);
  await ev(() => { window.__key('keyup'); window.__step(90); });
  check('换边：朝左时不翻转（flipX=false）且显示变装', flip.facingLeft === true && flip.flipX === false && flip.tex === `tf_${id}`, flip);
  await ev(() => window.__reset());

  check('本流派全程无报错', errors.length === 0, errors);
  await page.close();
}

async function aiSuite(browser, base) {
  // ⑨ AI 蓄力（真路径 _startAICharge → loop.js _controlAI 的 charging 分支 → _tickCharge 到 aiRelease 自动松手）
  for (const id of SCHOOLS) {
    section = `G·AI·${id}`;
    const { page, errors } = await gamePage(browser, base, { query: BT_OFF });
    const p1 = SCHOOLS.find((x) => x !== id);      // 玩家取另一派，让对手（p2）是 id
    await page.evaluate(SETUP, { id: p1, aiOff: true });
    const A = await page.evaluate((i) => BT.TRANSFORM_ATLAS[i], id);
    const fullMs = await page.evaluate(() => BT.CHARGE.fullMs);
    const r = await page.evaluate(([w, fullMs]) => {
      const s = window.__scene, T = window.__T;
      if (s.p2.id !== w) { s._clearOutlineHold(s.p2); s.p2.sprite.destroy(); s.p2 = s._makeFighter(w, BT.GAME_W - 268, true); s.fighters = [s.p1, s.p2]; s._buildBars(); }
      window.__step(10);
      delete s._controlAI;                              // 恢复原 AI 调度（原型上的方法）
      s._startAICharge(s.p2, s.time.now);
      s.p2.aiRelease = s.time.now + 900;
      s.p2.ultReady = Infinity;                         // 只看这一发：别让 AI 事后自己再起一次蓄
      window.__until(() => s.p2.charging && window.__el(s.p2) >= fullMs + 100, 200);
      return { mid: window.__F(s.p2) };
    }, [id, fullMs]);
    await shot(page, `game_ai_${id}_full.png`);
    const done = await page.evaluate(() => {
      const s = window.__scene, T = window.__T;
      window.__until(() => T.release.some((x) => x.who === 'p2'), 200);
      window.__step(90);
      return { rel: T.release.find((x) => x.who === 'p2'), qi: T.qi.filter((q) => q.who === 'p2'), end: T.ends.find((e) => e.who === 'p2'),
        prog: T.prog.filter((x) => x.who === 'p2'), p2: window.__F(s.p2) };
    });
    const n = A.chargeFrames.length;
    const want = (p) => (p >= 1 ? A.holdFrame : A.chargeFrames[Math.min(n - 1, Math.floor(Math.max(0, p) * n))]);
    check('AI 起蓄 → 变装帧按蓄力比例推进', done.prog.length > 10 && done.prog.every((x) => x.tex === `tf_${id}` && x.idx === want((x.t - x.from) / fullMs)), done.prog.slice(0, 3));
    check('AI 满蓄后停在保持帧', r.mid.tex === `tf_${id}` && +r.mid.frame === A.holdFrame && !r.mid.playing, r.mid);
    check('AI 到点自动松手、剑气按原公式、变装按 release 收', done.rel && done.rel.frac === 1 && done.qi.length >= 1 && done.qi.every((q) => q.legacy || q.dmg === q.want)
      && done.end && done.end.how === 'release' && done.p2.tf === null && done.p2.tex === id, done);
    check('AI 本局无报错', errors.length === 0, errors);
    await page.close();
  }
}

async function bothSuite(browser, base) {
  // ⑩ 双方同时蓄力：后起蓄的一方起浪把先蓄的一方打进硬直（原规则）—— 各自收干净、不串纹理
  section = 'G·双方';
  const { page, errors } = await gamePage(browser, base, { query: BT_OFF });
  await page.evaluate(SETUP, { id: 'water', aiOff: true });
  // AI 决策关掉，只保留 loop.js 里"蓄力中就 tick 蓄力"那一支，p2 的蓄力才会推进/收尾
  const a = await page.evaluate(() => {
    const s = window.__scene;
    s._controlAI = function (time) { if (this.p2.charging) this._tickCharge(this.p2, time); };
    s._startAICharge(s.p2, s.time.now); s.p2.aiRelease = s.time.now + 4000;
    window.__step(9);
    return { p1: window.__F(s.p1), p2: window.__F(s.p2) };
  });
  const b = await page.evaluate(() => {
    const s = window.__scene;
    window.__until(() => ['idle', 'walk'].includes(s.p1.state), 120);      // 对手起浪的 520ms 硬直过去
    window.__key('keydown');
    window.__until(() => s.p1.charging, 30);
    window.__step(12);
    return { p1: window.__F(s.p1), p2: window.__F(s.p2), ends: window.__T.ends.slice() };
  });
  await shot(page, 'game_both_p1charging.png');
  const c = await page.evaluate(() => {
    const s = window.__scene;
    window.__key('keyup'); window.__step(120);
    return { p1: window.__F(s.p1), p2: window.__F(s.p2) };
  });
  check('对手先蓄：p2 显示自己流派的变装、玩家仍是主图集', a.p2.tex === `tf_${a.p2.id}` && a.p1.tex === a.p1.id, [a.p1.tex, a.p2.tex]);
  check('玩家后蓄：起浪打断对手（原规则）→ p2 按 interrupt 收、回主图集', b.p1.tex === `tf_${b.p1.id}` && b.p2.tf === null && b.p2.tex === b.p2.id
    && b.ends.some((e) => e.who === 'p2' && e.how === 'interrupt'), b);
  check('结束后双方都回主图集、无残留变装态', c.p1.tf === null && c.p2.tf === null && c.p1.tex === c.p1.id && c.p2.tex === c.p2.id && !c.p2.charging, c);
  // 同一帧里双方都进 _startCharge：各显各的；后起者的起浪按原规则把先起者打进硬直
  const same = await page.evaluate(() => {
    const s = window.__scene;
    window.__until(() => ['idle', 'walk'].includes(s.p1.state) && ['idle', 'walk'].includes(s.p2.state), 200);
    s.p1.mp = s.p1.maxMp; s.p2.mp = s.p2.maxMp;
    const t = s.time.now;
    s._startCharge(s.p1, t); s._startAICharge(s.p2, t); s.p2.aiRelease = t + 600;
    const now = { p1: s.p1.sprite.texture.key, p2: s.p2.sprite.texture.key, p1s: s.p1.state, p2s: s.p2.state };
    window.__step(150);
    return { now, after: { p1: window.__F(s.p1), p2: window.__F(s.p2) } };
  });
  check('同帧双方起蓄：各显本派变装或按原规则被打进硬直', same.now.p2 === `tf_${a.p2.id}` && (same.now.p1 === `tf_${a.p1.id}` || same.now.p1s === 'hurt'), same.now);
  check('同帧双方起蓄：收尾后无残留', same.after.p1.tf === null && same.after.p2.tf === null && same.after.p1.tex === same.after.p1.id && same.after.p2.tex === same.after.p2.id, same.after);
  check('双方同蓄无报错', errors.length === 0, errors);
  await page.close();
}

async function lifecycleSuite(browser, base) {
  // ⑪ 换场定格：玩家蓄力中对手倒地 → interlude：变装/描边/招式名收掉，下一场正常
  section = 'G·换场';
  {
    const { page, errors } = await gamePage(browser, base, { query: BT_OFF });
    await page.evaluate(SETUP, { id: 'north', aiOff: true, manual: false });
    await sleep(400);
    await page.keyboard.down('l');
    await elapsed(page, 'p1', 200);
    await page.evaluate(() => { window.__noKo = false; const s = window.__scene; s.p2.invuln = 0; s.p2.hp = 1; s._hit(s.p1, s.p2, 50, 1); });
    await sleep(300);
    const iv = await page.evaluate(SNAP);
    await page.keyboard.up('l');
    check('对手倒地进 interlude：玩家变装收掉、回 idle、无描边/招式名', iv.phase === 'interlude' && iv.p1.tf === null && iv.p1.tex === iv.p1.id && !iv.p1.ultText && iv.p1.aura === null,
      { phase: iv.phase, p1: iv.p1 });
    await waitFor(page, () => window.__scene.phase === 'fight' && window.__scene.round === 1, null, 8000);
    await sleep(300);
    const nr = await page.evaluate(SNAP);
    check('下一场：双方主图集、无变装态', nr.phase === 'fight' && nr.p1.tf === null && nr.p2.tf === null && nr.p1.tex === nr.p1.id && nr.p2.tex === nr.p2.id, [nr.p1, nr.p2]);
    // 新对手也能变装
    await page.keyboard.down('l'); await elapsed(page, 'p1', 500);
    const again = await page.evaluate(SNAP);
    await page.keyboard.up('l'); await sleep(1300);
    check('换场后再蓄力仍正常', again.p1.tex === `tf_${again.p1.id}`, again.p1);
    // ⑫ 重开：蓄力中整场重开（scene.restart）
    await page.keyboard.down('l'); await elapsed(page, 'p1', 150);
    await page.evaluate(() => window.__scene._restartGame());
    await page.keyboard.up('l');
    await waitFor(page, () => window.__scene && window.__scene.phase === 'select' && window.__scene._in, null, 8000);
    await sleep(300);
    await page.evaluate(() => { const s = window.__scene; s._hudStarted = true; s._startGauntlet('sword'); });
    await sleep(300);
    await page.keyboard.down('l'); await sleep(50);
    await waitFor(page, () => window.__scene.p1.charging && window.__scene.time.now - window.__scene.p1.chargeFrom > 200, null, 5000);
    const rs = await page.evaluate(() => { const s = window.__scene; return { tex: s.p1.sprite.texture.key, tf: s.p1.tf && { ...s.p1.tf }, kids: s.children.length }; });
    await page.keyboard.up('l'); await sleep(1200);
    check('重开后蓄力正常（新场景、新纹理引用）', rs.tex === 'tf_sword' && rs.tf, rs);
    check('换场/重开无报错', errors.length === 0, errors);
    await page.close();
  }

  // ⑬ 缺图回退：拦掉 transform/*.webp → 退回 guard 占位，蓄力与剑气照常
  section = 'G·缺图';
  {
    const { page, errors } = await gamePage(browser, base, { blockTransform: true, query: BT_OFF });
    await page.evaluate(SETUP, { id: 'water', aiOff: true, manual: false });
    await sleep(400);
    await page.keyboard.down('l');
    await elapsed(page, 'p1', 300);
    const m = await page.evaluate(SNAP);
    await page.keyboard.up('l');
    await sleep(1400);
    const md = await page.evaluate(SNAP);
    check('缺图：begin 返回 false、退回 guard 占位', m.T.lastBegin === false && m.p1.tex === 'water' && m.p1.anim === 'water_guard' && m.p1.tf === null, m.p1);
    check('缺图：蓄力释放照常出剑气', md.T.qi.length >= 1 && md.T.qi.every((q) => q.legacy || q.dmg === q.want), md.T.qi);
    check('缺图：除被拦资源外无报错', errors.length === 0, errors);
    await page.close();
  }

  // ⑭ 窄视口对局截图
  section = 'G·窄屏';
  {
    const { page, errors } = await gamePage(browser, base, { viewport: { width: 420, height: 800 }, query: BT_OFF });
    await page.evaluate(SETUP, { id: 'water', aiOff: true, manual: false });
    await sleep(400);
    await page.keyboard.down('l');
    await elapsed(page, 'p1', 200);
    await page.evaluate(() => { const s = window.__scene; BT.CHARGE.fullMs = 1e9; s.p1.chargeFrom = s.time.now - 1e9; s.p1.maxMp = 1e7; s.p1.mp = 1e7; });
    await sleep(150);
    await capture(page, path.join(OUT, 'game_narrow_420_water_full.png'));
    await page.keyboard.up('l');
    await sleep(300);
    check('窄视口无报错', errors.length === 0, errors);
    await page.close();
  }
}

// ───────────────────────── T：子弹时间 ─────────────────────────
// 默认开启（不带 ?bt）。全部手动步进 1/60s：真实时长 = 步数 × dt，与机器负载无关。
// ⚠️ 补间走 Date.now()（Phaser TweenManager 自己的墙钟），手动步进下它照墙钟走 —— 只断言它的倍率，
//    要等补间收尾时得真的 sleep。
const near = (a, b, eps = 1e-9) => typeof a === 'number' && Math.abs(a - b) <= eps;
// 五处倍率全等于 x；anims.globalTimeScale 必须始终是 1（3.60 的死字段，本实现不碰它，见 bullettime.js）
const allAt = (t, x) => !!t && near(t.scale, x) && near(t.tweens, x) && near(t.clock, x) && near(t.frame, x)
  && t.anims.length > 0 && t.anims.every((v) => near(v, x)) && t.gts === 1 && (t.probe == null || near(t.probe, x));
const btConsts = (page) => page.evaluate(() => ({
  fullMs: BT.CHARGE.fullMs, minFrac: BT.CHARGE.minFrac, waveStun: BT.CHARGE.waveStun, drainRate: BT.MP.drainRate,
  qiSpeed: BT.QI.speed, regen: BT.MP.regen, scale: BT.BULLET_TIME.scale, rampInMs: BT.BULLET_TIME.rampInMs, dt: window.__man.dt,
  freezeMs: BT.ARTE.sword.freezeMs,
}));

async function btSchoolSuite(browser, base, id) {
  section = `T·${id}`;
  const { page, errors } = await gamePage(browser, base);
  await page.evaluate(SETUP, { id, aiOff: true });
  const C = await btConsts(page);
  const A = await page.evaluate((i) => BT.TRANSFORM_ATLAS[i], id);
  const nQi = Math.max(1, await page.evaluate((i) => (BT.QI_SEGS && BT.QI_SEGS[i] || []).length, id));
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const slowFrame = C.dt * C.scale;           // 慢放中一帧的游戏时间

  // T1–T4（上）：满蓄 —— 按住到蓄力比例 ≥1 的那一帧，当帧松手
  const a = await ev((C) => {
    const s = window.__scene, T = window.__T, q0 = T.qi.length;
    s.p1.maxMp = 2e5; s.p1.mp = 1e5;          // 上限放大：回蓝不被封顶，扣蓝才好按游戏时间核算
    window.__key('keydown');
    let n = 0; const scales = [];
    do { window.__step(1); n++; scales.push(s._fightClock.scale); }
    while (!(s.p1.charging && window.__el(s.p1) >= C.fullMs) && n < 400);
    const el = window.__el(s.p1), ts = window.__ts();
    const hold = { tex: s.p1.sprite.texture.key, frame: s.p1.sprite.frame.name };
    const mp0 = T.starts.at(-1).mp;
    window.__key('keyup'); window.__step(1);
    const tsRel = window.__ts(), rel = T.release.at(-1), st = s.p1.state, mpRel = s.p1.mp, elRel = window.__el(s.p1);
    // 第一道剑气出生后量它每真实秒的位移（应 = BT.QI.speed，与 ?bt=0 一致）
    let qv = null;
    for (let k = 0; k < 120 && qv === null; k++) {
      const q = (s.qiList || []).find((x) => x.owner === s.p1);
      if (q) { const x0 = q.x; window.__step(6); qv = (q.x - x0) * q.dir / (6 * window.__man.dt / 1000); } else window.__step(1);
    }
    window.__step(90);
    return { n, el, scales, ts, hold, mp0, mpRel, elRel, tsRel, rel, st, qv, qi: T.qi.slice(q0).filter((q) => q.who === 'p1') };
  }, C);
  await ev(() => window.__reset());
  const realMs = a.n * C.dt;
  check(`T1 满蓄真实时长 1.10–1.25s（${Math.round(realMs)}ms / ${a.n} 帧）`, realMs >= 1100 && realMs <= 1250, { n: a.n, realMs });
  check('T1 同期游戏时间 = fullMs（+≤1 慢放帧）', a.el >= C.fullMs && a.el <= C.fullMs + slowFrame + 1e-6, a.el);
  check('T1 渐入：首帧 <1、单调降到 scale 后保持', a.scales[0] < 1 && a.scales[0] > C.scale
    && a.scales.every((v, i, arr) => i === 0 || v <= arr[i - 1] + 1e-12) && near(a.scales.at(-1), C.scale), a.scales.slice(0, 8));
  check('T1 满蓄停在保持帧', a.hold.tex === `tf_${id}` && +a.hold.frame === A.holdFrame, a.hold);
  check(`T2 蓄力中五处倍率 = ${C.scale}（时钟/补间/Clock 事件/物理步长/全部 sprite 动画），探针同报，globalTimeScale 未动`, allAt(a.ts, C.scale), a.ts);
  check('T3 松手当帧：五处全回 1、_frameTime = 1/fps、探针 timeScale = 1', allAt(a.tsRel, 1) && a.tsRel.probe === 1, a.tsRel);
  check(`T3 松手出剑：frac=1、剑气 ${nQi} 道、伤害按原公式`, a.st === 'attack' && a.rel.frac === 1 && a.qi.length === nQi
    && a.qi.every((q) => q.legacy || q.dmg === q.want), { st: a.st, rel: a.rel, qi: a.qi });
  check(`T3 剑气每真实秒位移 = BT.QI.speed（${C.qiSpeed}px/s，与 ?bt=0 相同）`, a.qv !== null && Math.abs(a.qv - C.qiSpeed) / C.qiSpeed < 0.01, a.qv);
  // 蓄力期间回蓝照常（同一游戏时钟），净变化里把它加回来才是蓄力本身扣的蓝
  const net = a.mp0 - a.mpRel, regenBack = C.regen * a.elRel / 1000, drain = net + regenBack, frameMp = C.drainRate * C.dt;
  check(`T4 满蓄扣蓝 = 100（±1 帧量 ${frameMp.toFixed(2)}；已扣除同期回蓝）`, Math.abs(drain - C.fullMs * C.drainRate) <= frameMp,
    { drain, net, regenBack, elRel: a.elRel });

  // T4（下）：对手 waveStun 按游戏时间；慢放 / 原速下物理与动画的实测速度比
  const b = await ev((C) => {
    const s = window.__scene, MEASURE = window.__measure;
    s.p1.sprite.setPosition(268, s.p1.sprite.y); s.p2.sprite.setPosition(BT.GAME_W - 268, s.p2.sprite.y);
    window.__step(10);
    s.p1.maxMp = 1e5; s.p1.mp = 1e5;
    window.__key('keydown'); window.__step(1);
    const from = s.p1.chargeFrom, inv = s.p2.invuln - from, stun = s.p2.stateUntil - from, p2st = s.p2.state;
    let hurtEnd = null, n = 0;
    while (n++ < 400 && (hurtEnd === null || window.__el(s.p1) < C.fullMs)) {
      window.__step(1);
      if (hurtEnd === null && s.p2.state !== 'hurt') hurtEnd = window.__el(s.p1);
    }
    const slow = MEASURE(120);
    const stillCharging = s.p1.charging;
    window.__key('keyup'); window.__step(1);
    const normal = MEASURE(120);
    window.__step(60);
    return { inv, stun, p2st, hurtEnd, slow, normal, stillCharging };
  }, C);
  await ev(() => window.__reset());
  check(`T4 起浪 waveStun：对手硬直/无敌 = ${C.waveStun}ms 游戏时间`, b.p2st === 'hurt' && b.inv === C.waveStun && b.stun === C.waveStun, b);
  check(`T4 对手按游戏时间 ${C.waveStun}ms（+≤1 慢放帧）后起身`, b.hurtEnd !== null && b.hurtEnd > C.waveStun && b.hurtEnd <= C.waveStun + slowFrame + 1e-6, b.hurtEnd);
  check('T2 物理真的变慢：匀速刚体每真实秒位移 = 原速 × scale（±5%）', b.stillCharging && near(b.slow.scaleMax, C.scale)
    && near(b.normal.scaleMin, 1) && Math.abs(b.slow.dx / b.normal.dx - C.scale) <= C.scale * 0.05, { slow: b.slow, normal: b.normal });
  check('T2 动画真的变慢：循环动画换帧次数 ≈ 原速 × scale', b.normal.changes >= 20
    && Math.abs(b.slow.changes / b.normal.changes - C.scale) <= 0.08, { slow: b.slow.changes, normal: b.normal.changes });

  // T5：轻点取消当帧回 1；受击打断当帧回 1；起蓄前已在飞的剑气照样打断蓄力
  const t5 = await ev(() => {
    const s = window.__scene, T = window.__T;
    window.__key('keydown'); window.__step(1);
    const tapScale = s._fightClock.scale;
    window.__key('keyup'); window.__step(1);
    const tapTs = window.__ts(), tapEnd = T.ends.at(-1);
    window.__step(20);
    window.__reset();
    s.p1.maxMp = 1e5; s.p1.mp = 1e5;
    window.__key('keydown');
    window.__until(() => s.p1.charging && window.__el(s.p1) >= BT.CHARGE.fullMs * 0.4, 200);
    const hitScale = s._fightClock.scale;
    s.p1.invuln = 0; s._hit(s.p2, s.p1, 3, s.p1.facingLeft ? 1 : -1);
    window.__step(1);
    const hitTs = window.__ts(), hitEnd = T.ends.at(-1);
    window.__key('keyup'); window.__step(40);
    return { tapScale, tapTs, tapEnd, hitScale, hitTs, hitEnd };
  });
  await ev(() => window.__reset());
  check('T5 轻点：起蓄帧已进慢放、松手当帧回 1（按 cancel 收）', t5.tapScale < 1 && allAt(t5.tapTs, 1) && t5.tapEnd.how === 'cancel', t5);
  check('T5 受击打断：当帧回 1（按 interrupt 收）', t5.hitScale < 1 && allAt(t5.hitTs, 1) && t5.hitEnd.how === 'interrupt', t5);

  const t5b = await ev(() => {
    const s = window.__scene, T = window.__T;
    s.p1.sprite.setPosition(268, s.p1.sprite.y); s.p2.sprite.setPosition(BT.GAME_W - 268, s.p2.sprite.y);
    window.__step(10);
    s.p1.maxMp = 1e5; s.p1.mp = 1e5; s.p1.invuln = 0;
    const hp0 = s.p1.hp, e0 = T.ends.length;
    s._fireQi(s.p2, 1, -1);                       // 对手先放一道剑气朝玩家飞（起蓄之前已在飞）
    window.__step(1);
    window.__key('keydown');
    let before = null, n = 0;
    while (n++ < 400) {
      window.__step(1);
      if (T.ends.length > e0) break;               // 收蓄了（期望：被那道剑气打断）
      if (s.p1.charging) before = s._fightClock.scale;
    }
    const end = T.ends[e0], ts = window.__ts(), hp1 = s.p1.hp;
    window.__key('keyup'); window.__step(60);
    return { before, end, ts, hp0, hp1, n };
  });
  await ev(() => window.__reset());
  check('T5 飞来剑气：慢放中照样命中并打断蓄力（慢放不给免疫），当帧回 1', near(t5b.before, C.scale)
    && t5b.end && t5b.end.how === 'interrupt' && t5b.hp1 < t5b.hp0 && allAt(t5b.ts, 1), t5b);

  if (id === 'sword') {
    // T9：前面几轮慢放后游戏时钟已落后真实时钟 —— 抜刀「画面静止」仍按游戏时间准点解冻、物理恢复
    const t9 = await ev(() => {
      const s = window.__scene, c = s._fightClock;
      const off = c.game - c.real;
      s.p1.mp = s.p1.maxMp = 1e5;
      // 玩家侧没按住攻击键 → 下一帧 _tickIai 就判"松手"自己出刀（真实路径），出刀即设 freezeUntil
      s._startIai(s.p1, s.time.now);
      let k = 0; while (!s.freezeUntil && k++ < 10) window.__step(1);
      const fu = s.freezeUntil - s.time.now, t0 = s.time.now;
      window.__step(1);
      const paused = s.physics.world.isPaused, scale = c.scale;
      let n = 1;
      while (s.freezeUntil && n < 200) { window.__step(1); n++; }
      const thaw = s.time.now - t0, resumed = !s.physics.world.isPaused;
      window.__step(30);
      return { off, fu, paused, scale, n, thaw, resumed };
    });
    await ev(() => window.__reset());
    check('T9 慢放过后（游戏时钟落后真实时钟）抜刀冻结按游戏时间准点解冻、物理恢复', t9.off < -300 && t9.paused && t9.scale === 1
      && t9.fu === C.freezeMs && t9.thaw >= C.freezeMs && t9.thaw <= C.freezeMs + C.dt + 1e-6 && t9.resumed, t9);
  }

  if (id === 'north') {
    // T11：30 轮蓄放（长短不一、释放/轻点交替）→ 显示对象 / 补间 / 监听器回到基线，慢放判据每帧只跑一次
    // 补间走 TweenManager 自己的墙钟，且两次更新间隔 >500ms 只按 33ms 记（maxLag/lagSkip）——
    // 所以不能"sleep 一大段再步进"，要小步步进 + 短 sleep 交替，让墙钟真的流过去
    const settle = async () => {
      await ev(() => window.__step(150));
      for (let i = 0; i < 50; i++) { await ev(() => window.__step(2)); await sleep(40); }
    };
    const snap = () => ev(() => {
      const s = window.__scene, sp = s.p1.sprite;
      return { kids: s.children.length, tweens: s.tweens.getTweens().length, post: s.events.listenerCount('postupdate'),
        spL: sp.eventNames().map((e) => `${String(e)}:${sp.listenerCount(e)}`).sort().join(','), ts: window.__ts() };
    });
    await ev(() => { const s = window.__scene; s.p1.maxMp = 1e5; s.p1.mp = 1e5; });
    await settle();
    const base0 = await snap();
    await ev(() => {
      const s = window.__scene;
      for (let k = 0; k < 30; k++) {
        window.__key('keydown');
        window.__step(k % 2 ? 1 + (k * 7) % 90 : 1);     // 奇数轮按住 2–90 帧，偶数轮轻点 1 帧
        window.__key('keyup');
        window.__until(() => !s.p1.charging && ['idle', 'walk'].includes(s.p1.state), 300);
        window.__step(3);
      }
    });
    await settle();
    const after = await snap();
    const calls = await ev(() => {
      const s = window.__scene, orig = s._tickBulletTime; let c = 0;
      s._tickBulletTime = function (d) { c++; return orig.call(this, d); };
      window.__step(5); delete s._tickBulletTime;
      return c;
    });
    check('T11 30 轮蓄放后显示对象数回到基线', after.kids === base0.kids, [base0.kids, after.kids]);
    check('T11 30 轮后无残留补间', after.tweens === 0, after.tweens);
    check('T11 30 轮后 sprite / 场景 postupdate 监听器不累积', after.spL === base0.spL && after.post === base0.post, [base0, after]);
    check('T11 30 轮后五处倍率全是 1；慢放判据每帧只跑一次', allAt(after.ts, 1) && calls === 5, { ts: after.ts, calls });
  }

  check('T 本流派全程无报错', errors.length === 0, errors);
  await page.close();
}

async function btAiSuite(browser, base) {
  // T6：AI 起蓄即慢放、到点松手当帧回 1；双方同蓄时一方先收仍保持，两方都收才回 1（两种先后各一遍）
  section = 'T·AI';
  const { page, errors } = await gamePage(browser, base);
  await page.evaluate(SETUP, { id: 'sword', aiOff: true });
  const C = await btConsts(page);
  const ai = await page.evaluate(() => {
    const s = window.__scene, T = window.__T;
    window.__step(10);
    delete s._controlAI;                              // 恢复原 AI 调度：走 loop.js 的 charging 分支
    s._startAICharge(s.p2, s.time.now);
    s.p2.aiRelease = s.time.now + BT.CHARGE.fullMs + 60; s.p2.ultReady = Infinity;
    window.__step(1);
    const first = s._fightClock.scale;
    window.__until(() => window.__el(s.p2) >= BT.CHARGE.fullMs, 300);
    const mid = window.__ts();
    let n = 0; while (s.p2.charging && n++ < 300) window.__step(1);
    const rel = T.release.find((x) => x.who === 'p2'), after = window.__ts(), usage = { ...s._usage };
    s._controlAI = function () {};
    window.__step(60);
    return { first, mid, rel, after, usage };
  });
  check('T6 AI 起蓄即进慢放、满蓄时五处 = scale', ai.first < 1 && allAt(ai.mid, C.scale), ai);
  check('T6 AI 到点松手：当帧回 1、frac=1、计入 usage.aiCharge', ai.rel && ai.rel.frac === 1 && allAt(ai.after, 1) && ai.usage.aiCharge === 1, ai);

  // 双方同蓄：原规则下后起蓄的一方起浪会把先蓄的一方打进硬直（见 G·双方），自然对局里凑不出"两人同时在蓄"。
  // 这里在 harness 里临时关掉起浪，只为验证慢放判据本身（任一方在蓄就保持）。
  const both = await page.evaluate(() => {
    const s = window.__scene, out = {};
    s._chargeWave = function () {};
    s._controlAI = function (time) { if (this.p2.charging) this._tickCharge(this.p2, time); };
    for (const first of ['p1', 'p2']) {
      // 上一发释放出的剑气还在飞（水神剑气活 1.5s）会把玩家打出蓄力：先清场 + 玩家临时无敌
      //（__reset 自己会步进，得在它之前清），只测慢放判据
      s._clearQi(); s.p1.invuln = Infinity;
      window.__reset(); s.p1.invuln = Infinity;
      window.__until(() => ['idle', 'walk'].includes(s.p1.state) && ['idle', 'walk'].includes(s.p2.state), 200);
      s.p1.maxMp = 1e5; s.p1.mp = 1e5; s.p2.mp = s.p2.maxMp = 1e5;
      const pre = { p1: s.p1.state, p2: s.p2.state, hp: s.p1.hp };
      window.__key('keydown'); window.__step(1);
      const k1 = { p1: s.p1.state, charging: s.p1.charging };
      s._startAICharge(s.p2, s.time.now); s.p2.aiRelease = first === 'p2' ? s.time.now + 200 : Infinity;
      window.__step(20);
      const r = { both: s.p1.charging && s.p2.charging, sBoth: s._fightClock.scale, pre, k1,
        at20: { p1: s.p1.state, p2: s.p2.state, ends: window.__T.ends.slice(-3) } };
      if (first === 'p1') { window.__key('keyup'); window.__step(1); }
      else window.__until(() => !s.p2.charging, 300);
      r.oneLeft = { p1: s.p1.charging, p2: s.p2.charging, ts: window.__ts() };
      window.__step(5);
      r.oneLeftLater = s._fightClock.scale;
      if (first === 'p1') { s.p2.aiRelease = s.time.now; window.__until(() => !s.p2.charging, 300); }
      else { window.__key('keyup'); window.__step(1); }
      r.none = window.__ts();
      out[first] = r;
      window.__step(60);
    }
    delete s._chargeWave; s._controlAI = function () {}; s.p1.invuln = 0;
    return out;
  });
  for (const first of ['p1', 'p2']) {
    const r = both[first], other = first === 'p1' ? 'p2' : 'p1';
    check(`T6 双方同蓄（${first} 先收）：两人都在蓄时慢放`, r.both && r.sBoth < 1, r);
    check(`T6 双方同蓄（${first} 先收）：${first} 收后 ${other} 仍在蓄 → 保持 scale`, !r.oneLeft[first] && r.oneLeft[other]
      && allAt(r.oneLeft.ts, C.scale) && near(r.oneLeftLater, C.scale), r.oneLeft);
    check(`T6 双方同蓄（${first} 先收）：两人都收 → 当帧回 1`, allAt(r.none, 1), r.none);
  }
  check('T6 无报错', errors.length === 0, errors);
  await page.close();
}

async function btLifecycleSuite(browser, base) {
  // T7：蓄力（慢放）中 KO 进 interlude / 被 KO 进 over / 整场重开 → 全部回 1；重开后新一局首帧全是 1
  section = 'T·换场重开';
  const { page, errors } = await gamePage(browser, base);
  await page.evaluate(SETUP, { id: 'water', aiOff: true });
  const C = await btConsts(page);
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const charge = () => ev(() => {
    const s = window.__scene;
    s.p1.maxMp = 1e5; s.p1.mp = 1e5; s.p1.invuln = 0;
    window.__key('keydown');
    window.__until(() => s.p1.charging && window.__el(s.p1) >= 200, 300);
    return { scale: s._fightClock.scale, charging: s.p1.charging };
  });

  const c1 = await charge();
  const iv = await ev(() => {
    const s = window.__scene;
    window.__noKo = false; s.p2.invuln = 0; s.p2.hp = 1; s._hit(s.p1, s.p2, 50, 1);
    window.__step(1);
    const r = { phase: s.phase, ts: window.__ts(), charging: s.p1.charging };
    window.__key('keyup');
    window.__until(() => s.phase === 'fight' && s.round === 1, 600);
    window.__step(5);
    return { ...r, next: { phase: s.phase, round: s.round, ts: window.__ts() } };
  });
  check('T7 慢放中对手 KO → interlude：当帧回 1', near(c1.scale, C.scale) && iv.phase === 'interlude' && !iv.charging && allAt(iv.ts, 1), { c1, iv });
  check('T7 下一场开打仍是 1', iv.next.phase === 'fight' && iv.next.round === 1 && allAt(iv.next.ts, 1), iv.next);

  const c2 = await charge();
  const rs = await ev(() => {
    const s = window.__scene, game0 = s._fightClock.game;
    s._restartGame();
    let n = 0;
    while (n++ < 60 && !(s.phase === 'select' && s._in && s._restartUI)) window.__step(1);
    const first = window.__ts();
    const r = { n, phase: s.phase, first, scale: s._fightClock.scale, monotonic: s._fightClock.game > game0 };
    window.__key('keyup'); window.__step(5);
    // 新一局：重新开打、再蓄一次 —— 慢放照常生效，判据每帧只跑一次（没有因重开叠监听）
    s._hudStarted = true; s._startGauntlet('water'); s._controlAI = function () {};
    window.__step(20);
    let calls = 0; const orig = s._tickBulletTime;
    s._tickBulletTime = function (d) { calls++; return orig.call(this, d); };
    window.__step(5); delete s._tickBulletTime;
    r.calls = calls;
    return r;
  });
  check('T7 慢放中整场重开 → 新场景首帧五处全是 1、globalTimeScale = 1', near(c2.scale, C.scale) && rs.phase === 'select'
    && allAt(rs.first, 1) && rs.first.gts === 1, { c2, rs });
  check('T7 重开后游戏时钟单调（不回拨）、慢放判据每帧只跑一次', rs.monotonic && rs.calls === 5, rs);
  const c3 = await charge();
  check('T7 重开后再蓄力：慢放照常', near(c3.scale, C.scale) && c3.charging, c3);
  const ov = await ev(() => {
    const s = window.__scene;
    s.p1.hp = 1; s.p1.invuln = 0; s._hit(s.p2, s.p1, 50, -1);
    window.__step(1);
    const r = { phase: s.phase, lost: !!s._lost, ts: window.__ts() };
    window.__key('keyup'); window.__step(30);
    return { ...r, later: window.__ts() };
  });
  check('T7 慢放中被 KO → over：当帧回 1、之后保持 1', ov.phase === 'over' && ov.lost && allAt(ov.ts, 1) && allAt(ov.later, 1), ov);
  check('T7 无报错', errors.length === 0, errors);
  await page.close();
}

async function btMiscSuite(browser, base) {
  // T8：缺图（变装没在播，退回 guard 占位）→ 不慢放
  section = 'T·缺图';
  {
    const { page, errors } = await gamePage(browser, base, { blockTransform: true });
    await page.evaluate(SETUP, { id: 'water', aiOff: true });
    const r = await page.evaluate(() => {
      const s = window.__scene, c = s._fightClock, g0 = c.game, r0 = c.real;
      s.p1.maxMp = 1e5; s.p1.mp = 1e5;
      window.__key('keydown');
      const sc = [];
      for (let i = 0; i < 60; i++) { window.__step(1); sc.push(c.scale); }
      const out = { charging: s.p1.charging, tf: s.p1.tf, anim: s.p1.sprite.anims.currentAnim && s.p1.sprite.anims.currentAnim.key,
        min: Math.min(...sc), ts: window.__ts(), dGame: c.game - g0, dReal: c.real - r0 };
      window.__key('keyup'); window.__step(60);
      return out;
    });
    check('T8 缺图：蓄力中（guard 占位）全程不慢放、游戏时间 = 真实时间', r.charging && r.tf === null && r.anim === 'water_guard'
      && r.min === 1 && allAt(r.ts, 1) && near(r.dGame, r.dReal, 1e-6), r);
    check('T8 缺图：除被拦资源外无报错', errors.length === 0, errors);
    await page.close();
  }

  // T10：?bt=0 全程 1×；?bt=0.5 满蓄约 0.84s（含渐入 ≈0.80s）；非法值忽略
  const fullRun = async (query) => {
    const { page, errors } = await gamePage(browser, base, { query });
    await page.evaluate(SETUP, { id: 'water', aiOff: true });
    const r = await page.evaluate(() => {
      const s = window.__scene, c = s._fightClock, T = window.__T, q0 = T.qi.length;
      s.p1.maxMp = 1e5; s.p1.mp = 1e5;
      window.__key('keydown');
      let n = 0; const sc = [];
      do { window.__step(1); n++; sc.push(c.scale); } while (!(s.p1.charging && window.__el(s.p1) >= BT.CHARGE.fullMs) && n < 400);
      const el = window.__el(s.p1);
      window.__key('keyup'); window.__step(90);
      return { n, el, min: Math.min(...sc), cfg: { ...s._btCfg }, off: c.game - c.real,
        qi: T.qi.slice(q0).filter((q) => q.who === 'p1').map((q) => q.dmg) };
    });
    return { page, errors, r };
  };
  section = 'T·URL';
  const off = await fullRun('?bt=0');
  const C = await btConsts(off.page);
  check(`T10 ?bt=0：全程 1×、游戏时间 = 真实时间、满蓄 ${Math.round(off.r.n * C.dt)}ms`, !off.r.cfg.enabled && off.r.min === 1
    && near(off.r.off, 0, 1e-6) && off.r.n * C.dt <= C.fullMs + 2 * C.dt, off.r);
  check('T10 ?bt=0 无报错', off.errors.length === 0, off.errors);
  await off.page.close();
  const half = await fullRun('?bt=0.5');
  const halfMs = half.r.n * C.dt;
  check(`T10 ?bt=0.5：倍率 0.5、满蓄约 0.84s（含渐入实测 ${Math.round(halfMs)}ms）`, half.r.cfg.enabled && near(half.r.cfg.scale, 0.5)
    && near(half.r.min, 0.5) && halfMs >= 750 && halfMs <= 900, half.r);
  check('T10 同蓄力比例（满蓄）下剑气数量 / 伤害与 ?bt=0 相同', JSON.stringify(half.r.qi) === JSON.stringify(off.r.qi) && off.r.qi.length > 0,
    { bt0: off.r.qi, bt05: half.r.qi });
  // 非法值：直接改地址栏查询串再跑一遍解析（同一函数，免得每个值重开一页）
  const parsed = await half.page.evaluate(() => {
    const s = window.__scene, out = {};
    for (const v of ['abc', '2', '-1', '', '1', '0.2', '0']) {
      history.replaceState(null, '', `?bt=${encodeURIComponent(v)}`);
      s._initBulletTime(); out[v] = { enabled: s._btCfg.enabled, scale: s._btCfg.scale };
    }
    history.replaceState(null, '', '?bt=0.5'); s._initBulletTime();
    return out;
  });
  const D = await half.page.evaluate(() => ({ ...BT.BULLET_TIME }));
  const dflt = (o) => o.enabled === D.enabled && o.scale === D.scale;
  check('T10 非法值（abc / 2 / -1 / 空）忽略、回默认配置', ['abc', '2', '-1', ''].every((v) => dflt(parsed[v])), parsed);
  check('T10 合法值：1 → 倍率 1；0.2 → 0.2；0 → 关', parsed['1'].enabled && parsed['1'].scale === 1
    && parsed['0.2'].enabled && parsed['0.2'].scale === 0.2 && !parsed['0'].enabled, parsed);
  check('T10 ?bt=0.5 无报错', half.errors.length === 0, half.errors);
  await half.page.close();
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const parts = String(flags.parts || 'P,G,T').toUpperCase().split(',');
  const srv = await serve();
  const browser = await launch();
  const base = `http://127.0.0.1:${srv.port}`;
  try {
    if (parts.includes('P')) await partP(browser, base);
    if (parts.includes('G')) {
      for (const id of SCHOOLS) await playerSuite(browser, base, id);
      await aiSuite(browser, base);
      await bothSuite(browser, base);
      await lifecycleSuite(browser, base);
    }
    if (parts.includes('T')) {
      // --tsuite=sword,ai,life,misc 只跑 T 段的部分套件（调试用；报告按段名合并，见下）
      const only = flags.tsuite ? String(flags.tsuite).split(',') : null, want = (k) => !only || only.includes(k);
      for (const id of SCHOOLS) if (want(id)) await btSchoolSuite(browser, base, id);
      if (want('ai')) await btAiSuite(browser, base);
      if (want('life')) await btLifecycleSuite(browser, base);
      if (want('misc')) await btMiscSuite(browser, base);
    }
  } finally {
    await browser.close();
    srv.close();
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed` + (failed.length ? `; FAILED: ${failed.map((f) => f.section + ' · ' + f.name).join(' | ')}` : ''));
  // 只跑了部分（--parts / --tsuite）：沿用报告里其余段的上次结果，只替换这次跑过的段
  const file = path.join(OUT, 'report.json');
  let merged = results;
  if ((parts.length < 3 || flags.tsuite) && fs.existsSync(file)) {
    const prev = JSON.parse(fs.readFileSync(file, 'utf8')), ran = new Set(results.map((r) => r.section));
    merged = (prev.results || []).filter((r) => !ran.has(r.section)).concat(results);
  }
  const mFailed = merged.filter((r) => !r.ok);
  fs.writeFileSync(file, JSON.stringify({
    ranAt: new Date().toISOString(), parts, passed: merged.length - mFailed.length, total: merged.length, results: merged,
  }, null, 2) + '\n');
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
