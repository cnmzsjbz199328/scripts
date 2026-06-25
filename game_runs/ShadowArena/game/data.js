/* ShadowArena — 数值常量/角色表/动作表从 game-logic.js 顶部平移。 */
const GAME_W = 960;
const GAME_H = 540;
const FLOOR_Y = 452;
const GRAVITY = 1500;

const CHARS = {
  samurai: { name: '武士', hp: 100, speed: 155, reach: 84, punch: 9, kick: 13, special: 'dash', spDmg: 22, accent: '#e6c862', sword: true },
  ninja:   { name: '影忍', hp: 88,  speed: 205, reach: 60, punch: 7, kick: 10, special: 'shuriken', spDmg: 14, accent: '#7fd0ff' },
  monk:    { name: '武僧', hp: 108, speed: 150, reach: 66, punch: 8, kick: 12, special: 'qi', spDmg: 18, accent: '#9fe6c4' },
  brawler: { name: '力士', hp: 132, speed: 120, reach: 74, punch: 12, kick: 16, special: 'shock', spDmg: 24, accent: '#ff9466' },
};
const ROSTER = ['samurai', 'ninja', 'monk', 'brawler'];
// 各动作帧数（与生成器 SEQ 对应）
const ACT = {
  idle: { n: 4, fps: 4, loop: true },
  walk: { n: 6, fps: 10, loop: true },
  punch: { n: 11, fps: 34, loop: false, dur: 330, from: 110, to: 215, lunge: 120 },
  kick: { n: 11, fps: 30, loop: false, dur: 360, from: 150, to: 280, lunge: 60 },
  block: { n: 2, fps: 3, loop: true },
  hurt: { n: 3, fps: 14, loop: false, dur: 230 },
  special: { n: 12, fps: 26, loop: false, dur: 460 },
  ko: { n: 3, fps: 8, loop: false },
};
const FRAME_W = 236, FRAME_H = 188, SCALE = 0.62;
