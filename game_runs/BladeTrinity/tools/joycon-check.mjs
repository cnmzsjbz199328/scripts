#!/usr/bin/env node
/**
 * BladeTrinity — Joy-Con 2 integration check (software only; NOT hardware acceptance).
 *
 *   node game_runs/BladeTrinity/tools/joycon-check.mjs                     # A + B
 *   node game_runs/BladeTrinity/tools/joycon-check.mjs --upstream=<Joycon checkout @ce5abf5>
 *   node game_runs/BladeTrinity/tools/joycon-check.mjs --adapter=ws://127.0.0.1:8799 [--live-seconds=25] [--parts=C]
 *
 * A  Node, no browser: _engine/joycon.js client rules (protocol v2) + URL policy.
 *    With --upstream: replays one scripted session through the upstream
 *    shared/protocol/input-client.mjs and through the port; every emitted event must match.
 * B  Real game page in headless Chromium, adapter mocked with page.routeWebSocket:
 *    start overlay, menu stick thresholds, every combat action, keyboard+Joy-Con merge,
 *    tap/hold/release, disconnect / socket close / stale / page hidden / window blur during
 *    charge and iai stance, reconnect with buttons still held, restart via ＋, scene restarts
 *    leave exactly one action layer and four subscriptions.
 * C  Optional: the same page against a real adapter process (synthetic or replay source);
 *    reports what arrived and asserts the no-stuck-keys / no-page-error basics.
 *
 * Exit code 0 = all assertions passed.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GAME_RUNS = path.resolve(HERE, '..', '..');
const ENGINE = path.join(GAME_RUNS, '_engine', 'joycon.js');
const flags = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─────────── tiny assertion log ───────────
const results = [];
let section = '';
function check(name, ok, detail) {
  results.push({ section, name, ok: !!ok, detail });
  console.log(`${ok ? '  ok ' : '  FAIL'} ${section} · ${name}${!ok && detail !== undefined ? '  → ' + JSON.stringify(detail) : ''}`);
  return !!ok;
}

// ─────────── load the classic-script port into Node ───────────
function loadPort(loc = { search: '', hostname: 'example.com', protocol: 'https:' }, nav = {}) {
  const win = { performance, location: loc, navigator: nav, WebSocket: undefined };
  new Function('window', fs.readFileSync(ENGINE, 'utf8'))(win);
  return win.JoyCon2;
}

function frame(side, pressed = [], stick = { x: 0, y: 0 }, JC, seq = 0) {
  const names = JC.buttonsFor(side);
  return {
    timestamp: seq / 1000, seq, controller: side,
    buttons: Object.fromEntries(names.map((n) => [n, pressed.includes(n)])),
    stick, stickRaw: { x: 2048, y: 2048 },
    accelerometer: { x: 0, y: 0, z: 1 }, gyroscope: { x: 0, y: 0, z: 0 },
    battery: null, temperature: null, imuReady: true,
  };
}
const env = (type, data, v = 2) => ({ v, type, data });

// A scripted session that exercises every client rule. Returns the event log.
function runScript(Impl, JC) {
  let t = 0;
  const c = new Impl({ now: () => t });
  const log = [];
  for (const type of ['press', 'release', 'stick', 'device', 'adapter', 'error']) {
    c.addEventListener(type, (e) => {
      const d = { ...e.detail };
      delete d.localTime;                     // local clock: identical by construction, noisy to diff
      log.push([type, JSON.parse(JSON.stringify(d))]);
    });
  }
  const msg = (m) => c.handleMessage(JSON.stringify(m));
  c.handleTransportOpen();
  msg(env('hello', { adapter: 'script', source: 'test', rateHz: 33 }));
  msg(env('frame', frame('left', ['zl'], { x: 0, y: 0 }, JC, 1)));          // before status → ignored
  msg(env('status', { controller: 'left', connection: 'connecting', hint: 'press Sync' }));
  msg(env('status', { controller: 'left', connection: 'connected', calibrated: true, address: 'L' }));
  msg(env('status', { controller: 'right', connection: 'connected', address: 'R' }));
  t = 30; msg(env('frame', frame('left', ['zl', 'up'], { x: -0.9, y: 0 }, JC, 2)));
  t = 60; msg(env('frame', frame('right', ['y'], { x: 0, y: 0 }, JC, 3)));
  t = 90; msg(env('frame', frame('right', ['y', 'zr'], { x: 0, y: 0.5 }, JC, 4)));
  t = 120; msg(env('frame', frame('right', ['zr'], { x: 0, y: 0.5 }, JC, 5)));
  msg({ v: 1, type: 'frame', data: frame('right', [], undefined, JC, 6) });   // wrong version → one error
  msg({ v: 1, type: 'status', data: {} });                                   // same version again → no 2nd error
  msg('not json');
  msg(env('status', { controller: 'left', connection: 'disconnected', hint: 'hold Sync' }));  // offline release
  t = 150; msg(env('frame', frame('left', ['zl'], { x: 0, y: 0 }, JC, 7)));   // offline → ignored
  t = 200; msg(env('status', { controller: 'left', connection: 'connected' }));
  t = 230; msg(env('frame', frame('left', ['zl'], { x: 0, y: 0 }, JC, 8)));   // re-press after recovery
  t = 1300; c.tick();                                                         // right stale (last frame 120)
  t = 1400; msg(env('frame', frame('right', ['zr'], { x: 0, y: 0 }, JC, 9))); // right back
  c.handleTransportClosed();                                                  // transport release
  msg(env('frame', frame('right', ['a'], { x: 0, y: 0 }, JC, 10)));           // after close → ignored
  return { log, c };
}

async function partA() {
  section = 'A·policy';
  const JC = loadPort();
  const R = (search, hostname, protocol = 'http:', webdriver = false) =>
    JC.resolveUrl({ search, hostname, protocol }, { webdriver });
  check('localhost auto-connects', R('', 'localhost') === JC.WS_DEFAULT_URL);
  check('127.0.0.1 auto-connects', R('', '127.0.0.1') === JC.WS_DEFAULT_URL);
  check('public https host stays off', R('', 'showreel.pages.dev', 'https:') === null);
  check('?joycon opts in on public host', R('?joycon', 'showreel.pages.dev', 'https:') === JC.WS_DEFAULT_URL);
  check('?joycon=ws://… picks that URL', R('?joycon=ws://127.0.0.1:9001', 'x.dev', 'https:') === 'ws://127.0.0.1:9001');
  check('?joycon=off wins on localhost', R('?joycon=off', 'localhost') === null);
  check('webdriver without param stays off', R('', '127.0.0.1', 'http:', true) === null);
  check('webdriver with ?joycon connects', R('?joycon=1', '127.0.0.1', 'http:', true) === JC.WS_DEFAULT_URL);
  check('PROTOCOL_VERSION is 2', JC.PROTOCOL_VERSION === 2);

  section = 'A·client';
  const { log, c } = runScript(JC.JoyCon2Input, JC);
  const of = (type, pred = () => true) => log.filter(([t, d]) => t === type && pred(d));
  check('frame before "connected" status is ignored',
    !of('press', (d) => d.controller === 'left' && d.button === 'zl' && d.timestamp === 0.001).length);
  // (within one frame the client walks buttons in protocol order: up before zl)
  check('press edges from consecutive frames', of('press').map((x) => x[1].controller + '.' + x[1].button).join() ===
    'left.up,left.zl,right.y,right.zr,left.zl,right.zr', of('press').map((x) => x[1].button));
  check('input release carries reason "input"', of('release', (d) => d.button === 'y')[0]?.[1].reason === 'input');
  check('exactly one version error for v1', of('error').length === 1, of('error'));
  check('offline status releases held buttons', of('release', (d) => d.reason === 'offline').map((x) => x[1].button).sort().join() === 'up,zl');
  check('offline centres the stick', of('stick', (d) => d.reason === 'offline' && d.x === 0 && d.y === 0).length === 1);
  // t=1300: both sides' last frames are >1 s old (left 230, right 120) → both stale
  check('stale watchdog releases (reason "stale")', of('release', (d) => d.reason === 'stale').map((x) => x[1].controller + '.' + x[1].button).sort().join() === 'left.zl,right.zr',
    of('release', (d) => d.reason === 'stale'));
  check('transport close releases what is still held', of('release', (d) => d.reason === 'transport').map((x) => x[1].controller + '.' + x[1].button).join() === 'right.zr',
    of('release', (d) => d.reason === 'transport'));
  check('no button left pressed after close', !Object.values(c.devices).some((d) => Object.values(d.buttons).some(Boolean)));
  const presses = of('press').length, releases = of('release').length;
  check('every press has exactly one release', presses === releases, { presses, releases });

  if (flags.upstream) {
    section = 'A·parity';
    const up = path.resolve(String(flags.upstream), 'shared', 'protocol', 'input-client.mjs');
    if (!check('upstream input-client.mjs exists', fs.existsSync(up), up)) return;
    const mod = await import(pathToFileURL(up).href);
    const a = runScript(mod.JoyCon2Input, JC).log, b = log;
    const same = JSON.stringify(a) === JSON.stringify(b);
    let firstDiff = null;
    if (!same) for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) { firstDiff = { i, upstream: a[i], port: b[i] }; break; }
    }
    check(`port emits the same ${b.length} events as upstream`, same, firstDiff);
  }
}

// ─────────── static server for game_runs/ ───────────
function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
    '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.css': 'text/css' };
  const server = http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const f = path.join(GAME_RUNS, p);
    if (!f.startsWith(GAME_RUNS) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r({ port: server.address().port, close: () => server.close() })));
}

// page-side snapshot of everything the assertions read
const SNAP = () => {
  const s = window.__scene, p = s && s.p1, I = s && s._in;
  const acts = ['attack', 'charge', 'guard', 'blink', 'jump', 'up', 'confirm', 'restart'];
  return {
    phase: s.phase, sel: s.selCursor && s.selCursor[0], tier: s.selTier, hud: s._hudStarted,
    overlay: document.getElementById('start-screen').style.display,
    usage: s._usage ? { ...s._usage } : null,
    st: p ? p.state : null, charging: !!(p && p.charging), iai: !!(p && p.iai),
    x: p ? p.sprite.x : null, y: p ? p.sprite.y : null, ground: p ? p.sprite.body.blocked.down : null,
    mx: I ? I.moveX() : null, held: I ? Object.fromEntries(acts.map((a) => [a, I.held(a)])) : null,
    jc: I ? I.jcOnline() : null, label: s._jcLabel ? s._jcLabel.text : null,
    dom: (document.getElementById('joycon-status') || {}).textContent,
    tip: s.selTip && s.selTip.active ? s.selTip.text : null,
    obj: (document.getElementById('hud-objective-text') || {}).textContent,
    rsTip: s._restartUI ? s._restartUI.jcTip.alpha : null,
    live: BT.Input.live, subs: BT.Input.subs, cnt: { ...(window.__cnt || {}) },
  };
};
const INSTRUMENT = () => {
  const s = window.__scene;
  window.__cnt = { strike: 0, cancel: 0, selMove: 0, tierMove: 0, confirm: 0, restart: 0 };
  const wrap = (name, key) => {
    const o = s[name];
    s[name] = function (...a) { window.__cnt[key]++; return o.apply(this, a); };
  };
  wrap('_iaiStrike', 'strike'); wrap('_cancelCharge', 'cancel');
  wrap('_selectMove', 'selMove'); wrap('_tierMove', 'tierMove');
  wrap('_selectConfirm', 'confirm'); wrap('_restartGame', 'restart');
  s._controlAI = function () {};            // AI off: the checks are about the player's input path
  // The opponent just stands there, so our test strikes would KO it and push the run into
  // interlude/over where input is (correctly) ignored. Keep it alive unless a check KOs on purpose.
  window.__noKo = true;
  const ko = s._ko;
  s._ko = function (loser) {
    if (window.__noKo && loser === this.p2) { loser.hp = loser.maxHp; return; }
    return ko.call(this, loser);
  };
};

async function launch() {
  let chromium;
  try { ({ chromium } = await import('playwright')); } catch {
    console.error('playwright missing: npm i -D playwright && npx playwright install chromium'); process.exit(2);
  }
  return chromium.launch({ headless: true });
}

async function partB(browser, base) {
  // ── B0: no ?joycon under webdriver → no socket, keyboard unaffected ──
  section = 'B·off';
  {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    let sockets = 0;
    page.on('websocket', () => sockets++);
    await page.goto(`${base}/BladeTrinity/index.html`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__scene && window.__scene._in, null, { timeout: 15000 });
    await page.evaluate(() => window.__hudStart());
    await sleep(300);
    const s0 = await page.evaluate(SNAP);
    check('no connection attempted', sockets === 0 && (await page.evaluate(() => window.JoyCon2.shared())) === null);
    check('start card says how to enable', /\?joycon/.test(s0.dom || ''), s0.dom);
    await page.keyboard.down('d'); await sleep(150); await page.keyboard.up('d'); await sleep(150);
    const s1 = await page.evaluate(SNAP);
    check('keyboard D moves the school cursor once', s1.sel === (s0.sel + 1) % 3, [s0.sel, s1.sel]);
    await page.keyboard.down('Enter'); await sleep(150); await page.keyboard.up('Enter'); await sleep(250);
    const s2 = await page.evaluate(SNAP);
    check('keyboard Enter confirms', s2.phase === 'fight', s2.phase);
    check('keyboard HUD hint unchanged', /J 斩　S .{2}　长按 L 蓄剑气　AD 移动/.test(s2.obj), s2.obj);
    check('no console/page errors', errors.length === 0, errors);
    await page.close();
  }

  // ── B1+: mocked adapter ──
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const JC = loadPort();
  const A = { sock: null, conns: 0, up: true, paused: false, sides: {} };
  for (const side of ['left', 'right']) A.sides[side] = { conn: 'connecting', buttons: new Set(), stick: { x: 0, y: 0 }, seq: 0 };
  const send = (m) => A.sock && A.sock.send(JSON.stringify(m));
  const sendStatus = (side) => send(env('status', { controller: side, connection: A.sides[side].conn, calibrated: false, hint: null, address: 'mock-' + side }));
  const sendFrame = (side) => {
    const s = A.sides[side];
    s.seq = (s.seq + 30) % 65536;
    send(env('frame', frame(side, [...s.buttons], { ...s.stick }, JC, s.seq)));
  };
  await page.routeWebSocket(/127\.0\.0\.1:8765/, (ws) => {
    A.conns++;
    if (!A.up) { ws.close(); return; }
    A.sock = ws;
    ws.onClose(() => { if (A.sock === ws) A.sock = null; });
    send(env('hello', { adapter: 'mock', source: 'joycon-check', rateHz: 33 }));
    sendStatus('left'); sendStatus('right');       // the adapter replays each controller's last status
  });
  const pump = setInterval(() => {                 // ~33 Hz per controller, like the hardware
    if (!A.sock || A.paused) return;
    for (const side of ['left', 'right']) if (A.sides[side].conn === 'connected') sendFrame(side);
  }, 30);
  const setConn = (side, conn) => { A.sides[side].conn = conn; sendStatus(side); };
  const down = (side, b) => A.sides[side].buttons.add(b);
  const up = (side, b) => A.sides[side].buttons.delete(b);
  const stick = (x, y = 0) => { A.sides.left.stick = { x, y }; };
  const tap = async (side, b, ms = 120) => { down(side, b); await sleep(ms); up(side, b); await sleep(120); };
  const snap = () => page.evaluate(SNAP);
  const until = async (pred, ms = 3000) => {
    const t0 = Date.now(); let s;
    do { s = await snap(); if (pred(s)) return s; await sleep(40); } while (Date.now() - t0 < ms);
    return s;
  };
  const setP1 = (fields) => page.evaluate((f) => {
    const p = window.__scene.p1;
    if (f.mp === 'max') f.mp = p.maxMp;
    if (f.x !== undefined) { p.sprite.setPosition(f.x, p.sprite.y); delete f.x; }
    Object.assign(p, f);
  }, fields);
  const idle = () => until((s) => s.st === 'idle' && s.ground, 4000);

  try {
    section = 'B·link';
    await page.goto(`${base}/BladeTrinity/index.html?joycon=ws://127.0.0.1:8765`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__scene && window.__scene._in, null, { timeout: 15000 });
    await page.evaluate(INSTRUMENT);
    let s = await until((x) => /适配器已连接/.test(x.label || ''), 4000);
    check('socket open but no controller online is shown as such',
      /适配器已连接/.test(s.label) && /左 ○/.test(s.label) && /右 ○/.test(s.label) && !s.jc, s.label);
    check('start card mirrors the status', s.dom === s.label, s.dom);
    setConn('left', 'connected'); setConn('right', 'connected');
    s = await until((x) => x.jc && /左 ●/.test(x.label) && /右 ●/.test(x.label));
    check('both controllers online', s.jc && /右 ●/.test(s.label), s.label);
    check('select tip switches to Joy-Con keys', /摇杆/.test(s.tip || ''), s.tip);

    section = 'B·menu';
    await tap('right', 'plus', 200);
    s = await until((x) => x.hud);
    check('＋ on the START card dismisses it', s.overlay === 'none' && s.hud, s.overlay);
    check('…without also confirming the school', s.phase === 'select' && s.cnt.confirm === 0, s.cnt);
    const sel0 = s.sel, mv0 = s.cnt.selMove;
    stick(0.9); await sleep(650);
    s = await snap();
    check('stick held right moves one school (not one per packet)', s.sel === (sel0 + 1) % 3 && s.cnt.selMove === mv0 + 1, [s.sel, s.cnt.selMove - mv0]);
    stick(0); await sleep(150); stick(0.45); await sleep(400);
    s = await snap();
    check('half deflection (0.45 < 0.6) does nothing', s.cnt.selMove === mv0 + 1, s.cnt.selMove - mv0);
    stick(0.9); await sleep(250); stick(0.4); await sleep(250); stick(0.9); await sleep(250);
    s = await snap();
    check('dipping to 0.4 without recentring does not re-trigger', s.cnt.selMove === mv0 + 2, s.cnt.selMove - mv0);
    stick(0); await sleep(150);
    const tier0 = s.tier, tm0 = s.cnt.tierMove;
    stick(0.7, 0.68); await sleep(400); stick(0); await sleep(150);
    s = await snap();
    check('diagonal moves one axis only', s.cnt.selMove === mv0 + 3 && s.cnt.tierMove === tm0, [s.cnt.selMove - mv0, s.cnt.tierMove - tm0]);
    stick(0, 0.9); await sleep(400); stick(0); await sleep(150);
    s = await snap();
    check('stick up raises the tier once', s.tier === tier0 + 1 && s.cnt.tierMove === tm0 + 1, [tier0, s.tier]);
    await tap('left', 'down', 150);
    s = await snap();
    check('D-pad down lowers it once', s.tier === tier0 && s.cnt.tierMove === tm0 + 2, [tier0, s.tier]);
    for (let i = 0; i < 3 && s.sel !== 0; i++) { await tap('left', 'right', 150); s = await snap(); }
    await tap('left', 'left', 150);
    const wl = (await snap()).sel;
    await tap('left', 'right', 150);
    s = await snap();
    check('cursor wraps both ways within the 3 schools', s.sel === 0 && wl === 2, [wl, s.sel]);

    section = 'B·confirm';
    down('right', 'a'); await sleep(450);
    s = await snap();
    check('A confirms into the fight', s.phase === 'fight' && s.cnt.confirm === 1, [s.phase, s.cnt.confirm]);
    check('holding that A does not blink in the fight', s.usage.blink === 0, s.usage);
    check('fight HUD shows Joy-Con keys', /Y 斩　ZL .{2}　长按 ZR 蓄剑气　摇杆 移动/.test(s.obj) && /按住 Y/.test(s.obj), s.obj);
    up('right', 'a'); await sleep(200);
    await idle();

    section = 'B·attack';
    await tap('right', 'y');
    s = await snap();
    check('Y tap = one attack', s.usage.attack === 1, s.usage.attack);
    await idle();
    down('right', 'y'); sendFrame('right'); up('right', 'y'); sendFrame('right');   // press+release inside one game frame
    s = await until((x) => x.usage.attack === 2, 600);
    check('a press+release between two game frames still attacks once', s.usage.attack === 2, s.usage.attack);
    await idle();
    await setP1({ mp: 0 });                                                         // no MP → holding cannot turn into the arte
    await page.keyboard.down('j'); await sleep(150);
    down('right', 'y'); await sleep(250);
    s = await snap();
    check('keyboard J then Joy-Con Y: still one attack', s.usage.attack === 3, s.usage.attack);
    await idle();
    s = await snap();
    check('both held through recovery: no extra attack', s.usage.attack === 3, s.usage.attack);
    up('right', 'y'); await sleep(200);
    s = await snap();
    check('Y released while J held → attack still held', s.held.attack === true, s.held);
    await page.keyboard.up('j'); await sleep(150);
    s = await snap();
    check('J released → attack released', s.held.attack === false && s.usage.attack === 3, s.held);

    section = 'B·iai';
    await setP1({ mp: 'max', arteReady: 0 });
    let k = (await snap()).cnt.strike;
    down('right', 'y'); await sleep(650);
    s = await snap();
    check('hold Y through the swing → 抜刀 stance', s.iai, s.st);
    up('right', 'y'); await sleep(200);
    s = await snap();
    check('release Y → strike', s.cnt.strike === k + 1 && !s.iai && s.usage.arte === 1, [s.cnt.strike - k, s.usage.arte]);
    await sleep(400); await idle();
    await setP1({ mp: 'max', arteReady: 0 });
    k = (await snap()).cnt.strike;
    const atk0 = (await snap()).usage.attack;
    down('right', 'y'); await sleep(650);
    s = await snap();
    check('stance again', s.iai, s.st);
    setConn('right', 'disconnected');
    s = await until((x) => !x.iai, 800);
    check('right Joy-Con drops mid-stance → stance cancelled, no strike', !s.iai && s.st === 'idle' && s.cnt.strike === k, [s.st, s.cnt.strike - k]);
    check('status shows right offline, left still online', /右 ○/.test(s.label) && /左 ●/.test(s.label) && s.jc, s.label);
    setConn('right', 'connected'); await sleep(450);             // Y still held on the "controller"
    s = await snap();
    check('reconnect with Y still held: no attack, attack not held', s.usage.attack === atk0 + 1 && !s.held.attack, [s.usage.attack - atk0, s.held.attack]);
    up('right', 'y'); await sleep(150); await tap('right', 'y');
    s = await snap();
    check('after releasing once, Y attacks again', s.usage.attack === atk0 + 2, s.usage.attack - atk0);
    await idle();

    section = 'B·charge';
    await setP1({ mp: 'max' });
    let c0 = (await snap()).usage.charge;
    down('right', 'zr'); await sleep(550);
    s = await snap();
    check('hold ZR → charging', s.charging, s.st);
    up('right', 'zr'); await sleep(200);
    s = await snap();
    check('release ZR → 剑气 fired', s.usage.charge === c0 + 1 && !s.charging, s.usage.charge - c0);
    await sleep(300); await idle();

    // socket closes mid-charge
    await setP1({ mp: 'max' });
    c0 = (await snap()).usage.charge; let x0 = (await snap()).cnt.cancel;
    down('right', 'zr'); await sleep(300);
    check('charging before socket loss', (await snap()).charging);
    A.up = false; if (A.sock) await A.sock.close();
    s = await until((x) => !x.charging && /适配器未连接/.test(x.label || ''), 1500);
    check('socket closed → charge cancelled, nothing fired', !s.charging && s.st === 'idle' && s.usage.charge === c0 && s.cnt.cancel === x0 + 1, [s.st, s.usage.charge - c0, s.cnt.cancel - x0]);
    check('status says adapter not connected', /适配器未连接/.test(s.label) && !s.jc, s.label);
    await sleep(300); A.up = true;
    s = await until((x) => x.jc && /右 ●/.test(x.label), 9000);
    check('client reconnects by itself', s.jc, s.label);
    await sleep(400);
    s = await snap();
    check('ZR still held after reconnect: no new charge', !s.charging && !s.held.charge, [s.charging, s.held.charge]);
    up('right', 'zr'); await sleep(150);
    down('right', 'zr'); await sleep(350);
    check('fresh ZR press charges again', (await snap()).charging);
    up('right', 'zr'); await sleep(200);
    s = await snap();
    check('…and fires on release', s.usage.charge === c0 + 1, s.usage.charge - c0);
    await sleep(300); await idle();

    // frames stop (stale) mid-charge. A full bar (300 MP) drains in ~1.26 s and an empty bar
    // auto-releases the charge — that would race the ~1 s stale watchdog, so keep MP topped up here.
    await setP1({ mp: 'max' });
    c0 = (await snap()).usage.charge; x0 = (await snap()).cnt.cancel;
    await page.evaluate(() => { window.__mpPin = setInterval(() => { const p = window.__scene.p1; if (p) p.mp = p.maxMp; }, 30); });
    down('right', 'zr'); await sleep(300);
    A.paused = true;
    s = await until((x) => !x.charging, 2500);
    await page.evaluate(() => clearInterval(window.__mpPin));
    check('no frames for >1 s → charge cancelled, nothing fired', !s.charging && s.usage.charge === c0 && s.cnt.cancel === x0 + 1, [s.usage.charge - c0, s.cnt.cancel - x0]);
    check('stale controllers shown offline', /右 ○/.test(s.label), s.label);
    A.paused = false; await sleep(450);
    s = await snap();
    check('frames resume with ZR held: no charge', s.jc && !s.charging, [s.jc, s.charging]);
    up('right', 'zr'); await sleep(150);
    await idle();

    section = 'B·guard';
    down('left', 'zl');
    s = await until((x) => x.st === 'guard', 800);
    check('ZL held → guard', s.st === 'guard', s.st);
    setConn('left', 'disconnected');
    s = await until((x) => x.st !== 'guard', 800);
    check('left Joy-Con drops → guard released', s.st !== 'guard', s.st);
    setConn('left', 'connected'); await sleep(450);
    s = await snap();
    check('reconnect with ZL still held: not guarding', s.st !== 'guard', s.st);
    up('left', 'zl'); await sleep(150); down('left', 'zl');
    s = await until((x) => x.st === 'guard', 800);
    check('fresh ZL press guards again', s.st === 'guard', s.st);
    up('left', 'zl'); await sleep(200);

    section = 'B·move';
    await setP1({ x: 480 });
    s = await snap(); const mx0 = s.x;
    stick(-0.9); await sleep(300);
    s = await snap();
    check('stick left walks left at the fixed speed', s.mx === -1 && s.x < mx0 - 20, [s.mx, mx0 - s.x]);
    stick(-0.4); await sleep(200);
    check('0.4 after engaging keeps walking (hysteresis)', (await snap()).mx === -1);
    stick(-0.2); await sleep(200);
    check('0.2 stops', (await snap()).mx === 0);
    stick(-0.45); await sleep(200);
    check('0.45 from rest does not start', (await snap()).mx === 0);
    stick(-0.9); await sleep(150);
    setConn('left', 'disconnected'); await sleep(250);
    check('drop while walking → stops', (await snap()).mx === 0);
    setConn('left', 'connected'); await sleep(400);
    check('reconnect with stick still pushed → stays put until recentred', (await snap()).mx === 0);
    stick(0); await sleep(150); stick(-0.9); await sleep(200);
    check('recentre then push → walks', (await snap()).mx === -1);
    stick(0); await sleep(150);
    down('left', 'right'); await sleep(200);
    check('D-pad right walks right', (await snap()).mx === 1);
    up('left', 'right'); await sleep(150);

    section = 'B·jump/blink';
    await idle();
    let u = (await snap()).usage;
    stick(0, 0.9); await sleep(400);
    check('stick up alone does not jump', (await snap()).usage.jump === u.jump);
    stick(0); await sleep(150);
    s = await snap(); const gy = s.y;
    await tap('right', 'b', 100);
    s = await snap();
    check('B jumps', s.usage.jump === u.jump + 1 && s.y < gy - 20, [s.usage.jump - u.jump, gy - s.y]);
    await sleep(900); await idle();
    await setP1({ x: 300, mistReady: 0, riseReady: 0 });
    s = await snap(); const bx = s.x; u = s.usage;
    stick(0.9); await sleep(120); down('right', 'a'); await sleep(120); up('right', 'a'); await sleep(80);
    s = await snap();
    check('stick right + A = 缩地 to the right', s.usage.blink === u.blink + 1 && s.x - bx > 150, [s.usage.blink - u.blink, s.x - bx]);
    stick(0); await sleep(150); await idle();
    s = await snap(); const ry = s.y; u = s.usage;
    stick(0, 0.9); await sleep(120); down('right', 'a'); await sleep(100); up('right', 'a');
    s = await snap();
    check('stick up + A = 升空', s.usage.blink === u.blink + 1 && s.y < ry - 100, [s.usage.blink - u.blink, ry - s.y]);
    stick(0); await sleep(1200); await idle();
    await setP1({ riseReady: 0 });
    s = await snap(); const dy = s.y; u = s.usage;
    down('left', 'up'); await sleep(100); down('right', 'a'); await sleep(100); up('right', 'a'); up('left', 'up');
    s = await snap();
    check('D-pad up + A = 升空', s.usage.blink === u.blink + 1 && s.y < dy - 100, [s.usage.blink - u.blink, dy - s.y]);
    await sleep(1200); await idle();

    section = 'B·keyboard';
    await setP1({ mp: 'max', mistReady: 0, x: 480 });
    u = (await snap()).usage;
    await page.keyboard.down('a'); await sleep(250);
    check('keyboard A walks left', (await snap()).mx === -1);
    await page.keyboard.up('a'); await sleep(100);
    await page.keyboard.down('s');
    s = await until((x) => x.st === 'guard', 800);
    check('keyboard S guards', s.st === 'guard', s.st);
    await page.keyboard.up('s'); await sleep(150);
    await page.keyboard.down('l'); await sleep(450);
    check('keyboard L charges', (await snap()).charging);
    await page.keyboard.up('l'); await sleep(200);
    check('keyboard L release fires', (await snap()).usage.charge === u.charge + 1);
    await sleep(300); await idle();
    await page.keyboard.down('Space'); await sleep(120); await page.keyboard.up('Space'); await sleep(100);
    check('keyboard SPACE blinks', (await snap()).usage.blink === u.blink + 1);
    await idle();
    await page.keyboard.down('ArrowUp'); await sleep(100); await page.keyboard.up('ArrowUp'); await sleep(100);
    check('keyboard ↑ jumps', (await snap()).usage.jump === u.jump + 1);
    await sleep(900); await idle();

    section = 'B·focus';
    await setP1({ mp: 'max' });
    u = (await snap()).usage; x0 = (await snap()).cnt.cancel;
    await page.keyboard.down('l'); await sleep(300);
    check('keyboard charge before blur', (await snap()).charging);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    s = await until((x) => !x.charging, 800);
    check('window blur mid-charge → cancelled, not fired', !s.charging && s.usage.charge === u.charge && s.cnt.cancel === x0 + 1, [s.usage.charge - u.charge, s.cnt.cancel - x0]);
    await page.keyboard.up('l');
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await sleep(150); await idle();
    await setP1({ mp: 'max' });
    u = (await snap()).usage; x0 = (await snap()).cnt.cancel;
    down('right', 'zr'); await sleep(300);
    check('Joy-Con charge before hiding the page', (await snap()).charging);
    const setHidden = (h) => page.evaluate((hid) => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => hid });
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hid ? 'hidden' : 'visible') });
      document.dispatchEvent(new Event('visibilitychange'));
    }, h);
    await setHidden(true); await sleep(500);
    await setHidden(false);
    s = await until((x) => !x.charging, 800);
    check('page hidden mid-charge → cancelled on return, not fired', !s.charging && s.usage.charge === u.charge && s.cnt.cancel === x0 + 1, [s.usage.charge - u.charge, s.cnt.cancel - x0]);
    await sleep(300);
    check('ZR still held after return: ignored', !(await snap()).held.charge);
    up('right', 'zr'); await sleep(150);
    await tap('right', 'y');
    check('input works normally after return', (await snap()).usage.attack === u.attack + 1);
    await idle();

    section = 'B·restart';
    const ko = () => page.evaluate(() => {
      const sc = window.__scene; window.__noKo = false; sc.round = sc.oppQueue.length - 1; sc._ko(sc.p2);
    });
    const conns0 = A.conns;
    await ko();
    s = await until((x) => x.phase === 'over' && x.rsTip > 0.1, 2500);
    check('over: ↻ and「＋ 重开」appear without a mouse', s.phase === 'over' && s.rsTip > 0.1, [s.phase, s.rsTip]);
    let r0 = s.cnt.restart, cf0 = s.cnt.confirm;
    down('right', 'plus');
    s = await until((x) => x.phase === 'select', 2000);
    await sleep(400);                                            // keep ＋ held on the new select screen
    s = await snap();
    check('＋ restarts to the select screen', s.phase === 'select' && s.cnt.restart === r0 + 1, [s.phase, s.cnt.restart - r0]);
    check('held ＋ does not also confirm on the new screen', s.cnt.confirm === cf0, s.cnt.confirm - cf0);
    check('one action layer, four subscriptions', s.live === 1 && s.subs === 4, [s.live, s.subs]);
    up('right', 'plus'); await sleep(150);
    for (let i = 0; i < 3; i++) {
      await tap('right', 'a', 150);
      s = await until((x) => x.phase === 'fight', 1500);
      await ko();
      await until((x) => x.phase === 'over', 2500);
      await tap('right', 'plus', 150);
      s = await until((x) => x.phase === 'select', 2000);
    }
    check('3 more restart cycles: exactly 3 confirms and 3 restarts', s.cnt.confirm === cf0 + 3 && s.cnt.restart === r0 + 4, [s.cnt.confirm - cf0, s.cnt.restart - r0]);
    check('still one action layer, four subscriptions', s.live === 1 && s.subs === 4, [s.live, s.subs]);
    check('scene restarts reuse the socket (no reconnect)', A.conns === conns0 && s.jc, [conns0, A.conns]);

    section = 'B·protocol';
    send({ v: 1, type: 'hello', data: {} });
    s = await until((x) => /协议不符/.test(x.label || ''), 800);
    check('v1 envelope is rejected and reported', /协议不符/.test(s.label), s.label);

    section = 'B·errors';
    check('no console/page errors during the whole run', errors.length === 0, errors);
  } finally {
    clearInterval(pump);
    await page.close();
  }
  return A;
}

async function partC(browser, base, url) {
  section = 'C·live';
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${base}/BladeTrinity/index.html?joycon=${encodeURIComponent(url)}`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__scene && window.__scene._in, null, { timeout: 15000 });
  await page.evaluate(INSTRUMENT);
  await page.evaluate(() => {
    const L = window.__live = { frames: { left: 0, right: 0 }, press: {}, release: {}, online: { left: false, right: false }, pressed: {}, hello: null, tl: [] };
    const c = window.JoyCon2.shared();
    const t0 = performance.now(), T = () => Math.round(performance.now() - t0);
    c.on('frame', (e) => L.frames[e.controller]++);
    c.on('press', (e) => { const k = e.controller + '.' + e.button; L.press[k] = (L.press[k] || 0) + 1; L.tl.push([T(), 'press', k]); });
    c.on('release', (e) => { const k = `${e.controller}.${e.button}:${e.reason}`; L.release[k] = (L.release[k] || 0) + 1; L.tl.push([T(), 'release', k]); });
    c.on('device', (d) => { if (d.online) L.online[d.controller] = true; L.tl.push([T(), 'device', `${d.controller}:${d.online ? 'online' : 'offline'}(${d.connection})`]); });
    c.on('adapter', (a) => { if (a.hello) L.hello = a.hello; });
    const o = BT.Input.prototype.update;
    BT.Input.prototype.update = function () {
      o.call(this);
      for (const a of this.acts) if (this._pressed[a.name]) {
        L.pressed[a.name] = (L.pressed[a.name] || 0) + 1;
        L.tl.push([T(), 'ACTION', a.name]);
      }
    };
  });
  const secs = Number(flags['live-seconds'] || 25);
  console.log(`  …listening to ${url} for ${secs}s`);
  await sleep(secs * 1000);
  const before = await page.evaluate(() => JSON.parse(JSON.stringify({ L: window.__live, cnt: window.__cnt, phase: window.__scene.phase, label: window.__scene._jcLabel.text })));
  await page.evaluate(() => window.JoyCon2.closeShared());      // transport close → everything released
  await sleep(200);
  const L = await page.evaluate(() => JSON.parse(JSON.stringify(window.__live)));
  const presses = Object.values(L.press).reduce((a, b) => a + b, 0);
  const releases = Object.values(L.release).reduce((a, b) => a + b, 0);
  console.log('  hello:', JSON.stringify(before.L.hello));
  console.log('  frames:', JSON.stringify(before.L.frames), ' online seen:', JSON.stringify(before.L.online));
  console.log('  presses:', JSON.stringify(before.L.press));
  console.log('  releases:', JSON.stringify(L.release));
  console.log('  action edges:', JSON.stringify(before.L.pressed), ' menu calls:', JSON.stringify(before.cnt), ' phase:', before.phase);
  console.log('  last status line:', before.label);
  // around every abnormal release: what the controller did and which game actions fired
  const tl = before.L.tl;
  tl.forEach(([t, kind, what], i) => {
    if (kind !== 'release' || what.endsWith(':input')) return;
    console.log(`  timeline around ${what} @${t}ms:`);
    for (const [tt, k, w] of tl.slice(Math.max(0, i - 3), i + 12)) console.log(`     ${String(tt).padStart(6)}  ${k.padEnd(7)} ${w}`);
  });
  check('adapter hello received', !!before.L.hello);
  check('at least one controller came online', before.L.online.left || before.L.online.right, before.L.online);
  check('button presses arrived', presses > 0, presses);
  check('after socket close every press has a release', presses === releases, { presses, releases });
  const menuEdges = (before.L.pressed.menuLeft || 0) + (before.L.pressed.menuRight || 0) + (before.L.pressed.menuUp || 0) + (before.L.pressed.menuDown || 0);
  const frames = before.L.frames.left + before.L.frames.right;
  check('menu edges are far fewer than frames (no per-packet repeat)', menuEdges * 10 < Math.max(frames, 1), { menuEdges, frames });
  check('no console/page errors', errors.length === 0, errors);
  await page.close();
}

(async () => {
  // --parts=A,B,C picks sections (default A,B, plus C when --adapter is given)
  const parts = String(flags.parts || ('A,B' + (flags.adapter ? ',C' : ''))).toUpperCase().split(',');
  if (parts.includes('A')) await partA();
  const srv = await serve();
  const browser = await launch();
  const base = `http://127.0.0.1:${srv.port}`;
  try {
    if (parts.includes('B')) await partB(browser, base);
    if (parts.includes('C')) await partC(browser, base, String(!flags.adapter || flags.adapter === true ? 'ws://127.0.0.1:8765' : flags.adapter));
  } finally {
    await browser.close();
    srv.close();
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed` + (failed.length ? `; FAILED: ${failed.map((f) => f.section + ' · ' + f.name).join(' | ')}` : ''));
  console.log('(software checks with a mocked/replayed adapter — not a hardware acceptance)');
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
