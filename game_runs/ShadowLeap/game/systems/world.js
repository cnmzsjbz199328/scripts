/* ShadowLeap — §4B 原型分割；方法体逐字保留。 */
Object.assign(ShadowLeapScene.prototype, {

  _renderTileLayer(layerName, baseDepth, collision) {
    const data = (TILEMAP_DATA.layers || {})[layerName];
    if (!data) return;
    const W = TILEMAP_DATA.width, TW = TILEMAP_DATA.tileWidth, TH = TILEMAP_DATA.tileHeight;
    data.forEach((id, i) => {
      if (!id) return;
      const x = (i % W) * TW + TW / 2;
      const y = Math.floor(i / W) * TH + TH / 2;
      const sp = this.add.image(x, y, `tile_${id}`).setDisplaySize(TW, TH).setDepth(baseDepth);
      if (collision) { this.solids.add(sp); sp.body.setSize(TW, TH); }
    });
  },


  _makeAnims() {
    const def = (key, row, fps, loop) => {
      if (this.anims.exists(key)) return;
      this.anims.create({ key, frames: this.anims.generateFrameNumbers('shadowboy', { start: row * 9, end: row * 9 + 8 }), frameRate: fps, repeat: loop ? -1 : 0 });
    };
    def('sb_idle', 0, 8, true);
    def('sb_run', 1, 14, true);
    def('sb_jump', 2, 10, false);
  },


  _makeFxTextures() {
    let g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xfff3c0, 0.25); g.fillCircle(8, 8, 8);
    g.fillStyle(0xfff7d6, 0.6); g.fillCircle(8, 8, 4.5);
    g.fillStyle(0xffffff, 1); g.fillCircle(8, 8, 2);
    g.generateTexture('mote', 16, 16); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x000000, 1);
    g.fillTriangle(2, 26, 8, 6, 14, 26); g.fillTriangle(14, 26, 20, 8, 26, 26);
    g.fillTriangle(26, 26, 32, 6, 38, 26); g.fillRect(2, 24, 36, 4);
    g.generateTexture('trap', 40, 28); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x05060b, 1); g.fillCircle(14, 14, 13);
    g.generateTexture('rock', 28, 28); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xfff0c0, 0.9); g.fillCircle(12, 14, 10);
    g.fillStyle(0xffffff, 1); g.fillCircle(12, 14, 5);
    g.fillStyle(0xfff0c0, 0.35); g.fillRect(9, 14, 6, 66);
    g.generateTexture('goal', 24, 84); g.destroy();
  },
});
