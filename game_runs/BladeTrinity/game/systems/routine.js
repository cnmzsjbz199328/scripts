/* BladeTrinity — AI 套路层 / 反应层。
 *
 * 为什么要这一层：格斗游戏 AI 的强度与观赏性都不来自单个动作，来自【动作之间的衔接】。
 * 旧的 _controlAI 每个决策 tick 独立掷一次骰（挡 / 砍 / 走），结构上不可能产生
 * "缩地绕到背后再斩" —— 缩地和斩是两次互不相关的抽签，中间还隔着一整个 780ms 出招自锁。
 *
 * 这里补的是业界常规的 routine / string 层：AI 选的是一段【脚本化的行为串】，
 * 进入后按步推进、受击即作废。零件全是现成的（缩地 / 升空 / 跳跃 / 平A / 描边一弹 /
 * 残影拖尾），套路只负责把它们按有意义的顺序串起来。
 *
 * 三层调度（见 loop.js _controlAI）：
 *   收招接续 → 套路推进 → 反应层（每帧，不等决策间隔）→ 决策层（掷骰，原有逻辑）
 *
 * ⚠️ 可读性是套路能成立的前提。每条套路都以【预告帧】开场（外轮廓炸一层描边 + 音效），
 * 玩家据此才有反制的余地。没有预告的瞬移背刺不是难度，是耍赖。
 */
Object.assign(BladeTrinityScene.prototype, {

  // ─────────── 收招接续 ───────────
  // 平A 的 dur 是 720~830ms，而命中窗口 to 最晚只到 545 —— 中间那段收招里
  // _canAct 为 false，AI 既不能挡也不能走。神级决策间隔才 172~370ms，典型循环
  // 就是「决策 170ms → 自锁 780ms」，约七成时间是块木头。套路的每两节之间也会
  // 被这段空白撑开，接不成串。
  //
  // 所以高档位允许把【命中窗口已过】的收招段提前判定结束。只对 AI 生效：
  // 玩家侧的收招是三派平衡的一部分（剑神"伤害最高、收招最久"），不动。
  _aiCancelRecovery(f, time) {
    const cancel = this._tierCfg().cancel;
    if (!cancel || f.state !== 'attack') return;
    if (time < (f.atkTo || 0) + cancel) return;
    // ⚠️ 取消收招是为了【能挡、能起套】，不是为了更快再砍一刀。所以把决策时钟顶到
    // 招式本来的结束时刻：省下的时间只能拿去防御/走位/起套，攻击频率维持原样。
    // 不加这一句，cancel 会把出手间隔从 ~1140ms 压到 ~760ms，高档 AI 变成连打机，
    // 反而把自己的防御挤没了（实测帝级挡下率 2/23，低于反应更慢的王级 4/19）。
    const natural = f.stateUntil || 0;
    if (this.aiNext < natural) this.aiNext = natural;
    f.sprite.setVelocityX(0);
    this._setState(f, 'idle');
  },

  // ─────────── 剑气威胁探测 ───────────
  // 返回最紧迫的一发来袭弹丸及其【剩余时间 eta（秒）】。
  // 旧版 _qiIncoming 只比距离（<260px），但躲不躲得掉取决于【时间】：剑气 520px/s
  // 与飞刀 720px/s 在同一距离上的紧迫程度差了近一半。
  _qiThreat(f) {
    if (!this.qiList) return null;
    const sp = f.sprite;
    let best = null;
    for (const q of this.qiList) {
      if (q.owner === f) continue;
      const gap = (sp.x - q.x) * q.dir;        // >0：正朝 f 飞来且尚未越过
      if (gap <= 0) continue;
      const eta = (gap - (q.r || 40) - BT.BODY_HALF_W) / (q.speed || BT.QI.speed);
      if (eta < 0) continue;
      if (!best || eta < best.eta) best = { q, eta };
    }
    return best;
  },

  // ─────────── 反应层（每帧跑，不等决策间隔）───────────
  // 与决策层的分工：决策层管"我想干什么"，反应层管"对面刚做了什么，我得马上应"。
  // 返回 true = 本帧已被反应层接管。
  _aiReact(f, time, opp, dist) {
    const T = this._tierCfg();
    // 反应层【排在 _canAct 闸门之前】，因为高档位允许为了交防御吃掉自己的收招。
    // 不给这条，AI 看得见起手也挡不了：平A 一次锁 720~830ms，玩家的起手窗口只有
    // 130ms，撞上"AI 正好空闲"的概率低到实测帝级一整场 0 次防御（明明比王级反应更快）。
    // 王级 cancel=0 → 只有真正空闲时才挡；帝/神能弃招回防，这就是档位差。
    const cancellable = T.cancel && f.state === 'attack' && time > (f.atkTo || 0);
    if (!this._canAct(f) && !cancellable) return false;

    // ① 读招防御 —— 不是掷骰，是看【招式进行到哪一步】。
    // 旧版在决策 tick 上 Math.random() < guardOnAttack 抽一次：挡不挡跟玩家的
    // 出招时机毫无关系，玩家读不出因果，自然感觉不到"对手在防我"。
    // 现在：看到起手 → 等 reactDelay（档位越高越短）→ 在命中窗口开启前架防。
    if (T.reactDelay != null && opp.state === 'attack' && time > (f.reactGuardAt || 0)) {
      const oa = BT.ATTACK[opp.id];
      const start = (opp.atkFrom || 0) - oa.from;
      // 触发时刻 = max(看见起手 + 反应延迟, 命中窗口前 lead)。取 max 的后半段是为了
      // 别让高档 AI 一见起手就抬手（那看着像预知），也给北神的假动作留出骗招空间。
      const due = Math.max(start + T.reactDelay, (opp.atkFrom || 0) - BT.AI_GUARD_LEAD);
      const inWindow = time >= due && time < (opp.atkFrom || 0) + 40;
      if (inWindow && dist < f.def.reach * 1.6) {
        f.reactGuardAt = time + BT.AI_RT.guardHold + 120;   // 同一记招只反应一次，不连按
        if (cancellable) { f.sprite.setVelocityX(0); this._setState(f, 'idle'); }   // 弃招回防
        this._aiGuard(f, time);
        return true;
      }
    }

    // ② 剑气来袭 → 起跳躲（帝级+）。躲的同时朝对手漂移拉近，落地砸一刀 —— 见 _rt_jumpQi。
    const R = T.routines || [];
    if (R.includes('jumpQi') && f.sprite.body.blocked.down && time > (f.rtReady || 0)) {
      const th = this._qiThreat(f);
      if (th && th.eta > BT.AI_RT.qiEtaMin && th.eta < BT.AI_RT.qiEtaMax) {
        f.rtReady = time + (T.rtGap || BT.AI_RT.gap);
        this._aiStart(f, 'jumpQi', time);
        return true;
      }
    }
    return false;
  },

  // AI 起防：在 _startDefense 之上补一个【保持时长】。
  // ⚠️ 直接调 _startDefense 的话，brace/parry 的 guard 是没有到期时间的长按态，
  // 下一帧 _controlAI 走到 `time <= aiNext` 分支就 _setState(f,'idle') 把它掐掉——
  // 挡是挡到了，但描边只闪一帧，玩家读不出"他在防我"，会心也基本撞不上。
  // counter（北神）本身就是定时窗口，不动它。
  _aiGuard(f, time) {
    this._startDefense(f, time);
    if (f.def.defense !== 'counter' && f.state === 'guard') {
      f.stateUntil = time + BT.AI_RT.guardHold;
    }
  },

  // ─────────── 套路状态机 ───────────
  _aiStart(f, id, time) {
    f.rt = { id, step: 0, wait: 0 };
    return true;
  },
  _aiEnd(f) { f.rt = null; },
  _aiStep(rt, time, ms) { rt.step++; rt.wait = time + (ms || 0); },

  // 推进当前套路。返回 true = 本帧由套路接管（_controlAI 直接 return）。
  _aiTickRoutine(f, time) {
    const rt = f.rt;
    if (!rt) return false;
    // 被打断（受击 / 硬直 / 倒地 / 被轰飞）→ 套路作废。这是玩家反制套路的直接回报。
    if (f.state === 'hurt' || f.state === 'stun' || f.state === 'down' || f.charging) {
      this._aiEnd(f);
      return false;
    }
    if (time < rt.wait) return true;          // 步与步之间的节拍
    const fn = this['_rt_' + rt.id];
    if (!fn) { this._aiEnd(f); return false; }
    return fn.call(this, f, time, rt);
  },

  // 要不要起一套？返回 true = 已起套。
  //
  // ⚠️ 有【两个独立时钟】，缺一不可：
  //   rtNext  —— 掷骰节拍。这个判定排在决策层的 aiNext 闸门之前（绕背/踏落是中距离
  //              进身手段，排在 `dist > engage` 的 return 之后就只有贴脸能起套，
  //              实测一整场只打得出一两次），所以不能蹭 aiNext，得自带节拍，
  //              否则每帧掷一次骰 = 条件一满足就立刻触发。
  //   rtReady —— 两套之间的冷却。套路是招牌不是主食，一套接一套的观感是抽搐。
  _aiPickRoutine(f, time, dist, opp) {
    const T = this._tierCfg(), R = T.routines || [];
    if (!R.length) return false;
    if (time < (f.rtNext || 0)) return false;
    f.rtNext = time + Phaser.Math.Between(BT.AI_RT.rollMin, BT.AI_RT.rollMax);
    if (time < (f.rtReady || 0)) return false;
    const sp = f.sprite, A = BT.AI_RT, gap = T.rtGap || A.gap;
    const bothGrounded = sp.body.blocked.down && opp.sprite.body.blocked.down;
    // 对手露破绽（出招中 / 硬直）时更想起套 —— 套路是拿来惩罚的，不是随机表演。
    const exposed = opp.state === 'attack' || opp.state === 'stun' || opp.state === 'hurt';

    // 缩地·绕背斩：中距、缩地冷却好了、双方落地
    if (R.includes('crossBlink') && time >= (f.mistReady || 0) && bothGrounded &&
        dist > A.crossMin && dist < A.crossMax &&
        Math.random() < (exposed ? A.crossEager : A.crossOdds)) {
      f.rtReady = time + gap;
      return this._aiStart(f, 'crossBlink', time);
    }
    // 升空·踏落斩：从上方绕过正面防御 —— 对手正架防时格外想用
    if (R.includes('riseDive') && time >= (f.riseReady || 0) && sp.body.blocked.down &&
        dist > A.diveMin && dist < A.diveMax &&
        Math.random() < (opp.state === 'guard' ? A.diveEager : A.diveOdds)) {
      f.rtReady = time + gap;
      return this._aiStart(f, 'riseDive', time);
    }
    return false;
  },

  // 预告帧：外轮廓炸一层描边（复用蓄力起手的 _outlinePulse）+ 一声闷响。
  // 这是玩家唯一能提前知道"他要动了"的信息源，别省。
  _rtTell(f) {
    f.sprite.setVelocityX(0);
    this._outlinePulse(f);
    window.GameAudio && GameAudio.play && GameAudio.play('morph');
  },

  // ─────────── 套路①　缩地·绕背斩 ───────────
  // 起势预告 → 缩地到对手身后 → 转身 → 背刺。
  // 画面：残影拖尾从正面消失、在背后重组，紧接刀光。
  // 反制：听到起势/看到描边立刻反向或交防御；也可以自己缩地对冲换位。
  _rt_crossBlink(f, time, rt) {
    const opp = this._opp(f), sp = f.sprite;
    if (rt.step === 0) {
      this._rtTell(f);
      this._aiStep(rt, time, BT.AI_RT.crossTell);
      return true;
    }
    if (rt.step === 1) {
      const side = Math.sign(opp.sprite.x - sp.x) || 1;
      const tx = Phaser.Math.Clamp(opp.sprite.x + side * BT.AI_RT.backGap, 56, BT.GAME_W - 56);
      // 对手背靠台边时落点会被 clamp 回他【身前】，绕背不成立 —— 放弃这一套，
      // 交回决策层正面打。硬绕的话就是"瞬移到面前捅一刀"，最难看的那种 AI。
      if ((tx - opp.sprite.x) * side < BT.AI_RT.backGap * 0.55) { this._aiEnd(f); return false; }
      this._blinkGhosts(f, sp.x, sp.y, tx, sp.y);
      sp.setPosition(tx, sp.y);
      sp.setVelocityX(0);
      f.invuln = Math.max(f.invuln, time + BT.BLINK.iframe);
      f.mistReady = time + BT.BLINK.groundCd;
      window.GameAudio && GameAudio.play && GameAudio.play('morph');
      // ⚠️ turnGap 必须 ≥1 帧：_faceEachOther 在 !_canAct 时跳过，同帧接 _attack
      // 会拿【旧朝向】往反方向劈（loop.js 头部注释记着的那个历史 bug）。
      this._aiStep(rt, time, BT.AI_RT.turnGap);
      return true;
    }
    this._attack(f);
    this._aiEnd(f);
    return true;
  },

  // ─────────── 套路②　升空·踏落斩 ───────────
  // 起势预告 → 纵向瞬移升空（全程无敌）→ 下落中横向贴近 → 进命中带即下劈。
  // 画面：半空一团蓝影，居高临下一刀砸落。
  // 反制：防空 —— 在他落下来之前先出招；或者干脆走出落点。
  _rt_riseDive(f, time, rt) {
    const sp = f.sprite;
    if (rt.step === 0) {
      this._rtTell(f);
      this._aiStep(rt, time, BT.AI_RT.riseTell);
      return true;
    }
    if (rt.step === 1) {
      this._doAIBlink(f, 'rise', 0, time);
      this._playAir(f);
      this._aiStep(rt, time, 0);
      return true;
    }
    return this._rtAirPress(f, time);
  },

  // ─────────── 套路③　跳跃·剑气追 ───────────
  // 由反应层触发（探到剑气 eta 落在可躲窗口内）：起跳让剑气从脚下穿过，
  // 【同时朝对手漂移】—— 躲避与进身是同一个动作，这是你要的"跳跃拉近距离"。
  // 反制：剑气改打高位（跳跃顶点 120px，超过 hitH 不多）；或后撤让他落空。
  _rt_jumpQi(f, time, rt) {
    if (rt.step === 0) {
      f.sprite.setVelocityY(-600);
      this._playAir(f);
      this._aiStep(rt, time, 0);
      return true;
    }
    return this._rtAirPress(f, time);
  },

  // 空中压落段（踏落斩 / 剑气追共用）：腾空横向贴近 + 择时下劈 + 落地收尾。
  //
  // ⚠️ 这一段【必须由套路独占】。旧版的裸起跳下一帧就掉进决策层的 dist>engage 分支，
  // 被 _setState(f,'walk') 把 jump 姿态冲掉 —— AI 在空中播走路动画，跳跃等于隐形。
  _rtAirPress(f, time) {
    const opp = this._opp(f), sp = f.sprite;
    const dx = opp.sprite.x - sp.x, dir = Math.sign(dx) || 1;

    if (f.state === 'attack') {                     // 已经打出去了，等落地收尾
      if (sp.body.blocked.down) this._aiEnd(f);
      return true;
    }
    if (sp.body.blocked.down) { this._aiEnd(f); return false; }   // 落地还没出手 → 交回决策层

    // 漂移贴近：这就是"躲的同时把距离拉近"
    sp.setVelocityX(Math.abs(dx) > BT.BODY_HALF_W * 1.4
      ? dir * f.def.speed * BT.AI_RT.airDrift : 0);

    // ⚠️ 择时：_resolveMelee 里 |Δy| ≥ 96 直接 return，而升空 175 / 跳跃顶点 120
    // 都超了 —— 空中招只有【下落段】打得中。按起手时长预测 from 毫秒后的自身高度，
    // 落进命中带才出招；在顶点出招是确定性挥空。
    const a = BT.ATTACK[f.id], t = a.from / 1000, vy = sp.body.velocity.y;
    const yAt = sp.y + vy * t + 0.5 * BT.GRAVITY * t * t;
    if (vy > 0 && Math.abs(yAt - opp.sprite.y) < BT.AI_RT.airHitY && Math.abs(dx) < f.def.reach) {
      this._attack(f);
    }
    return true;
  },
});
