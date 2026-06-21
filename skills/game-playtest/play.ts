/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * game-playtest — 自动试玩 + 录屏 + 白盒指标（共享 skill）
 *
 * 用 Playwright headless 真实加载一个已组装的游戏，驱动一个读取 window.__probe()
 * 的启发式 bot 去"实际尝试通关"，全程录屏(.webm)，并输出结构化指标 JSON。
 *
 *   · 演示：产出一段真实通关录像。
 *   · 白盒自测：bot 走正常策略仍通不了关 / 卡死 / 掉血过多 → 暴露设计与平衡问题
 *     （正是"有些游戏因设计不合理而通关难度极大"要抓的东西）。
 *
 * 前置契约：游戏需在 create() 暴露 window.__probe()（坐标/血量/目标/危险判定）与
 *           window.__advanceCard()（推进剧情卡）。bot 据此决策；未暴露则退化为"一路向右"。
 *
 * 用法：
 *   npx tsx skills/game-playtest/play.ts <GameName>
 *     [--seconds=90] [--out=report.json] [--tick=70]
 *
 * 退出码：0 = 通关，1 = 未通关(失败/超时/卡死)，2 = 用法/找不到游戏。
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const GAME_RUNS = path.join(REPO_ROOT, 'game_runs');

// ── args ──────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const positional: string[] = [];
const flags: Record<string, string> = {};
for (const a of argv) {
  if (a.startsWith('--')) { const [k, v] = a.slice(2).split('='); flags[k] = v ?? 'true'; }
  else positional.push(a);
}
const gameName = positional[0];
if (!gameName) { console.error('用法: npx tsx skills/game-playtest/play.ts <GameName> [--seconds=90] [--tick=70] [--out=report.json]'); process.exit(2); }
const gameDir = path.join(GAME_RUNS, gameName);
if (!fs.existsSync(path.join(gameDir, 'index.html'))) { console.error(`找不到 ${path.join(gameDir, 'index.html')}`); process.exit(2); }

const maxSeconds = Number(flags.seconds ?? '90');
const tickMs = Number(flags.tick ?? '70');
const outDir = path.join(gameDir, 'playtest');
fs.mkdirSync(outDir, { recursive: true });

// ── 静态服务器（同 verify：CDN + 相对 fetch 需 http）──────────
const MIME: Record<string, string> = {
  '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.css': 'text/css', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
};
function startServer(): Promise<{ port: number; close: () => void }> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
        let fp = path.join(GAME_RUNS, urlPath);
        if (!fp.startsWith(GAME_RUNS)) { res.statusCode = 403; res.end(); return; }
        if (fs.existsSync(fp) && fs.statSync(fp).isDirectory()) fp = path.join(fp, 'index.html');
        if (!fs.existsSync(fp)) { res.statusCode = 404; res.end('not found'); return; }
        res.setHeader('Content-Type', MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream');
        fs.createReadStream(fp).pipe(res);
      } catch { res.statusCode = 500; res.end('error'); }
    });
    server.listen(0, '127.0.0.1', () => resolve({ port: (server.address() as any).port, close: () => server.close() }));
  });
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

interface Probe {
  x: number; y: number; vx: number; onGround: boolean;
  hp: number; maxHp: number; act: number; score: number; goalScore: number;
  deaths: number; deathBudget: number; won: boolean; lost: boolean;
  cardActive: boolean; started: boolean; nextGoalX: number; worldW: number; cellX: number;
  dangerNow: boolean; dangerAhead: boolean;
}

(async () => {
  let chromium: any;
  try { ({ chromium } = await import('playwright')); }
  catch { console.error('playwright 未安装：npm i -D playwright && npx playwright install chromium'); process.exit(2); }

  const srv = await startServer();
  const url = `http://127.0.0.1:${srv.port}/${gameName}/index.html`;

  const pageErrors: string[] = [];
  let browser: any, context: any;
  const metrics: any = {
    game: gameName, result: 'unknown', durationSec: 0,
    reachedAct: 0, finalScore: 0, hpRemaining: 0, spottedCount: 0, deaths: 0,
    maxX: 0, progressPct: 0, cardsAdvanced: 0, stuck: false,
    runtimeErrors: [] as string[], notes: [] as string[],
  };

  try {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({ viewport: { width: 960, height: 576 }, recordVideo: { dir: outDir, size: { width: 960, height: 576 } } });
    const page = await context.newPage();
    page.on('pageerror', (e: any) => pageErrors.push(e.message));
    page.on('console', (m: any) => { if (m.type() === 'error') pageErrors.push(m.text()); });

    await page.goto(url, { waitUntil: 'load', timeout: 20000 });
    await page.waitForSelector('canvas', { timeout: 8000 });
    await sleep(600);

    // 开始游戏
    await page.evaluate(() => { (window as any).__hudStart?.(); });
    await sleep(400);

    const probe = async (): Promise<Probe | null> => page.evaluate(() => (window as any).__probe?.() ?? null);
    const advanceCard = async () => page.evaluate(() => (window as any).__advanceCard?.());

    // 持键状态管理 + 点按（跳跃/攻击）
    const held: Record<string, boolean> = {};
    const setKey = async (key: string, want: boolean) => {
      if (want === !!held[key]) return;
      held[key] = want;
      if (want) await page.keyboard.down(key); else await page.keyboard.up(key);
    };
    const tap = async (key: string, ms = 80) => { await page.keyboard.down(key); await sleep(ms); await page.keyboard.up(key); };

    const t0 = Date.now();
    let prevHp = -1, prevMaxX = 0, stuckTicks = 0;  // prevHp=-1：首帧只记录不计数
    const stuckLimit = Math.ceil(6000 / tickMs); // ~6s 无进展判卡死（已含计时门合理等待）

    while ((Date.now() - t0) / 1000 < maxSeconds) {
      const p = await probe();
      if (!p) { await sleep(tickMs); continue; }

      // 剧情卡：推进
      if (p.cardActive) {
        await setKey('ArrowRight', false); await setKey('ArrowDown', false);
        await advanceCard();
        metrics.cardsAdvanced++;
        await sleep(tickMs);
        continue;
      }

      // 结局
      if (p.won) { metrics.result = 'win'; metrics.notes.push('bot 成功通关'); }
      if (p.lost) { metrics.result = 'lose'; metrics.notes.push('死亡预算耗尽，bot 失败'); }
      if (p.won || p.lost) { metrics.reachedAct = p.act; metrics.finalScore = p.score; metrics.hpRemaining = p.hp; metrics.deaths = p.deaths; metrics.maxX = Math.max(metrics.maxX, p.x); break; }

      // 指标累计（首帧 prevHp=-1，仅记录不计数；治愈使 hp 上升不计）
      if (prevHp >= 0 && p.hp < prevHp) metrics.spottedCount += (prevHp - p.hp);
      prevHp = p.hp;
      metrics.reachedAct = Math.max(metrics.reachedAct, p.act);
      metrics.finalScore = p.score; metrics.hpRemaining = p.hp; metrics.deaths = p.deaths;
      metrics.maxX = Math.max(metrics.maxX, p.x);

      // 卡死检测
      if (p.x > prevMaxX + 4) { prevMaxX = p.x; stuckTicks = 0; } else stuckTicks++;
      if (stuckTicks > stuckLimit) { metrics.result = 'stuck'; metrics.stuck = true; metrics.notes.push(`坐标在 ~3.5s 内无前进（x≈${p.x.toFixed(0)}），疑似设计死锁或难度墙`); break; }

      // ── bot 决策（通用：按探针语义提示驱动键位，兼容潜行/平台/跑酷等）──
      const P = p as any;
      const goal = P.nextGoalX;
      const wantRight = goal != null ? goal > p.x + 8 : true;   // 默认朝目标/向右
      const wantLeft  = goal != null ? goal < p.x - 8 : false;
      const waitGate = P.gateWaitX != null;                    // 计时门关闭→停下等待
      await setKey('ArrowRight', !waitGate && wantRight);
      await setKey('ArrowLeft',  !waitGate && wantLeft);
      // 蹲伏（潜行隐身 / crouch 提示）
      await setKey('ArrowDown', !!(p.dangerNow || p.dangerAhead || P.crouch));
      // 跳跃（跨缺口 / 够高处）：点按，落地后才会再次起跳
      if (!waitGate && P.needJump && p.onGround) await tap('ArrowUp', 90);
      // 攻击（斩击身前敌人）
      if (P.attack) await tap('j', 60);

      await sleep(tickMs);
    }

    if (metrics.result === 'unknown') { metrics.result = 'timeout'; metrics.notes.push(`${maxSeconds}s 内未分胜负`); }

    await setKey('ArrowRight', false); await setKey('ArrowDown', false);
    await sleep(metrics.result === 'win' ? 1600 : 400); // 结局多录一会

    metrics.durationSec = +((Date.now() - t0) / 1000).toFixed(1);
    metrics.progressPct = Math.round(100 * metrics.maxX / (await page.evaluate(() => (window as any).__probe?.()?.cellX ?? 4690)));
    metrics.runtimeErrors = [...new Set(pageErrors)].slice(0, 8);

    // 收尾：保存最终截图 + 视频
    const shot = path.join(outDir, 'final.png');
    await page.screenshot({ path: shot });
    const video = page.video();
    await context.close();           // 必须关 context 才能定稿视频
    if (video) {
      const vpath = await video.path();
      const dest = path.join(outDir, 'playthrough.webm');
      try { fs.renameSync(vpath, dest); } catch { fs.copyFileSync(vpath, dest); }
      metrics.video = path.relative(REPO_ROOT, dest);
    }
    metrics.screenshot = path.relative(REPO_ROOT, shot);
  } catch (e: any) {
    metrics.result = 'error'; metrics.notes.push(`运行异常: ${e.message}`);
  } finally {
    if (browser) await browser.close();
    srv.close();
  }

  const json = JSON.stringify(metrics, null, 2);
  console.log(json);
  if (flags.out) fs.writeFileSync(path.resolve(REPO_ROOT, flags.out), json);

  const ok = metrics.result === 'win';
  console.error(ok ? `\n✅ ${gameName} bot 通关（用时 ${metrics.durationSec}s，被照 ${metrics.spottedCount} 次，死亡 ${metrics.deaths}）`
                   : `\n⚠️  ${gameName} 未通关：${metrics.result}（进度 ${metrics.progressPct}%）`);
  process.exit(ok ? 0 : 1);
})();
