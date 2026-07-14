/* ShadowArena — §4B 原型分割；方法体逐字保留。 */
Object.assign(ShadowArenaScene.prototype, {

  // glb track 战士：持剑态(weapon==='sword')出招播横扫攻击帧；bare 态出招/其余状态回退 idle/walk
  // （按 weapon 分支）。命中判定仍走 ACT 表的 stateUntil/伤害数值，与视觉帧解耦。
  _animKey(f, st) {
    if (!f.def.glb) return `${f.id}_${st}`;
    const atk = st === 'punch' || st === 'kick' || st === 'special';
    if (f.weapon === 'sword' && atk) return `${f.id}_sword_attack`;
    return `${f.id}_${f.weapon}_${st === 'walk' ? 'walk' : 'idle'}`;
  },

  _setState(f, st) {
    if (f.state === st && (st === 'idle' || st === 'walk' || st === 'block')) return;
    f.state = st;
    const a = ACT[st];
    f.stateUntil = a.dur ? this.time.now + a.dur : (a.loop ? 0 : this.time.now + (a.n / a.fps) * 1000);
    f.sprite.play(this._animKey(f, st), true);
  },

  _canAct(f) { return f.state === 'idle' || f.state === 'walk' || f.state === 'block'; },


  // 残影拖尾
  _ghost(f) {
    const g = this.add.image(f.sprite.x, f.sprite.y, f.sprite.texture.key)
      .setScale(SCALE).setFlipX(f.sprite.flipX).setDepth(9).setAlpha(0.4).setTint(0x4a6090);
    this.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.destroy() });
  },

  // 刀光弧
  _swordArc(f, dir) {
    const g = this.add.graphics().setDepth(24);
    g.lineStyle(7, 0xfff0c0, 0.6);
    g.beginPath();
    g.arc(f.sprite.x + dir * 10, f.sprite.y - 26, 62, dir > 0 ? rad(-55) : rad(125), dir > 0 ? rad(70) : rad(235), false);
    g.strokePath();
    g.lineStyle(3, 0xffffff, 0.8); g.beginPath();
    g.arc(f.sprite.x + dir * 10, f.sprite.y - 26, 62, dir > 0 ? rad(-55) : rad(125), dir > 0 ? rad(70) : rad(235), false);
    g.strokePath();
    this.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.destroy() });
    function rad(d) { return d * Math.PI / 180; }
  },


  _attack(f, kind) {
    if (!this._canAct(f)) return;
    if (kind === 'special') return this._special(f);
    const a = ACT[kind], dir = f.facingLeft ? -1 : 1;
    this._setState(f, kind);
    f.atkHit = false; f.atkFrom = this.time.now + a.from; f.atkTo = this.time.now + a.to;
    // 前冲步 + 残影
    this.time.delayedCall(a.from - 20, () => { if (f.state === kind) { f.sprite.setVelocityX(a.lunge * dir); this._ghost(f); } });
    this.time.delayedCall(a.from + 30, () => { if (f.state === kind) this._ghost(f); });
    if (f.weapon === 'sword' && kind === 'punch') this.time.delayedCall(a.from, () => { if (f.state === kind) this._swordArc(f, dir); });
  },


  _special(f) {
    const sp = f.def.special, dir = f.facingLeft ? -1 : 1;
    this._setState(f, 'special');
    f.atkHit = false;
    // 残影连发，强调速度感
    for (const t of [180, 240, 300]) this.time.delayedCall(t, () => { if (f.state === 'special') this._ghost(f); });
    if (sp === 'dash') {
      f.atkFrom = this.time.now + 160; f.atkTo = this.time.now + 420;
      this.time.delayedCall(150, () => { if (f.state === 'special') { f.sprite.setVelocityX(440 * dir); if (f.weapon === 'sword') this._swordArc(f, dir); } });
      this.time.delayedCall(420, () => { if (f.state === 'special') f.sprite.setVelocityX(0); });
    } else if (sp === 'shock') {
      this.time.delayedCall(220, () => this._shock(f, dir));
    } else {
      this.time.delayedCall(210, () => this._spawnProjectile(f, dir, sp));
    }
  },


  _shock(f, dir) {
    const x = f.sprite.x + dir * 60;
    const ring = this.add.circle(x, FLOOR_Y - 6, 12, 0xff9466, 0.5).setDepth(20);
    this.tweens.add({ targets: ring, radius: 95, scale: 1, alpha: 0, duration: 340, onComplete: () => ring.destroy() });
    const opp = this._opp(f);
    if (Math.abs(opp.sprite.x - x) < 115 && opp.sprite.body.blocked.down) this._hit(f, opp, f.def.spDmg, dir);
  },

  _spawnProjectile(f, dir, kind) {
    const tex = kind === 'shuriken' ? 'shuriken' : 'qiwave';
    const pr = this.projectiles.create(f.sprite.x + dir * 44, f.sprite.y - 8, tex).setDepth(20);
    pr.setVelocityX((kind === 'shuriken' ? 470 : 300) * dir);
    pr.body.setAllowGravity(false);
    pr.setData('owner', f); pr.setData('dmg', f.def.spDmg); pr.setData('dir', dir);
    if (kind === 'shuriken') pr.setAngularVelocity(760); else pr.setFlipX(dir < 0);
  },

  _opp(f) { return f === this.p1 ? this.p2 : this.p1; },


  _hit(attacker, target, dmg, dir) {
    if (this.time.now < target.invuln || target.state === 'ko') return;
    let dealt = dmg;
    const blocking = target.state === 'block' && (target.facingLeft !== (dir > 0));
    if (blocking) dealt = Math.round(dmg * 0.2);
    target.hp = Math.max(0, target.hp - dealt);
    target.invuln = this.time.now + 320;
    this._drawBars();
    target.sprite.setVelocity(dir * (blocking ? 80 : 210), -130);
    const fx = this.add.circle(target.sprite.x + dir * 8, target.sprite.y - 34, blocking ? 9 : 15, blocking ? 0x9fd0ff : 0xff5544, 0.9).setDepth(30);
    this.tweens.add({ targets: fx, scale: 2.4, alpha: 0, duration: 240, onComplete: () => fx.destroy() });
    this.cameras.main.shake(blocking ? 60 : 130, blocking ? 0.003 : 0.008);
    if (!blocking) this._setState(target, 'hurt');
    if (target.hp <= 0) this._ko(target);
  },


  _ko(loser) {
    loser.state = 'ko'; loser.stateUntil = Infinity;
    loser.sprite.play(`${loser.id}_ko`, true); loser.sprite.setVelocityX(0);
    this.phase = 'over';
    const win = loser === this.p2;
    if (win) this._won = true; else this._lost = true;
    this.time.delayedCall(950, () => {
      window.GameHUD?.showGameOver(win,
        win ? `${CHARS[this.p1.id].name} 击败了 ${CHARS[this.p2.id].name}！晨光大盛，胜者的黑影在金色天光中挺立。`
            : `${CHARS[this.p2.id].name} 技高一筹，${CHARS[this.p1.id].name} 单膝跪地……再战一场？`);
    });
  },
});
