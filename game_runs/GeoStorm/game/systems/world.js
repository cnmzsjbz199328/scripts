/* GeoStorm — §4B 原型分割；方法体逐字保留。 */
Object.assign(GeoStormScene.prototype, {

  _renderTileLayer(layerName, depth, collision) {
    const data = (TILEMAP_DATA.layers || {})[layerName];
    if (!data) return;
    const W = TILEMAP_DATA.width, TW = TILEMAP_DATA.tileWidth, TH = TILEMAP_DATA.tileHeight;
    data.forEach((id, i) => {
      if (!id) return;
      const x = (i % W) * TW + TW / 2;
      const y = Math.floor(i / W) * TH + TH / 2;
      const sp = this.add.image(x, y, `tile_${id}`).setDisplaySize(TW, TH).setDepth(depth);
      if (collision) { this.blocks.add(sp); sp.body.setSize(TW, TH); }
    });
  },


  _makeAnims() {
    const frames = ['pt0', 'pt1', 'pt2', 'pt1'];
    if (!this.anims.exists('geo_pulse'))
      this.anims.create({ key: 'geo_pulse', frames: frames.map(k => ({ key: k })), frameRate: 8, repeat: -1 });
  },


  _makeTextures() {
    const pt = (key, glowR, coreR) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(GLOW, 0.22); g.fillCircle(11, 11, glowR);
      g.fillStyle(GLOW, 1); g.fillTriangle(11, 3, 4, 18, 18, 18);
      g.fillStyle(0xffffff, 1); g.fillCircle(11, 12, coreR);
      g.generateTexture(key, 22, 22); g.destroy();
    };
    pt('pt0', 9, 2.2); pt('pt1', 11, 3.0); pt('pt2', 7, 1.8);

    let g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xc7d8ea, 1); g.fillRect(0, 0, 64, 64);
    g.lineStyle(3, INK, 1); g.strokeRect(2, 2, 60, 60);
    g.lineStyle(2, INK, 0.7);
    g.beginPath(); g.moveTo(32, 10); g.lineTo(54, 32); g.lineTo(32, 54); g.lineTo(10, 32); g.closePath(); g.strokePath();
    g.generateTexture('tile_1', 64, 64); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.lineStyle(3, INK, 1); g.strokeTriangle(11, 2, 2, 20, 20, 20);
    g.fillStyle(INK, 0.12); g.fillTriangle(11, 2, 2, 20, 20, 20);
    g.generateTexture('s_tri', 22, 22); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.lineStyle(3, INK, 1); g.strokeRect(2, 2, 16, 16);
    g.fillStyle(INK, 0.12); g.fillRect(2, 2, 16, 16);
    g.generateTexture('s_sq', 20, 20); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.lineStyle(3, INK, 1);
    g.beginPath(); g.moveTo(12, 1); g.lineTo(23, 12); g.lineTo(12, 23); g.lineTo(1, 12); g.closePath(); g.strokePath();
    g.generateTexture('s_dia', 24, 24); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(SHARD_C, 0.3); g.fillCircle(8, 8, 8);
    g.fillStyle(SHARD_C, 1); g.fillTriangle(8, 1, 2, 14, 14, 14);
    g.fillStyle(0xffffff, 1); g.fillCircle(8, 9, 2);
    g.generateTexture('shard', 16, 16); g.destroy();
  },
});
