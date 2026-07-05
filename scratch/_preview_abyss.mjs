import sharp from 'sharp';
import fs from 'fs';
const DIR='game_runs/ShadowAbyss/assets/svg';
const rows=[
  ['dante_idle_0','dante_walk_0','dante_walk_2','dante_walk_4','dante_jump_0','dante_jump_1','dante_jump_2'],
  ['virgil_idle_0','virgil_walk_0','virgil_walk_2','virgil_walk_4','soul_flutter_0','soul_flutter_1','tile_rock'],
];
const CELL=140, pad=6;
const W=CELL*7, H=CELL*2;
const base=sharp({create:{width:W,height:H,channels:4,background:'#cfd6e0'}});
const comps=[];
for(let r=0;r<rows.length;r++)for(let c=0;c<rows[r].length;c++){
  const f=`${DIR}/${rows[r][c]}.svg`; if(!fs.existsSync(f))continue;
  const png=await sharp(f,{density:140}).resize(CELL-2*pad,CELL-2*pad,{fit:'contain',background:'#cfd6e0'}).png().toBuffer();
  comps.push({input:png,left:c*CELL+pad,top:r*CELL+pad});
}
await base.composite(comps).png().toFile('scratch/_abyss_sheet.png');
console.log('written scratch/_abyss_sheet.png');
