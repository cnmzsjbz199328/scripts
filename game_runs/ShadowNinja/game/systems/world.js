/* ShadowNinja — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(ShadowNinjaScene.prototype, {

  _updateGates(time) {
    const px = this.player.x;
    for (const g of this.gateList) {
      const timed = ((time + g.phase) % g.period) < g.open;  // 计时开窗
      const inDoorway = Math.abs(px - g.x) < 36;             // 玩家正在门口
      // 只有计时才能"开"；"关"在玩家离开门口前延迟——闸门绝不夹人/软锁，
      // 但关闭中的闸门仍实打实阻挡（计时挑战保留）。
      if (timed) g.isOpen = true;
      else if (!inDoorway) g.isOpen = false;
      g.openNow = g.isOpen;
      g.img.body.enable = !g.isOpen;
      g.img.setAlpha(g.isOpen ? 0.12 : 1);
    }
  },


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
    const def = (act, fps, loop) => {
      const key = `nj_${act}`;
      if (this.anims.exists(key)) return;
      const frames = Array.from({ length: NJ_FRAMES[act] }, (_, i) => ({ key: `nj_${act}_${i}` }));
      this.anims.create({ key, frames, frameRate: fps, repeat: loop ? -1 : 0 });
    };
    def('idle', 7, true);
    def('run', 14, true);
    def('crouch', 7, true);
    def('jump', 8, false);
    def('hurt', 12, false);
    // 环境动画（svg-ambient）
    const ambDef = (name, fps) => {
      const key = `amb_${name}`;
      if (this.anims.exists(key)) return;
      const frames = Array.from({ length: AMB_FRAMES[name] }, (_, i) => ({ key: `amb_${name}_${i}` }));
      this.anims.create({ key, frames, frameRate: fps, repeat: -1 });
    };
    ambDef('cloud', 6);
    ambDef('campfire', 10);
    ambDef('flag', 8);
  },


  // ── 环境装饰层（svg-ambient skill 验证：跨游戏复用同一份工厂）──────────
  // 纯装饰、无物理、不入 __probe，不影响玩法与白盒自测。
  _addAmbient() {
    // 流云：夜空慢漂，视差滚动（多片错相位铺满世界宽）
    for (let i = 0; i < 6; i++) {
      const c = this.add.sprite(i * (WORLD_W / 6) + 80, 70 + (i % 3) * 34, 'amb_cloud_0')
        .setScrollFactor(0.3).setDepth(-70).setAlpha(0.5).setDisplaySize(260, 260);
      c.play('amb_cloud'); c.anims.setProgress((i / 6));
    }
    // 火盆：地面暖光点 + 叠一圈暖色辉光圆
    for (const x of BRAZIERS) {
      this.add.circle(x, FLOOR_TOP - 40, 46, WARM, 0.06).setDepth(6);
      const fire = this.add.sprite(x, FLOOR_TOP - 24, 'amb_campfire_0')
        .setDepth(11).setDisplaySize(72, 72);
      fire.play('amb_campfire'); fire.anims.setProgress(Math.random());
    }
    // 破幡：高悬灰旗，随风飘
    for (const x of BANNERS) {
      const fl = this.add.sprite(x, FLOOR_TOP - 150, 'amb_flag_0')
        .setDepth(11).setDisplaySize(96, 96).setAlpha(0.9);
      fl.play('amb_flag'); fl.anims.setProgress(Math.random());
    }
  },


  _makeTextures() {
    let g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x05060c, 1); g.fillRect(0, 0, 64, 64);
    g.fillStyle(0x0b0d16, 1);
    for (let i = 0; i < 18; i++) g.fillRect((i * 37) % 64, (i * 53) % 64, 3, 3);
    g.lineStyle(1, 0x10131f, 0.6); g.strokeRect(0, 0, 64, 64);
    g.generateTexture('tile_1', 64, 64); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x05060c, 1); g.fillCircle(14, 10, 8); g.fillRoundedRect(7, 16, 16, 24, 5);
    g.fillRect(7, 37, 6, 12); g.fillRect(16, 37, 6, 12);
    g.fillStyle(0x3a2a14, 1); g.fillRect(27, 18, 3, 14);
    g.fillStyle(WARM, 1); g.fillCircle(29, 34, 5);
    g.generateTexture('guard', 34, 50); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(WARM, 1); g.fillCircle(6, 6, 5);
    g.fillStyle(0x000000, 1); g.fillCircle(6, 6, 2);
    g.fillStyle(WARM, 1); g.fillRect(9, 5, 8, 3); g.fillRect(14, 8, 3, 4);
    g.generateTexture('key', 18, 18); g.destroy();

    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x05060c, 1); g.fillRect(0, 0, 60, 70);
    g.fillStyle(0x1a1410, 1); g.fillRect(6, 8, 48, 56);
    g.lineStyle(3, 0x000000, 1);
    for (let i = 0; i <= 48; i += 12) { g.beginPath(); g.moveTo(6 + i, 8); g.lineTo(6 + i, 64); g.strokePath(); }
    g.fillStyle(WARM, 0.7); g.fillCircle(30, 40, 6);
    g.generateTexture('cell', 60, 70); g.destroy();

    // 计时铁闸（栅栏剪影）
    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x0a0c12, 1); g.fillRect(0, 0, 22, 134);
    g.fillStyle(0x171c27, 1);
    g.fillRect(0, 0, 22, 10); g.fillRect(0, 64, 22, 8);
    for (let i = 3; i < 22; i += 7) g.fillRect(i, 8, 3, 122);
    g.generateTexture('gate', 22, 134); g.destroy();

    // 屋脊（坡顶剪影，128×48）
    g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x05060c, 1);
    g.fillRect(0, 16, 128, 32);
    g.beginPath(); g.moveTo(0, 16); g.lineTo(64, 0); g.lineTo(128, 16); g.closePath(); g.fillPath();
    g.fillStyle(0x10131f, 1); g.fillRect(0, 14, 128, 4);
    g.generateTexture('rooftop', 128, 48); g.destroy();
  }
});
