import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GAME = path.resolve(HERE, '..');
const ROOT = path.resolve(GAME, '..', '..');
const SOURCE = path.join(GAME, 'story', 'painted-skin.json');
const STRICT = process.argv.includes('--strict');
const FX = new Set(['inksplash', 'shake', 'flash', 'heartbeat', 'candle_out', 'fire']);
const errors = [];
const warnings = [];
const error = (message) => errors.push(message);
const warn = (message) => warnings.push(message);
const readJson = (filename) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const charLength = (value) => Array.from(value ?? '').length;

if (!fs.existsSync(SOURCE)) {
  console.error(`Missing story source: ${path.relative(ROOT, SOURCE)}`);
  process.exit(1);
}
const story = readJson(SOURCE);
const vars = story.meta?.vars ?? {};
const nodes = story.nodes ?? {};
const nodeIds = new Set(Object.keys(nodes));
const scenes = new Set(Object.keys(story.scenes ?? {}));
const cgs = new Set(Object.keys(story.cgs ?? {}));
const cast = story.cast ?? {};
const achievements = new Set(Object.keys(story.achievements ?? {}));

function checkCondition(expression, state) {
  const exp = String(expression ?? '').trim();
  if (exp === 'default') return true;
  let match = exp.match(/^hasFlag\s+'([^']+)'$/);
  if (match) return state.flags.has(match[1]);
  match = exp.match(/^!hasFlag\s+'([^']+)'$/);
  if (match) return !state.flags.has(match[1]);
  match = exp.match(/^([A-Za-z_]\w*)\s*(>=|<=|==|>|<)\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) throw new Error(`unsupported condition: ${exp}`);
  const [, name, op, raw] = match;
  if (!(name in vars)) throw new Error(`undeclared variable: ${name}`);
  const value = Number(state.vars[name]);
  const target = Number(raw);
  return ({ '>=': value >= target, '<=': value <= target, '>': value > target, '<': value < target, '==': value === target })[op];
}

function applyEffects(state, effects, where) {
  if (!effects) return;
  for (const [name, amount] of Object.entries(effects.add ?? {})) {
    if (!(name in vars)) { error(`${where}: add uses undeclared variable ${name}`); continue; }
    const def = vars[name];
    state.vars[name] = Math.min(def.max, Math.max(def.min, Number(state.vars[name]) + Number(amount)));
  }
  for (const [name, value] of Object.entries(effects.set ?? {})) {
    if (!(name in vars)) { error(`${where}: set uses undeclared variable ${name}`); continue; }
    const def = vars[name];
    state.vars[name] = Math.min(def.max, Math.max(def.min, Number(value)));
  }
  const addFlags = effects.addFlag == null ? [] : Array.isArray(effects.addFlag) ? effects.addFlag : [effects.addFlag];
  for (const flag of addFlags) state.flags.add(flag);
  if (effects.unlockAchievement && !achievements.has(effects.unlockAchievement)) {
    error(`${where}: unknown achievement ${effects.unlockAchievement}`);
  } else if (effects.unlockAchievement) state.achs.add(effects.unlockAchievement);
}

function validateSource() {
  if (!story.meta?.title || !story.startNodeId) error('meta.title and startNodeId are required');
  if (!nodeIds.has(story.startNodeId)) error(`unknown startNodeId ${story.startNodeId}`);
  for (const [name, def] of Object.entries(vars)) {
    if (typeof def.init !== 'number' || typeof def.min !== 'number' || typeof def.max !== 'number' || def.min > def.max || def.init < def.min || def.init > def.max) {
      error(`invalid variable definition ${name}`);
    }
  }
  for (const [id, node] of Object.entries(nodes)) {
    const exits = ['next', 'routes', 'choices', 'isEnding'].filter((key) => key === 'isEnding' ? node.isEnding === true : node[key] !== undefined);
    if (exits.length !== 1) error(`${id}: expected exactly one exit, found ${exits.join(', ') || 'none'}`);
    if (node.scene && !scenes.has(node.scene)) error(`${id}: unknown scene ${node.scene}`);
    if (node.cg && !cgs.has(node.cg)) error(`${id}: unknown CG ${node.cg}`);
    if (node.next && !nodeIds.has(node.next)) error(`${id}: next target does not exist: ${node.next}`);
    if (node.routes) {
      if (!node.routes.length || node.routes.at(-1)?.if !== 'default') error(`${id}: routes must end in default`);
      if (node.routes.filter((route) => route.if === 'default').length !== 1) error(`${id}: routes need exactly one default`);
      for (const route of node.routes) if (!nodeIds.has(route.next)) error(`${id}: route target does not exist: ${route.next}`);
    }
    if (node.choices) {
      if (node.choices.length < 2) error(`${id}: choices must declare at least two alternatives`);
      for (const choice of node.choices) {
        if (!nodeIds.has(choice.next)) error(`${id}: choice target does not exist: ${choice.next}`);
        const length = charLength(choice.text);
        if (length > 18) error(`${id}: option exceeds 18 characters (${length}): ${choice.text}`);
        if (choice.if) {
          try { checkCondition(choice.if, { vars: Object.fromEntries(Object.keys(vars).map((key) => [key, vars[key].init])), flags: new Set() }); }
          catch (e) { error(`${id}: ${e.message}`); }
        }
      }
    }
    if (node.isEnding && !node.ending?.id) error(`${id}: ending metadata is required`);
    for (const [index, segment] of (node.segments ?? []).entries()) {
      if (typeof segment.text !== 'string') { error(`${id}.segments[${index}]: text is required`); continue; }
      const length = charLength(segment.text);
      if (length > 80) error(`${id}.segments[${index}]: text exceeds hard limit (80): ${length}`);
      else if (length > 60) warn(`${id}.segments[${index}]: text exceeds preferred limit (60): ${length}`);
      if (segment.speaker && !cast[segment.speaker]) error(`${id}.segments[${index}]: unknown speaker ${segment.speaker}`);
      if (segment.fx && !FX.has(segment.fx)) error(`${id}.segments[${index}]: unknown fx ${segment.fx}`);
      if (segment.stage) {
        for (const [slot, value] of Object.entries(segment.stage)) {
          if (slot === 'clear') continue;
          if (!['L', 'C', 'R'].includes(slot)) { error(`${id}.segments[${index}]: invalid stage slot ${slot}`); continue; }
          if (value === null) continue;
          const [actor, state] = String(value).split(':');
          if (!cast[actor]) error(`${id}.segments[${index}]: unknown stage character ${actor}`);
          else if (!cast[actor].states?.[state]) error(`${id}.segments[${index}]: unknown state ${actor}:${state}`);
        }
      }
    }
    for (const [effectKey, effectValue] of Object.entries(node.onEnter ?? {})) {
      if (!['add', 'set', 'addFlag', 'unlockAchievement'].includes(effectKey)) error(`${id}: unsupported onEnter effect ${effectKey}`);
      if (effectKey === 'add' || effectKey === 'set') {
        for (const key of Object.keys(effectValue ?? {})) if (!(key in vars)) error(`${id}: ${effectKey} uses undeclared variable ${key}`);
      }
    }
  }
}

const initial = { nodeId: story.startNodeId, vars: Object.fromEntries(Object.entries(vars).map(([key, value]) => [key, value.init])), flags: new Set(), achs: new Set(), choices: [], nodePath: [], charCount: 0, lineCount: 0, durationMs: 0 };
const routesFound = [];
const reached = new Set();
let explored = 0;
const MAX_STATES = 250000;

function walk(current, ancestry = new Set()) {
  if (++explored > MAX_STATES) { error(`route exploration exceeded ${MAX_STATES} states`); return; }
  const id = current.nodeId;
  const node = nodes[id];
  if (!node) return;
  if (ancestry.has(id)) { error(`cycle detected along ${[...ancestry, id].join(' → ')}`); return; }
  reached.add(id);
  const state = { ...current, vars: { ...current.vars }, flags: new Set(current.flags), achs: new Set(current.achs), nodePath: [...current.nodePath, id], choices: [...current.choices] };
  applyEffects(state, node.onEnter, id);
  const segments = node.segments ?? [];
  for (const segment of segments) {
    const count = charLength(segment.text);
    state.charCount += count;
    state.lineCount++;
    state.durationMs += Math.max(1800, count * 150 + 900);
  }
  const nextAncestry = new Set(ancestry).add(id);
  if (node.isEnding) {
    routesFound.push({ endingId: node.ending.id, title: node.ending.title, type: node.ending.type, nodePath: state.nodePath, choices: state.choices, charCount: state.charCount, lineCount: state.lineCount, durationMs: state.durationMs });
    return;
  }
  if (node.next) return walk({ ...state, nodeId: node.next }, nextAncestry);
  if (node.routes) {
    let selected;
    for (const route of node.routes) {
      try { if (checkCondition(route.if, state)) { selected = route; break; } }
      catch (e) { error(`${id}: ${e.message}`); return; }
    }
    if (!selected) { error(`${id}: no matching route for state ${JSON.stringify(state.vars)}`); return; }
    return walk({ ...state, nodeId: selected.next }, nextAncestry);
  }
  if (node.choices) {
    let visible;
    try { visible = node.choices.filter((choice) => !choice.if || checkCondition(choice.if, state)); }
    catch (e) { error(`${id}: ${e.message}`); return; }
    if (visible.length < 2) { error(`${id}: only ${visible.length} visible option(s) for vars=${JSON.stringify(state.vars)} flags=${[...state.flags].join(',')}`); return; }
    visible.forEach((choice, index) => {
      const branch = { ...state, vars: { ...state.vars }, flags: new Set(state.flags), achs: new Set(state.achs), choices: [...state.choices, { nodeId: id, index, text: choice.text }] };
      applyEffects(branch, choice.changes, `${id}.choices[${index}]`);
      walk({ ...branch, nodeId: choice.next }, nextAncestry);
    });
  }
}

validateSource();
walk(initial);
for (const id of nodeIds) if (!reached.has(id)) error(`unreachable node: ${id}`);
const endingIds = new Set(routesFound.map((route) => route.endingId));
const expectedEndings = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8'];
for (const id of expectedEndings) if (!endingIds.has(id)) error(`ending is not reachable: ${id}`);
for (const id of endingIds) if (!expectedEndings.includes(id)) error(`unexpected ending id: ${id}`);
const oddChoiceRoutes = routesFound.filter((route) => route.choices.length < 6 || route.choices.length > 10);
for (const route of oddChoiceRoutes) warn(`${route.endingId}: route has ${route.choices.length} choices (plan target 6–10)`);

const used = { bg: new Set(), cg: new Set(), lihui: new Set() };
for (const node of Object.values(nodes)) {
  if (node.scene) used.bg.add(node.scene);
  if (node.cg) used.cg.add(node.cg);
  for (const segment of node.segments ?? []) {
    if (!segment.stage) continue;
    for (const [slot, value] of Object.entries(segment.stage)) {
      if (slot === 'clear' || value === null) continue;
      used.lihui.add(value);
    }
  }
}

const manifestFile = path.join(GAME, 'assets', 'manifest.js');
let manifest = null;
if (fs.existsSync(manifestFile)) {
  const context = { window: { HuaPi: {} } };
  try { vm.runInNewContext(fs.readFileSync(manifestFile, 'utf8'), context, { timeout: 1000 }); manifest = context.window.HuaPi.ART ?? null; }
  catch (e) { error(`manifest.js could not be loaded: ${e.message}`); }
}
const coverage = [];
if (!manifest) {
  warn('asset manifest not generated yet; asset coverage deferred until P3.');
} else {
  for (const [kind, ids] of Object.entries(used)) {
    for (const id of ids) {
      const rel = manifest[kind]?.[id];
      if (!rel) { coverage.push({ kind, id, ok: false, reason: 'not in manifest' }); continue; }
      const full = path.resolve(GAME, rel);
      const ok = full.startsWith(`${GAME}${path.sep}`) && fs.existsSync(full);
      coverage.push({ kind, id, ok, reason: ok ? '' : 'file missing or path escapes game directory' });
    }
  }
  const missing = coverage.filter((item) => !item.ok);
  if (missing.length) {
    const message = `${missing.length}/${coverage.length} referenced assets missing: ${missing.map((x) => `${x.kind}.${x.id} (${x.reason})`).join(', ')}`;
    if (STRICT) error(message); else warn(message);
  }
}

const grouped = new Map();
for (const route of routesFound) {
  if (!grouped.has(route.endingId)) grouped.set(route.endingId, []);
  grouped.get(route.endingId).push(route);
}
const shortest = [...grouped.entries()].map(([endingId, candidates]) => [endingId, candidates.reduce((best, current) => current.choices.length < best.choices.length ? current : best)]);
const allText = Object.values(nodes).flatMap((node) => node.segments ?? []).map((segment) => segment.text).join('');
const totalChars = charLength(allText);
const maxDuration = Math.max(0, ...routesFound.map((route) => route.durationMs));

function nodeReadable(id) {
  const node = nodes[id];
  const lines = [`#### ${id}${node.card ? ` · ${node.card}` : ''}`];
  for (const segment of node.segments ?? []) {
    const who = segment.speaker ? `**${cast[segment.speaker].name}**：` : '';
    lines.push(`- ${who}${segment.text}`);
  }
  if (node.choices) lines.push('', '**选择**', ...node.choices.map((choice, i) => `- ${i + 1}. ${choice.text}${choice.if ? `（条件：${choice.if}）` : ''} → \`${choice.next}\``));
  if (node.routes) lines.push('', `**条件路由**：${node.routes.map((route) => `${route.if} → \`${route.next}\``).join('；')}`);
  if (node.next) lines.push('', `**自动前往**：\`${node.next}\``);
  if (node.isEnding) lines.push('', `**结局 ${node.ending.id} · ${node.ending.title}**：${node.ending.closing}`, '', `> ${node.ending.commentary}`);
  return lines.join('\n');
}

const readLines = ['# 《画皮》剧本审读稿', '', `> 源：\`story/painted-skin.json\`。全图共 ${nodeIds.size} 节点；下列为每个结局的一条最短可达路线，所有节点文本、选择和自动出口均展开。`, ''];
for (const [endingId, route] of shortest.sort((a, b) => a[0].localeCompare(b[0]))) {
  readLines.push(`## ${endingId} · ${route.title}`, '', `路线选择数：${route.choices.length}；段落 ${route.lineCount}；约 ${Math.ceil(route.durationMs / 60000)} 分钟。`, '');
  for (const id of route.nodePath) readLines.push(nodeReadable(id), '');
}
if (story.meta?.review?.knowledge?.length) {
  readLines.push('## 「妒」线知情表', '', '| 节点 | 王生 | 陈氏 | 梦盈 |', '|---|---|---|---|');
  for (const item of story.meta.review.knowledge) readLines.push(`| ${item.node} | ${item.wang} | ${item.chen} | ${item.nv} |`);
  readLines.push('');
}

const lintLines = [
  '# 剧本校验报告', '', `生成时间：${new Date().toISOString()}`, '',
  `- 模式：${STRICT ? 'strict' : 'standard'}`, `- 节点：${nodeIds.size}`, `- 穷举状态：${explored}`, `- 可达完整路线：${routesFound.length}`,
  `- 结局：${endingIds.size}/8`, `- 全图剧本文字：${totalChars} 字符`, `- 最长路线：${(maxDuration / 60000).toFixed(1)} 分钟`,
  `- 错误：${errors.length}`, `- 警告：${warnings.length}`, '', '## 结局可达性与路线统计', '',
  '| 结局 | 路线数 | 最少/最多选择 | 最短路线段落 | 字符 | 默认节奏时长 | 最短选项序列（1 起） |',
  '|---|---:|---:|---:|---:|---:|---|'
];
for (const [endingId, candidates] of [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  const minChoices = Math.min(...candidates.map((route) => route.choices.length));
  const maxChoices = Math.max(...candidates.map((route) => route.choices.length));
  const best = candidates.reduce((a, b) => a.choices.length <= b.choices.length ? a : b);
  const sequence = best.choices.map((choice) => `${choice.nodeId}:${choice.index + 1}`).join(' → ');
  lintLines.push(`| ${endingId} · ${best.title} | ${candidates.length} | ${minChoices}/${maxChoices} | ${best.lineCount} | ${best.charCount} | ${(best.durationMs / 60000).toFixed(1)} 分钟 | ${sequence} |`);
}
lintLines.push('', '## 素材覆盖', '');
if (!manifest) lintLines.push('尚未生成 manifest.js；P1A / G1 阶段按计划将缺图视为警告。P5 的 `--strict` 将校验所有被引用素材。');
else {
  lintLines.push(`覆盖：${coverage.filter((item) => item.ok).length}/${coverage.length}（${coverage.length ? (coverage.filter((item) => item.ok).length / coverage.length * 100).toFixed(1) : '100.0'}%）`, '');
  if (coverage.length) lintLines.push('| 类型 | ID | 状态 |', '|---|---|---|', ...coverage.map((item) => `| ${item.kind} | ${item.id} | ${item.ok ? '✅' : `❌ ${item.reason}`} |`));
}
lintLines.push('', '## 自检与错误', '', ...(errors.length ? errors.map((item) => `- ❌ ${item}`) : ['- ✅ 结构、出口、条件、可达性和选择密度均通过。']), '', '## 警告', '', ...(warnings.length ? warnings.map((item) => `- ⚠️ ${item}`) : ['- 无']), '');

const usageLines = ['# 剧本素材用量', '', '由 `tools/build-story.mjs` 生成。只列入运行路线实际引用的资源。', '', '## 背景', '', ...[...used.bg].sort().map((id) => `- \`${id}\` — ${story.scenes[id]?.name ?? id}`), '', '## CG', '', ...[...used.cg].sort().map((id) => `- \`${id}\` — ${story.cgs[id]?.name ?? id}`), '', '## 立绘', '', ...[...used.lihui].sort().map((id) => `- \`${id}\``), '', `覆盖合计：${coverage.length ? `${coverage.filter((item) => item.ok).length}/${coverage.length}` : '待 manifest.js 生成后核验'}`, ''];

if (errors.length) {
  console.error(`build-story found ${errors.length} error(s); generated outputs were not written.`);
  for (const message of errors) console.error(`❌ ${message}`);
  for (const message of warnings) console.warn(`⚠️ ${message}`);
  process.exit(1);
}

fs.writeFileSync(path.join(GAME, 'game', 'storyData.js'), `window.HuaPi = window.HuaPi || {};\nwindow.HuaPi.STORY = ${JSON.stringify(story, null, 2)};\n`, 'utf8');
fs.writeFileSync(path.join(GAME, 'story', 'READ.md'), `${readLines.join('\n')}\n`, 'utf8');
fs.writeFileSync(path.join(GAME, 'story', 'LINT.md'), `${lintLines.join('\n')}\n`, 'utf8');
fs.writeFileSync(path.join(GAME, 'art', 'USAGE.md'), `${usageLines.join('\n')}\n`, 'utf8');
console.log(`✅ ${nodeIds.size} nodes, ${routesFound.length} routes, ${endingIds.size}/8 endings, ${totalChars} story characters.`);
if (warnings.length) for (const message of warnings) console.warn(`⚠️ ${message}`);
else console.log('✅ no warnings');
