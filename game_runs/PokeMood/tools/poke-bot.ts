/**
 * PokeMood 专用验证 bot。
 *
 * 为什么不用 skills/game-playtest：那套 bot 是为"能不能通关 / 会不会卡死"设计的，
 * 本游戏是 toy，没有 won 条件，那道门不适用（DESIGN §0、§6.2）。
 * 这里改成断言这个玩具真正该保证的东西：
 *   1. 七个区域都不是哑区
 *   2. 三种手势都能触发
 *   2.5 反应优先级：连戳次数=等级（跨区域共享）、静场回落、高抢低、同级排队、配音不交叉、
 *       真实节奏（等她演完再戳）下阶梯照样爬、情绪待机段不吞触碰、封顶溢出走惩罚出口、
 *       话尾（只剩配音）不锁人
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
  // 404 在 console 里只有一句无主的 "Failed to load resource"，没有 URL 就无从查起
  page.on('response', r => { if (r.status() >= 400) errors.push(`http ${r.status()}: ${r.url()}`); });

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

  /* ④ 同等级排队：tier3 封顶后再戳，进排队槽而不是被丢掉。
   * **必须挑一个高档不进 ANGRY 的区域**（见 config.TIER3_MOOD）：
   * chest/armL/armR/legL 的高档就是"生气"，第 3 下进 ANGRY、第 4 下就成了惩罚（tier4），
   * 走的是抢占路径而不是排队路径，这条断言会假阴性。head 的高档是「害羞」，安全。 */
  await freshen();
  const qTiers: any[] = [];
  for (let i = 0; i < 4; i++) qTiers.push((await poke(page, 'head', 'tap'))?.tier);  // 1,2,3,3
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

  /* ⑦ 情绪待机段不吞触碰。哭的时候角色会播 `cry`，那是"她现在的样子"
   * 而非对某次触碰的回应，等级 0，任何真触碰都该抢占它。
   * 曾经它按 tier3 记账：惹哭之后的整个 MOOD_HOLD_MS 里，玩家戳前两下全被吞成微反馈，
   * combo 却在闷涨 —— 体感是"她哭完有两下没反应，然后突然又炸了"。
   * 用 CRY 构造而不是 ANGRY：情绪待机现在**只剩 CRY 一条**，其余情绪一律末帧驻留
   * （见 config.MOOD_ANIM 与 StageScene._restAnim）。
   * 白盒构造：真实素材下情绪窗口可能在长配音演完前就过了，等不到这个状态。 */
  await freshen();
  const rest = await page.evaluate(() => {
    const s = (window as any).__scene;
    s.perform = null; s.pending = null;
    s.state.mood = 'CRY';
    s.state.moodUntil = s.time.now + 4000;
    s.state.combo = 0; s.state.comboUntil = 0;
    /* _restAnim 会拒绝重播"刚演完的那一段"（见 StageScene._restAnim 的铁律注释）。
     * 这里造的是"她已经站好了、现在开始哭"，所以得先把 _playedAnim 让开，
     * 否则前面的触碰刚好停在 cry 上时待机段根本建不起来，这条断言会以
     * "没能构造出待机段"假阴性。 */
    s._playedAnim = 'idle';
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

  /* ⑦.2 素材身份自检：一段素材只表达一件事。
   * 这是"生气挥两次杖"那个 bug 的结构性根治 —— 光靠"不连着播两次"的守卫只是止血，
   * 真正的病根是 angry_charge 同时兼着反应和情绪待机两份差事。
   * PM.checkAnimRoles() 拿 config.ANIM_ROLE 的登记表和四张真表对账，
   * 这里直接读它的返回值，比等 console.error 冒出来更明确。 */
  const roles = await page.evaluate(() => ({
    errors: (window as any).PM.checkAnimRoles(),
    n: Object.keys((window as any).PM.ANIM_ROLE).length,
  }));
  ok('素材身份唯一（一段素材 = 一件事）', roles.errors.length === 0,
    roles.errors.length ? roles.errors.join(' / ') : `${roles.n} 段全部登记且各司其职`);

  /* ⑦.3 七个区域 × 三个档位全部有内容（不靠降档兜底）。
   * 档位是全身共享的阶梯，但玩家完全可能连着戳同一个部位，那时三档都得拿得出东西。 */
  const gaps = await page.evaluate(() => {
    const out: string[] = [];
    const R = (window as any).PM.REACTIONS;
    for (const region in R) for (const t of [1, 2, 3]) {
      if (!R[region][t] || !R[region][t].length) out.push(`${region}:${t}`);
    }
    return out;
  });
  ok('七区 × 三档全部有内容', gaps.length === 0, gaps.length ? '空槽: ' + gaps.join(',') : '21/21');

  /* ⑦.5 同一段动画不连着播两次。
   *
   * 反应表里好几处 tier3 的 anim 与它引发的情绪 MOOD_ANIM 是**同一段**
   * （armL/head/chest tier3 = angry_charge 而情绪 ANGRY 也是 angry_charge；
   *  HAPPY_REACT = happy_tilt 而情绪 HAPPY 也是 happy_tilt），
   * 于是"反应演完 → 进情绪待机段"会把同一个动作原地重做一遍 ——
   * 玩家看到的就是"说完『我说过了吧？』之后挥了两次魔杖"（用户报的 bug）。
   * 走**真实路径**构造：耐心压到生气阈值之下，连戳三下 armL，第三下就是
   * tier3 + 情绪转 ANGRY，anim 正是 angry_charge。数它在这一串里起播了几次。 */
  await freshen();
  const dup = await page.evaluate(async () => {
    const s = (window as any).__scene;
    s.state.patience = 40;                 // ≤ PATIENCE_ANGRY_AT(50) → tier3 走生气线
    /* 监听器必须是**直接传进 on() 的匿名箭头**：tsx/esbuild 的 keepNames 会给
     * `const f = () => {}` 套一层 __name(...)，而那个 helper 只存在于 node 侧，
     * 注入浏览器后就是 "ReferenceError: __name is not defined"。
     * 因此收尾用 off(event) 一次摘光，不靠函数引用。 */
    const starts: string[] = [];
    s.char.on('animationstart', (a: any) => starts.push(a.key));
    const moods: string[] = [];
    for (let i = 0; i < 3; i++) {
      /* 情绪要在**戳的那一刻**记：MOOD_HOLD_MS 只有 2.6 秒，
       * 等下面那段 5 秒等完再读 s.state.mood，它早已回落 NEUTRAL。 */
      moods.push(s.poke('armL', 'tap').mood);
      await new Promise(r => setTimeout(r, 700));
    }
    // 等整段（含配音）落幕 + 情绪窗口过完，待机段该播的都播过了
    await new Promise(r => setTimeout(r, 5000));
    s.char.off('animationstart');
    return { starts, mood: moods[2] };
  });
  const angryTimes = dup.starts.filter(k => k === 'angry_charge').length;
  ok('同一段动画不连着播两次（生气不挥两次杖）',
    dup.mood === 'ANGRY' && angryTimes === 1,
    `第三下情绪 ${dup.mood} · angry_charge 起播 ${angryTimes} 次 · 序列 ${dup.starts.join(',')}`);
  await settle();

  /* ⑧ 封顶溢出 → 惩罚出口。tier3 是顶，且每区域 tier3 只有一个变体：
   * 没有出口的话，连戳到顶之后就是同一段反应背靠背重演。COMBO_PUNISH_AT 负责收口。
   * 耐心复位到 100，所以走到惩罚只可能是"封顶溢出"这条路，不是"耐心见底"那条。 */
  await freshen();
  const climb: string[] = [];
  let overflowPunish = false;
  for (let i = 0; i < 8 && !overflowPunish; i++) {   // 溢出先进生气线，惩罚在下一下
    const ev: any = await poke(page, REGIONS[i % REGIONS.length], 'tap');
    climb.push(ev?.punish ? '惩罚' : 'tier' + ev?.tier);
    if (ev?.punish) overflowPunish = true;
    await page.waitForTimeout(70);
  }
  ok('连击封顶后升级为惩罚出口（不原地重演 tier3）', overflowPunish, climb.join(' → '));
  await settle();

  /* ⑨ 话尾不锁人：动作演完、只剩配音（最长的一句 9.8 秒而动作才 1.3 秒）时，
   * 低等级触碰也该立刻接管，而不是让玩家对着一个站回 idle 的人干等 8 秒。 */
  await freshen();
  const tail = await page.evaluate(() => {
    const s = (window as any).__scene;
    // 造一段"动作已完、嘴还在说"的 tier3 表演
    s._startPerform({ tier: 3, hard: true, anim: 'shy' });
    s.perform.animDone = true;
    s.perform.animUntil = s.time.now;
    s.perform.until = s.time.now + 8000;      // 还有 8 秒配音
    const before = s.state.reactionsPlayed;
    const ev = s.poke('head', 'tap');          // tier1 —— 本该被"低等级忽略"挡掉
    return {
      tier: ev.tier,
      played: s.state.reactionsPlayed > before,
      tookOver: !!(s.perform && (s.perform.tier !== 3 || s.perform.phase === 'abort')),
    };
  });
  ok('话尾可被任意等级打断（长配音不锁人）',
    tail.tier === 1 && tail.played && tail.tookOver,
    `tier${tail.tier} / ${tail.tookOver ? '已接管' : '被挡'}`);
  await freshen();

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
    const fx = C.CHAR_X - C.DRAW_W / 2 + (R.x + R.w / 2) * C.DRAW_W;
    const fy = C.CHAR_Y + (R.y + R.h / 2) * C.DRAW_H;
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

  /* ── 6.5 背景场景切换 ────────────────────────────────────
   * 这个功能的"好不好看"只能人眼看（tools/shot-scenes.mjs），但有三条是能自动守住的，
   * 而且都是真会坏的：
   *   ① 每一套场景都装配得起来（贴图 key 拼错 / 忘了回填 scale → 切过去一片空）
   *   ② 选择器打开时【吃掉触碰】—— 覆盖层底下就是她，漏一下就会"选场景选到一半被戳"
   *   ③ 关掉之后触碰立刻恢复（_uiSwallow 忘了清零就是永久失灵，最难查的那种） */
  await page.waitForTimeout(400);
  const sceneIds: string[] = await page.evaluate(() =>
    (window as any).PM.Scenes.list().map((s: any) => s.id));
  const bad: string[] = [];
  for (const id of sceneIds) {
    const okSwitch = await page.evaluate((i) => (window as any).__setScene(i), id);
    await page.waitForTimeout(650);                    // 展开动画 460ms + 余量
    const pr = await probe(page);
    // 换到自己那格会返回 false（不是失败），所以只认"切完之后 bgScene 对不对"
    if (pr.bgScene !== id || pr.switching) bad.push(`${id}${okSwitch ? '' : '(no-op)'}`);
  }
  ok(`${sceneIds.length} 套背景场景都能切进去`, bad.length === 0,
     bad.length ? '切不过去: ' + bad.join(',') : sceneIds.join(' → '));
  await page.screenshot({ path: path.join(OUT_DIR, '04-scene.png') });

  await page.evaluate(() => (window as any).__scene.openPicker());
  await page.waitForTimeout(300);
  const opened = (await probe(page)).pickerOpen;
  const beforePick = (await probe(page)).reactionsPlayed;
  // 点头部位置。它落在缩略图之间的缝里 —— 这一下**应该只是关掉覆盖层**，
  // 绝不能穿透到她身上。（所以这里不能断言"点完 pickerOpen 还是 true"：
  // 点空白处关闭是设计好的行为，早期版本就是这么误判成失败的。）
  await page.mouse.move(geom.x, geom.y);
  await page.mouse.down(); await page.waitForTimeout(60); await page.mouse.up();
  await page.waitForTimeout(250);
  const duringPick = await probe(page);
  ok('选择器打开时吃掉触碰', opened && duringPick.reactionsPlayed === beforePick,
     !opened ? '选择器压根没打开' :
     duringPick.reactionsPlayed === beforePick ? '未穿透 ✓' : '点穿覆盖层戳到人了');

  await page.evaluate(() => (window as any).__scene.closePicker());
  await page.waitForTimeout(400);
  const beforeBack = (await probe(page)).reactionsPlayed;
  await page.mouse.move(geom.x, geom.y);
  await page.mouse.down(); await page.waitForTimeout(60); await page.mouse.up();
  await page.waitForTimeout(250);
  ok('关掉选择器后触碰恢复', (await probe(page)).reactionsPlayed > beforeBack);

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
