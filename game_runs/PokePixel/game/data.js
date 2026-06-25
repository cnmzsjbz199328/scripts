/* PokePixel — 游戏数据常量(深度/怪物库/属性克制)；由 game-logic.js 顶部平移。 */
const DEPTH = {
  GROUND: 0,
  DECOR_FLOOR: 100,
  YSORT: 1000,
  DECOR_TOP: 9000,
  EFFECTS: 9500
};

// Monster Base Stats & Database
const MONSTER_DB = {
  "叶兔": {
    name: "叶兔 LeafHare",
    type: "Grass",
    maxHp: 45,
    attack: 12,
    defense: 10,
    speed: 15,
    icon: "🐰",
    color: "#22c55e",
    skills: [
      { name: "撞击 Tackle", type: "Normal", power: 40, effect: "damage" },
      { name: "藤鞭 Vine Whip", type: "Grass", power: 45, effect: "damage" },
      { name: "飞叶快刀 Razor Leaf", type: "Grass", power: 55, effect: "damage" },
      { name: "光合作用 Synthesis", type: "Grass", power: 0, effect: "heal", healAmount: 20 }
    ]
  },
  "炎狐": {
    name: "炎狐 FlameFox",
    type: "Fire",
    maxHp: 40,
    attack: 16,
    defense: 8,
    speed: 18,
    icon: "🦊",
    sprite: "flamefox",
    color: "#f97316",
    skills: [
      { name: "抓 Scratch", type: "Normal", power: 40, effect: "damage" },
      { name: "火花 Ember", type: "Fire", power: 45, effect: "damage" },
      { name: "火焰轮 Flame Wheel", type: "Fire", power: 60, effect: "damage" },
      { name: "嚎叫 Growl", type: "Normal", power: 0, effect: "debuff_atk" }
    ]
  },
  "水龟": {
    name: "水龟 AquaTurtle",
    type: "Water",
    maxHp: 50,
    attack: 10,
    defense: 14,
    speed: 10,
    icon: "🐢",
    color: "#3b82f6",
    skills: [
      { name: "撞击 Tackle", type: "Normal", power: 40, effect: "damage" },
      { name: "水枪 Water Gun", type: "Water", power: 45, effect: "damage" },
      { name: "水之波动 Water Pulse", type: "Water", power: 60, effect: "damage" },
      { name: "缩入壳中 Withdraw", type: "Water", power: 0, effect: "buff_def" }
    ]
  },
  "雷鼠": {
    name: "雷鼠 SparkMarmot",
    type: "Electric",
    maxHp: 48,
    attack: 15,
    defense: 9,
    speed: 22,
    icon: "⚡",
    sprite: "sparkmarmot",
    color: "#eab308",
    skills: [
      { name: "电光一闪 Quick Attack", type: "Normal", power: 40, effect: "damage" },
      { name: "电击 Thunder Shock", type: "Electric", power: 45, effect: "damage" },
      { name: "火花电击 Spark", type: "Electric", power: 60, effect: "damage" },
      { name: "充电 Charge", type: "Electric", power: 0, effect: "buff_atk" }
    ]
  },
  "岩偶": {
    name: "岩偶 StoneGolem",
    type: "Rock",
    maxHp: 65,
    attack: 13,
    defense: 18,
    speed: 8,
    icon: "🗿",
    color: "#a1a1aa",
    skills: [
      { name: "撞击 Tackle", type: "Normal", power: 40, effect: "damage" },
      { name: "落石 Rock Throw", type: "Rock", power: 50, effect: "damage" },
      { name: "岩崩 Rock Slide", type: "Rock", power: 75, effect: "damage" },
      { name: "铁壁 Iron Defense", type: "Rock", power: 0, effect: "buff_def" }
    ]
  },
  "影蝠": {
    name: "影蝠 ShadowBat",
    type: "Ghost",
    maxHp: 42,
    attack: 14,
    defense: 9,
    speed: 20,
    icon: "🦇",
    color: "#a855f7",
    skills: [
      { name: "起风 Gust", type: "Normal", power: 40, effect: "damage" },
      { name: "惊吓 Astonish", type: "Ghost", power: 35, effect: "damage" },
      { name: "暗影球 Shadow Ball", type: "Ghost", power: 70, effect: "damage" },
      { name: "吸血 Leech", type: "Ghost", power: 40, effect: "leech" }
    ]
  },
  "霜狼": {
    name: "霜狼 FrostWolf",
    type: "Ice",
    maxHp: 60,
    attack: 17,
    defense: 11,
    speed: 16,
    icon: "🐺",
    sprite: "frostwolf",
    color: "#06b6d4",
    skills: [
      { name: "咬住 Bite", type: "Normal", power: 45, effect: "damage" },
      { name: "冰砾 Ice Shard", type: "Ice", power: 40, effect: "damage" },
      { name: "急冻光线 Ice Beam", type: "Ice", power: 65, effect: "damage" },
      { name: "嚎叫 Howl", type: "Normal", power: 0, effect: "buff_atk" }
    ]
  },
  "冰晶兽": {
    name: "冰晶兽 FrostCrystal",
    type: "Ice",
    maxHp: 80,
    attack: 21,
    defense: 16,
    speed: 14,
    icon: "❄️",
    sprite: "frostcrystal",
    color: "#0891b2",
    skills: [
      { name: "撞击 Tackle", type: "Normal", power: 40, effect: "damage" },
      { name: "急冻光线 Ice Beam", type: "Ice", power: 65, effect: "damage" },
      { name: "暴风雪 Blizzard", type: "Ice", power: 90, effect: "damage" },
      { name: "自我再生 Recover", type: "Normal", power: 0, effect: "heal", healAmount: 40 }
    ]
  },
  "极光龙": {
    name: "极光龙 AuroraDragon",
    type: "Dragon",
    maxHp: 130,
    attack: 26,
    defense: 20,
    speed: 22,
    icon: "🐉",
    sprite: "auroradragon",
    color: "#f43f5e",
    skills: [
      { name: "龙息 Dragon Breath", type: "Dragon", power: 60, effect: "damage" },
      { name: "龙之爪 Dragon Claw", type: "Dragon", power: 80, effect: "damage" },
      { name: "暴风雪 Blizzard", type: "Ice", power: 90, effect: "damage" },
      { name: "自我再生 Recover", type: "Normal", power: 0, effect: "heal", healAmount: 50 }
    ]
  }
};

// Type Effectiveness Chart
const TYPE_EFFECTIVENESS = {
  Grass: { Water: 2, Fire: 0.5, Grass: 0.5, Rock: 2, Dragon: 0.5 },
  Fire: { Grass: 2, Water: 0.5, Fire: 0.5, Ice: 2, Rock: 0.5, Dragon: 0.5 },
  Water: { Fire: 2, Grass: 0.5, Water: 0.5, Rock: 2, Dragon: 0.5 },
  Electric: { Water: 2, Grass: 0.5, Electric: 0.5, Dragon: 0.5 },
  Ice: { Grass: 2, Fire: 0.5, Water: 0.5, Ice: 0.5, Dragon: 2 },
  Rock: { Fire: 2, Ice: 2, Rock: 0.5 },
  Ghost: { Ghost: 2 },
  Dragon: { Dragon: 2, Steel: 0.5 }
};

