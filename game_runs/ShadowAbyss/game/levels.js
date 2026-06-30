/* ShadowAbyss — 关卡数据（神曲九圈，竖切先做前两圈）。
 * 单一连续世界：两圈首尾相接、x 单调递增（与黄金样板 ShadowLeap 的多幕同世界一致，
 * 便于摄像机连续推进与自动试玩 bot 的单调 x 卡死检测）。各圈坐标为相对本圈 startX 的局部值，
 * world.js 加 startX 绝对化。ground 段之间空隙即沟壑（坠落扣心、回最近立足点）。 */
const FLOOR_Y = 472;

const CIRCLES = [
  {
    id: 'limbo', name: '第一圈 · 林勃', sin: '无罪的幽魂',
    startX: 0, span: 3120,
    // 教学圈：两道 130px 沟壑，无风
    ground: [[0, 900], [1030, 1780], [1910, 3120]],
    pits: [[900, 1030], [1780, 1910]],
    gusts: [],
    soul: null,
    riftX: 3010,            // 通往第二圈的下行裂口（视觉 + 圈分界）
    fog: 0x0c0f18, fogA: 0.30, lightR: 150,
    ambient: { tree: 'amb_tree_limbo', fog: 'amb_fog_limbo', wind: null, treeTint: 0xffffff },
    parallax: { sky: ['#0e1320', '#070a12'], cliff: '#0a0e18', panorama: 'panorama_limbo' },
    card: {
      title: '第一圈 · 林勃',
      body: '幽暗森林的尽头，维吉尔在雾中等你。\n这里没有刑罚，只有走不出的灰。跟上引路的微光。\n\n← → / A D 行走    ·    ↑ / W / 空格 跳（长按跳更高）    ·    继续 SPACE',
    },
  },
  {
    id: 'lust', name: '第二圈 · 欲色', sin: '情欲之风',
    startX: 3120, span: 3400,
    ground: [[0, 740], [870, 1580], [1710, 2380], [2510, 3400]],
    pits: [[740, 870], [1580, 1710], [2380, 2510]],
    // 情欲之风：阵风只覆盖实心地面段，每个沟壑前后留 ≥120px 无风缓冲——
    // 「顶风走」与「卡风停跳沟」是两个独立挑战，绝不让玩家/ bot 在风里被迫跳沟。
    gusts: [
      { x0: 990, x1: 1460, force: 140 },
      { x0: 1830, x1: 2260, force: 170 },
      { x0: 2630, x1: 3120, force: 200 },
    ],
    // 抉择点：被风卷向深渊的亡魂向你伸手（圣殿春秋的道德抉择基因）
    soul: {
      x: 2040, y: 430,
      title: '风中的手',
      body: '一个被狂风扯着的魂魄向你伸出手——是停下来拉住她，\n还是借这阵风的势头冲过去？\n\n[1] 伸手拉住（风会为你平息，安全） · [2] 借风冲过（更快，更险）',
    },
    riftX: 3300,            // 竖切终点：抵达即过第二圈、通关
    fog: 0x0a0810, fogA: 0.42, lightR: 130,
    ambient: { tree: 'amb_tree_lust', fog: 'amb_fog_lust', wind: 'amb_wind_lust', treeTint: 0xffffff },
    parallax: { sky: ['#150a14', '#0a050c'], cliff: '#120a14', panorama: 'panorama_lust' },
    card: {
      title: '第二圈 · 欲色',
      body: '一阵永不停歇的风，把恋慕者的魂魄吹得无处停留。\n风会把你推偏——在风停的间隙里迈步、起跳。\n\n继续 SPACE',
    },
  },
  {
    id: 'gluttony', name: '第三圈 · 暴食', sin: '冰冷的泥雨',
    startX: 6520, span: 3200,
    ground: [[0, 760], [890, 1500], [1630, 2300], [2430, 3200]],
    pits: [[760, 890], [1500, 1630], [2300, 2430]],
    fallers: [{ x0: 200, x1: 1420, type: 'mud', every: 760 }],
    patrollers: [{ x0: 1710, x1: 2220, speed: 80, type: 'beast', scale: 0.9 }],
    riftX: 3120,
    fog: 0x0e160c, fogA: 0.5, lightR: 130,
    ambient: { tree: 'amb_tree_gluttony', fog: 'amb_fog_gluttony', wind: null },
    parallax: { sky: ['#0e1409', '#05080a'], cliff: '#0a0f08', panorama: 'panorama_gluttony' },
    card: { title: '第三圈 · 暴食', body: '永不停歇的冰冷泥雨砸在烂泥地上，三头犬刻耳柏洛斯在雨里咆哮。\n躲开坠落的泥块，绕过看守的恶犬。\n\n继续 SPACE' },
  },
  {
    id: 'greed', name: '第四圈 · 贪婪', sin: '对冲的巨石',
    startX: 9720, span: 3200,
    ground: [[0, 760], [890, 1500], [1630, 2300], [2430, 3200]],
    pits: [[760, 890], [1500, 1630], [2300, 2430]],
    fallers: [{ x0: 200, x1: 2220, type: 'boulder', every: 980 }],
    patrollers: [],
    riftX: 3120,
    fog: 0x12100a, fogA: 0.46, lightR: 135,
    ambient: { tree: 'amb_tree_greed', fog: 'amb_fog_greed', wind: null },
    parallax: { sky: ['#14110a', '#08060a'], cliff: '#0f0c08', panorama: 'panorama_greed' },
    card: { title: '第四圈 · 贪婪', body: '吝啬者与挥霍者推着巨石永世对撞，碎石从高处不断滚落。\n看准落点的间隙，一路向下穿过石雨。\n\n继续 SPACE' },
  },
  {
    id: 'wrath', name: '第五圈 · 愤怒', sin: '斯提克斯沼泽',
    startX: 12920, span: 3400,
    ground: [[0, 760], [890, 1500], [1630, 2300], [2430, 3400]],
    pits: [[760, 890], [1500, 1630], [2300, 2430]],
    groundHazards: [{ x: 1150, w: 64, type: 'bog' }, { x: 2000, w: 64, type: 'bog' }],
    soul: {
      x: 2750, y: 430, title: '泥里的脸',
      body: '一个怒魂从黑泥里抓住你的脚踝，眼里没有求救，只有恨——\n是俯身把他拉出泥沼，还是踩着他渡过去？\n\n[1] 拉他出来（怜悯，安全） · [2] 踩过去（更快，更冷）',
      pullMsg: '你把他从泥里拉了出来。他没有道谢，但松开了手。',
      rushMsg: '你踩着他的肩渡了过去。沼泽合上，像什么都没发生。',
    },
    riftX: 3320,
    fog: 0x0a1614, fogA: 0.5, lightR: 125,
    ambient: { tree: 'amb_tree_wrath', fog: 'amb_fog_wrath', wind: null },
    parallax: { sky: ['#0a1614', '#04080a'], cliff: '#08120f', panorama: 'panorama_wrath' },
    card: { title: '第五圈 · 愤怒', body: '斯提克斯的黑沼里，愤怒者互相撕咬，沉到泥下的是阴郁者。\n跳过吞脚的泥潭，别陷进去。\n\n继续 SPACE' },
  },
  {
    id: 'heresy', name: '第六圈 · 异端', sin: '燃烧的石棺',
    startX: 16320, span: 3200,
    ground: [[0, 760], [890, 1500], [1630, 2300], [2430, 3200]],
    pits: [[760, 890], [1500, 1630], [2300, 2430]],
    groundHazards: [{ x: 1150, w: 48, type: 'fire' }, { x: 2560, w: 48, type: 'fire' }],
    fallers: [{ x0: 1710, x1: 2220, type: 'ember', every: 680 }],
    riftX: 3120,
    fog: 0x160a08, fogA: 0.5, lightR: 120,
    ambient: { tree: 'amb_tree_heresy', fog: 'amb_fog_heresy', wind: null },
    parallax: { sky: ['#1a0c0a', '#0a0405'], cliff: '#140a08', panorama: 'panorama_heresy' },
    card: { title: '第六圈 · 异端', body: '狄斯城内，烧红的石棺一具接一具，异端者在火里永生。\n跳过喷火的棺缝，别被落下的火星灼到。\n\n继续 SPACE' },
  },
  {
    id: 'violence', name: '第七圈 · 暴力', sin: '弗列革吞血河',
    startX: 19520, span: 3400,
    ground: [[0, 760], [890, 1500], [1630, 2300], [2430, 3400]],
    pits: [[760, 890], [1500, 1630], [2300, 2430]],
    patrollers: [{ x0: 300, x1: 680, speed: 95, type: 'beast', scale: 0.82 }, { x0: 2510, x1: 3040, speed: 105, type: 'beast', scale: 0.86 }],
    groundHazards: [{ x: 1150, w: 64, type: 'bog' }, { x: 2000, w: 64, type: 'bog' }],
    riftX: 3320,
    fog: 0x180706, fogA: 0.52, lightR: 120,
    ambient: { tree: 'amb_tree_violence', fog: 'amb_fog_violence', wind: null },
    parallax: { sky: ['#1a0806', '#0a0303'], cliff: '#160706', panorama: 'panorama_violence' },
    card: { title: '第七圈 · 暴力', body: '弗列革吞的沸血河翻滚，半人马沿岸巡弋，射杀爬出血河的亡魂。\n避开巡逻的半人马，跳过滚烫的血潭。\n\n继续 SPACE' },
  },
  {
    id: 'fraud', name: '第八圈 · 欺诈', sin: '马勒勃支十沟',
    startX: 22920, span: 3200,
    ground: [[0, 760], [890, 1500], [1630, 2300], [2430, 3200]],
    pits: [[760, 890], [1500, 1630], [2300, 2430]],
    patrollers: [{ x0: 300, x1: 680, speed: 90, type: 'beast', scale: 0.72 }, { x0: 1710, x1: 2220, speed: 105, type: 'beast', scale: 0.72 }],
    soul: {
      x: 1150, y: 430, title: '甜言的影',
      body: '一个谄媚者笑着挡住去路，许诺替你照亮前路——只要你回头看他一眼。\n这是地狱最深处，连求助都可能是骗局。\n\n[1] 停下听他说（也许是真） · [2] 不理会，走过去（也许更稳）',
      pullMsg: '你停下听了他的话。真假难辨，但你点了根他给的火。',
      rushMsg: '你没有回头，径直走过。身后的笑声渐渐沉进沥青里。',
    },
    riftX: 3120,
    fog: 0x0c0a16, fogA: 0.62, lightR: 95,
    ambient: { tree: 'amb_tree_fraud', fog: 'amb_fog_fraud', wind: null },
    parallax: { sky: ['#0e0a1a', '#05040a'], cliff: '#0c0a16', panorama: 'panorama_fraud' },
    card: { title: '第八圈 · 欺诈', body: '马勒勃支的十道沟壑，提叉的恶鬼在沥青坑边巡逻。\n这里最暗——贴着提灯的光，绕开恶鬼，别被诓住。\n\n继续 SPACE' },
  },
  {
    id: 'betrayal', name: '第九圈 · 背叛', sin: '科库托斯冰湖',
    startX: 26120, span: 3200,
    slippery: true,
    ground: [[0, 1000], [1130, 2100], [2230, 3200]],
    pits: [[1000, 1130], [2100, 2230]],
    patrollers: [{ x0: 1300, x1: 1900, speed: 60, type: 'satan', scale: 1.3 }],
    riftX: 3120,            // 全游戏终点：抵达 = 爬出地心、重见星辰
    fog: 0x0e1622, fogA: 0.4, lightR: 140,
    ambient: { tree: 'amb_tree_betrayal', fog: 'amb_fog_betrayal', wind: null },
    parallax: { sky: ['#101a28', '#06080e'], cliff: '#0e1622', panorama: 'panorama_betrayal' },
    card: { title: '第九圈 · 背叛', body: '科库托斯的冰湖封住了背叛者，湖心是三面巨翼的撒旦。\n冰面打滑——借惯性绕过撒旦，攀向湖那头的出口。\n\n继续 SPACE' },
  },
];

const WORLD_W = CIRCLES[CIRCLES.length - 1].startX + CIRCLES[CIRCLES.length - 1].span;
const FINAL_RIFT_X = CIRCLES[CIRCLES.length - 1].startX + CIRCLES[CIRCLES.length - 1].riftX;

// 通关结局文案（受最后一次抉择的基调影响，见 flow.js）
const ENDINGS = {
  pull: '你绕过被永冻的撒旦，攀着深渊的脊背向上。\n一路你为亡魂停过的那些脚步，此刻成了向上的阶。\n钻出地心的尽头，头顶——重新出现了星辰。',
  rush: '你绕过被永冻的撒旦，攀着深渊的脊背向上。\n那些被你越过、踩过、绕过的影子没有跟来，地狱也并不挽留。\n钻出地心的尽头，头顶——重新出现了星辰。',
  none: '你绕过被永冻的撒旦，攀着深渊的脊背向上。\n维吉尔在前，你在后，谁都没有回头。\n钻出地心的尽头，头顶——重新出现了星辰。',
};
