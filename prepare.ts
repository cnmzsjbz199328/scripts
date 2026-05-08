/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';

const PET_RUNS_DIR = './pet_runs';

async function prepare(petName: string) {
  const runDir = path.join(PET_RUNS_DIR, petName);
  const referenceDir = path.join(runDir, 'reference');
  const rowsDir = path.join(runDir, 'rows');
  const outputDir = path.join(runDir, 'output');

  if (!fs.existsSync(PET_RUNS_DIR)) fs.mkdirSync(PET_RUNS_DIR);
  if (!fs.existsSync(runDir)) fs.mkdirSync(runDir);
  if (!fs.existsSync(referenceDir)) fs.mkdirSync(referenceDir);
  if (!fs.existsSync(rowsDir)) fs.mkdirSync(rowsDir);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  const manifest = {
    name: petName,
    status: 'initialized',
    created_at: new Date().toISOString(),
    reference: { status: 'pending' },
    rows: {
      base: { status: 'pending' },
      idle: { status: 'pending' },
      'swift-to-girl': { status: 'pending' },
      'running-left': { status: 'pending' },
      waving: { status: 'pending' },
      jumping: { status: 'pending' },
      failed: { status: 'pending' },
      review: { status: 'pending' },
      sleeping: { status: 'pending' }
    }
  };

  fs.writeFileSync(
    path.join(runDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  console.log(`Pet run initialized at: ${runDir}`);
}

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("Usage: npx tsx scripts/prepare.ts <pet_name>");
  process.exit(1);
}

prepare(args[0]);
