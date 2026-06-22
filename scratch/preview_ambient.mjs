import { chromium } from 'playwright';
import fs from 'fs';
const dir = 'game_runs/AmbientSandbox/assets/svg';
const names = ['windmill','tree','streetlight','campfire','flag','rain','snow','cloud','wave','star','leaf','smoke','bird','neon','ray','bubble','lighthouse','drip','waterfall','wind'];
const cells = names.map(n => {
  const svg = fs.readFileSync(`${dir}/${n}_2.svg`.replace('_2', fs.existsSync(`${dir}/${n}_2.svg`)?'_2':'_0'),'utf8');
  return `<div style="display:inline-block;text-align:center;margin:3px"><div style="font:11px sans-serif;color:#9fb">${n}</div><div style="background:#1b2330;width:128px;height:128px;outline:1px solid #355">${svg}</div></div>`;
}).join('');
const html = `<body style="margin:0;background:#10151e">${cells}</body>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:830, height:560}});
await p.setContent(html);
await p.screenshot({ path:'scratch/preview_ambient.png' });
await b.close();
console.log('ok');
