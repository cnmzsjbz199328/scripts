/* NeonRacer — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MainScene.prototype, {

  renderTileLayer(layerName, layerConfig) {
    const data = TILEMAP_DATA.layers[layerName];
    if (!data) return;

    const width = TILEMAP_DATA.width;
    const height = TILEMAP_DATA.height;
    
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const id = data[r * width + c];
        if (id === 0) continue; // 0 means empty

        const tileName = TILEMAP_DATA.tileIndex[id];
        if (!tileName) continue;

        const x = c * this.tileW + this.tileW / 2;
        const y = r * this.tileH + this.tileH / 2;

        const tileSprite = this.add.sprite(x, y, `tile_${tileName}`);
        tileSprite.setDisplaySize(this.tileW, this.tileH);

        // Determine base depth
        let baseDepth = DEPTH.GROUND;
        if (layerName === 'decor_floor') baseDepth = DEPTH.DECOR_FLOOR;
        else if (layerName === 'objects') baseDepth = DEPTH.YSORT;
        else if (layerName === 'decor_top') baseDepth = DEPTH.DECOR_TOP;

        // Apply Y-sort if ysort is enabled
        if (layerConfig.ysort) {
          tileSprite.setDepth(baseDepth + y);
          this.ysortGroup.add(tileSprite);
        } else {
          tileSprite.setDepth(baseDepth);
        }

        // Apply static physics collision if collision is enabled
        if (layerConfig.collision) {
          this.physics.add.existing(tileSprite, true);
          this.obstaclesGroup.add(tileSprite);
        }

        // Keep reference
        if (layerName === 'ground') {
          this.tileSprites[r * width + c] = tileSprite;
        }
      }
    }
  }
});
