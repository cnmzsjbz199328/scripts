/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * game-playtest（versus 变体）— 双人对战格斗游戏的自动试玩 + 录屏 + 白盒体检
 *
 * 共享 play.ts 的 bot 针对"单人横版/俯视 + window.__probe()"设计，朝 nextGoalX 走；
 * 对 1v1 同屏格斗（ElementalClash 这类）不适用。本变体改用游戏自己挂出的
 * window.currentGame 作探针，驱动两名玩家互殴，量化对局并录像。
 *
 * 关键验证点：currentGame.p1.animTimer 每个 tick()（即每个 requestAnimationFrame 帧）+1，
 * 因此 animTimer 持续增长 == 渲染循环存活。这正是之前"城堡背景裸 ctx 抛错→draw() 后的
 * rAF 永不排程→画面冻结但 setInterval 计时器还在走"那个 bug 的直接探针。
 *
 * 用法：npx tsx skills/game-playtest/play-versus.ts <GameName> [--seconds=60] [--tick=120]
 * 退出码：0 = 渲染循环存活且无运行时报错（健康），1 = 冻结/报错，2 = 用法/找不到游戏。
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const GAME_RUNS = path.join(REPO_ROOT, 'game_runs');

const argv = process.argv.slice(2);
const positional: string[] = [];
const flags: Record<string, string> = {};
for (const a of argv) {
  if (a.startsWith('--')) { const [k, v] = a.slice(2).split('='); flags[k] = v ?? 'true'; }
  else positional.push(a);
}
const gameName = positional[0];
if (!gameName) { console.error('用法: npx tsx skills/game-playtest/play-versus.ts <GameName> [--seconds=60] [--tick=120]'); process.exit(2); }
const gameDir = path.join(GAME_RUNS, gameName);
if (!fs.existsSync(path.join(gameDir, 'index.html'))) { console.error(`找不到 ${path.join(gameDir, 'index.html')}`); process.exit(2); }

const maxSeconds = Number(flags.seconds ?? '60');
const tickMs = Number(flags.tick ?? '120');
const outDir = path.join(gameDir, 'playtest');
fs.mkdirSync(outDir, { recursive: true });

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

(async () => {
  let chromium: any;
  try { ({ chromium } = await import('playwright')); }
  catch { console.error('playwright 未安装：npm i -D playwright && npx playwright install chromium'); process.exit(2); }

  const srv = await startServer();
  const url = `http://127.0.0.1:${srv.port}/${gameName}/index.html`;

  const pageErrors: string[] = [];
  let browser: any, context: any;
  const m: any = {
    game: gameName, mode: 'versus', result: 'unknown', durationSec: 0,
    renderLoopAlive: false, animTimerStart: 0, animTimerEnd: 0, animTimerDelta: 0,
    statesSeen: [] as string[], stagesSeen: [] as number[],
    roundsPlayed: 0, p1Score: 0, p2Score: 0, totalHits: 0, winner: '',
    runtimeErrors: [] as string[], notes: [] as string[],
  };

  try {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      viewport: { width: 1920, height: 1152 },
      recordVideo: { dir: outDir, size: { width: 1920, height: 1152 } },
    });
    const page = await context.newPage();
    page.on('pageerror', (e: any) => pageErrors.push(e.message));
    page.on('console', (msg: any) => { if (msg.type() === 'error') pageErrors.push(msg.text()); });

    await page.goto(url, { waitUntil: 'load', timeout: 20000 });
    await page.waitForSelector('canvas', { timeout: 8000 });
    await sleep(500);

    // wrapper 放大 2× 填满 1920×1152（这游戏的容器 id 是 gameWrapper）
    await page.evaluate(() => {
      const w = document.getElementById('gameWrapper');
      if (w) { w.style.transformOrigin = 'center center'; w.style.transform = 'scale(2)'; }
    });

    // 点开始按钮（不是 __hudStart）
    await page.click('#startBtn');
    await sleep(300);
    await page.click('canvas', { position: { x: 200, y: 150 } }); // 取焦点

    const probe = async () => page.evaluate(() => {
      const g: any = (window as any).currentGame;
      if (!g) return null;
      return {
        state: g.state, round: g.currentRound, stage: g.currentStageIdx,
        timer: g.roundTimer, totalHits: g.totalHits,
        p1: { hp: g.p1.hearts, score: g.p1.score, anim: g.p1.animTimer, x: g.p1.x },
        p2: { hp: g.p2.hearts, score: g.p2.score, anim: g.p2.animTimer, x: g.p2.x },
      };
    });

    // 持键状态机：保持中距离的火球/冰斩对射（而非点贴脸秒杀），对局更长、画面更好看
    const held: Record<string, boolean> = {};
    const setKey = async (k: string, want: boolean) => {
      if (!!held[k] === want) return;
      held[k] = want;
      if (want) await page.keyboard.down(k); else await page.keyboard.up(k);
    };
    const tap = async (k: string, ms = 70) => { await page.keyboard.down(k); await sleep(ms); await page.keyboard.up(k); };

    const t0 = Date.now();
    let animStart = -1, lastSpecial = 0, lastJump = 0;
    const statesSeen = new Set<string>();
    const stagesSeen = new Set<number>();

    while ((Date.now() - t0) / 1000 < maxSeconds) {
      const p = await probe();
      if (p) {
        if (animStart < 0) animStart = Math.min(p.p1.anim, p.p2.anim);
        m.animTimerEnd = Math.max(p.p1.anim, p.p2.anim);
        statesSeen.add(p.state);
        stagesSeen.add(p.stage);
        m.roundsPlayed = Math.max(m.roundsPlayed, p.round);
        m.p1Score = p.p1.score; m.p2Score = p.p2.score; m.totalHits = p.totalHits;
        if (p.state === 'GAME_OVER') { m.notes.push('整场对决分出胜负（先到 2 局）'); break; }

        if (p.state === 'PLAYING') {
          const gap = p.p2.x - p.p1.x;            // 两人水平间距
          // 维持中距离对射：太近后撤、太远逼近、舒适区内驻足开火
          await setKey('a', gap < 380); await setKey('d', gap > 520);
          await setKey('ArrowRight', gap < 380); await setKey('ArrowLeft', gap > 520);
          await setKey('f', true); await setKey('i', true);   // 火球/冰斩持续对射（按 CD 连发）
          const now = Date.now();
          if (now - lastSpecial > 4500) { lastSpecial = now; await tap('g', 60); await tap('o', 60); } // 偶尔放大招
          if (now - lastJump > 2200) { lastJump = now; await tap('w', 90); await tap('ArrowUp', 90); } // 偶尔跳跃，画面更活
        } else {
          // 非对战阶段（局间通告/结算）松开移动与攻击
          for (const k of ['a', 'd', 'f', 'ArrowLeft', 'ArrowRight', 'i']) await setKey(k, false);
        }
      }
      await sleep(tickMs);
    }

    // 松开所有键
    for (const k of ['a', 'd', 'w', 'f', 'g', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'i', 'o']) await page.keyboard.up(k);

    m.animTimerStart = Math.max(0, animStart);
    m.animTimerDelta = m.animTimerEnd - m.animTimerStart;
    // 渲染循环存活：animTimer 在整段试玩中显著增长（PLAYING 帧每帧 +1；冻结时几乎不动）
    m.renderLoopAlive = m.animTimerDelta > 120;
    m.statesSeen = [...statesSeen];
    m.stagesSeen = [...stagesSeen].sort();
    m.winner = m.p1Score > m.p2Score ? '烈焰魔法师(P1)' : m.p2Score > m.p1Score ? '冰霜骑士(P2)' : '未分';
    m.durationSec = +((Date.now() - t0) / 1000).toFixed(1);
    m.runtimeErrors = [...new Set(pageErrors)].slice(0, 8);

    if (m.result === 'unknown') {
      m.result = (m.renderLoopAlive && m.runtimeErrors.length === 0) ? 'healthy' : 'unhealthy';
    }

    const shot = path.join(outDir, 'final.png');
    await page.screenshot({ path: shot });
    const video = page.video();
    await context.close();
    if (video) {
      const vpath = await video.path();
      const dest = path.join(outDir, 'playthrough.webm');
      try { fs.renameSync(vpath, dest); } catch { fs.copyFileSync(vpath, dest); }
      m.video = path.relative(REPO_ROOT, dest);
    }
    m.screenshot = path.relative(REPO_ROOT, shot);
  } catch (e: any) {
    m.result = 'error'; m.notes.push(`运行异常: ${e.message}`);
  } finally {
    if (browser) await browser.close();
    srv.close();
    try { for (const f of fs.readdirSync(outDir)) if (/^page@.*\.webm$/.test(f)) fs.unlinkSync(path.join(outDir, f)); } catch { /* ignore */ }
  }

  console.log(JSON.stringify(m, null, 2));
  if (flags.out) fs.writeFileSync(path.resolve(REPO_ROOT, flags.out), JSON.stringify(m, null, 2));

  const ok = m.result === 'healthy';
  console.error(ok
    ? `\n✅ ${gameName} 渲染循环存活（animTimer +${m.animTimerDelta}）｜场景 ${JSON.stringify(m.stagesSeen)}｜比分 P1 ${m.p1Score}:${m.p2Score} P2｜运行时报错 0`
    : `\n⚠️  ${gameName} 不健康：result=${m.result}，animΔ=${m.animTimerDelta}，报错=${m.runtimeErrors.length}`);
  process.exit(ok ? 0 : 1);
})();
