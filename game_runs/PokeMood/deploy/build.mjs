#!/usr/bin/env node
/**
 * PokeMood 独立站构建 —— 把散在仓库里的游戏组装成一个自包含目录，用于单独部署到
 * Cloudflare Pages（脱离 showreel，拿到自己的域名 + PWA 作用域，移动端才能真全屏）。
 *
 * 为什么需要构建而不是直接指 game_runs/PokeMood：
 *   index.html 引的 ../_engine/hud.js、../_engine/audio.js 在游戏目录之外。
 *   Pages 的输出目录之外的文件不会被发布，路径会 404。本脚本把它们拷进 engine/ 并改写引用。
 *
 * 用法：
 *   node game_runs/PokeMood/deploy/build.mjs            # 产出 game_runs/PokeMood/dist/
 *   npx wrangler pages deploy game_runs/PokeMood/dist --project-name pokemood
 *
 * Cloudflare Pages（Git 集成）设置：
 *   构建命令  : node game_runs/PokeMood/deploy/build.mjs
 *   输出目录  : game_runs/PokeMood/dist
 *   根目录    : （留空，即仓库根）
 */
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const DEPLOY = path.dirname(fileURLToPath(import.meta.url));
const GAME   = path.resolve(DEPLOY, '..');          // game_runs/PokeMood
const ENGINE = path.resolve(GAME, '..', '_engine'); // game_runs/_engine
const DIST   = path.join(GAME, 'dist');

const APP_NAME  = '神 洛琪希';
const SHORT     = '洛琪希';
// index.html 里引的共享引擎文件；加一条就在这里加，别在 dist 里手改
const ENGINE_FILES = ['hud.js', 'audio.js'];

// ── 工具 ────────────────────────────────────────────────────────────────────
function copyDir(src, dst, skip = () => false) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (skip(s, e)) continue;
    if (e.isDirectory()) copyDir(s, d, skip);
    else fs.copyFileSync(s, d);
  }
}
const rel = p => path.relative(process.cwd(), p).replace(/\\/g, '/');

// ── 0. 清空 dist ────────────────────────────────────────────────────────────
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

// ── 1. 代码 + 素材 ──────────────────────────────────────────────────────────
copyDir(path.join(GAME, 'game'),   path.join(DIST, 'game'));
// assets/raw 是 AI 原始中间产物（16MB），部署不需要
copyDir(path.join(GAME, 'assets'), path.join(DIST, 'assets'),
        (_s, e) => e.isDirectory() && e.name === 'raw');

fs.mkdirSync(path.join(DIST, 'engine'), { recursive: true });
for (const f of ENGINE_FILES) {
  const src = path.join(ENGINE, f);
  if (!fs.existsSync(src)) throw new Error(`缺少共享引擎文件：${rel(src)}`);
  fs.copyFileSync(src, path.join(DIST, 'engine', f));
}

// ── 2. index.html：改写引擎路径 + 注入 PWA 头 ───────────────────────────────
let html = fs.readFileSync(path.join(GAME, 'index.html'), 'utf8');

const before = html;
html = html.replace(/(["'])\.\.\/_engine\//g, '$1engine/');
if (html === before) throw new Error('index.html 里没找到 ../_engine/ 引用 —— 改过结构？请同步本脚本');

const headTag = '<!-- BUILD:HEAD -->';
if (!html.includes(headTag)) throw new Error(`index.html 缺少 ${headTag} 锚点`);
html = html.replace(headTag, [
  '<link rel="manifest" href="manifest.webmanifest">',
  '  <link rel="icon" href="icon-192.png">',
  '  <link rel="apple-touch-icon" href="icon-192.png">',
].join('\n  '));

// 独立站才注册 Service Worker：Android Chrome 要有 fetch 处理器才肯提示「安装应用」，
// 装成 PWA 后地址栏和底部功能条才会消失。showreel 里的那份 index.html 不受影响。
html = html.replace('</body>', `<script>
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
</script>
</body>`);

fs.writeFileSync(path.join(DIST, 'index.html'), html);

// ── 3. manifest + 图标 ──────────────────────────────────────────────────────
fs.writeFileSync(path.join(DIST, 'manifest.webmanifest'), JSON.stringify({
  name: APP_NAME,
  short_name: SHORT,
  description: '触碰玩具：戳、按、摸，看她从害羞一路到生气。',
  start_url: './',
  scope: './',
  display: 'fullscreen',            // 装到主屏后没有地址栏 / 底部功能条
  display_override: ['fullscreen', 'standalone'],
  orientation: 'any',
  background_color: '#080b12',
  theme_color: '#080b12',
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}, null, 2));

const cover = path.join(GAME, 'cover.png');
for (const size of [192, 512]) {
  await sharp(cover)
    .resize(size, size, { fit: 'cover', position: 'top' })   // 封面是竖构图，取上半身
    .flatten({ background: '#080b12' })
    .png()
    .toFile(path.join(DIST, `icon-${size}.png`));
}

// ── 4. Service Worker（只缓存壳，29MB 图集走网络 + HTTP 缓存）───────────────
fs.writeFileSync(path.join(DIST, 'sw.js'), `/* PokeMood 独立站 SW —— 只为可安装性与秒开外壳存在。
 * 图集合计约 29MB，不进 Cache Storage（配额风险高于收益），交给 _headers 的长缓存。 */
const CACHE = 'pokemood-shell-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png',
  'engine/hud.js', 'engine/audio.js',
  'game/config.js', 'game/regions.js', 'game/reactions.js',
  'game/systems/touch.js', 'game/systems/mood.js', 'game/systems/react.js',
  'game/scenes/BootScene.js', 'game/scenes/StageScene.js', 'game/main.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// 网络优先、失败回缓存：部署了新版本不会被旧壳粘住
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(r => {
        if (r.ok && new URL(e.request.url).origin === location.origin) {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        }
        return r;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
`);

// ── 5. _headers：素材长缓存，HTML 不缓存 ────────────────────────────────────
fs.writeFileSync(path.join(DIST, '_headers'), `/assets/*
  Cache-Control: public, max-age=31536000, immutable

/icon-*.png
  Cache-Control: public, max-age=604800

/index.html
  Cache-Control: no-cache

/sw.js
  Cache-Control: no-cache
`);

// ── 汇总 ────────────────────────────────────────────────────────────────────
let files = 0, bytes = 0;
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else { files++; bytes += fs.statSync(p).size; }
  }
})(DIST);

console.log(`✅ PokeMood 独立站已构建 → ${rel(DIST)}`);
console.log(`   ${files} 个文件 · ${(bytes / 1048576).toFixed(1)} MB`);
console.log(`   本地预览: npx serve ${rel(DIST)}`);
console.log(`   部署    : npx wrangler pages deploy ${rel(DIST)} --project-name pokemood`);
