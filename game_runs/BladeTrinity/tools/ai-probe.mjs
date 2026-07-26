/* BladeTrinity AI 诊断 —— 不猜数值，直接量【AI 的每一帧花在哪】+ 各条路径的转化率。
 *
 * 为什么要这个工具：AI 的强度问题连调了好几轮数值都没收敛，因为 game-verify /
 * game-playtest 只回答"通不通得了关"，回答不了"AI 为什么不防/不动"。这里按帧采样
 * AI 的状态预算，并把防御漏斗【按威胁 id 去重】—— 用帧数当分母会把一记威胁数很多遍，
 * 得出的转化率是错的。
 *
 * 实测抓到过的结论（都已回写进 data.js / routine.js 的注释）：
 *   · 神级 51% 的帧卡在自己的 attack 里，attackLock 是"探到威胁却出不了手"的第一大原因
 *     → decision 倍率反而要【调慢】（0.66→0.95），出手交给套路收尾和惩罚窗口
 *   · 剑气"可出手 5/5 却只挡下 1"——不是能力不够，是等 eta 降到 guardLead 期间
 *     AI 跑去起套路了 → guardLeadQi + rtYieldQi 两条
 *   · diveMin 150 把升空踏落斩挡在门外（AI 实际交战均距 100~150）
 *
 * 用法: node tools/ai-probe.mjs [tier=shen] [seconds=45]
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const gameDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tier = process.argv[2] || 'shen';
const seconds = Number(process.argv[3] || 45);

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const p = path.join(gameDir, decodeURIComponent(req.url.split('?')[0]).replace(/^\//, '') || 'index.html');
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('pageerror', (e) => console.error('PAGEERROR', e.message));
await page.goto(`http://localhost:${port}/index.html?tier=${tier}&autostart`);
await page.waitForFunction(() => window.__probe && window.__probe(), null, { timeout: 20000 });
await page.evaluate(() => { window.__probe(); });            // 确认选人
await page.waitForFunction(() => {
  const s = window.__scene || null; return s && s.phase === 'fight';
}, null, { timeout: 20000 }).catch(() => {});

// ── 注入探针 ──────────────────────────────────────────────
await page.evaluate(() => {
  const s = window.__scene;
  const S = Object.getPrototypeOf(s);
  const M = { frames: 0, state: {}, rtFrames: 0, grounded: 0,
    threatFrames: 0, threatInLead: 0, threatInLeadActionable: 0,
    guardCommits: 0, guardRead: 0, baitGuards: 0,
    blinkOk: 0, blinkBlocked: 0, riseOk: 0,
    routineStarts: {}, pickCalls: 0, attacks: 0,
    resolve: { total: 0, blocked: 0, dealtSum: 0, byKind: {} },
    qiResolve: { total: 0, guarded: 0 },
    etaSeen: [] };
  window.__M = M;

  const wrap = (name, fn) => { const orig = S[name]; S[name] = function (...a) { return fn.call(this, orig, ...a); }; };

  wrap('_aiGuard', function (orig, f, time, minMs, read) {
    const before = f.state;
    const r = orig.call(this, f, time, minMs, read);
    if (f.state === 'guard' && before !== 'guard') { M.guardCommits++; if (read) M.guardRead++; else M.baitGuards++; }
    return r;
  });
  wrap('_doAIBlink', function (orig, f, mode, dir, time) {
    const rk = mode === 'rise' ? 'riseReady' : 'mistReady';
    const blocked = time < (f[rk] || 0) || !this._canAct(f);
    const r = orig.call(this, f, mode, dir, time);
    if (blocked) M.blinkBlocked++; else if (mode === 'rise') M.riseOk++; else M.blinkOk++;
    return r;
  });
  wrap('_aiStart', function (orig, f, id, time) {
    M.routineStarts[id] = (M.routineStarts[id] || 0) + 1;
    return orig.call(this, f, id, time);
  });
  wrap('_aiPickRoutine', function (orig, f, time, dist, opp) {
    if (f === this.p2) M.pickCalls++;
    return orig.call(this, f, time, dist, opp);
  });
  wrap('_attack', function (orig, f) {
    if (f === this.p2 && this._canAct(f)) M.attacks++;
    return orig.call(this, f);
  });
  wrap('_resolveDefense', function (orig, attacker, target, dmg, dir) {
    const r = orig.call(this, attacker, target, dmg, dir);
    if (target === this.p2) {
      M.resolve.total++;
      if (r.blocked) M.resolve.blocked++;
      M.resolve.dealtSum += r.dealt;
      const k = target.def.defense + (r.blocked ? ':blocked' : ':full') + (r.dealt ? ':leak' : ':zero');
      M.resolve.byKind[k] = (M.resolve.byKind[k] || 0) + 1;
    }
    return r;
  });
  wrap('_qiVsTarget', function (orig, q, target) {
    if (target === this.p2) {
      M.qiResolve.total++;
      if (target.state === 'guard' && target.facingLeft === (q.dir > 0)) M.qiResolve.guarded++;
    }
    return orig.call(this, q, target);
  });

  // 每帧采样 AI 的时间预算
  s.events.on('postupdate', () => {
    if (s.phase !== 'fight') return;
    const f = s.p2, opp = s.p1;
    if (!f || !opp) return;
    M.frames++;
    M.state[f.state] = (M.state[f.state] || 0) + 1;
    if (f.rt) M.rtFrames++;
    if (f.sprite.body.blocked.down) M.grounded++;
    const dist = Math.abs(opp.sprite.x - f.sprite.x);
    const th = s._incomingThreat(f, opp, dist);
    if (th) {
      M.threatFrames++;
      // 【按威胁 id 去重】—— 帧数会把一记威胁数很多遍，转化率必须用"记"当分母
      M.ids = M.ids || {};
      const rec = M.ids[th.id] || (M.ids[th.id] = { kind: th.kind, lead: 0, actionable: 0, guarded: 0 });
      // ⚠️ 这里的闸门必须和 routine.js _aiReact 【逐条对齐】，包括人机特权 bypass。
      // 探针一旦落后于代码就会给出自相矛盾的数（曾经报出"可出手 9 → 防御中 10"，
      // 就是探针还在硬性要求落地、而 airGuard 早已放开）。
      const B = s._bypass(f);
      const lead = th.kind === 'qi' ? (BT.AI_RT.guardLeadQi || BT.AI_RT.guardLead) : BT.AI_RT.guardLead;
      if (th.eta <= lead) {
        M.threatInLead++;
        rec.lead = 1;
        const grounded = f.sprite.body.blocked.down || B.airGuard;
        if (grounded && (s._canAct(f) || s._aiAbortForGuard(f, s.time.now))) {
          M.threatInLeadActionable++; rec.actionable = 1;
        }
      }
      if (f.state === 'guard') rec.guarded = 1;
      // 这记威胁没能出手时，卡在哪一关？
      if (th.eta <= lead && !rec.actionable) {
        const why = (!f.sprite.body.blocked.down && !B.airGuard) ? 'airborne'
          : f.charging ? 'charging'
          : f.state === 'attack' ? 'attackLock'
          : f.state === 'hurt' || f.state === 'stun' ? 'stun' : 'other:' + f.state;
        M.block = M.block || {}; M.block[why] = (M.block[why] || 0) + 1;
      }
      if (M.etaSeen.length < 400) M.etaSeen.push(Math.round(th.eta * 1000));
    }
  });
});

// ── 驱动玩家：贴身 + 稳定平A + 周期性蓄力剑气（制造两类威胁）──
await page.evaluate((secs) => {
  const s = window.__scene;
  let t0 = performance.now(), lastAtk = 0, lastUlt = 0;
  const loop = () => {
    if (performance.now() - t0 > secs * 1000) return;
    const now = s.time.now;
    if (s.phase === 'fight' && s.p1 && s.p2) {
      const dx = s.p2.sprite.x - s.p1.sprite.x;
      s.keys.D.isDown = dx > 60; s.keys.A.isDown = dx < -60;
      if (now - lastUlt > 6000 && s.p1.mp >= 100) {          // 每 6s 放一发剑气
        lastUlt = now; s.keys.L.isDown = true;
        s._startCharge(s.p1, now);
        setTimeout(() => { s.keys.L.isDown = false; }, 430);
      } else if (now - lastAtk > 900) { lastAtk = now; s._attack(s.p1); }
    }
    requestAnimationFrame(loop);
  };
  loop();
}, seconds);

await page.waitForTimeout(seconds * 1000 + 1500);
const M = await page.evaluate(() => window.__M);
const tierName = await page.evaluate(() => (window.__scene.curTier || {}).name);
await browser.close(); server.close();

const pct = (n) => M.frames ? (100 * n / M.frames).toFixed(1) + '%' : '-';
const sortState = Object.entries(M.state).sort((a, b) => b[1] - a[1]);
console.log(`\n=== BladeTrinity AI 诊断  档位=${tierName}  ${seconds}s  ${M.frames} 帧 ===\n`);
console.log('【AI 的时间预算】');
for (const [k, v] of sortState) console.log(`  ${k.padEnd(8)} ${String(v).padStart(5)}  ${pct(v)}`);
console.log(`  套路中     ${String(M.rtFrames).padStart(5)}  ${pct(M.rtFrames)}`);
console.log(`  落地       ${String(M.grounded).padStart(5)}  ${pct(M.grounded)}`);
console.log('\n【防御漏斗 · 按帧】');
console.log(`  有威胁的帧          ${M.threatFrames}  ${pct(M.threatFrames)}`);
console.log(`  ↳ eta 进入抬手区     ${M.threatInLead}`);
console.log(`  ↳ 且此刻可出手       ${M.threatInLeadActionable}`);
const ids = Object.values(M.ids || {});
const byKind = (k) => ids.filter((r) => r.kind === k);
console.log('\n【防御漏斗 · 按「记」去重（真转化率）】');
for (const k of ['melee', 'qi']) {
  const g = byKind(k);
  if (!g.length) continue;
  console.log(`  ${k}: 共 ${g.length} 记 → 进抬手区 ${g.filter(r=>r.lead).length} → 可出手 ${g.filter(r=>r.actionable).length} → 防御中 ${g.filter(r=>r.guarded).length}`);
}
console.log(`  实际起防次数        ${M.guardCommits}（读招 ${M.guardRead} / 钓招 ${M.baitGuards}）`);
console.log(`  出不了手的帧卡在：  ${JSON.stringify(M.block || {})}`);
console.log('\n【挡下结算 · 近战】');
console.log(`  结算次数 ${M.resolve.total}，其中 blocked ${M.resolve.blocked}，累计仍掉血 ${M.resolve.dealtSum}`);
for (const [k, v] of Object.entries(M.resolve.byKind)) console.log(`    ${k.padEnd(26)} ${v}`);
console.log(`\n【挡下结算 · 剑气】 触达 ${M.qiResolve.total}，其中正面防御中 ${M.qiResolve.guarded}`);
console.log('\n【机动】');
console.log(`  缩地成功 ${M.blinkOk}   升空成功 ${M.riseOk}   被冷却/状态挡掉 ${M.blinkBlocked}`);
console.log(`  起套 ${JSON.stringify(M.routineStarts)}   掷骰机会 ${M.pickCalls}   平A ${M.attacks}`);
const e = M.etaSeen;
if (e.length) { e.sort((a, b) => a - b); console.log(`  威胁 eta 中位 ${e[e.length >> 1]}ms  (min ${e[0]} / max ${e[e.length - 1]})`); }
console.log();
