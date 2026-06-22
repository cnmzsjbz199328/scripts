/* ShadowNinja 环境帧 —— 引用 svg-ambient skill（唯一真源），只把用到的元素
 * 以"将军府之夜"夜色调渲染进本游戏自己的 assets/svg/（构建产物，保持自包含）。
 *   node scratch/gen_shadowninja_ambient.mjs
 *
 * 用到三个元素，对应 GDD 的氛围：流云(夜空) / 火盆(campfire 暖光) / 破幡(灰旗)。
 */
import { make } from '../skills/svg-ambient/ambient.mjs';
import fs from 'fs';

const OUT = 'game_runs/ShadowNinja/assets/svg';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const PICKS = [
  // 流云：夜空冷色、低透、慢漂
  ['cloud', { speed: 0.6, palette: { cloud: '#16202f' } }],
  // 火盆：暖橙火焰（沿用默认暖色，正合"红火盆/暖灯"）
  ['campfire', {}],
  // 破幡：褪色灰布、无徽记、近黑旗杆 —— 同一个 flag() 工厂换调色即成
  ['flag', { palette: { cloth: '#3a4150', emblem: 'none', outline: '#10131f', pole: '#0a0c12', knob: '#1a2230' } }],
];

let n = 0;
for (const [name, opts] of PICKS) {
  make(name, opts).forEach((svg, i) => {
    fs.writeFileSync(`${OUT}/amb_${name}_${i}.svg`, svg);
    n++;
  });
}
console.log(`ShadowNinja ambient: ${n} frames → ${OUT}`);
