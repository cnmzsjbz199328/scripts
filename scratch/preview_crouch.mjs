import { chromium } from 'playwright';
import fs from 'fs';
const dir = 'game_runs/ShadowNinja/assets/svg';
const frames = ['nj_idle_0','nj_crouch_0','nj_crouch_1','nj_crouch_2','nj_crouch_3','nj_crouch_4'];
const cells = frames.map(f => {
  const svg = fs.readFileSync(`${dir}/${f}.svg`,'utf8');
  return `<div style="display:inline-block;text-align:center;margin:4px"><div style="font:12px sans-serif;color:#888">${f}</div><div style="background:#dfe6ee;width:178px;height:190px;outline:1px solid #f33">${svg}</div></div>`;
}).join('');
// red line at y where floor sits (tex y~140) and key reach references
const html = `<body style="margin:0;background:#cfd8e0">${cells}</body>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1180, height:240}});
await p.setContent(html);
await p.screenshot({ path:'scratch/preview_crouch.png' });
await b.close();
console.log('ok');
