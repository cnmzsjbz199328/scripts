import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const GAME_RUNS = path.join(REPO_ROOT, 'game_runs');
const GAME_DIR = path.join(GAME_RUNS, 'PaintedSkin');
const OUTPUT = path.join(GAME_DIR, 'preview.mp4');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp',
  '.mp4': 'video/mp4', '.css': 'text/css; charset=utf-8',
};

function startServer() {
  const server = http.createServer((req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
      const target = path.resolve(GAME_RUNS, `.${pathname}`);
      if (target !== GAME_RUNS && !target.startsWith(`${GAME_RUNS}${path.sep}`)) {
        res.writeHead(403).end('forbidden');
        return;
      }
      const file = fs.existsSync(target) && fs.statSync(target).isDirectory()
        ? path.join(target, 'index.html') : target;
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
        res.writeHead(404).end('not found');
        return;
      }
      res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
      fs.createReadStream(file).pipe(res);
    } catch (error) {
      res.writeHead(500).end(String(error));
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => {
    resolve({ server, port: server.address().port });
  }));
}

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'painted-skin-preview-'));
  const videoDir = path.join(tempDir, 'video');
  fs.mkdirSync(videoDir);
  const { server, port } = await startServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: videoDir, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  const video = page.video();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

  try {
    await page.goto(`http://127.0.0.1:${port}/PaintedSkin/index.html?autostart&fast&node=a1_dress`, {
      waitUntil: 'load', timeout: 30000,
    });
    await page.waitForFunction(() => window.__probe?.().nodeId === 'a1_dress', null, { timeout: 15000 });
    await page.waitForTimeout(1800);
    await page.evaluate(() => window.HuaPi.Game.runtime.jump('h_peek', { vars: { xin: 42, dao: 2 } }));
    await page.waitForFunction(() => {
      const state = window.__probe?.();
      return state?.nodeId === 'h_peek' && state.choicesOpen;
    }, null, { timeout: 15000 });
    await page.waitForTimeout(6500);
    if (errors.length) throw new Error(`预览录制时有浏览器错误：${errors.join('\n')}`);
  } finally {
    await page.close();
    await context.close();
    await browser.close();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }

  const webmPath = await video.path();
  execFileSync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error', '-i', webmPath,
    '-vf', 'tpad=stop_mode=clone:stop_duration=10', '-t', '10',
    '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUTPUT,
  ], { stdio: 'pipe' });
  const duration = Number(execFileSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', OUTPUT,
  ], { encoding: 'utf8' }).trim());
  const stats = fs.statSync(OUTPUT);
  if (Math.abs(duration - 10) > 0.08 || stats.size < 10000) {
    throw new Error(`预览视频尺寸或时长异常：${duration.toFixed(3)} 秒，${stats.size} 字节`);
  }
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log(`✅ ${path.relative(REPO_ROOT, OUTPUT)}：${duration.toFixed(3)} 秒，${stats.size} 字节`);
}

main().catch((error) => {
  console.error(`\n❌ 预览录制失败：${error.stack || error.message}`);
  process.exitCode = 1;
});
