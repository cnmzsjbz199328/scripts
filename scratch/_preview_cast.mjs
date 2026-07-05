import sharp from 'sharp';
const DIR='game_runs/ShadowAbyss/assets/svg';
const items=['virgil_idle_0','virgil_walk_3','soul_flutter_0','fiend_move_0','fiend_move_1'];
const CELL=200, comps=[];
for(let i=0;i<items.length;i++){
  const png=await sharp(`${DIR}/${items[i]}.svg`,{density:200}).resize(CELL-8,CELL-8,{fit:'contain',background:'#c8cdd6'}).png().toBuffer();
  comps.push({input:png,left:CELL*i+4,top:4});
}
await sharp({create:{width:CELL*items.length,height:CELL,channels:4,background:'#c8cdd6'}}).composite(comps).png().toFile('scratch/_cast.png');
console.log('ok');
