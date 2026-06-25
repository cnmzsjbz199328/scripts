/* DustTown — §4B 原型分割；方法体逐字保留。 */
Object.assign(DustTownScene.prototype, {

  _buildDialogue() {
    const w = 760, h = 96, x = (GAME_W - w) / 2, y = GAME_H - h - 18;
    this.dlgBg = this.add.graphics().setScrollFactor(0).setDepth(50).setVisible(false);
    this.dlgBg.fillStyle(0x1a120a, 0.92); this.dlgBg.fillRoundedRect(x, y, w, h, 10);
    this.dlgBg.lineStyle(2, 0xe8c84a, 0.8); this.dlgBg.strokeRoundedRect(x, y, w, h, 10);
    this.dlgName = this.add.text(x + 18, y + 12, '', { fontFamily: 'Segoe UI, monospace', fontSize: '16px', color: '#e8c84a', fontStyle: 'bold' }).setScrollFactor(0).setDepth(51).setVisible(false);
    this.dlgText = this.add.text(x + 18, y + 40, '', { fontFamily: 'Segoe UI, monospace', fontSize: '15px', color: '#f3ead6', wordWrap: { width: w - 36 } }).setScrollFactor(0).setDepth(51).setVisible(false);
  },


  _showDialogue(name, line) {
    this.dlgBg.setVisible(true);
    this.dlgName.setText(name).setVisible(true);
    this.dlgText.setText(line).setVisible(true);
    if (this._dlgTimer) this._dlgTimer.remove();
    this._dlgTimer = this.time.delayedCall(4200, () => this._hideDialogue());
  },

  _hideDialogue() { this.dlgBg.setVisible(false); this.dlgName.setVisible(false); this.dlgText.setVisible(false); },


  _nearNpc() {
    let best = null, bestD = 60;
    this.npcs.getChildren().forEach(n => {
      if (n.getData('done')) return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, n.x, n.y);
      if (d < bestD) { bestD = d; best = n; }
    });
    return best;
  },


  _listen(npc) {
    npc.setData('done', true); npc.setTint(0x88cc88);
    this.score++; window.GameHUD?.setScore(this.score);
    const data = NPCS[npc.getData('idx')];
    this._showDialogue(data.name, data.line);
    this.prompt.setVisible(false);
    // 章节推进：一章 0-1 份、二章 2-4 份、三章 集齐 5 份(法庭高潮)
    const newCh = this.score < 2 ? 0 : this.score < WIN_SCORE ? 1 : 2;
    if (newCh > this.chapter) {
      this.gameStarted = false;
      const ch = CHAPTERS[newCh];
      this.time.delayedCall(900, () => this._showCard(ch.intro[0], ch.intro[1], () => this._enterChapter(newCh, true)));
      return;
    }
    this._updateObjective();
  },


  _nearestUnvisited() {
    let best = null, bestD = 1e9;
    this.npcs.getChildren().forEach(n => {
      if (n.getData('done')) return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, n.x, n.y);
      if (d < bestD) { bestD = d; best = n; }
    });
    return best;
  },
});
