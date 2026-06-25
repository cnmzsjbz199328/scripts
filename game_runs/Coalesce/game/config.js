/* Coalesce — 内联数据从 index.html 平移；window.* 全局，须先于 data.js 加载。 */
    window.GAME_CONFIG  = {
      "map": { "width": 960, "height": 540, "tileWidth": 64, "tileHeight": 64 },
      "player": { "spawn": { "x": 80, "y": 80 }, "speed": 250 },
      "renderMode": "procedural-lineart"
    };
    window.TILEMAP_DATA = { "width": 15, "height": 9, "tileWidth": 64, "tileHeight": 64, "tileIndex": {}, "layers": { "obstacles": [] } };
    window.ENTITIES_DATA = [];
