/* ShadowAbyss 叙事版前景雾素材（svg-ambient 轨）：四章各一套近地流雾(8帧)。
 * 地面遮罩带本体是运行时 canvas 程序化生成（ui.js _makeGroundBands），这里只出雾。 */
import fs from 'fs';
import { make } from '../skills/svg-ambient/ambient.mjs';

const OUT = 'game_runs/ShadowAbyss/assets/svg';
fs.mkdirSync(OUT, { recursive: true });

// 章配色：1 森林冷绿 / 2 地狱烬红 / 3 炼狱青金 / 4 天堂云乳
const PAL = { 1: '#26332c', 2: '#2c1712', 3: '#20323a', 4: '#efe3c4' };

for (const [ch, cloud] of Object.entries(PAL))
  make('cloud', { frames: 8, speed: 0.6, scale: 1.25, palette: { cloud } })
    .forEach((svg, i) => fs.writeFileSync(`${OUT}/amb_chfog_ch${ch}_${i}.svg`, svg));

console.log('前景雾已生成：4 章 × 8 帧');
