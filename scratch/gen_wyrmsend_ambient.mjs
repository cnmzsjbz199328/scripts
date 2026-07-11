/* WyrmsEnd 前景帧 —— 引用 svg-ambient skill（唯一真源），渲染草丛/植被簇剪影
 * 进本游戏 assets/svg/（构建产物，保持自包含）。
 *   node scratch/gen_wyrmsend_ambient.mjs
 *
 * 5 段 × 2 簇形变体 × 8 帧。色板跟随 Forge.BG_FALLBACK 的暖→冷单调渐变：
 * 前景是最近的层，比 mid 更深（近墨），花尖点缀讲堕落叙事——
 * 麦田暗金穗 → 沙金残穗 → 隘口荆棘(无花) → 骨原灰白尖 → 龙巢余烬。
 */
import { make } from '../skills/svg-ambient/ambient.mjs';
import fs from 'fs';

const OUT = 'game_runs/WyrmsEnd/assets/svg';
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// 每段 [blade, blade2, flower]：blade2 取该段 mid 色（与中景剪影同族），blade 再压深一档
const SEGS = [
  ['#140a05', '#1e100a', '#8a6226'],   // 第1段 · 麦田：暖褐 + 暗金穗
  ['#120c07', '#1b120c', '#6e5a3c'],   // 第2段 · 战场：沙褐 + 褪色残穗
  ['#0f0d0b', '#161311', 'none'],      // 第3段 · 隘口：石灰荆棘，不开花
  ['#0c0b0a', '#11100f', '#4a4640'],   // 第4段 · 骨原：冷灰 + 骨白尖
  ['#070605', '#0a0908', '#7a3a16'],   // 第5段 · 龙巢：炭黑 + 余烬
];

let n = 0;
SEGS.forEach(([blade, blade2, flower], seg) => {
  for (let v = 0; v < 2; v++) {
    const frames = make('grass', {
      seed: seg * 17 + v * 5 + 3,
      blades: v === 0 ? 9 : 7,
      speed: 1,
      palette: { blade, blade2, flower },
    });
    frames.forEach((svg, i) => {
      fs.writeFileSync(`${OUT}/amb_grass_s${seg}v${v}_${i}.svg`, svg);
      n++;
    });
  }
});
console.log(`WyrmsEnd ambient: ${n} frames → ${OUT}`);
