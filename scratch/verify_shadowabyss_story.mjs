/* ShadowAbyss 叙事版无头验证：起 http 服务 → webdriver 自动朝圣者走完全剧本 →
 * 断言抵达 TRUE ENDING → 关键节拍截图到 playtest/。 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4' };

const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise(r => server.listen(0, r));
const port = server.address().port;
const outDir = path.join(root, 'game_runs', 'ShadowAbyss', 'playtest');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 980, height: 560 } });
page.on('pageerror', e => console.log('PAGE ERROR:', e.message));
page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE ERROR:', m.text()); });

await page.goto(`http://localhost:${port}/game_runs/ShadowAbyss/index.html?autostart`);
await page.waitForTimeout(1500);

const shots = { dc_virgil: 'beat_forest.png', dc_avarice_hell: 'beat_greed.png', dc_pride: 'beat_purgatorio.png', dc_beatrice_appears: 'beat_heaven.png', dc_empyrean: 'beat_empyrean.png' };
const taken = new Set();
let probe = null, lastNode = '', stallMs = 0;

for (let t = 0; t < 120000; t += 400) {
  await page.waitForTimeout(400);
  probe = await page.evaluate(() => window.__probe ? window.__probe() : null);
  if (!probe) continue;
  if (shots[probe.nodeId] && !taken.has(probe.nodeId)) {
    taken.add(probe.nodeId);
    await page.screenshot({ path: path.join(outDir, shots[probe.nodeId]) });
    console.log('beat:', probe.nodeId, 'val=', probe.val);
  }
  if (probe.nodeId === lastNode) { stallMs += 400; if (stallMs > 15000) { console.log('STALL at', probe.nodeId, JSON.stringify(probe)); break; } }
  else { stallMs = 0; lastNode = probe.nodeId; }
  if (probe.ended) break;
}

await page.waitForTimeout(2200);   // 结局幕淡入
await page.screenshot({ path: path.join(outDir, 'ending.png') });
console.log('FINAL:', JSON.stringify(probe));
const ok = probe && probe.ended && probe.won && probe.endingId === 'ending_true';
console.log(ok ? 'VERIFY PASS — TRUE ENDING reached, val=' + probe.val : 'VERIFY FAIL');
await browser.close();
server.close();
process.exit(ok ? 0 : 1);
