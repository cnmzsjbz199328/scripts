/* ShadowAbyss — 把剧本真源 story/divine-comedy.json 包装成经典 <script> 全局 game/storyData.js。
 * 剧本改动后重跑：node scratch/gen_shadowabyss_story.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'game_runs', 'ShadowAbyss');
const src = JSON.parse(fs.readFileSync(path.join(root, 'story', 'divine-comedy.json'), 'utf8'));

const out = '/* 由 scratch/gen_shadowabyss_story.mjs 从 story/divine-comedy.json 生成——勿手改，改剧本后重跑。 */\n'
  + 'const STORY = ' + JSON.stringify(src, null, 1) + ';\n';
fs.writeFileSync(path.join(root, 'game', 'storyData.js'), out);
console.log('storyData.js written:', Object.keys(src.nodes).length, 'nodes');
