import sharp from 'sharp';
const DIR='game_runs/ShadowAbyss/assets/svg';
const items=['dante_idle_0','dante_idle_2','dante_walk_1','dante_walk_4','dante_jump_0','dante_jump_1','dante_jump_2'];
const CELL=220;
const comps=[];
for(let i=0;i<items.length;i++){
  const png=await sharp(`${DIR}/${items[i]}.svg`,{density:200}).resize(CELL-8,CELL-8,{fit:'contain',background:'#c8cdd6'}).png().toBuffer();
  comps.push({input:png,left:CELL*i+4,top:4});
}
await sharp({create:{width:CELL*items.length,height:CELL,channels:4,background:'#c8cdd6'}}).composite(comps).png().toFile('scratch/_hands.png');
console.log('ok '+items.join(', '));
