#!/usr/bin/env node
/**
 * BladeTrinity — 蓄力变装（BT.Transform）针对性检查。无头 Chromium，软件验证。
 *
 *   node game_runs/BladeTrinity/tools/transform-check.mjs              # P + G
 *   node game_runs/BladeTrinity/tools/transform-check.mjs --parts=G    # 只跑对局
 *
 * P  预览页 transform-preview.html：三派 × 左右朝向的进度→格号映射、单调、满蓄保持不动、
 *    按住/释放/取消、30 轮反复后显示对象 / 补间 / 监听器不累积、无 404、四种背景截图。
 * G  真实对局 index.html（玩家走 window keydown/keyup 真按键路径；AI 走 _startAICharge 真路径）：
 *    短按 / 半蓄 / 满蓄 / 满蓄继续按住 / 蓝耗尽自动放 / 受击打断 / 失焦取消 / 长帧（暂停恢复）/
 *    换边朝向 / AI 蓄力 / 双方同时蓄力 / 描边跟随变装纹理 / 剑气数量与伤害按原公式 / 脚底与碰撞体不动；
 *    换场定格 / 重开 / 缺图（路由拦掉 transform/*.webp）退回 guard 占位 / 窄视口。
 *    手柄掉线与切后台的取消路径另由 tools/joycon-check.mjs（B 段）覆盖。
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
  window.__key = (type) => {
    const e = new KeyboardEvent(type, { key: 'l', code: 'KeyL', bubbles: true, cancelable: true });
    Object.defineProperty(e, 'keyCode', { get: () => 76 });
    Object.defineProperty(e, 'which', { get: () => 76 });
    window.dispatchEvent(e);
  };
  // 手动步进：停掉 rAF 主循环，用 game.step(t, 1/60s) 逐帧推进 —— 游戏时间完全确定，与机器快慢无关；
  // 截图时循环停着，画面天然定格。按键在帧之间派发，下一帧被读到（与真机一样）。
  const g = s.game, M = window.__man = { t: s.time.now, dt: 1000 / 60 };
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
  await page.goto(`${base}/BladeTrinity/index.html`, { waitUntil: 'load' });
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
  const { page, errors } = await gamePage(browser, base);
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

  // ② 半蓄 → 释放：逐帧格号 = 映射、同帧描边跟随；释放剑气按原公式
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
  check('半蓄：描边剪影跟随变装纹理与当前格', half.p1.aura && half.p1.aura.every(([k, fr]) => k === `tf_${id}` && fr === half.p1.frame), half.p1.aura);
  check(`半蓄释放：minFrac ≤ frac < 1、剑气 ${nQi} 道、伤害按原公式`, halfDone.rel.frac >= C.minFrac && halfDone.rel.frac < 1
    && halfDone.qi.length === nQi && qiOk(halfDone.qi) && halfDone.qi.every((q) => q.legacy || Math.abs(q.frac - halfDone.rel.frac) < 1e-9), halfDone);
  check('半蓄释放：按"释放"收、切回主图集、招式计数 +1', halfDone.end.how === 'release' && halfDone.p1.tex === id && halfDone.p1.tf === null && halfDone.usage === 1,
    { end: halfDone.end, p1: halfDone.p1, usage: halfDone.usage });
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
    const { page, errors } = await gamePage(browser, base);
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
  const { page, errors } = await gamePage(browser, base);
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
    const { page, errors } = await gamePage(browser, base);
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
    const { page, errors } = await gamePage(browser, base, { blockTransform: true });
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
    const { page, errors } = await gamePage(browser, base, { viewport: { width: 420, height: 800 } });
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

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const parts = String(flags.parts || 'P,G').toUpperCase().split(',');
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
  } finally {
    await browser.close();
    srv.close();
  }
  const failed = results.filter((r) => !r.ok);
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({
    ranAt: new Date().toISOString(), passed: results.length - failed.length, total: results.length, results,
  }, null, 2) + '\n');
  console.log(`\n${results.length - failed.length}/${results.length} checks passed` + (failed.length ? `; FAILED: ${failed.map((f) => f.section + ' · ' + f.name).join(' | ')}` : ''));
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
