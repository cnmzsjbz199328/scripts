/**
 * PokeMood 专用验证 bot。
 *
 * 为什么不用 skills/game-playtest：那套 bot 是为"能不能通关 / 会不会卡死"设计的，
 * 本游戏是 toy，没有 won 条件，那道门不适用（DESIGN §0、§6.2）。
 * 这里改成断言这个玩具真正该保证的东西：
 *   1. 七个区域都不是哑区
 *   2. 三种手势都能触发
 *   2.5 反应优先级：连戳次数=等级（跨区域共享）、静场回落、高抢低、同级排队、配音不交叉、
 *       真实节奏（等她演完再戳）下阶梯照样爬、情绪待机段不吞触碰、封顶溢出走惩罚出口
 *   3. 情绪能被推到生气 → 惩罚 → 哭，且**能自己解锁回 NEUTRAL**（防死锁）
 *   4. 真实指针路径的坐标映射没错（__poke 绕过了输入层，得单独验一次）
 *   5. 点在角色身体外**不产生反应**（人体闸门生效）
 *   6. 全程零 console.error / pageerror
 *
 * 用法：npx tsx game_runs/PokeMood/tools/poke-bot.ts [--headed]
 * 退出码：0 全绿 / 1 有失败
 */
import { chromium, type Page } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

const GAME_RUNS = path.resolve(process.cwd(), 'game_runs');
const OUT_DIR = path.join(GAME_RUNS, 'PokeMood', 'bot');

const MIME: Record<string, string> = {
  '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.webp': 'image/webp', '.css': 'text/css',
};

function startServer(): Promise<{ port: number; close: () => void }> {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      let fp = path.join(GAME_RUNS, urlPath);
      if (!fp.startsWith(GAME_RUNS)) { res.statusCode = 403; return res.end(); }
      if (fs.existsSync(fp) && fs.statSync(fp).isDirectory()) fp = path.join(fp, 'index.html');
      if (!fs.existsSync(fp)) { res.statusCode = 404; return res.end('not found'); }
      res.setHeader('Content-Type', MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream');
      fs.createReadStream(fp).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as any).port;
      resolve({ port, close: () => server.close() });
    });
  });
}

type Check = { name: string; pass: boolean; detail: string };
const checks: Check[] = [];
const ok = (name: string, pass: boolean, detail = '') => {
  checks.push({ name, pass, detail });
  console.log(`${pass ? '  ✓' : '  ✗'} ${name}${detail ? '  — ' + detail : ''}`);
};

const probe = (p: Page) => p.evaluate(() => (window as any).__probe());
const poke = (p: Page, r: string, g = 'tap') =>
  p.evaluate(([r, g]) => (window as any).__poke(r, g), [r, g]);

async function main() {
  const headed = process.argv.includes('--headed');
  const srv = await startServer();
  const browser = await chromium.launch({ headless: !headed });
  const page = await browser.newPage({ viewport: { width: 1000, height: 820 } });

  const errors: string[] = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('requestfailed', r => errors.push('requestfailed: ' + r.url()));

  fs.mkdirSync(OUT_DIR, { recursive: true });
  await page.goto(`http://127.0.0.1:${srv.port}/PokeMood/index.html?autostart`);

  // 等玩法场景起来（核心图集加载完）
  await page.waitForFunction(() => (window as any).__probe?.().started === true, null,
    { timeout: 45_000 });
  ok('启动', true, `核心图集 ${(await probe(page)).loaded} 张`);

  const REGIONS = ['head', 'chest', 'belly', 'armL', 'armR', 'legL', 'legR'];

  // ── 1. 七区无哑区 ────────────────────────────────────────
  const dead: string[] = [];
  for (const r of REGIONS) {
    const before = (await probe(page)).reactionsPlayed;
    const ev = await poke(page, r, 'tap');
    const after = await probe(page);
    if (!ev || after.lastRegion !== r || after.reactionsPlayed <= before) dead.push(r);
    await page.waitForTimeout(120);
  }
  ok('七个区域都有反应', dead.length === 0, dead.length ? '哑区: ' + dead.join(',') : '7/7');
  await page.screenshot({ path: path.join(OUT_DIR, '01-regions.png') });

  // ── 2. 三种手势 ─────────────────────────────────────────
  const gDead: string[] = [];
  for (const g of ['tap', 'hold', 'rub']) {
    const before = (await probe(page)).reactionsPlayed;
    await poke(page, 'head', g);
    if ((await probe(page)).reactionsPlayed <= before) gDead.push(g);
    await page.waitForTimeout(100);
  }
  ok('三种手势都能触发', gDead.length === 0, gDead.length ? '失效: ' + gDead.join(',') : 'tap/hold/rub');

  /* ── 2.5 反应优先级（DESIGN §1.3 连击阶梯 + §1.4 表演优先级）──────
   * 这一组是 v2 的重点：等级看不看得出来，全看这四条。 */

  // 静场：等表演落幕 + 连击窗口过期，回到"下一戳是 tier1"的干净状态
  const settle = async () => {
    await page.waitForFunction(
      () => { const p = (window as any).__probe(); return !p.locked && p.combo === 0; },
      null, { timeout: 25_000 });
  };

  /* 复位她的心情与耐心。优先级这几条测的是调度，不该受前面几十次触碰累积的耐心损耗影响
   * ——耐心掉到 50 以下后 tier3 直接跳惩罚（tier4），排队/抢占的断言就会假阴性。 */
  const freshen = async () => {
    await page.evaluate(() => {
      const s = (window as any).__scene;
      s._stopVoice();
      s._fadeBubble(60);
      s.perform = null;
      s.pending = null;
      s.char.anims.timeScale = 1;
      Object.assign(s.state, {
        mood: 'NEUTRAL', moodUntil: 0, patience: 100,
        combo: 0, comboUntil: 0, soothStreak: 0,
      });
    });
  };

  // ① 连戳次数 = 等级，且连击跨区域共享
  await freshen();
  const ladder: number[] = [];
  ladder.push((await poke(page, 'head', 'tap'))?.tier);
  ladder.push((await poke(page, 'armL', 'tap'))?.tier);   // 换个区域，阶梯应继续往上
  ladder.push((await poke(page, 'legL', 'tap'))?.tier);
  ok('连戳 1/2/3 下 → tier 1/2/3（且跨区域共享）',
    ladder.join(',') === '1,2,3', 'tier: ' + ladder.join(' → '));

  // ② 静场后回落到 tier1
  await settle();
  const afterLull = (await poke(page, 'head', 'tap'))?.tier;
  ok('静场后连击断档，回落 tier1', afterLull === 1, 'tier: ' + afterLull);

  // ③ 高等级抢占低等级：低的先进入"快速收尾"，随后高的上场
  await freshen();
  await poke(page, 'head', 'tap');                       // tier1 开演
  await page.waitForTimeout(60);
  const t1 = await probe(page);
  await poke(page, 'head', 'tap');                       // tier2 来抢
  const mid = await probe(page);
  await page.waitForTimeout(500);                        // 收尾封顶 380ms
  const t2 = await probe(page);
  ok('高等级抢占低等级（收尾归位后上场）',
    t1.playingTier === 1 && (mid.aborting || mid.playingTier === 2) && t2.playingTier === 2,
    `演 tier${t1.playingTier} → ${mid.aborting ? '收尾中' : 'tier' + mid.playingTier} → tier${t2.playingTier}`);

  // ④ 同等级排队：tier3 封顶后再戳，进排队槽而不是被丢掉
  await freshen();
  const qTiers: any[] = [];
  for (let i = 0; i < 4; i++) qTiers.push((await poke(page, 'chest', 'tap'))?.tier);  // 1,2,3,3
  const queued = await probe(page);
  ok('同等级排队（不丢触碰）', queued.queuedTier >= 3 || queued.playingTier >= 3,
    `戳出 tier ${qTiers.join('/')} → 演 tier${queued.playingTier} / 排队 tier${queued.queuedTier}`);

  /* ⑤ 配音不交叉：抢占时旧语音必须**立刻停**。
   * 直接数缓存里"还在响"的元素个数 —— 世代号写错、监听器没摘、play() promise 诈尸，
   * 三种写法都会在这里露出第二条同时在响的语音。 */
  let maxConcurrent = 0;
  for (let i = 0; i < 12; i++) {
    await poke(page, REGIONS[i % REGIONS.length], 'tap');
    const n = await page.evaluate(() => {
      const cache = (window as any).__scene?._voiceCache;
      if (!cache) return 0;
      let n = 0;
      for (const a of cache.values()) if (!a.paused && !a.ended) n++;
      return n;
    });
    maxConcurrent = Math.max(maxConcurrent, n);
    await page.waitForTimeout(90);
  }
  ok('配音同时只响一条（无交叉说话）', maxConcurrent <= 1, `峰值并发 ${maxConcurrent}`);
  await settle();

  /* ⑥ 真实节奏下的阶梯：**等她把整段演完（含配音）再戳**，连击仍应往上爬。
   * ① 那条是连点，等于只覆盖了"表演还没结束"这一种节奏 —— 而恰恰是另一种节奏出过 bug：
   * 连击窗口只在 _endPerform 续期，但 combo 早在演到 COMBO_WINDOW_MS 时就被 step 清零了，
   * 续期的 combo>0 守卫不成立，于是听完整句再戳永远是 tier1（阶梯形同虚设）。 */
  await freshen();
  const paced: number[] = [];
  for (let i = 0; i < 3; i++) {
    paced.push((await poke(page, 'head', 'tap'))?.tier);
    await page.waitForFunction(() => !(window as any).__probe().locked, null, { timeout: 25_000 });
  }
  ok('听完整段再戳依然算连击（真实节奏阶梯）',
    paced.join(',') === '1,2,3', 'tier: ' + paced.join(' → '));
  await settle();

  /* ⑦ 情绪待机段不吞触碰。重反应后角色会循环播情绪动画（生气/哭的姿态），
   * 那是"她现在的样子"而非对某次触碰的回应，等级 0，任何真触碰都该抢占它。
   * 曾经它按 tier3 记账：重反应后的整个 MOOD_HOLD_MS 里，玩家戳前两下全被吞成微反馈，
   * combo 却在闷涨 —— 体感是"她生完气有两下没反应，然后突然又炸了"。
   * 白盒构造：真实素材下情绪窗口可能在长配音演完前就过了，等不到这个状态。 */
  await freshen();
  const rest = await page.evaluate(() => {
    const s = (window as any).__scene;
    s.perform = null; s.pending = null;
    s.state.mood = 'ANGRY';
    s.state.moodUntil = s.time.now + 4000;
    s.state.combo = 0; s.state.comboUntil = 0;
    s._restAnim();
    const resting = !!(s.perform && s.perform.rest);
    const before = s.state.reactionsPlayed;
    const ev = s.poke('legL', 'tap');
    return {
      resting, tier: ev.tier,
      played: s.state.reactionsPlayed > before,
      preempted: !!(s.perform && (s.perform.phase === 'abort' || !s.perform.rest)),
    };
  });
  ok('情绪待机段不吞低级触碰（tier1 也抢得走）',
    rest.resting && rest.tier === 1 && rest.played && rest.preempted,
    rest.resting ? `tier${rest.tier} / ${rest.preempted ? '已抢占' : '被吞'}` : '没能构造出待机段');
  await settle();

  /* ⑧ 封顶溢出 → 惩罚出口。tier3 是顶，且每区域 tier3 只有一个变体：
   * 没有出口的话，连戳到顶之后就是同一段反应背靠背重演。COMBO_PUNISH_AT 负责收口。
   * 耐心复位到 100，所以走到惩罚只可能是"封顶溢出"这条路，不是"耐心见底"那条。 */
  await freshen();
  const climb: string[] = [];
  let overflowPunish = false;
  for (let i = 0; i < 6 && !overflowPunish; i++) {
    const ev: any = await poke(page, REGIONS[i % REGIONS.length], 'tap');
    climb.push(ev?.punish ? '惩罚' : 'tier' + ev?.tier);
    if (ev?.punish) overflowPunish = true;
    await page.waitForTimeout(70);
  }
  ok('连击封顶后升级为惩罚出口（不原地重演 tier3）', overflowPunish, climb.join(' → '));
  await settle();

  // ── 3. 情绪升级：戳到生气 → 惩罚 → 哭 ─────────────────────
  const seen = new Set<string>();
  let punished = false;
  for (let i = 0; i < 60; i++) {
    const ev = await poke(page, 'chest', 'tap');
    if (ev?.punish) punished = true;
    const st = await probe(page);
    seen.add(st.mood);
    if (st.mood === 'CRY') break;
    await page.waitForTimeout(70);
  }
  ok('能戳到生气 ANGRY', seen.has('ANGRY'), '经历过: ' + [...seen].join(' → '));
  ok('能戳到哭 CRY', seen.has('CRY'));
  ok('触发过终极惩罚（泼水）', punished);
  await page.screenshot({ path: path.join(OUT_DIR, '02-cry.png') });

  // ── 4. 防死锁：哭完必须自己回 NEUTRAL ──────────────────────
  const t0 = Date.now();
  let recovered = false;
  while (Date.now() - t0 < 12_000) {
    const st = await probe(page);
    if (st.mood === 'NEUTRAL' && !st.locked) { recovered = true; break; }
    await page.waitForTimeout(250);
  }
  ok('哭泣后自动解锁回 NEUTRAL（防死锁）', recovered,
    recovered ? `${((Date.now() - t0) / 1000).toFixed(1)}s` : '超过 12s 仍未恢复');

  // 解锁后还能继续玩
  const beforeAlive = (await probe(page)).reactionsPlayed;
  await poke(page, 'belly', 'tap');
  ok('解锁后仍能继续触碰', (await probe(page)).reactionsPlayed > beforeAlive);

  // ── 5. 真实指针路径（__poke 绕过了输入层，坐标映射得单独验）──
  const geom = await page.evaluate(() => {
    const C = (window as any).PM.Config;
    const R = (window as any).PM.REGIONS.head;
    const cv = document.querySelector('canvas')!.getBoundingClientRect();
    const sx = cv.width / C.WIDTH, sy = cv.height / C.HEIGHT;
    const fx = C.CHAR_X - C.FRAME_W / 2 + (R.x + R.w / 2) * C.FRAME_W;
    const fy = C.CHAR_Y + (R.y + R.h / 2) * C.FRAME_H;
    return { x: cv.left + fx * sx, y: cv.top + fy * sy,
             outX: cv.left + 40 * sx, outY: cv.top + 120 * sy };
  });
  await page.waitForTimeout(400);
  const beforeReal = await probe(page);
  await page.mouse.move(geom.x, geom.y);
  await page.mouse.down();
  await page.waitForTimeout(60);
  await page.mouse.up();
  await page.waitForTimeout(200);
  const afterReal = await probe(page);
  ok('真实指针点到头部区域', afterReal.reactionsPlayed > beforeReal.reactionsPlayed &&
     afterReal.lastRegion === 'head', `lastRegion=${afterReal.lastRegion}`);

  // ── 6. 人体闸门：点在角色身体外不该有反应 ────────────────
  await page.waitForTimeout(600);
  const beforeOut = (await probe(page)).reactionsPlayed;
  await page.mouse.move(geom.outX, geom.outY);
  await page.mouse.down(); await page.waitForTimeout(50); await page.mouse.up();
  await page.waitForTimeout(200);
  const afterOut = (await probe(page)).reactionsPlayed;
  ok('点在角色身体外无反应（人体闸门）', afterOut === beforeOut,
    afterOut === beforeOut ? '静默 ✓' : '空白处也触发了反应');

  // ── 7. 后台图集补齐 ─────────────────────────────────────
  await page.waitForFunction(() => (window as any).__probe().allLoaded === true, null,
    { timeout: 90_000 }).catch(() => {});
  const fin = await probe(page);
  ok('剩余图集后台加载完成', !!fin.allLoaded, `已加载 ${fin.loaded} 张`);

  ok('零运行时错误', errors.length === 0, errors.slice(0, 3).join(' | '));

  await page.screenshot({ path: path.join(OUT_DIR, '03-final.png') });

  const failed = checks.filter(c => !c.pass);
  fs.writeFileSync(path.join(OUT_DIR, 'poke-report.json'),
    JSON.stringify({ pass: failed.length === 0, checks, errors, probe: fin }, null, 2));

  console.log(failed.length === 0
    ? `\n✅ PokeMood poke-bot 全绿（${checks.length} 项）`
    : `\n❌ ${failed.length}/${checks.length} 项失败`);

  await browser.close();
  srv.close();
  process.exit(failed.length ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
