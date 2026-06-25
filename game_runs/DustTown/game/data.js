/* DustTown — 数值常量/镇民/打手/章节表从 game-logic.js 顶部平移。 */
const GAME_W = 960;
const GAME_H = 540;
const MAP_W = 1280;
const MAP_H = 1280;
const PLAYER_SPEED = 190;
const WIN_SCORE = 5;
const DEATH_BUDGET = 4;
const SPAWN = { x: 70, y: 70 };

const NPCS = [
  { name: '杂货店老板', x: 300, y: 300, line: '卡特帮每月来收“保护费”……前任警长就是在查账本时不见的。' },
  { name: '牧师',       x: 820, y: 270, line: '我在教堂后看见他们半夜埋了样东西，愿主宽恕我没敢声张。' },
  { name: '铁匠',       x: 340, y: 820, line: '他们逼我改枪管。枪身刻着卡特的狼头记号，错不了。' },
  { name: '酒馆女招待', x: 900, y: 880, line: '头目卡特喝醉时漏的嘴——前警长的徽章还锁在他保险柜里。' },
  { name: '受惊的男孩', x: 620, y: 560, line: '那天夜里……是我看见谁开的枪。我可以作证，警长女士。' },
];
const THUGS = [
  { x: 520, y: 420, axis: 'x', range: 220 },
  { x: 760, y: 700, axis: 'y', range: 200 },
  { x: 380, y: 980, axis: 'x', range: 180 },
];
// 三章护卫增援（按章激活）：二章 +1、三章法庭前 +2
const REINFORCE = [
  { x: 900, y: 520, axis: 'y', range: 220, ch: 1 },
  { x: 1080, y: 320, axis: 'y', range: 180, ch: 2 },
  { x: 980, y: 220, axis: 'x', range: 160, ch: 2 },
];
const COURT = { x: 1120, y: 160, r: 70 };

const CHAPTERS = [
  { name: '尘土主街', upTo: 2, thug: 80,
    intro: ['第一章 · 尘土主街',
      '新警长杰西·摩根接管了枯井镇。前任警长离奇失踪，卡特帮盘踞已久。\nWASD / 方向键 走动，走到镇民身边按 E 倾听证词。\n挨家走访，撬开颤抖的镇民紧闭的嘴。'] },
  { name: '后巷', upTo: 4, thug: 110,
    intro: ['第二章 · 后巷',
      '卡特帮察觉了杰西的调查，打手在街巷里游荡得更凶。\n关键证人藏在危险的后巷深处——\n撞上打手就是一顿毒打，绕开他们的巡逻线。'] },
  { name: '法庭广场', upTo: 5, thug: 140,
    intro: ['第三章 · 法庭广场',
      '最后一份证词到手，但卡特帮已在法庭前布下重兵。\n带着铁证，突破护卫，推开法庭大门——\n把真相，钉上法庭的门。'] },
];
