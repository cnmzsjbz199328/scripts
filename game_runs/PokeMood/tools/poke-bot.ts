/**
 * PokeMood 专用验证 bot。
 *
 * 为什么不用 skills/game-playtest：那套 bot 是为"能不能通关 / 会不会卡死"设计的，
 * 本游戏是 toy，没有 won 条件，那道门不适用（DESIGN §0、§6.2）。
 * 这里改成断言这个玩具真正该保证的东西：
 *   1. 七个区域都不是哑区
 *   2. 三种手势都能触发
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
