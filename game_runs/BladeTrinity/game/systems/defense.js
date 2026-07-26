/* BladeTrinity — 三流派差异化防御。
 *
 * ShadowArena 的防御是「伤害打两折」一个数字通吃。那套照搬过来会把三流派压平成换皮，
 * 因为三流派的差异【主要就在防御】上。这里三种挡法各自成立：
 *
 *   brace（剑神流·力受け）正面【完全免伤】，代价是吃蓝 + 被推退，逼到台边破防大硬直
 *   parry（水神流·受け流し）完美窗口内免伤 + 卸掉对手 + 【把伤害弹回去】；剑气整道反射
 *   counter（北神流·返し）正面免伤 + 【反手甩出旋转飞刀】（飞刀走 knifeCd 冷却）
 *
 * ⚠️ 【输入侧三派完全一致：按住 S 维持防御态，松手解除】。差异只在本文件的
 * _resolveDefense 结算里。北神曾经是"点按触发 260ms 无敌窗口 + 冷却 + 空放硬直"的
 * 另一套机制，实测挡下率只有 15~18%（玩家 ~55% 的帧读不进按键），补救无效，
 * 已按用户决定统一（先要流畅运行，差异化以后再优化）。别再把某一派改回点按。
 *
 * 克制三角由这三套参数与 BT.ATTACK 的窗口互相咬合产生，不靠额外的相克表。
 * 三派共用一条 guard 动画行，视觉差异由 _guardAura 的外轮廓描边给（见 BT.GUARD_AURA）。
 */
Object.assign(BladeTrinityScene.prototype, {

  // ─────────── 起防（三派同一条路径）───────────
  // 按住即进入防御态，松手即解除。三派的差异全部搬到 _resolveDefense 的结算里，
  // 输入侧不再有任何分叉 —— 北神曾经是点按触发的定时窗口，见 BT.DEFENSE.counter 的注释。
  _startDefense(f, time) {
    if (!this._canAct(f)) return;
    // ⚠️ 落地是防御态的【固有前提】，闸门必须在这里，不能只写在调用方。
    // 曾经只有 _controlPlayer 那一支带 onGround，AI 侧四个调用点（反应层 / 决策掷骰 /
    // crossBlink 收尾 / cornerPress 收尾）一个都没有 —— AI 在空中挨一下作废套路后，
    // 下一帧就能在半空架防，_resolveDefense 也不看落地，于是空中防御【真的免伤】，
    // 加上这里的 setVelocityX(0) 把它横向钉住，观感就是"保持防御姿势直直飘下来"
    // （用户实测反馈："跳起来躲过了攻击，落下来还在防"）。
    //
    // 【人机特权 airGuard】神级 AI 可以在半空架防（见 loop.js _bypass）。玩家仍受此限。
    // 这是解开"机动↔防御抢帧"的关键：不开这条，AI 每跳一次就有一段完全无法防御的真空，
    // 机动调得越频繁防御漏得越多（诊断实测 airborne 挡掉的威胁帧 7→19）。
    const onGround = f.sprite.body.blocked.down;
    if (!onGround && !this._bypass(f).airGuard) return;
    if (f.state !== 'guard') {
      f.guardFrom = time;
      f.counterFired = false;      // 新一次起防 = 新一记反手飞刀的机会（北神用）
      f.guardRead = false;         // 这次防御是不是读招交的？由 _aiGuard 随后置位（AI 完美受流的准入）
      this._setState(f, 'guard');
      if (this._usage && f === this.p1) this._usage.defend++;
    }
    // ⚠️ 只有【落地】才把横向速度清零。空中架防还清零的话，人会保持防御姿势直直飘下来
    // （用户早期实测过的那个观感），而且等于把 airGuard 换来的机动又抵消掉 ——
    // 空中防御要的就是"边位移边防"。
    if (onGround) f.sprite.setVelocityX(0);
  },

  _endDefense(f) {
    if (f.state === 'guard') this._setState(f, 'idle');
  },

  // 每帧维护：反击窗口过期 + 防御描边跟随
  _tickDefense(f, time) {
    if (f.riposteUntil && time > f.riposteUntil) f.riposteUntil = 0;
    // 北神挡下后会立刻切进 attack 演反手斩 —— 只按 state==='guard' 挂描边的话，
    // 三派里唯独它的描边一闪就没，看着像"没有特效"（用户实测反馈）。
    // 所以额外认一个到期时间，让描边从起防一路亮到反手斩收招。
    if (f.state === 'down') this._clearOutlineHold(f);     // 倒地要看清人，描边一律收掉
    else if (f.state === 'guard' || (f.counterGlowUntil && time < f.counterGlowUntil)) this._guardAura(f, time);
    // 蓄力中的描边由 _tickCharge 维护、幻剑本体的破绽描边由 _tickPhantom 维护
    //（都是同一套 _outlineHold）。这里不能顺手清掉，否则每帧一建一清会闪成频闪
    // —— 幻剑那层还会因此【整个消失】，破绽没了这招就退化成抛硬币。
    else if (!f.charging && !f.phantom) this._clearOutlineHold(f);
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
      ? (f.mp >= BT.DEFENSE.brace.guardCost || this._bypass(f).freeGuard ? A.brace : A.braceDry)
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
  _fireCounterQi(f, dirTo, crit) {
    const d = BT.DEFENSE.counter;
    if (f.counterFired) return;      // 一个窗口只反一记，连续挨打不刷屏
    f.counterFired = true;
    if (crit) this._critBanner(f, '会心 · 回旋');
    else this._popText(f.sprite.x, f.sprite.y - 84, '返し！', '#c0a0ff');
    this.time.delayedCall(d.qiDelay, () => {
      if (f.state === 'down') return;
      this._counterSwing(f, dirTo, crit);
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
  _counterSwing(f, dirTo, crit) {
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
    this._throwKnife(f, dirTo, crit);
  },

  // ─────────── 结算 ───────────
  // 返回 { dealt, blocked, negated, pushback }
  _resolveDefense(attacker, target, dmg, dir) {
    const plain = { dealt: dmg, blocked: false, negated: false, pushback: 0 };

    // 不在防御态 / 被从背后打 → 全伤
    // （朝向判定沿用 ShadowArena：facingLeft 与来向不符即背击，防御无效）
    if (target.state !== 'guard') return plain;
    if (target.facingLeft !== (dir > 0)) return plain;

    // 「一次读招只挡一下」：AI 挡下这一击后要重新读招（见 BT.AI_RT.reguardGap）。
    // 由 _aiHoldGuard 读这个时刻去松防 + 上锁。玩家侧不受限（玩家按住 S 就是按住）。
    if (target === this.p2) target.blockedAt = this.time.now;

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
      // 【人机特权 freeGuard】神级 AI 挡近战不吃蓝：完全免伤永远成立。
      // 不开这条，剑神流 AI 把蓝花在奥义上之后就退化成 0.45 减伤，
      // 玩家看到的是"明明架住了还掉血"（mpReserve 只能缓解，挡多了照样空）。
      const free = !!this._bypass(target).freeGuard;
      if (free || target.mp >= d.guardCost) {
        if (!free) target.mp -= d.guardCost;
        this._drawBars();
        this._popText(target.sprite.x, target.sprite.y - 84, '力受け·完', '#ffe6a8');
        this._outlinePunch(target);               // 完全防御成功：描边猛顶一下
        // 会心 → 立刻转身三连劈。放在推退【之前】发起：连段自带前冲步，
        // 由每一刀各自取向，不受这次击退的方向影响。
        if (this._rollCrit(target)) this._critCombo(target);
        return { dealt: 0, blocked: true, negated: false, pushback: d.pushback * 4 };
      }
      this._popText(target.sprite.x, target.sprite.y - 84, '力受け', '#ffd28a');
      return { dealt: Math.round(dmg * d.reduce), blocked: true, negated: false, pushback: d.pushback * 4 };
    }

    if (kind === 'parry') {
      // 水神流受流：按下防御后 perfect 毫秒内为完美窗口
      const d = BT.DEFENSE.parry;
      const held = this.time.now - target.guardFrom;
      // 完美受流的准入：玩家看【按下防御到挨打的间隔】；AI 看【这次防御是不是读招交出来的】。
      //
      // ⚠️ 这里曾经硬编码 `target === this.p1`，即完美受流只对玩家开放。当时的理由是
      // "AI 读 opp.state==='attack' 反应式交防御，guardFrom 永远刚刚开始 = 每次都完美"，
      // 那是白送。但该理由已随反应层重写而失效：现在 AI 走【观察时钟】，必须盯够
      // reactDelay 才交得出防御，而且会真的漏（圣级对水神流恒漏），交出来的是一次真读招。
      //
      // 后果不修就是：AI 用水神流时【看得见地架住了，却每次都掉 60% 血】——用户实测的
      // "确实即时防御了，但依然会受到伤害"，三派里这一派最明显（另两派挡下是真零伤）。
      // 仍留两道闸：① guardRead —— 只有反应层读招交的防御算数，钓招/兜底掷骰交的不算；
      //            ② cap.perfect —— 只有神级拿得到（×1.8 反击 + 520ms 卸力太重，低档不给）。
      const perfect = target === this.p1
        ? held <= d.perfect
        : (target.guardRead && this._tierCfg().cap.perfect);
      if (perfect) {
        // 完美：对手被卸力硬直、【伤害原样弹回去】，自己获得反击窗口
        this._setState(attacker, 'stun', d.attackerStun);
        attacker.sprite.setVelocityX(0);
        attacker.atkHit = true;
        target.riposteUntil = this.time.now + d.riposteWindow;
        this._popText(target.sprite.x, target.sprite.y - 84, '受け流し！', '#8fe0ff');
        this._outlinePunch(target);               // 完美受流：描边猛顶一下
        this.cameras.main.shake(90, 0.005);
        // 会心 → 三段返伤（近战没有剑气可弹，用它对齐"连弹"的三次伤害）
        if (this._rollCrit(target)) this._critMeleeReflect(target, attacker, Math.round(dmg * d.reflect));
        else this._reflectDamage(attacker, Math.round(dmg * d.reflect));
        return { dealt: 0, blocked: true, negated: false, pushback: 24 };
      }
      // 迟了：普通格挡
      this._popText(target.sprite.x, target.sprite.y - 84, '格挡', '#9fd0ff');
      return { dealt: Math.round(dmg * d.lateReduce), blocked: true, negated: false, pushback: 90 };
    }

    if (kind === 'counter') {
      // 北神流返し：正面挡下【全免伤】，并反手甩出旋转飞刀。
      // 不要时机、不耗蓝 —— 和 brace/parry 一样"防御态在就成立"（三派机制统一）。
      // 唯一的节流是飞刀冷却：冷却中仍然免伤，只是这一下不甩刀，避免连挨打时刷屏。
      const d = BT.DEFENSE.counter;
      this._outlinePunch(target);                  // 挡下：描边猛顶一下
      if (this.time.now >= target.counterReady) {
        target.counterReady = this.time.now + d.knifeCd;
        target.counterFired = false;
        // 暗器朝攻击者飞：dir 是"攻击者→目标"的方向，取反即指回去。
        // 会心 → 这一刀挂回旋镖（穿过→回旋→再穿→再回旋，共三次命中）
        this._fireCounterQi(target, -dir, this._rollCrit(target));
      } else {
        this._popText(target.sprite.x, target.sprite.y - 84, '返し', '#c0a0ff');
      }
      return { dealt: 0, blocked: true, negated: false, pushback: d.pushback };
    }

    return plain;
  },

  // 完美受流的伤害反弹：把这一击原样打回攻击者身上。
  // ⚠️ 刻意【不设 invuln】：攻击者已经被 attackerStun 按住，再上无敌会把紧接着的
  // riposte（×1.8 反击）也一起免掉 —— 那正是水神流唯一的输出窗口。
  // 也刻意不改攻击者的 state：stun 比 hurt 长，覆盖过去等于帮对手提前起身。
  _reflectDamage(attacker, dmg) {
    if (dmg <= 0 || attacker.state === 'down') return;
    if (attacker === this.p2) dmg = Math.round(dmg * this._aiDmgScale());   // 难度旋钮×档位同 _damageOf
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
    // 幻剑：赌对了本体这一刀要有回报，否则玩家没有理由为它付 60 蓝
    if (f.phantom) dmg *= (this._arteCfg(f) || {}).dmgMul || 1;
    if (f === this.p2) dmg *= this._aiDmgScale();   // 难度旋钮×档位，只作用于电脑一侧
    return Math.round(dmg);
  },
});
