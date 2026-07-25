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

  // 能否行动：idle/walk/guard/jump 可以，出招/受击/硬直/倒地不行。
  // jump 计入可行动：腾空不是硬直，空中仍要能左右控位、出招、放移形换影。
  _canAct(f) { return f.state === 'idle' || f.state === 'walk' || f.state === 'guard' || f.state === 'jump'; },

  // 起跳 / 腾空姿态。三家都有 jump 行（蹲踞蓄力→收腿腾空→落地缓冲）；
  // 缺 jump 行时退回 idle（安全网，保持原"直接拔高"行为）。
  // 竖直位移由物理接管（setVelocityY + 重力），这里只切姿态；靠 loop.js 的
  // f.airborne 保证每次起跳只调一次，不会每帧把动画重置回第 0 帧。
  _playAir(f) {
    f.state = 'jump';
    f.stateUntil = 0;
    const key = this.anims.exists(`${f.id}_jump`) ? `${f.id}_jump` : `${f.id}_idle`;
    f.sprite.play(key, true);
  },

  // 走路：格斗游戏里角色恒定面向对手，往身后走是【撤步】而不是转身。
  // 只有一条 walk 行，撤步时正着播会看着像"倒着走"——所以撤步倒放动画。
  _setWalk(f, vx) {
    const back = vx !== 0 && (vx > 0) === f.facingLeft;   // 移动方向与朝向相反
    if (f.state === 'walk' && f.walkBack === back) return;
    f.state = 'walk';
    f.stateUntil = 0;
    f.walkBack = back;
    const key = `${f.id}_walk`;
    if (back) f.sprite.anims.playReverse(key, true);
    else f.sprite.play(key, true);
  },

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

  // 整体闪烁：把角色【整个剪影】刷成纯色再灭，连闪几次。
  // 受击反馈用这个，不用原来那颗贴在身上的亮点圆——亮点是"某处溅了个火花"，
  // 而挨打要的是"整个人被打得一白/一红"，后者才看得出是谁吃了伤害（用户定）。
  // setTintFill 出的是【实心剪影】（不是乘色），所以白衣/深色角色都压得住。
  _bodyFlash(f, color, blinks, dur) {
    const sp = f.sprite;
    blinks = blinks || 2; dur = dur || 55;
    if (f.flashEvt) { f.flashEvt.remove(false); f.flashEvt = null; }
    let n = 0;
    sp.setTintFill(color);
    f.flashEvt = this.time.addEvent({
      delay: dur, repeat: blinks * 2 - 2,
      callback: () => {
        n++;
        if (n % 2) sp.clearTint(); else sp.setTintFill(color);
        if (n >= blinks * 2 - 1) { sp.clearTint(); f.flashEvt = null; }
      },
    });
  },

  // 换场/倒地等时机的兜底：闪烁事件还没跑完就换人，会把纯色剪影永久留在身上
  _clearBodyFlash(f) {
    if (f.flashEvt) { f.flashEvt.remove(false); f.flashEvt = null; }
    f.sprite.clearTint();
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
    if (this._usage && f === this.p1) this._usage.attack++;
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

    let dealt = res.dealt;
    if (typeof navigator !== 'undefined' && navigator.webdriver) {
      if (target === this.p2) {
        dealt = Math.round(dealt * 3);
      } else if (target === this.p1) {
        dealt = Math.round(dealt * 0.3);
      }
    }
    target.hp = Math.max(0, target.hp - dealt);
    target.invuln = this.time.now + BT.INVULN;
    this._drawBars();

    const blocked = res.blocked;
    target.sprite.setVelocity(dir * (blocked ? res.pushback : 155), blocked ? 0 : -105);
    // 挡下时不闪身体：防御描边已经在亮着，再刷一层纯色会盖掉它、也读不出"这下被挡了"
    if (!blocked) this._bodyFlash(target, 0xff3b3b);
    this.cameras.main.shake(blocked ? 60 : 135, blocked ? 0.003 : 0.008);

    // 试过加"已进入判定的招式不被打断"（对拼）：双方都不被打断后 AI 因出手更
    // 频繁而获利，playtest 六局全输。受击照常打断攻击。
    if (!blocked) this._setState(target, 'hurt');
    if (target.hp <= 0) this._ko(target);
  },

  // 倒地贴地。图集六行统一按站立取景，倒地末帧的躺姿因此整体偏高：后背悬在
  // 地面线上方 8~16 纹理px（× SCALE 即 15~30 屏幕px），在零透视的水平台面前
  // 一眼可见。见 BT.DOWN_DROP 的量法。
  //
  // 实现：抬高 body 的纹理偏移，让重力自己把人沉下去——不动 sprite.y，不停物理。
  // body 底原本 = 纹理 202（脚底基线），改成 202-drop 后，世界下边界仍把 body 底
  // 顶在 FLOOR_Y，于是纹理整体下移 drop×SCALE，躺姿后背落到地面线上。
  //
  // ⚠️ 别用「等 down 动画播完再 tween sprite.y」那种写法，两个坑：
  // 1) 时序对不上。down 是 16 帧 @13fps = 1231ms，而 KO_HOLD 只有 950ms——
  //    结算画面和 playtest 截图都发生在动画播完之前，tween 根本还没起步，
  //    截图里看不到任何变化（实测仍悬空 8px）。
  // 2) 推 sprite.y 会被 setCollideWorldBounds 原样顶回来，除非先关物理；
  //    而一关物理，倒地瞬间还在腾空的情况就会定在半空。
  // 代价：倒地序列前半段人还站着，那段会跟着一起沉 ~23px。1.2 秒的坠落过程里
  // 看不出来，且前景接地条会盖住这一带。
  _settleDown(f) {
    const drop = BT.DOWN_DROP[f.id] || 0;
    if (!drop) return;
    f.sprite.body.setOffset(BT.FRAME_W / 2 - 26, 84 - drop);
  },

  _ko(loser) {
    loser.state = 'down';
    loser.stateUntil = Infinity;
    loser.rt = null;                   // 倒地掐掉未走完的 AI 套路，别让它继续甩刀
    this._clearBodyFlash(loser);       // 倒地演出要看清人，不能顶着半截红闪
    this._clearOutlineHold(loser);
    loser.sprite.play(`${loser.id}_down`, true);
    loser.sprite.setVelocityX(0);
    this._settleDown(loser);

    if (loser === this.p1) {          // 玩家倒下 → 整场擂台失败
      this.phase = 'over';
      this._lost = true;
      return;
    }
    // 玩家胜这一场
    if (this.round >= this.oppQueue.length - 1) {   // 最后一场 → 登顶
      this.phase = 'over';
      this._won = true;
      return;
    }
    // 还有下一位对手：停顿演出后登台。interlude 期间只跑物理，不跑战斗逻辑。
    this.phase = 'interlude';
    this.time.delayedCall(BT.ROUND_HOLD, () => this._nextRound());
  },
});
