/* ShadowArena — §4B 原型分割；方法体逐字保留。 */
Object.assign(ShadowArenaScene.prototype, {

  // ─────────── 选人 ───────────
  _buildSelect() {
    this.selStep = 0; this.selCursor = [0, 1]; this.pick = [null, null];
    this.selGroup = this.add.container(0, 0).setDepth(50);
    this.selTitle = this.add.text(GAME_W / 2, 60, '选择你的武者 (P1)', { fontFamily: 'Segoe UI, monospace', fontSize: '30px', color: '#3a2a1a', fontStyle: 'bold' }).setOrigin(0.5);
    const tip = this.add.text(GAME_W / 2, 502, 'A / D 选择   ·   SPACE / J 确认', { fontFamily: 'Segoe UI, monospace', fontSize: '18px', color: '#5a4632' }).setOrigin(0.5);
    this.selGroup.add([this.selTitle, tip]);
    this.selSprites = [];
    const gap = GAME_W / 4;
    ROSTER.forEach((id, i) => {
      const x = gap * i + gap / 2;
      const portraitKey = CHARS[id].glb ? `${id}_${CHARS[id].weapon}_idle_0` : `${id}_idle_0`;
      const s = this.add.image(x, 296, portraitKey).setScale(0.9);
      const n = this.add.text(x, 398, CHARS[id].name, { fontFamily: 'Segoe UI, monospace', fontSize: '22px', color: '#2a1c10', fontStyle: 'bold' }).setOrigin(0.5);
      const sp = this.add.text(x, 426, this._spName(CHARS[id].special), { fontFamily: 'Segoe UI, monospace', fontSize: '14px', color: '#6a5236' }).setOrigin(0.5);
      this.selSprites.push(s); this.selGroup.add([s, n, sp]);
    });
    this.selBoxP1 = this.add.rectangle(0, 296, 184, 232).setStrokeStyle(5, 0x2563eb).setDepth(49);
    this.selBoxP2 = this.add.rectangle(0, 296, 170, 220).setStrokeStyle(5, 0xdc2626).setDepth(49).setVisible(false);
    this.selGroup.add([this.selBoxP1, this.selBoxP2]);
    this._refreshSelect();
  },

  _spName(t) { return { dash: '必杀·居合突进', shuriken: '必杀·手里剑', qi: '必杀·气功波', shock: '必杀·震地' }[t]; },

  _refreshSelect() {
    const gap = GAME_W / 4, cx = i => gap * i + gap / 2;
    this.selBoxP1.setPosition(cx(this.selCursor[0]), 296);
    this.selBoxP2.setPosition(cx(this.selCursor[1]), 296).setVisible(this.selStep >= 1);
    this.selTitle.setText(this.selStep === 0 ? '选择你的武者 (P1)' : '选择对手 (P2)');
    this.selSprites.forEach((s, i) => s.setAlpha(i === this.selCursor[this.selStep] ? 1 : 0.45));
  },

  _selectMove(d) { if (this.phase === 'select') { this.selCursor[this.selStep] = Phaser.Math.Wrap(this.selCursor[this.selStep] + d, 0, ROSTER.length); this._refreshSelect(); } },

  _selectConfirm() {
    if (this.phase !== 'select') return;
    this.pick[this.selStep] = ROSTER[this.selCursor[this.selStep]];
    if (this.selStep === 0) { this.selStep = 1; this._refreshSelect(); }
    else this._startFight(this.pick[0], this.pick[1]);
  },
});
