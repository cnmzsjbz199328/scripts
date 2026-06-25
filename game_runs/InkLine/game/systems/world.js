/* InkLine — §4B 原型分割；方法体逐字保留。 */
Object.assign(InkLineScene.prototype, {

  _renderTileLayer(layerName, depth, collision) {
    const data = (TILEMAP_DATA.layers || {})[layerName];
    if (!data) return;
    const W = TILEMAP_DATA.width, TW = TILEMAP_DATA.tileWidth, TH = TILEMAP_DATA.tileHeight;
    data.forEach((id, i) => {
      if (!id) return;
      const x = (i % W) * TW + TW / 2;
      const y = Math.floor(i / W) * TH + TH / 2;
      const sp = this.add.image(x, y, `tile_${id}`).setDisplaySize(TW, TH).setDepth(depth);
      if (collision) { this.solids.add(sp); sp.body.setSize(TW, TH); }
    });
  },


  _makeAnims() {
    const idle = ['blobf0', 'blobf1', 'blobf2', 'blobf1'];
    const move = ['blobf0', 'blobf3', 'blobf4', 'blobf3'];
    if (!this.anims.exists('ink_idle')) this.anims.create({ key: 'ink_idle', frames: idle.map(k => ({ key: k })), frameRate: 5, repeat: -1 });
    if (!this.anims.exists('ink_move')) this.anims.create({ key: 'ink_move', frames: move.map(k => ({ key: k })), frameRate: 12, repeat: -1 });
  },


  _makeTextures() {
    let g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(PAPER, 1); g.fillRect(0, 0, 64, 64);
    g.lineStyle(3, INK, 1); g.strokeRect(1, 1, 62, 62);
    g.lineStyle(1, INK, 0.25); g.beginPath(); g.moveTo(0, 20); g.lineTo(64, 20); g.strokePath();
    g.generateTexture('tile_1', 64, 64); g.destroy();

    const blob = (key, sx, sy) => {
      const w = 30, h = 30; const g2 = this.make.graphics({ x: 0, y: 0, add: false });
      const cx = 15, cy = 16, rx = 13 * sx, ry = 13 * sy;
      g2.fillStyle(INK, 1); g2.fillEllipse(cx, cy + (13 - ry), rx, ry);
      g2.fillStyle(0xffffff, 1); g2.fillCircle(cx - 4, cy - 4 + (13 - ry), 3); g2.fillCircle(cx + 4, cy - 4 + (13 - ry), 3);
      g2.fillStyle(INK, 1); g2.fillCircle(cx - 4, cy - 4 + (13 - ry), 1.3); g2.fillCircle(cx + 4, cy - 4 + (13 - ry), 1.3);
      g2.generateTexture(key, w, h); g2.destroy();
    };
    blob('blobf0', 1.0, 1.0); blob('blobf1', 1.05, 0.95); blob('blobf2', 0.95, 1.05);
    blob('blobf3', 1.15, 0.82); blob('blobf4', 0.82, 1.18);

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(INK, 1); g.fillCircle(8, 12, 6); g.fillTriangle(8, 0, 3, 9, 13, 9);
    g.fillStyle(0xffffff, 0.7); g.fillCircle(6, 10, 1.6);
    g.generateTexture('drop', 16, 18); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(PAPER, 1); g.lineStyle(3, INK, 1);
    [0, 12, 24].forEach(ox => { g.fillTriangle(ox, 26, ox + 6, 4, ox + 12, 26); g.strokeTriangle(ox, 26, ox + 6, 4, ox + 12, 26); });
    g.generateTexture('spike', 36, 26); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xc9c4bb, 1); g.lineStyle(3, INK, 1);
    g.fillRoundedRect(2, 2, 34, 30, 6); g.strokeRoundedRect(2, 2, 34, 30, 6);
    g.fillStyle(INK, 1); g.fillRect(10, 12, 5, 6); g.fillRect(23, 12, 5, 6);
    g.generateTexture('eraser', 38, 34); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x6fd0c8, 1); g.fillCircle(11, 12, 9);
    g.fillStyle(0xffffff, 1); g.fillCircle(11, 12, 4);
    g.lineStyle(3, INK, 1); g.beginPath(); g.moveTo(11, 20); g.lineTo(11, 68); g.strokePath();
    g.generateTexture('nib', 22, 72); g.destroy();
  },
});
