/* BladeTrinity — 选流派。P1 选自己，P2 选对手，随即开打。 */
Object.assign(BladeTrinityScene.prototype, {

  _buildSelect() {
    this.selCursor = [0];
    this.selGroup = this.add.container(0, 0).setDepth(50);

    this.selTitle = this.add.text(BT.GAME_W / 2, 52, '选择你的流派 —— 挑翻另两家，登顶擂台', {
      fontFamily: 'Segoe UI, monospace', fontSize: '26px', color: '#f7ecd8', fontStyle: 'bold',
    }).setOrigin(0.5);
    const tip = this.add.text(BT.GAME_W / 2, BT.GAME_H - 26, 'A / D 选择　·　SPACE / J 确认', {
      fontFamily: 'Segoe UI, monospace', fontSize: '17px', color: '#c9b79a',
    }).setOrigin(0.5);
    this.selGroup.add([this.selTitle, tip]);

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
