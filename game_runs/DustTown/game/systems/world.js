/* DustTown — §4B 原型分割；方法体逐字保留。 */
Object.assign(DustTownScene.prototype, {

  _renderTileLayer(layerName, depth, collision) {
    const data = (TILEMAP_DATA.layers || {})[layerName];
    if (!data) return;
    const W = TILEMAP_DATA.width, TW = TILEMAP_DATA.tileWidth, TH = TILEMAP_DATA.tileHeight;
    data.forEach((id, i) => {
      if (!id) return;
      const x = (i % W) * TW + TW / 2;
      const y = Math.floor(i / W) * TH + TH / 2;
      const sp = this.add.image(x, y, `tile_${id}`).setDisplaySize(TW, TH).setDepth(depth);
      if (collision) { this.covers.add(sp); sp.body.setSize(TW, TH); }
    });
  },


  _makeAnims() {
    const def = (key, row, fps, loop) => {
      if (this.anims.exists(key)) return;
      this.anims.create({ key, frames: this.anims.generateFrameNumbers('sheriff', { start: row * 9, end: row * 9 + 8 }), frameRate: fps, repeat: loop ? -1 : 0 });
    };
    def('sh_idle', 0, 8, true);
    def('sh_walk', 1, 12, true);
  },


  _makeTextures() {
    let g;
    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x6b5536, 1); g.fillCircle(14, 14, 12);
    g.fillStyle(0xcdb182, 1); g.fillCircle(14, 11, 5);
    g.generateTexture('npc', 28, 28); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x2a1410, 1); g.fillCircle(15, 15, 13);
    g.fillStyle(0x7a2a1a, 1); g.fillCircle(15, 15, 7);
    g.fillStyle(0x000000, 1); g.fillCircle(15, 12, 2.5);
    g.generateTexture('thug', 30, 30); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x6b4a26, 1); g.fillRect(12, 6, 4, 32);
    g.fillStyle(0xe8c84a, 1); g.fillTriangle(16, 6, 16, 22, 30, 14);
    g.generateTexture('court', 28, 40); g.destroy();
  },


  _addThug(t) {
    const s = this.thugs.create(t.x, t.y, 'thug');
    s.setDepth(16); s.body.setCircle(13, 3, 3); s.setImmovable(true);
    s.setData('home', { x: t.x, y: t.y }); s.setData('axis', t.axis); s.setData('range', t.range); s.setData('dir', 1);
    return s;
  },
});
