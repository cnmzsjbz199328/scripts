/* ShadowForge 回归：bot 自动打完三波（或战败终局），全程零 JS 报错 + 阶段截图 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const GAME = 'http://localhost:8642/ShadowForge/index.html?autoplay';
const OUT = 'C:/Users/tj169/AppData/Local/Temp/claude/c--Users-tj169-Flinders-work-Learning-scripts/e6f3c3ea-ca9a-4afe-89c6-9a839b87969c/scratchpad';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 980, height: 560 } });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

await page.goto(GAME);
await page.waitForTimeout(1500);
await page.evaluate(() => window.__hudStart());
await page.waitForTimeout(800);

let last = null, snapWave = -1, shots = 0, morphShot = false;
const t0 = Date.now();
while (Date.now() - t0 < 150000) {
  const p = await page.evaluate(() => window.__probe && window.__probe());
  if (!p) { errors.push('no probe'); break; }
  last = p;
  if (p.wave !== snapWave) {
    snapWave = p.wave;
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT, `forge_wave${p.wave}.png`) });
    shots++;
  }
  // 抓一张变形中的截图（state 非 free 时粒子在飞）
  if (!morphShot && p.state !== 'free' && p.state !== 'dead' && p.wave >= 0 && p.enemies > 0) {
    morphShot = true;
    await page.screenshot({ path: path.join(OUT, 'forge_morph.png') });
  }
  if (p.ended) break;
  await page.waitForTimeout(400);
}
await page.waitForTimeout(1600);
await page.screenshot({ path: path.join(OUT, 'forge_end.png') });

console.log('FINAL', JSON.stringify(last));
console.log('ERRORS', errors.length ? JSON.stringify(errors.slice(0, 10)) : 'none');
console.log('elapsed_s', ((Date.now() - t0) / 1000).toFixed(1));
await browser.close();
