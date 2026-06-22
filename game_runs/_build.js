#!/usr/bin/env node
/**
 * game_runs/_build.js
 *
 * Scans every subdirectory of game_runs/, extracts metadata from
 * manifest.json / gdd.json (with index.html fallback), then writes
 * game_runs/games.json for the hub page to consume.
 *
 * Usage:
 *   node game_runs/_build.js          # from repo root
 *   node _build.js                    # from game_runs/
 *
 * Cloudflare Pages build command: node game_runs/_build.js
 * Output directory:               game_runs
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const DIR = path.dirname(fileURLToPath(import.meta.url)); // always game_runs/

// ── Genre / visual mapping ───────────────────────────────────────────────────
const GENRE_META = {
  'top-down-action':  { genre: 'ACTION',      accent: '#00e5ff', previewBg: '#020c14', icon: '🏎️' },
  'top-down-rpg':     { genre: 'RPG / SIM',   accent: '#4ade80', previewBg: '#041008', icon: '🌾' },
  'side-scroller':    { genre: 'BEAT-EM-UP',  accent: '#f97316', previewBg: '#100804', icon: '👊' },
  'platformer':       { genre: 'PLATFORMER',  accent: '#a78bfa', previewBg: '#0c0814', icon: '🎮' },
  'shooter':          { genre: 'SHOOTER',     accent: '#ef4444', previewBg: '#140404', icon: '🎯' },
  'top-down-shooter': { genre: 'SHOOTER',     accent: '#ef4444', previewBg: '#140404', icon: '🎯' },
  'racing':           { genre: 'RACING',      accent: '#00e5ff', previewBg: '#020c14', icon: '🏁' },
  'rpg':              { genre: 'RPG',         accent: '#c084fc', previewBg: '#0c0814', icon: '⚔️' },
  'puzzle':           { genre: 'PUZZLE',      accent: '#fbbf24', previewBg: '#141000', icon: '🧩' },
  'strategy':         { genre: 'STRATEGY',    accent: '#34d399', previewBg: '#041410', icon: '♟️' },
  'farming':          { genre: 'FARMING SIM', accent: '#4ade80', previewBg: '#041008', icon: '🌾' },
  'farming-sim':      { genre: 'FARMING SIM', accent: '#4ade80', previewBg: '#041008', icon: '🌾' },
};
const DEFAULT_META = { genre: 'ARCADE', accent: '#3b82f6', previewBg: '#04080e', icon: '🎮' };

// ── Helpers ──────────────────────────────────────────────────────────────────
function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function extractFromHtml(html) {
  const get = rx => (html.match(rx) || [])[1]?.trim() ?? '';
  return {
    title:   get(/<h2>([^<]+)<\/h2>/),
    tagline: get(/class="tagline">([^<]+)<\/p>/),
    story:   get(/class="story-setting">([^<]+)<\/p>/),
  };
}

// ── Scan ─────────────────────────────────────────────────────────────────────
const entries = fs.readdirSync(DIR, { withFileTypes: true })
  .filter(e => e.isDirectory() && !e.name.startsWith('_') && !e.name.startsWith('.'))
  .sort((a, b) => a.name.localeCompare(b.name));

const games = [];

for (const entry of entries) {
  const gameDir  = path.join(DIR, entry.name);
  const htmlPath = path.join(gameDir, 'index.html');

  if (!fs.existsSync(htmlPath)) {
    console.warn(`  ⚠  ${entry.name}: no index.html — skipped`);
    continue;
  }

  const manifest = readJson(path.join(gameDir, 'manifest.json'));
  const gdd      = readJson(path.join(gameDir, 'gdd.json'));
  const htmlMeta = (!gdd?.title || !gdd?.tagline)
    ? extractFromHtml(fs.readFileSync(htmlPath, 'utf8'))
    : {};

  const gameType  = (gdd?.gameType || manifest?.gameType || 'arcade').toLowerCase();
  const genreMeta = GENRE_META[gameType] || DEFAULT_META;

  // Thumbnail: manifest scene path → scene/ dir → game root fallback
  let thumbnail = null;
  const sceneFile = manifest?.scene?.path;
  if (sceneFile) {
    const full = path.join(gameDir, 'scene', sceneFile);
    if (fs.existsSync(full)) thumbnail = `${entry.name}/scene/${sceneFile}`;
  }
  if (!thumbnail) {
    const sceneDir = path.join(gameDir, 'scene');
    if (fs.existsSync(sceneDir)) {
      const img = fs.readdirSync(sceneDir).find(f => /\.(png|webp|jpe?g)$/i.test(f));
      if (img) thumbnail = `${entry.name}/scene/${img}`;
    }
  }
  if (!thumbnail) {
    // Last resort: screenshot.png / screenshot.webp in game root
    const rootImg = fs.readdirSync(gameDir).find(f => /^screenshot\.(png|webp|jpe?g)$/i.test(f));
    if (rootImg) thumbnail = `${entry.name}/${rootImg}`;
  }

  // Looping gameplay clip (preview.mp4 in game root) → animated preview in the hub.
  const previewVideo = fs.existsSync(path.join(gameDir, 'preview.mp4'))
    ? `${entry.name}/preview.mp4` : null;

  games.push({
    id:        entry.name,
    title:     gdd?.title   || htmlMeta.title   || entry.name,
    tagline:   gdd?.tagline || htmlMeta.tagline || htmlMeta.story || '',
    gameType,
    genre:     genreMeta.genre,
    accent:    genreMeta.accent,
    previewBg: genreMeta.previewBg,
    icon:      genreMeta.icon,
    thumbnail,
    previewVideo,
    path:      `${entry.name}/index.html`,
    createdAt: manifest?.created_at ?? null,
  });
}

// Newest first, then alphabetical
games.sort((a, b) => {
  if (a.createdAt && b.createdAt) return b.createdAt.localeCompare(a.createdAt);
  if (a.createdAt) return -1;
  if (b.createdAt) return  1;
  return a.id.localeCompare(b.id);
});

fs.writeFileSync(path.join(DIR, 'games.json'), JSON.stringify(games, null, 2), 'utf8');

console.log(`✓  games.json — ${games.length} game(s)`);
games.forEach(g => console.log(`   • ${g.id.padEnd(20)} [${g.gameType.padEnd(18)}]  ${g.thumbnail ? '📸 ' + g.thumbnail : '(no thumbnail)'}`));
