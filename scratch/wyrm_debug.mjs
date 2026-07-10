// WyrmsEnd 锁点调试：本地 http + headless，warp 到锁点前，每 500ms 打印 probe
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { chromium } from 'playwright';

const ROOT = 'c:/Users/tj169/Flinders/work/Learning/scripts/game_runs';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.json': 'application/json' };
const srv = http.createServer(async (req, res) => {
  try {
    const p = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    const buf = await readFile(p);
    res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(buf);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => srv.listen(0, r));
const port = srv.address().port;

const warp = process.argv[2] || '2700';
const secs = +(process.argv[3] || 40);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('pageerror', e => console.log('PAGEERROR:', e.message));
page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE:', m.text()); });
await page.goto(`http://localhost:${port}/WyrmsEnd/index.html?autostart&warp=${warp}`);
await page.waitForTimeout(1500);
for (let t = 0; t < secs * 2; t++) {
  const p = await page.evaluate(() => {
    const pr = window.__probe ? window.__probe() : null;
    const s = window.__scene;
    const es = s ? s.enemies.map(e => `${e.type}@${Math.round(e.x)}:${e.state}${e.spr.alpha < 1 ? '(fade)' : ''}${e.dead ? '(dead)' : ''}`).join(' ') : '';
    return { pr, es, cam: s ? Math.round(s.cameras.main.scrollX) : -1, mv: s ? s._botMv : null };
  });
  console.log(`t=${(t / 2).toFixed(1)}s x=${p.pr.x} st=${p.pr.state} hp=${p.pr.hp} seg=${p.pr.segment} lock=${p.pr.locked} wave=${p.pr.wave} kills=${p.pr.kills} cam=${p.cam} mv=${p.mv} | ${p.es}`);
  if (p.pr.ended) { console.log('ENDED won=' + p.pr.won); break; }
  await page.waitForTimeout(500);
}
await browser.close();
srv.close();
