/* ShadowAbyss 环境动态层素材生成器（svg-ambient 轨）。
 * make() 出枯树/流雾/风痕，按圈配色，渲染进 game_runs/ShadowAbyss/assets/svg/。
 * 零图像额度；Phaser 侧做视差带 + 帧循环。粒子类（灰烬/火星）在引擎里直接用色点。 */
import fs from 'fs';
import { make } from '../skills/svg-ambient/ambient.mjs';

const OUT = 'game_runs/ShadowAbyss/assets/svg';
fs.mkdirSync(OUT, { recursive: true });

// write(输出名, 库元素名, opts)
const write = (id, el, opts) => make(el, opts).forEach((svg, i) =>
  fs.writeFileSync(`${OUT}/amb_${id}_${i}.svg`, svg));

// ── 枯树（摇曳，6 帧）：林勃灰 / 欲色暗红 ──
write('tree_limbo', 'tree', { frames: 6, palette: { trunk: '#06080e', f1: '#0a0e16', f2: '#10141e', f3: '#171c28' } });
write('tree_lust',  'tree', { frames: 6, palette: { trunk: '#0a0508', f1: '#140a0e', f2: '#1d0e14', f3: '#28121a' } });

// ── 流雾带（漂移，8 帧）：林勃冷灰 / 欲色暗紫红 ──
write('fog_limbo', 'cloud', { frames: 8, speed: 0.6, scale: 1.2, palette: { cloud: '#2a3140' } });
write('fog_lust',  'cloud', { frames: 8, speed: 0.9, scale: 1.2, palette: { cloud: '#2e1622' } });

// ── 风痕（情欲之风，4 帧，仅第二圈）：暗尘红 ──
write('wind_lust', 'wind', { frames: 4, speed: 1.2, palette: { trail: '#5a3038' } });

const made = fs.readdirSync(OUT).filter(f => f.startsWith('amb_'));
console.log(`ambient 素材已生成：${made.length} 个`);
console.log([...new Set(made.map(f => f.replace(/_\d+\.svg$/, '')))].join(', '));
