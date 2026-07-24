/* BladeTrinity — 三流派差异化防御。
 *
 * ShadowArena 的防御是「伤害打两折」一个数字通吃。那套照搬过来会把三流派压平成换皮，
 * 因为三流派的差异【主要就在防御】上。这里三种挡法各自成立：
 *
 *   brace（剑神流·力受け）正面【完全免伤】，代价是吃蓝 + 被推退，逼到台边破防大硬直
 *   parry（水神流·受け流し）完美窗口内免伤 + 卸掉对手 + 【把伤害弹回去】；剑气整道反射
 *   counter（北神流·返し）窗口内真无敌，挡下即【反手甩出旋转飞刀】，空放留大破绽
 *
 * 克制三角由这三套参数与 BT.ATTACK 的窗口互相咬合产生，不靠额外的相克表。
 * 三派共用一条 guard 动画行，视觉差异由 _guardAura 的外轮廓描边给（见 BT.GUARD_AURA）。
 */
Object.assign(BladeTrinityScene.prototype, {

  // ─────────── 起防 ───────────
  _startDefense(f, time) {
    const kind = f.def.defense;
    if (kind === 'counter') {
      // 反击是瞬发动作，不是可长按的状态；有冷却，空放有硬直
      if (time < f.counterReady || !this._canAct(f)) return;
      const d = BT.DEFENSE.counter, dir = f.facingLeft ? 1 : -1;   // 往身后微侧移
      f.iframeUntil = time + d.iframes;
      f.counterReady = time + d.cooldown;
      f.counterFired = false;
      f.counterGlowUntil = time + d.iframes + 60;   // 描边至少亮满整个反击窗口（挡下后由 _counterSwing 续期）
      f.sprite.setVelocityX(d.sidestep * 8 * dir);
      this._setState(f, 'guard', d.iframes + 60);
      this._ghost(f);
      // 空放惩罚：无敌窗口内什么都没挡到 → 露出大破绽
      this.time.delayedCall(d.iframes + 20, () => {
        if (f.state === 'down') return;
        f.sprite.setVelocityX(0);
        if (!f.counterFired) {
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
    if (f.state === 'guard' && f.def.defense !== 'counter') this._setState(f, 'idle');
  },

  // 每帧维护：反击窗口过期 + 防御描边跟随
  _tickDefense(f, time) {
    if (f.riposteUntil && time > f.riposteUntil) f.riposteUntil = 0;
    // 北神的防御姿势只有 260ms，之后立刻切进 attack 演反手斩 —— 只按 state==='guard'
    // 挂描边的话，三派里唯独它的描边一闪就没，看着像"没有特效"（用户实测反馈）。
    // 所以额外认一个到期时间，让描边从起防一路亮到反手斩收招。
    if (f.state === 'down') this._clearOutlineHold(f);     // 倒地要看清人，描边一律收掉
    else if (f.state === 'guard' || (f.counterGlowUntil && time < f.counterGlowUntil)) this._guardAura(f, time);
    // 蓄力中的描边由 _tickCharge 维护（同一套 _outlineHold）。这里不能顺手清掉，
    // 否则每帧一建一清，蓄力描边会闪成频闪。
    else if (!f.charging) this._clearOutlineHold(f);
  },

  // ─────────── 外轮廓描边（防御中持续）───────────
  // 八向偏移法：在角色【身后】(depth-1) 摆 rays 份同帧剪影副本，各自沿一个方向偏移 r 像素。
  // 它们的并集 = 剪影向外均匀扩张 r，本体盖住中心后，露出来的正好是一圈【等宽描边】。
  // 外面再叠一圈半径更大、ADD 混合的同色副本当辉光 → "高亮 + 外扩"。
  // r 随呼吸在 rMin~rMax 之间脉动，所以描边是活的，不是一层静态贴纸。
  //
  // ⚠️ 别退回"放大一份剪影"的写法：缩放绕中心，躯干处几乎无位移、四肢处过粗，
  // 而且 ADD + 淡色在白衣角色 + 暖背景上肉眼不可见（见 BT.GUARD_AURA 注释）。
  //
  //
  // 底层实现由防御（呼吸半径）与蓄力（半径随蓄力增长）共用，所以画面语言统一：
  // 【外轮廓 = 这个人正蓄着某种力】，不再另起一圈套在身外的廉价光环。
  _outlineHold(f, tint, r) {
    const A = BT.GUARD_AURA, sp = f.sprite;
    if (!f.guardAura) {
      f.guardAura = [];
      for (let i = 0; i <= A.rays; i++) {          // 前 rays 份是描边，最后一份是辉光
        f.guardAura.push(this.add.image(sp.x, sp.y, f.id, sp.frame.name)
          .setDepth(sp.depth - 1).setScale(BT.SCALE));
      }
      f.guardAura[A.rays].setBlendMode(Phaser.BlendModes.ADD);
    }
    for (let i = 0; i < A.rays; i++) {
      const ang = (i / A.rays) * Math.PI * 2;
      f.guardAura[i].setPosition(sp.x + Math.cos(ang) * r, sp.y + Math.sin(ang) * r)
        .setFrame(sp.frame.name).setFlipX(sp.flipX).setTint(tint).setAlpha(A.alpha);
    }
    const g = f.guardAura[A.rays];                 // 辉光：更大更淡，给溢光
    g.setPosition(sp.x, sp.y).setFrame(sp.frame.name).setFlipX(sp.flipX)
      .setScale(BT.SCALE * (1 + r * A.glowMul / 200)).setTint(tint).setAlpha(A.glowAlpha);
  },

  // 剑神的颜色兼职资源指示：蓝够 = 金色（这一记能完全免伤），蓝空 = 暗色（只剩减伤）。
  _guardAura(f, time) {
    const A = BT.GUARD_AURA, kind = f.def.defense;
    const tint = kind === 'brace'
      ? (f.mp >= BT.DEFENSE.brace.guardCost ? A.brace : A.braceDry)
      : (A[kind] || 0xffffff);
    const pulse = 0.5 + 0.5 * Math.sin(time / A.period);
    let r = A.rMin + (A.rMax - A.rMin) * pulse;
    // 挡下瞬间描边猛顶一下，随后回落——这是"防御生效"的反馈
    if (f.auraPunchUntil && time < f.auraPunchUntil) {
      r += A.punchR * ((f.auraPunchUntil - time) / A.punchMs);
    }
    this._outlineHold(f, tint, r);
  },

  // 防御成功的反馈 = 【描边猛顶一下】，不是把整个人刷成纯色。
  // ⚠️ 曾经在挡下时 _bodyFlash 一层流派色：那层纯色剪影盖在同色描边上，两者糊成
  // 一坨，描边等于消失（用户就是这么"看不到北神反击特效"的）。
  // 全身闪只保留给【受伤】——红色，且只有真掉血才闪，语义不重叠。
  _outlinePunch(f) {
    f.auraPunchUntil = this.time.now + BT.GUARD_AURA.punchMs;
  },

  _clearOutlineHold(f) {
    if (f.guardAura) { f.guardAura.forEach((g) => g.destroy()); f.guardAura = null; }
  },

  // ─────────── 北神流反手飞刀 ───────────
  // 挡下（无敌窗口内吃到任意一击/一道剑气）→ 隔 qiDelay 反手一挥，把暗器甩出去。
  // dirTo = 攻击者所在方向，由调用方按来袭方向取反算出。
  // 不耗蓝：这是防御的收益，不该和奥义经济缠绕（BT.BLINK 同理）。
  _fireCounterQi(f, dirTo) {
    const d = BT.DEFENSE.counter;
    if (f.counterFired) return;      // 一个窗口只反一记，连续挨打不刷屏
    f.counterFired = true;
    this._popText(f.sprite.x, f.sprite.y - 84, '返し！', '#c0a0ff');
    this.time.delayedCall(d.qiDelay, () => {
      if (f.state === 'down') return;
      this._counterSwing(f, dirTo);
    });
  },

  // 反手甩刀的演出。
  // ⚠️ 这里【必须真播一个动作】，不能只把弹丸生成出来：只生成弹丸的话人物全程僵在
  // 防御姿势里，暗器凭空从身侧冒出来 —— 玩家读不出"我反击了"，表现上只是
  // "防御时旁边闪了个小紫光"（用户实测就是完全没注意到）。
  //
  // 动作借 attack 行的【反手横扫】那一段（北神 QI_SEGS 末段 = [12,13]），
  // 直接从该段起帧开播（startFrame），否则要从第 0 帧走到第 12 帧 ≈ 430ms，
  // 慢得完全不像"反手"。刀就在这一挥里脱手飞出。
  _counterSwing(f, dirTo) {
    const a = BT.ATTACK[f.id], segs = BT.QI_SEGS && BT.QI_SEGS[f.id];
    // 转向攻击者：反手是朝来袭方向甩回去的
    f.facingLeft = dirTo < 0;
    f.sprite.setFlipX(!f.facingLeft);
    this._ghost(f);                       // 反手带一记残影，接上北神的"虚実"味道
    f.counterGlowUntil = this.time.now + a.dur;   // 紫描边续到收招，整套演出连成一条
    f.state = 'attack';
    f.stateUntil = this.time.now + a.dur;
    f.atkHit = true;                      // 只出暗器，不额外近战命中（同 _releaseCharge）
    const start = segs && segs.length ? segs[segs.length - 1][0] : 0;
    f.sprite.play({ key: `${f.id}_attack`, startFrame: start }, true);
    this._throwKnife(f, dirTo);
  },

  // ─────────── 结算 ───────────
  // 返回 { dealt, blocked, negated, pushback }
  _resolveDefense(attacker, target, dmg, dir) {
    const plain = { dealt: dmg, blocked: false, negated: false, pushback: 0 };

    // 北神流反击窗口：无敌帧内完全免疫 + 反手甩一记剑气（也顺带免掉空放惩罚）
    if (this.time.now < target.iframeUntil) {
      this._outlinePunch(target);                  // 挡下：描边猛顶一下
      // 暗器朝攻击者飞：dir 是"攻击者→目标"的方向，取反即指回去
      if (target.def.defense === 'counter') this._fireCounterQi(target, -dir);
      else { target.counterFired = true; this._popText(target.sprite.x, target.sprite.y - 84, '逸らし', '#c0a0ff'); }
      return { dealt: 0, blocked: false, negated: true, pushback: 0 };
    }

    // 不在防御态 / 被从背后打 → 全伤
    // （朝向判定沿用 ShadowArena：facingLeft 与来向不符即背击，防御无效）
    if (target.state !== 'guard') return plain;
    if (target.facingLeft !== (dir > 0)) return plain;

    const kind = target.def.defense;

    if (kind === 'brace') {
      // 剑神流完全防御：正面挡下全免伤，代价是扣蓝 + 被推退；台边则破防。
      // 蓝不足 → 退化为 reduce 减伤（这时描边会变暗，玩家看得见自己"挡不动了"）。
      const d = BT.DEFENSE.brace;
      const nextX = target.sprite.x + dir * d.pushback;
      const atEdge = nextX < d.edgeMargin || nextX > BT.GAME_W - d.edgeMargin;
      if (atEdge) {
        this._setState(target, 'stun', d.breakStun);
        this._popText(target.sprite.x, target.sprite.y - 84, '破防！', '#ff8a3b');
        return { dealt: Math.round(dmg * 0.5), blocked: false, negated: false, pushback: 0 };
      }
      if (target.mp >= d.guardCost) {
        target.mp -= d.guardCost;
        this._drawBars();
        this._popText(target.sprite.x, target.sprite.y - 84, '力受け·完', '#ffe6a8');
        this._outlinePunch(target);               // 完全防御成功：描边猛顶一下
        return { dealt: 0, blocked: true, negated: false, pushback: d.pushback * 4 };
      }
      this._popText(target.sprite.x, target.sprite.y - 84, '力受け', '#ffd28a');
      return { dealt: Math.round(dmg * d.reduce), blocked: true, negated: false, pushback: d.pushback * 4 };
    }

    if (kind === 'parry') {
      // 水神流受流：按下防御后 perfect 毫秒内为完美窗口
      const d = BT.DEFENSE.parry;
      const held = this.time.now - target.guardFrom;
      // ⚠️ 完美受流【只对玩家开放】。AI 是读 opp.state==='attack' 反应式交防御的，
      // guardFrom 永远刚刚开始，等于每次都完美 —— 玩家零伤害 + 被卸力硬直 520ms
      // + AI 拿 ×1.8 反击，这是人类反应速度做不到的白送优势。
      // （playtest 里 bot 因此长期被压制，胜率掉到两三成。）
      // 完美格挡是玩家的读招技术，AI 只吃普通格挡的减伤。
      if (held <= d.perfect && target === this.p1) {
        // 完美：对手被卸力硬直、【伤害原样弹回去】，自己获得反击窗口
        this._setState(attacker, 'stun', d.attackerStun);
        attacker.sprite.setVelocityX(0);
        attacker.atkHit = true;
        target.riposteUntil = this.time.now + d.riposteWindow;
        this._popText(target.sprite.x, target.sprite.y - 84, '受け流し！', '#8fe0ff');
        this._outlinePunch(target);               // 完美受流：描边猛顶一下
        this.cameras.main.shake(90, 0.005);
        this._reflectDamage(attacker, Math.round(dmg * d.reflect));
        return { dealt: 0, blocked: true, negated: false, pushback: 24 };
      }
      // 迟了：普通格挡
      this._popText(target.sprite.x, target.sprite.y - 84, '格挡', '#9fd0ff');
      return { dealt: Math.round(dmg * d.lateReduce), blocked: true, negated: false, pushback: 90 };
    }

    return plain;
  },

  // 完美受流的伤害反弹：把这一击原样打回攻击者身上。
  // ⚠️ 刻意【不设 invuln】：攻击者已经被 attackerStun 按住，再上无敌会把紧接着的
  // riposte（×1.8 反击）也一起免掉 —— 那正是水神流唯一的输出窗口。
  // 也刻意不改攻击者的 state：stun 比 hurt 长，覆盖过去等于帮对手提前起身。
  _reflectDamage(attacker, dmg) {
    if (dmg <= 0 || attacker.state === 'down') return;
    if (attacker === this.p2) dmg = Math.round(dmg * BT.AI.damageScale);   // 难度旋钮同 _damageOf
    if (typeof navigator !== 'undefined' && navigator.webdriver) {
      dmg = Math.round(dmg * (attacker === this.p2 ? 3 : 0.3));            // playtest bot 让步，同 _hit
    }
    attacker.hp = Math.max(0, attacker.hp - dmg);
    this._drawBars();
    this._popText(attacker.sprite.x, attacker.sprite.y - 104, `返 -${dmg}`, '#8fe0ff');
    this._bodyFlash(attacker, 0xff3b3b);          // 被弹回的伤害仍是受击：整体红闪
    if (attacker.hp <= 0) this._ko(attacker);
  },

  // 反击窗口内伤害加成——水神流「后发制人」的收益兑现处
  _damageOf(f) {
    let dmg = BT.ATTACK[f.id].dmg;
    if (f.riposteUntil && this.time.now < f.riposteUntil) {
      dmg *= BT.DEFENSE.parry.riposteBonus;
    }
    if (f === this.p2) dmg *= BT.AI.damageScale;   // 难度旋钮，只作用于电脑一侧
    return Math.round(dmg);
  },
});
