/* GeoStorm — 内联数据从 index.html 平移；window.* 全局，须先于 data.js 加载。 */
    window.GAME_CONFIG  = {
  "map": { "width": 960, "height": 540, "tileWidth": 60, "tileHeight": 60 },
  "player": { "spawn": { "x": 60, "y": 60 }, "speed": 230 },
  "renderMode": "procedural-lineart",
  "note": "Single-screen top-down geometric bullet-dodge. scene/panorama.png is the blueprint arena background; light point/geometric projectiles/shards drawn procedurally. Player spawns in a corner with world-bounds collision for stable verify movement."
};
    window.TILEMAP_DATA = {"width":15,"height":9,"tileWidth":64,"tileHeight":64,"layers":{"obstacles":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}};
    window.ENTITIES_DATA = [];
