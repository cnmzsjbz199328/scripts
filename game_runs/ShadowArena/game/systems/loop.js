/* ShadowArena — §4B 原型分割；方法体逐字保留。 */
Object.assign(ShadowArenaScene.prototype, {

  _faceEachOther() {
    const left = this.p1.sprite.x > this.p2.sprite.x;
    this.p1.facingLeft = left; this.p2.facingLeft = !left;
    // 仅在可行动时翻转，避免攻击中朝向突变
    if (this._canAct(this.p1)) this.p1.sprite.setFlipX(this.p1.facingLeft);
    if (this._canAct(this.p2)) this.p2.sprite.setFlipX(this.p2.facingLeft);
  },


  _controlPlayer() {
    const f = this.p1, sp = f.sprite, onGround = sp.body.blocked.down;
    if (Phaser.Input.Keyboard.JustDown(this.keys.J)) return this._attack(f, 'punch');
    if (Phaser.Input.Keyboard.JustDown(this.keys.K)) return this._attack(f, 'kick');
    if (Phaser.Input.Keyboard.JustDown(this.keys.L)) return this._attack(f, 'special');
    if (this.keys.S.isDown && onGround && this._canAct(f)) { if (f.state !== 'block') this._setState(f, 'block'); sp.setVelocityX(0); return; }
    if (f.state === 'block') this._setState(f, 'idle');
    if (!this._canAct(f)) return;
    const left = this.keys.A.isDown || this.cursors.left.isDown;
    const right = this.keys.D.isDown || this.cursors.right.isDown;
    if (left) sp.setVelocityX(-f.def.speed);
    else if (right) sp.setVelocityX(f.def.speed);
    else sp.setVelocityX(0);
    if ((this.keys.W.isDown || this.cursors.up.isDown) && onGround) sp.setVelocityY(-580);
    this._setState(f, (left || right) && onGround ? 'walk' : 'idle');
  },


  _controlAI(time) {
    const f = this.p2, sp = f.sprite, opp = this.p1;
    if (!this._canAct(f)) return;
    const dx = opp.sprite.x - sp.x, dist = Math.abs(dx), dir = dx > 0 ? 1 : -1;
    if (dist > f.def.reach - 8) {
      sp.setVelocityX(f.def.speed * 0.85 * dir);
      this._setState(f, 'walk');
    } else {
      sp.setVelocityX(0);
      if (time > this.aiNext) {
        this.aiNext = time + Phaser.Math.Between(450, 1000);
        const r = Math.random();
        if (r < 0.18) this._setState(f, 'block');
        else if (r < 0.42) this._attack(f, 'special');
        else if (r < 0.72) this._attack(f, 'punch');
        else this._attack(f, 'kick');
      } else this._setState(f, 'idle');
    }
  },


  _resolveMelee(f) {
    if (!((f.state === 'punch') || (f.state === 'kick') || (f.state === 'special' && f.def.special === 'dash'))) return;
    if (f.atkHit || this.time.now < f.atkFrom || this.time.now > f.atkTo) return;
    const opp = this._opp(f), dir = f.facingLeft ? -1 : 1;
    const dx = opp.sprite.x - f.sprite.x;
    const reach = f.state === 'special' ? f.def.reach + 46 : f.state === 'kick' ? f.def.reach + 14 : f.def.reach;
    const dmg = f.state === 'punch' ? f.def.punch : f.state === 'kick' ? f.def.kick : f.def.spDmg;
    if (Math.sign(dx) === dir && Math.abs(dx) <= reach && Math.abs(opp.sprite.y - f.sprite.y) < 72) {
      f.atkHit = true; this._hit(f, opp, dmg, dir);
    }
  },


  _projectiles() {
    this.projectiles.getChildren().forEach(pr => {
      if (pr.x < -40 || pr.x > GAME_W + 40) { pr.destroy(); return; }
      const owner = pr.getData('owner'), opp = this._opp(owner);
      if (opp.state !== 'ko' && Math.abs(pr.x - opp.sprite.x) < 36 && Math.abs(pr.y - opp.sprite.y) < 72) {
        this._hit(owner, opp, pr.getData('dmg'), pr.getData('dir'));
        const burst = this.add.circle(pr.x, pr.y, 10, 0xffffff, 0.8).setDepth(31);
        this.tweens.add({ targets: burst, scale: 2.5, alpha: 0, duration: 220, onComplete: () => burst.destroy() });
        pr.destroy();
      }
    });
  },


  _fighterPhysics() {
    if (!this.p1 || !this.p2) return;
    const a = this.p1.sprite, b = this.p2.sprite;
    if (Math.abs(a.x - b.x) < 46 && Math.abs(a.y - b.y) < 80) {
      const push = (46 - Math.abs(a.x - b.x)) / 2, s = a.x < b.x ? 1 : -1;
      a.x -= push * s; b.x += push * s;
    }
  },
});
