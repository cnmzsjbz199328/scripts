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
 * 四层调度（见 loop.js _controlAI）：
 *   收招接续 → 反应层（每帧，不等决策间隔）→ 套路推进 → 决策层（掷骰，原有逻辑）
 *
 * ⚠️ 反应层【必须】排在套路推进之前。反过来排时套路只在 hurt/stun/down 才作废，
 * 等于"只有已经挨打了才让位"，而档位给的正是套路数量 —— 套路越多越不会防御。
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
  // 收招是否已进入可取消窗口。
  //
  // ⚠️ `f.atkCancelable` 这道闸门是【必须】的，别图省事只看 state==='attack'：
  // 蓄力剑气的挥砍（charge.js _releaseCharge）也把 state 置成 'attack'，但它
  // 【不设 atkFrom/atkTo】—— f.atkTo 还是上一记平A 留下的陈旧值，于是下一帧就被判成
  // "收招早就结束了"掐掉，_tickSwingQi 见 state 变了立刻 _clearSwing，
  // 结果是蓄力扣了蓝却一道剑气都放不出来（实测神级 7 次起蓄 0 道、帝级 7 次 2 道，
  // 玩家看到的就是"只把我轰飞、不放剑气"）。
  _aiCancelWindow(f, time) {
    const cancel = this._tierCfg().cancel;
    if (!cancel || f.state !== 'attack' || !f.atkCancelable) return false;
    return time >= (f.atkTo || 0) + cancel;
  },

  // 为了【交防御】而弃招，闸门比 _aiCancelWindow 松。
  //
  // ⚠️ 必须和 _aiCancelWindow 分开两个函数，别图省事把 bypass 塞进后者：
  // _aiCancelRecovery 也读 _aiCancelWindow，那里若恒为 true，AI 的平A 会在第一帧
  // 就被自己掐掉，等于再也打不出任何一刀。
  //
  // 【人机特权 guardCancel】神级可在平A 的【任意时刻】掐掉自己的刀去交防御，
  // 不必等收招段。诊断实测 attackLock 是"探到威胁却出不了手"的第一大原因
  // （AI 有 38~51% 的帧卡在自己的 attack 里），这条是把那一整块解开的唯一办法。
  // 代价是这一刀白挥（伤害没打出去）—— 观感正是"他为了防我把刀收了"，读得出来。
  // 仍要求 atkCancelable：蓄力剑气那一挥掐了就没剑气了（见 _aiCancelWindow 注释）。
  _aiAbortForGuard(f, time) {
    if (this._aiCancelWindow(f, time)) return true;
    return f.state === 'attack' && f.atkCancelable && !!this._bypass(f).guardCancel;
  },

  _aiCancelRecovery(f, time) {
    if (!this._aiCancelWindow(f, time)) return;
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

  // ─────────── 防御触发的统一闸门：「这一刀还打得到我吗」───────────
  // 反应层与决策层的兜底掷骰【必须共用这一条】，否则两层语义打架：
  // 旧的掷骰只看 `opp.state === 'attack'`，而 attack 覆盖整个 dur（720~830ms），
  // 命中窗口 to 最晚只到 545 —— 剑神流有整整 400ms 的【纯收招段】仍被当成"对手正在
  // 出招"去架防。那 400ms 本该是抢攻窗口，AI 却拿去防空气，还被旧的定时 guardHold 一压
  // 420~540ms 把惩罚窗口整个吃掉（用户实测："躲过了还防，防了个寂寞"）。
  //
  // 距离用【攻击者的】reach + 前冲步，不是自己的：原来写 `dist < f.def.reach * 1.6`，
  // AI 用水神流（reach 短）面对剑神玩家（lunge 150）时会低估威胁范围，该防的不防。
  _threatLive(f, opp, dist) {
    if (opp.state !== 'attack') return false;
    if (this.time.now > (opp.atkTo || 0)) return false;      // 命中窗口已过 = 收招段
    const oa = BT.ATTACK[opp.id];
    return dist < opp.def.reach + oa.lunge * 0.6 + BT.BODY_HALF_W;
  },

  // ─────────── 统一威胁探测：近战招 / 飞行弹丸 归一成【剩余时间 eta（秒）】 ───────────
  //
  // ⚠️ 这是本层的地基，别再退回"嗅探 opp.state"的写法。旧的 _threatLive 三行条件
  // 【各自独立地】把剑气排除干净，AI 于是对弹丸零响应（不是概率低，是三重恒假）：
  //   ① `opp.state !== 'attack'` —— 玩家蓄力期间 state 是 'charge'，那 240~420ms
  //      预警期（描边炸开+招式名+震屏，信息最全的一段）AI 完全瞎。
  //   ② `now > opp.atkTo` —— 蓄力挥砍【刻意不设 atkFrom/atkTo】（见 charge.js
  //      _releaseCharge：设了会被 _aiCancelWindow 掐成没剑气），于是这里读到的是上一记
  //      平A 的陈旧值，早就过期。
  //   ③ 距离上限 ≈350px —— 剑气本来就是远程武器，zoneOut 还专门把距离拉开再放。
  // 后果是 charge.js _qiVsTarget 里三派挡剑气的分支（水神整道反弹 / 剑神扣蓝零伤 /
  // 北神挡下甩飞刀）在 AI 侧一次都执行不到 —— 半套防御设计等于不存在。
  //
  // 归一成 eta 之后，反应层不再关心威胁【是什么】，只关心【还有多久到】，
  // 三派起手长度差一倍、弹丸速度差一半这些都自动被吸收掉。
  // 返回 { id, eta, kind }：id 用于识别"还是不是同一记威胁"（观察时钟的键）。
  _incomingThreat(f, opp, dist) {
    let best = null;
    // 近战招：命中窗口尚未结束、且预测打得到我
    if (opp.state === 'attack' && this.time.now <= (opp.atkTo || 0) && opp.atkCancelable) {
      const oa = BT.ATTACK[opp.id];
      if (dist < opp.def.reach + oa.lunge * 0.6 + BT.BODY_HALF_W) {
        best = { id: 'm' + opp.atkFrom, eta: Math.max(0, (opp.atkFrom || 0) - this.time.now) / 1000, kind: 'melee' };
      }
    }
    // 飞行弹丸（剑气 / 飞刀）：_qiThreat 已经把速度差算进 eta
    const qt = this._qiThreat(f);
    if (qt && (!best || qt.eta < best.eta)) {
      const q = qt.q;
      // 弹丸没有天然主键，懒分配一个（三处 qiList.push 都不用改）
      if (!q.uid) q.uid = (this._qiUid = (this._qiUid || 0) + 1);
      best = { id: 'q' + q.uid, eta: qt.eta, kind: 'qi' };
    }
    return best;
  },

  // ─────────── 反应层（每帧跑，不等决策间隔）───────────
  // 与决策层的分工：决策层管"我想干什么"，反应层管"对面刚做了什么，我得马上应"。
  // 返回 true = 本帧已被反应层接管。
  //
  // ⚠️ 反应模型是【观察时钟】，不是绝对时刻算术。旧版拿 T.reactDelay（绝对 ms）去和
  // 招式的 from 偏移比大小，因为三派 from 差一倍（水神 190 / 剑神 280 / 北神 400），
  // 必须靠 _reactDelayVs 钳到 from-60 才不至于窗口恒空 —— 而那道钳位把阶梯压平了：
  // 实测 12 个「档位×流派」格子里只有 3 个真正读到了 reactDelay（对水神四档完全相同、
  // 对北神帝=神、对剑神圣=王）。这就是"reactDelay 从 380 调到 130 却看不出差别"的算式。
  //
  // 现在：威胁一出现就记下 firstSeen，等【看了 reactDelay 这么久】才允许出手。
  // 反应快慢因此直接兑现成"来得及/来不及"：圣级 380ms 接不住水神的 190ms 起手（该漏就漏），
  // 神级 130ms 接得住 —— 不需要任何钳位，对近战/剑气/三流派同一套算式成立。
  _aiReact(f, time, opp, dist) {
    const T = this._tierCfg(), A = BT.AI_RT;
    if (T.reactDelay == null) { f.threatSeen = null; return false; }   // 上级：不会反应式防御

    if (time < (f.reguardAt || 0)) return false;   // 刚挡下一击，重新读招前不能再架防

    const th = this._incomingThreat(f, opp, dist);
    if (!th) { f.threatSeen = null; return false; }

    // 观察时钟：换了一记威胁就重新计时
    if (!f.threatSeen || f.threatSeen.id !== th.id) f.threatSeen = { id: th.id, at: time, acted: false };
    const seen = f.threatSeen;
    if (seen.acted) return false;                    // 同一记威胁只应一次，不连按
    // 太早不抬手：剑气 eta 可以有 1.5 秒，一探到就架防会变成"全程举着盾"，
    // 也让北神的假动作没有骗招余地。guardLead 之内才进入可出手状态。
    // 剑气用更长的 guardLeadQi —— 它是横贯全场的慢弹丸，等到近战那个 0.35 才接管，
    // AI 早就跑去起套路 / 已经在半空了（见 data.js guardLeadQi 注释）。
    const lead = th.kind === 'qi' ? (A.guardLeadQi || A.guardLead) : A.guardLead;
    if (th.eta > lead) return false;
    // 反应没跟上 → 这一记就是漏的。档位差【全部】兑现在这一行。
    if (time - seen.at < T.reactDelay) return false;

    // 腾空接不了防（_startDefense 有落地前提）——【人机特权 airGuard】的档位除外
    const B = this._bypass(f);
    if (!f.sprite.body.blocked.down && !B.airGuard) return false;

    // 弃招回防：高档位允许吃掉自己的收招去交防御。平A 一次锁 720~830ms，
    // 没有这条，"反应更快"根本兑现不了（实测帝级一整场 0 次防御，明明比王级快）。
    const cancellable = this._aiAbortForGuard(f, time);
    if (!this._canAct(f) && !cancellable) return false;

    // 套路让位：⚠️ 旧版把反应层排在 _aiTickRoutine 【之后】，而套路只在 hurt/stun/down
    // 时作废 —— 也就是【只有已经挨打了才让位】。档位给的正是套路数量（王 0 条 / 帝 3 条 /
    // 神 5 条），于是套路越多 → 落在"反应层跑不到"的时间越长 → 越不会防御。
    // 神级 = 最会打套路 = 最不会防，这是"神级没感觉更强"的结构性成因。
    // 现在反应层排在套路之前，见招即弃套路；无敌帧中（缩地/升空途中）不打断。
    if (f.rt) {
      if (f.invuln > time) return false;
      // 【人机特权 parallelRoutine】不作废，只【挂起】：防完接着从原来那一步走下去。
      // 普通档位交一次防御 = 一整套套路报废，机动看起来就是"起手总被打断"；
      // 神级则是"防你一下，然后把刚才那套接着打完"。
      if (B.parallelRoutine) f.rt.wait = Math.max(f.rt.wait || 0, time + BT.AI_RT.rtResume);
      else this._aiEnd(f);
    }
    if (cancellable) { f.sprite.setVelocityX(0); this._setState(f, 'idle'); }

    // 剑气：能挡就挡（三派挡剑气的收益都很高），挡不起才跳。
    if (th.kind === 'qi' && this._aiPrefersJump(f, th, T)) {
      seen.acted = true;
      f.rtReady = time + (T.rtGap || A.gap);
      this._aiStart(f, 'jumpQi', time);
      return true;
    }
    this._aiGuard(f, time, null, true);      // read=true：这是一次真读招
    // ⚠️ 起防成功【才】记 acted。旧版先写 reactGuardAt 冷却再调 _aiGuard，而
    // _startDefense 有落地前提、_canAct 白名单又含 'jump' —— AI 腾空时防御静默失败，
    // 660ms 封锁却照记，这一记招和下一记招都不会再防。
    if (f.state !== 'guard') return false;
    seen.acted = true;
    return true;
  },

  // 剑气来袭时【跳】还是【挡】。挡得起就挡：三派挡剑气的收益都很高
  // （水神整道反弹 / 剑神零伤 / 北神甩飞刀，见 charge.js _qiVsTarget）。
  // 旧版这里只有"跳"一条，而且只有帝/神会跳，上/圣/王 面对剑气连躲都不会。
  _aiPrefersJump(f, th, T) {
    if (!(T.routines || []).includes('jumpQi')) return false;
    if (th.eta < BT.AI_RT.qiEtaMin || th.eta > BT.AI_RT.qiEtaMax) return false;   // 跳不掉的窗口
    // 剑神蓝不足 → 挡下来只有 0.45 减伤，不如躲
    if (f.def.defense === 'brace' && f.mp < BT.DEFENSE.brace.qiGuardCost) return true;
    return Math.random() < BT.AI_RT.qiJumpOdds;    // 挡得起时也偶尔跳，保住这条招牌套路
  },

  // AI 起防：在 _startDefense 之上补一个【保持时长】。
  // ⚠️ 直接调 _startDefense 的话，brace/parry 的 guard 是没有到期时间的长按态，
  // 下一帧 _controlAI 走到 `time <= aiNext` 分支就 _setState(f,'idle') 把它掐掉——
  // 挡是挡到了，但描边只闪一帧，玩家读不出"他在防我"，会心也基本撞不上。
  //
  // ⚠️ 保持时长是【事件驱动】的：最短 guardMin（保证描边看得见），之后只要威胁还在
  // 就继续按住，威胁一消失立刻松手（见 _aiHoldGuard），封顶 guardMax 防卡死。
  // 旧版是纯定时 420~540ms，且【档位越高压得越久】（帝 480 / 神 540）—— 那段时间
  // AI 既不能反应下一记威胁也不能抢攻，方向正好做反了。现在高档 guardMin 更短。
  // minMs：钓招用的架防（绕背/压边收尾）没有具体威胁，用它给一个固定的保持时长。
  // read：这次防御是【读招】交出来的（反应层）还是钓招/掷骰交的。
  //   水神流 AI 的完美受流以此为准入 —— 见 defense.js _resolveDefense 的 parry 分支。
  _aiGuard(f, time, minMs, read) {
    this._startDefense(f, time);
    if (f.state !== 'guard') return;
    const A = BT.AI_RT;
    f.guardMin = time + (minMs || this._tierCfg().guardMin || A.guardMin);
    f.guardMax = time + A.guardMax;
    f.guardRead = !!read;      // ⚠️ 必须在 _startDefense 之后：那里会把它清掉
    f.stateUntil = 0;          // 事件驱动，不再用定时锁（_controlAI 走 _aiHoldGuard）
  },

  // 防御态的维持/解除。返回 true = 本帧继续按住防御，_controlAI 直接 return。
  _aiHoldGuard(f, time, opp, dist) {
    if (f.state !== 'guard') return false;
    // 挡下了一击 → 立刻松防并上锁，逼它重新读招（见 BT.AI_RT.reguardGap 的注释）。
    // ⚠️ 这一支要排在 guardMin 之前：不然"最短保持"会把刚挡完的这一下继续按住，
    // 一次读招照样吃掉玩家的整串连段，等于没做。
    if (f.blockedAt) {
      f.blockedAt = 0;
      f.reguardAt = time + BT.AI_RT.reguardGap;
      this._endDefense(f);
      return false;
    }
    if (time < (f.guardMin || 0)) { f.sprite.setVelocityX(0); return true; }
    // 威胁还在（第二段连击、第二道剑气）→ 继续按住，别刚松手就挨打
    if (time < (f.guardMax || 0) && this._incomingThreat(f, opp, dist)) {
      f.sprite.setVelocityX(0);
      return true;
    }
    this._endDefense(f);       // 威胁解除 → 立刻松手回到可行动，把时间还给抢攻
    return false;
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
    // ⚠️ 有剑气在飞就【不起新套路】。套路一起就是 1~2 秒的脚本，中途 AI 在半空 / 在无敌帧里，
    // 等它想防已经来不及 —— 诊断实测 5 记剑气"可出手"5 次却只挡下 1 次，卡的正是这里
    // （不是能力不够，是时机被套路抢走）。腾出这段时间交给反应层去挡或去跳。
    if (T.reactDelay != null) {
      const qt = this._qiThreat(f);
      if (qt && qt.eta < BT.AI_RT.rtYieldQi) return false;
    }
    if (time < (f.rtNext || 0)) return false;
    f.rtNext = time + Phaser.Math.Between(BT.AI_RT.rollMin, BT.AI_RT.rollMax);
    if (time < (f.rtReady || 0)) return false;
    const sp = f.sprite, A = BT.AI_RT, gap = T.rtGap || A.gap;
    const bothGrounded = sp.body.blocked.down && opp.sprite.body.blocked.down;
    // 对手露破绽（出招中 / 硬直）时更想起套 —— 套路是拿来惩罚的，不是随机表演。
    const exposed = opp.state === 'attack' || opp.state === 'stun' || opp.state === 'hurt';

    // 触发概率的档位倍率：高档【移位更频繁】。用户要的"神级该频繁跳跃/缩地"就压在这里
    // —— 套路数量已经给满了（神级 5 条），但 rtGap 2600 + 各自 0.3~0.42 的概率把出场率
    // 压得很低，一场下来只看得到几次，读不出"这一档是靠机动打的"。
    const odds = T.rtOdds || 1;

    // 压边·连续贴身：对手背靠台边就上去锁死。判在最前面 —— 角落是最值钱的局面，
    // 有这个机会就不该被绕背/踏落抢走。
    const m = BT.DEFENSE.brace.edgeMargin * 2.2;
    if (R.includes('cornerPress') && bothGrounded &&
        (opp.sprite.x < m || opp.sprite.x > BT.GAME_W - m) &&
        dist > A.pressMin && dist < A.pressMax && Math.random() < A.pressOdds * odds) {
      f.rtReady = time + gap;
      return this._aiStart(f, 'cornerPress', time);
    }
    // 缩地·绕背斩：中距、缩地冷却好了、双方落地
    if (R.includes('crossBlink') && time >= (f.mistReady || 0) && bothGrounded &&
        dist > A.crossMin && dist < A.crossMax &&
        Math.random() < (exposed ? A.crossEager : A.crossOdds) * odds) {
      f.rtReady = time + gap;
      return this._aiStart(f, 'crossBlink', time);
    }
    // 升空·踏落斩：从上方绕过正面防御 —— 对手正架防时格外想用
    if (R.includes('riseDive') && time >= (f.riseReady || 0) && sp.body.blocked.down &&
        dist > A.diveMin && dist < A.diveMax &&
        Math.random() < (opp.state === 'guard' ? A.diveEager : A.diveOdds) * odds) {
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
      const tx = this._clampX(opp.sprite.x + side * BT.AI_RT.backGap);
      // 对手背靠台边时落点会被 clamp 回他【身前】，绕背不成立 —— 放弃这一套，
      // 交回决策层正面打。硬绕的话就是"瞬移到面前捅一刀"，最难看的那种 AI。
      if ((tx - opp.sprite.x) * side < BT.AI_RT.backGap * 0.55) { this._aiEnd(f); return false; }
      this._blinkGhosts(f, sp.x, sp.y, tx, sp.y);
      sp.setPosition(tx, sp.y);
      sp.setVelocityX(0);
      f.invuln = Math.max(f.invuln, time + BT.BLINK.iframe);
      f.mistReady = time + this._aiBlinkCd("ground");
      window.GameAudio && GameAudio.play && GameAudio.play('morph');
      // ⚠️ turnGap 必须 ≥1 帧：_faceEachOther 在 !_canAct 时跳过，同帧接 _attack
      // 会拿【旧朝向】往反方向劈（loop.js 头部注释记着的那个历史 bug）。
      this._aiStep(rt, time, BT.AI_RT.turnGap);
      return true;
    }
    // 绕到背后不一定马上砍：有概率贴背【架防】，钓你回身乱挥。
    // 这条同时压住神级的平A 频率 —— 绕背斩每套都接刀的话，神级 45s 打 39 记平A，
    // 把自己交防御的时间全挤掉了（实测起防次数四档全平，没有随难度上升）。
    // 钓招用的架防没有具体威胁可跟，给固定的 baitHold（事件驱动那套会 200ms 就松手）
    if (Math.random() < BT.AI_RT.crossGuardOdds) this._aiGuard(f, time, BT.AI_RT.baitHold);
    else this._attack(f);
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
  // 反制：剑气改打高位（跳跃顶点 172.8px，超过 hitH 不多）；或后撤让他落空。
  _rt_jumpQi(f, time, rt) {
    if (rt.step === 0) {
      f.sprite.setVelocityY(-BT.JUMP_VY);
      this._playAir(f);
      this._aiStep(rt, time, 0);
      return true;
    }
    return this._rtAirPress(f, time);
  },

  // ─────────── 套路④　拉开·蓄力剑气 ───────────
  // 缩地（或后撤）先把身位拉开，再起蓄 —— 解的是"越强越不放剑气"这个反直觉回归。
  //
  // ⚠️ 病因值得记住：BT.AI.ultMinDist=210 是「贴脸不放奥义」的静态闸门，而套路层 +
  // 间合摇摆 + 惩罚窗口让高档 AI 压得更近（神级均距 175px，圣级 234px），于是档位越高
  // 越永远卡在这道闸门上。实测 45s 内掷到奥义骰的次数：圣级 7、王级 4、帝级 5、神级 2
  // —— 神级 mul.ult=1.4 那个"更爱放奥义"的倍率根本没机会被读到。
  // 解法不是把 ultMinDist 调小（贴脸放奥义观感差、还等于送），而是让 AI【自己创造距离】。
  _rt_zoneOut(f, time, rt) {
    const opp = this._opp(f), sp = f.sprite;
    const dir = Math.sign(opp.sprite.x - sp.x) || 1;      // 指向对手，拉开就往 -dir
    if (rt.step === 0) {
      if (time >= (f.mistReady || 0)) {
        this._doAIBlink(f, 'ground', -dir, time);          // 缩地拉开：带残影，一眼看出"他要放大的"
        this._aiStep(rt, time, BT.AI_RT.zoneGap);
      } else {
        sp.setVelocityX(-dir * f.def.speed);               // 冷却没好就正常后撤
        this._setWalk(f, -dir);
        this._aiStep(rt, time, BT.AI_RT.zoneBackstep);
      }
      return true;
    }
    sp.setVelocityX(0);
    this._startAICharge(f, time);      // 起蓄自带轰飞 + 描边一弹，预告帧由它给
    this._aiEnd(f);
    return true;
  },

  // ─────────── 套路⑤　压边·连续贴身 ───────────
  // 对手背靠台边时：短缩地贴上去 → 平A → 再贴一次 → 再一刀。角落是格斗游戏最大的压力源，
  // 之前整套 AI 一次都没用过它。这是帝级的地面压制手牌（对应神级的绕背斩）。
  // 反制：别让自己被逼到边上；已经在边上就用移形换影换位，或吃第一下后趁硬直跳出去。
  _rt_cornerPress(f, time, rt) {
    const opp = this._opp(f), sp = f.sprite, A = BT.AI_RT;
    const dir = Math.sign(opp.sprite.x - sp.x) || 1;
    if (rt.step === 0) {
      this._rtTell(f);
      this._aiStep(rt, time, A.pressTell);
      return true;
    }
    if (rt.step === 1 || rt.step === 3) {
      // 贴到【身前】pressGap 处（不是身后：这套是压角，不是绕背）
      const tx = this._clampX(opp.sprite.x - dir * A.pressGap);
      this._blinkGhosts(f, sp.x, sp.y, tx, sp.y);
      sp.setPosition(tx, sp.y);
      sp.setVelocityX(0);
      f.invuln = Math.max(f.invuln, time + BT.BLINK.iframe);
      window.GameAudio && GameAudio.play && GameAudio.play('morph');
      // ⚠️ 第二拍的缩地【顺手掐掉上一刀的收招】。不这么做，下面的 _attack 会因为
      // state 还是 'attack'（dur 720~830ms）被 _canAct 挡掉，第二刀根本打不出来。
      // 观感上这正是"缩地取消收招接第二刀"的连段感。
      if (f.state === 'attack') this._setState(f, 'idle');
      this._aiStep(rt, time, A.turnGap);      // 同绕背：留一帧给 _faceEachOther 转身
      return true;
    }
    if (rt.step === 2) {
      this._attack(f);
      // 第二拍只在【对手仍被压在角落】时接：追着满场跑就不叫压边了
      const m = BT.DEFENSE.brace.edgeMargin * 2.2;
      const cornered = opp.sprite.x < m || opp.sprite.x > BT.GAME_W - m;
      if (!cornered) { this._aiEnd(f); return true; }
      this._aiStep(rt, time, A.pressBeat);
      return true;
    }
    // 第二拍也不一定是刀：有概率贴脸【架防】钓你反击（同 crossGuardOdds 的用意）
    if (Math.random() < A.pressGuardOdds) this._aiGuard(f, time, A.baitHold);
    else this._attack(f);
    this._aiEnd(f);
    return true;
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

    // ⚠️ 择时：_resolveMelee 里 |Δy| ≥ 96 直接 return，而升空 175 / 跳跃顶点 172.8
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
