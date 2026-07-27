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
    if (this._handleCharge(f, time)) return;   // 蓄力中/起手：独占操作，原地锁死
    if (this._handleIai(f, time)) return;      // 居合架式中：只等松手，别的一概不接
    // 移形换影：SPACE 瞬移，按住上 = 升空，否则 = 缩地（无敌+残影+冷却，不耗蓝）
    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
      const up = this.keys.W.isDown || this.cursors.up.isDown;
      this._doBlink(f, up ? 'rise' : 'ground', time);
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.J)) { f.jHeldFrom = time; return this._attack(f); }
    // 流派秘技（三派同一个输入形状）：点按 J = 普通平A（上一行，手感不变），
    // 【按住不放】= 挥到一半那一刀转成本流派的秘技（北神化影三体 / 水神起剑界 / …）。
    // 挂在已经出手的那一刀上，而不是独立起手 —— 平A 走 JustDown，做成独立起手就得把
    // 平A 推迟到松手判定之后，拿全局手感换一个招。详见 arte.js _startArte 的注释。
    if (this.keys.J.isDown && f.state === 'attack' && f.jHeldFrom && this._arteCfg(f) &&
        time - f.jHeldFrom >= this._arteCfg(f).holdMs && this._canArte(f, time)) {
      this._startArte(f, time);
    }

    // 防御【三派同一个键 S、同一种读法：按住维持】。
    // ⚠️ 北神曾经在这里单开一支读 JustDown（"反手飞刀是瞬发动作所以该点按"），
    // 那是它挡不住东西的根因：玩家有 ~55% 的帧处在 hurt/attack/stun 里读不进按键，
    // 点按落在死区就整个丢掉，实测挡下率只有 15~18%，加缓冲也救不回来
    // （详见 BT.DEFENSE.counter 的注释）。现在输入侧无分叉，差异全在结算里。
    if (this.keys.S.isDown && onGround && this._canAct(f)) {
      this._startDefense(f, time);
      return;
    }
    if (f.state === 'guard') this._setState(f, 'idle');

    if (!this._canAct(f)) return;
    // 【定时防御态】锁住姿态直到窗口结束。三派统一为长按 guard 后已没有定时 guard
    // （长按态不设 stateUntil），这道闸留着兜底：AI 侧 _aiGuard 会给 guard 加保持时长，
    // 而它走的是 _controlAI 不是这里。谁将来再引入定时 guard，姿态也不会被掐掉。
    if (f.state === 'guard' && f.stateUntil && time < f.stateUntil) return;
    const left = this.keys.A.isDown || this.cursors.left.isDown;
    const right = this.keys.D.isDown || this.cursors.right.isDown;
    const vx = left ? -f.def.speed : right ? f.def.speed : 0;
    sp.setVelocityX(vx);
    if ((this.keys.W.isDown || this.cursors.up.isDown) && onGround) {
      sp.setVelocityY(-BT.JUMP_VY);
      if (this._usage && f === this.p1 && f.state !== 'jump') this._usage.jump++;
    }
    // 姿态：腾空播跳跃姿态（起跳蓄力→收腿→落地），落地回 idle/走。
    // 跳跃是纯视觉+可行动状态，起跳只触发一次（airborne 门），落地 airborne 复位后
    // 因 f.state==='jump'≠idle，下面的 _setState/_setWalk 一定会重播落地姿态。
    if (!onGround) {
      if (!f.airborne) { f.airborne = true; this._playAir(f); }
    } else {
      f.airborne = false;
      if (vx) this._setWalk(f, vx);
      else this._setState(f, 'idle');
    }
  },

  // 当前擂台的难度档（fight.js 每场设定 this.curTier）。缺省回落到王级基线。
  _tierCfg() { return (BT.TIERS && this.curTier) || BT.TIERS.wang; },

  // ─────────── 人机特权（bypass）───────────
  // 只对【电脑一侧】、且只在配了 bypass 的档位（目前仅神级）生效。玩家永远拿不到。
  //
  // 这是有意开的后门，但只开【操作模型】那一类：玩家一次只能做一件事、腾空不能架防、
  // 平A 一出手就锁 780ms —— 这些是给人类手指定的规矩，AI 没有手指。诊断实测机动与防御
  // 在抢同一批帧（机动一升，airborne 挡掉的威胁帧就从 7 涨到 19），只靠调数值两边永远
  // 互相吃；把这几条解开，"机动和防御同时拉满"才成立。
  //
  // ⚠️ 不许往这里加【第二类】后门：抹掉预告帧、加无敌、拉伤害倍率。
  // 那类东西玩家一眼看得出来，观感是耍赖不是强 —— BT.TIERS 的设计口径是
  // 「难度升级的是信息利用与行为质量，伤害一致(mul.dmg 全档 1.0)」，别破这条。
  // 现在这几条特权，玩家看到的是"这家伙什么都做得到"，预告/朝向/结算全部照旧。
  _bypass(f) { return (f === this.p2 && this._tierCfg().bypass) || {}; },
  // AI 伤害折扣 = 基线难度旋钮 × 当前档位倍率。伤害结算 4 处统一走这里。
  _aiDmgScale() { return BT.AI.damageScale * this._tierCfg().mul.dmg; },

  // 对手 AI —— 四层调度，从"必须马上做"到"想做什么"：
  //   ① 收招接续：把命中窗口已过的收招段提前结束，否则任何两节动作之间都会硬塞空白
  //   ② 反应层：每帧跑、不等决策间隔 —— 探到来袭威胁（近战招/剑气）就交防御或起跳
  //   ③ 套路推进：已进入的行为串按脚本走完（受击 or 反应层征用即作废）
  //   ④ 决策层：原有的掷骰逻辑（奥义 / 间合 / 惩罚 / 起套 / 挡或砍）
  // ①②③ 在 routine.js。档位给的是【会哪几套套路 + 反应多快】，不是伤害倍率。
  //
  // ⚠️ ② 必须排在 ③ 【之前】。反过来排（旧版）时，套路只在 hurt/stun/down 才作废，
  // 也就是【只有已经挨打了才让位】—— 而档位给的正是套路数量（王 0 / 帝 3 / 神 5），
  // 于是套路越多 → 反应层跑不到的时间越长 → 越不会防御，阶梯整个倒挂。
  _controlAI(time) {
    const f = this.p2, sp = f.sprite, opp = this.p1;
    // ⚠️ 蓄力检查必须在 _canAct 之前：'charge' 不在 _canAct 白名单里，放到后面
    // 就会被 return 掉 —— AI 一旦起蓄就再也没人推进它，永远卡在蓄力姿势。
    if (f.charging) { this._tickCharge(f, time); return; }
    // 居合架式同理：'iai' 不在 _canAct 白名单，放到后面就再没人推进它，AI 会永远
    // 站在架式里 —— 而且它是【故意不设防】的一段，卡住等于把整场送给玩家。
    if (f.iai) { this._tickIai(f, time); return; }
    // 上膛的秘技（combat.js _attack 掷中 → arte.js _aiTickArte 转招）。
    // ⚠️ 必须排在反应层之前：反应层 + guardCancel 会在 holdMs 内把这一刀收掉，
    // 详见 _aiTickArte 的注释。
    if (this._aiTickArte(f, time)) return;
    const T = this._tierCfg(), cap = T.cap, mul = T.mul;
    const dx = opp.sprite.x - sp.x, dist = Math.abs(dx), dir = dx > 0 ? 1 : -1;

    this._aiCancelRecovery(f, time);                       // ① 收招接续
    if (this._aiVsRealm(f, time, opp, dist, dir)) return;  // ①·5 对手起了剑界：停手 / 抢断
    if (this._aiReact(f, time, opp, dist)) return;         // ② 反应层（可弃招/弃套路）
    if (this._aiTickRoutine(f, time)) return;              // ③ 套路推进
    if (this._aiHoldGuard(f, time, opp, dist)) return;     // 防御态：威胁在就按住，走了就松手
    if (!this._canAct(f)) return;

    // ── ④ 决策层 ──
    // 放奥义（圣级+）：远距离优先，判在走位分支之前（见 BT.AI 注释）。
    // 太近时，会拉开的档位走 zoneOut 套路先创造距离，而不是干脆放弃（见 _aiUltPlan）。
    if (cap.ult) {
      const plan = this._aiUltPlan(f, time, dist, mul.ult, (T.routines || []).includes('zoneOut'));
      if (plan === 'now') { this._startAICharge(f, time); return; }
      if (plan === 'zone') { this._aiStart(f, 'zoneOut', time); return; }
    }

    // 起套路（帝级+）：判在【走位分支之前】—— 绕背/踏落本来就是中距离的进身手段，
    // 排在 `dist > engage` 的 return 之后就只有贴脸能起套，实测一整场打不出两次。
    // 自带掷骰节拍与冷却（_aiPickRoutine 的两个时钟），不蹭 aiNext。
    if (this._aiPickRoutine(f, time, dist, opp)) return;

    // 撤步进行中：间合摇摆的后半拍（见下面 footsie）。
    // 走 _setWalk 而不是 _setState('walk')：往身后走是【撤步】，动画要倒放。
    if (f.backstepUntil && time < f.backstepUntil && sp.body.blocked.down) {
      sp.setVelocityX(-dir * f.def.speed * 1.1);
      this._setWalk(f, -dir);
      return;
    }

    // 交战距离要把【前冲步】算进去：招式自带 lunge 会主动贴上去（见旧注释）。
    const engage = f.def.reach + BT.ATTACK[f.id].lunge * 0.35;
    if (dist > engage) {
      // ⚠️ 追击缩地。AI 的行走是 speed×0.85，【比玩家慢】，还有缩地(215px/820ms)
      // 可用 —— 一个在远处蓄力/放风筝的对手它永远够不着。表现是整局打不出几记平A：
      // playtest 实测 AI 一局只出招 1~6 次，bot 连"有东西可挡"都凑不齐，
      // 防御与会心两条演出跟着一起测不到。会套路的档位给一条贴近的腿。
      // ⚠️ 别在这里手写 f.mistReady：_doAIBlink 自己会置冷却，而它【开头就检查】
      // `time < f.mistReady` —— 先赋值再调用等于自己把自己挡掉，这条追击缩地
      // 从来没有真正执行过（写了冷却、然后瞬移被跳过，观感是"AI 只会走路追人"）。
      if ((T.routines || []).length && dist > engage * BT.AI_RT.chaseMul &&
          time >= (f.mistReady || 0) && sp.body.blocked.down) {
        this._doAIBlink(f, 'ground', dir, time);
        return;
      }
      sp.setVelocityX(f.def.speed * 0.85 * dir);
      this._setWalk(f, dir);
      return;
    }
    sp.setVelocityX(0);

    // ── 帝级+·惩罚窗口：玩家受击硬直/收招露破绽 → 不等决策间隔立即抢攻 ──
    const oppRecovering = opp.state === 'stun' || opp.state === 'hurt' ||
      (opp.state === 'attack' && time > opp.atkTo);
    if (cap.punish && oppRecovering && time > (f.punishReady || 0)) {
      // ⚠️ 冷却别再调回 260ms：那会让 AI 抢完这次收招接着抢下一次，陷入永动连打，
      // 把自己的防御与套路全挤掉（实测帝级挡下率反低于王级，见 data.js punishCd 注释）。
      f.punishReady = time + (T.punishCd || BT.AI_RT.punishCd);
      this.aiNext = time + Phaser.Math.Between(BT.AI.decisionMin, BT.AI.decisionMax);
      this._attack(f);
      return;
    }

    if (time <= this.aiNext) { this._setState(f, 'idle'); return; }
    // 决策间隔按档位缩放，但【钳在 ≤760ms】：慢过受击硬直+无敌(680) AI 会轮不到出手。
    const decMin = Math.min(700, BT.AI.decisionMin * mul.decision);
    const decMax = Math.min(760, BT.AI.decisionMax * mul.decision);
    this.aiNext = time + Phaser.Math.Between(decMin, decMax);

    // 间合摇摆（帝级+）：进了射程不再是原地掷骰的木桩，会往刀尖外退一步钓挥空。
    // 这是 footsies 的最小可用版本 —— 没有它，AI 一进 engage 就钉死在地上。
    if (T.footsie && dist < engage * 1.15 && Math.random() < T.footsie) {
      f.backstepUntil = time + BT.AI_RT.backstepMs;
      return;
    }

    // 兜底掷骰：反应式防御已上移到反应层，这里只剩"闲时偶尔架个防"与平A。
    // cap.react 档另给一份 guardOnAttack 加权，保留旧的对拼手感。
    // ⚠️ 加权那一支走 _threatLive 而不是裸的 `opp.state === 'attack'`：后者把长达
    // 400ms 的收招段也算成"对手正在出招"，AI 于是对着打不到自己的刀架防，
    // 并被旧的定时 guardHold 冻住 420~540ms，把本该抢攻的惩罚窗口整个赔进去（见 routine.js 该函数注释）。
    // ⚠️ 两条【各掷各的骰】。曾经共用一个 r：`r<gOnAtk` 与 `r<gBias` 就成了嵌套而非
    // 并列 —— 神级 gOnAtk=0.544 > gBias=0.36，只要 _threatLive 为真，第二条恒不可达，
    // 两个旋钮互相吃掉。
    const gOnAtk = BT.AI.guardOnAttack * mul.guardOnAttack;
    const gBias = BT.AI.guardBias * mul.guardBias;
    const A = BT.AI_RT;
    if (cap.react && this._threatLive(f, opp, dist) && Math.random() < gOnAtk) this._aiGuard(f, time, A.baitHold);
    else if (Math.random() < gBias) this._aiGuard(f, time, A.baitHold);
    else this._attack(f);
  },

  // ─────────── 玩家起了「剥夺剑界」时的 AI ───────────
  // 返回 true = 这一帧由本函数接管。排在【所有层之前】（连反应层也压过）：剑界一成形，
  // "出手"这个动作本身的收益就变成负的，任何还在计划出手的层都必须先被掐掉。
  //
  // ⚠️ 这条是【所有档位共有的底线】，不是高档特权。上级/圣级没有反应层，缺了它们会
  // 在剑界里照常平A —— 6 秒里把自己打死，玩家会看到"电脑自杀"而不是"我用对了大招"。
  // 会不会【抢在成形前打断】才是分档位的：那要求读出 open 段这 820ms，给 cap.react 档。
  //
  // ⚠️ 已经起蓄的剑气【故意不掐】（_controlAI 开头的 charging 分支排在本函数之前）：
  // 那一发照常放出来，然后在剑界前整道掉头打回自己 —— 这是这一招最好看的一幕，
  // 也是"抢在成形前打断"之外玩家该得到的回报。别顺手在 charging 分支里加拦截。
  _aiVsRealm(f, time, opp, dist, dir) {
    const vs = this._realmVs && this._realmVs(f);
    if (!vs) return false;
    const sp = f.sprite, T = this._tierCfg();

    // 起手段：会读招的档位抢着打断（剑界这 820ms 还不反弹，打进去就废掉它 + 90 蓝）
    if (vs === 'break') {
      if (!T.cap.react) return false;          // 读不出起手段的档位就当没这回事，照常打
      if (!this._canAct(f)) return true;
      const engage = f.def.reach + BT.ATTACK[f.id].lunge * 0.35;
      if (dist > engage) { sp.setVelocityX(f.def.speed * dir); this._setWalk(f, dir); return true; }
      sp.setVelocityX(0);
      this._attack(f);
      return true;
    }

    // 已成形：【停手】。别贴脸站着 —— 拉开到刀程外等它收，这也顺带把玩家的
    // "我可以自由出手"兑现成真的压制（施术者得追上来才打得到）。
    if (f.state === 'attack' || f.charging) {
      // 已经出手的那一刀收不回来（收招段不可取消），但会弃招的档位可以现在就撤
      if (this._aiCancelWindow && this._aiCancelWindow(f, time)) { this._setState(f, 'idle'); }
      else return true;
    }
    if (!this._canAct(f)) return true;
    const safe = opp.def.reach + BT.ATTACK[opp.id].lunge + BT.BODY_HALF_W + 40;
    if (dist < safe && sp.body.blocked.down) {
      const away = -dir;
      // 退到墙角就没地方退了 → 改成架防等它过去（剑界不吃防御，但挡得住施术者的刀）
      const room = away < 0 ? sp.x - BT.EDGE_X : BT.GAME_W - BT.EDGE_X - sp.x;
      if (room > BT.WALL_ROOM) { sp.setVelocityX(f.def.speed * away); this._setWalk(f, away); return true; }
      this._aiGuard(f, time, BT.AI_RT.baitHold);
      return true;
    }
    sp.setVelocityX(0);
    this._setState(f, 'idle');
    return true;
  },

  // AI 的奥义计划：返回 'now'（够远，直接起蓄）/ 'zone'（太近，先拉开再放）/ null。
  //
  // ⚠️ 距离闸门【不能再是一票否决】。BT.AI.ultMinDist=210 本意是"贴脸不放奥义"，
  // 但套路层 + 间合摇摆 + 惩罚窗口让高档 AI 压得更近（神级均距 175px vs 圣级 234px），
  // 结果档位越高越永远卡在这道闸门上 —— 实测 45s 内掷到奥义骰的次数：圣 7 / 王 4 /
  // 帝 5 / 神 2，神级 mul.ult=1.4 完全没被读到，表现就是"越强越不放剑气"。
  // 解法是让会拉开的档位（routines 含 zoneOut）把它当成"先创造距离"的信号，而不是放弃。
  _aiUltPlan(f, time, dist, ultMul, canZone) {
    if (time < (f.ultReady || 0)) return null;
    // ⚠️ 起蓄要【留出格挡的蓝】。剑神流 brace 是"蓝够才完全免伤，蓝空退化成 0.45 减伤"，
    // 而奥义一发就扣掉 ultCost=100 —— AI 把蓝全花在剑气上，就会出现用户实测的
    // "确实即时防御了，但依然会受到伤害"：挡是挡住了，只是每次都在吃 45%。
    // mpReserve 至少要够一次 guardCost(34)/qiGuardCost(52)。只有 brace 真正吃这条，
    // 另两派不看蓝，留一点也不影响（换来的是奥义节奏稍缓，观感反而没那么轰炸）。
    if (f.mp < BT.MP.ultCost + (this._tierCfg().mpReserve || 0)) return null;
    // ⚠️ 剑气还要给【流派秘技】让位。奥义判在决策层最前面，只给防御留了 mpReserve，
    // 给秘技【一分没留】—— 抜刀 70 / 剑界 90 和奥义 100 抢同一管蓝，而一发奥义每
    // ultCd(4600ms) 就吃掉约 regen 的全部回复（23/s ≈ 106/4.6s）。结果是"最高档独占的
    // 那记招"常年凑不出蓝，玩家看到的仍然只是剑气。
    // 判据只挡【此刻秘技放得出、放了奥义就放不出】这一种情形：两样都凑不出时不干预，
    // 免得把整档的奥义一起掐掉（水神剑界 90 + 100 = 190，那样一场剑气都见不到）。
    const arte = this._arteCfg && this._arteCfg(f);
    if (arte && this._tierCfg().cap.arte && time >= (f.arteReady || 0) &&
        f.mp >= arte.cost && f.mp - BT.MP.ultCost < arte.cost) return null;
    const far = dist >= BT.AI.ultMinDist;
    if (!far && !canZone) return null;
    if (Math.random() >= BT.AI.ultChance * (ultMul == null ? 1 : ultMul)) return null;
    return far ? 'now' : 'zone';
  },

  // 当前播放帧的攻击距离：BT.REACH 是量图集得到的【逐帧刀长】（纹理像素，
  // 距格中心）。刀伸多远就打多远，不用静态 reach —— 静态值曾定在 86~94，
  // 实测挥砍帧刀尖能到 148~160，导致"要贴脸才打得到"。
  // 再加对手身体半宽，刀尖碰到躯干边缘即算命中。
  _bladeReach(f) {
    const tbl = BT.REACH[f.id];
    const fr = f.sprite.anims.currentFrame;
    const i = fr ? Math.min(tbl.length - 1, fr.index - 1) : 0;
    return tbl[i] * BT.SCALE + BT.BODY_HALF_W;
  },

  // 近战命中判定
  // 【扫掠区间】而非瞬时距离：无头 playtest 约 15fps，带 lunge 前冲时单帧可位移
  // 上百 px，瞬时判定会确定性 miss（tween 命中隧穿的同源问题）。
  // 这里比较 [上帧 dx, 本帧 dx] 两个端点，任一端进入刀长即判命中。
  _resolveMelee(f) {
    if (f.state !== 'attack') return;
    if (f.atkHit) return;
    // 【时间轴上的扫掠】——和上面的空间扫掠是同一类问题。
    // 无头 playtest 约 15fps，帧间隔 133ms，而剑神流命中窗口只有 100ms
    // （280~380）。用"当前时刻是否落在窗口内"判断，窗口整个夹在两帧之间时
    // 一次都不会被求值，那一刀凭空消失 —— 表现为 bot 猛挥空、五局输三局。
    // 改判"本帧时间区间 [上帧, 本帧] 是否与窗口相交"。
    const t1 = this.time.now, t0 = this._prevTime ?? t1;
    if (t1 < f.atkFrom || t0 > f.atkTo) return;

    const opp = this._opp(f), dir = f.facingLeft ? -1 : 1;
    const dx = opp.sprite.x - f.sprite.x;
    const prev = f.prevDx === null ? dx : f.prevDx;
    f.prevDx = dx;

    if (Math.abs(opp.sprite.y - f.sprite.y) >= 96) return;
    const reach = this._bladeReach(f);
    const near = Math.min(Math.abs(dx), Math.abs(prev));
    const inFront = Math.sign(dx) === dir || Math.sign(prev) === dir;
    if (inFront && near <= reach) {
      f.atkHit = true;
      this._hit(f, opp, this._damageOf(f), dir);
      if (f.riposteUntil) f.riposteUntil = 0;   // 反击加成一次性
      return;
    }
    // 没打中本体 —— 看看是不是劈到了对方的幻剑分身（猜错了）。
    // 排在本体判定【之后】：打中本体就不必再管分身，那一刀已经结算过了。
    if (this._cleaveClones) this._cleaveClones(f);
  },

  // 手动改 x 的统一钳子。见 BT.EDGE_X 的注释：越界值会先渲染一帧再被弹回来。
  _clampX(x) { return Phaser.Math.Clamp(x, BT.EDGE_X, BT.GAME_W - BT.EDGE_X); },

  // 两人重叠时互推开。
  // ⚠️ 只在【双方都落地】时推：任一方腾空就放行，否则跳起来也会被推回去，
  // 玩家永远跨不过对手（换边只能靠对手自己走开）。
  //
  // ⚠️ 分离量【各退一半，被墙截掉的那一半转嫁给对方】，不能各推各的。原来是
  // `a.x -= push; b.x += push;` 两条裸写，在墙角同时踩了两个坑：
  //   1) 靠墙一方被推进墙里的位置【会被真的渲染一帧】（Arcade 的边界钳制在下一帧才跑），
  //      下一帧弹回合法值 —— 隔帧跳变，实测 49.4↔42.1↔49.4↔45.75，幅度逐次减半，
  //      这就是玩家看到的"墙角抖一下"。
  //   2) 靠墙那一半位移被墙吃掉，重叠永远只解开一半，于是只要对手还压着（cornerPress /
  //      平A 的 lunge）就每帧重新触发，抖动不收敛。
  // 转嫁之后：贴墙时自由的一方一次退满整个 gap，重叠一帧解清，且没有任何越界写入。
  _fighterPhysics() {
    if (!this.p1 || !this.p2) return;
    const a = this.p1.sprite, b = this.p2.sprite;
    if (!a.body.blocked.down || !b.body.blocked.down) return;
    const gap = 46, d = Math.abs(a.x - b.x);
    if (d >= gap || Math.abs(a.y - b.y) >= 84) return;

    const push = (gap - d) / 2, s = a.x < b.x ? 1 : -1;
    const aWant = a.x - push * s, bWant = b.x + push * s;
    const aFit = this._clampX(aWant), bFit = this._clampX(bWant);
    // 各自被墙截掉多少，就让对方多退多少
    const aLost = Math.abs(aWant - aFit), bLost = Math.abs(bWant - bFit);
    a.x = this._clampX(aFit - bLost * s);
    b.x = this._clampX(bFit + aLost * s);
  },
});
