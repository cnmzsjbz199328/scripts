import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
const ROOT='game_runs';
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg','.webp':'image/webp'};
const srv=http.createServer((req,res)=>{let fp=path.join(ROOT,decodeURIComponent(req.url.split('?')[0]));if(fs.existsSync(fp)&&fs.statSync(fp).isDirectory())fp=path.join(fp,'index.html');if(!fs.existsSync(fp)){res.statusCode=404;return res.end();}res.setHeader('Content-Type',MIME[path.extname(fp).toLowerCase()]||'application/octet-stream');fs.createReadStream(fp).pipe(res);});
await new Promise(r=>srv.listen(0,'127.0.0.1',r)); const port=srv.address().port;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:960,height:540} });
const p = await ctx.newPage();
await p.goto(`http://127.0.0.1:${port}/ShadowNinja/index.html`,{waitUntil:'load'});
await p.waitForSelector('canvas'); await p.waitForTimeout(600);
await p.evaluate(()=>window.__hudStart?.()); await p.waitForTimeout(300);
await p.evaluate(()=>window.__advanceCard?.()); await p.waitForTimeout(300);  // opening card
await p.keyboard.down('ArrowDown'); // crawl toward first key (x~860)
for(let i=0;i<70;i++){ await p.keyboard.down('ArrowRight'); await p.waitForTimeout(40); await p.keyboard.up('ArrowRight');
  const x=await p.evaluate(()=>window.__probe?.().x); if(x>825){break;} }
await p.waitForTimeout(200);
await p.screenshot({path:'scratch/shot_prone.png'});
await p.keyboard.up('ArrowDown'); await p.waitForTimeout(180); // stand up to reach
await p.screenshot({path:'scratch/shot_stand.png'});
console.log('x=',await p.evaluate(()=>window.__probe?.().x));
await b.close(); srv.close();
