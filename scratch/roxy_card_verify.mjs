import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const gameDir = 'C:/Users/tj169/Flinders/work/Learning/scripts/game_runs/ThreeMoves';
const tmp = path.join(gameDir, '__roxy_card_verify.html');
const cards = [
  ['Roxy (fixed)', 'assets/media/characters/Roxy_base.png', 'suit-spade'],
  ['Rudeus (ref)', 'assets/media/characters/Rudeus_base.png', 'suit-spade'],
  ['Eris (ref)', 'assets/media/characters/Eris_base.png', 'suit-heart'],
  ['Orsted (ref)', 'assets/media/jokers/Orsted_base.png', 'joker-dragon'],
];

fs.writeFileSync(tmp, `<!doctype html><link rel="stylesheet" href="game/styles.css">
<style>body{background:#161425;margin:0;padding:36px;display:flex;gap:34px}
.card-face{position:relative;width:190px;height:266px;border-radius:10px;background:#2a2740;border:1px solid #ffffff22}
.cap{color:#fff;font:12px system-ui;text-align:center;margin-top:6px}</style>` +
cards.map(([c, src, suit]) => `<div><div class="card-face ${suit}"><div class="media-slot">
<img class="media-art" src="${src}"></div></div><div class="cap">${c}</div></div>`).join(''));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 520 } });
await page.goto('file://' + tmp.replace(/\\/g, '/'));
await page.waitForTimeout(900);
await page.screenshot({ path: 'C:/Users/tj169/Flinders/work/Learning/scripts/scratch/roxy_card_verify.png' });
await browser.close();
fs.unlinkSync(tmp);
console.log('scratch/roxy_card_verify.png');
