// Per-game preview recorder: drives a game with scripted input, records ~14s,
// then clips the middle 10s and encodes a 720p muted preview.mp4.
//
//   node scratch/rec.mjs <Game> [seconds]
//
// Serves game_runs over :8799 (start scratch/_srv first, or it self-serves).
import { chromium } from 'playwright-core';
import { execSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const GAME = process.argv[2];
const SECONDS = +(process.argv[3] || 14);
if (!GAME) { console.error('usage: rec.mjs <Game> [seconds]'); process.exit(2); }

const ROOT = path.resolve('game_runs');
const OUTDIR = path.join(ROOT, GAME, '_rec');
fs.rmSync(OUTDIR, { recursive: true, force: true });
fs.mkdirSync(OUTDIR, { recursive: true });

// ---- tiny static server ----
const MIME = { '.html':'text/html','.js':'text/javascript','.json':'application/json','.mp4':'video/mp4','.webm':'video/webm','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.css':'text/css' };
const srv = http.createServer((q, s) => {
  let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  try { const d = fs.readFileSync(f); s.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); s.end(d); }
  catch { s.writeHead(404); s.end('x'); }
});
await new Promise(r => srv.listen(0, r));
const PORT = srv.address().port;

const browser = await chromium.launch({ channel: 'chrome', headless: true }).catch(() => chromium.launch({ headless: true }));
const ctx = await browser.newContext({ viewport: { width: 960, height: 576 }, recordVideo: { dir: OUTDIR, size: { width: 960, height: 576 } } });
const page = await ctx.newPage();

// ---- input helpers ----
// map recipe key names (Phaser-ish) -> Playwright DOM key names
const KMAP = { SPACE:'Space', RIGHT:'ArrowRight', LEFT:'ArrowLeft', UP:'ArrowUp', DOWN:'ArrowDown', SHIFT:'Shift', ENTER:'Enter',
  TWO:'Digit2', THREE:'Digit3', SIX:'Digit6', ONE:'Digit1' };
const norm = k => KMAP[k] || (/^[A-Z]$/.test(k) ? k.toLowerCase() : k);
const wait = ms => page.waitForTimeout(ms);
const down = k => page.keyboard.down(norm(k));
const up   = k => page.keyboard.up(norm(k));
const tap  = async (k, ms=90) => { await down(k); await wait(ms); await up(k); };
const hold = async (k, ms) => { await down(k); await wait(ms); await up(k); };
const click = async (x, y) => { await page.mouse.click(x, y); };
const move  = async (x, y) => { await page.mouse.move(x, y); };
const js    = f => page.evaluate(f);

// ---- recipes ----
// generic: dismiss menu, then loop a lively mix of move + jump + attack.
async function generic(deadline) {
  const seq = ['D','D','J','W','D','K','A','J','W','D','D','K','S','J','D','W','K','A','D','J'];
  let i = 0;
  while (Date.now() < deadline) {
    const k = seq[i++ % seq.length];
    if (k === 'D' || k === 'A') await hold(k, 500 + Math.random()*400);
    else await tap(k, 110);
    await wait(80);
  }
}

const RECIPES = {
  async ShadowArena(dl) {           // char-select: D to move cursor, SPACE confirm, then fight
    await tap('D', 120); await wait(250); await tap('SPACE', 120); await wait(900);
    const seq = ['D','J','D','K','W','J','A','K','D','J','SPACE','D','K','W','J'];
    let i=0; while (Date.now() < dl) { const k=seq[i++%seq.length]; if(k==='D'||k==='A') await hold(k,420); else await tap(k,110); await wait(120); }
  },
  async NeonRacer(dl) {             // gentle: short accel taps + small steering nudges, survive longer
    const seq=['W','D','W','A','W','W','D','W','A','W']; let i=0;
    while (Date.now() < dl) { const k=seq[i++%seq.length]; await hold(k, 150); await wait(500); }
  },
  async StickmanFighter(dl) {       // arrow keys move, O/P punch/kick
    const seq=['RIGHT','O','P','LEFT','O','UP','P','RIGHT','O','P']; let i=0;
    while (Date.now() < dl) { const k=seq[i++%seq.length]; if(k==='LEFT'||k==='RIGHT') await hold(k,360); else await tap(k,110); await wait(110); }
  },
  async NeonTowerDefense(dl) {      // mostly mouse: click around to place towers/start waves
    const pts=[[300,300],[500,250],[420,360],[600,320],[360,260],[540,400],[480,300]]; let i=0;
    while (Date.now() < dl) { const [x,y]=pts[i++%pts.length]; await click(x,y); await wait(700); await tap('SPACE',100); await wait(500); }
  },
  async PixelFarm(dl) {             // move + use tools (number keys + SPACE/E)
    const seq=['D','SPACE','S','TWO','D','SPACE','A','THREE','W','SPACE','D','E']; let i=0;
    while (Date.now() < dl) { const k=seq[i++%seq.length]; if('DASW'.includes(k)) await hold(k,420); else await tap(k,120); await wait(120); }
  },
  async ElementalClash(dl) {       // click 开始对决 button, then P1: A/D move, W jump, F fireball, G special
    await click(480, 520); await wait(900);
    const seq=['D','F','D','F','W','F','A','F','D','G','D','F','A','F','W','F']; let i=0;
    while (Date.now() < dl) { const k=seq[i++%seq.length]; if(k==='D'||k==='A') await hold(k,420); else await tap(k,110); await wait(120); }
  },
  async PokePixel(dl) {             // ensure starter chosen (overlay closed), then explore + fight encounters
    // wait for the starter overlay to actually appear, then pick until it closes
    for (let t=0; t<30; t++) { const shown = await js(()=>document.getElementById('starter-overlay')?.style.display==='flex'); if (shown) break; await wait(300); }
    for (let t=0; t<15; t++) { const done = await js(()=>{ window.MainGame?.chooseStarter?.('炎狐'); return document.getElementById('starter-overlay')?.style.display==='none'; }); if (done) break; await wait(300); }
    await wait(600);
    const seq=['D','W','A','S','D','W','S','A']; let i=0;
    while (Date.now() < dl) {
      // if a wild/trainer battle is up, smash the first skill button to push through it
      const inBattle = await js(()=>{
        const bo = document.getElementById('battle-overlay');
        if (bo && bo.style.display !== 'none') { const b = bo.querySelector('button.skill-btn, button.opt-btn'); if (b) { b.click(); return true; } }
        return false;
      });
      if (inBattle) { await wait(450); continue; }
      await hold(seq[i++%seq.length], 480); await wait(120);
    }
  },
};

// ---- run ----
await page.goto(`http://localhost:${PORT}/${GAME}/index.html`, { waitUntil: 'networkidle' });
await wait(1200);
await page.evaluate(() => { window.__hudStart?.(); window.__startGame?.(); });
await wait(900);
// some games start on a click / space
await page.mouse.click(480, 300).catch(()=>{});
await tap('SPACE', 100);
await wait(400);

const deadline = Date.now() + SECONDS * 1000;
const recipe = RECIPES[GAME] || generic;
await recipe(deadline);

await page.screenshot({ path: path.join(OUTDIR, 'final.png') });
const videoPath = await page.video().path();
await ctx.close();
await browser.close();
srv.close();

// ---- encode middle 10s ----
const probe = JSON.parse(execSync(`ffprobe -v error -show_entries format=duration -of json "${videoPath}"`).toString());
const dur = +probe.format.duration;
const start = Math.max(0, (dur - 10) / 2);
const out = path.join(ROOT, GAME, 'preview.mp4');
execSync(`ffmpeg -y -ss ${start} -t 10 -i "${videoPath}" -an -vf "scale=720:-2" -c:v libx264 -pix_fmt yuv420p -crf 30 -preset slow -movflags +faststart "${out}"`, { stdio: 'ignore' });
console.log(`${GAME}  dur=${dur.toFixed(1)}s  -> ${out}  (${(fs.statSync(out).size/1024).toFixed(0)}K)`);
