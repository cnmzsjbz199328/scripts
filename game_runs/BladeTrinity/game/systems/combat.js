/* BladeTrinity — 状态机 / 出招 / 命中结算 / 特效。 */
Object.assign(BladeTrinityScene.prototype, {

  // ─────────── 状态机 ───────────
  // 图集只有 6 行，没有 stun/block 专用行：stun 停在 hurt 末帧，guard 各流派共用 guard 行。
  _animKey(f, st) {
    if (st === 'stun') return `${f.id}_hurt`;
    if (st === 'guard') return `${f.id}_guard`;
    return `${f.id}_${st}`;
  },

  _setState(f, st, dur) {
    if (f.state === st && (st === 'idle' || st === 'walk' || st === 'guard')) return;
    f.state = st;
    if (dur) f.stateUntil = this.time.now + dur;
    else if (st === 'attack') f.stateUntil = this.time.now + BT.ATTACK[f.id].dur;
    else if (st === 'hurt') f.stateUntil = this.time.now + BT.HURT_DUR;
    else f.stateUntil = 0;
    f.sprite.play(this._animKey(f, st), true);
  },

  // 能否行动：idle/walk/guard 可以，出招/受击/硬直/倒地不行
  _canAct(f) { return f.state === 'idle' || f.state === 'walk' || f.state === 'guard'; },

  _opp(f) { return f === this.p1 ? this.p2 : this.p1; },

  // ─────────── 特效 ───────────
  _ghost(f) {
    const g = this.add.image(f.sprite.x, f.sprite.y, f.id, f.sprite.frame.name)
      .setScale(BT.SCALE).setFlipX(f.sprite.flipX).setDepth(9)
      .setAlpha(0.34).setTint(0x8fa8d0);
    this.tweens.add({ targets: g, alpha: 0, duration: 230, onComplete: () => g.destroy() });
  },

  _swordArc(f, dir, color) {
    const rad = (d) => d * Math.PI / 180;
    const cx = f.sprite.x + dir * 12, cy = f.sprite.y - 30;
    const g = this.add.graphics().setDepth(24);
    for (const [w, a] of [[8, 0.5], [3, 0.85]]) {
      g.lineStyle(w, color, a);
      g.beginPath();
      g.arc(cx, cy, 70, dir > 0 ? rad(-55) : rad(125), dir > 0 ? rad(70) : rad(235), false);
      g.strokePath();
    }
    this.tweens.add({ targets: g, alpha: 0, duration: 230, onComplete: () => g.destroy() });
  },

  _flash(x, y, color, r, scale) {
    const fx = this.add.circle(x, y, r, color, 0.9).setDepth(30);
    this.tweens.add({ targets: fx, scale, alpha: 0, duration: 250, onComplete: () => fx.destroy() });
  },

  _popText(x, y, text, color) {
    const t = this.add.text(x, y, text, {
      fontFamily: 'Segoe UI, monospace', fontSize: '20px', color, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(40);
    this.tweens.add({
      targets: t, y: y - 42, alpha: 0, duration: 720,
      onComplete: () => t.destroy(),
    });
  },

  // ─────────── 出招 ───────────
  _attack(f) {
    if (!this._canAct(f)) return;
    this._endDefense(f);
    const a = BT.ATTACK[f.id], dir = f.facingLeft ? -1 : 1;
    this._setState(f, 'attack');
    f.atkHit = false;
    f.atkFrom = this.time.now + a.from;
    f.atkTo = this.time.now + a.to;
    f.prevDx = null;

    // 北神流：假动作段先甩一下（有动作、无判定），骗对手交防御
    if (a.feint) {
      this.time.delayedCall(a.feint - 60, () => {
        if (f.state === 'attack') this._ghost(f);
      });
    }
    // 前冲步 + 残影 + 刀光
    this.time.delayedCall(Math.max(0, a.from - 40), () => {
      if (f.state !== 'attack') return;
      f.sprite.setVelocityX(a.lunge * dir);
      this._ghost(f);
      this._swordArc(f, dir, f.id === 'north' ? 0xd8c0ff : 0xfff0c0);
    });
    this.time.delayedCall(a.to, () => {
      if (f.state === 'attack') f.sprite.setVelocityX(0);
    });
  },

  // ─────────── 命中结算 ───────────
  // dmg 已含反击加成；防御分流交给 defense.js 的 _resolveDefense
  _hit(attacker, target, dmg, dir) {
    if (this.time.now < target.invuln || target.state === 'down') return;

    const res = this._resolveDefense(attacker, target, dmg, dir);
    if (res.negated) return;   // 北神流闪避完全免疫，不进伤害流程

    target.hp = Math.max(0, target.hp - res.dealt);
    target.invuln = this.time.now + BT.INVULN;
    this._drawBars();

    const blocked = res.blocked;
    target.sprite.setVelocity(dir * (blocked ? res.pushback : 155), blocked ? 0 : -105);
    this._flash(target.sprite.x + dir * 8, target.sprite.y - 36,
      blocked ? 0x9fd0ff : 0xff5544, blocked ? 10 : 16, blocked ? 1.8 : 2.5);
    this.cameras.main.shake(blocked ? 60 : 135, blocked ? 0.003 : 0.008);

    if (!blocked) this._setState(target, 'hurt');
    if (target.hp <= 0) this._ko(target);
  },

  _ko(loser) {
    loser.state = 'down';
    loser.stateUntil = Infinity;
    loser.sprite.play(`${loser.id}_down`, true);
    loser.sprite.setVelocityX(0);
    this.phase = 'over';
    const win = loser === this.p2;
    if (win) this._won = true; else this._lost = true;
    const me = BT.SCHOOLS[this.p1.id].name, foe = BT.SCHOOLS[this.p2.id].name;
    this.time.delayedCall(BT.KO_HOLD, () => {
      window.GameHUD?.showGameOver(win, win
        ? `${me} 胜。${foe} 的剑落在台上——剑术的高下，从来只在一瞬的读招之间。`
        : `${foe} 胜。${me} 单膝跪地……换个流派，再战一场？`);
    });
  },
});
