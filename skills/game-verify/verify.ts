/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * game-verify — 自动化游戏验证门（共享 skill）
 *
 * 分三层逐级验证一个已组装的游戏（game_runs/<Game>/），任意层失败即以非零
 * 退出码结束并打印结构化 JSON 报告。被 game-gen / game-fix / game-enhance 共用。
 *
 *   L0 静态：纯 fs / 语法，不开浏览器
 *   L1 启动：Playwright headless 加载 index.html，捕捉 console.error /
 *            window.onerror / 资源 404，确认 canvas 真正渲染
 *   L2 烟雾：点 START，合成键盘输入若干秒，确认交互期间零运行时错误、画面在推进
 *
 * 用法：
 *   npx tsx skills/game-verify/verify.ts <GameName>
 *     [--layers=0,1,2] [--keys=W,A,S,D,SPACE] [--seconds=4] [--out=report.json]
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const GAME_RUNS = path.join(REPO_ROOT, 'game_runs');

// ── arg parsing ────────────────────────────────────────────────
const argv = process.argv.slice(2);
const positional: string[] = [];
const flags: Record<string, string> = {};
for (const a of argv) {
  if (a.startsWith('--')) {
    const [k, v] = a.slice(2).split('=');
    flags[k] = v ?? 'true';
  } else {
    positional.push(a);
  }
}

const gameName = positional[0];
if (!gameName) {
  console.error('用法: npx tsx skills/game-verify/verify.ts <GameName> [--layers=0,1,2] [--keys=W,A,S,D,SPACE] [--seconds=4] [--out=report.json]');
  process.exit(2);
}

const gameDir = path.join(GAME_RUNS, gameName);
if (!fs.existsSync(path.join(gameDir, 'index.html'))) {
  console.error(`找不到 ${path.join(gameDir, 'index.html')}`);
  process.exit(2);
}

const layers = (flags.layers ?? '0,1,2').split(',').map(s => s.trim());
const keys = (flags.keys ?? 'W,A,S,D,SPACE,ENTER,J,Z,X').split(',').map(s => s.trim()).filter(Boolean);
const seconds = Number(flags.seconds ?? '4');

// ── report types ───────────────────────────────────────────────
interface ErrorEntry { type: string; msg: string; at?: string; }
interface LayerResult { pass: boolean; errors?: ErrorEntry[]; reason?: string; notes?: string[]; }
interface Report {
  game: string;
  pass: boolean;
  layers: Record<string, LayerResult>;
  screenshot?: string;
}

const report: Report = { game: gameName, pass: true, layers: {} };

// ════════════════════════════════════════════════════════════════
// L0 — 静态检查（无浏览器）
// ════════════════════════════════════════════════════════════════
function runL0(): LayerResult {
  const errors: ErrorEntry[] = [];
  const notes: string[] = [];

  // 0.1 game-logic.js 语法（node --check 只查语法，不执行，浏览器全局无影响）
  const logicPath = path.join(gameDir, 'game', 'game-logic.js');
  if (fs.existsSync(logicPath)) {
    try {
      execFileSync(process.execPath, ['--check', logicPath], { stdio: 'pipe' });
    } catch (e: any) {
      const out = (e.stderr?.toString() || e.stdout?.toString() || e.message || '').trim();
      errors.push({ type: 'syntax', msg: out.split('\n').slice(0, 4).join(' '), at: 'game/game-logic.js' });
    }
  } else {
    notes.push('game/game-logic.js 不存在（可能逻辑内联于 index.html）');
  }

  // 0.2 JSON 文件合法性
  const jsonFiles = ['game/game-config.json', 'game/tilemap.json', 'game/entities.json', 'gdd.json'];
  const parsed: Record<string, any> = {};
  for (const rel of jsonFiles) {
    const p = path.join(gameDir, rel);
    if (!fs.existsSync(p)) continue;
    try {
      parsed[rel] = JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (e: any) {
      errors.push({ type: 'json', msg: e.message, at: rel });
    }
  }

  // 0.3 tileIndex → assets/tiles/<name>.png 存在
  const tilemap = parsed['game/tilemap.json'];
  if (tilemap?.tileIndex) {
    for (const [id, name] of Object.entries(tilemap.tileIndex)) {
      const png = path.join(gameDir, 'assets', 'tiles', `${name}.png`);
      if (!fs.existsSync(png)) {
        errors.push({ type: 'asset', msg: `tileIndex[${id}] -> 缺失贴图 assets/tiles/${name}.png`, at: 'game/tilemap.json' });
      }
    }
  }

  // 0.4 entities[].sprite → assets/sprites|objects/<sprite>.(json|webp|png) 存在
  const entities = parsed['game/entities.json'];
  if (Array.isArray(entities)) {
    const seen = new Set<string>();
    for (const ent of entities) {
      const sprite = ent?.sprite;
      if (!sprite || seen.has(sprite)) continue;
      seen.add(sprite);
      const candidates = ['sprites', 'objects'].flatMap(dir =>
        ['json', 'webp', 'png'].map(ext => path.join(gameDir, 'assets', dir, `${sprite}.${ext}`)),
      );
      if (!candidates.some(c => fs.existsSync(c))) {
        errors.push({ type: 'asset', msg: `entity sprite "${sprite}" 在 assets/sprites|objects 下找不到图集`, at: 'game/entities.json' });
      }
    }
  }

  return { pass: errors.length === 0, errors: errors.length ? errors : undefined, notes: notes.length ? notes : undefined };
}

// ════════════════════════════════════════════════════════════════
// 静态文件服务器（L1/L2 需要 http 以便 CDN + 相对 fetch 正常工作）
// ════════════════════════════════════════════════════════════════
const MIME: Record<string, string> = {
  '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.css': 'text/css', '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav', '.ogg': 'audio/ogg',
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
      } catch {
        res.statusCode = 500; res.end('error');
      }
    });
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as any).port;
      resolve({ port, close: () => server.close() });
    });
  });
}

// Phaser keyCode 名 → Playwright key 名
const KEYMAP: Record<string, string> = {
  W: 'w', A: 'a', S: 's', D: 'd', E: 'e', J: 'j', K: 'k', Q: 'q', R: 'r', F: 'f', Z: 'z', X: 'x', C: 'c',
  UP: 'ArrowUp', DOWN: 'ArrowDown', LEFT: 'ArrowLeft', RIGHT: 'ArrowRight',
  SPACE: ' ', ENTER: 'Enter', SHIFT: 'Shift',
  ONE: '1', TWO: '2', THREE: '3', FOUR: '4', FIVE: '5',
};

// ════════════════════════════════════════════════════════════════
// L1 + L2 — 浏览器层
// ════════════════════════════════════════════════════════════════
async function runBrowserLayers(): Promise<{ l1?: LayerResult; l2?: LayerResult }> {
  // 延迟 import，让纯 L0 运行无需安装 playwright
  let chromium: any;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    const r: LayerResult = { pass: false, reason: 'playwright 未安装，运行 `npm i -D playwright && npx playwright install chromium`' };
    return { l1: layers.includes('1') ? r : undefined, l2: layers.includes('2') ? r : undefined };
  }

  const srv = await startServer();
  const url = `http://127.0.0.1:${srv.port}/${gameName}/index.html`;
  const result: { l1?: LayerResult; l2?: LayerResult } = {};

  let browser: any;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });

    const consoleErrors: ErrorEntry[] = [];
    const pageErrors: ErrorEntry[] = [];
    const failedReqs: ErrorEntry[] = [];

    page.on('console', (m: any) => {
      if (m.type() === 'error') consoleErrors.push({ type: 'console', msg: m.text() });
    });
    page.on('pageerror', (err: any) => {
      pageErrors.push({ type: 'pageerror', msg: err.message, at: (err.stack || '').split('\n')[1]?.trim() });
    });
    page.on('requestfailed', (req: any) => {
      const u = req.url();
      // 忽略可有可无的音频；其余（贴图/图集/脚本）算失败
      failedReqs.push({ type: 'requestfailed', msg: `${req.failure()?.errorText} ${u}` });
    });
    page.on('response', (resp: any) => {
      if (resp.status() === 404) failedReqs.push({ type: '404', msg: resp.url() });
    });

    // ── L1 启动 ──
    if (layers.includes('1')) {
      await page.goto(url, { waitUntil: 'load', timeout: 20000 });
      // 等 Phaser 建出 canvas
      let canvasOk = false;
      try {
        await page.waitForSelector('canvas', { timeout: 8000 });
        canvasOk = true;
      } catch { /* fall through */ }
      await page.waitForTimeout(1500); // 让加载错误浮现

      const errs = [...pageErrors, ...consoleErrors, ...failedReqs];
      const l1: LayerResult = { pass: canvasOk && errs.length === 0 };
      if (!canvasOk) l1.reason = '未渲染出 <canvas>（Phaser 未启动）';
      if (errs.length) l1.errors = errs;
      result.l1 = l1;
    }

    // ── L2 烟雾 ──
    if (layers.includes('2')) {
      const beforeErrCount = pageErrors.length + consoleErrors.length;
      const notes: string[] = [];

      // 启动游戏：优先全局 __hudStart，其次点 START 按钮
      const started = await page.evaluate(() => {
        if (typeof (window as any).__hudStart === 'function') { (window as any).__hudStart(); return 'hudStart'; }
        const btn = document.querySelector('#start-btn') as HTMLElement | null;
        if (btn) { btn.click(); return 'click'; }
        return 'none';
      });
      if (started === 'none') notes.push('未找到 START 入口（__hudStart / #start-btn）');
      await page.waitForTimeout(500);

      const shotBefore = await page.screenshot();
      const optStateBefore = await page.evaluate(() => {
        const g = (window as any).__gameState;
        return g?.player ? { x: g.player.x, y: g.player.y } : null;
      });

      // 合成键盘输入
      const perKey = Math.max(150, (seconds * 1000) / Math.max(keys.length, 1));
      for (const k of keys) {
        const pk = KEYMAP[k.toUpperCase()] ?? k;
        try {
          await page.keyboard.down(pk);
          await page.waitForTimeout(perKey * 0.7);
          await page.keyboard.up(pk);
          await page.waitForTimeout(perKey * 0.3);
        } catch { /* unknown key, skip */ }
      }

      const shotAfter = await page.screenshot();
      const optStateAfter = await page.evaluate(() => {
        const g = (window as any).__gameState;
        return g?.player ? { x: g.player.x, y: g.player.y } : null;
      });

      const newErrs = [...pageErrors, ...consoleErrors].slice(beforeErrCount);

      const l2: LayerResult = { pass: true };
      const l2errs: ErrorEntry[] = [];

      if (newErrs.length) { l2.pass = false; l2errs.push(...newErrs); l2.reason = '交互期间发生运行时错误'; }

      // 画面是否在推进（未冻结 / 未崩溃白屏）
      const changed = !shotBefore.equals(shotAfter);
      if (!changed) {
        l2.pass = false;
        l2.reason = (l2.reason ? l2.reason + '；' : '') + '交互前后画面无任何变化（疑似冻结/崩溃）';
      }

      // 可选精确断言：若游戏暴露 window.__gameState.player
      if (optStateBefore && optStateAfter) {
        const moved = optStateBefore.x !== optStateAfter.x || optStateBefore.y !== optStateAfter.y;
        notes.push(moved ? 'window.__gameState: 玩家坐标已响应输入' : 'window.__gameState: 玩家坐标未变化（移动可能失效）');
        if (!moved) { l2.pass = false; l2.reason = (l2.reason ? l2.reason + '；' : '') + '玩家坐标未响应移动键'; }
      } else {
        notes.push('未暴露 window.__gameState（跳过精确移动断言；仅靠画面变化判定）');
      }

      if (l2errs.length) l2.errors = l2errs;
      if (notes.length) l2.notes = notes;

      // 保存截图供人工查看
      const shotPath = path.join(gameDir, 'verify-screenshot.png');
      fs.writeFileSync(shotPath, shotAfter);
      report.screenshot = path.relative(REPO_ROOT, shotPath);

      result.l2 = l2;
    }
  } catch (e: any) {
    const r: LayerResult = { pass: false, reason: `浏览器层异常: ${e.message}` };
    if (layers.includes('1') && !result.l1) result.l1 = r;
    if (layers.includes('2') && !result.l2) result.l2 = r;
  } finally {
    if (browser) await browser.close();
    srv.close();
  }

  return result;
}

// ════════════════════════════════════════════════════════════════
// main
// ════════════════════════════════════════════════════════════════
(async () => {
  if (layers.includes('0')) {
    report.layers.L0 = runL0();
    if (!report.layers.L0.pass) report.pass = false;
  }

  // L0 失败时仍继续跑浏览器层（让报告尽量完整），除非语法都过不了
  if (layers.includes('1') || layers.includes('2')) {
    const { l1, l2 } = await runBrowserLayers();
    if (l1) { report.layers.L1 = l1; if (!l1.pass) report.pass = false; }
    if (l2) { report.layers.L2 = l2; if (!l2.pass) report.pass = false; }
  }

  const json = JSON.stringify(report, null, 2);
  console.log(json);
  if (flags.out) fs.writeFileSync(path.resolve(REPO_ROOT, flags.out), json);

  console.error(report.pass ? `\n✅ ${gameName} 验证通过` : `\n❌ ${gameName} 验证失败`);
  process.exit(report.pass ? 0 : 1);
})();
