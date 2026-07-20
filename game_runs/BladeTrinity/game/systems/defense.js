/* BladeTrinity — 三流派差异化防御。
 *
 * ShadowArena 的防御是「伤害打两折」一个数字通吃。那套照搬过来会把三流派压平成换皮，
 * 因为三流派的差异【主要就在防御】上。这里三种挡法各自成立：
 *
 *   brace（剑神流·力受け）减伤最多，代价是被推退，逼到台边破防大硬直
 *   parry（水神流·受け流し）完美窗口内卸掉对手 → 攻击者硬直 + 自己开反击窗口
 *   dodge（北神流·逸らし）真无敌 + 侧移，但空放留大破绽
 *
 * 克制三角由这三套参数与 BT.ATTACK 的窗口互相咬合产生，不靠额外的相克表。
 */
Object.assign(BladeTrinityScene.prototype, {

  // ─────────── 起防 ───────────
  _startDefense(f, time) {
    const kind = f.def.defense;
    if (kind === 'dodge') {
      // 闪避是瞬发动作，不是可长按的状态；有冷却，空放有硬直
      if (time < f.dodgeReady || !this._canAct(f)) return;
      const d = BT.DEFENSE.dodge, dir = f.facingLeft ? 1 : -1;   // 往身后侧移
      f.iframeUntil = time + d.iframes;
      f.dodgeReady = time + d.cooldown;
      f.dodgedSomething = false;
      f.sprite.setVelocityX(d.sidestep * 8 * dir);
      this._setState(f, 'guard', d.iframes + 60);
      this._ghost(f);
      // 空放惩罚：无敌帧内什么都没躲到 → 露出大破绽
      this.time.delayedCall(d.iframes + 20, () => {
        if (f.state === 'down') return;
        f.sprite.setVelocityX(0);
        if (!f.dodgedSomething) {
          this._setState(f, 'stun', d.whiffStun);
          this._popText(f.sprite.x, f.sprite.y - 84, '空振', '#9a6fd0');
        }
      });
      return;
    }
    // brace / parry：按住即进入防御态
    if (!this._canAct(f)) return;
    if (f.state !== 'guard') {
      f.guardFrom = time;
      this._setState(f, 'guard');
    }
    f.sprite.setVelocityX(0);
  },

  _endDefense(f) {
    if (f.state === 'guard' && f.def.defense !== 'dodge') this._setState(f, 'idle');
  },

  // 每帧维护：反击窗口过期
  _tickDefense(f, time) {
    if (f.riposteUntil && time > f.riposteUntil) f.riposteUntil = 0;
  },

  // ─────────── 结算 ───────────
  // 返回 { dealt, blocked, negated, pushback }
  _resolveDefense(attacker, target, dmg, dir) {
    const plain = { dealt: dmg, blocked: false, negated: false, pushback: 0 };

    // 北神流闪避：无敌帧内完全免疫，且标记「躲到了」以免空放惩罚
    if (this.time.now < target.iframeUntil) {
      target.dodgedSomething = true;
      this._popText(target.sprite.x, target.sprite.y - 84, '逸らし', '#c0a0ff');
      this._flash(target.sprite.x, target.sprite.y - 36, 0xc0a0ff, 14, 2.2);
      return { dealt: 0, blocked: false, negated: true, pushback: 0 };
    }

    // 不在防御态 / 被从背后打 → 全伤
    // （朝向判定沿用 ShadowArena：facingLeft 与来向不符即背击，防御无效）
    if (target.state !== 'guard') return plain;
    if (target.facingLeft !== (dir > 0)) return plain;

    const kind = target.def.defense;

    if (kind === 'brace') {
      // 剑神流硬扛：减伤最多，但被推退；被逼到台边则破防
      const d = BT.DEFENSE.brace;
      const nextX = target.sprite.x + dir * d.pushback;
      const atEdge = nextX < d.edgeMargin || nextX > BT.GAME_W - d.edgeMargin;
      if (atEdge) {
        this._setState(target, 'stun', d.breakStun);
        this._popText(target.sprite.x, target.sprite.y - 84, '破防！', '#ff8a3b');
        return { dealt: Math.round(dmg * 0.5), blocked: false, negated: false, pushback: 0 };
      }
      this._popText(target.sprite.x, target.sprite.y - 84, '力受け', '#ffd28a');
      return { dealt: Math.round(dmg * d.reduce), blocked: true, negated: false, pushback: d.pushback * 4 };
    }

    if (kind === 'parry') {
      // 水神流受流：按下防御后 perfect 毫秒内为完美窗口
      const d = BT.DEFENSE.parry;
      const held = this.time.now - target.guardFrom;
      if (held <= d.perfect) {
        // 完美：对手被卸力硬直，自己获得反击窗口
        this._setState(attacker, 'stun', d.attackerStun);
        attacker.sprite.setVelocityX(0);
        attacker.atkHit = true;
        target.riposteUntil = this.time.now + d.riposteWindow;
        this._popText(target.sprite.x, target.sprite.y - 84, '受け流し！', '#8fe0ff');
        this._flash(target.sprite.x, target.sprite.y - 36, 0x8fe0ff, 18, 2.8);
        this.cameras.main.shake(90, 0.005);
        return { dealt: 0, blocked: true, negated: false, pushback: 24 };
      }
      // 迟了：普通格挡
      this._popText(target.sprite.x, target.sprite.y - 84, '格挡', '#9fd0ff');
      return { dealt: Math.round(dmg * d.lateReduce), blocked: true, negated: false, pushback: 90 };
    }

    return plain;
  },

  // 反击窗口内伤害加成——水神流「后发制人」的收益兑现处
  _damageOf(f) {
    const base = BT.ATTACK[f.id].dmg;
    if (f.riposteUntil && this.time.now < f.riposteUntil) {
      return Math.round(base * BT.DEFENSE.parry.riposteBonus);
    }
    return base;
  },
});
