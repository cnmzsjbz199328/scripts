/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';

const TEXTURE_RUNS_DIR = './texture_runs';

async function prepare(projectName: string) {
  const runDir = path.join(TEXTURE_RUNS_DIR, projectName);
  const outputDir = path.join(runDir, 'output');

  if (!fs.existsSync(TEXTURE_RUNS_DIR)) fs.mkdirSync(TEXTURE_RUNS_DIR);
  if (!fs.existsSync(runDir)) fs.mkdirSync(runDir, { recursive: true });
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const manifestPath = path.join(runDir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    console.log(`Texture project already exists at: ${runDir}`);
    return;
  }

  const manifest = {
    name: projectName,
    status: 'initialized',
    created_at: new Date().toISOString(),
    textures: {}
  };

  fs.writeFileSync(
    manifestPath,
    JSON.stringify(manifest, null, 2)
  );

  console.log(`Texture project initialized at: ${runDir}`);
}

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("Usage: npx tsx scripts/texture-prepare.ts <ProjectName>");
  process.exit(1);
}

prepare(args[0]);
