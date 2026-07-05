/* ShadowForge 试玩录像：内置 ?autoplay bot 自动打三波，HD 录屏(1920x1152)，
 * 结束后输出 playthrough.webm + 阶段指标，供后续 ffmpeg 转 mp4 / 截 10s 高光。 */
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const GAME_RUNS = path.join(REPO_ROOT, 'game_runs');
const OUT_DIR = path.join(GAME_RUNS, 'ShadowForge', 'playtest');
fs.mkdirSync(OUT_DIR, { recursive: true });

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.css': 'text/css', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
};
function startServer() {
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
    server.listen(0, '127.0.0.1', () => resolve({ port: server.address().port, close: () => server.close() }));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const srv = await startServer();
  const url = `http://127.0.0.1:${srv.port}/ShadowForge/index.html?autoplay`;
  const errors = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1152 },
    recordVideo: { dir: OUT_DIR, size: { width: 1920, height: 1152 } },
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto(url, { waitUntil: 'load', timeout: 20000 });
  await page.waitForSelector('canvas', { timeout: 8000 });
  await sleep(600);
  await page.evaluate(() => {
    const w = document.getElementById('game-wrapper');
    if (w) { w.style.transformOrigin = 'center center'; w.style.transform = 'scale(2)'; }
  });
  await page.evaluate(() => window.__hudStart());
  await sleep(800);

  let last = null, snapWave = -1;
  const t0 = Date.now();
  const waveT = {};
  while (Date.now() - t0 < 150000) {
    const p = await page.evaluate(() => window.__probe && window.__probe());
    if (!p) { errors.push('no probe'); break; }
    last = p;
    if (p.wave !== snapWave) {
      snapWave = p.wave;
      waveT[p.wave] = (Date.now() - t0) / 1000;
    }
    if (p.ended) break;
    await sleep(400);
  }
  await sleep(1800);

  const video = page.video();
  await page.close();
  await context.close();
  const videoPath = await video.path();
  await browser.close();
  srv.close();

  const finalWebm = path.join(OUT_DIR, 'playthrough.webm');
  fs.copyFileSync(videoPath, finalWebm);
  try { fs.unlinkSync(videoPath); } catch {}

  const elapsed = (Date.now() - t0) / 1000;
  console.log('FINAL', JSON.stringify(last));
  console.log('WAVE_TIMES', JSON.stringify(waveT));
  console.log('ERRORS', errors.length ? JSON.stringify(errors.slice(0, 10)) : 'none');
  console.log('elapsed_s', elapsed.toFixed(1));
  console.log('VIDEO', finalWebm);
})();
