/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * game-playtest — 自动试玩 + 录屏 + 白盒指标（共享 skill）
 *
 * 用 Playwright headless 真实加载一个已组装的游戏，驱动一个读取 window.__probe()
 * 的启发式 bot 去"实际尝试通关"，全程录屏(.webm)，并输出结构化指标 JSON。
 *
 *   · 演示：产出一段真实通关录像。
 *   · 白盒自测：bot 走正常策略仍通不了关 / 卡死 / 掉血过多 → 暴露设计与平衡问题
 *     （正是"有些游戏因设计不合理而通关难度极大"要抓的东西）。
 *
 * 前置契约：游戏需在 create() 暴露 window.__probe()（坐标/血量/目标/危险判定）与
 *           window.__advanceCard()（推进剧情卡）。bot 据此决策；未暴露则退化为"一路向右"。
 *
 * 用法：
 *   npx tsx skills/game-playtest/play.ts <GameName>
 *     [--seconds=90] [--out=report.json] [--tick=70]
 *
 * 退出码：0 = 通关，1 = 未通关(失败/超时/卡死)，2 = 用法/找不到游戏。
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const GAME_RUNS = path.join(REPO_ROOT, 'game_runs');

// ── args ──────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const positional: string[] = [];
const flags: Record<string, string> = {};
for (const a of argv) {
  if (a.startsWith('--')) { const [k, v] = a.slice(2).split('='); flags[k] = v ?? 'true'; }
  else positional.push(a);
}
const gameName = positional[0];
if (!gameName) { console.error('用法: npx tsx skills/game-playtest/play.ts <GameName> [--seconds=90] [--tick=70] [--out=report.json]'); process.exit(2); }
const gameDir = path.join(GAME_RUNS, gameName);
if (!fs.existsSync(path.join(gameDir, 'index.html'))) { console.error(`找不到 ${path.join(gameDir, 'index.html')}`); process.exit(2); }

const maxSeconds = Number(flags.seconds ?? '90');
const tickMs = Number(flags.tick ?? '70');
const outDir = path.join(gameDir, 'playtest');
fs.mkdirSync(outDir, { recursive: true });

// ── 静态服务器（同 verify：CDN + 相对 fetch 需 http）──────────
const MIME: Record<string, string> = {
  '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.css': 'text/css', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
};
function startServer(): Promise<{ port: number; close: () => void }> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
        let fp = path.join(GAME_RUNS, urlPath);
        if (!fp.startsWith(GAME_RUNS)) { res.statusCode = 403; res.end(); return; }
        if (fs.existsSync(fp) && fs.statSync(fp).isDirectory()) fp = path.join(fp, 'index.html');
        if (!fs.existsSync(fp)) { res.statusCode = 404; res.end('not found'); return; }
        res.setHeader('Content-Type', MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream');
        fs.createReadStream(fp).pipe(res);
      } catch { res.statusCode = 500; res.end('error'); }
    });
    server.listen(0, '127.0.0.1', () => resolve({ port: (server.address() as any).port, close: () => server.close() }));
  });
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

interface Probe {
  x: number; y: number; vx: number; onGround: boolean;
  hp: number; maxHp: number; act: number; score: number; goalScore: number;
  deaths: number; deathBudget: number; won: boolean; lost: boolean;
  cardActive: boolean; started: boolean; nextGoalX: number; worldW: number; cellX: number;
  dangerNow: boolean; dangerAhead: boolean;
}

(async () => {
  let chromium: any;
  try { ({ chromium } = await import('playwright')); }
  catch { console.error('playwright 未安装：npm i -D playwright && npx playwright install chromium'); process.exit(2); }

  const srv = await startServer();
  const isArena = gameName === 'ShadowForge';
  // BladeTrinity 支持 --tier=shang|sheng|wang|di|shen 指定起始难度档（默认游戏内王级）
  const q = isArena ? '?autoplay'
    : (gameName === 'BladeTrinity' && flags.tier ? `?tier=${flags.tier}` : '');
  const url = `http://127.0.0.1:${srv.port}/${gameName}/index.html` + q;

  const pageErrors: string[] = [];
  let browser: any, context: any;
  const metrics: any = {
    game: gameName, result: 'unknown', durationSec: 0,
    reachedAct: 0, finalScore: 0, hpRemaining: 0, spottedCount: 0, deaths: 0,
    maxX: 0, progressPct: 0, cardsAdvanced: 0, stuck: false,
    runtimeErrors: [] as string[], notes: [] as string[],
  };

  try {
    browser = await chromium.launch({ headless: true });
    // 高清录制：1920×1152 视口/视频，并强制游戏 wrapper 放大 2× 填满（页面 fit() 默认封顶 1×）。
    // 画布按 2× 显示，HUD/剧情卡为 DOM、在 2× 下文字锐利。转 mp4 时不要再缩小。
    context = await browser.newContext({
      viewport: { width: 1920, height: 1152 },
      recordVideo: { dir: outDir, size: { width: 1920, height: 1152 } },
    });
    const page = await context.newPage();
    page.on('pageerror', (e: any) => pageErrors.push(e.message));
    page.on('console', (m: any) => { if (m.type() === 'error') pageErrors.push(m.text()); });

    await page.goto(url, { waitUntil: 'load', timeout: 20000 });
    await page.waitForSelector('canvas', { timeout: 8000 });
    await sleep(600);
    // 强制 wrapper 放大 2× 填满 1920×1152 视口（页面 fit() 封顶 1×，且无 resize 不会复位）
    await page.evaluate(() => {
      const w = document.getElementById('game-wrapper');
      if (w) { w.style.transformOrigin = 'center center'; w.style.transform = 'scale(2)'; }
    });

    // 开始游戏
    await page.evaluate(() => { (window as any).__hudStart?.(); });
    await sleep(400);

    const probe = async (): Promise<Probe | null> => page.evaluate(() => (window as any).__probe?.() ?? null);
    const advanceCard = async () => page.evaluate(() => (window as any).__advanceCard?.());

    // 持键状态管理 + 点按（跳跃/攻击）
    const held: Record<string, boolean> = {};
    const setKey = async (key: string, want: boolean) => {
      if (want === !!held[key]) return;
      held[key] = want;
      if (want) await page.keyboard.down(key); else await page.keyboard.up(key);
    };
    const tap = async (key: string, ms = 80) => { await page.keyboard.down(key); await sleep(ms); await page.keyboard.up(key); };

    const t0 = Date.now();
    let prevHp = -1, prevMaxX = 0, stuckTicks = 0;  // prevHp=-1：首帧只记录不计数
    let prevTickX: number | null = null;            // 上一帧 x，用于检测"想动却被墙顶住"
    let prevTickY: number | null = null;            // 上一帧 y（俯视绕障用）
    let prevScore = -1, isTopdown = false, goalScore = 0;  // 俯视模式：以 score 计进度/卡死
    const stuckLimit = Math.ceil(6000 / tickMs); // ~6s 无进展判卡死（已含计时门合理等待）
    let lastProbe: any = null;
    let chargeTimeRemaining = 0;
    let nextJumpTime = 0;
    let nextBlinkTime = 0;
    let defendHoldUntil = 0;   // BladeTrinity: brace/parry 按住 S 卡命中窗口的到期时刻
    let nextNeutralAtk = 0;    // BladeTrinity: 中性态平A 的最小间隔（留出读招交防御的空档）

    while ((Date.now() - t0) / 1000 < maxSeconds) {
      const p = await probe();
      if (!p) { await sleep(tickMs); continue; }
      lastProbe = p;
      const P = p as any;

      // 剧情卡：推进
      if (p.cardActive) {
        await setKey('ArrowRight', false); await setKey('ArrowDown', false);
        await advanceCard();
        metrics.cardsAdvanced++;
        await sleep(tickMs);
        continue;
      }

      // 结局
      if (p.won) { metrics.result = 'win'; metrics.notes.push('bot 成功通关'); }
      if (p.lost) { metrics.result = 'lose'; metrics.notes.push('死亡预算耗尽，bot 失败'); }
      if (p.won || p.lost) { metrics.reachedAct = p.act; metrics.finalScore = p.score; metrics.hpRemaining = p.hp; metrics.deaths = p.deaths; metrics.maxX = Math.max(metrics.maxX, p.x); break; }

      // 指标累计（首帧 prevHp=-1，仅记录不计数；治愈使 hp 上升不计）
      if (prevHp >= 0 && p.hp < prevHp) metrics.spottedCount += (prevHp - p.hp);
      prevHp = p.hp;
      metrics.reachedAct = Math.max(metrics.reachedAct, p.act);
      metrics.finalScore = p.score; metrics.hpRemaining = p.hp; metrics.deaths = p.deaths;
      metrics.maxX = Math.max(metrics.maxX, p.x);

      // 卡死检测：横版按 x 推进；俯视按 score 推进（走位不单调，x 无意义）；与单屏竞技场排除
      isTopdown = (P.moveX !== undefined); goalScore = p.goalScore || goalScore;
      if (isArena) {
        // 竞技场不使用位移卡死检测，只检测总时间超时
        stuckTicks = 0;
      } else if (isTopdown) {
        if (p.score > prevScore) { prevScore = p.score; stuckTicks = 0; } else stuckTicks++;
        if (stuckTicks > Math.ceil(20000 / tickMs)) { metrics.result = 'stuck'; metrics.stuck = true; metrics.notes.push(`~20s 内 score 无增长（${p.score}/${p.goalScore}），疑似难度过高/不可达`); break; }
      } else {
        // 横版推进的锁点战（SIDESCROLLER.md §6 契约 probe().locked）：镜头锁成单屏打波次，
        // x 被封在竞技场内属正常战斗，不计位移停滞；锁点内死锁由总时长门兜底
        if (p.x < prevMaxX - 400) prevMaxX = p.x;   // 检查点重生（x 大幅回退）→ 推进基准复位，否则重生后必误判 stuck
        if (p.locked) { stuckTicks = 0; }
        else if (p.x > prevMaxX + 4) { prevMaxX = p.x; stuckTicks = 0; } else stuckTicks++;
        if (stuckTicks > stuckLimit) { metrics.result = 'stuck'; metrics.stuck = true; metrics.notes.push(`坐标在 ~6s 内无前进（x≈${p.x.toFixed(0)}），疑似设计死锁或难度墙`); break; }
      }

      // ── bot 决策 ──
      if (gameName === 'BladeTrinity') {
        // 【反应式格斗 bot】：不再掷骰乱按，而是读探针的敌方遥测（oppStartup/oppActive/
        // oppCharging/oppState）择时反应，一局内主动用满全部技能（走位/平A/蓄力剑气/
        // 防御/瞬移/跳跃）。键位：j 斩、s 防御、l 蓄力、Space 缩地、ArrowUp 跳。
        // 旧版按 k / ArrowDown 是【死输入】（游戏没绑），已删。
        const P = p as any;
        const now = Date.now();
        const relMove = async () => { await setKey('ArrowRight', false); await setKey('ArrowLeft', false); };
        if (!P.started) {
          await relMove();
          await setKey('ArrowUp', false); await setKey('j', false);
          await setKey('l', false); await setKey('s', false); await setKey('Space', false);
        } else {
          const dx = P.nextGoalX - p.x, dist = Math.abs(dx);
          // 每帧默认松开点按键，按需重按
          await setKey('j', false);
          // 防御维持窗口（brace/parry 需按住一小段卡命中；counter 是点按）
          const defending = now < defendHoldUntil;
          await setKey('s', defending);

          if (chargeTimeRemaining > 0) {
            // 正在蓄力剑气：站定按住 L，蓄够就松
            chargeTimeRemaining -= tickMs;
            await setKey('l', true); await relMove(); await setKey('s', false);
          } else if (defending) {
            await setKey('l', false); await relMove();
          } else if (P.oppCharging && now > nextBlinkTime && P.canDefend) {
            // 敌起蓄要把我轰飞 → 缩地朝反方向闪开（Space，全程无敌）
            await setKey('l', false);
            await setKey('ArrowRight', dx < 0); await setKey('ArrowLeft', dx > 0);
            await tap('Space', 70);
            nextBlinkTime = now + 900;
            await relMove();
          } else if ((P.oppStartup || P.oppActive) && !P.oppFeint && P.canDefend && dist < P.myReach + 90) {
            // 敌起手且非假动作 → 交防御（这才让 完防/受流/反手飞刀 + 会心 真正触发）
            await setKey('l', false); await relMove();
            if (P.myDef === 'counter') { await tap('s', 60); }         // 北神反击=点按
            else { await setKey('s', true); defendHoldUntil = now + 240; }  // 剑神/水神=按住卡窗口
          } else if ((P.oppState === 'hurt' || P.oppState === 'stun') && dist < P.myReach + 40) {
            // 敌硬直露破绽 → 贴上去平A惩罚
            await setKey('l', false);
            await setKey('ArrowRight', dx > 15); await setKey('ArrowLeft', dx < -15);
            await tap('j', 70);
          } else {
            // 中性：安全且拉开距离时偶尔蓄剑气；否则逼近，进射程平A，远则偶尔跳
            await setKey('l', false);
            if (P.mp >= 100 && dist > P.myReach + 110 && !P.oppCharging && Math.random() < 0.16) {
              chargeTimeRemaining = 460;
              await setKey('l', true); await relMove();
            } else {
              await setKey('ArrowRight', dx > 15); await setKey('ArrowLeft', dx < -15);
              // ⚠️ 敌方出招/起蓄时【不许跳】。brace/parry 要求落地才起得了防
              // （_controlPlayer 那一支带 onGround），跳在半空就等于把防御与会心
              // 两条演出关掉 —— 实测起手帧里有 6~8 帧 bot 在空中，白白错过。
              const threat = P.oppStartup || P.oppActive || P.oppCharging;
              if (now > nextJumpTime && dist > 240 && !threat && Math.random() < 0.18) {
                await tap('ArrowUp', 80);
                nextJumpTime = now + 2600 + Math.random() * 1400;
              }
              // 缩地也是 BT.BLINK 设计的走位/换位手段 → 中距偶尔用一下（也保证覆盖度）
              if (now > nextBlinkTime && dist > 150 && dist < 330 && P.canDefend && Math.random() < 0.14) {
                await tap('Space', 70);
                nextBlinkTime = now + 2200 + Math.random() * 1400;
              } else if (P.attack && now > nextNeutralAtk) {
                // ⚠️ 中性态【不能见射程就砍】。平A 一记锁 720~830ms，而对手的起手窗口
                // 只有 190~380ms —— 乱按 j 的结果是 bot 全程卡在自己的收招里，
                // 敌方出招帧里有六成 bot 处于 attack 状态，防御与会心根本没机会跑
                // （实测 defend×0~3 / crit×0）。留出空档才有"读招交防御"这回事。
                // 敌硬直露破绽那一支不受此限：那是确定安全的惩罚窗口。
                await tap('j', 70);
                nextNeutralAtk = now + 780;
              }
            }
          }
        }
      } else if (isArena) {
        // 竞技场由游戏内置 bot (autoplay) 托管，外部不发送键盘输入干扰
      } else if (isTopdown) {
        // 俯视：探针给建议方向 moveX/moveY(-1..1)，按四向键走位（躲避+趋目标）
        let mx = P.moveX, my = P.moveY;
        // 被静态障碍顶住（想动却位置停滞）→ 垂直方向绕行一拍
        const stalled = prevTickX !== null && prevTickY !== null &&
          Math.abs(p.x - prevTickX) < 3 && Math.abs(p.y - prevTickY) < 3 && (Math.abs(mx) > 0.3 || Math.abs(my) > 0.3);
        if (stalled) { const t = mx; mx = -my; my = t; }
        const dz = 0.3;
        await setKey('ArrowRight', mx > dz); await setKey('ArrowLeft', mx < -dz);
        await setKey('ArrowDown', my > dz);  await setKey('ArrowUp', my < -dz);
        if (P.interact) await tap('e', 70);   // 与 NPC/物件交互（如倾听证词）
        if (P.attack) await tap('j', 60);
      } else {
        // 横版（潜行/平台/跑酷）：朝目标移动 + 跳/蹲/斩/等门
        const goal = P.nextGoalX;
        const wantRight = goal != null ? goal > p.x + 8 : true;
        const wantLeft  = goal != null ? goal < p.x - 8 : false;
        const waitGate = P.gateWaitX != null;
        // 起身够钥机制（如 ShadowNinja）：对准高悬门钥且当前安全 → 起身（必要时跳）拾取；
        // 否则照常匍匐避光前进。P.atKey 不存在的游戏走原逻辑。
        const reaching = !!P.atKey && !p.dangerNow;
        if (reaching) {
          await setKey('ArrowLeft', false); await setKey('ArrowRight', false);
          await setKey('ArrowDown', false);                            // 起身才够得着
          if (P.keyNeedJump && p.onGround) await tap('ArrowUp', 100);  // 高悬钥须跳取
        } else {
          await setKey('ArrowRight', !waitGate && wantRight);
          await setKey('ArrowLeft',  !waitGate && wantLeft);
          await setKey('ArrowDown', !!(p.dangerNow || p.dangerAhead || P.crouch));
          // 被墙/台阶顶住：想移动却位置几乎不前进(Arcade 受阻时 velocity 仍是设定值，须按位置判断)→ 起跳
          const wallStuck = (wantRight || wantLeft) && p.onGround && prevTickX !== null && Math.abs(p.x - prevTickX) < 4;
          if (!waitGate && p.onGround && (P.needJump || wallStuck)) await tap('ArrowUp', 90);
        }
        if (P.attack) await tap('j', 60);
      }

      prevTickX = p.x; prevTickY = p.y;
      await sleep(tickMs);
    }

    if (metrics.result === 'unknown') { metrics.result = 'timeout'; metrics.notes.push(`${maxSeconds}s 内未分胜负`); }

    await setKey('ArrowRight', false); await setKey('ArrowDown', false);
    await sleep(metrics.result === 'win' ? 1600 : 400); // 结局多录一会

    metrics.durationSec = +((Date.now() - t0) / 1000).toFixed(1);
    const lastP = lastProbe || {};
    metrics.progressPct = isArena
      ? (lastP.won ? 100 : (lastP.lost ? 99 : Math.min(99, Math.round(100 * (((lastP.wave as number) || 0) + 1) / 5))))
      : (isTopdown
        ? Math.round(100 * metrics.finalScore / (goalScore || metrics.finalScore || 1))
        : Math.round(100 * metrics.maxX / (await page.evaluate(() => (window as any).__probe?.()?.cellX ?? 4690))));
    metrics.runtimeErrors = [...new Set(pageErrors)].slice(0, 8);

    // ── BladeTrinity 技能覆盖度断言：本局各技能触发次数，0 = 全程没被用到 ──
    // 把"担心 bot 没用全招式"变成可测的门：核心技能任一 0 次触发就标红。
    const usage = (lastProbe && (lastProbe as any).usage) || null;
    if (usage) {
      metrics.coverage = usage;
      if ((lastProbe as any).tierName) metrics.tier = (lastProbe as any).tierName;
      const core = ['attack', 'defend', 'charge', 'blink', 'jump'];
      const missing = core.filter((k) => !usage[k]);
      if (missing.length) metrics.notes.push(`⚠️ 技能覆盖缺失: ${missing.join(', ')}（本局 0 次触发）`);
      else metrics.notes.push(`技能覆盖 OK: ${core.map((k) => `${k}×${usage[k]}`).join(' ')}（crit×${usage.crit}）`);
      // ⚠️ defend 只要 ≥1 就算过，曾经掩盖了"bot 基本不防"（实测整局 defend×2、crit×0，
      // 却报覆盖 OK）。防御是三派差异的主战场，太稀疏等于这条线没被测到，单独标出来。
      if (usage.defend > 0 && usage.defend < 4) {
        metrics.notes.push(`⚠️ 防御偏稀疏: defend×${usage.defend} —— 三派防御/会心基本没被跑到，别据此判断防御手感`);
      }
      // 会心是防御成功后的 25% 掷骰，天然会有 0 的局；不当失败，但要说出来，
      // 免得"覆盖 OK"被读成"会心演出验过了"。
      if (!usage.crit) metrics.notes.push('会心 crit×0（防御成功后的概率演出，本局未触发）');
    }

    // 收尾：保存最终截图 + 视频
    const shot = path.join(outDir, 'final.png');
    await page.screenshot({ path: shot });
    const video = page.video();
    await context.close();           // 必须关 context 才能定稿视频
    if (video) {
      const vpath = await video.path();
      const dest = path.join(outDir, 'playthrough.webm');
      try { fs.renameSync(vpath, dest); } catch { fs.copyFileSync(vpath, dest); }
      metrics.video = path.relative(REPO_ROOT, dest);
    }
    metrics.screenshot = path.relative(REPO_ROOT, shot);
  } catch (e: any) {
    metrics.result = 'error'; metrics.notes.push(`运行异常: ${e.message}`);
  } finally {
    if (browser) await browser.close();
    srv.close();
    // 清理 Playwright 残留的 page@*.webm（error 路径不会改名 → 否则会污染目录/被误提交）
    try { for (const f of fs.readdirSync(outDir)) if (/^page@.*\.webm$/.test(f)) fs.unlinkSync(path.join(outDir, f)); } catch { /* ignore */ }
  }

  const json = JSON.stringify(metrics, null, 2);
  console.log(json);
  if (flags.out) fs.writeFileSync(path.resolve(REPO_ROOT, flags.out), json);

  const ok = metrics.result === 'win';
  console.error(ok ? `\n✅ ${gameName} bot 通关（用时 ${metrics.durationSec}s，被照 ${metrics.spottedCount} 次，死亡 ${metrics.deaths}）`
                   : `\n⚠️  ${gameName} 未通关：${metrics.result}（进度 ${metrics.progressPct}%）`);
  process.exit(ok ? 0 : 1);
})();
