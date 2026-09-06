/**
 * Read-only audit for the ThreeMoves character frame pipeline.
 *
 * Usage:
 *   npx tsx skills/char-sprite/audit.ts ThreeMoves
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const FRAME_WIDTH = 192;
const FRAME_HEIGHT = 208;
const FRAME_COUNT = 9;
const EXPECTED_ROWS = ['attack', 'guard', 'ability', 'special'];
const GREEN_THRESHOLD = 0.003;
const STRAY_THRESHOLD = 0.95;
const BASELINE_THRESHOLD = 12;
const SCALE_THRESHOLD = 1.45;

type Flag = 'STRAY' | 'BASELINE' | 'GREEN' | 'BROKEN' | 'SCALE';

interface FrameMetrics {
  width: number;
  height: number;
  opaque: number;
  green: number;
  maxComponent: number;
  baseline: number | null;
  bbox: { width: number; height: number } | null;
}

interface ActionReport {
  character: string;
  action: string;
  frames: FrameMetrics[];
  flags: Set<Flag>;
  classification: 'R' | 'N';
}

function isGreen(r: number, g: number, b: number): boolean {
  return g > 90 && g > r * 1.25 && g > b * 1.25;
}

function connectedComponents(data: Buffer, width: number, height: number): number[] {
  const seen = new Uint8Array(width * height);
  const areas: number[] = [];
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || data[start * 4 + 3] <= 16) continue;
    seen[start] = 1;
    const stack = [start];
    let area = 0;
    while (stack.length) {
      const curr = stack.pop()!;
      area++;
      const x = curr % width;
      const y = Math.floor(curr / width);
      const neighbors = [
        x > 0 ? curr - 1 : -1,
        x < width - 1 ? curr + 1 : -1,
        y > 0 ? curr - width : -1,
        y < height - 1 ? curr + width : -1,
      ];
      for (const next of neighbors) {
        if (next >= 0 && !seen[next] && data[next * 4 + 3] > 16) {
          seen[next] = 1;
          stack.push(next);
        }
      }
    }
    areas.push(area);
  }
  return areas.sort((a, b) => b - a);
}

async function inspectFrame(framePath: string): Promise<FrameMetrics> {
  const { data, info } = await sharp(framePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let opaque = 0;
  let green = 0;
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  const rowOpaque = new Uint32Array(info.height);
  for (let i = 0; i < info.width * info.height; i++) {
    const alpha = data[i * 4 + 3];
    if (alpha <= 16) continue;
    opaque++;
    const x = i % info.width;
    const y = Math.floor(i / info.width);
    rowOpaque[y]++;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    if (isGreen(data[i * 4], data[i * 4 + 1], data[i * 4 + 2])) green++;
  }
  const nonEmptyRows = Array.from(rowOpaque).map((n, y) => n ? y : -1).filter(y => y >= 0);
  return {
    width: info.width,
    height: info.height,
    opaque,
    green,
    maxComponent: connectedComponents(data, info.width, info.height)[0] ?? 0,
    baseline: nonEmptyRows.length ? Math.max(...nonEmptyRows) : null,
    bbox: maxX >= 0 ? { width: maxX - minX + 1, height: maxY - minY + 1 } : null,
  };
}

function flagsFor(frames: FrameMetrics[]): Set<Flag> {
  const flags = new Set<Flag>();
  const baselineValues = frames.map(f => f.baseline).filter((v): v is number => v !== null);
  if (frames.some(f => f.width !== FRAME_WIDTH || f.height !== FRAME_HEIGHT || f.opaque < FRAME_WIDTH * FRAME_HEIGHT * 0.02)) flags.add('BROKEN');
  if (frames.some(f => f.opaque > 0 && f.maxComponent / f.opaque < STRAY_THRESHOLD)) flags.add('STRAY');
  if (baselineValues.length && Math.max(...baselineValues) - Math.min(...baselineValues) > BASELINE_THRESHOLD) flags.add('BASELINE');
  if (frames.some(f => f.opaque > 0 && f.green / f.opaque > GREEN_THRESHOLD)) flags.add('GREEN');
  const heights = frames.map(f => f.bbox?.height ?? 0).filter(Boolean);
  const widths = frames.map(f => f.bbox?.width ?? 0).filter(Boolean);
  if (heights.length && Math.max(...heights) / Math.min(...heights) > SCALE_THRESHOLD) flags.add('SCALE');
  if (widths.length && Math.max(...widths) / Math.min(...widths) > SCALE_THRESHOLD) flags.add('SCALE');
  return flags;
}

function classify(flags: Set<Flag>): 'R' | 'N' {
  // R candidates are hard visual defects or unusable frames. BASELINE, mild SCALE,
  // and GREEN are pipeline candidates until the contact sheet is manually checked.
  return flags.has('BROKEN') ? 'R' : 'N';
}

async function auditCharacter(root: string, character: string): Promise<ActionReport[]> {
  const reports: ActionReport[] = [];
  for (const action of EXPECTED_ROWS) {
    const rowDir = path.join(root, character, 'rows', action);
    const framePaths = Array.from({ length: FRAME_COUNT }, (_, i) => path.join(rowDir, `frame_${i}.png`));
    const frames: FrameMetrics[] = [];
    for (const framePath of framePaths) {
      if (!fs.existsSync(framePath)) {
        frames.push({ width: 0, height: 0, opaque: 0, green: 0, maxComponent: 0, baseline: null, bbox: null });
      } else {
        frames.push(await inspectFrame(framePath));
      }
    }
    const flags = flagsFor(frames);
    reports.push({ character, action, frames, flags, classification: classify(flags) });
  }
  return reports;
}

function frameDetails(report: ActionReport): string {
  return report.frames.map((f, i) => {
    const componentRatio = f.opaque ? f.maxComponent / f.opaque : 0;
    const greenRatio = f.opaque ? f.green / f.opaque : 0;
    const bbox = f.bbox ? `${f.bbox.width}x${f.bbox.height}` : 'empty';
    return `f${i}:comp=${(componentRatio * 100).toFixed(1)}% base=${f.baseline ?? '-'} green=${(greenRatio * 100).toFixed(2)}% bbox=${bbox}`;
  }).join(' | ');
}

async function main() {
  const dataset = process.argv[2] ?? 'ThreeMoves';
  const root = path.join('./char_runs', dataset);
  if (!fs.existsSync(root)) throw new Error(`Dataset not found: ${root}`);
  const characters = fs.readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('_'))
    .filter(entry => EXPECTED_ROWS.every(row => fs.existsSync(path.join(root, entry.name, 'rows', row))))
    .map(entry => entry.name)
    .sort();
  const reports = (await Promise.all(characters.map(character => auditCharacter(root, character)))).flat();
  console.log('character\taction\tclass\tflags\tframe metrics');
  for (const report of reports) {
    console.log(`${report.character}\t${report.action}\t${report.classification}\t${[...report.flags].join(',') || '-'}\t${frameDetails(report)}`);
  }
  const byAction = new Map<string, { classification: 'R' | 'N'; flags: Set<Flag> }>();
  for (const report of reports) {
    const key = `${report.character}/${report.action}`;
    byAction.set(key, { classification: report.classification, flags: report.flags });
  }
  const rCandidates = [...byAction.entries()].filter(([, r]) => r.classification === 'R');
  console.log(`\nSummary: ${reports.length} actions, ${reports.reduce((n, r) => n + r.frames.length, 0)} frames, R candidates=${rCandidates.length}`);
  console.log(`R candidates: ${rCandidates.map(([key, r]) => `${key}[${[...r.flags].join(',')}]`).join(', ') || 'none'}`);
  console.log('Manual contact-sheet review remains required for detached limbs, equipment consistency, and recognizable magic/effects.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
