/* PokeMood — 场景切换目检 (shot-scenes.mjs)
 *
 * 两道自动门都证明不了这个功能：verify 只看有没有报错、poke-bot 只戳不换背景。
 * "缩略图排得对不对、展开动画中途长什么样、切完气氛有没有跟着变"只能人眼看。
 *
 * 用法: node tools/shot-scenes.mjs   → _bgcheck/shot-*.png
 */
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME = path.resolve(__dirname, '..');
const ROOT = path.resolve(GAME, '..', '..');       // 仓库根：index.html 引 ../_engine/*
const OUT = path.join(GAME, '_bgcheck');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png',
               '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.json': 'application/json' };

const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}/game_runs/PokeMood/index.html`;

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
page.on('console', m => { if (m.type() === 'error') console.log('  [console]', m.text()); });
page.on('requestfailed', r => console.log('  [404]', r.url()));

await page.goto(base + '?autostart');
// 等核心图集 + 开场遮罩关掉。__probe().started 是契约里的那个
await page.waitForFunction(() => window.__probe && window.__probe().started, { timeout: 60000 });
await page.waitForTimeout(1500);

const shot = async (name) => {
  await page.screenshot({ path: path.join(OUT, `shot-${name}.png`) });
  console.log(`  ✅ _bgcheck/shot-${name}.png`);
};

await shot('00-stage');

// 选择器：走【真实指针】而不是 __setScene —— 这一段要验的正是按钮和缩略图那条路
const canvas = await page.$('canvas');
const box = await canvas.boundingBox();
// 画布是 Scale.FIT 居中的，屏幕坐标 = box + 画布内坐标×缩放
const info = await page.evaluate(() => ({ w: window.PM.Config.WIDTH, h: window.PM.Config.HEIGHT }));
const k = Math.min(box.width / info.w, box.height / info.h);
const at = (x, y) => ({ x: box.x + box.width / 2 + (x - info.w / 2) * k,
                        y: box.y + box.height / 2 + (y - info.h / 2) * k });

const btn = at(info.w - 37, 37);
await page.mouse.click(btn.x, btn.y);
await page.waitForTimeout(400);
console.log('  picker open =', await page.evaluate(() => window.__probe().pickerOpen));
await shot('01-picker');

// 第 4 格（花园温室）：2 列排布，i=3 → 第 2 列第 2 行
const cell = await page.evaluate(() => {
  const t = window.__scene._thumbs[3];
  return { x: t.rect.x + t.rect.width / 2, y: t.rect.y + t.rect.height / 2, id: t.scene.id };
});
console.log('  点第 4 格 =', cell.id);
const p = at(cell.x, cell.y);
await page.mouse.move(p.x, p.y);
await page.mouse.down();
await page.mouse.up();

await page.waitForTimeout(180);            // 展开动画中途（总时长 460ms）
await shot('02-zooming');
await page.waitForTimeout(900);
await shot('03-switched');
console.log('  切换后 bgScene =', await page.evaluate(() => window.__probe().bgScene));

// 其余场景走测试接缝快速过一遍，确认每套都能装配起来
for (const id of ['terrace', 'library', 'aurora', 'classroom', 'tower']) {
  await page.evaluate((i) => window.__setScene(i), id);
  await page.waitForTimeout(700);
  await shot(`10-${id}`);
}

await browser.close();
server.close();
console.log('完成。');
