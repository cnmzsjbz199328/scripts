/* MoonRonin — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(MoonRoninScene.prototype, {

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


  // 月光晕的放射状渐变笔刷（中心白→边缘透明，软边）
  _makeLightTexture() {
    if (this.textures.exists('moonlight')) return;
    const S = 256, tex = this.textures.createCanvas('moonlight', S, S);
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0.0, 'rgba(255,255,255,1)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.85)');
    g.addColorStop(1.0, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    tex.refresh();
  },


  // 鹭身周月辉光环的笔刷（暖月色，软边，配 additive 叠加成发光）
  _makeGlowTexture() {
    if (this.textures.exists('moonglow')) return;
    const S = 256, tex = this.textures.createCanvas('moonglow', S, S);
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0.0, 'rgba(255,236,176,1)');   // 中心暖月色
    g.addColorStop(0.4, 'rgba(255,233,168,0.5)');
    g.addColorStop(1.0, 'rgba(255,233,168,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    tex.refresh();
  },


  // 光晕跟随鹭、随月光数平滑变大、朝奔跑方向前倾
  _updateLight() {
    if (!this.light) return;
    const cam = this.cameras.main;
    const dir = this.player.flipX ? -1 : 1;
    const sx = this.player.x - cam.scrollX + LIGHT_BIAS * dir;
    const sy = this.player.y - cam.scrollY - 6;
    const targetR = LIGHT_MIN + this.score * LIGHT_PER_ORB;
    this._lightR += (targetR - this._lightR) * 0.08;   // 缓动，月光入手时柔和扩张
    const d = this._lightR * 2 * 1.7 * this._lightPulse;  // 1.7：补偿渐变软边，使可视半径≈_lightR
    this.light.setPosition(sx, sy).setDisplaySize(d, d);

    // 鹭身周月辉光环：跟随玩家世界坐标，半径/亮度随月光数平滑成长，拾取脉冲共享
    if (this.glow) {
      const tR = GLOW_MIN_R + this.score * GLOW_PER_ORB;
      const tA = GLOW_MIN_A + this.score * GLOW_PER_ORB_A;
      this._glowR += (tR - this._glowR) * 0.08;
      this._glowA += (tA - this._glowA) * 0.08;
      const gd = this._glowR * 2 * this._lightPulse;
      this.glow.setPosition(this.player.x, this.player.y - 6)
        .setDisplaySize(gd, gd)
        .setAlpha(Math.min(1, this._glowA * (0.6 + 0.4 * this._lightPulse)));
    }
  },


  _makeAnims() {
    const mk = (key, keys, fps, loop) => {
      if (this.anims.exists(key)) return;
      this.anims.create({ key, frames: keys.map(k => ({ key: k })), frameRate: fps, repeat: loop ? -1 : 0 });
    };
    mk('ro_idle', ['r_idle_0', 'r_idle_1', 'r_idle_2', 'r_idle_1'], 4, true);
    mk('ro_run', ['r_run_0', 'r_run_1', 'r_run_2', 'r_run_3', 'r_run_4', 'r_run_5'], 14, true);
    mk('ro_jump', ['r_jump_0', 'r_jump_1', 'r_jump_2'], 8, false);
    mk('ro_slash', ['r_slash_0', 'r_slash_1', 'r_slash_2'], 14, false);
    mk('crow_fly', ['crow_0', 'crow_1'], 6, true);
  }
});
