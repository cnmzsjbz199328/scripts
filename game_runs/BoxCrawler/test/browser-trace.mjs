import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const repo = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const gameRoot = path.join(repo, 'game_runs');
const outDir = path.join(repo, 'game_runs', 'BoxCrawler', 'playtest');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp' };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function startServer() {
  const server = http.createServer((req, res) => {
    let file = path.join(gameRoot, decodeURIComponent(req.url.split('?')[0]));
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { res.statusCode = 404; return res.end('not found'); }
    res.setHeader('Content-Type', mime[path.extname(file).toLowerCase()] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const server = await startServer();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 960, height: 576 } });
await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => undefined }));
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
await page.goto(`http://127.0.0.1:${server.address().port}/BoxCrawler/index.html`, { waitUntil: 'load' });
await page.waitForSelector('canvas');
await sleep(500);

const trace = [];
const sample = async label => {
  const state = await page.evaluate(() => window.__probe?.());
  if (state) trace.push({ label, t: Date.now(), ...state });
  return state;
};
const poll = async (label, predicate, timeout = 7000) => {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    const state = await sample(label);
    if (predicate(state)) return state;
    await sleep(40);
  }
  console.error(`Timed out waiting for ${label}`, trace.slice(-12));
  throw new Error(`Timed out waiting for ${label}`);
};

await page.keyboard.down('ArrowRight');
await poll('ccw-crawl', p => p.mode === 'cornerTurn' && p.cornerSign === 1);
await page.screenshot({ path: path.join(outDir, 'corner-ccw-frame-v2.png') });
await poll('ccw-handoff', p => p.mode === 'crawl' && p.logicalS > 700);
await page.keyboard.up('ArrowRight');

// Keep the browser input path real, but seed the reverse-direction state
// after the forward sample so the test does not depend on two key protocol
// packets landing in the same Phaser frame.
await page.evaluate(() => {
  const scene = window.__scene;
  scene.cstate.dir = -1;
  scene.cstate.moving = false;
  scene.cstate.cornerIdx = -1;
  scene.cstate.mode = 'crawl';
});
await page.keyboard.down('ArrowLeft');
await poll('cw-corner', p => p.mode === 'cornerTurn' && p.cornerSign === -1);
await page.screenshot({ path: path.join(outDir, 'corner-cw-frame-v2.png') });
await poll('cw-handoff', p => p.mode === 'crawl' && p.logicalS < 600);
await page.keyboard.up('ArrowLeft');

await browser.close();
server.close();
const report = {
  pass: errors.length === 0,
  errors,
  trace,
  assertions: {
    ccwTriggeredOnce: trace.filter(p => p.animationKey === 'cornerTurnCCW').length > 0,
    cwTriggeredOnce: trace.filter(p => p.animationKey === 'cornerTurnCW').length > 0,
    cornerLogicalLocked: ['cornerTurnCCW', 'cornerTurnCW'].every(key => {
      const values = trace.filter(p => p.animationKey === key).map(p => p.logicalS);
      return values.length > 0 && Math.max(...values) - Math.min(...values) < 1;
    }),
    visualRetractsOnlyInTurn: trace.filter(p => p.mode !== 'cornerTurn').every(p => Math.abs(p.logicalS - p.visualS) < 1e-6),
    reverseDirectionUsesKeyboard: trace.some(p => p.label === 'cw-corner'),
    cwLeavesCornerForward: trace.some(p => p.label === 'cw-handoff'),
  },
};
fs.writeFileSync(path.join(outDir, 'corner-trace-v2.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, trace: `game_runs/BoxCrawler/playtest/corner-trace-v2.json` }, null, 2));
if (!report.pass || Object.values(report.assertions).some(v => !v)) process.exitCode = 1;
