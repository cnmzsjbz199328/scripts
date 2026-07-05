import sharp from 'sharp';
const D='game_runs/ShadowAbyss/scene';
const items=['gluttony','greed','wrath','heresy','violence','fraud','betrayal'];
const W=440,H=248,cols=2;const rows=Math.ceil(items.length/cols);
const comps=[];
for(let i=0;i<items.length;i++){
  const png=await sharp(`${D}/panorama_${items[i]}.png`).resize(W-8,H-8,{fit:'fill'}).png().toBuffer();
  comps.push({input:png,left:(i%cols)*W+4,top:Math.floor(i/cols)*H+4});
}
await sharp({create:{width:W*cols,height:H*rows,channels:4,background:'#444'}}).composite(comps).png().toFile('scratch/_pano_sheet.png');
console.log('ok');
