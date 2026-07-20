/* BladeTrinity — 开打 / 建角色 / 血条 / 舞台。 */
Object.assign(BladeTrinityScene.prototype, {

  _startFight(p1Id, p2Id) {
    if (!BT.SCHOOLS[p1Id]) p1Id = 'sword';
    if (!BT.SCHOOLS[p2Id]) p2Id = 'water';
    this.phase = 'fight';
    this.selGroup.destroy();

    this.p1 = this._makeFighter(p1Id, 268, false);
    this.p2 = this._makeFighter(p2Id, BT.GAME_W - 268, true);
    this.fighters = [this.p1, this.p2];

    this._buildBars();
    window.__gameState = { player: this.p1.sprite };
    const d = BT.SCHOOLS[p1Id].defense;
    const dk = d === 'dodge' ? 'K 闪避' : d === 'parry' ? 'S 受流' : 'S 硬扛';
    window.GameHUD?.setObjective(`击倒对手！　J 斩　${dk}　AD 移动`);
    this.aiNext = 0;
  },

  _makeFighter(id, x, faceLeft) {
    const def = BT.SCHOOLS[id];
    const sp = this.physics.add.sprite(x, BT.FLOOR_Y - 70, id, BT.ATLAS[id].animations.idle.row *
      (BT.ATLAS[id].dimensions.width / BT.FRAME_W)).setScale(BT.SCALE);
    // 命中框贴身：图集里角色居中、脚底基线在 202/208（video-sprite 规格）。
    // setSize / setOffset 都传【纹理坐标】，Arcade 会自己按 sprite scale 缩放
    // （52×118 → 99×224，offset 84 → 160）。不要手动再乘 BT.SCALE，会双重缩放。
    // body 底 = 84+118 = 202 = 图集的脚底基线，所以 body 贴住世界下边界时脚正好踩台面。
    sp.body.setSize(52, 118).setOffset(BT.FRAME_W / 2 - 26, 84);
    sp.setCollideWorldBounds(true).setDepth(10);
    sp.setFlipX(!faceLeft);           // 素材朝左，朝右才翻转
    sp.play(`${id}_idle`);
    return {
      id, def, sprite: sp,
      hp: def.hp, maxHp: def.hp,
      state: 'idle', stateUntil: 0,
      invuln: 0, atkFrom: 0, atkTo: 0, atkHit: false, prevDx: null,
      facingLeft: faceLeft,
      guardFrom: 0, iframeUntil: 0, dodgeReady: 0, dodgedSomething: false,
      riposteUntil: 0,
    };
  },

  // ─────────── 血条 ───────────
  // 血条压在 y=52 以下：DOM 层的 HUD 目标文字占了画面顶部约 40px，
  // 画布内的文字画在 y=20 会和它重叠
  _buildBars() {
    this.barG = this.add.graphics().setScrollFactor(0).setDepth(60);
    const mk = (x, id, origin) => this.add.text(x, 76,
      `${BT.SCHOOLS[id].name}　${BT.SCHOOLS[id].blurb}`,
      { fontFamily: 'Segoe UI, monospace', fontSize: '15px', color: '#f2e7d5', fontStyle: 'bold' })
      .setOrigin(origin, 0).setScrollFactor(0).setDepth(61);
    mk(40, this.p1.id, 0);
    mk(BT.GAME_W - 40, this.p2.id, 1);
    this._drawBars();
  },

  _drawBars() {
    const g = this.barG; g.clear();
    const W = 372, H = 20, y = 52;
    const bar = (x, frac, color, rightAlign) => {
      g.fillStyle(0x000000, 0.42); g.fillRect(x, y, W, H);
      const w = W * Phaser.Math.Clamp(frac, 0, 1);
      g.fillStyle(color, 1);
      g.fillRect(rightAlign ? x + W - w : x, y, w, H);
      g.lineStyle(2, 0x1a1208, 0.85); g.strokeRect(x, y, W, H);
    };
    bar(40, this.p1.hp / this.p1.maxHp, BT.SCHOOLS[this.p1.id].barColor, false);
    bar(BT.GAME_W - 40 - W, this.p2.hp / this.p2.maxHp, BT.SCHOOLS[this.p2.id].barColor, true);
  },

  // ─────────── 舞台（全代码绘制，不用图片素材）───────────
  _buildStage() {
    const W = BT.GAME_W, H = BT.GAME_H, FY = BT.FLOOR_Y;
    const g = this.add.graphics().setDepth(-100);

    // 天空：暮色渐变（分带填充，避免引入贴图）
    const sky = [[0x1a1430, 0], [0x3a2550, 0.30], [0x7a3f52, 0.55], [0xc9714a, 0.74], [0xe8a15c, 0.86]];
    for (let i = 0; i < sky.length - 1; i++) {
      const [c0, t0] = sky[i], [c1, t1] = sky[i + 1];
      const y0 = H * t0, y1 = H * t1, steps = 14;
      for (let s = 0; s < steps; s++) {
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.IntegerToColor(c0),
          Phaser.Display.Color.IntegerToColor(c1), steps, s);
        g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
        g.fillRect(0, y0 + (y1 - y0) * s / steps, W, (y1 - y0) / steps + 1);
      }
    }
    // 落日
    g.fillStyle(0xffd9a0, 0.9); g.fillCircle(W * 0.5, FY - 118, 46);
    g.fillStyle(0xffd9a0, 0.18); g.fillCircle(W * 0.5, FY - 118, 78);

    // 远山剪影两层
    const ridge = (baseY, amp, seed, color, alpha) => {
      g.fillStyle(color, alpha);
      g.beginPath(); g.moveTo(0, H);
      for (let x = 0; x <= W; x += 24) {
        const y = baseY - Math.abs(Math.sin((x + seed) * 0.0042)) * amp
                        - Math.sin((x + seed) * 0.011) * amp * 0.28;
        g.lineTo(x, y);
      }
      g.lineTo(W, H); g.closePath(); g.fillPath();
    };
    ridge(FY - 54, 96, 0, 0x4a2f46, 1);
    ridge(FY - 22, 58, 620, 0x2e1c30, 1);

    // 斗技台：石面 + 台沿高光
    g.fillStyle(0x241826, 1); g.fillRect(0, FY, W, H - FY);
    g.fillStyle(0x3a2a3c, 1); g.fillRect(0, FY, W, 8);
    g.fillStyle(0xffca8a, 0.30); g.fillRect(0, FY, W, 3);
    for (let x = 0; x < W; x += 64) {
      g.fillStyle(0x1a1020, 0.55); g.fillRect(x, FY + 8, 2, H - FY - 8);
    }
    // 台边警示：被逼到这里剑神流会破防
    const m = BT.DEFENSE.brace.edgeMargin;
    g.fillStyle(0xff8a3b, 0.16);
    g.fillRect(0, FY, m, H - FY); g.fillRect(W - m, FY, m, H - FY);
  },
});
