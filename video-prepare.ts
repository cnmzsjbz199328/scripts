/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';

function prepare(projectName: string) {
  const runDir = path.join('./video_runs', projectName);

  for (const dir of [runDir, path.join(runDir, 'animations'), path.join(runDir, 'output')]) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const manifestPath = path.join(runDir, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    console.log(`Project already exists: ${runDir}`);
    return;
  }

  fs.writeFileSync(manifestPath, JSON.stringify({
    name: projectName,
    created_at: new Date().toISOString(),
    animations: {}
  }, null, 2));

  console.log(`Initialized: ${runDir}`);
}

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: npx tsx video-prepare.ts <ProjectName>');
  process.exit(1);
}

prepare(args[0]);
