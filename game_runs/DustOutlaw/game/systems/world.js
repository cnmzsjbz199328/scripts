/* DustOutlaw — §4B 原型分割；方法体逐字保留。 */
Object.assign(DustOutlawScene.prototype, {

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
      this.anims.create({ key, frames: this.anims.generateFrameNumbers('cowboy', { start: row * 9, end: row * 9 + 8 }), frameRate: fps, repeat: loop ? -1 : 0 });
    };
    def('cb_idle', 0, 8, true);
    def('cb_walk', 1, 12, true);
    def('cb_shoot', 2, 16, false);
  },


  _makeTextures() {
    // 敌人匪徒（俯视）30x30
    let g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x3a2414, 1); g.fillCircle(15, 15, 13);
    g.fillStyle(0x7a2a1a, 1); g.fillCircle(15, 15, 7);
    g.fillStyle(0xc23b22, 1); g.fillCircle(15, 11, 2.5);
    g.generateTexture('bandit', 30, 30); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xfff0c0, 1); g.fillCircle(4, 4, 4);
    g.fillStyle(0xffffff, 1); g.fillCircle(4, 4, 1.8);
    g.generateTexture('pbullet', 8, 8); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xff6644, 1); g.fillCircle(4, 4, 4);
    g.fillStyle(0xffd2c0, 1); g.fillCircle(4, 4, 1.6);
    g.generateTexture('ebullet', 8, 8); g.destroy();
  },
});
