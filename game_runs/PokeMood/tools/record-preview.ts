/**
 * PokeMood 预览片录制。
 *
 * 为什么不用 skills/game-playtest：那套录像是"bot 打通关"的副产物，本游戏没有通关
 * （DESIGN §0），bot 也只会乱戳。这里改成**编排好的一段演出**：轻戳 → 揉 → 长按 →
 * 连戳升级 → 生气 → 泼水/哭，正好是这个玩具的完整情绪弧线，10 秒讲得完。
 *
 * 用真实指针（mouse down/move/up）而不是 __poke：手指光标、涟漪、气泡这些只有走输入层才会出现。
 *
 * 输出：
 *   _rec/preview-raw.webm  原始录像（gitignored）
 *   preview.mp4            裁到 10s、下采样 1280 的成片（入库，showreel 用）
 *
 * 用法：npx tsx game_runs/PokeMood/tools/record-preview.ts [--headed] [--keep-raw]
 */
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const GAME_RUNS = path.resolve(process.cwd(), 'game_runs');
const GAME_DIR = path.join(GAME_RUNS, 'PokeMood');
const REC_DIR = path.join(GAME_DIR, '_rec');
const OUT_MP4 = path.join(GAME_DIR, 'preview.mp4');

const CLIP_SEC = 10;
/* 取景：视口 = 画布原生 900×720（宽屏下 pmCanvasWidth 取 MAX=900）。
 * 这个尺寸同时让小屏媒体查询生效（wrapper 去掉相框铺满视口），canvas FIT 之后正好 1:1，
 * 无黑边无裁切，而且是像素级原生画质，不需要再放大。
 *
 * 两条踩过的坑，别再改回去：
 *   ① 不要学 game-playtest 给 wrapper 加 transform: scale(2) —— 那套是给「容器有尺寸、
 *      画布跟着放大」的游戏用的；这里画布尺寸由 Phaser 定死 900×720，缩放只会把四周裁掉。
 *   ② 不要靠 deviceScaleFactor 提清晰度 —— Playwright 录像按 CSS 像素抓帧，dsf 不生效：
 *      recordVideo.size 开成 2× 的话，画面只占左上角 1/4，其余是灰底。 */
const VW = 900, VH = 720;

const MIME: Record<string, string> = {
  '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.webp': 'image/webp', '.css': 'text/css',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
};

function startServer(): Promise<{ port: number; close: () => void }> {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      let fp = path.join(GAME_RUNS, urlPath);
      if (!fp.startsWith(GAME_RUNS)) { res.statusCode = 403; return res.end(); }
      if (fs.existsSync(fp) && fs.statSync(fp).isDirectory()) fp = path.join(fp, 'index.html');
      if (!fs.existsSync(fp)) { res.statusCode = 404; return res.end('not found'); }
      res.setHeader('Content-Type', MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream');
      fs.createReadStream(fp).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as any).port;
      resolve({ port, close: () => server.close() });
    });
  });
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function main() {
  const headed = process.argv.includes('--headed');
  const keepRaw = process.argv.includes('--keep-raw');
  fs.mkdirSync(REC_DIR, { recursive: true });

  const srv = await startServer();
  const browser = await chromium.launch({ headless: !headed });
  const context = await browser.newContext({
    viewport: { width: VW, height: VH },
    recordVideo: { dir: REC_DIR, size: { width: VW, height: VH } },
  });
  const page = await context.newPage();
  const t0 = Date.now();                      // 录像时间轴原点（page 创建即开录）
  const at = () => (Date.now() - t0) / 1000;  // 当前时刻在录像里的秒数

  const errors: string[] = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto(`http://127.0.0.1:${srv.port}/PokeMood/index.html?autostart`,
    { waitUntil: 'load', timeout: 30_000 });
  await page.waitForFunction(() => (window as any).__probe?.().started === true, null,
    { timeout: 60_000 });
  // 全部图集加载完再演，免得录到"某个反应没贴图"的空帧
  await page.waitForFunction(() => (window as any).__probe().allLoaded === true, null,
    { timeout: 120_000 }).catch(() => console.warn('  ! 图集未全部加载完，继续录'));

  await page.evaluate(() => (window as any).__hudStart?.());
  await sleep(500);

  // 区域中心 → 屏幕坐标（canvas 的 rect 已经把 2× 缩放算进去了）
  const pt = async (region: string, dx = 0, dy = 0) => page.evaluate(([r, dx, dy]: any) => {
    const C = (window as any).PM.Config, R = (window as any).PM.REGIONS[r];
    const cv = document.querySelector('canvas')!.getBoundingClientRect();
    const sx = cv.width / C.WIDTH, sy = cv.height / C.HEIGHT;
    const fx = C.CHAR_X - C.DRAW_W / 2 + (R.x + (R.w / 2) + dx) * C.DRAW_W;
    const fy = C.CHAR_Y + (R.y + (R.h / 2) + dy) * C.DRAW_H;
    return { x: cv.left + fx * sx, y: cv.top + fy * sy, sx, sy };
  }, [region, dx, dy] as any);

  const probe = () => page.evaluate(() => (window as any).__probe());

  const tap = async (region: string) => {
    const p = await pt(region);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down(); await sleep(90); await page.mouse.up();
  };
  const hold = async (region: string, ms = 700) => {
    const p = await pt(region);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down(); await sleep(ms); await page.mouse.up();
  };
  const rub = async (region: string) => {
    const p = await pt(region);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    for (let i = 0; i < 8; i++) {                   // 累计位移远超 RUB_DIST(60)
      await page.mouse.move(p.x + (i % 2 ? 34 : -34) * p.sx, p.y + (i % 3 - 1) * 8 * p.sy);
      await sleep(45);
    }
    await page.mouse.up();
  };
  /* 等她把这段演完，最多 waitMs —— 编排的节奏要"她演完再戳"，
   * 连点会互相抢占，录出来全是半截动作。 */
  const waitCalm = async (waitMs: number) => {
    const end = Date.now() + waitMs;
    while (Date.now() < end) {
      if (!(await probe()).locked) break;
      await sleep(120);
    }
  };

  // ── 演出编排 ─────────────────────────────────────────────
  /* 节奏按 10 秒成片倒推：整段弧线约 10.5s，裁哪 10 秒都不会缺环节。
   * 前三拍是三种手势各一次（要等她演完，抢占会录成半截动作），
   * 后面连戳提速到 0.42s 一下 —— 那正是玩家惹毛她时的真实手速。 */
  console.log('录制中…');
  await sleep(600);                                  // 起手留一点静止画面
  const beat = at();                                 // 第一次触碰的时刻 = 成片起点候选
  console.log(`  ▸ ${beat.toFixed(1)}s 轻戳头`);
  await tap('head');
  await waitCalm(1400); await sleep(120);

  console.log(`  ▸ ${at().toFixed(1)}s 揉肚子`);
  await rub('belly');
  await waitCalm(1400); await sleep(120);

  console.log(`  ▸ ${at().toFixed(1)}s 长按法杖臂`);
  await hold('armL', 600);
  await waitCalm(1200); await sleep(100);

  // 连戳升级：这里就是要抢占，节奏越急她越炸
  console.log(`  ▸ ${at().toFixed(1)}s 连戳升级`);
  const ladder = ['chest', 'head', 'legR', 'chest', 'belly', 'head', 'armR', 'legL',
                  'chest', 'head', 'belly', 'armR'];
  let angryAt = 0, cryAt = 0;
  for (const r of ladder) {
    await tap(r);
    const st = await probe();
    if (!angryAt && st.mood === 'ANGRY') {
      angryAt = at();
      console.log(`  ▸ ${angryAt.toFixed(1)}s 情绪 → 生气`);
    }
    if (st.mood === 'CRY') { cryAt = at(); console.log(`  ▸ ${cryAt.toFixed(1)}s 泼水 → 哭`); break; }
    await sleep(420);
  }
  // 泼水 + 哭的余韵
  await sleep(2400);
  const endAt = at();
  const finalMood = (await probe()).mood;
  console.log(`  ▸ ${endAt.toFixed(1)}s 收尾（mood=${finalMood}）`);

  const video = page.video();
  await context.close();                             // 必须先关 context，视频才落盘
  const raw = await video!.path();
  await browser.close();
  srv.close();

  if (errors.length) console.warn('⚠ 运行时错误:\n  ' + errors.slice(0, 5).join('\n  '));

  /* ── 裁 10 秒 ──────────────────────────────────────────
   * 优先让"泼水/哭"落在片尾（那是全片的爆点），起点再往前推 10s；
   * 推过头会切进加载画面，所以夹在第一次触碰之前 0.5s 这条线之后。 */
  const anchor = cryAt || angryAt || endAt;
  const start = Math.max(beat - 0.5, Math.min(anchor + 2.4, endAt) - CLIP_SEC);
  console.log(`裁剪：${start.toFixed(2)}s → +${CLIP_SEC}s（全长 ${endAt.toFixed(1)}s）`);

  // 900×720 就是画布原生分辨率，不缩放（缩放只会糊）
  execFileSync('ffmpeg', [
    '-y', '-ss', start.toFixed(2), '-i', raw, '-t', String(CLIP_SEC), '-r', '30',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '21', '-preset', 'slow',
    '-an', '-movflags', '+faststart', OUT_MP4,
  ], { stdio: 'inherit' });

  const kept = path.join(REC_DIR, 'preview-raw.webm');
  if (keepRaw) { fs.renameSync(raw, kept); console.log('原始录像：' + kept); }
  else fs.rmSync(raw, { force: true });

  const kb = (fs.statSync(OUT_MP4).size / 1024).toFixed(0);
  console.log(`✅ preview.mp4 已生成（${kb} KB）`);
}

main().catch(e => { console.error(e); process.exit(1); });
