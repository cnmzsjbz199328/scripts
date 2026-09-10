import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const ctx = { window: { BC: {} }, Math };
vm.createContext(ctx);
for (const rel of ['game/path.js', 'game/systems/crawler.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), ctx, { filename: rel });
}

const P = ctx.window.BC.Path;
const C = ctx.window.BC.Crawler;
const pathPts = [[0, 0], [100, 0], [100, -100], [0, -100]];
const corners = P.corners(pathPts);
assert.deepEqual([...corners.map(c => c.sign)], [1, 1]);
assert.deepEqual([...corners.map(c => Math.round(c.deg))], [90, 90]);
const reverseCorners = P.corners([...pathPts].reverse());
assert.deepEqual([...reverseCorners.map(c => c.sign)], [-1, -1]);

const cfg = {
  speed: 100, pathLen: P.length(pathPts), corners,
  cornerWindow: 10, cornerSlow: 0.5, turnLockMs: 100,
  cornerTurnMs: 100, cornerHandoffS: 15,
};

function tick(state, input, count, dt = 0.05) {
  const events = [];
  for (let i = 0; i < count; i++) events.push(C.advance(state, input, dt, cfg).event);
  return events.filter(Boolean);
}

// Forward entry: one CCW event, locked logical position, then one handoff.
const forward = { s: 0, dir: 1, mode: 'crawl', turnLockT: 0, cornerT: 0, cornerS: 0, cornerSign: 0, moving: false, cornerIdx: -1 };
const forwardEvents = [];
for (let i = 0; i < 30; i++) {
  const res = C.advance(forward, 1, 0.05, cfg);
  if (res.event) forwardEvents.push(res.event);
  if (res.event === 'corner') break;
}
assert.equal(forwardEvents.filter(e => e === 'corner').length, 1);
assert.equal(forward.cornerSign, 1);
assert.equal(forward.mode, 'cornerTurn');
assert.equal(forward.s, forward.cornerS);
const beforeHandoff = forward.s;
tick(forward, 1, 2);
assert.equal(forward.mode, 'crawl');
assert.equal(forward.s, beforeHandoff + cfg.cornerHandoffS);

// Reverse entry: one CW event, not a replay of CCW.
const reverse = { s: 140, dir: -1, mode: 'crawl', turnLockT: 0, cornerT: 0, cornerS: 0, cornerSign: 0, moving: false, cornerIdx: -1 };
const reverseEvents = [];
for (let i = 0; i < 30; i++) {
  const res = C.advance(reverse, -1, 0.05, cfg);
  if (res.event) reverseEvents.push(res.event);
  if (res.event === 'corner') break;
}
assert.equal(reverseEvents.filter(e => e === 'corner').length, 1);
assert.equal(reverse.cornerSign, -1);
assert.equal(reverse.mode, 'cornerTurn');
assert.equal(reverse.s, reverse.cornerS);

// Immediate reversal cancels the old corner handoff at cornerS; no bounce.
const cancel = { s: 0, dir: 1, mode: 'crawl', turnLockT: 0, cornerT: 0, cornerS: 0, cornerSign: 0, moving: false, cornerIdx: -1 };
for (let i = 0; i < 30 && cancel.mode !== 'cornerTurn'; i++) C.advance(cancel, 1, 0.05, cfg);
assert.equal(cancel.mode, 'cornerTurn');
const cornerS = cancel.cornerS;
const cancelRes = C.advance(cancel, -1, 0.016, cfg);
assert.equal(cancelRes.event, 'turnAround');
assert.equal(cancel.mode, 'turnAround');
assert.equal(cancel.s, cornerS);
tick(cancel, -1, 8);
assert.equal(cancel.mode, 'crawl');
assert.ok(cancel.s < cornerS);

// Holding still at the corner cannot replay an event.
const still = { s: 90, dir: 1, mode: 'crawl', turnLockT: 0, cornerT: 0, cornerS: 0, cornerSign: 0, moving: false, cornerIdx: -1 };
const first = C.advance(still, 1, 0.1, cfg);
assert.equal(first.event, 'corner');
assert.notEqual(C.advance(still, 0, 0.01, cfg).event, 'corner');

console.log('BoxCrawler crawler/path tests: PASS');
