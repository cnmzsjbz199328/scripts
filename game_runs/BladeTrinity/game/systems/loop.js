/* BladeTrinity — 输入 / AI / 命中判定 / 互推。 */
Object.assign(BladeTrinityScene.prototype, {

  // 朝向：素材本身朝左，所以 facingLeft = 不翻转（flipX=false）。
  //
  // ⚠️ facingLeft 与 setFlipX 必须【原子更新】：只在可行动时一起改。
  // 曾经把 facingLeft 每帧更新、只把 setFlipX 关在 _canAct 里，结果出招途中
  // 两人位置交错时逻辑朝向翻了而画面没翻，_resolveMelee 的 dir 与视觉相反
  // ——表现就是"劈砍方向反了"。
  _faceEachOther() {
    const left = this.p1.sprite.x > this.p2.sprite.x;
    for (const [f, want] of [[this.p1, left], [this.p2, !left]]) {
      if (!this._canAct(f)) continue;     // 出招/受击/硬直中锁死朝向
      f.facingLeft = want;
      f.sprite.setFlipX(!want);
    }
  },

  _controlPlayer(time) {
    const f = this.p1, sp = f.sprite, onGround = sp.body.blocked.down;
    if (Phaser.Input.Keyboard.JustDown(this.keys.J)) return this._attack(f);
    if (Phaser.Input.Keyboard.JustDown(this.keys.K)) return this._startDefense(f, time);

    // brace/parry 长按防御；dodge 是瞬发，走 K
    if (f.def.defense !== 'dodge') {
      if (this.keys.S.isDown && onGround && this._canAct(f)) {
        this._startDefense(f, time);
        return;
      }
      if (f.state === 'guard') this._setState(f, 'idle');
    }

    if (!this._canAct(f)) return;
    const left = this.keys.A.isDown || this.cursors.left.isDown;
    const right = this.keys.D.isDown || this.cursors.right.isDown;
    if (left) sp.setVelocityX(-f.def.speed);
    else if (right) sp.setVelocityX(f.def.speed);
    else sp.setVelocityX(0);
    if ((this.keys.W.isDown || this.cursors.up.isDown) && onGround) sp.setVelocityY(-560);
    this._setState(f, (left || right) && onGround ? 'walk' : 'idle');
  },

  // 对手 AI：距离驱动 + 随机权重；防御倾向按自己的流派调整
  _controlAI(time) {
    const f = this.p2, sp = f.sprite, opp = this.p1;
    if (!this._canAct(f)) return;
    const dx = opp.sprite.x - sp.x, dist = Math.abs(dx), dir = dx > 0 ? 1 : -1;

    // 交战距离要把【前冲步】算进去：招式自带 lunge 会主动贴上去。
    // 只按 reach 判断的话，被击退到射程外的 AI 会选择"走近"，而走的路上又挨打
    // —— 对手射程更长时这会变成永久压制（playtest 表现为 bot 无伤通关）。
    const engage = f.def.reach + BT.ATTACK[f.id].lunge * 0.35;
    if (dist > engage) {
      sp.setVelocityX(f.def.speed * 0.85 * dir);
      this._setState(f, 'walk');
      return;
    }
    sp.setVelocityX(0);
    if (time <= this.aiNext) { this._setState(f, 'idle'); return; }
    // 决策间隔必须【短于】受击硬直+无敌（380+300=680ms），否则对手连打时
    // AI 永远轮不到出手 —— playtest 里表现为 bot 8 秒满血通关。
    this.aiNext = time + Phaser.Math.Between(180, 420);

    // 对手正在出招 → 提高防御概率，让三流派的防御机制真的被看见
    const oppAttacking = opp.state === 'attack';
    const r = Math.random();
    if (oppAttacking && r < 0.55) this._startDefense(f, time);
    else if (r < 0.24) this._startDefense(f, time);
    else this._attack(f);
  },

  // 近战命中判定
  // 【扫掠区间】而非瞬时距离：无头 playtest 约 15fps，带 lunge 前冲时单帧可位移
  // 上百 px，瞬时判定会确定性 miss（tween 命中隧穿的同源问题）。
  // 这里比较 [上帧 dx, 本帧 dx] 两个端点，任一端进入 reach 即判命中。
  _resolveMelee(f) {
    if (f.state !== 'attack') return;
    if (f.atkHit || this.time.now < f.atkFrom || this.time.now > f.atkTo) return;

    const opp = this._opp(f), dir = f.facingLeft ? -1 : 1;
    const dx = opp.sprite.x - f.sprite.x;
    const prev = f.prevDx === null ? dx : f.prevDx;
    f.prevDx = dx;

    if (Math.abs(opp.sprite.y - f.sprite.y) >= 78) return;
    const near = Math.min(Math.abs(dx), Math.abs(prev));
    const facingRight = Math.sign(dx) === dir || Math.sign(prev) === dir;
    if (facingRight && near <= f.def.reach) {
      f.atkHit = true;
      this._hit(f, opp, this._damageOf(f), dir);
      if (f.riposteUntil) f.riposteUntil = 0;   // 反击加成一次性
    }
  },

  // 两人重叠时互推开
  _fighterPhysics() {
    if (!this.p1 || !this.p2) return;
    const a = this.p1.sprite, b = this.p2.sprite;
    if (Math.abs(a.x - b.x) < 52 && Math.abs(a.y - b.y) < 84) {
      const push = (52 - Math.abs(a.x - b.x)) / 2, s = a.x < b.x ? 1 : -1;
      a.x -= push * s; b.x += push * s;
    }
  },
});
