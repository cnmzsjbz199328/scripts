/* NeonTowerDefense — 地图/瓦片/实体数据;由 index.html 内联块平移。 */
    window.GAME_CONFIG  = {
  "map": {
    "width": 1280,
    "height": 960,
    "tileWidth": 64,
    "tileHeight": 64
  },
  "player": {
    "spawn": {
      "x": 640,
      "y": 480
    },
    "speed": 220
  },
  "layers": [
    {
      "name": "ground",
      "collision": false,
      "ysort": false
    },
    {
      "name": "decor_floor",
      "collision": false,
      "ysort": false
    },
    {
      "name": "objects",
      "collision": true,
      "ysort": true
    },
    {
      "name": "decor_top",
      "collision": false,
      "ysort": false
    }
  ]
};
    window.TILEMAP_DATA = {
  "width": 20,
  "height": 15,
  "tileWidth": 64,
  "tileHeight": 64,
  "tileIndex": {
    "1": "cyber_grid_blue",
    "2": "cyber_grid_green",
    "3": "cyber_grid_pink",
    "4": "cyber_wall"
  },
  "layers": {
    "ground": [],
    "decor_floor": [],
    "objects": [],
    "decor_top": []
  }
};
    window.ENTITIES_DATA = [
  {
    "type": "character",
    "name": "MechGuard",
    "x": 640,
    "y": 480,
    "sprite": "MechGuard"
  }
];
