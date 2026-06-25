/* ShadowArena — §4B 原型分割；方法体逐字保留。 */
Object.assign(ShadowArenaScene.prototype, {

  // ─────────── 对战 ───────────
  _startFight(p1Id, p2Id) {
    if (!CHARS[p1Id]) p1Id = 'samurai';
    if (!CHARS[p2Id]) p2Id = 'ninja';
    this.phase = 'fight';
    this.selGroup.destroy();
    this.p1 = this._makeFighter(p1Id, 250, false);
    this.p2 = this._makeFighter(p2Id, GAME_W - 250, true);
    this.fighters = [this.p1, this.p2];
    this.physics.add.collider(this.p1.sprite, this.floor);
    this.physics.add.collider(this.p2.sprite, this.floor);
    this._buildBars();
    window.__gameState = { player: this.p1.sprite };
    window.GameHUD?.setObjective(`${CHARS[p1Id].name} VS ${CHARS[p2Id].name}　—　击倒对手！(J 拳 K 腿 S 防 L 必杀)`);
    this.aiNext = 0;
  },


  _makeFighter(id, x, faceLeft) {
    const def = CHARS[id];
    const sp = this.physics.add.sprite(x, FLOOR_Y - 60, `${id}_idle_0`).setScale(SCALE);
    sp.body.setSize(46, 112).setOffset(FRAME_W / 2 - 23, 58);
    sp.setCollideWorldBounds(true); sp.setFlipX(faceLeft); sp.setDepth(10);
    sp.play(`${id}_idle`);
    return { id, def, sprite: sp, hp: def.hp, maxHp: def.hp, state: 'idle', stateUntil: 0, invuln: 0, atkFrom: 0, atkTo: 0, atkHit: false, facingLeft: faceLeft };
  },


  _buildBars() {
    this.barG = this.add.graphics().setScrollFactor(0).setDepth(60);
    this.add.text(40, 22, CHARS[this.p1.id].name, { fontFamily: 'Segoe UI, monospace', fontSize: '18px', color: '#1a1208', fontStyle: 'bold' }).setScrollFactor(0).setDepth(61);
    this.add.text(GAME_W - 40, 22, CHARS[this.p2.id].name, { fontFamily: 'Segoe UI, monospace', fontSize: '18px', color: '#1a1208', fontStyle: 'bold' }).setOrigin(1, 0).setScrollFactor(0).setDepth(61);
    this._drawBars();
  },

  _drawBars() {
    const g = this.barG; g.clear();
    const W = 380, H = 22, y = 46;
    g.fillStyle(0x000000, 0.35); g.fillRect(40, y, W, H);
    g.fillStyle(0x2563eb, 1); g.fillRect(40, y, W * Phaser.Math.Clamp(this.p1.hp / this.p1.maxHp, 0, 1), H);
    g.lineStyle(2, 0x1a1208, 0.8); g.strokeRect(40, y, W, H);
    g.fillStyle(0x000000, 0.35); g.fillRect(GAME_W - 40 - W, y, W, H);
    const w2 = W * Phaser.Math.Clamp(this.p2.hp / this.p2.maxHp, 0, 1);
    g.fillStyle(0xdc2626, 1); g.fillRect(GAME_W - 40 - w2, y, w2, H);
    g.lineStyle(2, 0x1a1208, 0.8); g.strokeRect(GAME_W - 40 - W, y, W, H);
  },
});
