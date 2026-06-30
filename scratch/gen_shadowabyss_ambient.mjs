/* ShadowAbyss 环境动态层素材生成器（svg-ambient 轨）。
 * 九圈各一套枯树(摇曳6帧)+流雾(漂移8帧)配色；欲色额外一套风痕(4帧)。
 * 渲染进 game_runs/ShadowAbyss/assets/svg/，零图像额度。Phaser 侧做视差/离散云/帧循环。 */
import fs from 'fs';
import { make } from '../skills/svg-ambient/ambient.mjs';

const OUT = 'game_runs/ShadowAbyss/assets/svg';
fs.mkdirSync(OUT, { recursive: true });
const write = (id, el, opts) => make(el, opts).forEach((svg, i) =>
  fs.writeFileSync(`${OUT}/amb_${id}_${i}.svg`, svg));

// 各圈配色：tree {trunk,f1,f2,f3} / fog {cloud}
const PAL = {
  limbo:    { tree: ['#06080e', '#0a0e16', '#10141e', '#171c28'], fog: '#2a3140' },
  lust:     { tree: ['#0a0508', '#140a0e', '#1d0e14', '#28121a'], fog: '#2e1622' },
  gluttony: { tree: ['#070a06', '#0c120a', '#121a0e', '#1b2614'], fog: '#1c2616' },
  greed:    { tree: ['#0a0803', '#14110a', '#1d1810', '#2a2316'], fog: '#241d10' },
  wrath:    { tree: ['#05080a', '#0a1014', '#0e171a', '#142226'], fog: '#101e1c' },
  heresy:   { tree: ['#0a0404', '#160a08', '#20100c', '#2c1812'], fog: '#2a1410' },
  violence: { tree: ['#0c0303', '#1a0807', '#260c0a', '#34120e'], fog: '#300f0e' },
  fraud:    { tree: ['#06050a', '#0d0a16', '#130f1f', '#1c1730'], fog: '#181024' },
  betrayal: { tree: ['#0a0e14', '#141c26', '#1e2a38', '#2c3e50'], fog: '#223040' },
};

for (const [id, p] of Object.entries(PAL)) {
  write(`tree_${id}`, 'tree', { frames: 6, palette: { trunk: p.tree[0], f1: p.tree[1], f2: p.tree[2], f3: p.tree[3] } });
  write(`fog_${id}`, 'cloud', { frames: 8, speed: 0.7, scale: 1.2, palette: { cloud: p.fog } });
}

// 风痕（情欲之风，4 帧，仅欲色）
write('wind_lust', 'wind', { frames: 4, speed: 1.2, palette: { trail: '#5a3038' } });

const made = fs.readdirSync(OUT).filter(f => f.startsWith('amb_'));
console.log(`ambient 素材已生成：${made.length} 个`);
console.log([...new Set(made.map(f => f.replace(/_\d+\.svg$/, '')))].join(', '));
