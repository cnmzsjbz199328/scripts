/* BladeTrinity — 选流派。P1 选自己，P2 选对手，随即开打。 */
Object.assign(BladeTrinityScene.prototype, {

  _buildSelect() {
    this.selCursor = [0];
    this.selGroup = this.add.container(0, 0).setDepth(50);

    this.selTitle = this.add.text(BT.GAME_W / 2, 52, '选择你的流派 —— 挑翻另两家，登顶擂台', {
      fontFamily: 'Segoe UI, monospace', fontSize: '26px', color: '#f7ecd8', fontStyle: 'bold',
    }).setOrigin(0.5);
    const tip = this.add.text(BT.GAME_W / 2, BT.GAME_H - 22, 'A / D 选流派　·　↑ / ↓ 选难度　·　SPACE / J 确认', {
      fontFamily: 'Segoe UI, monospace', fontSize: '16px', color: '#c9b79a',
    }).setOrigin(0.5);
    this.selGroup.add([this.selTitle, tip]);
    this._buildTierPicker();

    this.selSprites = [];
    const gap = BT.GAME_W / 3;
    BT.ROSTER.forEach((id, i) => {
      const s = BT.SCHOOLS[id];
      const x = gap * i + gap / 2;
      const cols = BT.ATLAS[id].dimensions.width / BT.FRAME_W;
      const portrait = this.add.sprite(x, 250, id, BT.ATLAS[id].animations.idle.row * cols)
        .setScale(1.25);
      portrait.play(`${id}_idle`);
      const name = this.add.text(x, 360, s.name, {
        fontFamily: 'Segoe UI, monospace', fontSize: '26px', color: s.accent, fontStyle: 'bold',
      }).setOrigin(0.5);
      const blurb = this.add.text(x, 392, s.blurb, {
        fontFamily: 'Segoe UI, monospace', fontSize: '15px', color: '#e8dcc6',
      }).setOrigin(0.5);
      const tipT = this.add.text(x, 424, s.tip, {
        fontFamily: 'Segoe UI, monospace', fontSize: '12px', color: '#a9998a',
        align: 'center', wordWrap: { width: gap - 48 },
      }).setOrigin(0.5, 0);
      this.selSprites.push(portrait);
      this.selGroup.add([portrait, name, blurb, tipT]);
    });

    this.selBoxP1 = this.add.rectangle(0, 250, 196, 250).setStrokeStyle(5, 0x4a9fd8).setDepth(49);
    this.selGroup.add(this.selBoxP1);
    this._refreshSelect();
  },

  _refreshSelect() {
    const gap = BT.GAME_W / 3, cx = (i) => gap * i + gap / 2;
    this.selBoxP1.setPosition(cx(this.selCursor[0]), 250);
    this.selSprites.forEach((s, i) => s.setAlpha(i === this.selCursor[0] ? 1 : 0.4));
  },

  // ─────────── 难度徽章（折进选人屏，不新开菜单，守「即开即玩」）───────────
  // 一行五枚徽章：上→圣→王→帝→神。默认落在王级（BT.TIER_DEFAULT），不选也能打。
  // 选级 = 选【起始档】，第二场自动 +1 级（阶梯在 fight.js）。
  _buildTierPicker() {
    const order = BT.TIERS.order;
    const def = Math.max(0, order.indexOf(BT.TIER_DEFAULT));
    if (this.selTier == null) this.selTier = def;   // create() 的 URL 参数可能已先设过
    const label = this.add.text(BT.GAME_W / 2, 446, '难度', {
      fontFamily: 'Segoe UI, monospace', fontSize: '13px', color: '#8a7a68',
    }).setOrigin(0.5);
    this.selGroup.add(label);
    this.tierBadges = [];
    const n = order.length, bw = 92, bgap = 8;
    const total = n * bw + (n - 1) * bgap, x0 = (BT.GAME_W - total) / 2;
    order.forEach((id, i) => {
      const t = BT.TIERS[id], x = x0 + i * (bw + bgap) + bw / 2;
      const box = this.add.rectangle(x, 476, bw, 30, 0x1a120a, 0.6).setStrokeStyle(2, 0x4a3a28);
      const txt = this.add.text(x, 476, t.name, {
        fontFamily: 'Segoe UI, monospace', fontSize: '16px', color: t.accent, fontStyle: 'bold',
      }).setOrigin(0.5);
      this.tierBadges.push({ box, txt, accent: t.accent });
      this.selGroup.add([box, txt]);
    });
    this._refreshTier();
  },

  _refreshTier() {
    if (!this.tierBadges) return;
    this.tierBadges.forEach((b, i) => {
      const on = i === this.selTier;
      b.box.setStrokeStyle(on ? 3 : 2, on ? Phaser.Display.Color.HexStringToColor(b.accent).color : 0x4a3a28);
      b.box.setFillStyle(on ? 0x2a1e10 : 0x1a120a, on ? 0.85 : 0.55);
      b.txt.setAlpha(on ? 1 : 0.5);
    });
  },

  _tierMove(d) {
    if (this.phase !== 'select' || !this.tierBadges) return;
    this.selTier = Phaser.Math.Clamp(this.selTier + d, 0, BT.TIERS.order.length - 1);
    this._refreshTier();
  },

  _selectMove(d) {
    if (this.phase !== 'select') return;
    this.selCursor[0] = Phaser.Math.Wrap(this.selCursor[0] + d, 0, BT.ROSTER.length);
    this._refreshSelect();
  },

  _selectConfirm() {
    if (this.phase !== 'select') return;
    this._startGauntlet(BT.ROSTER[this.selCursor[0]]);
  },
});
