// WyrmsEnd 终局复测（翼裔形态版）：全程跑抵达龙巢时已是 winged（爪+旋刃），
// 用真实形态打龙王锁点，排查骑士形态 warp 复测测不到的失败模式
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

const warp = process.argv[2] || '15100';
const secs = +(process.argv[3] || 120);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('pageerror', e => console.log('PAGEERROR:', e.message));
await page.goto(`http://localhost:${port}/WyrmsEnd/index.html?autostart&warp=${warp}`);
await page.waitForTimeout(1500);
await page.evaluate(() => window.__scene._stealForm('winged'));
await page.waitForTimeout(1800);   // 等 morph 完成回 free
for (let t = 0; t < secs * 2; t++) {
  const p = await page.evaluate(() => {
    const pr = window.__probe ? window.__probe() : null;
    const s = window.__scene;
    const es = s ? s.enemies.map(e => `${e.type}@${Math.round(e.x)}:${e.state}${e.spr.alpha < 1 ? '(fade)' : ''}${e.dead ? '(dead)' : ''}`).join(' ') : '';
    return { pr, es, form: s ? s.P.form : '?', cam: s ? Math.round(s.cameras.main.scrollX) : -1, mv: s ? s._botMv : null };
  });
  console.log(`t=${(t / 2).toFixed(1)}s form=${p.form} x=${p.pr.x} st=${p.pr.state} hp=${p.pr.hp} lock=${p.pr.locked} wave=${p.pr.wave} kills=${p.pr.kills} mv=${p.mv} | ${p.es}`);
  if (p.pr.ended) { console.log('ENDED won=' + p.pr.won); break; }
  await page.waitForTimeout(500);
}
await browser.close();
srv.close();
