/* ShadowNinja — 由单体 game-logic.js 机械原型分割而来；方法体逐字保留(MIGRATION.md §4B)。 */
Object.assign(ShadowNinjaScene.prototype, {

  _spotted() {
    if (this.invuln || this.gameOver || this.cardActive) return;
    this.hp = Math.max(0, this.hp - 1);
    window.GameHUD?.setHearts(this.hp, this.maxHp);
    this.invuln = true;
    this.cameras.main.flash(180, 255, 120, 60); this.cameras.main.shake(140, 0.008);
    this.player.setVelocity(0, 0);
    if (this.hp <= 0) {
      this.deaths++;
      if (this.deaths >= DEATH_BUDGET) { this._lose(); return; }
      // 血量耗尽才退回本幕检查点，满血重来
      this._showCard('被发现了！',
        `警钟在回廊间回荡……影闪身退回阴影。\n（第 ${this.deaths}/${DEATH_BUDGET} 次失手，退回本幕起点重来）`,
        () => this._enterAct(this.actIdx, false));
    } else {
      // 被擦到：仅小幅击退 + 无敌帧，不退回检查点（避免反复回弹卡死）
      const back = Math.max(ACTS[this.actIdx].startX, this.player.x - 150);
      this.player.setPosition(back, SPAWN_Y);
      this.time.delayedCall(900, () => { this.invuln = false; });
    }
  },


  // 给定世界坐标在 time 时刻是否处于任一光锥/光柱内（蹲伏可避）
  _dangerAt(px, py, time) {
    for (const s of this.guards) if (this._coneHit(s, px, py)) return true;
    for (const l of this.lights) if (this._beamHit(l, time, px, py)) return true;
    return false;
  },


  _guardCone(s) {
    const dir = s.getData('dir') ?? 1;
    const ex = s.x + dir * 10, ey = s.y - 6;
    const len = 230, half = 60;
    return new Phaser.Geom.Triangle(ex, ey, ex + dir * len, ey - half, ex + dir * len, ey + half);
  },

  _beamTri(l, time) {
    const sx = l.x, sy = 40;
    const sweep = Math.sin(time / 700 + l.phase) * 120;
    const cx = sx + sweep, spread = 70;
    return new Phaser.Geom.Triangle(sx, sy, cx - spread, FLOOR_TOP, cx + spread, FLOOR_TOP);
  },

  _coneHit(s, px, py) { return Phaser.Geom.Triangle.ContainsPoint(this._guardCone(s), new Phaser.Geom.Point(px, py)); },

  _beamHit(l, time, px, py) { return Phaser.Geom.Triangle.ContainsPoint(this._beamTri(l, time), new Phaser.Geom.Point(px, py)); },


  _drawCones(time) {
    const g = this.coneGfx; g.clear();
    this.guards.forEach(s => {
      const t = this._guardCone(s);
      g.fillStyle(WARM, 0.12); g.fillTriangleShape(t);
      g.lineStyle(1, WARM, 0.25); g.strokeTriangleShape(t);
    });
    // 探照灯仅在已进入的幕（二幕起）显示，避免一幕教学被干扰
    if (this.actIdx >= 1) {
      this.lights.forEach(l => { g.fillStyle(0xfff0c0, 0.10); g.fillTriangleShape(this._beamTri(l, time)); });
    }
  }
});
