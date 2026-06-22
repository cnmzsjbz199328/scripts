import { chromium } from 'playwright';
import http from 'http'; import fs from 'fs'; import path from 'path';
// 用法: node scratch/shot_punch.mjs [attackKey]  —— attackKey 默认 KeyJ(拳)，KeyK=腿, KeyL=必杀
const ATK = process.argv[2] || 'KeyJ';
const TAG = ATK.replace('Key','').toLowerCase();
const ROOT='game_runs';
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const srv=http.createServer((req,res)=>{let fp=path.join(ROOT,decodeURIComponent(req.url.split('?')[0]));if(fs.existsSync(fp)&&fs.statSync(fp).isDirectory())fp=path.join(fp,'index.html');if(!fs.existsSync(fp)){res.statusCode=404;return res.end();}res.setHeader('Content-Type',MIME[path.extname(fp).toLowerCase()]||'application/octet-stream');fs.createReadStream(fp).pipe(res);});
await new Promise(r=>srv.listen(0,'127.0.0.1',r)); const port=srv.address().port;
const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:960,height:540}});
const p=await ctx.newPage();
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text());}); p.on('pageerror',e=>errs.push('PAGEERR: '+e.message));
await p.goto(`http://127.0.0.1:${port}/ShadowArena/index.html`,{waitUntil:'load'});
await p.waitForSelector('canvas'); await p.waitForTimeout(700);
await p.evaluate(()=>window.__hudStart?.()); await p.waitForTimeout(300);
await p.focus('canvas').catch(()=>{}); await p.click('canvas',{position:{x:480,y:270}}); await p.waitForTimeout(150);
const tap=async k=>{await p.keyboard.down(k);await p.waitForTimeout(60);await p.keyboard.up(k);await p.waitForTimeout(380);};
// J 确认 P1(武士) → J 确认 P2 开战
await tap('KeyJ');
await tap('KeyJ');
await p.waitForTimeout(400);
const ready=await p.evaluate(()=>!!window.__gameState?.player);
console.log('match started=',ready);
// 出招并在动作期内连拍：蓄力末 / 命中 / 收招
await p.keyboard.down(ATK);
await p.waitForTimeout(140); await p.screenshot({path:`scratch/${TAG}_live_1.png`,clip:{x:100,y:180,width:470,height:300}});
await p.waitForTimeout(80);  await p.screenshot({path:`scratch/${TAG}_live_2.png`,clip:{x:100,y:180,width:470,height:300}});
await p.waitForTimeout(110); await p.screenshot({path:`scratch/${TAG}_live_3.png`,clip:{x:100,y:180,width:470,height:300}});
await p.keyboard.up(ATK);
console.log('errors=',errs.length?errs.slice(0,8):'none');
await b.close(); srv.close();
