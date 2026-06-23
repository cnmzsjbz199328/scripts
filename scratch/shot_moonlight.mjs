// Verify MoonRonin moonlight-vision: load, start, walk right collecting orbs,
// capture the light halo at score 0 / mid / high. Fails loud on any page error.
import { chromium } from 'playwright-core';
import http from 'http';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve('game_runs');
// Output flat into scratch/ (matched by `scratch/*.png` in .gitignore) so
// verification screenshots never become committable artifacts.
const OUT = path.resolve('scratch');
const tag = (name) => path.join(OUT, `moonlight_${name}`);

const MIME = { '.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml' };
const srv = http.createServer((q, s) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  try { const d = fs.readFileSync(f); s.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); s.end(d); }
  catch { s.writeHead(404); s.end('x'); }
});
await new Promise(r => srv.listen(0, r));
const PORT = srv.address().port;

const browser = await chromium.launch({ channel: 'chrome', headless: true }).catch(() => chromium.launch({ headless: true }));
const page = await (await browser.newContext({ viewport: { width: 960, height: 576 } })).newPage();

const errors = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error' && !/favicon/i.test(m.text())) errors.push(m.text()); });

const wait = ms => page.waitForTimeout(ms);
const probe = () => page.evaluate(() => window.__probe?.());
const down = k => page.keyboard.down(k);
const up = k => page.keyboard.up(k);
const tap = async (k, ms=90) => { await down(k); await wait(ms); await up(k); };

await page.goto(`http://localhost:${PORT}/MoonRonin/index.html`, { waitUntil: 'networkidle' });
await wait(1000);
await page.evaluate(() => { window.__hudStart?.(); window.__startGame?.(); });
await wait(600);
await tap('Space', 120);        // dismiss title card
await wait(400);
await page.evaluate(() => window.__advanceCard?.());  // belt-and-braces
await wait(500);

// Deterministic A/B: hold the ronin at one spot, vary only score → compare halo size.
const shots = [];
async function snapScore(label, score) {
  const r = await page.evaluate((sc) => {
    const sc0 = window.__gameState?.player?.scene;
    if (!sc0) return null;
    sc0.score = sc;
    sc0._updateObjective?.();
    window.GameHUD?.setScore?.(sc);
    sc0._lightR = sc0._lightR;  // let update()'s lerp ease toward new target
    return { lightR: sc0._lightR, x: Math.round(sc0.player.x) };
  }, score);
  await wait(1400);   // allow the 0.08 lerp to settle to the new radius
  const r2 = await page.evaluate(() => ({ lightR: Math.round(window.__gameState.player.scene._lightR) }));
  await page.screenshot({ path: tag(`${label}.png`) });
  shots.push(`${label}: score=${score} settledLightR=${r2.lightR} x=${r?.x}`);
}

await snapScore('00_score0', 0);
await snapScore('01_score3', 3);
await snapScore('02_score7', 7);

await browser.close();
srv.close();

console.log('shots:\n' + shots.join('\n'));
if (errors.length) { console.error('PAGE ERRORS:\n' + errors.join('\n')); process.exit(1); }
console.log('OK no page errors. Images in', OUT);
