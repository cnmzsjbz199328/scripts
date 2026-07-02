import sharp from 'sharp';
const DIR='game_runs/ShadowAbyss/assets/svg';
const items=['fiend_move_0','fiend_move_1','satan_0','satan_1'];
const CELL=170,comps=[];
for(let i=0;i<items.length;i++){
  const png=await sharp(`${DIR}/${items[i]}.svg`,{density:140}).resize(CELL-8,CELL-8,{fit:'contain',background:'#c8cdd6'}).png().toBuffer();
  comps.push({input:png,left:i*CELL+4,top:4});
}
await sharp({create:{width:CELL*4,height:CELL,channels:4,background:'#c8cdd6'}}).composite(comps).png().toFile('scratch/_creatures.png');
console.log('ok');
