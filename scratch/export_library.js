import fs from 'fs';
import path from 'path';

const SRC_DIR = 'game_runs/AmbientSandbox/assets/svg';
const DEST_DIR = 'references/ambient/svg';
const GEN_SRC = 'scratch/gen_ambient_sandbox.mjs';
const GEN_DEST = 'references/ambient/generator.mjs';

// 1. 创建目标目录
if (!fs.existsSync(DEST_DIR)) {
  fs.mkdirSync(DEST_DIR, { recursive: true });
}

// 2. 复制 SVG 文件
const files = fs.readdirSync(SRC_DIR);
let count = 0;
files.forEach(file => {
  if (file.endsWith('.svg')) {
    fs.copyFileSync(path.join(SRC_DIR, file), path.join(DEST_DIR, file));
    count++;
  }
});
console.log(`Copied ${count} SVG files to ${DEST_DIR}`);

// 3. 复制生成器脚本
fs.copyFileSync(GEN_SRC, GEN_DEST);
console.log(`Copied generator script to ${GEN_DEST}`);
