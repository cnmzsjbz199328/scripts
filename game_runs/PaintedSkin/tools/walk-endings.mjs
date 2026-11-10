import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const GAME_RUNS = path.join(REPO_ROOT, 'game_runs');
const GAME_DIR = path.join(GAME_RUNS, 'PaintedSkin');
const WALK_DIR = path.join(GAME_DIR, 'playtest', 'walk');
const LINT_PATH = path.join(GAME_DIR, 'story', 'LINT.md');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp',
  '.mp4': 'video/mp4', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml',
};

function getRoutes() {
  const lint = fs.readFileSync(LINT_PATH, 'utf8');
  const rows = lint.split(/\r?\n/).filter((line) => /^\| E[1-8] ·/.test(line));
  const routes = rows.map((line) => {
    const cells = line.split('|').map((cell) => cell.trim());
    const endingId = cells[1].match(/^(E[1-8])/u)?.[1];
    const sequence = cells[7] || '';
    const picks = [...sequence.matchAll(/([a-z][a-z0-9_]*):(\d+)/gu)].map((match) => ({
      nodeId: match[1], index: Number(match[2]) - 1,
    }));
    if (!endingId || !picks.length) throw new Error(`无法从 LINT 解析最短路线：${line}`);
    return { endingId, picks };
  });
  if (routes.length !== 8 || new Set(routes.map((route) => route.endingId)).size !== 8) {
    throw new Error(`LINT 应列出 8 个结局路线，当前解析到 ${routes.length} 条`);
  }
  return routes;
}

function startServer() {
  const server = http.createServer((req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
      const target = path.resolve(GAME_RUNS, `.${pathname}`);
      if (target !== GAME_RUNS && !target.startsWith(`${GAME_RUNS}${path.sep}`)) {
        res.writeHead(403).end('forbidden');
        return;
      }
      const file = fs.existsSync(target) && fs.statSync(target).isDirectory()
        ? path.join(target, 'index.html') : target;
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
        res.writeHead(404).end('not found');
        return;
      }
      res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
      fs.createReadStream(file).pipe(res);
    } catch (error) {
      res.writeHead(500).end(String(error));
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => {
    resolve({ server, port: server.address().port });
  }));
}

function assertNoErrors(errors, label) {
  if (errors.length) {
    const detail = errors.map((error) => `${error.type}: ${error.message}`).join('\n');
    throw new Error(`${label} 有浏览器错误：\n${detail}`);
  }
}

async function main() {
  fs.mkdirSync(WALK_DIR, { recursive: true });
  const routes = getRoutes();
  const { server, port } = await startServer();
  const baseUrl = `http://127.0.0.1:${port}/PaintedSkin/index.html`;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  // navigator.webdriver 保留为 false，以便自动播放回归使用正常节奏。
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { configurable: true, get: () => false });
  });
  const errors = [];
  const routeResults = [];

  try {
    for (const route of routes) {
      const bot = route.picks.map((pick) => pick.index).join(',');
      const url = `${baseUrl}?autostart&fast&bot=${encodeURIComponent(bot)}`;
      const page = await context.newPage();
      console.log(`⏳ ${route.endingId}: 开始走查（${route.picks.map((pick) => pick.nodeId).join(' → ')}）`);
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push({ type: 'console', message: message.text(), endingId: route.endingId });
      });
      page.on('pageerror', (error) => errors.push({ type: 'pageerror', message: error.message, endingId: route.endingId }));
      page.on('response', (response) => {
        if (response.status() === 404) errors.push({ type: '404', message: response.url(), endingId: route.endingId });
      });
      await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      await page.waitForFunction(() => window.__probe?.().started, null, { timeout: 15000 });
      const choices = [];
      let pickIndex = 0;
      let checkpointIndex = 0;
      let result;
      while (!result) {
        const pick = pickIndex < route.picks.length ? route.picks[pickIndex].index : null;
        const checkpoint = await page.evaluate((choiceToMake) => {
          const game = window.HuaPi.Game;
          // URL 中的 bot 参数保存生成路线；本页循环以同一序列调用公开 __choose。
          game.autoBot = false;
          const initial = window.__probe();
          let picked = false;
          if (initial.choicesOpen && Number.isInteger(choiceToMake)) {
            const nextNode = game.runtime.visibleChoices[choiceToMake]?.next;
            if (!nextNode) throw new Error(`选择 ${choiceToMake} 在 ${initial.nodeId} 不可见`);
            if (!window.__choose(choiceToMake)) throw new Error(`选择 ${choiceToMake} 失败`);
            picked = true;
            // __choose 已执行选项效果；直接进入其出口，跳过仅用于真实游玩的短转场计时。
            game.runtime.enter(nextNode);
          }
          let steps = 0;
          while (!window.__probe().choicesOpen && !window.__probe().ended && steps++ < 20000) {
            // advance 同步完成打字、段落和幕卡；不等待 Phaser 延时计时器。
            window.__advance();
          }
          const state = window.__probe();
          if (steps >= 20000) throw new Error(`推进超限，停在 ${state.nodeId}`);
          if (state.choicesOpen) {
            return {
              kind: 'choice', nodeId: state.nodeId, choiceCount: state.choiceCount,
              xin: state.vars.xin, visible: game.runtime.visibleChoices.map((choice) => choice.text),
              pathLen: state.pathLen, picked,
            };
          }
          return { kind: 'ending', endingId: state.endingId, pathLen: state.pathLen, picked };
        }, pick);
        if (checkpoint.picked) pickIndex++;
        // 只在检查点让浏览器绘制一帧，再由 Node 保存截图；路线推进仍在页面内批量完成。
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
        if (checkpoint.kind === 'choice') {
          const expectedPick = route.picks[pickIndex];
          if (!expectedPick || expectedPick.nodeId !== checkpoint.nodeId) {
            throw new Error(`${route.endingId} 路线预期 ${expectedPick?.nodeId || '结局'}，实际停在 ${checkpoint.nodeId}；已走 ${choices.map((choice) => choice.nodeId).join(' → ')}`);
          }
          const fileName = `${route.endingId}_${String(++checkpointIndex).padStart(2, '0')}_${checkpoint.nodeId}_choice.png`;
          await page.screenshot({ path: path.join(WALK_DIR, fileName), fullPage: true });
          choices.push({ ...checkpoint, index: expectedPick.index });
          continue;
        }
        await page.screenshot({ path: path.join(WALK_DIR, `${route.endingId}_ending.png`), fullPage: true });
        if (checkpoint.endingId !== route.endingId) {
          throw new Error(`预期 ${route.endingId}，实际到达 ${checkpoint.endingId}`);
        }
        if (pickIndex !== route.picks.length) {
          throw new Error(`路线使用 ${pickIndex}/${route.picks.length} 个选择`);
        }
        result = { endingId: checkpoint.endingId, choices, pathLen: checkpoint.pathLen };
      }
      assertNoErrors(errors.filter((error) => error.endingId === route.endingId), route.endingId);
      routeResults.push(result);
      console.log(`✅ ${result.endingId}: ${result.choices.length} 个选择，pathLen=${result.pathLen}`);
      await page.close();
    }

    // a1_home 是 C5 坦白选项节点；xin<30 时第三项必须隐藏，xin>=30 时出现。
    const heartChecks = [];
    for (const xin of [29, 30]) {
      const page = await context.newPage();
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push({ type: 'console', message: message.text(), endingId: `xin-${xin}` });
      });
      page.on('pageerror', (error) => errors.push({ type: 'pageerror', message: error.message, endingId: `xin-${xin}` }));
      await page.goto(`${baseUrl}?autostart&fast&node=a1_home&vars=xin:${xin}`, { waitUntil: 'load', timeout: 30000 });
      await page.waitForFunction(() => window.__probe?.().started, null, { timeout: 15000 });
      const choiceState = await page.evaluate(() => {
        const game = window.HuaPi.Game;
        game.autoBot = false;
        let steps = 0;
        while (!window.__probe().choicesOpen && !window.__probe().ended && steps++ < 2000) {
          window.__advance();
        }
        const state = window.__probe();
        if (!state.choicesOpen || state.nodeId !== 'a1_home') throw new Error(`没有抵达 a1_home 选择：${state.nodeId}`);
        return { xin: state.vars.xin, count: state.choiceCount, texts: game.runtime.visibleChoices.map((choice) => choice.text) };
      });
      await page.screenshot({ path: path.join(WALK_DIR, `C5_xin_${xin}.png`), fullPage: true });
      const expectedCount = xin >= 30 ? 3 : 2;
      if (choiceState.count !== expectedCount) throw new Error(`C5 xin=${xin} 应显示 ${expectedCount} 项，实际 ${choiceState.count}`);
      if ((choiceState.texts.length >= 3) !== (xin >= 30)) throw new Error(`C5 第三项显示条件错误：xin=${xin}`);
      heartChecks.push({ ...choiceState, expectedCount });
      console.log(`✅ C5 xin=${xin}: ${choiceState.count} 个可见选项`);
      assertNoErrors(errors.filter((error) => error.endingId === `xin-${xin}`), `C5 xin=${xin}`);
      await page.close();
    }

    // 60 秒真实正常节奏，无游戏输入。开始按钮只用于启动；之后由页面内计时采样。
    const pacePage = await context.newPage();
    pacePage.on('console', (message) => {
      if (message.type() === 'error') errors.push({ type: 'console', message: message.text(), endingId: 'autoplay' });
    });
    pacePage.on('pageerror', (error) => errors.push({ type: 'pageerror', message: error.message, endingId: 'autoplay' }));
    pacePage.on('response', (response) => {
      if (response.status() === 404) errors.push({ type: '404', message: response.url(), endingId: 'autoplay' });
    });
    await pacePage.goto(`${baseUrl}?pace=1`, { waitUntil: 'load', timeout: 30000 });
    await pacePage.waitForSelector('#start-btn', { timeout: 10000 });
    await pacePage.locator('#start-btn').click();
    const autoplay = await pacePage.evaluate(async () => {
      const startedAt = performance.now();
      const samples = [];
      let lastProgressAt = startedAt;
      let lastKey = '';
      let maxStallMs = 0;
      let progressed = 0;
      while (performance.now() - startedAt < 60000) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        const state = window.__probe();
        if (!state.started) continue;
        const key = `${state.nodeId}:${state.lineIdx}`;
        const now = performance.now();
        if (state.choicesOpen) {
          lastProgressAt = now;
          lastKey = key;
        } else if (key !== lastKey) {
          if (lastKey) maxStallMs = Math.max(maxStallMs, now - lastProgressAt);
          progressed++;
          lastProgressAt = now;
          lastKey = key;
        } else {
          maxStallMs = Math.max(maxStallMs, now - lastProgressAt);
        }
        samples.push({ elapsedMs: Math.round(now - startedAt), nodeId: state.nodeId, lineIdx: state.lineIdx, choicesOpen: state.choicesOpen });
      }
      const state = window.__probe();
      const game = window.HuaPi.Game;
      return {
        durationMs: Math.round(performance.now() - startedAt), progressed,
        maxStallMs: Math.round(maxStallMs), state: { nodeId: state.nodeId, lineIdx: state.lineIdx, choicesOpen: state.choicesOpen },
        fast: game.fast || Boolean(new URLSearchParams(location.search).has('fast')),
        samples: samples.filter((sample, index) => index === 0 || sample.elapsedMs % 5000 < 250),
      };
    });
    await pacePage.screenshot({ path: path.join(WALK_DIR, 'autoplay_60s.png'), fullPage: true });
    assertNoErrors(errors.filter((error) => error.endingId === 'autoplay'), '60 秒自动播放');
    if (autoplay.fast) throw new Error('60 秒自动播放回归启用了 fast，未使用正常节奏');
    if (autoplay.durationMs < 59000) throw new Error(`60 秒自动播放回归时长不足：${autoplay.durationMs}ms`);
    if (autoplay.progressed < 4) throw new Error(`正常节奏推进次数不足：${autoplay.progressed}`);
    // Chromium/Phaser 定时器可能略慢于墙钟；允许长句时长约 2.8 倍，再多视为卡住。
    if (autoplay.maxStallMs > 26000) {
      throw new Error(`choicesOpen=false 时停顿过久：${autoplay.maxStallMs}ms`);
    }
    console.log(`✅ 自动播放：无输入 ${autoplay.durationMs}ms，推进 ${autoplay.progressed} 次，最长无选择停顿 ${autoplay.maxStallMs}ms`);
    await pacePage.close();

    assertNoErrors(errors, '全量走查');
    const report = {
      generatedAt: new Date().toISOString(),
      routes: routeResults,
      heartChecks,
      autoplay,
      browserErrors: errors,
      screenshots: WALK_DIR,
    };
    fs.writeFileSync(path.join(WALK_DIR, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(`\n✅ PaintedSkin 八结局、C5 xin 条件与 60 秒自动播放回归均通过。截图与报告：${path.relative(REPO_ROOT, WALK_DIR)}`);
  } finally {
    await context.close();
    await browser.close();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

main().catch((error) => {
  console.error(`\n❌ walk-endings 失败：${error.stack || error.message}`);
  process.exitCode = 1;
});
